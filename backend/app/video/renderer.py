from pathlib import Path
import subprocess


def render_video(
    video_path: str,
    start_time: float,
    end_time: float,
    output_path: str,
) -> str:
    """
    Extract a selected segment from a video using FFmpeg.
    """

    input_file = Path(video_path)
    output_file = Path(output_path)

    if not input_file.exists():
        raise FileNotFoundError(f"Video not found: {input_file}")

    if end_time <= start_time:
        raise ValueError("end_time must be greater than start_time")

    output_file.parent.mkdir(parents=True, exist_ok=True)

    duration = end_time - start_time

    command = [
        "ffmpeg",
        "-y",
        "-ss",
        str(start_time),
        "-i",
        str(input_file),
        "-t",
        str(duration),
        "-c:v",
        "libx264",
        "-c:a",
        "aac",
        "-movflags",
        "+faststart",
        str(output_file),
    ]

    subprocess.run(
        command,
        check=True,
        capture_output=True,
        text=True,
    )

    return str(output_file)

def add_voiceover(
    video_path: str,
    voiceover_path: str,
    output_path: str,
) -> str:
    """
    Add the original voiceover to a generated video using FFmpeg.
    """

    video_file = Path(video_path)
    voiceover_file = Path(voiceover_path)
    output_file = Path(output_path)

    if not video_file.exists():
        raise FileNotFoundError(
            f"Video not found: {video_file}"
        )

    if not voiceover_file.exists():
        raise FileNotFoundError(
            f"Voiceover not found: {voiceover_file}"
        )

    output_file.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    command = [
        "ffmpeg",
        "-y",
        "-i",
        str(video_file),
        "-i",
        str(voiceover_file),
        "-map",
        "0:v:0",
        "-map",
        "1:a:0",
        "-c:v",
        "copy",
        "-c:a",
        "aac",
        "-shortest",
        "-movflags",
        "+faststart",
        str(output_file),
    ]

    subprocess.run(
        command,
        check=True,
        capture_output=True,
        text=True,
    )

    return str(output_file)