"""Phase 5: All remaining tables for Jobsy platform.

Revision ID: 005
Revises: 004
Create Date: 2026-03-20
"""

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

# revision identifiers
revision = "005"
down_revision = "004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ══════════════════════════════════════════════════════════════════════
    # ALTER EXISTING TABLES – add new columns
    # ══════════════════════════════════════════════════════════════════════

    # ── users table ───────────────────────────────────────────────────────
    op.add_column("users", sa.Column("account_type", sa.String(20), server_default="individual"))
    op.add_column("users", sa.Column("org_name", sa.String(200), nullable=True))
    op.add_column("users", sa.Column("org_registration_number", sa.String(100), nullable=True))
    op.add_column("users", sa.Column("org_type", sa.String(50), nullable=True))
    op.add_column("users", sa.Column("org_representative_name", sa.String(200), nullable=True))
    op.add_column("users", sa.Column("org_representative_title", sa.String(100), nullable=True))

    # ── job_posts table ──────────────────────────────────────────────────
    op.add_column("job_posts", sa.Column("urgency", sa.String(20), server_default="standard"))
    op.add_column("job_posts", sa.Column("is_boosted", sa.Boolean(), server_default=sa.text("false")))
    op.add_column("job_posts", sa.Column("boost_expires_at", sa.DateTime(timezone=True), nullable=True))

    # ── transactions table ───────────────────────────────────────────────
    op.add_column("transactions", sa.Column("booking_id", sa.String(), nullable=True))
    op.add_column("transactions", sa.Column("provider_payout", sa.Numeric(12, 2), nullable=True))

    # ══════════════════════════════════════════════════════════════════════
    # NEW TABLES FROM ORM MODELS
    # ══════════════════════════════════════════════════════════════════════

    # ── refunds ──────────────────────────────────────────────────────────
    op.create_table(
        "refunds",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("payment_id", sa.String(), nullable=False),
        sa.Column("booking_id", sa.String(), nullable=True),
        sa.Column("amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("currency", sa.String(3), server_default="JMD"),
        sa.Column("reason", sa.Text(), nullable=True),
        sa.Column("status", sa.String(20), server_default="pending"),
        sa.Column("stripe_refund_id", sa.String(), nullable=True),
        sa.Column("initiated_by", sa.String(), nullable=False),
        sa.Column("processed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_refund_payment", "refunds", ["payment_id"])
    op.create_index("idx_refund_booking", "refunds", ["booking_id"])

    # ── bookings ─────────────────────────────────────────────────────────
    op.create_table(
        "bookings",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("customer_id", sa.String(), nullable=False),
        sa.Column("provider_id", sa.String(), nullable=False),
        sa.Column("listing_id", sa.String(), nullable=True),
        sa.Column("service_id", sa.String(), nullable=True),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("status", sa.String(30), nullable=False, server_default="inquiry"),
        sa.Column("scheduled_date", sa.Date(), nullable=True),
        sa.Column("scheduled_time_start", sa.Time(), nullable=True),
        sa.Column("scheduled_time_end", sa.Time(), nullable=True),
        sa.Column("location_mode", sa.String(20), server_default="onsite"),
        sa.Column("location_text", sa.String(500), nullable=True),
        sa.Column("parish", sa.String(50), nullable=True),
        sa.Column("latitude", sa.Numeric(), nullable=True),
        sa.Column("longitude", sa.Numeric(), nullable=True),
        sa.Column("total_amount", sa.Numeric(12, 2), nullable=True),
        sa.Column("currency", sa.String(3), server_default="JMD"),
        sa.Column("payment_status", sa.String(20), server_default="unpaid"),
        sa.Column("cancellation_reason", sa.Text(), nullable=True),
        sa.Column("cancelled_by", sa.String(), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_booking_customer", "bookings", ["customer_id"])
    op.create_index("idx_booking_provider", "bookings", ["provider_id"])
    op.create_index("idx_booking_status", "bookings", ["status"])
    op.create_index("idx_booking_created", "bookings", ["created_at"])

    # ── booking_events ───────────────────────────────────────────────────
    op.create_table(
        "booking_events",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("booking_id", sa.String(), nullable=False),
        sa.Column("event_type", sa.String(50), nullable=False),
        sa.Column("from_status", sa.String(30), nullable=True),
        sa.Column("to_status", sa.String(30), nullable=True),
        sa.Column("actor_id", sa.String(), nullable=False),
        sa.Column("actor_role", sa.String(20), nullable=False),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("metadata", postgresql.JSONB(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_booking_event_booking", "booking_events", ["booking_id"])
    op.create_index("idx_booking_event_created", "booking_events", ["created_at"])

    # ── quotes ───────────────────────────────────────────────────────────
    op.create_table(
        "quotes",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("booking_id", sa.String(), nullable=False),
        sa.Column("provider_id", sa.String(), nullable=False),
        sa.Column("amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("currency", sa.String(3), server_default="JMD"),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("valid_until", sa.DateTime(timezone=True), nullable=True),
        sa.Column("status", sa.String(20), server_default="pending"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_quote_booking", "quotes", ["booking_id"])
    op.create_index("idx_quote_provider", "quotes", ["provider_id"])

    # ── notice_boards ────────────────────────────────────────────────────
    op.create_table(
        "notice_boards",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("provider_id", sa.String(), unique=True, nullable=False),
        sa.Column("user_id", sa.String(), nullable=False),
        sa.Column("is_enabled", sa.Boolean(), server_default=sa.text("true")),
        sa.Column("post_count", sa.Integer(), server_default="0"),
        sa.Column("follower_count", sa.Integer(), server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_noticeboard_user", "notice_boards", ["user_id"])
    op.create_index("idx_noticeboard_provider", "notice_boards", ["provider_id"])

    # ── posts ────────────────────────────────────────────────────────────
    op.create_table(
        "posts",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("notice_board_id", sa.String(), nullable=False),
        sa.Column("author_id", sa.String(), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("media_urls", postgresql.JSONB(), server_default="[]"),
        sa.Column("media_type", sa.String(20), nullable=True),
        sa.Column("external_link", sa.String(500), nullable=True),
        sa.Column("post_type", sa.String(20), server_default="standard"),
        sa.Column("profession_tag", sa.String(100), nullable=True),
        sa.Column("moderation_status", sa.String(20), server_default="pending_review"),
        sa.Column("moderation_note", sa.Text(), nullable=True),
        sa.Column("moderation_reviewed_by", sa.String(), nullable=True),
        sa.Column("moderation_reviewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("like_count", sa.Integer(), server_default="0"),
        sa.Column("comment_count", sa.Integer(), server_default="0"),
        sa.Column("is_pinned", sa.Boolean(), server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_post_noticeboard", "posts", ["notice_board_id"])
    op.create_index("idx_post_author", "posts", ["author_id"])
    op.create_index("idx_post_moderation", "posts", ["moderation_status"])
    op.create_index("idx_post_created", "posts", ["created_at"])

    # ── comments ─────────────────────────────────────────────────────────
    op.create_table(
        "comments",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("post_id", sa.String(), nullable=False),
        sa.Column("author_id", sa.String(), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("parent_comment_id", sa.String(), nullable=True),
        sa.Column("moderation_status", sa.String(20), server_default="pending_review"),
        sa.Column("moderation_note", sa.Text(), nullable=True),
        sa.Column("like_count", sa.Integer(), server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_comment_post", "comments", ["post_id"])
    op.create_index("idx_comment_author", "comments", ["author_id"])
    op.create_index("idx_comment_moderation", "comments", ["moderation_status"])

    # ── post_likes ───────────────────────────────────────────────────────
    op.create_table(
        "post_likes",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("user_id", sa.String(), nullable=False),
        sa.Column("target_type", sa.String(10), nullable=False),
        sa.Column("target_id", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "target_type", "target_id", name="uq_post_likes_user_target"),
    )
    op.create_index("idx_like_user", "post_likes", ["user_id"])
    op.create_index("idx_like_target", "post_likes", ["target_id"])

    # ── reports ──────────────────────────────────────────────────────────
    op.create_table(
        "reports",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("reporter_id", sa.String(), nullable=False),
        sa.Column("target_type", sa.String(30), nullable=False),
        sa.Column("target_id", sa.String(), nullable=False),
        sa.Column("reason", sa.String(50), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("evidence_urls", postgresql.JSONB(), server_default="[]"),
        sa.Column("severity", sa.String(20), server_default="low"),
        sa.Column("status", sa.String(20), server_default="pending"),
        sa.Column("assigned_to", sa.String(), nullable=True),
        sa.Column("resolution_note", sa.Text(), nullable=True),
        sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_report_status", "reports", ["status"])
    op.create_index("idx_report_target", "reports", ["target_type", "target_id"])
    op.create_index("idx_report_reporter", "reports", ["reporter_id"])
    op.create_index("idx_report_severity", "reports", ["severity"])

    # ── suspensions ──────────────────────────────────────────────────────
    op.create_table(
        "suspensions",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("user_id", sa.String(), nullable=False),
        sa.Column("reason", sa.Text(), nullable=False),
        sa.Column("suspension_type", sa.String(20), nullable=False),
        sa.Column("starts_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("ends_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("issued_by", sa.String(), nullable=False),
        sa.Column("report_id", sa.String(), nullable=True),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_suspension_user", "suspensions", ["user_id"])
    op.create_index("idx_suspension_active", "suspensions", ["is_active"])

    # ── appeals ──────────────────────────────────────────────────────────
    op.create_table(
        "appeals",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("suspension_id", sa.String(), nullable=False),
        sa.Column("user_id", sa.String(), nullable=False),
        sa.Column("reason", sa.Text(), nullable=False),
        sa.Column("evidence_urls", postgresql.JSONB(), server_default="[]"),
        sa.Column("status", sa.String(20), server_default="pending"),
        sa.Column("reviewed_by", sa.String(), nullable=True),
        sa.Column("reviewer_notes", sa.Text(), nullable=True),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_appeal_suspension", "appeals", ["suspension_id"])
    op.create_index("idx_appeal_status", "appeals", ["status"])

    # ── blocked_users ────────────────────────────────────────────────────
    op.create_table(
        "blocked_users",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("blocker_id", sa.String(), nullable=False),
        sa.Column("blocked_id", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("blocker_id", "blocked_id"),
    )
    op.create_index("idx_blocked_blocker", "blocked_users", ["blocker_id"])
    op.create_index("idx_blocked_blocked", "blocked_users", ["blocked_id"])

    # ── business_profiles ────────────────────────────────────────────────
    op.create_table(
        "business_profiles",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("user_id", sa.String(), nullable=False),
        sa.Column("business_name", sa.String(200), nullable=False),
        sa.Column("registration_number", sa.String(100), nullable=True),
        sa.Column("address", sa.Text(), nullable=True),
        sa.Column("parish", sa.String(50), nullable=True),
        sa.Column("contact_email", sa.String(255), nullable=True),
        sa.Column("contact_phone", sa.String(30), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("logo_url", sa.Text(), nullable=True),
        sa.Column("website", sa.String(500), nullable=True),
        sa.Column("is_verified", sa.Boolean(), server_default=sa.text("false")),
        sa.Column("verified_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_business_user", "business_profiles", ["user_id"])

    # ── business_staff ───────────────────────────────────────────────────
    op.create_table(
        "business_staff",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("business_id", sa.String(), nullable=False),
        sa.Column("user_id", sa.String(), nullable=False),
        sa.Column("role", sa.String(20), nullable=False, server_default="staff"),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true")),
        sa.Column("invited_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("accepted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("business_id", "user_id"),
    )
    op.create_index("idx_staff_business", "business_staff", ["business_id"])
    op.create_index("idx_staff_user", "business_staff", ["user_id"])

    # ── business_branches ────────────────────────────────────────────────
    op.create_table(
        "business_branches",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("business_id", sa.String(), nullable=False),
        sa.Column("branch_name", sa.String(200), nullable=False),
        sa.Column("address", sa.Text(), nullable=True),
        sa.Column("parish", sa.String(50), nullable=True),
        sa.Column("phone", sa.String(30), nullable=True),
        sa.Column("manager_id", sa.String(), nullable=True),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_branch_business", "business_branches", ["business_id"])

    # ── analytics_events ─────────────────────────────────────────────────
    op.create_table(
        "analytics_events",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("user_id", sa.String(), nullable=True),
        sa.Column("event_type", sa.String(50), nullable=False),
        sa.Column("entity_type", sa.String(30), nullable=True),
        sa.Column("entity_id", sa.String(), nullable=True),
        sa.Column("properties", postgresql.JSONB(), server_default="{}"),
        sa.Column("session_id", sa.String(), nullable=True),
        sa.Column("ip_address", sa.String(45), nullable=True),
        sa.Column("user_agent", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_analytics_user", "analytics_events", ["user_id"])
    op.create_index("idx_analytics_type", "analytics_events", ["event_type"])
    op.create_index("idx_analytics_entity", "analytics_events", ["entity_type", "entity_id"])
    op.create_index("idx_analytics_created", "analytics_events", ["created_at"])

    # ── dashboard_snapshots ──────────────────────────────────────────────
    op.create_table(
        "dashboard_snapshots",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("user_id", sa.String(), nullable=False),
        sa.Column("snapshot_date", sa.Date(), nullable=False),
        sa.Column("profile_views", sa.Integer(), server_default="0"),
        sa.Column("listing_views", sa.Integer(), server_default="0"),
        sa.Column("search_appearances", sa.Integer(), server_default="0"),
        sa.Column("bookings_received", sa.Integer(), server_default="0"),
        sa.Column("messages_received", sa.Integer(), server_default="0"),
        sa.Column("total_revenue", sa.Numeric(12, 2), server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "snapshot_date"),
    )
    op.create_index("idx_snapshot_user", "dashboard_snapshots", ["user_id"])
    op.create_index("idx_snapshot_date", "dashboard_snapshots", ["snapshot_date"])

    # ── categories ───────────────────────────────────────────────────────
    op.create_table(
        "categories",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("name", sa.String(100), unique=True, nullable=False),
        sa.Column("slug", sa.String(100), unique=True, nullable=False),
        sa.Column("parent_id", sa.String(), nullable=True),
        sa.Column("icon", sa.String(50), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true")),
        sa.Column("sort_order", sa.Integer(), server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_category_slug", "categories", ["slug"])
    op.create_index("idx_category_parent", "categories", ["parent_id"])
    op.create_index("idx_category_active", "categories", ["is_active"])

    # ── provider_profiles ────────────────────────────────────────────────
    op.create_table(
        "provider_profiles",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("user_id", sa.String(), unique=True, nullable=False),
        sa.Column("profile_id", sa.String(), unique=True, nullable=False),
        sa.Column("headline", sa.String(200), nullable=True),
        sa.Column("profession", sa.String(100), nullable=True),
        sa.Column("years_of_experience", sa.Integer(), nullable=True),
        sa.Column("service_radius_km", sa.Integer(), server_default="25"),
        sa.Column("pricing_mode", sa.String(20), server_default="quote"),
        sa.Column("hourly_rate_min", sa.Numeric(10, 2), nullable=True),
        sa.Column("hourly_rate_max", sa.Numeric(10, 2), nullable=True),
        sa.Column("currency", sa.String(3), server_default="JMD"),
        sa.Column("response_time_hours", sa.Integer(), nullable=True),
        sa.Column("notice_board_enabled", sa.Boolean(), server_default=sa.text("false")),
        sa.Column("is_available", sa.Boolean(), server_default=sa.text("true")),
        sa.Column("verification_status", sa.String(20), server_default="unverified"),
        sa.Column("onboarding_step", sa.Integer(), server_default="0"),
        sa.Column("onboarding_completed", sa.Boolean(), server_default=sa.text("false")),
        sa.Column("completion_percentage", sa.Integer(), server_default="0"),
        sa.Column("total_bookings", sa.Integer(), server_default="0"),
        sa.Column("completed_bookings", sa.Integer(), server_default="0"),
        sa.Column("cancellation_count", sa.Integer(), server_default="0"),
        sa.Column("avg_rating", sa.Numeric(3, 2), server_default="0"),
        sa.Column("review_count", sa.Integer(), server_default="0"),
        sa.Column("profile_views", sa.Integer(), server_default="0"),
        sa.Column("profile_clicks", sa.Integer(), server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_pp_user_id", "provider_profiles", ["user_id"])
    op.create_index("idx_pp_profession", "provider_profiles", ["profession"])
    op.create_index("idx_pp_verification", "provider_profiles", ["verification_status"])
    op.create_index("idx_pp_available", "provider_profiles", ["is_available"])

    # ── provider_services ────────────────────────────────────────────────
    op.create_table(
        "provider_services",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("provider_id", sa.String(), nullable=False),
        sa.Column("category_id", sa.String(), nullable=False),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("price_type", sa.String(20), server_default="quote"),
        sa.Column("price_amount", sa.Numeric(10, 2), nullable=True),
        sa.Column("currency", sa.String(3), server_default="JMD"),
        sa.Column("duration_minutes", sa.Integer(), nullable=True),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true")),
        sa.Column("sort_order", sa.Integer(), server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_ps_provider", "provider_services", ["provider_id"])
    op.create_index("idx_ps_category", "provider_services", ["category_id"])
    op.create_index("idx_ps_active", "provider_services", ["is_active"])

    # ── service_packages ─────────────────────────────────────────────────
    op.create_table(
        "service_packages",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("service_id", sa.String(), nullable=False),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("price", sa.Numeric(10, 2), nullable=False),
        sa.Column("currency", sa.String(3), server_default="JMD"),
        sa.Column("features", postgresql.JSONB(), server_default="[]"),
        sa.Column("duration_minutes", sa.Integer(), nullable=True),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true")),
        sa.Column("sort_order", sa.Integer(), server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_sp_service", "service_packages", ["service_id"])

    # ── availability_slots ───────────────────────────────────────────────
    op.create_table(
        "availability_slots",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("provider_id", sa.String(), nullable=False),
        sa.Column("day_of_week", sa.Integer(), nullable=False),
        sa.Column("start_time", sa.Time(), nullable=False),
        sa.Column("end_time", sa.Time(), nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("provider_id", "day_of_week", "start_time", name="uq_availability_slot"),
    )
    op.create_index("idx_as_provider", "availability_slots", ["provider_id"])
    op.create_index("idx_as_day", "availability_slots", ["provider_id", "day_of_week"])

    # ── portfolio_items ──────────────────────────────────────────────────
    op.create_table(
        "portfolio_items",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("provider_id", sa.String(), nullable=True),
        sa.Column("user_id", sa.String(), nullable=True),
        sa.Column("title", sa.String(200), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("image_url", sa.String(500), nullable=True),
        sa.Column("thumbnail_url", sa.String(500), nullable=True),
        sa.Column("category", sa.String(100), nullable=True),
        sa.Column("display_order", sa.Integer(), server_default="0"),
        sa.Column("is_visible", sa.Boolean(), server_default=sa.text("true")),
        sa.Column("sort_order", sa.Integer(), server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_pi_provider", "portfolio_items", ["provider_id"])
    op.create_index("idx_portfolio_user", "portfolio_items", ["user_id"])

    # ── profile_views ────────────────────────────────────────────────────
    op.create_table(
        "profile_views",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("profile_user_id", sa.String(), nullable=False),
        sa.Column("viewer_user_id", sa.String(), nullable=True),
        sa.Column("viewer_ip", sa.String(45), nullable=True),
        sa.Column("source", sa.String(50), nullable=True),
        sa.Column("share_link_id", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_profile_view_user", "profile_views", ["profile_user_id"])
    op.create_index("idx_profile_view_date", "profile_views", ["created_at"])

    # ── verification_assets ──────────────────────────────────────────────
    op.create_table(
        "verification_assets",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("verification_request_id", sa.String(), nullable=False),
        sa.Column("asset_type", sa.String(30), nullable=False),
        sa.Column("file_url", sa.String(500), nullable=False),
        sa.Column("file_key", sa.String(500), nullable=True),
        sa.Column("thumbnail_url", sa.String(500), nullable=True),
        sa.Column("mime_type", sa.String(50), nullable=True),
        sa.Column("file_size_bytes", sa.Integer(), nullable=True),
        sa.Column("metadata", postgresql.JSONB(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_va_request", "verification_assets", ["verification_request_id"])

    # ── follows ──────────────────────────────────────────────────────────
    op.create_table(
        "follows",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("follower_id", sa.String(), nullable=False),
        sa.Column("following_id", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_follow_follower", "follows", ["follower_id"])
    op.create_index("idx_follow_following", "follows", ["following_id"])
    op.create_index("uq_follow_pair", "follows", ["follower_id", "following_id"], unique=True)

    # ── user_tags ────────────────────────────────────────────────────────
    op.create_table(
        "user_tags",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("tagger_id", sa.String(), nullable=False),
        sa.Column("tagged_user_id", sa.String(), nullable=False),
        sa.Column("entity_type", sa.String(20), nullable=False),
        sa.Column("entity_id", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_tag_tagged_user", "user_tags", ["tagged_user_id"])
    op.create_index("idx_tag_entity", "user_tags", ["entity_type", "entity_id"])
    op.create_index(
        "uq_user_tag",
        "user_tags",
        ["tagger_id", "tagged_user_id", "entity_type", "entity_id"],
        unique=True,
    )

    # ── reputation_metrics ───────────────────────────────────────────────
    op.create_table(
        "reputation_metrics",
        sa.Column("user_id", sa.String(), nullable=False),
        sa.Column("total_jobs_completed", sa.Integer(), server_default="0"),
        sa.Column("repeat_client_rate", sa.Numeric(5, 2), server_default="0"),
        sa.Column("response_rate", sa.Numeric(5, 2), server_default="0"),
        sa.Column("on_time_rate", sa.Numeric(5, 2), server_default="0"),
        sa.Column("cancellation_rate", sa.Numeric(5, 2), server_default="0"),
        sa.Column("badge_level", sa.String(20), server_default="none"),
        sa.Column("trust_score", sa.Numeric(5, 2), server_default="0"),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("user_id"),
    )

    # ── notification_preferences ─────────────────────────────────────────
    op.create_table(
        "notification_preferences",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("user_id", sa.String(), unique=True, nullable=False),
        sa.Column("message_push", sa.Boolean(), server_default=sa.text("true")),
        sa.Column("message_email", sa.Boolean(), server_default=sa.text("false")),
        sa.Column("message_in_app", sa.Boolean(), server_default=sa.text("true")),
        sa.Column("booking_push", sa.Boolean(), server_default=sa.text("true")),
        sa.Column("booking_email", sa.Boolean(), server_default=sa.text("true")),
        sa.Column("booking_in_app", sa.Boolean(), server_default=sa.text("true")),
        sa.Column("payment_push", sa.Boolean(), server_default=sa.text("true")),
        sa.Column("payment_email", sa.Boolean(), server_default=sa.text("true")),
        sa.Column("payment_in_app", sa.Boolean(), server_default=sa.text("true")),
        sa.Column("review_push", sa.Boolean(), server_default=sa.text("true")),
        sa.Column("review_email", sa.Boolean(), server_default=sa.text("false")),
        sa.Column("review_in_app", sa.Boolean(), server_default=sa.text("true")),
        sa.Column("verification_push", sa.Boolean(), server_default=sa.text("true")),
        sa.Column("verification_email", sa.Boolean(), server_default=sa.text("true")),
        sa.Column("verification_in_app", sa.Boolean(), server_default=sa.text("true")),
        sa.Column("content_push", sa.Boolean(), server_default=sa.text("false")),
        sa.Column("content_email", sa.Boolean(), server_default=sa.text("false")),
        sa.Column("content_in_app", sa.Boolean(), server_default=sa.text("true")),
        sa.Column("system_push", sa.Boolean(), server_default=sa.text("true")),
        sa.Column("system_email", sa.Boolean(), server_default=sa.text("true")),
        sa.Column("system_in_app", sa.Boolean(), server_default=sa.text("true")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )

    # ── saved_searches ───────────────────────────────────────────────────
    op.create_table(
        "saved_searches",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("user_id", sa.String(), nullable=False),
        sa.Column("name", sa.String(100), nullable=True),
        sa.Column("query", sa.String(500), nullable=True),
        sa.Column("filters", postgresql.JSONB(), server_default="{}"),
        sa.Column("notification_enabled", sa.Boolean(), server_default=sa.text("false")),
        sa.Column("last_run_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("result_count", sa.Integer(), server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_saved_search_user", "saved_searches", ["user_id"])

    # ── ad_budgets ───────────────────────────────────────────────────────
    op.create_table(
        "ad_budgets",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("campaign_id", sa.String(), nullable=False),
        sa.Column("daily_budget", sa.Numeric(12, 2), nullable=True),
        sa.Column("total_budget", sa.Numeric(12, 2), nullable=True),
        sa.Column("daily_spent", sa.Numeric(12, 2), server_default="0"),
        sa.Column("total_spent", sa.Numeric(12, 2), server_default="0"),
        sa.Column("bid_amount", sa.Numeric(12, 2), server_default="0.50"),
        sa.Column("last_reset_date", sa.Date(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_ad_budget_campaign", "ad_budgets", ["campaign_id"])

    # ── ad_targeting ─────────────────────────────────────────────────────
    op.create_table(
        "ad_targeting",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("campaign_id", sa.String(), nullable=False),
        sa.Column("target_parishes", postgresql.JSONB(), server_default="[]"),
        sa.Column("target_categories", postgresql.JSONB(), server_default="[]"),
        sa.Column("target_age_range", postgresql.JSONB(), server_default="{}"),
        sa.Column("target_user_types", postgresql.JSONB(), server_default="[]"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_ad_targeting_campaign", "ad_targeting", ["campaign_id"])

    # ── ad_conversions ───────────────────────────────────────────────────
    op.create_table(
        "ad_conversions",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("campaign_id", sa.String(), nullable=False),
        sa.Column("click_id", sa.String(), nullable=True),
        sa.Column("user_id", sa.String(), nullable=True),
        sa.Column("conversion_type", sa.String(30), nullable=False),
        sa.Column("conversion_value", sa.Numeric(12, 2), nullable=True),
        sa.Column("event_metadata", postgresql.JSONB(), server_default="{}"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_ad_conversion_campaign", "ad_conversions", ["campaign_id"])
    op.create_index("idx_ad_conversion_type", "ad_conversions", ["conversion_type"])

    # ── admin_roles ──────────────────────────────────────────────────────
    op.create_table(
        "admin_roles",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("role_name", sa.String(50), unique=True, nullable=False),
        sa.Column("permissions", postgresql.JSONB(), server_default="[]"),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )

    # ── admin_role_assignments ───────────────────────────────────────────
    op.create_table(
        "admin_role_assignments",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("user_id", sa.String(), nullable=False),
        sa.Column("role_id", sa.String(), nullable=False),
        sa.Column("assigned_by", sa.String(), nullable=False),
        sa.Column("assigned_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_admin_role_user", "admin_role_assignments", ["user_id"])

    # ══════════════════════════════════════════════════════════════════════
    # PHASE 2 NEW FEATURE TABLES
    # ══════════════════════════════════════════════════════════════════════

    # ── events ───────────────────────────────────────────────────────────
    op.create_table(
        "events",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("organizer_id", sa.String(), nullable=False),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("category", sa.String(100), nullable=True),
        sa.Column("date_start", sa.DateTime(timezone=True), nullable=True),
        sa.Column("date_end", sa.DateTime(timezone=True), nullable=True),
        sa.Column("location_text", sa.String(500), nullable=True),
        sa.Column("parish", sa.String(50), nullable=True),
        sa.Column("latitude", sa.Numeric(), nullable=True),
        sa.Column("longitude", sa.Numeric(), nullable=True),
        sa.Column("cover_image_url", sa.String(500), nullable=True),
        sa.Column("cover_video_url", sa.String(500), nullable=True),
        sa.Column("ticket_price", sa.Numeric(12, 2), nullable=True),
        sa.Column("is_free", sa.Boolean(), server_default=sa.text("true")),
        sa.Column("capacity", sa.Integer(), nullable=True),
        sa.Column("age_restriction", sa.String(50), nullable=True),
        sa.Column("status", sa.String(30), server_default="draft"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_event_organizer", "events", ["organizer_id"])
    op.create_index("idx_event_category", "events", ["category"])
    op.create_index("idx_event_status", "events", ["status"])
    op.create_index("idx_event_date_start", "events", ["date_start"])
    op.create_index("idx_event_parish", "events", ["parish"])

    # ── event_tickets ────────────────────────────────────────────────────
    op.create_table(
        "event_tickets",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("event_id", sa.String(), nullable=False),
        sa.Column("buyer_id", sa.String(), nullable=False),
        sa.Column("quantity", sa.Integer(), nullable=False),
        sa.Column("amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("stripe_payment_id", sa.String(), nullable=True),
        sa.Column("status", sa.String(30), server_default="pending"),
        sa.Column("purchased_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_ticket_event", "event_tickets", ["event_id"])
    op.create_index("idx_ticket_buyer", "event_tickets", ["buyer_id"])

    # ── event_rsvps ──────────────────────────────────────────────────────
    op.create_table(
        "event_rsvps",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("event_id", sa.String(), nullable=False),
        sa.Column("user_id", sa.String(), nullable=False),
        sa.Column("status", sa.String(20), server_default="going"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_rsvp_event", "event_rsvps", ["event_id"])
    op.create_index("idx_rsvp_user", "event_rsvps", ["user_id"])

    # ── event_updates ────────────────────────────────────────────────────
    op.create_table(
        "event_updates",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("event_id", sa.String(), nullable=False),
        sa.Column("organizer_id", sa.String(), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_event_update_event", "event_updates", ["event_id"])

    # ── subscription_plans ───────────────────────────────────────────────
    op.create_table(
        "subscription_plans",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("tier", sa.String(30), nullable=False),
        sa.Column("price", sa.Numeric(12, 2), nullable=False),
        sa.Column("currency", sa.String(3), server_default="JMD"),
        sa.Column("features", postgresql.JSONB(), server_default="[]"),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )

    # ── user_subscriptions ───────────────────────────────────────────────
    op.create_table(
        "user_subscriptions",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("user_id", sa.String(), nullable=False),
        sa.Column("plan_id", sa.String(), nullable=False),
        sa.Column("status", sa.String(30), server_default="active"),
        sa.Column("stripe_subscription_id", sa.String(), nullable=True),
        sa.Column("current_period_start", sa.DateTime(timezone=True), nullable=True),
        sa.Column("current_period_end", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_user_sub_user", "user_subscriptions", ["user_id"])
    op.create_index("idx_user_sub_plan", "user_subscriptions", ["plan_id"])
    op.create_index("idx_user_sub_status", "user_subscriptions", ["status"])


def downgrade() -> None:
    # ── Drop Phase 2 feature tables ──────────────────────────────────────
    op.drop_table("user_subscriptions")
    op.drop_table("subscription_plans")
    op.drop_table("event_updates")
    op.drop_table("event_rsvps")
    op.drop_table("event_tickets")
    op.drop_table("events")

    # ── Drop ORM model tables (reverse order) ────────────────────────────
    op.drop_table("admin_role_assignments")
    op.drop_table("admin_roles")
    op.drop_table("ad_conversions")
    op.drop_table("ad_targeting")
    op.drop_table("ad_budgets")
    op.drop_table("saved_searches")
    op.drop_table("notification_preferences")
    op.drop_table("reputation_metrics")
    op.drop_table("user_tags")
    op.drop_table("follows")
    op.drop_table("verification_assets")
    op.drop_table("profile_views")
    op.drop_table("portfolio_items")
    op.drop_table("availability_slots")
    op.drop_table("service_packages")
    op.drop_table("provider_services")
    op.drop_table("provider_profiles")
    op.drop_table("categories")
    op.drop_table("dashboard_snapshots")
    op.drop_table("analytics_events")
    op.drop_table("business_branches")
    op.drop_table("business_staff")
    op.drop_table("business_profiles")
    op.drop_table("blocked_users")
    op.drop_table("appeals")
    op.drop_table("suspensions")
    op.drop_table("reports")
    op.drop_table("post_likes")
    op.drop_table("comments")
    op.drop_table("posts")
    op.drop_table("notice_boards")
    op.drop_table("quotes")
    op.drop_table("booking_events")
    op.drop_table("bookings")
    op.drop_table("refunds")

    # ── Remove added columns from existing tables ────────────────────────
    op.drop_column("transactions", "provider_payout")
    op.drop_column("transactions", "booking_id")

    op.drop_column("job_posts", "boost_expires_at")
    op.drop_column("job_posts", "is_boosted")
    op.drop_column("job_posts", "urgency")

    op.drop_column("users", "org_representative_title")
    op.drop_column("users", "org_representative_name")
    op.drop_column("users", "org_type")
    op.drop_column("users", "org_registration_number")
    op.drop_column("users", "org_name")
    op.drop_column("users", "account_type")
