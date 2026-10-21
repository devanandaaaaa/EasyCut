import shutil
import subprocess
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from app.processing.video_indexer import index_extracted_frames
from app.video.frame_extractor import extract_frame_samples


@unittest.skipUnless(shutil.which("ffmpeg"), "FFmpeg unavailable")
class FrameTimestampIndexingTests(unittest.TestCase):
    def test_path_only_callers_keep_legacy_interval_behavior(self):
        with patch("app.processing.video_indexer.analyze_frame", return_value="legacy frame"), \
             patch("app.processing.video_indexer.add_scene") as add_scene:
            scenes = index_extracted_frames(
                frame_paths=["frame_0000.jpg", "frame_0001.jpg"],
                video_file="legacy.mp4",
                interval_seconds=2.0,
            )

        self.assertEqual(
            [(scene["start_time"], scene["end_time"]) for scene in scenes],
            [(0.0, 2.0), (2.0, 4.0)],
        )
        self.assertEqual(add_scene.call_count, 2)

    def test_indexed_scene_windows_keep_actual_extraction_timestamps(self):
        with tempfile.TemporaryDirectory(
            prefix=".frame-timestamp-", dir=Path(__file__).resolve().parent,
        ) as directory:
            root = Path(directory)
            source = root / "known-duration.mp4"
            subprocess.run(
                [
                    "ffmpeg", "-y", "-f", "lavfi", "-i",
                    "color=c=red:s=64x64:r=10:d=6.2", "-an",
                    "-c:v", "libx264", "-pix_fmt", "yuv420p", str(source),
                ],
                check=True,
                capture_output=True,
                text=True,
            )

            samples = extract_frame_samples(
                str(source), str(root / "frames"), interval_seconds=2.5,
            )
            self.assertEqual([sample.start_time for sample in samples], [0.0, 2.5, 5.0])
            self.assertAlmostEqual(samples[-1].end_time, 6.2, delta=0.12)

            with patch("app.processing.video_indexer.analyze_frame", return_value="red frame"), \
                 patch("app.processing.video_indexer.add_scene") as add_scene:
                scenes = index_extracted_frames(
                    frame_paths=samples,
                    video_file=source.name,
                    # Deliberately differs from extraction. Explicit sample
                    # timestamps must win over this legacy fallback value.
                    interval_seconds=2.0,
                )

        expected_windows = [(0.0, 2.5), (2.5, 5.0), (5.0, samples[-1].end_time)]
        actual_windows = [(scene["start_time"], scene["end_time"]) for scene in scenes]
        self.assertEqual(len(actual_windows), len(expected_windows))
        for actual, expected in zip(actual_windows, expected_windows):
            self.assertAlmostEqual(actual[0], expected[0], delta=0.001)
            self.assertAlmostEqual(actual[1], expected[1], delta=0.12)

        self.assertEqual(add_scene.call_count, 3)
        for indexed_call, (start, end) in zip(add_scene.call_args_list, expected_windows):
            self.assertAlmostEqual(indexed_call.kwargs["start_time"], start, delta=0.001)
            self.assertAlmostEqual(indexed_call.kwargs["end_time"], end, delta=0.12)


if __name__ == "__main__":
    unittest.main()
