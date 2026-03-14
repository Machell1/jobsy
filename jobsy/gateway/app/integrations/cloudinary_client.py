"""Cloudinary image upload integration."""

import logging

import cloudinary
import cloudinary.uploader

from shared.config import CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET, CLOUDINARY_CLOUD_NAME

logger = logging.getLogger(__name__)

_configured = False

if CLOUDINARY_CLOUD_NAME and CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET:
    cloudinary.config(
        cloud_name=CLOUDINARY_CLOUD_NAME,
        api_key=CLOUDINARY_API_KEY,
        api_secret=CLOUDINARY_API_SECRET,
        secure=True,
    )
    _configured = True
else:
    logger.warning("Cloudinary credentials not set, image uploads will be unavailable")


def upload_image(file_bytes: bytes, folder: str = "jobsy") -> str | None:
    """Upload an image to Cloudinary and return the secure URL.

    Returns None if Cloudinary is not configured.
    """
    if not _configured:
        logger.warning("Cloudinary not configured, skipping upload")
        return None
    result = cloudinary.uploader.upload(file_bytes, folder=folder)
    return result.get("secure_url")
