from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from config import settings
# Import routers later when they are created
from routers import upload, projects

app = FastAPI(title=settings.PROJECT_NAME)

# CORS Configuration
origins = [
    "http://localhost:3000",
    "http://localhost",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health_check():
    return {"status": "ok", "environment": settings.ENVIRONMENT}

app.include_router(upload.router, prefix="/api", tags=["Upload"])
app.include_router(projects.router, prefix="/api", tags=["Projects"])
