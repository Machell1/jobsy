"""SQLAlchemy ORM models for Anti-Money Laundering and fraud detection."""

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Index,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import JSONB

from shared.database import Base


class SuspiciousActivity(Base):
    """A flagged suspicious transaction or behaviour pattern."""

    __tablename__ = "suspicious_activities"

    id = Column(String, primary_key=True)
    user_id = Column(String, nullable=False)
    activity_type = Column(String(50), nullable=False)  # rapid_transactions, unusual_amount, pattern_mismatch, multiple_cancellations, identity_mismatch
    description = Column(Text, nullable=False)
    severity = Column(String(20), default="medium")  # low, medium, high, critical
    related_transaction_id = Column(String, nullable=True)
    related_contract_id = Column(String, nullable=True)
    status = Column(String(20), default="flagged")  # flagged, under_review, cleared, escalated, referred_jcf
    reviewed_by = Column(String, nullable=True)
    reviewed_at = Column(DateTime(timezone=True), nullable=True)
    jcf_reference_number = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False)

    __table_args__ = (
        Index("idx_sa_user", "user_id"),
        Index("idx_sa_status", "status"),
        Index("idx_sa_severity", "severity"),
        Index("idx_sa_type", "activity_type"),
        {"extend_existing": True},
    )


class AccountFreeze(Base):
    """An account freeze imposed for AML, fraud, or policy violations."""

    __tablename__ = "account_freezes"

    id = Column(String, primary_key=True)
    user_id = Column(String, nullable=False)
    reason = Column(Text, nullable=False)
    freeze_type = Column(String(30), nullable=False)  # aml_review, fraud, malicious_cancellation, criminal_referral
    related_activity_id = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    frozen_at = Column(DateTime(timezone=True), nullable=False)
    unfrozen_at = Column(DateTime(timezone=True), nullable=True)
    unfrozen_by = Column(String, nullable=True)

    __table_args__ = (
        Index("idx_af_user", "user_id"),
        Index("idx_af_active", "is_active"),
        {"extend_existing": True},
    )


class JCFReferral(Base):
    """A referral to the Jamaica Constabulary Force for criminal conduct."""

    __tablename__ = "jcf_referrals"

    id = Column(String, primary_key=True)
    user_id = Column(String, nullable=False)
    related_activity_id = Column(String, nullable=True)
    related_contract_id = Column(String, nullable=True)
    offence_type = Column(String(100), nullable=False)  # fraud, breach_of_contract, identity_theft, money_laundering, theft, assault, property_damage
    description = Column(Text, nullable=False)
    evidence_urls = Column(JSONB, default=[])
    status = Column(String(20), default="pending")  # pending, submitted, acknowledged
    reference_number = Column(String, nullable=True)  # JCF case reference
    created_at = Column(DateTime(timezone=True), nullable=False)
    submitted_at = Column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        Index("idx_jcf_user", "user_id"),
        Index("idx_jcf_status", "status"),
        {"extend_existing": True},
    )
