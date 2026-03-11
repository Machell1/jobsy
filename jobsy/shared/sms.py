"""SMS delivery via Twilio."""

import logging

from shared.config import TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER

logger = logging.getLogger(__name__)


def send_sms(to: str, body: str) -> bool:
    """Send an SMS via Twilio. Returns True on success.

    When Twilio credentials are not configured (local development),
    logs the message body instead of sending.
    """
    if not all([TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER]):
        logger.info("SMS (dev mode) to %s: %s", to, body)
        return True

    try:
        from twilio.rest import Client

        client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
        client.messages.create(
            to=to,
            from_=TWILIO_PHONE_NUMBER,
            body=body,
        )
        logger.info("SMS sent to %s", to)
        return True
    except Exception:
        logger.exception("Failed to send SMS to %s", to)
        return False
