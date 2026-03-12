"""Common FastAPI middleware for CORS, request logging, and error handling."""

import json
import logging
import time
import uuid

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

logger = logging.getLogger(__name__)


def setup_middleware(app: FastAPI, allowed_origins: list[str] | None = None) -> None:
    """Attach standard middleware to a FastAPI app."""
    origins = allowed_origins or ["http://localhost:3000", "http://localhost:8000"]

    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type", "X-Request-ID"],
    )

    @app.middleware("http")
    async def request_logging(request: Request, call_next):
        # Use incoming X-Request-ID for distributed tracing, or generate one
        request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())[:8]
        request.state.request_id = request_id
        start = time.time()
        response = await call_next(request)
        duration_ms = round((time.time() - start) * 1000, 1)
        logger.info(
            json.dumps({
                "event": "request",
                "method": request.method,
                "path": request.url.path,
                "status": response.status_code,
                "duration_ms": duration_ms,
                "request_id": request_id,
            }),
        )
        response.headers["X-Request-ID"] = request_id
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
        return response

    @app.exception_handler(Exception)
    async def global_exception_handler(request: Request, exc: Exception):
        request_id = getattr(request.state, "request_id", "unknown")
        logger.exception(
            json.dumps({
                "event": "unhandled_error",
                "method": request.method,
                "path": request.url.path,
                "request_id": request_id,
                "error": str(exc),
            }),
        )
        return JSONResponse(status_code=500, content={"detail": "Internal server error"})
