from pathlib import Path

from app.video.frame_extractor import extract_frames
from app.processing.video_indexer import index_extracted_frames
from app.rag.gemini_rag import collection


def video_already_indexed(video_name: str) -> bool:
    """
    Check whether ChromaDB already contains scenes for this video.
    """

    results = collection.get(
        where={"video_file": video_name},
        limit=1,
    )

    return bool(results.get("ids"))


def index_video_library(
    source_dir: str = "../data/source_videos",
    frames_dir: str = "../data/frames",
    interval_seconds: float = 2.0,
) -> list[dict]:
    """
    Find source videos and index only videos that have not
    already been indexed.
    """

    source_path = Path(source_dir)
    frames_path = Path(frames_dir)

    if not source_path.exists():
        raise FileNotFoundError(
            f"Source video directory not found: {source_path}"
        )

    video_files = sorted(source_path.glob("*.mp4"))

    if not video_files:
        raise ValueError(
            f"No MP4 videos found in {source_path}"
        )

    indexed_videos = []

    for video_file in video_files:

        if video_already_indexed(video_file.name):
            print(
                f"Skipping already indexed video: "
                f"{video_file.name}"
            )

            indexed_videos.append(
                {
                    "video_file": video_file.name,
                    "status": "already_indexed",
                }
            )

            continue

        video_frames_dir = frames_path / video_file.stem

        frame_paths = extract_frames(
            video_path=str(video_file),
            output_dir=str(video_frames_dir),
            interval_seconds=interval_seconds,
        )

        scenes = index_extracted_frames(
            frame_paths=frame_paths,
            video_file=video_file.name,
            interval_seconds=interval_seconds,
        )

        indexed_videos.append(
            {
                "video_file": video_file.name,
                "frame_count": len(frame_paths),
                "scene_count": len(scenes),
                "status": "indexed",
            }
        )

    return indexed_videos