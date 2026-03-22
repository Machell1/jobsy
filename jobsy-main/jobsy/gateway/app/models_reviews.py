"""SQLAlchemy ORM models for the reviews service (embedded in gateway)."""

from sqlalchemy import Boolean, Column, DateTime, Index, Integer, Numeric, String, Text

from shared.database import Base


class Review(Base):
    """A review left by one user about another after a completed service."""

    __tablename__ = "reviews"

    id = Column(String, primary_key=True)
    reviewer_id = Column(String, nullable=False)
    reviewee_id = Column(String, nullable=False)
    listing_id = Column(String, nullable=True)
    transaction_id = Column(String, nullable=True)

    rating = Column(Integer, nullable=False)  # 1-5 stars
    title = Column(String(200), nullable=True)
    body = Column(Text, nullable=True)

    # Structured ratings
    quality_rating = Column(Integer, nullable=True)  # 1-5
    punctuality_rating = Column(Integer, nullable=True)  # 1-5
    communication_rating = Column(Integer, nullable=True)  # 1-5
    value_rating = Column(Integer, nullable=True)  # 1-5

    booking_id = Column(String, nullable=True)
    is_verified = Column(Boolean, default=False)
    is_verified_purchase = Column(Boolean, default=False)
    is_flagged = Column(Boolean, default=False)
    is_visible = Column(Boolean, default=True)
    moderation_status = Column(String(20), default="approved")
    moderation_note = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), nullable=False)
    updated_at = Column(DateTime(timezone=True), nullable=False)

    __table_args__ = (
        Index("idx_review_reviewee", "reviewee_id", "created_at"),
        Index("idx_review_reviewer", "reviewer_id"),
        Index("idx_review_listing", "listing_id"),
        {"extend_existing": True},
    )


class ReviewResponse(Base):
    """A response from the reviewee to a review."""

    __tablename__ = "review_responses"
    __table_args__ = {"extend_existing": True}

    id = Column(String, primary_key=True)
    review_id = Column(String, unique=True, nullable=False)
    responder_id = Column(String, nullable=False)
    body = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False)


class UserRating(Base):
    """Aggregated rating summary for a user."""

    __tablename__ = "user_ratings"
    __table_args__ = {"extend_existing": True}

    user_id = Column(String, primary_key=True)
    total_reviews = Column(Integer, default=0)
    average_rating = Column(Numeric(3, 2), default=0)
    average_quality = Column(Numeric(3, 2), nullable=True)
    average_punctuality = Column(Numeric(3, 2), nullable=True)
    average_communication = Column(Numeric(3, 2), nullable=True)
    average_value = Column(Numeric(3, 2), nullable=True)
    updated_at = Column(DateTime(timezone=True), nullable=False)


class ReputationMetrics(Base):
    """Extended reputation metrics for a user."""

    __tablename__ = "reputation_metrics"
    __table_args__ = {"extend_existing": True}

    user_id = Column(String, primary_key=True)
    total_jobs_completed = Column(Integer, default=0)
    repeat_client_rate = Column(Numeric(5, 2), default=0)
    response_rate = Column(Numeric(5, 2), default=0)
    on_time_rate = Column(Numeric(5, 2), default=0)
    cancellation_rate = Column(Numeric(5, 2), default=0)
    badge_level = Column(String(20), default="none")
    trust_score = Column(Numeric(5, 2), default=0)
    updated_at = Column(DateTime(timezone=True), nullable=False)
