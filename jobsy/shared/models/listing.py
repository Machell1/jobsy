"""Listing-related Pydantic schemas."""

from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, Field


class ListingCreate(BaseModel):
    title: str = Field(..., max_length=200)
    description: str
    category: str = Field(..., max_length=50)
    subcategory: str | None = None
    budget_min: Decimal | None = None
    budget_max: Decimal | None = None
    currency: str = Field(default="JMD", max_length=3)
    latitude: float | None = None
    longitude: float | None = None
    parish: str | None = None
    address_text: str | None = None


class ListingUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    category: str | None = None
    budget_min: Decimal | None = None
    budget_max: Decimal | None = None
    status: str | None = None


class ListingResponse(BaseModel):
    id: str
    poster_id: str
    title: str
    description: str
    category: str
    subcategory: str | None
    budget_min: Decimal | None
    budget_max: Decimal | None
    currency: str
    latitude: float | None = None
    longitude: float | None = None
    geohash: str | None = None
    parish: str | None
    address_text: str | None
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}
