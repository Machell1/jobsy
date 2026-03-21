"""Phase 6: Data integrity constraints, verification badges, disputes,
provider levels, referrals, and optimistic locking.

Revision ID: 006
Revises: 005
Create Date: 2026-03-21
"""

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

# revision identifiers
revision = "006"
down_revision = "005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ══════════════════════════════════════════════════════════════════════
    # ALTER EXISTING TABLES – new columns on users
    # ══════════════════════════════════════════════════════════════════════

    op.add_column("users", sa.Column("email_verified", sa.Boolean(), server_default=sa.text("false")))
    op.add_column("users", sa.Column("email_verification_code", sa.String(6), nullable=True))
    op.add_column("users", sa.Column("email_verification_sent_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("users", sa.Column("is_deleted", sa.Boolean(), server_default=sa.text("false")))
    op.add_column("users", sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("users", sa.Column("consent_accepted_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("users", sa.Column("password_changed_at", sa.DateTime(timezone=True), nullable=True))

    # ══════════════════════════════════════════════════════════════════════
    # OPTIMISTIC LOCKING – version columns
    # ══════════════════════════════════════════════════════════════════════

    op.add_column("profiles", sa.Column("version", sa.Integer(), server_default="1"))
    op.add_column("listings", sa.Column("version", sa.Integer(), server_default="1"))
    op.add_column("contracts", sa.Column("version", sa.Integer(), server_default="1"))

    # ══════════════════════════════════════════════════════════════════════
    # UNIQUE CONSTRAINTS on existing tables (where missing)
    # ══════════════════════════════════════════════════════════════════════

    # event_rsvps: prevent duplicate RSVPs
    op.create_unique_constraint("uq_rsvp_event_user", "event_rsvps", ["event_id", "user_id"])

    # NOTE: bids(job_post_id, provider_id) already has uq_bid_job_provider in 004
    # NOTE: follows(follower_id, following_id) already has unique index uq_follow_pair in 005
    # NOTE: post_likes(user_id, target_type, target_id) already has uq_post_likes_user_target in 005

    # ══════════════════════════════════════════════════════════════════════
    # NEW TABLES
    # ══════════════════════════════════════════════════════════════════════

    # ── login_audit ───────────────────────────────────────────────────────
    op.create_table(
        "login_audit",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("user_id", sa.String(), nullable=False),
        sa.Column("ip_address", sa.String(45), nullable=True),
        sa.Column("user_agent", sa.String(500), nullable=True),
        sa.Column("logged_in_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_login_audit_user_date", "login_audit", ["user_id", "logged_in_at"])

    # ── verification_badges ───────────────────────────────────────────────
    op.create_table(
        "verification_badges",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("user_id", sa.String(), nullable=False),
        sa.Column("badge_type", sa.String(30), nullable=False),
        sa.Column("verified_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("verified_by", sa.String(), nullable=True),
        sa.Column("evidence_url", sa.String(), nullable=True),
        sa.Column("expiry", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "badge_type", name="uq_badge_user_type"),
    )
    op.create_index("idx_badge_user", "verification_badges", ["user_id"])

    # ── disputes ──────────────────────────────────────────────────────────
    op.create_table(
        "disputes",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("contract_id", sa.String(), nullable=False),
        sa.Column("raised_by", sa.String(), nullable=False),
        sa.Column("respondent_id", sa.String(), nullable=False),
        sa.Column("reason", sa.Text(), nullable=False),
        sa.Column("evidence", postgresql.JSONB(), server_default="[]"),
        sa.Column("status", sa.String(30), server_default="open"),
        sa.Column("resolution", sa.Text(), nullable=True),
        sa.Column("resolved_by", sa.String(), nullable=True),
        sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_dispute_contract", "disputes", ["contract_id"])
    op.create_index("idx_dispute_raised_by", "disputes", ["raised_by"])
    op.create_index("idx_dispute_status", "disputes", ["status"])

    # ── provider_levels ───────────────────────────────────────────────────
    op.create_table(
        "provider_levels",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("user_id", sa.String(), nullable=False, unique=True),
        sa.Column("level", sa.Integer(), server_default="1"),
        sa.Column("total_completed_jobs", sa.Integer(), server_default="0"),
        sa.Column("average_rating", sa.Numeric(3, 2), server_default="0"),
        sa.Column("cancellation_rate", sa.Numeric(5, 2), server_default="0"),
        sa.Column("points", sa.Integer(), server_default="0"),
        sa.Column("promoted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_provider_level", "provider_levels", ["level"])

    # ── referral_codes ────────────────────────────────────────────────────
    op.create_table(
        "referral_codes",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("user_id", sa.String(), nullable=False),
        sa.Column("code", sa.String(20), nullable=False, unique=True),
        sa.Column("total_referrals", sa.Integer(), server_default="0"),
        sa.Column("total_rewards_earned", sa.Numeric(12, 2), server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_referral_code_user", "referral_codes", ["user_id"])

    # ── referral_rewards ──────────────────────────────────────────────────
    op.create_table(
        "referral_rewards",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("referral_code_id", sa.String(), nullable=False),
        sa.Column("referred_user_id", sa.String(), nullable=False),
        sa.Column("referrer_reward_amount", sa.Numeric(12, 2), nullable=True),
        sa.Column("referred_reward_amount", sa.Numeric(12, 2), nullable=True),
        sa.Column("status", sa.String(20), server_default="pending"),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_referral_reward_code", "referral_rewards", ["referral_code_id"])
    op.create_index("idx_referral_reward_user", "referral_rewards", ["referred_user_id"])


def downgrade() -> None:
    # ── Drop new tables (reverse order) ───────────────────────────────────
    op.drop_table("referral_rewards")
    op.drop_table("referral_codes")
    op.drop_table("provider_levels")
    op.drop_table("disputes")
    op.drop_table("verification_badges")
    op.drop_table("login_audit")

    # ── Drop unique constraints on existing tables ────────────────────────
    op.drop_constraint("uq_rsvp_event_user", "event_rsvps", type_="unique")

    # ── Drop version columns ─────────────────────────────────────────────
    op.drop_column("contracts", "version")
    op.drop_column("listings", "version")
    op.drop_column("profiles", "version")

    # ── Drop user columns ────────────────────────────────────────────────
    op.drop_column("users", "password_changed_at")
    op.drop_column("users", "consent_accepted_at")
    op.drop_column("users", "deleted_at")
    op.drop_column("users", "is_deleted")
    op.drop_column("users", "email_verification_sent_at")
    op.drop_column("users", "email_verification_code")
    op.drop_column("users", "email_verified")
