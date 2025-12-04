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

@router.get("/clips/{clip_id}/download")
async def download_clip(
    clip_id: str,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user)
):
    """
    Generate a presigned download URL for a clip.
    This ensures the browser treats it as a download (Content-Disposition: attachment).
    """
    # 1. Fetch clip
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
        raise HTTPException(status_code=404, detail="Clip not found")
    
    clip, project = row
    
    # 2. Extract S3 Key from URL
    # URL format: https://.../clips/...
    # We assume the key starts with "clips/"
    try:
        if "clips/" in clip.s3_url:
            s3_key = clip.s3_url.split("clips/", 1)[1]
            s3_key = f"clips/{s3_key}"
        else:
            # Fallback: try to guess from filename if it's a simple path
            # This is risky but better than failing if URL format changed
            s3_key = clip.s3_url.split("/")[-1]
            s3_key = f"clips/{s3_key}"
            
        from services.r2 import r2_service
        download_url = r2_service.generate_presigned_get_url(s3_key)
        
        return {"download_url": download_url}
        
    except Exception as e:
        print(f"Error generating download URL: {e}")
        raise HTTPException(status_code=500, detail="Could not generate download link")
