
import json
import shutil
from pathlib import Path

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    UploadFile,
    File,
)
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import func, text

from app.auth import hash_password, verify_password
from app.database import SessionLocal
from app.models import User, Project, ProjectFile
from app.schemas import (
    RegisterRequest,
    UserResponse,
    LoginRequest,
    ProjectCreate,
    ProjectResponse,
    ProjectFileResponse,
    ProjectSave,
)
from app.security import create_access_token, get_current_user
from app.subscriptions import FREE_PROJECT_LIMIT, has_active_subscription, project_creation_allowed


router = APIRouter(prefix="/auth", tags=["Authentication"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def find_owned_project(project_id: int, user_id: int, db: Session):
    project = (
        db.query(Project)
        .filter(
            Project.id == project_id,
            Project.owner_id == user_id,
        )
        .first()
    )

    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    return project


# ============================================================
# REGISTER
# ============================================================

@router.post(
    "/register",
    response_model=UserResponse,
    status_code=201,
)
def register_user(
    user_data: RegisterRequest,
    db: Session = Depends(get_db),
):
    existing_username = (
        db.query(User)
        .filter(User.username == user_data.username)
        .first()
    )

    if existing_username:
        raise HTTPException(
            status_code=409,
            detail="Username already exists",
        )

    existing_email = (
        db.query(User)
        .filter(User.email == user_data.email)
        .first()
    )

    if existing_email:
        raise HTTPException(
            status_code=409,
            detail="Email already exists",
        )

    new_user = User(
        username=user_data.username,
        email=user_data.email,
        password_hash=hash_password(user_data.password),
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


# ============================================================
# LOGIN
# ============================================================

@router.post("/login")
def login_user(
    login_data: LoginRequest,
    db: Session = Depends(get_db),
):
    user = (
        db.query(User)
        .filter(User.email == login_data.email)
        .first()
    )

    if not user or not verify_password(
        login_data.password,
        user.password_hash,
    ):
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password",
        )

    return {
        "access_token": create_access_token(user.id),
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email,
        },
    }


# ============================================================
# CURRENT USER
# ============================================================

@router.get("/me", response_model=UserResponse)
def get_my_account(
    current_user: User = Depends(get_current_user),
):
    return current_user


# ============================================================
# CREATE PROJECT
# ============================================================

@router.post(
    "/projects",
    response_model=ProjectResponse,
    status_code=201,
)
def create_project(
    project_data: ProjectCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        new_project = Project(
            name=project_data.name,
            description=project_data.description,
            owner_id=current_user.id,
            is_saved=False,
        )
        db.add(new_project)
        db.commit()
        db.refresh(new_project)
        return new_project
    except HTTPException:
        raise
    except Exception:
        db.rollback()
        raise


@router.get("/usage")
def get_project_usage(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == current_user.id).first()
    count = db.query(func.count(Project.id)).filter(
        Project.owner_id == current_user.id,
        Project.is_saved.is_(True),
    ).scalar() or 0
    active = has_active_subscription(user)
    return {
        "project_count": count,
        "free_project_limit": FREE_PROJECT_LIMIT,
        "subscription_active": active,
        "project_creation_allowed": project_creation_allowed(count, active),
    }


# ============================================================
# GET ALL PROJECTS FOR THE LOGGED-IN USER
# ============================================================

@router.get(
    "/projects",
    response_model=list[ProjectResponse],
)
def get_my_projects(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return (
        db.query(Project)
        .filter(
            Project.owner_id == current_user.id,
            Project.is_saved.is_(True),
        )
        .order_by(Project.created_at.desc())
        .all()
    )


# ============================================================
# GET ONE PROJECT
# ============================================================

@router.get(
    "/projects/{project_id}",
    response_model=ProjectResponse,
)
def get_project(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return find_owned_project(project_id, current_user.id, db)


# ============================================================
# SAVE VIDEO URLS AND EDITOR SETTINGS
# ============================================================

@router.put("/projects/{project_id}/save")
def save_project_video(
    project_id: int,
    data: ProjectSave,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        if db.bind.dialect.name == "sqlite":
            db.execute(text("BEGIN IMMEDIATE"))
        project = find_owned_project(project_id, current_user.id, db)
        if not project.is_saved:
            if not (data.video_url or project.video_url):
                raise HTTPException(
                    status_code=400,
                    detail="Generate a video before saving this project.",
                )
            user = db.query(User).filter(User.id == current_user.id).first()
            count = db.query(func.count(Project.id)).filter(
                Project.owner_id == current_user.id,
                Project.is_saved.is_(True),
            ).scalar() or 0
            if not project_creation_allowed(count, has_active_subscription(user)):
                db.rollback()
                raise HTTPException(
                    status_code=403,
                    detail="You've used all 5 saved free projects. View Premium plans to save this project.",
                )
            project.is_saved = True

        if data.video_url is not None:
            project.video_url = data.video_url
        if data.final_video_url is not None:
            project.final_video_url = data.final_video_url
        if data.editor_settings is not None:
            project.editor_settings = json.dumps(data.editor_settings)

        db.commit()
        db.refresh(project)
    except HTTPException:
        raise
    except Exception:
        db.rollback()
        raise

    return {
        "message": "Project saved successfully",
        "id": project.id,
        "name": project.name,
        "description": project.description,
        "created_at": project.created_at,
        "owner_id": project.owner_id,
        "video_url": project.video_url,
        "final_video_url": project.final_video_url,
        "editor_settings": (
            json.loads(project.editor_settings)
            if project.editor_settings
            else None
        ),
        "is_saved": project.is_saved,
    }


@router.put("/projects/{project_id}/draft")
def update_project_draft(
    project_id: int,
    data: ProjectSave,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    project = find_owned_project(project_id, current_user.id, db)
    if data.video_url is not None:
        project.video_url = data.video_url
    if data.final_video_url is not None:
        project.final_video_url = data.final_video_url
    if data.editor_settings is not None:
        project.editor_settings = json.dumps(data.editor_settings)
    db.commit()
    db.refresh(project)
    return {"message": "Project draft updated", "id": project.id, "is_saved": project.is_saved}


# ============================================================
# DELETE PROJECT
# ============================================================

@router.delete("/projects/{project_id}")
def delete_project(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    project = find_owned_project(project_id, current_user.id, db)

    # Delete this project's file records before deleting the project.
    db.query(ProjectFile).filter(
        ProjectFile.project_id == project_id
    ).delete(synchronize_session=False)

    project_folder = Path("uploads") / "projects" / str(project_id)

    try:
        db.delete(project)
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Could not delete project",
        )

    # Remove only the project's own uploaded-file folder.
    # Generated videos are not removed because files may be shared.
    try:
        if project_folder.exists():
            shutil.rmtree(project_folder)
    except OSError:
        pass

    return {
        "message": "Project deleted successfully",
        "id": project_id,
    }


# ============================================================
# UPLOAD PROJECT FILE
# ============================================================

@router.post(
    "/projects/{project_id}/files",
    response_model=ProjectFileResponse,
    status_code=201,
)
def upload_project_file(
    project_id: int,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    find_owned_project(project_id, current_user.id, db)

    if not file.filename:
        raise HTTPException(
            status_code=400,
            detail="File name is missing",
        )

    safe_filename = Path(file.filename).name
    project_folder = Path("uploads") / "projects" / str(project_id)
    project_folder.mkdir(parents=True, exist_ok=True)

    file_path = project_folder / safe_filename

    try:
        with file_path.open("wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    finally:
        file.file.close()

    new_file = ProjectFile(
        project_id=project_id,
        original_name=safe_filename,
        stored_path=str(file_path),
        file_type=file.content_type or "application/octet-stream",
    )

    db.add(new_file)
    db.commit()
    db.refresh(new_file)
    return new_file


# ============================================================
# GET PROJECT FILES
# ============================================================

@router.get(
    "/projects/{project_id}/files",
    response_model=list[ProjectFileResponse],
)
def get_project_files(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    find_owned_project(project_id, current_user.id, db)

    return (
        db.query(ProjectFile)
        .filter(ProjectFile.project_id == project_id)
        .order_by(ProjectFile.created_at.desc())
        .all()
    )


# ============================================================
# STREAM / SERVE ONE PROJECT FILE
# ============================================================

@router.get("/projects/{project_id}/files/{file_id}/media")
def get_project_file_media(
    project_id: int,
    file_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    find_owned_project(project_id, current_user.id, db)

    project_file = (
        db.query(ProjectFile)
        .filter(
            ProjectFile.id == file_id,
            ProjectFile.project_id == project_id,
        )
        .first()
    )

    if not project_file:
        raise HTTPException(
            status_code=404,
            detail="Project file not found",
        )

    file_path = Path(project_file.stored_path)

    if not file_path.exists():
        raise HTTPException(
            status_code=404,
            detail="Stored media file not found",
        )

    return FileResponse(
        path=file_path,
        media_type=project_file.file_type,
        filename=project_file.original_name,
    )
