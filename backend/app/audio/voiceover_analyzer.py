import json
import time
from pathlib import Path

from google.genai import errors

from app.ai.gemini_client import client

VOICEOVER_MODEL = "gemini-3.6-flash"

SUPPORTED_LANGUAGES = {
    "English",
    "Malayalam",
    "Hindi",
}


def analyze_voiceover(
    audio_path: str,
    max_attempts: int = 3,
) -> dict:
    """
    Analyze an uploaded voiceover and return structured story information.

    Supported languages:
    - English
    - Malayalam
    - Hindi
    """

    path = Path(audio_path)

    if not path.exists():
        raise FileNotFoundError(f"Audio file not found: {path}")

    prompt = """
Analyze this voiceover for an AI video editor.

The voiceover may be in English, Malayalam, or Hindi.

Return ONLY valid JSON.
Do not include markdown, code fences, or explanations outside the JSON.

Use exactly this structure:

{
  "language": "English | Malayalam | Hindi",
  "transcript": "faithful transcript in the original language",
  "english_narration": "faithful English meaning",
  "story_beats": [
    {
      "order": 1,
      "narration": "the corresponding part of the story",
      "visual_concept": "the visual scene that could represent it"
    }
  ],
  "narrative_order": "brief explanation of the chronological sequence"
}

Rules:
- Preserve the meaning of the original voiceover.
- Do not invent events.
- Keep story beats concise and useful for semantic video matching.
- Keep the original-language transcript faithful.
- If the voiceover is already English, english_narration should preserve its meaning.
- Identify only English, Malayalam, or Hindi as the language.
- Story beats must be in chronological order.
"""

    with open(path, "rb") as audio_file:
        audio_bytes = audio_file.read()

    audio_part = {
        "inline_data": {
            "mime_type": "audio/wav",
            "data": audio_bytes,
        }
    }

    for attempt in range(1, max_attempts + 1):
        try:
            response = client.models.generate_content(
                model=VOICEOVER_MODEL,
                contents=[
                    prompt,
                    audio_part,
                ],
            )

            raw_response = response.text.strip()

            # Remove optional Markdown JSON code fences.
            if raw_response.startswith("```"):
                lines = raw_response.splitlines()

                if lines and lines[0].strip().startswith("```"):
                    lines = lines[1:]

                if lines and lines[-1].strip() == "```":
                    lines = lines[:-1]

                raw_response = "\n".join(lines).strip()

            try:
                result = json.loads(raw_response)

            except json.JSONDecodeError as exc:
                raise ValueError(
                    f"Gemini returned invalid JSON:\n{raw_response}"
                ) from exc

            required_fields = {
                "language",
                "transcript",
                "english_narration",
                "story_beats",
                "narrative_order",
            }

            missing_fields = required_fields - result.keys()

            if missing_fields:
                raise ValueError(
                    f"Voiceover analysis is missing fields: "
                    f"{sorted(missing_fields)}"
                )

            if result["language"] not in SUPPORTED_LANGUAGES:
                raise ValueError(
                    f"Unsupported detected language: "
                    f"{result['language']}"
                )

            if not isinstance(result["story_beats"], list):
                raise ValueError("story_beats must be a list.")

            return result

        except errors.ServerError:
            if attempt == max_attempts:
                raise

            wait_seconds = attempt * 3

            print(
                f"Gemini voiceover service temporarily unavailable. "
                f"Retrying in {wait_seconds} seconds "
                f"(attempt {attempt}/{max_attempts})..."
            )

            time.sleep(wait_seconds)