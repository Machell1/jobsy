"""Notification service API routes for device registration and history."""

import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from pydantic import BaseModel, Field
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from shared.database import get_db

from .models import DeviceToken, NewsletterSubscriber, NotificationLog, NotificationPreference

router = APIRouter(tags=["notifications"])


class SubscribeRequest(BaseModel):
    email: str = Field(..., max_length=255)


@router.post("/subscribe", status_code=status.HTTP_201_CREATED)
async def subscribe_newsletter(data: SubscribeRequest, db: AsyncSession = Depends(get_db)):
    """Subscribe an email to the newsletter (no auth required)."""
    result = await db.execute(select(NewsletterSubscriber).where(NewsletterSubscriber.email == data.email))
    existing = result.scalar_one_or_none()
    if existing:
        if not existing.is_active:
            existing.is_active = True
            await db.flush()
        return {"status": "subscribed", "email": data.email}

    subscriber = NewsletterSubscriber(
        id=str(uuid.uuid4()),
        email=data.email,
        subscribed_at=datetime.now(UTC),
    )
    db.add(subscriber)
    await db.flush()
    return {"status": "subscribed", "email": data.email}


def _get_user_id(request: Request) -> str:
    user_id = request.headers.get("X-User-ID")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing user context")
    return user_id


class DeviceRegister(BaseModel):
    token: str = Field(..., max_length=500)
    platform: str = Field(..., pattern=r"^(ios|android|web)$")


@router.post("/devices", status_code=status.HTTP_201_CREATED)
async def register_device(data: DeviceRegister, request: Request, db: AsyncSession = Depends(get_db)):
    """Register a device token for push notifications."""
    user_id = _get_user_id(request)

    # Check if token already registered
    result = await db.execute(
        select(DeviceToken).where(
            DeviceToken.user_id == user_id,
            DeviceToken.token == data.token,
        )
    )
    existing = result.scalar_one_or_none()
    if existing:
        existing.is_active = True
        existing.platform = data.platform
        await db.flush()
        return {"status": "updated", "device_id": existing.id}

    device = DeviceToken(
        id=str(uuid.uuid4()),
        user_id=user_id,
        token=data.token,
        platform=data.platform,
        created_at=datetime.now(UTC),
    )
    db.add(device)
    await db.flush()
    return {"status": "registered", "device_id": device.id}


@router.delete("/devices/{token}")
async def unregister_device(token: str, request: Request, db: AsyncSession = Depends(get_db)):
    """Unregister a device token."""
    user_id = _get_user_id(request)
    result = await db.execute(
        select(DeviceToken).where(
            DeviceToken.user_id == user_id,
            DeviceToken.token == token,
        )
    )
    device = result.scalar_one_or_none()
    if not device:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Device not found")

    device.is_active = False
    await db.flush()
    return {"status": "unregistered"}


@router.get("/")
async def get_notifications(
    request: Request,
    limit: int = Query(default=20, le=100),
    offset: int = 0,
    unread_only: bool = False,
    db: AsyncSession = Depends(get_db),
):
    """Get notification history for the current user."""
    user_id = _get_user_id(request)
    query = (
        select(NotificationLog)
        .where(NotificationLog.user_id == user_id)
        .order_by(NotificationLog.sent_at.desc())
        .offset(offset)
        .limit(limit)
    )
    if unread_only:
        query = query.where(NotificationLog.is_read.is_(False))

    result = await db.execute(query)
    notifications = result.scalars().all()

    return [
        {
            "id": n.id,
            "title": n.title,
            "body": n.body,
            "type": n.notification_type,
            "data": n.data,
            "is_read": n.is_read,
            "sent_at": n.sent_at.isoformat(),
        }
        for n in notifications
    ]


@router.put("/{notification_id}/read")
async def mark_read(notification_id: str, request: Request, db: AsyncSession = Depends(get_db)):
    """Mark a notification as read."""
    user_id = _get_user_id(request)
    result = await db.execute(
        select(NotificationLog).where(
            NotificationLog.id == notification_id,
            NotificationLog.user_id == user_id,
        )
    )
    notif = result.scalar_one_or_none()
    if not notif:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")

    notif.is_read = True
    await db.flush()
    return {"status": "ok"}


@router.put("/read-all")
async def mark_all_read(request: Request, db: AsyncSession = Depends(get_db)):
    """Mark all notifications as read for the current user."""
    user_id = _get_user_id(request)
    await db.execute(
        update(NotificationLog)
        .where(NotificationLog.user_id == user_id, NotificationLog.is_read.is_(False))
        .values(is_read=True)
    )
    await db.flush()
    return {"status": "ok"}


# --- Notification Preferences ---

PREF_FIELDS = [
    "message_push",
    "message_email",
    "message_in_app",
    "booking_push",
    "booking_email",
    "booking_in_app",
    "payment_push",
    "payment_email",
    "payment_in_app",
    "review_push",
    "review_email",
    "review_in_app",
    "verification_push",
    "verification_email",
    "verification_in_app",
    "content_push",
    "content_email",
    "content_in_app",
    "system_push",
    "system_email",
    "system_in_app",
]


@router.get("/preferences")
async def get_preferences(request: Request, db: AsyncSession = Depends(get_db)):
    """Get notification preferences for the current user."""
    user_id = _get_user_id(request)
    result = await db.execute(select(NotificationPreference).where(NotificationPreference.user_id == user_id))
    pref = result.scalar_one_or_none()

    if not pref:
        return {"user_id": user_id, **{f: True for f in PREF_FIELDS}}

    return {
        "user_id": user_id,
        **{f: getattr(pref, f) for f in PREF_FIELDS},
        "updated_at": pref.updated_at.isoformat(),
    }


class PreferencesUpdate(BaseModel):
    message_push: bool | None = None
    message_email: bool | None = None
    message_in_app: bool | None = None
    booking_push: bool | None = None
    booking_email: bool | None = None
    booking_in_app: bool | None = None
    payment_push: bool | None = None
    payment_email: bool | None = None
    payment_in_app: bool | None = None
    review_push: bool | None = None
    review_email: bool | None = None
    review_in_app: bool | None = None
    verification_push: bool | None = None
    verification_email: bool | None = None
    verification_in_app: bool | None = None
    content_push: bool | None = None
    content_email: bool | None = None
    content_in_app: bool | None = None
    system_push: bool | None = None
    system_email: bool | None = None
    system_in_app: bool | None = None


@router.put("/preferences")
async def update_preferences(
    data: PreferencesUpdate,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Update notification preferences for the current user."""
    user_id = _get_user_id(request)
    now = datetime.now(UTC)

    result = await db.execute(select(NotificationPreference).where(NotificationPreference.user_id == user_id))
    pref = result.scalar_one_or_none()

    if not pref:
        pref = NotificationPreference(
            id=str(uuid.uuid4()),
            user_id=user_id,
            updated_at=now,
        )
        db.add(pref)

    updates = data.model_dump(exclude_none=True)
    for field, value in updates.items():
        setattr(pref, field, value)
    pref.updated_at = now
    await db.flush()

    return {"status": "updated", "user_id": user_id}


# --- Email Notification ---


class EmailNotification(BaseModel):
    user_id: str
    subject: str = Field(..., max_length=200)
    body: str
    notification_type: str = Field(default="system")


@router.post("/email", status_code=status.HTTP_201_CREATED)
async def send_email_notification(
    data: EmailNotification,
    db: AsyncSession = Depends(get_db),
):
    """Send an email notification (internal endpoint)."""
    now = datetime.now(UTC)
    log_entry = NotificationLog(
        id=str(uuid.uuid4()),
        user_id=data.user_id,
        title=data.subject,
        body=data.body,
        notification_type=data.notification_type,
        email_sent=True,
        sent_at=now,
    )
    db.add(log_entry)
    await db.flush()

    return {
        "id": log_entry.id,
        "status": "queued",
        "email_sent": True,
    }
