"""Reviews routes merged into the gateway (formerly reviews microservice)."""

import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from shared.database import get_db
from shared.events import publish_event

from ..deps import get_current_user, get_optional_user
from ..models_reviews import ReputationMetrics, Review, ReviewResponse, UserRating

router = APIRouter(tags=["reviews"])


class ReviewCreate(BaseModel):
    reviewee_id: str
    listing_id: str | None = None
    transaction_id: str | None = None
    booking_id: str | None = None
    rating: int = Field(..., ge=1, le=5)
    title: str | None = Field(default=None, max_length=200)
    body: str | None = None
    quality_rating: int | None = Field(default=None, ge=1, le=5)
    punctuality_rating: int | None = Field(default=None, ge=1, le=5)
    communication_rating: int | None = Field(default=None, ge=1, le=5)
    value_rating: int | None = Field(default=None, ge=1, le=5)


async def _update_user_rating(user_id: str, db: AsyncSession) -> None:
    """Recalculate aggregated ratings for a user."""
    result = await db.execute(
        select(
            func.count(Review.id),
            func.avg(Review.rating),
            func.avg(Review.quality_rating),
            func.avg(Review.punctuality_rating),
            func.avg(Review.communication_rating),
            func.avg(Review.value_rating),
        ).where(Review.reviewee_id == user_id, Review.is_visible.is_(True))
    )
    row = result.one()
    total, avg_rating, avg_q, avg_p, avg_c, avg_v = row

    now = datetime.now(UTC)

    existing = await db.execute(select(UserRating).where(UserRating.user_id == user_id))
    user_rating = existing.scalar_one_or_none()

    if user_rating:
        user_rating.total_reviews = total or 0
        user_rating.average_rating = avg_rating or 0
        user_rating.average_quality = avg_q
        user_rating.average_punctuality = avg_p
        user_rating.average_communication = avg_c
        user_rating.average_value = avg_v
        user_rating.updated_at = now
    else:
        user_rating = UserRating(
            user_id=user_id,
            total_reviews=total or 0,
            average_rating=avg_rating or 0,
            average_quality=avg_q,
            average_punctuality=avg_p,
            average_communication=avg_c,
            average_value=avg_v,
            updated_at=now,
        )
        db.add(user_rating)

    await db.flush()


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_review(
    data: ReviewCreate,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a review for a user after a completed service."""
    reviewer_id = user["user_id"]

    if reviewer_id == data.reviewee_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot review yourself")

    if data.booking_id:
        from ..models_bookings import Booking
        booking_r = await db.execute(select(Booking).where(Booking.id == data.booking_id))
        booking = booking_r.scalar_one_or_none()
        if not booking:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found")
        if booking.customer_id != reviewer_id and booking.provider_id != reviewer_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You are not a party to this booking")
        if booking.status != "completed":
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Booking is not completed")

    if data.transaction_id:
        existing = await db.execute(
            select(Review).where(
                Review.reviewer_id == reviewer_id,
                Review.transaction_id == data.transaction_id,
            )
        )
        if existing.scalar_one_or_none():
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Already reviewed this transaction")

    now = datetime.now(UTC)
    review = Review(
        id=str(uuid.uuid4()),
        reviewer_id=reviewer_id,
        reviewee_id=data.reviewee_id,
        listing_id=data.listing_id,
        transaction_id=data.transaction_id,
        booking_id=data.booking_id,
        rating=data.rating,
        title=data.title,
        body=data.body,
        quality_rating=data.quality_rating,
        punctuality_rating=data.punctuality_rating,
        communication_rating=data.communication_rating,
        value_rating=data.value_rating,
        is_verified=bool(data.transaction_id),
        is_verified_purchase=bool(data.booking_id),
        created_at=now,
        updated_at=now,
    )
    db.add(review)
    await db.flush()

    await _update_user_rating(data.reviewee_id, db)

    await publish_event(
        "review.created",
        {
            "review_id": review.id,
            "reviewer_id": reviewer_id,
            "reviewee_id": data.reviewee_id,
            "rating": data.rating,
        },
    )

    return {
        "id": review.id,
        "rating": review.rating,
        "is_verified": review.is_verified,
        "created_at": review.created_at.isoformat(),
    }


@router.get("/received")
async def get_reviews_received(
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get reviews received by the current user."""
    user_id = user["user_id"]
    query = (
        select(Review)
        .where(Review.reviewee_id == user_id, Review.is_visible.is_(True))
        .order_by(Review.created_at.desc())
        .limit(50)
    )
    result = await db.execute(query)
    reviews = result.scalars().all()

    return [
        {
            "id": r.id,
            "reviewer_id": r.reviewer_id,
            "reviewee_id": r.reviewee_id,
            "listing_id": r.listing_id,
            "booking_id": r.booking_id,
            "rating": r.rating,
            "title": r.title,
            "body": r.body,
            "quality_rating": r.quality_rating,
            "punctuality_rating": r.punctuality_rating,
            "communication_rating": r.communication_rating,
            "value_rating": r.value_rating,
            "is_verified": r.is_verified,
            "is_visible": r.is_visible,
            "created_at": r.created_at.isoformat(),
        }
        for r in reviews
    ]


@router.get("/user/{user_id}")
async def get_user_reviews(
    user_id: str,
    limit: int = Query(default=20, le=100),
    offset: int = 0,
    _user: dict = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
):
    """Get all reviews for a user."""
    query = (
        select(Review)
        .where(Review.reviewee_id == user_id, Review.is_visible.is_(True))
        .order_by(Review.created_at.desc())
        .offset(offset)
        .limit(limit)
    )
    result = await db.execute(query)
    reviews = result.scalars().all()

    return [
        {
            "id": r.id,
            "reviewer_id": r.reviewer_id,
            "rating": r.rating,
            "title": r.title,
            "body": r.body,
            "quality_rating": r.quality_rating,
            "punctuality_rating": r.punctuality_rating,
            "communication_rating": r.communication_rating,
            "value_rating": r.value_rating,
            "is_verified": r.is_verified,
            "created_at": r.created_at.isoformat(),
        }
        for r in reviews
    ]


@router.get("/user/{user_id}/summary")
async def get_user_rating_summary(
    user_id: str,
    _user: dict = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
):
    """Get aggregated rating summary for a user."""
    result = await db.execute(select(UserRating).where(UserRating.user_id == user_id))
    rating = result.scalar_one_or_none()

    if not rating:
        return {
            "user_id": user_id,
            "total_reviews": 0,
            "average_rating": 0,
            "breakdown": None,
        }

    return {
        "user_id": user_id,
        "total_reviews": rating.total_reviews,
        "average_rating": float(rating.average_rating),
        "breakdown": {
            "quality": float(rating.average_quality) if rating.average_quality else None,
            "punctuality": float(rating.average_punctuality) if rating.average_punctuality else None,
            "communication": float(rating.average_communication) if rating.average_communication else None,
            "value": float(rating.average_value) if rating.average_value else None,
        },
    }


class ResponseCreate(BaseModel):
    body: str = Field(..., min_length=1, max_length=2000)


@router.post("/{review_id}/respond", status_code=status.HTTP_201_CREATED)
async def respond_to_review(
    review_id: str,
    data: ResponseCreate,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Allow the reviewee to respond to a review (one response per review)."""
    user_id = user["user_id"]

    result = await db.execute(select(Review).where(Review.id == review_id))
    review = result.scalar_one_or_none()
    if not review:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Review not found")
    if review.reviewee_id != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the reviewee can respond")

    existing = await db.execute(select(ReviewResponse).where(ReviewResponse.review_id == review_id))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Already responded to this review")

    response = ReviewResponse(
        id=str(uuid.uuid4()),
        review_id=review_id,
        responder_id=user_id,
        body=data.body,
        created_at=datetime.now(UTC),
    )
    db.add(response)
    await db.flush()

    return {"id": response.id, "review_id": review_id, "created_at": response.created_at.isoformat()}


@router.post("/{review_id}/flag")
async def flag_review(
    review_id: str,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Flag a review for moderation."""
    result = await db.execute(select(Review).where(Review.id == review_id))
    review = result.scalar_one_or_none()
    if not review:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Review not found")

    review.is_flagged = True
    review.updated_at = datetime.now(UTC)
    await db.flush()

    return {"status": "flagged", "review_id": review_id}


# --- Reputation ---


@router.get("/reputation/{user_id}")
async def get_reputation(
    user_id: str,
    _user: dict = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
):
    """Get reputation metrics for a user."""
    result = await db.execute(select(ReputationMetrics).where(ReputationMetrics.user_id == user_id))
    metrics = result.scalar_one_or_none()

    if not metrics:
        return {
            "user_id": user_id,
            "total_jobs_completed": 0,
            "repeat_client_rate": 0,
            "response_rate": 0,
            "on_time_rate": 0,
            "cancellation_rate": 0,
            "badge_level": "none",
            "trust_score": 0,
        }

    return {
        "user_id": user_id,
        "total_jobs_completed": metrics.total_jobs_completed,
        "repeat_client_rate": float(metrics.repeat_client_rate),
        "response_rate": float(metrics.response_rate),
        "on_time_rate": float(metrics.on_time_rate),
        "cancellation_rate": float(metrics.cancellation_rate),
        "badge_level": metrics.badge_level,
        "trust_score": float(metrics.trust_score),
        "updated_at": metrics.updated_at.isoformat(),
    }


# --- Moderation ---


@router.get("/moderation-queue")
async def moderation_queue(
    limit: int = Query(default=20, le=100),
    offset: int = 0,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get reviews pending moderation (flagged or pending status)."""
    if user.get("active_role") != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    query = (
        select(Review)
        .where((Review.is_flagged.is_(True)) | (Review.moderation_status == "pending"))
        .order_by(Review.created_at.desc())
        .offset(offset)
        .limit(limit)
    )
    result = await db.execute(query)
    reviews = result.scalars().all()

    return [
        {
            "id": r.id,
            "reviewer_id": r.reviewer_id,
            "reviewee_id": r.reviewee_id,
            "rating": r.rating,
            "title": r.title,
            "body": r.body,
            "is_flagged": r.is_flagged,
            "moderation_status": r.moderation_status,
            "moderation_note": r.moderation_note,
            "created_at": r.created_at.isoformat(),
        }
        for r in reviews
    ]


class ModerationUpdate(BaseModel):
    status: str = Field(..., pattern=r"^(approved|rejected|pending)$")
    note: str | None = None


@router.put("/{review_id}/moderate")
async def moderate_review(
    review_id: str,
    data: ModerationUpdate,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update moderation status of a review."""
    if user.get("active_role") != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    result = await db.execute(select(Review).where(Review.id == review_id))
    review = result.scalar_one_or_none()
    if not review:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Review not found")

    review.moderation_status = data.status
    review.moderation_note = data.note
    if data.status == "rejected":
        review.is_visible = False
    elif data.status == "approved":
        review.is_visible = True
    review.updated_at = datetime.now(UTC)
    await db.flush()

    return {
        "id": review.id,
        "moderation_status": review.moderation_status,
        "moderation_note": review.moderation_note,
        "is_visible": review.is_visible,
    }
