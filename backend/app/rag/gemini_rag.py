from app.ai.gemini_client import client, EMBEDDING_MODEL
from app.rag.chroma_store import client as chroma_client


GEMINI_COLLECTION_NAME = "gemini_video_scenes"

collection = chroma_client.get_or_create_collection(
    name=GEMINI_COLLECTION_NAME,
)


def create_embedding(text: str) -> list[float]:
    """Generate a Gemini embedding for a piece of text."""

    response = client.models.embed_content(
        model=EMBEDDING_MODEL,
        contents=text,
    )

    return response.embeddings[0].values


def add_scene(
    scene_id: str,
    description: str,
    video_file: str,
    start_time: float,
    end_time: float,
):
    """Store a video scene and its Gemini embedding in ChromaDB."""

    embedding = create_embedding(description)

    collection.upsert(
        ids=[scene_id],
        embeddings=[embedding],
        documents=[description],
        metadatas=[
            {
                "video_file": video_file,
                "start_time": start_time,
                "end_time": end_time,
            }
        ],
    )


def search_scenes(
    query: str,
    n_results: int = 3,
    video_files: list[str] | None = None,
):
    """Search stored video scenes, optionally restricted to selected videos."""

    query_embedding = create_embedding(query)

    if video_files is not None:
        indexed = collection.get(
            where={"video_file": {"$in": video_files}},
            include=["metadatas"],
        )
        available = len(indexed.get("ids", []))
        if available == 0:
            return {"documents": [[]], "metadatas": [[]], "distances": [[]]}
        n_results = min(n_results, available)
    else:
        n_results = min(n_results, collection.count())

    query_args = {
        "query_embeddings": [query_embedding],
        "n_results": n_results,
    }

    if video_files:
        query_args["where"] = {
            "video_file": {"$in": video_files}
        }

    return collection.query(**query_args)
