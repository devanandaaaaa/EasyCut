from pathlib import Path

from app.ai.scene_analyzer import analyze_frame
from app.rag.gemini_rag import add_scene
from app.video.frame_extractor import ExtractedFrame


def index_extracted_frames(
    frame_paths: list[str] | list[ExtractedFrame],
    video_file: str,
    interval_seconds: float = 2.0,
) -> list[dict]:
    """
    Analyze extracted frames with Gemini and store their
    semantic representations in ChromaDB.
    """

    indexed_scenes = []

    for index, frame in enumerate(frame_paths):
        if isinstance(frame, ExtractedFrame):
            frame_path = frame.path
            start_time = frame.start_time
            end_time = frame.end_time
        else:
            # Compatibility for callers that still pass path-only frames.
            frame_path = frame
            start_time = index * interval_seconds
            end_time = start_time + interval_seconds

        description = analyze_frame(frame_path)

        scene_id = (
            f"{Path(video_file).stem}_scene_{index:04d}"
        )

        add_scene(
            scene_id=scene_id,
            description=description,
            video_file=video_file,
            start_time=start_time,
            end_time=end_time,
        )

        indexed_scenes.append(
            {
                "scene_id": scene_id,
                "description": description,
                "video_file": video_file,
                "start_time": start_time,
                "end_time": end_time,
            }
        )

    return indexed_scenes
