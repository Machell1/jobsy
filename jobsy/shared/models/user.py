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


class OAuthRequest(BaseModel):
    provider: str = Field(..., pattern=r"^(google|apple)$")
    id_token: str = Field(..., min_length=10)
    role: str = Field(default="user", pattern=r"^(user|provider)$")


class ForgotPasswordRequest(BaseModel):
    phone: str = Field(..., pattern=r"^\+1876\d{7}$")


class ResetPasswordRequest(BaseModel):
    phone: str = Field(..., pattern=r"^\+1876\d{7}$")
    otp: str = Field(..., min_length=6, max_length=6)
    new_password: str = Field(..., min_length=8)


class UserResponse(BaseModel):
    id: str
    phone: str | None
    email: str | None
    role: str
    is_verified: bool
    oauth_provider: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"  # noqa: S105
