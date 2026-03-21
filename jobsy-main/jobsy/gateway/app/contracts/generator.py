"""Contract generator -- creates a Contract record from an accepted bid.

Uses category-specific templates from ``contracts.templates`` to populate
the contract with appropriate terms for the type of service being rendered.
"""

from __future__ import annotations

import logging
import random
import uuid
from datetime import UTC, datetime, timedelta

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from ..models_bidding import Bid, Contract, JobPost
from .templates import get_template_for_category

logger = logging.getLogger(__name__)


async def _generate_security_number(db: AsyncSession) -> str:
    """Generate a unique 7-digit security number for a contract.

    The number is cryptographically seeded and checked against the database
    to ensure uniqueness.  Format: 7 digits (e.g. "4821937").
    """
    for _ in range(100):  # max retries
        number = f"{random.SystemRandom().randint(1_000_000, 9_999_999)}"
        result = await db.execute(
            text("SELECT 1 FROM contracts WHERE security_number = :sn"),
            {"sn": number},
        )
        if result.first() is None:
            return number
    raise RuntimeError("Failed to generate unique security number after 100 attempts")


async def _get_profile_name(db: AsyncSession, user_id: str) -> str:
    """Look up display_name from profiles table, fall back to user_id."""
    result = await db.execute(
        text("SELECT display_name FROM profiles WHERE user_id = :uid"),
        {"uid": user_id},
    )
    row = result.first()
    return row[0] if row and row[0] else user_id


async def generate_contract(
    db: AsyncSession,
    job_post_id: str,
    bid_id: str,
    hirer_id: str,
    provider_id: str,
) -> Contract:
    """Generate a contract from an accepted bid.

    1. Fetches the job post, bid, hirer name, and provider name from DB.
    2. Selects the appropriate category template.
    3. Populates the template with real data.
    4. Creates and persists a ``Contract`` record with ``status='pending_signatures'``.
    5. Returns the new contract.
    """
    from sqlalchemy import select

    # Fetch entities --------------------------------------------------------
    jp_result = await db.execute(select(JobPost).where(JobPost.id == job_post_id))
    job_post = jp_result.scalar_one_or_none()
    if not job_post:
        raise ValueError(f"Job post {job_post_id} not found")

    bid_result = await db.execute(select(Bid).where(Bid.id == bid_id))
    bid = bid_result.scalar_one_or_none()
    if not bid:
        raise ValueError(f"Bid {bid_id} not found")

    hirer_name = await _get_profile_name(db, hirer_id)
    provider_name = await _get_profile_name(db, provider_id)

    now = datetime.now(UTC)
    contract_id = str(uuid.uuid4())
    security_number = await _generate_security_number(db)

    # Compute dates ---------------------------------------------------------
    start_date = bid.available_start_date
    end_date = None
    if start_date and bid.estimated_duration_days:
        end_date = start_date + timedelta(days=bid.estimated_duration_days)

    # Build template data ---------------------------------------------------
    job_data = {
        "title": job_post.title,
        "description": job_post.description,
        "category": job_post.category,
        "subcategory": job_post.subcategory,
        "location_text": job_post.location_text,
        "parish": job_post.parish,
    }

    hirer_data = {"name": hirer_name, "id": hirer_id}
    provider_data = {"name": provider_name, "id": provider_id}

    bid_data = {
        "amount": bid.amount,
        "currency": bid.currency or "JMD",
        "proposal": bid.proposal,
        "estimated_duration_days": bid.estimated_duration_days,
        "available_start_date": start_date,
        "contract_id": contract_id,
        "generated_date": now.strftime("%B %d, %Y"),
        # Dynamic contract terms from provider's bid
        "cancellation_fee_percent": float(bid.cancellation_fee_percent) if bid.cancellation_fee_percent else None,
        "deposit_percent": float(bid.deposit_percent) if bid.deposit_percent else None,
        "deposit_required": bid.deposit_required,
        "milestones": bid.milestones if bid.milestones else None,
        "is_international": False,  # TODO: detect from user profiles
    }

    # Select and invoke template --------------------------------------------
    template_fn = get_template_for_category(job_post.category)
    template_result = template_fn(job_data, hirer_data, provider_data, bid_data)

    # Persist contract ------------------------------------------------------
    contract = Contract(
        id=contract_id,
        job_post_id=job_post.id,
        bid_id=bid.id,
        hirer_id=hirer_id,
        provider_id=provider_id,
        title=template_result["title"],
        scope_of_work=template_result["scope_of_work"],
        agreed_amount=bid.amount,
        currency=bid.currency or "JMD",
        start_date=start_date,
        estimated_end_date=end_date,
        location_text=job_post.location_text,
        parish=job_post.parish,
        terms_and_conditions=template_result["terms_and_conditions"],
        security_number=security_number,
        status="pending_signatures",
        is_immutable=False,
        cancellation_fee_percent=bid.cancellation_fee_percent,
        deposit_percent=bid.deposit_percent,
        deposit_required=bid.deposit_required or False,
        generated_at=now,
        created_at=now,
        updated_at=now,
    )
    db.add(contract)
    await db.flush()

    logger.info(
        "Generated contract %s (JOBSY-%s) for job_post=%s bid=%s category=%s",
        contract_id,
        security_number,
        job_post_id,
        bid_id,
        job_post.category,
    )

    return contract
