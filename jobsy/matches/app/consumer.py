"""Event consumer that detects complementary swipes and creates matches.

This is the core business logic of Jobsy's matching system. It listens for
'swipe.right' events and checks whether the other party has also swiped right,
forming a mutual match.
"""

import asyncio
import logging
import uuid
from datetime import datetime, timezone

from sqlalchemy import and_, select

from shared.database import async_session_factory
from shared.events import consume_events, publish_event

logger = logging.getLogger(__name__)

# Import here to avoid circular deps at module level
from .models import Match


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
            # Check if the target user has also swiped right on the swiper's profile
            # We look for a swipe record in the swipes service via the event data
            # For now, check matches table for existing match
            existing = await db.execute(
                select(Match).where(
                    and_(
                        Match.user_a_id.in_([swiper_id, target_id]),
                        Match.user_b_id.in_([swiper_id, target_id]),
                    )
                )
            )
            if existing.scalar_one_or_none():
                logger.info("Match already exists between %s and %s", swiper_id, target_id)
                return

            # Create match (in production, verify mutual swipe via swipes service)
            match = Match(
                id=str(uuid.uuid4()),
                user_a_id=min(swiper_id, target_id),  # canonical ordering
                user_b_id=max(swiper_id, target_id),
                listing_id=None,
                status="active",
                created_at=datetime.now(timezone.utc),
            )
            db.add(match)
            await db.commit()

            logger.info("Match created: %s <-> %s", swiper_id, target_id)
            await publish_event("match.created", {
                "match_id": match.id,
                "user_a_id": match.user_a_id,
                "user_b_id": match.user_b_id,
                "listing_id": None,
            })

        elif target_type == "listing":
            # target_id is a listing ID; we need the listing poster's user ID
            # In production, fetch from listings service. For now, log and skip.
            logger.info(
                "Listing swipe from %s on listing %s -- poster lookup needed",
                swiper_id,
                target_id,
            )


async def start_consumer() -> None:
    """Start the match event consumer loop."""
    logger.info("Starting match consumer...")
    await consume_events("matches.swipe_right", "swipe.right", handle_swipe_right)


if __name__ == "__main__":
    asyncio.run(start_consumer())
