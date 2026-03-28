"""Reverse proxy routes to internal microservices."""

import json
import logging
import uuid as _uuid
from datetime import UTC, date, datetime
from decimal import Decimal
from uuid import UUID

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from shared.database import get_db

from ..config import SERVICE_URLS
from ..deps import get_current_user, get_optional_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["proxy"])

# Headers that must not be forwarded between proxy hops
_HOP_BY_HOP = frozenset(
    {
        "connection",
        "keep-alive",
        "proxy-authenticate",
        "proxy-authorization",
        "te",
        "trailers",
        "transfer-encoding",
        "upgrade",
        "content-encoding",
        "content-length",
    }
)


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


# ============================================================
# Profiles — implemented directly in gateway (shared DB)
# ============================================================

_PROFILE_COLUMNS = (
    "id, user_id, display_name, bio, avatar_url, photos, parish, "
    "service_category, skills, hourly_rate, is_provider, is_hirer, is_advertiser, "
    "rating_avg, rating_count, is_verified, is_active, "
    "instagram_url, twitter_url, tiktok_url, youtube_url, linkedin_url, portfolio_url, "
    "follower_count, following_count, created_at"
)


def _serialize_profile(row) -> dict:
    """Convert a profile DB row to JSON-safe dict."""
    import json as _json
    d = dict(row._mapping)
    for k, v in d.items():
        if isinstance(v, UUID):
            d[k] = str(v)
        elif isinstance(v, Decimal):
            d[k] = float(v)
        elif isinstance(v, (datetime, date)):
            d[k] = v.isoformat()
        elif k in ("skills", "photos") and isinstance(v, str):
            try:
                d[k] = _json.loads(v)
            except (ValueError, TypeError):
                d[k] = []
    return d


class ProfileUpdate(BaseModel):
    display_name: str | None = None
    bio: str | None = None
    avatar_url: str | None = None
    service_category: str | None = None
    skills: list[str] | None = None
    hourly_rate: float | None = None
    is_provider: bool | None = None
    is_hirer: bool | None = None
    is_advertiser: bool | None = None
    latitude: float | None = None
    longitude: float | None = None
    parish: str | None = None
    instagram_url: str | None = None
    twitter_url: str | None = None
    tiktok_url: str | None = None
    youtube_url: str | None = None
    linkedin_url: str | None = None
    portfolio_url: str | None = None


@router.get("/profiles/me")
async def get_my_profile(user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Get current user's profile directly from DB."""
    result = await db.execute(
        text(f"SELECT {_PROFILE_COLUMNS} FROM profiles WHERE user_id = :uid"),
        {"uid": user["user_id"]},
    )
    row = result.first()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found")
    return _serialize_profile(row)


@router.put("/profiles/me")
async def update_my_profile(
    data: ProfileUpdate,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update or create current user's profile directly in DB."""
    user_id = user["user_id"]

    # Check if profile exists
    result = await db.execute(
        text("SELECT id FROM profiles WHERE user_id = :uid"),
        {"uid": user_id},
    )
    existing = result.first()

    now = datetime.now(UTC)
    updates = data.model_dump(exclude_unset=True)

    if existing:
        # Update existing profile
        if not updates:
            # No fields to update, just return current profile
            result = await db.execute(
                text(f"SELECT {_PROFILE_COLUMNS} FROM profiles WHERE user_id = :uid"),
                {"uid": user_id},
            )
            return _serialize_profile(result.first())

        set_clauses = []
        params: dict = {"uid": user_id, "now": now}
        for field, value in updates.items():
            if field == "skills":
                params[field] = json.dumps(value) if value is not None else None
                set_clauses.append(f"{field} = CAST(:{field} AS JSONB)")
            else:
                params[field] = value
                set_clauses.append(f"{field} = :{field}")
        set_clauses.append("updated_at = :now")

        await db.execute(
            text(f"UPDATE profiles SET {', '.join(set_clauses)} WHERE user_id = :uid"),
            params,
        )
        await db.commit()
    else:
        # Create new profile
        profile_id = str(_uuid.uuid4())
        skills_json = json.dumps(updates.get("skills") or [])
        await db.execute(
            text(
                "INSERT INTO profiles "
                "(id, user_id, display_name, bio, avatar_url, photos, parish, "
                "service_category, skills, hourly_rate, is_provider, is_hirer, is_advertiser, "
                "rating_avg, rating_count, is_verified, is_active, "
                "instagram_url, twitter_url, tiktok_url, youtube_url, linkedin_url, portfolio_url, "
                "follower_count, following_count, created_at, updated_at) "
                "VALUES (:id, :uid, :display_name, :bio, :avatar_url, '[]'::jsonb, :parish, "
                ":service_category, CAST(:skills AS JSONB), :hourly_rate, "
                ":is_provider, :is_hirer, :is_advertiser, "
                "0, 0, false, true, "
                ":instagram_url, :twitter_url, :tiktok_url, :youtube_url, :linkedin_url, :portfolio_url, "
                "0, 0, :now, :now)"
            ),
            {
                "id": profile_id,
                "uid": user_id,
                "display_name": updates.get("display_name", "User"),
                "bio": updates.get("bio"),
                "avatar_url": updates.get("avatar_url"),
                "parish": updates.get("parish"),
                "service_category": updates.get("service_category"),
                "skills": skills_json,
                "hourly_rate": updates.get("hourly_rate"),
                "is_provider": updates.get("is_provider", False),
                "is_hirer": updates.get("is_hirer", False),
                "is_advertiser": updates.get("is_advertiser", False),
                "instagram_url": updates.get("instagram_url"),
                "twitter_url": updates.get("twitter_url"),
                "tiktok_url": updates.get("tiktok_url"),
                "youtube_url": updates.get("youtube_url"),
                "linkedin_url": updates.get("linkedin_url"),
                "portfolio_url": updates.get("portfolio_url"),
                "now": now,
            },
        )
        await db.commit()

    # Return updated profile
    result = await db.execute(
        text(f"SELECT {_PROFILE_COLUMNS} FROM profiles WHERE user_id = :uid"),
        {"uid": user_id},
    )
    return _serialize_profile(result.first())


@router.get("/profiles/{user_id}")
async def get_profile_by_id(user_id: str, db: AsyncSession = Depends(get_db)):
    """Get a profile by user_id directly from DB."""
    result = await db.execute(
        text(f"SELECT {_PROFILE_COLUMNS} FROM profiles WHERE user_id = :uid OR id = :uid"),
        {"uid": user_id},
    )
    row = result.first()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found")
    return _serialize_profile(row)


@router.api_route("/profiles/{path:path}", methods=["GET", "POST", "PUT", "DELETE"])
async def proxy_profiles_fallback(path: str, request: Request, user: dict = Depends(get_optional_user)):
    """Fallback proxy for other profile operations to the profiles microservice."""
    try:
        return await _proxy_request("profiles", f"/{path}", request, user)
    except HTTPException as exc:
        if exc.status_code in (502, 504):
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Profiles service is temporarily unavailable",
            ) from None
        raise


# ============================================================
# Listings — merged into gateway (see routes/listings.py)
# ============================================================


# ============================================================
# Swipes — merged into gateway (see routes/swipes.py)
# The swipe feed endpoint below remains as it queries profiles
# directly (not the swipes ORM model).
# ============================================================


@router.get("/swipes/feed")
async def get_swipes_feed(
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get discoverable profiles for the swipe feed, excluding already-swiped profiles."""
    user_id = user["user_id"]
    result = await db.execute(
        text(
            f"SELECT {_PROFILE_COLUMNS} FROM profiles "
            "WHERE user_id != :uid "
            "AND is_active = true "
            "AND is_provider = true "
            "AND user_id NOT IN ("
            "  SELECT target_id FROM swipes WHERE swiper_id = :uid"
            ") "
            "ORDER BY created_at DESC LIMIT 50"
        ),
        {"uid": user_id},
    )
    rows = result.all()
    return [_serialize_profile(row) for row in rows]


@router.api_route("/matches/{path:path}", methods=["GET", "PUT"])
async def proxy_matches(path: str, request: Request, user: dict = Depends(get_current_user)):
    return await _proxy_request("matches", f"/{path}", request, user)


# Geo — merged into gateway (see routes/geoshard.py)


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


# Storage — merged into gateway (see routes/storage.py)


@router.api_route("/ads/{path:path}", methods=["GET", "POST", "PUT", "DELETE"])
async def proxy_ads(path: str, request: Request, user: dict = Depends(get_current_user)):
    return await _proxy_request("ads", f"/{path}", request, user)


@router.api_route("/payments/{path:path}", methods=["GET", "POST", "PUT"])
async def proxy_payments(path: str, request: Request, user: dict = Depends(get_current_user)):
    return await _proxy_request("payments", f"/{path}", request, user)


# ============================================================
# Reviews — merged into gateway (see routes/reviews_routes.py)
# ============================================================


# ============================================================
# Search — merged into gateway (see routes/search_routes.py)
# ============================================================


@router.api_route("/advertising/{path:path}", methods=["GET", "POST", "PUT", "DELETE"])
async def proxy_advertising(path: str, request: Request, user: dict = Depends(get_current_user)):
    """Proxy requests to the advertising service via /api/advertising/ path."""
    return await _proxy_request("ads", f"/{path}", request, user)


@router.api_route("/admin/{path:path}", methods=["GET", "POST", "PUT", "DELETE"])
async def proxy_admin(path: str, request: Request, user: dict = Depends(get_current_user)):
    effective_role = user.get("active_role") or user.get("role", "user")
    if effective_role != "admin" and "admin" not in user.get("roles", []):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required") from None
    return await _proxy_request("admin", f"/{path}", request, user)
