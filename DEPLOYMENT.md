# Jobsy — Production Deployment Guide

Deploy the Jobsy service marketplace to Railway with PostgreSQL and Redis.

---

## Prerequisites

- [Railway account](https://railway.app) (free tier works for MVP)
- Railway CLI: `npm i -g @railway/cli`
- DNS access for `api.jobsyja.com` (optional — Railway provides a public URL)
- Docker (for local development only)

---

## Option 1: Quick Deploy (Automated)

```bash
cd jobsy
bash scripts/deploy.sh
```

This script will:
1. Check for Railway CLI and authentication
2. Create a Railway project and provision PostgreSQL + Redis
3. Set environment variables (generates a secure JWT secret)
4. Deploy the gateway service
5. Run database migrations and seed sample data
6. Output your public URL

---

## Option 2: Manual Step-by-Step

### Step 1: Create Railway Project

```bash
railway login
railway init --name jobsy
```

### Step 2: Add Database Plugins

In the [Railway dashboard](https://railway.app/dashboard):

1. Click **+ New** → **Database** → **PostgreSQL**
2. Click **+ New** → **Database** → **Redis**

Railway automatically sets `DATABASE_URL` and `REDIS_URL` for connected services.

### Step 3: Set Environment Variables

In the Railway dashboard, go to your service → **Variables** and add:

| Variable | Value | Required |
|----------|-------|----------|
| `JWT_SECRET` | `openssl rand -base64 32` | Yes |
| `RAILWAY_ENVIRONMENT` | `production` | Yes |
| `PYTHONPATH` | `/app` | Yes |
| `RABBITMQ_URL` | CloudAMQP URL (if using events) | No |
| `ELASTICSEARCH_URL` | Bonsai URL (if using search) | No |
| `STRIPE_SECRET_KEY` | Stripe test/live key | No |
| `TWILIO_ACCOUNT_SID` | Twilio SID (for SMS reset) | No |
| `TWILIO_AUTH_TOKEN` | Twilio token | No |
| `TWILIO_PHONE_NUMBER` | Twilio phone number | No |

### Step 4: Deploy

```bash
cd jobsy
railway up --detach
```

This builds from `gateway/Dockerfile` and deploys the API gateway.

### Step 5: Run Migrations

```bash
railway run alembic upgrade head
```

### Step 6: Seed Database

```bash
railway run python -m scripts.seed_data
```

This creates 10 service providers with 20 listings across Jamaica.

### Step 7: Generate Public URL

```bash
railway domain
```

---

## DNS Configuration

To use a custom domain (`api.jobsyja.com`):

1. In Railway dashboard → **Settings** → **Custom Domain** → Add `api.jobsyja.com`
2. In your DNS provider, add a CNAME record:
   ```
   api.jobsyja.com  →  <your-railway-url>
   ```
3. Wait for DNS propagation (usually 5-15 minutes)
4. Railway auto-provisions an SSL certificate

---

## Verify Deployment

```bash
# Health check
curl https://api.jobsyja.com/health
# Expected: {"status":"ok","service":"gateway"}

# Public listings (no auth needed)
curl https://api.jobsyja.com/api/listings
# Expected: Array of listing objects

# Newsletter subscribe
curl -X POST https://api.jobsyja.com/api/notifications/subscribe \
  -H 'Content-Type: application/json' \
  -d '{"email":"test@example.com"}'
# Expected: {"status":"subscribed","email":"test@example.com"}

# Login with seed data
curl -X POST https://api.jobsyja.com/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"phone":"+18761234501","password":"DemoPass123!"}'
# Expected: {"access_token":"...","refresh_token":"..."}
```

---

## Frontend (GitHub Pages)

The frontend is already configured for GitHub Pages:

1. Go to GitHub repo → **Settings** → **Pages**
2. Source: Deploy from branch `main`, root `/`
3. The `CNAME` file already points to `www.jobsyja.com`
4. The frontend auto-detects the API URL based on hostname:
   - `localhost` → `http://localhost:8000`
   - Production → `https://api.jobsyja.com`

---

## Local Development

```bash
cd jobsy

# Quick setup (creates .env, starts Postgres/Redis, runs migrations + seed)
bash scripts/setup-local.sh

# Start all 14+ services
make dev

# View logs
make logs

# Run tests
make test
```

---

## Architecture

```
www.jobsyja.com (GitHub Pages)
        │
        ▼
api.jobsyja.com (Railway)
        │
   ┌────┴────┐
   │ Gateway  │ ← FastAPI + JWT auth + rate limiting
   └────┬────┘
        │ Internal proxy
        ▼
  ┌──────────────────────────────────────┐
  │  listings  │  profiles  │  search    │
  │  reviews   │  payments  │  chat      │
  │  notifications │ storage │ admin     │
  │  swipes    │  matches   │  geo       │
  │  recommendations │ advertising       │
  └──────────────────────────────────────┘
        │
   PostgreSQL + Redis + RabbitMQ + Elasticsearch
```

For MVP, only the **gateway** needs to be deployed — it handles auth, listings, profiles, and search directly via the shared database. The microservice architecture allows scaling individual services later.

---

## Seed Data Accounts

| Name | Phone | Category | Parish |
|------|-------|----------|--------|
| Marcus Brown | +18761234501 | Skilled Trades | Kingston |
| Keisha Williams | +18761234502 | Beauty & Wellness | St. Andrew |
| Devon Clarke | +18761234503 | Technology | St. James |
| Shannakay Reid | +18761234504 | Tutoring & Education | Manchester |
| Andre Thompson | +18761234505 | Automotive | St. Catherine |
| Tamara Johnson | +18761234506 | Events & Entertainment | Portland |
| Ricardo Grant | +18761234507 | Home Services | St. Ann |
| Natalie Campbell | +18761234508 | Health & Fitness | Clarendon |
| Christopher Davis | +18761234509 | Professional Services | Westmoreland |
| Simone Edwards | +18761234510 | Creative Services | Trelawny |

All accounts use password: **DemoPass123!**
