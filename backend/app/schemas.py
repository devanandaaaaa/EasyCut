from datetime import datetime
from pydantic import BaseModel, EmailStr


class RegisterRequest(BaseModel):
    username: str
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: int
    username: str
    email: EmailStr

    class Config:
        from_attributes = True

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class ProjectCreate(BaseModel):
    name: str
    description: str | None = None


class ProjectResponse(BaseModel):
    id: int
    name: str
    description: str | None
    created_at: datetime
    owner_id: int

    class Config:
        from_attributes = True

class ProjectFileResponse(BaseModel):
    id: int
    project_id: int
    original_name: str
    stored_path: str
    file_type: str
    created_at: datetime

    class Config:
        from_attributes = True