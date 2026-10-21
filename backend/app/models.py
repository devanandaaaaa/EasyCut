
from sqlalchemy import Boolean, Column, Integer, String, DateTime, ForeignKey, Text
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
    subscription_status = Column(String(20), nullable=False, default="free")
    subscription_plan = Column(String(40), nullable=True)
    subscription_expires_at = Column(DateTime, nullable=True)

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

    # Saved video and editing information
    video_url = Column(Text, nullable=True)
    final_video_url = Column(Text, nullable=True)
    editor_settings = Column(Text, nullable=True)
    is_saved = Column(Boolean, nullable=False, default=True, server_default="1")

    owner = relationship("User", back_populates="projects")

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

    project = relationship("Project", back_populates="files")


class PaymentOrder(Base):
    __tablename__ = "payment_orders"

    order_id = Column(String(100), primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    plan = Column(String(40), nullable=False)
    amount = Column(Integer, nullable=False)
    currency = Column(String(3), nullable=False)
    status = Column(String(20), nullable=False, default="pending")
    payment_id = Column(String(100), unique=True, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    verified_at = Column(DateTime, nullable=True)
