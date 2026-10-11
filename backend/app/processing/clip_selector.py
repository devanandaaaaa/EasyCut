from app.processing.trained_semantic_matcher import rerank_matches


def select_distinct_clips(
    script_scenes: list[str],
    max_results_per_scene: int = 5,
) -> list[dict]:
    """
    Select the best hybrid semantic match for each script scene
    while avoiding reuse of the same video time range.
    """

    selected = []
    used_segments = set()

    for scene_number, script_scene in enumerate(
        script_scenes,
        start=1,
    ):
        matches = rerank_matches(
            script_scene,
            n_candidates=max_results_per_scene,
        )

        chosen_match = None

        for match in matches:
            segment_key = (
                match["video_file"],
                match["start_time"],
                match["end_time"],
            )

            if segment_key not in used_segments:
                chosen_match = match
                used_segments.add(segment_key)
                break

        if chosen_match is None and matches:
            chosen_match = matches[0]

        if chosen_match:
            selected.append(
                {
                    "scene_number": scene_number,
                    "script_scene": script_scene,
                    "match": chosen_match,
                }
            )

    return selected