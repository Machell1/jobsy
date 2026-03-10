"""Pydantic schemas for profile requests and responses."""

from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, Field


class ProfileCreate(BaseModel):
    display_name: str = Field(..., max_length=100)
    bio: str | None = None
    service_category: str | None = None
    skills: list[str] = Field(default_factory=list)
    hourly_rate: Decimal | None = None
    is_provider: bool = False
    latitude: float | None = None
    longitude: float | None = None
    parish: str | None = None


class ProfileUpdate(BaseModel):
    display_name: str | None = None
    bio: str | None = None
    avatar_url: str | None = None
    service_category: str | None = None
    skills: list[str] | None = None
    hourly_rate: Decimal | None = None
    is_provider: bool | None = None
    latitude: float | None = None
    longitude: float | None = None
    parish: str | None = None


class ProfileResponse(BaseModel):
    id: str
    user_id: str
    display_name: str
    bio: str | None
    avatar_url: str | None
    photos: list[str]
    parish: str | None
    service_category: str | None
    skills: list[str]
    hourly_rate: Decimal | None
    is_provider: bool
    rating_avg: Decimal
    rating_count: int
    is_verified: bool = False
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}
