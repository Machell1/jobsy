"""Match-related Pydantic schemas."""

from datetime import datetime

from pydantic import BaseModel


class MatchResponse(BaseModel):
    id: str
    user_a_id: str
    user_b_id: str
    listing_id: str | None
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}
