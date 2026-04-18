"""Pre-flight budget validation — the single biggest token saver.

Before running the expensive cost_projector (which calls Tavily + DeepSeek),
this module answers the question "is the user's stated budget in the
right ballpark for this category in Jamaica?" using the seeded
jmd_price_references table. If the budget is wildly off, we return a
BudgetWarningCard and STOP - no expensive tokens spent.

Flow:
  1. Resolve parish → parish_tier
  2. Look up jmd_price_references row for (category, subcategory, parish_tier)
  3. Scale the low/mid/high figures by size_hint (rooms/sqft/duration)
  4. Classify budget_max against scaled ranges
  5. If no match OR unusual keywords → optional 300-token LLM review

The zero-LLM path is expected to cover ~85% of cases. The LLM fallback only
fires when the category isn't seeded or the scope mentions "commercial",
"heritage", "emergency", etc.
"""

from __future__ import annotations

import json
import logging
from dataclasses import dataclass
from decimal import Decimal
from typing import Literal

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from shared.config import AI_MAX_TOKENS_CHAT

from . import client
from .prompts import BUDGET_REVIEW_PROMPT
from .telemetry import record_usage

logger = logging.getLogger(__name__)


Verdict = Literal["too_low", "low_ok", "mid_ok", "high_ok", "too_high", "unknown"]


@dataclass
class BudgetVerdict:
    verdict: Verdict
    recommended_min_jmd: int
    recommended_max_jmd: int
    explanation: str
    used_reference: bool
    used_llm: bool = False
    # Raw tier numbers after scaling - useful for the frontend card
    low_jmd: int | None = None
    mid_jmd: int | None = None
    high_jmd: int | None = None

    def to_dict(self) -> dict:
        return {
            "verdict": self.verdict,
            "recommended_min_jmd": self.recommended_min_jmd,
            "recommended_max_jmd": self.recommended_max_jmd,
            "explanation": self.explanation,
            "used_reference": self.used_reference,
            "used_llm": self.used_llm,
            "low_jmd": self.low_jmd,
            "mid_jmd": self.mid_jmd,
            "high_jmd": self.high_jmd,
        }

    @property
    def is_blocking(self) -> bool:
        """Should the UI show a BudgetWarningCard and stop before proceeding?"""
        return self.verdict in ("too_low", "too_high")


# ──────────────────────────────────────────────────────────────────────────────
# Parish → parish_tier mapping
# ──────────────────────────────────────────────────────────────────────────────

_KINGSTON_PARISHES = {"kingston", "st. andrew", "st andrew", "saint andrew"}
_MOBAY_PARISHES = {"st. james", "st james", "saint james"}
_RURAL_PARISHES = {
    "clarendon", "manchester", "st. elizabeth", "westmoreland", "hanover",
    "trelawny", "st. ann", "st. mary", "portland", "st. thomas",
    "st elizabeth", "st ann", "st mary", "st thomas",
}


def _parish_to_tier(parish: str | None) -> str:
    if not parish:
        return "island"
    p = parish.strip().lower()
    if p in _KINGSTON_PARISHES:
        return "kingston"
    if p in _MOBAY_PARISHES:
        return "montego_bay"
    if p in _RURAL_PARISHES:
        return "rural"
    return "island"


# ──────────────────────────────────────────────────────────────────────────────
# Reference lookup
# ──────────────────────────────────────────────────────────────────────────────


async def _lookup_reference(
    db: AsyncSession,
    category: str,
    subcategory: str | None,
    parish_tier: str,
) -> dict | None:
    """Find the best-matching jmd_price_references row.

    Match order: exact (cat, sub, tier) → (cat, sub, island) → (cat, None, tier) → (cat, None, island)
    """
    for sub, tier in [
        (subcategory, parish_tier),
        (subcategory, "island"),
        (None, parish_tier),
        (None, "island"),
    ]:
        if sub is None and subcategory is not None and tier == parish_tier:
            continue  # skip duplicate
        query = text(
            """
            SELECT id, category, subcategory, parish_tier, unit,
                   low_jmd, mid_jmd, high_jmd, typical_duration_days, notes, confidence
            FROM jmd_price_references
            WHERE LOWER(category) = LOWER(:category)
              AND (:subcategory IS NULL OR LOWER(subcategory) = LOWER(:subcategory))
              AND parish_tier = :parish_tier
            LIMIT 1
            """
        )
        result = await db.execute(
            query,
            {"category": category, "subcategory": sub, "parish_tier": tier},
        )
        row = result.mappings().first()
        if row is not None:
            return dict(row)
    return None


# ──────────────────────────────────────────────────────────────────────────────
# Scaling
# ──────────────────────────────────────────────────────────────────────────────


def _scale_figures(ref_row: dict, size_hint: dict | None) -> tuple[float, float, float]:
    """Apply a simple linear scale factor to low/mid/high based on size hints.

    Reference rows are priced at "typical" size. If user specifies size_hint,
    we compute a multiplier to account for it. Very simple:
      - rooms: 1 room = 1x baseline; 3 rooms ≈ 2.5x (not 3x, economies of scale)
      - sqft: linear from 500sqft baseline, capped 0.4x..4x
      - duration_days: linear if ref has typical_duration_days, capped 0.5x..3x
    """
    low = float(ref_row["low_jmd"])
    mid = float(ref_row["mid_jmd"])
    high = float(ref_row["high_jmd"])
    multiplier = 1.0

    if size_hint:
        rooms = size_hint.get("rooms")
        if isinstance(rooms, (int, float)) and rooms > 0:
            if ref_row.get("unit") == "per_room":
                multiplier = float(rooms)
            else:
                # Diminishing returns for per_job rows when user scales rooms
                multiplier *= max(0.5, 0.6 + 0.5 * float(rooms))

        sqft = size_hint.get("sqft")
        if isinstance(sqft, (int, float)) and sqft > 0:
            ratio = float(sqft) / 500.0
            multiplier *= max(0.4, min(4.0, ratio))

        duration = size_hint.get("duration_days")
        typical = ref_row.get("typical_duration_days") or 0
        if isinstance(duration, (int, float)) and duration > 0 and typical and typical > 0:
            ratio = float(duration) / float(typical)
            multiplier *= max(0.5, min(3.0, ratio))

    return low * multiplier, mid * multiplier, high * multiplier


# ──────────────────────────────────────────────────────────────────────────────
# Classification
# ──────────────────────────────────────────────────────────────────────────────


def _classify_budget(
    budget_min: float | None,
    budget_max: float | None,
    scaled_low: float,
    scaled_mid: float,
    scaled_high: float,
) -> tuple[Verdict, str]:
    """Bucket the user's budget against scaled reference tiers."""
    if budget_max is None or budget_max <= 0:
        # No budget specified - treat as info, not blocking
        return (
            "unknown",
            f"No budget set. Typical Jamaica pricing for this kind of work is J${int(scaled_low):,} (low quality) "
            f"to J${int(scaled_high):,} (high quality).",
        )

    if budget_max < 0.8 * scaled_low:
        return (
            "too_low",
            f"Your budget of J${int(budget_max):,} is below what this work costs in Jamaica. "
            f"Even at the lowest quality tier (hardware-store materials, minimum-wage labor), "
            f"this kind of job typically runs J${int(scaled_low):,}-J${int(scaled_mid):,}. "
            f"You'd need to raise the budget, reduce the scope, or expect no bids.",
        )

    if budget_max > 1.3 * scaled_high:
        return (
            "too_high",
            f"Your budget of J${int(budget_max):,} is above typical Jamaica pricing. "
            f"Even premium work of this kind usually runs J${int(scaled_mid):,}-J${int(scaled_high):,}. "
            f"You may be overpaying. Want a detailed breakdown before posting?",
        )

    # In-range — pick which tier
    if budget_max <= 1.1 * scaled_low:
        return ("low_ok", f"Your budget is in the LOW quality range (typical J${int(scaled_low):,}).")
    if budget_max <= 1.1 * scaled_mid:
        return ("mid_ok", f"Your budget is in the MID quality range (typical J${int(scaled_mid):,}).")
    return ("high_ok", f"Your budget is in the HIGH quality range (typical J${int(scaled_high):,}).")


# ──────────────────────────────────────────────────────────────────────────────
# Trigger for LLM fallback
# ──────────────────────────────────────────────────────────────────────────────

_UNUSUAL_KEYWORDS = {
    "commercial", "industrial", "warehouse", "factory",
    "heritage", "historic", "listed",
    "emergency", "urgent", "same-day",
    "3-storey", "multi-storey", "highrise",
    "hurricane", "seismic",
}


def _needs_llm_review(scope_hint: str | None) -> bool:
    if not scope_hint:
        return False
    t = scope_hint.lower()
    return any(kw in t for kw in _UNUSUAL_KEYWORDS)


# ──────────────────────────────────────────────────────────────────────────────
# Main entry point
# ──────────────────────────────────────────────────────────────────────────────


async def validate(
    db: AsyncSession,
    *,
    category: str,
    subcategory: str | None = None,
    parish: str | None = None,
    scope_hint: str | None = None,
    budget_min: float | None = None,
    budget_max: float | None = None,
    size_hint: dict | None = None,
    user_id: str | None = None,
    session_id: str | None = None,
) -> BudgetVerdict:
    """Validate a budget against seeded Jamaica references.

    Returns a BudgetVerdict. If verdict.is_blocking, callers MUST NOT proceed
    to cost projection until the user adjusts the budget or explicitly
    overrides.
    """
    parish_tier = _parish_to_tier(parish)
    ref = await _lookup_reference(db, category, subcategory, parish_tier)

    if ref is None:
        # No seed data - defer to LLM review if we have any context
        if category and (scope_hint or budget_max):
            return await _llm_review(
                category=category,
                subcategory=subcategory,
                parish=parish,
                scope_hint=scope_hint or "",
                budget_min=budget_min,
                budget_max=budget_max,
                user_id=user_id,
                session_id=session_id,
            )
        return BudgetVerdict(
            verdict="unknown",
            recommended_min_jmd=0,
            recommended_max_jmd=0,
            explanation="No reference data for this category - provide more details.",
            used_reference=False,
        )

    scaled_low, scaled_mid, scaled_high = _scale_figures(ref, size_hint)
    verdict, explanation = _classify_budget(budget_min, budget_max, scaled_low, scaled_mid, scaled_high)

    verdict_obj = BudgetVerdict(
        verdict=verdict,
        recommended_min_jmd=int(round(scaled_low / 500) * 500),
        recommended_max_jmd=int(round(scaled_high / 500) * 500),
        explanation=explanation,
        used_reference=True,
        low_jmd=int(round(scaled_low / 500) * 500),
        mid_jmd=int(round(scaled_mid / 500) * 500),
        high_jmd=int(round(scaled_high / 500) * 500),
    )

    # Record budget rejection in usage log so we can measure savings
    if verdict_obj.is_blocking:
        await record_usage(
            endpoint="budget_validator.lookup",
            budget_rejected=True,
            user_id=user_id,
            session_id=session_id,
        )

    # Optional LLM sanity check on unusual scopes - even if reference lookup succeeded
    if _needs_llm_review(scope_hint) and not verdict_obj.is_blocking:
        try:
            llm_verdict = await _llm_review(
                category=category,
                subcategory=subcategory,
                parish=parish,
                scope_hint=scope_hint or "",
                budget_min=budget_min,
                budget_max=budget_max,
                user_id=user_id,
                session_id=session_id,
            )
            # If LLM disagrees and says too_low/too_high, prefer LLM
            if llm_verdict.verdict in ("too_low", "too_high"):
                llm_verdict.low_jmd = verdict_obj.low_jmd
                llm_verdict.mid_jmd = verdict_obj.mid_jmd
                llm_verdict.high_jmd = verdict_obj.high_jmd
                return llm_verdict
        except Exception:
            logger.exception("LLM budget review failed, keeping reference verdict")

    return verdict_obj


async def _llm_review(
    *,
    category: str,
    subcategory: str | None,
    parish: str | None,
    scope_hint: str,
    budget_min: float | None,
    budget_max: float | None,
    user_id: str | None,
    session_id: str | None,
) -> BudgetVerdict:
    """Single 300-token LLM call when reference lookup is insufficient."""
    user_message = json.dumps(
        {
            "category": category,
            "subcategory": subcategory,
            "parish": parish,
            "scope": scope_hint[:500],
            "budget_min_jmd": budget_min,
            "budget_max_jmd": budget_max,
        }
    )
    try:
        resp = await client.complete(
            messages=[
                {"role": "system", "content": BUDGET_REVIEW_PROMPT},
                {"role": "user", "content": user_message},
            ],
            temperature=0.0,
            max_tokens=300,
            response_format={"type": "json_object"},
            endpoint_name="budget_validator.llm",
            user_id=user_id,
            session_id=session_id,
        )
    except Exception as exc:
        logger.warning("LLM budget review failed: %s", exc)
        return BudgetVerdict(
            verdict="unknown",
            recommended_min_jmd=0,
            recommended_max_jmd=0,
            explanation="Could not verify budget - please provide more details.",
            used_reference=False,
            used_llm=True,
        )

    try:
        parsed = json.loads(resp.content)
    except Exception:
        return BudgetVerdict(
            verdict="unknown",
            recommended_min_jmd=0,
            recommended_max_jmd=0,
            explanation="Could not parse budget review - please provide more details.",
            used_reference=False,
            used_llm=True,
        )

    verdict = parsed.get("verdict", "unknown")
    if verdict not in ("too_low", "low_ok", "mid_ok", "high_ok", "too_high"):
        verdict = "unknown"

    rec_min = int(parsed.get("recommended_min_jmd") or 0)
    rec_max = int(parsed.get("recommended_max_jmd") or 0)
    reasoning = (parsed.get("reasoning") or "")[:500]

    verdict_obj = BudgetVerdict(
        verdict=verdict,
        recommended_min_jmd=rec_min,
        recommended_max_jmd=rec_max,
        explanation=reasoning,
        used_reference=False,
        used_llm=True,
    )
    if verdict_obj.is_blocking:
        await record_usage(
            endpoint="budget_validator.llm",
            budget_rejected=True,
            user_id=user_id,
            session_id=session_id,
        )
    return verdict_obj
