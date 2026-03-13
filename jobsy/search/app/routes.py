"""Search service API routes -- full-text search for listings and profiles."""

import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from shared.database import get_db

from .elasticsearch_client import search_listings, search_profiles
from .models import SavedSearch

router = APIRouter(tags=["search"])


def _get_user_id(request: Request) -> str:
    user_id = request.headers.get("X-User-ID")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing user context")
    return user_id


@router.get("/listings")
async def search_listings_endpoint(
    request: Request,
    q: str = Query(default="", description="Search query"),
    parish: str | None = None,
    category: str | None = None,
    listing_type: str | None = None,
    lat: float | None = None,
    lon: float | None = None,
    radius_km: float = Query(default=25.0, le=100.0),
    min_price: float | None = None,
    max_price: float | None = None,
    min_rating: float | None = None,
    max_rating: float | None = None,
    verified_only: bool = False,
    available_date: str | None = None,
    sort_by: str | None = Query(
        default=None,
        pattern=r"^(relevance|price_low|price_high|rating|distance|newest)$",
    ),
    sponsored_first: bool = False,
    limit: int = Query(default=20, le=100),
    offset: int = 0,
):
    """Search service listings with full-text, geo, and facet filtering."""
    results = await search_listings(
        query=q,
        parish=parish,
        category=category,
        listing_type=listing_type,
        lat=lat,
        lon=lon,
        radius_km=radius_km,
        limit=limit,
        offset=offset,
    )

    hits = results.get("hits", [])

    # Apply additional filters on the result set
    if min_price is not None:
        hits = [h for h in hits if (h.get("price") or 0) >= min_price]
    if max_price is not None:
        hits = [h for h in hits if (h.get("price") or 0) <= max_price]
    if min_rating is not None:
        hits = [h for h in hits if (h.get("rating") or 0) >= min_rating]
    if max_rating is not None:
        hits = [h for h in hits if (h.get("rating") or 0) <= max_rating]
    if verified_only:
        hits = [h for h in hits if h.get("is_verified")]
    if available_date:
        hits = [h for h in hits if not h.get("available_date") or h.get("available_date") <= available_date]

    # Sort
    if sort_by == "price_low":
        hits.sort(key=lambda h: h.get("price") or 0)
    elif sort_by == "price_high":
        hits.sort(key=lambda h: h.get("price") or 0, reverse=True)
    elif sort_by == "rating":
        hits.sort(key=lambda h: h.get("rating") or 0, reverse=True)
    elif sort_by == "newest":
        hits.sort(key=lambda h: h.get("created_at") or "", reverse=True)

    # Sponsored first
    if sponsored_first:
        sponsored = [h for h in hits if h.get("is_sponsored")]
        regular = [h for h in hits if not h.get("is_sponsored")]
        hits = sponsored + regular

    results["hits"] = hits
    return results


@router.get("/profiles")
async def search_profiles_endpoint(
    request: Request,
    q: str = Query(default="", description="Search query"),
    parish: str | None = None,
    skills: str | None = Query(default=None, description="Comma-separated skills"),
    min_rating: float | None = None,
    max_rating: float | None = None,
    verified_only: bool = False,
    sort_by: str | None = Query(
        default=None,
        pattern=r"^(relevance|rating|newest)$",
    ),
    limit: int = Query(default=20, le=100),
    offset: int = 0,
):
    """Search user profiles by skills, name, bio text, and parish."""
    skill_list = [s.strip() for s in skills.split(",")] if skills else None
    results = await search_profiles(
        query=q,
        parish=parish,
        skills=skill_list,
        limit=limit,
        offset=offset,
    )

    hits = results.get("hits", [])

    if min_rating is not None:
        hits = [h for h in hits if (h.get("rating") or 0) >= min_rating]
    if max_rating is not None:
        hits = [h for h in hits if (h.get("rating") or 0) <= max_rating]
    if verified_only:
        hits = [h for h in hits if h.get("is_verified")]

    if sort_by == "rating":
        hits.sort(key=lambda h: h.get("rating") or 0, reverse=True)
    elif sort_by == "newest":
        hits.sort(key=lambda h: h.get("created_at") or "", reverse=True)

    results["hits"] = hits
    return results


@router.get("/suggest")
async def suggest(
    request: Request,
    q: str = Query(..., min_length=2, description="Autocomplete query"),
    type: str = Query(default="listings", pattern=r"^(listings|profiles)$"),
    limit: int = Query(default=5, le=10),
):
    """Autocomplete suggestions for the search bar."""
    if type == "listings":
        results = await search_listings(query=q, limit=limit)
    else:
        results = await search_profiles(query=q, limit=limit)

    suggestions = []
    for hit in results.get("hits", []):
        if type == "listings":
            suggestions.append({
                "id": hit.get("id"),
                "text": hit.get("title"),
                "category": hit.get("category"),
            })
        else:
            suggestions.append({
                "id": hit.get("id"),
                "text": hit.get("display_name"),
                "skills": hit.get("skills", [])[:3],
            })

    return {"suggestions": suggestions, "query": q}


# --- Saved searches ---


class SavedSearchCreate(BaseModel):
    name: str | None = Field(default=None, max_length=100)
    query: str | None = Field(default=None, max_length=500)
    filters: dict = Field(default_factory=dict)
    notification_enabled: bool = False


@router.post("/saved-searches", status_code=status.HTTP_201_CREATED)
async def create_saved_search(
    data: SavedSearchCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Save a search for later reuse."""
    user_id = _get_user_id(request)
    search = SavedSearch(
        id=str(uuid.uuid4()),
        user_id=user_id,
        name=data.name,
        query=data.query,
        filters=data.filters,
        notification_enabled=data.notification_enabled,
        created_at=datetime.now(UTC),
    )
    db.add(search)
    await db.flush()
    return {"id": search.id, "status": "saved"}


@router.get("/saved-searches")
async def list_saved_searches(
    request: Request,
    limit: int = Query(default=20, le=100),
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
):
    """List saved searches for the current user."""
    user_id = _get_user_id(request)
    query = (
        select(SavedSearch)
        .where(SavedSearch.user_id == user_id)
        .order_by(SavedSearch.created_at.desc())
        .offset(offset)
        .limit(limit)
    )
    result = await db.execute(query)
    searches = result.scalars().all()
    return [
        {
            "id": s.id,
            "name": s.name,
            "query": s.query,
            "filters": s.filters,
            "notification_enabled": s.notification_enabled,
            "result_count": s.result_count,
            "created_at": s.created_at.isoformat(),
        }
        for s in searches
    ]


@router.delete("/saved-searches/{search_id}")
async def delete_saved_search(
    search_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Remove a saved search."""
    user_id = _get_user_id(request)
    result = await db.execute(
        select(SavedSearch).where(
            SavedSearch.id == search_id,
            SavedSearch.user_id == user_id,
        )
    )
    search = result.scalar_one_or_none()
    if not search:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Saved search not found")

    await db.delete(search)
    await db.flush()
    return {"status": "deleted"}


@router.get("/trending")
async def get_trending(
    limit: int = Query(default=10, le=50),
    db: AsyncSession = Depends(get_db),
):
    """Get trending search terms based on saved searches."""
    result = await db.execute(
        select(SavedSearch.query)
        .where(SavedSearch.query.is_not(None))
        .order_by(SavedSearch.created_at.desc())
        .limit(limit * 5)
    )
    queries = [row[0] for row in result.all() if row[0]]
    # Simple frequency-based trending
    freq: dict[str, int] = {}
    for q in queries:
        freq[q] = freq.get(q, 0) + 1
    trending = sorted(freq.items(), key=lambda x: x[1], reverse=True)[:limit]
    return {"trending": [{"query": q, "count": c} for q, c in trending]}
