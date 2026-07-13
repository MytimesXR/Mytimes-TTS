# macOS 与 Android 跨平台路线

## 当前结论

- **Windows**：当前公开支持平台，提供 Portable EXE 与 ZIP。
- **macOS**：Electron 代码具备初步适配和双架构预览构建配置，但尚未完成真机回归、签名与公证，因此不属于当前公开下载范围。
- **Android**：Electron 不能直接导出 APK。建议复用 Web 页面和业务接口设计，通过 Capacitor 建立 Android 原生容器。

## macOS 已具备的开发基础

- 使用系统红黄绿窗口按钮、应用菜单和平台感知文案。
- 生成快捷键兼容 Ctrl 与 Command。
- “在文件夹中显示”可适配为“在 Finder 中显示”。
- Electron `safeStorage` 可在 macOS 对接 Keychain。
- electron-builder 已配置 Apple Silicon `arm64` 与 Intel `x64` 的 DMG/ZIP 预览构建。
- GitHub Actions 可在 `macos-15` 主机上手动构建和审计预览文件。
- 打包白名单不会收录设置、历史、用户音频或 API Key。

这些内容只代表开发基础，不代表 Mac 版已经通过发布验收。

## macOS 正式支持前必须完成

1. 在 GitHub Actions 手动运行 **Build macOS Preview**，确认双架构预览文件与 SHA-256 清单生成。
2. 至少在一台 Apple Silicon Mac 上验证启动、设置、Key 保存、生成、波形播放、拖动定位、保存和 Finder 定位。
3. 如继续支持 Intel Mac，在 Intel 真机或可靠测试环境完成相同回归。
4. 使用 Apple Developer ID 完成签名、公证与 stapling。
5. 将证书和密码仅放入受保护的 GitHub Actions Secrets。
6. 完成隐私、安装、故障排查和下载文档后，再把 macOS 加入公开 Release。

当前手动预览工作流明确禁止 electron-builder 自动发布。Actions 生成的 Artifact 仅供开发验证，不应当作正式 Mac 下载版本。

## 为什么 Android 不能直接转换

Electron 面向 Windows、macOS 和 Linux 桌面环境。Android 的 WebView、权限、文件系统、安全存储、音频焦点、应用生命周期、签名和商店格式不同，electron-builder 没有 APK/AAB 输出目标。

Capacitor 能保留大部分 HTML/CSS/JavaScript 页面，并通过 Android 原生插件调用 Kotlin/Java 能力，适合作为本项目的移动端容器。

## Android 可复用范围评估

| 模块 | 预计复用 | 说明 |
|---|---:|---|
| 品牌、文案、颜色和基础组件 | 80%–90% | 视觉资产可沿用，布局需移动化 |
| HTML/CSS 页面 | 55%–70% | 改为单列、底部导航、安全区和触控尺寸 |
| 波形与 Web Audio 逻辑 | 65%–80% | 需处理音频焦点、耳机、蓝牙和后台切换 |
| MiMo 请求参数与校验 | 80%–90% | 抽到共享模块后复用 |
| Electron main/preload | 0%–15% | Electron API 不能在 Android 运行，只复用接口设计 |
| Key、历史和文件 | 30%–50% | 改用 Android Keystore、私有目录和系统文件选择器 |
| 整体 | 45%–60% | 不是从零重写，也不是一键转换 |

## 推荐代码结构

```text
shared/                        TTS 请求、参数校验、错误翻译
app/                           响应式页面、波形与业务交互
platforms/electron/            Windows/macOS 桌面桥接
platforms/capacitor-android/   Android 原生桥接
```

优先保持这些业务接口一致：

- `settings.get / save / test`
- `tts.generate / cancel / optimizeStyle`
- `audio.save / reveal`
- `history.list / getAudio / delete / clear`

## Android MVP 必做事项

1. 把左侧桌面导航改为底部导航或移动端抽屉，页面改为单列响应式。
2. 使用原生 HTTP 能力发送 MiMo 请求，重点测试 Base64 音频的内存峰值。
3. 使用 Android Keystore 封装的安全存储保存用户 Key，禁止使用普通 `localStorage`。
4. 使用系统文件选择器读取 WAV/MP3，并正确处理 URI、MIME 和临时访问权限。
5. 历史元数据保存到本地数据库，WAV 放入应用私有目录。
6. 保存音频使用系统分享面板或 Storage Access Framework。
7. 处理来电、耳机拔出、蓝牙切换、音频焦点、锁屏和后台切换。
8. 支持系统返回手势、进程恢复、旋转、字体放大和低内存场景。
9. 只有增加现场录音功能时才申请麦克风权限。
10. 使用正式 release keystore 输出 AAB，并满足 Google Play 当期要求。

## 建议顺序

1. 先稳定 Windows 公开版本和更新流程。
2. 在真实 Mac 上完成预览回归。
3. 配置 Apple 签名与公证，再公开 macOS 下载。
4. 把 TTS 请求与校验抽到 `shared/`。
5. 建立 Capacitor Android 工程，先完成 BYOK 内测 APK。
6. 真机验证稳定后，再决定是否增加后端代理和 Google Play 上架。

## 官方参考

- [Electron 官方文档](https://www.electronjs.org/docs/latest)
- [Electron safeStorage](https://www.electronjs.org/docs/latest/api/safe-storage)
- [electron-builder 跨平台构建说明](https://www.electron.build/docs/features/multi-platform-build/)
- [electron-builder macOS 构建](https://www.electron.build/mac/)
- [Capacitor Android](https://capacitorjs.com/docs/android)

[返回文档中心](README.md)
