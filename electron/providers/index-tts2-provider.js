function normalizeBaseUrl(value) {
  const url = String(value || 'http://127.0.0.1:9872').trim().replace(/\/+$/, '');
  if (!/^https?:\/\//i.test(url)) throw new Error('IndexTTS2 网关地址必须以 http:// 或 https:// 开头。');
  return url;
}

function buildHeaders(settings) {
  const result = { 'Content-Type': 'application/json' };
  const key = String(settings.indexTts2ApiKey || '').trim();
  if (key) result.Authorization = 'Bearer ' + key;
  return result;
}

function createIndexTts2Provider({ getSettings, activeRequests }) {
  async function request(pathname, options = {}, requestId = '') {
    const settings = getSettings();
    const controller = new AbortController();
    const timeoutMs = Math.max(15, Number(settings.indexTts2TimeoutSeconds) || 600) * 1000;
    const timeout = setTimeout(() => controller.abort('timeout'), timeoutMs);
    if (requestId) activeRequests.set(requestId, controller);
    try {
      return await fetch(normalizeBaseUrl(settings.indexTts2BaseUrl) + pathname, {
        ...options,
        headers: { ...buildHeaders(settings), ...(options.headers || {}) },
        signal: controller.signal,
      });
    } catch (error) {
      if (error?.name === 'AbortError') {
        throw new Error(controller.signal.reason === 'timeout' ? 'IndexTTS2 请求超时。' : '生成已取消。');
      }
      throw error;
    } finally {
      clearTimeout(timeout);
      if (requestId) activeRequests.delete(requestId);
    }
  }

  return {
    id: 'index-tts2',
    async testConnection() {
      const response = await request('/health', { method: 'GET' });
      const detail = await response.text();
      if (!response.ok) throw new Error('IndexTTS2 网关未就绪（HTTP ' + response.status + '）：' + detail);
      return { ok: true, billed: false };
    },
    async generate(payload) {
      if (payload.mode !== 'clone') throw new Error('IndexTTS2 需要参考音频。');
      const settings = getSettings();
      const text = String(payload.text || '').trim();
      if (!text) throw new Error('请输入需要合成的正文。');
      if (!payload.sample?.dataBase64) throw new Error('请选择参考音频。');
      if (String(payload.sample.dataBase64).length > 14 * 1024 * 1024) {
        throw new Error('参考音频编码后超过 14 MB，请裁剪后重试。');
      }
      const body = {
        text,
        speaker_audio: {
          name: payload.sample.name || 'reference.wav',
          mime_type: payload.sample.mimeType || 'audio/wav',
          data_base64: payload.sample.dataBase64,
        },
        emotion: {
          mode: String(settings.indexTts2EmotionMode || 'text'),
          text: String(payload.style || ''),
          alpha: Number(settings.indexTts2EmotionAlpha) || 0.6,
          vector: Array.isArray(payload.emotionVector) ? payload.emotionVector : null,
          use_random: Boolean(settings.indexTts2UseRandom),
        },
      };
      const response = await request('/v1/tts', {
        method: 'POST',
        body: JSON.stringify(body),
      }, payload.requestId);
      const raw = await response.text();
      let parsed;
      try { parsed = JSON.parse(raw); } catch { parsed = null; }
      if (!response.ok || !parsed?.audio_base64) {
        throw new Error('IndexTTS2 生成失败（' + response.status + '）：' + (parsed?.detail || raw));
      }
      return {
        audio: parsed.audio_base64,
        format: parsed.format || 'wav',
        mimeType: parsed.mime_type || 'audio/wav',
        provider: 'index-tts2',
        model: parsed.model || 'index-tts2',
        voice: payload.sample.name || 'reference',
        requestId: String(payload.requestId || ''),
        usage: null,
        warnings: parsed.warnings || [],
      };
    },
  };
}

module.exports = { createIndexTts2Provider };
