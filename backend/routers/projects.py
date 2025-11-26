from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
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

@router.delete("/projects/{project_id}")
async def delete_project(project_id: str, db: AsyncSession = Depends(get_db)):
    # 1. Fetch Project with Clips
    result = await db.execute(
        select(Project).options(selectinload(Project.clips)).where(Project.id == project_id)
    )
    project = result.scalars().first()
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
        
    # 2. Collect Keys to Delete (Source + Clips)
    keys_to_delete = []
    
    # Source Key
    if project.source_url:
        if project.source_url.startswith("http"):
             # Heuristic: try to extract key if possible, otherwise skip to avoid errors
             # Ideally we should have stored the key. 
             # If we can't be sure, we might leave a file orphan, which is better than crashing.
             pass
        else:
            keys_to_delete.append(project.source_url)

    # Clip Keys
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

    # 3. Delete from DB (Immediate)
    await db.delete(project)
    await db.commit()
    
    # 4. Trigger Background Deletion
    # if keys_to_delete:
    #     try:
    #         celery_app.send_task("services.processor.delete_files_task", args=[keys_to_delete])
    #     except Exception as e:
    #         print(f"Failed to trigger background deletion task: {e}")
    #         # Do not crash the request; the project is already deleted from DB.
    
    return {"message": "Project deleted successfully"}

@router.delete("/projects")
async def delete_old_projects(
    older_than_days: int, 
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user)
):
    """
    Bulk delete projects older than X days.
    """
    from datetime import datetime, timedelta, timezone
    
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
        
    from services.r2 import r2_service
    deleted_count = 0
    
    for project in projects:
        try:
            # Delete Source
            if project.source_url:
                try:
                    if project.source_url.startswith("http"):
                         # Heuristic for full URL
                         r2_service.delete_file(project.source_url) # Might fail if it expects key
                    else:
                        r2_service.delete_file(project.source_url)
                except:
                    pass

            # Delete Clips
            for clip in project.clips:
                try:
                    parts = clip.s3_url.split('/')
                    if "clips" in parts:
                        index = parts.index("clips")
                        s3_key = "/".join(parts[index:])
                        r2_service.delete_file(s3_key)
                    else:
                        r2_service.delete_file(parts[-1])
                except:
                    pass
            
            await db.delete(project)
            deleted_count += 1
            
        except Exception as e:
            print(f"Error deleting project {project.id}: {e}")
            
    await db.commit()
    return {"message": f"Deleted {deleted_count} projects", "count": deleted_count}
