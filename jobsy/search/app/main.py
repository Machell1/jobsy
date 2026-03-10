"""Jobsy Search Service -- Elasticsearch-powered full-text search."""

import asyncio
import logging
from contextlib import asynccontextmanager, suppress

from fastapi import FastAPI

from shared.logging import setup_json_logging
from shared.middleware import setup_middleware

from .consumer import start_consumers
from .elasticsearch_client import close_client, ensure_indices
from .routes import router

setup_json_logging()


@asynccontextmanager
async def lifespan(app: FastAPI):
    await ensure_indices()
    consumer_task = asyncio.create_task(start_consumers())
    yield
    consumer_task.cancel()
    with suppress(TimeoutError, asyncio.CancelledError):
        await asyncio.wait_for(consumer_task, timeout=5.0)
    await close_client()


app = FastAPI(title="Jobsy Search", version="0.1.0", lifespan=lifespan)
setup_middleware(app)
app.include_router(router)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "search"}
