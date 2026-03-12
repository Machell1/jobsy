"""Seed script to populate the database with sample Jamaican service providers.

Usage:
    python -m scripts.seed_data

Requires DATABASE_URL to be set. Uses asyncpg for Postgres.
"""

import asyncio
import uuid
from datetime import UTC, datetime

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

# Import all models so metadata is populated
import gateway.app.models as _gw  # noqa: F401
import listings.app.models as _ls  # noqa: F401
import profiles.app.models as _pr  # noqa: F401
import reviews.app.models as _rv  # noqa: F401
from advertising.app.models import AdCampaign, AdPlacement
from gateway.app.models import User
from geoshard.app.models import GeoshardEntry
from listings.app.models import Listing
from profiles.app.models import Profile
from shared.auth import hash_password
from shared.config import DATABASE_URL

PARISHES = [
    "Kingston", "St. Andrew", "St. Thomas", "Portland", "St. Mary",
    "St. Ann", "Trelawny", "St. James", "Hanover", "Westmoreland",
    "St. Elizabeth", "Manchester", "Clarendon", "St. Catherine",
]

# Approximate coordinates for Jamaican parishes (lat, lng)
PARISH_COORDS = {
    "Kingston":       (17.9714,  -76.7920),
    "St. Andrew":     (18.0179,  -76.7674),
    "St. Thomas":     (17.9500,  -76.3500),
    "Portland":       (18.1750,  -76.4100),
    "St. Mary":       (18.2700,  -76.8500),
    "St. Ann":        (18.4100,  -77.2000),
    "Trelawny":       (18.3500,  -77.6100),
    "St. James":      (18.4762,  -77.8939),
    "Hanover":        (18.4100,  -78.1300),
    "Westmoreland":   (18.2700,  -78.1500),
    "St. Elizabeth":  (18.0000,  -77.8300),
    "Manchester":     (18.0300,  -77.5000),
    "Clarendon":      (17.9600,  -77.2400),
    "St. Catherine":  (18.0300,  -76.9500),
}

CATEGORIES = [
    "Home Services", "Beauty & Wellness", "Tutoring & Education",
    "Technology", "Automotive", "Events & Entertainment",
    "Health & Fitness", "Professional Services", "Skilled Trades",
    "Creative Services",
]

# Realistic sample providers for Jamaica
PROVIDERS = [
    {
        "name": "Marcus Brown",
        "phone": "+18761234501",
        "email": "marcus@example.com",
        "parish": "Kingston",
        "category": "Skilled Trades",
        "bio": (
            "Licensed electrician with 12 years experience across Kingston and St. Andrew."
            " Specialize in residential wiring, panel upgrades, and solar installations."
        ),
        "skills": ["Electrical Wiring", "Solar Installation", "Panel Upgrades"],
        "hourly_rate": 3500,
        "listings": [
            {
                "title": "Residential Electrical Wiring",
                "description": "Full house wiring, rewiring, and electrical inspections. Licensed and insured.",
                "budget": 25000,
            },
            {
                "title": "Solar Panel Installation",
                "description": "Complete solar setup for homes and small businesses. Reduce your JPS bill!",
                "budget": 150000,
            },
        ],
    },
    {
        "name": "Keisha Williams",
        "phone": "+18761234502",
        "email": "keisha@example.com",
        "parish": "St. Andrew",
        "category": "Beauty & Wellness",
        "bio": "Professional hairstylist and makeup artist. Mobile service available across the Corporate Area.",
        "skills": ["Braiding", "Natural Hair", "Makeup Artistry", "Loc Maintenance"],
        "hourly_rate": 2500,
        "listings": [
            {
                "title": "Natural Hair Styling",
                "description": "Twist-outs, bantu knots, protective styles. Using quality Jamaican products.",
                "budget": 4000,
            },
            {
                "title": "Bridal Makeup Package",
                "description": "Full bridal party makeup including trial. Based in Half Way Tree.",
                "budget": 15000,
            },
        ],
    },
    {
        "name": "Devon Clarke",
        "phone": "+18761234503",
        "email": "devon@example.com",
        "parish": "St. James",
        "category": "Technology",
        "bio": (
            "IT consultant and web developer based in Montego Bay."
            " Building websites and managing networks for small businesses."
        ),
        "skills": ["Web Development", "Network Setup", "Computer Repair"],
        "hourly_rate": 4000,
        "listings": [
            {
                "title": "Small Business Website",
                "description": "Professional website with mobile-friendly design. E-commerce add-on available.",
                "budget": 45000,
            },
            {
                "title": "Office Network Setup",
                "description": "Wi-Fi, cabling, and security setup for offices in MoBay area.",
                "budget": 30000,
            },
        ],
    },
    {
        "name": "Shannakay Reid",
        "phone": "+18761234504",
        "email": "shannakay@example.com",
        "parish": "Manchester",
        "category": "Tutoring & Education",
        "bio": "CXC and CAPE tutor in Mathematics and Physics. 8 years teaching experience. Mandeville area.",
        "skills": ["Mathematics", "Physics", "CXC Prep", "CAPE Prep"],
        "hourly_rate": 2000,
        "listings": [
            {
                "title": "CXC Math Tutoring",
                "description": "One-on-one or group sessions. Proven track record of Grade 1 results.",
                "budget": 3000,
            },
            {
                "title": "CAPE Physics Preparation",
                "description": "Unit 1 and 2 preparation with past paper practice.",
                "budget": 3500,
            },
        ],
    },
    {
        "name": "Andre Thompson",
        "phone": "+18761234505",
        "email": "andre@example.com",
        "parish": "St. Catherine",
        "category": "Automotive",
        "bio": "Certified mechanic specializing in Japanese vehicles. Workshop in Spanish Town.",
        "skills": ["Engine Repair", "AC Service", "Diagnostics", "Bodywork"],
        "hourly_rate": 3000,
        "listings": [
            {
                "title": "Full Vehicle Service",
                "description": "Oil change, filter replacement, brake check, and 20-point inspection.",
                "budget": 8000,
            },
            {
                "title": "AC Recharge & Repair",
                "description": "Diagnose and fix car AC systems. Most Japanese makes covered.",
                "budget": 12000,
            },
        ],
    },
    {
        "name": "Tamara Johnson",
        "phone": "+18761234506",
        "email": "tamara@example.com",
        "parish": "Portland",
        "category": "Events & Entertainment",
        "bio": "Event planner and decorator serving Portland and St. Thomas. Weddings, parties, corporate events.",
        "skills": ["Event Planning", "Balloon Decor", "Floral Arrangements"],
        "hourly_rate": 3500,
        "listings": [
            {
                "title": "Wedding Planning Package",
                "description": "Full wedding coordination from venue selection to day-of management.",
                "budget": 80000,
            },
            {
                "title": "Birthday Party Decor",
                "description": "Custom balloon arches, table settings, and themed decorations.",
                "budget": 15000,
            },
        ],
    },
    {
        "name": "Ricardo Grant",
        "phone": "+18761234507",
        "email": "ricardo@example.com",
        "parish": "St. Ann",
        "category": "Home Services",
        "bio": "Plumber with 15 years experience. Emergency callouts available in Ocho Rios and surrounding areas.",
        "skills": ["Pipe Repair", "Water Heater", "Bathroom Renovation"],
        "hourly_rate": 3000,
        "listings": [
            {
                "title": "Emergency Plumbing Repair",
                "description": "Burst pipes, blocked drains, leak detection. Available 24/7.",
                "budget": 10000,
            },
            {
                "title": "Bathroom Renovation",
                "description": "Complete bathroom remodel including tiling, fixtures, and plumbing.",
                "budget": 120000,
            },
        ],
    },
    {
        "name": "Natalie Campbell",
        "phone": "+18761234508",
        "email": "natalie@example.com",
        "parish": "Clarendon",
        "category": "Health & Fitness",
        "bio": "Certified personal trainer and nutrition coach. Online and in-person sessions in May Pen area.",
        "skills": ["Personal Training", "Nutrition Planning", "Weight Loss", "Strength Training"],
        "hourly_rate": 2500,
        "listings": [
            {
                "title": "Personal Training (4 weeks)",
                "description": (
                    "Customized workout plan with 3 sessions per week. Includes nutrition guide."
                ),
                "budget": 20000,
            },
            {
                "title": "Online Fitness Coaching",
                "description": (
                    "Weekly check-ins, meal plans, and workout programs delivered via WhatsApp."
                ),
                "budget": 8000,
            },
        ],
    },
    {
        "name": "Christopher Davis",
        "phone": "+18761234509",
        "email": "chris@example.com",
        "parish": "Westmoreland",
        "category": "Professional Services",
        "bio": "Accountant and tax preparer. Serving Negril and Savanna-la-Mar businesses.",
        "skills": ["Tax Preparation", "Bookkeeping", "Business Registration"],
        "hourly_rate": 4500,
        "listings": [
            {
                "title": "Small Business Tax Filing",
                "description": "Annual GCT and income tax preparation. Statutory compliance included.",
                "budget": 25000,
            },
            {
                "title": "Business Registration Package",
                "description": (
                    "Company registration, TRN, GCT, and NIS setup. Start your business right."
                ),
                "budget": 35000,
            },
        ],
    },
    {
        "name": "Simone Edwards",
        "phone": "+18761234510",
        "email": "simone@example.com",
        "parish": "Trelawny",
        "category": "Creative Services",
        "bio": (
            "Graphic designer and photographer."
            " Specializing in brand identity and event photography across Jamaica."
        ),
        "skills": ["Graphic Design", "Photography", "Branding", "Social Media"],
        "hourly_rate": 3000,
        "listings": [
            {
                "title": "Brand Identity Package",
                "description": (
                    "Logo design, business cards, social media templates. 3 concept rounds included."
                ),
                "budget": 30000,
            },
            {
                "title": "Event Photography",
                "description": (
                    "Professional event coverage with edited photos delivered within 5 business days."
                ),
                "budget": 20000,
            },
        ],
    },
]

# Demo customer accounts
CUSTOMERS = [
    {"name": "Sarah Mitchell", "phone": "+18761234601", "email": "sarah@example.com", "parish": "Kingston"},
    {"name": "Michael Chen", "phone": "+18761234602", "email": "michael@example.com", "parish": "St. Andrew"},
    {"name": "Anya Palmer", "phone": "+18761234603", "email": "anya@example.com", "parish": "St. James"},
]


def _uid() -> str:
    return str(uuid.uuid4())


def _now() -> datetime:
    return datetime.now(UTC)


# Minimal geohash encoder (base-32) -- good enough for seed data
_BASE32 = "0123456789bcdefghjkmnpqrstuvwxyz"


def _encode_geohash(lat: float, lng: float, precision: int = 7) -> str:
    lat_range, lng_range = [-90.0, 90.0], [-180.0, 180.0]
    bits = [16, 8, 4, 2, 1]
    hash_chars: list[str] = []
    bit, ch, even = 0, 0, True
    while len(hash_chars) < precision:
        if even:
            mid = (lng_range[0] + lng_range[1]) / 2
            if lng > mid:
                ch |= bits[bit]
                lng_range[0] = mid
            else:
                lng_range[1] = mid
        else:
            mid = (lat_range[0] + lat_range[1]) / 2
            if lat > mid:
                ch |= bits[bit]
                lat_range[0] = mid
            else:
                lat_range[1] = mid
        even = not even
        if bit < 4:
            bit += 1
        else:
            hash_chars.append(_BASE32[ch])
            bit, ch = 0, 0
    return "".join(hash_chars)


def _fake_s2_cell(lat: float, lng: float) -> int:
    """Return a deterministic pseudo S2 cell ID from coordinates (good enough for seed data)."""
    return int((lat * 1e7 + 900000000) * 1000 + (lng * 1e7 + 1800000000)) & 0x7FFFFFFFFFFFFFFF


async def seed():
    engine = create_async_engine(DATABASE_URL)
    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with session_factory() as session:
        print("Seeding provider accounts...")
        password_hash = hash_password("DemoPass123!")

        profile_ids: list[tuple[str, str]] = []  # (profile_id, parish)
        listing_ids: list[tuple[str, str]] = []   # (listing_id, parish)

        for p in PROVIDERS:
            user_id = _uid()
            user = User(
                id=user_id,
                phone=p["phone"],
                email=p["email"],
                password_hash=password_hash,
                role="provider",
                is_verified=True,
                created_at=_now(),
                updated_at=_now(),
            )
            session.add(user)

            profile_id = _uid()
            profile = Profile(
                id=profile_id,
                user_id=user_id,
                display_name=p["name"],
                bio=p["bio"],
                parish=p["parish"],
                skills=p["skills"],
                hourly_rate=p["hourly_rate"],
                is_provider=True,
                created_at=_now(),
                updated_at=_now(),
            )
            session.add(profile)
            profile_ids.append((profile_id, p["parish"]))

            for lst in p["listings"]:
                listing_id = _uid()
                session.add(Listing(
                    id=listing_id,
                    poster_id=user_id,
                    title=lst["title"],
                    description=lst["description"],
                    category=p["category"],
                    parish=p["parish"],
                    budget_min=lst["budget"],
                    budget_max=lst["budget"],
                    currency="JMD",
                    status="active",
                    created_at=_now(),
                    updated_at=_now(),
                ))
                listing_ids.append((listing_id, p["parish"]))

        print("Seeding customer accounts...")
        for c in CUSTOMERS:
            user_id = _uid()
            session.add(User(
                id=user_id,
                phone=c["phone"],
                email=c["email"],
                password_hash=password_hash,
                role="user",
                is_verified=True,
                created_at=_now(),
                updated_at=_now(),
            ))
            profile_id = _uid()
            session.add(Profile(
                id=profile_id,
                user_id=user_id,
                display_name=c["name"],
                parish=c["parish"],
                created_at=_now(),
                updated_at=_now(),
            ))
            profile_ids.append((profile_id, c["parish"]))

        # --- Ad Placements ---
        print("Seeding ad placements...")
        ad_placements = [
            {"name": "feed_card", "description": "Sponsored card in the main feed", "position": "feed"},
            {"name": "profile_banner", "description": "Banner ad on profile pages", "position": "profile"},
            {"name": "listing_sidebar", "description": "Sidebar ad on listing details", "position": "sidebar"},
        ]
        for ap in ad_placements:
            session.add(AdPlacement(
                id=_uid(),
                name=ap["name"],
                description=ap["description"],
                position=ap["position"],
                is_active=True,
                created_at=_now(),
            ))

        # --- Ad Campaigns ---
        print("Seeding ad campaigns...")
        ad_campaigns = [
            {
                "advertiser_name": "Island Grill Jamaica",
                "advertiser_email": "marketing@islandgrill.com",
                "title": "Island Grill - Hire the Best, Feed the Rest",
                "description": "Promote your catering services with Jamaica's favourite chicken.",
                "click_url": "https://www.islandgrillja.com",
                "target_parishes": ["Kingston", "St. Andrew", "St. Catherine"],
                "target_categories": ["Events & Entertainment", "Home Services"],
                "budget_total": 50000.00,
                "budget_daily": 5000.00,
                "cost_per_click": 15.00,
                "cost_per_impression": 2.50,
            },
            {
                "advertiser_name": "Courts Jamaica",
                "advertiser_email": "ads@courts.com",
                "title": "Courts - Furnish Your Workspace",
                "description": "Special financing for tradespeople setting up new workshops.",
                "click_url": "https://www.courtsjamaica.com",
                "target_parishes": ["St. James", "St. Ann", "Trelawny", "Westmoreland"],
                "target_categories": ["Skilled Trades", "Technology", "Professional Services"],
                "budget_total": 75000.00,
                "budget_daily": 7500.00,
                "cost_per_click": 20.00,
                "cost_per_impression": 3.00,
            },
        ]
        for ac in ad_campaigns:
            session.add(AdCampaign(
                id=_uid(),
                advertiser_name=ac["advertiser_name"],
                advertiser_email=ac["advertiser_email"],
                title=ac["title"],
                description=ac["description"],
                click_url=ac["click_url"],
                target_parishes=ac["target_parishes"],
                target_categories=ac["target_categories"],
                budget_total=ac["budget_total"],
                budget_daily=ac["budget_daily"],
                cost_per_click=ac["cost_per_click"],
                cost_per_impression=ac["cost_per_impression"],
                status="active",
                created_at=_now(),
                updated_at=_now(),
            ))

        # --- Geoshard Entries for profiles and listings ---
        print("Seeding geoshard entries...")
        geo_count = 0
        for entity_id, parish in profile_ids:
            lat, lng = PARISH_COORDS.get(parish, (18.1096, -77.2975))
            session.add(GeoshardEntry(
                id=_uid(),
                entity_id=entity_id,
                entity_type="profile",
                geohash=_encode_geohash(lat, lng),
                s2_cell_id=_fake_s2_cell(lat, lng),
                latitude=lat,
                longitude=lng,
                parish=parish,
                is_active="true",
                created_at=_now(),
                updated_at=_now(),
            ))
            geo_count += 1

        for entity_id, parish in listing_ids:
            lat, lng = PARISH_COORDS.get(parish, (18.1096, -77.2975))
            session.add(GeoshardEntry(
                id=_uid(),
                entity_id=entity_id,
                entity_type="listing",
                geohash=_encode_geohash(lat, lng),
                s2_cell_id=_fake_s2_cell(lat, lng),
                latitude=lat,
                longitude=lng,
                parish=parish,
                is_active="true",
                created_at=_now(),
                updated_at=_now(),
            ))
            geo_count += 1

        await session.commit()
        print(f"Seeded {len(PROVIDERS)} providers with {sum(len(p['listings']) for p in PROVIDERS)} listings")
        print(f"Seeded {len(CUSTOMERS)} customer accounts")
        print(f"Seeded {len(ad_placements)} ad placements")
        print(f"Seeded {len(ad_campaigns)} ad campaigns")
        print(f"Seeded {geo_count} geoshard entries")
        print("All accounts use password: DemoPass123!")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(seed())
