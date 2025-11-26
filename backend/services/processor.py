from celery_worker import celery_app
from services.r2 import r2_service
from services.gemini import gemini_service
from services.ffmpeg_processor import ffmpeg_processor
from database import AsyncSessionLocal, SessionLocal
from models import Project, Clip, ProjectStatus
from sqlalchemy import select
from sqlalchemy.orm import selectinload
import asyncio
import os
import uuid
import shutil
import ffmpeg

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
            if not shutil.which('ffmpeg'):
                raise Exception("FFmpeg binary not found in system path")

            try:
                probe = ffmpeg.probe(local_filename)
                duration = float(probe['format']['duration'])
            except ffmpeg.Error as e:
                print(f"FFmpeg probe failed: {e.stderr.decode('utf8') if e.stderr else str(e)}")
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
                # Convert time strings "MM:SS" to seconds float if possible, or store as is?
                # The model expects Float for start_time/end_time.
                # Gemini returns strings "MM:SS". We need to parse them.
                
                def parse_time(t_str):
                    try:
                        parts = t_str.split(':')
                        if len(parts) == 2:
                            return float(parts[0]) * 60 + float(parts[1])
                        elif len(parts) == 3:
                            return float(parts[0]) * 3600 + float(parts[1]) * 60 + float(parts[2])
                        return 0.0
                    except:
                        return 0.0

                start_seconds = parse_time(segment['start_time'])
                end_seconds = parse_time(segment['end_time'])

                new_clip = Clip(
                    project_id=project.id,
                    s3_url=r2_service.get_public_url(s3_key),
                    virality_score=segment.get('virality_score'),
                    transcript=segment.get('explanation'),
                    start_time=start_seconds,
                    end_time=end_seconds
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
            
            project.status = ProjectStatus.FAILED.value
            project.error_message = error_msg
            try:
                await db.commit()
            except Exception as commit_error:
                print(f"Failed to save error status: {commit_error}")

@celery_app.task(name="services.processor.process_video_task")
def process_video_task(project_id: str):
    # Run async logic in sync Celery task
    try:
        asyncio.run(process_video_logic(project_id))
    except Exception as e:
        print(f"Critical error in process_video_task wrapper: {e}")

@celery_app.task(name="services.processor.delete_files_task")
def delete_files_task(file_keys: list[str]):
    """
    Background task to delete files from R2.
    """
    print(f"Starting background deletion of {len(file_keys)} files.")
    for key in file_keys:
        try:
            r2_service.delete_file(key)
        except Exception as e:
            print(f"Error deleting file {key}: {e}")
    print("Background deletion completed.")

@celery_app.task(name="services.processor.burn_subtitles_task")
def burn_subtitles_task(clip_id: str, start_time: float = None, end_time: float = None, style_name: str = "Hormozi"):
    """
    Re-processes a clip:
    1. Downloads source video
    2. Cuts and burns subtitles (with new style/transcript)
    3. Uploads back to R2
    """
    
    async def run_async():
        async with SessionLocal() as db:
            # 1. Fetch Clip & Project
            result = await db.execute(
                select(Clip).options(selectinload(Clip.project)).where(Clip.id == clip_id)
            )
            clip = result.scalars().first()
            
            if not clip or not clip.project:
                print(f"Clip {clip_id} not found")
                return

            project = clip.project
            print(f"Re-burning clip {clip.id} from project {project.id}")

            # Use provided times or fallback to DB times
            final_start = start_time if start_time is not None else clip.start_time
            final_end = end_time if end_time is not None else clip.end_time
            
            if final_start is None or final_end is None:
                print("Missing start/end times for re-burn")
                return

            local_source_path = f"temp_source_{project.id}.mp4"
            local_output_path = f"temp_clip_{clip.id}.mp4"
            
            try:
                # 2. Download Source Video (if not exists)
                if not os.path.exists(local_source_path):
                    if project.source_url and not project.source_url.startswith("http"):
                         await r2_service.download_file(project.source_url, local_source_path)
                    else:
                        print("Skipping download, assuming local or http input not supported yet")
                        return

                # 3. Process (Cut + Burn)
                # Convert float times to string "HH:MM:SS" or seconds string
                ffmpeg_processor.process_segment(
                    input_path=local_source_path,
                    output_path=local_output_path,
                    start_time=str(final_start),
                    end_time=str(final_end),
                    srt_content=clip.transcript,
                    style_name=style_name
                )
                
                # 4. Upload back to R2
                s3_key = f"clips/{project.id}/{clip.id}.mp4"
                
                with open(local_output_path, "rb") as f:
                    await r2_service.upload_file(f, s3_key, "video/mp4")
                
                # 5. Update DB
                clip.s3_url = r2_service.get_public_url(s3_key)
                clip.start_time = final_start
                clip.end_time = final_end
                await db.commit()
                
                print(f"Clip {clip.id} re-burned and updated successfully.")

            except Exception as e:
                print(f"Error in burn task: {e}")
            finally:
                if os.path.exists(local_output_path):
                    os.remove(local_output_path)
                if os.path.exists(local_source_path):
                    os.remove(local_source_path)

    loop = asyncio.get_event_loop()
    loop.run_until_complete(run_async())
