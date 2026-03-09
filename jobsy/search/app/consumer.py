"""Event consumers that keep the search index in sync with listings and profiles."""

import asyncio
import logging

from shared.events import consume_events

from .elasticsearch_client import LISTINGS_INDEX, get_client, index_listing, index_profile

logger = logging.getLogger(__name__)


async def handle_listing_event(payload: dict) -> None:
    """Index a listing when it's created or updated."""
    data = payload.get("data", {})
    if data.get("id"):
        await index_listing(data)
        logger.info("Indexed listing %s", data["id"])


async def handle_profile_event(payload: dict) -> None:
    """Index a profile when it's created or updated."""
    data = payload.get("data", {})
    if data.get("id"):
        await index_profile(data)
        logger.info("Indexed profile %s", data["id"])


async def handle_listing_cancelled(payload: dict) -> None:
    """Remove a listing from the search index when it's cancelled/deleted."""
    data = payload.get("data", {})
    listing_id = data.get("listing_id") or data.get("id")
    if not listing_id:
        return

    client = await get_client()
    if not client:
        return

    try:
        await client.delete(index=LISTINGS_INDEX, id=listing_id, ignore=[404])
        logger.info("Removed listing %s from search index", listing_id)
    except Exception:
        logger.exception("Failed to remove listing %s from search index", listing_id)


async def start_consumers() -> None:
    """Start search indexing consumers."""
    logger.info("Starting search index consumers...")
    await asyncio.gather(
        consume_events("search.listing_created", "listing.created", handle_listing_event),
        consume_events("search.listing_updated", "listing.updated", handle_listing_event),
        consume_events("search.listing_cancelled", "listing.cancelled", handle_listing_cancelled),
        consume_events("search.profile_updated", "profile.updated", handle_profile_event),
    )
