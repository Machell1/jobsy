"""Tavily web search client — grounding layer for Jamaica market research.

Used exclusively by cost_projector.py. Results are cached in Redis for 24h
per (query, category, parish_tier) key, so a second identical analysis
doesn't re-spend Tavily calls.

Tavily chosen over Brave/SerpAPI for its ``include_answer=True`` flag which
returns pre-synthesised snippets that dramatically reduce the DeepSeek tokens
needed to reconcile noisy SERP results.

If TAVILY_API_KEY is missing, the search module returns an empty result set
so the cost projector can fall back to reference-row-only pricing.
"""

from __future__ import annotations

import hashlib
import json
import logging
from dataclasses import asdict, dataclass, field
from typing import Any

import httpx
import redis.asyncio as aioredis

from shared.config import (
    AI_REQUEST_TIMEOUT_SECONDS,
    REDIS_URL,
    TAVILY_API_KEY,
    TAVILY_BASE_URL,
)

from .telemetry import record_usage

logger = logging.getLogger(__name__)

_CACHE_TTL_SECONDS = 24 * 60 * 60

# Domains we prefer for Jamaica-specific grounding. Not exclusive - Tavily
# can still return others - but we bump these in the prompt.
_JAMAICA_DOMAINS = [
    "jamaica-gleaner.com",
    "loopjamaica.com",
    "jamaicaobserver.com",
    "jamaica.constructionreview.com",
    "jamaicainformation.com",
    "do.gov.jm",
    "jcf.gov.jm",
    "mlss.gov.jm",
]


@dataclass
class SearchResult:
    title: str
    url: str
    snippet: str
    domain: str
    score: float = 0.0

    def to_dict(self) -> dict:
        return asdict(self)


@dataclass
class SearchResponse:
    query: str
    answer: str  # Tavily's pre-synthesised answer (if any)
    results: list[SearchResult] = field(default_factory=list)
    cached: bool = False

    def to_dict(self) -> dict:
        return {
            "query": self.query,
            "answer": self.answer,
            "results": [r.to_dict() for r in self.results],
            "cached": self.cached,
        }


_http: httpx.AsyncClient | None = None
_redis: aioredis.Redis | None = None


def _get_http() -> httpx.AsyncClient:
    global _http
    if _http is None:
        _http = httpx.AsyncClient(timeout=httpx.Timeout(AI_REQUEST_TIMEOUT_SECONDS))
    return _http


def _get_redis() -> aioredis.Redis | None:
    global _redis
    if _redis is not None:
        return _redis
    if not REDIS_URL:
        return None
    try:
        _redis = aioredis.from_url(REDIS_URL, decode_responses=True)
        return _redis
    except Exception:
        logger.exception("Redis init failed for search cache")
        return None


def _cache_key(query: str, category: str, parish_tier: str) -> str:
    h = hashlib.sha1(f"{query}|{category}|{parish_tier}".encode("utf-8")).hexdigest()
    return f"ai_tavily:{h}"


def _extract_domain(url: str) -> str:
    try:
        return url.split("://", 1)[-1].split("/", 1)[0]
    except Exception:
        return url


async def search_jamaica_prices(
    query: str,
    *,
    category: str,
    parish_tier: str = "island",
    user_id: str | None = None,
    session_id: str | None = None,
) -> SearchResponse:
    """Fetch Jamaica-focused price research for the given query.

    Query is auto-augmented with Jamaica + JMD + year to steer results.
    Cached 24 hours per (query, category, parish_tier).
    """
    if not TAVILY_API_KEY:
        logger.info("Tavily key missing - returning empty search response")
        return SearchResponse(query=query, answer="", results=[])

    # Auto-augment the query
    augmented = f"{query} {category} price cost Jamaica JMD 2025"

    # ── Cache check ───────────────────────────────────────────────────────
    r = _get_redis()
    ck = _cache_key(augmented, category, parish_tier)
    if r is not None:
        try:
            cached_json = await r.get(ck)
            if cached_json:
                data = json.loads(cached_json)
                await record_usage(
                    endpoint="tavily.search",
                    cached_search_hit=True,
                    user_id=user_id,
                    session_id=session_id,
                )
                return SearchResponse(
                    query=data["query"],
                    answer=data.get("answer", ""),
                    results=[SearchResult(**row) for row in data.get("results", [])],
                    cached=True,
                )
        except Exception:
            logger.exception("Cache read error for Tavily")

    # ── Live call ─────────────────────────────────────────────────────────
    payload: dict[str, Any] = {
        "api_key": TAVILY_API_KEY,
        "query": augmented,
        "search_depth": "basic",
        "max_results": 5,
        "include_answer": True,
        "include_raw_content": False,
        "include_domains": _JAMAICA_DOMAINS,
    }

    try:
        resp = await _get_http().post(f"{TAVILY_BASE_URL}/search", json=payload)
    except httpx.RequestError as exc:
        await record_usage(
            endpoint="tavily.search",
            error=f"request_error: {exc}",
            user_id=user_id,
            session_id=session_id,
        )
        logger.warning("Tavily request failed, falling back to empty: %s", exc)
        return SearchResponse(query=augmented, answer="", results=[])

    if resp.status_code >= 400:
        body = (resp.text or "")[:400]
        await record_usage(
            endpoint="tavily.search",
            error=f"http_{resp.status_code}: {body}",
            user_id=user_id,
            session_id=session_id,
        )
        logger.warning("Tavily HTTP %s: %s", resp.status_code, body)
        # Try again without the include_domains filter (it's not universal)
        payload.pop("include_domains", None)
        try:
            resp = await _get_http().post(f"{TAVILY_BASE_URL}/search", json=payload)
        except Exception:
            return SearchResponse(query=augmented, answer="", results=[])
        if resp.status_code >= 400:
            return SearchResponse(query=augmented, answer="", results=[])

    try:
        data = resp.json()
    except Exception:
        return SearchResponse(query=augmented, answer="", results=[])

    answer = (data.get("answer") or "").strip()
    raw_results = data.get("results") or []

    results: list[SearchResult] = []
    for row in raw_results[:5]:
        url = row.get("url", "")
        results.append(
            SearchResult(
                title=(row.get("title") or "")[:240],
                url=url,
                snippet=(row.get("content") or "")[:600],
                domain=_extract_domain(url),
                score=float(row.get("score") or 0.0),
            )
        )

    response = SearchResponse(query=augmented, answer=answer, results=results)

    # ── Cache write ───────────────────────────────────────────────────────
    if r is not None:
        try:
            await r.setex(ck, _CACHE_TTL_SECONDS, json.dumps(response.to_dict()))
        except Exception:
            logger.exception("Cache write error for Tavily")

    await record_usage(
        endpoint="tavily.search",
        cached_search_hit=False,
        user_id=user_id,
        session_id=session_id,
    )
    return response
