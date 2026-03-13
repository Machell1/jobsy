"""SQLAlchemy ORM models for Analytics & Event Tracking (embedded in gateway)."""

from sqlalchemy import Column, Date, DateTime, Index, Integer, Numeric, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB

from shared.database import Base


class AnalyticsEvent(Base):
    """A tracked analytics event."""

    __tablename__ = "analytics_events"

    id = Column(String, primary_key=True)
    user_id = Column(String, nullable=True)
    event_type = Column(String(50), nullable=False)
    entity_type = Column(String(30), nullable=True)
    entity_id = Column(String, nullable=True)
    properties = Column(JSONB, default=dict)
    session_id = Column(String, nullable=True)
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False)

    __table_args__ = (
        Index("idx_analytics_user", "user_id"),
        Index("idx_analytics_type", "event_type"),
        Index("idx_analytics_entity", "entity_type", "entity_id"),
        Index("idx_analytics_created", "created_at"),
        {"extend_existing": True},
    )


class DashboardSnapshot(Base):
    """Daily snapshot of user dashboard metrics."""

    __tablename__ = "dashboard_snapshots"

    id = Column(String, primary_key=True)
    user_id = Column(String, nullable=False)
    snapshot_date = Column(Date, nullable=False)
    profile_views = Column(Integer, default=0)
    listing_views = Column(Integer, default=0)
    search_appearances = Column(Integer, default=0)
    bookings_received = Column(Integer, default=0)
    messages_received = Column(Integer, default=0)
    total_revenue = Column(Numeric(12, 2), default=0)
    created_at = Column(DateTime(timezone=True), nullable=False)

    __table_args__ = (
        UniqueConstraint("user_id", "snapshot_date"),
        Index("idx_snapshot_user", "user_id"),
        Index("idx_snapshot_date", "snapshot_date"),
        {"extend_existing": True},
    )
