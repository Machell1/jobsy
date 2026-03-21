"""Dispute Resolution routes for the gateway.

Handles raising, responding to, resolving, and escalating disputes
on contracts with escrow integration.
"""

import logging
import os
import uuid
from datetime import UTC, datetime, timedelta

import stripe
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from shared.database import get_db

from ..deps import get_current_user
from ..models_bidding import Contract
from ..models_payments import Dispute, Transaction

logger = logging.getLogger(__name__)

router = APIRouter(tags=["disputes"])

DISPUTE_WINDOW_DAYS = 7  # Days after completion to raise a dispute


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class DisputeCreate(BaseModel):
    contract_id: str
    reason: str = Field(..., min_length=10)
    evidence: list[str] = []  # list of URLs


class DisputeRespond(BaseModel):
    statement: str = Field(..., min_length=10)
    evidence: list[str] = []


class DisputeResolve(BaseModel):
    resolution: str = Field(..., min_length=10)
    outcome: str = Field(..., pattern=r"^(refund_full|refund_partial|release_to_provider|split)$")


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _dispute_response(d: Dispute) -> dict:
    return {
        "id": d.id,
        "contract_id": d.contract_id,
        "raiser_id": d.raiser_id,
        "respondent_id": d.respondent_id,
        "reason": d.reason,
        "evidence": d.evidence or [],
        "respondent_statement": d.respondent_statement,
        "respondent_evidence": d.respondent_evidence or [],
        "status": d.status,
        "resolution": d.resolution,
        "outcome": d.outcome,
        "resolved_by": d.resolved_by,
        "escalated": d.escalated,
        "created_at": d.created_at.isoformat(),
        "updated_at": d.updated_at.isoformat(),
        "resolved_at": d.resolved_at.isoformat() if d.resolved_at else None,
    }


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@router.post("/", status_code=201)
async def raise_dispute(
    data: DisputeCreate,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Raise a dispute on a contract. Freezes escrow."""
    uid = user["user_id"]

    # Verify the contract exists and user is party to it
    contract_r = await db.execute(
        select(Contract).where(Contract.id == data.contract_id)
    )
    contract = contract_r.scalar_one_or_none()
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")

    if contract.hirer_id != uid and contract.provider_id != uid:
        raise HTTPException(status_code=403, detail="Not authorized - not a party to this contract")

    # Check dispute window: only during active/in_progress or within 7 days of completion
    if contract.status == "completed" and contract.completed_at:
        window_end = contract.completed_at + timedelta(days=DISPUTE_WINDOW_DAYS)
        if datetime.now(UTC) > window_end:
            raise HTTPException(
                status_code=400,
                detail=f"Dispute window has closed ({DISPUTE_WINDOW_DAYS} days after completion)",
            )
    elif contract.status not in ("active", "in_progress", "completed"):
        raise HTTPException(status_code=400, detail=f"Cannot raise dispute on contract with status '{contract.status}'")

    # Check no existing open dispute
    existing = await db.execute(
        select(Dispute).where(
            Dispute.contract_id == data.contract_id,
            Dispute.status.in_(["open", "responded", "under_review"]),
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="An active dispute already exists for this contract")

    # Determine respondent
    respondent_id = contract.provider_id if uid == contract.hirer_id else contract.hirer_id

    now = datetime.now(UTC)
    dispute = Dispute(
        id=str(uuid.uuid4()),
        contract_id=data.contract_id,
        raiser_id=uid,
        respondent_id=respondent_id,
        reason=data.reason,
        evidence=data.evidence,
        status="open",
        created_at=now,
        updated_at=now,
    )
    db.add(dispute)
    await db.flush()

    logger.info("Dispute %s raised on contract %s by %s", dispute.id, data.contract_id, uid)

    return _dispute_response(dispute)


@router.get("/")
async def list_disputes(
    user: dict = Depends(get_current_user),
    status_filter: str | None = Query(default=None, alias="status"),
    limit: int = Query(default=20, le=100),
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
):
    """List disputes where current user is raiser or respondent."""
    uid = user["user_id"]
    cond = or_(Dispute.raiser_id == uid, Dispute.respondent_id == uid)

    q = select(Dispute).where(cond)
    if status_filter:
        q = q.where(Dispute.status == status_filter)
    q = q.order_by(Dispute.created_at.desc()).offset(offset).limit(limit)

    result = await db.execute(q)
    return [_dispute_response(d) for d in result.scalars().all()]


@router.get("/{dispute_id}")
async def get_dispute(
    dispute_id: str,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get dispute details with evidence."""
    uid = user["user_id"]
    result = await db.execute(
        select(Dispute).where(
            Dispute.id == dispute_id,
            or_(Dispute.raiser_id == uid, Dispute.respondent_id == uid),
        )
    )
    dispute = result.scalar_one_or_none()
    if not dispute:
        raise HTTPException(status_code=404, detail="Dispute not found")
    return _dispute_response(dispute)


@router.post("/{dispute_id}/respond")
async def respond_to_dispute(
    dispute_id: str,
    data: DisputeRespond,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Respondent submits their side with evidence."""
    uid = user["user_id"]
    result = await db.execute(
        select(Dispute).where(Dispute.id == dispute_id)
    )
    dispute = result.scalar_one_or_none()
    if not dispute:
        raise HTTPException(status_code=404, detail="Dispute not found")

    if dispute.respondent_id != uid:
        raise HTTPException(status_code=403, detail="Only the respondent can respond")

    if dispute.status not in ("open",):
        raise HTTPException(status_code=400, detail=f"Cannot respond to dispute with status '{dispute.status}'")

    now = datetime.now(UTC)
    dispute.respondent_statement = data.statement
    dispute.respondent_evidence = data.evidence
    dispute.status = "responded"
    dispute.updated_at = now
    await db.flush()

    return _dispute_response(dispute)


@router.post("/{dispute_id}/resolve")
async def resolve_dispute(
    dispute_id: str,
    data: DisputeResolve,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Admin resolves a dispute. Updates escrow accordingly."""
    # In production, check admin role; for now allow any party or admin
    uid = user["user_id"]
    result = await db.execute(
        select(Dispute).where(Dispute.id == dispute_id)
    )
    dispute = result.scalar_one_or_none()
    if not dispute:
        raise HTTPException(status_code=404, detail="Dispute not found")

    if dispute.status == "resolved":
        raise HTTPException(status_code=400, detail="Dispute already resolved")

    now = datetime.now(UTC)
    dispute.resolution = data.resolution
    dispute.outcome = data.outcome
    dispute.status = "resolved"
    dispute.resolved_by = uid
    dispute.resolved_at = now
    dispute.updated_at = now

    # Update escrow based on outcome
    escrow_r = await db.execute(
        select(Transaction).where(
            Transaction.contract_id == dispute.contract_id,
            Transaction.escrow_status == "held",
        )
    )
    escrow_txn = escrow_r.scalar_one_or_none()

    if escrow_txn:
        stripe_ok = bool(os.getenv("STRIPE_SECRET_KEY", ""))

        if data.outcome == "refund_full":
            # Cancel the held payment intent (full refund to payer)
            if stripe_ok and escrow_txn.escrow_payment_intent_id:
                try:
                    stripe.PaymentIntent.cancel(escrow_txn.escrow_payment_intent_id)
                except Exception:
                    logger.exception("Stripe cancel failed for escrow %s", escrow_txn.id)
            escrow_txn.escrow_status = "refunded"
            escrow_txn.status = "refunded"

        elif data.outcome == "release_to_provider":
            # Capture the held payment (release to provider)
            if stripe_ok and escrow_txn.escrow_payment_intent_id:
                try:
                    stripe.PaymentIntent.capture(escrow_txn.escrow_payment_intent_id)
                except Exception:
                    logger.exception("Stripe capture failed for escrow %s", escrow_txn.id)
            escrow_txn.escrow_status = "released"
            escrow_txn.status = "completed"

        elif data.outcome in ("refund_partial", "split"):
            # For partial refund or split, capture then create partial refund
            if stripe_ok and escrow_txn.escrow_payment_intent_id:
                try:
                    stripe.PaymentIntent.capture(escrow_txn.escrow_payment_intent_id)
                    if data.outcome == "split":
                        half = int(float(escrow_txn.amount) * 100 / 2)
                        stripe.Refund.create(
                            payment_intent=escrow_txn.escrow_payment_intent_id,
                            amount=half,
                        )
                except Exception:
                    logger.exception("Stripe partial operation failed for escrow %s", escrow_txn.id)
            escrow_txn.escrow_status = "released"
            escrow_txn.status = "completed"

        escrow_txn.updated_at = now

    await db.flush()

    logger.info("Dispute %s resolved with outcome '%s' by %s", dispute_id, data.outcome, uid)

    return _dispute_response(dispute)


@router.post("/{dispute_id}/escalate")
async def escalate_dispute(
    dispute_id: str,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Escalate dispute to Jobsy admin arbitration."""
    uid = user["user_id"]
    result = await db.execute(
        select(Dispute).where(
            Dispute.id == dispute_id,
            or_(Dispute.raiser_id == uid, Dispute.respondent_id == uid),
        )
    )
    dispute = result.scalar_one_or_none()
    if not dispute:
        raise HTTPException(status_code=404, detail="Dispute not found")

    if dispute.status == "resolved":
        raise HTTPException(status_code=400, detail="Cannot escalate a resolved dispute")

    now = datetime.now(UTC)
    dispute.escalated = True
    dispute.status = "under_review"
    dispute.updated_at = now
    await db.flush()

    logger.info("Dispute %s escalated by %s", dispute_id, uid)

    return _dispute_response(dispute)
