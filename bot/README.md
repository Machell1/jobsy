# Deal Alert Bot

Multi-site price drop monitor that sends deal alerts to your Telegram channel with affiliate links. Fully controlled via **Telegram commands** and hosted 24/7 on **Railway**. Scans **Amazon, Best Buy, Walmart, Target, eBay** for price drops, **Slickdeals + DealNews** for curated deals, and **Groupon, Skyscanner, Expedia** for flights, holiday packages, birthday gifts, wedding deals, baby shower gifts, and party deals.

## Supported Sites

| Site | Type | Affiliate Program |
|---|---|---|
| **Amazon** | Product tracking + deals | [Amazon Associates](https://affiliate-program.amazon.com) |
| **Best Buy** | Product tracking + deals | [Impact Radius](https://impact.com) |
| **Walmart** | Product tracking + deals | [Impact Radius](https://impact.com) |
| **Target** | Product tracking + deals | [Impact Radius](https://impact.com) |
| **eBay** | Product tracking + deals | [eBay Partner Network](https://partnernetwork.ebay.com) |
| **Slickdeals** | Deal aggregator | Uses store affiliate links |
| **DealNews** | Deal aggregator | Uses store affiliate links |
| **Groupon** | Gifts, parties, events | [Impact Radius](https://impact.com) |
| **Skyscanner** | Flight deals | [Impact Radius](https://impact.com) |
| **Expedia** | Holiday packages | [CJ Affiliate](https://cj.com) |

## Setup & Deploy

### 1. Create a Telegram Bot & Channel
1. Message [@BotFather](https://t.me/BotFather) on Telegram, send `/newbot`
2. Copy the bot token
3. Create a Telegram channel (e.g., "Daily Deals & Drops")
4. Add your bot as a channel **administrator**
5. Get your Telegram user ID from [@userinfobot](https://t.me/userinfobot)

### 2. Sign Up for Affiliate Programs
- **Amazon**: [affiliate-program.amazon.com](https://affiliate-program.amazon.com) → tag like `yourtag-20`
- **Walmart/Best Buy/Target**: [impact.com](https://impact.com) → search for each store's program
- **eBay**: [partnernetwork.ebay.com](https://partnernetwork.ebay.com) → get your campaign ID
- **Groupon/Skyscanner**: [impact.com](https://impact.com) → search for each program
- **Expedia**: [cj.com](https://cj.com) → search for Expedia program

### 3. Configure Environment Variables
```bash
cp .env.example .env
```
Edit `.env` with your credentials (bot token, channel ID, affiliate tags).

### 4. Deploy to Railway (24/7 Hosting)

1. Push this repo to GitHub
2. Go to [railway.app](https://railway.app) and create a new project
3. Connect your GitHub repo, set the root directory to `bot/`
4. Add environment variables in Railway's dashboard:
   - `TELEGRAM_BOT_TOKEN` — your bot token
   - `TELEGRAM_CHANNEL_ID` — your channel ID
   - `ADMIN_USER_IDS` — your Telegram user ID (from step 1.5)
   - `DB_PATH` — `/data/deals.db`
   - Plus any affiliate tags you want
5. Add a **Volume** in Railway, mount it at `/data`
6. Deploy — the bot starts automatically and runs 24/7

The bot uses a `worker` process (not a web server), so it stays running continuously.

## Telegram Bot Commands

Control the bot entirely from Telegram:

| Command | Description |
|---|---|
| `/start`, `/help` | Show help and tracking stats |
| `/add <url>` | Track a product from any supported site |
| `/remove <id>` | Stop tracking a product |
| `/status` | Show all tracked products by site |
| `/check` | Check all prices immediately |
| `/deals` | Scan Slickdeals & DealNews now |
| `/lifestyle` | Scan flights, gifts, events, packages |
| `/flights` | Flight deals (Skyscanner) |
| `/birthday` | Birthday gift deals (Groupon) |
| `/wedding` | Wedding package deals (Groupon) |
| `/babyshower` | Baby shower deals (Groupon) |
| `/party` | Party deals (Groupon) |
| `/holidays` | Holiday packages (Expedia) |
| `/sites` | List supported sites |

### Adding Products
Send `/add` followed by a product URL from any supported site:
```
/add https://www.amazon.com/dp/B09V3KXJPB
/add https://www.bestbuy.com/site/some-product/1234567.p
/add https://www.walmart.com/ip/some-product/123456789
/add https://www.target.com/p/some-product/-/A-12345678
/add https://www.ebay.com/itm/123456789
```

## How It Works

### Product Tracking (Amazon, Best Buy, Walmart, Target, eBay)
1. You add product URLs via `/add` in Telegram
2. Bot checks prices on a schedule (default: every 60 minutes)
3. When a price drops 15%+ and $5+ (configurable), it sends a Telegram alert
4. The alert contains your **affiliate link** — you earn commission on purchases

### Deal Scanning (Slickdeals, DealNews)
1. Bot scrapes deal aggregator front pages every 2 hours
2. New deals are sent to your Telegram channel automatically
3. Covers deals from hundreds of stores (aggregators curate the best deals)

### Lifestyle & Travel Deals (Groupon, Skyscanner, Expedia)
1. Bot scans lifestyle deal sites every 3 hours automatically
2. Categories: flights, holiday packages, birthday gifts, wedding packages, baby shower gifts, party deals
3. Each deal includes your affiliate link for commission
4. Use category commands (/flights, /birthday, /wedding, etc.) for on-demand scans

## Revenue Strategy

### Commission Rates by Store
| Store | Commission Rate | Cookie Duration |
|---|---|---|
| Amazon | 1-10% (varies by category) | 24 hours |
| Best Buy | 1-7% | 1 day |
| Walmart | 1-4% | 3 days |
| Target | 1-8% | 7 days |
| eBay | 1-6% | 24 hours |
| Groupon | 6-12% | 1 day |
| Skyscanner | CPA (per booking) | Session |
| Expedia | 2-6% | 7 days |

### How to Maximize Revenue
1. **Track 50-100+ products** across all 5 stores
2. **Focus on high-ticket items** ($100+) for bigger commissions
3. **Promote your Telegram channel** on Reddit, Twitter, deal forums
4. **Run during deal events** (Prime Day, Black Friday) — set interval to 15 mins
5. **Use /deals** regularly — aggregator deals get the most engagement
6. **Use /lifestyle** to find flight, gift, and event deals — high commission categories
7. **Target seasonal events** — wedding season, holidays, baby showers drive big commissions

### Revenue Potential
| Channel Subscribers | Monthly Clicks | Estimated Commission |
|---|---|---|
| 100 | 200 | $50-200 |
| 1,000 | 2,000 | $500-2,000 |
| 10,000 | 20,000 | $5,000-20,000 |

## File Structure

```
bot/
├── telegram_bot.py      # Telegram bot entry point
├── main.py              # CLI entry point (local debugging only)
├── scraper.py           # Multi-site scraper router
├── tracker.py           # Deal detection and product management
├── notifier.py          # Telegram alert formatting and sending
├── database.py          # SQLite storage for prices and deals
├── config.py            # Configuration loader
├── requirements.txt     # Python dependencies
├── Dockerfile           # Docker container config (Railway)
├── Procfile             # Process type for Railway
├── .env.example         # Config template
├── sample_watchlist.txt # Example product list
└── scrapers/
    ├── __init__.py      # Scraper registry and auto-detection
    ├── base.py          # Base scraper class
    ├── amazon.py        # Amazon scraper
    ├── bestbuy.py       # Best Buy scraper
    ├── walmart.py       # Walmart scraper
    ├── target.py        # Target scraper
    ├── ebay.py          # eBay scraper
    ├── groupon.py       # Groupon (gifts, parties, events)
    ├── skyscanner.py    # Skyscanner (flight deals)
    ├── expedia.py       # Expedia (holiday packages)
    ├── slickdeals.py    # Slickdeals aggregator
    └── dealnews.py      # DealNews aggregator
```

## Local Development

For local testing, you can run the bot directly:
```bash
cd bot
pip install -r requirements.txt
python telegram_bot.py
```
