<p align="center"><img src="build/icon.png" width="96" height="96" alt="Mytimes TTS 图标"></p>

<h1 align="center">Mytimes TTS</h1>

<p align="center">面向 Windows 的多引擎桌面文字转语音客户端。</p>

Mytimes TTS 支持 Xiaomi MiMo、火山引擎、GPT-SoVITS 和 IndexTTS2，并提供预置音色、音色设计、授权声音复刻、波形播放、本地历史和音频导出。

> 本项目不是上述模型或服务的官方客户端。

## 平台支持

| 平台 | 状态 | 说明 |
|---|---|---|
| Windows x64 | 当前支持 | Portable EXE 与 ZIP |
| macOS | 未来支持 | 待完成真机回归、签名与公证 |
| Android | 未来规划 | 需要单独适配移动端 |
## 主要功能

- 在 MiMo、火山引擎、GPT-SoVITS 和 IndexTTS2 之间切换。
- 使用预置音色、音色设计或已授权参考音频生成语音。
- 本地模型权重不进入应用包。
- 波形播放、点击或拖动定位、音频另存和本地历史。
- 本地“规则整理”不调用模型。
- AI 润色使用独立的 llama.cpp / OpenAI 兼容接口。
- 数据目录可使用本机、移动硬盘、映射盘或可信网络目录。
- API Key 通过 Windows DPAPI 按电脑和用户加密。

## 下载与开始使用
从 [GitHub Releases](https://github.com/MytimesXR/Mytimes-TTS/releases) 下载 Portable EXE，或完整解压 ZIP 后运行其中的 `Mytimes TTS.exe`。

首次启动：

1. 选择“公开版（推荐）”。
2. 使用默认数据目录，或选择自己的目录。
3. 在“设置”中选择引擎，填写服务地址和凭据。
4. “保存设置”不会调用 API；测试连接会先提示可能产生费用。
5. 返回“语音生成”，选择引擎、声音模式并填写正文。

Portable EXE 旁不会自动产生配置文件，运行数据都位于所选目录。
## 数据与隐私

- 仓库和安装包不包含默认 Key、用户设置、历史或音频。
- 数据只发送到当前选择的服务。
- 本地引擎默认连接 `127.0.0.1`。
- AI 润色默认关闭，且不会复用 TTS Key。
- 应用没有账号系统、广告 SDK、云同步或主动遥测。
- 网络目录可以顺序共享，但不建议多台电脑同时写入同一份历史。

详见 [隐私说明](docs/PRIVACY_NOTICE.md)。

## 声音复刻规则
只能使用本人声音，或已经取得明确、有效授权的声音。不得用于冒充、诈骗、骚扰、未经同意的传播或其他违法、侵权活动。

## 本地开发

```powershell
npm ci
npm start
npm run dist
npm run check:public
npm run check:packaged
```
## 文档

- [安装与使用](docs/INSTALL_AND_USE.md)
- [MiMo API Key 教程](docs/MIMO_API_KEY_GUIDE.md)
- [多语音引擎配置](docs/MULTI_ENGINE_GUIDE.md)
- [隐私说明](docs/PRIVACY_NOTICE.md)
- [安全政策](SECURITY.md)
- [跨平台路线](docs/CROSS_PLATFORM_ROADMAP.md)
- [更新记录](CHANGELOG.md)

## 问题反馈

普通问题和建议可通过 GitHub Issues 提交。请勿公开 API Key、正文、声音样本、音频或其他隐私。安全问题请按安全政策私下报告。
## 许可

本仓库公开可见不代表已授予开源许可。当前未附带 `LICENSE`；如需接受外部贡献、修改或再分发，应由项目所有者先确定许可证。

Copyright © MytimesXR. All rights reserved.

## 官方资料

- [Xiaomi MiMo 语音合成](https://mimo.mi.com/docs/zh-CN/usage-guide/speech-synthesis)
- [火山引擎语音合成 API](https://www.volcengine.com/docs/6561/2228192)
- [GPT-SoVITS](https://github.com/RVC-Boss/GPT-SoVITS)
- [IndexTTS2](https://github.com/index-tts/index-tts)
