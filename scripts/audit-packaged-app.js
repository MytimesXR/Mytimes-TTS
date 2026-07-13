const fs = require('fs');
const path = require('path');
const asar = require('@electron/asar');

const root = path.resolve(process.argv[2] || 'release');
const expectedEntries = new Set([
  'app',
  'app/app.js',
  'app/index.html',
  'app/styles.css',
  'electron',
  'electron/main.js',
  'electron/preload.js',
  'package.json',
]);

const textEntries = [
  'app/app.js',
  'app/index.html',
  'app/styles.css',
  'electron/main.js',
  'electron/preload.js',
  'package.json',
];

const secretChecks = [
  { name: '可能的 MiMo API Key', pattern: /\b(?:sk|tp)-[A-Za-z0-9_-]{16,}\b/g },
  { name: '可能的 GitHub Token', pattern: /\b(?:ghp|github_pat)_[A-Za-z0-9_]{20,}\b/g },
  { name: '私钥正文', pattern: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g },
  {
    name: '可能的本机个人路径',
    pattern: /(?:[A-Za-z]:\\Users\\[^\\\r\n]+|\\\\(?:192\.168|10\.)[^\\\r\n]*|\/(?:Users|home)\/[^/\r\n]+)/g,
  },
];

function normalizeEntry(entry) {
  return String(entry).replace(/\\/g, '/').replace(/^\/+/, '');
}

function findAsarFiles(directory, results = []) {
  if (!fs.existsSync(directory)) return results;
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) findAsarFiles(fullPath, results);
    else if (entry.isFile() && entry.name === 'app.asar') results.push(fullPath);
  }
  return results;
}

function auditArchive(archivePath) {
  const entries = new Set(asar.listPackage(archivePath).map(normalizeEntry));
  const missing = [...expectedEntries].filter((entry) => !entries.has(entry));
  const unexpected = [...entries].filter((entry) => !expectedEntries.has(entry));
  if (missing.length || unexpected.length) {
    const details = [
      missing.length ? `缺少：${missing.join(', ')}` : '',
      unexpected.length ? `多出：${unexpected.join(', ')}` : '',
    ].filter(Boolean).join('；');
    throw new Error(`${archivePath} 的 app.asar 白名单不匹配。${details}`);
  }

  for (const entry of textEntries) {
    const source = asar.extractFile(archivePath, entry).toString('utf8');
    for (const check of secretChecks) {
      check.pattern.lastIndex = 0;
      if (check.pattern.test(source)) throw new Error(`${archivePath}/${entry}：${check.name}`);
    }
  }

  const packageData = JSON.parse(asar.extractFile(archivePath, 'package.json').toString('utf8'));
  if (!packageData.version) throw new Error(`${archivePath} 中的 package.json 缺少版本号。`);
  return packageData.version;
}

const archives = findAsarFiles(root);
if (!archives.length) {
  console.error(`没有在 ${root} 中找到 app.asar。`);
  process.exit(1);
}

try {
  for (const archive of archives) {
    const version = auditArchive(archive);
    console.log(`打包隐私检查通过：${path.relative(root, archive)}（v${version}）`);
  }
} catch (error) {
  console.error(`打包隐私检查未通过：${error.message}`);
  process.exit(1);
}
