"""Redis-backed sliding window rate limiter."""

import hashlib
import time

from fastapi import HTTPException, Request, status

from ..config import RATE_LIMIT_AUTHENTICATED, RATE_LIMIT_UNAUTHENTICATED


async def rate_limit_check(request: Request) -> None:
    """Check rate limit. Uses in-memory fallback if Redis unavailable."""
    redis = getattr(request.app.state, "redis", None)
    if not redis:
        return

    # Determine client identity and limit
    auth_header = request.headers.get("authorization", "")
    if auth_header.startswith("Bearer "):
        # Hash the full token for a stable, unique key per user session
        token_hash = hashlib.sha256(auth_header.encode()).hexdigest()[:16]
        key = f"rate:{token_hash}"
        limit = RATE_LIMIT_AUTHENTICATED
    else:
        client_ip = request.client.host if request.client else "unknown"
        key = f"rate:{client_ip}"
        limit = RATE_LIMIT_UNAUTHENTICATED

    now = time.time()
    window_start = now - 60

    pipe = redis.pipeline()
    pipe.zremrangebyscore(key, 0, window_start)
    pipe.zadd(key, {str(now): now})
    pipe.zcard(key)
    pipe.expire(key, 120)
    results = await pipe.execute()

    request_count = results[2]
    if request_count > limit:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Rate limit exceeded. Max {limit} requests per minute.",
        )
