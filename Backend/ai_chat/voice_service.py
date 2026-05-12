import logging
import librosa
import numpy as np

logger = logging.getLogger(__name__)


def analyze_audio(audio_path: str) -> dict:
    y, sr = librosa.load(audio_path, sr=16000)

    rms = float(
        np.mean(
            librosa.feature.rms(y=y)
        )
    )
    f0, voiced_flag, voiced_probs = librosa.pyin(
        y,
        fmin=75,
        fmax=500
    )

    valid_f0 = f0[~np.isnan(f0)]

    pitch_mean = (
        float(np.mean(valid_f0))
        if len(valid_f0) > 0
        else 0
    )

    pitch_std = (
        float(np.std(valid_f0))
        if len(valid_f0) > 0
        else 0
    )

    duration = librosa.get_duration(
        y=y,
        sr=sr
    )

    intervals = librosa.effects.split(
        y,
        top_db=25
    )

    speech_samples = sum(
        end - start
        for start, end in intervals
    )

    silence_ratio = 1 - (
        speech_samples / len(y)
    )

    zcr = float(
        np.mean(
            librosa.feature.zero_crossing_rate(y)
        )
    )

    spectral_centroid = float(
        np.mean(
            librosa.feature.spectral_centroid(
                y=y,
                sr=sr
            )
        )
    )

    features = {
        "rms_energy": rms,
        "average_pitch": pitch_mean,
        "pitch_variation": pitch_std,
        "silence_ratio": silence_ratio,
        "zero_crossing_rate": zcr,
        "spectral_centroid": spectral_centroid,
        "duration_seconds": duration,
    }

    logger.debug(
        "Voice acoustic features extracted | rms=%.4f pitch_mean=%.1f "
        "pitch_std=%.1f silence_ratio=%.2f zcr=%.4f spectral_centroid=%.1f duration=%.2fs",
        rms, pitch_mean, pitch_std, silence_ratio, zcr, spectral_centroid, duration,
    )

    return features


def classify_mood(features: dict) -> dict:
    rms        = features.get("rms_energy", 0)
    pitch_mean = features.get("average_pitch", 0)
    pitch_std  = features.get("pitch_variation", 0)
    silence    = features.get("silence_ratio", 0)
    zcr        = features.get("zero_crossing_rate", 0)

    HIGH_RMS     = 0.05
    LOW_RMS      = 0.015
    HIGH_SILENCE = 0.55
    HIGH_ZCR     = 0.12
    HIGH_PITCH_STD  = 40.0
    HIGH_PITCH_MEAN = 180.0

    mood = "neutral"
    confidence = "medium"

    if rms >= HIGH_RMS and zcr >= HIGH_ZCR and pitch_std >= HIGH_PITCH_STD:
        # Loud, noisy, erratic — likely angry or highly stressed
        mood = "angry"
        confidence = "high" if (rms > HIGH_RMS * 1.5 and zcr > HIGH_ZCR * 1.3) else "medium"

    elif pitch_std >= HIGH_PITCH_STD and pitch_mean >= HIGH_PITCH_MEAN:
        # Wide pitch swings at higher register — anxious / excited
        mood = "anxious"
        confidence = "high" if pitch_std > HIGH_PITCH_STD * 1.4 else "medium"

    elif rms <= LOW_RMS and silence >= HIGH_SILENCE:
        # Quiet voice, lots of silence — sad / low energy
        mood = "sad"
        confidence = "high" if (rms < LOW_RMS * 0.6 and silence > 0.70) else "medium"

    elif rms >= HIGH_RMS and pitch_std < HIGH_PITCH_STD * 0.6:
        # Energetic but stable pitch — upbeat / happy
        mood = "happy"
        confidence = "medium"

    else:
        mood = "neutral"
        confidence = "low"

    _hints = {
        "angry": (
            "User's voice sounds tense and raised — high energy with an erratic tone. "
            "They may be frustrated or upset."
        ),
        "anxious": (
            "User's voice has rapid pitch swings at a higher register — they may be feeling "
            "nervous, overwhelmed, or stressed."
        ),
        "sad": (
            "User's voice is quiet and subdued with long pauses — they sound low-energy "
            "and possibly feeling down or tired."
        ),
        "happy": (
            "User's voice sounds energetic and steady — they seem to be in a good, "
            "positive mood."
        ),
        "neutral": (
            "User's voice is calm and measured — no strong emotional signal detected."
        ),
    }

    result = {
        "mood": mood,
        "confidence": confidence,
        "features": features,
        "ai_hint": _hints[mood],
    }

    logger.info(
        "Mood classified | mood=%s confidence=%s rms=%.4f silence=%.2f pitch_std=%.1f",
        mood, confidence, rms, silence, pitch_std,
    )

    return result