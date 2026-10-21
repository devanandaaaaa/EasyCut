import unittest
import sys
from types import ModuleType
from unittest.mock import patch

from app.video.sequence import plan_selected_repeats

matcher_stub = ModuleType("app.processing.trained_semantic_matcher")
matcher_stub.rerank_matches = None
sys.modules.setdefault("app.processing.trained_semantic_matcher", matcher_stub)
from app.processing.clip_selector import select_additional_clips


class VoiceoverSequenceTests(unittest.TestCase):
    def test_additional_matches_are_ranked_per_beat_and_source_restricted(self):
        ranked = {
            "beat one": [
                {"video_file": "allowed.mp4", "start_time": 0, "end_time": 2, "hybrid_score": 0.95},
                {"video_file": "unselected.mp4", "start_time": 0, "end_time": 2, "hybrid_score": 0.99},
                {"video_file": "allowed.mp4", "start_time": 2, "end_time": 4, "hybrid_score": 0.70},
            ],
            "beat two": [
                {"video_file": "allowed.mp4", "start_time": 4, "end_time": 6, "hybrid_score": 0.90},
                {"video_file": "allowed.mp4", "start_time": 6, "end_time": 8, "hybrid_score": 0.60},
            ],
        }
        with patch("app.processing.clip_selector.rerank_matches", side_effect=lambda scene, **_: ranked[scene]):
            selected = select_additional_clips(
                ["beat one", "beat two"],
                already_selected=[],
                video_files=["allowed.mp4"],
            )

        self.assertEqual(
            [(item["scene_number"], item["match"]["start_time"]) for item in selected],
            [(1, 0), (2, 4), (1, 2), (2, 6)],
        )
        self.assertTrue(all(item["match"]["video_file"] == "allowed.mp4" for item in selected))

    def test_repeat_extension_is_deterministic_ordered_and_covers_target(self):
        original = [("a.mp4", 1.0), ("b.mp4", 1.2), ("c.mp4", 0.8)]
        target = 8.0
        plan = plan_selected_repeats(original, target, segment_duration=0.5)
        self.assertEqual(plan, plan_selected_repeats(original, target, segment_duration=0.5))
        self.assertGreaterEqual(sum(end - start for _, start, end in plan), target - sum(d for _, d in original) - 0.04)
        self.assertEqual([path for path, _, _ in plan[:3]], ["a.mp4", "b.mp4", "c.mp4"])
        self.assertTrue(all(0 <= start < end <= dict(original)[path] for path, start, end in plan))


if __name__ == "__main__":
    unittest.main()
