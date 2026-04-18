"""FastAPI router for the Jobsy AI Assistant.

All routes are mounted under /api/ai. Requires authenticated user
(hirer or user role). Every call passes through:
  1. Per-user hourly rate limit
  2. Daily global token budget check
  3. Scope guard (two-layer)
  4. Budget validator (pre-flight) where applicable
  5. Main LLM call (streaming or not)

The streaming endpoint uses Server-Sent Events (SSE) over a standard
StreamingResponse with proper no-buffer headers so Railway/Vercel don't
chunk delays.
"""

from __future__ import annotations

import json
import logging
from typing import Any, AsyncIterator

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from shared.config import (
    AI_MAX_TOKENS_CHAT,
    AI_MAX_TOKENS_EXTRACT,
    OPENROUTER_API_KEY,
)
from shared.database import get_db

from ..ai import (
    budget_validator,
    client,
    cost_projector,
    job_builder,
    rate_limit,
    scope_guard,
    session_store,
)
from ..ai.prompts import (
    AUTO_EXTRACT_PROMPT,
    CONTRACT_QA_PROMPT,
    GUIDED_PROMPT,
    SYSTEM_PROMPT,
)
from ..deps import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(tags=["ai"])


# ──────────────────────────────────────────────────────────────────────────────
# Request / response models
# ──────────────────────────────────────────────────────────────────────────────


class CreateSessionBody(BaseModel):
    mode: str = Field(default="guided")  # guided | auto | estimate | contract_qa
    contract_id: str | None = None
    initial_message: str | None = None


class TurnBody(BaseModel):
    content: str = Field(..., max_length=4000)


class ValidateBudgetBody(BaseModel):
    category: str
    subcategory: str | None = None
    parish: str | None = None
    scope_hint: str | None = None
    budget_min: float | None = None
    budget_max: float | None = None
    size_hint: dict | None = None


class AnalyzeBody(BaseModel):
    category: str
    subcategory: str | None = None
    parish: str | None = None
    scope_description: str = Field(..., max_length=2000)
    size_hint: dict | None = None


class UpdateSlotsBody(BaseModel):
    slots: dict


class AutoPostBody(BaseModel):
    one_liner: str = Field(..., max_length=1000)
    parish: str | None = None


class ContractQaBody(BaseModel):
    content: str = Field(..., max_length=2000)
    contract_summary: str = Field(..., max_length=6000)


# ──────────────────────────────────────────────────────────────────────────────
# Dependencies
# ──────────────────────────────────────────────────────────────────────────────


async def _check_backend_available() -> None:
    if not OPENROUTER_API_KEY:
        # Also check DEEPSEEK_API_KEY as a backup
        from shared.config import DEEPSEEK_API_KEY  # noqa: PLC0415
        if not DEEPSEEK_API_KEY:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Jobsy AI is not configured. Please contact support.",
            )


async def _enforce_rate_limits(user_id: str) -> None:
    allowed, retry, message = await rate_limit.check_user_hour_limit(user_id)
    if not allowed:
        raise HTTPException(status_code=429, detail=message, headers={"Retry-After": str(retry)})

    over, msg = await rate_limit.is_daily_budget_exceeded()
    if over:
        raise HTTPException(status_code=429, detail=msg)


# ──────────────────────────────────────────────────────────────────────────────
# Health
# ──────────────────────────────────────────────────────────────────────────────


@router.get("/health")
async def ai_health() -> dict:
    from shared.config import (
        DEEPSEEK_API_KEY,
        OPENROUTER_MODEL,
        TAVILY_API_KEY,
    )
    return {
        "status": "ok",
        "openrouter_configured": bool(OPENROUTER_API_KEY),
        "deepseek_fallback_configured": bool(DEEPSEEK_API_KEY),
        "tavily_configured": bool(TAVILY_API_KEY),
        "model": OPENROUTER_MODEL,
    }


# ──────────────────────────────────────────────────────────────────────────────
# Sessions CRUD
# ──────────────────────────────────────────────────────────────────────────────


@router.post("/sessions")
async def create_session(
    body: CreateSessionBody,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _check_backend_available()
    user_id = user["user_id"]
    await _enforce_rate_limits(user_id)

    valid_modes = {"guided", "auto", "estimate", "contract_qa"}
    if body.mode not in valid_modes:
        raise HTTPException(status_code=400, detail=f"mode must be one of {valid_modes}")

    session = await session_store.create_session(
        db,
        user_id=user_id,
        mode=body.mode,
        contract_id=body.contract_id,
    )
    return {"session": session}


@router.get("/sessions")
async def list_sessions(
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    user_id = user["user_id"]
    sessions = await session_store.list_sessions(db, user_id)
    return {"sessions": sessions}


@router.get("/sessions/{session_id}")
async def get_session(
    session_id: str,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    user_id = user["user_id"]
    session = await session_store.get_session(db, session_id, user_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")
    return {"session": session}


@router.patch("/sessions/{session_id}/slots")
async def update_slots_route(
    session_id: str,
    body: UpdateSlotsBody,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    user_id = user["user_id"]
    session = await session_store.get_session(db, session_id, user_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")
    merged = {**(session.get("collected_slots") or {}), **body.slots}
    await session_store.update_slots(db, session_id, user_id, merged)
    return {"slots": merged}


# ──────────────────────────────────────────────────────────────────────────────
# Turn (non-streaming) — used for tile-prompt flows + fallback
# ──────────────────────────────────────────────────────────────────────────────


@router.post("/sessions/{session_id}/turn")
async def turn(
    session_id: str,
    body: TurnBody,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _check_backend_available()
    user_id = user["user_id"]
    await _enforce_rate_limits(user_id)

    session = await session_store.get_session(db, session_id, user_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")

    # Scope guard
    verdict = await scope_guard.check(body.content, user_id=user_id, session_id=session_id)
    if not verdict.in_scope:
        return {
            "type": "rejected",
            "message": verdict.reason
            or "I can only help with Jobsy job posts, pricing, and contracts.",
            "layer": verdict.layer,
        }

    # Build message history for the main model
    history = session.get("messages") or []
    messages: list[dict[str, Any]] = [{"role": "system", "content": _system_for_mode(session.get("mode"))}]
    messages.extend([{"role": m["role"], "content": m["content"]} for m in history])
    messages.append({"role": "user", "content": f"<<<USER_INPUT>>>{body.content}<<<END>>>"})

    resp = await client.complete(
        messages=messages,
        temperature=0.4,
        max_tokens=AI_MAX_TOKENS_CHAT,
        endpoint_name="chat.turn",
        user_id=user_id,
        session_id=session_id,
    )

    # Append both user + assistant messages to history
    await session_store.append_messages(
        db,
        session_id,
        user_id,
        [
            {"role": "user", "content": body.content},
            {"role": "assistant", "content": resp.content},
        ],
    )

    return {
        "type": "message",
        "content": resp.content,
        "usage": {
            "prompt_tokens": resp.prompt_tokens,
            "completion_tokens": resp.completion_tokens,
            "total_tokens": resp.total_tokens,
        },
    }


# ──────────────────────────────────────────────────────────────────────────────
# Stream — main UI path
# ──────────────────────────────────────────────────────────────────────────────


def _system_for_mode(mode: str | None) -> str:
    """Pick the system prompt based on session mode."""
    if mode == "guided":
        return SYSTEM_PROMPT + "\n\n" + GUIDED_PROMPT
    if mode == "contract_qa":
        return SYSTEM_PROMPT + "\n\n" + CONTRACT_QA_PROMPT
    return SYSTEM_PROMPT


async def _sse(event: dict) -> str:
    return f"data: {json.dumps(event)}\n\n"


@router.post("/sessions/{session_id}/stream")
async def stream_turn(
    session_id: str,
    body: TurnBody,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _check_backend_available()
    user_id = user["user_id"]
    await _enforce_rate_limits(user_id)

    session = await session_store.get_session(db, session_id, user_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")

    # Scope guard runs BEFORE we stream anything
    verdict = await scope_guard.check(body.content, user_id=user_id, session_id=session_id)

    async def event_generator() -> AsyncIterator[str]:
        if not verdict.in_scope:
            yield await _sse(
                {
                    "type": "rejected",
                    "message": verdict.reason,
                    "layer": verdict.layer,
                }
            )
            yield await _sse({"type": "done"})
            return

        history = session.get("messages") or []
        messages: list[dict[str, Any]] = [{"role": "system", "content": _system_for_mode(session.get("mode"))}]
        messages.extend([{"role": m["role"], "content": m["content"]} for m in history])
        messages.append(
            {"role": "user", "content": f"<<<USER_INPUT>>>{body.content}<<<END>>>"}
        )

        total_content = ""
        try:
            async for event in client.stream(
                messages=messages,
                temperature=0.4,
                max_tokens=AI_MAX_TOKENS_CHAT,
                endpoint_name="chat.stream",
                user_id=user_id,
                session_id=session_id,
            ):
                if event["type"] == "delta":
                    total_content += event["content"]
                    yield await _sse({"type": "delta", "content": event["content"]})
                elif event["type"] == "usage":
                    yield await _sse(event)
                elif event["type"] == "error":
                    yield await _sse(event)
                elif event["type"] == "done":
                    yield await _sse(event)
        except Exception as exc:
            logger.exception("Stream error")
            yield await _sse({"type": "error", "message": f"Stream failed: {exc}"})
            yield await _sse({"type": "done"})
            return

        # Persist messages after stream finishes
        try:
            await session_store.append_messages(
                db,
                session_id,
                user_id,
                [
                    {"role": "user", "content": body.content},
                    {"role": "assistant", "content": total_content},
                ],
            )
        except Exception:
            logger.exception("Failed to persist chat messages")

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache, no-transform",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


# ──────────────────────────────────────────────────────────────────────────────
# Budget validator — pre-flight gate (TOKEN SAVER)
# ──────────────────────────────────────────────────────────────────────────────


@router.post("/sessions/{session_id}/validate-budget")
async def validate_budget_route(
    session_id: str,
    body: ValidateBudgetBody,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _check_backend_available()
    user_id = user["user_id"]
    await _enforce_rate_limits(user_id)

    # Verify ownership
    session = await session_store.get_session(db, session_id, user_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")

    verdict = await budget_validator.validate(
        db,
        category=body.category,
        subcategory=body.subcategory,
        parish=body.parish,
        scope_hint=body.scope_hint,
        budget_min=body.budget_min,
        budget_max=body.budget_max,
        size_hint=body.size_hint,
        user_id=user_id,
        session_id=session_id,
    )
    return verdict.to_dict()


# ──────────────────────────────────────────────────────────────────────────────
# Full cost projection
# ──────────────────────────────────────────────────────────────────────────────


@router.post("/sessions/{session_id}/analyze")
async def analyze_route(
    session_id: str,
    body: AnalyzeBody,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _check_backend_available()
    user_id = user["user_id"]
    await _enforce_rate_limits(user_id)

    session = await session_store.get_session(db, session_id, user_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")

    projection = await cost_projector.project(
        db,
        category=body.category,
        subcategory=body.subcategory,
        parish=body.parish,
        scope_description=body.scope_description,
        size_hint=body.size_hint,
        user_id=user_id,
        session_id=session_id,
    )

    # Cache on the session so reloads don't re-spend tokens
    projection_dict = projection.to_dict()
    try:
        await session_store.update_cost_projection(db, session_id, user_id, projection_dict)
    except Exception:
        logger.exception("Failed to persist cost_projection on session")

    return projection_dict


# ──────────────────────────────────────────────────────────────────────────────
# Finalize session -> real JobPost
# ──────────────────────────────────────────────────────────────────────────────


@router.post("/sessions/{session_id}/finalize")
async def finalize_route(
    session_id: str,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    user_id = user["user_id"]
    job_post = await job_builder.finalize_session(db, session_id=session_id, user=user)
    return {"job_post": job_post}


# ──────────────────────────────────────────────────────────────────────────────
# Auto-post — "AI does it all"
# ──────────────────────────────────────────────────────────────────────────────


@router.post("/auto-extract")
async def auto_extract(
    body: AutoPostBody,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """One-shot extraction from a one-liner. Returns slots - caller then validates budget + analyzes cost + finalizes."""
    await _check_backend_available()
    user_id = user["user_id"]
    await _enforce_rate_limits(user_id)

    # Scope guard
    verdict = await scope_guard.check(body.one_liner, user_id=user_id)
    if not verdict.in_scope:
        raise HTTPException(
            status_code=400,
            detail=verdict.reason or "Not a job-posting request",
        )

    user_msg = json.dumps({"one_liner": body.one_liner, "parish_hint": body.parish})
    resp = await client.complete(
        messages=[
            {"role": "system", "content": AUTO_EXTRACT_PROMPT},
            {"role": "user", "content": user_msg},
        ],
        temperature=0.2,
        max_tokens=AI_MAX_TOKENS_EXTRACT,
        response_format={"type": "json_object"},
        endpoint_name="auto_extract",
        user_id=user_id,
    )

    try:
        parsed = json.loads(resp.content)
    except Exception:
        raise HTTPException(status_code=502, detail="AI returned invalid JSON for auto-extract")

    # If parish missing, return need: parish so UI can show a picker
    if body.parish:
        parsed["parish"] = body.parish
    if not parsed.get("parish"):
        return {"need": "parish", "extracted": parsed}

    return {"extracted": parsed}
