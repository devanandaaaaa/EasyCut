import chromadb
from pathlib import Path


CHROMA_PATH = Path("chroma_db")

client = chromadb.PersistentClient(
    path=str(CHROMA_PATH)
)

scene_collection = client.get_or_create_collection(
    name="video_scenes"
)


def get_scene_collection():
    return scene_collection