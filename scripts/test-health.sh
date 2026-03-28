#!/bin/bash
# ============================================================================
# FIVUCSAS - API Health Check Script
# ============================================================================
# Checks all major API endpoint groups are responding.
#
# Usage:
#   chmod +x test-health.sh
#   ./test-health.sh [BASE_URL]
#
# Default BASE_URL: https://auth.rollingcatsoftware.com
# ============================================================================

set -eo pipefail

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
BASE_URL="${1:-https://auth.rollingcatsoftware.com}"
ADMIN_EMAIL="${FIVUCSAS_ADMIN_EMAIL:-admin@fivucsas.local}"
ADMIN_PASS="${FIVUCSAS_ADMIN_PASS:-Test@123}"
CURL_OPTS="-sk --connect-timeout 10 --max-time 15"

# ---------------------------------------------------------------------------
# Colors
# ---------------------------------------------------------------------------
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

# ---------------------------------------------------------------------------
# Counters
# ---------------------------------------------------------------------------
PASS=0
FAIL=0
SKIP=0

log_pass() { echo -e "  ${GREEN}[PASS]${NC} $1"; PASS=$((PASS + 1)); }
log_fail() { echo -e "  ${RED}[FAIL]${NC} $1"; FAIL=$((FAIL + 1)); }
log_skip() { echo -e "  ${YELLOW}[SKIP]${NC} $1"; SKIP=$((SKIP + 1)); }
log_section() { echo -e "\n${CYAN}--- $1 ---${NC}"; }

# ---------------------------------------------------------------------------
# Helper: check an endpoint and report status code
# ---------------------------------------------------------------------------
check_endpoint() {
    local label="$1"
    local url="$2"
    local expected="${3:-200}"  # default expected status
    local auth="${4:-}"         # optional auth header

    local headers=()
    [[ -n "$auth" ]] && headers=(-H "Authorization: Bearer $auth")

    local status
    status=$(curl $CURL_OPTS -o /dev/null -w "%{http_code}" "${headers[@]}" "$url" 2>/dev/null || echo "000")

    if [[ "$status" == "$expected" ]]; then
        log_pass "$label  (HTTP $status)"
    elif [[ "$status" == "000" ]]; then
        log_fail "$label  (connection refused / timeout)"
    else
        log_fail "$label  (HTTP $status, expected $expected)"
    fi
}

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
echo ""
echo "============================================================"
echo "  FIVUCSAS - API Health Check"
echo "  Target : $BASE_URL"
echo "  Date   : $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
echo "============================================================"

# --- 1. Public / unauthenticated endpoints --------------------------------
log_section "Public Endpoints"
check_endpoint "Actuator health          " "$BASE_URL/actuator/health"
check_endpoint "Login endpoint reachable " "$BASE_URL/api/v1/auth/login" "405"   # GET => 405 (Method Not Allowed, needs POST)

# --- 2. Authentication ----------------------------------------------------
log_section "Authentication"
TOKEN=""
LOGIN_BODY="{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASS\"}"
LOGIN_RESP=$(curl $CURL_OPTS -X POST "$BASE_URL/api/v1/auth/login" \
    -H "Content-Type: application/json" \
    -d "$LOGIN_BODY" 2>/dev/null || echo "{}")

# Extract token (API returns either "token" or "accessToken")
TOKEN=$(echo "$LOGIN_RESP" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    print(d.get('token','') or d.get('accessToken','') or
          d.get('data',{}).get('token','') or d.get('data',{}).get('accessToken','') or '')
except: print('')
" 2>/dev/null)

if [[ -n "$TOKEN" && "$TOKEN" != "" ]]; then
    log_pass "Admin login successful    (token acquired)"
else
    # Check if rate limited
    if echo "$LOGIN_RESP" | grep -q "429"; then
        log_skip "Admin login rate-limited  (try again later)"
    else
        log_fail "Admin login failed        ($LOGIN_RESP)"
    fi
fi

# --- 3. Authenticated endpoint groups ------------------------------------
if [[ -n "$TOKEN" && "$TOKEN" != "" ]]; then
    log_section "Authenticated API Endpoints"
    check_endpoint "GET /api/v1/users            " "$BASE_URL/api/v1/users"            "200" "$TOKEN"
    check_endpoint "GET /api/v1/tenants          " "$BASE_URL/api/v1/tenants"          "200" "$TOKEN"
    check_endpoint "GET /api/v1/roles            " "$BASE_URL/api/v1/roles"            "200" "$TOKEN"
    check_endpoint "GET /api/v1/permissions       " "$BASE_URL/api/v1/permissions"      "200" "$TOKEN"
    check_endpoint "GET /api/v1/auth-methods      " "$BASE_URL/api/v1/auth-methods"     "200" "$TOKEN"
    check_endpoint "GET /api/v1/auth-flows        " "$BASE_URL/api/v1/auth-flows"       "200" "$TOKEN"
    check_endpoint "GET /api/v1/enrollments       " "$BASE_URL/api/v1/enrollments"      "200" "$TOKEN"
    check_endpoint "GET /api/v1/audit-logs        " "$BASE_URL/api/v1/audit-logs"       "200" "$TOKEN"
    check_endpoint "GET /api/v1/auth/me           " "$BASE_URL/api/v1/auth/me"          "200" "$TOKEN"
    check_endpoint "GET /api/v1/statistics        " "$BASE_URL/api/v1/statistics"       "200" "$TOKEN"
    check_endpoint "GET /api/v1/auth-sessions     " "$BASE_URL/api/v1/auth-sessions"    "200" "$TOKEN"

    log_section "Documentation"
    # Swagger is restricted in production (403), available locally (200)
    swagger_status=$(curl -sk --connect-timeout 10 --max-time 15 -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $TOKEN" "$BASE_URL/swagger-ui/index.html" 2>/dev/null || echo "000")
    if [[ "$swagger_status" == "200" ]]; then
        log_pass "Swagger UI                    (HTTP 200 — accessible)"
    elif [[ "$swagger_status" == "403" ]]; then
        log_pass "Swagger UI                    (HTTP 403 — restricted in prod, OK)"
    else
        log_fail "Swagger UI                    (HTTP $swagger_status — unexpected)"
    fi
else
    log_section "Authenticated API Endpoints"
    echo -e "  ${YELLOW}[SKIP]${NC} No token available — skipping authenticated checks"
    SKIP=$((SKIP + 12))
fi

# --- 4. Security checks ---------------------------------------------------
log_section "Security Checks"
check_endpoint "Unauthenticated /users => 401" "$BASE_URL/api/v1/users" "401"
check_endpoint "Invalid token /users => 401  " "$BASE_URL/api/v1/users" "401" "invalid-jwt-token"

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
TOTAL=$((PASS + FAIL + SKIP))
echo ""
echo "============================================================"
echo "  Health Check Summary"
echo "============================================================"
echo ""
echo -e "  ${GREEN}Passed :${NC} $PASS"
echo -e "  ${RED}Failed :${NC} $FAIL"
echo -e "  ${YELLOW}Skipped:${NC} $SKIP"
echo -e "  Total  : $TOTAL"
echo ""

if [[ $FAIL -eq 0 ]]; then
    echo -e "  ${GREEN}Status: All checks passed.${NC}"
    exit 0
else
    echo -e "  ${RED}Status: $FAIL check(s) failed.${NC}"
    exit 1
fi
