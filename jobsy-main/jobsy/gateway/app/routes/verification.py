"""Verification Badges routes for the gateway.

Handles badge requests, approvals, and public badge lookups.
"""

import logging
import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from shared.database import get_db

from ..deps import get_current_user
from ..models_payments import VerificationBadge

logger = logging.getLogger(__name__)

router = APIRouter(tags=["verification"])

BADGE_TYPES = {
    "phone_verified",
    "email_verified",
    "id_verified",
    "face_verified",
    "address_verified",
    "company_docs",
    "business_background",
    "school_registration",
    "authorized_rep",
    "background_checked",
    "business_registered",
}

AUTO_GRANT_BADGES = {"phone_verified", "email_verified"}

# Badges that require document evidence (not screenshots or edited docs)
DOCUMENT_EVIDENCE_BADGES = {"address_verified", "company_docs", "school_registration", "id_verified"}

# Address verification: must be utility bill or bank statement within 3 months
ADDRESS_VERIFICATION_NOTE = (
    "Accepted documents: utility bill or bank statement dated within the last 3 months. "
    "Screenshots and digitally edited documents are NOT accepted. "
    "Upload original PDF or photograph of physical document only."
)


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

VALID_BADGE_TYPES = "|".join(VALID_BADGES)

class VerificationRequest(BaseModel):
    badge_type: str = Field(..., pattern=rf"^({VALID_BADGE_TYPES})$")
    evidence_url: str | None = None


class BadgeReview(BaseModel):
    approved: bool
    notes: str | None = None


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _badge_response(b: VerificationBadge) -> dict:
    return {
        "id": b.id,
        "user_id": b.user_id,
        "badge_type": b.badge_type,
        "evidence_url": b.evidence_url,
        "status": b.status,
        "notes": b.notes,
        "reviewed_by": b.reviewed_by,
        "reviewed_at": b.reviewed_at.isoformat() if b.reviewed_at else None,
        "created_at": b.created_at.isoformat(),
    }


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@router.post("/request", status_code=201)
async def request_verification(
    data: VerificationRequest,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Submit a verification badge request."""
    uid = user["user_id"]

    if data.badge_type not in BADGE_TYPES:
        raise HTTPException(status_code=400, detail=f"Invalid badge type: {data.badge_type}")

    # Check if already has this badge
    existing = await db.execute(
        select(VerificationBadge).where(
            VerificationBadge.user_id == uid,
            VerificationBadge.badge_type == data.badge_type,
            VerificationBadge.status.in_(["pending", "approved"]),
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Badge already requested or granted")

    # ID and business badges require evidence
    if data.badge_type in ("id_verified", "background_checked", "business_registered"):
        if not data.evidence_url:
            raise HTTPException(status_code=400, detail="Evidence URL required for this badge type")

    now = datetime.now(UTC)

    # Auto-grant phone and email badges
    auto_approved = data.badge_type in AUTO_GRANT_BADGES
    badge = VerificationBadge(
        id=str(uuid.uuid4()),
        user_id=uid,
        badge_type=data.badge_type,
        evidence_url=data.evidence_url,
        status="approved" if auto_approved else "pending",
        reviewed_at=now if auto_approved else None,
        reviewed_by="system" if auto_approved else None,
        notes="Auto-granted" if auto_approved else None,
        created_at=now,
        updated_at=now,
    )
    db.add(badge)
    await db.flush()

    return _badge_response(badge)


@router.get("/badges/{user_id}")
async def get_user_badges(
    user_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Get all approved verification badges for a user (public endpoint)."""
    result = await db.execute(
        select(VerificationBadge).where(
            VerificationBadge.user_id == user_id,
            VerificationBadge.status == "approved",
        ).order_by(VerificationBadge.created_at)
    )
    badges = result.scalars().all()
    return [_badge_response(b) for b in badges]


@router.get("/my-badges")
async def get_my_badges(
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get all badge requests and badges for the current user."""
    uid = user["user_id"]
    result = await db.execute(
        select(VerificationBadge).where(
            VerificationBadge.user_id == uid,
        ).order_by(VerificationBadge.created_at)
    )
    badges = result.scalars().all()
    return [_badge_response(b) for b in badges]


@router.post("/admin/review/{badge_id}")
async def review_badge(
    badge_id: str,
    data: BadgeReview,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Admin approve or reject a badge request."""
    result = await db.execute(
        select(VerificationBadge).where(VerificationBadge.id == badge_id)
    )
    badge = result.scalar_one_or_none()
    if not badge:
        raise HTTPException(status_code=404, detail="Badge request not found")

    if badge.status != "pending":
        raise HTTPException(status_code=400, detail=f"Badge is already {badge.status}")

    now = datetime.now(UTC)
    badge.status = "approved" if data.approved else "rejected"
    badge.notes = data.notes
    badge.reviewed_by = user["user_id"]
    badge.reviewed_at = now
    badge.updated_at = now
    await db.flush()

    logger.info(
        "Badge %s %s for user %s by admin %s",
        badge_id, badge.status, badge.user_id, user["user_id"],
    )

    return _badge_response(badge)
