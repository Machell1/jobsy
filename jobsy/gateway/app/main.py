"""Jobsy API Gateway -- entry point for all client requests."""

import asyncio
import contextlib
import logging
import os
from contextlib import asynccontextmanager

import httpx
import redis.asyncio as aioredis
import sentry_sdk
import websockets
from fastapi import FastAPI, Request, WebSocket, WebSocketDisconnect
from prometheus_fastapi_instrumentator import Instrumentator

from shared.config import REDIS_URL, SENTRY_DSN
from shared.database import init_db
from shared.logging import setup_json_logging
from shared.middleware import setup_middleware

from .middleware.rate_limit import rate_limit_check
from .routes.analytics import router as analytics_router
from .routes.auth import router as auth_router
from .routes.bidding import router as bidding_router
from .routes.bookings import router as bookings_router
from .routes.business import router as business_router
from .routes.health import router as health_router
from .routes.noticeboard import router as noticeboard_router
from .routes.proxy import router as proxy_router
from .routes.stream_chat import router as stream_chat_router
from .routes.trust import router as trust_router

setup_json_logging()
logger = logging.getLogger(__name__)

if SENTRY_DSN:
    sentry_sdk.init(
        dsn=SENTRY_DSN,
        traces_sample_rate=0.1,
        profiles_sample_rate=0.1,
        environment=os.getenv("RAILWAY_ENVIRONMENT", "development"),
    )


async def _apply_migrations() -> None:
    """Apply pending DDL migrations idempotently.

    Uses ADD COLUMN IF NOT EXISTS so it is safe to run on every startup.
    """
    from sqlalchemy import text

    from shared.database import engine

    try:
        async with engine.begin() as conn:
            # Migration 002: OAuth + password reset
            await conn.execute(text("ALTER TABLE users ALTER COLUMN phone DROP NOT NULL"))
            await conn.execute(text("ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL"))
            await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS oauth_provider VARCHAR(20)"))
            await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS oauth_id VARCHAR(255)"))
            await conn.execute(
                text(
                    "CREATE TABLE IF NOT EXISTS password_reset_otps ("
                    "id SERIAL PRIMARY KEY, phone VARCHAR(20) NOT NULL, "
                    "otp_hash VARCHAR(255) NOT NULL, expires_at TIMESTAMPTZ NOT NULL, "
                    "used BOOLEAN DEFAULT false, created_at TIMESTAMPTZ DEFAULT now())"
                )
            )
            # Migration 003: multi-role, social, followers
            await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS roles JSONB DEFAULT '[]'"))
            await conn.execute(
                text("ALTER TABLE users ADD COLUMN IF NOT EXISTS active_role VARCHAR(20) DEFAULT 'user'")
            )
            for col in ["is_hirer", "is_advertiser"]:
                await conn.execute(text(f"ALTER TABLE profiles ADD COLUMN IF NOT EXISTS {col} BOOLEAN DEFAULT false"))
            for col in [
                "instagram_url",
                "twitter_url",
                "tiktok_url",
                "youtube_url",
                "linkedin_url",
                "portfolio_url",
            ]:
                await conn.execute(text(f"ALTER TABLE profiles ADD COLUMN IF NOT EXISTS {col} VARCHAR(500)"))
            for col in ["follower_count", "following_count"]:
                await conn.execute(text(f"ALTER TABLE profiles ADD COLUMN IF NOT EXISTS {col} INTEGER DEFAULT 0"))
            await conn.execute(
                text(
                    "CREATE TABLE IF NOT EXISTS follows ("
                    "id VARCHAR PRIMARY KEY, follower_id VARCHAR NOT NULL, "
                    "following_id VARCHAR NOT NULL, created_at TIMESTAMPTZ NOT NULL)"
                )
            )
            await conn.execute(
                text(
                    "CREATE TABLE IF NOT EXISTS user_tags ("
                    "id VARCHAR PRIMARY KEY, tagger_id VARCHAR NOT NULL, "
                    "tagged_user_id VARCHAR NOT NULL, entity_type VARCHAR(20) NOT NULL, "
                    "entity_id VARCHAR NOT NULL, created_at TIMESTAMPTZ NOT NULL)"
                )
            )
            # Migration 004: bookings service tables
            await conn.execute(
                text(
                    "CREATE TABLE IF NOT EXISTS bookings ("
                    "id VARCHAR PRIMARY KEY, "
                    "customer_id VARCHAR NOT NULL, "
                    "provider_id VARCHAR NOT NULL, "
                    "listing_id VARCHAR, "
                    "service_id VARCHAR, "
                    "title VARCHAR(200) NOT NULL, "
                    "description TEXT, "
                    "status VARCHAR(30) NOT NULL DEFAULT 'inquiry', "
                    "scheduled_date DATE, "
                    "scheduled_time_start TIME, "
                    "scheduled_time_end TIME, "
                    "location_mode VARCHAR(20) DEFAULT 'onsite', "
                    "location_text VARCHAR(500), "
                    "parish VARCHAR(50), "
                    "latitude NUMERIC, "
                    "longitude NUMERIC, "
                    "total_amount NUMERIC(12,2), "
                    "currency VARCHAR(3) DEFAULT 'JMD', "
                    "payment_status VARCHAR(20) DEFAULT 'unpaid', "
                    "cancellation_reason TEXT, "
                    "cancelled_by VARCHAR, "
                    "completed_at TIMESTAMPTZ, "
                    "created_at TIMESTAMPTZ NOT NULL DEFAULT now(), "
                    "updated_at TIMESTAMPTZ NOT NULL DEFAULT now())"
                )
            )
            await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_booking_customer ON bookings (customer_id)"))
            await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_booking_provider ON bookings (provider_id)"))
            await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_booking_status ON bookings (status)"))
            await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_booking_created ON bookings (created_at)"))
            await conn.execute(
                text(
                    "CREATE TABLE IF NOT EXISTS booking_events ("
                    "id VARCHAR PRIMARY KEY, "
                    "booking_id VARCHAR NOT NULL, "
                    "event_type VARCHAR(50) NOT NULL, "
                    "from_status VARCHAR(30), "
                    "to_status VARCHAR(30), "
                    "actor_id VARCHAR NOT NULL, "
                    "actor_role VARCHAR(20) NOT NULL, "
                    "note TEXT, "
                    "metadata JSONB, "
                    "created_at TIMESTAMPTZ NOT NULL DEFAULT now())"
                )
            )
            await conn.execute(
                text("CREATE INDEX IF NOT EXISTS idx_booking_event_booking ON booking_events (booking_id)")
            )
            await conn.execute(
                text("CREATE INDEX IF NOT EXISTS idx_booking_event_created ON booking_events (created_at)")
            )
            await conn.execute(
                text(
                    "CREATE TABLE IF NOT EXISTS quotes ("
                    "id VARCHAR PRIMARY KEY, "
                    "booking_id VARCHAR NOT NULL, "
                    "provider_id VARCHAR NOT NULL, "
                    "amount NUMERIC(12,2) NOT NULL, "
                    "currency VARCHAR(3) DEFAULT 'JMD', "
                    "description TEXT, "
                    "valid_until TIMESTAMPTZ, "
                    "status VARCHAR(20) DEFAULT 'pending', "
                    "created_at TIMESTAMPTZ NOT NULL DEFAULT now(), "
                    "updated_at TIMESTAMPTZ NOT NULL DEFAULT now())"
                )
            )
            await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_quote_booking ON quotes (booking_id)"))
            await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_quote_provider ON quotes (provider_id)"))
            # Migration 005: noticeboard service tables
            await conn.execute(
                text(
                    "CREATE TABLE IF NOT EXISTS notice_boards ("
                    "id VARCHAR PRIMARY KEY, "
                    "provider_id VARCHAR UNIQUE NOT NULL, "
                    "user_id VARCHAR NOT NULL, "
                    "is_enabled BOOLEAN DEFAULT true, "
                    "post_count INTEGER DEFAULT 0, "
                    "follower_count INTEGER DEFAULT 0, "
                    "created_at TIMESTAMPTZ NOT NULL DEFAULT now(), "
                    "updated_at TIMESTAMPTZ NOT NULL DEFAULT now())"
                )
            )
            await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_noticeboard_user ON notice_boards (user_id)"))
            await conn.execute(
                text("CREATE INDEX IF NOT EXISTS idx_noticeboard_provider ON notice_boards (provider_id)")
            )
            await conn.execute(
                text(
                    "CREATE TABLE IF NOT EXISTS posts ("
                    "id VARCHAR PRIMARY KEY, "
                    "notice_board_id VARCHAR NOT NULL, "
                    "author_id VARCHAR NOT NULL, "
                    "content TEXT NOT NULL, "
                    "media_urls JSONB DEFAULT '[]', "
                    "media_type VARCHAR(20), "
                    "external_link VARCHAR(500), "
                    "post_type VARCHAR(20) DEFAULT 'standard', "
                    "profession_tag VARCHAR(100), "
                    "moderation_status VARCHAR(20) DEFAULT 'pending_review', "
                    "moderation_note TEXT, "
                    "moderation_reviewed_by VARCHAR, "
                    "moderation_reviewed_at TIMESTAMPTZ, "
                    "like_count INTEGER DEFAULT 0, "
                    "comment_count INTEGER DEFAULT 0, "
                    "is_pinned BOOLEAN DEFAULT false, "
                    "created_at TIMESTAMPTZ NOT NULL DEFAULT now(), "
                    "updated_at TIMESTAMPTZ NOT NULL DEFAULT now())"
                )
            )
            await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_post_noticeboard ON posts (notice_board_id)"))
            await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_post_author ON posts (author_id)"))
            await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_post_moderation ON posts (moderation_status)"))
            await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_post_created ON posts (created_at)"))
            await conn.execute(
                text(
                    "CREATE TABLE IF NOT EXISTS comments ("
                    "id VARCHAR PRIMARY KEY, "
                    "post_id VARCHAR NOT NULL, "
                    "author_id VARCHAR NOT NULL, "
                    "content TEXT NOT NULL, "
                    "parent_comment_id VARCHAR, "
                    "moderation_status VARCHAR(20) DEFAULT 'pending_review', "
                    "moderation_note TEXT, "
                    "like_count INTEGER DEFAULT 0, "
                    "created_at TIMESTAMPTZ NOT NULL DEFAULT now(), "
                    "updated_at TIMESTAMPTZ NOT NULL DEFAULT now())"
                )
            )
            await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_comment_post ON comments (post_id)"))
            await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_comment_author ON comments (author_id)"))
            await conn.execute(
                text("CREATE INDEX IF NOT EXISTS idx_comment_moderation ON comments (moderation_status)")
            )
            await conn.execute(
                text(
                    "CREATE TABLE IF NOT EXISTS post_likes ("
                    "id VARCHAR PRIMARY KEY, "
                    "user_id VARCHAR NOT NULL, "
                    "target_type VARCHAR(10) NOT NULL, "
                    "target_id VARCHAR NOT NULL, "
                    "created_at TIMESTAMPTZ NOT NULL DEFAULT now(), "
                    "UNIQUE(user_id, target_type, target_id))"
                )
            )
            await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_like_user ON post_likes (user_id)"))
            await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_like_target ON post_likes (target_id)"))

            # Migration 006: Provider onboarding + verification tables
            await conn.execute(
                text(
                    "CREATE TABLE IF NOT EXISTS categories ("
                    "id VARCHAR PRIMARY KEY, name VARCHAR(100) UNIQUE NOT NULL, "
                    "slug VARCHAR(100) UNIQUE NOT NULL, parent_id VARCHAR, "
                    "icon VARCHAR(50), description TEXT, "
                    "is_active BOOLEAN DEFAULT true, sort_order INTEGER DEFAULT 0, "
                    "created_at TIMESTAMPTZ DEFAULT now())"
                )
            )
            await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_category_slug ON categories(slug)"))
            await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_category_parent ON categories(parent_id)"))

            await conn.execute(
                text(
                    "CREATE TABLE IF NOT EXISTS provider_profiles ("
                    "id VARCHAR PRIMARY KEY, user_id VARCHAR UNIQUE NOT NULL, "
                    "profile_id VARCHAR UNIQUE NOT NULL, "
                    "headline VARCHAR(200), profession VARCHAR(100), "
                    "years_of_experience INTEGER, service_radius_km INTEGER DEFAULT 25, "
                    "pricing_mode VARCHAR(20) DEFAULT 'quote', "
                    "hourly_rate_min NUMERIC(10,2), hourly_rate_max NUMERIC(10,2), "
                    "currency VARCHAR(3) DEFAULT 'JMD', response_time_hours INTEGER, "
                    "notice_board_enabled BOOLEAN DEFAULT false, is_available BOOLEAN DEFAULT true, "
                    "verification_status VARCHAR(20) DEFAULT 'unverified', "
                    "onboarding_step INTEGER DEFAULT 0, onboarding_completed BOOLEAN DEFAULT false, "
                    "completion_percentage INTEGER DEFAULT 0, "
                    "total_bookings INTEGER DEFAULT 0, completed_bookings INTEGER DEFAULT 0, "
                    "cancellation_count INTEGER DEFAULT 0, "
                    "avg_rating NUMERIC(3,2) DEFAULT 0, review_count INTEGER DEFAULT 0, "
                    "profile_views INTEGER DEFAULT 0, profile_clicks INTEGER DEFAULT 0, "
                    "created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now())"
                )
            )
            await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_pp_user_id ON provider_profiles(user_id)"))
            await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_pp_profession ON provider_profiles(profession)"))
            await conn.execute(
                text("CREATE INDEX IF NOT EXISTS idx_pp_verification ON provider_profiles(verification_status)")
            )

            await conn.execute(
                text(
                    "CREATE TABLE IF NOT EXISTS provider_services ("
                    "id VARCHAR PRIMARY KEY, provider_id VARCHAR NOT NULL, "
                    "category_id VARCHAR NOT NULL, name VARCHAR(200) NOT NULL, "
                    "description TEXT, price_type VARCHAR(20) DEFAULT 'quote', "
                    "price_amount NUMERIC(10,2), currency VARCHAR(3) DEFAULT 'JMD', "
                    "duration_minutes INTEGER, is_active BOOLEAN DEFAULT true, "
                    "sort_order INTEGER DEFAULT 0, "
                    "created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now())"
                )
            )
            await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_ps_provider ON provider_services(provider_id)"))
            await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_ps_category ON provider_services(category_id)"))

            await conn.execute(
                text(
                    "CREATE TABLE IF NOT EXISTS service_packages ("
                    "id VARCHAR PRIMARY KEY, service_id VARCHAR NOT NULL, "
                    "name VARCHAR(200) NOT NULL, description TEXT, "
                    "price NUMERIC(10,2) NOT NULL, currency VARCHAR(3) DEFAULT 'JMD', "
                    "features JSONB DEFAULT '[]', duration_minutes INTEGER, "
                    "is_active BOOLEAN DEFAULT true, sort_order INTEGER DEFAULT 0, "
                    "created_at TIMESTAMPTZ DEFAULT now())"
                )
            )
            await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_sp_service ON service_packages(service_id)"))

            await conn.execute(
                text(
                    "CREATE TABLE IF NOT EXISTS availability_slots ("
                    "id VARCHAR PRIMARY KEY, provider_id VARCHAR NOT NULL, "
                    "day_of_week INTEGER NOT NULL, start_time TIME NOT NULL, "
                    "end_time TIME NOT NULL, is_active BOOLEAN DEFAULT true, "
                    "created_at TIMESTAMPTZ DEFAULT now(), "
                    "UNIQUE(provider_id, day_of_week, start_time))"
                )
            )
            await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_as_provider ON availability_slots(provider_id)"))

            await conn.execute(
                text(
                    "CREATE TABLE IF NOT EXISTS portfolio_items ("
                    "id VARCHAR PRIMARY KEY, provider_id VARCHAR NOT NULL, "
                    "title VARCHAR(200), description TEXT, "
                    "image_url VARCHAR(500) NOT NULL, thumbnail_url VARCHAR(500), "
                    "sort_order INTEGER DEFAULT 0, created_at TIMESTAMPTZ DEFAULT now())"
                )
            )
            await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_pi_provider ON portfolio_items(provider_id)"))

            # Extend existing verification_requests table with new columns
            await conn.execute(text("ALTER TABLE verification_requests ALTER COLUMN submitted_at DROP NOT NULL"))
            await conn.execute(
                text("ALTER TABLE verification_requests ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now()")
            )
            for col, col_type in [
                ("type", "VARCHAR(30) DEFAULT 'photo'"),
                ("reviewer_id", "VARCHAR"),
                ("rejection_reason", "TEXT"),
                ("resubmission_guidance", "TEXT"),
                ("badge_level", "VARCHAR(30)"),
                ("expires_at", "TIMESTAMPTZ"),
                ("updated_at", "TIMESTAMPTZ DEFAULT now()"),
            ]:
                await conn.execute(text(f"ALTER TABLE verification_requests ADD COLUMN IF NOT EXISTS {col} {col_type}"))

            await conn.execute(
                text(
                    "CREATE TABLE IF NOT EXISTS verification_assets ("
                    "id VARCHAR PRIMARY KEY, verification_request_id VARCHAR NOT NULL, "
                    "asset_type VARCHAR(30) NOT NULL, file_url VARCHAR(500) NOT NULL, "
                    "file_key VARCHAR(500), thumbnail_url VARCHAR(500), "
                    "mime_type VARCHAR(50), file_size_bytes INTEGER, "
                    "metadata JSONB, created_at TIMESTAMPTZ DEFAULT now())"
                )
            )
            await conn.execute(
                text("CREATE INDEX IF NOT EXISTS idx_va_request ON verification_assets(verification_request_id)")
            )

            # Migration 007: Phase 2 -- Trust & Safety tables
            await conn.execute(
                text(
                    "CREATE TABLE IF NOT EXISTS reports ("
                    "id VARCHAR PRIMARY KEY, "
                    "reporter_id VARCHAR NOT NULL, "
                    "target_type VARCHAR(30) NOT NULL, "
                    "target_id VARCHAR NOT NULL, "
                    "reason VARCHAR(50) NOT NULL, "
                    "description TEXT, "
                    "evidence_urls JSONB DEFAULT '[]', "
                    "severity VARCHAR(20) DEFAULT 'low', "
                    "status VARCHAR(20) DEFAULT 'pending', "
                    "assigned_to VARCHAR, "
                    "resolution_note TEXT, "
                    "resolved_at TIMESTAMPTZ, "
                    "created_at TIMESTAMPTZ NOT NULL DEFAULT now(), "
                    "updated_at TIMESTAMPTZ NOT NULL DEFAULT now())"
                )
            )
            await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_report_status ON reports(status)"))
            await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_report_target ON reports(target_type, target_id)"))
            await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_report_reporter ON reports(reporter_id)"))
            await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_report_severity ON reports(severity)"))

            await conn.execute(
                text(
                    "CREATE TABLE IF NOT EXISTS suspensions ("
                    "id VARCHAR PRIMARY KEY, "
                    "user_id VARCHAR NOT NULL, "
                    "reason TEXT NOT NULL, "
                    "suspension_type VARCHAR(20) NOT NULL, "
                    "starts_at TIMESTAMPTZ NOT NULL DEFAULT now(), "
                    "ends_at TIMESTAMPTZ, "
                    "issued_by VARCHAR NOT NULL, "
                    "report_id VARCHAR, "
                    "is_active BOOLEAN DEFAULT true, "
                    "created_at TIMESTAMPTZ NOT NULL DEFAULT now())"
                )
            )
            await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_suspension_user ON suspensions(user_id)"))
            await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_suspension_active ON suspensions(is_active)"))

            await conn.execute(
                text(
                    "CREATE TABLE IF NOT EXISTS appeals ("
                    "id VARCHAR PRIMARY KEY, "
                    "suspension_id VARCHAR NOT NULL, "
                    "user_id VARCHAR NOT NULL, "
                    "reason TEXT NOT NULL, "
                    "evidence_urls JSONB DEFAULT '[]', "
                    "status VARCHAR(20) DEFAULT 'pending', "
                    "reviewed_by VARCHAR, "
                    "reviewer_notes TEXT, "
                    "reviewed_at TIMESTAMPTZ, "
                    "created_at TIMESTAMPTZ NOT NULL DEFAULT now())"
                )
            )
            await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_appeal_suspension ON appeals(suspension_id)"))
            await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_appeal_status ON appeals(status)"))

            await conn.execute(
                text(
                    "CREATE TABLE IF NOT EXISTS blocked_users ("
                    "id VARCHAR PRIMARY KEY, "
                    "blocker_id VARCHAR NOT NULL, "
                    "blocked_id VARCHAR NOT NULL, "
                    "created_at TIMESTAMPTZ NOT NULL DEFAULT now(), "
                    "UNIQUE(blocker_id, blocked_id))"
                )
            )
            await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_blocked_blocker ON blocked_users(blocker_id)"))
            await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_blocked_blocked ON blocked_users(blocked_id)"))

            # Migration 008: Phase 2 -- Saved searches table
            await conn.execute(
                text(
                    "CREATE TABLE IF NOT EXISTS saved_searches ("
                    "id VARCHAR PRIMARY KEY, "
                    "user_id VARCHAR NOT NULL, "
                    "name VARCHAR(100), "
                    "query VARCHAR(500), "
                    "filters JSONB DEFAULT '{}', "
                    "notification_enabled BOOLEAN DEFAULT false, "
                    "last_run_at TIMESTAMPTZ, "
                    "result_count INTEGER DEFAULT 0, "
                    "created_at TIMESTAMPTZ NOT NULL DEFAULT now())"
                )
            )
            await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_saved_search_user ON saved_searches(user_id)"))

            # Migration 009: Phase 2 -- Refunds table + transactions columns
            await conn.execute(
                text(
                    "CREATE TABLE IF NOT EXISTS refunds ("
                    "id VARCHAR PRIMARY KEY, "
                    "payment_id VARCHAR NOT NULL, "
                    "booking_id VARCHAR, "
                    "amount NUMERIC(12,2) NOT NULL, "
                    "currency VARCHAR(3) DEFAULT 'JMD', "
                    "reason TEXT, "
                    "status VARCHAR(20) DEFAULT 'pending', "
                    "stripe_refund_id VARCHAR, "
                    "initiated_by VARCHAR NOT NULL, "
                    "processed_at TIMESTAMPTZ, "
                    "created_at TIMESTAMPTZ NOT NULL DEFAULT now())"
                )
            )
            await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_refund_payment ON refunds(payment_id)"))
            await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_refund_booking ON refunds(booking_id)"))
            await conn.execute(text("ALTER TABLE transactions ADD COLUMN IF NOT EXISTS booking_id VARCHAR"))
            await conn.execute(text("ALTER TABLE transactions ADD COLUMN IF NOT EXISTS platform_fee NUMERIC(12,2)"))
            await conn.execute(text("ALTER TABLE transactions ADD COLUMN IF NOT EXISTS provider_payout NUMERIC(12,2)"))
            await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_payment_booking ON transactions(booking_id)"))

            # Migration 010: Phase 2 -- Notification preferences + columns
            await conn.execute(
                text(
                    "CREATE TABLE IF NOT EXISTS notification_preferences ("
                    "id VARCHAR PRIMARY KEY, "
                    "user_id VARCHAR UNIQUE NOT NULL, "
                    "message_push BOOLEAN DEFAULT true, "
                    "message_email BOOLEAN DEFAULT false, "
                    "message_in_app BOOLEAN DEFAULT true, "
                    "booking_push BOOLEAN DEFAULT true, "
                    "booking_email BOOLEAN DEFAULT true, "
                    "booking_in_app BOOLEAN DEFAULT true, "
                    "payment_push BOOLEAN DEFAULT true, "
                    "payment_email BOOLEAN DEFAULT true, "
                    "payment_in_app BOOLEAN DEFAULT true, "
                    "review_push BOOLEAN DEFAULT true, "
                    "review_email BOOLEAN DEFAULT false, "
                    "review_in_app BOOLEAN DEFAULT true, "
                    "verification_push BOOLEAN DEFAULT true, "
                    "verification_email BOOLEAN DEFAULT true, "
                    "verification_in_app BOOLEAN DEFAULT true, "
                    "content_push BOOLEAN DEFAULT false, "
                    "content_email BOOLEAN DEFAULT false, "
                    "content_in_app BOOLEAN DEFAULT true, "
                    "system_push BOOLEAN DEFAULT true, "
                    "system_email BOOLEAN DEFAULT true, "
                    "system_in_app BOOLEAN DEFAULT true, "
                    "quiet_hours_start TIME, "
                    "quiet_hours_end TIME, "
                    "updated_at TIMESTAMPTZ NOT NULL DEFAULT now())"
                )
            )
            await conn.execute(
                text("CREATE INDEX IF NOT EXISTS idx_notif_pref_user ON notification_preferences(user_id)")
            )
            await conn.execute(
                text("ALTER TABLE notification_log ADD COLUMN IF NOT EXISTS email_sent BOOLEAN DEFAULT false")
            )
            await conn.execute(
                text("ALTER TABLE notification_log ADD COLUMN IF NOT EXISTS push_sent BOOLEAN DEFAULT false")
            )

            # Migration 011: Phase 2 -- Review enhancements + reputation metrics
            await conn.execute(text("ALTER TABLE reviews ADD COLUMN IF NOT EXISTS booking_id VARCHAR"))
            await conn.execute(
                text("ALTER TABLE reviews ADD COLUMN IF NOT EXISTS is_verified_purchase BOOLEAN DEFAULT false")
            )
            await conn.execute(
                text("ALTER TABLE reviews ADD COLUMN IF NOT EXISTS moderation_status VARCHAR(20) DEFAULT 'approved'")
            )
            await conn.execute(text("ALTER TABLE reviews ADD COLUMN IF NOT EXISTS moderation_note TEXT"))
            await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_review_booking ON reviews(booking_id)"))
            await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_review_moderation ON reviews(moderation_status)"))
            await conn.execute(
                text(
                    "CREATE TABLE IF NOT EXISTS reputation_metrics ("
                    "id VARCHAR PRIMARY KEY, "
                    "user_id VARCHAR UNIQUE NOT NULL, "
                    "avg_rating NUMERIC(3,2) DEFAULT 0, "
                    "total_reviews INTEGER DEFAULT 0, "
                    "response_rate NUMERIC(5,2) DEFAULT 0, "
                    "completion_rate NUMERIC(5,2) DEFAULT 0, "
                    "cancellation_rate NUMERIC(5,2) DEFAULT 0, "
                    "repeat_hire_rate NUMERIC(5,2) DEFAULT 0, "
                    "on_time_rate NUMERIC(5,2) DEFAULT 0, "
                    "last_calculated_at TIMESTAMPTZ, "
                    "created_at TIMESTAMPTZ NOT NULL DEFAULT now(), "
                    "updated_at TIMESTAMPTZ NOT NULL DEFAULT now())"
                )
            )
            await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_reputation_user ON reputation_metrics(user_id)"))

            # ── Migration 012: Phase 3 -- Advertising expansion ──
            await conn.execute(
                text(
                    "CREATE TABLE IF NOT EXISTS ad_budgets ("
                    "id VARCHAR PRIMARY KEY, "
                    "campaign_id VARCHAR NOT NULL, "
                    "daily_budget NUMERIC(12,2), "
                    "total_budget NUMERIC(12,2), "
                    "daily_spent NUMERIC(12,2) DEFAULT 0, "
                    "total_spent NUMERIC(12,2) DEFAULT 0, "
                    "bid_amount NUMERIC(12,2) DEFAULT 0.50, "
                    "last_reset_date DATE, "
                    "created_at TIMESTAMPTZ NOT NULL DEFAULT now(), "
                    "updated_at TIMESTAMPTZ NOT NULL DEFAULT now())"
                )
            )
            await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_ad_budget_campaign ON ad_budgets(campaign_id)"))
            await conn.execute(
                text(
                    "CREATE TABLE IF NOT EXISTS ad_targeting ("
                    "id VARCHAR PRIMARY KEY, "
                    "campaign_id VARCHAR NOT NULL, "
                    "target_parishes JSONB DEFAULT '[]', "
                    "target_categories JSONB DEFAULT '[]', "
                    "target_age_range JSONB DEFAULT '{}', "
                    "target_user_types JSONB DEFAULT '[]', "
                    "created_at TIMESTAMPTZ NOT NULL DEFAULT now())"
                )
            )
            await conn.execute(
                text("CREATE INDEX IF NOT EXISTS idx_ad_targeting_campaign ON ad_targeting(campaign_id)")
            )
            await conn.execute(
                text(
                    "CREATE TABLE IF NOT EXISTS ad_conversions ("
                    "id VARCHAR PRIMARY KEY, "
                    "campaign_id VARCHAR NOT NULL, "
                    "click_id VARCHAR, "
                    "user_id VARCHAR, "
                    "conversion_type VARCHAR(30) NOT NULL, "
                    "conversion_value NUMERIC(12,2), "
                    "event_metadata JSONB DEFAULT '{}', "
                    "created_at TIMESTAMPTZ NOT NULL DEFAULT now())"
                )
            )
            await conn.execute(
                text("CREATE INDEX IF NOT EXISTS idx_ad_conversion_campaign ON ad_conversions(campaign_id)")
            )
            await conn.execute(
                text("CREATE INDEX IF NOT EXISTS idx_ad_conversion_type ON ad_conversions(conversion_type)")
            )
            await conn.execute(text("ALTER TABLE ad_campaigns ADD COLUMN IF NOT EXISTS daily_budget NUMERIC(12,2)"))
            await conn.execute(text("ALTER TABLE ad_campaigns ADD COLUMN IF NOT EXISTS total_budget NUMERIC(12,2)"))
            await conn.execute(
                text("ALTER TABLE ad_campaigns ADD COLUMN IF NOT EXISTS bid_amount NUMERIC(12,2) DEFAULT 0.50")
            )

            # ── Migration 013: Phase 3 -- Business accounts ──
            await conn.execute(
                text(
                    "CREATE TABLE IF NOT EXISTS business_profiles ("
                    "id VARCHAR PRIMARY KEY, "
                    "user_id VARCHAR NOT NULL, "
                    "business_name VARCHAR(200) NOT NULL, "
                    "registration_number VARCHAR(100), "
                    "address TEXT, "
                    "parish VARCHAR(50), "
                    "contact_email VARCHAR(255), "
                    "contact_phone VARCHAR(30), "
                    "description TEXT, "
                    "logo_url TEXT, "
                    "website VARCHAR(500), "
                    "is_verified BOOLEAN DEFAULT false, "
                    "verified_at TIMESTAMPTZ, "
                    "created_at TIMESTAMPTZ NOT NULL DEFAULT now(), "
                    "updated_at TIMESTAMPTZ NOT NULL DEFAULT now())"
                )
            )
            await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_business_user ON business_profiles(user_id)"))
            await conn.execute(
                text(
                    "CREATE TABLE IF NOT EXISTS business_staff ("
                    "id VARCHAR PRIMARY KEY, "
                    "business_id VARCHAR NOT NULL, "
                    "user_id VARCHAR NOT NULL, "
                    "role VARCHAR(20) NOT NULL DEFAULT 'staff', "
                    "is_active BOOLEAN DEFAULT true, "
                    "invited_at TIMESTAMPTZ NOT NULL DEFAULT now(), "
                    "accepted_at TIMESTAMPTZ, "
                    "created_at TIMESTAMPTZ NOT NULL DEFAULT now(), "
                    "UNIQUE(business_id, user_id))"
                )
            )
            await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_staff_business ON business_staff(business_id)"))
            await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_staff_user ON business_staff(user_id)"))
            await conn.execute(
                text(
                    "CREATE TABLE IF NOT EXISTS business_branches ("
                    "id VARCHAR PRIMARY KEY, "
                    "business_id VARCHAR NOT NULL, "
                    "branch_name VARCHAR(200) NOT NULL, "
                    "address TEXT, "
                    "parish VARCHAR(50), "
                    "phone VARCHAR(30), "
                    "manager_id VARCHAR, "
                    "is_active BOOLEAN DEFAULT true, "
                    "created_at TIMESTAMPTZ NOT NULL DEFAULT now(), "
                    "updated_at TIMESTAMPTZ NOT NULL DEFAULT now())"
                )
            )
            await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_branch_business ON business_branches(business_id)"))

            # ── Migration 014: Phase 3 -- Analytics & event tracking ──
            await conn.execute(
                text(
                    "CREATE TABLE IF NOT EXISTS analytics_events ("
                    "id VARCHAR PRIMARY KEY, "
                    "user_id VARCHAR, "
                    "event_type VARCHAR(50) NOT NULL, "
                    "entity_type VARCHAR(30), "
                    "entity_id VARCHAR, "
                    "properties JSONB DEFAULT '{}', "
                    "session_id VARCHAR, "
                    "ip_address VARCHAR(45), "
                    "user_agent TEXT, "
                    "created_at TIMESTAMPTZ NOT NULL DEFAULT now())"
                )
            )
            await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_analytics_user ON analytics_events(user_id)"))
            await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_analytics_type ON analytics_events(event_type)"))
            await conn.execute(
                text("CREATE INDEX IF NOT EXISTS idx_analytics_entity ON analytics_events(entity_type, entity_id)")
            )
            await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_analytics_created ON analytics_events(created_at)"))
            await conn.execute(
                text(
                    "CREATE TABLE IF NOT EXISTS dashboard_snapshots ("
                    "id VARCHAR PRIMARY KEY, "
                    "user_id VARCHAR NOT NULL, "
                    "snapshot_date DATE NOT NULL, "
                    "profile_views INTEGER DEFAULT 0, "
                    "listing_views INTEGER DEFAULT 0, "
                    "search_appearances INTEGER DEFAULT 0, "
                    "bookings_received INTEGER DEFAULT 0, "
                    "messages_received INTEGER DEFAULT 0, "
                    "total_revenue NUMERIC(12,2) DEFAULT 0, "
                    "created_at TIMESTAMPTZ NOT NULL DEFAULT now(), "
                    "UNIQUE(user_id, snapshot_date))"
                )
            )
            await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_snapshot_user ON dashboard_snapshots(user_id)"))
            await conn.execute(
                text("CREATE INDEX IF NOT EXISTS idx_snapshot_date ON dashboard_snapshots(snapshot_date)")
            )

            # ── Migration 015: Phase 3 -- Admin roles ──
            await conn.execute(
                text(
                    "CREATE TABLE IF NOT EXISTS admin_roles ("
                    "id VARCHAR PRIMARY KEY, "
                    "role_name VARCHAR(50) NOT NULL UNIQUE, "
                    "permissions JSONB DEFAULT '[]', "
                    "description TEXT, "
                    "created_at TIMESTAMPTZ NOT NULL DEFAULT now())"
                )
            )
            await conn.execute(
                text(
                    "CREATE TABLE IF NOT EXISTS admin_role_assignments ("
                    "id VARCHAR PRIMARY KEY, "
                    "user_id VARCHAR NOT NULL, "
                    "role_id VARCHAR NOT NULL, "
                    "assigned_by VARCHAR NOT NULL, "
                    "assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(), "
                    "UNIQUE(user_id, role_id))"
                )
            )
            await conn.execute(
                text("CREATE INDEX IF NOT EXISTS idx_admin_role_user ON admin_role_assignments(user_id)")
            )
            await conn.execute(
                text(
                    "INSERT INTO admin_roles (id, role_name, permissions, description) "
                    "VALUES ('role_super', 'super_admin', '[\"all\"]', 'Full access to everything') "
                    "ON CONFLICT (role_name) DO NOTHING"
                )
            )
            await conn.execute(
                text(
                    "INSERT INTO admin_roles (id, role_name, permissions, description) "
                    "VALUES ('role_mod', 'moderator', "
                    '\'["reports","content","verifications"]\', \'Content and trust moderation\') '
                    "ON CONFLICT (role_name) DO NOTHING"
                )
            )
            await conn.execute(
                text(
                    "INSERT INTO admin_roles (id, role_name, permissions, description) "
                    "VALUES ('role_finance', 'finance', "
                    "'[\"payments\",\"payouts\",\"refunds\"]', "
                    "'Financial operations') "
                    "ON CONFLICT (role_name) DO NOTHING"
                )
            )
            await conn.execute(
                text(
                    "INSERT INTO admin_roles (id, role_name, permissions, description) "
                    "VALUES ('role_support', 'support', '[\"users\",\"bookings\",\"reports\"]', 'Customer support') "
                    "ON CONFLICT (role_name) DO NOTHING"
                )
            )

            # ── Migration 016: Phase 3 -- Profile enhancements ──
            # portfolio_items already exists with provider_id; add user_id, category, is_visible columns
            await conn.execute(text("ALTER TABLE portfolio_items ADD COLUMN IF NOT EXISTS user_id VARCHAR"))
            await conn.execute(text("ALTER TABLE portfolio_items ADD COLUMN IF NOT EXISTS category VARCHAR(100)"))
            await conn.execute(
                text("ALTER TABLE portfolio_items ADD COLUMN IF NOT EXISTS is_visible BOOLEAN DEFAULT true")
            )
            await conn.execute(
                text("ALTER TABLE portfolio_items ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0")
            )
            await conn.execute(text("ALTER TABLE portfolio_items ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ"))
            await conn.execute(
                text(
                    "CREATE TABLE IF NOT EXISTS profile_views ("
                    "id VARCHAR PRIMARY KEY, "
                    "profile_user_id VARCHAR NOT NULL, "
                    "viewer_user_id VARCHAR, "
                    "viewer_ip VARCHAR(45), "
                    "source VARCHAR(50), "
                    "share_link_id VARCHAR, "
                    "created_at TIMESTAMPTZ NOT NULL DEFAULT now())"
                )
            )
            await conn.execute(
                text("CREATE INDEX IF NOT EXISTS idx_profile_view_user ON profile_views(profile_user_id)")
            )
            await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_profile_view_date ON profile_views(created_at)"))
            await conn.execute(text("ALTER TABLE profiles ADD COLUMN IF NOT EXISTS public_url_slug VARCHAR(100)"))
            await conn.execute(
                text("ALTER TABLE profiles ADD COLUMN IF NOT EXISTS portfolio_enabled BOOLEAN DEFAULT false")
            )
            await conn.execute(
                text("ALTER TABLE profiles ADD COLUMN IF NOT EXISTS total_profile_views INTEGER DEFAULT 0")
            )

            # ── Migration 017: Fix portfolio_items NOT NULL constraints ──
            # The original table creation had provider_id and image_url as NOT NULL,
            # but Phase 3 user-based portfolio items don't require these fields.
            await conn.execute(text("ALTER TABLE portfolio_items ALTER COLUMN provider_id DROP NOT NULL"))
            await conn.execute(text("ALTER TABLE portfolio_items ALTER COLUMN image_url DROP NOT NULL"))
            await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_portfolio_user ON portfolio_items(user_id)"))

            # ── Migration 018: Phase 4 -- Bidding & Contracts ──
            await conn.execute(
                text(
                    "CREATE TABLE IF NOT EXISTS job_posts ("
                    "id VARCHAR PRIMARY KEY, "
                    "hirer_id VARCHAR NOT NULL, "
                    "title VARCHAR(200) NOT NULL, "
                    "description TEXT NOT NULL, "
                    "category VARCHAR(100) NOT NULL, "
                    "subcategory VARCHAR(100), "
                    "required_skills JSONB DEFAULT '[]', "
                    "budget_min NUMERIC(12,2), "
                    "budget_max NUMERIC(12,2), "
                    "currency VARCHAR(3) DEFAULT 'JMD', "
                    "location_text VARCHAR(500), "
                    "parish VARCHAR(50), "
                    "latitude NUMERIC, "
                    "longitude NUMERIC, "
                    "deadline TIMESTAMPTZ, "
                    "bid_deadline TIMESTAMPTZ, "
                    "status VARCHAR(30) DEFAULT 'open', "
                    "attachments JSONB DEFAULT '[]', "
                    "visibility VARCHAR(20) DEFAULT 'public', "
                    "max_bids INTEGER, "
                    "created_at TIMESTAMPTZ NOT NULL, "
                    "updated_at TIMESTAMPTZ NOT NULL)"
                )
            )
            await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_jp_hirer ON job_posts(hirer_id)"))
            await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_jp_category ON job_posts(category)"))
            await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_jp_status ON job_posts(status)"))
            await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_jp_parish ON job_posts(parish)"))
            await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_jp_created ON job_posts(created_at)"))
            await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_jp_bid_deadline ON job_posts(bid_deadline)"))

            await conn.execute(
                text(
                    "CREATE TABLE IF NOT EXISTS bids ("
                    "id VARCHAR PRIMARY KEY, "
                    "job_post_id VARCHAR NOT NULL REFERENCES job_posts(id), "
                    "provider_id VARCHAR NOT NULL, "
                    "amount NUMERIC(12,2) NOT NULL, "
                    "currency VARCHAR(3) DEFAULT 'JMD', "
                    "proposal TEXT NOT NULL, "
                    "estimated_duration_days INTEGER, "
                    "available_start_date DATE, "
                    "attachments JSONB DEFAULT '[]', "
                    "status VARCHAR(30) DEFAULT 'submitted', "
                    "is_winner BOOLEAN DEFAULT FALSE, "
                    "hirer_note TEXT, "
                    "created_at TIMESTAMPTZ NOT NULL, "
                    "updated_at TIMESTAMPTZ NOT NULL, "
                    "UNIQUE(job_post_id, provider_id))"
                )
            )
            await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_bid_job ON bids(job_post_id)"))
            await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_bid_provider ON bids(provider_id)"))
            await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_bid_status ON bids(status)"))
            await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_bid_winner ON bids(is_winner)"))

            await conn.execute(
                text(
                    "CREATE TABLE IF NOT EXISTS contracts ("
                    "id VARCHAR PRIMARY KEY, "
                    "job_post_id VARCHAR NOT NULL, "
                    "bid_id VARCHAR NOT NULL, "
                    "hirer_id VARCHAR NOT NULL, "
                    "provider_id VARCHAR NOT NULL, "
                    "title VARCHAR(300) NOT NULL, "
                    "scope_of_work TEXT NOT NULL, "
                    "agreed_amount NUMERIC(12,2) NOT NULL, "
                    "currency VARCHAR(3) DEFAULT 'JMD', "
                    "start_date DATE, "
                    "estimated_end_date DATE, "
                    "location_text VARCHAR(500), "
                    "parish VARCHAR(50), "
                    "terms_and_conditions TEXT NOT NULL, "
                    "status VARCHAR(30) DEFAULT 'pending_signatures', "
                    "contract_pdf_url VARCHAR, "
                    "signed_pdf_url VARCHAR, "
                    "generated_at TIMESTAMPTZ NOT NULL, "
                    "completed_at TIMESTAMPTZ, "
                    "created_at TIMESTAMPTZ NOT NULL, "
                    "updated_at TIMESTAMPTZ NOT NULL)"
                )
            )
            await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_contract_job ON contracts(job_post_id)"))
            await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_contract_bid ON contracts(bid_id)"))
            await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_contract_hirer ON contracts(hirer_id)"))
            await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_contract_provider ON contracts(provider_id)"))
            await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_contract_status ON contracts(status)"))

            await conn.execute(
                text(
                    "CREATE TABLE IF NOT EXISTS contract_signatures ("
                    "id VARCHAR PRIMARY KEY, "
                    "contract_id VARCHAR NOT NULL REFERENCES contracts(id), "
                    "signer_id VARCHAR NOT NULL, "
                    "signer_role VARCHAR(20) NOT NULL, "
                    "signature_data TEXT NOT NULL, "
                    "signature_method VARCHAR(20) DEFAULT 'digital', "
                    "ip_address VARCHAR(45), "
                    "user_agent VARCHAR(500), "
                    "signed_at TIMESTAMPTZ NOT NULL)"
                )
            )
            await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_csig_contract ON contract_signatures(contract_id)"))
            await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_csig_signer ON contract_signatures(signer_id)"))

            # Migration 019: email column on users for password reset fallback
            await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(255)"))
            await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_user_email ON users(email)"))

        logger.info("Database migrations applied successfully")
    except Exception:
        logger.warning("Could not apply migrations on startup -- will retry on next deploy")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events."""
    await init_db()
    await _apply_migrations()
    try:
        app.state.redis = aioredis.from_url(REDIS_URL, decode_responses=True)
    except (ConnectionError, OSError):
        app.state.redis = None
        logger.warning("Redis unavailable, rate limiting disabled")
    app.state.http_client = httpx.AsyncClient(timeout=30.0)
    yield
    await app.state.http_client.aclose()
    if app.state.redis:
        await app.state.redis.close()


ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:8000",
    "http://localhost:19006",
    "http://localhost:19000",
    "http://localhost:8081",
    "exp://localhost:8081",
    "exp://localhost:19000",
    "https://www.jobsyja.com",
    "https://jobsyja.com",
    "http://www.jobsyja.com",
    "http://jobsyja.com",
    "jobsy://",
    "com.jobsy.app://",
]

app = FastAPI(
    title="Jobsy Gateway",
    version="0.1.0",
    description=(
        "Central API gateway for the Jobsy service marketplace. "
        "Handles authentication, rate limiting, and proxies requests "
        "to 14 internal microservices."
    ),
    lifespan=lifespan,
    openapi_tags=[
        {"name": "health", "description": "Health check endpoints"},
        {"name": "auth", "description": "User registration, login, and token refresh"},
        {"name": "proxy", "description": "Proxied routes to internal microservices"},
        {"name": "websocket", "description": "Real-time WebSocket connections"},
        {"name": "metrics", "description": "Prometheus metrics"},
    ],
    docs_url="/docs",
    redoc_url="/redoc",
)
setup_middleware(app, allowed_origins=ALLOWED_ORIGINS)
Instrumentator().instrument(app).expose(app, endpoint="/metrics")


@app.middleware("http")
async def inject_user_context(request: Request, call_next):
    """Extract user ID from JWT and inject X-User-ID header for downstream routes."""
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        from shared.auth import decode_token

        try:
            payload = decode_token(auth_header[7:])
            if payload.get("type") == "access" and payload.get("sub"):
                request.state.user_id = payload["sub"]
                request.state.active_role = payload.get("active_role", payload.get("role", "user"))
                # Inject into mutable headers scope so downstream sees X-User-ID
                raw_headers = list(request.scope["headers"])
                raw_headers.append((b"x-user-id", payload["sub"].encode()))
                request.scope["headers"] = raw_headers
        except Exception:  # noqa: BLE001
            logger.debug("JWT decode skipped in middleware (invalid or expired token)")
    return await call_next(request)


@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    """Apply rate limiting to all requests."""
    await rate_limit_check(request)
    return await call_next(request)


app.include_router(health_router)
app.include_router(auth_router)
app.include_router(stream_chat_router)
app.include_router(
    bookings_router,
    prefix="/api/bookings",
    tags=["bookings"],
)
app.include_router(
    noticeboard_router,
    prefix="/api/noticeboard",
    tags=["noticeboard"],
)
app.include_router(
    trust_router,
    prefix="/api/trust",
    tags=["trust"],
)
app.include_router(
    business_router,
    prefix="/api/business",
    tags=["business"],
)
app.include_router(
    analytics_router,
    prefix="/api/analytics",
    tags=["analytics"],
)
app.include_router(
    bidding_router,
    prefix="/api/bidding",
    tags=["bidding"],
)
app.include_router(proxy_router)

CHAT_SERVICE_URL = os.getenv("CHAT_SERVICE_URL", "http://chat.railway.internal:8080")


@app.websocket("/ws/chat/{conversation_id}")
async def websocket_chat_proxy(websocket: WebSocket, conversation_id: str):
    """Proxy WebSocket connections to the downstream chat service."""
    from shared.auth import decode_token

    token = websocket.query_params.get("token")
    if not token:
        await websocket.close(code=4001)
        return

    try:
        decode_token(token)
    except Exception:
        await websocket.close(code=4001)
        return

    await websocket.accept()

    # Build the downstream WebSocket URL
    ws_base = CHAT_SERVICE_URL.replace("http://", "ws://").replace("https://", "wss://")
    downstream_url = f"{ws_base}/ws/{conversation_id}?token={token}"

    try:
        async with websockets.connect(downstream_url) as upstream_ws:

            async def client_to_upstream():
                """Forward messages from client to chat service."""
                try:
                    while True:
                        data = await websocket.receive_text()
                        await upstream_ws.send(data)
                except WebSocketDisconnect:
                    await upstream_ws.close()
                except websockets.ConnectionClosed:
                    logger.debug("Upstream WebSocket closed for conversation %s", conversation_id)

            async def upstream_to_client():
                """Forward messages from chat service to client."""
                try:
                    async for message in upstream_ws:
                        await websocket.send_text(message)
                except websockets.ConnectionClosed:
                    await websocket.close()
                except WebSocketDisconnect:
                    logger.debug("Client disconnected during upstream relay for conversation %s", conversation_id)

            client_task = asyncio.create_task(client_to_upstream())
            upstream_task = asyncio.create_task(upstream_to_client())

            done, pending = await asyncio.wait(
                [client_task, upstream_task],
                return_when=asyncio.FIRST_COMPLETED,
            )

            for task in pending:
                task.cancel()

    except (websockets.ConnectionClosed, WebSocketDisconnect):
        logger.debug("WebSocket proxy connection closed for conversation %s", conversation_id)
    except Exception:
        logger.exception("WebSocket proxy error for conversation %s", conversation_id)
    finally:
        with contextlib.suppress(Exception):
            await websocket.close()
