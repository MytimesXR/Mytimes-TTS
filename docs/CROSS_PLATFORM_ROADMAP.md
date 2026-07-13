# macOS 当前状态与 Android 迁移评估

本文对应 Mytimes TTS `0.1.3`。

## 结论

- **Windows**：Portable EXE 与 ZIP 已是当前本机验证基线。
- **macOS**：继续使用 Electron，无需重写产品。平台适配、图标、x64/arm64 打包配置和 GitHub macOS 构建流程已经完成；上传仓库后可生成双架构 DMG/ZIP。
- **Android**：不能从 Electron 直接导出 APK。推荐保留 HTML/CSS/JavaScript 页面与业务接口设计，使用 Capacitor 建立 Android 原生容器，重写安全存储、文件、网络和生命周期桥接。

## 一、macOS 0.1.3 已完成内容

- macOS 使用系统红黄绿窗口按钮，Windows 继续使用当前自绘标题栏。
- 增加标准 macOS 应用菜单、设置快捷键和平台感知文案。
- 生成快捷键同时支持 Ctrl 与 Command。
- “在文件夹中显示”在 Mac 上显示为“在 Finder 中显示”。
- API Key 继续使用 Electron `safeStorage`，macOS 对应 Keychain。
- 增加跨平台 SVG 应用图标。
- electron-builder 配置同时输出 Apple Silicon `arm64` 与 Intel `x64` 的 DMG/ZIP。
- GitHub Actions 在 `macos-15` 主机原生安装依赖、检查公开源码、构建并审计应用包。
- 已打包文件采用严格白名单，避免设置、历史、音频和 Key 进入应用。

## 二、macOS 仍需完成的发布验证

当前 Windows 环境不能原生验证 macOS 应用，所以下列工作必须在 GitHub macOS Actions 和真实 Mac 上完成：

1. 上传干净源码并运行 **Build macOS**。
2. 确认 arm64/x64 两套 DMG、ZIP 和 SHA-256 清单均生成。
3. 至少在一台 Apple Silicon Mac 上验证启动、设置、Key 保存、生成、波形播放、拖动定位、保存和 Finder 定位。
4. 若公司仍需支持 Intel Mac，应在 Intel 真机或可靠的 Intel 测试环境做相同回归。
5. 对外发布前配置 Apple Developer ID 签名、公证与 stapling。
6. 签名凭据只放 GitHub Actions Secrets，并验证最终签名链。

electron-builder 明确说明：不要期望在一个操作系统上可靠构建全部平台，macOS 签名也只能在 macOS 上进行。因此本项目用 macOS CI 生成 Mac 包，而不是在 Windows 上“转出”DMG。

## 三、macOS 支持范围

当前构建配置的最低系统版本为 macOS 12。正式发布前必须在目标系统上实测；以后升级 Electron 大版本时，要重新核对 Electron 的最低 macOS 要求，不应只看本项目配置。

当前内部测试包未签名。它适合公司内部验证，不等同于可直接面向公众发布的正式 Mac 软件。

## 四、为什么 Android 不能直接转换

Electron 面向 Windows、macOS 和 Linux 桌面环境。Android 的 WebView、权限、文件系统、安全存储、音频焦点、应用生命周期、签名和商店格式不同，electron-builder 没有 APK/AAB 目标。

Capacitor 可以保留 Web 页面，同时通过 Android 原生插件调用 Kotlin/Java 能力，适合作为当前项目的移动端容器。

## 五、Android 可复用与需重写范围

| 模块 | 预计复用 | 说明 |
|---|---:|---|
| 品牌、文案、颜色和基础组件 | 80%–90% | 视觉资产可沿用，布局需移动化 |
| HTML/CSS 页面 | 55%–70% | 改为单列、底部导航、安全区和触控尺寸 |
| 波形与 Web Audio 逻辑 | 65%–80% | 需处理音频焦点、耳机、蓝牙和后台切换 |
| MiMo 请求参数与校验 | 80%–90% | 抽到共享模块后复用 |
| Electron main/preload | 0%–15% | Electron API 不能在 Android 运行，只复用接口设计 |
| Key、历史和文件 | 30%–50% | 改用 Android Keystore、私有目录和系统文件选择器 |
| 整体 | 45%–60% | 不是从零重写，也不是一键转换 |

## 六、推荐的代码结构

```text
shared/                        TTS 请求、参数校验、错误翻译
app/                           响应式页面、波形与业务交互
platforms/electron/            Windows/macOS 的 window.mytApp
platforms/capacitor-android/   Android 的 window.mytApp
```

优先保持这些业务接口一致：

- `settings.get / save / test`
- `tts.generate / cancel / optimizeStyle`
- `audio.save / reveal`
- `history.list / getAudio / delete / clear`

Android 不需要桌面窗口最小化、最大化和关闭接口。

## 七、Android MVP 必做事项

1. 把左侧桌面导航改为底部导航或移动端抽屉，所有页面改为单列响应式。
2. 使用原生 HTTP 能力发送 MiMo 请求，重点测试 Base64 音频的内存峰值。
3. 使用 Android Keystore 封装的安全存储保存用户 Key，禁止使用普通 `localStorage`。
4. 使用系统文件选择器读取 WAV/MP3，并正确处理 URI、MIME 和临时访问权限。
5. 历史元数据保存在本地数据库或轻量持久化中，WAV 放应用私有目录。
6. 保存音频使用系统分享面板或 Storage Access Framework，避免申请全盘存储权限。
7. 处理来电、耳机拔出、蓝牙切换、音频焦点、锁屏和后台切换。
8. 支持系统返回手势、进程恢复、旋转、字体放大和低内存场景。
9. 只有未来增加“现场录音”时才申请麦克风权限。
10. 生成公司保管的 release keystore，正式发布输出 AAB 并满足 Google Play 当期要求。

## 八、Android Key 方案

| 方案 | 适用场景 | 结论 |
|---|---|---|
| 用户自带 Key（BYOK） | 内部使用、技术用户、当前产品模式 | MVP 推荐，Key 进入 Android Keystore |
| 公司后端代理 | 面向普通用户、统一结算与风控 | 更适合正式消费产品，但增加服务端开发和运维 |
| APK 内置公司 Key | 任何场景 | 禁止，Key 可以被提取和滥用 |

## 九、工作量评估

- Android 可交互原型：约 2–3 个工作日。
- 对齐当前桌面版主要功能：约 5–8 个工作日。
- 达到 Google Play 可发布状态：再增加约 2–4 个工作日，不含商店审核等待。

评估前提是继续复用 Web UI 与 MiMo 业务逻辑。如果改成 Flutter、React Native 或全原生 Kotlin，首期成本会明显增加。

## 十、推荐顺序

1. 先把 `0.1.3` 上传公司 Private GitHub。
2. 用现成 macOS Action 生成双架构包并完成 Mac 真机回归。
3. 配置 Apple 签名与公证，形成正式 macOS 发布流程。
4. 再把 TTS 请求与校验抽到 `shared/`。
5. 建立 Capacitor Android 工程，先完成内部 BYOK APK。
6. 真机验证稳定后，再决定是否增加公司后端代理和 Google Play 上架。

## 官方参考

- [Electron 官方文档](https://www.electronjs.org/docs/latest)
- [Electron safeStorage](https://www.electronjs.org/docs/latest/api/safe-storage)
- [electron-builder 跨平台构建说明](https://www.electron.build/docs/features/multi-platform-build/)
- [electron-builder macOS 构建](https://www.electron.build/mac/)
- [electron-builder GitHub Actions](https://www.electron.build/docs/features/github-actions/)
- [Capacitor Android](https://capacitorjs.com/docs/android)
- [Capacitor 环境要求](https://capacitorjs.com/docs/getting-started/environment-setup)

[返回文档中心](README.md)
