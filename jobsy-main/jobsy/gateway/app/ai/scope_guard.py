"""Two-layer scope guard for the Jobsy AI Assistant.

Layer 1 — cheap regex prefilter (no network call):
  - Allow-list keywords bump score
  - Deny-list keywords drop score
  - score >= 2 → pass (definitely in scope)
  - score <= -1 → hard reject (definitely out of scope)
  - Otherwise → defer to Layer 2

Layer 2 — single 150-token classifier LLM call:
  - Returns JSON {"in_scope": bool, "category": str, "reason": str}

The whole point of this module is to avoid paying for the main chat model
on off-topic queries. We log every rejection to ai_usage_log so we can
verify it's actually saving tokens.
"""

from __future__ import annotations

import json
import logging
import re
from dataclasses import dataclass

from shared.config import AI_MAX_TOKENS_CLASSIFIER

from . import client
from .prompts import CLASSIFIER_PROMPT, SCOPE_REJECTION_MESSAGE
from .telemetry import record_usage

logger = logging.getLogger(__name__)


# Allow-list: seeing any of these bumps the score by 1.
# Roughly: Jobsy-specific nouns, Jamaica nouns, trade categories, job-post vocabulary.
_ALLOW = {
    "job", "jobs", "post", "posting", "hire", "hiring", "hirer", "provider",
    "bid", "bids", "bidding", "proposal", "contract", "contracts", "signature",
    "budget", "quote", "cost", "price", "pricing", "estimate", "rate", "rates",
    "jmd", "j$", "jamaica", "jamaican", "parish", "kingston", "st.",
    "andrew", "catherine", "clarendon", "manchester", "elizabeth", "westmoreland",
    "hanover", "james", "trelawny", "ann", "mary", "portland", "thomas",
    "plumber", "plumbing", "electrician", "electrical", "painter", "painting",
    "carpenter", "carpentry", "landscaping", "gardener", "cleaner", "cleaning",
    "mover", "moving", "tutor", "tutoring", "photographer", "photography",
    "caterer", "catering", "beautician", "hairdresser", "mechanic", "auto",
    "construction", "contractor", "roofer", "roofing", "welder", "mason",
    "tailor", "tailoring", "it ", "web", "website", "logo", "network",
    "trade", "trades", "service", "services", "handyman", "labour", "labor",
    "jobsy", "escrow", "payout", "deposit", "milestone", "milestones",
    "deadline", "scope", "materials", "warranty", "tradesperson",
    "fee", "fees", "refund", "dispute", "verify", "verification",
    "fix", "repair", "install", "renovate", "build",
}

# Deny-list: obvious off-topic tokens. Each hit drops score by 2.
_DENY = {
    "poem", "poetry", "joke", "story", "song", "lyric",
    "python", "javascript", "code", "coding", "function", "algorithm",
    "recipe", "cook", "cooking", "bake", "baking",
    "weather", "forecast", "temperature",
    "crypto", "bitcoin", "ethereum", "nft",
    "politics", "election", "president", "prime minister",
    "sport", "sports", "football", "cricket",
    "homework", "essay", "assignment",
    "girlfriend", "boyfriend", "relationship", "dating",
    "translate", "translation",
    "medical", "diagnose", "diagnosis", "symptom",
    "lawyer", "lawsuit", "sue",
}


@dataclass
class ScopeVerdict:
    in_scope: bool
    layer: str  # "regex_pass" | "regex_reject" | "llm_pass" | "llm_reject" | "error"
    category: str | None = None
    reason: str | None = None


def _regex_score(text: str) -> int:
    t = text.lower()
    score = 0
    for kw in _ALLOW:
        if kw in t:
            score += 1
    for kw in _DENY:
        if kw in t:
            score -= 2
    return score


async def check(
    text: str,
    *,
    user_id: str | None = None,
    session_id: str | None = None,
) -> ScopeVerdict:
    """Return ScopeVerdict. Writes ai_usage_log on reject.

    If Layer 1 is decisive, Layer 2 is not called.
    """
    if not text or not text.strip():
        return ScopeVerdict(in_scope=False, layer="regex_reject", reason="empty message")

    score = _regex_score(text)
    if score >= 2:
        return ScopeVerdict(in_scope=True, layer="regex_pass", reason=f"score={score}")

    if score <= -1:
        await record_usage(
            endpoint="scope_guard.regex",
            scope_rejected=True,
            user_id=user_id,
            session_id=session_id,
        )
        return ScopeVerdict(
            in_scope=False,
            layer="regex_reject",
            reason=SCOPE_REJECTION_MESSAGE,
        )

    # Ambiguous - defer to LLM classifier
    try:
        resp = await client.complete(
            messages=[
                {"role": "system", "content": CLASSIFIER_PROMPT},
                {"role": "user", "content": text[:1500]},  # cap input length
            ],
            temperature=0.0,
            max_tokens=AI_MAX_TOKENS_CLASSIFIER,
            response_format={"type": "json_object"},
            endpoint_name="scope_guard.llm",
            user_id=user_id,
            session_id=session_id,
        )
    except Exception as exc:
        logger.exception("Scope classifier failed, defaulting to PASS")
        return ScopeVerdict(
            in_scope=True,
            layer="error",
            reason=f"classifier error, failing open: {exc}",
        )

    try:
        parsed = json.loads(resp.content)
    except Exception:
        logger.warning("Scope classifier returned non-JSON: %r", resp.content[:200])
        # Fail open on parse error - the main model's system prompt also enforces scope
        return ScopeVerdict(in_scope=True, layer="error", reason="classifier parse error")

    in_scope = bool(parsed.get("in_scope"))
    category = parsed.get("category")
    reason = parsed.get("reason")

    if not in_scope:
        await record_usage(
            endpoint="scope_guard.llm",
            scope_rejected=True,
            user_id=user_id,
            session_id=session_id,
        )

    return ScopeVerdict(
        in_scope=in_scope,
        layer="llm_pass" if in_scope else "llm_reject",
        category=category,
        reason=reason or SCOPE_REJECTION_MESSAGE,
    )
