from app.rag.chroma_store import scene_collection


def add_test_scene():
    scene_collection.upsert(
        ids=["test_scene_001"],
        documents=[
            "A student walks through a college campus toward the classroom."
        ],
        metadatas=[
            {
                "video_file": "01_campus_entrance.mp4",
                "start_time": 0.0,
                "end_time": 5.0
            }
        ]
    )


def search_test_scene(query: str):
    results = scene_collection.query(
        query_texts=[query],
        n_results=1
    )

    return results


if __name__ == "__main__":
    add_test_scene()

    results = search_test_scene(
        "A student enters the college campus"
    )

    print("Retrieved documents:")
    print(results["documents"])

    print("\nRetrieved metadata:")
    print(results["metadatas"])