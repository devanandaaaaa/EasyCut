import json
import shutil
import subprocess
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

from app.video.assembler import assemble_videos
from app.video.renderer import add_voiceover, probe_media_stream_durations, render_video
from app.video.sequence import plan_selected_repeats


class VoiceoverDurationTests(unittest.TestCase):
    def mocked_mux(self, video_duration, narration_duration, final_video=None, final_audio=None, ffmpeg_error=None):
        calls = []
        video = Path("visual.mp4")
        audio = Path("narration.wav")
        output = Path("final.mp4")

        def run(command, **kwargs):
            calls.append(command)
            if command[0] == "ffprobe":
                if len(calls) == 1:
                    stream = {"codec_type": "video", "duration": str(video_duration)}
                elif len(calls) == 2:
                    stream = {"codec_type": "audio", "duration": str(narration_duration)}
                else:
                    payload = {"streams": [
                        {"codec_type": "video", "duration": str(final_video or narration_duration)},
                        {"codec_type": "audio", "duration": str(final_audio or narration_duration)},
                    ]}
                    return SimpleNamespace(stdout=json.dumps(payload), stderr="")
                return SimpleNamespace(stdout=json.dumps({"streams": [stream]}), stderr="")
            if ffmpeg_error:
                raise subprocess.CalledProcessError(1, command, stderr="synthetic FFmpeg failure")
            return SimpleNamespace(stdout="", stderr="")

        with patch.object(Path, "exists", return_value=True), patch.object(Path, "mkdir"):
            with patch("app.video.renderer.subprocess.run", side_effect=run):
                add_voiceover(str(video), str(audio), str(output))
        return calls

    def test_short_visual_sequence_is_rejected_until_selected_footage_is_extended(self):
        with self.assertRaisesRegex(ValueError, "extend the sequence"):
            self.mocked_mux(2.0, 5.0)

    def test_longer_visual_sequence_is_cut_to_narration_duration(self):
        calls = self.mocked_mux(8.0, 5.0)
        command = calls[2]
        self.assertEqual(command[command.index("-t") + 1], "5.000000")
        self.assertNotIn("-stream_loop", command)

    def test_approximately_equal_media_uses_narration_duration(self):
        self.mocked_mux(5.02, 5.0)

    def test_final_stream_mismatch_is_rejected(self):
        with self.assertRaisesRegex(RuntimeError, "mismatched audio/video"):
            self.mocked_mux(6.0, 5.0, final_video=4.2, final_audio=5.0)

    def test_ffmpeg_failure_is_propagated(self):
        with self.assertRaises(subprocess.CalledProcessError):
            self.mocked_mux(6.0, 5.0, ffmpeg_error=True)

    def test_insufficient_footage_repeats_short_shots_in_semantic_order(self):
        plan = plan_selected_repeats(
            [("a.mp4", 2.0), ("b.mp4", 2.0), ("c.mp4", 2.0)],
            target_duration=15.0,
        )
        repeated_paths = [path for path, _, _ in plan]
        self.assertEqual(repeated_paths[:3], ["a.mp4", "b.mp4", "c.mp4"])
        self.assertEqual(repeated_paths[:3], repeated_paths[3:6])
        self.assertTrue(all(end - start <= 1.25 for _, start, end in plan))
        self.assertNotEqual(
            [(path, start, end) for path, start, end in plan[:3]],
            [(path, start, end) for path, start, end in plan[3:6]],
            "Later extension passes must use different short portions, not replay the complete montage cuts.",
        )
        self.assertGreaterEqual(sum(end - start for _, start, end in plan), 8.9)

    @unittest.skipUnless(shutil.which("ffmpeg"), "FFmpeg unavailable")
    def test_real_ffmpeg_repeated_selected_cuts_cover_narration(self):
        test_root = Path(__file__).resolve().parent
        with tempfile.TemporaryDirectory(prefix=".voiceover-fixture-", dir=test_root) as temporary_directory:
            work = Path(temporary_directory)
            clips = []
            for index, color in enumerate(("red", "green", "blue")):
                clip = work / f"selected-{index}.mp4"
                subprocess.run([
                    "ffmpeg", "-y", "-f", "lavfi", "-i",
                    f"testsrc=size=160x120:rate=15:duration=1.2,drawbox=x=0:y=0:w=50:h=50:color={color}:t=fill",
                    "-an", "-c:v", "libx264", "-pix_fmt", "yuv420p", str(clip),
                ], check=True, capture_output=True, text=True)
                clips.append(clip)

            measured = [probe_media_stream_durations(clip)["video"] for clip in clips]
            selected_duration = sum(measured)
            target = selected_duration + 2.0
            repeat_plan = plan_selected_repeats(
                [(str(path), duration) for path, duration in zip(clips, measured)],
                target,
                segment_duration=0.7,
            )
            repeated = []
            for index, (source, start, end) in enumerate(repeat_plan):
                repeated_path = work / f"repeat-{index}.mp4"
                render_video(source, start, end, str(repeated_path))
                repeated.append(str(repeated_path))

            assembled = work / "assembled.mp4"
            assemble_videos([str(path) for path in clips] + repeated, str(assembled), normalize_video=True)
            audio = work / "narration.wav"
            subprocess.run([
                "ffmpeg", "-y", "-f", "lavfi", "-i", f"sine=frequency=440:duration={target}",
                "-c:a", "pcm_s16le", str(audio),
            ], check=True, capture_output=True, text=True)
            final = work / "final.mp4"
            add_voiceover(str(assembled), str(audio), str(final))

            streams = probe_media_stream_durations(final)
            self.assertLessEqual(abs(streams["video"] - streams["audio"]), 0.1)
            self.assertGreaterEqual(streams["video"] + 0.1, target)

            hashes = subprocess.run([
                "ffmpeg", "-v", "error", "-i", str(final), "-vf", "fps=1",
                "-f", "framemd5", "-",
            ], check=True, capture_output=True, text=True).stdout
            frame_hashes = [line.rsplit(",", 1)[-1].strip() for line in hashes.splitlines() if line and not line.startswith("#")]
            self.assertGreaterEqual(len(set(frame_hashes)), 3)


if __name__ == "__main__":
    unittest.main()
