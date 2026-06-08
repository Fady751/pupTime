import logging
import uuid as _uuid

import boto3
from botocore.exceptions import ClientError
from decouple import config

logger = logging.getLogger(__name__)


_s3_client = None


def _get_s3_client():
    global _s3_client
    if _s3_client is None:
        _s3_client = boto3.client(
            "s3",
            aws_access_key_id=config("AWS_ACCESS_KEY_ID"),
            aws_secret_access_key=config("AWS_SECRET_ACCESS_KEY"),
            region_name=config("AWS_S3_REGION", default="eu-west-1"),
        )
    return _s3_client


def _get_bucket_name() -> str:
    return config("AWS_S3_BUCKET_NAME", default="puptime-voice-messages")



ALLOWED_MIME_TYPES = {
    "audio/webm": "webm",
    "audio/mp4": "m4a",
    "audio/x-m4a": "m4a",
    "audio/m4a": "m4a",
    "audio/mpeg": "mp3",
    "audio/mp3": "mp3",
    "audio/wav": "wav",
    "audio/x-wav": "wav",
    "audio/ogg": "ogg",
    "audio/aac": "aac",
}

MAX_VOICE_FILE_SIZE = 10 * 1024 * 1024 


def get_extension_for_mime(mime_type: str) -> str | None:
    return ALLOWED_MIME_TYPES.get(mime_type.lower().strip())



def upload_voice_file(
    file_bytes: bytes,
    user_id: int | str,
    mime_type: str,
) -> str:
    ext = get_extension_for_mime(mime_type)
    if ext is None:
        raise ValueError(
            f"Unsupported audio MIME type: {mime_type}. "
            f"Supported: {', '.join(sorted(ALLOWED_MIME_TYPES.keys()))}"
        )

    if len(file_bytes) > MAX_VOICE_FILE_SIZE:
        raise ValueError(
            f"Voice file too large ({len(file_bytes)} bytes). "
            f"Maximum allowed: {MAX_VOICE_FILE_SIZE} bytes (10 MB)."
        )

    filename = f"{_uuid.uuid4()}.{ext}"
    s3_key = f"voice-messages/{user_id}/{filename}"

    client = _get_s3_client()
    client.put_object(
        Bucket=_get_bucket_name(),
        Key=s3_key,
        Body=file_bytes,
        ContentType=mime_type,
    )

    logger.info("Uploaded voice file to S3: %s (%d bytes)", s3_key, len(file_bytes))
    return s3_key


def generate_presigned_url(s3_key: str, expiry_seconds: int = 3600) -> str | None:
    try:
        client = _get_s3_client()
        url = client.generate_presigned_url(
            "get_object",
            Params={
                "Bucket": _get_bucket_name(),
                "Key": s3_key,
            },
            ExpiresIn=expiry_seconds,
        )
        return url
    except ClientError:
        logger.exception("Failed to generate presigned URL for %s", s3_key)
        return None
