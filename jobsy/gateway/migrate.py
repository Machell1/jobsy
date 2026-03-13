"""Run pending schema migrations against the production database.

This standalone script applies DDL changes that match the Alembic
migrations without requiring the full Alembic toolchain or all
service model imports.  It is idempotent - safe to run multiple times.

Usage:
    python migrate.py              (uses DATABASE_URL env var)
    railway run --service gateway python migrate.py
"""

import asyncio
import logging
import os
import sys

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
logger = logging.getLogger("migrate")


async def migrate() -> None:
    from sqlalchemy import text
    from sqlalchemy.ext.asyncio import create_async_engine

    url = os.environ.get("DATABASE_URL", "")
    if not url:
        logger.error("DATABASE_URL not set")
        sys.exit(1)

    if url.startswith("postgresql://"):
        url = url.replace("postgresql://", "postgresql+asyncpg://", 1)

    engine = create_async_engine(url)

    async with engine.begin() as conn:
        # ── Migration 002: OAuth + password reset ─────────────────────
        logger.info("Applying migration 002 (OAuth + password reset)...")

        # Make phone and password_hash nullable
        await conn.execute(text("ALTER TABLE users ALTER COLUMN phone DROP NOT NULL"))
        await conn.execute(text("ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL"))

        # Add OAuth columns
        await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS oauth_provider VARCHAR(20)"))
        await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS oauth_id VARCHAR(255)"))

        # Password reset OTPs table
        await conn.execute(
            text("""
            CREATE TABLE IF NOT EXISTS password_reset_otps (
                id SERIAL PRIMARY KEY,
                phone VARCHAR(20) NOT NULL,
                otp_hash VARCHAR(255) NOT NULL,
                expires_at TIMESTAMPTZ NOT NULL,
                used BOOLEAN DEFAULT false,
                created_at TIMESTAMPTZ DEFAULT now()
            )
        """)
        )

        # ── Migration 003: Multi-role, social, followers ──────────────
        logger.info("Applying migration 003 (multi-role, social, followers)...")

        # Users: multi-role support
        await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS roles JSONB DEFAULT '[]'"))
        await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS active_role VARCHAR(20) DEFAULT 'user'"))

        # Profiles: role flags
        for col in ["is_hirer", "is_advertiser"]:
            await conn.execute(text(f"ALTER TABLE profiles ADD COLUMN IF NOT EXISTS {col} BOOLEAN DEFAULT false"))

        # Profiles: social media links
        for col in [
            "instagram_url",
            "twitter_url",
            "tiktok_url",
            "youtube_url",
            "linkedin_url",
            "portfolio_url",
        ]:
            await conn.execute(text(f"ALTER TABLE profiles ADD COLUMN IF NOT EXISTS {col} VARCHAR(500)"))

        # Profiles: follower counts
        for col in ["follower_count", "following_count"]:
            await conn.execute(text(f"ALTER TABLE profiles ADD COLUMN IF NOT EXISTS {col} INTEGER DEFAULT 0"))

        # Follows table
        await conn.execute(
            text("""
            CREATE TABLE IF NOT EXISTS follows (
                id VARCHAR PRIMARY KEY,
                follower_id VARCHAR NOT NULL,
                following_id VARCHAR NOT NULL,
                created_at TIMESTAMPTZ NOT NULL
            )
        """)
        )

        # User tags table
        await conn.execute(
            text("""
            CREATE TABLE IF NOT EXISTS user_tags (
                id VARCHAR PRIMARY KEY,
                tagger_id VARCHAR NOT NULL,
                tagged_user_id VARCHAR NOT NULL,
                entity_type VARCHAR(20) NOT NULL,
                entity_id VARCHAR NOT NULL,
                created_at TIMESTAMPTZ NOT NULL
            )
        """)
        )

        logger.info("All migrations applied successfully")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(migrate())
