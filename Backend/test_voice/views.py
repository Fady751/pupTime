"""
Voice Mood Analysis — v2 (SenseVoice + language-aware sentiment)

Pipeline overview
─────────────────
1. **SenseVoiceSmall** (FunAudioLLM) — single model that gives us:
   • Multilingual ASR (Arabic, English, Chinese, Japanese, Korean, …)
   • Speech Emotion Recognition (happy, sad, angry, neutral, …)
   • Language Identification
   ⇒  replaces the old wav2vec2 classifier + whisper ASR combo.

2. **Text sentiment** — language-aware routing:
   • Arabic / Egyptian  → CAMeL-Lab/bert-base-arabic-camelbert-da-sentiment
   • English / other    → cardiffnlp/twitter-xlm-roberta-base-sentiment

3. **Fusion** — weighted combination of voice-emotion + text-sentiment
   scores to produce a final mood (good / normal / bad).

Fallback: if ``funasr`` is not installed the code falls back to the
legacy wav2vec2 + whisper pipeline so nothing breaks.
"""

import io
import logging
import os
import re
import tempfile
from threading import Lock
from typing import Any

import numpy as np
from django.http import JsonResponse
from django.shortcuts import render
from django.views.decorators.csrf import csrf_exempt

logger = logging.getLogger(__name__)

# ── Global singletons ────────────────────────────────────────────────
_sensevoice = None
_sensevoice_lock = Lock()
_sensevoice_error: str | None = None

# Legacy fallback (wav2vec2 emotion classifier + whisper ASR)
_classifier = None
_classifier_model_id = None
_classifier_lock = Lock()
_asr = None
_asr_model_id = None
_asr_lock = Lock()

# Sentiment pipelines (one per language family)
_sentiment_ar = None
_sentiment_ar_lock = Lock()
_sentiment_en = None
_sentiment_en_lock = Lock()
_sentiment_load_errors: dict[str, str] = {}

# ── Model IDs ─────────────────────────────────────────────────────────
SENSEVOICE_MODEL_ID = "FunAudioLLM/SenseVoiceSmall"

# Legacy fallback emotion models
LEGACY_PRIMARY_MODEL_ID = "ehcalabres/wav2vec2-lg-xlsr-en-speech-emotion-recognition"
LEGACY_FALLBACK_MODEL_ID = "superb/wav2vec2-base-superb-er"
DEFAULT_ASR_MODEL_ID = "openai/whisper-small"

# Sentiment models
ARABIC_SENTIMENT_MODEL_ID = "CAMeL-Lab/bert-base-arabic-camelbert-da-sentiment"
ENGLISH_SENTIMENT_MODEL_ID = "cardiffnlp/twitter-xlm-roberta-base-sentiment"

TARGET_SAMPLE_RATE = 16000

# ── SenseVoice emotion tags ──────────────────────────────────────────
# SenseVoice wraps emotions in tags like <|HAPPY|>, <|SAD|>, <|ANGRY|>, <|NEUTRAL|>
_SENSEVOICE_EMOTION_RE = re.compile(r"<\|(\w+)\|>")

_EMOTION_TO_MOOD = {
    # SenseVoice tags
    "HAPPY": "good",
    "NEUTRAL": "normal",
    "SAD": "bad",
    "ANGRY": "bad",
    # Extended / alternate labels
    "happy": "good",
    "happiness": "good",
    "joy": "good",
    "positive": "good",
    "excited": "good",
    "surprise": "good",
    "neutral": "normal",
    "calm": "normal",
    "normal": "normal",
    "angry": "bad",
    "anger": "bad",
    "sad": "bad",
    "sadness": "bad",
    "fear": "bad",
    "fearful": "bad",
    "disgust": "bad",
    "disgusted": "bad",
    "frustrated": "bad",
    "negative": "bad",
}


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


# =====================================================================
#  SenseVoice (primary pipeline — ASR + SER + LID in one)
# =====================================================================
def _get_sensevoice():
    """Load the SenseVoiceSmall model via funasr. Returns None on failure."""
    global _sensevoice, _sensevoice_error

    if _sensevoice is not None:
        return _sensevoice
    if _sensevoice_error is not None:
        return None  # already tried and failed

    with _sensevoice_lock:
        if _sensevoice is not None:
            return _sensevoice
        if _sensevoice_error is not None:
            return None

        try:
            from funasr import AutoModel

            model_id = os.getenv("SENSEVOICE_MODEL_ID", SENSEVOICE_MODEL_ID)
            device = os.getenv("SENSEVOICE_DEVICE", "cpu")

            _sensevoice = AutoModel(
                model=model_id,
                trust_remote_code=True,
                device=device,
                hub="hf",
            )
            logger.info("SenseVoice loaded: %s (device=%s)", model_id, device)
            return _sensevoice
        except ImportError:
            _sensevoice_error = "funasr not installed — falling back to legacy pipeline"
            logger.warning(_sensevoice_error)
        except Exception as exc:
            _sensevoice_error = str(exc)
            logger.exception("Failed to load SenseVoice")

    return None


def _run_sensevoice(audio: np.ndarray, sample_rate: int) -> dict:
    """Run SenseVoice inference and return parsed results.

    Returns dict with keys: transcript, emotion, language, raw_text
    """
    model = _get_sensevoice()
    if model is None:
        return {}

    # SenseVoice expects a file path or numpy array.
    # We write to a temp WAV file for maximum compatibility.
    import soundfile as sf

    tmp = tempfile.NamedTemporaryFile(suffix=".wav", delete=False)
    try:
        sf.write(tmp.name, audio, sample_rate)
        tmp.close()

        res = model.generate(
            input=tmp.name,
            cache={},
            language="auto",
            use_itn=True,
            batch_size_s=60,
        )
    finally:
        try:
            os.unlink(tmp.name)
        except OSError:
            pass

    if not res or not isinstance(res, list) or not res[0]:
        return {}

    raw_text = res[0].get("text", "") if isinstance(res[0], dict) else str(res[0])

    # Parse emotion tags: <|HAPPY|>, <|SAD|>, <|ANGRY|>, <|NEUTRAL|>
    tags = _SENSEVOICE_EMOTION_RE.findall(raw_text)
    emotion = None
    language = None
    for tag in tags:
        tag_upper = tag.upper()
        if tag_upper in _EMOTION_TO_MOOD:
            emotion = tag_upper
        # Language tags: <|en|>, <|zh|>, <|ar|>, etc.
        if len(tag) <= 3 and tag.lower() not in _EMOTION_TO_MOOD:
            language = tag.lower()

    # Clean transcript: remove all <|...|> tags
    transcript = re.sub(r"<\|[^|]*\|>", "", raw_text).strip()

    return {
        "transcript": transcript or None,
        "emotion": emotion,
        "language": language,
        "raw_text": raw_text,
    }


# =====================================================================
#  Sentiment pipelines (language-aware)
# =====================================================================
def _get_arabic_sentiment():
    global _sentiment_ar
    if _sentiment_ar is not None:
        return _sentiment_ar

    with _sentiment_ar_lock:
        if _sentiment_ar is not None:
            return _sentiment_ar

        model_id = os.getenv("ARABIC_SENTIMENT_MODEL_ID", ARABIC_SENTIMENT_MODEL_ID)
        try:
            _sentiment_ar = _build_hf_pipeline("text-classification", model_id, top_k=None)
            logger.info("Arabic sentiment loaded: %s", model_id)
            return _sentiment_ar
        except Exception as exc:
            _sentiment_load_errors["ar"] = str(exc)
            logger.exception("Failed to load Arabic sentiment model")
            return None


def _get_english_sentiment():
    global _sentiment_en
    if _sentiment_en is not None:
        return _sentiment_en

    with _sentiment_en_lock:
        if _sentiment_en is not None:
            return _sentiment_en

        model_id = os.getenv("ENGLISH_SENTIMENT_MODEL_ID", ENGLISH_SENTIMENT_MODEL_ID)
        try:
            _sentiment_en = _build_hf_pipeline("text-classification", model_id, top_k=None)
            logger.info("English sentiment loaded: %s", model_id)
            return _sentiment_en
        except Exception as exc:
            _sentiment_load_errors["en"] = str(exc)
            logger.exception("Failed to load English sentiment model")
            return None


def _build_hf_pipeline(task: str, model_id: str, **kwargs):
    from transformers import pipeline

    token = os.getenv("HF_TOKEN") or os.getenv("HUGGINGFACE_HUB_TOKEN")
    if token:
        try:
            return pipeline(task, model=model_id, token=token, **kwargs)
        except TypeError:
            return pipeline(task, model=model_id, use_auth_token=token, **kwargs)
    return pipeline(task, model=model_id, **kwargs)


def _is_arabic(text: str) -> bool:
    """Heuristic: check if text contains Arabic characters."""
    if not text:
        return False
    arabic_chars = sum(1 for c in text if "\u0600" <= c <= "\u06FF" or "\u0750" <= c <= "\u077F")
    return arabic_chars / max(len(text.replace(" ", "")), 1) > 0.3


def _run_sentiment(transcript: str, detected_lang: str | None) -> dict:
    """Run the best sentiment model based on detected language.

    Returns dict with keys: mood, scores, raw, model, error
    """
    result = {
        "mood": None,
        "scores": {"good": 0.0, "normal": 0.0, "bad": 0.0},
        "raw": None,
        "model": None,
        "error": None,
    }

    if not transcript or not transcript.strip():
        return result

    # Pick the right model
    use_arabic = (detected_lang in ("ar", "zn")) or _is_arabic(transcript)

    if use_arabic:
        pipe = _get_arabic_sentiment()
        result["model"] = ARABIC_SENTIMENT_MODEL_ID
        label_map = {
            "positive": "good",
            "negative": "bad",
            "neutral": "normal",
        }
    else:
        pipe = _get_english_sentiment()
        result["model"] = ENGLISH_SENTIMENT_MODEL_ID
        label_map = {
            "positive": "good",
            "pos": "good",
            "negative": "bad",
            "neg": "bad",
            "neutral": "normal",
            "neu": "normal",
            # XLM-RoBERTa uses LABEL_0/1/2
            "label_0": "bad",
            "label_1": "normal",
            "label_2": "good",
        }

    if pipe is None:
        result["error"] = _sentiment_load_errors.get("ar" if use_arabic else "en", "Model not available")
        return result

    try:
        out = pipe(transcript[:512])  # truncate to model max
        result["raw"] = out

        scores_list = None
        if isinstance(out, list) and out and isinstance(out[0], list):
            scores_list = out[0]
        elif isinstance(out, list) and out and isinstance(out[0], dict):
            scores_list = out

        if scores_list:
            for item in scores_list:
                if not isinstance(item, dict):
                    continue
                label = str(item.get("label", "")).strip().lower().replace(" ", "_")
                mood = label_map.get(label, "normal")
                score = float(item.get("score", 0.0))
                result["scores"][mood] += score

            result["mood"] = max(result["scores"], key=result["scores"].get)
    except Exception as exc:
        logger.exception("Sentiment analysis failed")
        result["error"] = str(exc)

    return result


# =====================================================================
#  Mood mapping helpers
# =====================================================================
def _emotion_to_mood(emotion: str | None) -> str:
    if not emotion:
        return "normal"
    return _EMOTION_TO_MOOD.get(emotion, _EMOTION_TO_MOOD.get(emotion.lower(), "normal"))


def _emotion_to_scores(emotion: str | None) -> dict[str, float]:
    """Convert a single emotion label to soft scores."""
    mood = _emotion_to_mood(emotion)
    # Give 80% to detected mood, 10% to each other
    scores = {"good": 0.1, "normal": 0.1, "bad": 0.1}
    scores[mood] = 0.8
    return scores


def _normalize_scores(scores: dict[str, float]) -> dict[str, float]:
    total = float(sum(max(v, 0.0) for v in scores.values()))
    if total <= 0:
        return {k: 0.0 for k in scores}
    return {k: max(v, 0.0) / total for k, v in scores.items()}


# =====================================================================
#  Legacy fallback pipeline (wav2vec2 + whisper)
# =====================================================================
def _get_legacy_classifier():
    global _classifier, _classifier_model_id
    if _classifier is not None:
        return _classifier

    with _classifier_lock:
        if _classifier is not None:
            return _classifier

        model_candidates = [
            os.getenv("TEST_VOICE_MODEL_ID"),
            LEGACY_PRIMARY_MODEL_ID,
            LEGACY_FALLBACK_MODEL_ID,
        ]
        model_candidates = [m for m in model_candidates if m]

        for model_id in model_candidates:
            try:
                _classifier = _build_hf_pipeline("audio-classification", model_id)
                _classifier_model_id = model_id
                logger.info("Legacy classifier loaded: %s", model_id)
                return _classifier
            except Exception:
                logger.warning("Failed to load legacy model '%s'", model_id, exc_info=True)

        return None


def _get_legacy_asr():
    global _asr, _asr_model_id
    if _asr is not None:
        return _asr

    with _asr_lock:
        if _asr is not None:
            return _asr

        model_id = os.getenv("TEST_VOICE_ASR_MODEL_ID", DEFAULT_ASR_MODEL_ID)
        try:
            _asr = _build_hf_pipeline("automatic-speech-recognition", model_id)
            _asr_model_id = model_id
            logger.info("Legacy ASR loaded: %s", model_id)
            return _asr
        except Exception:
            logger.exception("Failed to load legacy ASR")
            return None


def _legacy_mood_from_predictions(predictions: list) -> tuple[str, dict[str, float]]:
    """Map wav2vec2 emotion predictions to mood scores."""
    scores = {"good": 0.0, "normal": 0.0, "bad": 0.0}
    if not isinstance(predictions, list):
        return "normal", scores

    for item in predictions:
        if not isinstance(item, dict):
            continue
        label = str(item.get("label", "")).strip().lower().replace("_", " ").replace("-", " ")
        mood = _EMOTION_TO_MOOD.get(label, "normal")
        score = float(item.get("score", 0.0))
        scores[mood] += score

    mood = max(scores, key=scores.get) if any(scores.values()) else "normal"
    return mood, scores


def _run_legacy_pipeline(audio: np.ndarray, sample_rate: int) -> dict:
    """Full legacy analysis: wav2vec2 emotion + whisper ASR."""
    result = {
        "tone_mood": "normal",
        "tone_scores": {"good": 0.0, "normal": 0.0, "bad": 0.0},
        "emotion_label": None,
        "emotions": [],
        "transcript": None,
        "language": None,
        "classifier_model": _classifier_model_id,
        "asr_model": _asr_model_id,
        "error": None,
    }

    classifier = _get_legacy_classifier()
    if classifier is None:
        result["error"] = "Emotion model not available"
        return result

    try:
        predictions = classifier({"array": audio, "sampling_rate": sample_rate})
        result["emotions"] = predictions
        if predictions:
            result["emotion_label"] = predictions[0].get("label")
        result["tone_mood"], result["tone_scores"] = _legacy_mood_from_predictions(predictions)
    except Exception:
        logger.exception("Legacy emotion classification failed")
        result["error"] = "Classification failed"
        return result

    # ASR
    asr = _get_legacy_asr()
    if asr:
        try:
            asr_out = asr({"array": audio, "sampling_rate": sample_rate})
            if isinstance(asr_out, dict):
                result["transcript"] = (asr_out.get("text") or "").strip() or None
        except Exception:
            logger.exception("Legacy ASR failed")

    return result


# =====================================================================
#  Main analysis endpoint
# =====================================================================
@csrf_exempt
def analyze_emotion(request):
    if request.method != "POST" or not request.FILES.get("file"):
        return JsonResponse({"error": "Invalid request — POST with 'file' required"}, status=400)

    audio_file = request.FILES["file"]
    try:
        audio_data, sample_rate = _load_audio(audio_file.read())
    except Exception:
        logger.exception("Failed to decode uploaded audio")
        return JsonResponse(
            {"error": "Unsupported/invalid audio. Please upload a valid audio file."},
            status=400,
        )

    # ── Try SenseVoice first (best quality) ───────────────────────
    sv_result = _run_sensevoice(audio_data, sample_rate)
    using_sensevoice = bool(sv_result.get("transcript") or sv_result.get("emotion"))

    if using_sensevoice:
        # SenseVoice gave us emotion + transcript + language
        emotion = sv_result.get("emotion")
        transcript = sv_result.get("transcript")
        detected_lang = sv_result.get("language")

        tone_mood = _emotion_to_mood(emotion)
        tone_scores = _emotion_to_scores(emotion)
        emotion_label = emotion
        emotions_raw = [{"label": emotion or "unknown", "source": "sensevoice"}]
        classifier_model = SENSEVOICE_MODEL_ID
        asr_model = SENSEVOICE_MODEL_ID
        asr_error = None
    else:
        # ── Fallback to legacy pipeline ───────────────────────────
        legacy = _run_legacy_pipeline(audio_data, sample_rate)
        tone_mood = legacy["tone_mood"]
        tone_scores = legacy["tone_scores"]
        emotion_label = legacy["emotion_label"]
        emotions_raw = legacy["emotions"]
        transcript = legacy["transcript"]
        detected_lang = None
        classifier_model = legacy["classifier_model"]
        asr_model = legacy["asr_model"]
        asr_error = legacy["error"]

        if legacy["error"] and not legacy["emotions"]:
            return JsonResponse(
                {
                    "error": legacy["error"],
                    "hint": "Install funasr for SenseVoice (recommended) or torch+transformers for legacy pipeline.",
                },
                status=503,
            )

    # ── Text sentiment analysis ───────────────────────────────────
    enable_sentiment = os.getenv("TEST_VOICE_ENABLE_SENTIMENT", "true").lower() in {"1", "true", "yes"}

    sentiment_result = {"mood": None, "scores": {"good": 0.0, "normal": 0.0, "bad": 0.0}, "raw": None, "model": None, "error": None}
    if enable_sentiment and transcript:
        sentiment_result = _run_sentiment(transcript, detected_lang)

    # ── Fusion ────────────────────────────────────────────────────
    try:
        tone_w = float(os.getenv("TEST_VOICE_TONE_WEIGHT", "0.6"))
    except ValueError:
        tone_w = 0.6
    try:
        text_w = float(os.getenv("TEST_VOICE_TEXT_WEIGHT", "0.4"))
    except ValueError:
        text_w = 0.4

    tone_norm = _normalize_scores(tone_scores)
    text_norm = _normalize_scores(sentiment_result["scores"])

    if not transcript or sentiment_result["mood"] is None:
        final_mood = tone_mood
        combined_scores = tone_norm
    else:
        combined_scores = {
            k: tone_w * tone_norm.get(k, 0.0) + text_w * text_norm.get(k, 0.0)
            for k in ("good", "normal", "bad")
        }
        final_mood = max(combined_scores, key=combined_scores.get)

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
            "top_emotion": {"label": emotion_label, "source": "sensevoice" if using_sensevoice else "wav2vec2"},
            "emotions": emotions_raw,
            "model": {
                "tone": classifier_model,
                "asr": asr_model,
                "sentiment": sentiment_result["model"],
            },
            "transcript": transcript,
            "detected_language": detected_lang,
            "sentiment": sentiment_result["raw"],
            "pipeline": "sensevoice" if using_sensevoice else "legacy",
            "errors": {
                "asr": asr_error if not using_sensevoice else None,
                "sentiment": sentiment_result["error"],
                "sensevoice": _sensevoice_error if not using_sensevoice else None,
            },
        }
    )