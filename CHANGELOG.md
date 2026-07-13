# 更新记录

## 0.1.3 · 2026-07-13

- 完成 Electron macOS 适配：系统红黄绿窗口按钮、macOS 应用菜单、`⌘ + Enter` 快捷键和 Finder 文案。
- 增加可无损转换为 macOS ICNS 的 SVG 矢量应用图标。
- 增加 Intel `x64` 与 Apple Silicon `arm64` 的 DMG / ZIP 构建配置。
- 增加 GitHub Actions 原生 macOS 构建、依赖审计、源码隐私检查、app.asar 白名单检查和 SHA-256 产物。
- 增加打包后隐私审计，确认 EXE、ZIP、DMG 内不包含 API Key、历史记录、用户音频、日志或个人路径。
- 统一 README、安装使用、MiMo Key、隐私安全和 GitHub 上传文档入口。

## 0.1.2 · 2026-07-13

- 升级 Electron `33.4.11` 至 `43.1.0`，修复依赖审计报告中的 Electron 高危安全公告。
- 升级 electron-builder `25.1.8` 至 `26.15.3`，修复构建依赖中的 `tar` 高危安全公告。
- 加入锁定依赖版本的 `package-lock.json`，发布前可执行依赖审计和隐私检查。
- 保留 `0.1.1` 源码及 Windows EXE / ZIP 作为安全升级前回退版。

## 0.1.1 · 2026-07-13

- 全面审计生成、音色设计、音色复刻、历史和设置页面。
- 统一为 WinUI / Fluent 风格的中性表面、系统蓝强调色、Segoe UI Variable 字体和 4–8px 控件圆角。
- 替换 Chromium 默认纵向滚动条：收起时显示 2px 指示，鼠标移入时扩展为可拖动滑块。
- 重做主播放器与参考音频播放器的进度滑块、播放/暂停状态和键盘焦点。
- 用应用内参考音频播放器替换浏览器原生 audio 控件。
- 重做下拉框、文本框、复选框、按钮、状态消息、历史操作、密码小眼睛和窗口按钮状态。
- 统一 Fluent 线性图标，并补充导航、标签页和风格标签的辅助功能状态。
- 完成深色、浅色、空历史、动态历史、复刻样本和 12 项交互回归验证。
- 增加 GitHub 公开发布检查，阻止 Key、历史音频、日志、个人路径和签名证书误入源码包。
- 补充 MiMo API Key 教程、隐私说明、GitHub 发布指南及 macOS / Android 迁移评估。

## 回退

0.1.0 的源码、Portable EXE、ZIP、校验值和回退说明保存在：

`backups/v0.1.0-before-winui-audit-20260713`
