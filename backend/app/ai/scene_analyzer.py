from pathlib import Path
import time

from google.genai import types
from google.genai import errors

from app.ai.gemini_client import client, STORY_MODEL


def analyze_frame(
    frame_path: str,
    max_attempts: int = 3,
) -> str:
    """
    Send one extracted video frame to Gemini and return
    a concise visual description.

    Retries temporary Gemini server errors before failing.
    """

    image_path = Path(frame_path)

    if not image_path.exists():
        raise FileNotFoundError(f"Frame not found: {image_path}")

    image_bytes = image_path.read_bytes()

    for attempt in range(1, max_attempts + 1):
        try:
            response = client.models.generate_content(
                model=STORY_MODEL,
                contents=[
                    types.Part.from_bytes(
                        data=image_bytes,
                        mime_type="image/jpeg",
                    ),
                    """
Describe this video frame for an AI video editor.

Focus on:
- people
- objects
- actions
- location/environment
- important visual details

Return one concise description that could be used
for semantic video matching.
""",
                ],
            )

            return response.text.strip()

        except errors.ServerError as exc:
            if attempt == max_attempts:
                raise

            wait_seconds = attempt * 3
            print(
                f"Gemini server temporarily unavailable. "
                f"Retrying in {wait_seconds} seconds "
                f"(attempt {attempt}/{max_attempts})..."
            )
            time.sleep(wait_seconds)