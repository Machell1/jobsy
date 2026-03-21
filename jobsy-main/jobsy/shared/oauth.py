"""OAuth ID token verification for Google and Apple providers."""

import logging
import time

import httpx
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token as google_id_token
from jose import jwt as jose_jwt

from shared.config import APPLE_BUNDLE_ID, GOOGLE_CLIENT_ID

logger = logging.getLogger(__name__)

# Cache Apple's JWKS for 1 hour to avoid fetching on every request.
_apple_keys_cache: dict = {"keys": [], "fetched_at": 0}
_APPLE_KEYS_TTL = 3600  # seconds


def verify_google_token(id_token: str) -> dict:
    """Verify a Google ID token and return user info.

    Returns dict with keys: sub, email, name.
    Raises ValueError on verification failure.
    """
    if not GOOGLE_CLIENT_ID:
        raise ValueError("GOOGLE_CLIENT_ID not configured")

    try:
        info = google_id_token.verify_oauth2_token(
            id_token,
            google_requests.Request(),
            GOOGLE_CLIENT_ID,
        )
    except Exception as exc:
        raise ValueError(f"Invalid Google ID token: {exc}") from exc

    sub = info.get("sub")
    if not sub:
        raise ValueError("Google token missing 'sub' claim")

    return {
        "sub": sub,
        "email": info.get("email"),
        "name": info.get("name"),
    }


def _fetch_apple_keys() -> list[dict]:
    """Fetch Apple's public keys, with caching."""
    now = time.time()
    if _apple_keys_cache["keys"] and now - _apple_keys_cache["fetched_at"] < _APPLE_KEYS_TTL:
        return _apple_keys_cache["keys"]

    resp = httpx.get("https://appleid.apple.com/auth/keys", timeout=10)
    resp.raise_for_status()
    keys = resp.json().get("keys", [])
    _apple_keys_cache["keys"] = keys
    _apple_keys_cache["fetched_at"] = now
    return keys


def verify_apple_token(id_token: str) -> dict:
    """Verify an Apple ID token and return user info.

    Returns dict with keys: sub, email (may be None).
    Raises ValueError on verification failure.
    """
    try:
        # Decode header to find the key ID
        headers = jose_jwt.get_unverified_header(id_token)
        kid = headers.get("kid")
        if not kid:
            raise ValueError("Apple token missing 'kid' header")

        # Find matching key from Apple's JWKS
        apple_keys = _fetch_apple_keys()
        matching_key = None
        for key in apple_keys:
            if key.get("kid") == kid:
                matching_key = key
                break

        if not matching_key:
            raise ValueError(f"No Apple public key found for kid={kid}")

        # Verify and decode the token
        payload = jose_jwt.decode(
            id_token,
            matching_key,
            algorithms=["RS256"],
            audience=APPLE_BUNDLE_ID,
            issuer="https://appleid.apple.com",
        )
    except ValueError:
        raise
    except Exception as exc:
        raise ValueError(f"Invalid Apple ID token: {exc}") from exc

    sub = payload.get("sub")
    if not sub:
        raise ValueError("Apple token missing 'sub' claim")

    return {
        "sub": sub,
        "email": payload.get("email"),
    }
