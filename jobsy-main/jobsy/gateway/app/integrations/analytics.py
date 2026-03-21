"""PostHog server-side analytics integration."""

import logging

from shared.config import POSTHOG_API_KEY, POSTHOG_HOST

logger = logging.getLogger(__name__)

_posthog = None

if POSTHOG_API_KEY:
    try:
        import posthog

        posthog.api_key = POSTHOG_API_KEY
        posthog.host = POSTHOG_HOST
        _posthog = posthog
    except ImportError:
        logger.warning("posthog package not installed, analytics tracking disabled")
else:
    logger.info("POSTHOG_API_KEY not set, analytics tracking disabled")


def track(user_id: str, event: str, properties: dict | None = None) -> None:
    """Track an analytics event in PostHog.

    Silently no-ops if PostHog is not configured.
    """
    if not _posthog:
        return
    try:
        _posthog.capture(user_id, event, properties=properties or {})
    except Exception:
        logger.exception("PostHog tracking failed for event=%s", event)
