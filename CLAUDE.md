# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

Jobsy is a service marketplace for Jamaica (all 14 parishes): customers find and book local service providers, with Tinder-style swiping, chat, bookings, and Stripe payments. Production API: `https://api.jobsyja.com`, website: `https://www.jobsyja.com`.

## Repository layout (unusual — read this first)

The git root is a thin wrapper; the real code is nested two levels deep. The `jobsy-main/` directory is an unzipped GitHub archive that was committed as-is:

```
/                          # git root: README, .gitignore, scripts/ (unwired CI-CD templates)
└── jobsy-main/            # static GitHub Pages site (index.html, CNAME=www.jobsyja.com, prebuilt assets/)
    ├── jobsy/             # ★ THE PRODUCT MONOREPO: Python FastAPI backend + Expo mobile app
    │   └── mobile/        # React Native app (Expo SDK 55, expo-router)
    ├── jobsy-web/         # React 19 + Vite 8 web SPA (the modern web frontend)
    └── bot/               # unrelated Telegram deal-alert bot (Railway worker)
```

Gotchas that follow from this layout:

- **The GitHub Actions workflows do not run.** They live at `jobsy-main/.github/workflows/` and `jobsy-main/jobsy/.github/workflows/`, not at the git root (and root `.gitignore` ignores `.github/`). They document intent — mirror their checks locally (see Commands).
- There are **two web frontends**: the prebuilt static site at `jobsy-main/` (hashed bundles in `jobsy-main/assets/`, referenced by `jobsy-main/index.html`) and the source-available Vite SPA in `jobsy-main/jobsy-web/`. `jobsy-web/dist/` is committed deliberately despite `dist/` being gitignored.
- `jobsy-main/jobsy/package.json` is a Turborepo config whose `apps/*` workspace (and the `e2e/` Playwright config's `apps/web`) reference a Next.js app that does not exist in this tree — stale scaffolding. The npm `test:*`/`lint` scripts there mostly have nothing to run against.
- Root `scripts/` (build-and-deploy.sh etc.) assumes a flat `mobile//web//backend/` layout that doesn't match this repo — template files, not wired up.

## Commands

### Backend (run from `jobsy-main/jobsy/`)

```bash
docker-compose up -d postgres redis          # local infra (postgis:15, redis:7)
uvicorn gateway.app.main:app --reload --port 8000   # gateway serves most routes directly
python -m scripts.seed_data                  # seed Jamaican demo providers/listings

# Tests (pytest needs PYTHONPATH=. ; tests run against in-memory SQLite, no infra needed)
pip install -r requirements-test.txt
PYTHONPATH=. pytest --tb=short -q                        # all tests
PYTHONPATH=. pytest gateway/tests/ -v                    # one service (also: make test-<svc>)
PYTHONPATH=. pytest gateway/tests/test_auth.py::test_login_success  # single test

ruff check .                                 # lint (config: ruff.toml, line-length 120)
ruff format .
```

The `Makefile` wraps most of these: `make test`, `make test-cov`, `make lint`, `make migrate`, `make seed`, `make deploy`. CI-equivalent check before pushing backend changes: `ruff check . && PYTHONPATH=. pytest --tb=short -q`.

### Mobile (run from `jobsy-main/jobsy/mobile/`)

```bash
npm install          # postinstall runs scripts/patch-rnmapbox.js — required, see gotchas
npx expo start       # dev server (npm run ios / android)
npm run lint         # eslint . --ext .ts,.tsx  (CI uses --max-warnings 0)
npm run typecheck    # tsc --noEmit
```

There is no mobile test suite; lint + typecheck are the only checks. Builds go through EAS (`eas.json` profiles: development/preview/production).

### Web SPA (run from `jobsy-main/jobsy-web/`)

```bash
npm run dev          # vite
npm run build        # tsc --noEmit && vite build
```

## Backend architecture

~16 FastAPI services as sibling dirs under `jobsy-main/jobsy/` (gateway, profiles, listings, swipes, matches, chat, payments, reviews, search, recommendations, geoshard, advertising, admin, storage, notifications, plus newer `bookings` and `noticeboard`). Every service has the same shape: `app/main.py` (FastAPI app, lifespan, `/health`), `app/models.py`, `app/routes.py`, `Dockerfile`, `railway.json`, and sometimes `tests/`.

**The gateway is a hybrid, not a pure proxy — this is the most important thing to understand:**

- Most domains are **merged into the gateway** as direct-DB routers in `gateway/app/routes/` (auth, listings, search, swipes, reviews, bookings, noticeboard, payments, events, and many more), registered in `gateway/app/main.py` (~1500 lines).
- Only some services are **network-proxied** via `gateway/app/routes/proxy.py`, with target URLs in the `SERVICE_URLS` dict in `gateway/app/config.py` (the route table). To add a route: add a router file + `include_router` in `main.py` for merged domains, or a `SERVICE_URLS` entry + proxy handler for proxied services.
- The gateway validates JWTs (`shared/auth.py`, deps in `gateway/app/deps.py`) and injects `X-User-ID` / `X-User-Role` / `X-User-Roles` headers downstream. **Downstream services trust these headers and do not re-validate JWTs.**
- Redis sliding-window rate limiting in `gateway/app/middleware/rate_limit.py` (limits in `gateway/app/config.py`); no-ops if Redis is absent.

**Shared package (`shared/`)** — imported by every service, installed into containers via each Dockerfile:

- `shared/config.py` — ALL env config as module-level `os.getenv` constants (no per-service settings). Hard-fails in production (Railway env detected) if `DATABASE_URL`/`REDIS_URL`/`JWT_SECRET` missing; localhost defaults in dev.
- `shared/database.py` — single async engine, `Base`, `get_db`, `init_db()`. **All services share one Postgres database and one schema**; `alembic/env.py` and the tests import every service's models onto this one `Base`.
- `shared/auth.py` — JWT create/decode (HS256, `JWT_SECRET`), bcrypt hashing.
- `shared/events.py` — event bus. **Redis pub/sub, not RabbitMQ.** `publish_event(routing_key, data)` → channel `jobsy.events.<key>`; failures are swallowed so HTTP handlers never fail on a down broker. RabbitMQ references in docker-compose, requirements (`aio-pika`), and railway.toml are stale leftovers — ignore them.
- `shared/middleware.py` — `setup_middleware(app)`: CORS, JSON request logging with `X-Request-ID`, security headers.

**Schema management (surprising):** Alembic exists (`alembic/`, 6 revisions) but is largely vestigial. The real schema comes from `init_db()` → `Base.metadata.create_all` at service startup plus the gateway's inline idempotent `_apply_migrations()` DDL block in `gateway/app/main.py` (`CREATE TABLE IF NOT EXISTS` / `ADD COLUMN IF NOT EXISTS`, numbered well past the Alembic files). In practice new tables/columns are added there — follow the existing pattern in that block.

**Tests:** root `conftest.py` forces `DATABASE_URL=sqlite+aiosqlite:///:memory:`, monkey-patches Postgres `JSONB`→`JSON` for SQLite, sets a test `JWT_SECRET`, and provides `test_session`, `mock_publish_event`, `auth_headers` fixtures. `pytest.ini`: `asyncio_mode=auto`. Services with tests: gateway, profiles, listings, swipes, matches, chat, payments, reviews, admin.

## Mobile app architecture (`jobsy-main/jobsy/mobile/`)

- expo-router file-based routing: `app/(auth)/` and `app/(tabs)/`; auth redirect logic is centralized in `AuthGuard` inside `app/_layout.tsx`. **Every screen under `app/(tabs)/` must also be registered in `(tabs)/_layout.tsx`** (with `href: null` to keep it off the tab bar).
- Path alias `@/*` → `./src/*`. All network calls go through the shared axios instance in `src/api/client.ts` (one module per domain in `src/api/`): base URL from `EXPO_PUBLIC_API_URL` (falls back to `localhost:8000` in dev, `api.jobsyja.com` in prod), tokens in expo-secure-store (`access_token`/`refresh_token`), automatic 401 → `/auth/refresh` with a queued-request mutex.
- State: Zustand stores in `src/stores/` (auth, chat, location) for session state; TanStack Query v5 for server state (QueryClient configured in `app/_layout.tsx`).
- Styling: NativeWind v4 (Tailwind classes) mixed with `StyleSheet` + `COLORS` from `src/constants/theme.ts`.
- Chat is Stream Chat (`src/api/stream.ts` fetches a token from `GET /api/chat/token`; connection lifecycle managed by `useChatStore` + `AuthGuard`).
- **Do not break the native-build patches:** `scripts/patch-rnmapbox.js` (postinstall) monkey-patches `@rnmapbox/maps` for the RN New Architecture — Android builds fail without it, and it likely needs updating if you bump that package. Custom Expo config plugins live in `plugins/` and are registered in `app.json`.

## Web SPA architecture (`jobsy-main/jobsy-web/`)

- All routing in `src/App.tsx` (react-router 7, most pages `React.lazy`, `ProtectedRoute` + `AuthContext`). Pages in `src/pages/`, design-system components in `src/components/ui/`.
- **API base URL is hardcoded** as `API_BASE = 'https://api.jobsyja.com'` in `src/lib/api.ts` — the `VITE_API_URL` listed in `.env.example` is not actually read. Custom fetch wrappers there handle 401 → refresh. Tokens live in sessionStorage (`jobsy_token`/`jobsy_refresh`).
- `AuthContext` contains a "preview mode" (`jobsy_preview_mode`) that fakes an admin user when no backend is available.
- Tailwind v4 CSS-first: no `tailwind.config.js`; theme tokens in the `@theme` block in `src/index.css`, plugin wired in `vite.config.ts`.

## Deployment

- **Backend → Railway**, one Railway service per FastAPI service (per-service `railway.json`; `railway up --detach --service <name>`), behind `api.jobsyja.com`. Health check `GET /health`. Migrations effectively run at startup (see schema management above). See `jobsy-main/DEPLOYMENT.md`.
- **Web** → `jobsy-web/vercel.json` targets Vercel (SPA rewrite + security headers), while DEPLOYMENT.md describes the older GitHub Pages static site at `jobsy-main/` root — both exist; the Vite SPA + Vercel path is the current one.
- **Mobile → EAS** build/submit (`eas.json`; production profile auto-increments and points at the prod API).
- `jobsy-main/jobsy/docs/feature-parity.md` tracks each feature across Backend/Web/Mobile/Admin — check it when adding or closing out a feature.
