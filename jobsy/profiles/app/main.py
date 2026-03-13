"""Jobsy Profile Service."""

import asyncio
import logging
import signal
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.responses import JSONResponse
from sqlalchemy import text

from shared.database import async_session_factory, engine, init_db
from shared.logging import setup_json_logging
from shared.middleware import setup_middleware

from .routes import router

setup_json_logging()
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()

    # Run column migrations (idempotent)
    try:
        async with engine.begin() as conn:
            migrations = [
                # Phase 3 Profile columns
                "ALTER TABLE profiles ADD COLUMN IF NOT EXISTS public_url_slug VARCHAR(100)",
                "ALTER TABLE profiles ADD COLUMN IF NOT EXISTS portfolio_enabled BOOLEAN DEFAULT false",
                "ALTER TABLE profiles ADD COLUMN IF NOT EXISTS total_profile_views INTEGER DEFAULT 0",
                # Portfolio items columns
                "ALTER TABLE portfolio_items ADD COLUMN IF NOT EXISTS user_id VARCHAR",
                "ALTER TABLE portfolio_items ADD COLUMN IF NOT EXISTS category VARCHAR(100)",
                "ALTER TABLE portfolio_items ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0",
                "ALTER TABLE portfolio_items ADD COLUMN IF NOT EXISTS is_visible BOOLEAN DEFAULT true",
                "ALTER TABLE portfolio_items ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ",
                "ALTER TABLE portfolio_items ALTER COLUMN provider_id DROP NOT NULL",
                "ALTER TABLE portfolio_items ALTER COLUMN image_url DROP NOT NULL",
            ]
            for sql in migrations:
                await conn.execute(text(sql))
    except Exception as e:
        logger.warning(f"Column migration warning (non-fatal): {e}")

    shutdown_event = asyncio.Event()
    loop = asyncio.get_running_loop()
    for sig in (signal.SIGTERM, signal.SIGINT):
        loop.add_signal_handler(sig, shutdown_event.set)
    yield


app = FastAPI(title="Jobsy Profiles", version="0.1.0", lifespan=lifespan)
setup_middleware(app)


@app.get("/health")
async def health():
    try:
        async with async_session_factory() as session:
            await session.execute(text("SELECT 1"))
        return {"status": "ok", "service": "profiles"}
    except Exception:
        return JSONResponse(
            {"status": "degraded", "service": "profiles", "error": "database unavailable"},
            status_code=503,
        )


app.include_router(router)
