import json
import shutil
import subprocess
import tempfile
import unittest
import sys
from uuid import uuid4
from pathlib import Path
from types import ModuleType, SimpleNamespace
from unittest.mock import patch

from google.genai import errors

from app.audio.voiceover_analyzer import (
    VoiceoverAnalysisUnavailable,
    _parse_response,
    analyze_voiceover,
)
from app.audio.audio_normalizer import normalize_audio
from app.video.renderer import probe_media_stream_durations

matcher_stub = ModuleType("app.processing.trained_semantic_matcher")
matcher_stub.rerank_matches = None
sys.modules.setdefault("app.processing.trained_semantic_matcher", matcher_stub)
from app.processing import voiceover_pipeline


ANALYSIS = {
    "language": "English",
    "transcript": "A journey begins.",
    "english_narration": "A journey begins.",
    "story_beats": [{"order": 1, "narration": "A journey begins.", "visual_concept": "A road at sunrise"}],
    "narrative_order": "The journey begins.",
}

UNORDERED_ANALYSIS = {
    **ANALYSIS,
    "story_beats": [
        {"order": 3, "narration": "Third", "visual_concept": "third concept"},
        {"order": 1, "narration": "First", "visual_concept": "first concept"},
        {"order": 2, "narration": "Second", "visual_concept": "second concept"},
    ],
}


class VoiceoverAnalysisTests(unittest.TestCase):
    def test_parser_rejects_missing_duplicate_and_invalid_beat_orders(self):
        invalid_beats = {
            "missing": [{"narration": "No order", "visual_concept": "scene"}],
            "duplicate": [
                {"order": 1, "visual_concept": "first"},
                {"order": 1, "visual_concept": "second"},
            ],
            "invalid": [{"order": 0, "visual_concept": "scene"}],
        }
        for label, beats in invalid_beats.items():
            with self.subTest(label=label):
                response = {**ANALYSIS, "story_beats": beats}
                with self.assertRaisesRegex(ValueError, "order"):
                    _parse_response(json.dumps(response))

    def test_gemini_response_is_parsed(self):
        with tempfile.TemporaryDirectory() as directory:
            audio = Path(directory) / "voice.wav"
            audio.write_bytes(b"mock audio")
            response = SimpleNamespace(text=json.dumps(ANALYSIS))
            with patch("app.audio.voiceover_analyzer.client.models.generate_content", return_value=response) as generate:
                result = analyze_voiceover(str(audio))
        self.assertEqual(result, ANALYSIS)
        self.assertEqual(generate.call_count, 1)

    def test_transient_503_retries_then_succeeds(self):
        with tempfile.TemporaryDirectory() as directory:
            audio = Path(directory) / "voice.wav"
            audio.write_bytes(b"mock audio")
            unavailable = errors.ServerError(503, {"message": "busy"})
            response = SimpleNamespace(text=json.dumps(ANALYSIS))
            with patch("app.audio.voiceover_analyzer.client.models.generate_content", side_effect=[unavailable, response]) as generate, patch("app.audio.voiceover_analyzer.time.sleep") as sleep:
                result = analyze_voiceover(str(audio))
        self.assertEqual(result, ANALYSIS)
        self.assertEqual(generate.call_count, 2)
        self.assertEqual(sleep.call_count, 1)
        self.assertLessEqual(sleep.call_args.args[0], 1.25)

    def test_sustained_503_returns_clear_error_after_three_attempts(self):
        with tempfile.TemporaryDirectory() as directory:
            audio = Path(directory) / "voice.wav"
            audio.write_bytes(b"mock audio")
            unavailable = errors.ServerError(503, {"message": "busy"})
            with patch("app.audio.voiceover_analyzer.client.models.generate_content", side_effect=unavailable) as generate, patch("app.audio.voiceover_analyzer.time.sleep") as sleep:
                with self.assertRaisesRegex(VoiceoverAnalysisUnavailable, "temporarily unavailable"):
                    analyze_voiceover(str(audio))
        self.assertEqual(generate.call_count, 3)
        self.assertEqual(sleep.call_count, 2)


class VoiceoverDownstreamPipelineTests(unittest.TestCase):
    @unittest.skipUnless(shutil.which("ffmpeg"), "FFmpeg unavailable")
    def test_local_audio_normalization_runs_without_gemini(self):
        with tempfile.TemporaryDirectory() as directory:
            source = Path(directory) / "voiceover.wav"
            normalized = Path(directory) / "normalized.wav"
            subprocess.run([
                "ffmpeg", "-y", "-f", "lavfi", "-i", "sine=frequency=440:duration=0.5",
                "-c:a", "pcm_s16le", str(source),
            ], check=True, capture_output=True, text=True)
            normalize_audio(str(source), str(normalized))
            streams = probe_media_stream_durations(normalized)
            self.assertTrue(normalized.is_file())
        self.assertGreater(streams["audio"], 0)

    def test_mocked_analysis_runs_matching_sequence_assembly_and_final_mux(self):
        project_root = Path(voiceover_pipeline.__file__).resolve().parents[3]
        source_dir = project_root / "data" / "source_videos"
        source_dir.mkdir(parents=True, exist_ok=True)
        selected_source = source_dir / f".voiceover-test-{uuid4().hex}.mp4"
        self.addCleanup(selected_source.unlink, missing_ok=True)
        with tempfile.TemporaryDirectory() as output_temp:
            selected_source.write_bytes(b"mock source")
            voiceover = Path(output_temp) / "voiceover.wav"
            voiceover.write_bytes(b"mock audio")

            def normalize_audio(input_path, output_path):
                Path(output_path).write_bytes(b"normalized audio")

            def render_video(video_path, start_time, end_time, output_path):
                Path(output_path).write_bytes(b"rendered clip")

            def make_output(*args, **kwargs):
                output = kwargs.get("output_path")
                if output is None:
                    output = args[2]
                Path(output).write_bytes(b"video")

            selected = []
            for scene_number, concept in enumerate(
                ("first concept", "second concept", "third concept"), start=1
            ):
                selected.append({
                    "scene_number": scene_number,
                    "script_scene": concept,
                    "match": {
                        "video_file": selected_source.name,
                        "start_time": float(scene_number - 1),
                        "end_time": float(scene_number + 7),
                    },
                })
            with patch.object(voiceover_pipeline, "normalize_audio", side_effect=normalize_audio), \
                 patch.object(voiceover_pipeline, "analyze_voiceover", return_value=UNORDERED_ANALYSIS) as analyze, \
                 patch.object(voiceover_pipeline, "select_distinct_clips", return_value=selected) as match, \
                 patch.object(voiceover_pipeline, "render_video", side_effect=render_video), \
                 patch.object(voiceover_pipeline, "probe_media_stream_durations", return_value={"video": 8.0, "audio": 8.0}), \
                 patch.object(voiceover_pipeline, "assemble_videos", side_effect=make_output) as assemble, \
                 patch.object(voiceover_pipeline, "probe_media_duration", return_value=8.0), \
                 patch.object(voiceover_pipeline, "add_voiceover", side_effect=make_output) as mux:
                result = voiceover_pipeline.generate_video_from_voiceover(
                    str(voiceover), [str(selected_source)], output_temp
                )
                self.assertTrue(Path(result["final_video"]).is_file())

        self.assertEqual(result["voiceover_analysis"], UNORDERED_ANALYSIS)
        analyze.assert_called_once()
        match.assert_called_once_with(
            script_scenes=["first concept", "second concept", "third concept"],
            max_results_per_scene=5,
            video_files=[selected_source.name],
        )
        self.assertEqual(
            assemble.call_args.kwargs["clip_paths"],
            [str(Path(output_temp).resolve() / f"{result['run_id']}_scene_{index:03d}.mp4")
             for index in range(1, 4)],
        )
        assemble.assert_called_once()
        mux.assert_called_once()


if __name__ == "__main__":
    unittest.main()
