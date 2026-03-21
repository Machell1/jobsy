"""SQLAlchemy ORM models for the gateway (users, password_reset_otps)."""

from sqlalchemy import Boolean, Column, DateTime, Integer, String
from sqlalchemy.dialects.postgresql import JSONB

from shared.database import Base

VALID_ROLES = {"user", "provider", "hirer", "advertiser", "admin"}


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True)
    phone = Column(String(20), unique=True, nullable=True)
    email = Column(String(255), unique=True, nullable=True)
    password_hash = Column(String(255), nullable=True)
    role = Column(String(20), default="user")
    roles = Column(JSONB, default=list)  # ["user", "provider", "hirer", "advertiser"]
    active_role = Column(String(20), default="user")  # currently selected role
    is_verified = Column(Boolean, default=False)
    oauth_provider = Column(String(20), nullable=True)
    oauth_id = Column(String(255), nullable=True)
    # Organization / school account fields (migration 005)
    account_type = Column(String(20), default="individual")
    org_name = Column(String(200), nullable=True)
    org_registration_number = Column(String(100), nullable=True)
    org_type = Column(String(50), nullable=True)
    org_representative_name = Column(String(200), nullable=True)
    org_representative_title = Column(String(100), nullable=True)
    # Email verification (migration 006)
    email_verified = Column(Boolean, default=False)
    email_verification_code = Column(String(6), nullable=True)
    email_verification_sent_at = Column(DateTime(timezone=True), nullable=True)
    # GDPR / Data Protection (migration 006)
    is_deleted = Column(Boolean, default=False)
    deleted_at = Column(DateTime(timezone=True), nullable=True)
    consent_accepted_at = Column(DateTime(timezone=True), nullable=True)
    password_changed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False)
    updated_at = Column(DateTime(timezone=True), nullable=False)


class LoginAudit(Base):
    __tablename__ = "login_audit"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String, nullable=False, index=True)
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(String(500), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False)


class PasswordResetOTP(Base):
    __tablename__ = "password_reset_otps"

    id = Column(Integer, primary_key=True, autoincrement=True)
    phone = Column(String(20), nullable=False)
    otp_hash = Column(String(255), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    used = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True))
