from pathlib import Path

import joblib
import numpy as np
from sentence_transformers import SentenceTransformer


# Project root:
# EasyCut/backend/app/ai/trained_matcher.py
PROJECT_ROOT = Path(__file__).resolve().parents[3]

MODEL_PATH = (
    PROJECT_ROOT
    / "data"
    / "easycut_training_artifacts"
    / "easycut_semantic_matcher.joblib"
)

EMBEDDING_MODEL_NAME = "all-MiniLM-L6-v2"


# Load the same embedding model used during Colab training.
embedding_model = SentenceTransformer(EMBEDDING_MODEL_NAME)

# Load the trained Logistic Regression classifier.
matching_model = joblib.load(MODEL_PATH)


def create_pair_features(
    script_scene: str,
    video_scene: str,
) -> np.ndarray:
    """
    Create the same 1536-dimensional pair features
    that were used during Colab training.
    """

    script_embedding = embedding_model.encode(
        [script_scene],
        convert_to_numpy=True,
        show_progress_bar=False,
    )[0]

    video_embedding = embedding_model.encode(
        [video_scene],
        convert_to_numpy=True,
        show_progress_bar=False,
    )[0]

    absolute_difference = np.abs(
        script_embedding - video_embedding
    )

    elementwise_product = (
        script_embedding * video_embedding
    )

    features = np.concatenate(
        [
            script_embedding,
            video_embedding,
            absolute_difference,
            elementwise_product,
        ]
    )

    return features.reshape(1, -1)


def predict_match(
    script_scene: str,
    video_scene: str,
) -> dict:
    """
    Predict whether a script scene and video scene match.
    """

    features = create_pair_features(
        script_scene=script_scene,
        video_scene=video_scene,
    )

    prediction = int(
        matching_model.predict(features)[0]
    )

    probability = matching_model.predict_proba(features)[0]

    return {
        "match": bool(prediction),
        "match_probability": float(probability[1]),
        "no_match_probability": float(probability[0]),
    }