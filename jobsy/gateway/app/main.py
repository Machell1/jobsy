"""Jobsy API Gateway -- entry point for all client requests."""

import asyncio
import contextlib
import logging
import os
from contextlib import asynccontextmanager

import httpx
import redis.asyncio as aioredis
import websockets
from fastapi import FastAPI, Request, WebSocket, WebSocketDisconnect
from prometheus_fastapi_instrumentator import Instrumentator

from shared.config import REDIS_URL
from shared.database import init_db
from shared.logging import setup_json_logging
from shared.middleware import setup_middleware

from .middleware.rate_limit import rate_limit_check
from .routes.auth import router as auth_router
from .routes.health import router as health_router
from .routes.proxy import router as proxy_router
from .routes.stream_chat import router as stream_chat_router

setup_json_logging()
logger = logging.getLogger(__name__)


async def _apply_migrations() -> None:
    """Apply pending DDL migrations idempotently.

    Uses ADD COLUMN IF NOT EXISTS so it is safe to run on every startup.
    """
    from sqlalchemy import text

    from shared.database import engine

    try:
        async with engine.begin() as conn:
            # Migration 002: OAuth + password reset
            await conn.execute(text(
                "ALTER TABLE users ALTER COLUMN phone DROP NOT NULL"
            ))
            await conn.execute(text(
                "ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL"
            ))
            await conn.execute(text(
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS oauth_provider VARCHAR(20)"
            ))
            await conn.execute(text(
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS oauth_id VARCHAR(255)"
            ))
            await conn.execute(text(
                "CREATE TABLE IF NOT EXISTS password_reset_otps ("
                "id SERIAL PRIMARY KEY, phone VARCHAR(20) NOT NULL, "
                "otp_hash VARCHAR(255) NOT NULL, expires_at TIMESTAMPTZ NOT NULL, "
                "used BOOLEAN DEFAULT false, created_at TIMESTAMPTZ DEFAULT now())"
            ))
            # Migration 003: multi-role, social, followers
            await conn.execute(text(
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS roles JSONB DEFAULT '[]'"
            ))
            await conn.execute(text(
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS active_role VARCHAR(20) DEFAULT 'user'"
            ))
            for col in ["is_hirer", "is_advertiser"]:
                await conn.execute(text(
                    f"ALTER TABLE profiles ADD COLUMN IF NOT EXISTS {col} BOOLEAN DEFAULT false"
                ))
            for col in [
                "instagram_url", "twitter_url", "tiktok_url",
                "youtube_url", "linkedin_url", "portfolio_url",
            ]:
                await conn.execute(text(
                    f"ALTER TABLE profiles ADD COLUMN IF NOT EXISTS {col} VARCHAR(500)"
                ))
            for col in ["follower_count", "following_count"]:
                await conn.execute(text(
                    f"ALTER TABLE profiles ADD COLUMN IF NOT EXISTS {col} INTEGER DEFAULT 0"
                ))
            await conn.execute(text(
                "CREATE TABLE IF NOT EXISTS follows ("
                "id VARCHAR PRIMARY KEY, follower_id VARCHAR NOT NULL, "
                "following_id VARCHAR NOT NULL, created_at TIMESTAMPTZ NOT NULL)"
            ))
            await conn.execute(text(
                "CREATE TABLE IF NOT EXISTS user_tags ("
                "id VARCHAR PRIMARY KEY, tagger_id VARCHAR NOT NULL, "
                "tagged_user_id VARCHAR NOT NULL, entity_type VARCHAR(20) NOT NULL, "
                "entity_id VARCHAR NOT NULL, created_at TIMESTAMPTZ NOT NULL)"
            ))
            # Migration 004: bookings service tables
            await conn.execute(text(
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
            ))
            await conn.execute(text(
                "CREATE INDEX IF NOT EXISTS idx_booking_customer ON bookings (customer_id)"
            ))
            await conn.execute(text(
                "CREATE INDEX IF NOT EXISTS idx_booking_provider ON bookings (provider_id)"
            ))
            await conn.execute(text(
                "CREATE INDEX IF NOT EXISTS idx_booking_status ON bookings (status)"
            ))
            await conn.execute(text(
                "CREATE INDEX IF NOT EXISTS idx_booking_created ON bookings (created_at)"
            ))
            await conn.execute(text(
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
            ))
            await conn.execute(text(
                "CREATE INDEX IF NOT EXISTS idx_booking_event_booking ON booking_events (booking_id)"
            ))
            await conn.execute(text(
                "CREATE INDEX IF NOT EXISTS idx_booking_event_created ON booking_events (created_at)"
            ))
            await conn.execute(text(
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
            ))
            await conn.execute(text(
                "CREATE INDEX IF NOT EXISTS idx_quote_booking ON quotes (booking_id)"
            ))
            await conn.execute(text(
                "CREATE INDEX IF NOT EXISTS idx_quote_provider ON quotes (provider_id)"
            ))
            # Migration 005: noticeboard service tables
            await conn.execute(text(
                "CREATE TABLE IF NOT EXISTS notice_boards ("
                "id VARCHAR PRIMARY KEY, "
                "provider_id VARCHAR UNIQUE NOT NULL, "
                "user_id VARCHAR NOT NULL, "
                "is_enabled BOOLEAN DEFAULT true, "
                "post_count INTEGER DEFAULT 0, "
                "follower_count INTEGER DEFAULT 0, "
                "created_at TIMESTAMPTZ NOT NULL DEFAULT now(), "
                "updated_at TIMESTAMPTZ NOT NULL DEFAULT now())"
            ))
            await conn.execute(text(
                "CREATE INDEX IF NOT EXISTS idx_noticeboard_user ON notice_boards (user_id)"
            ))
            await conn.execute(text(
                "CREATE INDEX IF NOT EXISTS idx_noticeboard_provider ON notice_boards (provider_id)"
            ))
            await conn.execute(text(
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
            ))
            await conn.execute(text(
                "CREATE INDEX IF NOT EXISTS idx_post_noticeboard ON posts (notice_board_id)"
            ))
            await conn.execute(text(
                "CREATE INDEX IF NOT EXISTS idx_post_author ON posts (author_id)"
            ))
            await conn.execute(text(
                "CREATE INDEX IF NOT EXISTS idx_post_moderation ON posts (moderation_status)"
            ))
            await conn.execute(text(
                "CREATE INDEX IF NOT EXISTS idx_post_created ON posts (created_at)"
            ))
            await conn.execute(text(
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
            ))
            await conn.execute(text(
                "CREATE INDEX IF NOT EXISTS idx_comment_post ON comments (post_id)"
            ))
            await conn.execute(text(
                "CREATE INDEX IF NOT EXISTS idx_comment_author ON comments (author_id)"
            ))
            await conn.execute(text(
                "CREATE INDEX IF NOT EXISTS idx_comment_moderation ON comments (moderation_status)"
            ))
            await conn.execute(text(
                "CREATE TABLE IF NOT EXISTS post_likes ("
                "id VARCHAR PRIMARY KEY, "
                "user_id VARCHAR NOT NULL, "
                "target_type VARCHAR(10) NOT NULL, "
                "target_id VARCHAR NOT NULL, "
                "created_at TIMESTAMPTZ NOT NULL DEFAULT now(), "
                "UNIQUE(user_id, target_type, target_id))"
            ))
            await conn.execute(text(
                "CREATE INDEX IF NOT EXISTS idx_like_user ON post_likes (user_id)"
            ))
            await conn.execute(text(
                "CREATE INDEX IF NOT EXISTS idx_like_target ON post_likes (target_id)"
            ))

            # Migration 006: Provider onboarding + verification tables
            await conn.execute(text(
                "CREATE TABLE IF NOT EXISTS categories ("
                "id VARCHAR PRIMARY KEY, name VARCHAR(100) UNIQUE NOT NULL, "
                "slug VARCHAR(100) UNIQUE NOT NULL, parent_id VARCHAR, "
                "icon VARCHAR(50), description TEXT, "
                "is_active BOOLEAN DEFAULT true, sort_order INTEGER DEFAULT 0, "
                "created_at TIMESTAMPTZ DEFAULT now())"
            ))
            await conn.execute(text(
                "CREATE INDEX IF NOT EXISTS idx_category_slug ON categories(slug)"
            ))
            await conn.execute(text(
                "CREATE INDEX IF NOT EXISTS idx_category_parent ON categories(parent_id)"
            ))

            await conn.execute(text(
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
            ))
            await conn.execute(text(
                "CREATE INDEX IF NOT EXISTS idx_pp_user_id ON provider_profiles(user_id)"
            ))
            await conn.execute(text(
                "CREATE INDEX IF NOT EXISTS idx_pp_profession ON provider_profiles(profession)"
            ))
            await conn.execute(text(
                "CREATE INDEX IF NOT EXISTS idx_pp_verification ON provider_profiles(verification_status)"
            ))

            await conn.execute(text(
                "CREATE TABLE IF NOT EXISTS provider_services ("
                "id VARCHAR PRIMARY KEY, provider_id VARCHAR NOT NULL, "
                "category_id VARCHAR NOT NULL, name VARCHAR(200) NOT NULL, "
                "description TEXT, price_type VARCHAR(20) DEFAULT 'quote', "
                "price_amount NUMERIC(10,2), currency VARCHAR(3) DEFAULT 'JMD', "
                "duration_minutes INTEGER, is_active BOOLEAN DEFAULT true, "
                "sort_order INTEGER DEFAULT 0, "
                "created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now())"
            ))
            await conn.execute(text(
                "CREATE INDEX IF NOT EXISTS idx_ps_provider ON provider_services(provider_id)"
            ))
            await conn.execute(text(
                "CREATE INDEX IF NOT EXISTS idx_ps_category ON provider_services(category_id)"
            ))

            await conn.execute(text(
                "CREATE TABLE IF NOT EXISTS service_packages ("
                "id VARCHAR PRIMARY KEY, service_id VARCHAR NOT NULL, "
                "name VARCHAR(200) NOT NULL, description TEXT, "
                "price NUMERIC(10,2) NOT NULL, currency VARCHAR(3) DEFAULT 'JMD', "
                "features JSONB DEFAULT '[]', duration_minutes INTEGER, "
                "is_active BOOLEAN DEFAULT true, sort_order INTEGER DEFAULT 0, "
                "created_at TIMESTAMPTZ DEFAULT now())"
            ))
            await conn.execute(text(
                "CREATE INDEX IF NOT EXISTS idx_sp_service ON service_packages(service_id)"
            ))

            await conn.execute(text(
                "CREATE TABLE IF NOT EXISTS availability_slots ("
                "id VARCHAR PRIMARY KEY, provider_id VARCHAR NOT NULL, "
                "day_of_week INTEGER NOT NULL, start_time TIME NOT NULL, "
                "end_time TIME NOT NULL, is_active BOOLEAN DEFAULT true, "
                "created_at TIMESTAMPTZ DEFAULT now(), "
                "UNIQUE(provider_id, day_of_week, start_time))"
            ))
            await conn.execute(text(
                "CREATE INDEX IF NOT EXISTS idx_as_provider ON availability_slots(provider_id)"
            ))

            await conn.execute(text(
                "CREATE TABLE IF NOT EXISTS portfolio_items ("
                "id VARCHAR PRIMARY KEY, provider_id VARCHAR NOT NULL, "
                "title VARCHAR(200), description TEXT, "
                "image_url VARCHAR(500) NOT NULL, thumbnail_url VARCHAR(500), "
                "sort_order INTEGER DEFAULT 0, created_at TIMESTAMPTZ DEFAULT now())"
            ))
            await conn.execute(text(
                "CREATE INDEX IF NOT EXISTS idx_pi_provider ON portfolio_items(provider_id)"
            ))

            # Extend existing verification_requests table with new columns
            await conn.execute(text(
                "ALTER TABLE verification_requests ALTER COLUMN submitted_at DROP NOT NULL"
            ))
            await conn.execute(text(
                "ALTER TABLE verification_requests ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now()"
            ))
            for col, col_type in [
                ("type", "VARCHAR(30) DEFAULT 'photo'"),
                ("reviewer_id", "VARCHAR"),
                ("rejection_reason", "TEXT"),
                ("resubmission_guidance", "TEXT"),
                ("badge_level", "VARCHAR(30)"),
                ("expires_at", "TIMESTAMPTZ"),
                ("updated_at", "TIMESTAMPTZ DEFAULT now()"),
            ]:
                await conn.execute(text(
                    f"ALTER TABLE verification_requests ADD COLUMN IF NOT EXISTS {col} {col_type}"
                ))

            await conn.execute(text(
                "CREATE TABLE IF NOT EXISTS verification_assets ("
                "id VARCHAR PRIMARY KEY, verification_request_id VARCHAR NOT NULL, "
                "asset_type VARCHAR(30) NOT NULL, file_url VARCHAR(500) NOT NULL, "
                "file_key VARCHAR(500), thumbnail_url VARCHAR(500), "
                "mime_type VARCHAR(50), file_size_bytes INTEGER, "
                "metadata JSONB, created_at TIMESTAMPTZ DEFAULT now())"
            ))
            await conn.execute(text(
                "CREATE INDEX IF NOT EXISTS idx_va_request ON verification_assets(verification_request_id)"
            ))
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
async def rate_limit_middleware(request: Request, call_next):
    """Apply rate limiting to all requests."""
    await rate_limit_check(request)
    return await call_next(request)


app.include_router(health_router)
app.include_router(auth_router)
app.include_router(stream_chat_router)
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
