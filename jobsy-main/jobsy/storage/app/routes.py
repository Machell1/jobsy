"""Storage service API routes for file upload, presigned URLs, deletion, and content moderation."""

import logging
import os
import uuid
from datetime import datetime, timezone
from enum import Enum
from typing import Optional

import cloudinary
import cloudinary.uploader
from fastapi import APIRouter, File, HTTPException, Query, Request, UploadFile, status
from pydantic import BaseModel, Field

from .s3 import (
    ALLOWED_DOC_TYPES,
    ALLOWED_IMAGE_TYPES,
    ALLOWED_VIDEO_TYPES,
    create_thumbnail,
    delete_file,
    generate_presigned_url,
    upload_file,
)

logger = logging.getLogger(__name__)

router = APIRouter(tags=["storage"])

ALLOWED_FOLDERS = {"avatars", "listings", "chat", "documents", "portfolio"}

# ---------------------------------------------------------------------------
# Cloudinary configuration
# ---------------------------------------------------------------------------
cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME", ""),
    api_key=os.getenv("CLOUDINARY_API_KEY", ""),
    api_secret=os.getenv("CLOUDINARY_API_SECRET", ""),
)

# ---------------------------------------------------------------------------
# In-memory moderation queue (replace with DB in production)
# ---------------------------------------------------------------------------
_moderation_queue: dict[str, dict] = {}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _get_user_id(request: Request) -> str:
    user_id = request.headers.get("X-User-ID")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing user context")
    return user_id


def _require_admin(request: Request) -> None:
    """Raise 403 if the caller is not an admin."""
    user_role = request.headers.get("X-User-Role", "")
    if user_role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")


def _cloudinary_configured() -> bool:
    """Return True when Cloudinary credentials are present."""
    cfg = cloudinary.config()
    return bool(cfg.cloud_name and cfg.api_key and cfg.api_secret)


def _submit_to_moderation(
    file_data: bytes,
    content_type: str,
    resource_type: str,
    user_id: str,
    file_url: str,
    thumbnail_url: Optional[str] = None,
) -> str:
    """Submit media to Cloudinary moderation and return a moderation status.

    Returns 'approved' when moderation is not available, or 'pending_review'
    when content is flagged.
    """
    if not _cloudinary_configured():
        return "approved"

    try:
        result = cloudinary.uploader.upload(
            file_data,
            resource_type=resource_type,
            moderation="aws_rek",  # Amazon Rekognition moderation add-on
        )
        moderation_response = result.get("moderation", [])
        is_flagged = any(m.get("status") == "rejected" for m in moderation_response)

        if is_flagged:
            entry_id = uuid.uuid4().hex
            _moderation_queue[entry_id] = {
                "id": entry_id,
                "user_id": user_id,
                "file_url": file_url,
                "thumbnail_url": thumbnail_url,
                "content_type": content_type,
                "resource_type": resource_type,
                "moderation_status": "pending_review",
                "moderation_response": moderation_response,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "reviewed_at": None,
                "reviewed_by": None,
                "decision": None,
            }
            return "pending_review"
    except Exception:
        logger.exception("Moderation check failed — defaulting to approved")

    return "approved"


def _upload_video_to_cloudinary(file_data: bytes, user_folder: str) -> dict:
    """Upload a video to Cloudinary with adaptive streaming and thumbnail generation.

    Returns a dict with 'video_url', 'thumbnail_url', and Cloudinary metadata.
    """
    public_id = f"{user_folder}/{uuid.uuid4().hex}"

    upload_result = cloudinary.uploader.upload(
        file_data,
        resource_type="video",
        public_id=public_id,
        eager=[
            # Adaptive streaming (HLS)
            {"streaming_profile": "auto", "format": "m3u8"},
        ],
        eager_async=True,
    )

    video_url = upload_result.get("secure_url", upload_result.get("url", ""))

    # Generate thumbnail from the video at the 2-second mark
    cloud_name = cloudinary.config().cloud_name
    thumb_public_id = upload_result.get("public_id", public_id)
    thumbnail_url = (
        f"https://res.cloudinary.com/{cloud_name}/video/upload"
        f"/so_2,w_400,h_300,c_fill/{thumb_public_id}.jpg"
    )

    return {
        "video_url": video_url,
        "thumbnail_url": thumbnail_url,
        "public_id": upload_result.get("public_id"),
        "duration": upload_result.get("duration"),
        "format": upload_result.get("format"),
        "size": upload_result.get("bytes", len(file_data)),
    }


# ---------------------------------------------------------------------------
# Upload endpoint (images, videos, documents)
# ---------------------------------------------------------------------------

@router.post("/upload")
async def upload(
    request: Request,
    file: UploadFile = File(...),
    folder: str = Query(default="listings", description="Target folder"),
):
    """Upload a file. Supports images (JPEG, PNG, WebP, GIF), videos (MP4, MOV, AVI, WebM), and PDFs.

    For images, automatically generates a thumbnail variant.
    For videos, uploads to Cloudinary with adaptive streaming and generates a thumbnail.
    Content moderation is applied to both images and videos when Cloudinary is configured.
    """
    user_id = _get_user_id(request)

    if folder not in ALLOWED_FOLDERS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid folder. Must be one of: {', '.join(sorted(ALLOWED_FOLDERS))}",
        )

    content_type = file.content_type or "application/octet-stream"
    allowed = ALLOWED_IMAGE_TYPES | ALLOWED_DOC_TYPES | ALLOWED_VIDEO_TYPES
    if content_type not in allowed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file type: {content_type}",
        )

    file_data = await file.read()

    # Enforce size limits
    is_video = content_type in ALLOWED_VIDEO_TYPES
    max_size = 100 * 1024 * 1024 if is_video else 10 * 1024 * 1024
    if len(file_data) > max_size:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File too large. Maximum size is {max_size // (1024 * 1024)}MB",
        )

    # Include user_id in the path for ownership tracking
    user_folder = f"{folder}/{user_id}"

    # ----- Video upload path (Cloudinary) -----
    if is_video:
        if not _cloudinary_configured():
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Video upload requires Cloudinary configuration",
            )

        try:
            video_result = _upload_video_to_cloudinary(file_data, user_folder)
        except Exception as e:
            logger.exception("Video upload to Cloudinary failed")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Video upload failed: {e}",
            ) from e

        # Submit video to content moderation
        moderation_status = _submit_to_moderation(
            file_data,
            content_type,
            resource_type="video",
            user_id=user_id,
            file_url=video_result["video_url"],
            thumbnail_url=video_result["thumbnail_url"],
        )

        return {
            "url": video_result["video_url"],
            "thumbnail_url": video_result["thumbnail_url"],
            "content_type": content_type,
            "size": video_result["size"],
            "duration": video_result.get("duration"),
            "media_type": "video",
            "moderation_status": moderation_status,
        }

    # ----- Image / document upload path (S3) -----
    try:
        result = upload_file(file_data, content_type, user_folder)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)) from e

    # Generate thumbnail for images
    thumbnail_url = None
    if content_type in ALLOWED_IMAGE_TYPES:
        try:
            thumb_data = create_thumbnail(file_data, content_type)
            thumb_result = upload_file(thumb_data, content_type, f"{user_folder}/thumbs")
            thumbnail_url = thumb_result["url"]
        except Exception:  # noqa: S110
            pass  # Thumbnail generation failure is non-fatal

    # Submit image to content moderation
    moderation_status = "approved"
    if content_type in ALLOWED_IMAGE_TYPES:
        moderation_status = _submit_to_moderation(
            file_data,
            content_type,
            resource_type="image",
            user_id=user_id,
            file_url=result["url"],
            thumbnail_url=thumbnail_url,
        )

    return {
        **result,
        "thumbnail_url": thumbnail_url,
        "media_type": "image" if content_type in ALLOWED_IMAGE_TYPES else "document",
        "moderation_status": moderation_status,
    }


# ---------------------------------------------------------------------------
# Presigned URL endpoint
# ---------------------------------------------------------------------------

class PresignedRequest(BaseModel):
    folder: str = Field(..., description="Target folder")
    content_type: str = Field(..., description="MIME type of the file to upload")


@router.post("/presigned")
async def get_presigned_url(data: PresignedRequest, request: Request):
    """Get a presigned URL for direct client-to-S3 upload.

    Useful for large files where you want to bypass the server.
    """
    _get_user_id(request)

    if data.folder not in ALLOWED_FOLDERS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid folder. Must be one of: {', '.join(sorted(ALLOWED_FOLDERS))}",
        )

    allowed = ALLOWED_IMAGE_TYPES | ALLOWED_DOC_TYPES | ALLOWED_VIDEO_TYPES
    if data.content_type not in allowed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file type: {data.content_type}",
        )

    return generate_presigned_url(data.folder, data.content_type)


# ---------------------------------------------------------------------------
# Content moderation endpoints
# ---------------------------------------------------------------------------

class ModerationDecision(str, Enum):
    approved = "approved"
    rejected = "rejected"


class ModerationReviewRequest(BaseModel):
    decision: ModerationDecision = Field(..., description="Approve or reject the flagged media")
    reason: Optional[str] = Field(None, description="Optional reason for the decision")


@router.get("/moderation/queue")
async def get_moderation_queue(
    request: Request,
    status_filter: Optional[str] = Query(
        default="pending_review",
        alias="status",
        description="Filter by moderation status (pending_review, approved, rejected)",
    ),
):
    """Admin endpoint: list all media items in the moderation queue.

    Returns flagged media ordered by creation date (newest first).
    """
    _get_user_id(request)
    _require_admin(request)

    items = list(_moderation_queue.values())
    if status_filter:
        items = [item for item in items if item["moderation_status"] == status_filter]

    # Sort newest first
    items.sort(key=lambda x: x.get("created_at", ""), reverse=True)

    return {"items": items, "total": len(items)}


@router.put("/moderation/{moderation_id}/review")
async def review_moderation_item(
    moderation_id: str,
    data: ModerationReviewRequest,
    request: Request,
):
    """Admin endpoint: approve or reject a flagged media item.

    Updates the moderation status and records the reviewer.
    """
    user_id = _get_user_id(request)
    _require_admin(request)

    item = _moderation_queue.get(moderation_id)
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Moderation item not found")

    item["moderation_status"] = data.decision.value
    item["reviewed_at"] = datetime.now(timezone.utc).isoformat()
    item["reviewed_by"] = user_id
    item["decision"] = data.decision.value
    if data.reason:
        item["decision_reason"] = data.reason

    return {"status": "updated", "item": item}


# ---------------------------------------------------------------------------
# File deletion
# ---------------------------------------------------------------------------

@router.delete("/{key:path}")
async def remove_file(key: str, request: Request):
    """Delete a stored file by its key.

    Users can only delete files that contain their user_id in the key path.
    Admin users (X-User-Role: admin) can delete any file.
    """
    user_id = _get_user_id(request)
    user_role = request.headers.get("X-User-Role", "")

    if user_role != "admin" and user_id not in key:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only delete your own files",
        )

    if not delete_file(key):
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to delete file")

    return {"status": "deleted", "key": key}
