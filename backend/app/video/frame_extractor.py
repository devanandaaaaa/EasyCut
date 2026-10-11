from pathlib import Path
from moviepy import VideoFileClip


def extract_frames(
    video_path: str,
    output_dir: str,
    interval_seconds: float = 2.0,
) -> list[str]:
    """
    Extract one frame every `interval_seconds` from a video.

    Returns a list containing the paths of the extracted frame images.
    """

    video = Path(video_path)
    output = Path(output_dir)

    if not video.exists():
        raise FileNotFoundError(f"Video not found: {video}")

    output.mkdir(parents=True, exist_ok=True)

    frame_paths = []

    with VideoFileClip(str(video)) as clip:
        duration = clip.duration

        current_time = 0.0

        while current_time < duration:
            frame_path = output / f"frame_{len(frame_paths):04d}.jpg"

            clip.save_frame(
                str(frame_path),
                t=current_time,
            )

            frame_paths.append(str(frame_path))
            current_time += interval_seconds

    return frame_paths