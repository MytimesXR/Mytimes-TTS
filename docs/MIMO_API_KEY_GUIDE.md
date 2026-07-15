# MiMo API Key 获取与使用教程

这篇教程面向第一次使用 API 的同事。API Key 可以理解成调用 Xiaomi MiMo 服务的“专用密码”；拿到以后只填进 Mytimes TTS，不要发给别人，也不要放进 GitHub。

## 一、先选择计费方式

MiMo 目前有两类 Key，地址和 Key 必须成套使用。

| 类型 | Key 外观 | Mytimes TTS 中选择 | Base URL |
|---|---|---|---|
| 按量付费 | `sk-xxxxx` | 按量付费 | `https://api.xiaomimimo.com/v1` |
| Token Plan | `tp-xxxxx` | Token Plan | 以 Token Plan 页面显示的专属地址为准 |

两种 Key 不能互换。如果把 `tp-` Key 配到按量付费地址，或者把 `sk-` Key 配到 Token Plan 地址，通常会认证失败。

## 二、登录 MiMo 开放平台

1. 打开 [Xiaomi MiMo 开放平台](https://mimo.mi.com/)。
2. 点击登录，使用小米账号完成登录。
3. 如果平台要求开通服务、实名认证、充值或购买套餐，请按页面提示完成。

官方首次调用说明见 [首次 API 调用](https://mimo.mi.com/docs/zh-CN/quick-start/summary/first-api-call)。控制台页面将来可能调整，若按钮名称有变化，以官方页面为准。

## 三、获取按量付费 Key

适合先测试、按实际调用量结算的使用方式。

1. 登录开放平台后进入“控制台”。
2. 打开“API Keys”页面。
3. 点击申请或创建 API Key。
4. 立即复制新 Key，并保存到可信的密码管理器中。
5. 确认 Key 以 `sk-` 开头。

在 Mytimes TTS 中填写：

- 服务类型：`按量付费`
- Base URL：`https://api.xiaomimimo.com/v1`
- API Key：粘贴刚创建的 `sk-` Key
- 认证方式：`api-key`

不要把完整 `/chat/completions` 重复拼到默认地址后面。应用既兼容填写到 `/v1` 的地址，也兼容官方给出的完整接口地址。

## 四、获取 Token Plan Key

适合已经购买 Token Plan 套餐的账号。

1. 登录开放平台，进入 Token Plan 套餐页面。
2. 购买或打开已有套餐。
3. 在该页面创建专属 API Key。
4. 创建时立即复制 `tp-` Key。官方说明这类 Key 通常只在创建时完整展示一次。
5. 同时复制套餐页面显示的 Base URL；不要凭印象手写。

在 Mytimes TTS 中填写：

- 服务类型：`Token Plan`
- Base URL：粘贴套餐页面显示的专属地址
- API Key：粘贴 `tp-` Key
- 认证方式：`api-key`

如果 Key 遗失或怀疑泄露，请在 Token Plan 页面重置，不要继续使用旧 Key。详细说明见 [MiMo API Key 常见问题](https://mimo.mi.com/docs/zh-CN/quick-start/faq/api-integration)。

## 五、在应用中验证连接

1. 打开 Mytimes TTS。
2. 点击左侧“设置”。
3. 按上一节填写服务类型、Base URL、API Key 和认证方式。
4. 点击“保存设置”。
5. 点击“验证连接”。
6. 出现连接成功提示后，再回到“语音生成”。

“验证连接”会进行一次很小的模型调用，可能计入账号用量。

API Key 输入框右侧的小眼睛只用于临时核对。确认无误后应恢复隐藏；截图、录屏或演示前也必须保持隐藏。

## 六、第一次生成语音

### 预置音色

1. 进入“语音生成”，选择“预置音色”。
2. 先选“MiMo 默认”或“冰糖”。
3. 在正文框输入一小段测试文字。
4. 风格可暂时留空，也可以选择“温柔”“平静”等标签。
5. 点击“生成语音”。
6. 生成完成后，用波形播放器试听；点击或拖动波形可跳转位置。
7. 点击“保存音频”选择保存位置。

### 音色设计

1. 切换到“音色设计”。
2. 用 1～4 句描述声音，例如“青年女性，音色清亮温暖，语速中等，像纪录片旁白一样克制自然”。
3. 填写正文并生成。

音色设计使用 `mimo-v2.5-tts-voicedesign`，描述的是“谁在说、声音是什么质感”。

### 音色复刻

1. 切换到“音色复刻”。
2. 点击上传区，或把 WAV / MP3 拖进去。
3. 推荐使用单人、干净、无背景音乐、无明显混响的样本。
4. 确认你拥有该声音的使用授权。
5. 填写正文和可选的演绎风格后生成。

MiMo 官方要求复刻样本采用 WAV 或 MP3；Base64 编码后的数据不得超过 10 MB。应用会在发送前检查。模型和请求结构见 [MiMo 语音合成指南](https://mimo.mi.com/docs/zh-CN/usage-guide/speech-synthesis)。

## 七、常见错误

| 提示或状态 | 常见原因 | 处理方法 |
|---|---|---|
| 401 认证失败 | Key 错误、已失效，或 `sk-` / `tp-` 与地址不匹配 | 重新复制 Key，核对服务类型和 Base URL |
| 402 额度不足 | 余额或套餐额度不足 | 在 MiMo 控制台查看余额与套餐 |
| 403 拒绝访问 | 账号权限、地区、风控或服务策略限制 | 登录控制台查看账号状态，必要时联系官方支持 |
| 404 找不到接口 | Base URL 填错或路径重复 | 按量付费恢复为 `https://api.xiaomimimo.com/v1`；Token Plan 重新复制专属地址 |
| 421 内容被拦截 | 正文、风格或参考音频触发安全审核 | 调整内容后重试 |
| 429 请求过多 | 调用过快或套餐限制 | 等待片刻再试，减少并发请求 |
| 请求超时 | 网络慢、正文较长或服务繁忙 | 在设置中增加超时时间，缩短正文后重试 |
| 没有返回音频 | 服务响应异常或模型暂时不可用 | 保留当前配置，稍后重新生成 |

## 八、Key 安全清单

- 每位开发或使用者尽量使用自己的 Key，不共享个人 Key。
- 不在微信群、邮件正文、Issue、代码注释或截图中发送完整 Key。
- 不把 Key 写进 `.env` 后提交 Git；本项目也不会读取仓库内置 Key。
- 不把 Key 打进 Android APK、前端网页或公开安装包。
- 对 Key 设置合理额度和调用监控，离职或项目结束后及时撤销。
- 一旦怀疑泄露，立即在 MiMo 控制台重置，并检查调用记录。

## 九、官方参考

- [首次 API 调用](https://mimo.mi.com/docs/zh-CN/quick-start/summary/first-api-call)
- [API Key 常见问题](https://mimo.mi.com/docs/zh-CN/quick-start/faq/api-integration)
- [语音合成指南](https://mimo.mi.com/docs/zh-CN/usage-guide/speech-synthesis)

[返回文档中心](README.md)
