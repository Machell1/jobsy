"""Event-related Pydantic schemas for cross-service communication."""

from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, Field


class EventCreate(BaseModel):
    title: str = Field(..., max_length=300)
    description: str | None = None
    category: str | None = Field(default=None, max_length=50)
    cover_image_url: str | None = Field(default=None, max_length=500)
    cover_video_url: str | None = Field(default=None, max_length=500)
    start_date: str
    end_date: str | None = None
    location_text: str | None = Field(default=None, max_length=500)
    parish: str | None = Field(default=None, max_length=50)
    is_free: bool = True
    ticket_price: Decimal | None = None
    currency: str = Field(default="JMD", max_length=3)
    capacity: int | None = None
    age_restriction: str | None = Field(default=None, max_length=20)
    tags: list[str] | None = None


class EventUpdate(BaseModel):
    title: str | None = Field(default=None, max_length=300)
    description: str | None = None
    category: str | None = Field(default=None, max_length=50)
    cover_image_url: str | None = Field(default=None, max_length=500)
    cover_video_url: str | None = Field(default=None, max_length=500)
    start_date: str | None = None
    end_date: str | None = None
    location_text: str | None = Field(default=None, max_length=500)
    parish: str | None = Field(default=None, max_length=50)
    is_free: bool | None = None
    ticket_price: Decimal | None = None
    capacity: int | None = None
    age_restriction: str | None = Field(default=None, max_length=20)
    tags: list[str] | None = None


class EventResponse(BaseModel):
    id: str
    organizer_id: str
    title: str
    description: str | None = None
    category: str | None = None
    cover_image_url: str | None = None
    cover_video_url: str | None = None
    start_date: datetime
    end_date: datetime | None = None
    location_text: str | None = None
    parish: str | None = None
    is_free: bool
    ticket_price: float | None = None
    currency: str
    capacity: int | None = None
    age_restriction: str | None = None
    is_featured: bool
    status: str
    rsvp_count: int
    ticket_sold_count: int
    tags: list | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class EventUpdatePost(BaseModel):
    content: str


class EventUpdateResponse(BaseModel):
    id: str
    event_id: str
    author_id: str
    content: str
    created_at: datetime

    model_config = {"from_attributes": True}
