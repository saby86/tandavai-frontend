from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    PROJECT_NAME: str = "TandavAI"
    ENVIRONMENT: str = "development"
    
    DATABASE_URL: str
    
    R2_ACCOUNT_ID: Optional[str] = None
    R2_ACCESS_KEY_ID: Optional[str] = None
    R2_SECRET_ACCESS_KEY: Optional[str] = None
    R2_BUCKET_NAME: str = "tandavai-uploads"
    R2_PUBLIC_ENDPOINT: Optional[str] = None
    
    GOOGLE_API_KEY: Optional[str] = None
    
    REDIS_URL: str = "redis://localhost:6379/0"
    
    class Config:
        env_file = ".env"

settings = Settings()
