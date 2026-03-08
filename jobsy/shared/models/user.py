"""User-related Pydantic schemas."""

from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


class UserCreate(BaseModel):
    phone: str = Field(..., pattern=r"^\+1876\d{7}$", description="Jamaican phone number")
    email: EmailStr | None = None
    password: str = Field(..., min_length=8)
    role: str = Field(default="user", pattern=r"^(user|provider)$")


class UserLogin(BaseModel):
    phone: str
    password: str


class UserResponse(BaseModel):
    id: str
    phone: str
    email: str | None
    role: str
    is_verified: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
