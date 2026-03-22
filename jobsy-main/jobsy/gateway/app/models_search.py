"""SQLAlchemy ORM models for saved searches (embedded in gateway)."""

from sqlalchemy import Boolean, Column, DateTime, Integer, String
from sqlalchemy.dialects.postgresql import JSONB

from shared.database import Base


class SavedSearch(Base):
    """A user's saved search configuration."""

    __tablename__ = "saved_searches"
    __table_args__ = {"extend_existing": True}

    id = Column(String, primary_key=True)
    user_id = Column(String, nullable=False, index=True)
    name = Column(String(100), nullable=True)
    query = Column(String(500), nullable=True)
    filters = Column(JSONB, default=dict)
    notification_enabled = Column(Boolean, default=False)
    last_run_at = Column(DateTime(timezone=True), nullable=True)
    result_count = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), nullable=False)
