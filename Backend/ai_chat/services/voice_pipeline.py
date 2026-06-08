import io
import logging
import os
import subprocess
import tempfile

logger = logging.getLogger(__name__)


class AudioConversionError(Exception):
    pass


def convert_to_mp3(audio_bytes: bytes) -> bytes:
    try:
        with tempfile.NamedTemporaryFile(delete=False) as f_in, tempfile.NamedTemporaryFile(suffix='.mp3', delete=False) as f_out:
            f_in.write(audio_bytes)
            f_in.flush()
            subprocess.run(
                ['ffmpeg', '-y', '-i', f_in.name, '-c:a', 'libmp3lame', '-q:a', '2', f_out.name],
                stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True
            )
            with open(f_out.name, 'rb') as f:
                converted = f.read()
        os.unlink(f_in.name)
        os.unlink(f_out.name)
        return converted
    except Exception as e:
        raise AudioConversionError(str(e)) from e


def compute_acoustic_hint(audio_bytes: bytes) -> str | None:
    # Run librosa acoustic analysis to extract quantitative features (RMS, silence,
    # pitch variation, etc.) and produce a plain-English hint. The hint is injected
    # alongside the raw audio so Gemini has both its native audio understanding AND
    # an explicit acoustic signal — it still makes the final emotional judgement.
    acoustic_hint: str | None = None
    try:
        import soundfile as _sf
        import numpy as _np
        from .voice import analyze_audio as _analyze_audio, classify_mood as _classify_mood

        def _load_bytes_as_float32(b: bytes):
            try:
                data, sr = _sf.read(io.BytesIO(b), dtype="float32", always_2d=False)
                if data.ndim == 2:
                    data = data.mean(axis=1)
                return _np.asarray(data, dtype=_np.float32), int(sr)
            except Exception:
                return None, None

        wav_data, wav_sr = _load_bytes_as_float32(audio_bytes)
        if wav_data is not None:
            with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as _tmp:
                _sf.write(_tmp.name, wav_data, wav_sr)
                _features = _analyze_audio(_tmp.name)
            try:
                os.unlink(_tmp.name)
            except OSError:
                pass
            _acoustic = _classify_mood(_features)
            acoustic_hint = _acoustic.get("ai_hint")
    except Exception as _e:
        logger.debug("Acoustic analysis skipped: %s", _e)
    return acoustic_hint
