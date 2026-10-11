import json
import subprocess
from pathlib import Path


SUPPORTED_AUDIO_EXTENSIONS = {
    ".mp3",
    ".wav",
    ".m4a",
    ".aac",
    ".ogg",
    ".webm",
}


def get_audio_info(audio_path: str) -> dict:
    """
    Read basic audio information using FFprobe.
    """

    path = Path(audio_path)

    if not path.exists():
        raise FileNotFoundError(f"Audio file not found: {path}")

    if path.suffix.lower() not in SUPPORTED_AUDIO_EXTENSIONS:
        raise ValueError(
            f"Unsupported audio format: {path.suffix}. "
            f"Supported formats: {sorted(SUPPORTED_AUDIO_EXTENSIONS)}"
        )

    command = [
        "ffprobe",
        "-v",
        "error",
        "-show_entries",
        "format=duration,format_name",
        "-show_entries",
        "stream=codec_name,sample_rate,channels",
        "-of",
        "json",
        str(path),
    ]

    result = subprocess.run(
        command,
        capture_output=True,
        text=True,
        check=True,
    )

    data = json.loads(result.stdout)

    format_info = data.get("format", {})
    audio_stream = next(
        (
            stream
            for stream in data.get("streams", [])
            if stream.get("codec_name")
        ),
        {},
    )

    return {
        "filename": path.name,
        "format": format_info.get("format_name"),
        "duration": float(format_info["duration"])
        if format_info.get("duration")
        else None,
        "codec": audio_stream.get("codec_name"),
        "sample_rate": int(audio_stream["sample_rate"])
        if audio_stream.get("sample_rate")
        else None,
        "channels": int(audio_stream["channels"])
        if audio_stream.get("channels")
        else None,
    }