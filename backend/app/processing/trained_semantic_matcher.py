
from app.ai.trained_matcher import predict_match
from app.processing.semantic_matcher import match_script_scene


def rerank_matches(
    script_scene: str,
    n_candidates: int = 5,
    video_files: list[str] | None = None,
) -> list[dict]:
    """
    Retrieve candidate scenes, optionally restricted to uploaded videos,
    and rank them using the trained matcher and ChromaDB similarity.
    """

    candidates = match_script_scene(
        script_scene,
        n_results=n_candidates,
        video_files=video_files,
    )

    reranked = []

    for candidate in candidates:
        trained_result = predict_match(
            script_scene=script_scene,
            video_scene=candidate["description"],
        )

        chroma_similarity = 1.0 / (1.0 + candidate["distance"])

        hybrid_score = (
            0.5 * chroma_similarity
            + 0.5 * trained_result["match_probability"]
        )

        reranked.append(
            {
                **candidate,
                "trained_match": trained_result["match"],
                "trained_match_probability": (
                    trained_result["match_probability"]
                ),
                "trained_no_match_probability": (
                    trained_result["no_match_probability"]
                ),
                "chroma_similarity": chroma_similarity,
                "hybrid_score": hybrid_score,
            }
        )

    reranked.sort(
        key=lambda item: item["hybrid_score"],
        reverse=True,
    )

    return reranked
