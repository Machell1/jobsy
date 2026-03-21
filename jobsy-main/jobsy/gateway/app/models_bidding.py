"""SQLAlchemy ORM models for the bidding & contracts system (Phase 4)."""

from sqlalchemy import (
    Boolean,
    Column,
    Date,
    DateTime,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB

from shared.database import Base


class JobPost(Base):
    """A job post created by a hirer for providers to bid on."""

    __tablename__ = "job_posts"

    id = Column(String, primary_key=True)
    hirer_id = Column(String, nullable=False)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=False)
    category = Column(String(100), nullable=False)
    subcategory = Column(String(100), nullable=True)
    required_skills = Column(JSONB, default=[])
    budget_min = Column(Numeric(12, 2), nullable=True)
    budget_max = Column(Numeric(12, 2), nullable=True)
    currency = Column(String(3), default="JMD")
    location_text = Column(String(500), nullable=True)
    parish = Column(String(50), nullable=True)
    latitude = Column(Numeric, nullable=True)
    longitude = Column(Numeric, nullable=True)
    deadline = Column(DateTime(timezone=True), nullable=True)
    bid_deadline = Column(DateTime(timezone=True), nullable=True)
    status = Column(String(30), default="open")
    attachments = Column(JSONB, default=[])
    visibility = Column(String(20), default="public")
    max_bids = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False)
    updated_at = Column(DateTime(timezone=True), nullable=False)

    __table_args__ = (
        Index("idx_jp_hirer", "hirer_id"),
        Index("idx_jp_category", "category"),
        Index("idx_jp_status", "status"),
        Index("idx_jp_parish", "parish"),
        Index("idx_jp_created", "created_at"),
        Index("idx_jp_bid_deadline", "bid_deadline"),
        {"extend_existing": True},
    )


class Bid(Base):
    """A bid submitted by a provider on a job post."""

    __tablename__ = "bids"

    id = Column(String, primary_key=True)
    job_post_id = Column(String, nullable=False)
    provider_id = Column(String, nullable=False)
    amount = Column(Numeric(12, 2), nullable=False)
    currency = Column(String(3), default="JMD")
    proposal = Column(Text, nullable=False)
    estimated_duration_days = Column(Integer, nullable=True)
    available_start_date = Column(Date, nullable=True)
    attachments = Column(JSONB, default=[])
    status = Column(String(30), default="submitted")
    is_winner = Column(Boolean, default=False)
    hirer_note = Column(Text, nullable=True)
    # Milestone & cancellation terms set by provider
    cancellation_fee_percent = Column(Numeric(5, 2), nullable=True)
    deposit_required = Column(Boolean, default=False)
    deposit_percent = Column(Numeric(5, 2), nullable=True)
    milestones = Column(JSONB, default=[])
    created_at = Column(DateTime(timezone=True), nullable=False)
    updated_at = Column(DateTime(timezone=True), nullable=False)

    __table_args__ = (
        UniqueConstraint("job_post_id", "provider_id", name="uq_bid_job_provider"),
        Index("idx_bid_job", "job_post_id"),
        Index("idx_bid_provider", "provider_id"),
        Index("idx_bid_status", "status"),
        Index("idx_bid_winner", "is_winner"),
        {"extend_existing": True},
    )


class Contract(Base):
    """A service contract generated when a bid is accepted."""

    __tablename__ = "contracts"

    id = Column(String, primary_key=True)
    job_post_id = Column(String, nullable=False)
    bid_id = Column(String, nullable=False)
    hirer_id = Column(String, nullable=False)
    provider_id = Column(String, nullable=False)
    title = Column(String(300), nullable=False)
    scope_of_work = Column(Text, nullable=False)
    agreed_amount = Column(Numeric(12, 2), nullable=False)
    currency = Column(String(3), default="JMD")
    start_date = Column(Date, nullable=True)
    estimated_end_date = Column(Date, nullable=True)
    location_text = Column(String(500), nullable=True)
    parish = Column(String(50), nullable=True)
    terms_and_conditions = Column(Text, nullable=False)
    status = Column(String(30), default="pending_signatures")
    # 7-digit unique security number (e.g. "4821937") — watermarked on PDF
    security_number = Column(String(7), nullable=True, unique=True)
    contract_pdf_url = Column(String, nullable=True)
    signed_pdf_url = Column(String, nullable=True)
    # Immutability & cancellation
    is_immutable = Column(Boolean, default=False)
    parent_contract_id = Column(String, nullable=True)  # For addendums
    cancellation_fee_percent = Column(Numeric(5, 2), nullable=True)
    deposit_percent = Column(Numeric(5, 2), nullable=True)
    deposit_required = Column(Boolean, default=False)
    cancelled_at = Column(DateTime(timezone=True), nullable=True)
    cancellation_status = Column(String(30), nullable=True)
    generated_at = Column(DateTime(timezone=True), nullable=False)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False)
    updated_at = Column(DateTime(timezone=True), nullable=False)

    __table_args__ = (
        Index("idx_contract_job", "job_post_id"),
        Index("idx_contract_bid", "bid_id"),
        Index("idx_contract_hirer", "hirer_id"),
        Index("idx_contract_provider", "provider_id"),
        Index("idx_contract_status", "status"),
        {"extend_existing": True},
    )


class ContractMilestone(Base):
    """A payment milestone within a contract."""

    __tablename__ = "contract_milestones"

    id = Column(String, primary_key=True)
    contract_id = Column(String, nullable=False)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    amount = Column(Numeric(12, 2), nullable=False)
    sequence_order = Column(Integer, nullable=False)
    status = Column(String(30), default="pending")  # pending, in_progress, completed, approved, disputed
    due_date = Column(Date, nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    approved_at = Column(DateTime(timezone=True), nullable=True)
    approved_by = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False)
    updated_at = Column(DateTime(timezone=True), nullable=False)

    __table_args__ = (
        Index("idx_cm_contract", "contract_id"),
        Index("idx_cm_status", "status"),
        {"extend_existing": True},
    )


class ContractCancellation(Base):
    """A cancellation request for a contract."""

    __tablename__ = "contract_cancellations"

    id = Column(String, primary_key=True)
    contract_id = Column(String, nullable=False)
    cancelled_by = Column(String, nullable=False)
    cancellation_reason = Column(Text, nullable=False)
    cancellation_fee_percent = Column(Numeric(5, 2), nullable=True)
    cancellation_fee_amount = Column(Numeric(12, 2), nullable=True)
    status = Column(String(30), default="pending_review")  # pending_review, approved, rejected
    reviewed_by = Column(String, nullable=True)
    reviewed_at = Column(DateTime(timezone=True), nullable=True)
    review_notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False)

    __table_args__ = (
        Index("idx_cc_contract", "contract_id"),
        Index("idx_cc_status", "status"),
        {"extend_existing": True},
    )


class ContractAddendum(Base):
    """Links an addendum contract to its primary contract."""

    __tablename__ = "contract_addendums"

    id = Column(String, primary_key=True)
    primary_contract_id = Column(String, nullable=False)
    addendum_contract_id = Column(String, nullable=False)
    reason = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False)

    __table_args__ = (
        Index("idx_ca_primary", "primary_contract_id"),
        UniqueConstraint("addendum_contract_id", name="uq_addendum_contract"),
        {"extend_existing": True},
    )


class ContractSignature(Base):
    """A digital signature on a contract for audit trail."""

    __tablename__ = "contract_signatures"

    id = Column(String, primary_key=True)
    contract_id = Column(String, nullable=False)
    signer_id = Column(String, nullable=False)
    signer_role = Column(String(20), nullable=False)
    signature_data = Column(Text, nullable=False)
    signature_method = Column(String(20), default="digital")
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(String(500), nullable=True)
    signed_at = Column(DateTime(timezone=True), nullable=False)

    __table_args__ = (
        Index("idx_csig_contract", "contract_id"),
        Index("idx_csig_signer", "signer_id"),
        {"extend_existing": True},
    )
