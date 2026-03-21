"""Best Buy product scraper."""

import re
from scrapers.base import BaseScraper


class BestBuyScraper(BaseScraper):
    site_name = "Best Buy"
    base_url = "https://www.bestbuy.com"

    def extract_sku(self, url):
        """Extract SKU ID from a Best Buy URL."""
        match = re.search(r'/(\d{7})\.p', url)
        if match:
            return match.group(1)
        match = re.search(r'skuId=(\d+)', url)
        if match:
            return match.group(1)
        return None

    def build_affiliate_url(self, url):
        """Best Buy affiliate links use Impact Radius or CJ Affiliate."""
        # For now, return direct URL. User replaces with their affiliate link format.
        return url

    def scrape_product(self, url):
        """Scrape a Best Buy product page."""
        sku = self.extract_sku(url)
        soup = self.fetch_page(url)
        if not soup:
            return None

        # Title
        title = None
        title_el = soup.find("h1", {"class": re.compile(r"heading|title", re.I)})
        if not title_el:
            title_el = soup.find("h1")
        if title_el:
            title = title_el.get_text(strip=True)
        if not title:
            title = f"Best Buy Product {sku or 'Unknown'}"

        # Price
        price = None
        price_selectors = [
            ("div", {"class": re.compile(r"priceView-hero-price", re.I)}),
            ("div", {"class": re.compile(r"pricing-price", re.I)}),
            ("span", {"class": re.compile(r"sr-only", re.I)}),
        ]
        for tag, attrs in price_selectors:
            el = soup.find(tag, attrs)
            if el:
                price_text = el.get_text(strip=True)
                price = self.extract_price(price_text)
                if price:
                    break

        # Try finding price in a aria-label or data attribute
        if not price:
            price_span = soup.find("span", {"aria-hidden": "true"}, string=re.compile(r'\$[\d,]+\.\d{2}'))
            if price_span:
                price = self.extract_price(price_span.get_text())

        # Original/was price
        original_price = None
        was_el = soup.find("div", {"class": re.compile(r"pricing-price__regular-price", re.I)})
        if was_el:
            original_price = self.extract_price(was_el.get_text())

        # Image
        image_url = None
        img_el = soup.find("img", {"class": re.compile(r"primary-image|product-image", re.I)})
        if img_el and img_el.get("src"):
            image_url = img_el["src"]

        return {
            "product_id": sku or url,
            "title": title[:200],
            "price": price,
            "original_price": original_price,
            "image_url": image_url,
            "url": url,
            "affiliate_url": self.build_affiliate_url(url),
            "site": "bestbuy",
        }

    def scrape_deals(self):
        """Scrape Best Buy's deal of the day and top deals."""
        deals = []

        for deals_url in [
            "https://www.bestbuy.com/site/misc/deal-of-the-day/pcmcat248000050016.c",
            "https://www.bestbuy.com/site/misc/top-deals/pcmcat702300050016.c",
        ]:
            soup = self.fetch_page(deals_url)
            if not soup:
                continue

            items = soup.find_all("li", {"class": re.compile(r"sku-item", re.I)})
            for item in items[:15]:
                try:
                    link = item.find("a", {"class": re.compile(r"sku-title", re.I)})
                    if not link:
                        link = item.find("a", href=re.compile(r'/site/'))
                    if not link:
                        continue

                    href = link.get("href", "")
                    if not href.startswith("http"):
                        href = self.base_url + href

                    title = link.get_text(strip=True)
                    sku = self.extract_sku(href)

                    # Current price
                    price_el = item.find("div", {"class": re.compile(r"priceView-hero-price", re.I)})
                    price = self.extract_price(price_el.get_text()) if price_el else None

                    # Original price
                    orig_el = item.find("div", {"class": re.compile(r"pricing-price__regular", re.I)})
                    original_price = self.extract_price(orig_el.get_text()) if orig_el else None

                    deals.append({
                        "product_id": sku or href,
                        "title": title[:200],
                        "price": price,
                        "original_price": original_price,
                        "url": href,
                        "affiliate_url": self.build_affiliate_url(href),
                        "site": "bestbuy",
                    })
                except Exception:
                    continue

        return deals
