"""Jobsy Listing Service."""

import asyncio
import signal
from contextlib import asynccontextmanager

from fastapi import FastAPI

from shared.database import init_db
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


app = FastAPI(title="Jobsy Listings", version="0.1.0", lifespan=lifespan)
setup_middleware(app)
app.include_router(router)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "listings"}
