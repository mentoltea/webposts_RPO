import os
import json
import logging
import boto3
from botocore.exceptions import ClientError
from botocore.config import Config
from config import S3_ENDPOINT_INTERNAL, S3_ACCESS_KEY, S3_SECRET_KEY, BUCKET_NAME, S3_ENDPOINT_EXTERNAL

logger = logging.getLogger(__name__)



class S3Service:
    def __init__(self):
        config = Config(
            retries={'max_attempts': 3, 'mode': 'standard'},
            connect_timeout=5,
            read_timeout=10
        )
        
        self.client = boto3.client(
            "s3",
            endpoint_url=S3_ENDPOINT_INTERNAL,
            aws_access_key_id=S3_ACCESS_KEY,
            aws_secret_access_key=S3_SECRET_KEY,
            config=config,
        )
        self.bucket_name = BUCKET_NAME

    def init_public_bucket(self):
        try:
            self.client.head_bucket(Bucket=self.bucket_name)
            logger.info(f"Бакет '{self.bucket_name}' уже существует.")
        except ClientError:
            logger.info(f"Создание бакета '{self.bucket_name}'...")
            self.client.create_bucket(Bucket=self.bucket_name)

        public_read_policy = {
            "Version": "2012-10-17",
            "Statement": [
                {
                    "Sid": "PublicReadGetObject",
                    "Effect": "Allow",
                    "Principal": "*",
                    "Action": ["s3:GetObject"],
                    "Resource": [f"arn:aws:s3:::{self.bucket_name}/*"]
                }
            ]
        }

        self.client.put_bucket_policy(
            Bucket=self.bucket_name,
            Policy=json.dumps(public_read_policy)
        )
        logger.info(f"Политика публичного чтения установлена для '{self.bucket_name}'.")

    def upload_file(self, file_obj, filename: str, content_type: str = "image/jpeg") -> str:
        self.client.upload_fileobj(
            file_obj,
            self.bucket_name,
            filename,
            ExtraArgs={"ContentType": content_type}
        )
        return self.get_public_url(filename)

    def delete_file(self, filename: str):
        self.client.delete_object(Bucket=self.bucket_name, Key=filename)

    def get_public_url(self, filename: str) -> str:
        return f"{S3_ENDPOINT_EXTERNAL}/{self.bucket_name}/{filename}"