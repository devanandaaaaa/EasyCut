from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw
from moviepy import ImageSequenceClip


def create_laptop_test_video(
    output_path: str = "../data/source_videos/test_laptop.mp4",
) -> str:
    """
    Create a short synthetic video showing a person working on a laptop.
    This is only for controlled semantic-matching tests.
    """

    output_file = Path(output_path)
    output_file.parent.mkdir(parents=True, exist_ok=True)

    frames = []

    width = 640
    height = 360

    for _ in range(60):
        image = Image.new("RGB", (width, height), "white")
        draw = ImageDraw.Draw(image)

        # Desk
        draw.rectangle(
            (0, 260, width, height),
            fill="lightgray",
        )

        # Laptop screen
        draw.rectangle(
            (210, 80, 430, 220),
            outline="black",
            width=6,
        )

        # Laptop base
        draw.polygon(
            [(190, 220), (450, 220), (480, 250), (160, 250)],
            fill="gray",
        )

        # Person head
        draw.ellipse(
            (290, 25, 350, 85),
            fill="peachpuff",
            outline="black",
        )

        # Person body
        draw.rectangle(
            (270, 85, 370, 180),
            fill="lightblue",
            outline="black",
        )

        # Arms
        draw.line(
            (285, 150, 230, 220),
            fill="black",
            width=12,
        )

        draw.line(
            (355, 150, 410, 220),
            fill="black",
            width=12,
        )

        # Text
        draw.text(
            (235, 300),
            "Person working on a laptop",
            fill="black",
        )

        frames.append(np.array(image))

    clip = ImageSequenceClip(
        frames,
        fps=10,
    )

    clip.write_videofile(
        str(output_file),
        codec="libx264",
        audio=False,
        logger=None,
    )

    clip.close()

    return str(output_file)


if __name__ == "__main__":
    print(create_laptop_test_video())