#!/usr/bin/env bash
set -euo pipefail

# Post-deploy health check for Jobsy production
# Checks both API and web frontend endpoints

API_URL="${API_URL:-https://api.jobsyja.com}"
WEB_URL="${WEB_URL:-https://jobsyja.com}"
MAX_RETRIES=5
RETRY_DELAY=10

echo "========================================="
echo "  Jobsy Post-Deploy Health Check"
echo "========================================="
echo ""

check_endpoint() {
  local url="$1"
  local name="$2"
  local expected_status="${3:-200}"
  local retries=0

  echo "Checking $name ($url)..."

  while [ $retries -lt $MAX_RETRIES ]; do
    status_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 15 "$url" 2>/dev/null || echo "000")

    if [ "$status_code" = "$expected_status" ]; then
      echo "  [PASS] $name — HTTP $status_code"
      return 0
    fi

    retries=$((retries + 1))
    if [ $retries -lt $MAX_RETRIES ]; then
      echo "  [RETRY] $name — got HTTP $status_code, expected $expected_status (attempt $retries/$MAX_RETRIES)"
      sleep $RETRY_DELAY
    fi
  done

  echo "  [FAIL] $name — got HTTP $status_code, expected $expected_status after $MAX_RETRIES attempts"
  return 1
}

check_response_time() {
  local url="$1"
  local name="$2"
  local max_time="${3:-5}"

  echo "Checking response time for $name..."
  total_time=$(curl -s -o /dev/null -w "%{time_total}" --max-time 30 "$url" 2>/dev/null || echo "99")

  if (( $(echo "$total_time < $max_time" | bc -l 2>/dev/null || echo 0) )); then
    echo "  [PASS] $name — ${total_time}s (threshold: ${max_time}s)"
    return 0
  else
    echo "  [WARN] $name — ${total_time}s (threshold: ${max_time}s)"
    return 0  # Warning only, don't fail deploy
  fi
}

FAILURES=0

echo "--- API Health Checks ---"
check_endpoint "$API_URL/health" "API Health" "200" || FAILURES=$((FAILURES + 1))
check_endpoint "$API_URL/api/v1/status" "API Status" "200" || FAILURES=$((FAILURES + 1))
check_response_time "$API_URL/health" "API Response Time" 3

echo ""
echo "--- Web Frontend Checks ---"
check_endpoint "$WEB_URL" "Web Homepage" "200" || FAILURES=$((FAILURES + 1))
check_endpoint "$WEB_URL/login" "Web Login Page" "200" || FAILURES=$((FAILURES + 1))
check_response_time "$WEB_URL" "Web Response Time" 5

echo ""
echo "--- Database Connectivity (via API) ---"
check_endpoint "$API_URL/health/db" "Database Connection" "200" || FAILURES=$((FAILURES + 1))

echo ""
echo "--- External Services ---"
check_endpoint "$API_URL/health/redis" "Redis Connection" "200" || FAILURES=$((FAILURES + 1))
check_endpoint "$API_URL/health/storage" "Storage Service" "200" || FAILURES=$((FAILURES + 1))

echo ""
echo "========================================="
if [ $FAILURES -gt 0 ]; then
  echo "  RESULT: $FAILURES check(s) FAILED"
  echo "  ACTION: Investigate failures before routing traffic"
  echo "========================================="
  exit 1
else
  echo "  RESULT: All checks PASSED"
  echo "  Production deployment is healthy."
  echo "========================================="
  exit 0
fi
