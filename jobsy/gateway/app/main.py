"""Jobsy API Gateway -- entry point for all client requests."""

import logging
from contextlib import asynccontextmanager

import redis.asyncio as aioredis
from fastapi import FastAPI

from shared.config import REDIS_URL
from shared.database import init_db
from shared.middleware import setup_middleware

from app.routes.auth import router as auth_router
from app.routes.health import router as health_router
from app.routes.proxy import router as proxy_router

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(name)s %(levelname)s %(message)s")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events."""
    await init_db()
    try:
        app.state.redis = aioredis.from_url(REDIS_URL, decode_responses=True)
    except Exception:
        app.state.redis = None
        logging.warning("Redis unavailable, rate limiting disabled")
    yield
    if app.state.redis:
        await app.state.redis.close()


app = FastAPI(title="Jobsy Gateway", version="0.1.0", lifespan=lifespan)
setup_middleware(app)

app.include_router(health_router)
app.include_router(auth_router)
app.include_router(proxy_router)
