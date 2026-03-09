"""Chat-related Pydantic schemas."""

from datetime import datetime

from pydantic import BaseModel


class ConversationResponse(BaseModel):
    id: str
    match_id: str
    other_user_id: str
    created_at: datetime

    model_config = {"from_attributes": True}


class MessageResponse(BaseModel):
    id: str
    sender_id: str
    content: str
    message_type: str
    is_read: bool
    created_at: datetime

    model_config = {"from_attributes": True}
