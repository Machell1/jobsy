"""SQLAlchemy ORM models for swipes."""

from sqlalchemy import Column, DateTime, String, UniqueConstraint

from shared.database import Base


class Swipe(Base):
    __tablename__ = "swipes"

    id = Column(String, primary_key=True)
    swiper_id = Column(String, nullable=False, index=True)
    target_id = Column(String, nullable=False)
    target_type = Column(String(20), nullable=False)  # 'listing' or 'profile'
    direction = Column(String(5), nullable=False)  # 'left' or 'right'
    created_at = Column(DateTime(timezone=True), nullable=False)

    __table_args__ = (
        UniqueConstraint("swiper_id", "target_id", "target_type", name="uq_swipe_unique"),
    )
