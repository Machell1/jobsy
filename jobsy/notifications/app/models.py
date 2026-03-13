"""SQLAlchemy ORM models for the notification service."""

from sqlalchemy import Boolean, Column, DateTime, Index, String
from sqlalchemy.dialects.postgresql import JSONB

from shared.database import Base


class DeviceToken(Base):
    __tablename__ = "device_tokens"

    id = Column(String, primary_key=True)
    user_id = Column(String, nullable=False, index=True)
    token = Column(String(500), nullable=False)
    platform = Column(String(10), nullable=False)  # 'ios', 'android', 'web'
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), nullable=False)

    __table_args__ = (
        Index("idx_device_user_token", "user_id", "token", unique=True),
    )


class NewsletterSubscriber(Base):
    __tablename__ = "newsletter_subscribers"

    id = Column(String, primary_key=True)
    email = Column(String(255), unique=True, nullable=False)
    subscribed_at = Column(DateTime(timezone=True), nullable=False)
    is_active = Column(Boolean, default=True)


class NotificationLog(Base):
    __tablename__ = "notification_log"

    id = Column(String, primary_key=True)
    user_id = Column(String, nullable=False, index=True)
    title = Column(String(200), nullable=True)
    body = Column(String, nullable=True)
    data = Column(JSONB, default=dict)
    notification_type = Column(String(30), nullable=False)  # match, message, listing_expired
    is_read = Column(Boolean, default=False)
    delivered = Column(Boolean, default=False)
    email_sent = Column(Boolean, default=False)
    push_sent = Column(Boolean, default=False)
    sent_at = Column(DateTime(timezone=True), nullable=False)


class NotificationPreference(Base):
    __tablename__ = "notification_preferences"
    __table_args__ = {"extend_existing": True}

    id = Column(String, primary_key=True)
    user_id = Column(String, unique=True, nullable=False)
    message_push = Column(Boolean, default=True)
    message_email = Column(Boolean, default=False)
    message_in_app = Column(Boolean, default=True)
    booking_push = Column(Boolean, default=True)
    booking_email = Column(Boolean, default=True)
    booking_in_app = Column(Boolean, default=True)
    payment_push = Column(Boolean, default=True)
    payment_email = Column(Boolean, default=True)
    payment_in_app = Column(Boolean, default=True)
    review_push = Column(Boolean, default=True)
    review_email = Column(Boolean, default=False)
    review_in_app = Column(Boolean, default=True)
    verification_push = Column(Boolean, default=True)
    verification_email = Column(Boolean, default=True)
    verification_in_app = Column(Boolean, default=True)
    content_push = Column(Boolean, default=False)
    content_email = Column(Boolean, default=False)
    content_in_app = Column(Boolean, default=True)
    system_push = Column(Boolean, default=True)
    system_email = Column(Boolean, default=True)
    system_in_app = Column(Boolean, default=True)
    updated_at = Column(DateTime(timezone=True), nullable=False)
