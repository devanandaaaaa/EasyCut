
from app.rag.gemini_rag import search_scenes


def match_script_scene(
    script_scene: str,
    n_results: int = 3,
    video_files: list[str] | None = None,
) -> list[dict]:
    """Find relevant scenes, optionally restricted to uploaded videos."""

    results = search_scenes(
        script_scene,
        n_results=n_results,
        video_files=video_files,
    )

    matches = []

    documents = results.get("documents", [[]])[0]
    metadatas = results.get("metadatas", [[]])[0]
    distances = results.get("distances", [[]])[0]

    for document, metadata, distance in zip(
        documents,
        metadatas,
        distances,
    ):
        matches.append(
            {
                "description": document,
                "video_file": metadata.get("video_file"),
                "start_time": metadata.get("start_time"),
                "end_time": metadata.get("end_time"),
                "distance": distance,
            }
        )

    return matches
