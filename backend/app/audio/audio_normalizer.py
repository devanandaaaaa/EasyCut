from pathlib import Path
import subprocess


def normalize_audio(
    input_path: str,
    output_path: str,
) -> str:
    """
    Convert an audio file to a standard WAV format
    suitable for downstream processing.
    """

    source = Path(input_path)
    destination = Path(output_path)

    if not source.exists():
        raise FileNotFoundError(f"Audio file not found: {source}")

    destination.parent.mkdir(parents=True, exist_ok=True)

    command = [
        "ffmpeg",
        "-y",
        "-i",
        str(source),
        "-vn",
        "-ac",
        "1",
        "-ar",
        "16000",
        "-c:a",
        "pcm_s16le",
        str(destination),
    ]

    subprocess.run(
        command,
        capture_output=True,
        text=True,
        check=True,
    )

    return str(destination)