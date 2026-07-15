const fs = require('fs');
const path = require('path');

function normalizeBaseUrl(value) {
  const url = String(value || 'http://127.0.0.1:9880').trim().replace(/\/+$/, '');
  if (!/^https?:\/\//i.test(url)) throw new Error('GPT-SoVITS 地址必须以 http:// 或 https:// 开头。');
  return url;
}

function headers(settings) {
  const result = { 'Content-Type': 'application/json' };
  const key = String(settings.gptSovitsApiKey || '').trim();
  if (key) result.Authorization = 'Bearer ' + key;
  return result;
}

function extensionForSample(sample) {
  if (sample?.mimeType === 'audio/mpeg') return '.mp3';
  return path.extname(String(sample?.name || '')).toLowerCase() === '.mp3' ? '.mp3' : '.wav';
}

function createGptSovitsProvider({ getSettings, activeRequests, getTempDirectory }) {
  async function withTimeout(url, options, requestId) {
    const settings = getSettings();
    const controller = new AbortController();
    const timeoutMs = Math.max(15, Number(settings.gptSovitsTimeoutSeconds) || 180) * 1000;
    const timeout = setTimeout(() => controller.abort('timeout'), timeoutMs);
    if (requestId) activeRequests.set(requestId, controller);
    try {
      return await fetch(url, { ...options, signal: controller.signal });
    } catch (error) {
      if (error?.name === 'AbortError') {
        throw new Error(controller.signal.reason === 'timeout' ? 'GPT-SoVITS 请求超时。' : '生成已取消。');
      }
      throw error;
    } finally {
      clearTimeout(timeout);
      if (requestId) activeRequests.delete(requestId);
    }
  }

  return {
    id: 'gpt-sovits',
    async testConnection() {
      const settings = getSettings();
      const response = await withTimeout(
        normalizeBaseUrl(settings.gptSovitsBaseUrl) + '/openapi.json',
        { method: 'GET', headers: headers(settings) },
      );
      if (!response.ok) throw new Error('未检测到 GPT-SoVITS API v2（HTTP ' + response.status + '）。');
      return { ok: true, billed: false };
    },
    async generate(payload) {
      if (payload.mode !== 'clone') throw new Error('GPT-SoVITS 需要参考音频。');
      const settings = getSettings();
      const text = String(payload.text || '').trim();
      const sample = payload.sample;
      if (!text) throw new Error('请输入需要合成的正文。');
      if (!sample?.dataBase64) throw new Error('请选择参考音频。');
      if (String(sample.dataBase64).length > 14 * 1024 * 1024) {
        throw new Error('参考音频编码后超过 14 MB，请裁剪后重试。');
      }
      const referenceText = String(payload.referenceText || settings.gptSovitsReferenceText || '').trim();
      if (!referenceText) throw new Error('请在 GPT-SoVITS 设置中填写参考音频对应的原文。');

      const tempDir = getTempDirectory();
      fs.mkdirSync(tempDir, { recursive: true });
      const safeRequestId = String(payload.requestId || Date.now()).replace(/[^a-zA-Z0-9-]/g, '').slice(0, 80);
      const samplePath = path.join(tempDir, 'gpt-sovits-reference-' + safeRequestId + extensionForSample(sample));
      fs.writeFileSync(samplePath, Buffer.from(sample.dataBase64, 'base64'));
      try {
        const body = {
          text,
          text_lang: String(settings.gptSovitsTargetLanguage || 'zh'),
          ref_audio_path: samplePath,
          prompt_text: referenceText,
          prompt_lang: String(settings.gptSovitsReferenceLanguage || 'zh'),
          text_split_method: String(settings.gptSovitsTextSplitMethod || 'cut5'),
          media_type: 'wav',
          streaming_mode: false,
        };
        const response = await withTimeout(
          normalizeBaseUrl(settings.gptSovitsBaseUrl) + '/tts',
          { method: 'POST', headers: headers(settings), body: JSON.stringify(body) },
          payload.requestId,
        );
        const contentType = response.headers.get('content-type') || '';
        if (!response.ok || contentType.includes('application/json')) {
          const detail = await response.text();
          throw new Error('GPT-SoVITS 生成失败（' + response.status + '）：' + detail);
        }
        const audio = Buffer.from(await response.arrayBuffer()).toString('base64');
        return {
          audio,
          format: 'wav',
          mimeType: 'audio/wav',
          provider: 'gpt-sovits',
          model: 'gpt-sovits-api-v2',
          voice: path.basename(samplePath),
          requestId: String(payload.requestId || ''),
          usage: null,
          warnings: [],
        };
      } finally {
        try { fs.unlinkSync(samplePath); } catch {}
      }
    },
  };
}

module.exports = { createGptSovitsProvider };
