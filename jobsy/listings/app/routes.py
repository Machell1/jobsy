"""Listing service API routes."""

import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from shared.database import get_db
from shared.events import publish_event
from shared.geo import encode_geohash, get_parish
from shared.models.listing import ListingCreate, ListingResponse, ListingUpdate

from .models import Listing

router = APIRouter(tags=["listings"])


def _get_user_id(request: Request) -> str:
    user_id = request.headers.get("X-User-ID")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing user context")
    return user_id


@router.post("/", response_model=ListingResponse, status_code=status.HTTP_201_CREATED)
async def create_listing(data: ListingCreate, request: Request, db: AsyncSession = Depends(get_db)):
    user_id = _get_user_id(request)
    now = datetime.now(UTC)

    geohash = None
    parish = data.parish
    if data.latitude is not None and data.longitude is not None:
        geohash = encode_geohash(data.latitude, data.longitude)
        if not parish:
            parish = get_parish(data.latitude, data.longitude)

    listing = Listing(
        id=str(uuid.uuid4()),
        poster_id=user_id,
        geohash=geohash,
        parish=parish,
        created_at=now,
        updated_at=now,
        **data.model_dump(exclude={"latitude", "longitude", "parish"}),
        latitude=data.latitude,
        longitude=data.longitude,
    )
    db.add(listing)
    await db.flush()

    await publish_event("listing.created", {
        "id": listing.id,
        "listing_id": listing.id,
        "poster_id": user_id,
        "title": listing.title,
        "description": listing.description,
        "category": listing.category,
        "budget_min": float(listing.budget_min) if listing.budget_min else None,
        "budget_max": float(listing.budget_max) if listing.budget_max else None,
        "status": listing.status,
        "latitude": data.latitude,
        "longitude": data.longitude,
        "parish": parish,
        "created_at": listing.created_at.isoformat(),
    })

    return listing


@router.get("/", response_model=list[ListingResponse])
async def list_listings(
    category: str | None = None,
    parish: str | None = None,
    status_filter: str = Query(default="active", alias="status"),
    limit: int = Query(default=20, le=100),
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
):
    query = select(Listing).where(Listing.status == status_filter)
    if category:
        query = query.where(Listing.category == category)
    if parish:
        query = query.where(Listing.parish == parish)
    query = query.order_by(Listing.created_at.desc()).offset(offset).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/feed", response_model=list[ListingResponse])
async def listing_feed(
    request: Request,
    limit: int = Query(default=20, le=50),
    db: AsyncSession = Depends(get_db),
):
    """Get a batch of active listings for the swipe feed."""
    _get_user_id(request)
    query = (
        select(Listing)
        .where(Listing.status == "active")
        .order_by(Listing.created_at.desc())
        .limit(limit)
    )
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/{listing_id}", response_model=ListingResponse)
async def get_listing(listing_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Listing).where(Listing.id == listing_id))
    listing = result.scalar_one_or_none()
    if not listing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Listing not found")
    return listing


@router.put("/{listing_id}", response_model=ListingResponse)
async def update_listing(
    listing_id: str, data: ListingUpdate, request: Request, db: AsyncSession = Depends(get_db)
):
    user_id = _get_user_id(request)
    result = await db.execute(select(Listing).where(Listing.id == listing_id))
    listing = result.scalar_one_or_none()
    if not listing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Listing not found")
    if listing.poster_id != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not the listing owner")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(listing, field, value)
    listing.updated_at = datetime.now(UTC)
    await db.flush()

    await publish_event("listing.updated", {
        "id": listing.id,
        "listing_id": listing.id,
        "poster_id": listing.poster_id,
        "title": listing.title,
        "description": listing.description,
        "category": listing.category,
        "budget_min": float(listing.budget_min) if listing.budget_min else None,
        "budget_max": float(listing.budget_max) if listing.budget_max else None,
        "status": listing.status,
        "latitude": float(listing.latitude) if listing.latitude else None,
        "longitude": float(listing.longitude) if listing.longitude else None,
        "parish": listing.parish,
        "created_at": listing.created_at.isoformat(),
    })

    return listing


@router.delete("/{listing_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_listing(listing_id: str, request: Request, db: AsyncSession = Depends(get_db)):
    user_id = _get_user_id(request)
    result = await db.execute(select(Listing).where(Listing.id == listing_id))
    listing = result.scalar_one_or_none()
    if not listing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Listing not found")
    if listing.poster_id != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not the listing owner")

    listing.status = "cancelled"
    listing.updated_at = datetime.now(UTC)
    await db.flush()

    await publish_event("listing.cancelled", {
        "id": listing.id,
        "listing_id": listing.id,
        "poster_id": listing.poster_id,
    })
