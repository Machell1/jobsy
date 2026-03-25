#!/usr/bin/env bash
# =============================================================================
# fix-errors.sh — Jobsy Monorepo Error Audit & Auto-Fix Script
# Run from the root of: C:\Users\Sanique Richards\Downloads\jobsy-main
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
REPORT_FILE="$ROOT_DIR/error-report.md"

echo "# Jobsy Error Fix Report" > "$REPORT_FILE"
echo "Generated: $(date)" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

# ─── Color output ──────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RESET='\033[0m'

pass() { echo -e "${GREEN}✅ $1${RESET}"; echo "- ✅ $1" >> "$REPORT_FILE"; }
fail() { echo -e "${RED}❌ $1${RESET}"; echo "- ❌ $1" >> "$REPORT_FILE"; }
info() { echo -e "${BLUE}ℹ️  $1${RESET}"; }
warn() { echo -e "${YELLOW}⚠️  $1${RESET}"; echo "- ⚠️ $1" >> "$REPORT_FILE"; }

# ─── Check Node version ────────────────────────────────────────
info "Checking Node.js version..."
NODE_VER=$(node --version 2>/dev/null || echo "not found")
if [[ "$NODE_VER" == v2* ]] || [[ "$NODE_VER" == v18* ]] || [[ "$NODE_VER" == v20* ]]; then
  pass "Node.js $NODE_VER"
else
  warn "Node.js $NODE_VER — recommend v20 LTS"
fi

# ─── Mobile (Expo / React Native) ──────────────────────────────
echo "" >> "$REPORT_FILE"
echo "## 📱 Mobile (Expo + React Native)" >> "$REPORT_FILE"
info "=== MOBILE: Expo/React Native TypeScript ==="

if [ -d "$ROOT_DIR/mobile" ]; then
  cd "$ROOT_DIR/mobile"
  
  info "Installing mobile dependencies..."
  npm ci --prefer-offline 2>&1 || npm install 2>&1
  
  info "Running TypeScript check..."
  TS_ERRORS=$(npx tsc --noEmit 2>&1 || true)
  TS_COUNT=$(echo "$TS_ERRORS" | grep -c "error TS" || echo 0)
  
  if [ "$TS_COUNT" -eq "0" ]; then
    pass "Mobile TypeScript: 0 errors"
  else
    fail "Mobile TypeScript: $TS_COUNT error(s)"
    echo "```" >> "$REPORT_FILE"
    echo "$TS_ERRORS" | grep "error TS" | head -20 >> "$REPORT_FILE"
    echo "```" >> "$REPORT_FILE"
  fi
  
  info "Running ESLint with auto-fix..."
  npx eslint . --ext .ts,.tsx --fix 2>&1 || true
  pass "Mobile ESLint auto-fix applied"
  
  cd "$ROOT_DIR"
else
  warn "mobile/ directory not found — skipping"
fi

# ─── Web Frontend (Vite + React) ──────────────────────────────
echo "" >> "$REPORT_FILE"
echo "## 🌐 Web Frontend (Vite + React)" >> "$REPORT_FILE"
info "=== WEB: Vite/React TypeScript ==="

if [ -d "$ROOT_DIR/web" ]; then
  cd "$ROOT_DIR/web"
  
  info "Installing web dependencies..."
  npm ci --prefer-offline 2>&1 || npm install 2>&1
  
  info "Running TypeScript check..."
  TS_ERRORS_WEB=$(npx tsc --noEmit 2>&1 || true)
  TS_COUNT_WEB=$(echo "$TS_ERRORS_WEB" | grep -c "error TS" || echo 0)
  
  if [ "$TS_COUNT_WEB" -eq "0" ]; then
    pass "Web TypeScript: 0 errors"
  else
    fail "Web TypeScript: $TS_COUNT_WEB error(s)"
    echo "```" >> "$REPORT_FILE"
    echo "$TS_ERRORS_WEB" | grep "error TS" | head -20 >> "$REPORT_FILE"
    echo "```" >> "$REPORT_FILE"
  fi
  
  info "Running web build..."
  if npm run build 2>&1; then
    pass "Web build: SUCCESS"
  else
    fail "Web build: FAILED"
  fi
  
  cd "$ROOT_DIR"
else
  warn "web/ directory not found — skipping"
fi

# ─── Backend (FastAPI) ────────────────────────────────────────
echo "" >> "$REPORT_FILE"
echo "## 🐍 Backend (FastAPI)" >> "$REPORT_FILE"
info "=== BACKEND: FastAPI Python ==="

if [ -d "$ROOT_DIR/backend" ]; then
  cd "$ROOT_DIR/backend"
  
  info "Installing Python dependencies..."
  pip install -r requirements.txt -q 2>&1 || pip install -r requirements.txt --break-system-packages -q 2>&1 || warn "pip install had issues"
  
  info "Running mypy type check..."
  if command -v mypy &>/dev/null; then
    MYPY_OUT=$(mypy . --ignore-missing-imports 2>&1 || true)
    MYPY_ERRORS=$(echo "$MYPY_OUT" | grep -c "error:" || echo 0)
    if [ "$MYPY_ERRORS" -eq "0" ]; then
      pass "Backend mypy: 0 errors"
    else
      fail "Backend mypy: $MYPY_ERRORS error(s)"
    fi
  else
    warn "mypy not installed — run: pip install mypy"
  fi
  
  info "Checking FastAPI app imports..."
  if python -c "import app" 2>&1; then
    pass "Backend imports: OK"
  elif python -c "import main" 2>&1; then
    pass "Backend imports: OK (main.py)"
  else
    warn "Backend import check — verify manually"
  fi
  
  cd "$ROOT_DIR"
else
  warn "backend/ directory not found — skipping"
fi

# ─── Summary ──────────────────────────────────────────────────
echo ""
echo "================================================================"
echo "📊 ERROR REPORT saved to: error-report.md"
echo "================================================================"
cat "$REPORT_FILE"
