
from pathlib import Path
from uuid import uuid4

from app.ai.gemini_client import understand_story
from app.processing.script_matcher import parse_scene_list
from app.processing.clip_selector import select_distinct_clips
from app.video.renderer import render_video
from app.video.assembler import assemble_videos


def generate_video_from_script(
    script: str,
    source_video: str | None = None,
    source_videos: list[str] | None = None,
    output_dir: str = "../data/generated",
) -> dict:
    """Generate a video using only the videos selected for this project."""

    allowed_paths = source_videos or (
        [source_video] if source_video else []
    )

    if not allowed_paths:
        raise ValueError("Please upload at least one source video.")

    source_root = (Path(__file__).resolve().parents[3] / "data" / "source_videos").resolve()
    validated_paths = []

    for video in allowed_paths:
        path = Path(video).resolve()

        if path.parent != source_root:
            raise ValueError("Source videos must be selected from this project's uploaded footage.")

        if not path.is_file():
            raise FileNotFoundError(f"Source video not found: {path}")

        validated_paths.append(path)

    allowed_filenames = [path.name for path in validated_paths]
    allowed_directories = {
        path.name: path.parent for path in validated_paths
    }

    output_path = Path(output_dir).resolve()
    output_path.mkdir(parents=True, exist_ok=True)

    generation_id = uuid4().hex[:12]
    story_output = understand_story(script)
    script_scenes = parse_scene_list(story_output)

    if not script_scenes:
        raise RuntimeError("Gemini did not return any visual scenes.")

    selected_clips = select_distinct_clips(
        script_scenes=script_scenes,
        max_results_per_scene=5,
        video_files=allowed_filenames,
    )

    print(f"Uploaded videos: {allowed_filenames}")
    print(f"Script scenes: {len(script_scenes)}")
    print(f"Selected clips: {len(selected_clips)}")

    for item in selected_clips:
        match = item["match"]
        print(
            f"Scene {item['scene_number']}: "
            f"{match['video_file']} "
            f"({match['start_time']} - {match['end_time']})"
        )

    rendered_clips = []

    for index, selected in enumerate(selected_clips):
        match = selected["match"]
        matched_filename = match["video_file"]

        if matched_filename not in allowed_directories:
            raise RuntimeError(
                f"Selected scene is not from an uploaded video: "
                f"{matched_filename}"
            )

        clip_path = output_path / (
            f"scene_{generation_id}_{index + 1:03d}.mp4"
        )

        render_video(
            video_path=str(
                allowed_directories[matched_filename] / matched_filename
            ),
            start_time=match["start_time"],
            end_time=match["end_time"],
            output_path=str(clip_path),
        )

        rendered_clips.append(str(clip_path))

    if not rendered_clips:
        raise RuntimeError(
            "No matching scenes were found in the uploaded videos. "
            "Try a different script or upload videos that match it."
        )

    final_video = output_path / f"final_video_{generation_id}.mp4"

    assemble_videos(
        clip_paths=rendered_clips,
        output_path=str(final_video),
    )


    return {
        "generation_id": generation_id,
        "script": script,
        "story_understanding": story_output,
        "script_scenes": script_scenes,
        "uploaded_video_count": len(validated_paths),
        "selected_clip_count": len(selected_clips),
        "unique_selected_video_count": len({
            item["match"]["video_file"]
            for item in selected_clips
        }),
        "selected_clips": selected_clips,
        "rendered_clips": rendered_clips,
        "final_video": str(final_video),
    }
