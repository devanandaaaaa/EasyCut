
from pathlib import Path
import base64
import binascii
import struct
import shutil
from uuid import uuid4

from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Depends
from pydantic import BaseModel
from google.genai import errors
from sqlalchemy.orm import Session

import json
import re
import subprocess
import logging
from urllib.parse import urlparse
from pydantic import BaseModel, Field

from app.video.frame_extractor import extract_frame_samples
from app.processing.video_indexer import index_extracted_frames
from app.processing.auto_editor import generate_video_from_script
from app.processing.voiceover_pipeline import generate_video_from_voiceover
from app.audio.voiceover_analyzer import VoiceoverAnalysisUnavailable
from app.processing.video_library import index_single_video
from app.video.renderer import STREAM_DURATION_TOLERANCE, probe_media_stream_durations
from app.models import ProjectFile, User
from app.routes import find_owned_project, get_db
from app.security import get_current_user


router = APIRouter(
    prefix="/processing",
    tags=["Processing"],
)
logger = logging.getLogger(__name__)


class ScriptProcessingRequest(BaseModel):
    script: str
    project_id: int
    source_video: str | None = None
    source_videos: list[str] | None = None


def _owned_source_video_paths(
    project_id: int,
    selected_videos: list[str] | None,
    current_user: User,
    db: Session,
) -> list[str]:
    find_owned_project(project_id, current_user.id, db)
    if not selected_videos:
        raise HTTPException(status_code=400, detail="Select at least one source video.")

    project_files = db.query(ProjectFile).filter(
        ProjectFile.project_id == project_id,
    ).all()
    owned_paths = {
        Path(item.stored_path).resolve()
        for item in project_files
        if Path(item.original_name).suffix.lower() in {".mp4", ".mov", ".webm"}
        or item.file_type.lower().startswith("video/")
    }
    project_root = Path(__file__).resolve().parents[3]
    source_root = (project_root / "data" / "source_videos").resolve()
    resolved = []

    for selected in selected_videos:
        candidate_input = Path(selected)
        candidate = (
            candidate_input.resolve()
            if candidate_input.is_absolute()
            else (source_root / candidate_input.name).resolve()
        )
        if (
            candidate.parent != source_root
            or candidate.suffix.lower() not in {".mp4", ".mov", ".webm"}
            or candidate not in owned_paths
            or not candidate.is_file()
        ):
            raise HTTPException(status_code=404, detail="Source video not found in this project.")
        if str(candidate) not in resolved:
            resolved.append(str(candidate))

    return resolved


def _register_generated_media(
    project_id: int,
    result: dict,
    db: Session,
    include_rendered_clips: bool = False,
) -> None:
    generated_root = (Path(__file__).resolve().parents[3] / "data" / "generated").resolve()
    candidates = [result.get("final_video")]
    if include_rendered_clips:
        candidates.extend(result.get("rendered_clips") or [])

    for value in candidates:
        if not isinstance(value, str) or not value:
            continue
        path = Path(value).resolve()
        if path.parent != generated_root or not path.is_file():
            continue
        exists = db.query(ProjectFile).filter(
            ProjectFile.project_id == project_id,
            ProjectFile.stored_path == str(path),
        ).first()
        if not exists:
            db.add(ProjectFile(
                project_id=project_id,
                original_name=path.name,
                stored_path=str(path),
                file_type="video/mp4",
            ))
    db.commit()


def _project_generated_filenames(project_id: int, db: Session) -> set[str]:
    generated_root = (Path(__file__).resolve().parents[3] / "data" / "generated").resolve()
    records = db.query(ProjectFile).filter(
        ProjectFile.project_id == project_id,
    ).all()
    return {
        Path(record.stored_path).name
        for record in records
        if Path(record.stored_path).resolve().parent == generated_root
    }

# ============================================================
# VIDEO UPLOAD AND INDEXING
# ============================================================

@router.post("/upload-video")
async def upload_video(
    video: UploadFile = File(...),
    project_id: int = Form(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    find_owned_project(project_id, current_user.id, db)
    if not video.filename:
        raise HTTPException(
            status_code=400,
            detail="Video filename is missing.",
        )

    allowed_extensions = {".mp4", ".mov", ".webm"}
    extension = Path(video.filename).suffix.lower()

    if extension not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail="Only MP4, MOV, and WebM videos are supported.",
        )

    project_root = Path(__file__).resolve().parents[3]
    upload_dir = project_root / "data" / "source_videos"
    frames_root = project_root / "data" / "frames"

    upload_dir.mkdir(parents=True, exist_ok=True)

    safe_filename = f"{uuid4().hex}{extension}"
    file_path = upload_dir / safe_filename
    frames_dir = frames_root / Path(safe_filename).stem

    try:
        with file_path.open("wb") as buffer:
            shutil.copyfileobj(video.file, buffer)
    finally:
        await video.close()

    project_file = ProjectFile(
        project_id=project_id,
        original_name=Path(video.filename).name,
        stored_path=str(file_path.resolve()),
        file_type=video.content_type or "application/octet-stream",
    )
    db.add(project_file)
    db.commit()

    indexed_scenes = []

    try:
        frame_samples = extract_frame_samples(
            video_path=str(file_path),
            output_dir=str(frames_dir),
            interval_seconds=5.0,
        )

        indexed_scenes = index_extracted_frames(
            frame_paths=frame_samples,
            video_file=safe_filename,
            interval_seconds=5.0,
        )

        return {
            "status": "success",
            "filename": safe_filename,
            "source_video": str(file_path),
            "frame_count": len(frame_samples),
            "indexed_scene_count": len(indexed_scenes),
            "indexing_status": "completed",
            "message": "Video uploaded and indexed successfully.",
        }

    except Exception as error:
        error_message = str(error)

        if (
            "429" in error_message
            or "RESOURCE_EXHAUSTED" in error_message
        ):
            return {
                "status": "uploaded",
                "filename": safe_filename,
                "source_video": str(file_path),
                "frame_count": len(frame_samples),
                "indexed_scene_count": len(indexed_scenes),
                "indexing_status": "quota_exceeded",
                "message": (
                    "Video uploaded successfully, but AI indexing "
                    "was paused because the Gemini API quota was "
                    "exceeded. Retry indexing after the quota resets."
                ),
            }

        raise HTTPException(
            status_code=500,
            detail=(
                f"Video was uploaded but indexing failed: "
                f"{error_message}"
            ),
        )


@router.post("/retry-indexing/{filename}")
def retry_video_indexing(
    filename: str,
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Only accept a filename, never a user-supplied directory path.
    if Path(filename).name != filename:
        raise HTTPException(
            status_code=400,
            detail="Invalid video filename.",
        )

    _owned_source_video_paths(project_id, [filename], current_user, db)

    try:
        project_root = Path(__file__).resolve().parents[3]

        result = index_single_video(
            video_file=filename,
            source_dir=str(project_root / "data" / "source_videos"),
            frames_dir=str(project_root / "data" / "frames"),
            interval_seconds=2.0,
            retry_incomplete=True,
        )

        return {
            "status": "success",
            "result": result,
        }

    except FileNotFoundError as error:
        raise HTTPException(status_code=404, detail=str(error))

    except errors.ClientError as error:
        if getattr(error, "code", None) == 429:
            raise HTTPException(
                status_code=429,
                detail=(
                    "Gemini quota exceeded. Wait for the quota "
                    "to reset, then retry indexing."
                ),
            )

        raise HTTPException(status_code=500, detail=str(error))

    except Exception as error:
        raise HTTPException(status_code=500, detail=str(error))

# ============================================================
# PROCESSING HEALTH
# ============================================================

@router.get("/health")
def processing_health():
    return {
        "status": "ok",
        "service": "processing",
    }


# ============================================================
# SCRIPT → AI VIDEO
# ============================================================


@router.post("/script")
def process_script(
    request: ScriptProcessingRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    selected_videos = request.source_videos or (
        [request.source_video] if request.source_video else None
    )
    owned_videos = _owned_source_video_paths(
        request.project_id, selected_videos, current_user, db,
    )
    try:
        result = generate_video_from_script(
            script=request.script,
            source_videos=owned_videos,
        )
    except FileNotFoundError as error:
        raise HTTPException(status_code=404, detail=str(error))
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error))

    _register_generated_media(
        request.project_id, result, db, include_rendered_clips=True,
    )

    return {
        "status": "success",
        "result": result,
    }



# ============================================================
# VOICEOVER → AI VIDEO
# ============================================================

@router.post("/voiceover")
async def process_voiceover(
    voiceover: UploadFile = File(...),
    project_id: int = Form(...),
    source_videos: str | None = Form(default=None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    find_owned_project(project_id, current_user.id, db)
    if not voiceover.filename:
        raise HTTPException(
            status_code=400,
            detail="Voiceover file name is missing.",
        )

    # Use a generated filename to avoid unsafe paths and collisions.
    extension = Path(voiceover.filename).suffix.lower()
    allowed_audio_extensions = {
        ".mp3",
        ".wav",
        ".m4a",
        ".ogg",
        ".webm",
    }

    if extension not in allowed_audio_extensions:
        raise HTTPException(
            status_code=400,
            detail=(
                "Unsupported audio format. "
                "Use MP3, WAV, M4A, OGG, or WebM."
            ),
        )

    backend_dir = Path(__file__).resolve().parents[2]
    upload_dir = backend_dir / "uploads" / "voiceovers"
    upload_dir.mkdir(parents=True, exist_ok=True)

    file_path = upload_dir / f"{uuid4().hex}{extension}"

    try:
        with file_path.open("wb") as buffer:
            shutil.copyfileobj(voiceover.file, buffer)
    finally:
        await voiceover.close()

    try:
        selected_videos = None
        if source_videos is not None:
            try:
                selected_videos = json.loads(source_videos)
            except json.JSONDecodeError:
                raise HTTPException(
                    status_code=400,
                    detail="Selected source videos must be a JSON array.",
                )
            if not isinstance(selected_videos, list) or not all(
                isinstance(item, str) and item.strip()
                for item in selected_videos
            ):
                raise HTTPException(
                    status_code=400,
                    detail="Selected source videos must be a list of filenames or paths.",
                )
        if not selected_videos:
            raise HTTPException(
                status_code=400,
                detail="Select at least one source video before generating from a voiceover.",
            )

        owned_videos = _owned_source_video_paths(
            project_id, selected_videos, current_user, db,
        )

        result = generate_video_from_voiceover(
            voiceover_path=str(file_path),
            source_videos=owned_videos,
        )
        _register_generated_media(project_id, result, db)

        return {
            "status": "success",
            "result": result,
        }

    except HTTPException:
        raise

    except FileNotFoundError as error:
        raise HTTPException(
            status_code=404,
            detail=str(error),
        )

    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error))

    except VoiceoverAnalysisUnavailable as error:
        raise HTTPException(status_code=503, detail=str(error))

    except errors.ClientError as error:
        if getattr(error, "code", None) == 429:
            raise HTTPException(
                status_code=429,
                detail=(
                    "Gemini API quota has been exceeded. "
                    "Please wait for the quota to reset or "
                    "check your Gemini API usage and billing."
                ),
            )

        raise HTTPException(
            status_code=500,
            detail=str(error),
        )

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=str(error),
        )


# ============================================================
# EDIT GENERATED VIDEO → FINAL MP4
# ============================================================

class EditVideoRequest(BaseModel):
    project_id: int
    video_url: str
    trim_start: float = Field(default=0.0, ge=0.0)
    trim_end: float = Field(default=0.0, ge=0.0)
    overlay_text: str = Field(default="", max_length=300)
    text_position: str = "bottom"
    playback_speed: float = Field(default=1.0, ge=0.25, le=2.0)
    volume: int = Field(default=100, ge=0, le=100)
    muted: bool = False
    preset_filter: str = "none"
    text_color: str = "#ffffff"
    text_size: int = Field(default=36, ge=16, le=96)
    text_start: float = Field(default=0.0, ge=0.0)
    text_end: float = Field(default=0.0, ge=0.0)
    filter_start: float = Field(default=0.0, ge=0.0)
    filter_end: float = Field(default=0.0, ge=0.0)
    sticker_data: str = Field(default="", max_length=480000)
    sticker_x: int = Field(default=5, ge=0, le=95)
    sticker_y: int = Field(default=5, ge=0, le=95)
    sticker_width: int = Field(default=20, ge=5, le=60)
    sticker_start: float = Field(default=0.0, ge=0.0)
    sticker_end: float = Field(default=0.0, ge=0.0)
    sticker_overlays: list["StickerOverlaySpec"] = Field(default_factory=list, max_length=12)
    timeline_clips: list[str] = Field(default_factory=list, max_length=100)
    timeline_enabled: bool = False


class StickerOverlaySpec(BaseModel):
    data: str = Field(max_length=480_000)
    x: int = Field(default=5, ge=0, le=95)
    y: int = Field(default=5, ge=0, le=95)
    width: int = Field(default=20, ge=5, le=60)
    start: float = Field(default=0.0, ge=0.0)
    end: float = Field(default=0.0, ge=0.0)


def _atempo_filters(speed: float) -> str:
    """Build FFmpeg atempo filters for playback speeds from 0.25x to 2x."""
    filters = []
    remaining = speed

    while remaining < 0.5:
        filters.append("atempo=0.5")
        remaining /= 0.5

    while remaining > 2.0:
        filters.append("atempo=2.0")
        remaining /= 2.0

    filters.append(f"atempo={remaining:.6f}")
    return ",".join(filters)


@router.post("/edit-video")
def edit_generated_video(
    request: EditVideoRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    project = find_owned_project(request.project_id, current_user.id, db)
    authorized_filenames = _project_generated_filenames(request.project_id, db)

    project_root = Path(__file__).resolve().parents[3]
    generated_dir = (project_root / "data" / "generated").resolve()
    generated_dir.mkdir(parents=True, exist_ok=True)

    # Accept a generated-video URL or filename, but never an arbitrary path.
    parsed_url = urlparse(request.video_url)
    filename = Path(parsed_url.path).name

    if not filename or filename in {".", ".."}:
        raise HTTPException(status_code=400, detail="Invalid video filename.")
    if filename not in authorized_filenames:
        raise HTTPException(status_code=404, detail="Generated source video was not found in this project.")

    source_file = (generated_dir / filename).resolve()

    if source_file.parent != generated_dir or not source_file.is_file():
        raise HTTPException(
            status_code=404,
            detail="Generated source video was not found.",
        )

    if source_file.suffix.lower() != ".mp4":
        raise HTTPException(
            status_code=400,
            detail="Only generated MP4 videos can be edited.",
        )

    if request.timeline_enabled and not request.timeline_clips:
        raise HTTPException(
            status_code=400,
            detail="This project has no scene clips left to export.",
        )
    if len(set(request.timeline_clips)) != len(request.timeline_clips):
        raise HTTPException(
            status_code=400,
            detail="The timeline contains duplicate scene references.",
        )

    timeline_source = None
    def cleanup_timeline_source():
        if timeline_source and timeline_source.exists():
            timeline_source.unlink()

    if request.timeline_clips:
        timeline_files = []
        for clip_name in request.timeline_clips:
            safe_name = Path(clip_name).name
            if safe_name != clip_name or Path(safe_name).suffix.lower() != ".mp4":
                raise HTTPException(status_code=400, detail="Invalid timeline clip reference.")
            if safe_name not in authorized_filenames:
                raise HTTPException(status_code=404, detail="Timeline clip was not found in this project.")
            clip_path = (generated_dir / safe_name).resolve()
            if clip_path.parent != generated_dir or not clip_path.is_file():
                raise HTTPException(status_code=404, detail="A timeline clip is no longer available.")
            timeline_files.append(clip_path)
        timeline_source = generated_dir / f".timeline_{uuid4().hex}.mp4"
        concat_file = generated_dir / f".timeline_{uuid4().hex}.txt"
        try:
            concat_file.write_text("".join(
                f"file '{str(path).replace(chr(39), chr(39) + chr(92) + chr(39) + chr(39))}'\n"
                for path in timeline_files
            ), encoding="utf-8")
            subprocess.run(
                ["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", str(concat_file), "-c", "copy", str(timeline_source)],
                check=True, capture_output=True, text=True,
            )
            source_file = timeline_source
        except subprocess.CalledProcessError as error:
            if timeline_source.exists():
                timeline_source.unlink()
            raise HTTPException(status_code=400, detail=f"Could not assemble the edited timeline: {(error.stderr or str(error))[-1000:]}")
        finally:
            if concat_file.exists():
                concat_file.unlink()

    if request.text_position not in {"top", "center", "bottom"}:
        cleanup_timeline_source()
        raise HTTPException(
            status_code=400,
            detail="Text position must be top, center, or bottom.",
        )
    if not re.fullmatch(r"#[0-9A-Fa-f]{6}", request.text_color):
        cleanup_timeline_source()
        raise HTTPException(status_code=400, detail="Text colour must be a six-digit hex colour.")

    filter_chains = {
        "none": None,
        "cinematic": "eq=contrast=1.08:saturation=0.86:brightness=-0.015",
        "travel": "eq=contrast=1.06:saturation=1.22:brightness=0.01",
        "warm": "colorbalance=rs=0.04:gs=0.01:bs=-0.04",
        "monochrome": "hue=s=0",
        "vivid": "eq=contrast=1.04:saturation=1.3:brightness=0.01",
    }
    if request.preset_filter not in filter_chains:
        cleanup_timeline_source()
        raise HTTPException(status_code=400, detail="Unsupported visual filter.")

    if not 0.25 <= request.playback_speed <= 2.0:
        cleanup_timeline_source()
        raise HTTPException(
            status_code=400,
            detail="Playback speed must be between 0.25x and 2x.",
        )

    # Probe source duration and whether it contains audio.
    probe_command = [
        "ffprobe", "-v", "error",
        "-show_entries", "format=duration",
        "-show_entries", "stream=codec_type,width,height",
        "-of", "json", str(source_file),
    ]

    try:
        probe_result = subprocess.run(
            probe_command,
            check=True,
            capture_output=True,
            text=True,
        )
        probe_data = json.loads(probe_result.stdout)
        source_duration = float(probe_data["format"]["duration"])
        streams = probe_data.get("streams", [])
        has_audio = any(stream.get("codec_type") == "audio" for stream in streams)
        source_width = next(stream["width"] for stream in streams if stream.get("codec_type") == "video")
        source_streams = probe_media_stream_durations(source_file)
        logger.info(
            "Edit source %s stream durations: video=%s audio=%s",
            source_file.name,
            source_streams["video"],
            source_streams["audio"],
        )
    except (subprocess.CalledProcessError, ValueError, KeyError, json.JSONDecodeError) as error:
        cleanup_timeline_source()
        raise HTTPException(
            status_code=500,
            detail=f"Could not inspect the source video: {error}",
        )

    # Scene removal can shorten a previously edited sequence. Clamp saved
    # ranges against the assembled source so stale end times do not fail export.
    start = request.trim_start
    end = request.trim_end
    if start >= source_duration:
        cleanup_timeline_source()
        raise HTTPException(status_code=400, detail="Trim start must be before the source video's end.")
    if end <= start:
        cleanup_timeline_source()
        raise HTTPException(status_code=400, detail="Trim end must be greater than trim start.")
    if end > source_duration:
        cleanup_timeline_source()
        raise HTTPException(status_code=400, detail="Trim end cannot exceed the source video's duration.")

    text_start = request.text_start
    text_end = request.text_end if request.text_end > 0 else source_duration
    if request.overlay_text.strip() and (
        text_start >= text_end or text_end > source_duration
    ):
        cleanup_timeline_source()
        raise HTTPException(
            status_code=400,
            detail="Text start time must be less than its end time, and text end cannot exceed the source video's duration.",
        )

    filter_start = min(request.filter_start, source_duration)
    filter_end = min(request.filter_end, source_duration) if request.filter_end > 0 else 0.0
    preset_filter = request.preset_filter
    if filter_start >= source_duration or (filter_end > 0 and filter_end <= filter_start):
        preset_filter = "none"

    sticker_overlays = [sticker.model_dump() for sticker in request.sticker_overlays]
    if not sticker_overlays and request.sticker_data:
        sticker_overlays = [{
            "data": request.sticker_data,
            "x": request.sticker_x,
            "y": request.sticker_y,
            "width": request.sticker_width,
            "start": request.sticker_start,
            "end": request.sticker_end,
        }]

    sticker_files = []
    for sticker in sticker_overlays:
        try:
            if (not isinstance(sticker, dict)
                    or not 0 <= int(sticker.get("x", 5)) <= 95
                    or not 0 <= int(sticker.get("y", 5)) <= 95
                    or not 5 <= int(sticker.get("width", 20)) <= 60
                    or float(sticker.get("start", 0)) < 0
                    or float(sticker.get("end", 0)) < 0):
                raise ValueError("Sticker position, size, or timing is invalid.")
            header, encoded = sticker.get("data", "").split(",", 1)
            if header != "data:image/png;base64":
                raise ValueError("Only PNG images are supported.")
            image_bytes = base64.b64decode(encoded, validate=True)
            if (len(image_bytes) > 350_000 or not image_bytes.startswith(b"\x89PNG\r\n\x1a\n")
                    or len(image_bytes) < 24):
                raise ValueError("PNG image is invalid or too large.")
            width, height = struct.unpack(">II", image_bytes[16:24])
            if not (1 <= width <= 2048 and 1 <= height <= 2048):
                raise ValueError("PNG dimensions must be at most 2048 by 2048.")
            sticker_file = generated_dir / f".sticker_{uuid4().hex}.png"
            sticker_file.write_bytes(image_bytes)
            sticker_files.append((sticker_file, sticker))
        except (ValueError, binascii.Error, struct.error) as error:
            cleanup_timeline_source()
            for path, _ in sticker_files:
                path.unlink(missing_ok=True)
            raise HTTPException(status_code=400, detail=f"Invalid sticker image: {error}")

    output_file = generated_dir / f"edited_video_{uuid4().hex}.mp4"
    temporary_text_files = []

    # Video filter: trim, reset timestamps, and apply playback speed.
    video_filters = [
        f"trim=start={start:.6f}:end={end:.6f}",
        "setpts=PTS-STARTPTS",
    ]

    if filter_chains[preset_filter]:
        filter_chain = filter_chains[preset_filter]
        active_filter_start = max(start, filter_start)
        active_filter_end = min(end, filter_end if filter_end > 0 else end)
        if filter_start > 0 or filter_end > 0:
            if active_filter_start < active_filter_end:
                relative_start = (active_filter_start - start) / request.playback_speed
                relative_end = (active_filter_end - start) / request.playback_speed
                filter_chain += f":enable='between(t,{relative_start:.6f},{relative_end:.6f})'"
                video_filters.append(filter_chain)
        else:
            video_filters.append(filter_chain)

    if request.playback_speed != 1.0:
        video_filters.append(
            f"setpts=PTS/{request.playback_speed:.6f}"
        )

    # Text files avoid most FFmpeg drawtext escaping problems.
    font_path = "C\\:/Windows/Fonts/arial.ttf"
    if request.overlay_text.strip():
        overlay_start = max(start, text_start)
        overlay_end = min(end, text_end)
        if text_start < source_duration and overlay_start < overlay_end:
            temporary_text_file = generated_dir / f".overlay_{uuid4().hex}.txt"
            temporary_text_file.write_text(
                request.overlay_text.replace("\r", " ").replace("\n", " "), encoding="utf-8"
            )
            temporary_text_files.append(temporary_text_file)
            text_path = str(temporary_text_file.resolve()).replace("\\", "/").replace(":", r"\:")
            position = request.text_position
            size = request.text_size
            if position == "top":
                y_position = "40"
            elif position == "center":
                y_position = "(h-text_h)/2"
            else:
                y_position = "h-text_h-40"
            drawtext = (
                "drawtext="
                f"fontfile='{font_path}':textfile='{text_path}':"
                f"fontcolor=0x{request.text_color[1:]}:fontsize={size}:"
                "borderw=2:bordercolor=black:"
                f"x=(w-text_w)/2:y={y_position}"
            )
            relative_start = (overlay_start - start) / request.playback_speed
            relative_end = (overlay_end - start) / request.playback_speed
            drawtext += f":enable='between(t,{relative_start:.6f},{relative_end:.6f})'"
            video_filters.append(drawtext)

    command = ["ffmpeg", "-y", "-i", str(source_file)]
    if sticker_files:
        for sticker_file, _ in sticker_files:
            command.extend(["-loop", "1", "-i", str(sticker_file)])
        graph = f"[0:v]{','.join(video_filters)}[base0];"
        previous_label = "base0"
        for index, (_, sticker) in enumerate(sticker_files):
            input_index = index + 1
            output_label = "outv" if index == len(sticker_files) - 1 else f"base{index + 1}"
            sticker_width = max(1, round(source_width * int(sticker.get("width", 20)) / 100))
            graph += f"[{input_index}:v]scale={sticker_width}:-1[sticker{index}];"
            active_start = max(start, float(sticker.get("start", 0)))
            raw_end = float(sticker.get("end", 0))
            active_end = min(end, raw_end if raw_end > 0 else end)
            enable = ""
            if active_start >= source_duration or active_start >= active_end:
                enable = ":enable='0'"
            elif float(sticker.get("start", 0)) > 0 or raw_end > 0:
                relative_start = max(start, active_start) - start
                relative_end = active_end - start
                enable = f":enable='between(t,{relative_start / request.playback_speed:.6f},{relative_end / request.playback_speed:.6f})'"
            x_expr = f"(W-w)*{int(sticker.get('x', 5))}/100"
            y_expr = f"(H-h)*{int(sticker.get('y', 5))}/100"
            graph += f"[{previous_label}][sticker{index}]overlay=x={x_expr}:y={y_expr}{enable}[{output_label}];"
            previous_label = output_label
        graph = graph.rstrip(";")
        command.extend(["-filter_complex", graph, "-map", "[outv]"])
    else:
        command.extend(["-vf", ",".join(video_filters)])

    if has_audio:
        audio_filters = [
            f"atrim=start={start:.6f}:end={end:.6f}",
            "asetpts=PTS-STARTPTS",
        ]

        if request.playback_speed != 1.0:
            audio_filters.append(_atempo_filters(request.playback_speed))

        if request.muted:
            audio_filters.append("volume=0")
        else:
            audio_filters.append(f"volume={request.volume / 100:.4f}")

        command.extend([
            "-af", ",".join(audio_filters),
            "-map", "0:a:0",
            "-c:a", "aac",
        ])
    else:
        command.append("-an")
        if not sticker_files:
            command.extend(["-map", "0:v:0"])

    output_duration = (end - start) / request.playback_speed
    command.extend([
        "-t", f"{output_duration:.6f}",
        "-c:v", "libx264",
        "-preset", "medium",
        "-pix_fmt", "yuv420p",
        "-movflags", "+faststart",
        str(output_file),
    ])

    try:
        subprocess.run(
            command,
            check=True,
            capture_output=True,
            text=True,
        )
        final_streams = probe_media_stream_durations(output_file)
        logger.info(
            "Edited export %s stream durations: video=%s audio=%s",
            output_file.name,
            final_streams["video"],
            final_streams["audio"],
        )
        video_duration = final_streams["video"]
        audio_duration = final_streams["audio"]
        if not video_duration or (
            audio_duration and abs(video_duration - audio_duration) > STREAM_DURATION_TOLERANCE
        ):
            output_file.unlink(missing_ok=True)
            raise HTTPException(
                status_code=500,
                detail=(
                    "The final export has mismatched audio and video stream durations "
                    f"(video={video_duration}, audio={audio_duration})."
                ),
            )
    except subprocess.CalledProcessError as error:
        if output_file.exists():
            output_file.unlink()

        details = (error.stderr or str(error))[-2000:]
        raise HTTPException(
            status_code=500,
            detail=f"FFmpeg export failed: {details}",
        )
    finally:
        for temporary_text_file in temporary_text_files:
            temporary_text_file.unlink(missing_ok=True)
        for sticker_file, _ in sticker_files:
            sticker_file.unlink(missing_ok=True)
        cleanup_timeline_source()

    project.final_video_url = f"/generated/{output_file.name}"
    db.add(ProjectFile(
        project_id=project.id,
        original_name=output_file.name,
        stored_path=str(output_file.resolve()),
        file_type="video/mp4",
    ))
    db.commit()

    return {
        "status": "success",
        "video_url": f"/generated/{output_file.name}",
        "filename": output_file.name,
        "message": "Edited video exported successfully.",
    }
