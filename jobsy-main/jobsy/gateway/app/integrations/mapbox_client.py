"""Mapbox geocoding integration using httpx."""

import logging

import httpx

from shared.config import MAPBOX_SECRET_TOKEN

logger = logging.getLogger(__name__)

MAPBOX_GEOCODING_V6 = "https://api.mapbox.com/search/geocode/v6"


async def geocode(address: str) -> dict:
    """Forward-geocode an address using Mapbox Geocoding API v6.

    Returns the raw JSON response or an error dict.
    """
    if not MAPBOX_SECRET_TOKEN:
        logger.warning("MAPBOX_SECRET_TOKEN not set, geocoding unavailable")
        return {"error": "Mapbox not configured"}
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{MAPBOX_GEOCODING_V6}/forward",
                params={"q": address, "access_token": MAPBOX_SECRET_TOKEN},
                timeout=10,
            )
            resp.raise_for_status()
            return resp.json()
    except Exception:
        logger.exception("Mapbox geocode failed for address=%s", address)
        return {"error": "Geocoding request failed"}


async def reverse_geocode(lat: float, lng: float) -> dict:
    """Reverse-geocode coordinates using Mapbox Geocoding API v6.

    Returns the raw JSON response or an error dict.
    """
    if not MAPBOX_SECRET_TOKEN:
        logger.warning("MAPBOX_SECRET_TOKEN not set, reverse geocoding unavailable")
        return {"error": "Mapbox not configured"}
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{MAPBOX_GEOCODING_V6}/reverse",
                params={"longitude": lng, "latitude": lat, "access_token": MAPBOX_SECRET_TOKEN},
                timeout=10,
            )
            resp.raise_for_status()
            return resp.json()
    except Exception:
        logger.exception("Mapbox reverse geocode failed for lat=%s lng=%s", lat, lng)
        return {"error": "Reverse geocoding request failed"}
