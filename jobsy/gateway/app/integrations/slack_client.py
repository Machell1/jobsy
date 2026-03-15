"""Slack alerting integration via chat.postMessage API."""

import logging

import httpx

from shared.config import SLACK_BOT_TOKEN, SLACK_DEFAULT_CHANNEL

logger = logging.getLogger(__name__)


async def send_alert(message: str, channel: str | None = None) -> bool:
    """Send an alert message to a Slack channel.

    Returns True if the message was posted successfully.
    """
    if not SLACK_BOT_TOKEN:
        logger.warning("SLACK_BOT_TOKEN not set, Slack alerting disabled")
        return False

    target_channel = channel or SLACK_DEFAULT_CHANNEL
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                "https://slack.com/api/chat.postMessage",
                headers={"Authorization": f"Bearer {SLACK_BOT_TOKEN}"},
                json={
                    "channel": target_channel,
                    "text": message,
                },
                timeout=10,
            )
            data = resp.json()
            if resp.status_code == 200 and data.get("ok"):
                return True
            logger.error(
                "Slack API error: status=%s ok=%s error=%s",
                resp.status_code,
                data.get("ok"),
                data.get("error"),
            )
    except Exception:
        logger.exception("Slack alert failed")
    return False
