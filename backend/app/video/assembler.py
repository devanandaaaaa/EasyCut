from pathlib import Path
import subprocess


def assemble_videos(
    clip_paths: list[str],
    output_path: str,
    normalize_video: bool = False,
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

    if normalize_video:
        command = ["ffmpeg", "-y"]
        for clip_path in clip_paths:
            command.extend(["-i", str(Path(clip_path).resolve())])
        graph_parts = []
        video_labels = []
        for index in range(len(clip_paths)):
            label = f"v{index}"
            graph_parts.append(
                f"[{index}:v:0]setpts=PTS-STARTPTS,"
                "scale=1280:720:force_original_aspect_ratio=decrease,"
                "pad=1280:720:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=30,"
                f"format=yuv420p[{label}]"
            )
            video_labels.append(f"[{label}]")
        graph_parts.append(
            f"{''.join(video_labels)}concat=n={len(clip_paths)}:v=1:a=0[outv]"
        )
        command.extend([
            "-filter_complex", ";".join(graph_parts),
            "-map", "[outv]", "-an", "-c:v", "libx264", "-preset", "medium",
            "-crf", "20", "-r", "30", "-fps_mode", "cfr",
            "-pix_fmt", "yuv420p", "-movflags", "+faststart", str(output_file),
        ])
        subprocess.run(command, check=True, capture_output=True, text=True)
        return str(output_file)

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
