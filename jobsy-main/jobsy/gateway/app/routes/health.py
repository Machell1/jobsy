"""Health check endpoints for Railway / Kubernetes probes."""

import logging
import os

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import JSONResponse

BUILD_VERSION = "qa-fixes-v2-20260315"

router = APIRouter(tags=["health"])
logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Original /health (unchanged)
# ---------------------------------------------------------------------------

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


# ---------------------------------------------------------------------------
# GET /health/live  -- liveness probe (always 200)
# ---------------------------------------------------------------------------

@router.get("/health/live", summary="Liveness probe")
async def liveness():
    """Always returns 200 to indicate the process is alive."""
    return {"status": "alive"}


# ---------------------------------------------------------------------------
# GET /health/ready -- readiness probe (DB + Redis + RabbitMQ)
# ---------------------------------------------------------------------------

async def _check_db() -> tuple[bool, str]:
    """Return (ok, detail) for the Postgres connection."""
    try:
        from sqlalchemy import text
        from shared.database import engine

        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        return True, "connected"
    except Exception as exc:
        return False, str(exc)


async def _check_redis(request: Request) -> tuple[bool, str]:
    """Return (ok, detail) for the Redis connection."""
    redis = getattr(request.app.state, "redis", None)
    if redis is None:
        return False, "not configured"
    try:
        await redis.ping()
        return True, "connected"
    except Exception as exc:
        return False, str(exc)


@router.get("/health/ready", summary="Readiness probe")
async def readiness(request: Request):
    """Check core dependencies: DB, Redis.

    Returns 200 if all are connected, 503 if any fail.
    """
    db_ok, db_detail = await _check_db()
    redis_ok, redis_detail = await _check_redis(request)

    services = {
        "database": {"status": "up" if db_ok else "down", "detail": db_detail},
        "redis": {"status": "up" if redis_ok else "down", "detail": redis_detail},
    }

    all_ok = db_ok and redis_ok
    payload = {
        "status": "ready" if all_ok else "not_ready",
        "services": services,
        "build": BUILD_VERSION,
    }

    return JSONResponse(
        status_code=200 if all_ok else 503,
        content=payload,
    )


# ---------------------------------------------------------------------------
# GET /health/deep  -- deep dependency check (admin-only)
# ---------------------------------------------------------------------------

async def _check_stripe() -> tuple[bool, str]:
    """Verify Stripe API key by listing zero charges."""
    try:
        import stripe

        secret = os.getenv("STRIPE_SECRET_KEY", "")
        if not secret:
            return False, "not configured"
        stripe.api_key = secret
        # Lightweight call to validate the key.
        stripe.Account.retrieve()
        return True, "api_key valid"
    except Exception as exc:
        return False, str(exc)


async def _check_cloudinary() -> tuple[bool, str]:
    """Ping Cloudinary API."""
    try:
        import cloudinary
        import cloudinary.api
        from shared.config import (
            CLOUDINARY_API_KEY,
            CLOUDINARY_API_SECRET,
            CLOUDINARY_CLOUD_NAME,
        )

        if not CLOUDINARY_CLOUD_NAME:
            return False, "not configured"
        cloudinary.config(
            cloud_name=CLOUDINARY_CLOUD_NAME,
            api_key=CLOUDINARY_API_KEY,
            api_secret=CLOUDINARY_API_SECRET,
        )
        cloudinary.api.ping()
        return True, "connected"
    except Exception as exc:
        return False, str(exc)


async def _check_stream_chat() -> tuple[bool, str]:
    """Verify Stream Chat API key."""
    try:
        api_key = os.getenv("STREAM_API_KEY", "")
        api_secret = os.getenv("STREAM_API_SECRET", "")
        if not api_key or not api_secret:
            return False, "not configured"
        from stream_chat import StreamChat

        client = StreamChat(api_key=api_key, api_secret=api_secret)
        client.get_app_settings()
        return True, "api_key valid"
    except Exception as exc:
        return False, str(exc)


async def _check_elasticsearch() -> tuple[bool, str]:
    """Ping Elasticsearch cluster."""
    try:
        from shared.config import ELASTICSEARCH_URL

        if not ELASTICSEARCH_URL:
            return False, "not configured"
        from elasticsearch import AsyncElasticsearch

        es = AsyncElasticsearch(ELASTICSEARCH_URL, request_timeout=5)
        try:
            info = await es.info()
            return True, f"cluster: {info.get('cluster_name', 'unknown')}"
        finally:
            await es.close()
    except Exception as exc:
        return False, str(exc)


def _require_admin(request: Request) -> None:
    """Ensure the caller has a valid admin JWT. Raises 403 otherwise."""
    from shared.auth import decode_token

    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authorization header required")
    try:
        payload = decode_token(auth[7:])
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    role = payload.get("active_role", payload.get("role", "user"))
    if role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")


@router.get("/health/deep", summary="Deep dependency check (admin-only)")
async def deep_health(request: Request):
    """Check ALL external dependencies. Requires an admin JWT."""
    _require_admin(request)

    db_ok, db_detail = await _check_db()
    redis_ok, redis_detail = await _check_redis(request)
    stripe_ok, stripe_detail = await _check_stripe()
    cloudinary_ok, cloudinary_detail = await _check_cloudinary()
    stream_ok, stream_detail = await _check_stream_chat()
    es_ok, es_detail = await _check_elasticsearch()

    services = {
        "database": {"status": "up" if db_ok else "down", "detail": db_detail},
        "redis": {"status": "up" if redis_ok else "down", "detail": redis_detail},
        "stripe": {"status": "up" if stripe_ok else "down", "detail": stripe_detail},
        "cloudinary": {"status": "up" if cloudinary_ok else "down", "detail": cloudinary_detail},
        "stream_chat": {"status": "up" if stream_ok else "down", "detail": stream_detail},
        "elasticsearch": {"status": "up" if es_ok else "down", "detail": es_detail},
    }

    up_count = sum(1 for s in services.values() if s["status"] == "up")
    total = len(services)

    payload = {
        "status": "healthy" if up_count == total else "degraded",
        "summary": f"{up_count}/{total} services up",
        "services": services,
        "build": BUILD_VERSION,
    }

    status_code = 200 if up_count == total else 503
    return JSONResponse(status_code=status_code, content=payload)
