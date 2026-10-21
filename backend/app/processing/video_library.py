
from pathlib import Path

from app.video.frame_extractor import extract_frame_samples
from app.processing.video_indexer import index_extracted_frames
from app.rag.gemini_rag import collection


def video_already_indexed(video_name: str) -> bool:
    """Check whether ChromaDB contains scenes for this video."""

    results = collection.get(
        where={"video_file": video_name},
        limit=1,
    )

    return bool(results.get("ids"))


def index_single_video(
    video_file: str,
    source_dir: str = "../data/source_videos",
    frames_dir: str = "../data/frames",
    interval_seconds: float = 2.0,
    retry_incomplete: bool = False,
) -> dict:
    """
    Index one video. If retry_incomplete=True, index only scene IDs
    that are missing from ChromaDB so interrupted indexing can resume.
    """

    source_path = Path(source_dir).resolve()
    frames_path = Path(frames_dir).resolve()
    video_path = source_path / Path(video_file).name

    if not video_path.is_file():
        raise FileNotFoundError(
            f"Source video not found: {video_path}"
        )

    existing = collection.get(
        where={"video_file": video_path.name},
    )
    existing_ids = set(existing.get("ids", []))

    video_frames_dir = frames_path / video_path.stem

    frame_samples = extract_frame_samples(
        video_path=str(video_path),
        output_dir=str(video_frames_dir),
        interval_seconds=interval_seconds,
    )

    # Keep frame-to-scene IDs consistent with video_indexer.py.
    missing_frames = []

    for index, frame in enumerate(frame_samples):
        scene_id = f"{video_path.stem}_scene_{index:04d}"

        if retry_incomplete and scene_id in existing_ids:
            continue

        missing_frames.append((index, frame))

    indexed_scenes = []

    for index, frame in missing_frames:
        # Index one frame at a time so a quota error doesn't prevent
        # later retries from preserving already indexed scenes.
        from app.ai.scene_analyzer import analyze_frame
        from app.rag.gemini_rag import add_scene

        description = analyze_frame(frame.path)
        start_time = frame.start_time
        end_time = frame.end_time
        scene_id = f"{video_path.stem}_scene_{index:04d}"

        add_scene(
            scene_id=scene_id,
            description=description,
            video_file=video_path.name,
            start_time=start_time,
            end_time=end_time,
        )

        indexed_scenes.append(
            {
                "scene_id": scene_id,
                "description": description,
                "video_file": video_path.name,
                "start_time": start_time,
                "end_time": end_time,
            }
        )

    return {
        "video_file": video_path.name,
        "frame_count": len(frame_samples),
        "previously_indexed_scene_count": len(existing_ids),
        "newly_indexed_scene_count": len(indexed_scenes),
        "remaining_scene_count": max(
            0,
            len(frame_samples) - len(existing_ids) - len(indexed_scenes),
        ),
        "status": (
            "indexed"
            if len(existing_ids) + len(indexed_scenes) >= len(frame_samples)
            else "incomplete"
        ),
    }


def index_video_library(
    source_dir: str = "../data/source_videos",
    frames_dir: str = "../data/frames",
    interval_seconds: float = 2.0,
) -> list[dict]:
    """Index MP4 videos that are not fully indexed."""

    source_path = Path(source_dir).resolve()
    frames_path = Path(frames_dir).resolve()

    if not source_path.exists():
        raise FileNotFoundError(
            f"Source video directory not found: {source_path}"
        )

    video_files = sorted(source_path.glob("*.mp4"))

    if not video_files:
        raise ValueError(
            f"No MP4 videos found in {source_path}"
        )

    results = []

    for video_path in video_files:
        existing = collection.get(
            where={"video_file": video_path.name},
        )

        if existing.get("ids"):
            results.append(
                {
                    "video_file": video_path.name,
                    "status": "already_indexed",
                    "scene_count": len(existing["ids"]),
                }
            )
            continue

        results.append(
            index_single_video(
                video_file=video_path.name,
                source_dir=str(source_path),
                frames_dir=str(frames_path),
                interval_seconds=interval_seconds,
            )
        )

    return results
