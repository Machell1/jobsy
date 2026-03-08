"""Swipe-related Pydantic schemas."""

from datetime import datetime

from pydantic import BaseModel, Field


class SwipeCreate(BaseModel):
    target_id: str
    target_type: str = Field(..., pattern=r"^(listing|profile)$")
    direction: str = Field(..., pattern=r"^(left|right)$")


class SwipeResponse(BaseModel):
    id: str
    swiper_id: str
    target_id: str
    target_type: str
    direction: str
    created_at: datetime

    model_config = {"from_attributes": True}
