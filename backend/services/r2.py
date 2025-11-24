import boto3
from botocore.config import Config
from config import settings
import uuid

class R2Service:
    def __init__(self):
        self.s3_client = boto3.client(
            's3',
            endpoint_url=settings.R2_PUBLIC_ENDPOINT.replace('/' + settings.R2_BUCKET_NAME, '') if settings.R2_PUBLIC_ENDPOINT else f"https://{settings.R2_ACCOUNT_ID}.r2.cloudflarestorage.com",
            aws_access_key_id=settings.R2_ACCESS_KEY_ID,
            aws_secret_access_key=settings.R2_SECRET_ACCESS_KEY,
            config=Config(signature_version='s3v4'),
            region_name='auto' # R2 requires a region, 'auto' is usually fine or 'us-east-1'
        )
        self.bucket_name = settings.R2_BUCKET_NAME

    def generate_presigned_url(self, filename: str, content_type: str) -> dict:
        """
        Generates a presigned URL for uploading a file to R2.
        """
        # Generate a unique object name to prevent collisions
        object_name = f"{uuid.uuid4()}/{filename}"
        
        try:
            response = self.s3_client.generate_presigned_url(
                'put_object',
                Params={
                    'Bucket': self.bucket_name,
                    'Key': object_name,
                    'ContentType': content_type
                },
                ExpiresIn=3600 # 1 hour
            )
            return {
                "upload_url": response,
                "s3_key": object_name,
                "filename": filename
            }
        except Exception as e:
            print(f"Error generating presigned URL: {e}")
            raise e

    def get_public_url(self, s3_key: str) -> str:
        """
        Constructs the public URL for an object.
        """
        if settings.R2_PUBLIC_ENDPOINT:
             # Ensure no double slashes if endpoint ends with /
            base = settings.R2_PUBLIC_ENDPOINT.rstrip('/')
            return f"{base}/{s3_key}"
        else:
             # Fallback or internal use
             return f"https://{settings.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/{self.bucket_name}/{s3_key}"

r2_service = R2Service()
