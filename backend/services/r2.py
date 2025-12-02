import boto3
from botocore.config import Config
from config import settings
import uuid

class R2Service:
    def __init__(self):
        self.s3_client = boto3.client(
            's3',
            endpoint_url=f"https://{settings.R2_ACCOUNT_ID}.r2.cloudflarestorage.com",
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

    def generate_presigned_get_url(self, s3_key: str, expiration: int = 3600) -> str:
        """
        Generates a presigned URL for downloading/viewing a file.
        """
        try:
            response = self.s3_client.generate_presigned_url(
                'get_object',
                Params={
                    'Bucket': self.bucket_name,
                    'Key': s3_key,
                    'ResponseContentDisposition': 'attachment'
                },
                ExpiresIn=expiration
            )
            return response
        except Exception as e:
            print(f"Error generating presigned GET URL: {e}")
            # Fallback to public URL logic if presigning fails (though unlikely)
            return self.get_public_url(s3_key)

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

    def cleanup_files(self, retention_hours: int = 24) -> int:
        """
        Deletes files older than the specified retention period.
        Returns the number of files deleted.
        """
        from datetime import datetime, timedelta, timezone
        
        cutoff_time = datetime.now(timezone.utc) - timedelta(hours=retention_hours)
        deleted_count = 0
        
        try:
            # List objects
            paginator = self.s3_client.get_paginator('list_objects_v2')
            
            for page in paginator.paginate(Bucket=self.bucket_name):
                if 'Contents' not in page:
                    continue
                
                objects_to_delete = []
                for obj in page['Contents']:
                    if obj['LastModified'] < cutoff_time:
                        objects_to_delete.append({'Key': obj['Key']})
                
                if objects_to_delete:
                    # Delete in batches (max 1000 per request)
                    for i in range(0, len(objects_to_delete), 1000):
                        batch = objects_to_delete[i:i+1000]
                        self.s3_client.delete_objects(
                            Bucket=self.bucket_name,
                            Delete={'Objects': batch}
                        )
                        deleted_count += len(batch)
                        print(f"Deleted {len(batch)} old files from R2.")
                        
            return deleted_count
            
        except Exception as e:
            print(f"Error during R2 cleanup: {e}")
            return 0

    def delete_file(self, s3_key: str):
        """
        Deletes a single file from R2.
        """
        try:
            self.s3_client.delete_object(Bucket=self.bucket_name, Key=s3_key)
            print(f"Deleted file from R2: {s3_key}")
        except Exception as e:
            print(f"Error deleting file {s3_key}: {e}")

r2_service = R2Service()
