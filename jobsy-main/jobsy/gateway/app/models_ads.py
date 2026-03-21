"""SQLAlchemy ORM models for the advertising & platform config system.

Mirrors the advertising microservice models for gateway-embedded routes,
plus adds PlatformConfig for admin fee management.
"""

from sqlalchemy import Boolean, Column, Date, DateTime, Index, Integer, Numeric, String, Text
from sqlalchemy.dialects.postgresql import JSONB

from shared.database import Base


class AdCampaign(Base):
    """An ad campaign created by an advertiser."""

    __tablename__ = "ad_campaigns"

    id = Column(String, primary_key=True)
    advertiser_id = Column(String, nullable=False)  # user_id of advertiser
    advertiser_name = Column(String(200), nullable=False)
    advertiser_email = Column(String(255), nullable=True)
    name = Column(String(200), nullable=False)
    title = Column(String(200), nullable=False)
    description = Column(String, nullable=True)
    ad_type = Column(String(30), default="banner")  # banner/sponsored_listing/featured_profile/native
    creative_url = Column(String(500), nullable=True)
    creative_type = Column(String(20), default="image")  # image/video
    image_url = Column(String(500), nullable=True)
    click_url = Column(String(500), nullable=True)
    target_parishes = Column(JSONB, default=list)
    target_categories = Column(JSONB, default=list)
    budget = Column(Numeric(12, 2), nullable=True)
    budget_total = Column(Numeric(10, 2), nullable=True)
    budget_daily = Column(Numeric(10, 2), nullable=True)
    daily_budget = Column(Numeric(12, 2), nullable=True)
    total_budget = Column(Numeric(12, 2), nullable=True)
    bid_amount = Column(Numeric(12, 2), default=0.50)
    pricing_model = Column(String(10), default="cpm")  # cpm/cpc
    cost_per_click = Column(Numeric(8, 4), nullable=True)
    cost_per_impression = Column(Numeric(8, 4), nullable=True)
    status = Column(String(30), default="pending_review")
    admin_note = Column(Text, nullable=True)
    starts_at = Column(DateTime(timezone=True), nullable=True)
    ends_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False)
    updated_at = Column(DateTime(timezone=True), nullable=False)

    __table_args__ = (
        Index("idx_adcampaign_advertiser", "advertiser_id"),
        Index("idx_campaign_status", "status"),
        {"extend_existing": True},
    )


class AdImpression(Base):
    """Tracks ad impressions for reporting and billing."""

    __tablename__ = "ad_impressions"

    id = Column(String, primary_key=True)
    campaign_id = Column(String, nullable=False, index=True)
    placement = Column(String(100), nullable=True)
    user_id = Column(String, nullable=True)
    parish = Column(String(50), nullable=True)
    recorded_at = Column(DateTime(timezone=True), nullable=False)

    # Alias for compatibility with the advertising microservice model
    placement_id = Column(String, nullable=True)

    __table_args__ = ({"extend_existing": True},)


class AdClick(Base):
    """Tracks ad clicks for reporting and billing."""

    __tablename__ = "ad_clicks"

    id = Column(String, primary_key=True)
    campaign_id = Column(String, nullable=False, index=True)
    placement = Column(String(100), nullable=True)
    user_id = Column(String, nullable=True)
    parish = Column(String(50), nullable=True)
    recorded_at = Column(DateTime(timezone=True), nullable=False)

    placement_id = Column(String, nullable=True)

    __table_args__ = ({"extend_existing": True},)


class PlatformConfig(Base):
    """Platform-wide configuration (fees, rates, etc.).

    key/value store -- each row is a single setting.
    """

    __tablename__ = "platform_config"

    id = Column(String, primary_key=True)
    key = Column(String(100), unique=True, nullable=False)
    value = Column(String(500), nullable=False)
    description = Column(String(500), nullable=True)
    updated_by = Column(String, nullable=True)
    updated_at = Column(DateTime(timezone=True), nullable=False)

    __table_args__ = (
        Index("idx_platform_config_key", "key"),
        {"extend_existing": True},
    )


class AdPackage(Base):
    """Pre-defined advertising packages for long-term campaigns.

    Companies like Digicel, NCB, Courts Jamaica buy these for 3-12 month runs
    with volume discounts and monthly billing.
    """

    __tablename__ = "ad_packages"

    id = Column(String, primary_key=True)
    name = Column(String(200), nullable=False)  # e.g. "Gold 6-Month", "Enterprise Annual"
    description = Column(Text, nullable=True)
    duration_months = Column(Integer, nullable=False)  # 1, 3, 6, 12
    monthly_price = Column(Numeric(12, 2), nullable=False)  # JMD per month
    total_price = Column(Numeric(12, 2), nullable=False)  # full package price
    discount_percent = Column(Numeric(5, 2), default=0)  # volume discount
    impressions_included = Column(Integer, nullable=True)  # monthly impression allowance
    clicks_included = Column(Integer, nullable=True)  # monthly click allowance
    placements = Column(JSONB, default=list)  # which ad slots are included
    features = Column(JSONB, default=list)  # e.g. ["priority_placement", "dedicated_support", "monthly_report"]
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), nullable=False)
    updated_at = Column(DateTime(timezone=True), nullable=False)

    __table_args__ = (
        Index("idx_adpkg_active", "is_active"),
        {"extend_existing": True},
    )


class AdSubscription(Base):
    """A company's subscription to a long-term ad package.

    Tracks monthly billing cycles, auto-renewal, and usage.
    """

    __tablename__ = "ad_subscriptions"

    id = Column(String, primary_key=True)
    advertiser_id = Column(String, nullable=False)
    package_id = Column(String, nullable=False)
    campaign_id = Column(String, nullable=True)  # linked campaign
    status = Column(String(20), default="active")  # active, paused, cancelled, expired
    billing_cycle = Column(String(10), default="monthly")  # monthly, upfront
    monthly_amount = Column(Numeric(12, 2), nullable=False)
    total_paid = Column(Numeric(12, 2), default=0)
    impressions_used_this_month = Column(Integer, default=0)
    clicks_used_this_month = Column(Integer, default=0)
    current_period_start = Column(Date, nullable=False)
    current_period_end = Column(Date, nullable=False)
    starts_at = Column(DateTime(timezone=True), nullable=False)
    ends_at = Column(DateTime(timezone=True), nullable=False)
    auto_renew = Column(Boolean, default=True)
    stripe_subscription_id = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False)
    updated_at = Column(DateTime(timezone=True), nullable=False)

    __table_args__ = (
        Index("idx_adsub_advertiser", "advertiser_id"),
        Index("idx_adsub_status", "status"),
        {"extend_existing": True},
    )


class AffiliatePartner(Base):
    """An affiliate partner whose products/services Jobsy recommends to providers.

    E.g. hardware stores, insurance companies, tool suppliers, uniform shops.
    Jobsy earns commission on sales made through affiliate links.
    """

    __tablename__ = "affiliate_partners"

    id = Column(String, primary_key=True)
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    logo_url = Column(String(500), nullable=True)
    website_url = Column(String(500), nullable=True)
    commission_percent = Column(Numeric(5, 2), nullable=False)  # 3-15%
    commission_type = Column(String(20), default="percentage")  # percentage, flat
    flat_commission = Column(Numeric(12, 2), nullable=True)  # if flat type
    target_categories = Column(JSONB, default=list)  # which provider categories see this
    target_parishes = Column(JSONB, default=list)  # geographic targeting
    tracking_url_template = Column(String(1000), nullable=True)  # URL with {ref_code} placeholder
    is_active = Column(Boolean, default=True)
    contact_email = Column(String(255), nullable=True)
    contact_name = Column(String(200), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False)
    updated_at = Column(DateTime(timezone=True), nullable=False)

    __table_args__ = (
        Index("idx_ap_active", "is_active"),
        {"extend_existing": True},
    )


class AffiliateClick(Base):
    """Tracks when a provider clicks an affiliate link."""

    __tablename__ = "affiliate_clicks"

    id = Column(String, primary_key=True)
    partner_id = Column(String, nullable=False)
    user_id = Column(String, nullable=False)  # the provider who clicked
    product_name = Column(String(300), nullable=True)
    tracking_url = Column(String(1000), nullable=False)
    clicked_at = Column(DateTime(timezone=True), nullable=False)

    __table_args__ = (
        Index("idx_afc_partner", "partner_id"),
        Index("idx_afc_user", "user_id"),
        {"extend_existing": True},
    )


class AffiliateConversion(Base):
    """Tracks confirmed purchases made through affiliate links.

    The partner reports back (via webhook or manual entry) when a purchase
    is completed, and Jobsy earns the commission.
    """

    __tablename__ = "affiliate_conversions"

    id = Column(String, primary_key=True)
    partner_id = Column(String, nullable=False)
    click_id = Column(String, nullable=True)
    user_id = Column(String, nullable=False)
    order_value = Column(Numeric(12, 2), nullable=False)  # what the provider spent
    commission_earned = Column(Numeric(12, 2), nullable=False)  # Jobsy's cut
    currency = Column(String(3), default="JMD")
    status = Column(String(20), default="pending")  # pending, confirmed, paid_out
    confirmed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False)

    __table_args__ = (
        Index("idx_afconv_partner", "partner_id"),
        Index("idx_afconv_status", "status"),
        {"extend_existing": True},
    )


__all__ = [
    "AdCampaign", "AdImpression", "AdClick", "PlatformConfig",
    "AdPackage", "AdSubscription",
    "AffiliatePartner", "AffiliateClick", "AffiliateConversion",
]
