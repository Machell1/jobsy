"""SQLAlchemy ORM models for matches."""

from sqlalchemy import Column, DateTime, String, UniqueConstraint

from shared.database import Base


class Match(Base):
    __tablename__ = "matches"

    id = Column(String, primary_key=True)
    user_a_id = Column(String, nullable=False, index=True)
    user_b_id = Column(String, nullable=False, index=True)
    listing_id = Column(String, nullable=True)
    status = Column(String(20), default="active")
    created_at = Column(DateTime(timezone=True), nullable=False)

    __table_args__ = (
        UniqueConstraint("user_a_id", "user_b_id", "listing_id", name="uq_match_unique"),
    )
