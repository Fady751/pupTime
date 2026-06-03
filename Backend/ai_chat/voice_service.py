import logging
import librosa
import numpy as np

logger = logging.getLogger(__name__)


def analyze_audio(audio_path: str) -> dict:
    y, sr = librosa.load(audio_path, sr=16000)

    # Peak-normalize so loudness/mic-gain doesn't dominate the features.
    # Without this, RMS energy is an absolute amplitude that varies wildly with mic
    # distance and input gain — the same "tired" voice reads loud on one device and
    # soft on another. After peak normalization, RMS reflects vocal *fullness/dynamics*
    # (crest factor) rather than how loud the recording happens to be.
    peak = float(np.max(np.abs(y))) if y.size else 0.0
    if peak > 1e-5:
        y = y / peak

    rms = float(
        np.mean(
            librosa.feature.rms(y=y)
        )
    )
    f0, _, _ = librosa.pyin(
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


def _clamp01(x: float) -> float:
    return max(0.0, min(1.0, x))


def classify_mood(features: dict) -> dict:
    """Classify mood from acoustic features using gain-independent scoring.

    The previous version gated each mood behind absolute RMS thresholds, which made
    ``tired`` unreachable on any device with normal mic gain (RMS stayed above the
    cutoff no matter how tired the speaker sounded). This version scores every mood
    from features that are robust to loudness — pitch variation, pauses, and pitch
    register — and picks the highest. RMS (now peak-normalized in ``analyze_audio``)
    is only a secondary signal.
    """
    rms        = float(features.get("rms_energy", 0.0))
    pitch_mean = float(features.get("average_pitch", 0.0))
    pitch_std  = float(features.get("pitch_variation", 0.0))
    silence    = float(features.get("silence_ratio", 0.0))
    zcr        = float(features.get("zero_crossing_rate", 0.0))

    # ── Gain-independent descriptors, each normalized to 0..1 ──────────────
    # Pitch variation: low => monotone (tired/sad), high => expressive (happy/anxious/angry).
    expressive = _clamp01(pitch_std / 45.0)
    monotone   = 1.0 - expressive
    # Pauses: more silence => withdrawn (tired/sad).
    pausey     = _clamp01((silence - 0.20) / 0.45)        # ~0 at 20%, ~1 at 65%
    continuous = 1.0 - pausey
    # Pitch register: high => anxious/excited, low => tired/sad/calm.
    high_pitch = _clamp01((pitch_mean - 150.0) / 100.0)
    low_pitch  = _clamp01((170.0 - pitch_mean) / 120.0)
    # Energy from peak-normalized RMS (crest factor): low => soft/withdrawn, high => animated.
    loud       = _clamp01((rms - 0.08) / 0.17)            # ~0 at .08, ~1 at .25
    soft       = 1.0 - loud
    # Fricative/tense energy.
    tense      = _clamp01((zcr - 0.06) / 0.10)

    # ── Mood scores (weights sum to 1.0 per mood) ──────────────────────────
    scores = {
        "tired":   0.45 * monotone + 0.30 * pausey + 0.15 * soft + 0.10 * low_pitch,
        "sad":     0.30 * soft + 0.30 * pausey + 0.20 * low_pitch + 0.20 * monotone,
        "happy":   0.45 * expressive + 0.30 * loud + 0.15 * continuous + 0.10 * (1.0 - tense),
        "anxious": 0.40 * expressive + 0.35 * high_pitch + 0.25 * tense,
        "angry":   0.40 * loud + 0.30 * tense + 0.30 * expressive,
        "neutral": 0.0,  # baseline — wins only when no mood scores clearly
    }

    # Neutral is the fallback: it scores just below whatever the strongest emotion is,
    # so a clear emotional signal beats it but a weak/ambiguous one doesn't.
    NEUTRAL_FLOOR = 0.50
    scores["neutral"] = NEUTRAL_FLOOR

    ranked = sorted(scores.items(), key=lambda kv: kv[1], reverse=True)
    mood, top_score = ranked[0]
    runner_up_score = ranked[1][1]

    # Confidence from the margin between the top two moods.
    margin = top_score - runner_up_score
    if margin >= 0.15:
        confidence = "high"
    elif margin >= 0.06:
        confidence = "medium"
    else:
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
        "tired": (
            "User's voice is flat and slow — soft volume, monotone pitch, with frequent pauses. "
            "They appear physically or mentally fatigued. Gently acknowledge the tiredness and "
            "suggest taking a short break before continuing with tasks."
        ),
        "sad": (
            "User's voice is quiet and subdued with long pauses — they sound low-energy "
            "and possibly feeling down."
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
        "scores": {k: round(v, 3) for k, v in scores.items()},
        "ai_hint": _hints[mood],
    }

    logger.info(
        "Mood classified | mood=%s conf=%s margin=%.2f | rms=%.3f silence=%.2f "
        "pitch_mean=%.0f pitch_std=%.1f zcr=%.3f | scores=%s",
        mood, confidence, margin, rms, silence, pitch_mean, pitch_std, zcr,
        {k: round(v, 2) for k, v in scores.items()},
    )

    return result