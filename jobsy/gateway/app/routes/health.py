"""Health check endpoint for Railway."""

from fastapi import APIRouter, Request

BUILD_VERSION = "phase4-qa-fixes"

router = APIRouter(tags=["health"])


@router.get("/health", summary="Gateway health check", response_description="Service status")
async def health_check(request: Request):
    status = {"status": "ok", "service": "gateway", "build": BUILD_VERSION}
    redis = getattr(request.app.state, "redis", None)
    if redis:
        try:
            await redis.ping()
        except Exception:
            status["status"] = "degraded"
            status["redis"] = "unavailable"
    return status
