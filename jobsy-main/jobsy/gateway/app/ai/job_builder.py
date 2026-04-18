"""Finalize an ai_job_sessions conversation into a real JobPost.

This is the bridge from the AI assistant's slot-filled conversation state
back into the existing /api/bidding/ job-post pipeline. We reuse the
shared ``_create_job_post_impl`` helper (added to bidding.py during the
AI-assistant refactor) so there is exactly one code path that actually
writes to the job_posts table.

Responsibilities:
  1. Validate required slots are present
  2. Construct a JobPostCreate payload
  3. Call bidding._create_job_post_impl
  4. Mark the session as posted
"""

from __future__ import annotations

import logging
from decimal import Decimal, InvalidOperation

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from . import session_store

logger = logging.getLogger(__name__)


_REQUIRED_SLOTS = ("title", "description", "category", "parish")


def _to_decimal(v) -> Decimal | None:
    if v is None:
        return None
    try:
        return Decimal(str(v))
    except (InvalidOperation, ValueError, TypeError):
        return None


async def finalize_session(
    db: AsyncSession,
    *,
    session_id: str,
    user: dict,
) -> dict:
    """Convert a session's collected_slots into a real JobPost.

    Returns the created job post dict. Raises HTTPException(400) if slots
    are incomplete or (403) if the user is not the session owner.
    """
    # Local import to avoid circular dependency (bidding imports models, models_ai imports nothing from bidding)
    from ..routes.bidding import JobPostCreate, _create_job_post_impl

    user_id = user.get("user_id") or user.get("id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Missing user_id")

    session = await session_store.get_session(db, session_id, user_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")

    if session["status"] != "active":
        raise HTTPException(
            status_code=400,
            detail=f"Cannot finalize a session with status '{session['status']}'",
        )

    slots = dict(session.get("collected_slots") or {})
    missing = [s for s in _REQUIRED_SLOTS if not slots.get(s)]
    if missing:
        raise HTTPException(
            status_code=400,
            detail=f"Missing required slots: {', '.join(missing)}",
        )

    # Build a valid JobPostCreate from slots. Fields mirror bidding.JobPostCreate.
    required_skills = slots.get("required_skills") or []
    if isinstance(required_skills, str):
        required_skills = [s.strip() for s in required_skills.split(",") if s.strip()]

    attachments = slots.get("attachments") or []
    if not isinstance(attachments, list):
        attachments = []

    try:
        data = JobPostCreate(
            title=str(slots["title"])[:200],
            description=str(slots["description"])[:5000],
            category=str(slots["category"])[:100],
            subcategory=(str(slots["subcategory"])[:100] if slots.get("subcategory") else None),
            required_skills=required_skills,
            budget_min=_to_decimal(slots.get("budget_min")),
            budget_max=_to_decimal(slots.get("budget_max")),
            currency="JMD",
            location_text=(str(slots["location_text"])[:500] if slots.get("location_text") else None),
            parish=str(slots["parish"])[:50],
            deadline=(str(slots["deadline"]) if slots.get("deadline") else None),
            bid_deadline=(str(slots["bid_deadline"]) if slots.get("bid_deadline") else None),
            attachments=attachments,
            visibility=(str(slots.get("visibility") or "public")),
            max_bids=int(slots["max_bids"]) if slots.get("max_bids") else None,
        )
    except Exception as exc:
        logger.exception("Failed to build JobPostCreate from session slots")
        raise HTTPException(status_code=400, detail=f"Invalid slot data: {exc}")

    # Delegate to the same code path the classic modal uses
    job_post = await _create_job_post_impl(data=data, user=user, db=db)

    job_post_id = job_post.get("id")
    if job_post_id:
        await session_store.mark_posted(db, session_id, user_id, job_post_id)

    return job_post
