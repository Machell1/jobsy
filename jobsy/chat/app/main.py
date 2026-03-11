"""Jobsy Chat Service -- real-time messaging for matched users."""

import asyncio
from contextlib import asynccontextmanager, suppress

from fastapi import FastAPI
from fastapi.responses import JSONResponse
from sqlalchemy import text

from shared.database import async_session_factory, init_db
from shared.logging import setup_json_logging
from shared.middleware import setup_middleware

from .consumer import start_consumer
from .routes import router
from .websocket import chat_websocket

setup_json_logging()


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    consumer_task = asyncio.create_task(start_consumer())
    yield
    consumer_task.cancel()
    with suppress(TimeoutError, asyncio.CancelledError):
        await asyncio.wait_for(consumer_task, timeout=5.0)


app = FastAPI(title="Jobsy Chat", version="0.1.0", lifespan=lifespan)
setup_middleware(app)


@app.get("/health")
async def health():
    try:
        async with async_session_factory() as session:
            await session.execute(text("SELECT 1"))
        return {"status": "ok", "service": "chat"}
    except Exception:
        return JSONResponse(
            {"status": "degraded", "service": "chat", "error": "database unavailable"},
            status_code=503,
        )


app.include_router(router)


@app.websocket("/ws/{conversation_id}")
async def websocket_endpoint(websocket, conversation_id: str):
    await chat_websocket(websocket, conversation_id)
