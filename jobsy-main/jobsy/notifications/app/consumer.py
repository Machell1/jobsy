"""Event consumers that trigger push notifications for matches, messages, and expirations."""

import asyncio
import logging
import uuid
from datetime import UTC, datetime

from sqlalchemy import Column, String, select

from shared.database import Base, async_session_factory
from shared.events import consume_events

from .models import DeviceToken, NotificationLog
from .push import send_push_to_user

logger = logging.getLogger(__name__)


class _Conversation(Base):
    """Minimal mirror of the chat service's Conversation model for direct DB lookup."""

    __tablename__ = "conversations"
    __table_args__ = {"extend_existing": True}
    id = Column(String, primary_key=True)
    user_a_id = Column(String, nullable=False)
    user_b_id = Column(String, nullable=False)


async def _get_user_tokens(user_id: str) -> list[tuple[str, str]]:
    """Fetch all active device tokens for a user."""
    async with async_session_factory() as db:
        result = await db.execute(
            select(DeviceToken).where(
                DeviceToken.user_id == user_id,
                DeviceToken.is_active.is_(True),
            )
        )
        tokens = result.scalars().all()
        return [(t.token, t.platform) for t in tokens]


async def _log_notification(
    user_id: str, title: str, body: str, notification_type: str, data: dict | None = None, delivered: bool = False
) -> None:
    """Record a notification in the log."""
    async with async_session_factory() as db:
        log_entry = NotificationLog(
            id=str(uuid.uuid4()),
            user_id=user_id,
            title=title,
            body=body,
            data=data or {},
            notification_type=notification_type,
            delivered=delivered,
            sent_at=datetime.now(UTC),
        )
        db.add(log_entry)
        await db.commit()


async def handle_match_created(payload: dict) -> None:
    """Notify both users when a match is created."""
    data = payload.get("data", {})
    user_a = data.get("user_a_id")
    user_b = data.get("user_b_id")
    match_id = data.get("match_id")

    if not user_a or not user_b:
        return

    title = "New Match!"
    body = "You have a new match on Jobsy. Start chatting now!"
    notif_data = {"type": "match", "match_id": match_id}

    for user_id in [user_a, user_b]:
        tokens = await _get_user_tokens(user_id)
        sent = await send_push_to_user(tokens, title, body, notif_data)
        await _log_notification(user_id, title, body, "match", notif_data, delivered=sent > 0)

    logger.info("Match notifications sent for match %s", match_id)


async def handle_new_message(payload: dict) -> None:
    """Notify the recipient when a new message is received."""
    data = payload.get("data", {})
    sender_id = data.get("sender_id")
    conversation_id = data.get("conversation_id")

    if not sender_id or not conversation_id:
        return

    # Look up conversation participants directly from the shared database
    async with async_session_factory() as db:
        result = await db.execute(select(_Conversation).where(_Conversation.id == conversation_id))
        conversation = result.scalar_one_or_none()

    if conversation is None:
        logger.warning("Conversation %s not found, skipping notification", conversation_id)
        return

    # Determine the recipient: the other participant in the conversation
    recipient_id = conversation.user_b_id if sender_id == conversation.user_a_id else conversation.user_a_id

    title = "New Message"
    body = "You have a new message on Jobsy"
    notif_data = {"type": "message", "conversation_id": conversation_id}

    tokens = await _get_user_tokens(recipient_id)
    sent = await send_push_to_user(tokens, title, body, notif_data)
    await _log_notification(recipient_id, title, body, "message", notif_data, delivered=sent > 0)
    logger.info("Message notification sent to %s for conversation %s", recipient_id, conversation_id)


async def handle_listing_expired(payload: dict) -> None:
    """Notify the listing owner when their listing expires."""
    data = payload.get("data", {})
    poster_id = data.get("poster_id")
    listing_id = data.get("listing_id")
    listing_title = data.get("title", "Your listing")

    if not poster_id:
        return

    title = "Listing Expired"
    body = f'Your listing "{listing_title}" has expired. Renew it to keep receiving matches.'
    notif_data = {"type": "listing_expired", "listing_id": listing_id}

    tokens = await _get_user_tokens(poster_id)
    sent = await send_push_to_user(tokens, title, body, notif_data)
    await _log_notification(poster_id, title, body, "listing_expired", notif_data, delivered=sent > 0)

    logger.info("Expiry notification sent for listing %s", listing_id)


async def handle_booking_created(payload: dict) -> None:
    """Notify the provider when a new booking inquiry is created."""
    data = payload.get("data", {})
    booking_id = data.get("booking_id")
    customer_id = data.get("customer_id")
    provider_id = data.get("provider_id")

    if not provider_id:
        return

    title = "New Booking Request"
    body = "You have a new booking inquiry. Check it now and send a quote."
    notif_data = {"type": "booking_created", "booking_id": booking_id}

    tokens = await _get_user_tokens(provider_id)
    sent = await send_push_to_user(tokens, title, body, notif_data)
    await _log_notification(provider_id, title, body, "booking_created", notif_data, delivered=sent > 0)

    logger.info("Booking created notification sent to provider %s for booking %s", provider_id, booking_id)


async def handle_booking_status_changed(payload: dict) -> None:
    """Notify the relevant party when a booking status changes."""
    data = payload.get("data", {})
    booking_id = data.get("booking_id")
    from_status = data.get("from_status", "")
    to_status = data.get("to_status", "")
    actor_id = data.get("actor_id")
    customer_id = data.get("customer_id")
    provider_id = data.get("provider_id")

    # Map each status to (title, body, who_to_notify: "customer"|"provider"|"other")
    STATUS_MESSAGES: dict[str, tuple[str, str, str]] = {
        "quote_sent": ("Quote Received", "Your provider sent a quote. Review and accept to confirm.", "customer"),
        "quote_accepted": ("Quote Accepted", "Your quote was accepted! Confirm the booking.", "provider"),
        "booking_confirmed": ("Booking Confirmed", "Your booking has been confirmed.", "customer"),
        "in_progress": ("Job Started", "Your service provider has started the job.", "customer"),
        "completed": ("Job Completed", "The job is complete. Please leave a review!", "customer"),
        "cancelled": ("Booking Cancelled", "A booking has been cancelled.", "other"),
    }

    if to_status not in STATUS_MESSAGES:
        return

    msg_title, msg_body, notify_role = STATUS_MESSAGES[to_status]

    if notify_role == "customer":
        recipient_id = customer_id
    elif notify_role == "provider":
        recipient_id = provider_id
    else:
        # Notify the party that did NOT cancel
        recipient_id = provider_id if actor_id == customer_id else customer_id

    if not recipient_id:
        return

    notif_data = {"type": "booking_status", "booking_id": booking_id, "status": to_status}
    tokens = await _get_user_tokens(recipient_id)
    sent = await send_push_to_user(tokens, msg_title, msg_body, notif_data)
    await _log_notification(recipient_id, msg_title, msg_body, "booking_status", notif_data, delivered=sent > 0)

    logger.info(
        "Booking status notification sent to %s: %s → %s (booking %s)",
        recipient_id, from_status, to_status, booking_id,
    )


async def start_consumers() -> None:
    """Start all notification event consumers."""
    logger.info("Starting notification consumers...")
    await asyncio.gather(
        consume_events("notifications.match_created", "match.created", handle_match_created),
        consume_events("notifications.message_new", "message.new", handle_new_message),
        consume_events("notifications.listing_expired", "listing.expired", handle_listing_expired),
        consume_events("notifications.booking_created", "booking.created", handle_booking_created),
        consume_events("notifications.booking_status", "booking.status_changed", handle_booking_status_changed),
    )
