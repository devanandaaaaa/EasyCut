import base64
import binascii
import json
import shutil
import struct
import subprocess
import unittest
from uuid import uuid4
import zlib
from pathlib import Path
from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.processing.routes import EditVideoRequest, edit_generated_video
from app.models import Base, Project, ProjectFile, User


def _run_owned_export(request):
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    session = sessionmaker(bind=engine)()
    user = User(username="exporter", email="exporter@example.test", password_hash="test")
    session.add(user)
    session.commit()
    session.refresh(user)
    timeline = [{"url": f"/generated/{name}"} for name in request.timeline_clips]
    project = Project(
        name="Export test",
        owner_id=user.id,
        video_url=request.video_url,
        editor_settings=json.dumps({"timelineClips": timeline}),
    )
    session.add(project)
    session.commit()
    session.refresh(project)
    request.project_id = project.id
    generated = Path(__file__).resolve().parents[2] / "data" / "generated"
    media_names = {Path(request.video_url).name, *request.timeline_clips}
    session.add_all([
        ProjectFile(
            project_id=project.id,
            original_name=name,
            stored_path=str((generated / name).resolve()),
            file_type="video/mp4",
        )
        for name in media_names
    ])
    session.commit()
    try:
        return edit_generated_video(request, user, session)
    finally:
        session.close()
        engine.dispose()


def _png_solid(width, height, rgba):
    def chunk(kind, payload):
        return (struct.pack(">I", len(payload)) + kind + payload
                + struct.pack(">I", binascii.crc32(kind + payload) & 0xFFFFFFFF))

    row = b"\x00" + bytes(rgba) * width
    raw = row * height
    return (b"\x89PNG\r\n\x1a\n"
            + chunk(b"IHDR", struct.pack(">2I5B", width, height, 8, 6, 0, 0, 0))
            + chunk(b"IDAT", zlib.compress(raw))
            + chunk(b"IEND", b""))


@unittest.skipUnless(shutil.which("ffmpeg") and shutil.which("ffprobe"), "FFmpeg unavailable")
class EditorOverlayExportTests(unittest.TestCase):
    def test_single_text_and_multiple_stickers_are_burned_into_mp4(self):
        generated = Path(__file__).resolve().parents[2] / "data" / "generated"
        generated.mkdir(parents=True, exist_ok=True)
        source = generated / f"overlay_test_source_{uuid4().hex}.mp4"
        output = None
        try:
            subprocess.run([
                "ffmpeg", "-y", "-f", "lavfi", "-i",
                "color=c=black:s=640x360:d=2:r=25", "-an", "-c:v", "libx264",
                "-pix_fmt", "yuv420p", str(source),
            ], check=True, capture_output=True, text=True)
            pngs = [
                "data:image/png;base64," + base64.b64encode(_png_solid(360, 360, color)).decode("ascii")
                for color in ((255, 0, 0, 255), (0, 255, 0, 255))
            ]
            result = _run_owned_export(EditVideoRequest(
                project_id=0,
                video_url=f"/generated/{source.name}",
                trim_start=0,
                trim_end=2,
                overlay_text="SINGLE TEXT",
                text_position="top",
                text_color="#ffffff",
                text_size=32,
                text_start=0,
                text_end=2,
                sticker_overlays=[
                    {"data": pngs[0], "x": 5, "y": 5, "width": 20, "start": 0, "end": 0},
                    {"data": pngs[1], "x": 75, "y": 70, "width": 12, "start": 0, "end": 0},
                ],
            ))
            output = generated / Path(result["video_url"]).name
            decoded = subprocess.run([
                "ffmpeg", "-v", "error", "-ss", "1", "-i", str(output),
                "-frames:v", "1", "-f", "rawvideo", "-pix_fmt", "rgb24", "pipe:1",
            ], check=True, capture_output=True)
            frame = decoded.stdout
            pixels = [frame[index:index + 3] for index in range(0, len(frame), 3)]
            counts = {
                "red": sum(r > 180 and g < 80 and b < 80 for r, g, b in pixels),
                "green": sum(g > 180 and r < 80 and b < 80 for r, g, b in pixels),
                "white": sum(r > 180 and g > 180 and b > 180 for r, g, b in pixels),
                "blue": sum(b > 120 and g > 80 and r < 100 for r, g, b in pixels),
            }
            self.assertGreater(counts["red"], 500, counts)
            self.assertGreater(counts["green"], 100, counts)
            self.assertGreater(counts["white"], 100, counts)
            self.assertEqual(counts["blue"], 0, counts)
            probe = subprocess.run([
                "ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "json", str(output),
            ], check=True, capture_output=True, text=True)
            self.assertAlmostEqual(float(json.loads(probe.stdout)["format"]["duration"]), 2, delta=0.08)
        finally:
            source.unlink(missing_ok=True)
            if output:
                output.unlink(missing_ok=True)

    def test_short_trim_applies_single_text_time_range_at_expected_output_times(self):
        generated = Path(__file__).resolve().parents[2] / "data" / "generated"
        generated.mkdir(parents=True, exist_ok=True)
        source = generated / f"timed_overlay_source_{uuid4().hex}.mp4"
        output = None
        try:
            subprocess.run([
                "ffmpeg", "-y", "-f", "lavfi", "-i",
                "color=c=black:s=640x360:d=4:r=25", "-an", "-c:v", "libx264",
                "-pix_fmt", "yuv420p", str(source),
            ], check=True, capture_output=True, text=True)
            result = _run_owned_export(EditVideoRequest(
                project_id=0,
                video_url=f"/generated/{source.name}",
                trim_start=0.25,
                trim_end=3.75,
                overlay_text="TIMED TEXT",
                text_position="top",
                text_color="#ff0000",
                text_size=36,
                text_start=0.5,
                text_end=1.5,
            ))
            output = generated / Path(result["video_url"]).name

            def frame_colors(seconds):
                decoded = subprocess.run([
                    "ffmpeg", "-v", "error", "-ss", str(seconds), "-i", str(output),
                    "-frames:v", "1", "-f", "rawvideo", "-pix_fmt", "rgb24", "pipe:1",
                ], check=True, capture_output=True)
                frame = decoded.stdout
                pixels = [frame[index:index + 3] for index in range(0, len(frame), 3)]
                return {
                    "red": sum(r > 130 and g < 100 and b < 100 for r, g, b in pixels),
                }

            first_range = frame_colors(0.75)
            gap = frame_colors(1.75)
            self.assertGreater(first_range["red"], 100, first_range)
            self.assertEqual(gap["red"], 0, gap)

            probe = subprocess.run([
                "ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "json", str(output),
            ], check=True, capture_output=True, text=True)
            self.assertAlmostEqual(float(json.loads(probe.stdout)["format"]["duration"]), 3.5, delta=0.08)
        finally:
            source.unlink(missing_ok=True)
            if output:
                output.unlink(missing_ok=True)

    def test_invalid_trim_ranges_are_rejected_by_export_route(self):
        generated = Path(__file__).resolve().parents[2] / "data" / "generated"
        generated.mkdir(parents=True, exist_ok=True)
        source = generated / f"invalid_trim_source_{uuid4().hex}.mp4"
        try:
            subprocess.run([
                "ffmpeg", "-y", "-f", "lavfi", "-i",
                "color=c=black:s=320x180:d=2:r=25", "-an", "-c:v", "libx264",
                "-pix_fmt", "yuv420p", str(source),
            ], check=True, capture_output=True, text=True)
            for trim_start, trim_end, expected in (
                (0, 0, "Trim end must be greater than trim start."),
                (1, 1, "Trim end must be greater than trim start."),
                (0, 3, "Trim end cannot exceed the source video's duration."),
            ):
                with self.subTest(trim_start=trim_start, trim_end=trim_end):
                    with self.assertRaises(HTTPException) as raised:
                        _run_owned_export(EditVideoRequest(
                            project_id=0,
                            video_url=f"/generated/{source.name}",
                            trim_start=trim_start,
                            trim_end=trim_end,
                        ))
                    self.assertEqual(raised.exception.status_code, 400)
                    self.assertEqual(raised.exception.detail, expected)
        finally:
            source.unlink(missing_ok=True)


if __name__ == "__main__":
    unittest.main()
