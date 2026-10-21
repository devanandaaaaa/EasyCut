
from pathlib import Path
from uuid import uuid4
import logging
import math

from app.audio.audio_normalizer import normalize_audio
from app.audio.voiceover_analyzer import analyze_voiceover
from app.processing.clip_selector import select_additional_clips, select_distinct_clips
from app.video.renderer import (
    add_voiceover,
    probe_media_duration,
    probe_media_stream_durations,
    render_video,
)
from app.video.assembler import assemble_videos
from app.video.sequence import plan_selected_repeats

logger = logging.getLogger(__name__)


def generate_video_from_voiceover(
    voiceover_path: str,
    source_videos: list[str] | None = None,
    output_dir: str = "../data/generated",
) -> dict:
    """
    Generate a new video from a voiceover.

    Each run receives unique output filenames so different projects
    cannot overwrite one another's generated videos.
    """

    source_audio = Path(voiceover_path).resolve()

    if not source_audio.is_file():
        raise FileNotFoundError(
            f"Voiceover file not found: {source_audio}"
        )

    output_path = Path(output_dir).resolve()
    output_path.mkdir(parents=True, exist_ok=True)

    project_root = Path(__file__).resolve().parents[3]
    source_videos_dir = project_root / "data" / "source_videos"

    # Require an explicit selection so shared-index results from previous
    # uploads cannot silently become source footage for this project.
    if not source_videos:
        raise ValueError("Please select at least one source video.")

    allowed_video_names = []
    source_root = source_videos_dir.resolve()
    for selected_video in source_videos:
        candidate = Path(selected_video)
        candidate = candidate if candidate.is_absolute() else source_root / candidate
        candidate = candidate.resolve()
        if candidate.parent != source_root or not candidate.is_file():
            raise FileNotFoundError(
                f"Selected source video is missing or invalid: {selected_video}"
            )
        if candidate.name not in allowed_video_names:
            allowed_video_names.append(candidate.name)

    # Unique ID for this generation. Keep files directly inside the
    # generated directory so the existing /generated/<filename> URL works.
    run_id = uuid4().hex

    normalized_audio = output_path / f"{run_id}_voiceover.wav"
    assembled_video = output_path / f"{run_id}_assembled.mp4"
    final_video = output_path / f"{run_id}_final.mp4"

    rendered_clips = []
    repeated_clips = []
    rendered_sources = {}
    scene_match_rank = {}

    try:
        # 1. Normalize this run's voiceover.
        normalize_audio(
            input_path=str(source_audio),
            output_path=str(normalized_audio),
        )

        if not normalized_audio.is_file() or normalized_audio.stat().st_size == 0:
            raise RuntimeError("Voiceover normalization produced no audio file.")

        # 2. Analyze the newly uploaded voiceover.
        voiceover_analysis = analyze_voiceover(
            str(normalized_audio)
        )

        # 3. Extract visual concepts from its story beats.
        story_beats = sorted(
            voiceover_analysis.get("story_beats", []),
            key=lambda beat: beat["order"],
        )

        visual_concepts = [
            beat.get("visual_concept", "").strip()
            for beat in story_beats
            if isinstance(beat, dict)
            and beat.get("visual_concept", "").strip()
        ]

        if not visual_concepts:
            raise RuntimeError(
                "No visual story beats were generated for this voiceover."
            )

        normalized_narration_duration = probe_media_stream_durations(normalized_audio)["audio"]
        narration_duration = probe_media_stream_durations(source_audio)["audio"]
        if not normalized_narration_duration or not narration_duration:
            raise RuntimeError("Could not measure the original or normalized narration stream.")

        # 4. Match the concepts against indexed scenes.
        selected_clips = select_distinct_clips(
            script_scenes=visual_concepts,
            max_results_per_scene=5,
            video_files=allowed_video_names,
        )

        if not selected_clips:
            raise RuntimeError(
                "No matching video clips were found for this voiceover."
            )

        # 5. Render selected scenes and additional ranked alternatives as needed.
        def render_selected_clip(selected: dict, index: int, kind: str = "original") -> float:
            match = selected.get("match")

            if not isinstance(match, dict):
                raise RuntimeError(
                    f"Selected voiceover scene {index} has invalid match metadata."
                )

            video_filename = match.get("video_file")
            start_time = match.get("start_time")
            end_time = match.get("end_time")

            # Prevent paths outside the source video directory.
            safe_filename = Path(str(video_filename or "")).name
            if (
                not safe_filename
                or safe_filename != video_filename
                or safe_filename not in allowed_video_names
            ):
                raise RuntimeError(
                    f"Selected voiceover scene {index} does not belong to the selected source videos."
                )
            source_video = (source_videos_dir / safe_filename).resolve()

            if source_video.parent != source_videos_dir.resolve():
                raise RuntimeError(f"Selected voiceover scene {index} has an unsafe source path.")

            if not source_video.is_file():
                raise FileNotFoundError(
                    f"Selected source video is no longer available: {safe_filename}"
                )

            if start_time is None or end_time is None:
                raise RuntimeError(
                    f"Selected voiceover scene {index} has no valid time range."
                )

            start_time = float(start_time)
            end_time = float(end_time)
            if start_time < 0 or end_time <= start_time:
                raise RuntimeError(
                    f"Selected voiceover scene {index} has an invalid time range."
                )

            clip_path = output_path / f"{run_id}_scene_{index:03d}.mp4"

            render_video(
                video_path=str(source_video),
                start_time=start_time,
                end_time=end_time,
                output_path=str(clip_path),
            )

            if clip_path.is_file() and clip_path.stat().st_size > 0:
                scene_number = int(selected.get("scene_number", index))
                match_rank = scene_match_rank.get(scene_number, 0)
                scene_match_rank[scene_number] = match_rank + 1
                rendered_clips.append(str(clip_path))
                rendered_sources[str(clip_path)] = {
                    "source_id": safe_filename,
                    "source_start": start_time,
                    "source_end": end_time,
                    "kind": kind,
                    "scene_number": scene_number,
                    "match_rank": match_rank,
                }
                duration = probe_media_stream_durations(clip_path)["video"] or 0.0
                rendered_sources[str(clip_path)]["duration"] = duration
                return duration
            return 0.0

        rendered_durations = []
        for index, selected in enumerate(selected_clips, start=1):
            duration = render_selected_clip(selected, index)
            if duration > 0:
                rendered_durations.append((rendered_clips[-1], duration))
        visual_duration = sum(duration for _, duration in rendered_durations)

        if visual_duration + 0.04 < narration_duration:
            average_clip_duration = visual_duration / max(1, len(rendered_durations))
            deficit = narration_duration - visual_duration
            candidate_limit = min(
                500,
                max(20, math.ceil(deficit / max(average_clip_duration, 0.1) * 1.5)),
            )
            alternatives = select_additional_clips(
                script_scenes=visual_concepts,
                already_selected=[item["match"] for item in selected_clips],
                video_files=allowed_video_names,
                limit=candidate_limit,
            )
            for selected in alternatives:
                duration = render_selected_clip(
                    selected,
                    len(rendered_clips) + 1,
                    kind="extension",
                )
                if duration > 0:
                    selected_clips.append(selected)
                    rendered_durations.append((rendered_clips[-1], duration))
                    visual_duration += duration
                if visual_duration + 0.16 >= narration_duration:
                    break

        # Keep each narration beat's highest-ranked scene first, then cycle
        # through the next-ranked alternatives for every beat before later
        # alternatives. This creates a deliberate timeline instead of long
        # blocks from one concept.
        rendered_clips.sort(key=lambda path: (
            rendered_sources[path]["match_rank"],
            rendered_sources[path]["scene_number"],
        ))
        rendered_durations = [
            (path, rendered_sources[path]["duration"])
            for path in rendered_clips
        ]
        visual_duration = sum(duration for _, duration in rendered_durations)

        # Repeat only short moving cuts, in the same ranked beat order, when
        # distinct semantic matches from selected sources cannot cover audio.
        sequence_clips = list(rendered_clips)
        sequence_log = [
            {
                "source_id": rendered_sources[path]["source_id"],
                "source_start": round(rendered_sources[path]["source_start"], 3),
                "source_end": round(rendered_sources[path]["source_end"], 3),
                "duration": round(rendered_sources[path]["duration"], 3),
                "kind": rendered_sources[path]["kind"],
            }
            for path in rendered_clips
        ]
        if visual_duration + 0.16 < narration_duration:
            repeat_plan = plan_selected_repeats(
                rendered_durations,
                narration_duration + 0.18,
            )
            for repeat_index, (clip_path, repeat_start, repeat_end) in enumerate(repeat_plan, start=1):
                repeat_path = output_path / f"{run_id}_repeat_{repeat_index:04d}.mp4"
                render_video(
                    video_path=clip_path,
                    start_time=repeat_start,
                    end_time=repeat_end,
                    output_path=str(repeat_path),
                )
                if not repeat_path.is_file() or repeat_path.stat().st_size == 0:
                    raise RuntimeError(f"Could not render selected repeat cut {repeat_index}.")
                repeated_clips.append(str(repeat_path))
                repeated_duration = probe_media_stream_durations(repeat_path)["video"] or 0.0
                source = rendered_sources[clip_path]
                source_start = source["source_start"] + repeat_start
                source_end = min(source["source_end"], source_start + (repeat_end - repeat_start))
                sequence_log.append({
                    "source_id": source["source_id"],
                    "source_start": round(source_start, 3),
                    "source_end": round(source_end, 3),
                    "duration": round(repeated_duration, 3),
                    "kind": "extension",
                })
            sequence_clips.extend(repeated_clips)
            visual_duration += sum(
                probe_media_stream_durations(path)["video"] or 0.0
                for path in repeated_clips
            )

        logger.info(
            "Voiceover run %s: normalized_narration=%.3fs source_narration=%.3fs "
            "ordered_clips=%s visual_sequence=%.3fs repeated_cuts=%d",
            run_id,
            normalized_narration_duration,
            narration_duration,
            sequence_log,
            visual_duration,
            len(sequence_clips) - len(rendered_clips),
        )

        if not rendered_clips:
            raise RuntimeError(
                "No video clips could be rendered. "
                "Check that the indexed source videos still exist."
            )

        # 6. Assemble only the clips rendered during this run.
        assemble_videos(
            clip_paths=sequence_clips,
            output_path=str(assembled_video),
            normalize_video=True,
        )

        if not assembled_video.is_file() or assembled_video.stat().st_size == 0:
            raise RuntimeError("Video assembly produced no output file.")

        assembled_duration = probe_media_duration(assembled_video)
        assembled_streams = probe_media_stream_durations(assembled_video)
        assembled_video_duration = assembled_streams["video"]
        if not assembled_video_duration or assembled_video_duration + 0.15 < narration_duration:
            raise RuntimeError(
                "Assembled visual stream is shorter than narration "
                f"(video={assembled_video_duration}, narration={narration_duration:.3f}s)."
            )
        logger.info(
            "Voiceover run %s: assembled_container=%.3fs video_stream=%s audio_stream=%s",
            run_id,
            assembled_duration,
            f"{assembled_video_duration:.3f}s",
            f"{assembled_streams['audio']:.3f}s" if assembled_streams["audio"] else "none",
        )

        # 7. Add this run's voiceover.
        add_voiceover(
            video_path=str(assembled_video),
            voiceover_path=str(source_audio),
            output_path=str(final_video),
        )

        if not final_video.is_file() or final_video.stat().st_size == 0:
            raise RuntimeError("Final video rendering produced no output file.")

        return {
            "run_id": run_id,
            "voiceover_analysis": voiceover_analysis,
            "selected_clips": selected_clips,
            "source_videos": allowed_video_names,
            "rendered_clips": rendered_clips,
            "assembled_video": str(assembled_video),
            "narration_duration": narration_duration,
            "assembled_visual_duration": assembled_duration,
            "assembled_video_stream_duration": assembled_video_duration,
            "assembled_audio_stream_duration": assembled_streams["audio"],
            "final_stream_durations": probe_media_stream_durations(final_video),
            "repeated_cut_count": len(sequence_clips) - len(rendered_clips),
            "final_video": str(final_video),
            "final_video_filename": final_video.name,
        }

    except Exception:
        # Remove incomplete output files from a failed run.
        for path in [
            normalized_audio,
            assembled_video,
            final_video,
            *[Path(item) for item in rendered_clips],
            *[Path(item) for item in repeated_clips],
            *output_path.glob(f"{run_id}_scene_*.mp4"),
        ]:
            try:
                path.unlink(missing_ok=True)
            except OSError:
                pass

        raise
