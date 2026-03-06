"""DealNews deal aggregator scraper.

DealNews is a curated deal aggregation site that covers deals from
hundreds of retailers across electronics, home, clothing, and more.
"""

import re
from scrapers.base import BaseScraper


class DealNewsScraper(BaseScraper):
    site_name = "DealNews"
    base_url = "https://www.dealnews.com"

    def scrape_product(self, url):
        """Scrape a single DealNews deal page."""
        soup = self.fetch_page(url)
        if not soup:
            return None

        title = None
        title_el = soup.find("h1", {"class": re.compile(r"title", re.I)})
        if not title_el:
            title_el = soup.find("h1")
        if title_el:
            title = title_el.get_text(strip=True)
        if not title:
            title = "DealNews Deal"

        # Find the "Buy Now" / external link
        deal_link = None
        buy_btn = soup.find("a", {"class": re.compile(r"buyButton|btn.*buy", re.I)})
        if buy_btn and buy_btn.get("href"):
            deal_link = buy_btn["href"]

        # Price
        price = None
        price_el = soup.find("span", {"class": re.compile(r"price|dealPrice", re.I)})
        if price_el:
            price = self.extract_price(price_el.get_text())

        # Store
        store = None
        store_el = soup.find("a", {"class": re.compile(r"store|merchant", re.I)})
        if store_el:
            store = store_el.get_text(strip=True)

        return {
            "product_id": url,
            "title": title[:200],
            "price": price,
            "store": store,
            "url": deal_link or url,
            "affiliate_url": deal_link or url,
            "site": "dealnews",
            "source_url": url,
        }

    def scrape_deals(self):
        """Scrape DealNews front page and category pages for current deals."""
        deals = []

        for page_url in [
            "https://www.dealnews.com/",
            "https://www.dealnews.com/c/electronics/",
            "https://www.dealnews.com/c/computers/",
            "https://www.dealnews.com/c/home-garden/",
        ]:
            soup = self.fetch_page(page_url)
            if not soup:
                continue

            # DealNews uses article/summary cards
            cards = soup.find_all("div", {"class": re.compile(r"deal-card|content-card|summary", re.I)})
            if not cards:
                cards = soup.find_all("article")
            if not cards:
                cards = soup.find_all("div", {"class": re.compile(r"deal", re.I)})

            for card in cards[:20]:
                try:
                    # Title and link
                    link = card.find("a", {"class": re.compile(r"title|heading|summary", re.I)})
                    if not link:
                        link = card.find("a", href=re.compile(r'/deal/|/lw/', re.I))
                    if not link:
                        # Try any link within the card
                        link = card.find("a", href=True)
                    if not link:
                        continue

                    href = link.get("href", "")
                    if not href.startswith("http"):
                        href = self.base_url + href

                    title = link.get_text(strip=True)
                    if not title or len(title) < 5:
                        title_el = card.find("h2") or card.find("h3")
                        title = title_el.get_text(strip=True) if title_el else None
                    if not title:
                        continue

                    # Price
                    price = None
                    price_el = card.find("span", {"class": re.compile(r"price|sale-price|deal-price", re.I)})
                    if not price_el:
                        # Look for price in the title/text
                        price_match = re.search(r'\$[\d,]+\.?\d*', title)
                        if price_match:
                            price = self.extract_price(price_match.group())
                    else:
                        price = self.extract_price(price_el.get_text())

                    # Original price
                    original_price = None
                    orig_el = card.find("span", {"class": re.compile(r"original|list-price|was", re.I)})
                    if orig_el:
                        original_price = self.extract_price(orig_el.get_text())

                    # Store
                    store = None
                    store_el = card.find("span", {"class": re.compile(r"store|merchant", re.I)})
                    if not store_el:
                        store_el = card.find("a", {"class": re.compile(r"store|merchant", re.I)})
                    if store_el:
                        store = store_el.get_text(strip=True)

                    deals.append({
                        "product_id": href,
                        "title": title[:200],
                        "price": price,
                        "original_price": original_price,
                        "store": store,
                        "url": href,
                        "affiliate_url": href,
                        "site": "dealnews",
                    })
                except Exception:
                    continue

        return deals
