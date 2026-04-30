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

_asr = None
_asr_model_id = None
_asr_lock = Lock()

_sentiment = None
_sentiment_model_id = None
_sentiment_lock = Lock()

# Default model sequence:
# - If `TEST_VOICE_MODEL_ID` is set, use it.
# - Otherwise try a stronger XLSR-based SER model first.
# - Fall back to a smaller public model.
PRIMARY_MODEL_ID = "ehcalabres/wav2vec2-lg-xlsr-en-speech-emotion-recognition"
FALLBACK_MODEL_ID = "superb/wav2vec2-base-superb-er"

# Speech-to-text (multilingual; works well for Arabic/Egyptian dialect).
DEFAULT_ASR_MODEL_ID = "openai/whisper-small"

# Multilingual sentiment model.
DEFAULT_SENTIMENT_MODEL_ID = "cardiffnlp/twitter-xlm-roberta-base-sentiment"

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

        last_error: Exception | None = None
        for model_id in model_candidates:
            try:
                _classifier = _build_hf_pipeline("audio-classification", model_id, token)
                _classifier_model_id = model_id
                logger.info("test_voice classifier loaded: %s", model_id)
                return _classifier
            except Exception as exc:
                last_error = exc

                # If a bad token is configured, HF returns 401 even for public models.
                # Retry once without token in that case.
                if token and _looks_like_auth_error(exc):
                    try:
                        _classifier = _build_hf_pipeline("audio-classification", model_id, None)
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


def _get_asr_pipeline():
    global _asr, _asr_model_id

    if _asr is not None:
        return _asr

    with _asr_lock:
        if _asr is not None:
            return _asr

        model_id = os.getenv("TEST_VOICE_ASR_MODEL_ID", DEFAULT_ASR_MODEL_ID)
        language = os.getenv("TEST_VOICE_ASR_LANGUAGE")  # e.g. "ar"
        token = os.getenv("HF_TOKEN") or os.getenv("HUGGINGFACE_HUB_TOKEN")

        kwargs = {}
        if language:
            # Whisper supports language conditioning through generate_kwargs in recent transformers.
            kwargs["generate_kwargs"] = {"language": language, "task": "transcribe"}

        try:
            _asr = _build_hf_pipeline("automatic-speech-recognition", model_id, token, **kwargs)
            _asr_model_id = model_id
            logger.info("test_voice ASR loaded: %s", model_id)
            return _asr
        except Exception as exc:
            if token and _looks_like_auth_error(exc):
                try:
                    _asr = _build_hf_pipeline("automatic-speech-recognition", model_id, None, **kwargs)
                    _asr_model_id = model_id
                    logger.warning("test_voice ASR loaded without token: %s", model_id)
                    return _asr
                except Exception:
                    pass

            logger.exception("Failed to load test_voice ASR (model=%s)", model_id)
            _asr = None
            _asr_model_id = None
            return None


def _sentiment_to_mood(label: str) -> str:
    if not label:
        return "normal"

    normalized = str(label).strip().lower().replace("_", " ")

    if any(k in normalized for k in ("positive", "pos")):
        return "good"
    if any(k in normalized for k in ("negative", "neg")):
        return "bad"
    if any(k in normalized for k in ("neutral", "neu")):
        return "normal"

    # Common mapping for cardiffnlp/twitter-xlm-roberta-base-sentiment:
    # 0=negative, 1=neutral, 2=positive.
    if normalized in {"label 0", "label0", "label_0"}:
        return "bad"
    if normalized in {"label 1", "label1", "label_1"}:
        return "normal"
    if normalized in {"label 2", "label2", "label_2"}:
        return "good"

    return "normal"


def _get_sentiment_pipeline():
    global _sentiment, _sentiment_model_id

    if _sentiment is not None:
        return _sentiment

    with _sentiment_lock:
        if _sentiment is not None:
            return _sentiment

        model_id = os.getenv("TEST_VOICE_SENTIMENT_MODEL_ID", DEFAULT_SENTIMENT_MODEL_ID)
        token = os.getenv("HF_TOKEN") or os.getenv("HUGGINGFACE_HUB_TOKEN")

        # transformers is transitioning from return_all_scores=True to top_k=None.
        kwargs_variants = [
            {"top_k": None},
            {"return_all_scores": True},
        ]

        last_error: Exception | None = None
        for kwargs in kwargs_variants:
            try:
                _sentiment = _build_hf_pipeline("text-classification", model_id, token, **kwargs)
                _sentiment_model_id = model_id
                logger.info("test_voice sentiment loaded: %s", model_id)
                return _sentiment
            except Exception as exc:
                last_error = exc
                if token and _looks_like_auth_error(exc):
                    try:
                        _sentiment = _build_hf_pipeline("text-classification", model_id, None, **kwargs)
                        _sentiment_model_id = model_id
                        logger.warning("test_voice sentiment loaded without token: %s", model_id)
                        return _sentiment
                    except Exception as exc2:
                        last_error = exc2

        logger.exception("Failed to load test_voice sentiment (model=%s)", model_id, exc_info=last_error)
        _sentiment = None
        _sentiment_model_id = None
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


def _normalize_scores(scores: dict[str, float]) -> dict[str, float]:
    total = float(sum(max(v, 0.0) for v in scores.values()))
    if total <= 0:
        return {k: 0.0 for k in scores}
    return {k: max(v, 0.0) / total for k, v in scores.items()}


def _looks_like_auth_error(exc: Exception) -> bool:
    msg = str(exc).lower()
    return any(s in msg for s in ("401", "unauthorized", "invalid username or password"))


def _build_hf_pipeline(task: str, model_id: str, token: str | None, **kwargs):
    from transformers import pipeline

    if token:
        # Newer `transformers` uses `token=`, older versions used `use_auth_token=`.
        try:
            return pipeline(task, model=model_id, token=token, **kwargs)
        except TypeError:
            return pipeline(task, model=model_id, use_auth_token=token, **kwargs)
    return pipeline(task, model=model_id, **kwargs)

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
    tone_mood, tone_mood_scores = _mood_from_predictions(predictions)

    enable_asr = os.getenv("TEST_VOICE_ENABLE_ASR", "true").lower() in {"1", "true", "yes"}
    enable_sentiment = os.getenv("TEST_VOICE_ENABLE_SENTIMENT", "true").lower() in {"1", "true", "yes"}

    transcript = None
    asr_error = None
    if enable_asr:
        asr = _get_asr_pipeline()
        if asr is None:
            asr_error = "ASR model not available"
        else:
            try:
                try:
                    asr_out = asr(
                        {"array": audio_data, "sampling_rate": sample_rate},
                        chunk_length_s=20,
                        stride_length_s=4,
                    )
                except TypeError:
                    asr_out = asr({"array": audio_data, "sampling_rate": sample_rate})

                if isinstance(asr_out, dict):
                    transcript = (asr_out.get("text") or "").strip() or None
            except Exception:
                logger.exception("ASR failed")
                asr_error = "ASR failed"

    sentiment_error = None
    sentiment_mood = None
    sentiment_mood_scores = {"good": 0.0, "normal": 0.0, "bad": 0.0}
    sentiment_raw = None
    if enable_sentiment and transcript:
        sent = _get_sentiment_pipeline()
        if sent is None:
            sentiment_error = "Sentiment model not available"
        else:
            try:
                out = sent(transcript)
                sentiment_raw = out

                scores_list = None
                if isinstance(out, list) and out and isinstance(out[0], list):
                    scores_list = out[0]
                elif isinstance(out, list) and out and isinstance(out[0], dict):
                    scores_list = out

                if scores_list:
                    for item in scores_list:
                        if not isinstance(item, dict):
                            continue
                        mood = _sentiment_to_mood(item.get("label"))
                        try:
                            score = float(item.get("score") or 0.0)
                        except (TypeError, ValueError):
                            score = 0.0
                        sentiment_mood_scores[mood] += score

                    sentiment_mood = max(sentiment_mood_scores, key=sentiment_mood_scores.get)
            except Exception:
                logger.exception("Sentiment failed")
                sentiment_error = "Sentiment failed"

    try:
        tone_w = float(os.getenv("TEST_VOICE_TONE_WEIGHT", "0.6"))
    except ValueError:
        tone_w = 0.6
    try:
        text_w = float(os.getenv("TEST_VOICE_TEXT_WEIGHT", "0.4"))
    except ValueError:
        text_w = 0.4

    tone_norm = _normalize_scores(tone_mood_scores)
    text_norm = _normalize_scores(sentiment_mood_scores)

    if not transcript or sentiment_mood is None:
        final_mood = tone_mood
        combined_scores = tone_norm
    else:
        combined_scores = {
            k: tone_w * tone_norm.get(k, 0.0) + text_w * text_norm.get(k, 0.0)
            for k in {"good", "normal", "bad"}
        }
        final_mood = max(combined_scores, key=combined_scores.get)

    return JsonResponse(
        {
            "mood": final_mood,
            "mood_components": {
                "tone": tone_mood,
                "text": sentiment_mood,
            },
            "mood_scores": {
                "tone": tone_mood_scores,
                "text": sentiment_mood_scores,
                "combined": combined_scores,
            },
            "top_emotion": top,
            "emotions": predictions,
            "model": {
                "tone": _classifier_model_id,
                "asr": _asr_model_id,
                "sentiment": _sentiment_model_id,
            },
            "transcript": transcript,
            "sentiment": sentiment_raw,
            "errors": {
                "asr": asr_error,
                "sentiment": sentiment_error,
            },
        }
    )