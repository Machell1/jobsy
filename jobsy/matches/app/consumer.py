"""Event consumer that detects complementary swipes and creates matches.

This is the core business logic of Jobsy's matching system. It listens for
'swipe.right' events and checks whether the other party has also swiped right,
forming a mutual match.
"""

import asyncio
import logging
import os
import uuid
from datetime import UTC, datetime

import httpx
from sqlalchemy import Column, DateTime, String, and_, select

from shared.database import Base, async_session_factory
from shared.events import consume_events, publish_event

from .models import Match

logger = logging.getLogger(__name__)

LISTINGS_SERVICE_URL = os.getenv("LISTINGS_SERVICE_URL", "http://listings:8000")


# Local mirror of the swipes table for direct DB queries (same database).
class Swipe(Base):
    __tablename__ = "swipes"
    __table_args__ = {"extend_existing": True}

    id = Column(String, primary_key=True)
    swiper_id = Column(String, nullable=False)
    target_id = Column(String, nullable=False)
    target_type = Column(String(20), nullable=False)
    direction = Column(String(5), nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False)


async def _reciprocal_profile_swipe_exists(db, swiper_id: str, target_id: str) -> bool:
    """Check whether *target_id* has swiped right on *swiper_id*'s profile."""
    result = await db.execute(
        select(Swipe).where(
            and_(
                Swipe.swiper_id == target_id,
                Swipe.target_id == swiper_id,
                Swipe.target_type == "profile",
                Swipe.direction == "right",
            )
        )
    )
    return result.scalar_one_or_none() is not None


async def _match_already_exists(db, user_a: str, user_b: str, listing_id=None) -> bool:
    """Return True if a match between the two users (with optional listing) exists."""
    canonical_a = min(user_a, user_b)
    canonical_b = max(user_a, user_b)
    if listing_id is not None:
        condition = and_(
            Match.user_a_id == canonical_a,
            Match.user_b_id == canonical_b,
            Match.listing_id == listing_id,
        )
    else:
        condition = and_(
            Match.user_a_id == canonical_a,
            Match.user_b_id == canonical_b,
            Match.listing_id.is_(None),
        )
    result = await db.execute(select(Match).where(condition))
    return result.scalar_one_or_none() is not None


async def _create_and_publish_match(db, user_a: str, user_b: str, listing_id=None) -> None:
    """Create a Match row and publish a match.created event."""
    match = Match(
        id=str(uuid.uuid4()),
        user_a_id=min(user_a, user_b),
        user_b_id=max(user_a, user_b),
        listing_id=listing_id,
        status="active",
        created_at=datetime.now(UTC),
    )
    db.add(match)
    await db.commit()

    logger.info(
        "Match created: %s <-> %s (listing=%s)",
        match.user_a_id,
        match.user_b_id,
        listing_id,
    )
    await publish_event("match.created", {
        "match_id": match.id,
        "user_a_id": match.user_a_id,
        "user_b_id": match.user_b_id,
        "listing_id": listing_id,
    })


async def handle_swipe_right(payload: dict) -> None:
    """Process a right-swipe event and create a match if mutual interest exists.

    For listing swipes: User A swipes right on a listing posted by User B.
    A match is created if User B has also swiped right on User A's profile.

    For profile swipes: User A swipes right on User B's profile.
    A match is created if User B has also swiped right on User A's profile.
    """
    data = payload.get("data", {})
    swiper_id = data.get("swiper_id")
    target_id = data.get("target_id")
    target_type = data.get("target_type")

    if not swiper_id or not target_id:
        logger.warning("Invalid swipe event data: %s", data)
        return

    async with async_session_factory() as db:
        if target_type == "profile":
            # Check for existing match first
            if await _match_already_exists(db, swiper_id, target_id):
                logger.info("Match already exists between %s and %s", swiper_id, target_id)
                return

            # Verify the other party has also swiped right on this user
            if not await _reciprocal_profile_swipe_exists(db, swiper_id, target_id):
                logger.info(
                    "No reciprocal swipe yet: %s -> %s (waiting for other party)",
                    swiper_id,
                    target_id,
                )
                return

            await _create_and_publish_match(db, swiper_id, target_id)

        elif target_type == "listing":
            # target_id is a listing ID; fetch the listing to find the poster
            try:
                async with httpx.AsyncClient() as client:
                    resp = await client.get(f"{LISTINGS_SERVICE_URL}/{target_id}")
                    resp.raise_for_status()
                    listing_data = resp.json()
            except httpx.HTTPError as exc:
                logger.error(
                    "Failed to fetch listing %s from listings service: %s",
                    target_id,
                    exc,
                )
                return

            poster_id = listing_data.get("poster_id")
            if not poster_id:
                logger.warning("Listing %s has no poster_id", target_id)
                return

            if poster_id == swiper_id:
                logger.info("User %s swiped on their own listing %s, ignoring", swiper_id, target_id)
                return

            # Check for existing match
            if await _match_already_exists(db, swiper_id, poster_id, listing_id=target_id):
                logger.info(
                    "Match already exists between %s and %s for listing %s",
                    swiper_id,
                    poster_id,
                    target_id,
                )
                return

            # Check if the listing poster has swiped right on the swiper's profile
            if not await _reciprocal_profile_swipe_exists(db, swiper_id, poster_id):
                logger.info(
                    "No reciprocal swipe from poster %s on user %s for listing %s",
                    poster_id,
                    swiper_id,
                    target_id,
                )
                return

            await _create_and_publish_match(db, swiper_id, poster_id, listing_id=target_id)


async def start_consumer() -> None:
    """Start the match event consumer loop."""
    logger.info("Starting match consumer...")
    await consume_events("matches.swipe_right", "swipe.right", handle_swipe_right)


if __name__ == "__main__":
    asyncio.run(start_consumer())
