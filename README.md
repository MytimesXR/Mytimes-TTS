<p align="center">
  <img src="build/icon.png" width="96" height="96" alt="Mytimes TTS 图标">
</p>

<h1 align="center">Mytimes TTS</h1>

<p align="center">
  面向 Windows 与 macOS 的桌面文字转语音工具，接入 Xiaomi MiMo TTS。
</p>

Mytimes TTS 是 MytimesXR 制作的 Electron 桌面应用，支持预置音色、描述式音色设计和授权声音复刻，并提供波形播放、本地历史与音频导出。

> 本项目不是 Xiaomi 或 MiMo 官方客户端。模型能力、额度、价格、内容政策和服务可用性以 Xiaomi MiMo 官方说明为准。

## 项目状态

| 平台 | 状态 | 说明 |
|---|---|---|
| Windows x64 | 可用 | Portable EXE 与 ZIP 已完成构建和启动验证 |
| macOS Apple Silicon | 预览支持 | 支持通过 macOS CI 生成 arm64 DMG/ZIP，仍需真机回归、签名与公证 |
| macOS Intel | 预览支持 | 支持通过 macOS CI 生成 x64 DMG/ZIP，仍需真机回归、签名与公证 |
| Android | 规划中 | Electron 不能直接导出 APK，后续计划使用移动端容器适配 |

## 主要功能

- Xiaomi MiMo 官方预置音色与自然语言演绎风格。
- AI 风格润色只优化风格描述，不修改待朗读正文。
- 使用年龄、音高、节奏、质感和角色等特征设计音色。
- 上传或拖入 WAV/MP3 参考音频进行授权声音复刻。
- 音频波形、点击或拖动定位、播放暂停和另存为。
- 本地生成历史、重新生成、单条删除和批量清理。
- 支持标准 API、Token Plan 和自定义兼容地址。
- API Key 使用操作系统安全存储能力加密后保存在本机。

## 下载

所有可下载版本统一发布在 [GitHub Releases](https://github.com/MytimesXR/Mytimes-TTS/releases)。

| 设备 | 建议下载 |
|---|---|
| 64 位 Windows | Portable EXE；也可选择 Windows x64 ZIP |
| Apple 芯片 Mac | 文件名包含 `macOS-arm64` 的 DMG |
| Intel Mac | 文件名包含 `macOS-x64` 的 DMG |

Windows 和 macOS 测试构建可能尚未完成正式代码签名。请只从本仓库 Releases 下载，并在运行前核对发布页提供的 SHA-256。

## 快速开始

1. 从 [Releases](https://github.com/MytimesXR/Mytimes-TTS/releases) 下载适合当前电脑的版本。
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
- Windows 使用 DPAPI、macOS 使用 Keychain 对应的系统能力保护本机 Key。
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

macOS 构建必须在 macOS 主机或 macOS CI 上执行：

```bash
npm run dist:mac
```

发布前检查：

```powershell
npm run check:public
npm run check:packaged
```

仓库已提供 [macOS 自动构建流程](.github/workflows/build-macos.yml)，用于生成 Apple Silicon 与 Intel 两种架构的 DMG/ZIP。

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
