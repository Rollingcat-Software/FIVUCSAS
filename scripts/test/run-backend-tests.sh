#!/bin/bash
# =============================================================================
# FIVUCSAS Backend Comprehensive Test Script
# =============================================================================

API_URL="http://34.116.233.134:8080"
PASS=0
FAIL=0
SKIP=0

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_pass() { echo -e "${GREEN}✓ PASS${NC} $1"; ((PASS++)); }
log_fail() { echo -e "${RED}✗ FAIL${NC} $1 - $2"; ((FAIL++)); }
log_skip() { echo -e "${YELLOW}○ SKIP${NC} $1"; ((SKIP++)); }

# Get status code from response
get_status() {
    echo "$1" | grep -o '"status":[0-9]*' | grep -o '[0-9]*' | head -1
}

echo "=============================================="
echo "FIVUCSAS Backend API Test Suite"
echo "API: $API_URL"
echo "Date: $(date)"
echo "=============================================="

# =============================================================================
# 1. Get Admin Token
# =============================================================================
echo ""
echo "=== SETUP: Getting Admin Token ==="

LOGIN_RESP=$(curl -s -X POST "$API_URL/api/v1/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"admin@fivucsas.local","password":"Test@123"}')

ADMIN_TOKEN=$(echo "$LOGIN_RESP" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)
ADMIN_ID=$(echo "$LOGIN_RESP" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
REFRESH_TOKEN=$(echo "$LOGIN_RESP" | grep -o '"refreshToken":"[^"]*"' | cut -d'"' -f4)

if [ -z "$ADMIN_TOKEN" ]; then
    echo -e "${RED}FATAL: Could not get admin token${NC}"
    exit 1
fi
echo "Admin Token: ${ADMIN_TOKEN:0:30}..."
echo "Admin ID: $ADMIN_ID"

# =============================================================================
# 2. Authentication Tests
# =============================================================================
echo ""
echo "=== 1. AUTHENTICATION TESTS ==="

# 1.1 Health Check
RESP=$(curl -s "$API_URL/api/v1/auth/health")
if [[ "$RESP" == *"healthy"* ]]; then
    log_pass "1.1 GET /auth/health"
else
    log_fail "1.1 GET /auth/health" "$RESP"
fi

# 1.2 Get Current User
RESP=$(curl -s "$API_URL/api/v1/auth/me" -H "Authorization: Bearer $ADMIN_TOKEN")
if [[ "$RESP" == *"admin@fivucsas.local"* ]]; then
    log_pass "1.2 GET /auth/me"
else
    log_fail "1.2 GET /auth/me" "$RESP"
fi

# 1.3 Refresh Token
RESP=$(curl -s -X POST "$API_URL/api/v1/auth/refresh" \
    -H "Content-Type: application/json" \
    -d "{\"refreshToken\":\"$REFRESH_TOKEN\"}")
if [[ "$RESP" == *"accessToken"* ]]; then
    log_pass "1.3 POST /auth/refresh"
else
    log_fail "1.3 POST /auth/refresh" "$RESP"
fi

# =============================================================================
# 3. User Tests
# =============================================================================
echo ""
echo "=== 2. USER TESTS ==="

# 2.1 List Users
RESP=$(curl -s "$API_URL/api/v1/users" -H "Authorization: Bearer $ADMIN_TOKEN")
if [[ "$RESP" == *"["* ]] || [[ "$RESP" == *"content"* ]]; then
    log_pass "2.1 GET /users"
else
    log_fail "2.1 GET /users" "$RESP"
fi

# 2.2 Get User by ID
RESP=$(curl -s "$API_URL/api/v1/users/$ADMIN_ID" -H "Authorization: Bearer $ADMIN_TOKEN")
if [[ "$RESP" == *"admin@fivucsas.local"* ]]; then
    log_pass "2.2 GET /users/{id}"
else
    log_fail "2.2 GET /users/{id}" "$RESP"
fi

# 2.3 Search Users
RESP=$(curl -s "$API_URL/api/v1/users/search?query=admin" -H "Authorization: Bearer $ADMIN_TOKEN")
if [[ "$RESP" == *"["* ]] || [[ "$RESP" == *"content"* ]] || [[ "$RESP" == *"admin"* ]]; then
    log_pass "2.3 GET /users/search"
else
    log_fail "2.3 GET /users/search" "$RESP"
fi

# =============================================================================
# 4. Tenant Tests
# =============================================================================
echo ""
echo "=== 3. TENANT TESTS ==="

# 3.1 List Tenants
RESP=$(curl -s "$API_URL/api/v1/tenants" -H "Authorization: Bearer $ADMIN_TOKEN")
if [[ "$RESP" == *"["* ]] || [[ "$RESP" == *"content"* ]] || [[ "$RESP" == *"system"* ]]; then
    log_pass "3.1 GET /tenants"
else
    log_fail "3.1 GET /tenants" "$RESP"
fi

# 3.2 Get Tenant by Slug
RESP=$(curl -s "$API_URL/api/v1/tenants/slug/system" -H "Authorization: Bearer $ADMIN_TOKEN")
if [[ "$RESP" == *"system"* ]]; then
    log_pass "3.2 GET /tenants/slug/{slug}"
    TENANT_ID=$(echo "$RESP" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
else
    log_fail "3.2 GET /tenants/slug/{slug}" "$RESP"
fi

# 3.3 Get Tenant by ID
if [ -n "$TENANT_ID" ]; then
    RESP=$(curl -s "$API_URL/api/v1/tenants/$TENANT_ID" -H "Authorization: Bearer $ADMIN_TOKEN")
    if [[ "$RESP" == *"system"* ]]; then
        log_pass "3.3 GET /tenants/{id}"
    else
        log_fail "3.3 GET /tenants/{id}" "$RESP"
    fi
else
    log_skip "3.3 GET /tenants/{id} (no tenant ID)"
fi

# =============================================================================
# 5. Role Tests
# =============================================================================
echo ""
echo "=== 4. ROLE TESTS ==="

# 4.1 List Roles
RESP=$(curl -s "$API_URL/api/v1/roles" -H "Authorization: Bearer $ADMIN_TOKEN")
if [[ "$RESP" == *"["* ]] || [[ "$RESP" == *"ADMIN"* ]] || [[ "$RESP" == *"name"* ]]; then
    log_pass "4.1 GET /roles"
    ROLE_ID=$(echo "$RESP" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
else
    log_fail "4.1 GET /roles" "$RESP"
fi

# 4.2 Get Role by ID
if [ -n "$ROLE_ID" ]; then
    RESP=$(curl -s "$API_URL/api/v1/roles/$ROLE_ID" -H "Authorization: Bearer $ADMIN_TOKEN")
    if [[ "$RESP" == *"name"* ]] || [[ "$RESP" == *"id"* ]]; then
        log_pass "4.2 GET /roles/{id}"
    else
        log_fail "4.2 GET /roles/{id}" "$RESP"
    fi
else
    log_skip "4.2 GET /roles/{id} (no role ID)"
fi

# =============================================================================
# 6. Permission Tests
# =============================================================================
echo ""
echo "=== 5. PERMISSION TESTS ==="

# 5.1 List Permissions
RESP=$(curl -s "$API_URL/api/v1/permissions" -H "Authorization: Bearer $ADMIN_TOKEN")
if [[ "$RESP" == *"["* ]] || [[ "$RESP" == *"name"* ]]; then
    log_pass "5.1 GET /permissions"
    PERM_ID=$(echo "$RESP" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
else
    log_fail "5.1 GET /permissions" "$RESP"
fi

# 5.2 Get Permission by ID
if [ -n "$PERM_ID" ]; then
    RESP=$(curl -s "$API_URL/api/v1/permissions/$PERM_ID" -H "Authorization: Bearer $ADMIN_TOKEN")
    if [[ "$RESP" == *"name"* ]] || [[ "$RESP" == *"resource"* ]]; then
        log_pass "5.2 GET /permissions/{id}"
    else
        log_fail "5.2 GET /permissions/{id}" "$RESP"
    fi
else
    log_skip "5.2 GET /permissions/{id} (no permission ID)"
fi

# =============================================================================
# 7. User Role Tests
# =============================================================================
echo ""
echo "=== 6. USER ROLE TESTS ==="

# 6.1 Get User's Roles
RESP=$(curl -s "$API_URL/api/v1/users/$ADMIN_ID/roles" -H "Authorization: Bearer $ADMIN_TOKEN")
if [[ "$RESP" == *"["* ]] || [[ "$RESP" == *"name"* ]]; then
    log_pass "6.1 GET /users/{id}/roles"
else
    log_fail "6.1 GET /users/{id}/roles" "$RESP"
fi

# =============================================================================
# 8. Audit Log Tests
# =============================================================================
echo ""
echo "=== 7. AUDIT LOG TESTS ==="

# 7.1 List Audit Logs
RESP=$(curl -s "$API_URL/api/v1/audit-logs" -H "Authorization: Bearer $ADMIN_TOKEN")
if [[ "$RESP" == *"["* ]] || [[ "$RESP" == *"content"* ]]; then
    log_pass "7.1 GET /audit-logs"
else
    log_fail "7.1 GET /audit-logs" "$RESP"
fi

# =============================================================================
# 9. Statistics Tests
# =============================================================================
echo ""
echo "=== 8. STATISTICS TESTS ==="

# 8.1 Get Statistics
RESP=$(curl -s "$API_URL/api/v1/statistics" -H "Authorization: Bearer $ADMIN_TOKEN")
if [[ "$RESP" == *"{"* ]]; then
    log_pass "8.1 GET /statistics"
else
    log_fail "8.1 GET /statistics" "$RESP"
fi

# =============================================================================
# 10. Guest Tests
# =============================================================================
echo ""
echo "=== 9. GUEST TESTS ==="

# 9.1 List Guests
RESP=$(curl -s "$API_URL/api/v1/guests" -H "Authorization: Bearer $ADMIN_TOKEN")
if [[ "$RESP" == *"["* ]] || [[ "$RESP" == *"content"* ]]; then
    log_pass "9.1 GET /guests"
else
    log_fail "9.1 GET /guests" "$RESP"
fi

# 9.2 Count Guests
RESP=$(curl -s "$API_URL/api/v1/guests/count" -H "Authorization: Bearer $ADMIN_TOKEN")
if [[ "$RESP" =~ ^[0-9]+$ ]] || [[ "$RESP" == *"count"* ]]; then
    log_pass "9.2 GET /guests/count"
else
    log_fail "9.2 GET /guests/count" "$RESP"
fi

# =============================================================================
# 11. Enrollment Tests
# =============================================================================
echo ""
echo "=== 10. ENROLLMENT TESTS ==="

# 10.1 List Enrollments
RESP=$(curl -s "$API_URL/api/v1/enrollments" -H "Authorization: Bearer $ADMIN_TOKEN")
if [[ "$RESP" == *"["* ]] || [[ "$RESP" == *"content"* ]]; then
    log_pass "10.1 GET /enrollments"
else
    log_fail "10.1 GET /enrollments" "$RESP"
fi

# =============================================================================
# 12. User Settings Tests
# =============================================================================
echo ""
echo "=== 11. USER SETTINGS TESTS ==="

# 11.1 Get User Settings
RESP=$(curl -s "$API_URL/api/v1/users/$ADMIN_ID/settings" -H "Authorization: Bearer $ADMIN_TOKEN")
if [[ "$RESP" == *"{"* ]]; then
    log_pass "11.1 GET /users/{id}/settings"
else
    log_fail "11.1 GET /users/{id}/settings" "$RESP"
fi

# 11.2 Get Notification Settings
RESP=$(curl -s "$API_URL/api/v1/users/$ADMIN_ID/settings/notifications" -H "Authorization: Bearer $ADMIN_TOKEN")
if [[ "$RESP" == *"{"* ]]; then
    log_pass "11.2 GET /users/{id}/settings/notifications"
else
    log_fail "11.2 GET /users/{id}/settings/notifications" "$RESP"
fi

# =============================================================================
# Summary
# =============================================================================
echo ""
echo "=============================================="
echo "TEST RESULTS SUMMARY"
echo "=============================================="
echo -e "${GREEN}PASSED: $PASS${NC}"
echo -e "${RED}FAILED: $FAIL${NC}"
echo -e "${YELLOW}SKIPPED: $SKIP${NC}"
echo "TOTAL: $((PASS + FAIL + SKIP))"
echo ""

if [ $FAIL -eq 0 ]; then
    echo -e "${GREEN}All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}Some tests failed. Check logs above.${NC}"
    exit 1
fi
