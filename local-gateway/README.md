# IndexTTS2 本地网关

这个目录只包含 Mytimes TTS 与官方 IndexTTS2 之间的轻量 HTTP 网关，不包含模型、权重、CUDA 或 Python 环境。

## 使用方式

1. 按官方仓库说明安装 IndexTTS2，并确认官方 WebUI 可以正常生成语音。
2. 在 IndexTTS2 项目环境中安装 FastAPI 与 Uvicorn。
3. 从 IndexTTS2 根目录启动网关，把下方路径替换为本项目中的实际文件位置：

    uv run --with fastapi --with uvicorn python X:/Mytimes-TTS/local-gateway/index_tts2_gateway.py --index-root . --model-dir checkpoints --config checkpoints/config.yaml --host 127.0.0.1 --port 9872 --fp16

4. 在 Mytimes TTS 设置中选择 IndexTTS2，保留默认地址 http://127.0.0.1:9872，点击“保存并测试连接”。

网关默认只监听本机。需要监听局域网时可改为 --host 0.0.0.0，并设置环境变量 MYT_INDEX_TTS2_API_KEY；App 中填写相同 Key。请同时使用 Windows 防火墙限制来源。

官方项目与模型许可、商用条件以 IndexTTS2 官方仓库为准。
