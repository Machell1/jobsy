"""Admin service API routes -- dashboard stats, user management, moderation, audit log."""

import json
import logging
import uuid
from datetime import UTC, datetime, timedelta

import redis.asyncio as aioredis
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from pydantic import BaseModel, Field
from sqlalchemy import extract, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from shared.config import REDIS_URL
from shared.database import get_db
from shared.events import publish_event
from shared.models.verification import VerificationReviewAction, VerificationStatsResponse

from .deps import require_admin
from .models import (
    AdminRole,
    AdminRoleAssignment,
    Appeal,
    AuditLog,
    Category,
    ModerationQueue,
    Profile,
    ProviderProfile,
    Report,
    Suspension,
    VerificationAsset,
    VerificationRequest,
)

logger = logging.getLogger(__name__)

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
    """Get platform overview statistics with Redis caching."""
    cache_key = "admin:dashboard:stats"
    cache_ttl = 60  # seconds

    # Try Redis cache first
    if REDIS_URL:
        try:
            redis_client = aioredis.from_url(REDIS_URL, decode_responses=True)
            cached = await redis_client.get(cache_key)
            if cached:
                await redis_client.close()
                return json.loads(cached)
        except Exception:
            logger.warning("Redis cache unavailable for dashboard stats")
            redis_client = None
    else:
        redis_client = None

    # Query database
    stats = {}

    pending_result = await db.execute(
        select(func.count()).select_from(ModerationQueue).where(ModerationQueue.status == "pending")
    )
    stats["pending_moderation"] = pending_result.scalar() or 0

    resolved_result = await db.execute(
        select(func.count()).select_from(ModerationQueue).where(ModerationQueue.status == "resolved")
    )
    stats["resolved_moderation"] = resolved_result.scalar() or 0

    actions_result = await db.execute(
        select(func.count()).select_from(AuditLog)
    )
    stats["total_admin_actions"] = actions_result.scalar() or 0

    # Cache results
    if redis_client:
        try:
            await redis_client.setex(cache_key, cache_ttl, json.dumps(stats))
            await redis_client.close()
        except Exception:
            logger.warning("Failed to cache dashboard stats in Redis")

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
    verification_type: str | None = Query(default=None, alias="type"),
    limit: int = Query(default=20, le=100),
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
):
    """List pending/submitted verification requests with assets."""
    query = (
        select(VerificationRequest)
        .where(VerificationRequest.status.in_(["pending", "submitted"]))
        .order_by(VerificationRequest.created_at.asc())
        .offset(offset)
        .limit(limit)
    )

    if verification_type:
        query = query.where(VerificationRequest.type == verification_type)

    result = await db.execute(query)
    items = result.scalars().all()

    response = []
    for item in items:
        assets_result = await db.execute(
            select(VerificationAsset).where(VerificationAsset.verification_request_id == item.id)
        )
        assets = assets_result.scalars().all()
        response.append({
            "id": item.id,
            "user_id": item.user_id,
            "type": item.type,
            "document_urls": item.document_urls,
            "status": item.status,
            "submitted_at": item.submitted_at.isoformat() if item.submitted_at else None,
            "created_at": item.created_at.isoformat(),
            "assets": [
                {
                    "id": a.id,
                    "asset_type": a.asset_type,
                    "file_url": a.file_url,
                    "thumbnail_url": a.thumbnail_url,
                    "mime_type": a.mime_type,
                }
                for a in assets
            ],
        })
    return response


@router.post("/verifications/{request_id}/review")
async def review_verification(
    request_id: str,
    data: VerificationReviewAction,
    admin_id: str = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Review a verification request: approve, reject, or request resubmission."""
    result = await db.execute(
        select(VerificationRequest).where(VerificationRequest.id == request_id)
    )
    verification = result.scalar_one_or_none()
    if not verification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Verification request not found",
        )

    if verification.status not in ("pending", "submitted", "under_review"):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Cannot review a request in '{verification.status}' state",
        )

    now = datetime.now(UTC)

    if data.decision == "approve":
        verification.status = "approved"
        verification.badge_level = data.badge_level

        # Update Profile.is_verified
        profile_result = await db.execute(
            select(Profile).where(Profile.user_id == verification.user_id)
        )
        profile = profile_result.scalar_one_or_none()
        if profile:
            profile.is_verified = True

        # Update provider_profiles.verification_status based on type
        pp_result = await db.execute(
            select(ProviderProfile).where(ProviderProfile.user_id == verification.user_id)
        )
        pp = pp_result.scalar_one_or_none()
        if pp:
            if verification.type == "photo":
                pp.verification_status = "photo_verified"
            elif verification.type in ("government_id", "licence", "certification"):
                pp.verification_status = "advanced_verified"

        await publish_event("profile.verified", {
            "user_id": verification.user_id,
            "verification_request_id": verification.id,
            "badge_level": data.badge_level,
        })

    elif data.decision == "reject":
        verification.status = "rejected"
        verification.rejection_reason = data.rejection_reason

    elif data.decision == "request_resubmission":
        verification.status = "resubmission_requested"
        verification.resubmission_guidance = data.resubmission_guidance

    verification.reviewer_notes = data.reviewer_notes
    verification.reviewer_id = admin_id
    verification.reviewed_at = now
    verification.updated_at = now
    await db.flush()

    # Log in audit trail
    await _log_action(
        db, admin_id,
        action=f"verification.{data.decision}",
        target_type="verification_request",
        target_id=request_id,
        reason=data.reviewer_notes,
        details={"user_id": verification.user_id, "type": verification.type},
    )
    await db.flush()

    return {
        "status": verification.status,
        "decision": data.decision,
        "request_id": request_id,
    }


@router.get("/verifications/stats", response_model=VerificationStatsResponse)
async def get_verification_stats(
    admin_id: str = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Get verification statistics."""
    pending_result = await db.execute(
        select(func.count()).select_from(VerificationRequest)
        .where(VerificationRequest.status.in_(["pending", "submitted", "under_review"]))
    )
    pending_count = pending_result.scalar() or 0

    today_start = datetime.now(UTC).replace(hour=0, minute=0, second=0, microsecond=0)

    approved_result = await db.execute(
        select(func.count()).select_from(VerificationRequest)
        .where(
            VerificationRequest.status == "approved",
            VerificationRequest.reviewed_at >= today_start,
        )
    )
    approved_today = approved_result.scalar() or 0

    rejected_result = await db.execute(
        select(func.count()).select_from(VerificationRequest)
        .where(
            VerificationRequest.status == "rejected",
            VerificationRequest.reviewed_at >= today_start,
        )
    )
    rejected_today = rejected_result.scalar() or 0

    # Average review time for requests reviewed in the last 30 days
    thirty_days_ago = datetime.now(UTC) - timedelta(days=30)
    avg_result = await db.execute(
        select(
            func.avg(
                extract("epoch", VerificationRequest.reviewed_at) -
                extract("epoch", VerificationRequest.submitted_at)
            )
        ).where(
            VerificationRequest.reviewed_at.is_not(None),
            VerificationRequest.submitted_at.is_not(None),
            VerificationRequest.reviewed_at >= thirty_days_ago,
        )
    )
    avg_seconds = avg_result.scalar()
    avg_review_time_hours = round(avg_seconds / 3600, 1) if avg_seconds else None

    return VerificationStatsResponse(
        pending_count=pending_count,
        approved_today=approved_today,
        rejected_today=rejected_today,
        avg_review_time_hours=avg_review_time_hours,
    )


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


# --- Trust & Safety admin routes ---


@router.get("/reports")
async def list_reports(
    admin_id: str = Depends(require_admin),
    status_filter: str | None = Query(default=None, alias="status"),
    severity: str | None = None,
    target_type: str | None = None,
    limit: int = Query(default=20, le=100),
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
):
    """List user reports with optional filters."""
    query = select(Report).order_by(Report.created_at.desc()).offset(offset).limit(limit)
    if status_filter:
        query = query.where(Report.status == status_filter)
    if severity:
        query = query.where(Report.severity == severity)
    if target_type:
        query = query.where(Report.target_type == target_type)

    result = await db.execute(query)
    reports = result.scalars().all()
    return [
        {
            "id": r.id,
            "reporter_id": r.reporter_id,
            "target_type": r.target_type,
            "target_id": r.target_id,
            "reason": r.reason,
            "severity": r.severity,
            "status": r.status,
            "assigned_to": r.assigned_to,
            "created_at": r.created_at.isoformat(),
        }
        for r in reports
    ]


@router.get("/reports/{report_id}")
async def get_report(
    report_id: str,
    admin_id: str = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Get full report detail."""
    result = await db.execute(select(Report).where(Report.id == report_id))
    report = result.scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found")
    return {
        "id": report.id,
        "reporter_id": report.reporter_id,
        "target_type": report.target_type,
        "target_id": report.target_id,
        "reason": report.reason,
        "description": report.description,
        "evidence_urls": report.evidence_urls,
        "severity": report.severity,
        "status": report.status,
        "assigned_to": report.assigned_to,
        "resolution_note": report.resolution_note,
        "resolved_at": report.resolved_at.isoformat() if report.resolved_at else None,
        "created_at": report.created_at.isoformat(),
        "updated_at": report.updated_at.isoformat(),
    }


class ReportResolve(BaseModel):
    status: str = Field(..., pattern=r"^(under_review|resolved|dismissed)$")
    severity: str | None = Field(default=None, pattern=r"^(low|medium|high|critical)$")
    resolution_note: str | None = None


@router.put("/reports/{report_id}/resolve")
async def resolve_report(
    report_id: str,
    data: ReportResolve,
    admin_id: str = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Resolve a report -- update status, severity, and notes."""
    result = await db.execute(select(Report).where(Report.id == report_id))
    report = result.scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found")

    now = datetime.now(UTC)
    report.status = data.status
    if data.severity:
        report.severity = data.severity
    if data.resolution_note:
        report.resolution_note = data.resolution_note
    report.assigned_to = admin_id
    report.updated_at = now
    if data.status in ("resolved", "dismissed"):
        report.resolved_at = now
    await db.flush()

    await _log_action(
        db, admin_id,
        action=f"report.{data.status}",
        target_type="report",
        target_id=report_id,
        reason=data.resolution_note,
    )
    await db.flush()

    return {"status": report.status, "report_id": report_id}


class SuspensionCreate(BaseModel):
    user_id: str
    reason: str = Field(..., min_length=1)
    suspension_type: str = Field(..., pattern=r"^(warning|temporary|permanent)$")
    ends_at: str | None = None
    report_id: str | None = None


@router.post("/suspensions", status_code=status.HTTP_201_CREATED)
async def create_suspension(
    data: SuspensionCreate,
    admin_id: str = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Issue a suspension or warning to a user."""
    now = datetime.now(UTC)
    suspension = Suspension(
        id=str(uuid.uuid4()),
        user_id=data.user_id,
        reason=data.reason,
        suspension_type=data.suspension_type,
        starts_at=now,
        ends_at=datetime.fromisoformat(data.ends_at) if data.ends_at else None,
        issued_by=admin_id,
        report_id=data.report_id,
        created_at=now,
    )
    db.add(suspension)
    await db.flush()

    await _log_action(
        db, admin_id,
        action=f"suspension.{data.suspension_type}",
        target_type="user",
        target_id=data.user_id,
        reason=data.reason,
        details={"suspension_id": suspension.id},
    )
    await db.flush()

    await publish_event(f"user.{data.suspension_type}", {
        "user_id": data.user_id,
        "suspension_id": suspension.id,
        "admin_id": admin_id,
    })

    return {"id": suspension.id, "status": "active"}


@router.get("/suspensions")
async def list_suspensions(
    admin_id: str = Depends(require_admin),
    is_active: bool | None = None,
    limit: int = Query(default=20, le=100),
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
):
    """List suspensions with optional active filter."""
    query = select(Suspension).order_by(Suspension.created_at.desc()).offset(offset).limit(limit)
    if is_active is not None:
        query = query.where(Suspension.is_active.is_(is_active))

    result = await db.execute(query)
    suspensions = result.scalars().all()
    return [
        {
            "id": s.id,
            "user_id": s.user_id,
            "suspension_type": s.suspension_type,
            "reason": s.reason,
            "is_active": s.is_active,
            "starts_at": s.starts_at.isoformat(),
            "ends_at": s.ends_at.isoformat() if s.ends_at else None,
            "issued_by": s.issued_by,
            "created_at": s.created_at.isoformat(),
        }
        for s in suspensions
    ]


@router.get("/appeals")
async def list_appeals(
    admin_id: str = Depends(require_admin),
    status_filter: str | None = Query(default=None, alias="status"),
    limit: int = Query(default=20, le=100),
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
):
    """List appeals with optional status filter."""
    query = select(Appeal).order_by(Appeal.created_at.desc()).offset(offset).limit(limit)
    if status_filter:
        query = query.where(Appeal.status == status_filter)

    result = await db.execute(query)
    appeals = result.scalars().all()
    return [
        {
            "id": a.id,
            "suspension_id": a.suspension_id,
            "user_id": a.user_id,
            "reason": a.reason,
            "status": a.status,
            "created_at": a.created_at.isoformat(),
        }
        for a in appeals
    ]


class AppealReview(BaseModel):
    decision: str = Field(..., pattern=r"^(approved|denied)$")
    reviewer_notes: str | None = None


@router.put("/appeals/{appeal_id}/review")
async def review_appeal(
    appeal_id: str,
    data: AppealReview,
    admin_id: str = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Review an appeal -- approve or deny."""
    result = await db.execute(select(Appeal).where(Appeal.id == appeal_id))
    appeal = result.scalar_one_or_none()
    if not appeal:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appeal not found")

    now = datetime.now(UTC)
    appeal.status = data.decision
    appeal.reviewed_by = admin_id
    appeal.reviewer_notes = data.reviewer_notes
    appeal.reviewed_at = now
    await db.flush()

    # If approved, deactivate the suspension
    if data.decision == "approved":
        susp_result = await db.execute(
            select(Suspension).where(Suspension.id == appeal.suspension_id)
        )
        suspension = susp_result.scalar_one_or_none()
        if suspension:
            suspension.is_active = False
            await db.flush()

    await _log_action(
        db, admin_id,
        action=f"appeal.{data.decision}",
        target_type="appeal",
        target_id=appeal_id,
        reason=data.reviewer_notes,
        details={"suspension_id": appeal.suspension_id, "user_id": appeal.user_id},
    )
    await db.flush()

    return {"status": appeal.status, "appeal_id": appeal_id}


# --- Phase 3: User Management ---


@router.get("/users")
async def list_users(
    admin_id: str = Depends(require_admin),
    search: str | None = None,
    role: str | None = None,
    parish: str | None = None,
    is_verified: bool | None = None,
    is_active: bool | None = None,
    limit: int = Query(default=50, le=200),
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
):
    """List all users with search, filters, and pagination."""
    query = select(Profile)

    if search:
        query = query.where(Profile.display_name.ilike(f"%{search}%"))
    if parish:
        query = query.where(Profile.parish == parish)
    if is_verified is not None:
        query = query.where(Profile.is_verified == is_verified)
    if is_active is not None:
        query = query.where(Profile.is_active == is_active)

    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar() or 0

    query = query.order_by(Profile.created_at.desc()).offset(offset).limit(limit)
    result = await db.execute(query)
    users = result.scalars().all()

    return {
        "total": total,
        "users": [
            {
                "id": u.id,
                "user_id": u.user_id,
                "display_name": u.display_name,
                "parish": u.parish,
                "is_verified": u.is_verified,
                "is_active": u.is_active,
                "created_at": u.created_at.isoformat() if u.created_at else None,
            }
            for u in users
        ],
    }


@router.get("/users/{user_id}")
async def get_user_detail(
    user_id: str,
    admin_id: str = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Full user detail (profile + provider profile + stats)."""
    result = await db.execute(
        select(Profile).where(Profile.user_id == user_id)
    )
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    # Get provider profile if exists
    pp_result = await db.execute(
        select(ProviderProfile).where(ProviderProfile.user_id == user_id)
    )
    pp = pp_result.scalar_one_or_none()

    # Count reports
    report_count = (await db.execute(
        select(func.count()).select_from(Report).where(Report.reporter_id == user_id)
    )).scalar() or 0

    # Count suspensions
    suspension_count = (await db.execute(
        select(func.count()).select_from(Suspension).where(Suspension.user_id == user_id)
    )).scalar() or 0

    return {
        "profile": {
            "id": profile.id,
            "user_id": profile.user_id,
            "display_name": profile.display_name,
            "parish": profile.parish,
            "is_verified": profile.is_verified,
            "is_active": profile.is_active,
            "created_at": profile.created_at.isoformat() if profile.created_at else None,
        },
        "provider_profile": {
            "id": pp.id,
            "verification_status": pp.verification_status,
        } if pp else None,
        "stats": {
            "reports_filed": report_count,
            "suspensions": suspension_count,
        },
    }


class UserStatusUpdate(BaseModel):
    status: str = Field(..., pattern=r"^(active|suspended|banned)$")
    reason: str | None = None


@router.put("/users/{user_id}/status")
async def update_user_status(
    user_id: str,
    data: UserStatusUpdate,
    admin_id: str = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Change user status (active, suspended, banned)."""
    result = await db.execute(
        select(Profile).where(Profile.user_id == user_id)
    )
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    profile.is_active = data.status == "active"
    await db.flush()

    if data.status == "suspended":
        suspension = Suspension(
            id=str(uuid.uuid4()),
            user_id=user_id,
            reason=data.reason or "Admin action",
            suspension_type="temporary",
            starts_at=datetime.now(UTC),
            issued_by=admin_id,
            is_active=True,
            created_at=datetime.now(UTC),
        )
        db.add(suspension)
        await db.flush()

    await _log_action(
        db, admin_id,
        action=f"user.{data.status}",
        target_type="user",
        target_id=user_id,
        reason=data.reason,
    )
    await db.flush()

    return {"user_id": user_id, "status": data.status}


# --- Phase 3: Booking Oversight ---


@router.get("/bookings")
async def list_bookings(
    admin_id: str = Depends(require_admin),
    status_filter: str | None = Query(default=None, alias="status"),
    limit: int = Query(default=50, le=200),
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
):
    """List all bookings with filters."""
    # Query audit log for booking-related actions as a proxy
    query = select(AuditLog).where(AuditLog.target_type == "booking")

    if status_filter:
        query = query.where(AuditLog.action.ilike(f"%{status_filter}%"))

    query = query.order_by(AuditLog.created_at.desc()).offset(offset).limit(limit)
    result = await db.execute(query)
    entries = result.scalars().all()

    return [
        {
            "id": e.id,
            "target_id": e.target_id,
            "action": e.action,
            "details": e.details,
            "created_at": e.created_at.isoformat(),
        }
        for e in entries
    ]


@router.get("/bookings/{booking_id}")
async def get_booking_detail(
    booking_id: str,
    admin_id: str = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Booking detail with full event history."""
    result = await db.execute(
        select(AuditLog).where(
            AuditLog.target_type == "booking",
            AuditLog.target_id == booking_id,
        ).order_by(AuditLog.created_at.asc())
    )
    entries = result.scalars().all()

    if not entries:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found")

    return {
        "booking_id": booking_id,
        "events": [
            {
                "id": e.id,
                "action": e.action,
                "details": e.details,
                "admin_id": e.admin_id,
                "created_at": e.created_at.isoformat(),
            }
            for e in entries
        ],
    }


# --- Phase 3: Payment Visibility ---


@router.get("/payments")
async def list_payments(
    admin_id: str = Depends(require_admin),
    limit: int = Query(default=50, le=200),
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
):
    """List all payments (via audit log for payment actions)."""
    query = (
        select(AuditLog)
        .where(AuditLog.target_type == "payment")
        .order_by(AuditLog.created_at.desc())
        .offset(offset)
        .limit(limit)
    )
    result = await db.execute(query)
    entries = result.scalars().all()

    return [
        {
            "id": e.id,
            "target_id": e.target_id,
            "action": e.action,
            "details": e.details,
            "reason": e.reason,
            "created_at": e.created_at.isoformat(),
        }
        for e in entries
    ]


# --- Phase 3: Category CRUD ---


@router.get("/categories")
async def list_categories(
    admin_id: str = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """List all categories."""
    result = await db.execute(
        select(Category).order_by(Category.sort_order)
    )
    categories = result.scalars().all()
    return [
        {
            "id": c.id,
            "name": c.name,
            "slug": c.slug,
            "parent_id": c.parent_id,
            "icon": c.icon,
            "description": c.description,
            "is_active": c.is_active,
            "sort_order": c.sort_order,
        }
        for c in categories
    ]


class CategoryCreate(BaseModel):
    name: str = Field(..., max_length=100)
    slug: str | None = None
    parent_id: str | None = None
    icon: str | None = None
    description: str | None = None
    sort_order: int = 0


@router.post("/categories", status_code=status.HTTP_201_CREATED)
async def create_category(
    data: CategoryCreate,
    admin_id: str = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Create a new category."""
    slug = data.slug or data.name.lower().replace(" & ", "-").replace(" ", "-")
    now = datetime.now(UTC)
    cat = Category(
        id=str(uuid.uuid4()),
        name=data.name,
        slug=slug,
        parent_id=data.parent_id,
        icon=data.icon,
        description=data.description,
        is_active=True,
        sort_order=data.sort_order,
        created_at=now,
    )
    db.add(cat)
    await db.flush()

    await _log_action(
        db, admin_id, action="category.create",
        target_type="category", target_id=cat.id,
    )
    await db.flush()

    return {"id": cat.id, "name": cat.name, "slug": cat.slug}


class CategoryUpdate(BaseModel):
    name: str | None = Field(default=None, max_length=100)
    slug: str | None = None
    icon: str | None = None
    description: str | None = None
    sort_order: int | None = None
    is_active: bool | None = None


@router.put("/categories/{category_id}")
async def update_category(
    category_id: str,
    data: CategoryUpdate,
    admin_id: str = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Update a category."""
    result = await db.execute(
        select(Category).where(Category.id == category_id)
    )
    cat = result.scalar_one_or_none()
    if not cat:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(cat, field, value)
    await db.flush()

    await _log_action(
        db, admin_id, action="category.update",
        target_type="category", target_id=category_id,
    )
    await db.flush()

    return {"id": cat.id, "name": cat.name, "slug": cat.slug}


@router.delete("/categories/{category_id}")
async def delete_category(
    category_id: str,
    admin_id: str = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Deactivate a category."""
    result = await db.execute(
        select(Category).where(Category.id == category_id)
    )
    cat = result.scalar_one_or_none()
    if not cat:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")

    cat.is_active = False
    await db.flush()

    await _log_action(
        db, admin_id, action="category.delete",
        target_type="category", target_id=category_id,
    )
    await db.flush()

    return {"status": "deactivated", "id": category_id}


# --- Phase 3: Role Management ---


@router.get("/roles")
async def list_roles(
    admin_id: str = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """List admin roles and permissions."""
    result = await db.execute(select(AdminRole).order_by(AdminRole.role_name))
    roles = result.scalars().all()
    return [
        {
            "id": r.id,
            "role_name": r.role_name,
            "permissions": r.permissions,
            "description": r.description,
        }
        for r in roles
    ]


class RoleCreate(BaseModel):
    role_name: str = Field(..., max_length=50)
    permissions: list[str] = Field(default_factory=list)
    description: str | None = None


@router.post("/roles", status_code=status.HTTP_201_CREATED)
async def create_role(
    data: RoleCreate,
    admin_id: str = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Create an admin role."""
    now = datetime.now(UTC)
    role = AdminRole(
        id=str(uuid.uuid4()),
        role_name=data.role_name,
        permissions=data.permissions,
        description=data.description,
        created_at=now,
    )
    db.add(role)
    await db.flush()

    await _log_action(
        db, admin_id, action="role.create",
        target_type="role", target_id=role.id,
    )
    await db.flush()

    return {"id": role.id, "role_name": role.role_name}


class AdminRoleAssign(BaseModel):
    role_id: str


@router.put("/users/{user_id}/admin-role")
async def assign_admin_role(
    user_id: str,
    data: AdminRoleAssign,
    admin_id: str = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Assign admin role to user."""
    # Verify role exists
    role_result = await db.execute(
        select(AdminRole).where(AdminRole.id == data.role_id)
    )
    if not role_result.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Role not found")

    now = datetime.now(UTC)
    assignment = AdminRoleAssignment(
        id=str(uuid.uuid4()),
        user_id=user_id,
        role_id=data.role_id,
        assigned_by=admin_id,
        assigned_at=now,
    )
    db.add(assignment)
    await db.flush()

    await _log_action(
        db, admin_id, action="role.assign",
        target_type="user", target_id=user_id,
        details={"role_id": data.role_id},
    )
    await db.flush()

    return {"user_id": user_id, "role_id": data.role_id}


# --- Phase 3: Content Moderation ---


@router.get("/content/posts")
async def list_content_posts(
    admin_id: str = Depends(require_admin),
    status_filter: str = Query(default="pending", alias="status"),
    limit: int = Query(default=50, le=200),
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
):
    """List posts pending moderation."""
    query = (
        select(ModerationQueue)
        .where(
            ModerationQueue.item_type == "post",
            ModerationQueue.status == status_filter,
        )
        .order_by(ModerationQueue.created_at.desc())
        .offset(offset)
        .limit(limit)
    )
    result = await db.execute(query)
    items = result.scalars().all()

    return [
        {
            "id": i.id,
            "item_id": i.item_id,
            "reported_by": i.reported_by,
            "reason": i.reason,
            "status": i.status,
            "created_at": i.created_at.isoformat(),
        }
        for i in items
    ]


class PostModerate(BaseModel):
    decision: str = Field(..., pattern=r"^(approved|rejected|dismissed)$")
    resolution: str | None = None


@router.put("/content/posts/{post_id}/moderate")
async def moderate_post(
    post_id: str,
    data: PostModerate,
    admin_id: str = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Moderate a post (approve/reject)."""
    result = await db.execute(
        select(ModerationQueue).where(
            ModerationQueue.item_id == post_id,
            ModerationQueue.item_type == "post",
        )
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found in moderation queue")

    now = datetime.now(UTC)
    status_map = {"approved": "resolved", "rejected": "resolved", "dismissed": "dismissed"}
    item.status = status_map.get(data.decision, "resolved")
    item.reviewed_by = admin_id
    item.resolution = data.resolution or data.decision
    item.resolved_at = now
    await db.flush()

    await _log_action(
        db, admin_id, action=f"content.{data.decision}",
        target_type="post", target_id=post_id,
        reason=data.resolution,
    )
    await db.flush()

    return {"post_id": post_id, "decision": data.decision}


# --- Phase 3: Analytics Overview ---


@router.get("/analytics/overview")
async def analytics_overview(
    admin_id: str = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Platform overview: users, activity, growth."""
    now = datetime.now(UTC)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_ago = now - timedelta(days=7)

    # Total users
    total_users = (await db.execute(
        select(func.count()).select_from(Profile)
    )).scalar() or 0

    # Active users (is_active = True)
    active_users = (await db.execute(
        select(func.count()).select_from(Profile).where(Profile.is_active.is_(True))
    )).scalar() or 0

    # Verified users
    verified_users = (await db.execute(
        select(func.count()).select_from(Profile).where(Profile.is_verified.is_(True))
    )).scalar() or 0

    # Reports this week
    reports_week = (await db.execute(
        select(func.count()).select_from(Report).where(Report.created_at >= week_ago)
    )).scalar() or 0

    # Pending reports
    pending_reports = (await db.execute(
        select(func.count()).select_from(Report).where(Report.status == "pending")
    )).scalar() or 0

    # Active suspensions
    active_suspensions = (await db.execute(
        select(func.count()).select_from(Suspension).where(Suspension.is_active.is_(True))
    )).scalar() or 0

    # Audit actions today
    actions_today = (await db.execute(
        select(func.count()).select_from(AuditLog).where(AuditLog.created_at >= today_start)
    )).scalar() or 0

    return {
        "total_users": total_users,
        "active_users": active_users,
        "verified_users": verified_users,
        "reports_this_week": reports_week,
        "pending_reports": pending_reports,
        "active_suspensions": active_suspensions,
        "admin_actions_today": actions_today,
    }
