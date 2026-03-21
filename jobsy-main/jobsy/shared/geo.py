"""Geohash and geospatial utility functions."""

import math

# Geohash base32 encoding
_BASE32 = "0123456789bcdefghjkmnpqrstuvwxyz"


def encode_geohash(lat: float, lng: float, precision: int = 7) -> str:
    """Encode latitude/longitude to a geohash string."""
    lat_range = (-90.0, 90.0)
    lng_range = (-180.0, 180.0)
    geohash = []
    bits = [16, 8, 4, 2, 1]
    bit = 0
    ch = 0
    is_lng = True

    while len(geohash) < precision:
        if is_lng:
            mid = (lng_range[0] + lng_range[1]) / 2
            if lng > mid:
                ch |= bits[bit]
                lng_range = (mid, lng_range[1])
            else:
                lng_range = (lng_range[0], mid)
        else:
            mid = (lat_range[0] + lat_range[1]) / 2
            if lat > mid:
                ch |= bits[bit]
                lat_range = (mid, lat_range[1])
            else:
                lat_range = (lat_range[0], mid)
        is_lng = not is_lng
        if bit < 4:
            bit += 1
        else:
            geohash.append(_BASE32[ch])
            bit = 0
            ch = 0

    return "".join(geohash)


def haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Calculate distance in km between two lat/lng points."""
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = math.sin(dlat / 2) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlng / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


# Jamaica's 14 parishes with approximate center coordinates
JAMAICA_PARISHES = {
    "Kingston": (18.0179, -76.8099),
    "St. Andrew": (18.0500, -76.7500),
    "St. Thomas": (17.9500, -76.3500),
    "Portland": (18.1500, -76.3500),
    "St. Mary": (18.2500, -76.9000),
    "St. Ann": (18.3500, -77.2000),
    "Trelawny": (18.3500, -77.6000),
    "St. James": (18.4500, -77.9000),
    "Hanover": (18.4000, -78.1500),
    "Westmoreland": (18.2500, -78.1500),
    "St. Elizabeth": (18.0500, -77.8500),
    "Manchester": (18.0500, -77.5000),
    "Clarendon": (17.9500, -77.2500),
    "St. Catherine": (18.0000, -76.9500),
}


def get_parish(lat: float, lng: float) -> str | None:
    """Return the nearest Jamaican parish for a given coordinate."""
    closest = None
    min_dist = float("inf")
    for parish, (plat, plng) in JAMAICA_PARISHES.items():
        dist = haversine_km(lat, lng, plat, plng)
        if dist < min_dist:
            min_dist = dist
            closest = parish
    return closest
