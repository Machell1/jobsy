"""Notice board-related Pydantic schemas."""

from datetime import datetime

from pydantic import BaseModel, Field


class BoardUpdate(BaseModel):
    is_enabled: bool


class BoardResponse(BaseModel):
    id: str
    provider_id: str
    user_id: str
    is_enabled: bool
    post_count: int
    follower_count: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class PostCreate(BaseModel):
    content: str
    media_urls: list[str] | None = None
    media_type: str | None = Field(default=None, max_length=20)
    external_link: str | None = Field(default=None, max_length=500)
    post_type: str = Field(default="standard", max_length=20)
    profession_tag: str | None = Field(default=None, max_length=100)


class PostUpdate(BaseModel):
    content: str | None = None
    media_urls: list[str] | None = None


class PostResponse(BaseModel):
    id: str
    notice_board_id: str
    author_id: str
    content: str
    media_urls: list | None = None
    media_type: str | None = None
    external_link: str | None = None
    post_type: str
    profession_tag: str | None = None
    moderation_status: str
    moderation_note: str | None = None
    like_count: int
    comment_count: int
    is_pinned: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class CommentCreate(BaseModel):
    content: str
    parent_comment_id: str | None = None


class CommentResponse(BaseModel):
    id: str
    post_id: str
    author_id: str
    content: str
    parent_comment_id: str | None = None
    moderation_status: str
    like_count: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class LikeRequest(BaseModel):
    target_type: str = Field(..., pattern="^(post|comment)$")
    target_id: str


class ModerationReview(BaseModel):
    decision: str = Field(..., pattern="^(approve|decline|hide)$")
    moderation_note: str | None = None
