# Jobsy - Jamaica's Service Marketplace

Jobsy connects Jamaicans with trusted local service providers across all 14 parishes. From home repair and beauty services to tutoring and events -find the right professional for every job.

## Architecture

```
┌─────────────┐     ┌──────────────────────────────────────────────┐
│  Mobile App  │────▶│               API Gateway                    │
│ (React Native│     │  (Auth, Rate Limiting, JWT, Proxy Routes)    │
│   + Expo)    │     └──────────┬───────────────────────────────────┘
└─────────────┘                 │
                    ┌───────────┴───────────────┐
                    │       Service Mesh         │
      ┌─────────┬──┴──┬────────┬────────┬───────┴──────┐
      ▼         ▼     ▼        ▼        ▼              ▼
 ┌─────────┐┌──────┐┌──────┐┌──────┐┌────────┐┌────────────┐
 │Profiles ││Listings│Swipes││Matches│Chat    ││Payments    │
 │         ││      ││      ││      ││(WS+REST)││(Stripe)    │
 └────┬────┘└──┬───┘└──┬───┘└──┬───┘└───┬────┘└─────┬──────┘
      │        │       │       │        │            │
      ▼        ▼       ▼       ▼        ▼            ▼
 ┌──────────────────────────────────────────────────────────┐
 │                     PostgreSQL                           │
 └──────────────────────────────────────────────────────────┘
      │        │       │       │        │            │
      ▼        ▼       ▼       ▼        ▼            ▼
 ┌──────────────────┐ ┌───────────────┐ ┌───────────────────┐
 │   RabbitMQ       │ │    Redis      │ │  Elasticsearch    │
 │ (Event Bus)      │ │ (Cache/Rate)  │ │ (Full-text Search)│
 └──────────────────┘ └───────────────┘ └───────────────────┘

Supporting Services: Reviews, Notifications, Search,
Recommendations, Geoshard, Advertising, Admin, Storage
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Mobile App** | React Native, Expo Router, TypeScript, Zustand, TanStack Query |
| **API Gateway** | FastAPI, httpx proxy, JWT auth, Redis rate limiting |
| **Backend Services** | FastAPI, SQLAlchemy 2.0 (async), Pydantic v2 |
| **Database** | PostgreSQL (asyncpg) |
| **Message Bus** | RabbitMQ (aio-pika, topic exchange with DLQ) |
| **Cache** | Redis (rate limiting, session cache, WebSocket pub/sub) |
| **Search** | Elasticsearch (fuzzy matching, geo-filtered) |
| **Payments** | Stripe Connect (JMD transactions, provider payouts) |
| **Storage** | MinIO / S3 (presigned uploads, image pipeline) |
| **CI/CD** | GitHub Actions (pytest, ESLint, TypeScript check) |
| **Hosting** | GitHub Pages (website), Railway (backend) |

## Services (14)

| Service | Port | Description |
|---------|------|-------------|
| **Gateway** | 8000 | Auth, rate limiting, request routing to all services |
| **Profiles** | 8001 | User profiles with skills, parish, availability |
| **Listings** | 8002 | Service listings with categories, pricing, search |
| **Swipes** | 8003 | Tinder-style swipe on listings/profiles |
| **Matches** | 8004 | Mutual match detection and status management |
| **Chat** | 8005 | REST + WebSocket messaging with read receipts |
| **Notifications** | 8006 | Push notifications via Firebase/Expo |
| **Payments** | 8007 | Stripe Connect payments, payouts, transactions |
| **Reviews** | 8008 | Star ratings, text reviews, provider responses |
| **Search** | 8009 | Elasticsearch full-text and geo search |
| **Recommendations** | 8010 | Ranked feed based on preferences and behavior |
| **Geoshard** | 8011 | S2 cell spatial indexing, parish boundaries |
| **Advertising** | 8012 | Campaign management, ad serving, impression tracking |
| **Admin** | 8013 | Content moderation, user management, audit log |

## Quick Start

### Prerequisites

- Python 3.11+
- Docker & Docker Compose
- Node.js 18+ (for mobile app)

### Backend

```bash
# Start infrastructure
docker-compose up -d postgres redis rabbitmq

# Run migrations
cd jobsy
alembic upgrade head

# Seed sample data (10 providers, 20 listings, 3 customers)
python -m scripts.seed_data

# Start gateway (all services accessible via port 8000)
uvicorn gateway.app.main:app --reload --port 8000
```

### All Services (Docker)

```bash
docker-compose up --build
```

### Mobile App

```bash
cd jobsy/mobile
npm install
npx expo start
```

### Run Tests

```bash
cd jobsy
pip install -r requirements-test.txt
pytest
```

94 tests across 7 services: gateway auth, profiles, listings, swipes, matches, chat, payments.

## Service Categories

- Home Services (Plumbing, Electrical, Renovations)
- Beauty & Wellness (Hair, Nails, Massage)
- Tutoring & Education (CXC/CAPE Prep, Languages)
- Technology (Web Development, IT Support)
- Automotive (Repair, Detailing, AC Service)
- Events & Entertainment (Weddings, Photography)
- Health & Fitness (Personal Training, Nutrition)
- Professional Services (Accounting, Legal, Tax)
- Skilled Trades (Electrical, Carpentry, Welding)
- Creative Services (Graphic Design, Branding)

## Jamaican Parishes

All 14 parishes supported: Kingston, St. Andrew, St. Thomas, Portland, St. Mary, St. Ann, Trelawny, St. James, Hanover, Westmoreland, St. Elizabeth, Manchester, Clarendon, St. Catherine.

## API Documentation

Each service auto-generates OpenAPI docs:
- Gateway: `http://localhost:8000/docs`
- Individual services: `http://localhost:{port}/docs`

## Contact

- **Website**: [www.jobsyja.com](https://www.jobsyja.com)
- **Email**: jobsyja@jobsyja.com
- **Twitter/X**: [@MachellWil66296](https://x.com/MachellWil66296)

## License

Copyright 2026 Machell Deals. All rights reserved.
