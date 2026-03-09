# Jobsy - Project Completion Plan

## Overview
Jobsy is Jamaica's service marketplace platform. The architecture is in place but many components are incomplete. This plan organizes remaining work into 8 phases, ordered by dependency and impact.

---

## Phase 1: Cleanup & Foundation (Day 1)

### 1.1 Remove Legacy Content
- Delete `/categories/` directory (9 old AI tool pages)
- Delete `/tools/` directory (17 old AI tool pages)
- Update `sitemap.xml` to remove old AI tool URLs
- Clean up any remaining "AIToolsHub" references

### 1.2 Database Migrations
- Generate initial Alembic migration files from existing SQLAlchemy models
- Create migration for gateway (users table)
- Create migration for profiles (profiles table)
- Create migration for listings (listings table)
- Create migration for swipes (swipes table)
- Create migration for matches (matches table)
- Create migration for chat (messages, conversations tables)
- Create migration for payments (payments, payouts tables)
- Create migration for reviews (reviews table)
- Create migration for notifications (notifications table)
- Create migration for advertising (ads table)
- Create migration for admin (reports, audit_logs tables)
- Add migration runner to Makefile and docker-compose startup

### 1.3 Environment & Configuration
- Create `.env.example` with all required environment variables
- Document required secrets (Stripe keys, JWT secret, S3 credentials)
- Ensure docker-compose.yml has proper health checks for all infrastructure services

---

## Phase 2: Complete Backend Microservices (Days 2-4)

### 2.1 API Gateway - Proxy Routing
- Add proxy routes to forward requests to all microservices:
  - `/api/profiles/*` → profiles service
  - `/api/listings/*` → listings service
  - `/api/swipes/*` → swipes service
  - `/api/matches/*` → matches service
  - `/api/chat/*` → chat service
  - `/api/payments/*` → payments service
  - `/api/reviews/*` → reviews service
  - `/api/search/*` → search service
  - `/api/notifications/*` → notifications service
  - `/api/recommendations/*` → recommendations service
  - `/api/storage/*` → storage service
  - `/api/ads/*` → advertising service
  - `/api/admin/*` → admin service
- Add request/response middleware (auth header forwarding, error handling)
- Add CORS configuration for web and mobile clients

### 2.2 Profiles Service - Completion
- Verify CRUD endpoints for provider and user profiles
- Add profile photo upload (via storage service)
- Add skills/certifications management for providers
- Add parish/location data to profiles
- Add availability schedule endpoint

### 2.3 Listings Service - Completion
- Verify CRUD for service listings
- Add image gallery support (multiple photos per listing)
- Add pricing tiers (hourly, fixed, quote-based)
- Add parish coverage area for listings
- Add listing status management (active, paused, archived)

### 2.4 Swipes & Matches - Completion
- Verify swipe mechanics (like/pass/superlike)
- Add match notification triggers via RabbitMQ
- Add mutual match detection logic
- Add unmatch/block functionality

### 2.5 Chat Service - Completion
- Verify WebSocket connection handling
- Add message persistence and history
- Add typing indicators
- Add read receipts
- Add image/file sharing via storage service
- Add conversation list endpoint

### 2.6 Search Service - Completion
- Configure Elasticsearch index mappings for listings
- Add full-text search across listings
- Add faceted filtering (category, parish, price range, rating)
- Add geospatial search (nearby providers)
- Add search suggestions/autocomplete

### 2.7 Recommendations Service - Completion
- Implement collaborative filtering based on swipe history
- Add category-based recommendations
- Add location-aware recommendations
- Add trending/popular services endpoint

### 2.8 Storage Service - Completion
- Verify S3/MinIO upload/download endpoints
- Add image resizing/thumbnail generation
- Add file type validation
- Add signed URL generation for private files

### 2.9 Notifications Service - Completion
- Add push notification delivery (Firebase/APNs)
- Add email notification templates
- Add SMS notification via Twilio (Jamaican numbers)
- Add notification preferences per user
- Add RabbitMQ event consumers for match, message, payment events

---

## Phase 3: Testing (Days 5-6)

### 3.1 Unit Tests for Each Service
- Gateway: auth endpoints, JWT validation, rate limiting
- Profiles: CRUD operations, validation
- Listings: CRUD operations, filtering, status management
- Swipes: swipe recording, duplicate prevention
- Matches: mutual match detection, unmatch
- Chat: message sending, WebSocket handling
- Payments: Stripe integration, payout calculations
- Reviews: submission, rating aggregation
- Search: indexing, query building
- Notifications: event processing, delivery
- Recommendations: algorithm output
- Geoshard: S2 cell calculations, parish mapping
- Storage: upload/download, validation
- Admin: moderation actions, audit logging

### 3.2 Integration Tests
- Full auth flow: register → login → access protected routes
- Listing lifecycle: create listing → search → swipe → match → chat → pay → review
- Payment flow: Stripe checkout → webhook → payout
- Notification flow: event → RabbitMQ → consumer → delivery

### 3.3 API Contract Tests
- Validate all request/response schemas against Pydantic models
- Test error responses (400, 401, 403, 404, 422)

---

## Phase 4: Mobile App Completion (Days 7-10)

### 4.1 Authentication Screens
- Login screen with Jamaican phone number input (+1876)
- Registration screen with role selection (user/provider)
- Phone verification screen (OTP)
- Password reset flow

### 4.2 Home / Discovery Screen
- Swipe deck with service provider cards
- Card content: photo, name, category, rating, price, parish
- Swipe animations (left=pass, right=like, up=superlike)
- Category filter tabs
- Parish/location filter

### 4.3 Search Screen
- Full-text search input
- Filter by: category, parish, price range, rating
- Results list with service cards
- Map view toggle showing provider locations

### 4.4 Matches Screen
- List of mutual matches
- Match card with provider info and "Message" CTA
- Unmatched/blocked list management

### 4.5 Chat Screen
- Conversation list with last message preview
- Individual chat with message bubbles
- Real-time messaging via WebSocket
- Image sharing
- Typing indicators and read receipts

### 4.6 Provider Profile Screen
- Full provider details: bio, skills, certifications
- Photo gallery
- Service listings with pricing
- Reviews and ratings
- Availability schedule
- "Request Quote" and "Book Now" CTAs
- Share profile

### 4.7 Payments Screen
- Payment initiation with Stripe
- Payment history
- Receipt display
- Tip functionality

### 4.8 Reviews Screen
- Submit review with star rating and text
- View reviews for a provider
- Provider response to reviews

### 4.9 User Profile / Settings
- Edit profile information
- Manage notification preferences
- Switch between user/provider mode
- Provider dashboard (if provider): manage listings, view earnings, respond to reviews
- App settings (language, location, etc.)

### 4.10 Provider Dashboard Screens
- My Listings management (create, edit, pause, delete)
- Earnings overview and payout history
- Booking/request management
- Analytics (views, swipes, matches)

---

## Phase 5: Website Frontend Integration (Days 11-12)

### 5.1 Connect to Backend API
- Replace hardcoded TOOLS array in common.js with API calls
- Fetch service listings from `/api/listings`
- Implement category filtering via API
- Implement search via `/api/search`
- Add parish-based filtering

### 5.2 Service Provider Detail Pages
- Create dynamic service provider detail page template
- Display full provider info, reviews, gallery
- Add "Contact Provider" and "Book Now" CTAs
- Link to mobile app download

### 5.3 Service Provider Registration
- Build provider registration form on contact.html
- Connect to gateway auth + profiles API
- Add listing creation form for providers

### 5.4 New Category Pages
- Create proper service category pages (replacing old AI tool pages)
- Dynamic category pages pulling from API
- Parish-specific landing pages

### 5.5 SEO & Meta
- Update all meta descriptions and Open Graph tags
- Generate proper sitemap.xml with service URLs
- Add structured data (JSON-LD) for local business schema

---

## Phase 6: CI/CD & DevOps (Day 13)

### 6.1 GitHub Actions Workflows
- **Lint & Format**: Run ruff/black on Python, eslint/prettier on TypeScript
- **Test**: Run pytest for backend services
- **Build**: Build Docker images for each service
- **Mobile**: EAS build for React Native app
- **Deploy staging**: Auto-deploy to Railway on PR merge
- **Deploy production**: Manual approval deploy to production

### 6.2 Docker Improvements
- Add health checks to all service containers
- Optimize Dockerfiles (multi-stage builds, smaller images)
- Add docker-compose.prod.yml for production configuration

### 6.3 Monitoring & Logging
- Add structured logging (JSON format) to all services
- Add health check endpoints to all services
- Configure error tracking (Sentry integration)

---

## Phase 7: Production Hardening (Day 14)

### 7.1 Security
- Input validation on all endpoints (already via Pydantic, verify completeness)
- Rate limiting configuration per endpoint
- HTTPS enforcement
- CORS whitelisting for production domains
- Secrets management (Railway environment variables)
- SQL injection prevention (verify parameterized queries)

### 7.2 Performance
- Database connection pooling configuration
- Redis caching strategy for hot data (popular listings, search results)
- Pagination on all list endpoints
- Image optimization pipeline

### 7.3 Reliability
- Database backup strategy
- Graceful shutdown handling for all services
- Circuit breaker pattern for inter-service communication
- Dead letter queue for failed RabbitMQ messages

---

## Phase 8: Launch Preparation (Day 15)

### 8.1 Documentation
- API documentation via FastAPI's built-in OpenAPI/Swagger
- Deployment runbook
- Environment setup guide for developers
- Update README.md with architecture diagram and setup instructions

### 8.2 Seed Data
- Create seed script with sample service providers across all categories
- Add sample listings for each parish
- Create demo user accounts

### 8.3 App Store Preparation
- Configure EAS for iOS and Android builds
- App store metadata, screenshots, descriptions
- Privacy policy and terms of service

### 8.4 Domain & DNS
- Verify www.jobsyja.com configuration
- Configure API subdomain (api.jobsyja.com)
- SSL certificates

---

## Priority Order (What to Build First)

If time is limited, this is the highest-impact order:

1. **Phase 1** - Cleanup & migrations (foundation everything depends on)
2. **Phase 2.1** - Gateway proxy routing (unlocks all API access)
3. **Phase 2.2-2.3** - Profiles & Listings (core marketplace data)
4. **Phase 2.5** - Chat (key marketplace interaction)
5. **Phase 4.1-4.3** - Mobile auth, discovery, search (core user experience)
6. **Phase 3** - Tests (prevent regressions)
7. **Phase 5** - Website integration (second channel)
8. **Phase 6** - CI/CD (development velocity)
9. **Everything else** - Polish and production readiness
