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


STORY_MODEL = "gemini-3.6-flash"
EMBEDDING_MODEL = "gemini-embedding-2"


def understand_story(text: str, max_attempts: int = 3) -> str:
    """
    Understand a script and extract its main visual scenes.

    Retries temporary Gemini server errors.
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

            return response.text.strip()

        except errors.ServerError:
            if attempt == max_attempts:
                raise

            wait_seconds = attempt * 3

            print(
                f"Gemini server temporarily unavailable. "
                f"Retrying in {wait_seconds} seconds "
                f"(attempt {attempt}/{max_attempts})..."
            )

            time.sleep(wait_seconds)