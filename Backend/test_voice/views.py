"""
Voice Mood Analysis — v3 (Google STT + sentiment)

Pipeline overview
─────────────────
1. **Google Speech-to-Text v2** — paid Arabic/English transcript + language detection.
2. **Google Natural Language Sentiment** — paid sentiment analysis on the transcript.
3. **Fusion** — final mood derived from text sentiment.
"""

import io
import logging
import os
from threading import Lock
from typing import Any

import numpy as np
from django.http import JsonResponse
from django.shortcuts import render
from django.views.decorators.csrf import csrf_exempt

logger = logging.getLogger(__name__)

# ── Global singletons ────────────────────────────────────────────────
# Google Cloud clients (Speech-to-Text v2 + Natural Language sentiment)
_google_speech_client = None
_google_speech_lock = Lock()
_google_speech_error: str | None = None

_google_lang_client = None
_google_lang_lock = Lock()
_google_lang_error: str | None = None

# ── Model IDs ─────────────────────────────────────────────────────────
DEFAULT_GOOGLE_STT_LANGUAGES = ("ar", "en")
GOOGLE_SPEECH_MODEL_PREFIX = "google-speech-v2"
GOOGLE_LANGUAGE_MODEL_ID = "google-language-v1"

TARGET_SAMPLE_RATE = 16000


# =====================================================================
#  View: index page
# =====================================================================
def index(request):
    return render(request, "index.html")


# =====================================================================
#  Audio helpers
# =====================================================================
def _load_audio(file_bytes: bytes) -> tuple[Any, int]:
    """Decode uploaded audio into mono float32 waveform + sample rate.

    Tries ``soundfile`` first (handles most formats), then falls back
    to the builtin ``wave`` module for plain WAV.
    """
    try:
        import soundfile as sf

        data, sample_rate = sf.read(
            io.BytesIO(file_bytes), dtype="float32", always_2d=False
        )
        if isinstance(data, np.ndarray) and data.ndim == 2:
            data = data.mean(axis=1)
        audio = np.asarray(data, dtype=np.float32)
        audio, sample_rate = _ensure_target_sample_rate(audio, int(sample_rate))
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

    audio, sample_rate = _ensure_target_sample_rate(audio, int(sample_rate))
    return audio, sample_rate


def _ensure_target_sample_rate(
    audio, sample_rate: int, target_sample_rate: int = TARGET_SAMPLE_RATE
):
    if sample_rate == target_sample_rate:
        return audio, sample_rate
    if sample_rate <= 0 or target_sample_rate <= 0:
        raise ValueError("Invalid sample rate")
    if audio is None:
        raise ValueError("Invalid audio")

    audio = np.asarray(audio, dtype=np.float32)
    if audio.size < 2:
        return audio, target_sample_rate

    target_length = max(int(round(audio.shape[0] * (target_sample_rate / sample_rate))), 1)
    orig_x = np.arange(audio.shape[0], dtype=np.float32)
    target_x = np.linspace(0, audio.shape[0] - 1, num=target_length, dtype=np.float32)
    resampled = np.interp(target_x, orig_x, audio).astype(np.float32)
    return resampled, target_sample_rate


def _bool_env(name: str, default: bool = False) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "y", "on"}


def _parse_language_codes(raw: str | None, default: tuple[str, ...]) -> list[str]:
    if not raw:
        return list(default)
    codes = [c.strip() for c in raw.split(",") if c.strip()]
    return codes or list(default)


def _resolve_credentials_path(path: str | None) -> str | None:
    if not path:
        return None
    if os.path.isabs(path):
        return path
    backend_root = os.path.dirname(os.path.dirname(__file__))
    candidate = os.path.join(backend_root, path)
    return candidate if os.path.exists(candidate) else path


def _ensure_google_credentials() -> None:
    creds = os.getenv("SPEECH_GCP_CREDENTIALS") or os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
    resolved = _resolve_credentials_path(creds)
    if resolved:
        os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = resolved


def _google_stt_enabled() -> bool:
    flag = os.getenv("TEST_VOICE_USE_GOOGLE_STT")
    if flag is not None:
        return _bool_env("TEST_VOICE_USE_GOOGLE_STT", False)
    return bool(os.getenv("SPEECH_GCP_PROJECT"))


def _google_sentiment_enabled() -> bool:
    flag = os.getenv("TEST_VOICE_USE_GOOGLE_SENTIMENT")
    if flag is not None:
        return _bool_env("TEST_VOICE_USE_GOOGLE_SENTIMENT", False)
    return _google_stt_enabled()


def _get_google_speech_client():
    global _google_speech_client, _google_speech_error

    if _google_speech_client is not None:
        return _google_speech_client
    if _google_speech_error is not None:
        return None

    with _google_speech_lock:
        if _google_speech_client is not None:
            return _google_speech_client
        if _google_speech_error is not None:
            return None

        try:
            from google.api_core.client_options import ClientOptions
            from google.cloud import speech_v2

            _ensure_google_credentials()

            region = os.getenv("SPEECH_GCP_REGION") or os.getenv("LLM_GCP_REGION")
            if region:
                endpoint = f"{region}-speech.googleapis.com"
                _google_speech_client = speech_v2.SpeechClient(
                    client_options=ClientOptions(api_endpoint=endpoint)
                )
            else:
                _google_speech_client = speech_v2.SpeechClient()

            return _google_speech_client
        except ImportError:
            _google_speech_error = "google-cloud-speech not installed"
            logger.warning(_google_speech_error)
        except Exception as exc:
            _google_speech_error = str(exc)
            logger.exception("Failed to load Google Speech client")

    return None


def _get_google_language_client():
    global _google_lang_client, _google_lang_error

    if _google_lang_client is not None:
        return _google_lang_client
    if _google_lang_error is not None:
        return None

    with _google_lang_lock:
        if _google_lang_client is not None:
            return _google_lang_client
        if _google_lang_error is not None:
            return None

        try:
            from google.cloud import language_v1

            _ensure_google_credentials()
            _google_lang_client = language_v1.LanguageServiceClient()
            return _google_lang_client
        except ImportError:
            _google_lang_error = "google-cloud-language not installed"
            logger.warning(_google_lang_error)
        except Exception as exc:
            _google_lang_error = str(exc)
            logger.exception("Failed to load Google Language client")

    return None


def _run_google_stt(audio_bytes: bytes, sample_rate: int) -> dict:
    result = {
        "transcript": None,
        "language": None,
        "model": GOOGLE_SPEECH_MODEL_PREFIX,
        "error": None,
    }

    client = _get_google_speech_client()
    if client is None:
        result["error"] = _google_speech_error or "Google STT not available"
        return result

    try:
        from google.cloud import speech_v2
        from google.cloud.speech_v2.types import cloud_speech

        project = os.getenv("SPEECH_GCP_PROJECT") or os.getenv("LLM_GCP_PROJECT")
        region = os.getenv("SPEECH_GCP_REGION") or os.getenv("LLM_GCP_REGION") or "global"
        if not project:
            result["error"] = "SPEECH_GCP_PROJECT not set"
            return result

        recognizer = f"projects/{project}/locations/{region}/recognizers/_"
        lang_codes = _parse_language_codes(
            os.getenv("SPEECH_STT_LANGUAGES"), DEFAULT_GOOGLE_STT_LANGUAGES
        )

        config_kwargs = {
            "auto_decoding_config": cloud_speech.AutoDetectDecodingConfig(),
            "language_codes": lang_codes,
        }

        model = os.getenv("SPEECH_STT_MODEL")
        if model:
            config_kwargs["model"] = model
            result["model"] = f"{GOOGLE_SPEECH_MODEL_PREFIX}:{model}"

        config = cloud_speech.RecognitionConfig(**config_kwargs)
        request = cloud_speech.RecognizeRequest(
            recognizer=recognizer,
            config=config,
            content=audio_bytes,
        )

        response = client.recognize(request=request)
        transcripts = []
        detected_lang = None
        for item in response.results:
            if not detected_lang:
                detected_lang = getattr(item, "language_code", None) or detected_lang
            if item.alternatives:
                transcripts.append(item.alternatives[0].transcript.strip())

        result["transcript"] = " ".join(t for t in transcripts if t).strip() or None
        result["language"] = detected_lang
        return result
    except Exception as exc:
        logger.exception("Google STT failed")
        result["error"] = str(exc)
        return result


def _run_google_sentiment(text: str, detected_lang: str | None) -> dict:
    result = {
        "mood": None,
        "scores": {"good": 0.0, "normal": 0.0, "bad": 0.0},
        "raw": None,
        "model": GOOGLE_LANGUAGE_MODEL_ID,
        "error": None,
    }

    if not text or not text.strip():
        return result

    client = _get_google_language_client()
    if client is None:
        result["error"] = _google_lang_error or "Google Language not available"
        return result

    try:
        from google.cloud import language_v1

        doc_kwargs = {
            "content": text[:2000],
            "type_": language_v1.Document.Type.PLAIN_TEXT,
        }
        if detected_lang:
            doc_kwargs["language"] = detected_lang

        document = language_v1.Document(**doc_kwargs)
        response = client.analyze_sentiment(
            request={
                "document": document,
                "encoding_type": language_v1.EncodingType.UTF8,
            }
        )

        sentiment = response.document_sentiment
        score = float(getattr(sentiment, "score", 0.0) or 0.0)
        magnitude = float(getattr(sentiment, "magnitude", 0.0) or 0.0)

        if score >= 0.25:
            result["mood"] = "good"
        elif score <= -0.25:
            result["mood"] = "bad"
        else:
            result["mood"] = "normal"

        result["scores"] = {
            "good": max(score, 0.0) * max(magnitude, 0.5),
            "bad": max(-score, 0.0) * max(magnitude, 0.5),
            "normal": max(0.0, 1.0 - abs(score)),
        }
        result["raw"] = {
            "score": score,
            "magnitude": magnitude,
            "language": getattr(response, "language", None),
        }
    except Exception as exc:
        logger.exception("Google sentiment failed")
        result["error"] = str(exc)

    return result


# =====================================================================
#  Score helpers
# =====================================================================
def _normalize_scores(scores: dict[str, float]) -> dict[str, float]:
    total = float(sum(max(v, 0.0) for v in scores.values()))
    if total <= 0:
        return {k: 0.0 for k in scores}
    return {k: max(v, 0.0) / total for k, v in scores.items()}


# =====================================================================
#  Main analysis endpoint
# =====================================================================
@csrf_exempt
def analyze_emotion(request):
    if request.method != "POST" or not request.FILES.get("file"):
        return JsonResponse({"error": "Invalid request — POST with 'file' required"}, status=400)

    audio_file = request.FILES["file"]
    try:
        audio_bytes = audio_file.read()
        audio_data, sample_rate = _load_audio(audio_bytes)
    except Exception:
        logger.exception("Failed to decode uploaded audio")
        return JsonResponse(
            {"error": "Unsupported/invalid audio. Please upload a valid audio file."},
            status=400,
        )

    use_google_stt = _google_stt_enabled() and bool(audio_bytes)
    if not use_google_stt:
        return JsonResponse(
            {
                "error": "Google STT is disabled.",
                "hint": "Set TEST_VOICE_USE_GOOGLE_STT=true and configure SPEECH_GCP_* in the environment.",
            },
            status=503,
        )

    # ── Google STT (required) ────────────────────────────────────
    google_asr_result = _run_google_stt(audio_bytes, sample_rate)
    google_asr_error = google_asr_result.get("error")
    transcript = google_asr_result.get("transcript")
    detected_lang = google_asr_result.get("language")
    asr_model = google_asr_result.get("model")

    if google_asr_error:
        return JsonResponse(
            {
                "error": "Google STT failed.",
                "details": google_asr_error,
            },
            status=503,
        )

    if not transcript:
        return JsonResponse(
            {"error": "No transcript returned from Google STT."},
            status=422,
        )

    tone_mood = None
    tone_scores = {"good": 0.0, "normal": 0.0, "bad": 0.0}
    emotion_label = None
    emotions_raw = []
    classifier_model = None

    # ── Text sentiment analysis ───────────────────────────────────
    enable_sentiment = os.getenv("TEST_VOICE_ENABLE_SENTIMENT", "true").lower() in {"1", "true", "yes"}

    sentiment_result = {"mood": None, "scores": {"good": 0.0, "normal": 0.0, "bad": 0.0}, "raw": None, "model": None, "error": None}
    google_sentiment_error = None
    if enable_sentiment and transcript:
        if _google_sentiment_enabled():
            sentiment_result = _run_google_sentiment(transcript, detected_lang)
            google_sentiment_error = sentiment_result.get("error")
        else:
            sentiment_result["error"] = "Google sentiment disabled"

    # ── Fusion ────────────────────────────────────────────────────
    text_norm = _normalize_scores(sentiment_result["scores"])

    if sentiment_result["mood"] is None or not any(text_norm.values()):
        final_mood = "normal"
        combined_scores = {"good": 0.0, "normal": 1.0, "bad": 0.0}
    else:
        final_mood = sentiment_result["mood"]
        combined_scores = text_norm

    logger.info(
        "ASR source=google lang=%s model=%s",
        detected_lang or "unknown",
        asr_model or "unknown",
    )

    pipeline_name = "google"

    return JsonResponse(
        {
            "mood": final_mood,
            "mood_components": {
                "tone": tone_mood,
                "text": sentiment_result["mood"],
            },
            "mood_scores": {
                "tone": tone_scores,
                "text": sentiment_result["scores"],
                "combined": combined_scores,
            },
            "top_emotion": {"label": emotion_label, "source": None},
            "emotions": emotions_raw,
            "model": {
                "tone": classifier_model,
                "asr": asr_model,
                "sentiment": sentiment_result["model"],
            },
            "transcript": transcript,
            "detected_language": detected_lang,
            "sentiment": sentiment_result["raw"],
            "pipeline": pipeline_name,
            "errors": {
                "asr": None,
                "sentiment": sentiment_result["error"],
                "google_asr": google_asr_error,
                "google_sentiment": google_sentiment_error,
            },
        }
    )