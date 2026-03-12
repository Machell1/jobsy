"""Reverse proxy routes to internal microservices."""

import json
import logging
from datetime import datetime
from decimal import Decimal
from uuid import UUID

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy import text

from shared.database import engine

from ..config import SERVICE_URLS
from ..deps import get_current_user, get_optional_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["proxy"])

# Headers that must not be forwarded between proxy hops
_HOP_BY_HOP = frozenset({
    "connection", "keep-alive", "proxy-authenticate", "proxy-authorization",
    "te", "trailers", "transfer-encoding", "upgrade", "content-encoding", "content-length",
})


async def _proxy_request(service: str, path: str, request: Request, user: dict) -> Response:
    """Forward a request to an internal service with user context."""
    base_url = SERVICE_URLS.get(service)
    if not base_url:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Service {service} not found",
        )

    url = f"{base_url}{path}"
    # Forward request ID for distributed tracing
    request_id = getattr(request.state, "request_id", None) or request.headers.get("X-Request-ID", "")
    headers = {
        "X-User-ID": user["user_id"],
        "X-User-Role": user.get("active_role") or user.get("role", "user"),
        "X-User-Roles": ",".join(user.get("roles", [])),
        "X-Request-ID": request_id,
        "Content-Type": request.headers.get("content-type", "application/json"),
    }

    body = await request.body()
    client = request.app.state.http_client

    try:
        response = await client.request(
            method=request.method,
            url=url,
            headers=headers,
            content=body,
            params=dict(request.query_params),
        )
    except httpx.ConnectError:
        logger.error("Cannot connect to %s service at %s", service, base_url)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Service {service} is unavailable",
        ) from None
    except httpx.TimeoutException:
        logger.error("Timeout connecting to %s service at %s", service, base_url)
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail=f"Service {service} timed out",
        ) from None
    except httpx.HTTPError:
        logger.error("HTTP error proxying to %s service at %s", service, base_url)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Service {service} is unavailable",
        ) from None

    resp_headers = {k: v for k, v in response.headers.items() if k.lower() not in _HOP_BY_HOP}

    return Response(
        content=response.content,
        status_code=response.status_code,
        headers=resp_headers,
    )


@router.api_route("/profiles", methods=["GET"])
async def proxy_profiles_root_read(request: Request, user: dict = Depends(get_optional_user)):
    """Public read access to profiles root."""
    return await _proxy_request("profiles", "/", request, user)


@router.api_route("/profiles/{path:path}", methods=["GET"])
async def proxy_profiles_read(path: str, request: Request, user: dict = Depends(get_optional_user)):
    """Public read access to profiles."""
    return await _proxy_request("profiles", f"/{path}", request, user)


@router.api_route("/profiles", methods=["POST", "PUT"])
async def proxy_profiles_root_write(request: Request, user: dict = Depends(get_current_user)):
    """Authenticated write access to profiles root (create/update own profile)."""
    return await _proxy_request("profiles", "/", request, user)


@router.api_route("/profiles/{path:path}", methods=["POST", "PUT", "DELETE"])
async def proxy_profiles_write(path: str, request: Request, user: dict = Depends(get_current_user)):
    """Authenticated write access to profiles."""
    return await _proxy_request("profiles", f"/{path}", request, user)


@router.api_route("/listings", methods=["GET"])
async def proxy_listings_root_read(request: Request, user: dict = Depends(get_optional_user)):
    """Public read access to listings root."""
    return await _proxy_request("listings", "/", request, user)


@router.api_route("/listings/{path:path}", methods=["GET"])
async def proxy_listings_read(path: str, request: Request, user: dict = Depends(get_optional_user)):
    """Public read access to listings (browse, search, view)."""
    return await _proxy_request("listings", f"/{path}", request, user)


@router.api_route("/listings", methods=["POST"])
async def proxy_listings_root_write(request: Request, user: dict = Depends(get_current_user)):
    """Authenticated create access to listings root."""
    return await _proxy_request("listings", "/", request, user)


@router.api_route("/listings/{path:path}", methods=["POST", "PUT", "PATCH", "DELETE"])
async def proxy_listings_write(path: str, request: Request, user: dict = Depends(get_current_user)):
    """Authenticated write access to listings."""
    return await _proxy_request("listings", f"/{path}", request, user)


@router.api_route("/swipes/{path:path}", methods=["GET", "POST"])
async def proxy_swipes(path: str, request: Request, user: dict = Depends(get_current_user)):
    return await _proxy_request("swipes", f"/{path}", request, user)


@router.api_route("/matches/{path:path}", methods=["GET", "PUT"])
async def proxy_matches(path: str, request: Request, user: dict = Depends(get_current_user)):
    return await _proxy_request("matches", f"/{path}", request, user)


@router.api_route("/geo/{path:path}", methods=["GET"])
async def proxy_geo(path: str, request: Request, user: dict = Depends(get_current_user)):
    return await _proxy_request("geo", f"/{path}", request, user)


@router.api_route("/recommendations/{path:path}", methods=["GET", "POST", "PUT"])
async def proxy_recommendations(path: str, request: Request, user: dict = Depends(get_current_user)):
    return await _proxy_request("recommendations", f"/{path}", request, user)


@router.api_route("/chat/{path:path}", methods=["GET", "POST", "PUT", "DELETE"])
async def proxy_chat(path: str, request: Request, user: dict = Depends(get_current_user)):
    return await _proxy_request("chat", f"/{path}", request, user)


@router.post("/notifications/subscribe")
async def proxy_newsletter_subscribe(request: Request):
    """Public newsletter subscription (no auth required)."""
    user = {"user_id": "anonymous", "role": "anonymous"}
    return await _proxy_request("notifications", "/subscribe", request, user)


@router.api_route("/notifications/{path:path}", methods=["GET", "POST", "PUT", "DELETE"])
async def proxy_notifications(path: str, request: Request, user: dict = Depends(get_current_user)):
    return await _proxy_request("notifications", f"/{path}", request, user)


@router.api_route("/storage/{path:path}", methods=["GET", "POST", "DELETE"])
async def proxy_storage(path: str, request: Request, user: dict = Depends(get_current_user)):
    return await _proxy_request("storage", f"/{path}", request, user)


@router.api_route("/ads/{path:path}", methods=["GET", "POST", "PUT", "DELETE"])
async def proxy_ads(path: str, request: Request, user: dict = Depends(get_current_user)):
    return await _proxy_request("ads", f"/{path}", request, user)


@router.api_route("/payments/{path:path}", methods=["GET", "POST", "PUT"])
async def proxy_payments(path: str, request: Request, user: dict = Depends(get_current_user)):
    return await _proxy_request("payments", f"/{path}", request, user)


@router.api_route("/reviews/{path:path}", methods=["GET"])
async def proxy_reviews_read(path: str, request: Request, user: dict = Depends(get_optional_user)):
    """Public read access to reviews."""
    return await _proxy_request("reviews", f"/{path}", request, user)


@router.api_route("/reviews/{path:path}", methods=["POST", "PUT"])
async def proxy_reviews_write(path: str, request: Request, user: dict = Depends(get_current_user)):
    """Authenticated write access to reviews."""
    return await _proxy_request("reviews", f"/{path}", request, user)


@router.api_route("/search/listings", methods=["GET"])
async def proxy_search_listings(
    request: Request,
    user: dict = Depends(get_optional_user),
):
    """Search listings -- proxy to search service with local DB fallback."""
    # Try the dedicated search microservice first
    try:
        return await _proxy_request("search", "/listings", request, user)
    except Exception:
        logger.info("Search microservice unavailable, using local DB fallback")

    # Fallback: direct SQL ILIKE search against listings table
    q = request.query_params.get("q", "").strip()

    def _serialize(val):
        if isinstance(val, UUID):
            return str(val)
        if isinstance(val, Decimal):
            return float(val)
        if isinstance(val, datetime):
            return val.isoformat()
        return val

    try:
        async with engine.connect() as conn:
            if not q:
                result = await conn.execute(
                    text(
                        "SELECT id, poster_id, title, description, category, subcategory, "
                        "budget_min, budget_max, currency, parish, status, created_at, updated_at "
                        "FROM listings WHERE status = 'active' ORDER BY created_at DESC LIMIT 50"
                    )
                )
            else:
                pattern = f"%{q}%"
                result = await conn.execute(
                    text(
                        "SELECT id, poster_id, title, description, category, subcategory, "
                        "budget_min, budget_max, currency, parish, status, created_at, updated_at "
                        "FROM listings "
                        "WHERE status = 'active' AND ("
                        "  title ILIKE :pattern OR description ILIKE :pattern "
                        "  OR category ILIKE :pattern OR parish ILIKE :pattern"
                        ") ORDER BY created_at DESC LIMIT 50"
                    ),
                    {"pattern": pattern},
                )
            rows = result.mappings().all()
    except Exception:
        logger.exception("Search fallback SQL query failed")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Search is temporarily unavailable",
        ) from None

    items = [{k: _serialize(v) for k, v in row.items()} for row in rows]
    return Response(content=json.dumps(items), media_type="application/json")


@router.api_route("/search/{path:path}", methods=["GET"])
async def proxy_search(path: str, request: Request, user: dict = Depends(get_optional_user)):
    """Public search access (browse without login)."""
    try:
        return await _proxy_request("search", f"/{path}", request, user)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Search service is temporarily unavailable",
        ) from None


@router.api_route("/admin/{path:path}", methods=["GET", "POST", "PUT", "DELETE"])
async def proxy_admin(path: str, request: Request, user: dict = Depends(get_current_user)):
    if user.get("role") != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required") from None
    return await _proxy_request("admin", f"/{path}", request, user)
