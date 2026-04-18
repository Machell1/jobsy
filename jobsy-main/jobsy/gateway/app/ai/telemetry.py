"""AI usage logging + cost estimation.

Writes one row to ai_usage_log per LLM or search call. Single source of truth
for:
  - per-user rate limit accounting
  - daily token budget enforcement
  - scope-rejection analytics (proves the guard is saving tokens)
  - cached-search-hit analytics (proves Tavily cache is working)

record_usage() is fire-and-forget from the caller's perspective - it catches
its own errors and never raises. A logging failure should never break an
AI response.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from decimal import Decimal
from typing import Optional

from shared.database import async_session_factory

logger = logging.getLogger(__name__)


# Rough DeepSeek V3 pricing via OpenRouter (USD per 1M tokens, as of 2025).
# These are ESTIMATES for internal cost accounting only - real billing happens
# on OpenRouter. Update periodically.
_MODEL_PRICING: dict[str, tuple[float, float]] = {
    # model_substring -> (prompt_usd_per_1m, completion_usd_per_1m)
    "deepseek/deepseek-chat": (0.14, 0.28),
    "deepseek/deepseek-r1": (0.55, 2.19),
    "deepseek-chat": (0.14, 0.28),
    "deepseek-r1": (0.55, 2.19),
}


def _estimate_cost_usd(model: str, prompt_tokens: int, completion_tokens: int) -> Optional[Decimal]:
    if not model or (prompt_tokens == 0 and completion_tokens == 0):
        return None
    key = None
    for k in _MODEL_PRICING:
        if k in model:
            key = k
            break
    if key is None:
        return None
    p_rate, c_rate = _MODEL_PRICING[key]
    cost = (prompt_tokens / 1_000_000) * p_rate + (completion_tokens / 1_000_000) * c_rate
    return Decimal(f"{cost:.6f}")


async def record_usage(
    *,
    endpoint: str,
    model: str | None = None,
    prompt_tokens: int = 0,
    completion_tokens: int = 0,
    total_tokens: int = 0,
    latency_ms: int | None = None,
    cached_search_hit: bool = False,
    scope_rejected: bool = False,
    budget_rejected: bool = False,
    error: str | None = None,
    user_id: str | None = None,
    session_id: str | None = None,
) -> None:
    """Write one row to ai_usage_log. Never raises."""
    try:
        from sqlalchemy import text

        cost = _estimate_cost_usd(model or "", prompt_tokens, completion_tokens)
        async with async_session_factory() as db:
            await db.execute(
                text(
                    """
                    INSERT INTO ai_usage_log
                      (user_id, session_id, endpoint, model,
                       prompt_tokens, completion_tokens, total_tokens,
                       cost_usd_estimate, latency_ms,
                       cached_search_hit, scope_rejected, budget_rejected,
                       error, created_at)
                    VALUES
                      (:user_id, :session_id, :endpoint, :model,
                       :prompt_tokens, :completion_tokens, :total_tokens,
                       :cost_usd_estimate, :latency_ms,
                       :cached_search_hit, :scope_rejected, :budget_rejected,
                       :error, :created_at)
                    """
                ),
                {
                    "user_id": user_id,
                    "session_id": session_id,
                    "endpoint": endpoint,
                    "model": model,
                    "prompt_tokens": prompt_tokens,
                    "completion_tokens": completion_tokens,
                    "total_tokens": total_tokens,
                    "cost_usd_estimate": cost,
                    "latency_ms": latency_ms,
                    "cached_search_hit": cached_search_hit,
                    "scope_rejected": scope_rejected,
                    "budget_rejected": budget_rejected,
                    "error": (error or "")[:500] if error else None,
                    "created_at": datetime.now(timezone.utc),
                },
            )
            await db.commit()
    except Exception:
        logger.exception("Failed to record ai_usage_log row (endpoint=%s)", endpoint)
