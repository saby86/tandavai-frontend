from fastapi import APIRouter, HTTPException, Depends
from services.r2 import r2_service
from schemas import PresignedUrlResponse

router = APIRouter()

@router.get("/upload-url", response_model=PresignedUrlResponse)
async def get_upload_url(filename: str, content_type: str):
    """
    Generates a presigned URL for uploading a video file directly to R2.
    """
    # Basic validation
    if not content_type.startswith("video/"):
        raise HTTPException(status_code=400, detail="Invalid content type. Only video files are allowed.")
    
    try:
        data = r2_service.generate_presigned_url(filename, content_type)
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
