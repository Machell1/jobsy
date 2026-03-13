"""Jobsy Swipe Service."""

import asyncio
import signal
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.responses import JSONResponse
from sqlalchemy import text

from shared.database import async_session_factory, init_db
from shared.logging import setup_json_logging
from shared.middleware import setup_middleware

from .routes import router

setup_json_logging()


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    shutdown_event = asyncio.Event()
    loop = asyncio.get_running_loop()
    for sig in (signal.SIGTERM, signal.SIGINT):
        loop.add_signal_handler(sig, shutdown_event.set)
    yield


app = FastAPI(title="Jobsy Swipes", version="0.1.0", lifespan=lifespan)
setup_middleware(app)


@app.get("/health")
async def health():
    try:
        async with async_session_factory() as session:
            await session.execute(text("SELECT 1"))
        return {"status": "ok", "service": "swipes"}
    except Exception:
        return JSONResponse(
            {"status": "degraded", "service": "swipes", "error": "database unavailable"},
            status_code=503,
        )


app.include_router(router)
