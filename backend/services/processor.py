                print(f"Failed to save error status: {commit_error}")

@celery_app.task(name="services.processor.process_video_task")
def process_video_task(project_id: str):
    # Run async logic in sync Celery task
    try:
        asyncio.run(process_video_logic(project_id))
    except Exception as e:
        print(f"Critical error in process_video_task wrapper: {e}")
        # We can't easily update DB here if the logic failed before DB session, 
        # but at least we log it to worker output.

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
