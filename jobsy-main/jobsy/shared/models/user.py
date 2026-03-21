"""User-related Pydantic schemas."""

from datetime import datetime

from pydantic import BaseModel, EmailStr, Field

VALID_ROLES = {"user", "provider", "hirer", "advertiser", "admin"}


class UserCreate(BaseModel):
    phone: str = Field(..., pattern=r"^\+1876\d{7}$", description="Jamaican phone number")
    email: EmailStr | None = None
    password: str = Field(..., min_length=8)
    role: str = Field(default="user", pattern=r"^(user|provider|hirer|advertiser)$")
    roles: list[str] = Field(default_factory=lambda: ["user"])
    # Account type: individual (default), organization, school
    account_type: str = Field(default="individual", pattern=r"^(individual|organization|school)$")
    org_name: str | None = Field(default=None, max_length=200)
    org_registration_number: str | None = Field(default=None, max_length=100)
    org_type: str | None = Field(default=None, pattern=r"^(business|NGO|school|government)$")
    org_representative_name: str | None = Field(default=None, max_length=200)
    org_representative_title: str | None = Field(default=None, max_length=100)
    # Optional profile fields - when provided, a Profile is created atomically
    display_name: str | None = None
    parish: str | None = None
    service_category: str | None = None
    bio: str | None = None
    is_provider: bool | None = None


class UserLogin(BaseModel):
    phone: str
    password: str


class OAuthRequest(BaseModel):
    provider: str = Field(..., pattern=r"^(google|apple)$")
    id_token: str = Field(..., min_length=10)
    role: str = Field(default="user", pattern=r"^(user|provider|hirer|advertiser)$")
    roles: list[str] = Field(default_factory=lambda: ["user"])


class ForgotPasswordRequest(BaseModel):
    phone: str = ""
    email: str = ""


class ResetPasswordRequest(BaseModel):
    phone: str = Field(..., pattern=r"^\+1876\d{7}$")
    otp: str = Field(..., min_length=6, max_length=6)
    new_password: str = Field(..., min_length=8)


class AddRoleRequest(BaseModel):
    role: str = Field(..., pattern=r"^(provider|hirer|advertiser)$")


class SwitchRoleRequest(BaseModel):
    role: str = Field(..., pattern=r"^(user|provider|hirer|advertiser|admin)$")


class UserResponse(BaseModel):
    id: str
    phone: str | None
    email: str | None
    role: str
    roles: list[str] = Field(default_factory=list)
    active_role: str = "user"
    is_verified: bool
    email_verified: bool = False
    oauth_provider: str | None = None
    account_type: str = "individual"
    org_name: str | None = None
    org_registration_number: str | None = None
    org_type: str | None = None
    org_representative_name: str | None = None
    org_representative_title: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"  # noqa: S105
    active_role: str = "user"
    roles: list[str] = Field(default_factory=list)
