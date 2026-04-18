"""SQLAlchemy ORM models for the Jobsy AI Assistant.

Powers /api/ai/* endpoints. Three tables:
  - ai_job_sessions: multi-turn job-posting conversations (slot-fill state)
  - ai_usage_log: per-call token accounting + scope-rejection audit trail
  - jmd_price_references: Jamaica market pricing knowledge base (seeded)

All tables are created via alembic migration 007 AND mirrored in
main.py::_apply_migrations so idempotent startup DDL matches the project style.
"""

from sqlalchemy import (
    BigInteger,
    Boolean,
    Column,
    DateTime,
    Index,
    Integer,
    Numeric,
    String,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB

from shared.database import Base


class AiJobSession(Base):
    """A multi-turn AI assistant conversation, optionally tied to a job post."""

    __tablename__ = "ai_job_sessions"

    id = Column(String, primary_key=True)  # uuid4 as string (project convention)
    user_id = Column(String, nullable=False)
    # guided | auto | estimate | contract_qa
    mode = Column(String(20), nullable=False, default="guided")
    # active | abandoned | posted
    status = Column(String(20), nullable=False, default="active")
    # Slot-filled state collected across turns:
    # {title, description, category, subcategory, parish, budget_min, budget_max,
    #  scope_hint, size_hint, quality_preference, deadline, attachments, ...}
    collected_slots = Column(JSONB, nullable=False, default=dict)
    # Cached cost_projector.project() output so the CostBreakdownCard can re-render
    # on page reload without re-spending tokens.
    cost_projection = Column(JSONB, nullable=True)
    # Conversation history [{role, content, created_at}] trimmed to last 20
    messages = Column(JSONB, nullable=False, default=list)
    # If this session is Q&A against an existing contract
    contract_id = Column(String, nullable=True)
    # Set when finalize() successfully creates a real JobPost
    created_job_post_id = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False)
    updated_at = Column(DateTime(timezone=True), nullable=False)

    __table_args__ = (
        Index("idx_ai_sessions_user", "user_id"),
        Index("idx_ai_sessions_user_status", "user_id", "status"),
        Index("idx_ai_sessions_created", "created_at"),
        {"extend_existing": True},
    )


class AiUsageLog(Base):
    """Per-call audit log for token tracking, cost estimation, and scope rejection.

    Writing to this table is the single source of truth for /api/ai billing
    and for verifying that the scope guard / budget validator are preventing
    unnecessary token spend.
    """

    __tablename__ = "ai_usage_log"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    user_id = Column(String, nullable=True)
    session_id = Column(String, nullable=True)
    endpoint = Column(String(60), nullable=False)  # e.g. "chat.stream", "validator.llm"
    model = Column(String(100), nullable=True)
    prompt_tokens = Column(Integer, nullable=False, default=0)
    completion_tokens = Column(Integer, nullable=False, default=0)
    total_tokens = Column(Integer, nullable=False, default=0)
    cost_usd_estimate = Column(Numeric(10, 6), nullable=True)
    latency_ms = Column(Integer, nullable=True)
    # Analytics signals: did the pre-flight gates save us from a call?
    cached_search_hit = Column(Boolean, nullable=False, default=False)
    scope_rejected = Column(Boolean, nullable=False, default=False)
    budget_rejected = Column(Boolean, nullable=False, default=False)
    error = Column(String(500), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False)

    __table_args__ = (
        Index("idx_ai_usage_user_created", "user_id", "created_at"),
        Index("idx_ai_usage_created", "created_at"),
        Index("idx_ai_usage_endpoint", "endpoint"),
        {"extend_existing": True},
    )


class JmdPriceReference(Base):
    """Jamaica service pricing knowledge base, seeded from app/ai/data/.

    Powers the budget_validator's zero-LLM pre-flight check. Each row is a
    (category, subcategory, parish_tier) combo with low/mid/high JMD ranges
    anchored to Jamaica minimum wage and typical local material costs.

    Refreshed periodically (manual + Tavily-assisted) to prevent drift.
    """

    __tablename__ = "jmd_price_references"

    id = Column(String, primary_key=True)  # uuid4
    category = Column(String(100), nullable=False)
    subcategory = Column(String(100), nullable=True)
    # kingston | montego_bay | rural | island
    parish_tier = Column(String(20), nullable=False, default="island")
    # per_job | per_hour | per_sqft | per_room | per_day
    unit = Column(String(20), nullable=False, default="per_job")
    low_jmd = Column(Numeric(12, 2), nullable=False)
    mid_jmd = Column(Numeric(12, 2), nullable=False)
    high_jmd = Column(Numeric(12, 2), nullable=False)
    typical_duration_days = Column(Integer, nullable=True)
    # [{title, url, snippet}] - provenance for auditability
    sources = Column(JSONB, nullable=False, default=list)
    # seed | search_verified | manual
    confidence = Column(String(20), nullable=False, default="seed")
    notes = Column(String(500), nullable=True)
    last_verified_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False)
    updated_at = Column(DateTime(timezone=True), nullable=False)

    __table_args__ = (
        UniqueConstraint(
            "category",
            "subcategory",
            "parish_tier",
            name="uq_jmd_price_cat_sub_tier",
        ),
        Index("idx_jmd_price_category", "category"),
        Index("idx_jmd_price_tier", "parish_tier"),
        {"extend_existing": True},
    )
