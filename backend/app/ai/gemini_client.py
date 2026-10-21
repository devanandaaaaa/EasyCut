import os
import time

from dotenv import load_dotenv
from google import genai
from google.genai import errors


load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

if not GEMINI_API_KEY:
    raise RuntimeError("GEMINI_API_KEY is not configured")


client = genai.Client(api_key=GEMINI_API_KEY)

# Keep the currently configured models until the alternative
# model has been verified in your Google AI Studio project.
STORY_MODEL = "gemini-3.5-flash-lite"
EMBEDDING_MODEL = "gemini-embedding-2"


def understand_story(
    text: str,
    max_attempts: int = 3,
) -> str:
    """
    Identify the main visual scenes in a script.

    Retries temporary server errors with a short delay.
    Does not automatically retry quota-exceeded errors.
    """

    prompt = f"""
You are the story-understanding component of an AI video editor.

Read the following story/script and identify the main visual scenes
that should be represented by video clips.

Return a numbered list of concise scene descriptions.
Do not include an introduction or explanation.
Return only the numbered scene descriptions.

Script:
{text}
"""

    for attempt in range(1, max_attempts + 1):
        try:
            response = client.models.generate_content(
                model=STORY_MODEL,
                contents=prompt,
            )

            result = response.text

            if not result or not result.strip():
                raise RuntimeError(
                    "Gemini returned an empty story analysis."
                )

            return result.strip()

        except errors.ClientError as error:
            if getattr(error, "code", None) == 429:
                raise RuntimeError(
                    "Gemini request quota or rate limit exceeded. "
                    "Wait until the quota resets, or check the "
                    "model's limits and billing in Google AI Studio. "
                    "The request was not automatically retried."
                ) from error

            raise

        except errors.ServerError:
            if attempt == max_attempts:
                raise

            wait_seconds = attempt * 3

            print(
                "Gemini server temporarily unavailable. "
                f"Retrying in {wait_seconds} seconds "
                f"(attempt {attempt}/{max_attempts})..."
            )

            time.sleep(wait_seconds)

    raise RuntimeError("Story analysis could not be completed.")