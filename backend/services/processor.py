from celery_worker import celery_app
from services.r2 import r2_service
from services.gemini import gemini_service
from services.ffmpeg_processor import ffmpeg_processor
from database import AsyncSessionLocal
from models import Project, Clip, ProjectStatus
import asyncio
import os
import uuid

async def process_video_logic(project_id: str):
    async with AsyncSessionLocal() as db:
        project = await db.get(Project, project_id)
        if not project:
            return
        
        project.status = ProjectStatus.PROCESSING.value
        await db.commit()

        try:
            # 1. Download Video
            # For MVP, we assume local R2 or download it
            # Since we are in docker, we might need to download from R2 URL
            # But R2Service generates presigned PUT. We need GET.
            
            # Construct public URL
            source_url = r2_service.get_public_url(project.source_url)
            local_filename = f"/tmp/{project.source_url.split('/')[-1]}"
            os.makedirs(os.path.dirname(local_filename), exist_ok=True)
            
            # Download (using requests or boto3)
            print(f"Downloading {source_url} to {local_filename}")
            r2_service.s3_client.download_file(r2_service.bucket_name, project.source_url, local_filename)

            # 2. Analyze with Gemini
            segments = await gemini_service.analyze_video(local_filename)
            
            # 3. Process Segments
            for segment in segments:
                clip_filename = f"/tmp/{uuid.uuid4()}.mp4"
                ffmpeg_processor.process_segment(
                    local_filename, 
                    clip_filename, 
                    segment['start_time'], 
                    segment['end_time']
                )
                
                # 4. Upload Clip
                s3_key = f"clips/{os.path.basename(clip_filename)}"
                r2_service.s3_client.upload_file(clip_filename, r2_service.bucket_name, s3_key)
                
                # 5. Save Clip to DB
                new_clip = Clip(
                    project_id=project.id,
                    s3_url=r2_service.get_public_url(s3_key),
                    virality_score=segment.get('virality_score'),
                    transcript=segment.get('explanation')
                )
                db.add(new_clip)
                
                # Cleanup clip
                os.remove(clip_filename)

            project.status = ProjectStatus.COMPLETED.value
            await db.commit()
            
            # Cleanup source
            os.remove(local_filename)

        except Exception as e:
            print(f"Error processing project {project_id}: {e}")
            project.status = ProjectStatus.FAILED.value
            await db.commit()

@celery_app.task(name="services.processor.process_video_task")
def process_video_task(project_id: str):
    # Run async logic in sync Celery task
    loop = asyncio.get_event_loop()
    loop.run_until_complete(process_video_logic(project_id))
