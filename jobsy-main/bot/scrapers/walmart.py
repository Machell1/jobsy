"""Walmart product scraper."""

import re
from scrapers.base import BaseScraper

try:
    from config import WALMART_AFFILIATE_TAG
except ImportError:
    WALMART_AFFILIATE_TAG = ""


class WalmartScraper(BaseScraper):
    site_name = "Walmart"
    base_url = "https://www.walmart.com"

    def extract_product_id(self, url):
        """Extract product ID from Walmart URL."""
        match = re.search(r'/ip/[^/]+/(\d+)', url)
        if match:
            return match.group(1)
        match = re.search(r'/ip/(\d+)', url)
        if match:
            return match.group(1)
        return None

    def build_affiliate_url(self, url):
        """Build Walmart affiliate URL via Impact Radius."""
        if WALMART_AFFILIATE_TAG:
            return f"https://goto.walmart.com/c/{WALMART_AFFILIATE_TAG}/568844/9383?veh=aff&sourceid=imp&u={url}"
        return url

    def scrape_product(self, url):
        """Scrape a Walmart product page."""
        product_id = self.extract_product_id(url)
        soup = self.fetch_page(url)
        if not soup:
            return None

        # Title
        title = None
        title_el = soup.find("h1", {"itemprop": "name"})
        if not title_el:
            title_el = soup.find("h1")
        if title_el:
            title = title_el.get_text(strip=True)
        if not title:
            title = f"Walmart Product {product_id or 'Unknown'}"

        # Price - Walmart uses various price containers
        price = None
        price_selectors = [
            ("span", {"itemprop": "price"}),
            ("span", {"class": re.compile(r"price-characteristic", re.I)}),
            ("div", {"class": re.compile(r"price-group", re.I)}),
            ("span", {"data-automation-id": "product-price"}),
        ]
        for tag, attrs in price_selectors:
            el = soup.find(tag, attrs)
            if el:
                # Check for content attribute first (structured data)
                if el.get("content"):
                    price = self.extract_price(el["content"])
                else:
                    price = self.extract_price(el.get_text())
                if price:
                    break

        # Was price / original price
        original_price = None
        was_el = soup.find("span", {"class": re.compile(r"was-price|strike-through", re.I)})
        if was_el:
            original_price = self.extract_price(was_el.get_text())

        # Image
        image_url = None
        img_el = soup.find("img", {"class": re.compile(r"db", re.I), "src": re.compile(r"i5\.walmartimages")})
        if not img_el:
            img_el = soup.find("img", {"data-testid": re.compile(r"hero-image", re.I)})
        if img_el and img_el.get("src"):
            image_url = img_el["src"]

        return {
            "product_id": product_id or url,
            "title": title[:200],
            "price": price,
            "original_price": original_price,
            "image_url": image_url,
            "url": url,
            "affiliate_url": self.build_affiliate_url(url),
            "site": "walmart",
        }

    def scrape_deals(self):
        """Scrape Walmart's rollback and flash deals."""
        deals = []

        for deals_url in [
            "https://www.walmart.com/shop/deals",
            "https://www.walmart.com/shop/flash-deals",
        ]:
            soup = self.fetch_page(deals_url)
            if not soup:
                continue

            # Look for product cards in the deals grid
            items = soup.find_all("div", {"data-item-id": True})
            if not items:
                items = soup.find_all("div", {"class": re.compile(r"product-card|search-result", re.I)})

            for item in items[:20]:
                try:
                    link = item.find("a", href=re.compile(r'/ip/'))
                    if not link:
                        continue

                    href = link.get("href", "")
                    if not href.startswith("http"):
                        href = self.base_url + href

                    title = link.get_text(strip=True)
                    if not title or len(title) < 3:
                        title_el = item.find("span", {"class": re.compile(r"product-title|w_V", re.I)})
                        title = title_el.get_text(strip=True) if title_el else "Walmart Deal"

                    product_id = self.extract_product_id(href)

                    price_el = item.find("div", {"class": re.compile(r"price-group", re.I)})
                    price = self.extract_price(price_el.get_text()) if price_el else None

                    was_el = item.find("span", {"class": re.compile(r"was-price|strike", re.I)})
                    original_price = self.extract_price(was_el.get_text()) if was_el else None

                    deals.append({
                        "product_id": product_id or href,
                        "title": title[:200],
                        "price": price,
                        "original_price": original_price,
                        "url": href,
                        "affiliate_url": self.build_affiliate_url(href),
                        "site": "walmart",
                    })
                except Exception:
                    continue

        return deals
