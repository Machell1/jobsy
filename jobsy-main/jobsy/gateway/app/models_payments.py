"""SQLAlchemy ORM models for the payments service (embedded in gateway).

Inlined from payments/app/models.py to avoid cross-service import
dependency in the gateway Docker container.
"""

from sqlalchemy import Boolean, Column, DateTime, Index, Integer, Numeric, String, Text
from sqlalchemy.dialects.postgresql import JSONB

from shared.database import Base


class PaymentAccount(Base):
    """A user's payment account linking to Stripe Connect."""

    __tablename__ = "payment_accounts"

    id = Column(String, primary_key=True)
    user_id = Column(String, unique=True, nullable=False)
    stripe_account_id = Column(String(100), nullable=True)
    stripe_customer_id = Column(String(100), nullable=True)
    default_currency = Column(String(3), default="JMD")
    payout_method = Column(String(30), nullable=True)
    status = Column(String(20), default="pending")
    created_at = Column(DateTime(timezone=True), nullable=False)
    updated_at = Column(DateTime(timezone=True), nullable=False)


class Transaction(Base):
    """A payment transaction between two users for a service."""

    __tablename__ = "transactions"

    id = Column(String, primary_key=True)
    payer_id = Column(String, nullable=False)
    payee_id = Column(String, nullable=False)
    listing_id = Column(String, nullable=True)
    match_id = Column(String, nullable=True)
    booking_id = Column(String, nullable=True)

    amount = Column(Numeric(12, 2), nullable=False)
    currency = Column(String(3), default="JMD")
    platform_fee = Column(Numeric(12, 2), default=0)
    net_amount = Column(Numeric(12, 2), nullable=False)
    provider_payout = Column(Numeric(12, 2), nullable=True)

    contract_id = Column(String, nullable=True)

    stripe_payment_intent_id = Column(String(100), nullable=True)
    stripe_transfer_id = Column(String(100), nullable=True)

    escrow_status = Column(String(20), nullable=True)  # held, released, paid_out, refunded
    escrow_payment_intent_id = Column(String(100), nullable=True)

    status = Column(String(20), default="pending")
    description = Column(String(500), nullable=True)
    extra_metadata = Column("metadata", JSONB, default=dict)

    created_at = Column(DateTime(timezone=True), nullable=False)
    updated_at = Column(DateTime(timezone=True), nullable=False)

    __table_args__ = (
        Index("idx_txn_payer", "payer_id", "created_at"),
        Index("idx_txn_payee", "payee_id", "created_at"),
        Index("idx_txn_status", "status"),
    )


class Payout(Base):
    """A payout to a service provider's bank/mobile money account."""

    __tablename__ = "payouts"

    id = Column(String, primary_key=True)
    user_id = Column(String, nullable=False, index=True)
    amount = Column(Numeric(12, 2), nullable=False)
    currency = Column(String(3), default="JMD")
    stripe_payout_id = Column(String(100), nullable=True)
    status = Column(String(20), default="pending")
    requested_at = Column(DateTime(timezone=True), nullable=False)
    completed_at = Column(DateTime(timezone=True), nullable=True)


class Refund(Base):
    """A refund against a payment transaction."""

    __tablename__ = "refunds"
    __table_args__ = {"extend_existing": True}

    id = Column(String, primary_key=True)
    payment_id = Column(String, nullable=False, index=True)
    booking_id = Column(String, nullable=True, index=True)
    amount = Column(Numeric(12, 2), nullable=False)
    currency = Column(String(3), default="JMD")
    reason = Column(Text, nullable=True)
    status = Column(String(20), default="pending")
    stripe_refund_id = Column(String, nullable=True)
    initiated_by = Column(String, nullable=False)
    processed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False)


class Dispute(Base):
    """A dispute raised on a contract/escrow transaction."""

    __tablename__ = "disputes"
    __table_args__ = (
        Index("idx_dispute_contract", "contract_id"),
        Index("idx_dispute_status", "status"),
        {"extend_existing": True},
    )

    id = Column(String, primary_key=True)
    contract_id = Column(String, nullable=False)
    raiser_id = Column(String, nullable=False)
    respondent_id = Column(String, nullable=False)
    reason = Column(Text, nullable=False)
    evidence = Column(JSONB, default=[])  # list of URLs
    respondent_statement = Column(Text, nullable=True)
    respondent_evidence = Column(JSONB, default=[])
    status = Column(String(20), default="open")  # open, responded, under_review, resolved
    resolution = Column(Text, nullable=True)
    outcome = Column(String(30), nullable=True)  # refund_full, refund_partial, release_to_provider, split
    resolved_by = Column(String, nullable=True)
    escalated = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), nullable=False)
    updated_at = Column(DateTime(timezone=True), nullable=False)
    resolved_at = Column(DateTime(timezone=True), nullable=True)


class VerificationBadge(Base):
    """A verification badge for a user."""

    __tablename__ = "verification_badges"
    __table_args__ = (
        Index("idx_vb_user", "user_id"),
        Index("idx_vb_status", "status"),
        {"extend_existing": True},
    )

    id = Column(String, primary_key=True)
    user_id = Column(String, nullable=False)
    badge_type = Column(String(30), nullable=False)  # phone_verified, email_verified, id_verified, background_checked, business_registered
    evidence_url = Column(String(500), nullable=True)
    status = Column(String(20), default="pending")  # pending, approved, rejected
    notes = Column(Text, nullable=True)
    reviewed_by = Column(String, nullable=True)
    reviewed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False)
    updated_at = Column(DateTime(timezone=True), nullable=False)


__all__ = ["PaymentAccount", "Transaction", "Payout", "Refund", "Dispute", "VerificationBadge"]
