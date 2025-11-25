from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from database import get_db
from models import Clip, Project
from schemas import ClipResponse, ClipUpdate
import uuid

router = APIRouter()

# Mock User Dependency (Replace with Clerk verification later)
async def get_current_user():
    # For MVP, return a hardcoded user ID or extract from header if implemented
    # In production, verify JWT token from Clerk
    return "user_2t..." # Example Clerk ID

@router.patch("/clips/{clip_id}", response_model=ClipResponse)
async def update_clip(
    clip_id: str,
    clip_in: ClipUpdate,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user)
):
    """
    Update a clip's details (e.g., transcript).
    Verifies that the clip belongs to a project owned by the current user.
    """
    # 1. Fetch the clip and verify ownership via Project join
    result = await db.execute(
        select(Clip, Project)
        .join(Project, Clip.project_id == Project.id)
        .where(
            Clip.id == clip_id,
            Project.user_id == user_id
        )
    )
    row = result.first()
    
    if not row:
        raise HTTPException(status_code=404, detail="Clip not found or access denied")
    
    clip, project = row
    
    # 2. Update fields if provided
    if clip_in.transcript is not None:
        clip.transcript = clip_in.transcript
        
    # 3. Commit changes
    await db.commit()
    await db.refresh(clip)
    
    return clip
