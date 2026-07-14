# 安全政策

## 禁止提交的内容

以下内容不得进入 Git、Issue、Pull Request、Wiki、Actions 日志或 Release 说明：

- 真实 MiMo API Key、Token Plan Key、GitHub Token。
- `.env`、`settings.json`、`history.json`。
- 用户正文、生成历史、参考人声音频和生成的 WAV/MP3。
- Windows、Apple 或 Android 签名证书、私钥和密码。
- 含个人用户名、公司内网地址或本机目录的日志与截图。

提交前运行：

```powershell
npm run check:public
```

构建后运行：

```powershell
npm run check:packaged
```

## API Key 的处理

源码和安装包不提供默认 Key。用户在设置页输入后，应用通过 Electron `safeStorage` 使用 Windows DPAPI 加密，并保存在当前数据目录的 `secrets/` 子目录。密钥文件名按电脑和 Windows 用户隔离，因此多台电脑共用 NAS 数据目录时不会相互覆盖 Key。

本机加密不能代替最小权限、额度限制和 Key 轮换。如需统一提供服务，应让客户端访问受控后端代理，不能把共享 Key 写进应用。

初始化引导优先检测 `Y:\【软件插件】\Mytimes-TTS-Data`，不可用时允许选择其他本机或 NAS 目录。EXE 目录不保存运行数据；Windows 用户目录中的 `storage-state.json` 只记录数据路径和引导状态。发布源码时必须确保 `Mytimes-TTS-Data/`、任何位置索引、初始化标记、`settings.json`、`history.json`、`secrets/` 和生成音频未进入仓库。

## Key 泄露处理

1. 立即在 Xiaomi MiMo 控制台重置或删除对应 Key。
2. 检查调用记录和额度消耗。
3. Key 曾进入 Git 历史时，清理历史并通知所有已克隆仓库的成员。
4. 重新运行发布检查，确认新 Key 没有写回源码。

## 构建与签名凭据

- 当前公开下载范围仅为 Windows。
- 未签名 Windows 构建可能触发 SmartScreen；正式分发前应完成代码签名并验证签名链。
- macOS 仍属于未来支持范围；对外发布前必须完成真机验证、Developer ID 签名、Apple 公证与 stapling。
- 签名证书、账号凭据和密码只能保存为受保护的 GitHub Actions Secrets，不能提交到仓库或源码 ZIP。

## 报告安全问题

优先使用本仓库的 GitHub Security Advisory 私下报告。若该功能尚未开放，请联系仓库所有者，并且不要在公开 Issue 中发布可利用细节、真实 Key、用户数据或声音样本。

## 正式发布要求

- Electron 和依赖保持在官方维护范围内，依赖审计无高危问题。
- 完成预置音色、音色设计、音色复刻、历史、波形、设置与文件操作回归。
- 对外提供隐私说明、声音授权规则和第三方服务声明。
- 若未来决定采用开源许可，应加入经过确认的 `LICENSE`。
