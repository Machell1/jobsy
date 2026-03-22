"""Event publishing and consuming helpers using Redis pub/sub.

Replaces the previous RabbitMQ-based implementation. Uses the existing
Redis connection that is already available across all services.

When Redis is unavailable the helpers log warnings instead of crashing,
allowing services to start and serve healthchecks even without a broker.
"""

import asyncio
import json
import logging
from collections.abc import Callable
from datetime import UTC, datetime
from typing import Any

import redis.asyncio as aioredis

from shared.config import REDIS_URL

logger = logging.getLogger(__name__)

CHANNEL_PREFIX = "jobsy.events."
MAX_RETRIES = 3
RECONNECT_DELAY = 10  # seconds between reconnection attempts

# Module-level connection for reuse across publishes
_redis_client: aioredis.Redis | None = None


async def get_redis() -> aioredis.Redis | None:
    """Get or create a reusable Redis connection for event publishing."""
    global _redis_client
    if not REDIS_URL:
        return None
    if _redis_client is not None:
        try:
            await _redis_client.ping()
            return _redis_client
        except Exception:
            _redis_client = None

    try:
        _redis_client = aioredis.from_url(
            REDIS_URL,
            decode_responses=True,
            socket_connect_timeout=5,
        )
        await _redis_client.ping()
        return _redis_client
    except Exception:
        logger.warning("Redis connection failed for events")
        _redis_client = None
        return None


async def close_connection():
    """Close the shared Redis connection (call on shutdown)."""
    global _redis_client
    if _redis_client:
        await _redis_client.aclose()
        _redis_client = None


async def publish_event(routing_key: str, data: dict[str, Any]) -> None:
    """Publish a JSON event to a Redis pub/sub channel.

    Silently drops the event if Redis is unreachable so that the
    calling HTTP handler does not fail.
    """
    try:
        client = await get_redis()
        if client is None:
            logger.info("Redis not available, event %s skipped", routing_key)
            return

        message = json.dumps(
            {
                "event_type": routing_key,
                "timestamp": datetime.now(UTC).isoformat(),
                "data": data,
            }
        )
        channel = f"{CHANNEL_PREFIX}{routing_key}"
        await client.publish(channel, message)
        logger.info("Published event %s", routing_key)
    except Exception:
        logger.warning("Redis unavailable, event %s dropped", routing_key)


async def consume_events(queue_name: str, routing_key: str, callback: Callable) -> None:
    """Start consuming events from a Redis pub/sub channel.

    If Redis is unavailable the function retries the connection every
    ``RECONNECT_DELAY`` seconds instead of crashing the service.

    The callback receives the parsed JSON data dict.
    """
    if not REDIS_URL:
        logger.warning("REDIS_URL not configured, consumer %s will not start", queue_name)
        return

    while True:
        try:
            client = aioredis.from_url(
                REDIS_URL,
                decode_responses=True,
                socket_connect_timeout=5,
            )
            pubsub = client.pubsub()

            # Subscribe to the specific channel pattern
            channel = f"{CHANNEL_PREFIX}{routing_key}"
            if "*" in routing_key or "#" in routing_key:
                # Pattern subscription for wildcards
                pattern = channel.replace("#", "*")
                await pubsub.psubscribe(pattern)
                logger.info("Pattern-consuming %s on channel %s", routing_key, pattern)
            else:
                await pubsub.subscribe(channel)
                logger.info("Consuming %s from channel %s", routing_key, channel)

            async for message in pubsub.listen():
                if message["type"] not in ("message", "pmessage"):
                    continue
                try:
                    payload = json.loads(message["data"])
                    await callback(payload)
                except asyncio.CancelledError:
                    raise
                except Exception:
                    logger.exception(
                        "Error processing event from %s in consumer %s",
                        routing_key,
                        queue_name,
                    )

        except asyncio.CancelledError:
            logger.info("Consumer for %s cancelled, shutting down", queue_name)
            return
        except Exception:
            logger.warning(
                "Redis unavailable for consumer %s, retrying in %ds",
                queue_name,
                RECONNECT_DELAY,
            )
            await asyncio.sleep(RECONNECT_DELAY)
