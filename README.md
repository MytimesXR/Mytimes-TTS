<p align="center">
  <img src="build/icon.png" width="96" height="96" alt="Mytimes TTS 图标">
</p>

<h1 align="center">Mytimes TTS</h1>

<p align="center">
  面向 Windows 的桌面文字转语音工具，接入 Xiaomi MiMo TTS。
</p>

Mytimes TTS 是 MytimesXR 制作的 Electron 桌面应用，支持预置音色、描述式音色设计、授权声音复刻、波形播放、本地历史与音频导出。

> 本项目不是 Xiaomi 或 MiMo 官方客户端。模型能力、额度、价格、内容政策和服务可用性以 Xiaomi MiMo 官方说明为准。

## 项目状态

| 平台 | 状态 | 说明 |
|---|---|---|
| Windows x64 | 当前支持 | 提供 Portable EXE 与 ZIP |
| macOS | 未来支持 | 尚未作为公开下载版本发布，需完成真机回归、签名与公证 |
| Android | 未来规划 | Electron 不能直接导出 APK，需要单独适配移动端容器 |

## 主要功能

- Xiaomi MiMo 预置音色与自然语言演绎风格。
- AI 风格润色只优化风格描述，不修改待朗读正文。
- 使用年龄、音高、节奏、质感和角色等特征设计音色。
- 上传或拖入 WAV/MP3 参考音频进行授权声音复刻。
- 音频波形、点击或拖动定位、播放暂停和另存为。
- 本地生成历史、重新生成、单条删除和批量清理。
- 支持标准 API、Token Plan 和自定义兼容地址。
- API Key 通过 Windows 系统安全存储能力加密后保存在本机。

## 下载

请在 [GitHub Releases](https://github.com/MytimesXR/Mytimes-TTS/releases) 下载 Windows x64 版本：

- `Portable` EXE：推荐，下载后直接运行。
- Windows x64 ZIP：解压后运行其中的 `Mytimes TTS.exe`。

当前 Windows 构建可能尚未完成正式代码签名。请只从本仓库 Releases 下载，并核对发布页提供的文件信息。

## 快速开始

1. 从 [Releases](https://github.com/MytimesXR/Mytimes-TTS/releases) 下载 Windows x64 版本。
2. 打开应用，进入“设置”。
3. 选择 MiMo 服务类型，填写自己的 API Key。
4. 点击“验证连接”。
5. 返回“语音生成”，选择预置音色、音色设计或音色复刻。
6. 填写待朗读正文并生成语音。

完整步骤见：

- [安装与使用教程](docs/INSTALL_AND_USE.md)
- [MiMo API Key 获取与配置](docs/MIMO_API_KEY_GUIDE.md)
- [隐私说明](docs/PRIVACY_NOTICE.md)

## API Key 与隐私

- 仓库、安装包和自动构建流程不包含默认 API Key。
- 每位用户需要填写自己有权使用的 Xiaomi MiMo API Key。
- Windows 使用 DPAPI 对应的系统能力保护本机 Key。
- 正文、风格描述和声音复刻样本会发送到用户配置的 API 服务。
- 当前应用没有 MytimesXR 账号、广告 SDK、云同步或主动遥测上报。
- 本地生成历史和应用保存的 WAV 副本不会主动上传到 MytimesXR。

详细数据处理方式见 [隐私说明](docs/PRIVACY_NOTICE.md)。

## 声音复刻使用规则

只能使用本人声音，或已经取得明确、有效授权的声音。不得将本项目用于冒充、诈骗、骚扰、未经同意的公开传播或其他违法、侵权活动。

## 本地开发

需要 Node.js LTS 和 npm：

```powershell
npm ci
npm start
```

Windows 构建：

```powershell
npm run dist
```

发布前检查：

```powershell
npm run check:public
npm run check:packaged
```

macOS 与 Android 的后续适配计划见 [跨平台路线](docs/CROSS_PLATFORM_ROADMAP.md)。

## 文档

- [安装与使用教程](docs/INSTALL_AND_USE.md)
- [MiMo API Key 获取教程](docs/MIMO_API_KEY_GUIDE.md)
- [隐私说明](docs/PRIVACY_NOTICE.md)
- [安全政策](SECURITY.md)
- [跨平台路线与 Android 评估](docs/CROSS_PLATFORM_ROADMAP.md)
- [更新记录](CHANGELOG.md)

## 问题反馈

普通问题和功能建议可以通过 GitHub Issues 提交。请勿在公开 Issue、截图或日志中包含 API Key、用户正文、声音样本、生成音频或其他隐私信息。

安全问题请按照 [安全政策](SECURITY.md) 私下报告，不要公开披露可利用细节。

## 许可

本仓库公开可见不代表已经授予开源许可。当前项目未附带 `LICENSE`，除适用法律或平台条款另有要求外，未授予复制、修改、再分发或商业使用许可。

Copyright © MytimesXR. All rights reserved.

## 官方资料

- [Xiaomi MiMo 首次 API 调用](https://mimo.mi.com/docs/zh-CN/quick-start/summary/first-api-call)
- [Xiaomi MiMo API Key 常见问题](https://mimo.mi.com/docs/zh-CN/quick-start/faq/api-integration)
- [Xiaomi MiMo 语音合成指南](https://mimo.mi.com/docs/zh-CN/usage-guide/speech-synthesis)
- [Electron 官方文档](https://www.electronjs.org/docs/latest)
