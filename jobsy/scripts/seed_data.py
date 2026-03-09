"""Seed script to populate the database with sample Jamaican service providers.

Usage:
    python -m scripts.seed_data

Requires DATABASE_URL to be set. Uses asyncpg for Postgres.
"""

import asyncio
import uuid
from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from shared.config import DATABASE_URL
from shared.database import Base

# Import all models so metadata is populated
import gateway.app.models as _gw  # noqa: F401
import profiles.app.models as _pr  # noqa: F401
import listings.app.models as _ls  # noqa: F401
import reviews.app.models as _rv  # noqa: F401

from gateway.app.models import User
from profiles.app.models import Profile
from listings.app.models import Listing
from reviews.app.models import Review, UserRating
from shared.auth import hash_password


PARISHES = [
    "Kingston", "St. Andrew", "St. Thomas", "Portland", "St. Mary",
    "St. Ann", "Trelawny", "St. James", "Hanover", "Westmoreland",
    "St. Elizabeth", "Manchester", "Clarendon", "St. Catherine",
]

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
        "bio": "Licensed electrician with 12 years experience across Kingston and St. Andrew. Specialize in residential wiring, panel upgrades, and solar installations.",
        "skills": ["Electrical Wiring", "Solar Installation", "Panel Upgrades"],
        "hourly_rate": 3500,
        "listings": [
            {"title": "Residential Electrical Wiring", "description": "Full house wiring, rewiring, and electrical inspections. Licensed and insured.", "budget": 25000},
            {"title": "Solar Panel Installation", "description": "Complete solar setup for homes and small businesses. Reduce your JPS bill!", "budget": 150000},
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
            {"title": "Natural Hair Styling", "description": "Twist-outs, bantu knots, protective styles. Using quality Jamaican products.", "budget": 4000},
            {"title": "Bridal Makeup Package", "description": "Full bridal party makeup including trial. Based in Half Way Tree.", "budget": 15000},
        ],
    },
    {
        "name": "Devon Clarke",
        "phone": "+18761234503",
        "email": "devon@example.com",
        "parish": "St. James",
        "category": "Technology",
        "bio": "IT consultant and web developer based in Montego Bay. Building websites and managing networks for small businesses.",
        "skills": ["Web Development", "Network Setup", "Computer Repair"],
        "hourly_rate": 4000,
        "listings": [
            {"title": "Small Business Website", "description": "Professional website with mobile-friendly design. E-commerce add-on available.", "budget": 45000},
            {"title": "Office Network Setup", "description": "Wi-Fi, cabling, and security setup for offices in MoBay area.", "budget": 30000},
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
            {"title": "CXC Math Tutoring", "description": "One-on-one or group sessions. Proven track record of Grade 1 results.", "budget": 3000},
            {"title": "CAPE Physics Preparation", "description": "Unit 1 and 2 preparation with past paper practice.", "budget": 3500},
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
            {"title": "Full Vehicle Service", "description": "Oil change, filter replacement, brake check, and 20-point inspection.", "budget": 8000},
            {"title": "AC Recharge & Repair", "description": "Diagnose and fix car AC systems. Most Japanese makes covered.", "budget": 12000},
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
            {"title": "Wedding Planning Package", "description": "Full wedding coordination from venue selection to day-of management.", "budget": 80000},
            {"title": "Birthday Party Decor", "description": "Custom balloon arches, table settings, and themed decorations.", "budget": 15000},
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
            {"title": "Emergency Plumbing Repair", "description": "Burst pipes, blocked drains, leak detection. Available 24/7.", "budget": 10000},
            {"title": "Bathroom Renovation", "description": "Complete bathroom remodel including tiling, fixtures, and plumbing.", "budget": 120000},
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
            {"title": "Personal Training (4 weeks)", "description": "Customized workout plan with 3 sessions per week. Includes nutrition guide.", "budget": 20000},
            {"title": "Online Fitness Coaching", "description": "Weekly check-ins, meal plans, and workout programs delivered via WhatsApp.", "budget": 8000},
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
            {"title": "Small Business Tax Filing", "description": "Annual GCT and income tax preparation. Statutory compliance included.", "budget": 25000},
            {"title": "Business Registration Package", "description": "Company registration, TRN, GCT, and NIS setup. Start your business right.", "budget": 35000},
        ],
    },
    {
        "name": "Simone Edwards",
        "phone": "+18761234510",
        "email": "simone@example.com",
        "parish": "Trelawny",
        "category": "Creative Services",
        "bio": "Graphic designer and photographer. Specializing in brand identity and event photography across Jamaica.",
        "skills": ["Graphic Design", "Photography", "Branding", "Social Media"],
        "hourly_rate": 3000,
        "listings": [
            {"title": "Brand Identity Package", "description": "Logo design, business cards, social media templates. 3 concept rounds included.", "budget": 30000},
            {"title": "Event Photography", "description": "Professional event coverage with edited photos delivered within 5 business days.", "budget": 20000},
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
    return datetime.now(timezone.utc)


async def seed():
    engine = create_async_engine(DATABASE_URL)
    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with session_factory() as session:
        print("Seeding provider accounts...")
        password_hash = hash_password("DemoPass123!")

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
            )
            session.add(user)

            profile = Profile(
                id=_uid(),
                user_id=user_id,
                display_name=p["name"],
                bio=p["bio"],
                parish=p["parish"],
                skills=p["skills"],
                hourly_rate=p["hourly_rate"],
                availability_status="available",
                created_at=_now(),
                updated_at=_now(),
            )
            session.add(profile)

            for lst in p["listings"]:
                session.add(Listing(
                    id=_uid(),
                    user_id=user_id,
                    title=lst["title"],
                    description=lst["description"],
                    category=p["category"],
                    parish=p["parish"],
                    budget=lst["budget"],
                    currency="JMD",
                    status="active",
                    created_at=_now(),
                    updated_at=_now(),
                ))

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
            ))
            session.add(Profile(
                id=_uid(),
                user_id=user_id,
                display_name=c["name"],
                parish=c["parish"],
                availability_status="available",
                created_at=_now(),
                updated_at=_now(),
            ))

        await session.commit()
        print(f"Seeded {len(PROVIDERS)} providers with {sum(len(p['listings']) for p in PROVIDERS)} listings")
        print(f"Seeded {len(CUSTOMERS)} customer accounts")
        print("All accounts use password: DemoPass123!")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(seed())
