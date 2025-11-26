from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from database import get_db
from models import Project, User, ProjectStatus
from schemas import ProjectCreate, ProjectResponse, ClipResponse
from celery_worker import celery_app
import uuid

router = APIRouter()

# Mock User Dependency (Replace with Clerk verification later)
async def get_current_user():
    # For MVP, return a hardcoded user ID or extract from header if implemented
    # In production, verify JWT token from Clerk
    return "user_2t..." # Example Clerk ID

@router.post("/process-video", response_model=ProjectResponse, status_code=status.HTTP_202_ACCEPTED)
async def process_video(
    project_in: ProjectCreate,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user) # In real app, this comes from auth
):
    """
    Creates a new project and triggers the video processing background task.
    """
    # 0. Ensure user exists (auto-create if first time)
    result = await db.execute(select(User).where(User.clerk_id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        user = User(clerk_id=user_id, email=f"{user_id}@temp.com")  # Placeholder email
        db.add(user)
        await db.commit()
    
    # 1. Create Project in DB
    new_project = Project(
        user_id=user_id,
        source_url=project_in.source_url,
        status=ProjectStatus.PENDING.value
    )
    db.add(new_project)
    await db.commit()
    await db.refresh(new_project)

    # 2. Trigger Celery Task
    task = celery_app.send_task("services.processor.process_video_task", args=[str(new_project.id)])
    
    # For now, we just return the project. Task triggering will be uncommented when processor is ready.
    
    return new_project

@router.get("/projects", response_model=list[ProjectResponse])
async def list_projects(
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user)
):
    """
    List all projects for the current user.
    """
    result = await db.execute(select(Project).where(Project.user_id == user_id).order_by(Project.created_at.desc()))
    projects = result.scalars().all()
    return projects

@router.get("/projects/{project_id}/clips", response_model=list[ClipResponse])
async def get_project_clips(
    project_id: str,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user)
):
    """
    Get all clips for a specific project.
    Only returns clips if the project belongs to the current user.
    """
    from models import Clip
    
    # Verify project ownership
    result = await db.execute(
        select(Project).where(
            Project.id == project_id,
            Project.user_id == user_id
        )
    )
    project = result.scalar_one_or_none()
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Fetch clips
    result = await db.execute(
        select(Clip)
        .where(Clip.project_id == project_id)
        .order_by(Clip.created_at.asc())
    )
    clips = result.scalars().all()
    
    # Generate presigned URLs for each clip
    # We need to extract the key from the stored URL or assume the stored URL is just the key if we changed that logic.
    # Currently, processor.py stores the full public URL. We need to extract the key.
    # URL format: .../bucket_name/clips/filename.mp4 OR .../clips/filename.mp4
    
    from services.r2 import r2_service
    
    # Create a list of response objects with updated URLs
    response_clips = []
    for clip in clips:
        # Extract key: The key is likely everything after the last slash if we just stored filename, 
        # but we stored "clips/filename.mp4" in the key during upload.
        # The s3_url in DB is r2_service.get_public_url(s3_key).
        # Let's try to extract "clips/..." from the URL.
        
        try:
            # Simple heuristic: split by '/' and take the last two parts if it looks like clips/filename
            parts = clip.s3_url.split('/')
            if "clips" in parts:
                index = parts.index("clips")
                s3_key = "/".join(parts[index:])
            else:
                # Fallback: just take the last part
                s3_key = parts[-1]
                
            presigned_url = r2_service.generate_presigned_get_url(s3_key)
            
            # Create a copy or modify the object if it's not attached to session in a way that prevents it
            # Pydantic from_attributes will read attributes. We can just assign to the object if it's a transient instance from scalars().all()
            # However, modifying the DB object might be risky if we accidentally commit.
            # Safer to create a dict or let Pydantic handle it, but we need to override the field.
            
            # Since we are returning a list of ClipResponse, we can just modify the object in memory
            # SQLAlchemy objects returned by all() are mutable.
            clip.s3_url = presigned_url
            response_clips.append(clip)
        except Exception as e:
            print(f"Error generating presigned URL for clip {clip.id}: {e}")
            response_clips.append(clip)
            
    return response_clips

@router.post("/projects/{project_id}/archive")
async def delete_project(project_id: str, db: AsyncSession = Depends(get_db)):
    try:
        # 1. Fetch Project with Clips
        # Ensure we import Clip to avoid relationship loading errors
        from models import Clip
        
        result = await db.execute(
            select(Project).options(selectinload(Project.clips)).where(Project.id == project_id)
        )
        project = result.scalars().first()
        
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
            
        # 2. Collect Keys to Delete (Source + Clips)
        keys_to_delete = []
        
        try:
            # Source Key
            if project.source_url:
                if not project.source_url.startswith("http"):
                    keys_to_delete.append(project.source_url)

            # Clip Keys
            # Check if clips is populated (it should be due to selectinload)
            if project.clips:
                for clip in project.clips:
                    try:
                        parts = clip.s3_url.split('/')
                        if "clips" in parts:
                            index = parts.index("clips")
                            s3_key = "/".join(parts[index:])
                            keys_to_delete.append(s3_key)
                        else:
                            keys_to_delete.append(parts[-1])
                    except:
                        continue
        except Exception as e:
            print(f"Error collecting keys for deletion: {e}")
            # Continue to DB deletion even if key collection fails

        # 3. Delete from DB (Immediate)
        await db.delete(project)
        await db.commit()
        
        # 4. Trigger Background Deletion
        if keys_to_delete:
            try:
                celery_app.send_task("services.processor.delete_files_task", args=[keys_to_delete])
            except Exception as e:
                print(f"Failed to trigger background deletion task: {e}")
        
        return {"message": "Project deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        print(f"CRITICAL ERROR in delete_project: {e}")
        raise HTTPException(status_code=500, detail=f"Backend Crash: {str(e)}")

@router.post("/projects/cleanup")
async def delete_old_projects(
    older_than_days: int, 
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user)
):
    """
    Bulk delete projects older than X days.
    """
    from datetime import datetime, timedelta, timezone
    from models import Clip
    
    cutoff_date = datetime.now(timezone.utc) - timedelta(days=older_than_days)
    
    # 1. Fetch matching projects
    result = await db.execute(
        select(Project)
        .options(selectinload(Project.clips))
        .where(
            Project.user_id == user_id,
            Project.created_at < cutoff_date
        )
    )
    projects = result.scalars().all()
    
    if not projects:
        return {"message": "No projects found to delete", "count": 0}
        
    keys_to_delete = []
    deleted_count = 0
    
    for project in projects:
        try:
            # Collect keys
            if project.source_url and not project.source_url.startswith("http"):
                keys_to_delete.append(project.source_url)
                
            for clip in project.clips:
                try:
                    parts = clip.s3_url.split('/')
                    if "clips" in parts:
                        index = parts.index("clips")
                        s3_key = "/".join(parts[index:])
                        keys_to_delete.append(s3_key)
                    else:
                        keys_to_delete.append(parts[-1])
                except:
                    pass
            
            await db.delete(project)
            deleted_count += 1
            
        except Exception as e:
            print(f"Error deleting project {project.id}: {e}")
            
    await db.commit()
    
    # Trigger background deletion for all collected keys
    if keys_to_delete:
        try:
            celery_app.send_task("services.processor.delete_files_task", args=[keys_to_delete])
        except Exception as e:
            print(f"Failed to trigger cleanup task: {e}")
            
    return {"message": f"Deleted {deleted_count} projects", "count": deleted_count}

class BurnRequest(BaseModel):
    start_time: float = None
    end_time: float = None
    style_name: str = "Hormozi"

@router.post("/clips/{clip_id}/burn")
async def burn_clip(
    clip_id: str, 
    request: BurnRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Triggers a background task to re-burn subtitles into the clip.
    Can also update start/end times (Trim) and Style.
    """
    # Verify clip exists
    from models import Clip
    result = await db.execute(select(Clip).where(Clip.id == clip_id))
    clip = result.scalar_one_or_none()
    
    if not clip:
        raise HTTPException(status_code=404, detail="Clip not found")
        
    # Trigger Task
    try:
        celery_app.send_task(
            "services.processor.burn_subtitles_task", 
            args=[clip_id, request.start_time, request.end_time, request.style_name]
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to trigger burn task: {e}")
        
    return {"message": "Burning started. This may take a few moments."}
