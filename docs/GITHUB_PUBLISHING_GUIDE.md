# GitHub 上传与 Windows Release 发布

本指南面向当前公开仓库。现阶段只对外发布 Windows x64 版本；macOS 保留为未来支持。

## 一、上传前检查

源码仓库应只包含项目白名单文件，例如：

```text
app/
build/
docs/
electron/
scripts/
.gitignore
CHANGELOG.md
package.json
package-lock.json
README.md
SECURITY.md
```

不要上传 `release/`、`backups/`、`node_modules/`、`Mytimes-TTS-Data/`、`storage-state.json`、旧版数据位置指针、初始化标记、本机设置、API Key、生成历史、用户音频、日志、个人路径或签名证书。

每次提交前运行：

```powershell
npm ci
npm audit --audit-level=high
npm run check:public
```

`.gitignore` 需要保留在仓库中，它负责阻止常见的本机数据和构建产物被误加入 Git。

## 二、在 GitHub 网页更新源码

少量文件可以直接通过网页更新：

1. 打开仓库首页。
2. 进入要替换的文件，点击右上角铅笔图标。
3. 粘贴新内容，填写提交说明并提交到 `main`。
4. 对新增文件使用 **Add file → Upload files**。
5. 上传完成后检查目录层级，特别是 `app/`、`electron/` 和 `docs/`。

更新包如果保留了完整目录结构，也可以解压后把文件拖到仓库上传页；GitHub 网页上传前仍要逐项确认目标路径。

## 三、发布 Windows 文件

1. 先在受信任的 Windows 构建机运行 `npm run dist`。
2. 运行 `npm run check:packaged` 检查应用包内容。
3. 计算并保存发布文件的 SHA-256。
4. 打开仓库右侧 **Releases**，新建 Release。
5. 创建与 `package.json` 版本一致的 Tag。
6. 上传 Portable x64 EXE、Windows x64 ZIP 和校验清单。
7. 发布前确认附件中没有 `settings.json`、`history.json`、用户音频、日志、Key 或证书。

README 不固定写应用版本号；具体版本和改动放在 Release 标题、Release 说明与 `CHANGELOG.md` 中，减少每次发版时重复修改首页。

## 四、公开仓库安全设置

- 开启 Secret Scanning、Dependabot、Security Advisories 和适当的分支保护。
- Issue 模板提醒用户不要上传 Key、正文、声音样本或含隐私的日志。
- 签名证书、Token 与密码只放受保护的 Actions Secrets。
- 发现 Key 误传时，应立即在 MiMo 控制台重置或删除；仅从当前文件删除并不能撤销泄露。
- 若未来采用开源许可，应在确认许可条款后加入 `LICENSE`。

## 五、发布说明建议

Release 说明至少写明：

- 支持的平台和架构。
- 本次主要改动。
- 下载文件之间的区别。
- 是否完成代码签名。
- 需要用户自己的 Xiaomi MiMo API Key。
- 声音复刻必须获得授权。
- 本项目不是 Xiaomi 或 MiMo 官方客户端。

[返回文档中心](README.md)
