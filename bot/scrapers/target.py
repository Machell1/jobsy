"""Target product scraper."""

import re
from scrapers.base import BaseScraper

try:
    from config import TARGET_AFFILIATE_TAG
except ImportError:
    TARGET_AFFILIATE_TAG = ""


class TargetScraper(BaseScraper):
    site_name = "Target"
    base_url = "https://www.target.com"

    def extract_dpci(self, url):
        """Extract DPCI/TCIN from Target URL."""
        match = re.search(r'A-(\d+)', url)
        if match:
            return match.group(1)
        match = re.search(r'/p/[^/]+-/A-(\d+)', url)
        if match:
            return match.group(1)
        return None

    def build_affiliate_url(self, url):
        """Build Target affiliate URL via Impact Radius."""
        if TARGET_AFFILIATE_TAG:
            return f"https://goto.target.com/c/{TARGET_AFFILIATE_TAG}/81938/2092?u={url}"
        return url

    def scrape_product(self, url):
        """Scrape a Target product page."""
        tcin = self.extract_dpci(url)
        soup = self.fetch_page(url)
        if not soup:
            return None

        # Title
        title = None
        title_el = soup.find("h1", {"data-test": "product-title"})
        if not title_el:
            title_el = soup.find("h1")
        if title_el:
            title = title_el.get_text(strip=True)
        if not title:
            title = f"Target Product {tcin or 'Unknown'}"

        # Price
        price = None
        price_selectors = [
            ("span", {"data-test": "product-price"}),
            ("div", {"data-test": "product-price"}),
            ("span", {"class": re.compile(r"style__PriceFontSize", re.I)}),
        ]
        for tag, attrs in price_selectors:
            el = soup.find(tag, attrs)
            if el:
                price = self.extract_price(el.get_text())
                if price:
                    break

        # Also look in JSON-LD structured data
        if not price:
            import json
            scripts = soup.find_all("script", {"type": "application/ld+json"})
            for script in scripts:
                try:
                    data = json.loads(script.string)
                    if isinstance(data, dict):
                        offers = data.get("offers", {})
                        if isinstance(offers, dict) and offers.get("price"):
                            price = float(offers["price"])
                            break
                        elif isinstance(offers, list) and offers:
                            price = float(offers[0].get("price", 0))
                            break
                except (json.JSONDecodeError, ValueError, TypeError):
                    continue

        # Original price
        original_price = None
        orig_el = soup.find("span", {"data-test": "product-regular-price"})
        if orig_el:
            original_price = self.extract_price(orig_el.get_text())

        # Image
        image_url = None
        img_el = soup.find("img", {"data-test": "product-image"})
        if not img_el:
            img_el = soup.find("img", {"class": re.compile(r"slide--image", re.I)})
        if img_el and img_el.get("src"):
            image_url = img_el["src"]

        return {
            "product_id": tcin or url,
            "title": title[:200],
            "price": price,
            "original_price": original_price,
            "image_url": image_url,
            "url": url,
            "affiliate_url": self.build_affiliate_url(url),
            "site": "target",
        }

    def scrape_deals(self):
        """Scrape Target's deals and clearance pages."""
        deals = []

        for deals_url in [
            "https://www.target.com/c/top-deals/-/N-2bh0d",
            "https://www.target.com/c/clearance/-/N-55e69",
        ]:
            soup = self.fetch_page(deals_url)
            if not soup:
                continue

            items = soup.find_all("div", {"data-test": re.compile(r"product-card", re.I)})
            if not items:
                items = soup.find_all("li", {"class": re.compile(r"Col-", re.I)})

            for item in items[:20]:
                try:
                    link = item.find("a", href=re.compile(r'/p/'))
                    if not link:
                        continue

                    href = link.get("href", "")
                    if not href.startswith("http"):
                        href = self.base_url + href

                    title = link.get_text(strip=True)
                    if not title or len(title) < 3:
                        title_el = item.find("a", {"data-test": "product-title"})
                        title = title_el.get_text(strip=True) if title_el else "Target Deal"

                    tcin = self.extract_dpci(href)

                    price_el = item.find("span", {"data-test": "current-price"})
                    price = self.extract_price(price_el.get_text()) if price_el else None

                    orig_el = item.find("span", {"data-test": "previous-price"})
                    original_price = self.extract_price(orig_el.get_text()) if orig_el else None

                    deals.append({
                        "product_id": tcin or href,
                        "title": title[:200],
                        "price": price,
                        "original_price": original_price,
                        "url": href,
                        "affiliate_url": self.build_affiliate_url(href),
                        "site": "target",
                    })
                except Exception:
                    continue

        return deals
