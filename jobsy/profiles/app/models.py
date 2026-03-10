"""SQLAlchemy ORM models for profiles."""

from sqlalchemy import Boolean, Column, DateTime, Integer, Numeric, String
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
    rating_avg = Column(Numeric(3, 2), default=0)
    rating_count = Column(Integer, default=0)
    is_verified = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), nullable=False)
    updated_at = Column(DateTime(timezone=True), nullable=False)


class VerificationRequest(Base):
    __tablename__ = "verification_requests"

    id = Column(String, primary_key=True)
    user_id = Column(String, nullable=False, index=True)
    document_urls = Column(JSONB, default=list)  # list of uploaded document URLs
    status = Column(String(20), default="pending")  # pending, approved, rejected
    reviewer_notes = Column(String, nullable=True)
    submitted_at = Column(DateTime(timezone=True), nullable=False)
    reviewed_at = Column(DateTime(timezone=True), nullable=True)
