#!/usr/bin/env bash
# =============================================================================
# Jobsy — Local Development Setup
# =============================================================================
# Sets up the local development environment with Docker infrastructure,
# runs migrations, and seeds the database.
#
# Usage: bash scripts/setup-local.sh
# =============================================================================
set -euo pipefail

cd "$(dirname "$0")/.."

echo "=== Jobsy Local Development Setup ==="
echo ""

# ── Environment file ──────────────────────────────────────────
if [ ! -f .env ]; then
  echo "Creating .env from .env.example..."
  cp .env.example .env
  echo "Created .env — edit it if you need custom settings"
else
  echo ".env already exists, keeping current settings"
fi

# ── Docker infrastructure ────────────────────────────────────
echo ""
echo "Starting infrastructure services (Postgres, Redis, RabbitMQ)..."
docker compose up -d postgres redis rabbitmq

echo "Waiting for services to be healthy..."
RETRIES=30
until docker compose exec postgres pg_isready -U jobsy -q 2>/dev/null; do
  RETRIES=$((RETRIES - 1))
  if [ $RETRIES -le 0 ]; then
    echo "ERROR: PostgreSQL did not become ready in time"
    exit 1
  fi
  sleep 1
done
echo "PostgreSQL is ready"

# ── Install Python deps (if not in Docker) ───────────────────
if ! python -c "import fastapi" 2>/dev/null; then
  echo ""
  echo "Installing Python dependencies..."
  pip install -q -r requirements-test.txt
fi

# ── Database migrations ──────────────────────────────────────
echo ""
echo "Running database migrations..."
PYTHONPATH=. alembic upgrade head

# ── Seed data ────────────────────────────────────────────────
echo ""
echo "Seeding database with sample data..."
PYTHONPATH=. python -m scripts.seed_data

# ── Done ─────────────────────────────────────────────────────
echo ""
echo "=== Setup Complete ==="
echo ""
echo "Start all services:  make dev"
echo "Gateway URL:         http://localhost:8000"
echo "API docs:            http://localhost:8000/docs"
echo "RabbitMQ dashboard:  http://localhost:15672 (guest/guest)"
echo ""
echo "Test login:"
echo "  Phone:    +18761234501"
echo "  Password: DemoPass123!"
