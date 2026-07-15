const PROVIDER_DEFINITIONS = Object.freeze([
  {
    id: 'mimo',
    label: 'Xiaomi MiMo',
    kind: 'cloud',
    billing: 'metered',
    status: 'ready',
    capabilities: {
      preset: true,
      design: true,
      clone: true,
      referenceText: false,
      emotionAudio: false,
      emotionVector: false,
      streaming: false,
    },
  },
  {
    id: 'volcengine',
    label: '火山引擎',
    kind: 'cloud',
    billing: 'metered',
    status: 'ready',
    capabilities: {
      preset: true,
      design: false,
      clone: false,
      referenceText: false,
      emotionAudio: false,
      emotionVector: false,
      streaming: false,
    },
  },
  {
    id: 'gpt-sovits',
    label: 'GPT-SoVITS',
    kind: 'local',
    billing: 'local',
    status: 'ready',
    capabilities: {
      preset: false,
      design: false,
      clone: true,
      referenceText: true,
      emotionAudio: false,
      emotionVector: false,
      streaming: false,
    },
  },
  {
    id: 'index-tts2',
    label: 'IndexTTS2',
    kind: 'local',
    billing: 'local',
    status: 'ready',
    capabilities: {
      preset: false,
      design: false,
      clone: true,
      referenceText: false,
      emotionAudio: true,
      emotionVector: true,
      streaming: false,
    },
  },
]);

const PROVIDER_IDS = new Set(PROVIDER_DEFINITIONS.map((provider) => provider.id));

function normalizeProviderId(value) {
  const id = String(value || 'mimo').trim().toLowerCase();
  return PROVIDER_IDS.has(id) ? id : 'mimo';
}

function getProviderCatalog(availableIds = []) {
  const available = new Set(availableIds);
  return PROVIDER_DEFINITIONS.map((provider) => ({
    ...provider,
    capabilities: { ...provider.capabilities },
    available: available.has(provider.id),
  }));
}

module.exports = {
  PROVIDER_DEFINITIONS,
  getProviderCatalog,
  normalizeProviderId,
};
