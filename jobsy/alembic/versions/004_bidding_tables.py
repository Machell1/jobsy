"""Phase 4: Bidding & Contracts tables.

Revision ID: 004
Revises: 003
Create Date: 2026-03-13
"""

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

# revision identifiers
revision = "004"
down_revision = "003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── Job Posts ─────────────────────────────────────────────────────────
    op.create_table(
        "job_posts",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("hirer_id", sa.String(), nullable=False),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("category", sa.String(100), nullable=False),
        sa.Column("subcategory", sa.String(100), nullable=True),
        sa.Column("required_skills", postgresql.JSONB(), server_default="[]"),
        sa.Column("budget_min", sa.Numeric(12, 2), nullable=True),
        sa.Column("budget_max", sa.Numeric(12, 2), nullable=True),
        sa.Column("currency", sa.String(3), server_default="JMD"),
        sa.Column("location_text", sa.String(500), nullable=True),
        sa.Column("parish", sa.String(50), nullable=True),
        sa.Column("latitude", sa.Numeric(), nullable=True),
        sa.Column("longitude", sa.Numeric(), nullable=True),
        sa.Column("deadline", sa.DateTime(timezone=True), nullable=True),
        sa.Column("bid_deadline", sa.DateTime(timezone=True), nullable=True),
        sa.Column("status", sa.String(30), server_default="open"),
        sa.Column("attachments", postgresql.JSONB(), server_default="[]"),
        sa.Column("visibility", sa.String(20), server_default="public"),
        sa.Column("max_bids", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_jp_hirer", "job_posts", ["hirer_id"])
    op.create_index("idx_jp_category", "job_posts", ["category"])
    op.create_index("idx_jp_status", "job_posts", ["status"])
    op.create_index("idx_jp_parish", "job_posts", ["parish"])
    op.create_index("idx_jp_created", "job_posts", ["created_at"])
    op.create_index("idx_jp_bid_deadline", "job_posts", ["bid_deadline"])

    # ── Bids ──────────────────────────────────────────────────────────────
    op.create_table(
        "bids",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("job_post_id", sa.String(), nullable=False),
        sa.Column("provider_id", sa.String(), nullable=False),
        sa.Column("amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("currency", sa.String(3), server_default="JMD"),
        sa.Column("proposal", sa.Text(), nullable=False),
        sa.Column("estimated_duration_days", sa.Integer(), nullable=True),
        sa.Column("available_start_date", sa.Date(), nullable=True),
        sa.Column("attachments", postgresql.JSONB(), server_default="[]"),
        sa.Column("status", sa.String(30), server_default="submitted"),
        sa.Column("is_winner", sa.Boolean(), server_default=sa.text("false")),
        sa.Column("hirer_note", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("job_post_id", "provider_id", name="uq_bid_job_provider"),
    )
    op.create_index("idx_bid_job", "bids", ["job_post_id"])
    op.create_index("idx_bid_provider", "bids", ["provider_id"])
    op.create_index("idx_bid_status", "bids", ["status"])
    op.create_index("idx_bid_winner", "bids", ["is_winner"])

    # ── Contracts ─────────────────────────────────────────────────────────
    op.create_table(
        "contracts",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("job_post_id", sa.String(), nullable=False),
        sa.Column("bid_id", sa.String(), nullable=False),
        sa.Column("hirer_id", sa.String(), nullable=False),
        sa.Column("provider_id", sa.String(), nullable=False),
        sa.Column("title", sa.String(300), nullable=False),
        sa.Column("scope_of_work", sa.Text(), nullable=False),
        sa.Column("agreed_amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("currency", sa.String(3), server_default="JMD"),
        sa.Column("start_date", sa.Date(), nullable=True),
        sa.Column("estimated_end_date", sa.Date(), nullable=True),
        sa.Column("location_text", sa.String(500), nullable=True),
        sa.Column("parish", sa.String(50), nullable=True),
        sa.Column("terms_and_conditions", sa.Text(), nullable=False),
        sa.Column("status", sa.String(30), server_default="pending_signatures"),
        sa.Column("contract_pdf_url", sa.String(), nullable=True),
        sa.Column("signed_pdf_url", sa.String(), nullable=True),
        sa.Column("generated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_contract_job", "contracts", ["job_post_id"])
    op.create_index("idx_contract_bid", "contracts", ["bid_id"])
    op.create_index("idx_contract_hirer", "contracts", ["hirer_id"])
    op.create_index("idx_contract_provider", "contracts", ["provider_id"])
    op.create_index("idx_contract_status", "contracts", ["status"])

    # ── Contract Signatures ───────────────────────────────────────────────
    op.create_table(
        "contract_signatures",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("contract_id", sa.String(), nullable=False),
        sa.Column("signer_id", sa.String(), nullable=False),
        sa.Column("signer_role", sa.String(20), nullable=False),
        sa.Column("signature_data", sa.Text(), nullable=False),
        sa.Column("signature_method", sa.String(20), server_default="digital"),
        sa.Column("ip_address", sa.String(45), nullable=True),
        sa.Column("user_agent", sa.String(500), nullable=True),
        sa.Column("signed_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_csig_contract", "contract_signatures", ["contract_id"])
    op.create_index("idx_csig_signer", "contract_signatures", ["signer_id"])


def downgrade() -> None:
    op.drop_table("contract_signatures")
    op.drop_table("contracts")
    op.drop_table("bids")
    op.drop_table("job_posts")
