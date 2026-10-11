from pathlib import Path
import shutil

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    UploadFile,
    File,
)
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

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
)
from app.security import create_access_token, get_current_user


router = APIRouter(
    prefix="/auth",
    tags=["Authentication"]
)


# ============================================================
# DATABASE
# ============================================================

def get_db():
    db = SessionLocal()

    try:
        yield db
    finally:
        db.close()


# ============================================================
# REGISTER
# ============================================================

@router.post(
    "/register",
    response_model=UserResponse,
    status_code=201
)
def register_user(
    user_data: RegisterRequest,
    db: Session = Depends(get_db)
):
    existing_username = (
        db.query(User)
        .filter(User.username == user_data.username)
        .first()
    )

    if existing_username:
        raise HTTPException(
            status_code=409,
            detail="Username already exists"
        )

    existing_email = (
        db.query(User)
        .filter(User.email == user_data.email)
        .first()
    )

    if existing_email:
        raise HTTPException(
            status_code=409,
            detail="Email already exists"
        )

    new_user = User(
        username=user_data.username,
        email=user_data.email,
        password_hash=hash_password(
            user_data.password
        )
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
    db: Session = Depends(get_db)
):
    user = (
        db.query(User)
        .filter(User.email == login_data.email)
        .first()
    )

    if not user:
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

    if not verify_password(
        login_data.password,
        user.password_hash
    ):
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

    access_token = create_access_token(user.id)

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email
        }
    }


# ============================================================
# CURRENT USER
# ============================================================

@router.get(
    "/me",
    response_model=UserResponse
)
def get_my_account(
    current_user: User = Depends(get_current_user)
):
    return current_user


# ============================================================
# CREATE PROJECT
# ============================================================

@router.post(
    "/projects",
    response_model=ProjectResponse,
    status_code=201
)
def create_project(
    project_data: ProjectCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    new_project = Project(
        name=project_data.name,
        description=project_data.description,
        owner_id=current_user.id
    )

    db.add(new_project)
    db.commit()
    db.refresh(new_project)

    return new_project


# ============================================================
# GET ALL MY PROJECTS
# ============================================================

@router.get(
    "/projects",
    response_model=list[ProjectResponse]
)
def get_my_projects(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    projects = (
        db.query(Project)
        .filter(
            Project.owner_id == current_user.id
        )
        .order_by(
            Project.created_at.desc()
        )
        .all()
    )

    return projects


# ============================================================
# GET ONE PROJECT
# ============================================================

@router.get(
    "/projects/{project_id}",
    response_model=ProjectResponse
)
def get_project(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    project = (
        db.query(Project)
        .filter(
            Project.id == project_id,
            Project.owner_id == current_user.id
        )
        .first()
    )

    if not project:
        raise HTTPException(
            status_code=404,
            detail="Project not found"
        )

    return project


# ============================================================
# UPLOAD PROJECT FILE
# ============================================================

@router.post(
    "/projects/{project_id}/files",
    response_model=ProjectFileResponse,
    status_code=201
)
def upload_project_file(
    project_id: int,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    project = (
        db.query(Project)
        .filter(
            Project.id == project_id,
            Project.owner_id == current_user.id
        )
        .first()
    )

    if not project:
        raise HTTPException(
            status_code=404,
            detail="Project not found"
        )

    if not file.filename:
        raise HTTPException(
            status_code=400,
            detail="File name is missing"
        )

    # Keep only the filename itself.
    # This prevents paths such as ../../something
    # from being used as the upload location.
    safe_filename = Path(file.filename).name

    project_folder = (
        Path("uploads")
        / "projects"
        / str(project_id)
    )

    project_folder.mkdir(
        parents=True,
        exist_ok=True
    )

    file_path = project_folder / safe_filename

    with file_path.open("wb") as buffer:
        shutil.copyfileobj(
            file.file,
            buffer
        )

    new_file = ProjectFile(
        project_id=project_id,
        original_name=safe_filename,
        stored_path=str(file_path),
        file_type=(
            file.content_type
            or "application/octet-stream"
        )
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
    response_model=list[ProjectFileResponse]
)
def get_project_files(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    project = (
        db.query(Project)
        .filter(
            Project.id == project_id,
            Project.owner_id == current_user.id
        )
        .first()
    )

    if not project:
        raise HTTPException(
            status_code=404,
            detail="Project not found"
        )

    files = (
        db.query(ProjectFile)
        .filter(
            ProjectFile.project_id == project_id
        )
        .order_by(
            ProjectFile.created_at.desc()
        )
        .all()
    )

    return files


# ============================================================
# STREAM / SERVE ONE PROJECT FILE
# ============================================================

@router.get(
    "/projects/{project_id}/files/{file_id}/media"
)
def get_project_file_media(
    project_id: int,
    file_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # First verify that the project belongs to
    # the currently logged-in user.
    project = (
        db.query(Project)
        .filter(
            Project.id == project_id,
            Project.owner_id == current_user.id
        )
        .first()
    )

    if not project:
        raise HTTPException(
            status_code=404,
            detail="Project not found"
        )

    # Find the requested file and make sure it
    # belongs to this project.
    project_file = (
        db.query(ProjectFile)
        .filter(
            ProjectFile.id == file_id,
            ProjectFile.project_id == project_id
        )
        .first()
    )

    if not project_file:
        raise HTTPException(
            status_code=404,
            detail="Project file not found"
        )

    file_path = Path(project_file.stored_path)

    if not file_path.exists():
        raise HTTPException(
            status_code=404,
            detail="Stored media file not found"
        )

    return FileResponse(
        path=file_path,
        media_type=project_file.file_type,
        filename=project_file.original_name
    )