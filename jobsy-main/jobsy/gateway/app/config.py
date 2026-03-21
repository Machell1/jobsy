"""Gateway-specific configuration."""

import os

# Internal service URLs (Railway private networking)
SERVICE_URLS = {
    "profiles": os.getenv("PROFILES_SERVICE_URL", "http://profiles.railway.internal:8080"),
    "listings": os.getenv("LISTINGS_SERVICE_URL", "http://listings.railway.internal:8080"),
    "swipes": os.getenv("SWIPES_SERVICE_URL", "http://swipes.railway.internal:8080"),
    "matches": os.getenv("MATCHES_SERVICE_URL", "http://matches.railway.internal:8080"),
    "geo": os.getenv("GEOSHARD_SERVICE_URL", "http://geoshard.railway.internal:8080"),
    "recommendations": os.getenv("RECOMMENDATIONS_SERVICE_URL", "http://recommendations.railway.internal:8080"),
    "chat": os.getenv("CHAT_SERVICE_URL", "http://chat.railway.internal:8080"),
    "notifications": os.getenv("NOTIFICATIONS_SERVICE_URL", "http://notifications.railway.internal:8080"),
    "storage": os.getenv("STORAGE_SERVICE_URL", "http://storage.railway.internal:8080"),
    "ads": os.getenv("ADVERTISING_SERVICE_URL", "http://advertising.railway.internal:8080"),
    "payments": os.getenv("PAYMENTS_SERVICE_URL", "http://payments.railway.internal:8080"),
    "reviews": os.getenv("REVIEWS_SERVICE_URL", "http://reviews.railway.internal:8080"),
    "search": os.getenv("SEARCH_SERVICE_URL", "http://search.railway.internal:8080"),
    "admin": os.getenv("ADMIN_SERVICE_URL", "http://admin.railway.internal:8080"),
    "bookings": os.getenv("BOOKINGS_SERVICE_URL", "http://bookings.railway.internal:8080"),
    "noticeboard": os.getenv("NOTICEBOARD_SERVICE_URL", "http://noticeboard.railway.internal:8080"),
}

# Rate limiting
RATE_LIMIT_UNAUTHENTICATED = int(os.getenv("RATE_LIMIT_UNAUTH", "100"))  # per minute
RATE_LIMIT_AUTHENTICATED = int(os.getenv("RATE_LIMIT_AUTH", "300"))  # per minute
RATE_LIMIT_AUTH_ENDPOINTS = int(os.getenv("RATE_LIMIT_AUTH_ENDPOINTS", "10"))  # per minute per IP
