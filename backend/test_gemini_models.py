from app.ai.gemini_client import client

models = [
    "gemini-2.5-flash-lite",
    "gemini-3.5-flash-lite",
    "gemini-flash-latest",
]

for model in models:
    print("\nTESTING:", model)

    try:
        response = client.models.generate_content(
            model=model,
            contents="Reply only with OK",
        )
        print("RESULT:", response.text)

    except Exception as error:
        print("ERROR:", type(error).__name__)
        print(error)