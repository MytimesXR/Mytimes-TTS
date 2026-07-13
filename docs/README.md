# Mytimes TTS 文档中心

当前文档对应 Mytimes TTS `0.1.3`。

## 我只是要使用软件

1. [安装与使用教程](INSTALL_AND_USE.md)：Windows/macOS 下载选择、首次打开、生成与保存。
2. [MiMo API Key 获取与配置](MIMO_API_KEY_GUIDE.md)：如何获取 Key、选择服务类型和排查连接失败。
3. [隐私说明](PRIVACY_NOTICE.md)：哪些数据保存在本机，哪些内容会发到 API 服务。

## 我要上传到公司 GitHub

1. [GitHub 上传与发布指南](GITHUB_PUBLISHING_GUIDE.md)：上传干净源码、运行 macOS 构建、下载构建结果和创建 Release。
2. [安全政策](../SECURITY.md)：禁止提交的敏感数据、Key 泄露后的处理方式。
3. [版本记录](../CHANGELOG.md)：每个版本的改动。

## 我要继续开发

- [项目首页与开发命令](../README.md)
- [macOS 当前状态与 Android 迁移评估](CROSS_PLATFORM_ROADMAP.md)
- [macOS 自动构建配置](../.github/workflows/build-macos.yml)

## 当前交付边界

- Windows `0.1.3`：本机生成 Portable EXE 与 ZIP。
- macOS `0.1.3`：代码和双架构构建流程已完成；上传 GitHub 后，由 macOS Actions 原生生成 arm64/x64 的 DMG 与 ZIP。
- 当前 Windows 和 macOS 内部测试包均未完成正式代码签名；对外公开分发前需要补签名并回归。
- Android 尚未实现，不能从 Electron 直接导出 APK；迁移方案见跨平台评估。
