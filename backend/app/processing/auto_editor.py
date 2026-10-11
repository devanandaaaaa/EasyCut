from pathlib import Path

from app.ai.gemini_client import understand_story
from app.processing.script_matcher import parse_scene_list
from app.processing.clip_selector import select_distinct_clips
from app.video.renderer import render_video
from app.video.assembler import assemble_videos


def generate_video_from_script(
    script: str,
    source_video: str,
    output_dir: str = "../data/generated",
) -> dict:
    """
    Generate a video automatically from a script and indexed video library.

    Pipeline:
    1. Understand the script with Gemini.
    2. Extract visual scene descriptions.
    3. Select distinct semantic video segments.
    4. Render selected segments.
    5. Assemble them into one final video.
    """

    source_path = Path(source_video)

    if not source_path.exists():
        raise FileNotFoundError(
            f"Source video not found: {source_path}"
        )

    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)

    story_output = understand_story(script)

    script_scenes = parse_scene_list(story_output)

    if not script_scenes:
        raise RuntimeError(
            "Gemini did not return any visual scenes."
        )

    selected_clips = select_distinct_clips(
        script_scenes=script_scenes,
        max_results_per_scene=5,
    )

    rendered_clips = []

    for index, selected in enumerate(selected_clips):
        match = selected["match"]

        clip_path = output_path / f"scene_{index + 1:03d}.mp4"

        render_video(
            video_path=str(
                source_path.parent / match["video_file"]
            ),
            start_time=match["start_time"],
            end_time=match["end_time"],
            output_path=str(clip_path),
        )

        rendered_clips.append(str(clip_path))

    if not rendered_clips:
        raise RuntimeError(
            "No matching video segments were found."
        )

    final_video = output_path / "final_video.mp4"

    assemble_videos(
        clip_paths=rendered_clips,
        output_path=str(final_video),
    )

    return {
        "script": script,
        "story_understanding": story_output,
        "script_scenes": script_scenes,
        "selected_clips": selected_clips,
        "rendered_clips": rendered_clips,
        "final_video": str(final_video),
    }