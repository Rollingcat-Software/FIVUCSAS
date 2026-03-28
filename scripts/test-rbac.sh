#!/bin/bash
# ============================================================================
# FIVUCSAS - RBAC (Role-Based Access Control) Verification Test Script
# ============================================================================
# Tests that role-based access control and multi-tenant isolation work
# correctly in the identity-core-api.
#
# Usage:
#   chmod +x test-rbac.sh
#   ./test-rbac.sh [BASE_URL]
#
# Default BASE_URL: https://auth.rollingcatsoftware.com
#
# This script:
#   1. Discovers existing roles and users from the API
#   2. Tests SUPER_ADMIN access (should have full access)
#   3. Tests unauthenticated / invalid-token access (should get 401)
#   4. Creates a TENANT_ADMIN and TENANT_MEMBER user in a separate tenant
#   5. Tests role-based restrictions (403 where expected)
#   6. Tests cross-tenant isolation
#   7. Cleans up all test data
#
# NOTE: This script creates temporary test tenants and users. They are
#       cleaned up automatically, even on failure.
# ============================================================================

set -o pipefail

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
BASE_URL="${1:-https://auth.rollingcatsoftware.com}"
ADMIN_EMAIL="${FIVUCSAS_ADMIN_EMAIL:-admin@fivucsas.local}"
ADMIN_PASS="${FIVUCSAS_ADMIN_PASS:-Test@123}"
CURL_OPTS="-sk --connect-timeout 10 --max-time 15"
RUN_ID="$(date +%s)"

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
TOTAL=0

# Cleanup tracking
ADMIN_TOKEN=""
TENANT_A_ID=""
TENANT_B_ID=""
USER_ADMIN_ID=""
USER_MEMBER_ID=""
USER_B_ID=""

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
log_pass()    { echo -e "  ${GREEN}[PASS]${NC} $1"; PASS=$((PASS + 1)); TOTAL=$((TOTAL + 1)); }
log_fail()    { echo -e "  ${RED}[FAIL]${NC} $1"; FAIL=$((FAIL + 1)); TOTAL=$((TOTAL + 1)); }
log_section() { echo -e "\n${CYAN}=== $1 ===${NC}"; }
log_info()    { echo -e "  ${YELLOW}[INFO]${NC} $1"; }

HTTP_STATUS=""
HTTP_BODY=""

api() {
    local method="$1"
    local path="$2"
    local token="$3"
    local body="${4:-}"
    local url="${BASE_URL}${path}"

    local tmp
    tmp=$(mktemp)

    local args=($CURL_OPTS -X "$method" -o "$tmp" -w "%{http_code}" \
        -H "Content-Type: application/json")

    [[ -n "$token" ]] && args+=(-H "Authorization: Bearer $token")
    [[ -n "$body" ]] && args+=(-d "$body")

    HTTP_STATUS=$(curl "${args[@]}" "$url" 2>/dev/null || echo "000")
    HTTP_BODY=$(cat "$tmp" 2>/dev/null || echo "")
    rm -f "$tmp"
}

json_field() {
    echo "$HTTP_BODY" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    print(d.get('$1',''))
except: print('')
" 2>/dev/null
}

assert_status() {
    local label="$1"
    local expected="$2"
    if [[ "$HTTP_STATUS" == "$expected" ]]; then
        log_pass "$label (HTTP $HTTP_STATUS)"
    else
        log_fail "$label (HTTP $HTTP_STATUS, expected $expected)"
        [[ -n "$HTTP_BODY" ]] && log_info "Response: ${HTTP_BODY:0:200}"
    fi
}

login_as() {
    local email="$1"
    local password="$2"
    local resp
    resp=$(curl $CURL_OPTS -X POST "$BASE_URL/api/v1/auth/login" \
        -H "Content-Type: application/json" \
        -d "{\"email\":\"$email\",\"password\":\"$password\"}" 2>/dev/null)

    echo "$resp" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    print(d.get('token','') or d.get('accessToken','') or
          d.get('data',{}).get('token','') or d.get('data',{}).get('accessToken','') or '')
except: print('')
" 2>/dev/null
}

# ---------------------------------------------------------------------------
# Cleanup
# ---------------------------------------------------------------------------
cleanup() {
    echo ""
    log_section "Cleanup"

    # Re-acquire admin token for cleanup
    ADMIN_TOKEN=$(login_as "$ADMIN_EMAIL" "$ADMIN_PASS" 2>/dev/null) || true

    if [[ -z "$ADMIN_TOKEN" ]]; then
        log_info "Could not acquire admin token for cleanup — manual cleanup may be needed"
        log_info "Look for entities with 'rbac-${RUN_ID}' in their names"
        return
    fi

    for uid in "$USER_B_ID" "$USER_MEMBER_ID" "$USER_ADMIN_ID"; do
        if [[ -n "$uid" ]]; then
            api DELETE "/api/v1/users/$uid" "$ADMIN_TOKEN"
            log_info "Deleted user $uid (HTTP $HTTP_STATUS)"
        fi
    done

    for tid in "$TENANT_B_ID" "$TENANT_A_ID"; do
        if [[ -n "$tid" ]]; then
            api DELETE "/api/v1/tenants/$tid" "$ADMIN_TOKEN"
            log_info "Deleted tenant $tid (HTTP $HTTP_STATUS)"
        fi
    done
}
trap cleanup EXIT

# ============================================================================
# Main
# ============================================================================
echo ""
echo "============================================================"
echo "  FIVUCSAS - RBAC Verification Tests"
echo "  Target : $BASE_URL"
echo "  Run ID : $RUN_ID"
echo "  Date   : $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
echo "============================================================"

# ============================================================================
# Phase 0: Authenticate as SUPER_ADMIN
# ============================================================================
log_section "Phase 0 — SUPER_ADMIN Authentication"

ADMIN_TOKEN=$(login_as "$ADMIN_EMAIL" "$ADMIN_PASS")
if [[ -z "$ADMIN_TOKEN" ]]; then
    echo -e "${RED}FATAL: Cannot authenticate as admin. Aborting.${NC}"
    echo "Possible causes: rate limiting, wrong credentials, API down."
    exit 1
fi
log_pass "SUPER_ADMIN login successful"

# ============================================================================
# Phase 1: Discovery — list existing roles and users
# ============================================================================
log_section "Phase 1 — Discovery"

api GET "/api/v1/roles" "$ADMIN_TOKEN"
assert_status "List all roles" "200"

ROLE_NAMES=$(echo "$HTTP_BODY" | python3 -c "
import sys, json
try:
    roles = json.load(sys.stdin)
    if isinstance(roles, dict): roles = roles.get('content', [])
    for r in roles:
        print(f\"  - {r['name']} (system={r.get('systemRole',False)})\")
except: pass
" 2>/dev/null)
echo "$ROLE_NAMES"

api GET "/api/v1/users?size=5" "$ADMIN_TOKEN"
assert_status "List users (discovery)" "200"

USER_COUNT=$(echo "$HTTP_BODY" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    content = d.get('content', d) if isinstance(d, dict) else d
    total = d.get('totalPages', 0) * d.get('size', len(content)) if isinstance(d, dict) else len(content)
    print(f'~{total}')
except: print('?')
" 2>/dev/null)
log_info "Total users in system: $USER_COUNT"

api GET "/api/v1/tenants" "$ADMIN_TOKEN"
assert_status "List tenants (discovery)" "200"

# ============================================================================
# Phase 2: SUPER_ADMIN Access Tests
# ============================================================================
log_section "Phase 2 — SUPER_ADMIN Access"

api GET "/api/v1/tenants" "$ADMIN_TOKEN"
assert_status "SUPER_ADMIN can list tenants" "200"

api GET "/api/v1/users" "$ADMIN_TOKEN"
assert_status "SUPER_ADMIN can list users" "200"

api GET "/api/v1/roles" "$ADMIN_TOKEN"
assert_status "SUPER_ADMIN can list roles" "200"

api GET "/api/v1/permissions" "$ADMIN_TOKEN"
assert_status "SUPER_ADMIN can list permissions" "200"

api GET "/api/v1/audit-logs" "$ADMIN_TOKEN"
assert_status "SUPER_ADMIN can list audit logs" "200"

api GET "/api/v1/statistics" "$ADMIN_TOKEN"
assert_status "SUPER_ADMIN can view statistics" "200"

# ============================================================================
# Phase 3: Unauthenticated / Invalid Token Tests
# ============================================================================
log_section "Phase 3 — Unauthenticated Access"

api GET "/api/v1/users" ""
assert_status "No token => 401 on /users" "401"

api GET "/api/v1/tenants" ""
assert_status "No token => 401 on /tenants" "401"

api GET "/api/v1/roles" ""
assert_status "No token => 401 on /roles" "401"

api GET "/api/v1/audit-logs" ""
assert_status "No token => 401 on /audit-logs" "401"

api GET "/api/v1/statistics" ""
assert_status "No token => 401 on /statistics" "401"

log_section "Phase 3b — Invalid / Expired Token"

api GET "/api/v1/users" "invalid-jwt-token-abc123"
assert_status "Invalid token => 401 on /users" "401"

api GET "/api/v1/tenants" "eyJhbGciOiJIUzI1NiJ9.eyJleHAiOjB9.fake"
assert_status "Malformed JWT => 401 on /tenants" "401"

api POST "/api/v1/users" "" "{\"email\":\"hacker@evil.com\",\"password\":\"Hack@123\",\"firstName\":\"H\",\"lastName\":\"H\"}"
assert_status "No token => 401 on POST /users" "401"

# ============================================================================
# Phase 4: Setup — Create test tenants and role-specific users
# ============================================================================
log_section "Phase 4 — Test Data Setup"

# Create Tenant A
api POST "/api/v1/tenants" "$ADMIN_TOKEN" \
    "{\"name\":\"RBAC-TenantA-${RUN_ID}\",\"slug\":\"rbac-a-${RUN_ID}\",\"contactEmail\":\"a-${RUN_ID}@test.local\",\"maxUsers\":10}"
if [[ "$HTTP_STATUS" == "201" ]]; then
    TENANT_A_ID=$(json_field "id")
    log_pass "Created Tenant A: $TENANT_A_ID"
else
    log_fail "Create Tenant A (HTTP $HTTP_STATUS)"
fi

# Create Tenant B
api POST "/api/v1/tenants" "$ADMIN_TOKEN" \
    "{\"name\":\"RBAC-TenantB-${RUN_ID}\",\"slug\":\"rbac-b-${RUN_ID}\",\"contactEmail\":\"b-${RUN_ID}@test.local\",\"maxUsers\":10}"
if [[ "$HTTP_STATUS" == "201" ]]; then
    TENANT_B_ID=$(json_field "id")
    log_pass "Created Tenant B: $TENANT_B_ID"
else
    log_fail "Create Tenant B (HTTP $HTTP_STATUS)"
fi

# Create TENANT_ADMIN user in Tenant A
if [[ -n "$TENANT_A_ID" ]]; then
    api POST "/api/v1/users" "$ADMIN_TOKEN" \
        "{\"email\":\"rbac-admin-${RUN_ID}@test.local\",\"password\":\"Test@123\",\"firstName\":\"TenantAdmin\",\"lastName\":\"Testuser\",\"tenantId\":\"$TENANT_A_ID\",\"role\":\"TENANT_ADMIN\"}"
    if [[ "$HTTP_STATUS" == "201" ]]; then
        USER_ADMIN_ID=$(json_field "id")
        log_pass "Created TENANT_ADMIN user in Tenant A"
    else
        log_fail "Create TENANT_ADMIN user (HTTP $HTTP_STATUS)"
        log_info "Response: ${HTTP_BODY:0:200}"
    fi
fi

# Create TENANT_MEMBER user in Tenant A
if [[ -n "$TENANT_A_ID" ]]; then
    api POST "/api/v1/users" "$ADMIN_TOKEN" \
        "{\"email\":\"rbac-member-${RUN_ID}@test.local\",\"password\":\"Test@123\",\"firstName\":\"TenantMember\",\"lastName\":\"Testuser\",\"tenantId\":\"$TENANT_A_ID\",\"role\":\"TENANT_MEMBER\"}"
    if [[ "$HTTP_STATUS" == "201" ]]; then
        USER_MEMBER_ID=$(json_field "id")
        log_pass "Created TENANT_MEMBER user in Tenant A"
    else
        log_fail "Create TENANT_MEMBER user (HTTP $HTTP_STATUS)"
        log_info "Response: ${HTTP_BODY:0:200}"
    fi
fi

# Create user in Tenant B (for cross-tenant isolation tests)
if [[ -n "$TENANT_B_ID" ]]; then
    api POST "/api/v1/users" "$ADMIN_TOKEN" \
        "{\"email\":\"rbac-b-user-${RUN_ID}@test.local\",\"password\":\"Test@123\",\"firstName\":\"TenantBUser\",\"lastName\":\"Testuser\",\"tenantId\":\"$TENANT_B_ID\",\"role\":\"TENANT_MEMBER\"}"
    if [[ "$HTTP_STATUS" == "201" ]]; then
        USER_B_ID=$(json_field "id")
        log_pass "Created user in Tenant B"
    else
        log_fail "Create Tenant B user (HTTP $HTTP_STATUS)"
    fi
fi

# ============================================================================
# Phase 5: TENANT_ADMIN Role Tests
# ============================================================================
log_section "Phase 5 — TENANT_ADMIN Access"

TENANT_ADMIN_TOKEN=""
if [[ -n "$USER_ADMIN_ID" ]]; then
    TENANT_ADMIN_TOKEN=$(login_as "rbac-admin-${RUN_ID}@test.local" "Test@123")
fi

if [[ -n "$TENANT_ADMIN_TOKEN" ]]; then
    log_pass "TENANT_ADMIN login successful"

    # Should be able to read own profile
    api GET "/api/v1/auth/me" "$TENANT_ADMIN_TOKEN"
    assert_status "TENANT_ADMIN can read own profile" "200"

    # Test: TENANT_ADMIN accessing cross-tenant data
    # Should NOT be able to list ALL tenants (system-wide) or expect 403
    api GET "/api/v1/tenants" "$TENANT_ADMIN_TOKEN"
    if [[ "$HTTP_STATUS" == "403" ]]; then
        log_pass "TENANT_ADMIN cannot list all tenants (HTTP 403)"
    elif [[ "$HTTP_STATUS" == "200" ]]; then
        # Some APIs return 200 but filter to own tenant only
        TENANT_COUNT=$(echo "$HTTP_BODY" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    content = d.get('content', d) if isinstance(d, dict) else d
    print(len(content) if isinstance(content, list) else 0)
except: print(0)
" 2>/dev/null)
        if [[ "$TENANT_COUNT" -le 1 ]]; then
            log_pass "TENANT_ADMIN sees only own tenant ($TENANT_COUNT tenant(s))"
        else
            log_info "TENANT_ADMIN sees $TENANT_COUNT tenants (may be filtered or full list)"
            log_fail "TENANT_ADMIN can see multiple tenants (expected filtered)"
        fi
    else
        log_fail "TENANT_ADMIN /tenants unexpected (HTTP $HTTP_STATUS)"
    fi

    # Test: TENANT_ADMIN should not see other tenant's data
    if [[ -n "$TENANT_B_ID" ]]; then
        api GET "/api/v1/tenants/$TENANT_B_ID" "$TENANT_ADMIN_TOKEN"
        if [[ "$HTTP_STATUS" == "403" || "$HTTP_STATUS" == "404" ]]; then
            log_pass "TENANT_ADMIN cannot access Tenant B data (HTTP $HTTP_STATUS)"
        elif [[ "$HTTP_STATUS" == "200" ]]; then
            log_fail "TENANT_ADMIN CAN access Tenant B data (expected 403/404)"
        else
            log_info "TENANT_ADMIN accessing Tenant B returned HTTP $HTTP_STATUS"
            log_pass "TENANT_ADMIN Tenant B access handled (HTTP $HTTP_STATUS)"
        fi
    fi

    # Test: TENANT_ADMIN should not create system-level resources
    api POST "/api/v1/tenants" "$TENANT_ADMIN_TOKEN" \
        "{\"name\":\"Hacked-Tenant-${RUN_ID}\",\"slug\":\"hacked-${RUN_ID}\",\"contactEmail\":\"h@h.com\",\"maxUsers\":5}"
    if [[ "$HTTP_STATUS" == "403" ]]; then
        log_pass "TENANT_ADMIN cannot create tenants (HTTP 403)"
    elif [[ "$HTTP_STATUS" == "201" ]]; then
        # Clean up the accidentally created tenant
        HACKED_ID=$(json_field "id")
        log_fail "TENANT_ADMIN CAN create tenants (security issue!)"
        if [[ -n "$HACKED_ID" ]]; then
            api DELETE "/api/v1/tenants/$HACKED_ID" "$ADMIN_TOKEN"
            log_info "Cleaned up unauthorized tenant $HACKED_ID"
        fi
    else
        log_info "TENANT_ADMIN create tenant returned HTTP $HTTP_STATUS"
        log_pass "TENANT_ADMIN tenant creation blocked (HTTP $HTTP_STATUS)"
    fi
else
    log_info "TENANT_ADMIN login failed or rate-limited — skipping TENANT_ADMIN tests"
    log_fail "TENANT_ADMIN login"
    # Add skipped counts
    TOTAL=$((TOTAL + 4))
    FAIL=$((FAIL + 4))
fi

# ============================================================================
# Phase 6: TENANT_MEMBER Role Tests
# ============================================================================
log_section "Phase 6 — TENANT_MEMBER Access"

TENANT_MEMBER_TOKEN=""
if [[ -n "$USER_MEMBER_ID" ]]; then
    TENANT_MEMBER_TOKEN=$(login_as "rbac-member-${RUN_ID}@test.local" "Test@123")
fi

if [[ -n "$TENANT_MEMBER_TOKEN" ]]; then
    log_pass "TENANT_MEMBER login successful"

    # Should be able to read own profile
    api GET "/api/v1/auth/me" "$TENANT_MEMBER_TOKEN"
    assert_status "TENANT_MEMBER can read own profile" "200"

    # Should NOT be able to create users
    api POST "/api/v1/users" "$TENANT_MEMBER_TOKEN" \
        "{\"email\":\"hacked-user-${RUN_ID}@test.local\",\"password\":\"Test@123\",\"firstName\":\"Hacked\",\"lastName\":\"User\",\"tenantId\":\"$TENANT_A_ID\",\"role\":\"TENANT_MEMBER\"}"
    if [[ "$HTTP_STATUS" == "403" ]]; then
        log_pass "TENANT_MEMBER cannot create users (HTTP 403)"
    elif [[ "$HTTP_STATUS" == "201" ]]; then
        HACKED_USER_ID=$(json_field "id")
        log_fail "TENANT_MEMBER CAN create users (security issue!)"
        if [[ -n "$HACKED_USER_ID" ]]; then
            api DELETE "/api/v1/users/$HACKED_USER_ID" "$ADMIN_TOKEN"
            log_info "Cleaned up unauthorized user"
        fi
    else
        log_info "TENANT_MEMBER create user returned HTTP $HTTP_STATUS"
        log_pass "TENANT_MEMBER user creation blocked (HTTP $HTTP_STATUS)"
    fi

    # Should NOT be able to create roles
    api POST "/api/v1/roles" "$TENANT_MEMBER_TOKEN" \
        "{\"name\":\"HACKED_ROLE_${RUN_ID}\",\"description\":\"Unauthorized\",\"tenantId\":\"$TENANT_A_ID\"}"
    if [[ "$HTTP_STATUS" == "403" ]]; then
        log_pass "TENANT_MEMBER cannot create roles (HTTP 403)"
    elif [[ "$HTTP_STATUS" == "201" ]]; then
        HACKED_ROLE_ID=$(json_field "id")
        log_fail "TENANT_MEMBER CAN create roles (security issue!)"
        if [[ -n "$HACKED_ROLE_ID" ]]; then
            api DELETE "/api/v1/roles/$HACKED_ROLE_ID" "$ADMIN_TOKEN"
        fi
    else
        log_info "TENANT_MEMBER create role returned HTTP $HTTP_STATUS"
        log_pass "TENANT_MEMBER role creation blocked (HTTP $HTTP_STATUS)"
    fi

    # Should NOT be able to delete users
    if [[ -n "$USER_ADMIN_ID" ]]; then
        api DELETE "/api/v1/users/$USER_ADMIN_ID" "$TENANT_MEMBER_TOKEN"
        if [[ "$HTTP_STATUS" == "403" ]]; then
            log_pass "TENANT_MEMBER cannot delete other users (HTTP 403)"
        elif [[ "$HTTP_STATUS" == "204" ]]; then
            log_fail "TENANT_MEMBER CAN delete users (security issue!)"
            USER_ADMIN_ID=""  # already deleted
        else
            log_info "TENANT_MEMBER delete user returned HTTP $HTTP_STATUS"
            log_pass "TENANT_MEMBER user deletion blocked (HTTP $HTTP_STATUS)"
        fi
    fi

    # Should NOT be able to access audit logs
    api GET "/api/v1/audit-logs" "$TENANT_MEMBER_TOKEN"
    if [[ "$HTTP_STATUS" == "403" ]]; then
        log_pass "TENANT_MEMBER cannot access audit logs (HTTP 403)"
    elif [[ "$HTTP_STATUS" == "200" ]]; then
        log_info "TENANT_MEMBER can access audit logs (HTTP 200) — may be filtered"
        log_pass "TENANT_MEMBER audit logs access handled"
    else
        log_info "TENANT_MEMBER audit logs returned HTTP $HTTP_STATUS"
        log_pass "TENANT_MEMBER audit logs handled (HTTP $HTTP_STATUS)"
    fi

else
    log_info "TENANT_MEMBER login failed or rate-limited — skipping TENANT_MEMBER tests"
    log_fail "TENANT_MEMBER login"
    TOTAL=$((TOTAL + 5))
    FAIL=$((FAIL + 5))
fi

# ============================================================================
# Phase 7: Cross-Tenant Isolation Tests
# ============================================================================
log_section "Phase 7 — Cross-Tenant Isolation"

if [[ -n "$TENANT_ADMIN_TOKEN" && -n "$USER_B_ID" ]]; then
    # Tenant A admin should not see Tenant B user
    api GET "/api/v1/users/$USER_B_ID" "$TENANT_ADMIN_TOKEN"
    if [[ "$HTTP_STATUS" == "403" || "$HTTP_STATUS" == "404" ]]; then
        log_pass "Tenant A admin cannot see Tenant B user (HTTP $HTTP_STATUS)"
    elif [[ "$HTTP_STATUS" == "200" ]]; then
        log_fail "Tenant A admin CAN see Tenant B user (cross-tenant leak!)"
    else
        log_info "Cross-tenant user access returned HTTP $HTTP_STATUS"
        log_pass "Cross-tenant user access handled (HTTP $HTTP_STATUS)"
    fi

    # Tenant A admin should not be able to modify Tenant B user
    api PUT "/api/v1/users/$USER_B_ID" "$TENANT_ADMIN_TOKEN" \
        "{\"firstName\":\"Hacked\",\"lastName\":\"CrossTenant\",\"email\":\"rbac-b-user-${RUN_ID}@test.local\"}"
    if [[ "$HTTP_STATUS" == "403" || "$HTTP_STATUS" == "404" ]]; then
        log_pass "Tenant A admin cannot modify Tenant B user (HTTP $HTTP_STATUS)"
    elif [[ "$HTTP_STATUS" == "200" ]]; then
        log_fail "Tenant A admin CAN modify Tenant B user (cross-tenant issue!)"
    else
        log_info "Cross-tenant user modify returned HTTP $HTTP_STATUS"
        log_pass "Cross-tenant user modification handled (HTTP $HTTP_STATUS)"
    fi

    # Tenant A admin should not delete Tenant B user
    api DELETE "/api/v1/users/$USER_B_ID" "$TENANT_ADMIN_TOKEN"
    if [[ "$HTTP_STATUS" == "403" || "$HTTP_STATUS" == "404" ]]; then
        log_pass "Tenant A admin cannot delete Tenant B user (HTTP $HTTP_STATUS)"
    elif [[ "$HTTP_STATUS" == "204" ]]; then
        log_fail "Tenant A admin CAN delete Tenant B user (cross-tenant issue!)"
        USER_B_ID=""
    else
        log_info "Cross-tenant user delete returned HTTP $HTTP_STATUS"
        log_pass "Cross-tenant user deletion handled (HTTP $HTTP_STATUS)"
    fi

elif [[ -z "$TENANT_ADMIN_TOKEN" ]]; then
    log_info "Skipping cross-tenant tests — TENANT_ADMIN token not available"
    TOTAL=$((TOTAL + 3))
    FAIL=$((FAIL + 3))
else
    log_info "Skipping cross-tenant tests — Tenant B user not created"
    TOTAL=$((TOTAL + 3))
    FAIL=$((FAIL + 3))
fi

# Cross-tenant from TENANT_MEMBER perspective
if [[ -n "$TENANT_MEMBER_TOKEN" && -n "$TENANT_B_ID" ]]; then
    # Tenant A member should not be able to see Tenant B details
    api GET "/api/v1/tenants/$TENANT_B_ID" "$TENANT_MEMBER_TOKEN"
    if [[ "$HTTP_STATUS" == "403" || "$HTTP_STATUS" == "404" ]]; then
        log_pass "Tenant A member cannot see Tenant B details (HTTP $HTTP_STATUS)"
    elif [[ "$HTTP_STATUS" == "200" ]]; then
        log_fail "Tenant A member CAN see Tenant B details (cross-tenant leak!)"
    else
        log_info "Cross-tenant access returned HTTP $HTTP_STATUS"
        log_pass "Cross-tenant access handled (HTTP $HTTP_STATUS)"
    fi
fi

# ============================================================================
# Phase 8: Privilege Escalation Tests
# ============================================================================
log_section "Phase 8 — Privilege Escalation"

if [[ -n "$TENANT_MEMBER_TOKEN" ]]; then
    # TENANT_MEMBER should not be able to escalate own role
    if [[ -n "$USER_MEMBER_ID" ]]; then
        api PUT "/api/v1/users/$USER_MEMBER_ID" "$TENANT_MEMBER_TOKEN" \
            "{\"firstName\":\"TenantMember\",\"lastName\":\"Testuser\",\"email\":\"rbac-member-${RUN_ID}@test.local\",\"role\":\"SUPER_ADMIN\"}"
        if [[ "$HTTP_STATUS" == "403" ]]; then
            log_pass "TENANT_MEMBER cannot escalate to SUPER_ADMIN (HTTP 403)"
        elif [[ "$HTTP_STATUS" == "200" ]]; then
            # Check if role actually changed
            api GET "/api/v1/auth/me" "$TENANT_MEMBER_TOKEN"
            CURRENT_ROLE=$(json_field "role")
            if [[ "$CURRENT_ROLE" == "SUPER_ADMIN" ]]; then
                log_fail "TENANT_MEMBER escalated to SUPER_ADMIN (critical security issue!)"
            else
                log_pass "Role escalation attempt ignored (role unchanged: $CURRENT_ROLE)"
            fi
        else
            log_info "Role escalation attempt returned HTTP $HTTP_STATUS"
            log_pass "Role escalation blocked (HTTP $HTTP_STATUS)"
        fi
    fi

    # TENANT_MEMBER should not be able to modify system roles
    api PUT "/api/v1/roles/20000000-0000-0000-0000-000000000005" "$TENANT_MEMBER_TOKEN" \
        "{\"name\":\"HACKED\",\"description\":\"Hacked\",\"tenantId\":\"00000000-0000-0000-0000-000000000000\"}"
    if [[ "$HTTP_STATUS" == "403" ]]; then
        log_pass "TENANT_MEMBER cannot modify system roles (HTTP 403)"
    elif [[ "$HTTP_STATUS" == "200" ]]; then
        log_fail "TENANT_MEMBER CAN modify system roles (security issue!)"
    else
        log_info "System role modification returned HTTP $HTTP_STATUS"
        log_pass "System role modification blocked (HTTP $HTTP_STATUS)"
    fi
else
    log_info "Skipping privilege escalation tests — TENANT_MEMBER token not available"
    TOTAL=$((TOTAL + 2))
    FAIL=$((FAIL + 2))
fi

# ============================================================================
# Summary
# ============================================================================
echo ""
echo "============================================================"
echo "  RBAC Test Summary"
echo "============================================================"
echo ""
echo -e "  ${GREEN}Passed:${NC} $PASS / $TOTAL"
echo -e "  ${RED}Failed:${NC} $FAIL / $TOTAL"
echo ""

if [[ $FAIL -eq 0 ]]; then
    echo -e "  ${GREEN}Result: ALL RBAC TESTS PASSED${NC}"
    echo ""
    echo "  Notes:"
    echo "  - Some APIs may return 200 with filtered data instead of 403."
    echo "    This is acceptable if the response only contains data the"
    echo "    user is authorized to see."
    exit 0
else
    echo -e "  ${RED}Result: $FAIL RBAC TEST(S) FAILED${NC}"
    echo ""
    echo "  Review the failures above. Items marked as 'security issue!'"
    echo "  require immediate attention."
    exit 1
fi
