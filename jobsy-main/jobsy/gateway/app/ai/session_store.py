"""CRUD for ai_job_sessions.

Sessions hold conversation state across turns: the slot-fill state,
the trimmed message history, and the cached cost projection. Nothing
expensive (tokens) should ever be called without a session ID so
usage is attributable and resumable.
"""

from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)

# Keep only the last N messages inline in ai_job_sessions.messages to bound
# token cost per turn. Older messages may be summarised by a small LLM call
# if needed - for now we simply drop them.
_MESSAGE_HISTORY_CAP = 20


async def create_session(
    db: AsyncSession,
    *,
    user_id: str,
    mode: str = "guided",
    contract_id: str | None = None,
    initial_slots: dict | None = None,
) -> dict:
    """Create a new ai_job_sessions row. Returns the dict representation."""
    now = datetime.now(timezone.utc)
    session_id = str(uuid.uuid4())
    slots = initial_slots or {}

    await db.execute(
        text(
            """
            INSERT INTO ai_job_sessions
              (id, user_id, mode, status, collected_slots, cost_projection,
               messages, contract_id, created_job_post_id, created_at, updated_at)
            VALUES
              (:id, :user_id, :mode, 'active', CAST(:slots AS JSONB),
               NULL, CAST('[]' AS JSONB), :contract_id, NULL, :created_at, :updated_at)
            """
        ),
        {
            "id": session_id,
            "user_id": user_id,
            "mode": mode,
            "slots": _json_dumps(slots),
            "contract_id": contract_id,
            "created_at": now,
            "updated_at": now,
        },
    )
    await db.commit()

    return {
        "id": session_id,
        "user_id": user_id,
        "mode": mode,
        "status": "active",
        "collected_slots": slots,
        "cost_projection": None,
        "messages": [],
        "contract_id": contract_id,
        "created_job_post_id": None,
        "created_at": now.isoformat(),
        "updated_at": now.isoformat(),
    }


async def get_session(db: AsyncSession, session_id: str, user_id: str) -> dict | None:
    """Load a session, scoped to the owning user."""
    result = await db.execute(
        text(
            """
            SELECT id, user_id, mode, status, collected_slots, cost_projection,
                   messages, contract_id, created_job_post_id, created_at, updated_at
            FROM ai_job_sessions
            WHERE id = :id AND user_id = :user_id
            """
        ),
        {"id": session_id, "user_id": user_id},
    )
    row = result.mappings().first()
    if row is None:
        return None
    return {
        "id": row["id"],
        "user_id": row["user_id"],
        "mode": row["mode"],
        "status": row["status"],
        "collected_slots": row["collected_slots"] or {},
        "cost_projection": row["cost_projection"],
        "messages": row["messages"] or [],
        "contract_id": row["contract_id"],
        "created_job_post_id": row["created_job_post_id"],
        "created_at": row["created_at"].isoformat() if row["created_at"] else None,
        "updated_at": row["updated_at"].isoformat() if row["updated_at"] else None,
    }


async def list_sessions(db: AsyncSession, user_id: str, limit: int = 30) -> list[dict]:
    """List a user's sessions (newest first) for the sidebar thread list."""
    result = await db.execute(
        text(
            """
            SELECT id, mode, status, collected_slots, created_job_post_id,
                   created_at, updated_at,
                   COALESCE((collected_slots->>'title'), 'New chat') AS title
            FROM ai_job_sessions
            WHERE user_id = :user_id
            ORDER BY updated_at DESC
            LIMIT :limit
            """
        ),
        {"user_id": user_id, "limit": limit},
    )
    rows = result.mappings().all()
    return [
        {
            "id": r["id"],
            "title": r["title"] or "New chat",
            "mode": r["mode"],
            "status": r["status"],
            "created_job_post_id": r["created_job_post_id"],
            "created_at": r["created_at"].isoformat() if r["created_at"] else None,
            "updated_at": r["updated_at"].isoformat() if r["updated_at"] else None,
        }
        for r in rows
    ]


async def update_slots(
    db: AsyncSession,
    session_id: str,
    user_id: str,
    slots: dict,
) -> None:
    """Replace the collected_slots JSONB with a merged/updated dict."""
    await db.execute(
        text(
            """
            UPDATE ai_job_sessions
            SET collected_slots = CAST(:slots AS JSONB),
                updated_at = :updated_at
            WHERE id = :id AND user_id = :user_id
            """
        ),
        {
            "id": session_id,
            "user_id": user_id,
            "slots": _json_dumps(slots),
            "updated_at": datetime.now(timezone.utc),
        },
    )
    await db.commit()


async def update_cost_projection(
    db: AsyncSession,
    session_id: str,
    user_id: str,
    projection: dict | None,
) -> None:
    await db.execute(
        text(
            """
            UPDATE ai_job_sessions
            SET cost_projection = CAST(:projection AS JSONB),
                updated_at = :updated_at
            WHERE id = :id AND user_id = :user_id
            """
        ),
        {
            "id": session_id,
            "user_id": user_id,
            "projection": _json_dumps(projection) if projection is not None else None,
            "updated_at": datetime.now(timezone.utc),
        },
    )
    await db.commit()


async def append_messages(
    db: AsyncSession,
    session_id: str,
    user_id: str,
    new_messages: list[dict],
) -> None:
    """Append messages and trim history to the cap."""
    session = await get_session(db, session_id, user_id)
    if session is None:
        return
    history = list(session.get("messages") or [])
    history.extend(new_messages)
    if len(history) > _MESSAGE_HISTORY_CAP:
        history = history[-_MESSAGE_HISTORY_CAP:]

    await db.execute(
        text(
            """
            UPDATE ai_job_sessions
            SET messages = CAST(:messages AS JSONB),
                updated_at = :updated_at
            WHERE id = :id AND user_id = :user_id
            """
        ),
        {
            "id": session_id,
            "user_id": user_id,
            "messages": _json_dumps(history),
            "updated_at": datetime.now(timezone.utc),
        },
    )
    await db.commit()


async def mark_posted(
    db: AsyncSession,
    session_id: str,
    user_id: str,
    job_post_id: str,
) -> None:
    await db.execute(
        text(
            """
            UPDATE ai_job_sessions
            SET status = 'posted',
                created_job_post_id = :job_post_id,
                updated_at = :updated_at
            WHERE id = :id AND user_id = :user_id
            """
        ),
        {
            "id": session_id,
            "user_id": user_id,
            "job_post_id": job_post_id,
            "updated_at": datetime.now(timezone.utc),
        },
    )
    await db.commit()


async def mark_abandoned(db: AsyncSession, session_id: str, user_id: str) -> None:
    await db.execute(
        text(
            """
            UPDATE ai_job_sessions
            SET status = 'abandoned', updated_at = :updated_at
            WHERE id = :id AND user_id = :user_id
            """
        ),
        {
            "id": session_id,
            "user_id": user_id,
            "updated_at": datetime.now(timezone.utc),
        },
    )
    await db.commit()


# ──────────────────────────────────────────────────────────────────────────────
# Helper
# ──────────────────────────────────────────────────────────────────────────────


def _json_dumps(obj: Any) -> str:
    import json as _json
    return _json.dumps(obj, default=str)
