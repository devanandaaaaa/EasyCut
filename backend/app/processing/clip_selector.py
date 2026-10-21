
import math

from app.processing.trained_semantic_matcher import rerank_matches


def select_additional_clips(
    script_scenes: list[str],
    already_selected: list[dict],
    video_files: list[str],
    limit: int = 500,
) -> list[dict]:
    """Return unused ranked source segments as duration-filling alternatives."""
    used = {
        (item.get("video_file"), item.get("start_time"), item.get("end_time"))
        for item in already_selected
    }
    allowed = set(video_files)
    ranked_by_scene = []
    candidates_per_scene = min(
        max(math.ceil(limit / max(1, len(script_scenes)) * 3), 20),
        500,
    )
    for scene_number, scene in enumerate(script_scenes, start=1):
        matches = rerank_matches(
            scene,
            n_candidates=candidates_per_scene,
            video_files=video_files,
        )
        scene_candidates = []
        for match in matches:
            key = (match.get("video_file"), match.get("start_time"), match.get("end_time"))
            if key in used or not key[0] or key[0] not in allowed:
                continue
            try:
                if float(key[1]) < 0 or float(key[2]) <= float(key[1]):
                    continue
            except (TypeError, ValueError):
                continue
            used.add(key)
            scene_candidates.append({
                "scene_number": scene_number,
                "script_scene": scene,
                "match": match,
            })
        ranked_by_scene.append(scene_candidates)

    # Extend in narration-beat order, taking each scene's highest-ranked
    # remaining match first. This avoids exhausting one concept before moving
    # on to the next and preserves the matcher's ranking within each beat.
    candidates = []
    rank = 0
    while len(candidates) < limit:
        added = False
        for scene_candidates in ranked_by_scene:
            if rank < len(scene_candidates):
                candidates.append(scene_candidates[rank])
                added = True
                if len(candidates) >= limit:
                    break
        if not added:
            break
        rank += 1
    return candidates


def select_distinct_clips(
    script_scenes: list[str],
    max_results_per_scene: int = 5,
    video_files: list[str] | None = None,
) -> list[dict]:
    """
    Select distinct scene segments, preferring different uploaded videos.

    The matcher searches a larger candidate pool so that a strong match
    from one video does not hide relevant scenes from other uploads.
    """

    selected = []
    used_segments = set()
    used_videos = set()

    # Search more candidates when multiple videos were uploaded.
    # Retrieve enough alternatives to avoid repeating the same top matches
    # across multiple narration beats, even when only one source is selected.
    candidate_count = max_results_per_scene * 4

    if video_files:
        candidate_count = max(
            max_results_per_scene * 4,
            min(len(video_files) * max_results_per_scene * 4, 50),
        )

    for scene_number, script_scene in enumerate(script_scenes, start=1):
        matches = rerank_matches(
            script_scene,
            n_candidates=candidate_count,
            video_files=video_files,
        )

        # First preference: an unused segment from an unused video.
        chosen_match = None

        for match in matches:
            filename = match.get("video_file")
            segment_key = (
                filename,
                match.get("start_time"),
                match.get("end_time"),
            )

            if (
                filename
                and segment_key not in used_segments
                and filename not in used_videos
            ):
                chosen_match = match
                break

        # Second preference: an unused segment from any allowed video.
        if chosen_match is None:
            for match in matches:
                filename = match.get("video_file")
                segment_key = (
                    filename,
                    match.get("start_time"),
                    match.get("end_time"),
                )

                if filename and segment_key not in used_segments:
                    chosen_match = match
                    break

        # Do not silently reuse a segment if no distinct match exists.
        if chosen_match is None:
            continue

        filename = chosen_match["video_file"]

        used_segments.add(
            (
                filename,
                chosen_match.get("start_time"),
                chosen_match.get("end_time"),
            )
        )
        used_videos.add(filename)

        selected.append(
            {
                "scene_number": scene_number,
                "script_scene": script_scene,
                "match": chosen_match,
            }
        )

    return selected
