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

setup_json_logging()
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events."""
    await init_db()
    try:
        app.state.redis = aioredis.from_url(REDIS_URL, decode_responses=True)
    except Exception:
        app.state.redis = None
        logger.warning("Redis unavailable, rate limiting disabled")
    app.state.http_client = httpx.AsyncClient(timeout=30.0, transport=httpx.AsyncHTTPTransport(local_address="::", retries=1))
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
app.include_router(proxy_router)

CHAT_SERVICE_URL = os.getenv("CHAT_SERVICE_URL", "http://chat:8000")


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
                    pass

            async def upstream_to_client():
                """Forward messages from chat service to client."""
                try:
                    async for message in upstream_ws:
                        await websocket.send_text(message)
                except websockets.ConnectionClosed:
                    await websocket.close()
                except WebSocketDisconnect:
                    pass

            client_task = asyncio.create_task(client_to_upstream())
            upstream_task = asyncio.create_task(upstream_to_client())

            done, pending = await asyncio.wait(
                [client_task, upstream_task],
                return_when=asyncio.FIRST_COMPLETED,
            )

            for task in pending:
                task.cancel()

    except (websockets.ConnectionClosed, WebSocketDisconnect):
        pass
    except Exception:
        logger.exception("WebSocket proxy error for conversation %s", conversation_id)
    finally:
        with contextlib.suppress(Exception):
            await websocket.close()
