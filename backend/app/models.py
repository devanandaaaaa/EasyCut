from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import declarative_base, relationship
from datetime import datetime


Base = declarative_base()


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    projects = relationship(
        "Project",
        back_populates="owner",
        cascade="all, delete-orphan"
    )


class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), nullable=False)
    description = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    owner = relationship(
        "User",
        back_populates="projects"
    )
    files = relationship(
        "ProjectFile",
        back_populates="project",
        cascade="all, delete-orphan"
    )

class ProjectFile(Base):
    __tablename__ = "project_files"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(
        Integer,
        ForeignKey("projects.id"),
        nullable=False
    )
    original_name = Column(String(255), nullable=False)
    stored_path = Column(String(500), nullable=False)
    file_type = Column(String(50), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    project = relationship(
        "Project",
        back_populates="files"
    )