"""RabbitMQ event publishing and consuming helpers using aio-pika."""

import json
import logging
from datetime import datetime, timezone
from typing import Any, Callable

import aio_pika

from shared.config import RABBITMQ_URL

logger = logging.getLogger(__name__)

EXCHANGE_NAME = "jobsy.events"


async def get_connection():
    """Create a new RabbitMQ connection."""
    return await aio_pika.connect_robust(RABBITMQ_URL)


async def publish_event(routing_key: str, data: dict[str, Any]) -> None:
    """Publish a JSON event to the jobsy.events exchange."""
    connection = await get_connection()
    async with connection:
        channel = await connection.channel()
        exchange = await channel.declare_exchange(EXCHANGE_NAME, aio_pika.ExchangeType.TOPIC, durable=True)
        message = aio_pika.Message(
            body=json.dumps({
                "event_type": routing_key,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "data": data,
            }).encode(),
            content_type="application/json",
        )
        await exchange.publish(message, routing_key=routing_key)
        logger.info("Published event %s", routing_key)


async def consume_events(queue_name: str, routing_key: str, callback: Callable) -> None:
    """Start consuming events from a queue bound to the given routing key.

    The callback receives the parsed JSON data dict.
    """
    connection = await get_connection()
    channel = await connection.channel()
    exchange = await channel.declare_exchange(EXCHANGE_NAME, aio_pika.ExchangeType.TOPIC, durable=True)
    queue = await channel.declare_queue(queue_name, durable=True)
    await queue.bind(exchange, routing_key=routing_key)

    logger.info("Consuming %s from queue %s", routing_key, queue_name)

    async with queue.iterator() as queue_iter:
        async for message in queue_iter:
            async with message.process():
                try:
                    payload = json.loads(message.body.decode())
                    await callback(payload)
                except Exception:
                    logger.exception("Error processing event from %s", routing_key)
