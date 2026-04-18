"""Phase 7: AI Assistant tables.

Adds three tables that power /api/ai/* endpoints:
  - ai_job_sessions: multi-turn conversation state for the AI job-post wizard
  - ai_usage_log: per-call token + latency + scope-rejection audit trail
  - jmd_price_references: Jamaica market pricing knowledge base (seeded)

The jmd_price_references seed is loaded from the JSON file shipped in
``jobsy/gateway/app/ai/data/jmd_price_references.json`` (read at migration time).

Revision ID: 007
Revises: 006
Create Date: 2026-04-14
"""

from __future__ import annotations

import json
import logging
import os
import uuid
from datetime import datetime, timezone
from pathlib import Path

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

# revision identifiers
revision = "007"
down_revision = "006"
branch_labels = None
depends_on = None

logger = logging.getLogger("alembic.runtime.migration")


def _resolve_seed_path() -> Path | None:
    """Locate the JMD price reference seed JSON.

    The gateway runs from /app in production (Dockerfile WORKDIR), but during
    local dev it may run from the repo root. Try both locations.
    """
    candidates = [
        Path(__file__).resolve().parents[3] / "gateway" / "app" / "ai" / "data" / "jmd_price_references.json",
        Path("/app/app/ai/data/jmd_price_references.json"),
        Path("/build/gateway/app/ai/data/jmd_price_references.json"),
        Path(os.getcwd()) / "gateway" / "app" / "ai" / "data" / "jmd_price_references.json",
    ]
    for c in candidates:
        if c.exists():
            return c
    return None


def upgrade() -> None:
    # ══════════════════════════════════════════════════════════════════════
    # ai_job_sessions
    # ══════════════════════════════════════════════════════════════════════
    op.create_table(
        "ai_job_sessions",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("user_id", sa.String(), nullable=False),
        sa.Column("mode", sa.String(20), nullable=False, server_default="guided"),
        sa.Column("status", sa.String(20), nullable=False, server_default="active"),
        sa.Column("collected_slots", postgresql.JSONB(), nullable=False, server_default="{}"),
        sa.Column("cost_projection", postgresql.JSONB(), nullable=True),
        sa.Column("messages", postgresql.JSONB(), nullable=False, server_default="[]"),
        sa.Column("contract_id", sa.String(), nullable=True),
        sa.Column("created_job_post_id", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_ai_sessions_user", "ai_job_sessions", ["user_id"])
    op.create_index("idx_ai_sessions_user_status", "ai_job_sessions", ["user_id", "status"])
    op.create_index("idx_ai_sessions_created", "ai_job_sessions", ["created_at"])

    # ══════════════════════════════════════════════════════════════════════
    # ai_usage_log
    # ══════════════════════════════════════════════════════════════════════
    op.create_table(
        "ai_usage_log",
        sa.Column("id", sa.BigInteger(), nullable=False, autoincrement=True),
        sa.Column("user_id", sa.String(), nullable=True),
        sa.Column("session_id", sa.String(), nullable=True),
        sa.Column("endpoint", sa.String(60), nullable=False),
        sa.Column("model", sa.String(100), nullable=True),
        sa.Column("prompt_tokens", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("completion_tokens", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("total_tokens", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("cost_usd_estimate", sa.Numeric(10, 6), nullable=True),
        sa.Column("latency_ms", sa.Integer(), nullable=True),
        sa.Column("cached_search_hit", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("scope_rejected", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("budget_rejected", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("error", sa.String(500), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_ai_usage_user_created", "ai_usage_log", ["user_id", "created_at"])
    op.create_index("idx_ai_usage_created", "ai_usage_log", ["created_at"])
    op.create_index("idx_ai_usage_endpoint", "ai_usage_log", ["endpoint"])

    # ══════════════════════════════════════════════════════════════════════
    # jmd_price_references
    # ══════════════════════════════════════════════════════════════════════
    op.create_table(
        "jmd_price_references",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("category", sa.String(100), nullable=False),
        sa.Column("subcategory", sa.String(100), nullable=True),
        sa.Column("parish_tier", sa.String(20), nullable=False, server_default="island"),
        sa.Column("unit", sa.String(20), nullable=False, server_default="per_job"),
        sa.Column("low_jmd", sa.Numeric(12, 2), nullable=False),
        sa.Column("mid_jmd", sa.Numeric(12, 2), nullable=False),
        sa.Column("high_jmd", sa.Numeric(12, 2), nullable=False),
        sa.Column("typical_duration_days", sa.Integer(), nullable=True),
        sa.Column("sources", postgresql.JSONB(), nullable=False, server_default="[]"),
        sa.Column("confidence", sa.String(20), nullable=False, server_default="seed"),
        sa.Column("notes", sa.String(500), nullable=True),
        sa.Column("last_verified_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "category",
            "subcategory",
            "parish_tier",
            name="uq_jmd_price_cat_sub_tier",
        ),
    )
    op.create_index("idx_jmd_price_category", "jmd_price_references", ["category"])
    op.create_index("idx_jmd_price_tier", "jmd_price_references", ["parish_tier"])

    # ── Seed JMD price references ─────────────────────────────────────────
    seed_path = _resolve_seed_path()
    if seed_path is None:
        logger.warning(
            "AI migration 007: seed file jmd_price_references.json not found - "
            "table will be empty. Run the seed script manually before first /api/ai call."
        )
        return

    try:
        with open(seed_path, "r", encoding="utf-8") as f:
            rows = json.load(f)
    except Exception as exc:
        logger.error("AI migration 007: failed to load seed JSON: %s", exc)
        return

    now = datetime.now(timezone.utc)
    bind = op.get_bind()
    inserted = 0
    for row in rows:
        try:
            bind.execute(
                sa.text(
                    """
                    INSERT INTO jmd_price_references
                      (id, category, subcategory, parish_tier, unit,
                       low_jmd, mid_jmd, high_jmd, typical_duration_days,
                       sources, confidence, notes,
                       created_at, updated_at)
                    VALUES
                      (:id, :category, :subcategory, :parish_tier, :unit,
                       :low_jmd, :mid_jmd, :high_jmd, :typical_duration_days,
                       CAST(:sources AS JSONB), :confidence, :notes,
                       :created_at, :updated_at)
                    ON CONFLICT (category, subcategory, parish_tier) DO NOTHING
                    """
                ),
                {
                    "id": str(uuid.uuid4()),
                    "category": row["category"],
                    "subcategory": row.get("subcategory"),
                    "parish_tier": row.get("parish_tier", "island"),
                    "unit": row.get("unit", "per_job"),
                    "low_jmd": row["low_jmd"],
                    "mid_jmd": row["mid_jmd"],
                    "high_jmd": row["high_jmd"],
                    "typical_duration_days": row.get("typical_duration_days"),
                    "sources": json.dumps(row.get("sources", [])),
                    "confidence": row.get("confidence", "seed"),
                    "notes": row.get("notes"),
                    "created_at": now,
                    "updated_at": now,
                },
            )
            inserted += 1
        except Exception as exc:
            logger.warning("AI migration 007: skipping row %s: %s", row.get("category"), exc)

    logger.info("AI migration 007: seeded %d JMD price reference rows", inserted)


def downgrade() -> None:
    op.drop_index("idx_jmd_price_tier", table_name="jmd_price_references")
    op.drop_index("idx_jmd_price_category", table_name="jmd_price_references")
    op.drop_table("jmd_price_references")

    op.drop_index("idx_ai_usage_endpoint", table_name="ai_usage_log")
    op.drop_index("idx_ai_usage_created", table_name="ai_usage_log")
    op.drop_index("idx_ai_usage_user_created", table_name="ai_usage_log")
    op.drop_table("ai_usage_log")

    op.drop_index("idx_ai_sessions_created", table_name="ai_job_sessions")
    op.drop_index("idx_ai_sessions_user_status", table_name="ai_job_sessions")
    op.drop_index("idx_ai_sessions_user", table_name="ai_job_sessions")
    op.drop_table("ai_job_sessions")
