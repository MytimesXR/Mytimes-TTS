const { app, BrowserWindow, dialog, ipcMain, Menu, safeStorage, shell } = require('electron');
const fs = require('fs');
const crypto = require('crypto');
const os = require('os');
const path = require('path');
const { createMimoProvider } = require('./providers/mimo-provider');
const { createVolcengineProvider } = require('./providers/volcengine-provider');
const { createGptSovitsProvider } = require('./providers/gpt-sovits-provider');
const { createIndexTts2Provider } = require('./providers/index-tts2-provider');
const { ProviderRegistry } = require('./providers/provider-registry');
const { getProviderCatalog, normalizeProviderId } = require('./providers/provider-types');

const DEFAULT_SETTINGS = Object.freeze({
  serviceType: 'standard',
  baseUrl: 'https://api.xiaomimimo.com/v1',
  authMode: 'api-key',
  apiKey: '',
  timeoutSeconds: 180,
  styleOptimizerProvider: 'disabled',
  styleOptimizerBaseUrl: 'http://127.0.0.1:8080/v1',
  styleOptimizerModel: 'gpt-3.5-turbo',
  styleOptimizerApiKey: '',
  styleOptimizerTimeoutSeconds: 120,
  volcBaseUrl: 'https://openspeech.bytedance.com/api/v1/tts',
  volcAppId: '',
  volcAccessToken: '',
  volcCluster: 'volcano_tts',
  volcVoiceType: 'BV001_streaming',
  volcSpeedRatio: 1,
  volcTimeoutSeconds: 180,
  gptSovitsBaseUrl: 'http://127.0.0.1:9880',
  gptSovitsApiKey: '',
  gptSovitsTargetLanguage: 'zh',
  gptSovitsReferenceLanguage: 'zh',
  gptSovitsReferenceText: '',
  gptSovitsTextSplitMethod: 'cut5',
  gptSovitsTimeoutSeconds: 180,
  indexTts2BaseUrl: 'http://127.0.0.1:9872',
  indexTts2ApiKey: '',
  indexTts2EmotionMode: 'text',
  indexTts2EmotionAlpha: 0.6,
  indexTts2UseRandom: false,
  indexTts2TimeoutSeconds: 600,
  theme: 'system',
});

const activeRequests = new Map();
const providerRegistry = new ProviderRegistry();
providerRegistry.register(createMimoProvider({
  getSettings: () => getSettings(),
  activeRequests,
}));
providerRegistry.register(createVolcengineProvider({
  getSettings: () => getSettings(),
  activeRequests,
}));
providerRegistry.register(createGptSovitsProvider({
  getSettings: () => getSettings(),
  activeRequests,
  getTempDirectory: () => path.join(app.getPath('temp'), 'Mytimes-TTS'),
}));
providerRegistry.register(createIndexTts2Provider({
  getSettings: () => getSettings(),
  activeRequests,
}));
let mainWindow = null;
const DATA_DIRECTORY_NAME = 'Mytimes-TTS-Data';
const LEGACY_DATA_LOCATION_FILE = 'Mytimes-TTS-data-location.json';
const LEGACY_ONBOARDING_FILE = 'Mytimes-TTS-bootstrap.json';
const LOCAL_STATE_FILE = 'storage-state.json';
const INTERNAL_PROFILE_FILE = 'Mytimes-TTS-Internal.json';
const DEFAULT_INTERNAL_PROFILE_PATH = 'Y:\\【软件插件】\\Mytimes-TTS-Data\\Mytimes-TTS-Internal.json';

function getExecutableDirectory() {
  if (!app.isPackaged) return path.resolve(__dirname, '..');
  if (process.env.PORTABLE_EXECUTABLE_DIR) return path.resolve(process.env.PORTABLE_EXECUTABLE_DIR);
  return path.dirname(process.execPath);
}

const executableDirectory = getExecutableDirectory();
const legacyDefaultDataDirectory = app.isPackaged
  ? path.join(executableDirectory, DATA_DIRECTORY_NAME)
  : path.join(executableDirectory, 'release', 'dev-data');
const defaultDataDirectory = path.join(app.getPath('documents'), DATA_DIRECTORY_NAME);
const legacyDataLocationFile = path.join(executableDirectory, LEGACY_DATA_LOCATION_FILE);
const legacyOnboardingFile = path.join(executableDirectory, LEGACY_ONBOARDING_FILE);
const localStateFile = path.resolve(
  process.env.MYT_TTS_STATE_FILE || path.join(app.getPath('userData'), LOCAL_STATE_FILE),
);
let localState = {};
let hasConfiguredDataLocation = false;

function getDefaultInternalProfilePath() {
  return path.resolve(process.env.MYT_TTS_INTERNAL_PROFILE || DEFAULT_INTERNAL_PROFILE_PATH);
}

function getAppMode() {
  return localState.appMode === 'internal' ? 'internal' : localState.appMode === 'public' ? 'public' : '';
}

function getInternalProfileInfo(profilePath = '') {
  const resolvedProfilePath = path.resolve(profilePath || getDefaultInternalProfilePath());
  const result = {
    profilePath: resolvedProfilePath,
    fileName: INTERNAL_PROFILE_FILE,
    exists: fs.existsSync(resolvedProfilePath),
    valid: false,
    available: false,
    dataDirectory: '',
    displayName: 'MytimesXR 内部配置',
    error: '',
  };
  if (!result.exists) {
    result.error = '未找到内部配置文件。';
    return result;
  }
  const profile = loadJson(resolvedProfilePath, null);
  if (!profile || typeof profile !== 'object') {
    result.error = '内部配置文件不是有效的 JSON。';
    return result;
  }
  if (profile.profileType !== 'mytimesxr-internal' || profile.organization !== 'MytimesXR') {
    result.error = '该文件不是有效的 MytimesXR 内部配置。';
    return result;
  }
  if (Number(profile.schemaVersion) !== 1 || typeof profile.dataDirectory !== 'string' || !profile.dataDirectory.trim()) {
    result.error = '内部配置缺少受支持的数据目录设置。';
    return result;
  }
  const rawDirectory = profile.dataDirectory.trim();
  const resolvedDataDirectory = path.isAbsolute(rawDirectory)
    ? path.resolve(rawDirectory)
    : path.resolve(path.dirname(resolvedProfilePath), rawDirectory);
  const access = getDirectoryAccessInfo(resolvedDataDirectory);
  result.valid = true;
  result.available = access.available;
  result.dataDirectory = resolvedDataDirectory;
  result.displayName = String(profile.displayName || result.displayName);
  if (!access.available) result.error = '内部数据目录当前不可访问或不可写。';
  return result;
}

function saveAppMode(mode, profilePath = '') {
  if (!['public', 'internal'].includes(mode)) throw new Error('不支持的应用模式。');
  localState = loadJson(localStateFile, localState);
  localState = {
    ...localState,
    schemaVersion: 2,
    appMode: mode,
    onboardingCompleted: false,
    updatedAt: new Date().toISOString(),
  };
  delete localState.completedAt;
  if (mode === 'internal') localState.internalProfilePath = path.resolve(profilePath || getDefaultInternalProfilePath());
  else delete localState.internalProfilePath;
  writeJson(localStateFile, localState);
  return getOnboardingStatus();
}

function readConfiguredDataDirectory() {
  if (process.env.MYT_TTS_DATA_DIR) {
    hasConfiguredDataLocation = true;
    return path.resolve(process.env.MYT_TTS_DATA_DIR);
  }

  localState = loadJson(localStateFile, {});
  if (localState.appMode === 'internal') {
    const internalProfile = getInternalProfileInfo(localState.internalProfilePath);
    if (internalProfile.valid) {
      hasConfiguredDataLocation = true;
      return internalProfile.dataDirectory;
    }
  }
  if (localState?.dataDirectory) {
    hasConfiguredDataLocation = true;
    return path.resolve(String(localState.dataDirectory));
  }

  const legacyPointer = loadJson(legacyDataLocationFile, {});
  const legacyOnboarding = loadJson(legacyOnboardingFile, {});
  let migratedDirectory = legacyPointer?.dataDirectory
    ? path.resolve(String(legacyPointer.dataDirectory))
    : '';
  if (!migratedDirectory && hasBusinessData(legacyDefaultDataDirectory)) {
    migratedDirectory = legacyDefaultDataDirectory;
  }
  if (!migratedDirectory && hasBusinessData(app.getPath('userData'))) {
    migratedDirectory = app.getPath('userData');
  }

  if (migratedDirectory) {
    localState = {
      schemaVersion: 2,
      dataDirectory: migratedDirectory,
      appMode: 'public',
      onboardingCompleted: legacyOnboarding.completed === true,
      migratedFromLegacyPortable: true,
      updatedAt: new Date().toISOString(),
    };
    writeJson(localStateFile, localState);
    hasConfiguredDataLocation = true;
    for (const legacyFile of [legacyDataLocationFile, legacyOnboardingFile]) {
      try { fs.unlinkSync(legacyFile); } catch {}
    }
    return migratedDirectory;
  }

  return defaultDataDirectory;
}

let dataDirectory = readConfiguredDataDirectory();
let legacyDataCopied = false;

function samePath(left, right) {
  return path.resolve(left).toLowerCase() === path.resolve(right).toLowerCase();
}

function isPathInside(parent, child) {
  const relative = path.relative(path.resolve(parent), path.resolve(child));
  return Boolean(relative && !relative.startsWith('..') && !path.isAbsolute(relative));
}

function getDirectoryAccessInfo(target) {
  const exists = fs.existsSync(target);
  let accessTarget = exists ? target : path.dirname(target);
  while (!fs.existsSync(accessTarget)) {
    const parent = path.dirname(accessTarget);
    if (samePath(parent, accessTarget)) break;
    accessTarget = parent;
  }
  let available = false;
  try {
    if (fs.existsSync(accessTarget)) {
      fs.accessSync(accessTarget, fs.constants.R_OK | fs.constants.W_OK);
      available = true;
    }
  } catch {}
  return { exists, available };
}

function getMachineSecretId() {
  const identity = `${os.hostname()}\0${os.userInfo().username}`;
  return crypto.createHash('sha256').update(identity).digest('hex').slice(0, 20);
}

function getSecretPath(root = dataDirectory) {
  return path.join(root, 'secrets', `${getMachineSecretId()}.json`);
}

function getSettingsPath(root = dataDirectory) {
  return path.join(root, 'settings.json');
}

function getHistoryPath(root = dataDirectory) {
  return path.join(root, 'history.json');
}

function getGeneratedAudioDir(root = dataDirectory) {
  return path.join(root, 'generated');
}

function hasBusinessData(root) {
  return fs.existsSync(getSettingsPath(root))
    || fs.existsSync(getHistoryPath(root))
    || fs.existsSync(getGeneratedAudioDir(root));
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2), 'utf8');
}

function loadJson(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return fallback;
  }
}

function rewriteHistoryPaths(root) {
  const historyPath = getHistoryPath(root);
  const entries = loadJson(historyPath, []);
  if (!Array.isArray(entries)) return;
  for (const entry of entries) {
    if (entry?.filePath) entry.filePath = path.join(getGeneratedAudioDir(root), path.basename(entry.filePath));
  }
  writeJson(historyPath, entries);
}

function copyBusinessData(source, target) {
  if (samePath(source, target)) return;
  if (isPathInside(source, target)) throw new Error('新数据目录不能放在当前数据目录内部。');
  fs.mkdirSync(target, { recursive: true });
  for (const name of ['settings.json', 'history.json']) {
    const sourceFile = path.join(source, name);
    if (fs.existsSync(sourceFile)) fs.copyFileSync(sourceFile, path.join(target, name));
  }
  const sourceAudio = getGeneratedAudioDir(source);
  if (fs.existsSync(sourceAudio)) {
    fs.cpSync(sourceAudio, getGeneratedAudioDir(target), { recursive: true, force: true });
  }
  const sourceSecret = getSecretPath(source);
  if (fs.existsSync(sourceSecret)) {
    const targetSecret = getSecretPath(target);
    fs.mkdirSync(path.dirname(targetSecret), { recursive: true });
    fs.copyFileSync(sourceSecret, targetSecret);
  }
  if (fs.existsSync(getHistoryPath(target))) rewriteHistoryPaths(target);
}

function migrateEmbeddedSecret(root) {
  const settingsPath = getSettingsPath(root);
  const stored = loadJson(settingsPath, {});
  if (!stored || typeof stored !== 'object' || !Object.hasOwn(stored, 'apiKeyEncrypted')) return;
  const secretPath = getSecretPath(root);
  if (stored.apiKeyEncrypted && !fs.existsSync(secretPath)) {
    writeJson(secretPath, { apiKeyEncrypted: stored.apiKeyEncrypted });
  }
  delete stored.apiKeyEncrypted;
  writeJson(settingsPath, stored);
}

function migrateLegacyDataIfNeeded() {
  if (!hasConfiguredDataLocation || !fs.existsSync(dataDirectory)) return;
  if (process.env.MYT_TTS_SKIP_LEGACY_MIGRATION === '1') {
    migrateEmbeddedSecret(dataDirectory);
    return;
  }
  const legacyDirectory = app.getPath('userData');
  if (samePath(legacyDirectory, dataDirectory)) {
    migrateEmbeddedSecret(dataDirectory);
    return;
  }
  if (!hasBusinessData(dataDirectory) && hasBusinessData(legacyDirectory)) {
    copyBusinessData(legacyDirectory, dataDirectory);
    legacyDataCopied = true;
  }
  migrateEmbeddedSecret(dataDirectory);
}

function saveDataLocation(target) {
  hasConfiguredDataLocation = true;
  localState = {
    ...localState,
    schemaVersion: 2,
    dataDirectory: path.resolve(target),
    updatedAt: new Date().toISOString(),
  };
  writeJson(localStateFile, localState);
}

function getDataLocationInfo() {
  const access = getDirectoryAccessInfo(dataDirectory);
  return {
    path: dataDirectory,
    defaultPath: defaultDataDirectory,
    executableDirectory,
    isDefault: samePath(dataDirectory, defaultDataDirectory),
    configured: hasConfiguredDataLocation,
    exists: access.exists,
    available: access.available,
    persistence: 'windows-user-index',
    legacyDataCopied,
    appMode: getAppMode(),
  };
}

function getOnboardingStatus() {
  localState = loadJson(localStateFile, localState);
  const current = getDataLocationInfo();
  const completed = localState.onboardingCompleted === true;
  const settings = getSettings();
  const appMode = getAppMode();
  // Public mode stays independent from organization storage. Only inspect the
  // internal profile after the user explicitly selects the internal edition.
  const internalProfile = appMode === 'internal'
    ? getInternalProfileInfo(localState.internalProfilePath)
    : {
        profilePath: '',
        fileName: INTERNAL_PROFILE_FILE,
        exists: false,
        valid: false,
        available: false,
        dataDirectory: '',
        displayName: 'MytimesXR 内部配置',
        error: '',
      };
  const internalUnavailable = appMode === 'internal' && (!internalProfile.valid || !internalProfile.available);
  return {
    shouldShow: process.env.MYT_TTS_FORCE_ONBOARDING === '1'
      || !completed
      || !appMode
      || !current.configured
      || !current.exists
      || !current.available
      || internalUnavailable,
    completed,
    appMode,
    modeSelected: Boolean(appMode),
    needsLocationRecovery: completed && (!current.exists || !current.available || internalUnavailable),
    internalProfile,
    current,
    currentHasSettings: fs.existsSync(getSettingsPath()),
    currentHasHistory: fs.existsSync(getHistoryPath()),
    currentHasKey: Boolean(settings.apiKey),
  };
}

function completeOnboarding() {
  const current = getDataLocationInfo();
  const appMode = getAppMode();
  if (!appMode) throw new Error('请先选择公开版或 MytimesXR 内部设置。');
  if (appMode === 'internal') {
    const internalProfile = getInternalProfileInfo(localState.internalProfilePath);
    if (!internalProfile.valid || !internalProfile.available) throw new Error(internalProfile.error || '内部配置当前不可用。');
  }
  if (!current.configured || !current.exists || !current.available) {
    throw new Error('请先选择一个当前可用的数据目录。');
  }
  localState = {
    ...localState,
    schemaVersion: 2,
    dataDirectory: dataDirectory,
    onboardingCompleted: true,
    completedAt: new Date().toISOString(),
    appVersion: app.getVersion(),
    updatedAt: new Date().toISOString(),
  };
  writeJson(localStateFile, localState);
  return getOnboardingStatus();
}

function resetOnboarding() {
  localState = loadJson(localStateFile, localState);
  localState = {
    ...localState,
    schemaVersion: 2,
    onboardingCompleted: false,
    updatedAt: new Date().toISOString(),
  };
  delete localState.completedAt;
  delete localState.appMode;
  delete localState.internalProfilePath;
  writeJson(localStateFile, localState);
  return getOnboardingStatus();
}

async function useInternalProfile(profilePath = '') {
  const profile = getInternalProfileInfo(profilePath);
  if (!profile.valid || !profile.available) throw new Error(profile.error || '内部配置当前不可用。');
  saveAppMode('internal', profile.profilePath);
  const result = await switchDataDirectory(profile.dataDirectory, 'use-existing');
  return { ...result, appMode: 'internal', internalProfile: profile };
}

async function switchDataDirectory(target, strategy = 'ask') {
  const resolvedTarget = path.resolve(target);
  if (samePath(resolvedTarget, dataDirectory)) {
    fs.mkdirSync(resolvedTarget, { recursive: true });
    saveDataLocation(resolvedTarget);
    migrateEmbeddedSecret(resolvedTarget);
    return { cancelled: false, ...getDataLocationInfo() };
  }
  if (hasConfiguredDataLocation && isPathInside(dataDirectory, resolvedTarget)) {
    throw new Error('请选择当前数据目录之外的独立文件夹。');
  }

  let useExisting = strategy === 'use-existing';
  if (hasBusinessData(resolvedTarget) && strategy === 'ask') {
    const confirmation = await dialog.showMessageBox(mainWindow, {
      type: 'question',
      title: '目标目录已有 Mytimes TTS 数据',
      message: '请选择如何使用目标目录',
      detail: '“使用现有数据”会切换到目标目录已有的设置和历史；“复制当前数据”会用当前数据覆盖同名文件，但不会删除目标目录中的其他文件。',
      buttons: ['使用现有数据', '复制当前数据', '取消'],
      defaultId: 0,
      cancelId: 2,
      noLink: true,
    });
    if (confirmation.response === 2) return { cancelled: true, ...getDataLocationInfo() };
    useExisting = confirmation.response === 0;
  }

  if (!useExisting && hasConfiguredDataLocation && hasBusinessData(dataDirectory)) {
    copyBusinessData(dataDirectory, resolvedTarget);
  }
  fs.mkdirSync(resolvedTarget, { recursive: true });
  dataDirectory = resolvedTarget;
  saveDataLocation(resolvedTarget);
  migrateEmbeddedSecret(dataDirectory);
  return { cancelled: false, usedExisting: useExisting, ...getDataLocationInfo() };
}

function loadHistory() {
  try {
    const historyPath = getHistoryPath();
    if (!fs.existsSync(historyPath)) return [];
    const parsed = JSON.parse(fs.readFileSync(historyPath, 'utf8'));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persistHistory(entries) {
  fs.mkdirSync(path.dirname(getHistoryPath()), { recursive: true });
  fs.writeFileSync(getHistoryPath(), JSON.stringify(entries, null, 2), 'utf8');
}

function getWavDuration(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 44 || buffer.toString('ascii', 0, 4) !== 'RIFF') return 0;
  const byteRate = buffer.readUInt32LE(28);
  const dataSize = buffer.readUInt32LE(40);
  return byteRate > 0 ? dataSize / byteRate : 0;
}

function toPublicHistoryEntry(entry) {
  return {
    id: entry.id,
    createdAt: entry.createdAt,
    mode: entry.mode,
    text: entry.text,
    style: entry.style,
    voice: entry.voice,
    voiceDesign: entry.voiceDesign,
    provider: normalizeProviderId(entry.provider),
    model: String(entry.model || ''),
    duration: entry.duration,
    bytes: entry.bytes,
    filePath: entry.filePath,
  };
}

function saveGeneratedHistory(payload, audioBase64, metadata = {}) {
  const audioBuffer = Buffer.from(audioBase64, 'base64');
  const id = crypto.randomUUID();
  const audioDir = getGeneratedAudioDir();
  const filePath = path.join(audioDir, id + '.wav');
  fs.mkdirSync(audioDir, { recursive: true });
  fs.writeFileSync(filePath, audioBuffer);

  const entry = {
    id,
    createdAt: new Date().toISOString(),
    mode: payload.mode,
    text: String(payload.text || ''),
    style: String(payload.style || ''),
    voice: payload.mode === 'preset' ? String(payload.voice || 'mimo_default') : '',
    voiceDesign: payload.mode === 'design' ? String(payload.voiceDesign || '') : '',
    provider: normalizeProviderId(metadata.provider || payload.provider),
    model: String(metadata.model || ''),
    duration: getWavDuration(audioBuffer),
    bytes: audioBuffer.length,
    filePath,
  };

  const entries = loadHistory();
  entries.unshift(entry);
  while (entries.length > 100) {
    const removed = entries.pop();
    if (removed?.filePath && fs.existsSync(removed.filePath)) {
      try { fs.unlinkSync(removed.filePath); } catch {}
    }
  }
  persistHistory(entries);
  return toPublicHistoryEntry(entry);
}

function getHistorySummary() {
  const entries = loadHistory().filter((entry) => entry?.filePath && fs.existsSync(entry.filePath));
  return {
    entries: entries.map(toPublicHistoryEntry),
    totalBytes: entries.reduce((sum, entry) => sum + (Number(entry.bytes) || 0), 0),
  };
}

function loadSettingsFile() {
  return loadJson(getSettingsPath(), {});
}

function loadSecretFile() {
  return loadJson(getSecretPath(), {});
}

function decryptApiKey(encryptedValue) {
  if (!encryptedValue || !safeStorage.isEncryptionAvailable()) return '';
  try {
    return safeStorage.decryptString(Buffer.from(encryptedValue, 'base64'));
  } catch {
    return '';
  }
}

function getSettings() {
  const stored = loadSettingsFile();
  const secret = loadSecretFile();
  return {
    ...DEFAULT_SETTINGS,
    ...stored,
    apiKey: decryptApiKey(secret.apiKeyEncrypted),
    styleOptimizerApiKey: decryptApiKey(secret.styleOptimizerApiKeyEncrypted),
    volcAccessToken: decryptApiKey(secret.volcAccessTokenEncrypted),
    gptSovitsApiKey: decryptApiKey(secret.gptSovitsApiKeyEncrypted),
    indexTts2ApiKey: decryptApiKey(secret.indexTts2ApiKeyEncrypted),
  };
}

function saveSettings(nextSettings) {
  const current = getSettings();
  const merged = {
    ...current,
    ...nextSettings,
  };
  const fileData = {
    serviceType: merged.serviceType,
    baseUrl: String(merged.baseUrl || DEFAULT_SETTINGS.baseUrl).trim(),
    authMode: merged.authMode === 'bearer' ? 'bearer' : 'api-key',
    timeoutSeconds: Math.min(600, Math.max(30, Number(merged.timeoutSeconds) || 180)),
    styleOptimizerProvider: merged.styleOptimizerProvider === 'openai-compatible' ? 'openai-compatible' : 'disabled',
    styleOptimizerBaseUrl: String(merged.styleOptimizerBaseUrl || DEFAULT_SETTINGS.styleOptimizerBaseUrl).trim(),
    styleOptimizerModel: String(merged.styleOptimizerModel || DEFAULT_SETTINGS.styleOptimizerModel).trim(),
    styleOptimizerTimeoutSeconds: Math.min(600, Math.max(15, Number(merged.styleOptimizerTimeoutSeconds) || 120)),
    volcBaseUrl: String(merged.volcBaseUrl || DEFAULT_SETTINGS.volcBaseUrl).trim(),
    volcAppId: String(merged.volcAppId || '').trim(),
    volcCluster: String(merged.volcCluster || DEFAULT_SETTINGS.volcCluster).trim(),
    volcVoiceType: String(merged.volcVoiceType || DEFAULT_SETTINGS.volcVoiceType).trim(),
    volcSpeedRatio: Math.min(2, Math.max(0.2, Number(merged.volcSpeedRatio) || 1)),
    volcTimeoutSeconds: Math.min(600, Math.max(30, Number(merged.volcTimeoutSeconds) || 180)),
    gptSovitsBaseUrl: String(merged.gptSovitsBaseUrl || DEFAULT_SETTINGS.gptSovitsBaseUrl).trim(),
    gptSovitsTargetLanguage: String(merged.gptSovitsTargetLanguage || 'zh').trim(),
    gptSovitsReferenceLanguage: String(merged.gptSovitsReferenceLanguage || 'zh').trim(),
    gptSovitsReferenceText: String(merged.gptSovitsReferenceText || '').trim(),
    gptSovitsTextSplitMethod: String(merged.gptSovitsTextSplitMethod || 'cut5').trim(),
    gptSovitsTimeoutSeconds: Math.min(600, Math.max(15, Number(merged.gptSovitsTimeoutSeconds) || 180)),
    indexTts2BaseUrl: String(merged.indexTts2BaseUrl || DEFAULT_SETTINGS.indexTts2BaseUrl).trim(),
    indexTts2EmotionMode: ['text', 'vector', 'reference'].includes(merged.indexTts2EmotionMode)
      ? merged.indexTts2EmotionMode
      : 'text',
    indexTts2EmotionAlpha: Math.min(1, Math.max(0,
      Number.isFinite(Number(merged.indexTts2EmotionAlpha)) ? Number(merged.indexTts2EmotionAlpha) : 0.6)),
    indexTts2UseRandom: Boolean(merged.indexTts2UseRandom),
    indexTts2TimeoutSeconds: Math.min(1800, Math.max(15, Number(merged.indexTts2TimeoutSeconds) || 600)),
    theme: ['system', 'light', 'dark'].includes(merged.theme) ? merged.theme : 'system',
  };

  const secretValues = {
    apiKeyEncrypted: merged.apiKey,
    styleOptimizerApiKeyEncrypted: merged.styleOptimizerApiKey,
    volcAccessTokenEncrypted: merged.volcAccessToken,
    gptSovitsApiKeyEncrypted: merged.gptSovitsApiKey,
    indexTts2ApiKeyEncrypted: merged.indexTts2ApiKey,
  };
  if (Object.values(secretValues).some(Boolean)) {
    if (!safeStorage.isEncryptionAvailable()) {
      throw new Error('系统安全存储当前不可用，API Key 未保存。');
    }
  }
  const encryptedSecrets = {};
  for (const [field, value] of Object.entries(secretValues)) {
    encryptedSecrets[field] = value
      ? safeStorage.encryptString(String(value).trim()).toString('base64')
      : '';
  }

  writeJson(getSettingsPath(), fileData);
  writeJson(getSecretPath(), encryptedSecrets);
  return getSettings();
}

function normalizeEndpoint(baseUrl) {
  let url = String(baseUrl || DEFAULT_SETTINGS.baseUrl).trim().replace(/\/+$/, '');
  if (!/^https?:\/\//i.test(url)) {
    throw new Error('Base URL 必须以 http:// 或 https:// 开头。');
  }
  if (/\/chat\/completions$/i.test(url)) return url;
  if (/\/v1$/i.test(url)) return `${url}/chat/completions`;
  return `${url}/v1/chat/completions`;
}

function buildHeaders(settings) {
  const apiKey = String(settings.apiKey || '').trim();
  if (!apiKey) throw new Error('请先在设置中填写 API Key。');
  const headers = { 'Content-Type': 'application/json' };
  if (settings.authMode === 'bearer') {
    headers.Authorization = `Bearer ${apiKey}`;
  } else {
    headers['api-key'] = apiKey;
  }
  return headers;
}

function extractErrorText(rawText) {
  try {
    const parsed = JSON.parse(rawText);
    return parsed?.error?.message || parsed?.error || parsed?.message || rawText;
  } catch {
    return String(rawText || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  }
}

function formatApiError(status, rawText) {
  const detail = extractErrorText(rawText);
  const messages = {
    400: '请求参数不正确，请检查正文、模式和音频样本。',
    401: '认证失败，请检查 API Key、认证方式和服务类型。',
    402: '账户余额或可用额度不足。',
    403: '服务拒绝访问，可能是地区限制或 API Key 风控。',
    404: '没有找到 API 接口，请检查 Base URL。',
    421: '内容被安全审核拦截，请调整正文、风格或参考音频。',
    429: '请求过于频繁或套餐额度已用尽，请稍后重试。',
    500: 'MiMo 服务暂时出现内部错误。',
    503: 'MiMo 服务当前繁忙，请稍后重试。',
  };
  const prefix = messages[status] || `MiMo API 请求失败（${status}）。`;
  return detail && detail !== '[object Object]' ? `${prefix}\n${detail}` : prefix;
}

async function postToMimo(body, requestId) {
  const settings = getSettings();
  const controller = new AbortController();
  const timeoutMs = Math.max(30, Number(settings.timeoutSeconds) || 180) * 1000;
  const timeout = setTimeout(() => controller.abort('timeout'), timeoutMs);
  if (requestId) activeRequests.set(requestId, controller);

  try {
    const response = await fetch(normalizeEndpoint(settings.baseUrl), {
      method: 'POST',
      headers: buildHeaders(settings),
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const rawText = await response.text();
    if (!response.ok) throw new Error(formatApiError(response.status, rawText));
    try {
      return JSON.parse(rawText);
    } catch {
      throw new Error('MiMo API 返回了无法解析的数据。');
    }
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new Error(controller.signal.reason === 'timeout' ? '请求超时，请在设置中延长超时时间后重试。' : '生成已取消。');
    }
    throw error;
  } finally {
    clearTimeout(timeout);
    if (requestId) activeRequests.delete(requestId);
  }
}

function buildStyleOptimizerHeaders(settings) {
  const headers = { 'Content-Type': 'application/json' };
  const apiKey = String(settings.styleOptimizerApiKey || '').trim();
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;
  return headers;
}

function formatStyleOptimizerError(status, rawText) {
  const detail = extractErrorText(rawText);
  const prefix = status === 404
    ? '没有找到润色接口，请检查地址是否包含 /v1。'
    : status === 401
      ? '润色服务认证失败，请检查独立润色 API Key。'
      : `润色服务请求失败（${status}）。`;
  return detail && detail !== '[object Object]' ? `${prefix}\n${detail}` : prefix;
}

async function postToStyleOptimizer(messages) {
  const settings = getSettings();
  if (settings.styleOptimizerProvider !== 'openai-compatible') {
    throw new Error('尚未配置独立 LLM 润色服务。规则整理不会调用任何模型。');
  }
  const controller = new AbortController();
  const timeoutMs = Math.max(15, Number(settings.styleOptimizerTimeoutSeconds) || 120) * 1000;
  const timeout = setTimeout(() => controller.abort('timeout'), timeoutMs);
  try {
    const response = await fetch(normalizeEndpoint(settings.styleOptimizerBaseUrl), {
      method: 'POST',
      headers: buildStyleOptimizerHeaders(settings),
      body: JSON.stringify({
        model: String(settings.styleOptimizerModel || DEFAULT_SETTINGS.styleOptimizerModel).trim(),
        messages,
        max_tokens: 300,
        temperature: 0.3,
        stream: false,
      }),
      signal: controller.signal,
    });
    const rawText = await response.text();
    if (!response.ok) throw new Error(formatStyleOptimizerError(response.status, rawText));
    try {
      return JSON.parse(rawText);
    } catch {
      throw new Error('润色服务返回了无法解析的数据。');
    }
  } catch (error) {
    if (error?.name === 'AbortError') throw new Error('润色服务请求超时，请检查本地模型是否已经启动。');
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function validateGenerationPayload(payload) {
  const text = String(payload?.text || '').trim();
  if (!text) throw new Error('请输入需要合成的正文。');
  if (!['preset', 'design', 'clone'].includes(payload.mode)) throw new Error('未知的生成模式。');
  if (payload.mode === 'design' && !String(payload.voiceDesign || '').trim()) {
    throw new Error('请填写音色设计描述。');
  }
  if (payload.mode === 'clone') {
    const sample = payload.sample;
    if (!sample?.dataBase64 || !sample?.mimeType) throw new Error('请选择 WAV 或 MP3 参考音频。');
    const dataUri = `data:${sample.mimeType};base64,${sample.dataBase64}`;
    if (Buffer.byteLength(dataUri, 'utf8') > 10 * 1024 * 1024) {
      throw new Error('参考音频 Base64 编码后超过 10 MB，请压缩或裁剪后重试。');
    }
  }
  return text;
}

function buildTtsBody(payload) {
  const text = validateGenerationPayload(payload);
  const style = String(payload.style || '').trim();

  if (payload.mode === 'design') {
    return {
      model: 'mimo-v2.5-tts-voicedesign',
      messages: [
        { role: 'user', content: String(payload.voiceDesign).trim() },
        { role: 'assistant', content: text },
      ],
      audio: { format: 'wav' },
    };
  }

  if (payload.mode === 'clone') {
    return {
      model: 'mimo-v2.5-tts-voiceclone',
      messages: [
        { role: 'user', content: style },
        { role: 'assistant', content: text },
      ],
      audio: {
        format: 'wav',
        voice: `data:${payload.sample.mimeType};base64,${payload.sample.dataBase64}`,
      },
    };
  }

  return {
    model: 'mimo-v2.5-tts',
    messages: [
      { role: 'user', content: style },
      { role: 'assistant', content: text },
    ],
    audio: {
      format: 'wav',
      voice: String(payload.voice || 'mimo_default'),
    },
  };
}

function navigateToPage(page) {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
  mainWindow.webContents.send('app:navigate', page);
}

function createApplicationMenu() {
  if (process.platform !== 'darwin') return;
  const menu = Menu.buildFromTemplate([
    {
      label: app.name,
      submenu: [
        { role: 'about', label: `关于 ${app.name}` },
        { type: 'separator' },
        { label: '设置…', accelerator: 'CommandOrControl+,', click: () => navigateToPage('settings') },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' },
      ],
    },
    { role: 'editMenu' },
    { role: 'windowMenu' },
    {
      role: 'help',
      submenu: [
        {
          label: 'Xiaomi MiMo 语音合成文档',
          click: () => shell.openExternal('https://mimo.mi.com/docs/zh-CN/usage-guide/speech-synthesis'),
        },
      ],
    },
  ]);
  Menu.setApplicationMenu(menu);
}

function createWindow() {
  const isMac = process.platform === 'darwin';
  mainWindow = new BrowserWindow({
    width: 1180,
    height: 790,
    minWidth: 920,
    minHeight: 650,
    ...(isMac
      ? { titleBarStyle: 'hiddenInset', trafficLightPosition: { x: 14, y: 16 } }
      : { frame: false }),
    title: 'Mytimes TTS',
    icon: path.join(__dirname, '..', 'build', 'icon.png'),
    backgroundColor: '#eef3f8',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.loadFile(path.join(__dirname, '..', 'app', 'index.html'));
  mainWindow.once('ready-to-show', async () => {
    mainWindow.show();
    const screenshotPath = process.env.MYT_TTS_SMOKE_SCREENSHOT;
    if (screenshotPath) {
      const page = process.env.MYT_TTS_SMOKE_PAGE;
      await new Promise((resolve) => setTimeout(resolve, 450));
      if (page === 'settings') await mainWindow.webContents.executeJavaScript("document.getElementById('openSettings').click()");
      if (page === 'history') await mainWindow.webContents.executeJavaScript("document.getElementById('openHistory').click()");
      if (page === 'onboarding-storage') await mainWindow.webContents.executeJavaScript("document.getElementById('onboardingPublicButton').click()");
      if (page === 'onboarding-company' || page === 'onboarding-complete-company') {
        await mainWindow.webContents.executeJavaScript("document.getElementById('onboardingInternalButton').click()");
        await new Promise((resolve) => setTimeout(resolve, 150));
        await mainWindow.webContents.executeJavaScript("if (!document.getElementById('onboardingCompanyButton').disabled) document.getElementById('onboardingCompanyButton').click()");
        if (page === 'onboarding-complete-company') {
          await new Promise((resolve) => setTimeout(resolve, 250));
          await mainWindow.webContents.executeJavaScript("document.getElementById('onboardingFinish').click()");
        }
      }
      await new Promise((resolve) => setTimeout(resolve, 700));
      const image = await mainWindow.webContents.capturePage();
      fs.writeFileSync(screenshotPath, image.toPNG());
      app.quit();
    }
  });
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  migrateLegacyDataIfNeeded();
  ipcMain.handle('app:info', () => ({
    name: app.getName(),
    version: app.getVersion(),
    platform: process.platform,
  }));
  ipcMain.handle('settings:get', () => getSettings());
  ipcMain.handle('settings:save', (_event, settings) => saveSettings(settings));
  ipcMain.handle('providers:list', () => getProviderCatalog(providerRegistry.ids()));
  ipcMain.handle('providers:test', (_event, providerId) => {
    const provider = providerRegistry.get(normalizeProviderId(providerId));
    if (typeof provider.testConnection !== 'function') throw new Error('该语音引擎不支持连接测试。');
    return provider.testConnection();
  });
  ipcMain.handle('settings:confirm-test', async (_event, providerId) => {
    const isVolcengine = normalizeProviderId(providerId) === 'volcengine';
    const result = await dialog.showMessageBox(mainWindow, {
      type: 'question',
      title: isVolcengine ? '确认测试火山引擎连接' : '确认测试 MiMo 连接',
      message: isVolcengine
        ? '连接测试会用火山引擎合成“连接测试”'
        : '连接测试会调用一次 Xiaomi MiMo 文本模型',
      detail: isVolcengine
        ? '这会产生一次很短的语音合成请求，可能计入当前火山引擎账号用量。只点击“保存设置”不会产生请求。'
        : '这是一条很小的请求，但仍可能计入你的个人账号 Token 或额度。只点击“保存设置”不会产生请求。',
      buttons: ['继续测试', '取消'],
      defaultId: 1,
      cancelId: 1,
      noLink: true,
    });
    return result.response === 0;
  });
  ipcMain.handle('settings:test', async () => {
    return providerRegistry.get('mimo').testConnection();
  });

  ipcMain.handle('storage:get-location', () => getDataLocationInfo());
  ipcMain.handle('storage:use-company-location', () => {
    if (getAppMode() !== 'internal') throw new Error('公开版不会读取内部配置。请重新运行首次设置并选择 MytimesXR 内部设置。');
    return useInternalProfile(localState.internalProfilePath);
  });
  ipcMain.handle('storage:use-public-default', () => {
    if (getAppMode() !== 'public') throw new Error('请先选择公开版。');
    return switchDataDirectory(defaultDataDirectory, 'use-existing');
  });
  ipcMain.handle('storage:choose-location', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: '选择 Mytimes TTS 数据目录',
      defaultPath: dataDirectory,
      buttonLabel: '使用此目录',
      properties: ['openDirectory', 'createDirectory'],
    });
    if (result.canceled || !result.filePaths[0]) return { cancelled: true, ...getDataLocationInfo() };
    return switchDataDirectory(result.filePaths[0]);
  });
  ipcMain.handle('storage:reset-location', () => switchDataDirectory(defaultDataDirectory));
  ipcMain.handle('storage:reveal-location', async () => {
    fs.mkdirSync(dataDirectory, { recursive: true });
    const error = await shell.openPath(dataDirectory);
    if (error) throw new Error(error);
    return { ok: true };
  });
  ipcMain.handle('onboarding:get-status', () => getOnboardingStatus());
  ipcMain.handle('onboarding:set-mode', (_event, mode) => saveAppMode(String(mode || '')));
  ipcMain.handle('onboarding:use-internal-profile', () => useInternalProfile(localState.internalProfilePath));
  ipcMain.handle('onboarding:choose-internal-profile', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: '选择 MytimesXR 内部配置文件',
      defaultPath: localState.internalProfilePath || getDefaultInternalProfilePath(),
      buttonLabel: '使用此配置',
      properties: ['openFile'],
      filters: [{ name: 'Mytimes TTS internal profile', extensions: ['json'] }],
    });
    if (result.canceled || !result.filePaths[0]) return { cancelled: true, ...getDataLocationInfo() };
    return useInternalProfile(result.filePaths[0]);
  });
  ipcMain.handle('onboarding:complete', () => completeOnboarding());
  ipcMain.handle('onboarding:reset', () => resetOnboarding());

  ipcMain.handle('style:optimize', async (_event, style) => {
    const sourceStyle = String(style || '').trim();
    if (!sourceStyle) throw new Error('请先填写或选择风格描述。');
    const result = await postToStyleOptimizer([
      {
        role: 'system',
        content: '你是文字转语音的演绎指导编辑。只优化用户提供的声音演绎风格，不生成、不引用、不修改任何待朗读正文。请输出 JSON，字段 optimized_style 是 1 至 3 句可直接作为 TTS 风格指令的中文自然语言，字段 warnings 是字符串数组。不要输出 JSON 以外的内容。',
      },
      { role: 'user', content: sourceStyle },
    ]);
    const content = result?.choices?.[0]?.message?.content;
    if (!content) throw new Error('AI 没有返回风格描述。');
    try {
      const parsed = JSON.parse(content);
      return {
        optimizedStyle: String(parsed.optimized_style || '').trim(),
        warnings: Array.isArray(parsed.warnings) ? parsed.warnings.map(String) : [],
      };
    } catch {
      return { optimizedStyle: String(content).trim(), warnings: [] };
    }
  });

  ipcMain.handle('tts:generate', async (_event, payload) => {
    const providerId = normalizeProviderId(payload?.provider);
    const provider = providerRegistry.get(providerId);
    const normalizedPayload = { ...payload, provider: providerId };
    const result = await provider.generate(normalizedPayload);
    let historyEntry = null;
    try {
      historyEntry = saveGeneratedHistory(normalizedPayload, result.audio, result);
    } catch (error) {
      console.error('[History] Unable to save generated audio:', error.message);
    }
    return { ...result, historyEntry };
  });

  ipcMain.handle('tts:cancel', (_event, requestId) => {
    const controller = activeRequests.get(requestId);
    if (controller) controller.abort('cancelled');
    return { cancelled: Boolean(controller) };
  });

  ipcMain.handle('audio:save', async (_event, payload) => {
    if (!payload?.audio) throw new Error('没有可保存的音频。');
    const result = await dialog.showSaveDialog(mainWindow, {
      title: '保存生成的语音',
      defaultPath: payload.suggestedName || `MytimesTTS-${Date.now()}.wav`,
      filters: [{ name: 'WAV 音频', extensions: ['wav'] }],
    });
    if (result.canceled || !result.filePath) return { cancelled: true };
    fs.writeFileSync(result.filePath, Buffer.from(payload.audio, 'base64'));
    return { cancelled: false, filePath: result.filePath };
  });

  ipcMain.handle('audio:reveal', (_event, filePath) => {
    if (filePath && fs.existsSync(filePath)) shell.showItemInFolder(filePath);
    return { ok: true };
  });

  ipcMain.handle('history:list', () => getHistorySummary());

  ipcMain.handle('history:audio', (_event, id) => {
    const entry = loadHistory().find((item) => item.id === id);
    if (!entry?.filePath || !fs.existsSync(entry.filePath)) {
      throw new Error('历史音频文件不存在，记录可能已被移动或清理。');
    }
    return {
      audio: fs.readFileSync(entry.filePath).toString('base64'),
      filePath: entry.filePath,
      entry: toPublicHistoryEntry(entry),
    };
  });

  ipcMain.handle('history:delete', (_event, id) => {
    const entries = loadHistory();
    const target = entries.find((item) => item.id === id);
    if (target?.filePath && fs.existsSync(target.filePath)) {
      try { fs.unlinkSync(target.filePath); } catch {}
    }
    persistHistory(entries.filter((item) => item.id !== id));
    return getHistorySummary();
  });

  ipcMain.handle('history:clear', () => {
    const entries = loadHistory();
    for (const entry of entries) {
      if (entry?.filePath && fs.existsSync(entry.filePath)) {
        try { fs.unlinkSync(entry.filePath); } catch {}
      }
    }
    persistHistory([]);
    return getHistorySummary();
  });

  ipcMain.on('window:minimize', () => mainWindow?.minimize());
  ipcMain.on('window:toggle-maximize', () => {
    if (!mainWindow) return;
    if (mainWindow.isMaximized()) mainWindow.unmaximize();
    else mainWindow.maximize();
  });
  ipcMain.on('window:close', () => mainWindow?.close());

  createWindow();
  createApplicationMenu();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
