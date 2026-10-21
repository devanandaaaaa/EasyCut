
import json
import random
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

DEFAULT_MAX_ATTEMPTS = 3
INITIAL_RETRY_SECONDS = 1
MAX_WAIT_SECONDS = 4


class VoiceoverAnalysisUnavailable(RuntimeError):
    """Raised when Gemini remains unavailable after bounded retries."""


def _parse_response(raw_response: str) -> dict:
    """Parse and validate Gemini's JSON response."""

    if not raw_response or not raw_response.strip():
        raise ValueError("Gemini returned an empty voiceover analysis.")

    raw_response = raw_response.strip()

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
            f"Gemini returned invalid JSON: {exc}"
        ) from exc

    if not isinstance(result, dict):
        raise ValueError("Gemini response must be a JSON object.")

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
            f"Unsupported detected language: {result['language']}"
        )

    if not isinstance(result["story_beats"], list):
        raise ValueError("story_beats must be a list.")

    if not result["story_beats"]:
        raise ValueError(
            "Gemini did not identify any story beats in the voiceover."
        )

    seen_orders = set()
    for index, beat in enumerate(result["story_beats"], start=1):
        if not isinstance(beat, dict):
            raise ValueError(f"Story beat {index} must be a JSON object.")

        order = beat.get("order")
        if isinstance(order, bool) or not isinstance(order, int) or order < 1:
            raise ValueError(
                f"Story beat {index} has an invalid order; expected a positive integer."
            )
        if order in seen_orders:
            raise ValueError(f"Story beat order {order} is duplicated.")
        seen_orders.add(order)

        if not isinstance(beat.get("visual_concept"), str):
            raise ValueError(
                f"Story beat {index} has no valid visual_concept."
            )

        if not beat["visual_concept"].strip():
            raise ValueError(
                f"Story beat {index} has an empty visual_concept."
            )

    return result


def analyze_voiceover(
    audio_path: str,
    max_attempts: int = DEFAULT_MAX_ATTEMPTS,
) -> dict:
    """
    Analyze a voiceover and return structured story information.

    Supported languages:
    - English
    - Malayalam
    - Hindi

    Retries temporary Gemini service and rate-limit errors a bounded number
    of times, with short exponential backoff.
    """

    path = Path(audio_path)

    if not path.is_file():
        raise FileNotFoundError(f"Audio file not found: {path}")

    if max_attempts < 1:
        raise ValueError("max_attempts must be at least 1.")

    if path.stat().st_size == 0:
        raise ValueError("The uploaded voiceover audio file is empty.")

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

    audio_bytes = path.read_bytes()

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

            raw_response = getattr(response, "text", None)

            if not raw_response or not raw_response.strip():
                raise ValueError(
                    "Gemini returned an empty response for the voiceover."
                )

            return _parse_response(raw_response)

        except errors.ServerError as exc:
            # Gemini 5xx errors can be temporary.
            if attempt >= max_attempts:
                raise VoiceoverAnalysisUnavailable(
                    "Gemini voiceover analysis is temporarily unavailable "
                    f"after {max_attempts} attempts. Your upload is preserved; "
                    "please try again later."
                ) from exc

            wait_seconds = min(
                MAX_WAIT_SECONDS,
                INITIAL_RETRY_SECONDS * (2 ** (attempt - 1)) + random.uniform(0, 0.25),
            )

            print(
                "Gemini voiceover analysis temporarily unavailable. "
                f"Retrying in {wait_seconds:.1f} seconds "
                f"(attempt {attempt}/{max_attempts})."
            )

            time.sleep(wait_seconds)

        except errors.ClientError as exc:
            # Rate limits may be reported as client errors.
            status_code = getattr(exc, "code", None)

            if status_code != 429 or attempt >= max_attempts:
                raise

            wait_seconds = min(
                MAX_WAIT_SECONDS,
                INITIAL_RETRY_SECONDS * (2 ** (attempt - 1)) + random.uniform(0, 0.25),
            )

            print(
                "Gemini rate limit reached. "
                f"Retrying in {wait_seconds:.1f} seconds "
                f"(attempt {attempt}/{max_attempts})."
            )

            time.sleep(wait_seconds)

    raise RuntimeError("Voiceover analysis could not be completed.")
