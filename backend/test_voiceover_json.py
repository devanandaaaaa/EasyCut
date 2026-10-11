from app.ai.gemini_client import client

audio_path = r"C:\Users\Devananda k\Desktop\EasyCut\data\audio\real_voiceover_normalized.wav"

with open(audio_path, "rb") as audio_file:
    audio = audio_file.read()

prompt = """
Analyze this voiceover for an AI video editor.

Return ONLY valid JSON.

Use exactly this structure:

{
  "language": "English",
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

The voiceover may be in English, Malayalam, or Hindi.

Rules:
- Preserve the meaning of the original voiceover.
- Do not invent events.
- Keep story beats concise.
- Keep story beats in chronological order.
- The transcript must remain in the original language.
"""

response = client.models.generate_content(
    model="gemini-flash-latest",
    contents=[
        prompt,
        {
            "inline_data": {
                "mime_type": "audio/wav",
                "data": audio,
            }
        },
    ],
)

print(response.text)