from app.ai.gemini_client import understand_story
from app.processing.semantic_matcher import match_script_scene


def parse_scene_list(story_output: str) -> list[str]:
    """
    Extract only numbered scene descriptions from Gemini's response.
    """

    scenes = []

    for line in story_output.splitlines():
        line = line.strip()

        if not line:
            continue

        # Accept only lines beginning with:
        # 1. Scene
        # 2) Scene
        if len(line) >= 3 and line[0].isdigit():
            if line[1:3] in (". ", ") "):
                scene = line[3:].strip()

                if scene:
                    scenes.append(scene)

    return scenes


def match_script_to_video(
    script: str,
    n_results_per_scene: int = 3,
) -> dict:
    """
    Understand the script and find semantically relevant
    video scenes for each generated story scene.
    """

    story_output = understand_story(script)

    script_scenes = parse_scene_list(story_output)

    matched_scenes = []

    for index, scene in enumerate(script_scenes):
        matches = match_script_scene(
            scene,
            n_results=n_results_per_scene,
        )

        matched_scenes.append(
            {
                "scene_number": index + 1,
                "script_scene": scene,
                "matches": matches,
            }
        )

    return {
        "script": script,
        "story_understanding": story_output,
        "scenes": matched_scenes,
    }