"""Slickdeals deal aggregator scraper.

Slickdeals curates deals from ALL stores. Scraping their front page
gives you the hottest community-voted deals across Amazon, Best Buy,
Walmart, Target, and hundreds of other retailers.
"""

import re
from scrapers.base import BaseScraper


class SlickdealsScraper(BaseScraper):
    site_name = "Slickdeals"
    base_url = "https://slickdeals.net"

    def scrape_product(self, url):
        """Scrape a single Slickdeals deal thread."""
        soup = self.fetch_page(url)
        if not soup:
            return None

        title = None
        title_el = soup.find("h1", {"class": re.compile(r"dealTitle", re.I)})
        if not title_el:
            title_el = soup.find("h1")
        if title_el:
            title = title_el.get_text(strip=True)
        if not title:
            title = "Slickdeals Deal"

        # Find the "Go to Deal" link (the actual retailer link)
        deal_link = None
        go_btn = soup.find("a", {"class": re.compile(r"dealBtn|goToDeal", re.I)})
        if go_btn and go_btn.get("href"):
            deal_link = go_btn["href"]

        # Price
        price = None
        price_el = soup.find("span", {"class": re.compile(r"dealPrice", re.I)})
        if price_el:
            price = self.extract_price(price_el.get_text())

        # Store name
        store = None
        store_el = soup.find("a", {"class": re.compile(r"storeName|store", re.I)})
        if store_el:
            store = store_el.get_text(strip=True)

        # Thumbs up score
        score = None
        score_el = soup.find("span", {"class": re.compile(r"thumbScore|score", re.I)})
        if score_el:
            score = score_el.get_text(strip=True)

        return {
            "product_id": url,
            "title": title[:200],
            "price": price,
            "store": store,
            "score": score,
            "url": deal_link or url,
            "affiliate_url": deal_link or url,
            "site": "slickdeals",
            "source_url": url,
        }

    def scrape_deals(self):
        """Scrape Slickdeals front page for hot deals."""
        deals = []

        for page_url in [
            "https://slickdeals.net/deals/",
            "https://slickdeals.net/deals/frontpage/",
        ]:
            soup = self.fetch_page(page_url)
            if not soup:
                continue

            # Deal cards on the front page
            cards = soup.find_all("div", {"class": re.compile(r"dealCard|fpDeal|bp-p-dealCard", re.I)})
            if not cards:
                # Try alternate selectors
                cards = soup.find_all("li", {"class": re.compile(r"frontpage", re.I)})
            if not cards:
                cards = soup.find_all("div", {"data-role": "deal"})

            for card in cards[:25]:
                try:
                    # Title and link
                    link = card.find("a", {"class": re.compile(r"dealTitle|bp-c-card_title", re.I)})
                    if not link:
                        link = card.find("a", href=re.compile(r'/deals/|/f/', re.I))
                    if not link:
                        continue

                    href = link.get("href", "")
                    if not href.startswith("http"):
                        href = self.base_url + href

                    title = link.get_text(strip=True)
                    if not title or len(title) < 5:
                        continue

                    # Price
                    price = None
                    price_el = card.find("span", {"class": re.compile(r"dealPrice|bp-c-card_price", re.I)})
                    if price_el:
                        price = self.extract_price(price_el.get_text())

                    # Store
                    store = None
                    store_el = card.find("span", {"class": re.compile(r"storeName|bp-c-card_store", re.I)})
                    if not store_el:
                        store_el = card.find("a", {"class": re.compile(r"store", re.I)})
                    if store_el:
                        store = store_el.get_text(strip=True)

                    # Thumbs/score
                    score = None
                    score_el = card.find("span", {"class": re.compile(r"score|thumbs|bp-c-card_score", re.I)})
                    if score_el:
                        score = score_el.get_text(strip=True)

                    deals.append({
                        "product_id": href,
                        "title": title[:200],
                        "price": price,
                        "store": store,
                        "score": score,
                        "url": href,
                        "affiliate_url": href,
                        "site": "slickdeals",
                    })
                except Exception:
                    continue

        return deals
