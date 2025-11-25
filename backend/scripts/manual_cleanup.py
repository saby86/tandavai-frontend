import sys
import os

# Add backend directory to path so we can import services
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from services.r2 import r2_service

def delete_all_files():
    print("Starting manual cleanup of ALL files in R2...")
    
    try:
        # List objects
        paginator = r2_service.s3_client.get_paginator('list_objects_v2')
        deleted_count = 0
        
        for page in paginator.paginate(Bucket=r2_service.bucket_name):
            if 'Contents' not in page:
                continue
            
            objects_to_delete = [{'Key': obj['Key']} for obj in page['Contents']]
            
            if objects_to_delete:
                # Delete in batches (max 1000 per request)
                for i in range(0, len(objects_to_delete), 1000):
                    batch = objects_to_delete[i:i+1000]
                    r2_service.s3_client.delete_objects(
                        Bucket=r2_service.bucket_name,
                        Delete={'Objects': batch}
                    )
                    deleted_count += len(batch)
                    print(f"Deleted batch of {len(batch)} files.")
                    
        print(f"Cleanup complete. Total deleted: {deleted_count}")

    except Exception as e:
        print(f"Error during cleanup: {e}")

if __name__ == "__main__":
    delete_all_files()
