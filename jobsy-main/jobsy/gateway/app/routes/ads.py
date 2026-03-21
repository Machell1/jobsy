"""Advertising routes embedded in the gateway.

Handles ad campaign CRUD, serving, impression/click tracking, and admin approval.
"""

import logging
import os
import uuid
from datetime import UTC, datetime
from decimal import Decimal

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from shared.database import get_db

from ..deps import get_current_user, get_optional_user
from ..models_ads import AdCampaign, AdClick, AdImpression, PlatformConfig

logger = logging.getLogger(__name__)

router = APIRouter(tags=["ads"])

ADVERTISING_SERVICE_URL = os.getenv("ADVERTISING_SERVICE_URL", "http://advertising.railway.internal:8010")


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class CampaignCreate(BaseModel):
    name: str = Field(..., max_length=200)
    ad_type: str = Field(default="banner", pattern=r"^(banner|sponsored_listing|featured_profile|native)$")
    creative_url: str | None = None
    creative_type: str = Field(default="image", pattern=r"^(image|video)$")
    click_url: str | None = None
    target_parishes: list[str] = []
    target_categories: list[str] = []
    budget: float = Field(..., gt=0)
    pricing_model: str = Field(default="cpm", pattern=r"^(cpm|cpc)$")
    start_date: str | None = None
    end_date: str | None = None


class CampaignUpdate(BaseModel):
    name: str | None = None
    creative_url: str | None = None
    creative_type: str | None = None
    click_url: str | None = None
    target_parishes: list[str] | None = None
    target_categories: list[str] | None = None
    budget: float | None = None
    pricing_model: str | None = None
    start_date: str | None = None
    end_date: str | None = None


class AdminApproval(BaseModel):
    action: str = Field(..., pattern=r"^(approve|reject)$")
    note: str | None = None


class FeeConfigUpdate(BaseModel):
    platform_fee_percent: float | None = None
    event_posting_fee: float | None = None
    boost_fee: float | None = None
    ad_cpm_rate: float | None = None
    ad_cpc_rate: float | None = None


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _campaign_response(c: AdCampaign) -> dict:
    return {
        "id": c.id,
        "advertiser_id": c.advertiser_id,
        "name": c.name,
        "ad_type": c.ad_type,
        "creative_url": c.creative_url,
        "creative_type": c.creative_type,
        "click_url": c.click_url,
        "target_parishes": c.target_parishes or [],
        "target_categories": c.target_categories or [],
        "budget": float(c.budget) if c.budget else None,
        "pricing_model": c.pricing_model,
        "status": c.status,
        "admin_note": c.admin_note,
        "start_date": c.starts_at.isoformat() if c.starts_at else None,
        "end_date": c.ends_at.isoformat() if c.ends_at else None,
        "created_at": c.created_at.isoformat(),
        "updated_at": c.updated_at.isoformat(),
    }


# ---------------------------------------------------------------------------
# Advertiser Campaign Routes
# ---------------------------------------------------------------------------

@router.post("/campaigns", status_code=201)
async def create_campaign(
    data: CampaignCreate,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new ad campaign (advertiser role required)."""
    roles = user.get("roles", [])
    active_role = user.get("active_role", "user")
    if "advertiser" not in roles and active_role != "advertiser" and active_role != "admin":
        raise HTTPException(status_code=403, detail="Advertiser role required")

    now = datetime.now(UTC)
    starts_at = datetime.fromisoformat(data.start_date) if data.start_date else None
    ends_at = datetime.fromisoformat(data.end_date) if data.end_date else None

    campaign = AdCampaign(
        id=str(uuid.uuid4()),
        advertiser_id=user["user_id"],
        advertiser_name=user.get("name", ""),
        name=data.name,
        title=data.name,
        ad_type=data.ad_type,
        creative_url=data.creative_url,
        creative_type=data.creative_type,
        image_url=data.creative_url if data.creative_type == "image" else None,
        click_url=data.click_url,
        target_parishes=data.target_parishes,
        target_categories=data.target_categories,
        budget=Decimal(str(data.budget)),
        budget_total=Decimal(str(data.budget)),
        pricing_model=data.pricing_model,
        cost_per_click=Decimal(str(data.budget / 1000)) if data.pricing_model == "cpc" else None,
        cost_per_impression=Decimal(str(data.budget / 1000)) if data.pricing_model == "cpm" else None,
        status="pending_review",
        starts_at=starts_at,
        ends_at=ends_at,
        created_at=now,
        updated_at=now,
    )
    db.add(campaign)
    await db.flush()
    return _campaign_response(campaign)


@router.get("/campaigns")
async def list_campaigns(
    user: dict = Depends(get_current_user),
    limit: int = Query(default=20, le=100),
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
):
    """List my ad campaigns."""
    q = (
        select(AdCampaign)
        .where(AdCampaign.advertiser_id == user["user_id"])
        .order_by(AdCampaign.created_at.desc())
        .offset(offset)
        .limit(limit)
    )
    result = await db.execute(q)
    campaigns = result.scalars().all()
    return [_campaign_response(c) for c in campaigns]


@router.get("/campaigns/{campaign_id}")
async def get_campaign(
    campaign_id: str,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get campaign detail with analytics."""
    result = await db.execute(select(AdCampaign).where(AdCampaign.id == campaign_id))
    campaign = result.scalar_one_or_none()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    active_role = user.get("active_role", "user")
    if campaign.advertiser_id != user["user_id"] and active_role != "admin":
        raise HTTPException(status_code=403, detail="Not your campaign")

    # Fetch analytics
    imp_count = await db.execute(
        select(func.count()).select_from(AdImpression).where(AdImpression.campaign_id == campaign_id)
    )
    click_count = await db.execute(
        select(func.count()).select_from(AdClick).where(AdClick.campaign_id == campaign_id)
    )
    impressions = imp_count.scalar() or 0
    clicks = click_count.scalar() or 0
    ctr = (clicks / impressions * 100) if impressions > 0 else 0.0

    # Calculate spend
    budget = float(campaign.budget) if campaign.budget else 0
    if campaign.pricing_model == "cpm":
        spend = (impressions / 1000) * (float(campaign.cost_per_impression or 0) * 1000)
    else:
        spend = clicks * float(campaign.cost_per_click or 0)

    resp = _campaign_response(campaign)
    resp["analytics"] = {
        "impressions": impressions,
        "clicks": clicks,
        "ctr": round(ctr, 2),
        "spend": round(spend, 2),
        "budget_remaining": round(budget - spend, 2) if budget else None,
    }
    return resp


@router.put("/campaigns/{campaign_id}")
async def update_campaign(
    campaign_id: str,
    data: CampaignUpdate,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update an ad campaign."""
    result = await db.execute(select(AdCampaign).where(AdCampaign.id == campaign_id))
    campaign = result.scalar_one_or_none()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    if campaign.advertiser_id != user["user_id"]:
        raise HTTPException(status_code=403, detail="Not your campaign")
    if campaign.status == "active":
        raise HTTPException(status_code=400, detail="Cannot edit an active campaign. Pause it first.")

    now = datetime.now(UTC)
    if data.name is not None:
        campaign.name = data.name
        campaign.title = data.name
    if data.creative_url is not None:
        campaign.creative_url = data.creative_url
    if data.creative_type is not None:
        campaign.creative_type = data.creative_type
    if data.click_url is not None:
        campaign.click_url = data.click_url
    if data.target_parishes is not None:
        campaign.target_parishes = data.target_parishes
    if data.target_categories is not None:
        campaign.target_categories = data.target_categories
    if data.budget is not None:
        campaign.budget = Decimal(str(data.budget))
        campaign.budget_total = Decimal(str(data.budget))
    if data.pricing_model is not None:
        campaign.pricing_model = data.pricing_model
    if data.start_date is not None:
        campaign.starts_at = datetime.fromisoformat(data.start_date)
    if data.end_date is not None:
        campaign.ends_at = datetime.fromisoformat(data.end_date)

    campaign.updated_at = now
    # Re-submit for review if edited
    if campaign.status in ("rejected", "paused"):
        campaign.status = "pending_review"

    await db.flush()
    return _campaign_response(campaign)


@router.delete("/campaigns/{campaign_id}")
async def delete_campaign(
    campaign_id: str,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a campaign (only if not active)."""
    result = await db.execute(select(AdCampaign).where(AdCampaign.id == campaign_id))
    campaign = result.scalar_one_or_none()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    if campaign.advertiser_id != user["user_id"]:
        raise HTTPException(status_code=403, detail="Not your campaign")
    if campaign.status == "active":
        raise HTTPException(status_code=400, detail="Cannot delete an active campaign. Pause it first.")

    await db.delete(campaign)
    await db.flush()
    return {"detail": "Campaign deleted"}


# ---------------------------------------------------------------------------
# Ad Serving & Tracking
# ---------------------------------------------------------------------------

@router.get("/serve/{placement}")
async def serve_ad(
    placement: str,
    request: Request,
    parish: str | None = None,
    category: str | None = None,
    user: dict = Depends(get_optional_user),
):
    """Serve an ad for a given placement.

    Proxies to the advertising microservice if available, otherwise
    falls back to a local DB query.
    """
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            params = {"parish": parish, "category": category}
            params = {k: v for k, v in params.items() if v}
            headers = {}
            uid = user.get("user_id")
            if uid and uid != "anonymous":
                headers["X-User-ID"] = uid
            resp = await client.get(
                f"{ADVERTISING_SERVICE_URL}/serve/{placement}",
                params=params,
                headers=headers,
            )
            if resp.status_code == 200:
                return resp.json()
    except Exception:
        logger.debug("Advertising service unreachable, falling back to local query")

    # Local fallback: find an active campaign that matches
    db: AsyncSession = request.state.db if hasattr(request.state, "db") else None
    if db is None:
        # Get a new session
        from shared.database import async_session

        async with async_session() as db:
            return await _serve_local(db, placement, parish, category, user)
    return await _serve_local(db, placement, parish, category, user)


async def _serve_local(
    db: AsyncSession,
    placement: str,
    parish: str | None,
    category: str | None,
    user: dict,
) -> dict:
    """Serve an ad from local DB."""
    q = select(AdCampaign).where(AdCampaign.status == "active").limit(1)
    result = await db.execute(q)
    campaign = result.scalar_one_or_none()
    if not campaign:
        return {"ad": None, "placement": placement}

    # Record impression
    now = datetime.now(UTC)
    uid = user.get("user_id") if user.get("user_id") != "anonymous" else None
    impression = AdImpression(
        id=str(uuid.uuid4()),
        campaign_id=campaign.id,
        placement=placement,
        user_id=uid,
        parish=parish,
        recorded_at=now,
    )
    db.add(impression)
    await db.flush()

    return {
        "ad": {
            "id": campaign.id,
            "name": campaign.name,
            "creative_url": campaign.creative_url or campaign.image_url,
            "creative_type": campaign.creative_type,
            "click_url": campaign.click_url,
            "ad_type": campaign.ad_type,
        },
        "placement": placement,
        "impression_id": impression.id,
    }


@router.post("/click/{campaign_id}")
async def record_click(
    campaign_id: str,
    user: dict = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
):
    """Record an ad click."""
    result = await db.execute(select(AdCampaign).where(AdCampaign.id == campaign_id))
    campaign = result.scalar_one_or_none()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    now = datetime.now(UTC)
    uid = user.get("user_id") if user.get("user_id") != "anonymous" else None
    click = AdClick(
        id=str(uuid.uuid4()),
        campaign_id=campaign_id,
        user_id=uid,
        recorded_at=now,
    )
    db.add(click)
    await db.flush()

    return {
        "click_id": click.id,
        "redirect_url": campaign.click_url,
    }


# ---------------------------------------------------------------------------
# Admin Routes
# ---------------------------------------------------------------------------

@router.post("/admin/approve/{campaign_id}")
async def admin_approve_campaign(
    campaign_id: str,
    data: AdminApproval,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Admin approve or reject a campaign."""
    active_role = user.get("active_role", "user")
    roles = user.get("roles", [])
    if active_role != "admin" and "admin" not in roles:
        raise HTTPException(status_code=403, detail="Admin role required")

    result = await db.execute(select(AdCampaign).where(AdCampaign.id == campaign_id))
    campaign = result.scalar_one_or_none()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    now = datetime.now(UTC)
    if data.action == "approve":
        campaign.status = "active"
    else:
        campaign.status = "rejected"
    campaign.admin_note = data.note
    campaign.updated_at = now
    await db.flush()

    return _campaign_response(campaign)


@router.get("/admin/pending")
async def admin_list_pending(
    user: dict = Depends(get_current_user),
    limit: int = Query(default=20, le=100),
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
):
    """Admin list pending campaigns."""
    active_role = user.get("active_role", "user")
    roles = user.get("roles", [])
    if active_role != "admin" and "admin" not in roles:
        raise HTTPException(status_code=403, detail="Admin role required")

    q = (
        select(AdCampaign)
        .where(AdCampaign.status == "pending_review")
        .order_by(AdCampaign.created_at.asc())
        .offset(offset)
        .limit(limit)
    )
    result = await db.execute(q)
    campaigns = result.scalars().all()
    return [_campaign_response(c) for c in campaigns]


# ---------------------------------------------------------------------------
# Advertiser Dashboard
# ---------------------------------------------------------------------------

@router.get("/dashboard")
async def advertiser_dashboard(
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Advertiser dashboard summary."""
    uid = user["user_id"]

    # Campaign counts by status
    q = (
        select(AdCampaign.status, func.count())
        .where(AdCampaign.advertiser_id == uid)
        .group_by(AdCampaign.status)
    )
    result = await db.execute(q)
    status_counts = {row[0]: row[1] for row in result.all()}

    # Total impressions and clicks across all campaigns
    campaign_ids_q = select(AdCampaign.id).where(AdCampaign.advertiser_id == uid)
    imp_q = select(func.count()).select_from(AdImpression).where(
        AdImpression.campaign_id.in_(campaign_ids_q)
    )
    click_q = select(func.count()).select_from(AdClick).where(
        AdClick.campaign_id.in_(campaign_ids_q)
    )
    total_impressions = (await db.execute(imp_q)).scalar() or 0
    total_clicks = (await db.execute(click_q)).scalar() or 0
    overall_ctr = (total_clicks / total_impressions * 100) if total_impressions > 0 else 0.0

    # Total budget
    budget_q = select(func.sum(AdCampaign.budget)).where(AdCampaign.advertiser_id == uid)
    total_budget = (await db.execute(budget_q)).scalar() or 0

    return {
        "campaigns_by_status": status_counts,
        "total_campaigns": sum(status_counts.values()),
        "total_impressions": total_impressions,
        "total_clicks": total_clicks,
        "overall_ctr": round(overall_ctr, 2),
        "total_budget": float(total_budget),
    }


# ---------------------------------------------------------------------------
# Admin Fee Configuration
# ---------------------------------------------------------------------------

DEFAULT_FEES = {
    "platform_fee_percent": "10",
    "event_posting_fee": "500",
    "boost_fee": "1500",
    "ad_cpm_rate": "50",
    "ad_cpc_rate": "5",
}


@router.get("/admin/config/fees")
async def get_fee_config(
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get current fee configuration."""
    active_role = user.get("active_role", "user")
    roles = user.get("roles", [])
    if active_role != "admin" and "admin" not in roles:
        raise HTTPException(status_code=403, detail="Admin role required")

    result = await db.execute(
        select(PlatformConfig).where(
            PlatformConfig.key.in_(DEFAULT_FEES.keys())
        )
    )
    configs = {c.key: c.value for c in result.scalars().all()}

    # Fill in defaults for missing keys
    fees = {}
    for key, default_val in DEFAULT_FEES.items():
        fees[key] = float(configs.get(key, default_val))

    return {"fees": fees}


@router.put("/admin/config/fees")
async def update_fee_config(
    data: FeeConfigUpdate,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update fee configuration (admin only)."""
    active_role = user.get("active_role", "user")
    roles = user.get("roles", [])
    if active_role != "admin" and "admin" not in roles:
        raise HTTPException(status_code=403, detail="Admin role required")

    now = datetime.now(UTC)
    updates = {}
    if data.platform_fee_percent is not None:
        updates["platform_fee_percent"] = str(data.platform_fee_percent)
    if data.event_posting_fee is not None:
        updates["event_posting_fee"] = str(data.event_posting_fee)
    if data.boost_fee is not None:
        updates["boost_fee"] = str(data.boost_fee)
    if data.ad_cpm_rate is not None:
        updates["ad_cpm_rate"] = str(data.ad_cpm_rate)
    if data.ad_cpc_rate is not None:
        updates["ad_cpc_rate"] = str(data.ad_cpc_rate)

    for key, value in updates.items():
        result = await db.execute(select(PlatformConfig).where(PlatformConfig.key == key))
        config = result.scalar_one_or_none()
        if config:
            config.value = value
            config.updated_by = user["user_id"]
            config.updated_at = now
        else:
            config = PlatformConfig(
                id=str(uuid.uuid4()),
                key=key,
                value=value,
                description=f"Platform fee: {key}",
                updated_by=user["user_id"],
                updated_at=now,
            )
            db.add(config)

    await db.flush()

    # Return updated config
    result = await db.execute(
        select(PlatformConfig).where(PlatformConfig.key.in_(DEFAULT_FEES.keys()))
    )
    configs = {c.key: c.value for c in result.scalars().all()}
    fees = {}
    for key, default_val in DEFAULT_FEES.items():
        fees[key] = float(configs.get(key, default_val))

    return {"fees": fees, "detail": "Fee configuration updated"}
