const fs = require('fs');
const path = require('path');

const root = path.resolve(process.argv[2] || process.cwd());
const ignoredDirectories = new Set([
  '.git',
  '.electron-builder-cache',
  'node_modules',
  'release',
  'dist',
  'out',
  'app-release',
  'publish',
  'backups',
]);

const forbiddenNames = new Set([
  'settings.json',
  'history.json',
  'storage-state.json',
  'mytimes-tts-data-location.json',
  'mytimes-tts-bootstrap.json',
  'electron-builder.env',
]);

const forbiddenExtensions = new Set([
  '.wav', '.mp3', '.m4a', '.flac', '.pcm',
  '.log', '.p12', '.pfx', '.pem', '.key', '.p8',
  '.mobileprovision', '.provisionprofile',
]);

const textExtensions = new Set([
  '.cjs', '.css', '.html', '.js', '.json', '.md', '.mjs',
  '.ps1', '.txt', '.xml', '.yaml', '.yml',
]);

const secretChecks = [
  {
    name: '可能的 MiMo API Key',
    pattern: /\b(?:sk|tp)-[A-Za-z0-9_-]{16,}\b/g,
  },
  {
    name: '可能的 GitHub Token',
    pattern: /\b(?:ghp|github_pat)_[A-Za-z0-9_]{20,}\b/g,
  },
  {
    name: '可能的 Bearer Token',
    pattern: /Authorization\s*[:=]\s*["']Bearer\s+[A-Za-z0-9._~-]{16,}["']/gi,
  },
  {
    name: '私钥正文',
    pattern: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g,
  },
  {
    name: '可能的本机个人路径',
    pattern: /(?:[A-Za-z]:\\Users\\[^\\\r\n]+|\\\\(?:192\.168|10\.)[^\\\r\n]*|\/(?:Users|home)\/[^/\r\n]+)/g,
  },
];

const failures = [];
let scannedFiles = 0;

function relative(filePath) {
  return path.relative(root, filePath).split(path.sep).join('/');
}

function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.name === '.env.example') continue;
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (!ignoredDirectories.has(entry.name)) walk(fullPath);
      continue;
    }

    const lowerName = entry.name.toLowerCase();
    const extension = path.extname(lowerName);
    if (forbiddenNames.has(lowerName) || forbiddenExtensions.has(extension) || lowerName.startsWith('.env.')) {
      failures.push(`${relative(fullPath)}：不应进入公开源码包`);
      continue;
    }

    if (!textExtensions.has(extension) && !['.gitignore', '.gitattributes'].includes(lowerName)) continue;
    scannedFiles += 1;
    const source = fs.readFileSync(fullPath, 'utf8');
    for (const check of secretChecks) {
      check.pattern.lastIndex = 0;
      if (check.pattern.test(source)) failures.push(`${relative(fullPath)}：${check.name}`);
    }
  }
}

if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) {
  console.error(`检查目录不存在：${root}`);
  process.exit(2);
}

walk(root);

if (failures.length > 0) {
  console.error('公开发布检查未通过：');
  for (const failure of [...new Set(failures)]) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`公开发布检查通过：已检查 ${scannedFiles} 个文本文件，未发现 Key、历史音频、证书或个人路径。`);
