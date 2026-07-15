class ProviderRegistry {
  constructor() {
    this.providers = new Map();
  }

  register(provider) {
    if (!provider || typeof provider.id !== 'string' || typeof provider.generate !== 'function') {
      throw new TypeError('无效的 TTS Provider。');
    }
    this.providers.set(provider.id, provider);
    return provider;
  }

  get(id) {
    const provider = this.providers.get(id);
    if (!provider) throw new Error('该语音引擎尚未安装或启用。');
    return provider;
  }

  ids() {
    return [...this.providers.keys()];
  }
}

module.exports = { ProviderRegistry };
