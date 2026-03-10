"""Health check endpoint for Railway."""

from fastapi import APIRouter

router = APIRouter(tags=["health"])


@router.get("/health", summary="Gateway health check", response_description="Service status")
async def health_check():
    return {"status": "ok", "service": "gateway"}
