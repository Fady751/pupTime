import logging
import librosa
import numpy as np

logger = logging.getLogger(__name__)


def analyze_audio(audio_path: str) -> dict:
    y, sr = librosa.load(audio_path, sr=16000)

    peak = float(np.max(np.abs(y))) if y.size else 0.0
    if peak > 1e-5:
        y = y / peak

    # Energy 
    rms_frames = librosa.feature.rms(y=y)[0]
    rms = float(np.mean(rms_frames))

    # Energy trend: average RMS of second half vs first half.
    if len(rms_frames) > 4:
        mid = len(rms_frames) // 2
        energy_trend = float(np.mean(rms_frames[mid:]) - np.mean(rms_frames[:mid]))
    else:
        energy_trend = 0.0

    # Pitch 
    f0, _, _ = librosa.pyin(y, fmin=75, fmax=500)
    valid_f0 = f0[~np.isnan(f0)]

    pitch_mean  = float(np.mean(valid_f0))               if len(valid_f0) > 0 else 0.0
    pitch_std   = float(np.std(valid_f0))                if len(valid_f0) > 0 else 0.0
    pitch_range = float(np.max(valid_f0) - np.min(valid_f0)) if len(valid_f0) > 1 else 0.0

    # Duration , silence 
    duration = librosa.get_duration(y=y, sr=sr)
    intervals = librosa.effects.split(y, top_db=25)
    speech_samples = sum(end - start for start, end in intervals)
    silence_ratio = 1.0 - (speech_samples / len(y)) if len(y) > 0 else 0.0
    speech_burst_count = int(len(intervals))

    #  Speaking rate (syllable-rate proxy via onset detection) 
    speech_duration = speech_samples / sr if speech_samples > 0 else duration
    if speech_duration > 0.5:
        onsets = librosa.onset.onset_detect(y=y, sr=sr, units="time")
        speaking_rate = float(len(onsets) / speech_duration)
    else:
        speaking_rate = 0.0

    #  Spectral features 
    zcr               = float(np.mean(librosa.feature.zero_crossing_rate(y)))
    spectral_centroid = float(np.mean(librosa.feature.spectral_centroid(y=y, sr=sr)))
    # Spectral flatness: 0 = pure tone (clean resonant voice), 1 = white noise.
    # A tired, breathy, or strained voice scores higher — more noise-like.
    spectral_flatness = float(np.mean(librosa.feature.spectral_flatness(y=y)))

    features = {
        "rms_energy":         rms,
        "energy_trend":       energy_trend,
        "average_pitch":      pitch_mean,
        "pitch_variation":    pitch_std,
        "pitch_range":        pitch_range,
        "silence_ratio":      silence_ratio,
        "speech_burst_count": speech_burst_count,
        "speaking_rate":      speaking_rate,
        "zero_crossing_rate": zcr,
        "spectral_centroid":  spectral_centroid,
        "spectral_flatness":  spectral_flatness,
        "duration_seconds":   duration,
    }

    logger.debug(
        "Voice acoustic features | rms=%.4f trend=%.4f pitch=%.1f±%.1f range=%.1f "
        "silence=%.2f rate=%.1f/s bursts=%d flatness=%.3f zcr=%.4f dur=%.2fs",
        rms, energy_trend, pitch_mean, pitch_std, pitch_range,
        silence_ratio, speaking_rate, speech_burst_count,
        spectral_flatness, zcr, duration,
    )

    return features


def _clamp01(x: float) -> float:
    return max(0.0, min(1.0, x))


def _build_hint(mood: str, confidence: str, features: dict) -> str:
    rms           = float(features.get("rms_energy", 0.0))
    pitch_std     = float(features.get("pitch_variation", 0.0))
    pitch_range   = float(features.get("pitch_range", 0.0))
    silence       = float(features.get("silence_ratio", 0.0))
    speaking_rate = float(features.get("speaking_rate", 2.5))
    flatness      = float(features.get("spectral_flatness", 0.1))
    energy_trend  = float(features.get("energy_trend", 0.0))
    burst_count   = int(features.get("speech_burst_count", 1))

    cues = []

    if rms < 0.12:
        cues.append("soft volume")
    elif rms > 0.22:
        cues.append("raised volume")

    if pitch_std < 12 or pitch_range < 35:
        cues.append("very flat/monotone pitch")
    elif pitch_std > 35 or pitch_range > 120:
        cues.append("wide expressive pitch swings")

    if speaking_rate < 1.5:
        cues.append("very slow speaking pace")
    elif speaking_rate < 2.2:
        cues.append("slower than average speaking pace")
    elif speaking_rate > 5.0:
        cues.append("rapid speaking pace")

    if silence > 0.55:
        cues.append("many long pauses")
    elif silence > 0.35:
        cues.append("frequent short pauses")

    if flatness > 0.25:
        cues.append("breathy or strained vocal quality")

    if energy_trend < -0.08:
        cues.append("voice trails off / loses energy toward end")
    elif energy_trend > 0.08:
        cues.append("voice builds energy over the message")

    if burst_count >= 8 and silence > 0.35:
        cues.append("choppy/fragmented delivery")

    cue_str = ", ".join(cues) if cues else "no strongly distinctive cues"
    conf_str = f"confidence: {confidence}"

    intros = {
        "tired":   f"Acoustic signals suggest FATIGUE or LOW ENERGY ({conf_str})",
        "sad":     f"Acoustic signals suggest LOW MOOD ({conf_str})",
        "happy":   f"Acoustic signals suggest POSITIVE/ENERGETIC state ({conf_str})",
        "anxious": f"Acoustic signals suggest ANXIETY or STRESS ({conf_str})",
        "angry":   f"Acoustic signals suggest FRUSTRATION or HIGH TENSION ({conf_str})",
        "neutral": f"No strong emotional acoustic signal detected ({conf_str})",
    }

    action_notes = {
        "tired":   " Gently acknowledge if tiredness is apparent; avoid piling on tasks.",
        "sad":     " Respond with warmth and low pressure.",
        "happy":   " User seems ready to engage.",
        "anxious": " Keep responses calm, clear, and simple.",
        "angry":   " Acknowledge feelings before moving to tasks.",
        "neutral": "",
    }

    intro = intros.get(mood, f"Acoustic mood: {mood} ({conf_str})")
    note  = action_notes.get(mood, "")
    return f"{intro}. Observed: {cue_str}.{note}"


def classify_mood(features: dict) -> dict:
    rms           = float(features.get("rms_energy", 0.0))
    energy_trend  = float(features.get("energy_trend", 0.0))
    pitch_mean    = float(features.get("average_pitch", 0.0))
    pitch_std     = float(features.get("pitch_variation", 0.0))
    pitch_range   = float(features.get("pitch_range", 0.0))
    silence       = float(features.get("silence_ratio", 0.0))
    speaking_rate = float(features.get("speaking_rate", 2.5))
    flatness      = float(features.get("spectral_flatness", 0.1))
    zcr           = float(features.get("zero_crossing_rate", 0.06))

    expressive = _clamp01(pitch_std / 45.0)
    monotone   = 1.0 - expressive

    # Pitch range: wide => expressive/happy/anxious; narrow => flat/tired/sad
    wide_range = _clamp01((pitch_range - 40.0) / 100.0)   # 0 at 40 Hz, 1 at 140 Hz

    # Pauses: more silence => withdrawn (tired/sad)
    pausey     = _clamp01((silence - 0.20) / 0.45)        # ~0 at 20%, ~1 at 65%
    continuous = 1.0 - pausey

    # Pitch register: high => anxious/excited; low => tired/sad/calm
    high_pitch = _clamp01((pitch_mean - 150.0) / 100.0)
    low_pitch  = _clamp01((170.0 - pitch_mean) / 120.0)

    # Energy (peak-normalized RMS / crest factor): low => withdrawn; high => animated
    loud = _clamp01((rms - 0.08) / 0.17)
    soft = 1.0 - loud

    # Fricative/tense energy from ZCR
    tense = _clamp01((zcr - 0.06) / 0.10)

    # Speaking pace: slow => tired/sad; fast => anxious
    slow_speech = _clamp01((2.5 - speaking_rate) / 1.5)   # 1 at ≤1.0/s, 0 at ≥2.5/s
    fast_speech = _clamp01((speaking_rate - 3.5) / 2.0)   # 0 at ≤3.5/s, 1 at ≥5.5/s

    # Vocal breathiness (spectral flatness): high => tired/strained voice quality
    breathy = _clamp01((flatness - 0.05) / 0.20)          # 0 at 0.05, 1 at 0.25

    # Energy trajectory: voice trailing off => building fatigue
    trailing_off = _clamp01(-energy_trend / 0.10)
    building_up  = _clamp01(energy_trend / 0.10)

    scores = {
        "tired":   (0.25 * monotone + 0.20 * pausey   + 0.15 * slow_speech
                  + 0.15 * breathy  + 0.10 * trailing_off + 0.10 * soft + 0.05 * low_pitch),
        "sad":     (0.25 * soft     + 0.25 * pausey   + 0.20 * slow_speech
                  + 0.15 * low_pitch + 0.15 * monotone),
        "happy":   (0.35 * expressive + 0.20 * loud   + 0.20 * wide_range
                  + 0.15 * continuous + 0.10 * building_up),
        "anxious": (0.30 * expressive + 0.25 * fast_speech
                  + 0.25 * high_pitch + 0.20 * tense),
        "angry":   (0.40 * loud + 0.30 * tense + 0.30 * expressive),
        "neutral": 0.0,
    }

    NEUTRAL_FLOOR = 0.50
    scores["neutral"] = NEUTRAL_FLOOR

    ranked = sorted(scores.items(), key=lambda kv: kv[1], reverse=True)
    mood, top_score = ranked[0]
    runner_up_score = ranked[1][1]

    margin = top_score - runner_up_score
    if margin >= 0.15:
        confidence = "high"
    elif margin >= 0.06:
        confidence = "medium"
    else:
        confidence = "low"

    result = {
        "mood":       mood,
        "confidence": confidence,
        "features":   features,
        "scores":     {k: round(v, 3) for k, v in scores.items()},
        "ai_hint":    _build_hint(mood, confidence, features),
    }

    logger.info(
        "Mood classified | mood=%s conf=%s margin=%.2f | "
        "rms=%.3f trend=%.4f silence=%.2f rate=%.1f/s "
        "pitch_std=%.1f range=%.1f flatness=%.3f | scores=%s",
        mood, confidence, margin,
        rms, energy_trend, silence, speaking_rate,
        pitch_std, pitch_range, flatness,
        {k: round(v, 2) for k, v in scores.items()},
    )

    return result