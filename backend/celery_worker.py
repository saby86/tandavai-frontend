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
# from services.processor import process_video_task

@celery_app.task(name="health_check_task")
def health_check_task():
    return {"status": "ok"}

@celery_app.task(name="cleanup_raw_videos")
def cleanup_raw_videos():
    """
    Deletes raw video files from R2 that are older than 24 hours.
    (Implementation placeholder - requires listing objects and checking timestamps)
    """
    # In a real implementation, we would list objects in R2/S3, check LastModified, and delete.
    # For MVP, we can skip or just log.
    print("Running cleanup task...")
    return {"status": "cleanup_done"}

celery_app.conf.beat_schedule = {
    "cleanup-every-24-hours": {
        "task": "cleanup_raw_videos",
        "schedule": 86400.0, # 24 hours
    },
}
