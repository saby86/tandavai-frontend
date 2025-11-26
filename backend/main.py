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

@app.get("/health")
async def health_check():
    return {"status": "ok", "environment": settings.ENVIRONMENT, "version": "v16-fix-session-retry"}

app.include_router(upload.router, prefix="/api", tags=["Upload"])
app.include_router(projects.router, prefix="/api", tags=["Projects"])
app.include_router(clips.router, prefix="/api", tags=["Clips"])
