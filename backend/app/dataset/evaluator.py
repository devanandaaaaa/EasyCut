import json
from pathlib import Path

from app.processing.semantic_matcher import match_script_scene


DATASET_PATH = (
    Path(__file__).parent / "evaluation_data.json"
)


def load_evaluation_dataset() -> list[dict]:
    """Load the ground-truth evaluation dataset."""

    return json.loads(
        DATASET_PATH.read_text(encoding="utf-8")
    )


def time_ranges_overlap(
    start_a: float,
    end_a: float,
    start_b: float,
    end_b: float,
) -> bool:
    """Return True when two time ranges overlap."""

    return max(start_a, start_b) < min(end_a, end_b)


def evaluate_case(case: dict) -> dict:
    """Evaluate one ground-truth retrieval case."""

    matches = match_script_scene(
        case["script_scene"],
        n_results=1,
    )

    if not matches:
        return {
            "id": case["id"],
            "correct": False,
            "reason": "No matching scene retrieved",
        }

    best_match = matches[0]

    video_correct = (
        best_match["video_file"]
        == case["expected_video"]
    )

    time_correct = time_ranges_overlap(
        best_match["start_time"],
        best_match["end_time"],
        case["expected_start"],
        case["expected_end"],
    )

    return {
        "id": case["id"],
        "correct": video_correct and time_correct,
        "video_correct": video_correct,
        "time_correct": time_correct,
        "expected_video": case["expected_video"],
        "retrieved_video": best_match["video_file"],
        "expected_range": [
            case["expected_start"],
            case["expected_end"],
        ],
        "retrieved_range": [
            best_match["start_time"],
            best_match["end_time"],
        ],
        "distance": best_match["distance"],
    }


def evaluate_dataset() -> dict:
    """Evaluate every case and calculate retrieval accuracy."""

    dataset = load_evaluation_dataset()

    results = [
        evaluate_case(case)
        for case in dataset
    ]

    correct = sum(
        1 for result in results
        if result["correct"]
    )

    accuracy = (
        correct / len(results)
        if results
        else 0.0
    )

    return {
        "total_cases": len(results),
        "correct_cases": correct,
        "accuracy": accuracy,
        "results": results,
    }