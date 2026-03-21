"""Shared Pydantic schemas for cross-service communication."""

from .event import (  # noqa: F401
    EventCreate,
    EventResponse,
    EventUpdate,
    EventUpdatePost,
    EventUpdateResponse,
)
