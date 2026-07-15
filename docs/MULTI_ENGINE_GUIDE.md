# 多语音引擎配置与使用

Mytimes TTS 的正文、播放器、波形、保存和历史是共用层，语音生成由当前选择的引擎完成。切换引擎不会修改正文。

## 引擎对照

| 引擎 | 运行位置 | 当前入口 | 主要用途 | 是否可能计费 |
|---|---|---|---|---|
| Xiaomi MiMo | 云端 | 官方或兼容 Chat Completions 地址 | 预置音色、音色设计、声音复刻 | 是 |
| 火山引擎 | 云端 | V1 HTTP 兼容接口 | 使用账号已开通的 voice_type 合成 | 是 |
| GPT-SoVITS | 本机或局域网 | 官方 api_v2.py 的 /tts | 参考音频与参考原文驱动的声音复刻 | 本地运行不产生云端 TTS 费用 |
| IndexTTS2 | 本机或局域网 | Mytimes Local Gateway | 零样本声音复刻、文字或八维情绪控制 | 本地运行不产生云端 TTS 费用 |

应用不会附带任何模型权重、整合包或用户 Key。

## 火山引擎

官方产品与能力总览：[豆包语音](https://docs.volcengine.com/docs/6561/163032?lang=zh)。该页面用于确认产品能力范围，不是单一接口的完整请求定义；实际接入应以当前账号控制台中已开通产品对应的 API 文档、鉴权字段和资源 ID 为准。

1. 在火山引擎豆包语音控制台创建应用并开通所需语音合成服务。
2. 在“设置 → 火山引擎”填写 App ID、Access Token、Cluster 和已经授权的 voice_type。
3. 只点击“保存设置”不会发起请求。
4. “保存并测试连接”会合成很短的“连接测试”，应用会先显示费用确认。
5. 返回生成页，切换为“火山引擎”，使用预置音色模式生成。

当前适配器使用 V1 HTTP 兼容接口。火山引擎官方已建议新一代大模型音色使用 V3；需要 2.0 新音色时，应在后续适配 V3，而不是把新版 API Key 填入传统 App ID 或 Access Token 字段。声音复刻训练与音色购买属于控制台或音色管理 API 流程，当前 App 不会把上传样本直接提交为火山音色训练任务。

官方资料：

- [语音合成大模型 API 列表](https://www.volcengine.com/docs/6561/2228192)
- [声音复刻音色管理 API](https://www.volcengine.com/docs/6561/2235883)

## GPT-SoVITS

GPT-SoVITS 可以在本机运行。App 不启动模型，只连接已经运行的官方 API v2 服务。

1. 安装并验证 [GPT-SoVITS 官方项目](https://github.com/RVC-Boss/GPT-SoVITS)。
2. 使用项目提供的 api_v2.py 启动服务，默认地址建议为 127.0.0.1:9880。
3. 在“设置 → GPT-SoVITS”填写地址、目标语言、参考音频语言和文本切分方式。
4. 返回生成页，选择 GPT-SoVITS；界面会自动切换到声音复刻。
5. 上传参考 WAV/MP3，并逐字填写参考音频原文。
6. 勾选声音授权后生成。

生成时，App 会把参考音频临时写入 Windows 临时目录，让同一台电脑上的官方 API 能读取文件；请求结束后立即删除。若 GPT-SoVITS 部署在另一台电脑，官方 ref_audio_path 不能直接读取本机路径，需要额外配置共享路径或使用支持文件上传的可信网关。

官方接口实现：

- [GPT-SoVITS api_v2.py](https://github.com/RVC-Boss/GPT-SoVITS/blob/main/api_v2.py)

## IndexTTS2

IndexTTS2 可以本地部署，但 Electron 不能直接加载 Python 与 CUDA 模型，因此项目提供一个独立 FastAPI 网关。

1. 按 [IndexTTS2 官方仓库](https://github.com/index-tts/index-tts) 安装项目、环境和 checkpoints。
2. 先确认官方 WebUI 能生成语音。
3. 按 [本地网关说明](../local-gateway/README.md) 启动 127.0.0.1:9872。
4. 在“设置 → IndexTTS2”保存网关地址并测试。
5. 返回生成页，上传参考声音；情绪来源可以选择风格文字或八维向量。
6. 需要更低显存占用时，在网关启动参数中使用 --fp16；加速参数是否可用取决于官方环境。

模型权重、CUDA、整合包和 Python 虚拟环境都被 .gitignore 排除，不进入 GitHub 或 Windows EXE。

## 本机与局域网安全

- 默认使用 127.0.0.1，不对局域网开放。
- 只有明确需要其他电脑访问时才监听 0.0.0.0，并配置独立 Key 与 Windows 防火墙。
- 本地服务 Key 与 MiMo、火山引擎凭据完全分离。
- 不要运行来源不明的整合包启动脚本；至少先检查下载来源、哈希、启动命令和开放端口。
- NAS 可以保存普通设置和历史，但同一份 history.json 不适合多台电脑同时写入。

[返回文档中心](README.md)
