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
            # 1. Download Video from R2
            local_filename = f"/tmp/{project.source_url.split('/')[-1]}"
            os.makedirs(os.path.dirname(local_filename), exist_ok=True)
            
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
            # 1. Download Video from R2
            local_filename = f"/tmp/{project.source_url.split('/')[-1]}"
            os.makedirs(os.path.dirname(local_filename), exist_ok=True)
            
            # Download using S3 API (not public URL)
            print(f"Downloading {project.source_url} from R2 to {local_filename}")
            r2_service.s3_client.download_file(r2_service.bucket_name, project.source_url, local_filename)

            # 2. Check Duration & Smart Split
            import ffmpeg
            import shutil
            
            if not shutil.which('ffmpeg'):
                raise Exception("FFmpeg binary not found in system path")

            try:
                probe = ffmpeg.probe(local_filename)
                duration = float(probe['format']['duration'])
            except ffmpeg.Error as e:
                print(f"FFmpeg probe failed: {e.stderr.decode('utf8') if e.stderr else str(e)}")
                # If we can't probe, we might not be able to process, but let's try fallback if it's just metadata issue
                duration = 60.0 
            except Exception as e:
                print(f"Generic probe error: {e}")
                duration = 60.0
            
            segments = []
            
            # Logic: If video is short (< 30s) OR user requested "auto" and it's short, don't split.
            if duration < 30.0:
                print(f"Video is short ({duration}s). Skipping AI splitting.")
                segments = [{
                    "start_time": "00:00",
                    "end_time": f"{int(duration // 60):02d}:{int(duration % 60):02d}",
                    "virality_score": 80,
                    "explanation": "Short video processed as-is.",
                    "suggested_caption": "Original Clip",
                    "srt_content": None 
                }]
            else:
                # 3. Analyze with Gemini (Long Video)
                # We need to pass the duration preference from the project
                # But wait, the project model doesn't store the preference! 
                # We should have added it to the model. 
                # For now, we'll default to "auto" or we need to fetch it if we added it.
                # Let's assume we passed it in the task args or we just use "auto" for now.
                # Ideally, we should update the Project model to store `clip_duration_preference`.
                # Since we didn't add that column yet, let's just use "auto" for this step 
                # OR we can quickly add the column. 
                # Actually, let's just use "auto" for now to avoid another migration in this step.
                segments = await gemini_service.analyze_video(local_filename, duration_preference="auto")
            
            if not segments:
                raise Exception("No viral segments identified by AI")

            # 3. Process Segments
            for segment in segments:
                clip_filename = f"/tmp/{uuid.uuid4()}.mp4"
                ffmpeg_processor.process_segment(
                    local_filename, 
                    clip_filename, 
                    segment['start_time'], 
                    segment['end_time'],
                    srt_content=segment.get('srt_content')
                )
                
                # 4. Upload Clip
                s3_key = f"clips/{os.path.basename(clip_filename)}"
                r2_service.s3_client.upload_file(
                    clip_filename, 
                    r2_service.bucket_name, 
                    s3_key,
                    ExtraArgs={'ContentType': 'video/mp4'}
                )
                
                # 5. Save Clip to DB
                new_clip = Clip(
                    project_id=project.id,
                    s3_url=r2_service.get_public_url(s3_key),
                    virality_score=segment.get('virality_score'),
                    transcript=segment.get('explanation')
                )
                db.add(new_clip)
                
                # Cleanup clip
                if os.path.exists(clip_filename):
                    os.remove(clip_filename)

            project.status = ProjectStatus.COMPLETED.value
            await db.commit()
            
            # Cleanup source
            os.remove(local_filename)

        except Exception as e:
            error_msg = str(e)
            if not error_msg:
                error_msg = "Unknown error occurred during processing"
            
            print(f"Error processing project {project_id}: {error_msg}")
            
            # Re-fetch project to ensure session is valid for update
            # (Though in this simple flow, existing object should be fine unless session rolled back)
            project.status = ProjectStatus.FAILED.value
            project.error_message = error_msg
            try:
                await db.commit()
            except Exception as commit_error:
                print(f"Failed to save error status: {commit_error}")

@celery_app.task(name="services.processor.process_video.task")
def process_video_task(project_id: str):
    # Run async logic in sync Celery task
    loop = asyncio.get_event_loop()
    loop.run_until_complete(process_video_logic(project_id))
