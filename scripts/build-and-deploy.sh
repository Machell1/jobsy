#!/usr/bin/env bash
# =============================================================================
# build-and-deploy.sh — Full Jobsy build + deploy script
# Runs locally: EAS Build (iOS + Android) + Vercel web deploy + store submit
# Usage: ./scripts/build-and-deploy.sh [ios|android|web|all] [--submit]
# =============================================================================
set -uo pipefail

TARGET="${1:-all}"
SUBMIT="${2:-}"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MOBILE_DIR="$ROOT_DIR/mobile"
WEB_DIR="$ROOT_DIR/web"
LOG_FILE="$ROOT_DIR/deploy-log.txt"

# ─── Colors ───────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; RESET='\033[0m'
pass() { echo -e "${GREEN}✅ $1${RESET}"; echo "[PASS] $1" >> "$LOG_FILE"; }
fail() { echo -e "${RED}❌ $1${RESET}"; echo "[FAIL] $1" >> "$LOG_FILE"; }
info() { echo -e "${BLUE}→ $1${RESET}"; }

echo "=============================================" | tee "$LOG_FILE"
echo " Jobsy Deploy — $(date)" | tee -a "$LOG_FILE"
echo " Target: $TARGET" | tee -a "$LOG_FILE"
echo "=============================================" | tee -a "$LOG_FILE"

# ─── Pre-flight checks ──────────────────────────────────────
info "Pre-flight checks..."
command -v node >/dev/null 2>&1 && pass "node: $(node --version)" || { fail "node not found"; exit 1; }
command -v npm >/dev/null 2>&1 && pass "npm: $(npm --version)" || { fail "npm not found"; exit 1; }

if ! command -v eas >/dev/null 2>&1; then
  info "Installing EAS CLI..."
  npm install -g eas-cli
fi
pass "eas: $(eas --version 2>/dev/null | head -1)"

if ! command -v vercel >/dev/null 2>&1; then
  info "Installing Vercel CLI..."
  npm install -g vercel
fi
pass "vercel: $(vercel --version 2>/dev/null | head -1)"

# Check EXPO_TOKEN
if [ -z "${EXPO_TOKEN:-}" ]; then
  echo -e "${RED}ERROR: EXPO_TOKEN environment variable is not set.${RESET}"
  echo "Get your token at: https://expo.dev/settings/access-tokens"
  echo "Then run: export EXPO_TOKEN=your_token_here"
  exit 1
fi
pass "EXPO_TOKEN is set"

# ─── EAS Build: iOS ──────────────────────────────────────────
build_ios() {
  info "Starting iOS EAS Build (production)..."
  cd "$MOBILE_DIR"
  npm ci --prefer-offline || npm install
  
  if eas build --platform ios --profile production --non-interactive; then
    pass "iOS build submitted to EAS"
    IOS_BUILD_ID=$(eas build:list --platform ios --status finished --limit 1 --json 2>/dev/null | jq -r '.[0].id // empty')
    echo "iOS Build ID: $IOS_BUILD_ID" >> "$LOG_FILE"
  else
    fail "iOS build failed"
    return 1
  fi
}

# ─── EAS Build: Android ──────────────────────────────────────
build_android() {
  info "Starting Android EAS Build (production)..."
  cd "$MOBILE_DIR"
  npm ci --prefer-offline || npm install
  
  if eas build --platform android --profile production --non-interactive; then
    pass "Android build submitted to EAS"
    ANDROID_BUILD_ID=$(eas build:list --platform android --status finished --limit 1 --json 2>/dev/null | jq -r '.[0].id // empty')
    echo "Android Build ID: $ANDROID_BUILD_ID" >> "$LOG_FILE"
  else
    fail "Android build failed"
    return 1
  fi
}

# ─── Deploy Web ───────────────────────────────────────────────
deploy_web() {
  info "Building and deploying web frontend to Vercel..."
  cd "$WEB_DIR"
  npm ci --prefer-offline || npm install
  
  if npm run build; then
    pass "Web build succeeded"
  else
    fail "Web build failed"
    return 1
  fi
  
  if [ -z "${VERCEL_TOKEN:-}" ]; then
    echo -e "${YELLOW}⚠️  VERCEL_TOKEN not set — running interactive deploy${RESET}"
    vercel deploy --prod
  else
    DEPLOY_URL=$(vercel deploy --prod --token="$VERCEL_TOKEN" --yes 2>&1 | tail -1)
    pass "Deployed to: $DEPLOY_URL"
    echo "Vercel URL: $DEPLOY_URL" >> "$LOG_FILE"
  fi
}

# ─── Submit iOS ───────────────────────────────────────────────
submit_ios() {
  info "Submitting iOS build to TestFlight..."
  cd "$MOBILE_DIR"
  if eas submit --platform ios --latest --non-interactive; then
    pass "iOS submitted to TestFlight ✈️"
  else
    fail "iOS submission failed"
    return 1
  fi
}

# ─── Submit Android ───────────────────────────────────────────
submit_android() {
  info "Submitting Android build to Google Play (internal track)..."
  cd "$MOBILE_DIR"
  if eas submit --platform android --latest --non-interactive; then
    pass "Android submitted to Google Play 🤖"
  else
    fail "Android submission failed"
    return 1
  fi
}

# ─── Execute targets ──────────────────────────────────────────
case "$TARGET" in
  ios)
    build_ios
    [ "$SUBMIT" = "--submit" ] && submit_ios
    ;;
  android)
    build_android
    [ "$SUBMIT" = "--submit" ] && submit_android
    ;;
  web)
    deploy_web
    ;;
  all)
    build_ios &
    build_android &
    deploy_web &
    wait
    if [ "$SUBMIT" = "--submit" ]; then
      submit_ios
      submit_android
    fi
    ;;
  *)
    echo "Usage: $0 [ios|android|web|all] [--submit]"
    exit 1
    ;;
esac

# ─── Final summary ────────────────────────────────────────────
echo ""
echo "============================================="
echo " Jobsy Deploy Complete"
echo " Log: $LOG_FILE"
echo "============================================="
cat "$LOG_FILE"
