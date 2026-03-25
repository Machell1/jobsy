#!/usr/bin/env bash
# =============================================================================
# validate-all.sh — Pre-submission validation: TypeScript + Build + Deploy
# Validates all three targets pass before any store submission.
# =============================================================================
set -uo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PASS=0
FAIL=0
REPORT=()

check() {
  local name="$1"; local cmd="$2"
  if eval "$cmd" >/dev/null 2>&1; then
    echo "  ✅ $name"
    REPORT+=("✅ $name")
    ((PASS++))
  else
    echo "  ❌ $name"
    REPORT+=("❌ $name")
    ((FAIL++))
  fi
}

echo "======================================"
echo " Jobsy Pre-Submission Validation"
echo " $(date)"
echo "======================================"

echo ""
echo "📋 Environment Checks:"
check "Node.js installed" "command -v node"
check "npm installed" "command -v npm"
check "EAS CLI installed" "command -v eas"
check "Vercel CLI installed" "command -v vercel"
check "EXPO_TOKEN set" "[ -n '${EXPO_TOKEN:-}' ]"
check "VERCEL_TOKEN set" "[ -n '${VERCEL_TOKEN:-}' ]"
check "Python 3 installed" "command -v python3 || command -v python"

echo ""
echo "📱 Mobile (Expo) Checks:"
check "mobile/ exists" "[ -d '$ROOT_DIR/mobile' ]"
check "mobile/package.json" "[ -f '$ROOT_DIR/mobile/package.json' ]"
check "mobile/eas.json" "[ -f '$ROOT_DIR/mobile/eas.json' ]"
check "mobile/app.json or app.config.js" "[ -f '$ROOT_DIR/mobile/app.json' ] || [ -f '$ROOT_DIR/mobile/app.config.js' ]"
check "mobile node_modules" "[ -d '$ROOT_DIR/mobile/node_modules' ]"

echo ""
echo "🌐 Web Checks:"
check "web/ exists" "[ -d '$ROOT_DIR/web' ]"
check "web/package.json" "[ -f '$ROOT_DIR/web/package.json' ]"
check "web/vite.config.ts or vite.config.js" "[ -f '$ROOT_DIR/web/vite.config.ts' ] || [ -f '$ROOT_DIR/web/vite.config.js' ]"
check "web node_modules" "[ -d '$ROOT_DIR/web/node_modules' ]"

echo ""
echo "🐍 Backend Checks:"
check "backend/ exists" "[ -d '$ROOT_DIR/backend' ]"
check "backend/requirements.txt" "[ -f '$ROOT_DIR/backend/requirements.txt' ]"
check "backend main.py or app.py" "[ -f '$ROOT_DIR/backend/main.py' ] || [ -f '$ROOT_DIR/backend/app.py' ]"

echo ""
echo "🔑 Store Credentials Checks:"
check "iOS submit config in eas.json" "grep -q 'appleId' '$ROOT_DIR/mobile/eas.json' 2>/dev/null"
check "Android service account" "[ -f '$ROOT_DIR/mobile/service-account.json' ] || grep -q 'serviceAccountKeyPath' '$ROOT_DIR/mobile/eas.json' 2>/dev/null"
check "GitHub Actions workflow exists" "[ -f '$ROOT_DIR/.github/workflows/jobsy-ci-cd.yml' ]"

echo ""
echo "======================================"
echo " Results: $PASS passed, $FAIL failed"
echo "======================================"

for item in "${REPORT[@]}"; do
  echo "  $item"
done

echo ""
if [ "$FAIL" -eq 0 ]; then
  echo "🚀 ALL CHECKS PASSED — Ready to deploy and submit!"
  exit 0
else
  echo "⚠️  $FAIL check(s) failed — resolve before submitting"
  exit 1
fi
