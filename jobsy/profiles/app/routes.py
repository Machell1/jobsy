"""Profile service API routes."""

import uuid
from datetime import UTC, datetime
from datetime import time as dt_time
from urllib.parse import quote

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from pydantic import BaseModel
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from shared.database import get_db
from shared.events import publish_event
from shared.geo import encode_geohash, get_parish
from shared.models.provider import (
    AvailabilityBulkUpdate,
    CategoryResponse,
    OnboardingStepUpdate,
    PortfolioItemCreate,
    PortfolioItemResponse,
    PortfolioItemUpdate,
    ProviderProfileCreate,
    ProviderProfileResponse,
    ProviderProfileUpdate,
    ProviderServiceCreate,
    ProviderServiceResponse,
    ProviderServiceUpdate,
    ServicePackageCreate,
    ServicePackageResponse,
    ServicePackageUpdate,
)
from shared.models.verification import (
    VerificationAssetCreate,
    VerificationRequestCreate,
)

from .models import (
    AvailabilitySlot,
    Category,
    Follow,
    PortfolioItem,
    Profile,
    ProfileView,
    ProviderProfile,
    ProviderService,
    ServicePackage,
    UserTag,
    VerificationAsset,
    VerificationRequest,
)
from .schemas import (
    FollowRequest,
    ProfileCreate,
    ProfileResponse,
    ProfileUpdate,
    TagUserRequest,
)

router = APIRouter(tags=["profiles"])


# --- Seed data ---

CATEGORY_SEEDS = [
    "Home Services", "Cleaning", "Beauty & Wellness", "Automotive",
    "Technology", "Tutoring & Education", "Events & Entertainment",
    "Health & Fitness", "Professional Services", "Skilled Trades",
    "Creative Services", "Construction",
]


def _slugify(name: str) -> str:
    return name.lower().replace(" & ", "-").replace(" ", "-")


async def seed_categories(db: AsyncSession) -> None:
    """Insert default categories if table is empty."""
    result = await db.execute(select(func.count()).select_from(Category))
    if result.scalar():
        return
    now = datetime.now(UTC)
    for i, name in enumerate(CATEGORY_SEEDS):
        db.add(Category(
            id=str(uuid.uuid4()),
            name=name,
            slug=_slugify(name),
            is_active=True,
            sort_order=i,
            created_at=now,
        ))
    await db.flush()


def _get_user_id(request: Request) -> str:
    """Extract user ID from gateway-forwarded header."""
    user_id = request.headers.get("X-User-ID")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing user context")
    return user_id


async def _get_provider_profile(user_id: str, db: AsyncSession) -> ProviderProfile:
    """Get the current user's provider profile or raise 404."""
    result = await db.execute(
        select(ProviderProfile).where(ProviderProfile.user_id == user_id)
    )
    pp = result.scalar_one_or_none()
    if not pp:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Provider profile not found")
    return pp


def _calculate_completion(pp: ProviderProfile, has_service: bool, has_availability: bool, has_portfolio: bool) -> int:
    """Calculate completion percentage based on profile fields."""
    checks = [
        pp.headline is not None,
        pp.profession is not None,
        has_service,
        has_availability,
        has_portfolio,
        pp.verification_status != "unverified",
    ]
    filled = sum(checks)
    return min(100, int((filled / 7) * 100))


# ============================================================
# Existing profile endpoints
# ============================================================


@router.get("/me", response_model=ProfileResponse)
async def get_my_profile(request: Request, db: AsyncSession = Depends(get_db)):
    user_id = _get_user_id(request)
    result = await db.execute(select(Profile).where(Profile.user_id == user_id))
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found")
    return profile


@router.put("/me", response_model=ProfileResponse)
async def update_or_create_profile(
    data: ProfileCreate | ProfileUpdate, request: Request, db: AsyncSession = Depends(get_db)
):
    user_id = _get_user_id(request)
    result = await db.execute(select(Profile).where(Profile.user_id == user_id))
    profile = result.scalar_one_or_none()

    now = datetime.now(UTC)
    geohash = None
    parish = data.parish

    if data.latitude is not None and data.longitude is not None:
        geohash = encode_geohash(data.latitude, data.longitude)
        if not parish:
            parish = get_parish(data.latitude, data.longitude)

    if profile:
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(profile, field, value)
        profile.geohash = geohash or profile.geohash
        profile.parish = parish or profile.parish
        profile.updated_at = now
    else:
        profile = Profile(
            id=str(uuid.uuid4()),
            user_id=user_id,
            geohash=geohash,
            parish=parish,
            is_verified=False,
            is_active=True,
            created_at=now,
            updated_at=now,
            **data.model_dump(exclude={"parish"}),
        )
        db.add(profile)

    await db.flush()

    await publish_event("profile.updated", {
        "id": profile.id,
        "user_id": user_id,
        "display_name": profile.display_name,
        "bio": profile.bio,
        "skills": profile.skills,
        "service_category": profile.service_category,
        "latitude": data.latitude,
        "longitude": data.longitude,
        "parish": parish,
    })

    return profile


@router.get("/nearby/search")
async def get_nearby_profiles(
    lat: float,
    lng: float,
    radius_km: float = 25.0,
    category: str | None = None,
    role: str | None = None,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
):
    """Find profiles near a location. Optionally filter by role (provider/hirer/advertiser)."""
    geohash_prefix = encode_geohash(lat, lng, precision=4)
    query = select(Profile).where(
        Profile.geohash.startswith(geohash_prefix),
        Profile.is_active.is_(True),
    )
    if category:
        query = query.where(Profile.service_category == category)
    if role == "provider":
        query = query.where(Profile.is_provider.is_(True))
    elif role == "hirer":
        query = query.where(Profile.is_hirer.is_(True))
    elif role == "advertiser":
        query = query.where(Profile.is_advertiser.is_(True))
    query = query.limit(limit)

    result = await db.execute(query)
    return result.scalars().all()


# --- Social sharing & invite links ---


@router.get("/me/share-links")
async def get_share_links(request: Request, db: AsyncSession = Depends(get_db)):
    """Generate social media share links to invite followers to Jobsy."""
    user_id = _get_user_id(request)
    result = await db.execute(select(Profile).where(Profile.user_id == user_id))
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found")

    profile_url = f"https://www.jobsyja.com/provider.html?user={user_id}"
    invite_text = quote(f"Check out my profile on Jobsy Jamaica! {profile_url}")

    return {
        "profile_url": profile_url,
        "social_links": {
            "instagram": profile.instagram_url,
            "twitter": profile.twitter_url,
            "tiktok": profile.tiktok_url,
            "youtube": profile.youtube_url,
            "linkedin": profile.linkedin_url,
            "portfolio": profile.portfolio_url,
        },
        "invite_links": {
            "twitter": f"https://twitter.com/intent/tweet?text={invite_text}",
            "whatsapp": f"https://wa.me/?text={invite_text}",
            "telegram": f"https://t.me/share/url?url={quote(profile_url)}&text={quote('Follow me on Jobsy Jamaica!')}",
            "linkedin": f"https://www.linkedin.com/sharing/share-offsite/?url={quote(profile_url)}",
        },
    }


# --- Follower System ---


@router.post("/follow", status_code=status.HTTP_201_CREATED)
async def follow_user(data: FollowRequest, request: Request, db: AsyncSession = Depends(get_db)):
    """Follow another user on Jobsy."""
    follower_id = _get_user_id(request)
    following_id = data.user_id

    if follower_id == following_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot follow yourself")

    # Check if already following
    existing = await db.execute(
        select(Follow).where(Follow.follower_id == follower_id, Follow.following_id == following_id)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Already following this user")

    follow = Follow(
        id=str(uuid.uuid4()),
        follower_id=follower_id,
        following_id=following_id,
        created_at=datetime.now(UTC),
    )
    db.add(follow)

    # Update follower counts
    await _update_follower_counts(follower_id, following_id, db)
    await db.flush()

    await publish_event("user.followed", {
        "follower_id": follower_id,
        "following_id": following_id,
    })

    return {"status": "following", "following_id": following_id}


@router.delete("/follow/{target_user_id}", status_code=status.HTTP_200_OK)
async def unfollow_user(target_user_id: str, request: Request, db: AsyncSession = Depends(get_db)):
    """Unfollow a user."""
    follower_id = _get_user_id(request)

    result = await db.execute(
        select(Follow).where(Follow.follower_id == follower_id, Follow.following_id == target_user_id)
    )
    follow = result.scalar_one_or_none()
    if not follow:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not following this user")

    await db.delete(follow)
    await _update_follower_counts(follower_id, target_user_id, db)
    await db.flush()

    return {"status": "unfollowed", "unfollowed_id": target_user_id}


@router.get("/followers/{user_id}")
async def get_followers(
    user_id: str,
    limit: int = Query(default=50, le=100),
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
):
    """Get list of followers for a user."""
    query = (
        select(Follow.follower_id, Follow.created_at)
        .where(Follow.following_id == user_id)
        .order_by(Follow.created_at.desc())
        .offset(offset)
        .limit(limit)
    )
    result = await db.execute(query)
    rows = result.all()
    return [{"user_id": r[0], "followed_at": r[1].isoformat()} for r in rows]


@router.get("/following/{user_id}")
async def get_following(
    user_id: str,
    limit: int = Query(default=50, le=100),
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
):
    """Get list of users this user is following."""
    query = (
        select(Follow.following_id, Follow.created_at)
        .where(Follow.follower_id == user_id)
        .order_by(Follow.created_at.desc())
        .offset(offset)
        .limit(limit)
    )
    result = await db.execute(query)
    rows = result.all()
    return [{"user_id": r[0], "followed_at": r[1].isoformat()} for r in rows]


async def _update_follower_counts(follower_id: str, following_id: str, db: AsyncSession) -> None:
    """Update denormalized follower/following counts on profile."""
    # Update following_count for follower
    follower_profile = await db.execute(select(Profile).where(Profile.user_id == follower_id))
    fp = follower_profile.scalar_one_or_none()
    if fp:
        count_result = await db.execute(
            select(func.count()).where(Follow.follower_id == follower_id)
        )
        fp.following_count = count_result.scalar() or 0

    # Update follower_count for followed user
    following_profile = await db.execute(select(Profile).where(Profile.user_id == following_id))
    fgp = following_profile.scalar_one_or_none()
    if fgp:
        count_result = await db.execute(
            select(func.count()).where(Follow.following_id == following_id)
        )
        fgp.follower_count = count_result.scalar() or 0


# --- User Tagging ---


@router.post("/tag", status_code=status.HTTP_201_CREATED)
async def tag_user(data: TagUserRequest, request: Request, db: AsyncSession = Depends(get_db)):
    """Tag a user (provider) in a listing, review, or post."""
    tagger_id = _get_user_id(request)

    # Verify tagged user exists
    result = await db.execute(
        select(Profile).where(Profile.user_id == data.tagged_user_id, Profile.is_active.is_(True))
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tagged user not found")

    # Check for duplicate tag
    existing = await db.execute(
        select(UserTag).where(
            UserTag.tagger_id == tagger_id,
            UserTag.tagged_user_id == data.tagged_user_id,
            UserTag.entity_type == data.entity_type,
            UserTag.entity_id == data.entity_id,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="User already tagged in this entity")

    tag = UserTag(
        id=str(uuid.uuid4()),
        tagger_id=tagger_id,
        tagged_user_id=data.tagged_user_id,
        entity_type=data.entity_type,
        entity_id=data.entity_id,
        created_at=datetime.now(UTC),
    )
    db.add(tag)
    await db.flush()

    await publish_event("user.tagged", {
        "tagger_id": tagger_id,
        "tagged_user_id": data.tagged_user_id,
        "entity_type": data.entity_type,
        "entity_id": data.entity_id,
    })

    return {"id": tag.id, "tagged_user_id": data.tagged_user_id, "entity_type": data.entity_type}


@router.get("/tags/{user_id}")
async def get_user_tags(
    user_id: str,
    entity_type: str | None = None,
    limit: int = Query(default=50, le=100),
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
):
    """Get all tags for a user (places they've been tagged)."""
    query = select(UserTag).where(UserTag.tagged_user_id == user_id)
    if entity_type:
        query = query.where(UserTag.entity_type == entity_type)
    query = query.order_by(UserTag.created_at.desc()).offset(offset).limit(limit)

    result = await db.execute(query)
    tags = result.scalars().all()
    return [
        {
            "id": t.id,
            "tagger_id": t.tagger_id,
            "entity_type": t.entity_type,
            "entity_id": t.entity_id,
            "created_at": t.created_at.isoformat(),
        }
        for t in tags
    ]


@router.delete("/tag/{tag_id}")
async def remove_tag(tag_id: str, request: Request, db: AsyncSession = Depends(get_db)):
    """Remove a tag (only the tagger or the tagged user can remove)."""
    user_id = _get_user_id(request)

    result = await db.execute(select(UserTag).where(UserTag.id == tag_id))
    tag = result.scalar_one_or_none()
    if not tag:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tag not found")
    if tag.tagger_id != user_id and tag.tagged_user_id != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to remove this tag")

    await db.delete(tag)
    await db.flush()
    return {"status": "removed", "tag_id": tag_id}


# --- Legacy Verification (kept for backward compatibility) ---


class VerificationSubmit(BaseModel):
    document_urls: list[str]


@router.post("/verification/submit", status_code=status.HTTP_201_CREATED)
async def submit_verification(
    data: VerificationSubmit, request: Request, db: AsyncSession = Depends(get_db)
):
    """Submit documents for provider verification (legacy endpoint)."""
    user_id = _get_user_id(request)

    result = await db.execute(
        select(VerificationRequest).where(
            VerificationRequest.user_id == user_id,
            VerificationRequest.status.in_(["pending", "draft", "submitted"]),
        )
    )
    existing = result.scalar_one_or_none()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A pending verification request already exists",
        )

    now = datetime.now(UTC)
    verification = VerificationRequest(
        id=str(uuid.uuid4()),
        user_id=user_id,
        type="photo",
        document_urls=data.document_urls,
        status="submitted",
        submitted_at=now,
        created_at=now,
        updated_at=now,
    )
    db.add(verification)
    await db.flush()

    return {"id": verification.id, "status": verification.status}


@router.get("/verification/status")
async def verification_status(request: Request, db: AsyncSession = Depends(get_db)):
    """Check current verification status."""
    user_id = _get_user_id(request)

    result = await db.execute(
        select(VerificationRequest)
        .where(VerificationRequest.user_id == user_id)
        .order_by(VerificationRequest.created_at.desc())
        .limit(1)
    )
    verification = result.scalar_one_or_none()
    if not verification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No verification request found",
        )

    return {
        "id": verification.id,
        "status": verification.status,
        "submitted_at": verification.submitted_at.isoformat() if verification.submitted_at else None,
        "reviewed_at": verification.reviewed_at.isoformat() if verification.reviewed_at else None,
        "reviewer_notes": verification.reviewer_notes,
    }


# ============================================================
# Categories (public read)
# ============================================================


@router.get("/categories", response_model=list[CategoryResponse])
async def list_categories(db: AsyncSession = Depends(get_db)):
    """List all active categories."""
    await seed_categories(db)
    result = await db.execute(
        select(Category)
        .where(Category.is_active.is_(True))
        .order_by(Category.sort_order)
    )
    return result.scalars().all()


@router.get("/categories/{slug}")
async def get_category_by_slug(slug: str, db: AsyncSession = Depends(get_db)):
    """Get category by slug with provider count."""
    result = await db.execute(select(Category).where(Category.slug == slug))
    cat = result.scalar_one_or_none()
    if not cat:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")

    count_result = await db.execute(
        select(func.count()).select_from(ProviderService)
        .where(ProviderService.category_id == cat.id, ProviderService.is_active.is_(True))
    )
    provider_count = count_result.scalar() or 0

    return {
        "id": cat.id,
        "name": cat.name,
        "slug": cat.slug,
        "parent_id": cat.parent_id,
        "icon": cat.icon,
        "description": cat.description,
        "is_active": cat.is_active,
        "sort_order": cat.sort_order,
        "created_at": cat.created_at.isoformat(),
        "provider_count": provider_count,
    }


# ============================================================
# Provider Profile CRUD
# ============================================================


@router.post("/provider-profile", status_code=status.HTTP_201_CREATED, response_model=ProviderProfileResponse)
async def create_provider_profile(
    data: ProviderProfileCreate, request: Request, db: AsyncSession = Depends(get_db)
):
    """Create provider profile (begins onboarding)."""
    user_id = _get_user_id(request)

    # Check existing
    existing = await db.execute(
        select(ProviderProfile).where(ProviderProfile.user_id == user_id)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Provider profile already exists")

    # Must have a base profile
    profile_result = await db.execute(select(Profile).where(Profile.user_id == user_id))
    profile = profile_result.scalar_one_or_none()
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Base profile not found. Create a profile first.",
        )

    now = datetime.now(UTC)
    pp = ProviderProfile(
        id=str(uuid.uuid4()),
        user_id=user_id,
        profile_id=profile.id,
        created_at=now,
        updated_at=now,
        **data.model_dump(),
    )
    db.add(pp)

    # Mark base profile as provider
    profile.is_provider = True
    profile.updated_at = now

    await db.flush()
    return pp


@router.get("/provider-profile/me", response_model=ProviderProfileResponse)
async def get_my_provider_profile(request: Request, db: AsyncSession = Depends(get_db)):
    """Get current user's provider profile."""
    user_id = _get_user_id(request)
    pp = await _get_provider_profile(user_id, db)
    return pp


@router.put("/provider-profile/me", response_model=ProviderProfileResponse)
async def update_my_provider_profile(
    data: ProviderProfileUpdate, request: Request, db: AsyncSession = Depends(get_db)
):
    """Update provider profile."""
    user_id = _get_user_id(request)
    pp = await _get_provider_profile(user_id, db)

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(pp, field, value)
    pp.updated_at = datetime.now(UTC)

    # Recalculate completion
    svc_result = await db.execute(
        select(func.count()).select_from(ProviderService)
        .where(ProviderService.provider_id == pp.id, ProviderService.is_active.is_(True))
    )
    avail_result = await db.execute(
        select(func.count()).select_from(AvailabilitySlot)
        .where(AvailabilitySlot.provider_id == pp.id, AvailabilitySlot.is_active.is_(True))
    )
    port_result = await db.execute(
        select(func.count()).select_from(PortfolioItem).where(PortfolioItem.provider_id == pp.id)
    )
    pp.completion_percentage = _calculate_completion(
        pp,
        bool(svc_result.scalar()),
        bool(avail_result.scalar()),
        bool(port_result.scalar()),
    )

    await db.flush()
    return pp


@router.get("/provider-profile/{user_id}", response_model=ProviderProfileResponse)
async def get_provider_profile_public(user_id: str, db: AsyncSession = Depends(get_db)):
    """Get a provider's public profile."""
    result = await db.execute(
        select(ProviderProfile).where(ProviderProfile.user_id == user_id)
    )
    pp = result.scalar_one_or_none()
    if not pp:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Provider profile not found")

    # Increment views
    pp.profile_views = (pp.profile_views or 0) + 1
    await db.flush()
    return pp


@router.put("/provider-profile/me/onboarding-step", response_model=ProviderProfileResponse)
async def update_onboarding_step(
    data: OnboardingStepUpdate, request: Request, db: AsyncSession = Depends(get_db)
):
    """Update onboarding progress."""
    user_id = _get_user_id(request)
    pp = await _get_provider_profile(user_id, db)
    pp.onboarding_step = data.onboarding_step
    pp.updated_at = datetime.now(UTC)
    if data.onboarding_step >= 5:
        pp.onboarding_completed = True
    await db.flush()
    return pp


# ============================================================
# Provider Services CRUD
# ============================================================


@router.post("/services", status_code=status.HTTP_201_CREATED, response_model=ProviderServiceResponse)
async def create_service(
    data: ProviderServiceCreate, request: Request, db: AsyncSession = Depends(get_db)
):
    """Create service for current provider."""
    user_id = _get_user_id(request)
    pp = await _get_provider_profile(user_id, db)

    now = datetime.now(UTC)
    svc = ProviderService(
        id=str(uuid.uuid4()),
        provider_id=pp.id,
        created_at=now,
        updated_at=now,
        **data.model_dump(),
    )
    db.add(svc)
    await db.flush()
    return svc


@router.get("/services/mine", response_model=list[ProviderServiceResponse])
async def list_my_services(request: Request, db: AsyncSession = Depends(get_db)):
    """List current provider's services."""
    user_id = _get_user_id(request)
    pp = await _get_provider_profile(user_id, db)
    result = await db.execute(
        select(ProviderService)
        .where(ProviderService.provider_id == pp.id, ProviderService.is_active.is_(True))
        .order_by(ProviderService.sort_order)
    )
    return result.scalars().all()


@router.get("/services/provider/{provider_id}", response_model=list[ProviderServiceResponse])
async def list_provider_services(provider_id: str, db: AsyncSession = Depends(get_db)):
    """List a provider's public services."""
    result = await db.execute(
        select(ProviderService)
        .where(ProviderService.provider_id == provider_id, ProviderService.is_active.is_(True))
        .order_by(ProviderService.sort_order)
    )
    return result.scalars().all()


@router.put("/services/{service_id}", response_model=ProviderServiceResponse)
async def update_service(
    service_id: str, data: ProviderServiceUpdate, request: Request, db: AsyncSession = Depends(get_db)
):
    """Update service."""
    user_id = _get_user_id(request)
    pp = await _get_provider_profile(user_id, db)

    result = await db.execute(
        select(ProviderService).where(
            ProviderService.id == service_id, ProviderService.provider_id == pp.id
        )
    )
    svc = result.scalar_one_or_none()
    if not svc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Service not found")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(svc, field, value)
    svc.updated_at = datetime.now(UTC)
    await db.flush()
    return svc


@router.delete("/services/{service_id}")
async def deactivate_service(
    service_id: str, request: Request, db: AsyncSession = Depends(get_db)
):
    """Deactivate service."""
    user_id = _get_user_id(request)
    pp = await _get_provider_profile(user_id, db)

    result = await db.execute(
        select(ProviderService).where(
            ProviderService.id == service_id, ProviderService.provider_id == pp.id
        )
    )
    svc = result.scalar_one_or_none()
    if not svc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Service not found")

    svc.is_active = False
    svc.updated_at = datetime.now(UTC)
    await db.flush()
    return {"status": "deactivated", "service_id": service_id}


# ============================================================
# Service Packages CRUD
# ============================================================


@router.post(
    "/services/{service_id}/packages",
    status_code=status.HTTP_201_CREATED,
    response_model=ServicePackageResponse,
)
async def create_package(
    service_id: str,
    data: ServicePackageCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Create package for a service."""
    user_id = _get_user_id(request)
    pp = await _get_provider_profile(user_id, db)

    # Verify service belongs to provider
    svc_result = await db.execute(
        select(ProviderService).where(
            ProviderService.id == service_id, ProviderService.provider_id == pp.id
        )
    )
    if not svc_result.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Service not found")

    pkg = ServicePackage(
        id=str(uuid.uuid4()),
        service_id=service_id,
        created_at=datetime.now(UTC),
        **data.model_dump(),
    )
    db.add(pkg)
    await db.flush()
    return pkg


@router.get("/services/{service_id}/packages", response_model=list[ServicePackageResponse])
async def list_packages(service_id: str, db: AsyncSession = Depends(get_db)):
    """List packages for a service."""
    result = await db.execute(
        select(ServicePackage)
        .where(ServicePackage.service_id == service_id, ServicePackage.is_active.is_(True))
        .order_by(ServicePackage.sort_order)
    )
    return result.scalars().all()


@router.put("/packages/{package_id}", response_model=ServicePackageResponse)
async def update_package(
    package_id: str, data: ServicePackageUpdate, request: Request, db: AsyncSession = Depends(get_db)
):
    """Update package."""
    user_id = _get_user_id(request)
    pp = await _get_provider_profile(user_id, db)

    result = await db.execute(select(ServicePackage).where(ServicePackage.id == package_id))
    pkg = result.scalar_one_or_none()
    if not pkg:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Package not found")

    # Verify ownership via service
    svc_result = await db.execute(
        select(ProviderService).where(
            ProviderService.id == pkg.service_id, ProviderService.provider_id == pp.id
        )
    )
    if not svc_result.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your package")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(pkg, field, value)
    await db.flush()
    return pkg


@router.delete("/packages/{package_id}")
async def deactivate_package(
    package_id: str, request: Request, db: AsyncSession = Depends(get_db)
):
    """Deactivate package."""
    user_id = _get_user_id(request)
    pp = await _get_provider_profile(user_id, db)

    result = await db.execute(select(ServicePackage).where(ServicePackage.id == package_id))
    pkg = result.scalar_one_or_none()
    if not pkg:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Package not found")

    svc_result = await db.execute(
        select(ProviderService).where(
            ProviderService.id == pkg.service_id, ProviderService.provider_id == pp.id
        )
    )
    if not svc_result.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your package")

    pkg.is_active = False
    await db.flush()
    return {"status": "deactivated", "package_id": package_id}


# ============================================================
# Availability
# ============================================================


@router.put("/availability")
async def set_availability(
    data: AvailabilityBulkUpdate, request: Request, db: AsyncSession = Depends(get_db)
):
    """Set availability slots (bulk upsert — replaces all existing slots)."""
    user_id = _get_user_id(request)
    pp = await _get_provider_profile(user_id, db)

    # Delete existing slots
    await db.execute(
        delete(AvailabilitySlot).where(AvailabilitySlot.provider_id == pp.id)
    )

    now = datetime.now(UTC)
    slots = []
    for s in data.slots:
        parts_start = s.start_time.split(":")
        parts_end = s.end_time.split(":")
        slot = AvailabilitySlot(
            id=str(uuid.uuid4()),
            provider_id=pp.id,
            day_of_week=s.day_of_week,
            start_time=dt_time(int(parts_start[0]), int(parts_start[1])),
            end_time=dt_time(int(parts_end[0]), int(parts_end[1])),
            is_active=True,
            created_at=now,
        )
        db.add(slot)
        slots.append(slot)

    await db.flush()
    return [
        {
            "id": sl.id,
            "provider_id": sl.provider_id,
            "day_of_week": sl.day_of_week,
            "start_time": sl.start_time.strftime("%H:%M"),
            "end_time": sl.end_time.strftime("%H:%M"),
            "is_active": sl.is_active,
            "created_at": sl.created_at.isoformat(),
        }
        for sl in slots
    ]


@router.get("/availability/me")
async def get_my_availability(request: Request, db: AsyncSession = Depends(get_db)):
    """Get current provider's availability slots."""
    user_id = _get_user_id(request)
    pp = await _get_provider_profile(user_id, db)
    result = await db.execute(
        select(AvailabilitySlot)
        .where(AvailabilitySlot.provider_id == pp.id, AvailabilitySlot.is_active.is_(True))
        .order_by(AvailabilitySlot.day_of_week, AvailabilitySlot.start_time)
    )
    slots = result.scalars().all()
    return [
        {
            "id": sl.id,
            "provider_id": sl.provider_id,
            "day_of_week": sl.day_of_week,
            "start_time": sl.start_time.strftime("%H:%M"),
            "end_time": sl.end_time.strftime("%H:%M"),
            "is_active": sl.is_active,
            "created_at": sl.created_at.isoformat(),
        }
        for sl in slots
    ]


@router.get("/availability/{provider_id}")
async def get_provider_availability(provider_id: str, db: AsyncSession = Depends(get_db)):
    """Get provider's public availability."""
    result = await db.execute(
        select(AvailabilitySlot)
        .where(AvailabilitySlot.provider_id == provider_id, AvailabilitySlot.is_active.is_(True))
        .order_by(AvailabilitySlot.day_of_week, AvailabilitySlot.start_time)
    )
    slots = result.scalars().all()
    return [
        {
            "id": sl.id,
            "provider_id": sl.provider_id,
            "day_of_week": sl.day_of_week,
            "start_time": sl.start_time.strftime("%H:%M"),
            "end_time": sl.end_time.strftime("%H:%M"),
            "is_active": sl.is_active,
            "created_at": sl.created_at.isoformat(),
        }
        for sl in slots
    ]


# ============================================================
# Portfolio
# ============================================================


@router.post("/portfolio", status_code=status.HTTP_201_CREATED, response_model=PortfolioItemResponse)
async def add_portfolio_item(
    data: PortfolioItemCreate, request: Request, db: AsyncSession = Depends(get_db)
):
    """Add portfolio item."""
    user_id = _get_user_id(request)
    pp = await _get_provider_profile(user_id, db)

    item = PortfolioItem(
        id=str(uuid.uuid4()),
        provider_id=pp.id,
        created_at=datetime.now(UTC),
        **data.model_dump(),
    )
    db.add(item)
    await db.flush()
    return item


@router.get("/portfolio/mine", response_model=list[PortfolioItemResponse])
async def list_my_portfolio(request: Request, db: AsyncSession = Depends(get_db)):
    """List current provider's portfolio."""
    user_id = _get_user_id(request)
    pp = await _get_provider_profile(user_id, db)
    result = await db.execute(
        select(PortfolioItem)
        .where(PortfolioItem.provider_id == pp.id)
        .order_by(PortfolioItem.sort_order)
    )
    return result.scalars().all()


@router.get("/portfolio/{provider_id}", response_model=list[PortfolioItemResponse])
async def list_provider_portfolio(provider_id: str, db: AsyncSession = Depends(get_db)):
    """List provider's public portfolio."""
    result = await db.execute(
        select(PortfolioItem)
        .where(PortfolioItem.provider_id == provider_id)
        .order_by(PortfolioItem.sort_order)
    )
    return result.scalars().all()


@router.put("/portfolio/{item_id}", response_model=PortfolioItemResponse)
async def update_portfolio_item(
    item_id: str, data: PortfolioItemUpdate, request: Request, db: AsyncSession = Depends(get_db)
):
    """Update portfolio item."""
    user_id = _get_user_id(request)
    pp = await _get_provider_profile(user_id, db)

    result = await db.execute(
        select(PortfolioItem).where(PortfolioItem.id == item_id, PortfolioItem.provider_id == pp.id)
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Portfolio item not found")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(item, field, value)
    await db.flush()
    return item


@router.delete("/portfolio/{item_id}")
async def delete_portfolio_item(
    item_id: str, request: Request, db: AsyncSession = Depends(get_db)
):
    """Delete portfolio item."""
    user_id = _get_user_id(request)
    pp = await _get_provider_profile(user_id, db)

    result = await db.execute(
        select(PortfolioItem).where(PortfolioItem.id == item_id, PortfolioItem.provider_id == pp.id)
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Portfolio item not found")

    await db.delete(item)
    await db.flush()
    return {"status": "deleted", "item_id": item_id}


# ============================================================
# Verification Pipeline (new structured endpoints)
# ============================================================


@router.post("/verification", status_code=status.HTTP_201_CREATED)
async def create_verification_request(
    data: VerificationRequestCreate, request: Request, db: AsyncSession = Depends(get_db)
):
    """Create a new verification request (draft)."""
    user_id = _get_user_id(request)

    now = datetime.now(UTC)
    vr = VerificationRequest(
        id=str(uuid.uuid4()),
        user_id=user_id,
        type=data.type,
        status="draft",
        created_at=now,
        updated_at=now,
    )
    db.add(vr)
    await db.flush()

    return {
        "id": vr.id,
        "user_id": vr.user_id,
        "type": vr.type,
        "status": vr.status,
        "created_at": vr.created_at.isoformat(),
        "updated_at": vr.updated_at.isoformat(),
        "assets": [],
    }


@router.get("/verification/mine")
async def list_my_verifications(request: Request, db: AsyncSession = Depends(get_db)):
    """List user's verification requests."""
    user_id = _get_user_id(request)
    result = await db.execute(
        select(VerificationRequest)
        .where(VerificationRequest.user_id == user_id)
        .order_by(VerificationRequest.created_at.desc())
    )
    requests = result.scalars().all()

    response = []
    for vr in requests:
        assets_result = await db.execute(
            select(VerificationAsset).where(VerificationAsset.verification_request_id == vr.id)
        )
        assets = assets_result.scalars().all()
        response.append({
            "id": vr.id,
            "user_id": vr.user_id,
            "type": vr.type,
            "status": vr.status,
            "submitted_at": vr.submitted_at.isoformat() if vr.submitted_at else None,
            "reviewed_at": vr.reviewed_at.isoformat() if vr.reviewed_at else None,
            "reviewer_notes": vr.reviewer_notes,
            "rejection_reason": vr.rejection_reason,
            "resubmission_guidance": vr.resubmission_guidance,
            "badge_level": vr.badge_level,
            "created_at": vr.created_at.isoformat(),
            "updated_at": vr.updated_at.isoformat(),
            "assets": [
                {
                    "id": a.id,
                    "verification_request_id": a.verification_request_id,
                    "asset_type": a.asset_type,
                    "file_url": a.file_url,
                    "file_key": a.file_key,
                    "thumbnail_url": a.thumbnail_url,
                    "mime_type": a.mime_type,
                    "file_size_bytes": a.file_size_bytes,
                    "created_at": a.created_at.isoformat(),
                }
                for a in assets
            ],
        })
    return response


@router.get("/verification/{request_id}")
async def get_verification_request(
    request_id: str, request: Request, db: AsyncSession = Depends(get_db)
):
    """Get verification request detail with assets."""
    user_id = _get_user_id(request)

    result = await db.execute(
        select(VerificationRequest).where(
            VerificationRequest.id == request_id, VerificationRequest.user_id == user_id
        )
    )
    vr = result.scalar_one_or_none()
    if not vr:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Verification request not found")

    assets_result = await db.execute(
        select(VerificationAsset).where(VerificationAsset.verification_request_id == vr.id)
    )
    assets = assets_result.scalars().all()

    return {
        "id": vr.id,
        "user_id": vr.user_id,
        "type": vr.type,
        "status": vr.status,
        "submitted_at": vr.submitted_at.isoformat() if vr.submitted_at else None,
        "reviewed_at": vr.reviewed_at.isoformat() if vr.reviewed_at else None,
        "reviewer_notes": vr.reviewer_notes,
        "rejection_reason": vr.rejection_reason,
        "resubmission_guidance": vr.resubmission_guidance,
        "badge_level": vr.badge_level,
        "expires_at": vr.expires_at.isoformat() if vr.expires_at else None,
        "created_at": vr.created_at.isoformat(),
        "updated_at": vr.updated_at.isoformat(),
        "assets": [
            {
                "id": a.id,
                "verification_request_id": a.verification_request_id,
                "asset_type": a.asset_type,
                "file_url": a.file_url,
                "file_key": a.file_key,
                "thumbnail_url": a.thumbnail_url,
                "mime_type": a.mime_type,
                "file_size_bytes": a.file_size_bytes,
                "created_at": a.created_at.isoformat(),
            }
            for a in assets
        ],
    }


@router.post("/verification/{request_id}/assets", status_code=status.HTTP_201_CREATED)
async def add_verification_asset(
    request_id: str, data: VerificationAssetCreate, request: Request, db: AsyncSession = Depends(get_db)
):
    """Upload/add verification asset to a request."""
    user_id = _get_user_id(request)

    result = await db.execute(
        select(VerificationRequest).where(
            VerificationRequest.id == request_id, VerificationRequest.user_id == user_id
        )
    )
    vr = result.scalar_one_or_none()
    if not vr:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Verification request not found")
    if vr.status not in ("draft", "resubmission_requested"):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Cannot add assets in current state")

    asset = VerificationAsset(
        id=str(uuid.uuid4()),
        verification_request_id=request_id,
        created_at=datetime.now(UTC),
        **data.model_dump(),
    )
    db.add(asset)
    await db.flush()

    return {
        "id": asset.id,
        "verification_request_id": asset.verification_request_id,
        "asset_type": asset.asset_type,
        "file_url": asset.file_url,
        "file_key": asset.file_key,
        "thumbnail_url": asset.thumbnail_url,
        "mime_type": asset.mime_type,
        "file_size_bytes": asset.file_size_bytes,
        "created_at": asset.created_at.isoformat(),
    }


@router.post("/verification/{request_id}/submit")
async def submit_verification_request(
    request_id: str, request: Request, db: AsyncSession = Depends(get_db)
):
    """Submit verification request for review."""
    user_id = _get_user_id(request)

    result = await db.execute(
        select(VerificationRequest).where(
            VerificationRequest.id == request_id, VerificationRequest.user_id == user_id
        )
    )
    vr = result.scalar_one_or_none()
    if not vr:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Verification request not found")
    if vr.status != "draft":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"Cannot submit from '{vr.status}' state")

    # Must have at least 1 asset
    asset_count = await db.execute(
        select(func.count()).select_from(VerificationAsset)
        .where(VerificationAsset.verification_request_id == request_id)
    )
    if not asset_count.scalar():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Must have at least 1 asset attached")

    now = datetime.now(UTC)
    vr.status = "submitted"
    vr.submitted_at = now
    vr.updated_at = now
    await db.flush()

    return {
        "id": vr.id,
        "user_id": vr.user_id,
        "type": vr.type,
        "status": vr.status,
        "submitted_at": vr.submitted_at.isoformat(),
        "created_at": vr.created_at.isoformat(),
        "updated_at": vr.updated_at.isoformat(),
    }


@router.post("/verification/{request_id}/resubmit")
async def resubmit_verification(
    request_id: str, request: Request, db: AsyncSession = Depends(get_db)
):
    """Resubmit verification after rejection."""
    user_id = _get_user_id(request)

    result = await db.execute(
        select(VerificationRequest).where(
            VerificationRequest.id == request_id, VerificationRequest.user_id == user_id
        )
    )
    vr = result.scalar_one_or_none()
    if not vr:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Verification request not found")
    if vr.status not in ("rejected", "resubmission_requested"):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Cannot resubmit from '{vr.status}' state",
        )

    now = datetime.now(UTC)
    vr.status = "submitted"
    vr.submitted_at = now
    vr.updated_at = now
    vr.rejection_reason = None
    vr.resubmission_guidance = None
    await db.flush()

    return {
        "id": vr.id,
        "user_id": vr.user_id,
        "type": vr.type,
        "status": vr.status,
        "submitted_at": vr.submitted_at.isoformat(),
        "created_at": vr.created_at.isoformat(),
        "updated_at": vr.updated_at.isoformat(),
    }


# ============================================================
# Phase 3: Portfolio (user-based), Analytics, Public Profile
# ============================================================


class UserPortfolioCreate(BaseModel):
    title: str
    description: str | None = None
    image_url: str | None = None
    category: str | None = None
    display_order: int = 0
    is_visible: bool = True


class UserPortfolioUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    image_url: str | None = None
    category: str | None = None
    display_order: int | None = None
    is_visible: bool | None = None


@router.post("/me/portfolio", status_code=status.HTTP_201_CREATED)
async def add_user_portfolio_item(
    data: UserPortfolioCreate, request: Request, db: AsyncSession = Depends(get_db)
):
    """Add portfolio item for the current user."""
    user_id = _get_user_id(request)
    now = datetime.now(UTC)

    item = PortfolioItem(
        id=str(uuid.uuid4()),
        user_id=user_id,
        title=data.title,
        description=data.description,
        image_url=data.image_url,
        category=data.category,
        display_order=data.display_order,
        is_visible=data.is_visible,
        created_at=now,
        updated_at=now,
    )
    db.add(item)
    await db.flush()

    return {
        "id": item.id,
        "user_id": item.user_id,
        "title": item.title,
        "description": item.description,
        "image_url": item.image_url,
        "category": item.category,
        "display_order": item.display_order,
        "is_visible": item.is_visible,
        "created_at": item.created_at.isoformat(),
    }


@router.get("/me/portfolio")
async def list_user_portfolio(request: Request, db: AsyncSession = Depends(get_db)):
    """List current user's portfolio items."""
    user_id = _get_user_id(request)

    result = await db.execute(
        select(PortfolioItem)
        .where(PortfolioItem.user_id == user_id)
        .order_by(PortfolioItem.display_order)
    )
    items = result.scalars().all()

    return [
        {
            "id": item.id,
            "title": item.title,
            "description": item.description,
            "image_url": item.image_url,
            "category": item.category,
            "display_order": item.display_order,
            "is_visible": item.is_visible,
            "created_at": item.created_at.isoformat(),
        }
        for item in items
    ]


@router.put("/me/portfolio/{item_id}")
async def update_user_portfolio_item(
    item_id: str, data: UserPortfolioUpdate, request: Request, db: AsyncSession = Depends(get_db)
):
    """Update a portfolio item."""
    user_id = _get_user_id(request)

    result = await db.execute(
        select(PortfolioItem).where(PortfolioItem.id == item_id, PortfolioItem.user_id == user_id)
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Portfolio item not found")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(item, field, value)
    item.updated_at = datetime.now(UTC)
    await db.flush()

    return {
        "id": item.id,
        "title": item.title,
        "description": item.description,
        "image_url": item.image_url,
        "category": item.category,
        "display_order": item.display_order,
        "is_visible": item.is_visible,
    }


@router.delete("/me/portfolio/{item_id}")
async def delete_user_portfolio_item(
    item_id: str, request: Request, db: AsyncSession = Depends(get_db)
):
    """Delete a portfolio item."""
    user_id = _get_user_id(request)

    result = await db.execute(
        select(PortfolioItem).where(PortfolioItem.id == item_id, PortfolioItem.user_id == user_id)
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Portfolio item not found")

    await db.delete(item)
    await db.flush()
    return {"status": "deleted", "item_id": item_id}


@router.get("/me/analytics")
async def my_profile_analytics(request: Request, db: AsyncSession = Depends(get_db)):
    """Get profile analytics for the current user."""
    user_id = _get_user_id(request)

    # Total profile views
    views_result = await db.execute(
        select(func.count()).where(ProfileView.profile_user_id == user_id)
    )
    total_views = views_result.scalar() or 0

    # Views last 7 days
    from datetime import timedelta

    week_ago = datetime.now(UTC) - timedelta(days=7)
    recent_views_result = await db.execute(
        select(func.count()).where(
            ProfileView.profile_user_id == user_id,
            ProfileView.created_at >= week_ago,
        )
    )
    recent_views = recent_views_result.scalar() or 0

    # Views last 30 days
    month_ago = datetime.now(UTC) - timedelta(days=30)
    monthly_views_result = await db.execute(
        select(func.count()).where(
            ProfileView.profile_user_id == user_id,
            ProfileView.created_at >= month_ago,
        )
    )
    monthly_views = monthly_views_result.scalar() or 0

    # View sources breakdown
    sources_result = await db.execute(
        select(ProfileView.source, func.count())
        .where(ProfileView.profile_user_id == user_id)
        .group_by(ProfileView.source)
    )
    sources = {row[0] or "unknown": row[1] for row in sources_result.all()}

    # Portfolio item count
    portfolio_result = await db.execute(
        select(func.count()).where(PortfolioItem.user_id == user_id)
    )
    portfolio_count = portfolio_result.scalar() or 0

    return {
        "user_id": user_id,
        "total_views": total_views,
        "views_last_7_days": recent_views,
        "views_last_30_days": monthly_views,
        "view_sources": sources,
        "portfolio_items": portfolio_count,
    }


@router.get("/public/{identifier}")
async def public_profile(identifier: str, request: Request, db: AsyncSession = Depends(get_db)):
    """Public shareable profile page data."""
    # Try slug first, then user_id
    result = await db.execute(
        select(Profile).where(
            Profile.is_active.is_(True),
            (Profile.public_url_slug == identifier) | (Profile.user_id == identifier),
        )
    )
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found")

    # Record the view
    viewer_user_id = request.headers.get("X-User-ID")
    viewer_ip = request.client.host if request.client else None
    source = request.query_params.get("source", "direct")
    share_link_id = request.query_params.get("share_link_id")

    view = ProfileView(
        id=str(uuid.uuid4()),
        profile_user_id=profile.user_id,
        viewer_user_id=viewer_user_id,
        viewer_ip=viewer_ip,
        source=source,
        share_link_id=share_link_id,
        created_at=datetime.now(UTC),
    )
    db.add(view)
    await db.flush()

    # Get public portfolio items
    portfolio_result = await db.execute(
        select(PortfolioItem)
        .where(PortfolioItem.user_id == profile.user_id, PortfolioItem.is_visible.is_(True))
        .order_by(PortfolioItem.display_order)
    )
    portfolio_items = portfolio_result.scalars().all()

    return {
        "user_id": profile.user_id,
        "display_name": profile.display_name,
        "bio": profile.bio,
        "avatar_url": profile.avatar_url,
        "parish": profile.parish,
        "service_category": profile.service_category,
        "skills": profile.skills,
        "is_verified": profile.is_verified,
        "is_provider": profile.is_provider,
        "rating_avg": float(profile.rating_avg) if profile.rating_avg else None,
        "rating_count": profile.rating_count,
        "portfolio": [
            {
                "id": item.id,
                "title": item.title,
                "description": item.description,
                "image_url": item.image_url,
                "category": item.category,
            }
            for item in portfolio_items
        ],
        "social_links": {
            "instagram": profile.instagram_url,
            "twitter": profile.twitter_url,
            "tiktok": profile.tiktok_url,
            "youtube": profile.youtube_url,
            "linkedin": profile.linkedin_url,
        },
    }


@router.post("/me/share-link")
async def generate_share_link(request: Request, db: AsyncSession = Depends(get_db)):
    """Generate a shareable profile link with tracking."""
    user_id = _get_user_id(request)

    result = await db.execute(select(Profile).where(Profile.user_id == user_id))
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found")

    # Generate slug if not present
    if not profile.public_url_slug:
        base_slug = profile.display_name.lower().replace(" ", "-") if profile.display_name else user_id
        base_slug = quote(base_slug, safe="-")
        # Check uniqueness
        check = await db.execute(
            select(func.count()).where(Profile.public_url_slug == base_slug)
        )
        if check.scalar():
            base_slug = f"{base_slug}-{str(uuid.uuid4())[:8]}"
        profile.public_url_slug = base_slug
        profile.updated_at = datetime.now(UTC)
        await db.flush()

    share_link_id = str(uuid.uuid4())[:12]
    identifier = profile.public_url_slug or user_id

    return {
        "share_url": f"/profiles/public/{identifier}?source=share_link&share_link_id={share_link_id}",
        "share_link_id": share_link_id,
        "slug": profile.public_url_slug,
    }


# ============================================================
# Profile delete + catch-all (MUST be last)
# ============================================================


@router.delete("/me", status_code=status.HTTP_200_OK)
async def delete_my_profile(request: Request, db: AsyncSession = Depends(get_db)):
    """Soft-delete the current user's profile (sets is_active=False)."""
    user_id = _get_user_id(request)
    result = await db.execute(select(Profile).where(Profile.user_id == user_id))
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found")
    profile.is_active = False
    profile.updated_at = datetime.now(UTC)
    await db.flush()
    return {"status": "deleted"}


@router.get("/{user_id}/portfolio")
async def public_user_portfolio(user_id: str, db: AsyncSession = Depends(get_db)):
    """Public: view someone's portfolio items."""
    result = await db.execute(
        select(PortfolioItem)
        .where(PortfolioItem.user_id == user_id, PortfolioItem.is_visible.is_(True))
        .order_by(PortfolioItem.display_order)
    )
    items = result.scalars().all()

    return [
        {
            "id": item.id,
            "title": item.title,
            "description": item.description,
            "image_url": item.image_url,
            "category": item.category,
            "display_order": item.display_order,
            "created_at": item.created_at.isoformat(),
        }
        for item in items
    ]


# NOTE: This catch-all route MUST be declared after all fixed-path routes
@router.get("/{identifier}", response_model=ProfileResponse)
async def get_profile(identifier: str, db: AsyncSession = Depends(get_db)):
    # Try user_id first, then fall back to profile id
    result = await db.execute(
        select(Profile).where(Profile.user_id == identifier, Profile.is_active.is_(True))
    )
    profile = result.scalar_one_or_none()
    if not profile:
        result = await db.execute(
            select(Profile).where(Profile.id == identifier, Profile.is_active.is_(True))
        )
        profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found")
    return profile
