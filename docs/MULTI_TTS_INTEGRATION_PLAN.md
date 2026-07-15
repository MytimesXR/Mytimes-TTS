# Mytimes TTS 多引擎改造实时跟进

> 本文件是任务恢复入口。每完成一次关键修改、测试、构建或 NAS 同步都必须更新。不得写入真实 Key、Token、用户正文、参考声音路径或其他隐私数据。

## 项目目标

在保留现有 Xiaomi MiMo 功能和数据兼容性的前提下，新增三套语音引擎并允许用户切换：

1. 火山引擎豆包语音：公司云端服务。
2. GPT-SoVITS：本地 HTTP API。
3. IndexTTS2：本地模型，通过 Mytimes Local TTS Gateway 接入。

## 当前基线

- 当前开发候选版本：v0.2.0，尚未上传 GitHub Release。
- 当前可回退公开版本：v0.1.7，旧文件保存在 NAS old。
- 本轮交付将重新生成完整 v0.2.0 更新目录，不要求用户拼接增量补丁。
- 当前业务数据继续使用用户选择的 Mytimes-TTS-Data，本任务不得覆盖、打包或提交该目录。
- 现有 MiMo、波形、播放、历史、数据目录、DPAPI Key 和首次引导必须保持可用。

## 本轮实现

- 统一 TTS Provider 注册表、能力声明、请求和响应结构。
- 将现有 MiMo 迁移为 Provider，行为保持兼容。
- 语音生成页增加引擎切换和云端、本地、计费状态。
- 火山引擎设置、普通合成、预置音色和声音复刻基础能力。
- GPT-SoVITS 本地 /tts 接入、参考音频和参考文本。
- IndexTTS2 本地 FastAPI 网关、参考声音和情绪控制。
- 历史记录增加 provider、model、voice，并兼容旧记录。
- 修复并统一应用图标。
- 引擎卡片只显示云端或本地类型，不向普通用户展示“已接入”“接入中”等开发状态。
- 更新公开文档、隐私说明、构建白名单和发布包。

## 本轮不做

- 自动下载或打包模型权重。
- 自动执行网络来源不明的整合包脚本。
- 多 GPU 调度、多用户并发队列。
- WebSocket 边生成边播放。
- MiniMax、Qwen、dots.tts、OmniVoice。
- macOS 本地模型部署。
- 把公司共享凭据硬编码进 EXE 或 GitHub。

## 安全规则

- 火山引擎 Token、AK、SK、MiMo Key 和本地服务 Key 必须分别使用 Windows DPAPI 加密。
- NAS 共享 settings.json 只能保存非敏感配置；每台电脑和 Windows 用户分别保存加密凭据。
- 本地模型默认仅连接 127.0.0.1；局域网地址必须明确提示。
- 连接测试必须说明是否会产生云端请求或费用。
- 本地整合包和模型权重不进入 GitHub 源码包或 Electron 安装包。

## 统一 Provider 契约

每个 Provider 需要实现：

- getCapabilities()
- testConnection()
- listVoices()
- generate()
- cloneVoice()（可选）
- cancel()
- normalizeError()

统一请求至少包含 provider、mode、text、language、voiceId、style、referenceAudio、referenceText、emotion、speed、pitch、volume、outputFormat 和 requestId。

统一结果至少包含音频数据、mimeType、sampleRate、provider、model、voice、requestId、usage 和 warnings。

## Provider 预设

### Xiaomi MiMo

- 状态：现有功能，等待迁移到 Provider。
- 云端、可能计费。
- 保留预置音色、音色设计、声音复刻和独立润色设置。

### 火山引擎

- 类型：云端、可能计费。
- 设置预留：App ID、Access Token、AK、SK、Resource ID、Cluster、默认模型、默认音色、超时。
- 第一批能力：连接检查、普通合成、预置音色、声音复刻基础流程。
- 凭据必须独立加密，不复用 MiMo Key。

### GPT-SoVITS

- 类型：本地。
- 默认服务地址：http://127.0.0.1:9880。
- 默认合成路径：/tts。
- 设置预留：目标语言、参考语言、参考文本、文本切分方式、超时。
- App 只连接 HTTP API，不绑定某个 B 站整合包目录。

### IndexTTS2

- 类型：本地。
- 默认网关地址：http://127.0.0.1:9872。
- 设置预留：参考声音、参考情绪音频、情绪强度、八维情绪、随机采样、超时。
- 通过项目内 local-gateway 的 FastAPI 服务适配官方 Python 推理。

## UI 方案

- 语音生成页增加语音引擎切换：MiMo、火山引擎、GPT-SoVITS、IndexTTS2。
- 切换引擎时保留正文，不携带不兼容参数。
- 根据 capabilities 动态显示预置音色、声音设计、声音复刻、参考文本和情绪控制。
- 状态统一为：云端·可能计费、本地·已连接、本地·未启动、配置不完整、正在生成。
- 波形、播放器、保存和历史继续共用。

## 执行清单

### 1. 任务基线与图标

- [x] 建立实时跟进文档。
- [x] 确认 v0.1.7 源码包和 Windows 发布包可用于回退。
- [x] 发现当前 PNG、ICO、SVG 图标版本和修改时间不统一。
- [x] 确认继续使用 v0.1.7 波形 Logo，仅去除外圈描边。
- [x] 统一生成 PNG、ICO、SVG 并检查小尺寸显示。
- [x] 为 BrowserWindow 明确指定 build/icon.png；引导页、README 和打包引用保持统一。

### 2. Provider 架构

- [x] 定义 Provider 类型、能力和统一错误。
- [x] 建立 Provider Registry。
- [x] 将 MiMo 请求迁移到 Provider。
- [x] 保持现有 MiMo 请求、历史和设置兼容。

### 3. 模型切换 UI

- [x] 增加引擎切换器。
- [x] 增加能力驱动的动态模式状态。
- [x] 增加云端、本地、计费状态。
- [x] 历史记录显示 Provider；模型和音色字段已进入统一历史结构。

### 4. 火山引擎

- [x] 设置字段和 DPAPI 加密。
- [x] 测试连接。
- [x] 普通语音合成。
- [x] 使用账号已授权的预置或复刻音色 ID。
- [x] 明确声音训练与购买不在本轮 App 内直接执行。
- [x] 费用提醒和错误码。
- [ ] 公司账号人工验证。

### 5. GPT-SoVITS

- [x] 本地地址和健康检查。
- [x] /tts 请求适配。
- [x] 参考音频、参考文本和语言参数。
- [x] 超时、取消和错误处理。
- [ ] 使用可信本地整合包人工验证。

### 6. IndexTTS2

- [x] 建立 local-gateway。
- [x] FastAPI 健康检查和统一生成接口。
- [x] IndexTTS2 Python Provider。
- [x] 参考声音与文字情绪控制。
- [x] 八维情绪和随机采样。
- [x] 模型加载、推理失败和路径错误提示。
- [ ] 独立参考情绪音频。

### 7. 发布

- [ ] 旧设置和历史迁移回归。
- [x] 源码隐私检查。
- [x] 打包白名单检查。
- [x] Portable EXE 和 ZIP 验证。
- [x] 更新 README、安装教程、隐私说明和更新记录。
- [x] 同步 NAS，旧版移入 old。
- [ ] 生成 GitHub 上传清单和 SHA-256。

## 当前发现

- build/icon.png 和 build/icon.ico 修改时间较早，当前图案为深色圆角方块内的四色波形。
- build/icon.svg 修改时间不同，三个图标源并未通过同一源文件统一生成。
- app/index.html 和 README 使用 build/icon.png。
- electron-builder 使用 build/icon.ico 生成 Windows EXE 图标。
- BrowserWindow 当前没有明确设置窗口 icon，开发模式和部分 Windows 场景可能继续显示 Electron 或缓存图标。
- 用户确认继续使用 v0.1.7 波形 Logo，不改成公司头像图案，只移除外圈描边。

## 已修改文件

- docs/MULTI_TTS_INTEGRATION_PLAN.md：新增任务恢复与实时跟进文档。
- docs/README.md：加入本任务文档入口。
- build/icon.svg：移除 Logo 外圈描边。
- scripts/render-icons.js：新增由 SVG 统一生成 PNG 和多尺寸 ICO 的脚本。
- package.json：新增 icons 命令。
- electron/main.js：为 BrowserWindow 明确指定应用图标。
- electron/providers/provider-types.js：新增四类引擎能力和状态预设。
- electron/providers/provider-registry.js：新增 Provider 注册表。
- electron/providers/mimo-provider.js：迁移现有 MiMo 连接测试、请求、校验和生成逻辑。
- electron/preload.js：暴露 Provider 列表和连接测试桥接。
- scripts/audit-packaged-app.js：将 Provider 模块加入打包白名单和隐私扫描。
- app/index.html：新增 MiMo、火山引擎、GPT-SoVITS、IndexTTS2 引擎切换预设。
- app/styles.css：新增引擎切换、云端与本地标识及不支持模式状态。
- app/app.js：加载 Provider 清单、切换引擎、限制不支持模式、提交 provider，并兼容历史恢复。
- electron/providers/volcengine-provider.js：火山引擎 V1 HTTP 合成、超时、取消与错误处理。
- electron/providers/gpt-sovits-provider.js：GPT-SoVITS API v2、参考原文和临时参考音频适配。
- electron/providers/index-tts2-provider.js：IndexTTS2 本地网关健康检查与合成适配。
- local-gateway/index_tts2_gateway.py：官方 IndexTTS2 Python 推理的 FastAPI 网关。
- docs/MULTI_ENGINE_GUIDE.md：四引擎部署、费用、隐私和局域网使用说明。
- 标题栏和侧栏品牌区：统一使用当前无描边应用 Logo。
- 火山引擎官方页面核对：用户提供的豆包语音页面属于产品能力总览，具体鉴权与协议继续以公司账号已开通产品对应的接口页为准。
- README.md、隐私说明、安装教程、更新记录：统一更新为多引擎版本。

## 测试记录

- 尚未调用 MiMo 或火山引擎 API。
- 尚未启动或下载任何本地模型。
- 四个 Provider 的 Node.js 语法检查通过。
- MiMo、火山引擎、GPT-SoVITS 与 IndexTTS2 适配器的全模拟请求通过，未访问网络。
- Electron 主进程与设置页完成无联网启动回归。
- 公开源码隐私检查通过，未发现 Key、历史、音频、证书或个人路径。
- app.asar 白名单与包内隐私检查通过。
- Portable EXE 已在隔离数据目录下成功启动；Windows ZIP 结构检查通过。
- 最终 Portable EXE 自动截图与修正后源码截图哈希完全一致，确认最终包包含正确 Logo、精简状态文案和完整样式。
- 最终 Windows 产物为 Mytimes-TTS-Portable-0.2.0-x64.exe 与 Mytimes-TTS-0.2.0-x64.zip。
- 公开源码包已通过解压后二次隐私检查并包含 .gitignore。
- NAS 根源码版本为 0.2.0，三个发布文件哈希与本地一致，Mytimes-TTS-Data 保持存在且未打包。

## 阻塞与人工输入

- 火山引擎账号的 App ID、Resource ID 和服务开通状态需要后续人工确认；真实凭据不得写入本文档。
- GPT-SoVITS 与 IndexTTS2 的具体整合包后续由用户选择，App 接口不绑定整合包路径。
- 当前电脑没有可用的 Python 命令，因此网关已做代码审查但尚未在真实 IndexTTS2 环境中启动。
- NAS release 中旧版解压目录的 build 子目录存在 ACL 拒绝访问，0.1.7 文件已复制归档到 old，但这个残留目录无法在当前权限下完成移动。

## 下一步唯一任务

使用公司火山引擎账号与可信 GPT-SoVITS、IndexTTS2 环境做人工联调；根据实际账号能力决定火山引擎 V3 升级。

## 上下文恢复说明

如果对话中断：

1. 阅读本文件全部内容。
2. 阅读 CHANGELOG.md 最新条目。
3. 检查 package.json 版本和实际文件修改。
4. 从“下一步唯一任务”继续。
5. 不重复已经标记为完成的动作，不调用真实云端 API，除非进入人工验证阶段并获得授权。
