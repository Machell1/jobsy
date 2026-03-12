"""Stream Chat token generation for authenticated users."""

import logging
import os

import stream_chat
from fastapi import APIRouter, Depends, HTTPException, status

from ..deps import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/chat", tags=["chat"])

STREAM_API_KEY = os.getenv("STREAM_API_KEY", "")
STREAM_API_SECRET = os.getenv("STREAM_API_SECRET", "")


@router.get("/token")
async def get_stream_token(user: dict = Depends(get_current_user)):
    """Generate a Stream Chat user token for the authenticated user."""
    if not STREAM_API_KEY or not STREAM_API_SECRET:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Chat service not configured. Set STREAM_API_KEY and STREAM_API_SECRET.",
        )

    try:
        server_client = stream_chat.StreamChat(
            api_key=STREAM_API_KEY,
            api_secret=STREAM_API_SECRET,
        )

        user_id = user["user_id"]
        server_client.upsert_user(
            {
                "id": user_id,
                "role": user.get("active_role", "user"),
            }
        )

        token = server_client.create_token(user_id)

        return {
            "token": token,
            "api_key": STREAM_API_KEY,
            "user_id": user_id,
        }
    except Exception:
        logger.exception("Failed to generate Stream Chat token")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Chat service temporarily unavailable",
        ) from None
