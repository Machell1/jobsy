"""Bookings service API routes -- CRUD, state machine, quotes."""

import uuid
from datetime import UTC, datetime
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from shared.database import get_db
from shared.events import publish_event

from .models import Booking, BookingEvent, Quote

router = APIRouter(tags=["bookings"])


def _get_user_id(request: Request) -> str:
    user_id = request.headers.get("X-User-ID")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing user context")
    return user_id


def _get_user_role(request: Request) -> str:
    return request.headers.get("X-User-Role", "user")


# --- Valid state transitions ---
VALID_TRANSITIONS = {
    "inquiry": {"quote_requested", "cancelled"},
    "quote_requested": {"quote_sent", "cancelled"},
    "quote_sent": {"quote_accepted", "cancelled"},
    "quote_accepted": {"booking_confirmed", "cancelled"},
    "booking_confirmed": {"in_progress", "cancelled", "rescheduled"},
    "in_progress": {"completed", "disputed"},
    "completed": {"reviewed", "disputed"},
    "disputed": {"refunded", "closed"},
    "cancelled": {"closed"},
}


# --- Request schemas ---
class BookingCreate(BaseModel):
    title: str = Field(..., max_length=200)
    description: str | None = None
    provider_id: str
    listing_id: str | None = None
    service_id: str | None = None
    scheduled_date: str | None = None
    scheduled_time_start: str | None = None
    scheduled_time_end: str | None = None
    location_mode: str | None = Field(default="onsite", max_length=20)
    location_text: str | None = Field(default=None, max_length=500)
    parish: str | None = Field(default=None, max_length=50)


class BookingStatusUpdate(BaseModel):
    status: str
    note: str | None = None
    cancellation_reason: str | None = None


class BookingReschedule(BaseModel):
    scheduled_date: str
    scheduled_time_start: str | None = None
    scheduled_time_end: str | None = None
    note: str | None = None


class QuoteCreate(BaseModel):
    amount: Decimal = Field(..., gt=0)
    currency: str = Field(default="JMD", max_length=3)
    description: str | None = None
    valid_until: str | None = None


class QuoteAction(BaseModel):
    action: str = Field(..., pattern="^(accept|reject)$")


# --- Helpers ---
def _booking_response(b: Booking) -> dict:
    return {
        "id": b.id,
        "customer_id": b.customer_id,
        "provider_id": b.provider_id,
        "listing_id": b.listing_id,
        "service_id": b.service_id,
        "title": b.title,
        "description": b.description,
        "status": b.status,
        "scheduled_date": b.scheduled_date.isoformat() if b.scheduled_date else None,
        "scheduled_time_start": b.scheduled_time_start.isoformat() if b.scheduled_time_start else None,
        "scheduled_time_end": b.scheduled_time_end.isoformat() if b.scheduled_time_end else None,
        "location_mode": b.location_mode,
        "location_text": b.location_text,
        "parish": b.parish,
        "latitude": float(b.latitude) if b.latitude is not None else None,
        "longitude": float(b.longitude) if b.longitude is not None else None,
        "total_amount": float(b.total_amount) if b.total_amount is not None else None,
        "currency": b.currency,
        "payment_status": b.payment_status,
        "cancellation_reason": b.cancellation_reason,
        "cancelled_by": b.cancelled_by,
        "completed_at": b.completed_at.isoformat() if b.completed_at else None,
        "created_at": b.created_at.isoformat(),
        "updated_at": b.updated_at.isoformat(),
    }


def _event_response(e: BookingEvent) -> dict:
    return {
        "id": e.id,
        "booking_id": e.booking_id,
        "event_type": e.event_type,
        "from_status": e.from_status,
        "to_status": e.to_status,
        "actor_id": e.actor_id,
        "actor_role": e.actor_role,
        "note": e.note,
        "metadata": e.event_metadata,
        "created_at": e.created_at.isoformat(),
    }


def _quote_response(q: Quote) -> dict:
    return {
        "id": q.id,
        "booking_id": q.booking_id,
        "provider_id": q.provider_id,
        "amount": float(q.amount),
        "currency": q.currency,
        "description": q.description,
        "valid_until": q.valid_until.isoformat() if q.valid_until else None,
        "status": q.status,
        "created_at": q.created_at.isoformat(),
        "updated_at": q.updated_at.isoformat(),
    }


async def _create_event(
    db: AsyncSession,
    booking_id: str,
    event_type: str,
    actor_id: str,
    actor_role: str,
    from_status: str | None = None,
    to_status: str | None = None,
    note: str | None = None,
    metadata: dict | None = None,
) -> BookingEvent:
    event = BookingEvent(
        id=str(uuid.uuid4()),
        booking_id=booking_id,
        event_type=event_type,
        from_status=from_status,
        to_status=to_status,
        actor_id=actor_id,
        actor_role=actor_role,
        note=note,
        metadata=metadata,
        created_at=datetime.now(UTC),
    )
    db.add(event)
    await db.flush()
    return event


async def _get_booking_or_404(db: AsyncSession, booking_id: str) -> Booking:
    result = await db.execute(select(Booking).where(Booking.id == booking_id))
    booking = result.scalar_one_or_none()
    if not booking:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found")
    return booking


def _check_booking_access(booking: Booking, user_id: str) -> None:
    if booking.customer_id != user_id and booking.provider_id != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized for this booking")


# --- Routes ---

@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_booking(
    data: BookingCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Create a new booking inquiry."""
    customer_id = _get_user_id(request)
    now = datetime.now(UTC)

    from datetime import date as date_type
    from datetime import time as time_type
    scheduled_date = date_type.fromisoformat(data.scheduled_date) if data.scheduled_date else None
    scheduled_time_start = time_type.fromisoformat(data.scheduled_time_start) if data.scheduled_time_start else None
    scheduled_time_end = time_type.fromisoformat(data.scheduled_time_end) if data.scheduled_time_end else None

    booking = Booking(
        id=str(uuid.uuid4()),
        customer_id=customer_id,
        provider_id=data.provider_id,
        listing_id=data.listing_id,
        service_id=data.service_id,
        title=data.title,
        description=data.description,
        status="inquiry",
        scheduled_date=scheduled_date,
        scheduled_time_start=scheduled_time_start,
        scheduled_time_end=scheduled_time_end,
        location_mode=data.location_mode,
        location_text=data.location_text,
        parish=data.parish,
        currency="JMD",
        payment_status="unpaid",
        created_at=now,
        updated_at=now,
    )
    db.add(booking)
    await db.flush()

    await _create_event(
        db, booking.id, "status_change", customer_id, "customer",
        from_status=None, to_status="inquiry", note="Booking inquiry created",
    )

    await publish_event("booking.created", {
        "booking_id": booking.id,
        "customer_id": customer_id,
        "provider_id": data.provider_id,
    })

    return _booking_response(booking)


@router.get("/")
async def list_bookings(
    request: Request,
    role: str = Query(default="customer"),
    status_filter: str | None = Query(default=None, alias="status"),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, le=100),
    db: AsyncSession = Depends(get_db),
):
    """List bookings for the current user."""
    user_id = _get_user_id(request)
    offset = (page - 1) * limit

    query = select(Booking)
    if role == "provider":
        query = query.where(Booking.provider_id == user_id)
    else:
        query = query.where(Booking.customer_id == user_id)

    if status_filter:
        query = query.where(Booking.status == status_filter)

    query = query.order_by(Booking.created_at.desc()).offset(offset).limit(limit)
    result = await db.execute(query)
    bookings = result.scalars().all()
    return [_booking_response(b) for b in bookings]


@router.get("/stats")
async def booking_stats(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Get booking statistics for the current user."""
    user_id = _get_user_id(request)

    # Total bookings (as customer or provider)
    total_result = await db.execute(
        select(func.count(Booking.id)).where(
            (Booking.customer_id == user_id) | (Booking.provider_id == user_id)
        )
    )
    total = total_result.scalar() or 0

    # By status
    status_result = await db.execute(
        select(Booking.status, func.count(Booking.id)).where(
            (Booking.customer_id == user_id) | (Booking.provider_id == user_id)
        ).group_by(Booking.status)
    )
    by_status = {row[0]: row[1] for row in status_result.all()}

    completed = by_status.get("completed", 0)
    completion_rate = (completed / total * 100) if total > 0 else 0

    return {
        "total": total,
        "by_status": by_status,
        "completion_rate": round(completion_rate, 1),
    }


@router.get("/{booking_id}")
async def get_booking(
    booking_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Get booking detail with events and quotes."""
    user_id = _get_user_id(request)
    booking = await _get_booking_or_404(db, booking_id)
    _check_booking_access(booking, user_id)

    events_result = await db.execute(
        select(BookingEvent).where(BookingEvent.booking_id == booking_id).order_by(BookingEvent.created_at)
    )
    events = events_result.scalars().all()

    quotes_result = await db.execute(
        select(Quote).where(Quote.booking_id == booking_id).order_by(Quote.created_at.desc())
    )
    quotes = quotes_result.scalars().all()

    resp = _booking_response(booking)
    resp["events"] = [_event_response(e) for e in events]
    resp["quotes"] = [_quote_response(q) for q in quotes]
    return resp


@router.put("/{booking_id}/status")
async def update_booking_status(
    booking_id: str,
    data: BookingStatusUpdate,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Update booking status with state machine validation."""
    user_id = _get_user_id(request)
    booking = await _get_booking_or_404(db, booking_id)
    _check_booking_access(booking, user_id)

    allowed = VALID_TRANSITIONS.get(booking.status, set())
    if data.status not in allowed:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Cannot transition from '{booking.status}' to '{data.status}'",
        )

    old_status = booking.status
    now = datetime.now(UTC)
    booking.status = data.status
    booking.updated_at = now

    if data.status == "cancelled":
        booking.cancellation_reason = data.cancellation_reason
        booking.cancelled_by = user_id

    if data.status == "completed":
        booking.completed_at = now

    await db.flush()

    actor_role = "provider" if user_id == booking.provider_id else "customer"
    await _create_event(
        db, booking.id, "status_change", user_id, actor_role,
        from_status=old_status, to_status=data.status, note=data.note,
    )

    await publish_event("booking.status_changed", {
        "booking_id": booking.id,
        "from_status": old_status,
        "to_status": data.status,
        "actor_id": user_id,
    })

    return _booking_response(booking)


@router.post("/{booking_id}/reschedule")
async def reschedule_booking(
    booking_id: str,
    data: BookingReschedule,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Reschedule a booking."""
    user_id = _get_user_id(request)
    booking = await _get_booking_or_404(db, booking_id)
    _check_booking_access(booking, user_id)

    from datetime import date as date_type
    from datetime import time as time_type
    now = datetime.now(UTC)
    booking.scheduled_date = date_type.fromisoformat(data.scheduled_date)
    booking.scheduled_time_start = (
        time_type.fromisoformat(data.scheduled_time_start)
        if data.scheduled_time_start else None
    )
    booking.scheduled_time_end = (
        time_type.fromisoformat(data.scheduled_time_end)
        if data.scheduled_time_end else None
    )
    booking.updated_at = now
    await db.flush()

    actor_role = "provider" if user_id == booking.provider_id else "customer"
    await _create_event(
        db, booking.id, "reschedule", user_id, actor_role,
        note=data.note,
        metadata={
            "scheduled_date": data.scheduled_date,
            "scheduled_time_start": data.scheduled_time_start,
            "scheduled_time_end": data.scheduled_time_end,
        },
    )

    return _booking_response(booking)


@router.post("/{booking_id}/quotes", status_code=status.HTTP_201_CREATED)
async def create_quote(
    booking_id: str,
    data: QuoteCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Provider sends a quote for a booking."""
    user_id = _get_user_id(request)
    booking = await _get_booking_or_404(db, booking_id)

    if booking.provider_id != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the provider can send quotes")

    now = datetime.now(UTC)
    valid_until = datetime.fromisoformat(data.valid_until) if data.valid_until else None

    quote = Quote(
        id=str(uuid.uuid4()),
        booking_id=booking_id,
        provider_id=user_id,
        amount=data.amount,
        currency=data.currency,
        description=data.description,
        valid_until=valid_until,
        status="pending",
        created_at=now,
        updated_at=now,
    )
    db.add(quote)

    old_status = booking.status
    booking.status = "quote_sent"
    booking.updated_at = now
    await db.flush()

    await _create_event(
        db, booking.id, "status_change", user_id, "provider",
        from_status=old_status, to_status="quote_sent",
        note=f"Quote of {data.amount} {data.currency} sent",
    )

    return _quote_response(quote)


@router.get("/{booking_id}/quotes")
async def list_quotes(
    booking_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """List all quotes for a booking."""
    user_id = _get_user_id(request)
    booking = await _get_booking_or_404(db, booking_id)
    _check_booking_access(booking, user_id)

    result = await db.execute(
        select(Quote).where(Quote.booking_id == booking_id).order_by(Quote.created_at.desc())
    )
    quotes = result.scalars().all()
    return [_quote_response(q) for q in quotes]


@router.put("/{booking_id}/quotes/{quote_id}/respond")
async def respond_to_quote(
    booking_id: str,
    quote_id: str,
    data: QuoteAction,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Accept or reject a quote."""
    user_id = _get_user_id(request)
    booking = await _get_booking_or_404(db, booking_id)

    if booking.customer_id != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the customer can respond to quotes")

    result = await db.execute(
        select(Quote).where(Quote.id == quote_id, Quote.booking_id == booking_id)
    )
    quote = result.scalar_one_or_none()
    if not quote:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quote not found")

    now = datetime.now(UTC)

    if data.action == "accept":
        quote.status = "accepted"
        quote.updated_at = now
        old_status = booking.status
        booking.status = "quote_accepted"
        booking.total_amount = quote.amount
        booking.updated_at = now
        await db.flush()

        await _create_event(
            db, booking.id, "status_change", user_id, "customer",
            from_status=old_status, to_status="quote_accepted",
            note=f"Quote of {quote.amount} accepted",
        )
    else:
        quote.status = "rejected"
        quote.updated_at = now
        await db.flush()

        await _create_event(
            db, booking.id, "quote_rejected", user_id, "customer",
            note=f"Quote of {quote.amount} rejected",
        )

    return _quote_response(quote)
