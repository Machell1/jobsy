"""Provider onboarding Pydantic schemas."""

from datetime import datetime, time
from decimal import Decimal

from pydantic import BaseModel, Field


# --- Categories ---


class CategoryResponse(BaseModel):
    id: str
    name: str
    slug: str
    parent_id: str | None = None
    icon: str | None = None
    description: str | None = None
    is_active: bool = True
    sort_order: int = 0
    created_at: datetime

    model_config = {"from_attributes": True}


class CategoryDetailResponse(CategoryResponse):
    provider_count: int = 0


# --- Provider Profile ---


class ProviderProfileCreate(BaseModel):
    headline: str | None = Field(None, max_length=200)
    profession: str | None = Field(None, max_length=100)
    years_of_experience: int | None = None
    service_radius_km: int = 25
    pricing_mode: str = Field(default="quote", pattern=r"^(quote|fixed|hourly|package)$")
    hourly_rate_min: Decimal | None = None
    hourly_rate_max: Decimal | None = None
    currency: str = Field(default="JMD", max_length=3)
    response_time_hours: int | None = None


class ProviderProfileUpdate(BaseModel):
    headline: str | None = Field(None, max_length=200)
    profession: str | None = Field(None, max_length=100)
    years_of_experience: int | None = None
    service_radius_km: int | None = None
    pricing_mode: str | None = Field(None, pattern=r"^(quote|fixed|hourly|package)$")
    hourly_rate_min: Decimal | None = None
    hourly_rate_max: Decimal | None = None
    currency: str | None = Field(None, max_length=3)
    response_time_hours: int | None = None
    notice_board_enabled: bool | None = None
    is_available: bool | None = None


class OnboardingStepUpdate(BaseModel):
    onboarding_step: int


class ProviderProfileResponse(BaseModel):
    id: str
    user_id: str
    profile_id: str
    headline: str | None = None
    profession: str | None = None
    years_of_experience: int | None = None
    service_radius_km: int = 25
    pricing_mode: str = "quote"
    hourly_rate_min: Decimal | None = None
    hourly_rate_max: Decimal | None = None
    currency: str = "JMD"
    response_time_hours: int | None = None
    notice_board_enabled: bool = False
    is_available: bool = True
    verification_status: str = "unverified"
    onboarding_step: int = 0
    onboarding_completed: bool = False
    completion_percentage: int = 0
    total_bookings: int = 0
    completed_bookings: int = 0
    cancellation_count: int = 0
    avg_rating: Decimal = Decimal("0")
    review_count: int = 0
    profile_views: int = 0
    profile_clicks: int = 0
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# --- Provider Services ---


class ProviderServiceCreate(BaseModel):
    category_id: str
    name: str = Field(..., max_length=200)
    description: str | None = None
    price_type: str = Field(default="quote", pattern=r"^(fixed|hourly|quote|package)$")
    price_amount: Decimal | None = None
    currency: str = Field(default="JMD", max_length=3)
    duration_minutes: int | None = None


class ProviderServiceUpdate(BaseModel):
    category_id: str | None = None
    name: str | None = Field(None, max_length=200)
    description: str | None = None
    price_type: str | None = Field(None, pattern=r"^(fixed|hourly|quote|package)$")
    price_amount: Decimal | None = None
    currency: str | None = Field(None, max_length=3)
    duration_minutes: int | None = None
    sort_order: int | None = None


class ProviderServiceResponse(BaseModel):
    id: str
    provider_id: str
    category_id: str
    name: str
    description: str | None = None
    price_type: str = "quote"
    price_amount: Decimal | None = None
    currency: str = "JMD"
    duration_minutes: int | None = None
    is_active: bool = True
    sort_order: int = 0
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# --- Service Packages ---


class ServicePackageCreate(BaseModel):
    name: str = Field(..., max_length=200)
    description: str | None = None
    price: Decimal
    currency: str = Field(default="JMD", max_length=3)
    features: list[str] = Field(default_factory=list)
    duration_minutes: int | None = None


class ServicePackageUpdate(BaseModel):
    name: str | None = Field(None, max_length=200)
    description: str | None = None
    price: Decimal | None = None
    currency: str | None = Field(None, max_length=3)
    features: list[str] | None = None
    duration_minutes: int | None = None
    sort_order: int | None = None


class ServicePackageResponse(BaseModel):
    id: str
    service_id: str
    name: str
    description: str | None = None
    price: Decimal
    currency: str = "JMD"
    features: list[str] = Field(default_factory=list)
    duration_minutes: int | None = None
    is_active: bool = True
    sort_order: int = 0
    created_at: datetime

    model_config = {"from_attributes": True}


# --- Availability ---


class AvailabilitySlotInput(BaseModel):
    day_of_week: int = Field(..., ge=0, le=6)
    start_time: str = Field(..., pattern=r"^\d{2}:\d{2}$")
    end_time: str = Field(..., pattern=r"^\d{2}:\d{2}$")


class AvailabilityBulkUpdate(BaseModel):
    slots: list[AvailabilitySlotInput]


class AvailabilitySlotResponse(BaseModel):
    id: str
    provider_id: str
    day_of_week: int
    start_time: str
    end_time: str
    is_active: bool = True
    created_at: datetime

    model_config = {"from_attributes": True}


# --- Portfolio ---


class PortfolioItemCreate(BaseModel):
    title: str | None = Field(None, max_length=200)
    description: str | None = None
    image_url: str = Field(..., max_length=500)
    thumbnail_url: str | None = Field(None, max_length=500)


class PortfolioItemUpdate(BaseModel):
    title: str | None = Field(None, max_length=200)
    description: str | None = None
    image_url: str | None = Field(None, max_length=500)
    thumbnail_url: str | None = Field(None, max_length=500)
    sort_order: int | None = None


class PortfolioItemResponse(BaseModel):
    id: str
    provider_id: str
    title: str | None = None
    description: str | None = None
    image_url: str
    thumbnail_url: str | None = None
    sort_order: int = 0
    created_at: datetime

    model_config = {"from_attributes": True}
