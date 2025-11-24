from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from database import get_db
from models import Project, User, ProjectStatus
from schemas import ProjectCreate, ProjectResponse
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

@router.get("/projects/{project_id}/clips", response_model=list)
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
    from schemas import ClipResponse
    
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
    
    return clips
