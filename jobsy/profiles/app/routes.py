"""Profile service API routes."""

import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from shared.database import get_db
from shared.events import publish_event
from shared.geo import encode_geohash, get_parish

from .models import Profile
from .schemas import ProfileCreate, ProfileResponse, ProfileUpdate

router = APIRouter(tags=["profiles"])


def _get_user_id(request: Request) -> str:
    """Extract user ID from gateway-forwarded header."""
    user_id = request.headers.get("X-User-ID")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing user context")
    return user_id


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
            created_at=now,
            updated_at=now,
            **data.model_dump(exclude={"parish"}),
        )
        db.add(profile)

    await db.flush()

    await publish_event("profile.updated", {
        "user_id": user_id,
        "latitude": data.latitude,
        "longitude": data.longitude,
        "parish": parish,
        "category": profile.service_category,
    })

    return profile


@router.get("/{user_id}", response_model=ProfileResponse)
async def get_profile(user_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Profile).where(Profile.user_id == user_id, Profile.is_active.is_(True)))
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found")
    return profile


@router.get("/nearby/search")
async def get_nearby_profiles(
    lat: float,
    lng: float,
    radius_km: float = 25.0,
    category: str | None = None,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
):
    """Find profiles near a location. Uses geohash prefix matching for efficiency."""
    geohash_prefix = encode_geohash(lat, lng, precision=4)
    query = select(Profile).where(
        Profile.geohash.startswith(geohash_prefix),
        Profile.is_active.is_(True),
    )
    if category:
        query = query.where(Profile.service_category == category)
    query = query.limit(limit)

    result = await db.execute(query)
    return result.scalars().all()
