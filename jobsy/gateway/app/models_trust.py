"""SQLAlchemy ORM models for Trust & Safety (embedded in gateway)."""

from sqlalchemy import Boolean, Column, DateTime, Index, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB

from shared.database import Base


class Report(Base):
    """A user-submitted report against content or another user."""

    __tablename__ = "reports"

    id = Column(String, primary_key=True)
    reporter_id = Column(String, nullable=False)
    target_type = Column(String(30), nullable=False)
    target_id = Column(String, nullable=False)
    reason = Column(String(50), nullable=False)
    description = Column(Text, nullable=True)
    evidence_urls = Column(JSONB, default=list)
    severity = Column(String(20), default="low")
    status = Column(String(20), default="pending")
    assigned_to = Column(String, nullable=True)
    resolution_note = Column(Text, nullable=True)
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False)
    updated_at = Column(DateTime(timezone=True), nullable=False)

    __table_args__ = (
        Index("idx_report_status", "status"),
        Index("idx_report_target", "target_type", "target_id"),
        Index("idx_report_reporter", "reporter_id"),
        Index("idx_report_severity", "severity"),
        {"extend_existing": True},
    )


class Suspension(Base):
    """A suspension or warning issued to a user."""

    __tablename__ = "suspensions"

    id = Column(String, primary_key=True)
    user_id = Column(String, nullable=False)
    reason = Column(Text, nullable=False)
    suspension_type = Column(String(20), nullable=False)
    starts_at = Column(DateTime(timezone=True), nullable=False)
    ends_at = Column(DateTime(timezone=True), nullable=True)
    issued_by = Column(String, nullable=False)
    report_id = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), nullable=False)

    __table_args__ = (
        Index("idx_suspension_user", "user_id"),
        Index("idx_suspension_active", "is_active"),
        {"extend_existing": True},
    )


class Appeal(Base):
    """An appeal submitted by a suspended user."""

    __tablename__ = "appeals"

    id = Column(String, primary_key=True)
    suspension_id = Column(String, nullable=False)
    user_id = Column(String, nullable=False)
    reason = Column(Text, nullable=False)
    evidence_urls = Column(JSONB, default=list)
    status = Column(String(20), default="pending")
    reviewed_by = Column(String, nullable=True)
    reviewer_notes = Column(Text, nullable=True)
    reviewed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False)

    __table_args__ = (
        Index("idx_appeal_suspension", "suspension_id"),
        Index("idx_appeal_status", "status"),
        {"extend_existing": True},
    )


class BlockedUser(Base):
    """A user-to-user block relationship."""

    __tablename__ = "blocked_users"

    id = Column(String, primary_key=True)
    blocker_id = Column(String, nullable=False)
    blocked_id = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False)

    __table_args__ = (
        UniqueConstraint("blocker_id", "blocked_id"),
        Index("idx_blocked_blocker", "blocker_id"),
        Index("idx_blocked_blocked", "blocked_id"),
        {"extend_existing": True},
    )
