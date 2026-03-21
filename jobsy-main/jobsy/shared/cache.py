"""Redis caching helpers for Jobsy backend services."""

import json
import logging
from typing import Optional

import redis.asyncio as aioredis

from shared.config import REDIS_URL

logger = logging.getLogger(__name__)

_redis: Optional[aioredis.Redis] = None


async def get_redis() -> aioredis.Redis:
    """Return a shared async Redis connection (lazy-initialized)."""
    global _redis
    if _redis is None:
        _redis = aioredis.from_url(REDIS_URL, decode_responses=True)
    return _redis


def cache_key(*parts: str) -> str:
    """Build a namespaced cache key.

    Example: cache_key("events", "featured") -> "jobsy:events:featured"
    """
    return "jobsy:" + ":".join(parts)


async def cache_get(key: str) -> Optional[str]:
    """Get a string value from Redis. Returns None on miss or error."""
    try:
        r = await get_redis()
        return await r.get(key)
    except Exception:
        logger.warning("Redis cache_get failed for key=%s", key, exc_info=True)
        return None


async def cache_set(key: str, value: str, ttl: int = 300) -> None:
    """Set a string value in Redis with a TTL (seconds, default 5 min)."""
    try:
        r = await get_redis()
        await r.set(key, value, ex=ttl)
    except Exception:
        logger.warning("Redis cache_set failed for key=%s", key, exc_info=True)


async def cache_delete(key: str) -> None:
    """Delete a key from Redis."""
    try:
        r = await get_redis()
        await r.delete(key)
    except Exception:
        logger.warning("Redis cache_delete failed for key=%s", key, exc_info=True)


async def cache_delete_pattern(pattern: str) -> None:
    """Delete all keys matching a glob pattern (e.g. 'jobsy:events:*')."""
    try:
        r = await get_redis()
        cursor = 0
        while True:
            cursor, keys = await r.scan(cursor=cursor, match=pattern, count=100)
            if keys:
                await r.delete(*keys)
            if cursor == 0:
                break
    except Exception:
        logger.warning("Redis cache_delete_pattern failed for pattern=%s", pattern, exc_info=True)


async def cache_get_json(key: str) -> Optional[dict]:
    """Get a JSON-deserialized dict from Redis. Returns None on miss or error."""
    raw = await cache_get(key)
    if raw is None:
        return None
    try:
        return json.loads(raw)
    except (json.JSONDecodeError, TypeError):
        logger.warning("Invalid JSON in cache for key=%s", key)
        return None


async def cache_set_json(key: str, data: dict, ttl: int = 300) -> None:
    """Serialize a dict as JSON and store in Redis with TTL."""
    try:
        await cache_set(key, json.dumps(data, default=str), ttl=ttl)
    except (TypeError, ValueError):
        logger.warning("Failed to serialize JSON for cache key=%s", key, exc_info=True)
