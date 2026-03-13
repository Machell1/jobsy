"""Booking-related Pydantic schemas."""

from datetime import date, datetime, time
from decimal import Decimal

from pydantic import BaseModel, Field


class BookingCreate(BaseModel):
    title: str = Field(..., max_length=200)
    description: str | None = None
    provider_id: str
    listing_id: str | None = None
    service_id: str | None = None
    scheduled_date: str | None = None
    scheduled_time_start: str | None = None
    scheduled_time_end: str | None = None
    location_mode: str | None = Field(default="onsite", max_length=20)
    location_text: str | None = Field(default=None, max_length=500)
    parish: str | None = Field(default=None, max_length=50)


class BookingStatusUpdate(BaseModel):
    status: str
    note: str | None = None
    cancellation_reason: str | None = None


class BookingReschedule(BaseModel):
    scheduled_date: str
    scheduled_time_start: str | None = None
    scheduled_time_end: str | None = None
    note: str | None = None


class BookingResponse(BaseModel):
    id: str
    customer_id: str
    provider_id: str
    listing_id: str | None = None
    service_id: str | None = None
    title: str
    description: str | None = None
    status: str
    scheduled_date: date | None = None
    scheduled_time_start: time | None = None
    scheduled_time_end: time | None = None
    location_mode: str | None = None
    location_text: str | None = None
    parish: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    total_amount: Decimal | None = None
    currency: str
    payment_status: str
    cancellation_reason: str | None = None
    cancelled_by: str | None = None
    completed_at: datetime | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class BookingEventResponse(BaseModel):
    id: str
    booking_id: str
    event_type: str
    from_status: str | None = None
    to_status: str | None = None
    actor_id: str
    actor_role: str
    note: str | None = None
    metadata: dict | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class QuoteCreate(BaseModel):
    amount: Decimal = Field(..., gt=0)
    currency: str = Field(default="JMD", max_length=3)
    description: str | None = None
    valid_until: str | None = None


class QuoteResponse(BaseModel):
    id: str
    booking_id: str
    provider_id: str
    amount: Decimal
    currency: str
    description: str | None = None
    valid_until: datetime | None = None
    status: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class QuoteAction(BaseModel):
    action: str = Field(..., pattern="^(accept|reject)$")
