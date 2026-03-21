#!/usr/bin/env bash
# =============================================================================
# Jobsy — Seed Database
# =============================================================================
# Seeds the database with sample Jamaican service providers.
#
# Usage:
#   bash scripts/seed.sh              # Local (requires DATABASE_URL or .env)
#   bash scripts/seed.sh --railway    # Production via Railway CLI
# =============================================================================
set -euo pipefail

cd "$(dirname "$0")/.."

if [ "${1:-}" = "--railway" ]; then
  echo "Seeding production database via Railway..."
  railway run python -m scripts.seed_data
else
  echo "Seeding local database..."
  PYTHONPATH=. python -m scripts.seed_data
fi

echo ""
echo "Seed complete! Test accounts use password: DemoPass123!"
echo "Example provider login: +18761234501"
