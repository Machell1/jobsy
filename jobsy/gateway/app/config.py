"""Gateway-specific configuration."""

import os

# Internal service URLs (Railway private networking)
SERVICE_URLS = {
    "profiles": os.getenv("PROFILES_SERVICE_URL", "http://profiles.railway.internal:8000"),
    "listings": os.getenv("LISTINGS_SERVICE_URL", "http://listings.railway.internal:8000"),
    "swipes": os.getenv("SWIPES_SERVICE_URL", "http://swipes.railway.internal:8000"),
    "matches": os.getenv("MATCHES_SERVICE_URL", "http://matches.railway.internal:8000"),
}

# Rate limiting
RATE_LIMIT_UNAUTHENTICATED = int(os.getenv("RATE_LIMIT_UNAUTH", "100"))  # per minute
RATE_LIMIT_AUTHENTICATED = int(os.getenv("RATE_LIMIT_AUTH", "300"))  # per minute
