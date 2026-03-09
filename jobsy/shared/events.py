"""RabbitMQ event publishing and consuming helpers using aio-pika."""

import asyncio
import json
import logging
from datetime import datetime, timezone
from typing import Any, Callable

import aio_pika

from shared.config import RABBITMQ_URL

logger = logging.getLogger(__name__)

EXCHANGE_NAME = "jobsy.events"
DLX_NAME = "jobsy.events.dlx"
MAX_RETRIES = 3

# Module-level connection for reuse across publishes
_publish_connection: aio_pika.abc.AbstractRobustConnection | None = None


async def get_connection():
    """Get or create a reusable RabbitMQ connection for publishing."""
    global _publish_connection
    if _publish_connection is None or _publish_connection.is_closed:
        _publish_connection = await aio_pika.connect_robust(RABBITMQ_URL)
    return _publish_connection


async def close_connection():
    """Close the shared publish connection (call on shutdown)."""
    global _publish_connection
    if _publish_connection and not _publish_connection.is_closed:
        await _publish_connection.close()
        _publish_connection = None


async def publish_event(routing_key: str, data: dict[str, Any]) -> None:
    """Publish a JSON event to the jobsy.events exchange."""
    connection = await get_connection()
    channel = await connection.channel()
    exchange = await channel.declare_exchange(EXCHANGE_NAME, aio_pika.ExchangeType.TOPIC, durable=True)
    message = aio_pika.Message(
        body=json.dumps({
            "event_type": routing_key,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "data": data,
        }).encode(),
        content_type="application/json",
        delivery_mode=aio_pika.DeliveryMode.PERSISTENT,
    )
    await exchange.publish(message, routing_key=routing_key)
    logger.info("Published event %s", routing_key)


async def consume_events(queue_name: str, routing_key: str, callback: Callable) -> None:
    """Start consuming events from a queue bound to the given routing key.

    Messages that fail after MAX_RETRIES are routed to a dead-letter queue.
    The callback receives the parsed JSON data dict.
    """
    connection = await aio_pika.connect_robust(RABBITMQ_URL)
    channel = await connection.channel()
    await channel.set_qos(prefetch_count=10)

    exchange = await channel.declare_exchange(EXCHANGE_NAME, aio_pika.ExchangeType.TOPIC, durable=True)

    # Dead-letter exchange and queue for failed messages
    dlx = await channel.declare_exchange(DLX_NAME, aio_pika.ExchangeType.TOPIC, durable=True)
    dlq = await channel.declare_queue(f"{queue_name}.dlq", durable=True)
    await dlq.bind(dlx, routing_key="#")

    queue = await channel.declare_queue(
        queue_name,
        durable=True,
        arguments={
            "x-dead-letter-exchange": DLX_NAME,
        },
    )
    await queue.bind(exchange, routing_key=routing_key)

    logger.info("Consuming %s from queue %s", routing_key, queue_name)

    async with queue.iterator() as queue_iter:
        async for message in queue_iter:
            try:
                payload = json.loads(message.body.decode())
                await callback(payload)
                await message.ack()
            except asyncio.CancelledError:
                await message.nack(requeue=True)
                raise
            except Exception:
                retry_count = (message.headers or {}).get("x-retry-count", 0)
                if retry_count < MAX_RETRIES:
                    logger.warning(
                        "Retrying event from %s (attempt %d/%d)",
                        routing_key, retry_count + 1, MAX_RETRIES,
                    )
                    await message.nack(requeue=True)
                else:
                    logger.exception(
                        "Event from %s failed after %d retries, sending to DLQ",
                        routing_key, MAX_RETRIES,
                    )
                    await message.reject(requeue=False)
