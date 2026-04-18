"""Full Jamaica cost projection for a job.

Orchestrates:
  1. Reference row lookup (same as budget_validator)
  2. Tavily web search for real-time Jamaica price data
  3. Single DeepSeek JSON call synthesising #1 + #2 + user scope into
     low/mid/high tiers with materials breakdown, labor description,
     recommendation, and citations
  4. Graceful fallback to reference-row-only pricing if the LLM fails

Result is cached on the caller's ai_job_sessions.cost_projection JSONB so
the frontend can re-render the CostBreakdownCard on reload without spending
tokens.

This is the MOST EXPENSIVE call in the AI stack. It is gated by:
  - scope_guard (caller must already have passed scope check)
  - budget_validator (caller must have verdict != too_low, too_high)
  - rate_limit (per-user + daily budget)
"""

from __future__ import annotations

import json
import logging
from dataclasses import dataclass, field
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from shared.config import AI_MAX_TOKENS_ANALYSIS

from . import client, search
from .budget_validator import _lookup_reference, _parish_to_tier, _scale_figures
from .prompts import ANALYST_PROMPT

logger = logging.getLogger(__name__)


@dataclass
class CostProjection:
    low: dict
    mid: dict
    high: dict
    recommended: dict
    assumptions: list[str] = field(default_factory=list)
    citations: list[dict] = field(default_factory=list)
    used_web_search: bool = False
    used_reference: bool = False
    source: str = "llm"  # "llm" | "reference_fallback"

    def to_dict(self) -> dict:
        return {
            "low": self.low,
            "mid": self.mid,
            "high": self.high,
            "recommended": self.recommended,
            "assumptions": self.assumptions,
            "citations": self.citations,
            "used_web_search": self.used_web_search,
            "used_reference": self.used_reference,
            "source": self.source,
        }


def _round_jmd(n: float) -> int:
    n = abs(float(n))
    if n < 50_000:
        return int(round(n / 500) * 500)
    if n < 500_000:
        return int(round(n / 5_000) * 5_000)
    return int(round(n / 50_000) * 50_000)


def _reference_only_projection(ref_row: dict, scaled_low: float, scaled_mid: float, scaled_high: float) -> CostProjection:
    """Fallback when the LLM call fails. Uses only reference row numbers."""
    def tier(total: float, label: str) -> dict:
        # Split 40/60 materials/labor as a rough default
        materials = total * 0.4
        labor = total * 0.6
        return {
            "materials_jmd": _round_jmd(materials),
            "labor_jmd": _round_jmd(labor),
            "total_jmd": _round_jmd(total),
            "materials_breakdown": [
                {"item": f"{ref_row.get('category')} materials ({label} tier)", "jmd": _round_jmd(materials)},
            ],
            "labor_description": f"{label.capitalize()} tier labor per Jamaica market rates",
        }

    return CostProjection(
        low=tier(scaled_low, "low"),
        mid=tier(scaled_mid, "mid"),
        high=tier(scaled_high, "high"),
        recommended={
            "tier": "mid",
            "total_jmd": _round_jmd(scaled_mid),
            "reasoning": "Mid quality is the most common choice for Jamaica residential work and balances cost with durability.",
        },
        assumptions=[
            "Estimate based on Jobsy reference pricing only (no live web research this round).",
            f"Reference: {ref_row.get('category')} / {ref_row.get('subcategory') or 'general'}",
        ],
        citations=[],
        used_web_search=False,
        used_reference=True,
        source="reference_fallback",
    )


async def project(
    db: AsyncSession,
    *,
    category: str,
    subcategory: str | None,
    parish: str | None,
    scope_description: str,
    size_hint: dict | None = None,
    user_id: str | None = None,
    session_id: str | None = None,
) -> CostProjection:
    """Produce a full cost projection. Never raises - falls back on errors."""
    parish_tier = _parish_to_tier(parish)
    ref = await _lookup_reference(db, category, subcategory, parish_tier)

    scaled_low = scaled_mid = scaled_high = 0.0
    if ref is not None:
        scaled_low, scaled_mid, scaled_high = _scale_figures(ref, size_hint)

    # Web search — grounding layer
    search_query = f"{subcategory or category} {scope_description[:150]}"
    search_response = await search.search_jamaica_prices(
        search_query,
        category=category,
        parish_tier=parish_tier,
        user_id=user_id,
        session_id=session_id,
    )

    # Build LLM input
    context_lines: list[str] = []
    if ref:
        context_lines.append(
            "REFERENCE PRICING (Jobsy seed data, parish_tier={tier}): "
            "low=J${low:,} mid=J${mid:,} high=J${high:,} unit={unit} typical_duration_days={dur}".format(
                tier=ref["parish_tier"],
                low=int(scaled_low),
                mid=int(scaled_mid),
                high=int(scaled_high),
                unit=ref["unit"],
                dur=ref.get("typical_duration_days") or "-",
            )
        )
        if ref.get("notes"):
            context_lines.append(f"REFERENCE NOTES: {ref['notes']}")
    if search_response.answer:
        context_lines.append(f"WEB RESEARCH SUMMARY: {search_response.answer[:800]}")
    for i, result in enumerate(search_response.results[:3], start=1):
        context_lines.append(
            f"SEARCH RESULT {i}: {result.title} ({result.url}) - {result.snippet[:300]}"
        )

    user_payload = {
        "category": category,
        "subcategory": subcategory,
        "parish": parish,
        "parish_tier": parish_tier,
        "scope_description": scope_description,
        "size_hint": size_hint,
        "reference_and_search_context": "\n".join(context_lines),
    }

    try:
        resp = await client.complete(
            messages=[
                {"role": "system", "content": ANALYST_PROMPT},
                {"role": "user", "content": json.dumps(user_payload)},
            ],
            temperature=0.3,
            max_tokens=AI_MAX_TOKENS_ANALYSIS,
            response_format={"type": "json_object"},
            endpoint_name="cost_projector.analyst",
            user_id=user_id,
            session_id=session_id,
        )
    except Exception as exc:
        logger.warning("Cost projector LLM failed: %s", exc)
        if ref:
            return _reference_only_projection(ref, scaled_low, scaled_mid, scaled_high)
        raise

    try:
        parsed = json.loads(resp.content)
    except json.JSONDecodeError:
        # One retry with lower temperature
        try:
            resp2 = await client.complete(
                messages=[
                    {"role": "system", "content": ANALYST_PROMPT},
                    {"role": "user", "content": json.dumps(user_payload)},
                    {"role": "assistant", "content": resp.content},
                    {"role": "user", "content": "Your previous response was not valid JSON. Return ONLY the JSON object, no preamble, no markdown fences."},
                ],
                temperature=0.1,
                max_tokens=AI_MAX_TOKENS_ANALYSIS,
                response_format={"type": "json_object"},
                endpoint_name="cost_projector.analyst_retry",
                user_id=user_id,
                session_id=session_id,
            )
            parsed = json.loads(resp2.content)
        except Exception:
            if ref:
                return _reference_only_projection(ref, scaled_low, scaled_mid, scaled_high)
            raise

    # Validate + round figures
    def _clean_tier(tier: Any) -> dict:
        if not isinstance(tier, dict):
            return {"materials_jmd": 0, "labor_jmd": 0, "total_jmd": 0, "materials_breakdown": [], "labor_description": ""}
        materials = float(tier.get("materials_jmd") or 0)
        labor = float(tier.get("labor_jmd") or 0)
        total = float(tier.get("total_jmd") or (materials + labor))
        breakdown = tier.get("materials_breakdown") or []
        cleaned_breakdown = []
        for row in breakdown[:10]:
            if isinstance(row, dict) and "item" in row and "jmd" in row:
                cleaned_breakdown.append(
                    {"item": str(row["item"])[:100], "jmd": _round_jmd(float(row["jmd"]))}
                )
        return {
            "materials_jmd": _round_jmd(materials),
            "labor_jmd": _round_jmd(labor),
            "total_jmd": _round_jmd(total),
            "materials_breakdown": cleaned_breakdown,
            "labor_description": str(tier.get("labor_description") or "")[:240],
        }

    low = _clean_tier(parsed.get("low"))
    mid = _clean_tier(parsed.get("mid"))
    high = _clean_tier(parsed.get("high"))

    recommended_raw = parsed.get("recommended") or {}
    if not isinstance(recommended_raw, dict):
        recommended_raw = {}
    recommended = {
        "tier": recommended_raw.get("tier") if recommended_raw.get("tier") in ("low", "mid", "high") else "mid",
        "total_jmd": _round_jmd(float(recommended_raw.get("total_jmd") or mid["total_jmd"])),
        "reasoning": str(recommended_raw.get("reasoning") or "")[:400],
    }

    assumptions = [str(a)[:300] for a in (parsed.get("assumptions") or [])][:6]
    raw_citations = parsed.get("citations") or []
    citations: list[dict] = []
    for c in raw_citations[:5]:
        if isinstance(c, dict) and c.get("url"):
            citations.append(
                {
                    "url": str(c["url"])[:500],
                    "used_for": str(c.get("used_for") or "")[:200],
                }
            )

    return CostProjection(
        low=low,
        mid=mid,
        high=high,
        recommended=recommended,
        assumptions=assumptions,
        citations=citations,
        used_web_search=bool(search_response.results),
        used_reference=ref is not None,
        source="llm",
    )
