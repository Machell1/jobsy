"""SQLAlchemy ORM models for the gateway (users table)."""

from sqlalchemy import Boolean, Column, DateTime, String

from shared.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True)
    phone = Column(String(20), unique=True, nullable=False)
    email = Column(String(255), unique=True, nullable=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(20), default="user")
    is_verified = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), nullable=False)
    updated_at = Column(DateTime(timezone=True), nullable=False)
