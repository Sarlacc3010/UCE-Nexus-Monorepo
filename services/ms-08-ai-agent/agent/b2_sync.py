import os
import logging
import boto3
from botocore.client import Config
from pathlib import Path

logger = logging.getLogger("b2_sync")

# Local knowledge base path relative to the service directory
KNOWLEDGE_BASE_PATH = os.path.join(os.path.dirname(__file__), "..", "knowledge_base")


class B2SyncService:
    def __init__(self):
        self.endpoint_url = os.getenv("B2_ENDPOINT_URL")
        self.access_key = os.getenv("B2_ACCESS_KEY_ID")
        self.secret_key = os.getenv("B2_SECRET_ACCESS_KEY")
        self.bucket_name = os.getenv("B2_BUCKET_NAME", "uce-nexus-knowledge-base")

        self.enabled = all([self.endpoint_url, self.access_key, self.secret_key])

        if self.enabled:
            # Configure S3 client with Backblaze B2 S3-compatible API
            self.s3_client = boto3.client(
                's3',
                endpoint_url=self.endpoint_url,
                aws_access_key_id=self.access_key,
                aws_secret_access_key=self.secret_key,
                config=Config(signature_version='s3v4')
            )
            logger.info(f"☁️ Backblaze B2 client initialized for bucket '{self.bucket_name}'")
        else:
            logger.warning("⚠️ Backblaze B2 configuration is incomplete. Falling back to local files.")

    def sync_bucket_to_local(self) -> int:
        """
        Downloads new/modified files from B2 and deletes obsolete local files.
        Returns the number of new/modified files downloaded.
        """
        if not self.enabled:
            logger.info("B2 synchronization skipped (not configured).")
            return 0

        local_dir = Path(KNOWLEDGE_BASE_PATH)
        local_dir.mkdir(parents=True, exist_ok=True)

        logger.info(f"🔄 Syncing B2 bucket '{self.bucket_name}' to local '{KNOWLEDGE_BASE_PATH}'...")

        try:
            # 1. Retrieve all files in bucket
            response = self.s3_client.list_objects_v2(Bucket=self.bucket_name)
            bucket_files = response.get('Contents', [])

            bucket_filenames = set()
            downloaded = 0

            for obj in bucket_files:
                key = obj['Key']
                # Process markdown and PDF files
                if not (key.lower().endswith('.md') or key.lower().endswith('.pdf')):
                    continue

                bucket_filenames.add(key)
                local_file_path = local_dir / key

                # Check if download is required (not exists or size differs)
                needs_download = True
                if local_file_path.exists():
                    local_stat = local_file_path.stat()
                    if local_stat.st_size == obj['Size']:
                        needs_download = False

                if needs_download:
                    logger.info(f"📥 Downloading {key} from B2...")
                    self.s3_client.download_file(self.bucket_name, key, str(local_file_path))
                    downloaded += 1

            # 2. Cleanup local files no longer present in the bucket
            # Safety: Do not delete local files if no valid files are found in the bucket
            if not bucket_filenames:
                logger.warning("⚠️ No valid knowledge base files found in the B2 bucket. Skipping local file cleanup to prevent data loss.")
            else:
                for local_file in local_dir.glob("*"):
                    if local_file.is_dir() or local_file.suffix.lower() not in ('.md', '.pdf'):
                        continue
                    if local_file.name not in bucket_filenames:
                        logger.info(f"🗑️ Deleting local obsolete file: {local_file.name}")
                        local_file.unlink()

            logger.info("✅ Backblaze B2 synchronization completed successfully.")
            return downloaded

        except Exception as e:
            logger.error(f"❌ Error during Backblaze B2 synchronization: {e}", exc_info=True)
            return 0
