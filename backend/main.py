from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from config import settings
# Import routers later when they are created
from routers import upload, projects, clips

app = FastAPI(title=settings.PROJECT_NAME)

# CORS Configuration
origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    from database import engine
    from sqlalchemy import text
    
    # Simple migration to add error_message column if it doesn't exist
    async with engine.connect() as conn:
        try:
            await conn.execute(text("ALTER TABLE projects ADD COLUMN error_message TEXT;"))
            await conn.commit()
            print("Migration: Added error_message column to projects table.")
        except Exception as e:
            print(f"Migration: Column might already exist or error occurred: {e}")

from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
import traceback

@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    error_msg = f"Global Error: {str(exc)}\n{traceback.format_exc()}"
    print(error_msg) # Log to stdout
    return JSONResponse(
        status_code=500,
        content={"detail": error_msg, "type": "GlobalCrash"},
    )

@app.get("/health")
async def health_check():
    return {"status": "ok", "environment": settings.ENVIRONMENT, "version": "v24-deep-check"}

@app.post("/admin/migrate")
async def run_migration():
    from database import engine
    from sqlalchemy import text
    
    async with engine.begin() as conn:
        await conn.execute(text("ALTER TABLE clips ADD COLUMN IF NOT EXISTS start_time FLOAT;"))
        await conn.execute(text("ALTER TABLE clips ADD COLUMN IF NOT EXISTS end_time FLOAT;"))
    
    return {"status": "migration_complete", "message": "Added start_time and end_time columns to clips table."}

@app.get("/debug/celery")
async def debug_celery():
    from celery_app import celery_app
    try:
        # Send a ping task
        task = celery_app.send_task("health_check_task")
        return {"status": "ok", "task_id": task.id, "message": "Celery task queued successfully"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.get("/debug/db")
async def debug_db():
    from database import get_db
    from sqlalchemy import text
    try:
        # Check DB connection
        from database import AsyncSessionLocal
        async with AsyncSessionLocal() as session:
            await session.execute(text("SELECT 1"))
        return {"status": "ok", "message": "Database connection successful"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

app.include_router(upload.router, prefix="/api", tags=["Upload"])
app.include_router(projects.router, prefix="/api", tags=["Projects"])
app.include_router(clips.router, prefix="/api", tags=["Clips"])
