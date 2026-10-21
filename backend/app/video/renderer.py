from pathlib import Path
from fractions import Fraction
import json
import logging
import subprocess

logger = logging.getLogger(__name__)
STREAM_DURATION_TOLERANCE = 0.1


def probe_media_stream_durations(path: str | Path) -> dict[str, float | None]:
    """Read audio and video stream durations independently with ffprobe."""
    probe = subprocess.run(
        [
            "ffprobe", "-v", "error", "-show_entries",
            "stream=codec_type,duration,duration_ts,time_base,avg_frame_rate",
            "-show_entries", "format=duration", "-of", "json", str(path),
        ],
        check=True,
        capture_output=True,
        text=True,
    )
    metadata = json.loads(probe.stdout)
    durations: dict[str, float | None] = {"video": None, "audio": None}
    present_streams = set()
    for stream in metadata.get("streams", []):
        kind = stream.get("codec_type")
        if kind not in durations:
            continue
        present_streams.add(kind)
        try:
            duration = float(stream["duration"])
        except (KeyError, TypeError, ValueError):
            try:
                duration = float(stream["duration_ts"]) * float(Fraction(stream["time_base"]))
            except (KeyError, TypeError, ValueError, ZeroDivisionError):
                continue
        if duration > 0:
            durations[kind] = max(durations[kind] or 0.0, duration)

    # Some containers omit stream duration. Use format metadata only as a
    # documented fallback, keeping the result shape explicit.
    if any(durations[kind] is None for kind in present_streams):
        try:
            format_duration = float(metadata.get("format", {}).get("duration"))
        except (TypeError, ValueError):
            format_duration = 0.0
        for kind in present_streams:
            duration = durations[kind]
            if duration is None and format_duration > 0:
                durations[kind] = format_duration
    return durations

def probe_media_duration(path: str | Path) -> float:
    """Return container duration from ffprobe metadata, rejecting invalid media."""
    probe = subprocess.run(
        [
            "ffprobe", "-v", "error", "-show_entries", "format=duration",
            "-of", "default=noprint_wrappers=1:nokey=1", str(path),
        ],
        check=True,
        capture_output=True,
        text=True,
    )
    duration = float(probe.stdout.strip())
    if duration <= 0:
        raise ValueError(f"Could not determine media duration: {path}")
    return duration


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

    source_streams = probe_media_stream_durations(video_file)
    audio_streams = probe_media_stream_durations(voiceover_file)
    video_duration = source_streams["video"]
    voiceover_duration = audio_streams["audio"]
    if not video_duration or not voiceover_duration:
        raise ValueError("Could not determine voiceover audio and visual stream durations.")
    if video_duration + STREAM_DURATION_TOLERANCE < voiceover_duration:
        raise ValueError(
            f"Visual sequence is {video_duration:.3f}s but narration is "
            f"{voiceover_duration:.3f}s; extend the sequence before muxing."
        )

    logger.info(
        "Voiceover mux input durations: video_stream=%.3fs audio_stream=%.3fs "
        "trim_visual_tail=%.3fs",
        video_duration,
        voiceover_duration,
        max(0.0, video_duration - voiceover_duration),
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
    ]

    command.extend([
        "-t", f"{voiceover_duration:.6f}",
        "-fps_mode", "cfr",
        "-r", "30",
        "-c:v", "libx264",
        "-preset", "medium",
        "-crf", "18",
        "-pix_fmt", "yuv420p",
        "-c:a", "aac",
        "-b:a", "192k",
        "-movflags",
        "+faststart",
        str(output_file),
    ])

    subprocess.run(
        command,
        check=True,
        capture_output=True,
        text=True,
    )

    final_streams = probe_media_stream_durations(output_file)
    final_video_duration = final_streams["video"]
    final_audio_duration = final_streams["audio"]
    logger.info(
        "Voiceover mux output durations: video_stream=%s audio_stream=%s",
        f"{final_video_duration:.3f}s" if final_video_duration else "unavailable",
        f"{final_audio_duration:.3f}s" if final_audio_duration else "unavailable",
    )
    if (
        not final_video_duration
        or not final_audio_duration
        or abs(final_video_duration - final_audio_duration) > STREAM_DURATION_TOLERANCE
        or final_video_duration + STREAM_DURATION_TOLERANCE < voiceover_duration
    ):
        output_file.unlink(missing_ok=True)
        raise RuntimeError(
            "Final voiceover export has mismatched audio/video stream durations "
            f"(video={final_video_duration}, audio={final_audio_duration}, "
            f"narration={voiceover_duration:.3f}s)."
        )

    return str(output_file)
