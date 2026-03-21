#!/usr/bin/env bash
# =============================================================================
# Jobsy — Deploy to Railway
# =============================================================================
# Deploys the Jobsy API gateway to Railway with PostgreSQL and Redis.
# Usage: bash scripts/deploy.sh
# =============================================================================
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

info()  { echo -e "${CYAN}[INFO]${NC} $*"; }
ok()    { echo -e "${GREEN}[OK]${NC} $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $*"; }
fail()  { echo -e "${RED}[FAIL]${NC} $*"; exit 1; }

cd "$(dirname "$0")/.."

# ── Prerequisites ─────────────────────────────────────────────
info "Checking prerequisites..."

command -v railway >/dev/null 2>&1 || {
  fail "Railway CLI not found. Install it with: npm i -g @railway/cli"
}
ok "Railway CLI found"

# ── Login ─────────────────────────────────────────────────────
info "Checking Railway authentication..."
railway whoami 2>/dev/null || {
  info "Not logged in. Opening Railway login..."
  railway login
}
ok "Authenticated with Railway"

# ── Project ───────────────────────────────────────────────────
info "Setting up Railway project..."
if railway status 2>/dev/null; then
  ok "Already linked to a Railway project"
else
  info "Creating new Railway project 'jobsy'..."
  railway init --name jobsy || {
    warn "Could not create project. You may need to link an existing one."
    info "Run: railway link"
    exit 1
  }
  ok "Railway project created"
fi

# ── Plugins ───────────────────────────────────────────────────
info "Provisioning PostgreSQL..."
railway add --plugin postgresql 2>/dev/null && ok "PostgreSQL plugin added" || warn "PostgreSQL may already be provisioned"

info "Provisioning Redis..."
railway add --plugin redis 2>/dev/null && ok "Redis plugin added" || warn "Redis may already be provisioned"

# ── Environment Variables ─────────────────────────────────────
info "Setting environment variables..."

JWT_SECRET=$(openssl rand -base64 32)

railway variables set \
  JWT_SECRET="$JWT_SECRET" \
  RAILWAY_ENVIRONMENT=production \
  PYTHONPATH=/app \
  PORT=8000

ok "Environment variables set"
warn "JWT_SECRET generated — save it securely: $JWT_SECRET"

# ── Deploy Gateway ────────────────────────────────────────────
info "Deploying gateway service..."
info "This will build and deploy from gateway/Dockerfile"

railway up --detach

ok "Deployment initiated"
info "Waiting for deployment to become healthy..."
sleep 15

# ── Database Setup ────────────────────────────────────────────
info "Running database migrations..."
railway run alembic upgrade head && ok "Migrations complete" || {
  warn "Migrations may have failed — check Railway logs"
  warn "You can retry with: railway run alembic upgrade head"
}

info "Seeding database with sample data..."
railway run python -m scripts.seed_data && ok "Seed data loaded" || {
  warn "Seeding may have failed — check Railway logs"
  warn "You can retry with: railway run python -m scripts.seed_data"
}

# ── Public URL ────────────────────────────────────────────────
info "Generating public domain..."
railway domain 2>/dev/null || warn "Could not auto-generate domain. Set one in the Railway dashboard."

echo ""
echo -e "${GREEN}=== Deployment Complete ===${NC}"
echo ""
echo "Next steps:"
echo "  1. Note your Railway public URL from the dashboard"
echo "  2. Add a CNAME record: api.jobsyja.com → <your-railway-url>"
echo "  3. Verify: curl https://api.jobsyja.com/health"
echo ""
echo "Optional services to add later:"
echo "  - RabbitMQ (CloudAMQP plugin) for event messaging"
echo "  - Elasticsearch (Bonsai plugin) for full-text search"
echo "  - Stripe keys for payments"
echo "  - Twilio keys for SMS password reset"
echo ""
echo "Test login with seed data:"
echo "  Phone: +18761234501"
echo "  Password: DemoPass123!"
