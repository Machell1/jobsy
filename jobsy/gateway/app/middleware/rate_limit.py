"""Redis-backed sliding window rate limiter."""

import logging
import time

from fastapi import HTTPException, Request, status

from shared.auth import decode_token

from ..config import RATE_LIMIT_AUTHENTICATED, RATE_LIMIT_UNAUTHENTICATED

logger = logging.getLogger(__name__)


async def rate_limit_check(request: Request) -> None:
    """Check rate limit. Uses in-memory fallback if Redis unavailable."""
    redis = getattr(request.app.state, "redis", None)
    if not redis:
        return

    # Determine client identity and limit
    auth_header = request.headers.get("authorization", "")
    if auth_header.startswith("Bearer "):
        token = auth_header[7:]
        try:
            payload = decode_token(token)
            user_id = payload.get("sub", "unknown")
            key = f"rate:user:{user_id}"
        except Exception:
            # Invalid token -- rate limit by IP instead
            client_ip = request.client.host if request.client else "unknown"
            key = f"rate:{client_ip}"
        limit = RATE_LIMIT_AUTHENTICATED
    else:
        client_ip = request.client.host if request.client else "unknown"
        key = f"rate:{client_ip}"
        limit = RATE_LIMIT_UNAUTHENTICATED

    now = time.time()
    window_start = now - 60

    try:
        pipe = redis.pipeline()
        pipe.zremrangebyscore(key, 0, window_start)
        pipe.zadd(key, {str(now): now})
        pipe.zcard(key)
        pipe.expire(key, 120)
        results = await pipe.execute()
    except Exception:
        logger.warning("Redis error during rate limit check, allowing request through")
        return

    request_count = results[2]
    if request_count > limit:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Rate limit exceeded. Max {limit} requests per minute.",
        )
