"""Per-user and global rate limits for /api/ai/* endpoints.

Two independent limiters share one Redis client:
  1. Per-user hourly call count (AI_RATE_LIMIT_PER_USER_HOUR)
  2. Global daily token budget (AI_DAILY_TOKEN_BUDGET)

Both use INCR + EXPIRE primitives with hour/day bucket keys.
Each returns a (allowed, retry_after_seconds, message) tuple.

If Redis is unreachable, we FAIL OPEN (allow the call). The rate limiter is
a safety net, not a correctness boundary - scope guard and token ceilings
provide the primary cost controls.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone

import redis.asyncio as aioredis

from shared.config import (
    AI_DAILY_TOKEN_BUDGET,
    AI_RATE_LIMIT_PER_USER_HOUR,
    REDIS_URL,
)

logger = logging.getLogger(__name__)

_redis: aioredis.Redis | None = None


def _get_redis() -> aioredis.Redis | None:
    global _redis
    if _redis is not None:
        return _redis
    if not REDIS_URL:
        return None
    try:
        _redis = aioredis.from_url(REDIS_URL, decode_responses=True)
        return _redis
    except Exception:
        logger.exception("Failed to init Redis for AI rate limit")
        return None


async def check_user_hour_limit(user_id: str) -> tuple[bool, int, str]:
    """Returns (allowed, retry_after_seconds, message)."""
    r = _get_redis()
    if r is None:
        return True, 0, ""

    bucket = datetime.now(timezone.utc).strftime("%Y-%m-%d-%H")
    key = f"ai_rate:user:{user_id}:{bucket}"
    try:
        count = await r.incr(key)
        if count == 1:
            await r.expire(key, 3600)
    except Exception:
        logger.exception("Redis error in user hour rate limit check")
        return True, 0, ""

    if count > AI_RATE_LIMIT_PER_USER_HOUR:
        now = datetime.now(timezone.utc)
        secs_to_next_hour = 3600 - (now.minute * 60 + now.second)
        return (
            False,
            secs_to_next_hour,
            f"You've reached the AI assistant's hourly limit ({AI_RATE_LIMIT_PER_USER_HOUR} requests). "
            f"Please try again in about {secs_to_next_hour // 60 + 1} minute(s), or use the classic job-post form.",
        )
    return True, 0, ""


async def record_tokens_consumed(tokens: int) -> tuple[bool, str]:
    """Increment global daily token counter. Returns (within_budget, message)."""
    r = _get_redis()
    if r is None or tokens <= 0:
        return True, ""

    bucket = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    key = f"ai_tokens_daily:{bucket}"
    try:
        total = await r.incrby(key, tokens)
        if total == tokens:  # first increment today
            await r.expire(key, 86400)
    except Exception:
        logger.exception("Redis error in daily token budget")
        return True, ""

    if total > AI_DAILY_TOKEN_BUDGET:
        return (
            False,
            "Jobsy AI is at capacity for today. Please try again tomorrow or use the classic job-post form.",
        )
    return True, ""


async def is_daily_budget_exceeded() -> tuple[bool, str]:
    """Read-only check before an expensive call."""
    r = _get_redis()
    if r is None:
        return False, ""
    bucket = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    key = f"ai_tokens_daily:{bucket}"
    try:
        val = await r.get(key)
    except Exception:
        return False, ""
    if not val:
        return False, ""
    try:
        total = int(val)
    except (ValueError, TypeError):
        return False, ""
    if total > AI_DAILY_TOKEN_BUDGET:
        return True, "Jobsy AI is at capacity for today."
    return False, ""
