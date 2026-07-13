# Mytimes TTS

Mytimes TTS 是 MytimesXR 制作的桌面文字转语音工具。当前版本为 `0.1.3`，基于 Electron，支持 Windows 与 macOS，并接入 Xiaomi MiMo-V2.5-TTS。

> 本项目不是 Xiaomi 或 MiMo 官方客户端。模型能力、额度、价格和服务可用性以 Xiaomi MiMo 官方说明为准。

## 主要功能

- 9 个 MiMo 预置音色，以及自然语言演绎风格。
- AI 风格润色只优化风格描述，不修改待朗读正文。
- 通过特征描述设计音色。
- 拖入 WAV / MP3 参考音频进行音色复刻。
- 音频波形、点击或拖动定位、播放暂停和另存为。
- 本地生成历史、重新生成和清理。
- 标准 API、Token Plan 和自定义兼容地址。
- API Key 通过操作系统安全存储加密后保存在本机。

## 下载选择

| 系统 | 文件 | 适用设备 |
|---|---|---|
| Windows | `Mytimes-TTS-Portable-0.1.3-x64.exe` | 64 位 Windows，双击运行 |
| Windows | `Mytimes-TTS-0.1.3-x64.zip` | 64 位 Windows，解压后运行 |
| macOS | `Mytimes-TTS-0.1.3-macOS-arm64.dmg` | Apple 芯片 Mac |
| macOS | `Mytimes-TTS-0.1.3-macOS-x64.dmg` | Intel Mac |

macOS ZIP 是 DMG 的备用分发形式。当前内部测试构建尚未做 Apple Developer 签名与公证；公开对外发布前应完成签名、公证和真机回归。

## 快速开始

1. 安装或打开对应系统版本。
2. 进入“设置”，选择 MiMo 服务类型，填写自己的 API Key。
3. 点击“验证连接”。
4. 返回“语音生成”，选择预置音色、音色设计或音色复刻，填写正文后生成。

完整步骤见 [安装与使用教程](docs/INSTALL_AND_USE.md) 和 [MiMo API Key 获取教程](docs/MIMO_API_KEY_GUIDE.md)。

## 文档

全部文档统一收录在 [文档中心](docs/README.md)：

- [安装与使用教程](docs/INSTALL_AND_USE.md)
- [MiMo API Key 获取与配置](docs/MIMO_API_KEY_GUIDE.md)
- [GitHub 上传、macOS 构建与 Release 发布](docs/GITHUB_PUBLISHING_GUIDE.md)
- [隐私说明](docs/PRIVACY_NOTICE.md)
- [安全政策](SECURITY.md)
- [macOS 当前状态与 Android 迁移评估](docs/CROSS_PLATFORM_ROADMAP.md)
- [版本记录](CHANGELOG.md)

## 本地开发

需要 Node.js 22 或更高版本和 npm：

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

`check:public` 会阻止常见 API Key、GitHub Token、私钥、个人路径、历史、音频和签名凭据进入公开源码；`check:packaged` 会核对已打包应用内部文件白名单并再次扫描敏感内容。

## 隐私与发布边界

- 源码包、Windows 安装包和 macOS 构建流程都不包含填写过的 API Key、生成历史或用户音频。
- 打包不会读取或删除当前电脑上的应用数据；本机已有 Key 和历史仍留在当前用户数据目录。
- 正文、风格描述和音色复刻样本会发送到用户配置的 API 服务。
- 声音复刻只能使用本人声音或已经取得明确授权的声音。
- 当前仓库没有附带对外开源许可证。公司决定公开开源前，需要由负责人或法务选择并加入正式 `LICENSE`。

## 官方资料

- [Xiaomi MiMo 首次 API 调用](https://mimo.mi.com/docs/zh-CN/quick-start/summary/first-api-call)
- [Xiaomi MiMo API Key 常见问题](https://mimo.mi.com/docs/zh-CN/quick-start/faq/api-integration)
- [Xiaomi MiMo 语音合成指南](https://mimo.mi.com/docs/zh-CN/usage-guide/speech-synthesis)
- [Electron 官方文档](https://www.electronjs.org/docs/latest)

## 版权

Copyright © MytimesXR。当前未授予对外复制、修改或再分发许可；在公司加入正式 `LICENSE` 前，请按内部项目管理。
