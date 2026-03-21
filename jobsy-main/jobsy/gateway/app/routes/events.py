"""Pan di Ends (Events) routes embedded directly in the gateway."""

import uuid
from datetime import UTC, datetime, timedelta

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Query,
    status,
)
from pydantic import BaseModel, Field
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from shared.cache import cache_delete_pattern, cache_get_json, cache_key, cache_set_json
from shared.database import get_db
from shared.events import publish_event

from ..deps import get_current_user, get_optional_user
from ..models_events import Event, EventRSVP, EventTicket, EventUpdate

router = APIRouter(tags=["events"])


# ── Request / response schemas ────────────────────────────────────────

class EventCreateSchema(BaseModel):
    title: str = Field(..., max_length=300)
    description: str | None = None
    category: str | None = Field(default=None, max_length=50)
    cover_image_url: str | None = Field(default=None, max_length=500)
    cover_video_url: str | None = Field(default=None, max_length=500)
    start_date: str
    end_date: str | None = None
    location_text: str | None = Field(default=None, max_length=500)
    parish: str | None = Field(default=None, max_length=50)
    is_free: bool = True
    ticket_price: float | None = None
    currency: str = Field(default="JMD", max_length=3)
    capacity: int | None = None
    age_restriction: str | None = Field(default=None, max_length=20)
    tags: list[str] | None = None


class EventUpdateSchema(BaseModel):
    title: str | None = Field(default=None, max_length=300)
    description: str | None = None
    category: str | None = Field(default=None, max_length=50)
    cover_image_url: str | None = Field(default=None, max_length=500)
    cover_video_url: str | None = Field(default=None, max_length=500)
    start_date: str | None = None
    end_date: str | None = None
    location_text: str | None = Field(default=None, max_length=500)
    parish: str | None = Field(default=None, max_length=50)
    is_free: bool | None = None
    ticket_price: float | None = None
    capacity: int | None = None
    age_restriction: str | None = Field(default=None, max_length=20)
    tags: list[str] | None = None


class RSVPCreate(BaseModel):
    status: str = Field(default="going", pattern="^(going|interested)$")


class TicketPurchase(BaseModel):
    quantity: int = Field(default=1, ge=1, le=20)
    stripe_payment_id: str | None = None


class EventUpdatePost(BaseModel):
    content: str


# ── Helpers ───────────────────────────────────────────────────────────

def _event_response(e: Event) -> dict:
    return {
        "id": e.id,
        "organizer_id": e.organizer_id,
        "title": e.title,
        "description": e.description,
        "category": e.category,
        "cover_image_url": e.cover_image_url,
        "cover_video_url": e.cover_video_url,
        "start_date": e.start_date.isoformat() if e.start_date else None,
        "end_date": e.end_date.isoformat() if e.end_date else None,
        "location_text": e.location_text,
        "parish": e.parish,
        "latitude": float(e.latitude) if e.latitude is not None else None,
        "longitude": float(e.longitude) if e.longitude is not None else None,
        "is_free": e.is_free,
        "ticket_price": float(e.ticket_price) if e.ticket_price is not None else None,
        "currency": e.currency,
        "capacity": e.capacity,
        "age_restriction": e.age_restriction,
        "is_featured": e.is_featured,
        "is_promoted": e.is_promoted,
        "status": e.status,
        "rsvp_count": e.rsvp_count,
        "ticket_sold_count": e.ticket_sold_count,
        "view_count": e.view_count,
        "tags": e.tags,
        "created_at": e.created_at.isoformat(),
        "updated_at": e.updated_at.isoformat(),
    }


def _ticket_response(t: EventTicket) -> dict:
    return {
        "id": t.id,
        "event_id": t.event_id,
        "user_id": t.user_id,
        "quantity": t.quantity,
        "total_amount": float(t.total_amount),
        "currency": t.currency,
        "stripe_payment_id": t.stripe_payment_id,
        "status": t.status,
        "created_at": t.created_at.isoformat(),
    }


def _rsvp_response(r: EventRSVP) -> dict:
    return {
        "id": r.id,
        "event_id": r.event_id,
        "user_id": r.user_id,
        "status": r.status,
        "created_at": r.created_at.isoformat(),
    }


def _update_response(u: EventUpdate) -> dict:
    return {
        "id": u.id,
        "event_id": u.event_id,
        "author_id": u.author_id,
        "content": u.content,
        "created_at": u.created_at.isoformat(),
    }


async def _get_event_or_404(db: AsyncSession, event_id: str) -> Event:
    result = await db.execute(select(Event).where(Event.id == event_id))
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")
    return event


def _check_organizer(event: Event, user_id: str) -> None:
    if event.organizer_id != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the organizer can perform this action")


# ── Routes ────────────────────────────────────────────────────────────


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_event(
    data: EventCreateSchema,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new event (posting fee charged via Stripe separately)."""
    now = datetime.now(UTC)
    start_date = datetime.fromisoformat(data.start_date)
    end_date = datetime.fromisoformat(data.end_date) if data.end_date else None

    event = Event(
        id=str(uuid.uuid4()),
        organizer_id=user["user_id"],
        title=data.title,
        description=data.description,
        category=data.category,
        cover_image_url=data.cover_image_url,
        cover_video_url=data.cover_video_url,
        start_date=start_date,
        end_date=end_date,
        location_text=data.location_text,
        parish=data.parish,
        is_free=data.is_free,
        ticket_price=data.ticket_price if not data.is_free else None,
        currency=data.currency,
        capacity=data.capacity,
        age_restriction=data.age_restriction,
        tags=data.tags or [],
        status="active",
        rsvp_count=0,
        ticket_sold_count=0,
        view_count=0,
        created_at=now,
        updated_at=now,
    )
    db.add(event)
    await db.flush()

    await publish_event(
        "event.created",
        {"event_id": event.id, "organizer_id": user["user_id"], "title": data.title},
    )

    # Invalidate list caches
    await cache_delete_pattern(cache_key("events", "*"))

    return _event_response(event)


@router.get("/my-events")
async def my_events(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, le=100),
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List events the current user is organizing."""
    offset = (page - 1) * limit
    query = (
        select(Event)
        .where(Event.organizer_id == user["user_id"])
        .order_by(Event.created_at.desc())
        .offset(offset)
        .limit(limit)
    )
    result = await db.execute(query)
    return [_event_response(e) for e in result.scalars().all()]


@router.get("/my-tickets")
async def my_tickets(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, le=100),
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List events the current user has tickets/RSVPs for."""
    offset = (page - 1) * limit

    # Gather event IDs from both tickets and RSVPs
    ticket_event_ids = select(EventTicket.event_id).where(
        EventTicket.user_id == user["user_id"],
        EventTicket.status == "confirmed",
    )
    rsvp_event_ids = select(EventRSVP.event_id).where(
        EventRSVP.user_id == user["user_id"],
    )

    query = (
        select(Event)
        .where(or_(Event.id.in_(ticket_event_ids), Event.id.in_(rsvp_event_ids)))
        .order_by(Event.start_date.desc())
        .offset(offset)
        .limit(limit)
    )
    result = await db.execute(query)
    return [_event_response(e) for e in result.scalars().all()]


@router.get("/featured")
async def featured_events(
    limit: int = Query(default=10, le=50),
    db: AsyncSession = Depends(get_db),
):
    """Return featured/promoted events."""
    ck = cache_key("events", "featured", str(limit))
    cached = await cache_get_json(ck)
    if cached is not None:
        return cached

    query = (
        select(Event)
        .where(Event.status == "active", or_(Event.is_featured.is_(True), Event.is_promoted.is_(True)))
        .where(Event.start_date >= datetime.now(UTC))
        .order_by(Event.start_date.asc())
        .limit(limit)
    )
    result = await db.execute(query)
    data = [_event_response(e) for e in result.scalars().all()]
    await cache_set_json(ck, data, ttl=300)  # 5 minutes
    return data


@router.get("/happening-now")
async def happening_now(
    limit: int = Query(default=20, le=50),
    db: AsyncSession = Depends(get_db),
):
    """Return events currently in progress."""
    ck = cache_key("events", "happening-now", str(limit))
    cached = await cache_get_json(ck)
    if cached is not None:
        return cached

    now = datetime.now(UTC)
    query = (
        select(Event)
        .where(
            Event.status == "active",
            Event.start_date <= now,
            or_(Event.end_date >= now, Event.end_date.is_(None)),
        )
        .order_by(Event.start_date.asc())
        .limit(limit)
    )
    result = await db.execute(query)
    data = [_event_response(e) for e in result.scalars().all()]
    await cache_set_json(ck, data, ttl=120)  # 2 minutes
    return data


@router.get("/this-weekend")
async def this_weekend(
    limit: int = Query(default=30, le=50),
    db: AsyncSession = Depends(get_db),
):
    """Return events happening this coming weekend (Sat-Sun)."""
    now = datetime.now(UTC)
    # Calculate next Saturday
    days_until_saturday = (5 - now.weekday()) % 7
    if days_until_saturday == 0 and now.hour >= 0:
        # Already Saturday or past
        days_until_saturday = 0
    saturday = (now + timedelta(days=days_until_saturday)).replace(hour=0, minute=0, second=0, microsecond=0)
    sunday_end = saturday + timedelta(days=2)

    query = (
        select(Event)
        .where(
            Event.status == "active",
            Event.start_date >= saturday,
            Event.start_date < sunday_end,
        )
        .order_by(Event.start_date.asc())
        .limit(limit)
    )
    result = await db.execute(query)
    return [_event_response(e) for e in result.scalars().all()]


@router.get("/{event_id}")
async def get_event(
    event_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Get event detail (public)."""
    ck = cache_key("events", "detail", event_id)
    cached = await cache_get_json(ck)
    if cached is not None:
        # Still increment view count in the background
        event = await _get_event_or_404(db, event_id)
        event.view_count = (event.view_count or 0) + 1
        await db.flush()
        return cached

    event = await _get_event_or_404(db, event_id)
    # Increment view count
    event.view_count = (event.view_count or 0) + 1
    await db.flush()
    data = _event_response(event)
    await cache_set_json(ck, data, ttl=60)  # 1 minute
    return data


@router.get("/")
async def list_events(
    parish: str | None = Query(default=None),
    category: str | None = Query(default=None),
    is_free: bool | None = Query(default=None),
    date_from: str | None = Query(default=None),
    date_to: str | None = Query(default=None),
    search: str | None = Query(default=None, alias="q"),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, le=100),
    db: AsyncSession = Depends(get_db),
):
    """List/discover events with filters."""
    offset = (page - 1) * limit
    query = select(Event).where(Event.status == "active")

    if parish:
        query = query.where(Event.parish == parish)
    if category:
        query = query.where(Event.category == category)
    if is_free is not None:
        query = query.where(Event.is_free == is_free)
    if date_from:
        query = query.where(Event.start_date >= datetime.fromisoformat(date_from))
    if date_to:
        query = query.where(Event.start_date <= datetime.fromisoformat(date_to))
    if search:
        pattern = f"%{search}%"
        query = query.where(
            or_(
                Event.title.ilike(pattern),
                Event.description.ilike(pattern),
                Event.location_text.ilike(pattern),
            )
        )

    query = query.order_by(Event.start_date.asc()).offset(offset).limit(limit)

    # Count total
    count_q = select(func.count(Event.id)).where(Event.status == "active")
    if parish:
        count_q = count_q.where(Event.parish == parish)
    if category:
        count_q = count_q.where(Event.category == category)
    if is_free is not None:
        count_q = count_q.where(Event.is_free == is_free)

    total_result = await db.execute(count_q)
    total = total_result.scalar() or 0

    result = await db.execute(query)
    events = [_event_response(e) for e in result.scalars().all()]

    return {"events": events, "total": total, "page": page, "limit": limit}


@router.put("/{event_id}")
async def update_event(
    event_id: str,
    data: EventUpdateSchema,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update event (organizer only)."""
    event = await _get_event_or_404(db, event_id)
    _check_organizer(event, user["user_id"])

    now = datetime.now(UTC)
    update_fields = data.model_dump(exclude_unset=True)

    for field, value in update_fields.items():
        if field in ("start_date", "end_date") and value is not None:
            value = datetime.fromisoformat(value)
        setattr(event, field, value)

    event.updated_at = now
    await db.flush()

    # Invalidate caches for this event and list endpoints
    await cache_delete_pattern(cache_key("events", "*"))

    return _event_response(event)


@router.delete("/{event_id}")
async def cancel_event(
    event_id: str,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Cancel event (organizer only). Notifies all RSVPs."""
    event = await _get_event_or_404(db, event_id)
    _check_organizer(event, user["user_id"])

    event.status = "cancelled"
    event.updated_at = datetime.now(UTC)
    await db.flush()

    await publish_event(
        "event.cancelled",
        {"event_id": event.id, "organizer_id": user["user_id"], "title": event.title},
    )

    # Invalidate caches
    await cache_delete_pattern(cache_key("events", "*"))

    return {"detail": "Event cancelled", "id": event.id}


# ── RSVP endpoints ───────────────────────────────────────────────────


@router.post("/{event_id}/rsvp", status_code=status.HTTP_201_CREATED)
async def rsvp_to_event(
    event_id: str,
    data: RSVPCreate | None = None,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """RSVP to a free event."""
    event = await _get_event_or_404(db, event_id)

    if event.status != "active":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Event is not active")

    if event.capacity and (event.rsvp_count or 0) >= event.capacity:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Event is at capacity")

    # Check for existing RSVP
    existing = await db.execute(
        select(EventRSVP).where(EventRSVP.event_id == event_id, EventRSVP.user_id == user["user_id"])
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Already RSVPd to this event")

    rsvp_status = data.status if data else "going"
    rsvp = EventRSVP(
        id=str(uuid.uuid4()),
        event_id=event_id,
        user_id=user["user_id"],
        status=rsvp_status,
        created_at=datetime.now(UTC),
    )
    db.add(rsvp)

    event.rsvp_count = (event.rsvp_count or 0) + 1
    await db.flush()

    return _rsvp_response(rsvp)


@router.delete("/{event_id}/rsvp")
async def cancel_rsvp(
    event_id: str,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Cancel RSVP to an event."""
    result = await db.execute(
        select(EventRSVP).where(EventRSVP.event_id == event_id, EventRSVP.user_id == user["user_id"])
    )
    rsvp = result.scalar_one_or_none()
    if not rsvp:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="RSVP not found")

    event = await _get_event_or_404(db, event_id)
    event.rsvp_count = max((event.rsvp_count or 0) - 1, 0)
    await db.delete(rsvp)
    await db.flush()

    return {"detail": "RSVP cancelled"}


# ── Ticket endpoints ─────────────────────────────────────────────────


@router.post("/{event_id}/tickets", status_code=status.HTTP_201_CREATED)
async def buy_tickets(
    event_id: str,
    data: TicketPurchase,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Purchase tickets for a paid event."""
    event = await _get_event_or_404(db, event_id)

    if event.status != "active":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Event is not active")
    if event.is_free:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This is a free event, use RSVP instead")
    if not event.ticket_price:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Ticket price not set")

    if event.capacity:
        remaining = event.capacity - (event.ticket_sold_count or 0)
        if data.quantity > remaining:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Only {remaining} tickets remaining",
            )

    total = float(event.ticket_price) * data.quantity

    ticket = EventTicket(
        id=str(uuid.uuid4()),
        event_id=event_id,
        user_id=user["user_id"],
        quantity=data.quantity,
        total_amount=total,
        currency=event.currency,
        stripe_payment_id=data.stripe_payment_id,
        status="confirmed",
        created_at=datetime.now(UTC),
    )
    db.add(ticket)

    event.ticket_sold_count = (event.ticket_sold_count or 0) + data.quantity
    await db.flush()

    await publish_event(
        "event.ticket_purchased",
        {
            "event_id": event_id,
            "user_id": user["user_id"],
            "quantity": data.quantity,
            "total": total,
        },
    )

    return _ticket_response(ticket)


@router.get("/{event_id}/tickets")
async def list_event_tickets(
    event_id: str,
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=50, le=200),
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List tickets for an event (organizer only)."""
    event = await _get_event_or_404(db, event_id)
    _check_organizer(event, user["user_id"])

    offset = (page - 1) * limit
    result = await db.execute(
        select(EventTicket)
        .where(EventTicket.event_id == event_id)
        .order_by(EventTicket.created_at.desc())
        .offset(offset)
        .limit(limit)
    )
    return [_ticket_response(t) for t in result.scalars().all()]


# ── Updates (announcements) endpoints ─────────────────────────────────


@router.post("/{event_id}/updates", status_code=status.HTTP_201_CREATED)
async def post_event_update(
    event_id: str,
    data: EventUpdatePost,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Post an update/announcement to event attendees (organizer only)."""
    event = await _get_event_or_404(db, event_id)
    _check_organizer(event, user["user_id"])

    update = EventUpdate(
        id=str(uuid.uuid4()),
        event_id=event_id,
        author_id=user["user_id"],
        content=data.content,
        created_at=datetime.now(UTC),
    )
    db.add(update)
    await db.flush()

    await publish_event(
        "event.update_posted",
        {"event_id": event_id, "update_id": update.id},
    )

    return _update_response(update)


@router.get("/{event_id}/updates")
async def get_event_updates(
    event_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Get all updates for an event."""
    await _get_event_or_404(db, event_id)

    result = await db.execute(
        select(EventUpdate)
        .where(EventUpdate.event_id == event_id)
        .order_by(EventUpdate.created_at.desc())
    )
    return [_update_response(u) for u in result.scalars().all()]


# ── Organizer dashboard ──────────────────────────────────────────────


@router.get("/{event_id}/dashboard")
async def event_dashboard(
    event_id: str,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Organizer dashboard: RSVPs, ticket sales, revenue."""
    event = await _get_event_or_404(db, event_id)
    _check_organizer(event, user["user_id"])

    # RSVPs
    rsvp_result = await db.execute(
        select(EventRSVP).where(EventRSVP.event_id == event_id).order_by(EventRSVP.created_at.desc())
    )
    rsvps = [_rsvp_response(r) for r in rsvp_result.scalars().all()]

    # Tickets
    ticket_result = await db.execute(
        select(EventTicket).where(EventTicket.event_id == event_id).order_by(EventTicket.created_at.desc())
    )
    tickets = [_ticket_response(t) for t in ticket_result.scalars().all()]

    # Revenue
    revenue_result = await db.execute(
        select(func.sum(EventTicket.total_amount)).where(
            EventTicket.event_id == event_id,
            EventTicket.status == "confirmed",
        )
    )
    total_revenue = float(revenue_result.scalar() or 0)

    return {
        "event": _event_response(event),
        "rsvps": rsvps,
        "rsvp_count": len(rsvps),
        "tickets": tickets,
        "ticket_sales_count": event.ticket_sold_count or 0,
        "total_revenue": total_revenue,
        "currency": event.currency,
    }
