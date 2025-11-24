from pydantic import BaseModel
from typing import Optional, List
from uuid import UUID
from datetime import datetime

# User Schemas
class UserBase(BaseModel):
    email: str

class UserCreate(UserBase):
    clerk_id: str

class UserResponse(UserBase):
    clerk_id: str
    credits_remaining: int
    created_at: datetime

    class Config:
        from_attributes = True

# Project Schemas
class ProjectCreate(BaseModel):
    source_url: str
    # Optional: Add brand kit overrides here if needed

class ProjectResponse(BaseModel):
    id: UUID
    user_id: str
    source_url: str
    status: str
    created_at: datetime

    class Config:
        from_attributes = True

# Clip Schemas
class ClipResponse(BaseModel):
    id: UUID
    project_id: UUID
    s3_url: str
    virality_score: Optional[int] = None
    transcript: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

# Upload Schemas
class PresignedUrlResponse(BaseModel):
    upload_url: str
    s3_key: str
    filename: str
