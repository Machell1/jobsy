"""Admin service API routes -- dashboard stats, user management, moderation, audit log."""

import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from shared.database import get_db
from shared.events import publish_event

from .deps import require_admin
from .models import AuditLog, ModerationQueue, Profile, VerificationRequest

router = APIRouter(tags=["admin"])


async def _log_action(
    db: AsyncSession,
    admin_id: str,
    action: str,
    target_type: str,
    target_id: str,
    reason: str | None = None,
    details: dict | None = None,
) -> None:
    """Record an admin action in the audit log."""
    entry = AuditLog(
        id=str(uuid.uuid4()),
        admin_id=admin_id,
        action=action,
        target_type=target_type,
        target_id=target_id,
        reason=reason,
        details=details or {},
        created_at=datetime.now(UTC),
    )
    db.add(entry)


# --- Dashboard ---


@router.get("/dashboard/stats")
async def get_dashboard_stats(
    admin_id: str = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Get platform overview statistics.

    Queries aggregate counts from the shared database.
    In production, these would be cached or pre-computed.
    """
    # These queries hit the shared database tables from other services
    stats = {}

    # Moderation queue stats
    pending_result = await db.execute(
        select(func.count()).select_from(ModerationQueue).where(ModerationQueue.status == "pending")
    )
    stats["pending_moderation"] = pending_result.scalar() or 0

    resolved_result = await db.execute(
        select(func.count()).select_from(ModerationQueue).where(ModerationQueue.status == "resolved")
    )
    stats["resolved_moderation"] = resolved_result.scalar() or 0

    # Recent admin actions
    actions_result = await db.execute(
        select(func.count()).select_from(AuditLog)
    )
    stats["total_admin_actions"] = actions_result.scalar() or 0

    return stats


# --- Moderation ---


@router.get("/moderation")
async def list_moderation_items(
    admin_id: str = Depends(require_admin),
    status_filter: str = Query(default="pending", alias="status"),
    item_type: str | None = None,
    limit: int = Query(default=20, le=100),
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
):
    """List items in the moderation queue."""
    query = (
        select(ModerationQueue)
        .where(ModerationQueue.status == status_filter)
        .order_by(ModerationQueue.created_at.asc())
        .offset(offset)
        .limit(limit)
    )

    if item_type:
        query = query.where(ModerationQueue.item_type == item_type)

    result = await db.execute(query)
    items = result.scalars().all()

    return [
        {
            "id": item.id,
            "item_type": item.item_type,
            "item_id": item.item_id,
            "reported_by": item.reported_by,
            "reason": item.reason,
            "status": item.status,
            "created_at": item.created_at.isoformat(),
        }
        for item in items
    ]


class ModerateAction(BaseModel):
    action: str = Field(..., pattern=r"^(approve|remove|dismiss)$")
    reason: str | None = None


@router.post("/moderation/{item_id}/resolve")
async def resolve_moderation_item(
    item_id: str,
    data: ModerateAction,
    admin_id: str = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Resolve a moderation queue item."""
    result = await db.execute(select(ModerationQueue).where(ModerationQueue.id == item_id))
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Moderation item not found")

    now = datetime.now(UTC)

    if data.action == "dismiss":
        item.status = "dismissed"
    else:
        item.status = "resolved"

    item.reviewed_by = admin_id
    item.resolution = f"{data.action}: {data.reason or 'No reason provided'}"
    item.resolved_at = now
    await db.flush()

    await _log_action(
        db, admin_id,
        action=f"moderation.{data.action}",
        target_type=item.item_type,
        target_id=item.item_id,
        reason=data.reason,
        details={"moderation_item_id": item_id},
    )
    await db.flush()

    return {"status": "resolved", "action": data.action, "item_id": item_id}


# --- User management ---


class UserAction(BaseModel):
    action: str = Field(..., pattern=r"^(suspend|unsuspend|warn|delete)$")
    reason: str = Field(..., min_length=1)


@router.post("/users/{user_id}/action")
async def admin_user_action(
    user_id: str,
    data: UserAction,
    admin_id: str = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Take an administrative action on a user account.

    Actions: suspend, unsuspend, warn, delete.
    All actions are logged in the audit trail.
    """
    # Update profile state
    profile_result = await db.execute(select(Profile).where(Profile.user_id == user_id))
    profile = profile_result.scalar_one_or_none()

    if data.action == "suspend" and profile:
        profile.is_active = False
    elif data.action == "unsuspend" and profile:
        profile.is_active = True

    await _log_action(
        db, admin_id,
        action=f"user.{data.action}",
        target_type="user",
        target_id=user_id,
        reason=data.reason,
    )
    await db.flush()

    await publish_event(f"user.{data.action}", {
        "user_id": user_id,
        "admin_id": admin_id,
        "reason": data.reason,
    })

    return {
        "status": "ok",
        "action": data.action,
        "user_id": user_id,
        "admin_id": admin_id,
    }


# --- Audit log ---


@router.get("/audit-log")
async def get_audit_log(
    admin_id: str = Depends(require_admin),
    action: str | None = None,
    target_type: str | None = None,
    limit: int = Query(default=50, le=200),
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
):
    """View the admin audit log."""
    query = (
        select(AuditLog)
        .order_by(AuditLog.created_at.desc())
        .offset(offset)
        .limit(limit)
    )

    if action:
        query = query.where(AuditLog.action == action)
    if target_type:
        query = query.where(AuditLog.target_type == target_type)

    result = await db.execute(query)
    entries = result.scalars().all()

    return [
        {
            "id": e.id,
            "admin_id": e.admin_id,
            "action": e.action,
            "target_type": e.target_type,
            "target_id": e.target_id,
            "reason": e.reason,
            "details": e.details,
            "created_at": e.created_at.isoformat(),
        }
        for e in entries
    ]


# --- Verification management ---


@router.get("/verifications/pending")
async def list_pending_verifications(
    admin_id: str = Depends(require_admin),
    limit: int = Query(default=20, le=100),
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
):
    """List pending verification requests."""
    query = (
        select(VerificationRequest)
        .where(VerificationRequest.status == "pending")
        .order_by(VerificationRequest.submitted_at.asc())
        .offset(offset)
        .limit(limit)
    )

    result = await db.execute(query)
    items = result.scalars().all()

    return [
        {
            "id": item.id,
            "user_id": item.user_id,
            "document_urls": item.document_urls,
            "status": item.status,
            "submitted_at": item.submitted_at.isoformat(),
        }
        for item in items
    ]


class VerificationReview(BaseModel):
    action: str = Field(..., pattern=r"^(approve|reject)$")
    reviewer_notes: str | None = None


@router.post("/verifications/{request_id}/review")
async def review_verification(
    request_id: str,
    data: VerificationReview,
    admin_id: str = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Approve or reject a verification request."""
    result = await db.execute(
        select(VerificationRequest).where(VerificationRequest.id == request_id)
    )
    verification = result.scalar_one_or_none()
    if not verification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Verification request not found",
        )

    if verification.status != "pending":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Verification request already {verification.status}",
        )

    now = datetime.now(UTC)

    if data.action == "approve":
        verification.status = "approved"

        # Update Profile.is_verified
        profile_result = await db.execute(
            select(Profile).where(Profile.user_id == verification.user_id)
        )
        profile = profile_result.scalar_one_or_none()
        if profile:
            profile.is_verified = True

        # Publish profile.verified event
        await publish_event("profile.verified", {
            "user_id": verification.user_id,
            "verification_request_id": verification.id,
        })
    else:
        verification.status = "rejected"

    verification.reviewer_notes = data.reviewer_notes
    verification.reviewed_at = now
    await db.flush()

    # Log in audit trail
    await _log_action(
        db, admin_id,
        action=f"verification.{data.action}",
        target_type="verification_request",
        target_id=request_id,
        reason=data.reviewer_notes,
        details={"user_id": verification.user_id},
    )
    await db.flush()

    return {
        "status": verification.status,
        "action": data.action,
        "request_id": request_id,
    }


# --- Content management ---


class ReportCreate(BaseModel):
    item_type: str = Field(..., pattern=r"^(review|listing|profile|message)$")
    item_id: str
    reason: str = Field(..., max_length=200)


def _get_user_id(request: Request) -> str:
    """Extract user ID -- any authenticated user can submit reports."""
    user_id = request.headers.get("X-User-ID")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")
    return user_id


@router.post("/report", status_code=status.HTTP_201_CREATED)
async def submit_report(
    data: ReportCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Submit a report -- any authenticated user can flag content for review."""
    reporter_id = _get_user_id(request)
    item = ModerationQueue(
        id=str(uuid.uuid4()),
        item_type=data.item_type,
        item_id=data.item_id,
        reported_by=reporter_id,
        reason=data.reason,
        created_at=datetime.now(UTC),
    )
    db.add(item)
    await db.flush()

    return {"id": item.id, "status": "pending"}
