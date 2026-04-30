import io
import logging
import os
from threading import Lock
from typing import Any

from django.http import JsonResponse
from django.shortcuts import render
from django.views.decorators.csrf import csrf_exempt

logger = logging.getLogger(__name__)

_classifier = None
_classifier_lock = Lock()

# Public, lightweight emotion-recognition model.
# You can override it with `TEST_VOICE_MODEL_ID`.
DEFAULT_MODEL_ID = "superb/wav2vec2-base-superb-er"

TARGET_SAMPLE_RATE = 16000

def index(request):
    return render(request, 'index.html')


def _load_audio(file_bytes: bytes) -> tuple[Any, int]:
    """Decode uploaded audio into mono float32 waveform + sample rate.

    Tries `soundfile` first (if installed), then falls back to builtin WAV decoding.
    """
    import numpy as np

    try:
        import soundfile as sf

        data, sample_rate = sf.read(io.BytesIO(file_bytes), dtype="float32", always_2d=False)
        if isinstance(data, np.ndarray) and data.ndim == 2:
            data = data.mean(axis=1)
        audio = np.asarray(data, dtype=np.float32)
        sample_rate = int(sample_rate)
        audio, sample_rate = _ensure_target_sample_rate(audio, sample_rate, target_sample_rate=TARGET_SAMPLE_RATE)
        return audio, sample_rate
    except Exception:
        pass

    import wave

    with wave.open(io.BytesIO(file_bytes), "rb") as wf:
        num_channels = wf.getnchannels()
        sample_width = wf.getsampwidth()
        sample_rate = wf.getframerate()
        num_frames = wf.getnframes()
        raw = wf.readframes(num_frames)

    if sample_width == 1:
        audio = np.frombuffer(raw, dtype=np.uint8).astype(np.float32)
        audio = (audio - 128.0) / 128.0
    elif sample_width == 2:
        audio = np.frombuffer(raw, dtype=np.int16).astype(np.float32) / 32768.0
    elif sample_width == 3:
        # 24-bit PCM little-endian
        bytes_array = np.frombuffer(raw, dtype=np.uint8)
        if len(bytes_array) % 3 != 0:
            raise ValueError("Invalid 24-bit PCM data")
        frames = bytes_array.reshape(-1, 3)
        audio = (
            frames[:, 0].astype(np.int32)
            | (frames[:, 1].astype(np.int32) << 8)
            | (frames[:, 2].astype(np.int32) << 16)
        )
        sign_bit = 1 << 23
        audio = (audio ^ sign_bit) - sign_bit
        audio = audio.astype(np.float32) / 8388608.0
    elif sample_width == 4:
        audio = np.frombuffer(raw, dtype=np.int32).astype(np.float32) / 2147483648.0
    else:
        raise ValueError(f"Unsupported WAV sample width: {sample_width}")

    if num_channels > 1:
        audio = audio.reshape(-1, num_channels).mean(axis=1)

    audio, sample_rate = _ensure_target_sample_rate(audio, int(sample_rate), target_sample_rate=TARGET_SAMPLE_RATE)
    return audio, sample_rate


def _ensure_target_sample_rate(audio, sample_rate: int, target_sample_rate: int = 16000):
    import numpy as np

    if sample_rate == target_sample_rate:
        return audio, sample_rate
    if sample_rate <= 0 or target_sample_rate <= 0:
        raise ValueError("Invalid sample rate")
    if audio is None:
        raise ValueError("Invalid audio")

    audio = np.asarray(audio, dtype=np.float32)
    if audio.size < 2:
        return audio, target_sample_rate

    target_length = int(round(audio.shape[0] * (target_sample_rate / sample_rate)))
    target_length = max(target_length, 1)

    orig_x = np.arange(audio.shape[0], dtype=np.float32)
    target_x = np.linspace(0, audio.shape[0] - 1, num=target_length, dtype=np.float32)
    resampled = np.interp(target_x, orig_x, audio).astype(np.float32)
    return resampled, target_sample_rate


def _mood_from_emotion_label(label: str) -> str:
    if not label:
        return "normal"

    normalized = str(label).strip().lower().replace("_", " ").replace("-", " ")

    # Exact matches first (common across emotion models)
    if normalized in {"happy", "happiness", "joy", "positive", "pos", "hap"}:
        return "good"
    if normalized in {"neutral", "calm", "normal", "neu"}:
        return "normal"
    if normalized in {"angry", "anger", "ang", "sad", "sadness", "negative", "neg"}:
        return "bad"

    # Substring fallback (handles labels like "fearful", "disgusted", etc.)
    if any(k in normalized for k in ("happy", "joy", "pos", "positive", "surpris", "excite")):
        return "good"
    if any(k in normalized for k in ("neutral", "neu", "calm", "normal")):
        return "normal"
    if any(k in normalized for k in ("ang", "anger", "sad", "fear", "disgust", "neg", "frustr", "stress", "anx")):
        return "bad"

    # Some models may return labels like "LABEL_0"; default to normal.
    return "normal"


def _get_classifier():
    global _classifier

    if _classifier is not None:
        return _classifier

    with _classifier_lock:
        if _classifier is not None:
            return _classifier

        model_id = os.getenv("TEST_VOICE_MODEL_ID", DEFAULT_MODEL_ID)
        token = os.getenv("HF_TOKEN") or os.getenv("HUGGINGFACE_HUB_TOKEN")

        try:
            from transformers import pipeline

            # Newer `transformers` uses `token=`, older versions used `use_auth_token=`.
            if token:
                try:
                    _classifier = pipeline("audio-classification", model=model_id, token=token)
                except TypeError:
                    _classifier = pipeline("audio-classification", model=model_id, use_auth_token=token)
            else:
                _classifier = pipeline("audio-classification", model=model_id)

            logger.info("test_voice classifier loaded: %s", model_id)
            return _classifier
        except Exception:
            logger.exception("Failed to load test_voice classifier (model=%s)", model_id)
            _classifier = None
            return None

@csrf_exempt
def analyze_emotion(request):
    if request.method != 'POST' or not request.FILES.get('file'):
        return JsonResponse({"error": "Invalid request"}, status=400)

    audio_file = request.FILES['file']
    try:
        audio_data, sample_rate = _load_audio(audio_file.read())
    except Exception:
        logger.exception("Failed to decode uploaded audio")
        return JsonResponse(
            {
                "error": "Unsupported/invalid audio. Please upload a valid WAV file.",
            },
            status=400,
        )

    classifier = _get_classifier()
    if classifier is None:
        return JsonResponse(
            {
                "error": "Emotion model is not available on this server.",
                "hint": "Install torch/transformers and set TEST_VOICE_MODEL_ID (public model) or HF_TOKEN (gated/private model).",
            },
            status=503,
        )

    try:
        predictions = classifier({"array": audio_data, "sampling_rate": sample_rate})
    except Exception:
        logger.exception("Emotion classification failed")
        return JsonResponse({"error": "Failed to analyze audio"}, status=500)

    top = predictions[0] if isinstance(predictions, list) and predictions else {}
    top_label = top.get("label") if isinstance(top, dict) else None
    mood = _mood_from_emotion_label(top_label)

    return JsonResponse(
        {
            "mood": mood,
            "top_emotion": top,
            "emotions": predictions,
        }
    )