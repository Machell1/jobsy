"""OpenRouter client for Jobsy AI Assistant.

Thin async wrapper around httpx targeting OpenRouter's /chat/completions
endpoint. Handles:
  - Authentication + attribution headers
  - Streaming and non-streaming calls
  - Hard max_tokens ceilings (every call MUST pass one)
  - Token usage logging via telemetry module
  - Graceful fallback to direct DeepSeek when OpenRouter is unreachable

The client is a singleton created on first use. Every route that calls into
this module passes an `endpoint_name` so ai_usage_log entries are
distinguishable (e.g. "chat.stream", "classifier", "analyst", "budget_review").
"""

from __future__ import annotations

import asyncio
import json
import logging
import time
from dataclasses import dataclass, field
from typing import Any, AsyncIterator, Optional

import httpx

from shared.config import (
    AI_REQUEST_TIMEOUT_SECONDS,
    DEEPSEEK_API_KEY,
    DEEPSEEK_BASE_URL,
    OPENROUTER_API_KEY,
    OPENROUTER_APP_NAME,
    OPENROUTER_BASE_URL,
    OPENROUTER_MODEL,
    OPENROUTER_SITE_URL,
)

from .telemetry import record_usage

logger = logging.getLogger(__name__)


class OpenRouterKeyMissing(RuntimeError):
    """Raised when no AI backend key is configured."""


class AiBackendError(RuntimeError):
    """Raised when the AI backend returns a non-2xx response we can't recover from."""


@dataclass
class ChatResponse:
    content: str
    prompt_tokens: int = 0
    completion_tokens: int = 0
    total_tokens: int = 0
    model: str = ""
    latency_ms: int = 0
    raw: dict = field(default_factory=dict)


# ──────────────────────────────────────────────────────────────────────────────
# Singleton httpx client (one per process, reuses connections)
# ──────────────────────────────────────────────────────────────────────────────

_client: Optional[httpx.AsyncClient] = None


def _get_http_client() -> httpx.AsyncClient:
    global _client
    if _client is None:
        _client = httpx.AsyncClient(
            timeout=httpx.Timeout(
                AI_REQUEST_TIMEOUT_SECONDS,
                connect=5.0,
                read=AI_REQUEST_TIMEOUT_SECONDS,
            ),
            limits=httpx.Limits(max_keepalive_connections=10, max_connections=20),
        )
    return _client


async def close_http_client() -> None:
    """Called from FastAPI shutdown handler."""
    global _client
    if _client is not None:
        try:
            await _client.aclose()
        except Exception:
            pass
        _client = None


# ──────────────────────────────────────────────────────────────────────────────
# Request builder
# ──────────────────────────────────────────────────────────────────────────────


def _resolve_backend() -> tuple[str, str, dict[str, str]]:
    """Return (base_url, api_key, headers) - preferring OpenRouter, falling back to DeepSeek direct.

    Raises OpenRouterKeyMissing if neither is configured.
    """
    if OPENROUTER_API_KEY:
        headers = {
            "Authorization": f"Bearer {OPENROUTER_API_KEY}",
            "Content-Type": "application/json",
            "HTTP-Referer": OPENROUTER_SITE_URL,
            "X-Title": OPENROUTER_APP_NAME,
        }
        return OPENROUTER_BASE_URL, OPENROUTER_API_KEY, headers

    if DEEPSEEK_API_KEY:
        headers = {
            "Authorization": f"Bearer {DEEPSEEK_API_KEY}",
            "Content-Type": "application/json",
        }
        return DEEPSEEK_BASE_URL, DEEPSEEK_API_KEY, headers

    raise OpenRouterKeyMissing(
        "No AI backend configured - set OPENROUTER_API_KEY or DEEPSEEK_API_KEY"
    )


def _resolve_model() -> str:
    """Choose the model string for the active backend."""
    if OPENROUTER_API_KEY:
        return OPENROUTER_MODEL
    # Direct DeepSeek - strip any "deepseek/" prefix
    m = OPENROUTER_MODEL
    if m.startswith("deepseek/"):
        m = m.split("/", 1)[1]
    # DeepSeek API's standard model name
    return m if m else "deepseek-chat"


def _build_payload(
    messages: list[dict],
    *,
    temperature: float,
    max_tokens: int,
    stream: bool,
    response_format: dict | None,
) -> dict:
    payload: dict[str, Any] = {
        "model": _resolve_model(),
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
        "stream": stream,
    }
    if stream:
        # OpenRouter: include usage in the terminal streamed chunk
        payload["stream_options"] = {"include_usage": True}
    if response_format is not None:
        payload["response_format"] = response_format
    return payload


# ──────────────────────────────────────────────────────────────────────────────
# Public: complete() — single-shot, non-streaming
# ──────────────────────────────────────────────────────────────────────────────


async def complete(
    messages: list[dict],
    *,
    temperature: float = 0.3,
    max_tokens: int,
    response_format: dict | None = None,
    endpoint_name: str,
    user_id: str | None = None,
    session_id: str | None = None,
) -> ChatResponse:
    """Non-streaming chat completion.

    Used for: classifier, budget_validator LLM review, cost_projector analysis,
    auto_extract. Streaming is for the main chat UI only.
    """
    base_url, _, headers = _resolve_backend()
    payload = _build_payload(
        messages,
        temperature=temperature,
        max_tokens=max_tokens,
        stream=False,
        response_format=response_format,
    )

    client = _get_http_client()
    started = time.perf_counter()
    try:
        resp = await client.post(f"{base_url}/chat/completions", json=payload, headers=headers)
    except httpx.RequestError as exc:
        latency_ms = int((time.perf_counter() - started) * 1000)
        await record_usage(
            endpoint=endpoint_name,
            model=payload["model"],
            latency_ms=latency_ms,
            error=f"request_error: {exc}",
            user_id=user_id,
            session_id=session_id,
        )
        raise AiBackendError(f"AI backend unreachable: {exc}") from exc

    latency_ms = int((time.perf_counter() - started) * 1000)

    if resp.status_code >= 400:
        body = (resp.text or "")[:400]
        await record_usage(
            endpoint=endpoint_name,
            model=payload["model"],
            latency_ms=latency_ms,
            error=f"http_{resp.status_code}: {body}",
            user_id=user_id,
            session_id=session_id,
        )
        raise AiBackendError(f"AI backend HTTP {resp.status_code}: {body}")

    try:
        data = resp.json()
    except Exception as exc:
        raise AiBackendError(f"AI backend returned non-JSON: {exc}")

    choices = data.get("choices") or []
    content = ""
    if choices:
        msg = choices[0].get("message", {})
        content = msg.get("content") or ""

    usage = data.get("usage") or {}
    prompt_tokens = int(usage.get("prompt_tokens") or 0)
    completion_tokens = int(usage.get("completion_tokens") or 0)
    total_tokens = int(usage.get("total_tokens") or (prompt_tokens + completion_tokens))

    await record_usage(
        endpoint=endpoint_name,
        model=payload["model"],
        prompt_tokens=prompt_tokens,
        completion_tokens=completion_tokens,
        total_tokens=total_tokens,
        latency_ms=latency_ms,
        user_id=user_id,
        session_id=session_id,
    )

    return ChatResponse(
        content=content,
        prompt_tokens=prompt_tokens,
        completion_tokens=completion_tokens,
        total_tokens=total_tokens,
        model=payload["model"],
        latency_ms=latency_ms,
        raw=data,
    )


# ──────────────────────────────────────────────────────────────────────────────
# Public: stream() — async iterator of delta events
# ──────────────────────────────────────────────────────────────────────────────


async def stream(
    messages: list[dict],
    *,
    temperature: float = 0.4,
    max_tokens: int,
    endpoint_name: str,
    user_id: str | None = None,
    session_id: str | None = None,
) -> AsyncIterator[dict]:
    """Stream tokens as {type: "delta", content: "..."} events.

    Yields exactly one {type: "usage", ...} event when the stream completes
    (from the terminal OpenRouter chunk) before yielding {type: "done"}.
    On error, yields {type: "error", message: "..."} and returns.
    """
    base_url, _, headers = _resolve_backend()
    payload = _build_payload(
        messages,
        temperature=temperature,
        max_tokens=max_tokens,
        stream=True,
        response_format=None,
    )

    client = _get_http_client()
    started = time.perf_counter()
    total_content = ""
    prompt_tokens = completion_tokens = total_tokens = 0

    try:
        async with client.stream(
            "POST",
            f"{base_url}/chat/completions",
            json=payload,
            headers=headers,
        ) as resp:
            if resp.status_code >= 400:
                body = (await resp.aread())[:400].decode("utf-8", errors="replace")
                await record_usage(
                    endpoint=endpoint_name,
                    model=payload["model"],
                    latency_ms=int((time.perf_counter() - started) * 1000),
                    error=f"http_{resp.status_code}: {body}",
                    user_id=user_id,
                    session_id=session_id,
                )
                yield {"type": "error", "message": f"AI backend HTTP {resp.status_code}"}
                return

            async for raw_line in resp.aiter_lines():
                if not raw_line:
                    continue
                line = raw_line.strip()
                if not line.startswith("data:"):
                    continue
                data_str = line[5:].strip()
                if data_str == "[DONE]":
                    break
                try:
                    data = json.loads(data_str)
                except json.JSONDecodeError:
                    continue

                # Usage may arrive on the last chunk with empty choices
                usage = data.get("usage")
                if usage:
                    prompt_tokens = int(usage.get("prompt_tokens") or 0)
                    completion_tokens = int(usage.get("completion_tokens") or 0)
                    total_tokens = int(usage.get("total_tokens") or (prompt_tokens + completion_tokens))

                choices = data.get("choices") or []
                if not choices:
                    continue
                delta = choices[0].get("delta") or {}
                chunk = delta.get("content") or ""
                if chunk:
                    total_content += chunk
                    yield {"type": "delta", "content": chunk}

    except httpx.RequestError as exc:
        latency_ms = int((time.perf_counter() - started) * 1000)
        await record_usage(
            endpoint=endpoint_name,
            model=payload["model"],
            latency_ms=latency_ms,
            error=f"request_error: {exc}",
            user_id=user_id,
            session_id=session_id,
        )
        yield {"type": "error", "message": "AI backend unreachable"}
        return
    except Exception as exc:  # noqa: BLE001
        logger.exception("Unexpected error in AI stream")
        yield {"type": "error", "message": f"AI error: {exc}"}
        return

    latency_ms = int((time.perf_counter() - started) * 1000)

    # If usage wasn't in the stream, estimate from content length (~4 chars/token)
    if total_tokens == 0 and total_content:
        est = max(1, len(total_content) // 4)
        completion_tokens = est
        total_tokens = est

    await record_usage(
        endpoint=endpoint_name,
        model=payload["model"],
        prompt_tokens=prompt_tokens,
        completion_tokens=completion_tokens,
        total_tokens=total_tokens,
        latency_ms=latency_ms,
        user_id=user_id,
        session_id=session_id,
    )

    yield {
        "type": "usage",
        "prompt_tokens": prompt_tokens,
        "completion_tokens": completion_tokens,
        "total_tokens": total_tokens,
        "latency_ms": latency_ms,
    }
    yield {"type": "done"}
