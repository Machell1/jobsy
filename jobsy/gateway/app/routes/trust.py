"""Trust & Safety routes embedded directly in the gateway."""

import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from shared.database import get_db

from ..deps import get_current_user
from ..models_trust import Appeal, BlockedUser, Report, Suspension

router = APIRouter(tags=["trust"])


# --- Request schemas ---


class ReportCreate(BaseModel):
    target_type: str = Field(..., pattern=r"^(user|post|comment|message|listing|review)$")
    target_id: str
    reason: str = Field(
        ...,
        pattern=r"^(spam|harassment|fraud|impersonation|inappropriate|scam|other)$",
    )
    description: str | None = None
    evidence_urls: list[str] = Field(default_factory=list)


class AppealCreate(BaseModel):
    suspension_id: str
    reason: str = Field(..., min_length=1)
    evidence_urls: list[str] = Field(default_factory=list)


# --- Routes ---


@router.post("/reports", status_code=status.HTTP_201_CREATED)
async def submit_report(
    data: ReportCreate,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Submit a report against content or another user."""
    now = datetime.now(UTC)
    report = Report(
        id=str(uuid.uuid4()),
        reporter_id=user["user_id"],
        target_type=data.target_type,
        target_id=data.target_id,
        reason=data.reason,
        description=data.description,
        evidence_urls=data.evidence_urls,
        created_at=now,
        updated_at=now,
    )
    db.add(report)
    await db.flush()
    return {"id": report.id, "status": "pending"}


@router.get("/reports/mine")
async def list_my_reports(
    user: dict = Depends(get_current_user),
    limit: int = Query(default=20, le=100),
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
):
    """List reports submitted by the current user."""
    query = (
        select(Report)
        .where(Report.reporter_id == user["user_id"])
        .order_by(Report.created_at.desc())
        .offset(offset)
        .limit(limit)
    )
    result = await db.execute(query)
    reports = result.scalars().all()
    return [
        {
            "id": r.id,
            "target_type": r.target_type,
            "target_id": r.target_id,
            "reason": r.reason,
            "status": r.status,
            "created_at": r.created_at.isoformat(),
        }
        for r in reports
    ]


@router.post("/block/{user_id}", status_code=status.HTTP_201_CREATED)
async def block_user(
    user_id: str,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Block another user."""
    if user["user_id"] == user_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot block yourself")

    # Check if already blocked
    existing = await db.execute(
        select(BlockedUser).where(
            BlockedUser.blocker_id == user["user_id"],
            BlockedUser.blocked_id == user_id,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="User already blocked")

    block = BlockedUser(
        id=str(uuid.uuid4()),
        blocker_id=user["user_id"],
        blocked_id=user_id,
        created_at=datetime.now(UTC),
    )
    db.add(block)
    await db.flush()
    return {"status": "blocked", "blocked_id": user_id}


@router.delete("/block/{user_id}")
async def unblock_user(
    user_id: str,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Unblock a user."""
    result = await db.execute(
        select(BlockedUser).where(
            BlockedUser.blocker_id == user["user_id"],
            BlockedUser.blocked_id == user_id,
        )
    )
    block = result.scalar_one_or_none()
    if not block:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Block not found")

    await db.delete(block)
    await db.flush()
    return {"status": "unblocked", "blocked_id": user_id}


@router.get("/blocked")
async def list_blocked_users(
    user: dict = Depends(get_current_user),
    limit: int = Query(default=50, le=200),
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
):
    """List users blocked by the current user."""
    query = (
        select(BlockedUser)
        .where(BlockedUser.blocker_id == user["user_id"])
        .order_by(BlockedUser.created_at.desc())
        .offset(offset)
        .limit(limit)
    )
    result = await db.execute(query)
    blocks = result.scalars().all()
    return [
        {
            "id": b.id,
            "blocked_id": b.blocked_id,
            "created_at": b.created_at.isoformat(),
        }
        for b in blocks
    ]


@router.post("/appeals", status_code=status.HTTP_201_CREATED)
async def submit_appeal(
    data: AppealCreate,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Submit an appeal for a suspension."""
    # Verify the suspension exists and belongs to this user
    result = await db.execute(
        select(Suspension).where(
            Suspension.id == data.suspension_id,
            Suspension.user_id == user["user_id"],
        )
    )
    suspension = result.scalar_one_or_none()
    if not suspension:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Suspension not found or does not belong to you",
        )

    # Check for existing appeal on this suspension
    existing = await db.execute(
        select(Appeal).where(
            Appeal.suspension_id == data.suspension_id,
            Appeal.user_id == user["user_id"],
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Appeal already submitted for this suspension",
        )

    appeal = Appeal(
        id=str(uuid.uuid4()),
        suspension_id=data.suspension_id,
        user_id=user["user_id"],
        reason=data.reason,
        evidence_urls=data.evidence_urls,
        created_at=datetime.now(UTC),
    )
    db.add(appeal)
    await db.flush()
    return {"id": appeal.id, "status": "pending"}
