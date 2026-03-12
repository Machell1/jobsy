"""SQLAlchemy ORM models for profiles."""

from sqlalchemy import Boolean, Column, DateTime, Index, Integer, Numeric, String
from sqlalchemy.dialects.postgresql import JSONB

from shared.database import Base


class Profile(Base):
    __tablename__ = "profiles"

    id = Column(String, primary_key=True)
    user_id = Column(String, unique=True, nullable=False)
    display_name = Column(String(100), nullable=False)
    bio = Column(String, nullable=True)
    avatar_url = Column(String(500), nullable=True)
    photos = Column(JSONB, default=list)
    parish = Column(String(50), nullable=True)
    latitude = Column(Numeric(10, 7), nullable=True)
    longitude = Column(Numeric(10, 7), nullable=True)
    geohash = Column(String(12), nullable=True)
    service_category = Column(String(50), nullable=True)
    skills = Column(JSONB, default=list)
    hourly_rate = Column(Numeric(10, 2), nullable=True)
    is_provider = Column(Boolean, default=False)
    is_hirer = Column(Boolean, default=False)
    is_advertiser = Column(Boolean, default=False)
    rating_avg = Column(Numeric(3, 2), default=0)
    rating_count = Column(Integer, default=0)
    is_verified = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True, server_default="true")

    # Social media links
    instagram_url = Column(String(500), nullable=True)
    twitter_url = Column(String(500), nullable=True)
    tiktok_url = Column(String(500), nullable=True)
    youtube_url = Column(String(500), nullable=True)
    linkedin_url = Column(String(500), nullable=True)
    portfolio_url = Column(String(500), nullable=True)

    # Follower counts (denormalized for display)
    follower_count = Column(Integer, default=0)
    following_count = Column(Integer, default=0)

    created_at = Column(DateTime(timezone=True), nullable=False)
    updated_at = Column(DateTime(timezone=True), nullable=False)


class VerificationRequest(Base):
    __tablename__ = "verification_requests"

    id = Column(String, primary_key=True)
    user_id = Column(String, nullable=False, index=True)
    document_urls = Column(JSONB, default=list)
    status = Column(String(20), default="pending")  # pending, approved, rejected
    reviewer_notes = Column(String, nullable=True)
    submitted_at = Column(DateTime(timezone=True), nullable=False)
    reviewed_at = Column(DateTime(timezone=True), nullable=True)


class Follow(Base):
    """Tracks followers between users on the platform."""

    __tablename__ = "follows"

    id = Column(String, primary_key=True)
    follower_id = Column(String, nullable=False)
    following_id = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False)

    __table_args__ = (
        Index("idx_follow_follower", "follower_id"),
        Index("idx_follow_following", "following_id"),
        Index("uq_follow_pair", "follower_id", "following_id", unique=True),
    )


class UserTag(Base):
    """Tracks user tags in posts/listings."""

    __tablename__ = "user_tags"

    id = Column(String, primary_key=True)
    tagger_id = Column(String, nullable=False)  # who tagged
    tagged_user_id = Column(String, nullable=False)  # who was tagged
    entity_type = Column(String(20), nullable=False)  # 'listing', 'review', 'post'
    entity_id = Column(String, nullable=False)  # ID of the listing/review/post
    created_at = Column(DateTime(timezone=True), nullable=False)

    __table_args__ = (
        Index("idx_tag_tagged_user", "tagged_user_id"),
        Index("idx_tag_entity", "entity_type", "entity_id"),
        Index("uq_user_tag", "tagger_id", "tagged_user_id", "entity_type", "entity_id", unique=True),
    )
