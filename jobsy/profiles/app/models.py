"""SQLAlchemy ORM models for profiles."""

from sqlalchemy import Boolean, Column, DateTime, Index, Integer, Numeric, String, Text, Time, UniqueConstraint
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

    # Phase 3: Public profile & portfolio
    public_url_slug = Column(String(100), nullable=True)
    portfolio_enabled = Column(Boolean, default=False)
    total_profile_views = Column(Integer, default=0)

    created_at = Column(DateTime(timezone=True), nullable=False)
    updated_at = Column(DateTime(timezone=True), nullable=False)

    __table_args__ = ({"extend_existing": True},)


class VerificationRequest(Base):
    __tablename__ = "verification_requests"

    id = Column(String, primary_key=True)
    user_id = Column(String, nullable=False, index=True)
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

    __table_args__ = (
        Index("idx_vr_status", "status"),
        Index("idx_vr_type", "type"),
        Index("idx_vr_submitted_at", "submitted_at"),
        {"extend_existing": True},
    )


class VerificationAsset(Base):
    __tablename__ = "verification_assets"

    id = Column(String, primary_key=True)
    verification_request_id = Column(String, nullable=False, index=True)
    asset_type = Column(String(30), nullable=False)
    file_url = Column(String(500), nullable=False)
    file_key = Column(String(500), nullable=True)
    thumbnail_url = Column(String(500), nullable=True)
    mime_type = Column(String(50), nullable=True)
    file_size_bytes = Column(Integer, nullable=True)
    metadata_ = Column("metadata", JSONB, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False)


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


# --- Provider Onboarding Models ---


class Category(Base):
    __tablename__ = "categories"

    id = Column(String, primary_key=True)
    name = Column(String(100), unique=True, nullable=False)
    slug = Column(String(100), unique=True, nullable=False)
    parent_id = Column(String, nullable=True)
    icon = Column(String(50), nullable=True)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    sort_order = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), nullable=False)

    __table_args__ = (
        Index("idx_category_slug", "slug"),
        Index("idx_category_parent", "parent_id"),
        Index("idx_category_active", "is_active"),
    )


class ProviderProfile(Base):
    __tablename__ = "provider_profiles"

    id = Column(String, primary_key=True)
    user_id = Column(String, unique=True, nullable=False)
    profile_id = Column(String, unique=True, nullable=False)
    headline = Column(String(200), nullable=True)
    profession = Column(String(100), nullable=True)
    years_of_experience = Column(Integer, nullable=True)
    service_radius_km = Column(Integer, default=25)
    pricing_mode = Column(String(20), default="quote")
    hourly_rate_min = Column(Numeric(10, 2), nullable=True)
    hourly_rate_max = Column(Numeric(10, 2), nullable=True)
    currency = Column(String(3), default="JMD")
    response_time_hours = Column(Integer, nullable=True)
    notice_board_enabled = Column(Boolean, default=False)
    is_available = Column(Boolean, default=True)
    verification_status = Column(String(20), default="unverified")
    onboarding_step = Column(Integer, default=0)
    onboarding_completed = Column(Boolean, default=False)
    completion_percentage = Column(Integer, default=0)
    total_bookings = Column(Integer, default=0)
    completed_bookings = Column(Integer, default=0)
    cancellation_count = Column(Integer, default=0)
    avg_rating = Column(Numeric(3, 2), default=0)
    review_count = Column(Integer, default=0)
    profile_views = Column(Integer, default=0)
    profile_clicks = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), nullable=False)
    updated_at = Column(DateTime(timezone=True), nullable=False)

    __table_args__ = (
        Index("idx_pp_user_id", "user_id"),
        Index("idx_pp_profession", "profession"),
        Index("idx_pp_verification", "verification_status"),
        Index("idx_pp_available", "is_available"),
    )


class ProviderService(Base):
    __tablename__ = "provider_services"

    id = Column(String, primary_key=True)
    provider_id = Column(String, nullable=False)
    category_id = Column(String, nullable=False)
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    price_type = Column(String(20), default="quote")
    price_amount = Column(Numeric(10, 2), nullable=True)
    currency = Column(String(3), default="JMD")
    duration_minutes = Column(Integer, nullable=True)
    is_active = Column(Boolean, default=True)
    sort_order = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), nullable=False)
    updated_at = Column(DateTime(timezone=True), nullable=False)

    __table_args__ = (
        Index("idx_ps_provider", "provider_id"),
        Index("idx_ps_category", "category_id"),
        Index("idx_ps_active", "is_active"),
    )


class ServicePackage(Base):
    __tablename__ = "service_packages"

    id = Column(String, primary_key=True)
    service_id = Column(String, nullable=False)
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    price = Column(Numeric(10, 2), nullable=False)
    currency = Column(String(3), default="JMD")
    features = Column(JSONB, default=list)
    duration_minutes = Column(Integer, nullable=True)
    is_active = Column(Boolean, default=True)
    sort_order = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), nullable=False)

    __table_args__ = (
        Index("idx_sp_service", "service_id"),
    )


class AvailabilitySlot(Base):
    __tablename__ = "availability_slots"

    id = Column(String, primary_key=True)
    provider_id = Column(String, nullable=False)
    day_of_week = Column(Integer, nullable=False)
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), nullable=False)

    __table_args__ = (
        Index("idx_as_provider", "provider_id"),
        Index("idx_as_day", "provider_id", "day_of_week"),
        UniqueConstraint("provider_id", "day_of_week", "start_time", name="uq_availability_slot"),
    )


class PortfolioItem(Base):
    __tablename__ = "portfolio_items"

    id = Column(String, primary_key=True)
    provider_id = Column(String, nullable=True)
    user_id = Column(String, nullable=True)
    title = Column(String(200), nullable=True)
    description = Column(Text, nullable=True)
    image_url = Column(String(500), nullable=True)
    thumbnail_url = Column(String(500), nullable=True)
    category = Column(String(100), nullable=True)
    display_order = Column(Integer, default=0)
    is_visible = Column(Boolean, default=True)
    sort_order = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), nullable=False)
    updated_at = Column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        Index("idx_pi_provider", "provider_id"),
        Index("idx_portfolio_user", "user_id"),
        {"extend_existing": True},
    )


class ProfileView(Base):
    """Tracks profile views for analytics."""

    __tablename__ = "profile_views"

    id = Column(String, primary_key=True)
    profile_user_id = Column(String, nullable=False)
    viewer_user_id = Column(String, nullable=True)
    viewer_ip = Column(String(45), nullable=True)
    source = Column(String(50), nullable=True)
    share_link_id = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False)

    __table_args__ = (
        Index("idx_profile_view_user", "profile_user_id"),
        Index("idx_profile_view_date", "created_at"),
        {"extend_existing": True},
    )
