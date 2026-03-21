"""Verification pipeline Pydantic schemas."""

from datetime import datetime

from pydantic import BaseModel, Field


class VerificationRequestCreate(BaseModel):
    type: str = Field(
        ...,
        pattern=r"^(photo|government_id|licence|certification|business_registration)$",
    )


class VerificationAssetCreate(BaseModel):
    asset_type: str = Field(
        ...,
        pattern=r"^(selfie|id_front|id_back|licence|certificate|document)$",
    )
    file_url: str = Field(..., max_length=500)
    file_key: str | None = Field(None, max_length=500)
    thumbnail_url: str | None = Field(None, max_length=500)
    mime_type: str | None = Field(None, max_length=50)
    file_size_bytes: int | None = None


class VerificationAssetResponse(BaseModel):
    id: str
    verification_request_id: str
    asset_type: str
    file_url: str
    file_key: str | None = None
    thumbnail_url: str | None = None
    mime_type: str | None = None
    file_size_bytes: int | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class VerificationRequestResponse(BaseModel):
    id: str
    user_id: str
    type: str
    status: str
    submitted_at: datetime | None = None
    reviewed_at: datetime | None = None
    reviewer_notes: str | None = None
    rejection_reason: str | None = None
    resubmission_guidance: str | None = None
    badge_level: str | None = None
    expires_at: datetime | None = None
    created_at: datetime
    updated_at: datetime
    assets: list[VerificationAssetResponse] = Field(default_factory=list)

    model_config = {"from_attributes": True}


class VerificationReviewAction(BaseModel):
    decision: str = Field(
        ...,
        pattern=r"^(approve|reject|request_resubmission)$",
    )
    reviewer_notes: str | None = None
    rejection_reason: str | None = None
    resubmission_guidance: str | None = None
    badge_level: str | None = Field(
        None,
        pattern=r"^(photo_verified|advanced_verified)$",
    )


class VerificationStatsResponse(BaseModel):
    pending_count: int = 0
    approved_today: int = 0
    rejected_today: int = 0
    avg_review_time_hours: float | None = None
