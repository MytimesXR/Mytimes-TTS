const MODE_META = {
  preset: {
    description: '选择官方音色，添加演绎风格，然后生成清晰自然的语音。',
    status: '使用 mimo-v2.5-tts 生成',
  },
  design: {
    description: '用年龄、质感、节奏和角色描述创造独特音色。',
    status: '使用 mimo-v2.5-tts-voicedesign 生成',
  },
  clone: {
    description: '上传一段已获授权的参考录音，用同类音色朗读新文本。',
    status: '使用 mimo-v2.5-tts-voiceclone 生成',
  },
};

const SERVICE_URLS = {
  standard: 'https://api.xiaomimimo.com/v1',
  'token-plan': 'https://token-plan-cn.xiaomimimo.com/v1',
};

const state = {
  mode: 'preset',
  currentPage: 'generator',
  appInfo: null,
  history: [],
  settings: null,
  dataLocation: null,
  onboarding: null,
  selectedTags: new Set(),
  sampleFile: null,
  sampleUrl: '',
  audioBase64: '',
  audioUrl: '',
  lastSavedPath: '',
  currentRequestId: '',
  waveformAnimation: 0,
  waveformPeaks: [],
  waveformDragging: false,
  toastTimer: 0,
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const elements = {
  pageDescription: $('#pageDescription'),
  presetPanel: $('#presetPanel'),
  designPanel: $('#designPanel'),
  clonePanel: $('#clonePanel'),
  stylePanel: $('#stylePanel'),
  voiceSelect: $('#voiceSelect'),
  voiceDesign: $('#voiceDesign'),
  designAge: $('#designAge'),
  designTexture: $('#designTexture'),
  designPace: $('#designPace'),
  designRole: $('#designRole'),
  styleText: $('#styleText'),
  scriptText: $('#scriptText'),
  characterCount: $('#characterCount'),
  generateButton: $('#generateButton'),
  cancelGeneration: $('#cancelGeneration'),
  statusTitle: $('#statusTitle'),
  statusDetail: $('#statusDetail'),
  generationStatus: $('#generationStatus'),
  progressTrack: $('#progressTrack'),
  resultBadge: $('#resultBadge'),
  resultAudio: $('#resultAudio'),
  playButton: $('#playButton'),
  seekBar: $('#seekBar'),
  audioTime: $('#audioTime'),
  saveAudio: $('#saveAudio'),
  revealAudio: $('#revealAudio'),
  waveform: $('#waveform'),
  voiceFile: $('#voiceFile'),
  dropZone: $('#dropZone'),
  sampleCard: $('#sampleCard'),
  sampleName: $('#sampleName'),
  sampleMeta: $('#sampleMeta'),
  sampleAudio: $('#sampleAudio'),
  samplePlay: $('#samplePlay'),
  sampleSeek: $('#sampleSeek'),
  sampleTime: $('#sampleTime'),
  voiceConsent: $('#voiceConsent'),
  optimizeReview: $('#optimizeReview'),
  optimizedStyleText: $('#optimizedStyleText'),
generatorPage: $('#generatorPage'),
  historyPage: $('#historyPage'),
  settingsPage: $('#settingsPage'),
  historyList: $('#historyList'),
  historyEmpty: $('#historyEmpty'),
  historyCount: $('#historyCount'),
  storageSummary: $('#storageSummary'),
  dataLocationBadge: $('#dataLocationBadge'),
  dataLocationPath: $('#dataLocationPath'),
  resetDataLocation: $('#resetDataLocation'),
  onboardingOverlay: $('#onboardingOverlay'),
  onboardingWelcome: $('#onboardingWelcome'),
  onboardingStorage: $('#onboardingStorage'),
  onboardingReady: $('#onboardingReady'),
  onboardingCompanyBadge: $('#onboardingCompanyBadge'),
  onboardingCompanyPath: $('#onboardingCompanyPath'),
  onboardingCompanyDetail: $('#onboardingCompanyDetail'),
  onboardingCompanyButton: $('#onboardingCompanyButton'),
  onboardingReadyTitle: $('#onboardingReadyTitle'),
  onboardingReadyDetail: $('#onboardingReadyDetail'),
  onboardingReadyPath: $('#onboardingReadyPath'),
  settingsConnectionBadge: $('#settingsConnectionBadge'),
  serviceType: $('#serviceType'),
  baseUrl: $('#baseUrl'),
  apiKey: $('#apiKey'),
  authMode: $('#authMode'),
  timeoutSeconds: $('#timeoutSeconds'),
  themeSelect: $('#themeSelect'),
  settingsMessage: $('#settingsMessage'),
  connectionDot: $('#connectionDot'),
  connectionTitle: $('#connectionTitle'),
  connectionDetail: $('#connectionDetail'),
  appVersion: $('#appVersion'),
  toast: $('#toast'),
};

async function initialize() {
  applyPlatformUi();
  bindEvents();
  setMode(state.mode);
  const [settings, appInfo, dataLocation, onboarding] = await Promise.all([
    window.mytApp.settings.get(),
    window.mytApp.app.getInfo(),
    window.mytApp.storage.getLocation(),
    window.mytApp.onboarding.getStatus(),
  ]);
  state.settings = settings;
  state.appInfo = appInfo;
  state.dataLocation = dataLocation;
  state.onboarding = onboarding;
  elements.appVersion.textContent = `v${appInfo.version}`;
  populateSettingsForm();
  updateDataLocationUi();
  applyTheme(state.settings.theme);
  refreshConnectionStatus();
  await loadHistory();
  resizeWaveformCanvas();
  drawIdleWaveform();
  if (dataLocation.legacyDataCopied) showToast('已将旧设置、历史和音频复制到便携数据目录。');
  if (onboarding.shouldShow) openOnboarding(onboarding);
}

function bindEvents() {
  $('#minimizeWindow').addEventListener('click', () => window.mytApp.window.minimize());
  $('#maximizeWindow').addEventListener('click', () => window.mytApp.window.toggleMaximize());
  $('#closeWindow').addEventListener('click', () => window.mytApp.window.close());
  $('#openGenerator').addEventListener('click', () => showPage('generator'));
  $('#openHistory').addEventListener('click', () => showPage('history'));
  $('#openSettings').addEventListener('click', openSettings);
  $('#headerSettings').addEventListener('click', openSettings);
  window.mytApp.app.onNavigate((page) => {
    if (page === 'settings') openSettings();
    else if (page === 'history') showPage('history');
    else if (page === 'generator') showPage('generator');
  });

  const modeButtons = $$('.mode-button');
  modeButtons.forEach((button, index) => {
    button.addEventListener('click', () => setMode(button.dataset.mode));
    button.addEventListener('keydown', (event) => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      let nextIndex = index;
      if (event.key === 'ArrowLeft') nextIndex = (index - 1 + modeButtons.length) % modeButtons.length;
      if (event.key === 'ArrowRight') nextIndex = (index + 1) % modeButtons.length;
      if (event.key === 'Home') nextIndex = 0;
      if (event.key === 'End') nextIndex = modeButtons.length - 1;
      modeButtons[nextIndex].focus();
      modeButtons[nextIndex].click();
    });
  });

  $$('#styleChips button').forEach((button) => {
    button.setAttribute('aria-pressed', 'false');
    button.addEventListener('click', () => {
      const tag = button.dataset.tag;
      if (state.selectedTags.has(tag)) state.selectedTags.delete(tag);
      else state.selectedTags.add(tag);
      button.classList.toggle('selected', state.selectedTags.has(tag));
      button.setAttribute('aria-pressed', String(state.selectedTags.has(tag)));
    });
  });

  $('#organizeStyle').addEventListener('click', organizeStyle);
  $('#optimizeStyle').addEventListener('click', optimizeStyle);
  $('#discardOptimized').addEventListener('click', () => elements.optimizeReview.classList.add('hidden'));
  $('#applyOptimized').addEventListener('click', () => {
    elements.styleText.value = elements.optimizedStyleText.textContent;
    state.selectedTags.clear();
    $$('#styleChips button').forEach((button) => {
      button.classList.remove('selected');
      button.setAttribute('aria-pressed', 'false');
    });
    elements.optimizeReview.classList.add('hidden');
    showToast('已应用 AI 风格建议。');
  });

  $('#composeDesign').addEventListener('click', composeVoiceDesign);
  elements.scriptText.addEventListener('input', updateCharacterCount);
  elements.scriptText.addEventListener('keydown', (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault();
      generateAudio();
    }
  });

  elements.generateButton.addEventListener('click', generateAudio);
  elements.cancelGeneration.addEventListener('click', cancelGeneration);
  elements.voiceFile.addEventListener('change', () => handleSampleFile(elements.voiceFile.files[0]));
  $('#removeSample').addEventListener('click', removeSample);
  ['dragenter', 'dragover'].forEach((eventName) => {
    elements.dropZone.addEventListener(eventName, (event) => {
      event.preventDefault();
      elements.dropZone.classList.add('dragging');
    });
  });
  ['dragleave', 'drop'].forEach((eventName) => {
    elements.dropZone.addEventListener(eventName, (event) => {
      event.preventDefault();
      elements.dropZone.classList.remove('dragging');
    });
  });
  elements.dropZone.addEventListener('drop', (event) => handleSampleFile(event.dataTransfer.files[0]));

  elements.playButton.addEventListener('click', togglePlayback);
  elements.seekBar.addEventListener('input', () => {
    if (!Number.isFinite(elements.resultAudio.duration)) return;
    elements.resultAudio.currentTime = (Number(elements.seekBar.value) / 1000) * elements.resultAudio.duration;
    syncRangeProgress(elements.seekBar, Number(elements.seekBar.value) / 1000);
  });
  elements.samplePlay.addEventListener('click', toggleSamplePlayback);
  elements.sampleSeek.addEventListener('input', () => {
    if (!Number.isFinite(elements.sampleAudio.duration)) return;
    elements.sampleAudio.currentTime = (Number(elements.sampleSeek.value) / 1000) * elements.sampleAudio.duration;
    updateSamplePlayer();
  });
  elements.sampleAudio.addEventListener('timeupdate', updateSamplePlayer);
  elements.sampleAudio.addEventListener('loadedmetadata', updateSamplePlayer);
  elements.sampleAudio.addEventListener('play', () => setMediaPlayState(elements.samplePlay, true, '参考音频'));
  elements.sampleAudio.addEventListener('pause', () => setMediaPlayState(elements.samplePlay, false, '参考音频'));
  elements.sampleAudio.addEventListener('ended', () => setMediaPlayState(elements.samplePlay, false, '参考音频'));
  elements.waveform.addEventListener('pointerdown', beginWaveformSeek);
  elements.waveform.addEventListener('pointermove', continueWaveformSeek);
  elements.waveform.addEventListener('pointerup', endWaveformSeek);
  elements.waveform.addEventListener('pointercancel', endWaveformSeek);
  elements.waveform.addEventListener('keydown', handleWaveformKeyboard);
  elements.resultAudio.addEventListener('timeupdate', updatePlayerTime);
  elements.resultAudio.addEventListener('loadedmetadata', updatePlayerTime);
  elements.resultAudio.addEventListener('play', () => setMediaPlayState(elements.playButton, true, '音频'));
  elements.resultAudio.addEventListener('pause', () => setMediaPlayState(elements.playButton, false, '音频'));
  elements.resultAudio.addEventListener('ended', () => setMediaPlayState(elements.playButton, false, '音频'));
  elements.saveAudio.addEventListener('click', saveAudio);
  elements.revealAudio.addEventListener('click', () => window.mytApp.audio.reveal(state.lastSavedPath));

  $('#backToGenerator').addEventListener('click', () => showPage('generator'));
  $('#emptyStartGenerating').addEventListener('click', () => showPage('generator'));
  $('#openHistoryFromSettings').addEventListener('click', () => showPage('history'));
  $('#useCompanyDataLocation').addEventListener('click', useCompanyDataLocation);
  $('#chooseDataLocation').addEventListener('click', chooseDataLocation);
  $('#openDataLocation').addEventListener('click', openDataLocation);
  $('#resetDataLocation').addEventListener('click', resetDataLocation);
  $('#onboardingStart').addEventListener('click', () => showOnboardingStep('storage'));
  $('#onboardingBackWelcome').addEventListener('click', () => showOnboardingStep('welcome'));
  $('#onboardingBackStorage').addEventListener('click', () => showOnboardingStep('storage'));
  $('#onboardingCompanyButton').addEventListener('click', useOnboardingCompanyLocation);
  $('#onboardingChooseButton').addEventListener('click', chooseOnboardingLocation);
  $('#onboardingPortableButton').addEventListener('click', useOnboardingPortableLocation);
  $('#onboardingFinish').addEventListener('click', finishOnboarding);
  $('#clearHistory').addEventListener('click', clearHistoryWithConfirmation);
  $('#saveSettings').addEventListener('click', saveSettings);
  $('#testConnection').addEventListener('click', testConnection);
  $('#toggleApiKey').addEventListener('click', toggleApiKeyVisibility);
  elements.serviceType.addEventListener('change', () => {
    if (SERVICE_URLS[elements.serviceType.value]) elements.baseUrl.value = SERVICE_URLS[elements.serviceType.value];
  });
  elements.themeSelect.addEventListener('change', () => applyTheme(elements.themeSelect.value));

  window.addEventListener('resize', () => {
    resizeWaveformCanvas();
    if (state.waveformPeaks.length) renderWaveform(getPlaybackRatio());
    else if (state.audioBase64) drawAudioWaveform(state.audioBase64);
    else drawIdleWaveform();
  });
}

function applyPlatformUi() {
  const platform = window.mytApp.platform || 'win32';
  const isMac = platform === 'darwin';
  document.documentElement.dataset.platform = platform;
  const modifier = $('#shortcutModifier');
  if (modifier) modifier.textContent = isMac ? '⌘' : 'Ctrl';
  if (elements.revealAudio) {
    const label = isMac ? '在 Finder 中显示' : '在文件夹中显示';
    elements.revealAudio.title = label;
    elements.revealAudio.setAttribute('aria-label', label);
  }
}

function setMode(mode) {
  if (!MODE_META[mode]) return;
  state.mode = mode;
  $$('.mode-button').forEach((button) => {
    const active = button.dataset.mode === mode;
    button.classList.toggle('active', active);
    button.setAttribute('aria-selected', String(active));
    button.tabIndex = active ? 0 : -1;
  });
  elements.presetPanel.classList.toggle('hidden', mode !== 'preset');
  elements.designPanel.classList.toggle('hidden', mode !== 'design');
  elements.clonePanel.classList.toggle('hidden', mode !== 'clone');
  elements.stylePanel.classList.toggle('hidden', mode === 'design');
  elements.pageDescription.textContent = MODE_META[mode].description;
  setStatus('准备就绪', MODE_META[mode].status, 'ready');
}

function updateCharacterCount() {
  const length = elements.scriptText.value.length;
  elements.characterCount.textContent = `${length.toLocaleString('zh-CN')} 字`;
  elements.characterCount.style.color = length > 6000 ? 'var(--warning)' : '';
}

function getStylePrompt() {
  const custom = elements.styleText.value.trim();
  const tags = [...state.selectedTags];
  if (!tags.length) return custom;
  const tagText = `请使用${tags.join('、')}的表达方式。`;
  return custom ? `${tagText}${custom}` : tagText;
}

function organizeStyle() {
  const tags = [...state.selectedTags];
  if (!tags.length && !elements.styleText.value.trim()) {
    showToast('先选择风格标签或填写描述。', true);
    return;
  }
  elements.styleText.value = getStylePrompt();
  state.selectedTags.clear();
  $$('#styleChips button').forEach((button) => button.classList.remove('selected'));
  showToast('风格描述已整理，正文没有变化。');
}

async function optimizeStyle() {
  const style = getStylePrompt();
  if (!style) {
    showToast('先选择标签或填写风格描述。', true);
    return;
  }
  const button = $('#optimizeStyle');
  const originalLabel = button.innerHTML;
  button.disabled = true;
  button.textContent = '正在润色';
  try {
    const result = await window.mytApp.tts.optimizeStyle(style);
    if (!result.optimizedStyle) throw new Error('AI 没有返回有效建议。');
    elements.optimizedStyleText.textContent = result.optimizedStyle;
    elements.optimizeReview.classList.remove('hidden');
    if (result.warnings?.length) showToast(result.warnings.join('\n'));
  } catch (error) {
    showToast(error.message, true);
  } finally {
    button.disabled = false;
    button.innerHTML = originalLabel;
  }
}

function composeVoiceDesign() {
  const parts = [
    elements.designAge.value,
    elements.designTexture.value,
    elements.designPace.value,
    elements.designRole.value,
  ].filter(Boolean);
  if (!parts.length) {
    showToast('至少选择一项音色特征。', true);
    return;
  }
  elements.voiceDesign.value = `${parts.join('，')}。发音清晰自然，情绪和声线保持连贯。`;
}

function getSampleMime(file) {
  const name = file.name.toLowerCase();
  if (name.endsWith('.wav')) return 'audio/wav';
  if (name.endsWith('.mp3')) return 'audio/mpeg';
  return '';
}

function handleSampleFile(file) {
  if (!file) return;
  const mimeType = getSampleMime(file);
  if (!mimeType) {
    showToast('参考音频只支持 WAV 或 MP3。', true);
    elements.voiceFile.value = '';
    return;
  }
  const prefixLength = `data:${mimeType};base64,`.length;
  const estimatedBase64Length = 4 * Math.ceil(file.size / 3) + prefixLength;
  if (estimatedBase64Length > 10 * 1024 * 1024) {
    showToast('文件编码后会超过 10 MB，请先裁剪或压缩。', true);
    elements.voiceFile.value = '';
    return;
  }

  removeSample();
  state.sampleFile = file;
  state.sampleUrl = URL.createObjectURL(file);
  elements.sampleAudio.src = state.sampleUrl;
  elements.sampleAudio.currentTime = 0;
  elements.sampleSeek.value = 0;
  syncRangeProgress(elements.sampleSeek, 0);
  setMediaPlayState(elements.samplePlay, false, '参考音频');
  elements.sampleName.textContent = file.name;
  elements.sampleMeta.textContent = `${mimeType === 'audio/wav' ? 'WAV' : 'MP3'} · ${formatBytes(file.size)}`;
  elements.sampleCard.classList.remove('hidden');
  elements.dropZone.classList.add('hidden');
  elements.sampleAudio.addEventListener('loadedmetadata', () => {
    elements.sampleMeta.textContent = `${mimeType === 'audio/wav' ? 'WAV' : 'MP3'} · ${formatBytes(file.size)} · ${formatTime(elements.sampleAudio.duration)}`;
  }, { once: true });
}

function removeSample() {
  if (state.sampleUrl) URL.revokeObjectURL(state.sampleUrl);
  elements.sampleAudio.pause();
  state.sampleFile = null;
  state.sampleUrl = '';
  elements.voiceFile.value = '';
  elements.sampleAudio.removeAttribute('src');
  elements.sampleAudio.load();
  elements.sampleSeek.value = 0;
  elements.sampleTime.textContent = '00:00 / 00:00';
  syncRangeProgress(elements.sampleSeek, 0);
  setMediaPlayState(elements.samplePlay, false, '参考音频');
  elements.sampleCard.classList.add('hidden');
  elements.dropZone.classList.remove('hidden');
  elements.voiceConsent.checked = false;
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1]);
    reader.onerror = () => reject(new Error('无法读取参考音频。'));
    reader.readAsDataURL(file);
  });
}

async function generateAudio() {
  if (state.currentRequestId) return;
  if (!state.settings?.apiKey) {
    showToast('请先打开设置并填写 API Key。', true);
    openSettings();
    return;
  }
  const text = elements.scriptText.value.trim();
  if (!text) {
    showToast('请输入需要合成的正文。', true);
    elements.scriptText.focus();
    return;
  }
  if (state.mode === 'design' && !elements.voiceDesign.value.trim()) {
    showToast('请填写音色设计描述。', true);
    return;
  }
  if (state.mode === 'clone' && !state.sampleFile) {
    showToast('请上传 WAV 或 MP3 参考音频。', true);
    return;
  }
  if (state.mode === 'clone' && !elements.voiceConsent.checked) {
    showToast('请先确认拥有该声音的使用授权。', true);
    return;
  }

  const requestId = crypto.randomUUID();
  state.currentRequestId = requestId;
  setGenerating(true);
  setStatus('正在生成语音', MODE_META[state.mode].status, 'working');
  elements.resultBadge.textContent = '生成中';
  elements.resultBadge.className = 'result-badge idle';
  startWaveformAnimation();

  try {
    let sample = null;
    if (state.mode === 'clone') {
      setStatus('正在读取参考音频', '样本只会发送到当前配置的 API', 'working');
      sample = {
        name: state.sampleFile.name,
        mimeType: getSampleMime(state.sampleFile),
        dataBase64: await fileToBase64(state.sampleFile),
      };
      setStatus('正在生成语音', MODE_META[state.mode].status, 'working');
    }

    const result = await window.mytApp.tts.generate({
      requestId,
      mode: state.mode,
      text,
      style: state.mode === 'design' ? '' : getStylePrompt(),
      voice: elements.voiceSelect.value,
      voiceDesign: elements.voiceDesign.value.trim(),
      sample,
    });
    await loadGeneratedAudio(result.audio, result.historyEntry?.filePath || '');
    await loadHistory();
    setStatus('生成完成', '可以试听或保存 WAV 音频', 'ready');
    elements.resultBadge.textContent = '已完成';
    elements.resultBadge.className = 'result-badge ready';
    showToast('语音生成完成。');
  } catch (error) {
    setStatus(error.message.includes('取消') ? '已取消生成' : '生成失败', error.message.split('\n')[0], 'error');
    elements.resultBadge.textContent = error.message.includes('取消') ? '已取消' : '失败';
    elements.resultBadge.className = 'result-badge error';
    showToast(error.message, true);
    if (!state.audioBase64) drawIdleWaveform();
  } finally {
    state.currentRequestId = '';
    setGenerating(false);
    stopWaveformAnimation();
  }
}

async function cancelGeneration() {
  if (!state.currentRequestId) return;
  elements.cancelGeneration.disabled = true;
  setStatus('正在取消', '等待当前请求停止', 'working');
  await window.mytApp.tts.cancel(state.currentRequestId);
}

function setGenerating(active) {
  elements.generateButton.disabled = active;
  elements.cancelGeneration.classList.toggle('hidden', !active);
  elements.cancelGeneration.disabled = false;
  elements.progressTrack.classList.toggle('active', active);
}

function setStatus(title, detail, kind) {
  elements.statusTitle.textContent = title;
  elements.statusDetail.textContent = detail;
  const icon = elements.generationStatus.querySelector('.status-icon');
  icon.style.color = kind === 'error' ? 'var(--danger)' : kind === 'working' ? 'var(--accent)' : 'var(--success)';
}

async function loadGeneratedAudio(base64, filePath = '') {
  if (state.audioUrl) URL.revokeObjectURL(state.audioUrl);
  state.audioBase64 = base64;
  state.lastSavedPath = filePath;
  state.audioUrl = URL.createObjectURL(base64ToBlob(base64));
  elements.resultAudio.src = state.audioUrl;
  elements.seekBar.value = 0;
  syncRangeProgress(elements.seekBar, 0);
  setMediaPlayState(elements.playButton, false, '音频');
  elements.playButton.disabled = false;
  elements.seekBar.disabled = false;
  elements.saveAudio.disabled = false;
  elements.revealAudio.classList.toggle('hidden', !filePath);
  await drawAudioWaveform(base64);
}

function base64ToBytes(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

function base64ToBlob(base64) {
  return new Blob([base64ToBytes(base64)], { type: 'audio/wav' });
}

function togglePlayback() {
  if (!state.audioBase64) return;
  if (elements.resultAudio.paused) elements.resultAudio.play();
  else elements.resultAudio.pause();
}

function toggleSamplePlayback() {
  if (!state.sampleUrl) return;
  if (elements.sampleAudio.paused) elements.sampleAudio.play();
  else elements.sampleAudio.pause();
}

function setMediaPlayState(button, playing, subject) {
  button.classList.toggle('is-playing', playing);
  button.setAttribute('aria-label', `${playing ? '暂停' : '播放'}${subject}`);
}

function syncRangeProgress(input, ratio) {
  const normalized = Math.max(0, Math.min(1, Number(ratio) || 0));
  input.style.setProperty('--seek-progress', `${normalized * 100}%`);
}

function updateSamplePlayer() {
  const current = Number.isFinite(elements.sampleAudio.currentTime) ? elements.sampleAudio.currentTime : 0;
  const duration = Number.isFinite(elements.sampleAudio.duration) ? elements.sampleAudio.duration : 0;
  const ratio = duration ? current / duration : 0;
  elements.sampleTime.textContent = `${formatTime(current)} / ${formatTime(duration)}`;
  elements.sampleSeek.value = duration ? Math.round(ratio * 1000) : 0;
  syncRangeProgress(elements.sampleSeek, ratio);
}

function updatePlayerTime() {
  const current = Number.isFinite(elements.resultAudio.currentTime) ? elements.resultAudio.currentTime : 0;
  const duration = Number.isFinite(elements.resultAudio.duration) ? elements.resultAudio.duration : 0;
  elements.audioTime.textContent = `${formatTime(current)} / ${formatTime(duration)}`;
  elements.seekBar.value = duration ? Math.round((current / duration) * 1000) : 0;
  const ratio = duration ? current / duration : 0;
  syncRangeProgress(elements.seekBar, ratio);
  elements.waveform.setAttribute('aria-valuenow', String(Math.round(ratio * 100)));
  if (state.waveformPeaks.length && !state.waveformDragging) renderWaveform(ratio);
}

async function saveAudio() {
  if (!state.audioBase64) return;
  const modeName = { preset: 'Preset', design: 'Design', clone: 'Clone' }[state.mode];
  const stamp = new Date().toISOString().replace(/[:T]/g, '-').slice(0, 19);
  try {
    const result = await window.mytApp.audio.save({
      audio: state.audioBase64,
      suggestedName: `MytimesTTS-${modeName}-${stamp}.wav`,
    });
    if (result.cancelled) return;
    state.lastSavedPath = result.filePath;
    elements.revealAudio.classList.remove('hidden');
    showToast(`已保存到：\n${result.filePath}`);
  } catch (error) {
    showToast(error.message, true);
  }
}

function resizeWaveformCanvas() {
  const canvas = elements.waveform;
  const rect = canvas.getBoundingClientRect();
  const scale = window.devicePixelRatio || 1;
  canvas.width = Math.max(1, Math.floor(rect.width * scale));
  canvas.height = Math.max(1, Math.floor(rect.height * scale));
}

function getCanvasColors() {
  const styles = getComputedStyle(document.documentElement);
  return {
    line: styles.getPropertyValue('--line-strong').trim(),
    accent: styles.getPropertyValue('--accent').trim(),
    accentStrong: styles.getPropertyValue('--accent-strong').trim(),
  };
}

function drawIdleWaveform() {
  state.waveformPeaks = [];
  const canvas = elements.waveform;
  const context = canvas.getContext('2d');
  const { line } = getCanvasColors();
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = line;
  const center = canvas.height / 2;
  const bars = 64;
  const gap = canvas.width / bars;
  for (let index = 0; index < bars; index += 1) {
    const height = (4 + Math.abs(Math.sin(index * 0.62)) * 10) * (window.devicePixelRatio || 1);
    context.globalAlpha = 0.3 + (index % 5) * 0.06;
    context.fillRect(index * gap + gap * 0.35, center - height / 2, Math.max(1, gap * 0.22), height);
  }
  context.globalAlpha = 1;
}

function startWaveformAnimation() {
  stopWaveformAnimation();
  state.waveformPeaks = [];
  const canvas = elements.waveform;
  const context = canvas.getContext('2d');
  const { accent } = getCanvasColors();
  let tick = 0;
  const draw = () => {
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = accent;
    const center = canvas.height / 2;
    const bars = 72;
    const gap = canvas.width / bars;
    for (let index = 0; index < bars; index += 1) {
      const envelope = 0.25 + 0.75 * Math.sin((index / bars) * Math.PI);
      const motion = Math.abs(Math.sin(index * 0.38 + tick * 0.09));
      const height = Math.max(3, motion * center * 0.72 * envelope);
      context.globalAlpha = 0.35 + motion * 0.55;
      context.fillRect(index * gap + gap * 0.28, center - height, Math.max(1, gap * 0.35), height * 2);
    }
    context.globalAlpha = 1;
    tick += 1;
    state.waveformAnimation = requestAnimationFrame(draw);
  };
  draw();
}

function stopWaveformAnimation() {
  if (state.waveformAnimation) cancelAnimationFrame(state.waveformAnimation);
  state.waveformAnimation = 0;
}

function extractWavSamples(bytes) {
  if (bytes.byteLength < 44) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const readId = (offset) => {
    if (offset + 4 > view.byteLength) return '';
    return String.fromCharCode(
      view.getUint8(offset),
      view.getUint8(offset + 1),
      view.getUint8(offset + 2),
      view.getUint8(offset + 3),
    );
  };

  if (readId(0) !== 'RIFF' || readId(8) !== 'WAVE') return null;

  let audioFormat = 0;
  let channelCount = 0;
  let bitsPerSample = 0;
  let dataOffset = -1;
  let dataLength = 0;

  for (let offset = 12; offset + 8 <= view.byteLength;) {
    const chunkId = readId(offset);
    const declaredSize = view.getUint32(offset + 4, true);
    const chunkStart = offset + 8;
    const chunkSize = Math.min(declaredSize, Math.max(0, view.byteLength - chunkStart));

    if (chunkId === 'fmt ' && chunkSize >= 16) {
      audioFormat = view.getUint16(chunkStart, true);
      channelCount = view.getUint16(chunkStart + 2, true);
      bitsPerSample = view.getUint16(chunkStart + 14, true);
    } else if (chunkId === 'data') {
      dataOffset = chunkStart;
      dataLength = chunkSize;
      break;
    }

    const nextOffset = chunkStart + declaredSize + (declaredSize % 2);
    if (nextOffset <= offset || nextOffset > view.byteLength) break;
    offset = nextOffset;
  }

  const supportedPcm = audioFormat === 1 && [8, 16, 24, 32].includes(bitsPerSample);
  const supportedFloat = audioFormat === 3 && bitsPerSample === 32;
  const bytesPerSample = bitsPerSample / 8;
  if ((!supportedPcm && !supportedFloat) || !channelCount || dataOffset < 0 || !bytesPerSample) return null;

  const frameSize = bytesPerSample * channelCount;
  const frameCount = Math.floor(dataLength / frameSize);
  if (!frameCount) return null;
  const samples = new Float32Array(frameCount);

  for (let frame = 0; frame < frameCount; frame += 1) {
    let mixed = 0;
    for (let channel = 0; channel < channelCount; channel += 1) {
      const sampleOffset = dataOffset + frame * frameSize + channel * bytesPerSample;
      let value = 0;
      if (supportedFloat) {
        value = view.getFloat32(sampleOffset, true);
      } else if (bitsPerSample === 8) {
        value = (view.getUint8(sampleOffset) - 128) / 128;
      } else if (bitsPerSample === 16) {
        value = view.getInt16(sampleOffset, true) / 32768;
      } else if (bitsPerSample === 24) {
        let raw = view.getUint8(sampleOffset)
          | (view.getUint8(sampleOffset + 1) << 8)
          | (view.getUint8(sampleOffset + 2) << 16);
        if (raw & 0x800000) raw |= 0xff000000;
        value = raw / 8388608;
      } else {
        value = view.getInt32(sampleOffset, true) / 2147483648;
      }
      mixed += Number.isFinite(value) ? Math.max(-1, Math.min(1, value)) : 0;
    }
    samples[frame] = mixed / channelCount;
  }

  return samples;
}

function buildByteFallbackSamples(bytes) {
  const targetCount = Math.min(12000, bytes.length);
  const step = Math.max(1, Math.floor(bytes.length / Math.max(1, targetCount)));
  const samples = new Float32Array(Math.ceil(bytes.length / step));
  let sampleIndex = 0;
  for (let byteIndex = 0; byteIndex < bytes.length; byteIndex += step) {
    samples[sampleIndex] = (bytes[byteIndex] - 128) / 128;
    sampleIndex += 1;
  }
  return samples;
}

function calculateWaveformPeaks(samples) {
  const cssWidth = Math.max(1, elements.waveform.getBoundingClientRect().width);
  const targetBars = Math.min(180, Math.max(72, Math.floor(cssWidth / 5)));
  const barCount = Math.min(targetBars, Math.max(1, samples.length));
  const blockSize = Math.max(1, Math.floor(samples.length / barCount));
  const peaks = [];

  for (let index = 0; index < barCount; index += 1) {
    const start = index * blockSize;
    const end = index === barCount - 1 ? samples.length : Math.min(samples.length, start + blockSize);
    const sampleStep = Math.max(1, Math.floor((end - start) / 120));
    let peak = 0;
    for (let sampleIndex = start; sampleIndex < end; sampleIndex += sampleStep) {
      peak = Math.max(peak, Math.abs(samples[sampleIndex] || 0));
    }
    peaks.push(Math.max(0.045, Math.min(1, peak)));
  }

  return peaks;
}

function renderWaveform(progress = 0) {
  const canvas = elements.waveform;
  const context = canvas.getContext('2d');
  const peaks = state.waveformPeaks;
  if (!peaks.length) {
    drawIdleWaveform();
    return;
  }

  const { accent, accentStrong } = getCanvasColors();
  const scale = window.devicePixelRatio || 1;
  const ratio = Math.max(0, Math.min(1, Number(progress) || 0));
  const progressX = ratio * canvas.width;
  const gap = canvas.width / peaks.length;
  const barWidth = Math.max(scale, gap * 0.48);
  const center = canvas.height / 2;

  context.clearRect(0, 0, canvas.width, canvas.height);
  peaks.forEach((peak, index) => {
    const x = index * gap + (gap - barWidth) / 2;
    const height = Math.max(2 * scale, peak * center * 0.88);
    const played = x + barWidth / 2 <= progressX;
    context.fillStyle = played ? accentStrong : accent;
    context.globalAlpha = played ? 0.98 : 0.42;
    context.fillRect(x, center - height, barWidth, height * 2);
  });

  if (ratio > 0 && ratio < 1) {
    context.fillStyle = accentStrong;
    context.globalAlpha = 0.9;
    context.fillRect(Math.max(0, progressX - scale), center * 0.12, Math.max(scale, 1.5 * scale), center * 1.76);
  }
  context.globalAlpha = 1;
}

async function drawAudioWaveform(base64) {
  const bytes = base64ToBytes(base64);
  let samples = extractWavSamples(bytes);

  if (!samples) {
    let audioContext;
    try {
      audioContext = new AudioContext();
      const bufferCopy = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
      const audioBuffer = await audioContext.decodeAudioData(bufferCopy);
      samples = audioBuffer.getChannelData(0).slice();
    } catch {
      samples = buildByteFallbackSamples(bytes);
    } finally {
      if (audioContext) await audioContext.close().catch(() => {});
    }
  }

  resizeWaveformCanvas();
  state.waveformPeaks = calculateWaveformPeaks(samples);
  renderWaveform(getPlaybackRatio());
}

function getPlaybackRatio() {
  const duration = Number.isFinite(elements.resultAudio.duration) ? elements.resultAudio.duration : 0;
  const current = Number.isFinite(elements.resultAudio.currentTime) ? elements.resultAudio.currentTime : 0;
  return duration > 0 ? current / duration : 0;
}

function seekAudioToRatio(ratio) {
  const duration = Number.isFinite(elements.resultAudio.duration) ? elements.resultAudio.duration : 0;
  if (!duration) return;
  const nextRatio = Math.max(0, Math.min(1, ratio));
  elements.resultAudio.currentTime = nextRatio * duration;
  elements.seekBar.value = Math.round(nextRatio * 1000);
  syncRangeProgress(elements.seekBar, nextRatio);
  elements.waveform.setAttribute('aria-valuenow', String(Math.round(nextRatio * 100)));
  renderWaveform(nextRatio);
  updatePlayerTime();
}

function seekWaveformToPointer(event) {
  const rect = elements.waveform.getBoundingClientRect();
  if (!rect.width) return;
  seekAudioToRatio((event.clientX - rect.left) / rect.width);
}

function beginWaveformSeek(event) {
  if (!state.audioBase64 || !Number.isFinite(elements.resultAudio.duration)) return;
  state.waveformDragging = true;
  elements.waveform.setPointerCapture?.(event.pointerId);
  seekWaveformToPointer(event);
  event.preventDefault();
}

function continueWaveformSeek(event) {
  if (!state.waveformDragging) return;
  seekWaveformToPointer(event);
  event.preventDefault();
}

function endWaveformSeek(event) {
  if (!state.waveformDragging) return;
  seekWaveformToPointer(event);
  state.waveformDragging = false;
  if (elements.waveform.hasPointerCapture?.(event.pointerId)) {
    elements.waveform.releasePointerCapture(event.pointerId);
  }
  event.preventDefault();
}

function handleWaveformKeyboard(event) {
  const duration = Number.isFinite(elements.resultAudio.duration) ? elements.resultAudio.duration : 0;
  if (!duration) return;
  const current = Number.isFinite(elements.resultAudio.currentTime) ? elements.resultAudio.currentTime : 0;
  let nextTime = current;
  if (event.key === 'ArrowLeft') nextTime -= 5;
  else if (event.key === 'ArrowRight') nextTime += 5;
  else if (event.key === 'Home') nextTime = 0;
  else if (event.key === 'End') nextTime = duration;
  else return;
  event.preventDefault();
  seekAudioToRatio(nextTime / duration);
}

function showPage(page) {
  const pages = {
    generator: elements.generatorPage,
    history: elements.historyPage,
    settings: elements.settingsPage,
  };
  if (!pages[page]) return;
  state.currentPage = page;
  Object.entries(pages).forEach(([name, element]) => {
    element.classList.toggle('hidden', name !== page);
  });
  $$('.nav-item[data-page]').forEach((button) => {
    const active = button.dataset.page === page;
    button.classList.toggle('active', active);
    if (active) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  });
  if (page === 'history') loadHistory();
  if (page === 'settings') populateSettingsForm();
  document.querySelector('.workspace').scrollTo({ top: 0, behavior: 'smooth' });
}

async function loadHistory() {
  try {
    const summary = await window.mytApp.history.list();
    state.history = summary.entries || [];
    renderHistory(summary);
  } catch (error) {
    showToast('无法读取生成历史：' + error.message, true);
  }
}

function renderHistory(summary) {
  const entries = summary.entries || [];
  elements.historyCount.textContent = entries.length + ' 条记录';
  elements.storageSummary.textContent = entries.length
    ? '已保存 ' + entries.length + ' 条语音，共 ' + formatBytes(summary.totalBytes || 0) + '。最多保留最近 100 条。'
    : '尚未保存生成记录。成功生成后会自动保存在当前数据目录。';
  elements.historyEmpty.classList.toggle('hidden', entries.length > 0);
  elements.historyList.classList.toggle('hidden', entries.length === 0);
  elements.historyList.replaceChildren();

  for (const entry of entries) {
    const row = document.createElement('article');
    row.className = 'history-row';

    const mark = document.createElement('div');
    mark.className = 'history-mode-mark';
    mark.textContent = { preset: 'PRE', design: 'DES', clone: 'CLN' }[entry.mode] || 'TTS';

    const content = document.createElement('div');
    content.className = 'history-content';
    const title = document.createElement('h3');
    title.className = 'history-title';
    title.textContent = String(entry.text || '').replace(/\s+/g, ' ').slice(0, 100) || '未命名语音';
    const meta = document.createElement('div');
    meta.className = 'history-meta';
    const modeText = entry.mode === 'preset'
      ? '预置音色 · ' + (entry.voice || 'MiMo 默认')
      : entry.mode === 'design' ? '音色设计' : '音色复刻';
    [
      formatHistoryDate(entry.createdAt),
      modeText,
      formatTime(entry.duration || 0),
      formatBytes(entry.bytes || 0),
    ].forEach((value) => {
      const span = document.createElement('span');
      span.textContent = value;
      meta.appendChild(span);
    });
    content.append(title, meta);

    const actions = document.createElement('div');
    actions.className = 'history-actions';
    actions.append(
      createHistoryButton('试听', 'primary', () => playHistoryEntry(entry)),
      createHistoryButton('复用参数', '', () => reuseHistoryEntry(entry)),
      createHistoryButton('另存', '', () => saveHistoryEntry(entry)),
      createHistoryButton('定位', '', () => window.mytApp.audio.reveal(entry.filePath)),
      createHistoryButton('删除', 'danger', (event) => deleteHistoryEntry(entry.id, event.currentTarget)),
    );

    row.append(mark, content, actions);
    elements.historyList.appendChild(row);
  }
}

function createHistoryButton(label, className, handler) {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = label;
  if (className) button.className = className;
  button.addEventListener('click', handler);
  return button;
}

async function playHistoryEntry(entry) {
  try {
    const result = await window.mytApp.history.getAudio(entry.id);
    setMode(entry.mode);
    await loadGeneratedAudio(result.audio, result.filePath);
    elements.resultBadge.textContent = '历史记录';
    elements.resultBadge.className = 'result-badge ready';
    showPage('generator');
    await elements.resultAudio.play();
  } catch (error) {
    showToast(error.message, true);
  }
}

function reuseHistoryEntry(entry) {
  setMode(entry.mode);
  elements.scriptText.value = entry.text || '';
  elements.styleText.value = entry.style || '';
  if (entry.voice) elements.voiceSelect.value = entry.voice;
  if (entry.voiceDesign) elements.voiceDesign.value = entry.voiceDesign;
  updateCharacterCount();
  showPage('generator');
  if (entry.mode === 'clone') showToast('已恢复正文和风格，请重新选择授权的参考音频。');
  else showToast('已恢复这条记录的生成参数。');
}

async function saveHistoryEntry(entry) {
  try {
    const result = await window.mytApp.history.getAudio(entry.id);
    const stamp = new Date(entry.createdAt).toISOString().replace(/[:T]/g, '-').slice(0, 19);
    const saved = await window.mytApp.audio.save({
      audio: result.audio,
      suggestedName: 'MytimesTTS-History-' + stamp + '.wav',
    });
    if (!saved.cancelled) showToast('音频已另存。');
  } catch (error) {
    showToast(error.message, true);
  }
}

async function deleteHistoryEntry(id, button) {
  if (button.dataset.confirm !== 'true') {
    button.dataset.confirm = 'true';
    button.textContent = '确认删除';
    setTimeout(() => {
      if (button.isConnected) {
        button.dataset.confirm = 'false';
        button.textContent = '删除';
      }
    }, 3000);
    return;
  }
  try {
    const summary = await window.mytApp.history.delete(id);
    state.history = summary.entries || [];
    renderHistory(summary);
    showToast('历史记录已删除。');
  } catch (error) {
    showToast(error.message, true);
  }
}

async function clearHistoryWithConfirmation(event) {
  const button = event.currentTarget;
  if (!state.history.length) {
    showToast('当前没有历史记录。');
    return;
  }
  if (button.dataset.confirm !== 'true') {
    button.dataset.confirm = 'true';
    button.textContent = '再次点击清空';
    setTimeout(() => {
      button.dataset.confirm = 'false';
      button.textContent = '清空历史';
    }, 3500);
    return;
  }
  try {
    const summary = await window.mytApp.history.clear();
    state.history = [];
    renderHistory(summary);
    button.dataset.confirm = 'false';
    button.textContent = '清空历史';
    showToast('生成历史已清空。');
  } catch (error) {
    showToast(error.message, true);
  }
}

function formatHistoryDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '未知时间';
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function showOnboardingStep(step) {
  const steps = {
    welcome: elements.onboardingWelcome,
    storage: elements.onboardingStorage,
    ready: elements.onboardingReady,
  };
  const stepIndex = { welcome: 0, storage: 1, ready: 2 }[step] ?? 0;
  Object.entries(steps).forEach(([name, element]) => element.classList.toggle('hidden', name !== step));
  $$('.onboarding-progress i').forEach((marker, index) => marker.classList.toggle('active', index <= stepIndex));
  const focusTarget = steps[step].querySelector('button:not(:disabled)');
  requestAnimationFrame(() => focusTarget?.focus());
}

function renderOnboardingCompany(status) {
  const company = status.company;
  elements.onboardingCompanyPath.textContent = company.path;
  elements.onboardingCompanyPath.title = company.path;
  elements.onboardingCompanyButton.disabled = !company.available;

  if (!company.available) {
    elements.onboardingCompanyBadge.textContent = '未连接';
    elements.onboardingCompanyBadge.className = 'result-badge idle';
    elements.onboardingCompanyDetail.textContent = '没有检测到 Y: 映射盘或目录不可写，请先连接公司 NAS，或选择其他目录。';
    return;
  }

  elements.onboardingCompanyBadge.textContent = company.hasData ? '发现数据' : '可用';
  elements.onboardingCompanyBadge.className = 'result-badge ready';
  if (company.hasSettings) {
    elements.onboardingCompanyDetail.textContent = '检测到共享配置文件。使用后会读取公司 Base URL、普通设置和历史；本机 API Key 仍单独加密。';
  } else if (company.hasData) {
    elements.onboardingCompanyDetail.textContent = '目录中已有历史或音频，但没有检测到 settings.json；进入后会提醒补充配置。';
  } else {
    elements.onboardingCompanyDetail.textContent = '公司目录可访问。首次使用会创建设置、历史、音频和本机加密密钥目录。';
  }
}

function openOnboarding(status) {
  state.onboarding = status;
  renderOnboardingCompany(status);
  elements.onboardingOverlay.classList.remove('hidden');
  if (status.needsLocationRecovery) {
    showOnboardingStep('storage');
    showToast('上次选择的数据目录当前不可用，请重新连接 NAS 或选择其他目录。', true);
  } else {
    showOnboardingStep('welcome');
  }
}

function renderOnboardingReady(status) {
  elements.onboardingReadyPath.textContent = status.current.path;
  elements.onboardingReadyPath.title = status.current.path;
  const finishLabel = $('#onboardingFinish span');

  if (status.currentHasKey) {
    elements.onboardingReadyTitle.textContent = '配置与 API Key 已就绪';
    elements.onboardingReadyDetail.textContent = '已检测到这台电脑可用的加密 API Key，可以直接开始生成语音。';
    finishLabel.textContent = '开始使用';
  } else if (status.currentHasSettings) {
    elements.onboardingReadyTitle.textContent = '已发现配置，还需填写 API Key';
    elements.onboardingReadyDetail.textContent = '共享 Base URL 和普通设置已经载入。出于安全原因，这台电脑需要单独填写一次自己的 API Key。';
    finishLabel.textContent = '进入设置';
  } else {
    elements.onboardingReadyTitle.textContent = '未检测到配置文件';
    elements.onboardingReadyDetail.textContent = '数据目录已经准备好。下一步进入设置，选择服务类型并填写 Base URL 与 API Key。';
    finishLabel.textContent = '进入设置';
  }
}

async function applyOnboardingLocation(result) {
  if (result.cancelled) return;
  state.dataLocation = result;
  state.settings = await window.mytApp.settings.get();
  populateSettingsForm();
  updateDataLocationUi();
  refreshConnectionStatus();
  await loadHistory();
  state.onboarding = await window.mytApp.onboarding.getStatus();
  renderOnboardingCompany(state.onboarding);
  renderOnboardingReady(state.onboarding);
  showOnboardingStep('ready');
}

async function runOnboardingLocationAction(action) {
  const buttons = [
    elements.onboardingCompanyButton,
    $('#onboardingChooseButton'),
    $('#onboardingPortableButton'),
  ];
  buttons.forEach((button) => { button.disabled = true; });
  try {
    await applyOnboardingLocation(await action());
  } catch (error) {
    showToast(error.message, true);
    elements.onboardingCompanyDetail.textContent = error.message;
    elements.onboardingCompanyBadge.textContent = '失败';
    elements.onboardingCompanyBadge.className = 'result-badge error';
  } finally {
    state.onboarding = state.onboarding || await window.mytApp.onboarding.getStatus();
    renderOnboardingCompany(state.onboarding);
    $('#onboardingChooseButton').disabled = false;
    $('#onboardingPortableButton').disabled = false;
  }
}

function useOnboardingCompanyLocation() {
  return runOnboardingLocationAction(() => window.mytApp.storage.useCompanyLocation());
}

function chooseOnboardingLocation() {
  return runOnboardingLocationAction(() => window.mytApp.storage.chooseLocation());
}

function useOnboardingPortableLocation() {
  return runOnboardingLocationAction(() => window.mytApp.storage.resetLocation());
}

async function finishOnboarding() {
  const button = $('#onboardingFinish');
  button.disabled = true;
  try {
    await window.mytApp.onboarding.complete();
    elements.onboardingOverlay.classList.add('hidden');
    if (state.onboarding?.currentHasKey) showPage('generator');
    else openSettings();
  } catch (error) {
    showToast('无法保存初始化状态：' + error.message, true);
  } finally {
    button.disabled = false;
  }
}

function openSettings() {
  populateSettingsForm();
  refreshDataLocationInfo();
  elements.settingsMessage.className = 'settings-message';
  elements.settingsMessage.textContent = '测试连接会发起一次极小的文本模型请求。';
  showPage('settings');
}

function updateDataLocationUi() {
  const info = state.dataLocation;
  if (!info) return;
  elements.dataLocationPath.textContent = info.path;
  elements.dataLocationPath.title = info.path;
  if (!info.configured) {
    elements.dataLocationBadge.textContent = '待选择';
    elements.dataLocationBadge.className = 'result-badge idle';
  } else {
    elements.dataLocationBadge.textContent = info.isDefault ? '本机文档' : '自定义';
    elements.dataLocationBadge.className = info.available ? 'result-badge ready' : 'result-badge error';
  }
  elements.resetDataLocation.disabled = Boolean(info.configured && info.isDefault);
}

async function refreshDataLocationInfo() {
  try {
    state.dataLocation = await window.mytApp.storage.getLocation();
    updateDataLocationUi();
  } catch (error) {
    showToast('无法读取数据目录：' + error.message, true);
  }
}

async function applyStorageChange(result) {
  if (result.cancelled) return;
  state.dataLocation = result;
  state.settings = await window.mytApp.settings.get();
  populateSettingsForm();
  updateDataLocationUi();
  refreshConnectionStatus();
  await loadHistory();
  const action = result.usedExisting ? '已切换到目录中的现有数据。' : '已复制当前数据并切换目录。';
  elements.settingsMessage.className = 'settings-message success';
  elements.settingsMessage.textContent = action;
  showToast(action);
}

async function chooseDataLocation() {
  try {
    await applyStorageChange(await window.mytApp.storage.chooseLocation());
  } catch (error) {
    elements.settingsMessage.className = 'settings-message error';
    elements.settingsMessage.textContent = error.message;
    showToast(error.message, true);
  }
}

async function useCompanyDataLocation() {
  try {
    await applyStorageChange(await window.mytApp.storage.useCompanyLocation());
  } catch (error) {
    elements.settingsMessage.className = 'settings-message error';
    elements.settingsMessage.textContent = error.message;
    showToast(error.message, true);
  }
}

async function resetDataLocation() {
  try {
    await applyStorageChange(await window.mytApp.storage.resetLocation());
  } catch (error) {
    elements.settingsMessage.className = 'settings-message error';
    elements.settingsMessage.textContent = error.message;
    showToast(error.message, true);
  }
}

async function openDataLocation() {
  try {
    await window.mytApp.storage.revealLocation();
  } catch (error) {
    showToast('无法打开数据目录：' + error.message, true);
  }
}

function populateSettingsForm() {
  const settings = state.settings || {};
  elements.serviceType.value = settings.serviceType || 'standard';
  elements.baseUrl.value = settings.baseUrl || SERVICE_URLS.standard;
  elements.apiKey.value = settings.apiKey || '';
  elements.authMode.value = settings.authMode || 'api-key';
  elements.timeoutSeconds.value = String(settings.timeoutSeconds || 180);
  elements.themeSelect.value = settings.theme || 'system';
}

function collectSettingsForm() {
  return {
    serviceType: elements.serviceType.value,
    baseUrl: elements.baseUrl.value.trim(),
    apiKey: elements.apiKey.value.trim(),
    authMode: elements.authMode.value,
    timeoutSeconds: Number(elements.timeoutSeconds.value),
    theme: elements.themeSelect.value,
  };
}

async function saveSettings() {
  try {
    state.settings = await window.mytApp.settings.save(collectSettingsForm());
    applyTheme(state.settings.theme);
    refreshConnectionStatus();
    elements.settingsMessage.className = 'settings-message success';
    elements.settingsMessage.textContent = '设置已安全保存。';
    showToast('设置已安全保存。');
    return true;
  } catch (error) {
    elements.settingsMessage.className = 'settings-message error';
    elements.settingsMessage.textContent = error.message;
    return false;
  }
}

async function testConnection() {
  const button = $('#testConnection');
  button.disabled = true;
  button.textContent = '正在测试';
  elements.settingsMessage.className = 'settings-message';
  elements.settingsMessage.textContent = '正在连接 MiMo API。';
  try {
    const saved = await saveSettings();
    if (!saved) return;
    const result = await window.mytApp.settings.test();
    if (!result.ok) throw new Error('服务返回内容异常。');
    elements.settingsMessage.className = 'settings-message success';
    elements.settingsMessage.textContent = '连接成功，API Key 和 Base URL 可用。';
  } catch (error) {
    elements.settingsMessage.className = 'settings-message error';
    elements.settingsMessage.textContent = error.message;
  } finally {
    button.disabled = false;
    button.textContent = '保存并测试';
  }
}

function toggleApiKeyVisibility() {
  const show = elements.apiKey.type === 'password';
  const button = $('#toggleApiKey');
  elements.apiKey.type = show ? 'text' : 'password';
  button.classList.toggle('is-visible', show);
  button.setAttribute('aria-label', show ? '隐藏 API Key' : '显示 API Key');
  button.title = show ? '隐藏 API Key' : '显示 API Key';
}

function refreshConnectionStatus() {
  const ready = Boolean(state.settings?.apiKey && state.settings?.baseUrl);
  elements.connectionDot.classList.toggle('ready', ready);
  elements.connectionTitle.textContent = ready ? 'MiMo 已配置' : '尚未配置';
  elements.connectionDetail.textContent = ready ? (state.settings.serviceType === 'token-plan' ? 'Token Plan' : 'API 可生成') : '添加 MiMo API Key';
  elements.settingsConnectionBadge.textContent = ready ? '已配置' : '未配置';
  elements.settingsConnectionBadge.className = ready ? 'result-badge ready' : 'result-badge idle';
}

function applyTheme(theme) {
  const resolved = theme === 'system'
    ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : theme;
  document.documentElement.dataset.theme = resolved;
  requestAnimationFrame(() => {
    resizeWaveformCanvas();
    if (state.waveformPeaks.length) renderWaveform(getPlaybackRatio());
    else if (state.audioBase64) drawAudioWaveform(state.audioBase64);
    else drawIdleWaveform();
  });
}

function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '00:00';
  const minutes = Math.floor(seconds / 60);
  const remain = Math.floor(seconds % 60);
  return `${String(minutes).padStart(2, '0')}:${String(remain).padStart(2, '0')}`;
}

function formatBytes(bytes) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function showToast(message, isError = false) {
  clearTimeout(state.toastTimer);
  elements.toast.textContent = message;
  elements.toast.classList.toggle('error', isError);
  elements.toast.classList.add('show');
  state.toastTimer = setTimeout(() => elements.toast.classList.remove('show'), 3800);
}

initialize().catch((error) => showToast(`应用初始化失败：${error.message}`, true));
