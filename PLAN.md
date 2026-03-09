# Jobsy - Project Completion Plan

## Overview
Jobsy is Jamaica's service marketplace platform with a microservices backend (FastAPI), React Native mobile app (Expo), and static website. The backend services are 85-95% complete with working routes and models. The main gaps are: database migrations, chat WebSocket, mobile screen stubs, test coverage, CI/CD, and website-backend integration.

---

## Phase 1: Cleanup & Foundation

### 1.1 Remove Legacy Content
- Delete `/categories/` directory (9 old AI tool pages from AIToolsHub)
- Delete `/tools/` directory (17 old AI tool pages)
- Update `sitemap.xml` to remove old AI tool URLs
- Clean up any remaining "AIToolsHub" references in HTML/JS

### 1.2 Database Migrations
- `/jobsy/alembic/versions/` is empty — no migration files exist
- Generate initial Alembic migration from all existing SQLAlchemy models:
  - `alembic revision --autogenerate -m "initial_schema"`
- Models already exist for: gateway (users), profiles, listings, swipes, matches, chat (messages/conversations), payments (transactions/payouts), reviews, notifications, advertising, admin (reports/audit_logs)
- `env.py` is already configured to import all service models
- Verify migration applies cleanly with `alembic upgrade head`

### 1.3 Environment & Configuration
- Create `.env.example` with all required environment variables
- Document required secrets (JWT_SECRET, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, S3/MinIO credentials, Firebase credentials)
- Docker health checks already exist in docker-compose.yml — verify they work

---

## Phase 2: Backend Gaps (Targeted Fixes)

The backend is mostly complete. These are the specific gaps:

### 2.1 Gateway — Rate Limiting
- Rate limiting middleware is stubbed but not connected to Redis
- Wire up Redis-backed rate limiting per endpoint
- Configure limits: auth endpoints (5/min), general API (60/min), search (30/min)

### 2.2 Chat Service — WebSocket Support
- Currently REST-only (conversations, messages, mark-read endpoints work)
- Mobile app polls every 10s — inefficient
- Add WebSocket endpoint at `/ws/chat/{conversation_id}`
- Implement: connection auth via JWT, real-time message delivery, typing indicators
- Keep REST endpoints as fallback

### 2.3 Notifications — Event Consumers
- Push notification delivery configured (Firebase/Expo) but RabbitMQ consumers need wiring
- Add consumers for: new_match, new_message, payment_received, review_posted events
- Connect to existing event publishing in swipes, chat, payments, reviews services

### 2.4 Search — Index Sync
- Elasticsearch integration exists with fuzzy matching
- Add automatic index sync when listings are created/updated/deleted
- Add RabbitMQ consumer to reindex on listing events

---

## Phase 3: Mobile App — Complete Stub Screens

Auth screens (login/register) and core tabs (discover/swipe, chat list, profile view, payment history) are implemented. These screens are stubs:

### 3.1 Listing Screens
- `listing/create.tsx` — Form with title, description, category picker, parish picker, pricing, photo upload
- `listing/[id].tsx` — Full listing detail view with provider info, gallery, reviews, book/contact CTAs
- `listing/my-listings.tsx` — Provider's listing management (edit, pause, delete)

### 3.2 Chat Message Screen
- `chat/[id].tsx` — Individual conversation view with message bubbles, text input, WebSocket connection
- Use existing ChatBubble component
- Integrate with useWebSocket hook

### 3.3 Search Screen
- `search.tsx` — Search input, category/parish filters, results list using ListingCard component
- Connect to `/api/search` endpoint

### 3.4 Profile Screens
- `profile/edit.tsx` — Edit bio, skills, photo, parish, availability
- `profile/[id].tsx` — View other user's profile with reviews, listings, contact CTA

### 3.5 Payment Screens
- `payments/setup.tsx` — Stripe Connect onboarding for providers
- `payments/pay.tsx` — Payment flow: select amount → Stripe checkout → confirmation

### 3.6 Review Screen
- `reviews/write.tsx` — Star rating input, text review, submit

### 3.7 Matches Screen Enhancement
- `matches.tsx` — Already exists, enhance with unmatch/block actions and "Message" navigation

---

## Phase 4: Testing

Currently only 4 test suites exist (gateway auth, payments, reviews, admin). Need coverage for remaining 10 services.

### 4.1 Unit Tests (Priority Order)
1. Profiles — CRUD, validation, photo upload
2. Listings — CRUD, feed, filtering, status management
3. Swipes — Record swipe, duplicate prevention, event publishing
4. Matches — Mutual match detection, status updates
5. Chat — Messages, conversations, mark-read
6. Search — Index operations, query building, faceted search
7. Notifications — Device registration, event consumers
8. Recommendations — Feed ranking, preference tracking
9. Geoshard — S2 cell calculations, parish mapping
10. Storage — Upload/download, validation, presigned URLs

### 4.2 Integration Tests
- Auth flow: register → login → access protected route
- Core flow: create listing → search → swipe → match → chat → pay → review
- Payment flow: Stripe checkout → webhook → payout

---

## Phase 5: Website Frontend

### 5.1 Remove Old Pages & Update Sitemap
- Delete `/categories/*.html` and `/tools/*.html`
- Update sitemap.xml to only include Jobsy service pages

### 5.2 Connect to Backend API
- Replace hardcoded `TOOLS[]` and `CATEGORIES[]` in `common.js` with fetch calls to `/api/listings` and `/api/search`
- Add loading states and error handling
- Add parish-based filtering (parishes are currently display-only tags)

### 5.3 Service Provider Detail Pages
- Create `/provider.html` template that loads provider data by ID from URL param
- Display: profile, listings, reviews, gallery, contact info
- Add "Download App" CTA for mobile

### 5.4 Provider Registration Form
- Upgrade `contact.html` with actual registration form
- Connect to gateway `/auth/register` with role=provider
- Add listing creation wizard

### 5.5 New Category Pages
- Create dynamic `/category.html` template
- Load listings by category from API
- Replace old AI tool category pages

### 5.6 SEO
- Update meta descriptions, OG tags across all pages
- Add JSON-LD structured data for LocalBusiness schema
- Generate clean sitemap.xml

---

## Phase 6: CI/CD & DevOps

### 6.1 GitHub Actions
- `.github/workflows/test.yml` — Run pytest on PR (all services)
- `.github/workflows/lint.yml` — Ruff for Python, ESLint for TypeScript
- `.github/workflows/build.yml` — Build Docker images
- `.github/workflows/deploy.yml` — Deploy to Railway on main branch merge

### 6.2 Docker Optimization
- Multi-stage Dockerfiles for smaller images
- Add `docker-compose.prod.yml` with production settings

### 6.3 Monitoring
- Structured JSON logging across all services
- Sentry error tracking integration
- Health check dashboard

---

## Phase 7: Production Hardening

### 7.1 Security
- Complete rate limiting (Phase 2.1)
- CORS whitelisting for www.jobsyja.com and mobile app
- Verify Pydantic validation coverage on all endpoints
- Secrets management via Railway environment variables

### 7.2 Performance
- Redis caching for popular listings, search results, feed
- Database connection pool tuning
- Pagination verification on all list endpoints
- Image thumbnail pipeline in storage service

### 7.3 Reliability
- Graceful shutdown handlers
- Dead letter queue for failed RabbitMQ messages
- Database backup configuration
- Circuit breaker for inter-service HTTP calls

---

## Phase 8: Launch Preparation

### 8.1 Seed Data
- Script to populate sample providers across all 10 categories and 14 parishes
- Demo user accounts for testing

### 8.2 Documentation
- Update README.md with architecture diagram, setup guide, API docs link
- FastAPI auto-generates OpenAPI/Swagger — ensure all endpoints are documented
- Deployment runbook for Railway

### 8.3 App Store
- EAS build configuration for iOS and Android
- App store metadata, screenshots, descriptions
- Privacy policy and terms of service pages

### 8.4 DNS
- Verify www.jobsyja.com → GitHub Pages
- Configure api.jobsyja.com → Railway gateway
- SSL certificates

---

## Execution Priority

Highest-impact order if working sequentially:

| Step | Phase | What | Why |
|------|-------|------|-----|
| 1 | 1.1 | Remove legacy content | Clean foundation |
| 2 | 1.2 | Generate Alembic migrations | Database can't evolve without this |
| 3 | 2.2 | Chat WebSocket | Core marketplace interaction |
| 4 | 3.1-3.6 | Mobile stub screens | User-facing product |
| 5 | 4.1-4.2 | Tests for profiles, listings, swipes, matches, chat | Confidence in core flows |
| 6 | 2.1 | Gateway rate limiting | Security baseline |
| 7 | 2.3-2.4 | Notification consumers + search sync | Event-driven features work |
| 8 | 5.1-5.6 | Website integration | Second channel |
| 9 | 6.1 | CI/CD | Development velocity |
| 10 | 7-8 | Hardening & launch | Production readiness |
