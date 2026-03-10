"""Jobsy Notification Service -- push notifications and notification history."""

import asyncio
import logging
from contextlib import asynccontextmanager, suppress

from fastapi import FastAPI

from shared.database import init_db
from shared.logging import setup_json_logging
from shared.middleware import setup_middleware

from .consumer import start_consumers
from .routes import router

setup_json_logging()


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    consumer_task = asyncio.create_task(start_consumers())
    yield
    consumer_task.cancel()
    with suppress(TimeoutError, asyncio.CancelledError):
        await asyncio.wait_for(consumer_task, timeout=5.0)


app = FastAPI(title="Jobsy Notifications", version="0.1.0", lifespan=lifespan)
setup_middleware(app)
app.include_router(router)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "notifications"}
