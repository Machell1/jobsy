"""SQLAlchemy ORM models for the events (Pan di Ends) service."""

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB

from shared.database import Base


class Event(Base):
    """A community or commercial event."""

    __tablename__ = "events"

    id = Column(String, primary_key=True)
    organizer_id = Column(String, nullable=False)
    title = Column(String(300), nullable=False)
    description = Column(Text, nullable=True)
    category = Column(String(50), nullable=True)
    cover_image_url = Column(String(500), nullable=True)
    cover_video_url = Column(String(500), nullable=True)
    start_date = Column(DateTime(timezone=True), nullable=False)
    end_date = Column(DateTime(timezone=True), nullable=True)
    location_text = Column(String(500), nullable=True)
    parish = Column(String(50), nullable=True)
    latitude = Column(Numeric, nullable=True)
    longitude = Column(Numeric, nullable=True)
    is_free = Column(Boolean, default=True)
    ticket_price = Column(Numeric(12, 2), nullable=True)
    currency = Column(String(3), default="JMD")
    capacity = Column(Integer, nullable=True)
    age_restriction = Column(String(20), nullable=True)
    is_featured = Column(Boolean, default=False)
    is_promoted = Column(Boolean, default=False)
    status = Column(String(20), default="active")
    rsvp_count = Column(Integer, default=0)
    ticket_sold_count = Column(Integer, default=0)
    view_count = Column(Integer, default=0)
    tags = Column(JSONB, default=[])
    created_at = Column(DateTime(timezone=True), nullable=False)
    updated_at = Column(DateTime(timezone=True), nullable=False)

    __table_args__ = (
        Index("idx_event_organizer", "organizer_id"),
        Index("idx_event_category", "category"),
        Index("idx_event_parish", "parish"),
        Index("idx_event_start_date", "start_date"),
        Index("idx_event_status", "status"),
        Index("idx_event_is_free", "is_free"),
        Index("idx_event_is_featured", "is_featured"),
        {"extend_existing": True},
    )


class EventTicket(Base):
    """A purchased ticket for an event."""

    __tablename__ = "event_tickets"

    id = Column(String, primary_key=True)
    event_id = Column(String, nullable=False)
    user_id = Column(String, nullable=False)
    quantity = Column(Integer, default=1)
    total_amount = Column(Numeric(12, 2), nullable=False)
    currency = Column(String(3), default="JMD")
    stripe_payment_id = Column(String, nullable=True)
    status = Column(String(20), default="confirmed")
    created_at = Column(DateTime(timezone=True), nullable=False)

    __table_args__ = (
        Index("idx_event_ticket_event", "event_id"),
        Index("idx_event_ticket_user", "user_id"),
        {"extend_existing": True},
    )


class EventRSVP(Base):
    """An RSVP (free attendance) for an event."""

    __tablename__ = "event_rsvps"

    id = Column(String, primary_key=True)
    event_id = Column(String, nullable=False)
    user_id = Column(String, nullable=False)
    status = Column(String(20), default="going")
    created_at = Column(DateTime(timezone=True), nullable=False)

    __table_args__ = (
        UniqueConstraint("event_id", "user_id", name="uq_event_rsvp_user"),
        Index("idx_event_rsvp_event", "event_id"),
        Index("idx_event_rsvp_user", "user_id"),
        {"extend_existing": True},
    )


class EventUpdate(Base):
    """An update/announcement posted by the organizer to attendees."""

    __tablename__ = "event_updates"

    id = Column(String, primary_key=True)
    event_id = Column(String, nullable=False)
    author_id = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False)

    __table_args__ = (
        Index("idx_event_update_event", "event_id"),
        Index("idx_event_update_created", "created_at"),
        {"extend_existing": True},
    )
