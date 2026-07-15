const crypto = require('crypto');

const DEFAULT_ENDPOINT = 'https://openspeech.bytedance.com/api/v1/tts';

function validateUrl(value) {
  const url = String(value || DEFAULT_ENDPOINT).trim().replace(/\/+$/, '');
  if (!/^https:\/\//i.test(url)) throw new Error('火山引擎地址必须以 https:// 开头。');
  return url;
}

function extractMessage(value) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  return value.message || value.error || JSON.stringify(value);
}

function createVolcengineProvider({ getSettings, activeRequests }) {
  async function request(text, requestId) {
    const settings = getSettings();
    const appId = String(settings.volcAppId || '').trim();
    const accessToken = String(settings.volcAccessToken || '').trim();
    const cluster = String(settings.volcCluster || 'volcano_tts').trim();
    const voiceType = String(settings.volcVoiceType || '').trim();
    if (!appId) throw new Error('请先填写火山引擎 App ID。');
    if (!accessToken) throw new Error('请先填写火山引擎 Access Token。');
    if (!voiceType) throw new Error('请先填写火山引擎音色 ID。');

    const controller = new AbortController();
    const timeoutMs = Math.max(30, Number(settings.volcTimeoutSeconds) || 180) * 1000;
    const timeout = setTimeout(() => controller.abort('timeout'), timeoutMs);
    if (requestId) activeRequests.set(requestId, controller);
    const body = {
      app: { appid: appId, token: accessToken, cluster },
      user: { uid: 'mytimes-tts-desktop' },
      audio: {
        voice_type: voiceType,
        encoding: 'wav',
        speed_ratio: Number(settings.volcSpeedRatio) || 1,
        volume_ratio: 1,
        pitch_ratio: 1,
      },
      request: {
        reqid: requestId || crypto.randomUUID(),
        text,
        text_type: 'plain',
        operation: 'query',
      },
    };

    try {
      const response = await fetch(validateUrl(settings.volcBaseUrl), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer;' + accessToken,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      const raw = await response.text();
      let parsed;
      try { parsed = JSON.parse(raw); } catch { parsed = null; }
      if (!response.ok) {
        throw new Error('火山引擎请求失败（' + response.status + '）：' + (extractMessage(parsed) || raw));
      }
      if (!parsed || Number(parsed.code) !== 3000 || !parsed.data) {
        throw new Error('火山引擎未返回音频：' + (extractMessage(parsed) || '未知响应'));
      }
      return { parsed, voiceType };
    } catch (error) {
      if (error?.name === 'AbortError') {
        throw new Error(controller.signal.reason === 'timeout' ? '火山引擎请求超时。' : '生成已取消。');
      }
      throw error;
    } finally {
      clearTimeout(timeout);
      if (requestId) activeRequests.delete(requestId);
    }
  }

  return {
    id: 'volcengine',
    async testConnection() {
      await request('连接测试', crypto.randomUUID());
      return { ok: true, billed: true };
    },
    async generate(payload) {
      if (payload.mode !== 'preset') throw new Error('当前火山引擎适配器仅支持已购买或已授权的音色 ID。');
      const text = String(payload.text || '').trim();
      if (!text) throw new Error('请输入需要合成的正文。');
      const result = await request(text, payload.requestId);
      return {
        audio: result.parsed.data,
        format: 'wav',
        mimeType: 'audio/wav',
        provider: 'volcengine',
        model: 'volcengine-v1-http',
        voice: result.voiceType,
        requestId: String(payload.requestId || ''),
        usage: null,
        warnings: ['火山引擎 V1 HTTP 为兼容接口；新音色后续可升级到 V3。'],
      };
    },
  };
}

module.exports = { createVolcengineProvider };
