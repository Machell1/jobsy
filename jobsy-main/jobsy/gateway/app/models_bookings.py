"""SQLAlchemy ORM models for the bookings service (embedded in gateway)."""

from sqlalchemy import (
    Column,
    Date,
    DateTime,
    Index,
    Numeric,
    String,
    Text,
    Time,
)
from sqlalchemy.dialects.postgresql import JSONB

from shared.database import Base


class Booking(Base):
    """A booking between a customer and a provider."""

    __tablename__ = "bookings"

    id = Column(String, primary_key=True)
    customer_id = Column(String, nullable=False)
    provider_id = Column(String, nullable=False)
    listing_id = Column(String, nullable=True)
    service_id = Column(String, nullable=True)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    status = Column(String(30), nullable=False, default="inquiry")
    scheduled_date = Column(Date, nullable=True)
    scheduled_time_start = Column(Time, nullable=True)
    scheduled_time_end = Column(Time, nullable=True)
    location_mode = Column(String(20), default="onsite")
    location_text = Column(String(500), nullable=True)
    parish = Column(String(50), nullable=True)
    latitude = Column(Numeric, nullable=True)
    longitude = Column(Numeric, nullable=True)
    total_amount = Column(Numeric(12, 2), nullable=True)
    currency = Column(String(3), default="JMD")
    payment_status = Column(String(20), default="unpaid")
    cancellation_reason = Column(Text, nullable=True)
    cancelled_by = Column(String, nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False)
    updated_at = Column(DateTime(timezone=True), nullable=False)

    __table_args__ = (
        Index("idx_booking_customer", "customer_id"),
        Index("idx_booking_provider", "provider_id"),
        Index("idx_booking_status", "status"),
        Index("idx_booking_created", "created_at"),
        {"extend_existing": True},
    )


class BookingEvent(Base):
    """Audit trail event for a booking."""

    __tablename__ = "booking_events"

    id = Column(String, primary_key=True)
    booking_id = Column(String, nullable=False)
    event_type = Column(String(50), nullable=False)
    from_status = Column(String(30), nullable=True)
    to_status = Column(String(30), nullable=True)
    actor_id = Column(String, nullable=False)
    actor_role = Column(String(20), nullable=False)
    note = Column(Text, nullable=True)
    event_metadata = Column("metadata", JSONB, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False)

    __table_args__ = (
        Index("idx_booking_event_booking", "booking_id"),
        Index("idx_booking_event_created", "created_at"),
        {"extend_existing": True},
    )


class Quote(Base):
    """A price quote from a provider for a booking."""

    __tablename__ = "quotes"

    id = Column(String, primary_key=True)
    booking_id = Column(String, nullable=False)
    provider_id = Column(String, nullable=False)
    amount = Column(Numeric(12, 2), nullable=False)
    currency = Column(String(3), default="JMD")
    description = Column(Text, nullable=True)
    valid_until = Column(DateTime(timezone=True), nullable=True)
    status = Column(String(20), default="pending")
    created_at = Column(DateTime(timezone=True), nullable=False)
    updated_at = Column(DateTime(timezone=True), nullable=False)

    __table_args__ = (
        Index("idx_quote_booking", "booking_id"),
        Index("idx_quote_provider", "provider_id"),
        {"extend_existing": True},
    )
