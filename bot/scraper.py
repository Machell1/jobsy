"""
Multi-site product scraper - delegates to site-specific scrapers.

Supported sites: Amazon, Best Buy, Walmart, Target
Deal aggregators: Slickdeals, DealNews
"""

from scrapers import get_scraper_for_url, detect_site, ALL_SCRAPERS, DEAL_AGGREGATORS


def scrape_product(url_or_id):
    """Scrape a product from any supported site. Auto-detects the site from the URL."""
    scraper = get_scraper_for_url(url_or_id)
    if scraper:
        return scraper.scrape_product(url_or_id)

    # If no scraper matched, try Amazon (for bare ASINs)
    if len(url_or_id) == 10 and url_or_id.isalnum():
        from scrapers.amazon import AmazonScraper
        return AmazonScraper().scrape_product(url_or_id)

    print(f"[Scraper] Unsupported URL: {url_or_id}")
    print(f"[Scraper] Supported sites: Amazon, Best Buy, Walmart, Target")
    return None


def scrape_deals_from_site(site_name):
    """Scrape current deals from a specific retailer."""
    site_name = site_name.lower()
    scraper_class = ALL_SCRAPERS.get(site_name)
    if scraper_class:
        scraper = scraper_class()
        return scraper.scrape_deals()

    print(f"[Scraper] Unknown site: {site_name}")
    return []


def scrape_deal_aggregators():
    """Scrape all deal aggregator sites for current hot deals."""
    all_deals = []
    for name, scraper_class in DEAL_AGGREGATORS.items():
        print(f"[Scraper] Scanning {name}...")
        scraper = scraper_class()
        deals = scraper.scrape_deals()
        print(f"[Scraper] Found {len(deals)} deals on {name}")
        all_deals.extend(deals)
    return all_deals


def scrape_all_deals():
    """Scrape deals from all retailers and aggregators."""
    all_deals = []

    # Retailer deal pages
    for name, scraper_class in ALL_SCRAPERS.items():
        print(f"[Scraper] Scanning {name} deals...")
        scraper = scraper_class()
        deals = scraper.scrape_deals()
        print(f"[Scraper] Found {len(deals)} deals on {name}")
        all_deals.extend(deals)

    # Aggregator sites
    for name, scraper_class in DEAL_AGGREGATORS.items():
        print(f"[Scraper] Scanning {name}...")
        scraper = scraper_class()
        deals = scraper.scrape_deals()
        print(f"[Scraper] Found {len(deals)} deals on {name}")
        all_deals.extend(deals)

    return all_deals
