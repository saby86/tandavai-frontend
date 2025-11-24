from sqlalchemy import Column, String, Integer, ForeignKey, DateTime, Text, Boolean, Enum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
import enum
from database import Base

class ProjectStatus(str, enum.Enum):
    PENDING = "PENDING"
    PROCESSING = "PROCESSING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"

class User(Base):
    __tablename__ = "users"

    clerk_id = Column(String, primary_key=True, index=True)
    email = Column(String, nullable=False)
    credits_remaining = Column(Integer, default=3)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    brand_kit = relationship("BrandKit", back_populates="user", uselist=False)
    projects = relationship("Project", back_populates="user")

class BrandKit(Base):
    __tablename__ = "brand_kits"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(String, ForeignKey("users.clerk_id", ondelete="CASCADE"), unique=True)
    logo_url = Column(String, nullable=True)
    primary_hex = Column(String, default="#FFFFFF")
    font_family = Column(String, default="Inter")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="brand_kit")

class Project(Base):
    __tablename__ = "projects"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(String, ForeignKey("users.clerk_id", ondelete="CASCADE"))
    source_url = Column(String, nullable=False)
    status = Column(String, default=ProjectStatus.PENDING.value)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="projects")
    clips = relationship("Clip", back_populates="project", cascade="all, delete-orphan")

class Clip(Base):
    __tablename__ = "clips"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"))
    s3_url = Column(String, nullable=False)
    virality_score = Column(Integer, nullable=True)
    transcript = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    project = relationship("Project", back_populates="clips")
