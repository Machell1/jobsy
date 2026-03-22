"""Gateway-specific configuration."""

import os

# Internal service URLs (Railway private networking)
# Services merged into gateway are commented out -- they now run
# as direct DB routes inside the gateway process.
SERVICE_URLS = {
    "profiles": os.getenv("PROFILES_SERVICE_URL", "http://profiles.railway.internal:8080"),
    # "listings" — merged into gateway (routes/listings.py)
    # "swipes" — merged into gateway (routes/swipes.py)
    "matches": os.getenv("MATCHES_SERVICE_URL", "http://matches.railway.internal:8080"),
    # "geo" — merged into gateway (routes/geoshard.py)
    "recommendations": os.getenv("RECOMMENDATIONS_SERVICE_URL", "http://recommendations.railway.internal:8080"),
    "chat": os.getenv("CHAT_SERVICE_URL", "http://chat.railway.internal:8080"),
    "notifications": os.getenv("NOTIFICATIONS_SERVICE_URL", "http://notifications.railway.internal:8080"),
    # "storage" — merged into gateway (routes/storage.py)
    "ads": os.getenv("ADVERTISING_SERVICE_URL", "http://advertising.railway.internal:8080"),
    "payments": os.getenv("PAYMENTS_SERVICE_URL", "http://payments.railway.internal:8080"),
    # "reviews" — merged into gateway (routes/reviews_routes.py)
    # "search" — merged into gateway (routes/search_routes.py)
    "admin": os.getenv("ADMIN_SERVICE_URL", "http://admin.railway.internal:8080"),
    "bookings": os.getenv("BOOKINGS_SERVICE_URL", "http://bookings.railway.internal:8080"),
    # "noticeboard" — merged into gateway (routes/noticeboard.py)
}

# Rate limiting
RATE_LIMIT_UNAUTHENTICATED = int(os.getenv("RATE_LIMIT_UNAUTH", "100"))  # per minute
RATE_LIMIT_AUTHENTICATED = int(os.getenv("RATE_LIMIT_AUTH", "300"))  # per minute
RATE_LIMIT_AUTH_ENDPOINTS = int(os.getenv("RATE_LIMIT_AUTH_ENDPOINTS", "10"))  # per minute per IP
