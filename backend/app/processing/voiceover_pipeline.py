from pathlib import Path

from app.audio.audio_normalizer import normalize_audio
from app.audio.voiceover_analyzer import analyze_voiceover
from app.processing.clip_selector import select_distinct_clips
from app.video.renderer import add_voiceover, render_video
from app.video.assembler import assemble_videos


def generate_video_from_voiceover(
    voiceover_path: str,
    output_dir: str = "../data/generated",
) -> dict:
    """
    Generate a video automatically from a voiceover.

    Pipeline:
    1. Normalize voiceover.
    2. Analyze voiceover with Gemini.
    3. Extract chronological story beats.
    4. Semantically match story beats to indexed video scenes.
    5. Render selected clips.
    6. Assemble clips.
    7. Add the original voiceover.
    """

    source_audio = Path(voiceover_path)

    if not source_audio.exists():
        raise FileNotFoundError(
            f"Voiceover file not found: {source_audio}"
        )

    output_path = Path(output_dir)
    output_path.mkdir(
        parents=True,
        exist_ok=True,
    )
    project_root = Path(__file__).resolve().parents[3]
    source_videos_dir = project_root / "data" / "source_videos"

    # ---------------------------------------------------------
    # 1. Normalize the voiceover
    # ---------------------------------------------------------

    normalized_audio = output_path / "normalized_voiceover.wav"

    normalize_audio(
        input_path=str(source_audio),
        output_path=str(normalized_audio),
    )

    # ---------------------------------------------------------
    # 2. Understand the voiceover
    # ---------------------------------------------------------

    voiceover_analysis = analyze_voiceover(
        str(normalized_audio)
    )

    # ---------------------------------------------------------
    # 3. Extract visual concepts from story beats
    # ---------------------------------------------------------

    story_beats = voiceover_analysis["story_beats"]

    visual_concepts = [
        beat["visual_concept"]
        for beat in story_beats
    ]

    if not visual_concepts:
        raise RuntimeError(
            "No visual story beats were generated."
        )

    # ---------------------------------------------------------
    # 4. Match story beats to video scenes
    # ---------------------------------------------------------

    selected_clips = select_distinct_clips(
        script_scenes=visual_concepts,
        max_results_per_scene=5,
    )

    if not selected_clips:
        raise RuntimeError(
            "No matching video clips were found."
        )

    # ---------------------------------------------------------
    # 5. Render selected clips
    # ---------------------------------------------------------

    rendered_clips = []

    for index, selected in enumerate(selected_clips, start=1):

        match = selected["match"]

        source_video = (
            source_videos_dir
            / match["video_file"]
        )

        clip_path = (
            output_path
            / f"scene_{index:03d}.mp4"
        )

        render_video(
            video_path=str(source_video),
            start_time=match["start_time"],
            end_time=match["end_time"],
            output_path=str(clip_path),
        )

        rendered_clips.append(str(clip_path))

    if not rendered_clips:
        raise RuntimeError(
            "No video clips were rendered."
        )

    # ---------------------------------------------------------
    # 6. Assemble the selected clips
    # ---------------------------------------------------------

    assembled_video = (
        output_path / "assembled_video.mp4"
    )

    assemble_videos(
        clip_paths=rendered_clips,
        output_path=str(assembled_video),
    )

    # ---------------------------------------------------------
    # 7. Add the original voiceover
    # ---------------------------------------------------------

    final_video = (
        output_path / "final_video.mp4"
    )

    add_voiceover(
        video_path=str(assembled_video),
        voiceover_path=str(normalized_audio),
        output_path=str(final_video),
    )

    return {
        "voiceover_analysis": voiceover_analysis,
        "selected_clips": selected_clips,
        "rendered_clips": rendered_clips,
        "assembled_video": str(assembled_video),
        "final_video": str(final_video),
    }