from pathlib import Path
import subprocess


def assemble_videos(
    clip_paths: list[str],
    output_path: str,
) -> str:
    """
    Join multiple video clips into one continuous video using FFmpeg.
    """

    if not clip_paths:
        raise ValueError("No video clips were provided.")

    for clip_path in clip_paths:
        if not Path(clip_path).exists():
            raise FileNotFoundError(f"Video clip not found: {clip_path}")

    output_file = Path(output_path)
    output_file.parent.mkdir(parents=True, exist_ok=True)

    concat_file = output_file.parent / "concat_list.txt"

    try:
        with concat_file.open("w", encoding="utf-8") as file:
            for clip_path in clip_paths:
                absolute_path = Path(clip_path).resolve()
                safe_path = str(absolute_path).replace("'", "'\\''")
                file.write(f"file '{safe_path}'\n")

        command = [
            "ffmpeg",
            "-y",
            "-f",
            "concat",
            "-safe",
            "0",
            "-i",
            str(concat_file),
            "-c",
            "copy",
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

    finally:
        if concat_file.exists():
            concat_file.unlink()

    return str(output_file)