"""SQLAlchemy ORM models for listings (embedded in gateway)."""

from sqlalchemy import Column, DateTime, Numeric, String
from sqlalchemy.dialects.postgresql import JSONB

from shared.database import Base


class Listing(Base):
    __tablename__ = "listings"
    __table_args__ = {"extend_existing": True}

    id = Column(String, primary_key=True)
    poster_id = Column(String, nullable=False)
    title = Column(String(200), nullable=False)
    description = Column(String, nullable=False)
    category = Column(String(50), nullable=False)
    subcategory = Column(String(50), nullable=True)
    budget_min = Column(Numeric(10, 2), nullable=True)
    budget_max = Column(Numeric(10, 2), nullable=True)
    currency = Column(String(3), default="JMD")
    latitude = Column(Numeric(10, 7), nullable=True)
    longitude = Column(Numeric(10, 7), nullable=True)
    geohash = Column(String(12), nullable=True)
    parish = Column(String(50), nullable=True)
    address_text = Column(String(255), nullable=True)
    photos = Column(JSONB, default=list)
    status = Column(String(20), default="active")
    expires_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False)
    updated_at = Column(DateTime(timezone=True), nullable=False)
