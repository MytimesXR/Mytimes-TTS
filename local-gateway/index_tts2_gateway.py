import argparse
import base64
import os
import sys
import tempfile
import threading
from pathlib import Path
from typing import List, Optional

from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel, Field


class AudioInput(BaseModel):
    name: str = "reference.wav"
    mime_type: str = "audio/wav"
    data_base64: str


class EmotionInput(BaseModel):
    mode: str = "text"
    text: str = ""
    alpha: float = Field(default=0.6, ge=0.0, le=1.0)
    vector: Optional[List[float]] = None
    use_random: bool = False


class TtsRequest(BaseModel):
    text: str
    speaker_audio: AudioInput
    emotion: EmotionInput = Field(default_factory=EmotionInput)


def parse_args():
    parser = argparse.ArgumentParser(description="Mytimes TTS IndexTTS2 local gateway")
    parser.add_argument("--index-root", default=os.getenv("INDEXTTS2_ROOT", "."))
    parser.add_argument("--model-dir", default=os.getenv("INDEXTTS2_MODEL_DIR", "checkpoints"))
    parser.add_argument("--config", default=os.getenv("INDEXTTS2_CONFIG", "checkpoints/config.yaml"))
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=9872)
    parser.add_argument("--fp16", action="store_true")
    parser.add_argument("--cuda-kernel", action="store_true")
    parser.add_argument("--deepspeed", action="store_true")
    return parser.parse_args()


ARGS = parse_args()
INDEX_ROOT = Path(ARGS.index_root).resolve()
sys.path.insert(0, str(INDEX_ROOT))

app = FastAPI(title="Mytimes IndexTTS2 Gateway", version="1")
model = None
model_lock = threading.RLock()


def check_key(authorization: Optional[str]):
    expected = os.getenv("MYT_INDEX_TTS2_API_KEY", "").strip()
    if expected and authorization != "Bearer " + expected:
        raise HTTPException(status_code=401, detail="Invalid gateway key")


def get_model():
    global model
    if model is None:
        with model_lock:
            if model is None:
                try:
                    from indextts.infer_v2 import IndexTTS2
                    model_dir = (INDEX_ROOT / ARGS.model_dir).resolve()
                    config = (INDEX_ROOT / ARGS.config).resolve()
                    model = IndexTTS2(
                        cfg_path=str(config),
                        model_dir=str(model_dir),
                        use_fp16=ARGS.fp16,
                        use_cuda_kernel=ARGS.cuda_kernel,
                        use_deepspeed=ARGS.deepspeed,
                    )
                except Exception as exc:
                    raise HTTPException(status_code=503, detail="IndexTTS2 load failed: " + str(exc)) from exc
    return model


@app.get("/health")
def health(authorization: Optional[str] = Header(default=None)):
    check_key(authorization)
    model_dir = (INDEX_ROOT / ARGS.model_dir).resolve()
    config = (INDEX_ROOT / ARGS.config).resolve()
    inference_file = INDEX_ROOT / "indextts" / "infer_v2.py"
    if not model_dir.exists() or not config.exists() or not inference_file.exists():
        raise HTTPException(
            status_code=503,
            detail="IndexTTS2 root, checkpoints or config path is incomplete",
        )
    return {
        "ok": True,
        "model_loaded": model is not None,
        "index_root": str(INDEX_ROOT),
    }


@app.post("/v1/tts")
def synthesize(payload: TtsRequest, authorization: Optional[str] = Header(default=None)):
    check_key(authorization)
    text = payload.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="Text is empty")
    if len(payload.speaker_audio.data_base64) > 14 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Speaker audio is too large")
    try:
        speaker_bytes = base64.b64decode(payload.speaker_audio.data_base64, validate=True)
    except Exception as exc:
        raise HTTPException(status_code=400, detail="Invalid speaker audio Base64") from exc
    suffix = ".mp3" if payload.speaker_audio.mime_type == "audio/mpeg" else ".wav"
    with tempfile.TemporaryDirectory(prefix="mytimes-index-tts2-") as temp_dir:
        speaker_path = Path(temp_dir) / ("speaker" + suffix)
        output_path = Path(temp_dir) / "output.wav"
        speaker_path.write_bytes(speaker_bytes)
        kwargs = {
            "spk_audio_prompt": str(speaker_path),
            "text": text,
            "output_path": str(output_path),
            "emo_alpha": payload.emotion.alpha,
            "use_random": payload.emotion.use_random,
            "verbose": False,
        }
        if payload.emotion.mode == "vector":
            vector = payload.emotion.vector or []
            if len(vector) != 8:
                raise HTTPException(status_code=400, detail="Emotion vector must contain 8 numbers")
            kwargs["emo_vector"] = vector
        elif payload.emotion.mode == "reference":
            raise HTTPException(status_code=400, detail="Emotion reference audio is not enabled in this gateway version")
        else:
            kwargs["use_emo_text"] = True
            kwargs["emo_text"] = payload.emotion.text.strip() or text
        try:
            with model_lock:
                get_model().infer(**kwargs)
        except HTTPException:
            raise
        except Exception as exc:
            raise HTTPException(status_code=500, detail="IndexTTS2 inference failed: " + str(exc)) from exc
        if not output_path.exists():
            raise HTTPException(status_code=500, detail="IndexTTS2 did not create output.wav")
        return {
            "audio_base64": base64.b64encode(output_path.read_bytes()).decode("ascii"),
            "format": "wav",
            "mime_type": "audio/wav",
            "model": "index-tts2",
            "warnings": [],
        }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=ARGS.host, port=ARGS.port)
