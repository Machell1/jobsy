"""Initial schema for all 20 Jobsy microservice tables.

Revision ID: 001_initial
Revises:
Create Date: 2026-03-09

"""

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision = "001_initial"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── Gateway: users ──────────────────────────────────────────────────
    op.create_table(
        "users",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("phone", sa.String(20), nullable=False),
        sa.Column("email", sa.String(255), nullable=True),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("role", sa.String(20), server_default="user"),
        sa.Column("is_verified", sa.Boolean(), server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("phone"),
        sa.UniqueConstraint("email"),
    )

    # ── Profiles ────────────────────────────────────────────────────────
    op.create_table(
        "profiles",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("user_id", sa.String(), nullable=False),
        sa.Column("display_name", sa.String(100), nullable=False),
        sa.Column("bio", sa.String(), nullable=True),
        sa.Column("avatar_url", sa.String(500), nullable=True),
        sa.Column("photos", postgresql.JSONB(), server_default="[]"),
        sa.Column("parish", sa.String(50), nullable=True),
        sa.Column("latitude", sa.Numeric(10, 7), nullable=True),
        sa.Column("longitude", sa.Numeric(10, 7), nullable=True),
        sa.Column("geohash", sa.String(12), nullable=True),
        sa.Column("service_category", sa.String(50), nullable=True),
        sa.Column("skills", postgresql.JSONB(), server_default="[]"),
        sa.Column("hourly_rate", sa.Numeric(10, 2), nullable=True),
        sa.Column("is_provider", sa.Boolean(), server_default=sa.text("false")),
        sa.Column("rating_avg", sa.Numeric(3, 2), server_default="0"),
        sa.Column("rating_count", sa.Integer(), server_default="0"),
        sa.Column("is_verified", sa.Boolean(), server_default=sa.text("false")),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id"),
    )

    # ── Listings ────────────────────────────────────────────────────────
    op.create_table(
        "listings",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("poster_id", sa.String(), nullable=False),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("description", sa.String(), nullable=False),
        sa.Column("category", sa.String(50), nullable=False),
        sa.Column("subcategory", sa.String(50), nullable=True),
        sa.Column("budget_min", sa.Numeric(10, 2), nullable=True),
        sa.Column("budget_max", sa.Numeric(10, 2), nullable=True),
        sa.Column("currency", sa.String(3), server_default="JMD"),
        sa.Column("latitude", sa.Numeric(10, 7), nullable=True),
        sa.Column("longitude", sa.Numeric(10, 7), nullable=True),
        sa.Column("geohash", sa.String(12), nullable=True),
        sa.Column("parish", sa.String(50), nullable=True),
        sa.Column("address_text", sa.String(255), nullable=True),
        sa.Column("photos", postgresql.JSONB(), server_default="[]"),
        sa.Column("status", sa.String(20), server_default="active"),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )

    # ── Swipes ──────────────────────────────────────────────────────────
    op.create_table(
        "swipes",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("swiper_id", sa.String(), nullable=False),
        sa.Column("target_id", sa.String(), nullable=False),
        sa.Column("target_type", sa.String(20), nullable=False),
        sa.Column("direction", sa.String(5), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("swiper_id", "target_id", "target_type", name="uq_swipe_unique"),
    )
    op.create_index("ix_swipes_swiper_id", "swipes", ["swiper_id"])

    # ── Matches ─────────────────────────────────────────────────────────
    op.create_table(
        "matches",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("user_a_id", sa.String(), nullable=False),
        sa.Column("user_b_id", sa.String(), nullable=False),
        sa.Column("listing_id", sa.String(), nullable=True),
        sa.Column("status", sa.String(20), server_default="active"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_a_id", "user_b_id", "listing_id", name="uq_match_unique"),
    )
    op.create_index("ix_matches_user_a_id", "matches", ["user_a_id"])
    op.create_index("ix_matches_user_b_id", "matches", ["user_b_id"])

    # ── Chat: conversations ─────────────────────────────────────────────
    op.create_table(
        "conversations",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("match_id", sa.String(), nullable=False),
        sa.Column("user_a_id", sa.String(), nullable=False),
        sa.Column("user_b_id", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("match_id"),
    )
    op.create_index("idx_convo_user_a", "conversations", ["user_a_id"])
    op.create_index("idx_convo_user_b", "conversations", ["user_b_id"])

    # ── Chat: messages ──────────────────────────────────────────────────
    op.create_table(
        "messages",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("conversation_id", sa.String(), nullable=False),
        sa.Column("sender_id", sa.String(), nullable=False),
        sa.Column("content", sa.String(), nullable=False),
        sa.Column("message_type", sa.String(20), server_default="text"),
        sa.Column("is_read", sa.Boolean(), server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_messages_convo", "messages", ["conversation_id", "created_at"])

    # ── Notifications: device_tokens ────────────────────────────────────
    op.create_table(
        "device_tokens",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("user_id", sa.String(), nullable=False),
        sa.Column("token", sa.String(500), nullable=False),
        sa.Column("platform", sa.String(10), nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_device_tokens_user_id", "device_tokens", ["user_id"])
    op.create_index("idx_device_user_token", "device_tokens", ["user_id", "token"], unique=True)

    # ── Notifications: notification_log ─────────────────────────────────
    op.create_table(
        "notification_log",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("user_id", sa.String(), nullable=False),
        sa.Column("title", sa.String(200), nullable=True),
        sa.Column("body", sa.String(), nullable=True),
        sa.Column("data", postgresql.JSONB(), server_default="{}"),
        sa.Column("notification_type", sa.String(30), nullable=False),
        sa.Column("is_read", sa.Boolean(), server_default=sa.text("false")),
        sa.Column("delivered", sa.Boolean(), server_default=sa.text("false")),
        sa.Column("sent_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_notification_log_user_id", "notification_log", ["user_id"])

    # ── Notifications: newsletter_subscribers ────────────────────────────
    op.create_table(
        "newsletter_subscribers",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("subscribed_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true")),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("email"),
    )

    # ── Advertising: ad_placements ──────────────────────────────────────
    op.create_table(
        "ad_placements",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("revive_zone_id", sa.Integer(), nullable=True),
        sa.Column("description", sa.String(), nullable=True),
        sa.Column("position", sa.String(50), nullable=True),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("name"),
    )

    # ── Advertising: ad_campaigns ───────────────────────────────────────
    op.create_table(
        "ad_campaigns",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("advertiser_name", sa.String(200), nullable=False),
        sa.Column("advertiser_email", sa.String(255), nullable=True),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("description", sa.String(), nullable=True),
        sa.Column("image_url", sa.String(500), nullable=True),
        sa.Column("click_url", sa.String(500), nullable=False),
        sa.Column("target_parishes", postgresql.JSONB(), server_default="[]"),
        sa.Column("target_categories", postgresql.JSONB(), server_default="[]"),
        sa.Column("budget_total", sa.Numeric(10, 2), nullable=True),
        sa.Column("budget_daily", sa.Numeric(10, 2), nullable=True),
        sa.Column("cost_per_click", sa.Numeric(8, 4), nullable=True),
        sa.Column("cost_per_impression", sa.Numeric(8, 4), nullable=True),
        sa.Column("status", sa.String(20), server_default="active"),
        sa.Column("starts_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("ends_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_campaign_status", "ad_campaigns", ["status"])

    # ── Advertising: ad_impressions ─────────────────────────────────────
    op.create_table(
        "ad_impressions",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("campaign_id", sa.String(), nullable=False),
        sa.Column("placement_id", sa.String(), nullable=True),
        sa.Column("user_id", sa.String(), nullable=True),
        sa.Column("parish", sa.String(50), nullable=True),
        sa.Column("recorded_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_ad_impressions_campaign_id", "ad_impressions", ["campaign_id"])

    # ── Advertising: ad_clicks ──────────────────────────────────────────
    op.create_table(
        "ad_clicks",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("campaign_id", sa.String(), nullable=False),
        sa.Column("placement_id", sa.String(), nullable=True),
        sa.Column("user_id", sa.String(), nullable=True),
        sa.Column("parish", sa.String(50), nullable=True),
        sa.Column("recorded_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_ad_clicks_campaign_id", "ad_clicks", ["campaign_id"])

    # ── Payments: payment_accounts ──────────────────────────────────────
    op.create_table(
        "payment_accounts",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("user_id", sa.String(), nullable=False),
        sa.Column("stripe_account_id", sa.String(100), nullable=True),
        sa.Column("stripe_customer_id", sa.String(100), nullable=True),
        sa.Column("default_currency", sa.String(3), server_default="JMD"),
        sa.Column("payout_method", sa.String(30), nullable=True),
        sa.Column("status", sa.String(20), server_default="pending"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id"),
    )

    # ── Payments: transactions ──────────────────────────────────────────
    op.create_table(
        "transactions",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("payer_id", sa.String(), nullable=False),
        sa.Column("payee_id", sa.String(), nullable=False),
        sa.Column("listing_id", sa.String(), nullable=True),
        sa.Column("match_id", sa.String(), nullable=True),
        sa.Column("amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("currency", sa.String(3), server_default="JMD"),
        sa.Column("platform_fee", sa.Numeric(12, 2), server_default="0"),
        sa.Column("net_amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("stripe_payment_intent_id", sa.String(100), nullable=True),
        sa.Column("stripe_transfer_id", sa.String(100), nullable=True),
        sa.Column("status", sa.String(20), server_default="pending"),
        sa.Column("description", sa.String(500), nullable=True),
        sa.Column("metadata", postgresql.JSONB(), server_default="{}"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_txn_payer", "transactions", ["payer_id", "created_at"])
    op.create_index("idx_txn_payee", "transactions", ["payee_id", "created_at"])
    op.create_index("idx_txn_status", "transactions", ["status"])

    # ── Payments: payouts ───────────────────────────────────────────────
    op.create_table(
        "payouts",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("user_id", sa.String(), nullable=False),
        sa.Column("amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("currency", sa.String(3), server_default="JMD"),
        sa.Column("stripe_payout_id", sa.String(100), nullable=True),
        sa.Column("status", sa.String(20), server_default="pending"),
        sa.Column("requested_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_payouts_user_id", "payouts", ["user_id"])

    # ── Reviews: reviews ────────────────────────────────────────────────
    op.create_table(
        "reviews",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("reviewer_id", sa.String(), nullable=False),
        sa.Column("reviewee_id", sa.String(), nullable=False),
        sa.Column("listing_id", sa.String(), nullable=True),
        sa.Column("transaction_id", sa.String(), nullable=True),
        sa.Column("rating", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(200), nullable=True),
        sa.Column("body", sa.Text(), nullable=True),
        sa.Column("quality_rating", sa.Integer(), nullable=True),
        sa.Column("punctuality_rating", sa.Integer(), nullable=True),
        sa.Column("communication_rating", sa.Integer(), nullable=True),
        sa.Column("value_rating", sa.Integer(), nullable=True),
        sa.Column("is_verified", sa.Boolean(), server_default=sa.text("false")),
        sa.Column("is_flagged", sa.Boolean(), server_default=sa.text("false")),
        sa.Column("is_visible", sa.Boolean(), server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_review_reviewee", "reviews", ["reviewee_id", "created_at"])
    op.create_index("idx_review_reviewer", "reviews", ["reviewer_id"])
    op.create_index("idx_review_listing", "reviews", ["listing_id"])

    # ── Reviews: review_responses ───────────────────────────────────────
    op.create_table(
        "review_responses",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("review_id", sa.String(), nullable=False),
        sa.Column("responder_id", sa.String(), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("review_id"),
    )

    # ── Reviews: user_ratings ───────────────────────────────────────────
    op.create_table(
        "user_ratings",
        sa.Column("user_id", sa.String(), nullable=False),
        sa.Column("total_reviews", sa.Integer(), server_default="0"),
        sa.Column("average_rating", sa.Numeric(3, 2), server_default="0"),
        sa.Column("average_quality", sa.Numeric(3, 2), nullable=True),
        sa.Column("average_punctuality", sa.Numeric(3, 2), nullable=True),
        sa.Column("average_communication", sa.Numeric(3, 2), nullable=True),
        sa.Column("average_value", sa.Numeric(3, 2), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("user_id"),
    )

    # ── Geoshard: geoshard_index ────────────────────────────────────────
    op.create_table(
        "geoshard_index",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("entity_id", sa.String(), nullable=False),
        sa.Column("entity_type", sa.String(20), nullable=False),
        sa.Column("geohash", sa.String(12), nullable=False),
        sa.Column("s2_cell_id", sa.BigInteger(), nullable=False),
        sa.Column("latitude", sa.Numeric(10, 7), nullable=False),
        sa.Column("longitude", sa.Numeric(10, 7), nullable=False),
        sa.Column("parish", sa.String(50), nullable=True),
        sa.Column("is_active", sa.String(5), server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_geoshard_hash", "geoshard_index", ["geohash"])
    op.create_index("idx_geoshard_s2", "geoshard_index", ["s2_cell_id"])
    op.create_index("idx_geoshard_entity", "geoshard_index", ["entity_id", "entity_type"], unique=True)
    op.create_index("idx_geoshard_parish", "geoshard_index", ["parish"])

    # ── Recommendations: user_preferences ────────────────────────────
    op.create_table(
        "user_preferences",
        sa.Column("user_id", sa.String(), nullable=False),
        sa.Column("preferred_categories", postgresql.JSONB(), server_default="[]"),
        sa.Column("preferred_parishes", postgresql.JSONB(), server_default="[]"),
        sa.Column("budget_range", postgresql.JSONB(), server_default="{}"),
        sa.Column("max_distance_km", sa.Numeric(6, 1), server_default="25.0"),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("user_id"),
    )

    # ── Recommendations: interaction_scores ──────────────────────────
    op.create_table(
        "interaction_scores",
        sa.Column("user_id", sa.String(), nullable=False),
        sa.Column("target_id", sa.String(), nullable=False),
        sa.Column("score", sa.Numeric(5, 4), nullable=False),
        sa.Column("factors", postgresql.JSONB(), server_default="{}"),
        sa.Column("computed_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("user_id", "target_id"),
    )
    op.create_index("idx_interaction_user", "interaction_scores", ["user_id"])
    op.create_index("idx_interaction_score", "interaction_scores", ["user_id", "score"])

    # ── Recommendations: interaction_logs ────────────────────────────
    op.create_table(
        "interaction_logs",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("user_id", sa.String(), nullable=False),
        sa.Column("target_id", sa.String(), nullable=False),
        sa.Column("target_type", sa.String(20), nullable=False),
        sa.Column("action", sa.String(20), nullable=False),
        sa.Column("duration_ms", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_interaction_logs_user_id", "interaction_logs", ["user_id"])

    # ── Profiles: verification_requests ──────────────────────────────
    op.create_table(
        "verification_requests",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("user_id", sa.String(), nullable=False),
        sa.Column("document_urls", postgresql.JSONB(), server_default="[]"),
        sa.Column("status", sa.String(20), server_default="pending"),
        sa.Column("reviewer_notes", sa.String(), nullable=True),
        sa.Column("submitted_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_verification_requests_user_id", "verification_requests", ["user_id"])

    # ── Admin: audit_log ────────────────────────────────────────────────
    op.create_table(
        "audit_log",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("admin_id", sa.String(), nullable=False),
        sa.Column("action", sa.String(100), nullable=False),
        sa.Column("target_type", sa.String(50), nullable=False),
        sa.Column("target_id", sa.String(), nullable=False),
        sa.Column("details", postgresql.JSONB(), server_default="{}"),
        sa.Column("reason", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_audit_log_admin_id", "audit_log", ["admin_id"])
    op.create_index("idx_audit_action", "audit_log", ["action", "created_at"])
    op.create_index("idx_audit_target", "audit_log", ["target_type", "target_id"])

    # ── Admin: moderation_queue ─────────────────────────────────────────
    op.create_table(
        "moderation_queue",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("item_type", sa.String(50), nullable=False),
        sa.Column("item_id", sa.String(), nullable=False),
        sa.Column("reported_by", sa.String(), nullable=True),
        sa.Column("reason", sa.String(200), nullable=True),
        sa.Column("status", sa.String(20), server_default="pending"),
        sa.Column("reviewed_by", sa.String(), nullable=True),
        sa.Column("resolution", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_moderation_status", "moderation_queue", ["status", "created_at"])


def downgrade() -> None:
    op.drop_table("moderation_queue")
    op.drop_table("audit_log")
    op.drop_table("verification_requests")
    op.drop_table("interaction_logs")
    op.drop_table("interaction_scores")
    op.drop_table("user_preferences")
    op.drop_table("geoshard_index")
    op.drop_table("user_ratings")
    op.drop_table("review_responses")
    op.drop_table("reviews")
    op.drop_table("payouts")
    op.drop_table("transactions")
    op.drop_table("payment_accounts")
    op.drop_table("ad_clicks")
    op.drop_table("ad_impressions")
    op.drop_table("ad_campaigns")
    op.drop_table("ad_placements")
    op.drop_table("newsletter_subscribers")
    op.drop_table("notification_log")
    op.drop_table("device_tokens")
    op.drop_table("messages")
    op.drop_table("conversations")
    op.drop_table("matches")
    op.drop_table("swipes")
    op.drop_table("listings")
    op.drop_table("profiles")
    op.drop_table("users")
