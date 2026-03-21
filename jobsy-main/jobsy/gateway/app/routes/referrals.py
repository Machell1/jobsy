"""Referral program routes."""

import logging
import secrets
import string
import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from shared.database import get_db

from ..deps import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(tags=["referrals"])


# ---------------------------------------------------------------------------
# Request / Response schemas
# ---------------------------------------------------------------------------


class ApplyCodeRequest(BaseModel):
    code: str = Field(..., min_length=4, max_length=20)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _generate_referral_code() -> str:
    """Generate a unique 8-character referral code."""
    chars = string.ascii_uppercase + string.digits
    return "JOBSY-" + "".join(secrets.choice(chars) for _ in range(6))


async def _ensure_referral_tables(db: AsyncSession) -> None:
    """Ensure referral tables exist (idempotent)."""
    await db.execute(
        text(
            "CREATE TABLE IF NOT EXISTS referral_codes ("
            "id VARCHAR PRIMARY KEY, "
            "user_id VARCHAR NOT NULL UNIQUE, "
            "code VARCHAR(20) NOT NULL UNIQUE, "
            "total_referrals INTEGER DEFAULT 0, "
            "total_rewards_earned NUMERIC(12,2) DEFAULT 0, "
            "created_at TIMESTAMPTZ NOT NULL DEFAULT now())"
        )
    )
    await db.execute(
        text(
            "CREATE TABLE IF NOT EXISTS referral_links ("
            "id VARCHAR PRIMARY KEY, "
            "referrer_id VARCHAR NOT NULL, "
            "referred_user_id VARCHAR NOT NULL, "
            "code VARCHAR(20) NOT NULL, "
            "reward_status VARCHAR(20) DEFAULT 'pending', "
            "reward_amount NUMERIC(12,2) DEFAULT 0, "
            "completed_at TIMESTAMPTZ, "
            "created_at TIMESTAMPTZ NOT NULL DEFAULT now())"
        )
    )
    await db.commit()


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------


@router.post("/generate-code")
async def generate_code(
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Generate a unique referral code for the authenticated user."""
    await _ensure_referral_tables(db)

    user_id = user["user_id"]

    # Check if user already has a code
    existing = await db.execute(
        text("SELECT code FROM referral_codes WHERE user_id = :uid"),
        {"uid": user_id},
    )
    existing_code = existing.scalar()
    if existing_code:
        return {"code": existing_code, "message": "Referral code already exists"}

    # Generate unique code
    code = _generate_referral_code()
    # Ensure uniqueness
    for _ in range(10):
        dup = await db.execute(
            text("SELECT id FROM referral_codes WHERE code = :code"),
            {"code": code},
        )
        if not dup.scalar():
            break
        code = _generate_referral_code()

    now = datetime.now(UTC)
    await db.execute(
        text(
            "INSERT INTO referral_codes (id, user_id, code, created_at) "
            "VALUES (:id, :uid, :code, :now)"
        ),
        {"id": str(uuid.uuid4()), "uid": user_id, "code": code, "now": now},
    )
    await db.commit()

    return {"code": code, "message": "Referral code generated successfully"}


@router.get("/my-code")
async def get_my_code(
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get the authenticated user's referral code and stats."""
    await _ensure_referral_tables(db)

    user_id = user["user_id"]

    result = await db.execute(
        text("SELECT code, total_referrals, total_rewards_earned FROM referral_codes WHERE user_id = :uid"),
        {"uid": user_id},
    )
    row = result.fetchone()
    if not row:
        return {"code": None, "total_referrals": 0, "total_rewards_earned": 0}

    return {
        "code": row[0],
        "total_referrals": row[1] or 0,
        "total_rewards_earned": float(row[2] or 0),
    }


@router.post("/apply")
async def apply_referral_code(
    data: ApplyCodeRequest,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Apply a referral code during registration. Links the referred user."""
    await _ensure_referral_tables(db)

    user_id = user["user_id"]
    code = data.code.strip().upper()

    # Find the referral code
    ref_result = await db.execute(
        text("SELECT id, user_id FROM referral_codes WHERE code = :code"),
        {"code": code},
    )
    ref_row = ref_result.fetchone()
    if not ref_row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invalid referral code")

    referrer_id = ref_row[1]

    # Cannot refer yourself
    if referrer_id == user_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot use your own referral code")

    # Check if already referred
    existing = await db.execute(
        text("SELECT id FROM referral_links WHERE referred_user_id = :uid"),
        {"uid": user_id},
    )
    if existing.scalar():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Referral code already applied")

    now = datetime.now(UTC)
    await db.execute(
        text(
            "INSERT INTO referral_links (id, referrer_id, referred_user_id, code, reward_status, created_at) "
            "VALUES (:id, :referrer_id, :referred_user_id, :code, 'pending', :now)"
        ),
        {
            "id": str(uuid.uuid4()),
            "referrer_id": referrer_id,
            "referred_user_id": user_id,
            "code": code,
            "now": now,
        },
    )

    # Increment referral count
    await db.execute(
        text("UPDATE referral_codes SET total_referrals = total_referrals + 1 WHERE user_id = :uid"),
        {"uid": referrer_id},
    )

    await db.commit()

    return {"message": "Referral code applied successfully", "referrer_id": referrer_id}


@router.get("/rewards")
async def list_rewards(
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List referral rewards for the authenticated user (both as referrer and referred)."""
    await _ensure_referral_tables(db)

    user_id = user["user_id"]

    # Rewards as referrer
    referrer_result = await db.execute(
        text(
            "SELECT rl.id, rl.referred_user_id, rl.reward_status, rl.reward_amount, rl.created_at, rl.completed_at, "
            "u.phone, u.email "
            "FROM referral_links rl "
            "LEFT JOIN users u ON u.id = rl.referred_user_id "
            "WHERE rl.referrer_id = :uid "
            "ORDER BY rl.created_at DESC"
        ),
        {"uid": user_id},
    )
    referrals = []
    for row in referrer_result.fetchall():
        referrals.append({
            "id": row[0],
            "referred_user_id": row[1],
            "reward_status": row[2],
            "reward_amount": float(row[3] or 0),
            "created_at": row[4].isoformat() if row[4] else None,
            "completed_at": row[5].isoformat() if row[5] else None,
            "referred_user_display": row[6] or row[7] or "User",
        })

    # Total stats
    total_earned = sum(r["reward_amount"] for r in referrals if r["reward_status"] == "completed")
    pending_count = sum(1 for r in referrals if r["reward_status"] == "pending")
    completed_count = sum(1 for r in referrals if r["reward_status"] == "completed")

    return {
        "referrals": referrals,
        "total_earned": total_earned,
        "pending_count": pending_count,
        "completed_count": completed_count,
        "total_referrals": len(referrals),
    }
