"""Structured logging utilities for Jobsy microservices."""

import json
import logging
import sys
import time
import uuid
from datetime import datetime, timezone
from typing import Any

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.responses import Response


# ---------------------------------------------------------------------------
# JSON formatter with structured fields
# ---------------------------------------------------------------------------

class StructuredJSONFormatter(logging.Formatter):
    """Emit log records as single-line JSON with standard fields.

    Always-present keys:  timestamp, service, level, message.
    Optional keys (added via ``extra``): request_id, user_id, endpoint, duration_ms.
    """

    def __init__(self, service_name: str = "jobsy") -> None:
        super().__init__()
        self.service_name = service_name

    def format(self, record: logging.LogRecord) -> str:
        entry: dict[str, Any] = {
            "timestamp": datetime.fromtimestamp(record.created, tz=timezone.utc).isoformat(),
            "service": self.service_name,
            "level": record.levelname,
            "message": record.getMessage(),
        }

        # Attach optional structured fields when provided via ``extra``.
        for field in ("request_id", "user_id", "endpoint", "duration_ms"):
            value = getattr(record, field, None)
            if value is not None:
                entry[field] = value

        if record.exc_info and record.exc_info[1]:
            entry["exception"] = self.formatException(record.exc_info)

        return json.dumps(entry, default=str)


# ---------------------------------------------------------------------------
# Logger factory
# ---------------------------------------------------------------------------

def setup_logger(service_name: str, level: int = logging.INFO) -> logging.Logger:
    """Create (or reconfigure) a logger that writes structured JSON to stdout.

    Returns a *named* logger so multiple services in the same process can
    coexist with different service tags.
    """
    logger = logging.getLogger(f"jobsy.{service_name}")
    logger.setLevel(level)

    # Avoid adding duplicate handlers on repeated calls.
    if not logger.handlers:
        handler = logging.StreamHandler(sys.stdout)
        handler.setFormatter(StructuredJSONFormatter(service_name=service_name))
        logger.addHandler(handler)
        logger.propagate = False

    return logger


# ---------------------------------------------------------------------------
# Business event logging
# ---------------------------------------------------------------------------

_VALID_EVENT_TYPES = frozenset(
    {
        "user.registered",
        "job.posted",
        "bid.submitted",
        "contract.signed",
        "payment.completed",
        "dispute.raised",
        "event.created",
    }
)

_biz_logger = setup_logger("business_events")


def log_business_event(
    event_type: str,
    user_id: str,
    details: dict[str, Any] | None = None,
) -> None:
    """Log a standardized business event.

    Parameters
    ----------
    event_type:
        One of the predefined event types (e.g. ``'user.registered'``).
    user_id:
        The user who triggered the event.
    details:
        Arbitrary key-value pairs with event-specific data.
    """
    if event_type not in _VALID_EVENT_TYPES:
        _biz_logger.warning(
            "Unknown business event type: %s (valid: %s)",
            event_type,
            ", ".join(sorted(_VALID_EVENT_TYPES)),
        )

    payload: dict[str, Any] = {
        "event_type": event_type,
        "user_id": user_id,
    }
    if details:
        payload["details"] = details

    _biz_logger.info(
        json.dumps(payload, default=str),
        extra={"user_id": user_id},
    )


# ---------------------------------------------------------------------------
# Request logging middleware
# ---------------------------------------------------------------------------

class RequestLogMiddleware(BaseHTTPMiddleware):
    """FastAPI middleware that logs every HTTP request with structured fields.

    For each request the middleware:
    * Generates a unique ``X-Request-ID`` (or reuses an incoming one).
    * Records method, path, status code, duration, and user_id (if JWT present).
    * Attaches ``X-Request-ID`` to the response headers.
    """

    def __init__(self, app: Any, service_name: str = "gateway") -> None:
        super().__init__(app)
        self.logger = setup_logger(service_name)

    async def dispatch(
        self,
        request: Request,
        call_next: RequestResponseEndpoint,
    ) -> Response:
        request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
        request.state.request_id = request_id

        start = time.monotonic()
        response = await call_next(request)
        duration_ms = round((time.monotonic() - start) * 1000, 2)

        user_id = getattr(request.state, "user_id", None)

        self.logger.info(
            "HTTP %s %s -> %d (%.1fms)",
            request.method,
            request.url.path,
            response.status_code,
            duration_ms,
            extra={
                "request_id": request_id,
                "user_id": user_id,
                "endpoint": request.url.path,
                "duration_ms": duration_ms,
            },
        )

        response.headers["X-Request-ID"] = request_id
        return response
