"""Advertising service API routes -- ad serving, impression/click tracking, campaigns."""

import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.responses import RedirectResponse
from pydantic import BaseModel, Field
from sqlalchemy import func, select, type_coerce
from sqlalchemy.dialects.postgresql import JSONB as JSONB_TYPE
from sqlalchemy.ext.asyncio import AsyncSession

from shared.database import get_db

from .models import AdBudget, AdCampaign, AdClick, AdConversion, AdImpression, AdPlacement, AdTargeting
from .revive import fetch_ad_from_revive, report_impression_to_revive

router = APIRouter(tags=["advertising"])


def _get_user_id(request: Request) -> str | None:
    return request.headers.get("X-User-ID")


@router.get("/serve/{placement_name}")
async def serve_ad(
    placement_name: str,
    request: Request,
    parish: str | None = None,
    category: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    """Serve an ad creative for a given placement.

    Flow:
    1. Look up placement in database
    2. Try Revive Adserver if configured
    3. Fall back to local campaign matching (geo + category targeting)
    4. Return ad creative data
    """
    user_id = _get_user_id(request)

    # Find the placement
    result = await db.execute(
        select(AdPlacement).where(
            AdPlacement.name == placement_name,
            AdPlacement.is_active.is_(True),
        )
    )
    placement = result.scalar_one_or_none()
    if not placement:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Placement not found")

    # Try Revive first
    if placement.revive_zone_id:
        revive_ad = await fetch_ad_from_revive(placement.revive_zone_id, parish)
        if revive_ad:
            return revive_ad

    # Fall back to local campaigns
    query = select(AdCampaign).where(AdCampaign.status == "active")

    # Geo-targeting: match user's parish
    if parish:
        # Campaigns targeting this parish OR targeting all (empty array)
        parish_json = type_coerce([parish], JSONB_TYPE)
        empty_json = type_coerce([], JSONB_TYPE)
        query = query.where(
            AdCampaign.target_parishes.op("@>")(parish_json) | (AdCampaign.target_parishes == empty_json)
        )

    # Category targeting
    if category:
        cat_json = type_coerce([category], JSONB_TYPE)
        empty_json = type_coerce([], JSONB_TYPE)
        query = query.where(
            AdCampaign.target_categories.op("@>")(cat_json) | (AdCampaign.target_categories == empty_json)
        )

    query = query.limit(1)
    result = await db.execute(query)
    campaign = result.scalar_one_or_none()

    if not campaign:
        return {"ad": None, "placement": placement_name}

    # Record impression
    impression = AdImpression(
        id=str(uuid.uuid4()),
        campaign_id=campaign.id,
        placement_id=placement.id,
        user_id=user_id,
        parish=parish,
        recorded_at=datetime.now(UTC),
    )
    db.add(impression)
    await db.flush()

    if placement.revive_zone_id:
        await report_impression_to_revive(placement.revive_zone_id)

    return {
        "ad": {
            "campaign_id": campaign.id,
            "title": campaign.title,
            "description": campaign.description,
            "image_url": campaign.image_url,
            "click_url": f"/ads/click/{campaign.id}?placement={placement.id}",
        },
        "placement": placement_name,
    }


@router.get("/click/{campaign_id}")
async def record_click(
    campaign_id: str,
    request: Request,
    placement: str | None = None,
    parish: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    """Record an ad click and redirect to the advertiser's URL."""
    user_id = _get_user_id(request)

    result = await db.execute(select(AdCampaign).where(AdCampaign.id == campaign_id))
    campaign = result.scalar_one_or_none()
    if not campaign:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")

    # Record click
    click = AdClick(
        id=str(uuid.uuid4()),
        campaign_id=campaign_id,
        placement_id=placement,
        user_id=user_id,
        parish=parish,
        recorded_at=datetime.now(UTC),
    )
    db.add(click)
    await db.flush()

    return RedirectResponse(url=campaign.click_url, status_code=302)


@router.post("/impression")
async def record_impression(
    request: Request,
    campaign_id: str = Query(...),
    placement_id: str | None = None,
    parish: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    """Record an ad impression (called by frontend clients)."""
    user_id = _get_user_id(request)

    impression = AdImpression(
        id=str(uuid.uuid4()),
        campaign_id=campaign_id,
        placement_id=placement_id,
        user_id=user_id,
        parish=parish,
        recorded_at=datetime.now(UTC),
    )
    db.add(impression)
    await db.flush()

    return {"status": "recorded"}


# --- Campaign management (for admin/advertiser use) ---


class CampaignCreate(BaseModel):
    advertiser_name: str = Field(..., max_length=200)
    advertiser_email: str | None = None
    title: str = Field(..., max_length=200)
    description: str | None = None
    image_url: str | None = None
    click_url: str
    target_parishes: list[str] = Field(default_factory=list)
    target_categories: list[str] = Field(default_factory=list)
    target_age_range: dict | None = None
    target_user_types: list[str] = Field(default_factory=list)
    budget_total: float | None = None
    budget_daily: float | None = None
    daily_budget: float | None = None
    total_budget: float | None = None
    bid_amount: float | None = None
    cost_per_click: float | None = None
    cost_per_impression: float | None = None


def _require_auth(request: Request) -> str:
    """Require an authenticated user for campaign management."""
    user_id = request.headers.get("X-User-ID")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")
    return user_id


@router.post("/campaigns", status_code=status.HTTP_201_CREATED)
async def create_campaign(
    data: CampaignCreate,
    request: Request,
    user_id: str = Depends(_require_auth),
    db: AsyncSession = Depends(get_db),
):
    """Create a new advertising campaign."""
    now = datetime.now(UTC)
    campaign_id = str(uuid.uuid4())
    campaign = AdCampaign(
        id=campaign_id,
        advertiser_name=data.advertiser_name,
        advertiser_email=data.advertiser_email,
        title=data.title,
        description=data.description,
        image_url=data.image_url,
        click_url=data.click_url,
        target_parishes=data.target_parishes,
        target_categories=data.target_categories,
        budget_total=data.budget_total or data.total_budget,
        budget_daily=data.budget_daily or data.daily_budget,
        cost_per_click=data.cost_per_click,
        cost_per_impression=data.cost_per_impression,
        created_at=now,
        updated_at=now,
    )
    db.add(campaign)

    # Create targeting record
    targeting = AdTargeting(
        id=str(uuid.uuid4()),
        campaign_id=campaign_id,
        target_parishes=data.target_parishes,
        target_categories=data.target_categories,
        target_age_range=data.target_age_range or {},
        target_user_types=data.target_user_types,
        created_at=now,
    )
    db.add(targeting)

    # Create budget record
    budget = AdBudget(
        id=str(uuid.uuid4()),
        campaign_id=campaign_id,
        daily_budget=data.daily_budget or data.budget_daily,
        total_budget=data.total_budget or data.budget_total,
        bid_amount=data.bid_amount or 0.50,
        created_at=now,
        updated_at=now,
    )
    db.add(budget)

    await db.flush()

    return {"id": campaign.id, "title": campaign.title, "status": campaign.status}


@router.get("/campaigns")
async def list_campaigns(
    status_filter: str = Query(default="active", alias="status"),
    limit: int = Query(default=20, le=100),
    db: AsyncSession = Depends(get_db),
):
    """List advertising campaigns."""
    query = select(AdCampaign).where(AdCampaign.status == status_filter).limit(limit)
    result = await db.execute(query)
    campaigns = result.scalars().all()

    return [
        {
            "id": c.id,
            "advertiser_name": c.advertiser_name,
            "title": c.title,
            "status": c.status,
            "target_parishes": c.target_parishes,
            "created_at": c.created_at.isoformat(),
        }
        for c in campaigns
    ]


class CampaignUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    image_url: str | None = None
    click_url: str | None = None
    target_parishes: list[str] | None = None
    target_categories: list[str] | None = None
    budget_total: float | None = None
    budget_daily: float | None = None
    status: str | None = Field(default=None, pattern=r"^(active|paused|completed)$")


@router.put("/campaigns/{campaign_id}")
async def update_campaign(
    campaign_id: str,
    data: CampaignUpdate,
    request: Request,
    user_id: str = Depends(_require_auth),
    db: AsyncSession = Depends(get_db),
):
    """Update an advertising campaign."""
    result = await db.execute(select(AdCampaign).where(AdCampaign.id == campaign_id))
    campaign = result.scalar_one_or_none()
    if not campaign:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(campaign, field, value)
    campaign.updated_at = datetime.now(UTC)
    await db.flush()

    return {"id": campaign.id, "title": campaign.title, "status": campaign.status}


@router.delete("/campaigns/{campaign_id}")
async def delete_campaign(
    campaign_id: str,
    request: Request,
    user_id: str = Depends(_require_auth),
    db: AsyncSession = Depends(get_db),
):
    """Delete (deactivate) an advertising campaign."""
    result = await db.execute(select(AdCampaign).where(AdCampaign.id == campaign_id))
    campaign = result.scalar_one_or_none()
    if not campaign:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")

    campaign.status = "completed"
    campaign.updated_at = datetime.now(UTC)
    await db.flush()

    return {"status": "deleted", "id": campaign_id}


@router.get("/campaigns/{campaign_id}/report")
async def campaign_report(campaign_id: str, db: AsyncSession = Depends(get_db)):
    """Get performance report for a campaign (impressions, clicks, CTR)."""
    result = await db.execute(select(AdCampaign).where(AdCampaign.id == campaign_id))
    campaign = result.scalar_one_or_none()
    if not campaign:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")

    impressions_result = await db.execute(select(func.count()).where(AdImpression.campaign_id == campaign_id))
    impressions = impressions_result.scalar() or 0

    clicks_result = await db.execute(select(func.count()).where(AdClick.campaign_id == campaign_id))
    clicks = clicks_result.scalar() or 0

    ctr = (clicks / impressions * 100) if impressions > 0 else 0.0

    return {
        "campaign_id": campaign_id,
        "title": campaign.title,
        "advertiser": campaign.advertiser_name,
        "impressions": impressions,
        "clicks": clicks,
        "ctr_percent": round(ctr, 2),
        "status": campaign.status,
    }


# --- Phase 3: Self-serve dashboard, analytics, conversions ---


@router.get("/dashboard")
async def advertiser_dashboard(
    request: Request,
    user_id: str = Depends(_require_auth),
    db: AsyncSession = Depends(get_db),
):
    """Self-serve advertiser dashboard -- summary of all campaigns."""
    result = await db.execute(select(AdCampaign).where(AdCampaign.advertiser_email.is_not(None)))
    campaigns = result.scalars().all()

    total_impressions = 0
    total_clicks = 0
    total_spend = 0.0

    for c in campaigns:
        imp_result = await db.execute(select(func.count()).where(AdImpression.campaign_id == c.id))
        clk_result = await db.execute(select(func.count()).where(AdClick.campaign_id == c.id))
        imps = imp_result.scalar() or 0
        clks = clk_result.scalar() or 0
        total_impressions += imps
        total_clicks += clks

        budget_result = await db.execute(select(AdBudget).where(AdBudget.campaign_id == c.id))
        budget = budget_result.scalar_one_or_none()
        if budget and budget.total_spent:
            total_spend += float(budget.total_spent)

    ctr = (total_clicks / total_impressions * 100) if total_impressions > 0 else 0.0

    return {
        "total_campaigns": len(campaigns),
        "total_impressions": total_impressions,
        "total_clicks": total_clicks,
        "ctr_percent": round(ctr, 2),
        "total_spend": round(total_spend, 2),
    }


@router.get("/campaigns/{campaign_id}/analytics")
async def campaign_analytics(
    campaign_id: str,
    request: Request,
    user_id: str = Depends(_require_auth),
    db: AsyncSession = Depends(get_db),
):
    """Detailed campaign analytics -- daily breakdown."""
    result = await db.execute(select(AdCampaign).where(AdCampaign.id == campaign_id))
    campaign = result.scalar_one_or_none()
    if not campaign:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")

    impressions_result = await db.execute(select(func.count()).where(AdImpression.campaign_id == campaign_id))
    clicks_result = await db.execute(select(func.count()).where(AdClick.campaign_id == campaign_id))
    conversions_result = await db.execute(select(func.count()).where(AdConversion.campaign_id == campaign_id))

    impressions = impressions_result.scalar() or 0
    clicks = clicks_result.scalar() or 0
    conversions = conversions_result.scalar() or 0
    ctr = (clicks / impressions * 100) if impressions > 0 else 0.0

    budget_result = await db.execute(select(AdBudget).where(AdBudget.campaign_id == campaign_id))
    budget = budget_result.scalar_one_or_none()

    return {
        "campaign_id": campaign_id,
        "title": campaign.title,
        "impressions": impressions,
        "clicks": clicks,
        "conversions": conversions,
        "ctr_percent": round(ctr, 2),
        "total_spent": float(budget.total_spent) if budget and budget.total_spent else 0.0,
        "daily_spent": float(budget.daily_spent) if budget and budget.daily_spent else 0.0,
    }


class ConversionCreate(BaseModel):
    campaign_id: str
    click_id: str | None = None
    conversion_type: str = Field(..., pattern=r"^(booking|contact|profile_view|listing_view)$")
    conversion_value: float | None = None
    event_metadata: dict = Field(default_factory=dict)


@router.post("/conversions", status_code=status.HTTP_201_CREATED)
async def track_conversion(
    data: ConversionCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Track a conversion event."""
    user_id = _get_user_id(request)
    now = datetime.now(UTC)

    conversion = AdConversion(
        id=str(uuid.uuid4()),
        campaign_id=data.campaign_id,
        click_id=data.click_id,
        user_id=user_id,
        conversion_type=data.conversion_type,
        conversion_value=data.conversion_value,
        event_metadata=data.event_metadata,
        created_at=now,
    )
    db.add(conversion)
    await db.flush()

    return {"id": conversion.id, "conversion_type": conversion.conversion_type}


@router.get("/campaigns/{campaign_id}/conversions")
async def list_conversions(
    campaign_id: str,
    request: Request,
    limit: int = Query(default=50, le=200),
    offset: int = 0,
    user_id: str = Depends(_require_auth),
    db: AsyncSession = Depends(get_db),
):
    """List conversions for a campaign."""
    result = await db.execute(select(AdCampaign).where(AdCampaign.id == campaign_id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")

    query = (
        select(AdConversion)
        .where(AdConversion.campaign_id == campaign_id)
        .order_by(AdConversion.created_at.desc())
        .offset(offset)
        .limit(limit)
    )
    result = await db.execute(query)
    conversions = result.scalars().all()

    return [
        {
            "id": c.id,
            "click_id": c.click_id,
            "user_id": c.user_id,
            "conversion_type": c.conversion_type,
            "conversion_value": float(c.conversion_value) if c.conversion_value else None,
            "created_at": c.created_at.isoformat(),
        }
        for c in conversions
    ]
