"""Analytics & Event Tracking routes embedded directly in the gateway."""

import uuid
from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from shared.database import get_db

from ..deps import get_current_user, get_optional_user
from ..models_analytics import AnalyticsEvent

router = APIRouter(tags=["analytics"])


# --- Request schemas ---


class EventCreate(BaseModel):
    event_type: str = Field(..., max_length=50)
    entity_type: str | None = Field(default=None, max_length=30)
    entity_id: str | None = None
    properties: dict = Field(default_factory=dict)
    session_id: str | None = None


# --- Routes ---


@router.post("/events", status_code=status.HTTP_201_CREATED)
async def track_event(
    data: EventCreate,
    user: dict = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
):
    """Track an analytics event."""
    now = datetime.now(UTC)
    user_id = user["user_id"] if user["user_id"] != "anonymous" else None

    event = AnalyticsEvent(
        id=str(uuid.uuid4()),
        user_id=user_id,
        event_type=data.event_type,
        entity_type=data.entity_type,
        entity_id=data.entity_id,
        properties=data.properties,
        session_id=data.session_id,
        created_at=now,
    )
    db.add(event)
    await db.flush()
    return {"id": event.id, "event_type": event.event_type}


@router.get("/dashboard")
async def user_dashboard(
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get user dashboard metrics."""
    user_id = user["user_id"]
    now = datetime.now(UTC)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = today_start - timedelta(days=today_start.weekday())

    # Views today
    views_today = await db.execute(
        select(func.count())
        .select_from(AnalyticsEvent)
        .where(
            AnalyticsEvent.entity_id == user_id,
            AnalyticsEvent.event_type == "profile_view",
            AnalyticsEvent.created_at >= today_start,
        )
    )

    # Views this week
    views_week = await db.execute(
        select(func.count())
        .select_from(AnalyticsEvent)
        .where(
            AnalyticsEvent.entity_id == user_id,
            AnalyticsEvent.event_type == "profile_view",
            AnalyticsEvent.created_at >= week_start,
        )
    )

    # Total bookings
    total_bookings = await db.execute(
        select(func.count())
        .select_from(AnalyticsEvent)
        .where(
            AnalyticsEvent.user_id == user_id,
            AnalyticsEvent.event_type == "booking_created",
        )
    )

    # Profile views total
    profile_views = await db.execute(
        select(func.count())
        .select_from(AnalyticsEvent)
        .where(
            AnalyticsEvent.entity_id == user_id,
            AnalyticsEvent.event_type == "profile_view",
        )
    )

    # Listing views
    listing_views = await db.execute(
        select(func.count())
        .select_from(AnalyticsEvent)
        .where(
            AnalyticsEvent.entity_id == user_id,
            AnalyticsEvent.event_type == "listing_view",
        )
    )

    # Search appearances
    search_appearances = await db.execute(
        select(func.count())
        .select_from(AnalyticsEvent)
        .where(
            AnalyticsEvent.entity_id == user_id,
            AnalyticsEvent.event_type == "search",
        )
    )

    return {
        "views_today": views_today.scalar() or 0,
        "views_this_week": views_week.scalar() or 0,
        "total_bookings": total_bookings.scalar() or 0,
        "profile_views": profile_views.scalar() or 0,
        "listing_views": listing_views.scalar() or 0,
        "search_appearances": search_appearances.scalar() or 0,
    }


@router.get("/provider")
async def provider_analytics(
    user: dict = Depends(get_current_user),
    days: int = Query(default=30, le=90),
    db: AsyncSession = Depends(get_db),
):
    """Provider-specific analytics."""
    user_id = user["user_id"]
    since = datetime.now(UTC) - timedelta(days=days)

    # Views over time
    views_result = await db.execute(
        select(func.count())
        .select_from(AnalyticsEvent)
        .where(
            AnalyticsEvent.entity_id == user_id,
            AnalyticsEvent.event_type == "profile_view",
            AnalyticsEvent.created_at >= since,
        )
    )

    # Bookings in period
    bookings_result = await db.execute(
        select(func.count())
        .select_from(AnalyticsEvent)
        .where(
            AnalyticsEvent.entity_id == user_id,
            AnalyticsEvent.event_type == "booking_created",
            AnalyticsEvent.created_at >= since,
        )
    )

    views = views_result.scalar() or 0
    bookings = bookings_result.scalar() or 0
    conversion_rate = (bookings / views * 100) if views > 0 else 0.0

    # Category performance
    cat_query = (
        select(
            AnalyticsEvent.entity_type,
            func.count().label("count"),
        )
        .where(
            AnalyticsEvent.entity_id == user_id,
            AnalyticsEvent.created_at >= since,
        )
        .group_by(AnalyticsEvent.entity_type)
    )
    cat_result = await db.execute(cat_query)
    categories = [{"entity_type": row.entity_type, "count": row.count} for row in cat_result]

    return {
        "period_days": days,
        "views": views,
        "bookings": bookings,
        "conversion_rate": round(conversion_rate, 2),
        "category_performance": categories,
    }


@router.get("/platform")
async def platform_metrics(
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Admin-only: Platform-wide metrics."""
    if user.get("active_role") != "admin" and user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )

    now = datetime.now(UTC)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

    # Total events today
    events_today = await db.execute(
        select(func.count())
        .select_from(AnalyticsEvent)
        .where(
            AnalyticsEvent.created_at >= today_start,
        )
    )

    # Bookings today
    bookings_today = await db.execute(
        select(func.count())
        .select_from(AnalyticsEvent)
        .where(
            AnalyticsEvent.event_type == "booking_created",
            AnalyticsEvent.created_at >= today_start,
        )
    )

    # New signups today
    signups_today = await db.execute(
        select(func.count())
        .select_from(AnalyticsEvent)
        .where(
            AnalyticsEvent.event_type == "signup",
            AnalyticsEvent.created_at >= today_start,
        )
    )

    # Unique active users today
    active_users = await db.execute(
        select(func.count(func.distinct(AnalyticsEvent.user_id))).where(
            AnalyticsEvent.created_at >= today_start,
            AnalyticsEvent.user_id.is_not(None),
        )
    )

    return {
        "events_today": events_today.scalar() or 0,
        "bookings_today": bookings_today.scalar() or 0,
        "signups_today": signups_today.scalar() or 0,
        "active_users_today": active_users.scalar() or 0,
    }


@router.get("/trends")
async def trending(
    days: int = Query(default=7, le=30),
    db: AsyncSession = Depends(get_db),
):
    """Trending categories, top providers, popular searches."""
    since = datetime.now(UTC) - timedelta(days=days)

    # Trending categories (most viewed entity_types)
    cat_query = (
        select(
            AnalyticsEvent.entity_type,
            func.count().label("count"),
        )
        .where(
            AnalyticsEvent.created_at >= since,
            AnalyticsEvent.entity_type.is_not(None),
        )
        .group_by(AnalyticsEvent.entity_type)
        .order_by(func.count().desc())
        .limit(10)
    )
    cat_result = await db.execute(cat_query)
    trending_categories = [{"category": row.entity_type, "count": row.count} for row in cat_result]

    # Top providers (most profile views)
    provider_query = (
        select(
            AnalyticsEvent.entity_id,
            func.count().label("views"),
        )
        .where(
            AnalyticsEvent.event_type == "profile_view",
            AnalyticsEvent.created_at >= since,
            AnalyticsEvent.entity_id.is_not(None),
        )
        .group_by(AnalyticsEvent.entity_id)
        .order_by(func.count().desc())
        .limit(10)
    )
    provider_result = await db.execute(provider_query)
    top_providers = [{"user_id": row.entity_id, "views": row.views} for row in provider_result]

    # Popular searches
    search_query = (
        select(
            AnalyticsEvent.entity_id,
            func.count().label("count"),
        )
        .where(
            AnalyticsEvent.event_type == "search",
            AnalyticsEvent.created_at >= since,
            AnalyticsEvent.entity_id.is_not(None),
        )
        .group_by(AnalyticsEvent.entity_id)
        .order_by(func.count().desc())
        .limit(10)
    )
    search_result = await db.execute(search_query)
    popular_searches = [{"term": row.entity_id, "count": row.count} for row in search_result]

    return {
        "period_days": days,
        "trending_categories": trending_categories,
        "top_providers": top_providers,
        "popular_searches": popular_searches,
    }
