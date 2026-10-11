from pathlib import Path
import shutil

from fastapi import APIRouter, HTTPException, UploadFile, File
from pydantic import BaseModel
from google.genai import errors

from app.processing.auto_editor import generate_video_from_script
from app.processing.voiceover_pipeline import generate_video_from_voiceover


router = APIRouter(
    prefix="/processing",
    tags=["Processing"]
)


class ScriptProcessingRequest(BaseModel):
    script: str
    source_video: str


# ============================================================
# PROCESSING HEALTH
# ============================================================

@router.get("/health")
def processing_health():
    return {
        "status": "ok",
        "service": "processing"
    }


# ============================================================
# SCRIPT → AI VIDEO
# ============================================================

@router.post("/script")
def process_script(request: ScriptProcessingRequest):
    try:
        result = generate_video_from_script(
            script=request.script,
            source_video=request.source_video
        )

        return {
            "status": "success",
            "result": result
        }

    except FileNotFoundError as error:
        raise HTTPException(
            status_code=404,
            detail=str(error)
        )

    except errors.ClientError as error:
        # Gemini API quota / rate-limit errors
        if getattr(error, "code", None) == 429:
            raise HTTPException(
                status_code=429,
                detail=(
                    "Gemini API quota has been exceeded. "
                    "Please wait for the quota to reset or "
                    "check your Gemini API usage and billing."
                )
            )

        raise HTTPException(
            status_code=500,
            detail=str(error)
        )

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=str(error)
        )


# ============================================================
# VOICEOVER → AI VIDEO
# ============================================================

@router.post("/voiceover")
async def process_voiceover(
    voiceover: UploadFile = File(...)
):
    try:
        if not voiceover.filename:
            raise HTTPException(
                status_code=400,
                detail="Voiceover file name is missing"
            )

        upload_dir = (
            Path("uploads")
            / "voiceovers"
        )

        upload_dir.mkdir(
            parents=True,
            exist_ok=True
        )

        file_path = (
            upload_dir
            / voiceover.filename
        )

        with file_path.open("wb") as buffer:
            shutil.copyfileobj(
                voiceover.file,
                buffer
            )

        result = generate_video_from_voiceover(
            voiceover_path=str(file_path)
        )

        return {
            "status": "success",
            "result": result
        }

    except HTTPException:
        raise

    except FileNotFoundError as error:
        raise HTTPException(
            status_code=404,
            detail=str(error)
        )

    except errors.ClientError as error:
        # Gemini API quota / rate-limit errors
        if getattr(error, "code", None) == 429:
            raise HTTPException(
                status_code=429,
                detail=(
                    "Gemini API quota has been exceeded. "
                    "Please wait for the quota to reset or "
                    "check your Gemini API usage and billing."
                )
            )

        raise HTTPException(
            status_code=500,
            detail=str(error)
        )

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=str(error)
        )