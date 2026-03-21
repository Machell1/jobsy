"""Jobsy Storage Service -- S3-compatible file storage with thumbnailing."""

import asyncio
import logging
import signal
from contextlib import asynccontextmanager

from fastapi import FastAPI

from shared.logging import setup_json_logging
from shared.middleware import setup_middleware

from .routes import router
from .s3 import ensure_bucket

setup_json_logging()
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        ensure_bucket()
    except Exception:
        logger.warning("Could not ensure S3 bucket exists -- will retry on first upload")
    shutdown_event = asyncio.Event()
    loop = asyncio.get_running_loop()
    for sig in (signal.SIGTERM, signal.SIGINT):
        loop.add_signal_handler(sig, shutdown_event.set)
    yield


app = FastAPI(title="Jobsy Storage", version="0.1.0", lifespan=lifespan)
setup_middleware(app)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "storage"}


app.include_router(router)
