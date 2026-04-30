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
_classifier_model_id = None
_classifier_lock = Lock()

# Default model sequence:
# - If `TEST_VOICE_MODEL_ID` is set, use it.
# - Otherwise try a stronger XLSR-based SER model first.
# - Fall back to a smaller public model.
PRIMARY_MODEL_ID = "ehcalabres/wav2vec2-lg-xlsr-en-speech-emotion-recognition"
FALLBACK_MODEL_ID = "superb/wav2vec2-base-superb-er"

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
    global _classifier, _classifier_model_id

    if _classifier is not None:
        return _classifier

    with _classifier_lock:
        if _classifier is not None:
            return _classifier

        requested_model_id = os.getenv("TEST_VOICE_MODEL_ID")
        token = os.getenv("HF_TOKEN") or os.getenv("HUGGINGFACE_HUB_TOKEN")

        model_candidates = [requested_model_id, PRIMARY_MODEL_ID, FALLBACK_MODEL_ID]
        model_candidates = [m for m in model_candidates if m]

        def _looks_like_auth_error(exc: Exception) -> bool:
            msg = str(exc).lower()
            return any(s in msg for s in ("401", "unauthorized", "invalid username or password"))

        def _build_pipeline(model_id: str, auth_token: str | None):
            from transformers import pipeline

            if auth_token:
                # Newer `transformers` uses `token=`, older versions used `use_auth_token=`.
                try:
                    return pipeline("audio-classification", model=model_id, token=auth_token)
                except TypeError:
                    return pipeline("audio-classification", model=model_id, use_auth_token=auth_token)
            return pipeline("audio-classification", model=model_id)

        last_error: Exception | None = None
        for model_id in model_candidates:
            try:
                _classifier = _build_pipeline(model_id, token)
                _classifier_model_id = model_id
                logger.info("test_voice classifier loaded: %s", model_id)
                return _classifier
            except Exception as exc:
                last_error = exc

                # If a bad token is configured, HF returns 401 even for public models.
                # Retry once without token in that case.
                if token and _looks_like_auth_error(exc):
                    try:
                        _classifier = _build_pipeline(model_id, None)
                        _classifier_model_id = model_id
                        logger.warning("test_voice classifier loaded without token: %s", model_id)
                        return _classifier
                    except Exception as exc2:
                        last_error = exc2

                logger.warning("Failed to load model '%s' (trying next)", model_id, exc_info=True)

        logger.error("All test_voice model candidates failed", exc_info=last_error)
        _classifier = None
        _classifier_model_id = None
        return None


def _mood_from_predictions(predictions: Any) -> tuple[str, dict[str, float]]:
    scores = {"good": 0.0, "normal": 0.0, "bad": 0.0}
    if not isinstance(predictions, list):
        return "normal", scores

    for item in predictions:
        if not isinstance(item, dict):
            continue
        label = item.get("label")
        mood = _mood_from_emotion_label(label)
        try:
            score = float(item.get("score") or 0.0)
        except (TypeError, ValueError):
            score = 0.0
        if mood not in scores:
            mood = "normal"
        scores[mood] += score

    mood = max(scores, key=scores.get) if any(scores.values()) else "normal"
    return mood, scores

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
    mood, mood_scores = _mood_from_predictions(predictions)

    return JsonResponse(
        {
            "mood": mood,
            "mood_scores": mood_scores,
            "top_emotion": top,
            "emotions": predictions,
            "model": _classifier_model_id,
        }
    )