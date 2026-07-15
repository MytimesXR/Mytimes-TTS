function normalizeEndpoint(baseUrl) {
  let url = String(baseUrl || '').trim().replace(/\/+$/, '');
  if (!/^https?:\/\//i.test(url)) throw new Error('Base URL 必须以 http:// 或 https:// 开头。');
  if (/\/chat\/completions$/i.test(url)) return url;
  if (/\/v1$/i.test(url)) return url + '/chat/completions';
  return url + '/v1/chat/completions';
}

function buildHeaders(settings) {
  const apiKey = String(settings.apiKey || '').trim();
  if (!apiKey) throw new Error('请先在设置中填写 API Key。');
  const headers = { 'Content-Type': 'application/json' };
  if (settings.authMode === 'bearer') headers.Authorization = 'Bearer ' + apiKey;
  else headers['api-key'] = apiKey;
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
  const prefix = messages[status] || 'MiMo API 请求失败（' + status + '）。';
  return detail && detail !== '[object Object]' ? prefix + '\n' + detail : prefix;
}

function validatePayload(payload) {
  const text = String(payload?.text || '').trim();
  if (!text) throw new Error('请输入需要合成的正文。');
  if (!['preset', 'design', 'clone'].includes(payload.mode)) throw new Error('未知的生成模式。');
  if (payload.mode === 'design' && !String(payload.voiceDesign || '').trim()) {
    throw new Error('请填写音色设计描述。');
  }
  if (payload.mode === 'clone') {
    const sample = payload.sample;
    if (!sample?.dataBase64 || !sample?.mimeType) throw new Error('请选择 WAV 或 MP3 参考音频。');
    const dataUri = 'data:' + sample.mimeType + ';base64,' + sample.dataBase64;
    if (Buffer.byteLength(dataUri, 'utf8') > 10 * 1024 * 1024) {
      throw new Error('参考音频 Base64 编码后超过 10 MB，请压缩或裁剪后重试。');
    }
  }
  return text;
}

function buildBody(payload) {
  const text = validatePayload(payload);
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
        voice: 'data:' + payload.sample.mimeType + ';base64,' + payload.sample.dataBase64,
      },
    };
  }
  return {
    model: 'mimo-v2.5-tts',
    messages: [
      { role: 'user', content: style },
      { role: 'assistant', content: text },
    ],
    audio: { format: 'wav', voice: String(payload.voice || 'mimo_default') },
  };
}

function createMimoProvider({ getSettings, activeRequests }) {
  async function post(body, requestId) {
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
        throw new Error(controller.signal.reason === 'timeout'
          ? '请求超时，请在设置中延长超时时间后重试。'
          : '生成已取消。');
      }
      throw error;
    } finally {
      clearTimeout(timeout);
      if (requestId) activeRequests.delete(requestId);
    }
  }

  return {
    id: 'mimo',
    async testConnection() {
      const result = await post({
        model: 'mimo-v2.5',
        messages: [{ role: 'user', content: '只回复 OK' }],
        max_completion_tokens: 8,
        temperature: 0,
      });
      return { ok: Boolean(result?.choices?.[0]?.message) };
    },
    async generate(payload) {
      const body = buildBody(payload);
      const result = await post(body, payload.requestId);
      const audio = result?.choices?.[0]?.message?.audio?.data;
      if (!audio) throw new Error('MiMo API 没有返回音频数据。');
      return {
        audio,
        format: 'wav',
        mimeType: 'audio/wav',
        provider: 'mimo',
        model: body.model,
        voice: payload.mode === 'preset' ? String(payload.voice || 'mimo_default') : '',
        requestId: String(payload.requestId || ''),
        usage: result?.usage || null,
        warnings: [],
      };
    },
  };
}

module.exports = { createMimoProvider };
