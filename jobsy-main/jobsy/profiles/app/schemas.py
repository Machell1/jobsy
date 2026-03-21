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
    is_hirer: bool = False
    is_advertiser: bool = False
    latitude: float | None = None
    longitude: float | None = None
    parish: str | None = None
    # Social media links
    instagram_url: str | None = None
    twitter_url: str | None = None
    tiktok_url: str | None = None
    youtube_url: str | None = None
    linkedin_url: str | None = None
    portfolio_url: str | None = None


class ProfileUpdate(BaseModel):
    display_name: str | None = None
    bio: str | None = None
    avatar_url: str | None = None
    service_category: str | None = None
    skills: list[str] | None = None
    hourly_rate: Decimal | None = None
    is_provider: bool | None = None
    is_hirer: bool | None = None
    is_advertiser: bool | None = None
    latitude: float | None = None
    longitude: float | None = None
    parish: str | None = None
    # Social media links
    instagram_url: str | None = None
    twitter_url: str | None = None
    tiktok_url: str | None = None
    youtube_url: str | None = None
    linkedin_url: str | None = None
    portfolio_url: str | None = None


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
    is_hirer: bool = False
    is_advertiser: bool = False
    rating_avg: Decimal
    rating_count: int
    is_verified: bool = False
    is_active: bool
    # Social media links
    instagram_url: str | None = None
    twitter_url: str | None = None
    tiktok_url: str | None = None
    youtube_url: str | None = None
    linkedin_url: str | None = None
    portfolio_url: str | None = None
    # Follower stats
    follower_count: int = 0
    following_count: int = 0
    created_at: datetime

    model_config = {"from_attributes": True}


class FollowRequest(BaseModel):
    user_id: str


class TagUserRequest(BaseModel):
    tagged_user_id: str
    entity_type: str = Field(..., pattern=r"^(listing|review|post)$")
    entity_id: str
