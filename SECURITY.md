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

源码和安装包不提供默认 Key。用户在设置页输入后，应用通过 Electron `safeStorage` 使用 Windows DPAPI 或 macOS Keychain 对应的系统能力加密，再保存到当前账户的 Electron 用户数据目录。

本机加密不能代替最小权限、额度限制和 Key 轮换。公司如果统一提供服务，应该让客户端访问受控后端代理，不能把公司 Key 写进应用。

## Key 泄露处理

1. 立即在 Xiaomi MiMo 控制台重置或删除对应 Key。
2. 检查调用记录和额度消耗。
3. Key 曾进入 Git 历史时，按公司流程清理历史并通知所有克隆仓库的成员。
4. 重新运行发布检查，确认新 Key 没有写回源码。

## 构建与签名凭据

- 当前 `0.1.3` Windows 和 macOS 内部测试构建未正式签名。
- Windows 对外分发前应完成代码签名并验证签名链。
- macOS 对外分发前应完成 Developer ID 签名、Apple 公证和 stapling。
- 未来签名证书、Apple 账号凭据与密码只能保存为受保护的 GitHub Actions Secrets，不能提交到仓库或放进源码 ZIP。
- macOS 无签名构建流程明确关闭自动证书发现，不会从构建机意外带入个人证书。

## 报告安全问题

优先使用公司 GitHub 仓库的 Security Advisory；未开启时使用 MytimesXR 内部安全渠道私下报告。不要通过公开 Issue 发布可利用细节、真实 Key、用户数据或声音样本。

## 正式发布要求

- Electron 和依赖保持在官方维护范围内，依赖审计无高危问题。
- 完成预置音色、音色设计、音色复刻、历史、波形、设置与文件操作回归。
- 对外提供隐私说明、声音授权规则和第三方服务声明。
- 公司决定公开开源时加入经过确认的 `LICENSE`。
