"""SQLAlchemy ORM models for the payments service (embedded in gateway)."""

from sqlalchemy import Column, DateTime, Index, Numeric, String, Text
from sqlalchemy.dialects.postgresql import JSONB

from shared.database import Base


class PaymentAccount(Base):
    __tablename__ = "payment_accounts"
    __table_args__ = {"extend_existing": True}

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
    __tablename__ = "transactions"
    __table_args__ = (
        Index("idx_txn_payer", "payer_id", "created_at"),
        Index("idx_txn_payee", "payee_id", "created_at"),
        Index("idx_txn_status", "status"),
        {"extend_existing": True},
    )

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

    stripe_payment_intent_id = Column(String(100), nullable=True)
    stripe_transfer_id = Column(String(100), nullable=True)

    status = Column(String(20), default="pending")
    description = Column(String(500), nullable=True)
    extra_metadata = Column("metadata", JSONB, default=dict)

    created_at = Column(DateTime(timezone=True), nullable=False)
    updated_at = Column(DateTime(timezone=True), nullable=False)


class Payout(Base):
    __tablename__ = "payouts"
    __table_args__ = {"extend_existing": True}

    id = Column(String, primary_key=True)
    user_id = Column(String, nullable=False, index=True)
    amount = Column(Numeric(12, 2), nullable=False)
    currency = Column(String(3), default="JMD")
    stripe_payout_id = Column(String(100), nullable=True)
    status = Column(String(20), default="pending")
    requested_at = Column(DateTime(timezone=True), nullable=False)
    completed_at = Column(DateTime(timezone=True), nullable=True)


class Refund(Base):
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
