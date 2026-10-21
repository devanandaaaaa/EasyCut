from dataclasses import dataclass
from pathlib import Path
from moviepy import VideoFileClip


@dataclass(frozen=True)
class ExtractedFrame:
    """A frame image and its exact position/window in the source video."""

    path: str
    start_time: float
    end_time: float


def extract_frame_samples(
    video_path: str,
    output_dir: str,
    interval_seconds: float = 2.0,
) -> list[ExtractedFrame]:
    """Extract frames and retain the source timestamps used to sample them."""
    if interval_seconds <= 0:
        raise ValueError("Frame extraction interval must be greater than zero.")

    video = Path(video_path)
    output = Path(output_dir)

    if not video.exists():
        raise FileNotFoundError(f"Video not found: {video}")

    output.mkdir(parents=True, exist_ok=True)
    samples = []

    with VideoFileClip(str(video)) as clip:
        duration = float(clip.duration or 0)
        current_time = 0.0

        while current_time < duration:
            frame_path = output / f"frame_{len(samples):04d}.jpg"
            clip.save_frame(str(frame_path), t=current_time)
            next_time = min(current_time + interval_seconds, duration)
            samples.append(ExtractedFrame(
                path=str(frame_path),
                start_time=current_time,
                end_time=next_time,
            ))
            current_time = next_time

    return samples


def extract_frames(
    video_path: str,
    output_dir: str,
    interval_seconds: float = 2.0,
) -> list[str]:
    """
    Extract one frame every `interval_seconds` from a video.

    Returns a list containing the paths of the extracted frame images.
    """
    return [sample.path for sample in extract_frame_samples(
        video_path=video_path,
        output_dir=output_dir,
        interval_seconds=interval_seconds,
    )]
