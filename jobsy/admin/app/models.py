"""SQLAlchemy ORM models for the admin service."""

from sqlalchemy import Boolean, Column, DateTime, Index, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB

from shared.database import Base


class AuditLog(Base):
    """Tracks admin actions for accountability and compliance."""

    __tablename__ = "audit_log"

    id = Column(String, primary_key=True)
    admin_id = Column(String, nullable=False, index=True)
    action = Column(String(100), nullable=False)  # user.suspend, review.remove, listing.delete, etc.
    target_type = Column(String(50), nullable=False)  # user, listing, review, campaign
    target_id = Column(String, nullable=False)
    details = Column(JSONB, default=dict)
    reason = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False)

    __table_args__ = (
        Index("idx_audit_action", "action", "created_at"),
        Index("idx_audit_target", "target_type", "target_id"),
    )


class ModerationQueue(Base):
    """Items flagged for admin review."""

    __tablename__ = "moderation_queue"

    id = Column(String, primary_key=True)
    item_type = Column(String(50), nullable=False)  # review, listing, profile, message
    item_id = Column(String, nullable=False)
    reported_by = Column(String, nullable=True)
    reason = Column(String(200), nullable=True)
    status = Column(String(20), default="pending")  # pending, reviewed, resolved, dismissed
    reviewed_by = Column(String, nullable=True)
    resolution = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False)
    resolved_at = Column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        Index("idx_moderation_status", "status", "created_at"),
    )


class VerificationRequest(Base):
    """Verification requests with full state machine support."""

    __tablename__ = "verification_requests"
    __table_args__ = {"extend_existing": True}

    id = Column(String, primary_key=True)
    user_id = Column(String, nullable=False)
    type = Column(String(30), nullable=False, default="photo")
    document_urls = Column(JSONB, default=list)
    status = Column(String(30), default="draft")
    submitted_at = Column(DateTime(timezone=True), nullable=True)
    reviewed_at = Column(DateTime(timezone=True), nullable=True)
    reviewer_id = Column(String, nullable=True)
    reviewer_notes = Column(Text, nullable=True)
    rejection_reason = Column(Text, nullable=True)
    resubmission_guidance = Column(Text, nullable=True)
    badge_level = Column(String(30), nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False)
    updated_at = Column(DateTime(timezone=True), nullable=False)


class VerificationAsset(Base):
    """Assets attached to verification requests."""

    __tablename__ = "verification_assets"
    __table_args__ = {"extend_existing": True}

    id = Column(String, primary_key=True)
    verification_request_id = Column(String, nullable=False)
    asset_type = Column(String(30), nullable=False)
    file_url = Column(String(500), nullable=False)
    file_key = Column(String(500), nullable=True)
    thumbnail_url = Column(String(500), nullable=True)
    mime_type = Column(String(50), nullable=True)
    file_size_bytes = Column(Integer, nullable=True)
    metadata_ = Column("metadata", JSONB, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False)


class ProviderProfile(Base):
    """Mirror of provider_profiles for cross-service queries."""

    __tablename__ = "provider_profiles"
    __table_args__ = {"extend_existing": True}

    id = Column(String, primary_key=True)
    user_id = Column(String, nullable=False)
    profile_id = Column(String, nullable=False)
    verification_status = Column(String(20), default="unverified")


class Profile(Base):
    """Mirror of profiles Profile for cross-service queries."""

    __tablename__ = "profiles"
    __table_args__ = {"extend_existing": True}

    id = Column(String, primary_key=True)
    user_id = Column(String, nullable=False)
    is_verified = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
