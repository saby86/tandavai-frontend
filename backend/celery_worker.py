from celery import Celery
from config import settings
import asyncio

celery_app = Celery(
    "tandavai_worker",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
)

# Import tasks here to ensure they are registered
# Import tasks here to ensure they are registered
# Moved to bottom to avoid circular import with services.processor

@celery_app.task(name="health_check_task")
def health_check_task():
    return {"status": "ok"}

@celery_app.task(name="cleanup_raw_videos")
def cleanup_raw_videos():
    """
    Deletes raw video files from R2 that are older than 24 hours.
    """
    from services.r2 import r2_service
    print("Running cleanup task...")
    count = r2_service.cleanup_files(retention_hours=24)
    print(f"Cleanup complete. Deleted {count} files.")
    return {"status": "cleanup_done", "deleted_count": count}

celery_app.conf.beat_schedule = {
    "cleanup-every-24-hours": {
        "task": "cleanup_raw_videos",
        "schedule": 86400.0, # 24 hours
    },
}

# Import tasks at the end to avoid circular imports
from services.processor import process_video_task, delete_files_task, burn_subtitles_task
