# GitHub 上传、macOS 构建与 Release 发布

本文对应 Mytimes TTS `0.1.3`。推荐先发布到公司 **Private** 仓库，内部验证后再决定是否公开。

## 一、本次要使用的文件

本地 `release` 目录应包含：

- `Mytimes-TTS-GitHub-Source-0.1.3.zip`：只含白名单源码，用它创建仓库。
- `Mytimes-TTS-Portable-0.1.3-x64.exe`：Windows Portable 版。
- `Mytimes-TTS-0.1.3-x64.zip`：Windows 解压版。
- `GITHUB-RELEASE-ASSETS-0.1.3.txt`：Windows 和源码包的 SHA-256 清单。

macOS 文件不会在 Windows 电脑上伪造。源码上传后，由 `.github/workflows/build-macos.yml` 在 GitHub 的 macOS 主机上生成：

- `Mytimes-TTS-0.1.3-macOS-arm64.dmg`
- `Mytimes-TTS-0.1.3-macOS-arm64.zip`
- `Mytimes-TTS-0.1.3-macOS-x64.dmg`
- `Mytimes-TTS-0.1.3-macOS-x64.zip`
- `SHA256SUMS-macOS.txt`

## 二、为什么只上传干净源码包

源码包按白名单生成，只收录：

```text
.github/
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

它不会收录 `release`、`backups`、`node_modules`、本机设置、API Key、生成历史、用户音频、日志、个人路径或签名证书。制作源码包不会删除当前电脑上已经填写的 Key 或历史。

不要把整个 Y 盘项目文件夹直接发布；其中还保留构建产物和回退备份。

## 三、用 GitHub Desktop 上传源码

1. 把 `Mytimes-TTS-GitHub-Source-0.1.3.zip` 解压到一个新的空文件夹。
2. 打开 GitHub Desktop，选择 **File → Add local repository**。
3. 选择解压后的 `myt-tts-WinUI-0.1.3` 文件夹。
4. 如果提示它还不是 Git 仓库，点击 **create a repository**。
5. Repository name 填 `myt-tts-WinUI`。
6. 不要额外选择许可证；当前是否对外开源仍需公司确认。
7. 首次提交说明可填：`Initial private release for Mytimes TTS 0.1.3`。
8. 点击 **Publish repository**。
9. 选择公司 Organization，并勾选 **Keep this code private**。

上传后在 GitHub 网页确认这些文件存在：

- `.github/workflows/build-macos.yml`
- `package.json`
- `scripts/audit-public-package.js`
- `scripts/audit-packaged-app.js`

如果 `.github` 没有上传，macOS 构建按钮就不会出现。

## 四、在 GitHub 生成 macOS 双架构版本

1. 打开仓库网页。
2. 点击顶部 **Actions**。
3. 左侧选择 **Build macOS**。
4. 点击右侧 **Run workflow**。
5. Branch 选择 `main`，再次点击绿色 **Run workflow**。
6. 等待任务变为绿色完成。
7. 打开这次运行，在页面底部 **Artifacts** 下载 `Mytimes-TTS-macOS-main`。
8. 解压下载的 Artifact ZIP，得到两套 DMG、两套 ZIP 和 `SHA256SUMS-macOS.txt`。

如果任务失败，先打开红色步骤查看错误。不要把 Apple 证书、密码或 API Key 写进源码来“修复”构建。

当前流程设置 `CSC_IDENTITY_AUTO_DISCOVERY=false`，生成的是未签名内部测试包。正式对外发布必须在公司 Apple Developer 账号下配置 Developer ID 签名、公证和 stapling；证书与密码只能放在 GitHub Actions Secrets。

## 五、创建 GitHub Release

1. 打开仓库首页右侧 **Releases**。
2. 点击 **Draft a new release**。
3. 创建 Tag：`v0.1.3`。
4. Release title：`Mytimes TTS 0.1.3`。
5. 公司内部测试时勾选 **Set as a pre-release**。
6. 上传以下附件：

   - `Mytimes-TTS-Portable-0.1.3-x64.exe`
   - `Mytimes-TTS-0.1.3-x64.zip`
   - `Mytimes-TTS-0.1.3-macOS-arm64.dmg`
   - `Mytimes-TTS-0.1.3-macOS-arm64.zip`
   - `Mytimes-TTS-0.1.3-macOS-x64.dmg`
   - `Mytimes-TTS-0.1.3-macOS-x64.zip`
   - `GITHUB-RELEASE-ASSETS-0.1.3.txt`
   - `SHA256SUMS-macOS.txt`

7. 发布前再次确认附件中没有 `settings.json`、`history.json`、用户音频、日志、Key 或证书。
8. 点击 **Publish release**。

创建 `v0.1.3` Tag 也可能触发一次 Build macOS，这是正常的；手动构建已经成功时无需重复上传同名文件。

## 六、可直接使用的 Release 说明

```markdown
## Mytimes TTS 0.1.3

MytimesXR 内部测试版，支持 Windows 与 macOS，接入 Xiaomi MiMo-V2.5-TTS。

### 下载

- Windows：Portable EXE 或 x64 ZIP
- Apple 芯片 Mac：macOS arm64 DMG
- Intel Mac：macOS x64 DMG

### 主要功能

- MiMo 官方预置音色、自然语言演绎风格
- AI 润色风格描述，不修改待朗读正文
- 描述式音色设计与 WAV/MP3 音色复刻
- 音频波形、点击/拖动定位、播放与保存
- 本地历史和操作系统安全存储保护的 API Key

### 使用前准备

需要用户自己的 Xiaomi MiMo API Key。获取和配置方法见 docs/MIMO_API_KEY_GUIDE.md。

### 注意

- 当前 Windows 与 macOS 构建均未完成正式代码签名，仅供公司内部测试。
- 声音复刻只能使用本人声音或已经取得明确授权的声音。
- 本项目不是 Xiaomi 或 MiMo 官方客户端。
```

## 七、公开仓库前额外检查

- 公司负责人确认名称、图标、代码和文档可以公开。
- 选择并加入正式 `LICENSE`。
- 审核 Xiaomi/MiMo 名称和标识的使用方式。
- Windows 完成代码签名；macOS 完成 Developer ID 签名和 Apple 公证。
- 开启 Secret Scanning、Dependabot、Security Advisories 和分支保护。
- Issue 模板提醒用户不要上传 Key、正文、声音样本或包含隐私的日志。
- 每次提交前运行 `npm run check:public`，打包后运行 `npm run check:packaged`。

## 八、Key 已经误传怎么办

从当前文件中删除 Key 并不等于撤销泄露：

1. 立即在 MiMo 控制台重置或删除 Key。
2. 检查调用记录与额度。
3. 按公司安全流程清理 Git 历史。
4. 通知所有克隆仓库的成员重新同步。
5. 再次运行公开发布检查。

[返回文档中心](README.md)
