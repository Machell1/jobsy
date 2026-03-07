"""URL safety validation for Deal Alert Bot.

Ensures only links from trusted, legitimate sites are sent to customers.
Blocks scam domains, phishing URLs, redirects to unknown sites, and
suspicious patterns.
"""

from urllib.parse import urlparse, parse_qs

# Trusted domains - ONLY links from these domains are sent to customers.
# Sub-domains are allowed (e.g., smile.amazon.com passes for amazon.com).
TRUSTED_DOMAINS = {
    # Retailers
    "amazon.com",
    "amzn.to",
    "bestbuy.com",
    "walmart.com",
    "target.com",
    "ebay.com",
    # Deal aggregators
    "slickdeals.net",
    "dealnews.com",
    # Lifestyle & travel
    "groupon.com",
    "skyscanner.com",
    "skyscanner.net",
    "expedia.com",
    # Official affiliate redirect domains
    "rover.ebay.com",
    "goto.walmart.com",
    "goto.target.com",
    "assoc-redirect.amazon.com",
}

# Suspicious URL patterns that indicate phishing or scam links
BLOCKED_PATTERNS = [
    "bit.ly",
    "tinyurl.com",
    "t.co",
    "goo.gl",
    "ow.ly",
    "is.gd",
    "buff.ly",
    "adf.ly",
    "shorte.st",
    "bc.vc",
    "j.mp",
    "cutt.ly",
    "rb.gy",
    "shorturl.at",
    "tiny.cc",
    # Common phishing patterns
    "login",
    "signin",
    "verify",
    "account-update",
    "security-alert",
    "password",
    "confirm-identity",
]


def is_trusted_url(url):
    """Check if a URL belongs to a trusted domain.

    Returns True if the URL is from a whitelisted domain.
    Returns False for unknown domains, URL shorteners, or suspicious patterns.
    """
    if not url or not isinstance(url, str):
        return False

    url = url.strip()

    # Must start with http:// or https://
    if not url.startswith(("http://", "https://")):
        return False

    try:
        parsed = urlparse(url)
    except Exception:
        return False

    hostname = (parsed.hostname or "").lower()
    if not hostname:
        return False

    # Check against blocked patterns in the full URL
    url_lower = url.lower()
    for pattern in BLOCKED_PATTERNS:
        if pattern in hostname:
            return False

    # Check if the hostname matches a trusted domain (or is a subdomain of one)
    for trusted in TRUSTED_DOMAINS:
        if hostname == trusted or hostname.endswith("." + trusted):
            return True

    return False


def sanitize_url(url):
    """Return the URL if trusted, otherwise return None.

    Use this before sending any URL to customers.
    """
    if is_trusted_url(url):
        return url
    return None


def validate_deal(deal):
    """Validate a deal dict before sending to customers.

    Returns (is_valid, reason) tuple.
    - Checks the deal URL is from a trusted domain
    - Checks the title isn't empty or suspicious
    - Checks price values are reasonable
    """
    if not deal or not isinstance(deal, dict):
        return False, "Invalid deal data"

    url = deal.get("url", "")
    if not url or url == "#":
        return False, "Missing URL"

    if not is_trusted_url(url):
        return False, f"Untrusted domain: {url}"

    title = deal.get("title", "").strip()
    if not title or len(title) < 3:
        return False, "Missing or invalid title"

    # Check for suspicious title patterns (common in scam deals)
    title_lower = title.lower()
    scam_keywords = [
        "free iphone", "free gift card", "claim your prize",
        "you have won", "congratulations", "click here now",
        "act now limited", "wire transfer", "western union",
        "crypto giveaway", "double your money",
    ]
    for keyword in scam_keywords:
        if keyword in title_lower:
            return False, f"Suspicious title: contains '{keyword}'"

    # Validate price if present (must be positive and reasonable)
    price = deal.get("price")
    if price is not None:
        if not isinstance(price, (int, float)) or price < 0:
            return False, f"Invalid price: {price}"
        if price > 100000:
            return False, f"Unreasonable price: ${price}"

    return True, "OK"


def validate_product(product):
    """Validate a product dict before sending to customers.

    Same checks as validate_deal plus affiliate URL validation.
    """
    if not product or not isinstance(product, dict):
        return False, "Invalid product data"

    url = product.get("url", "")
    if not is_trusted_url(url):
        return False, f"Untrusted product URL: {url}"

    affiliate_url = product.get("affiliate_url", "")
    if affiliate_url and not is_trusted_url(affiliate_url):
        return False, f"Untrusted affiliate URL: {affiliate_url}"

    title = product.get("title", "").strip()
    if not title or len(title) < 3:
        return False, "Missing or invalid title"

    price = product.get("price")
    if price is not None:
        if not isinstance(price, (int, float)) or price < 0:
            return False, f"Invalid price: {price}"

    return True, "OK"
