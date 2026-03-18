#!/bin/bash
# FIVUCSAS Production Security Audit
BASE_URL="https://auth.rollingcatsoftware.com"

echo "=== FIVUCSAS Security Audit ==="
echo "Target: $BASE_URL"
echo "Date: $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
echo ""

# 1. Check security headers
echo "--- Security Headers ---"
HEADERS=$(curl -sI "$BASE_URL/actuator/health")
echo "$HEADERS" | grep -i "x-frame\|x-content\|strict-transport\|referrer\|permissions\|content-security" || echo "  [WARN] No security headers found"
echo ""

# 2. Check CORS
echo "--- CORS ---"
CORS=$(curl -sI -H "Origin: https://evil.com" "$BASE_URL/api/v1/auth/login" | grep -i "access-control")
if [ -z "$CORS" ]; then
    echo "  [PASS] No CORS headers returned for evil.com origin"
else
    echo "  [WARN] CORS headers present for evil.com:"
    echo "  $CORS"
fi
echo ""

# 3. Check rate limiting
echo "--- Rate Limiting ---"
RATE_LIMITED=false
for i in $(seq 1 10); do
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/v1/auth/login" \
        -H "Content-Type: application/json" \
        -d '{"email":"test@test.com","password":"wrong"}')
    echo "  Attempt $i: HTTP $STATUS"
    if [ "$STATUS" = "429" ]; then
        echo "  [PASS] Rate limit triggered at attempt $i"
        RATE_LIMITED=true
        break
    fi
done
if [ "$RATE_LIMITED" = "false" ]; then
    echo "  [INFO] Rate limit not triggered in 10 attempts (may need more or shorter interval)"
fi
echo ""

# 4. Check endpoints don't leak info
echo "--- Info Leakage ---"
echo "  GET /api/v1/users (unauthenticated):"
USERS_RESP=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/v1/users")
echo "    HTTP $USERS_RESP"
if [ "$USERS_RESP" = "401" ] || [ "$USERS_RESP" = "403" ]; then
    echo "    [PASS] Properly protected"
else
    echo "    [WARN] Unexpected response code"
fi

echo "  GET /api/v1/auth/me (unauthenticated):"
ME_RESP=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/v1/auth/me")
echo "    HTTP $ME_RESP"
if [ "$ME_RESP" = "401" ] || [ "$ME_RESP" = "403" ]; then
    echo "    [PASS] Properly protected"
else
    echo "    [WARN] Unexpected response code"
fi

echo "  GET /actuator (should be limited):"
ACTUATOR_RESP=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/actuator")
echo "    HTTP $ACTUATOR_RESP"

echo "  GET /actuator/env (should be blocked):"
ENV_RESP=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/actuator/env")
echo "    HTTP $ENV_RESP"
if [ "$ENV_RESP" = "401" ] || [ "$ENV_RESP" = "403" ] || [ "$ENV_RESP" = "404" ]; then
    echo "    [PASS] Sensitive actuator endpoint protected"
else
    echo "    [WARN] Actuator env endpoint may be exposed"
fi
echo ""

# 5. Check anti-replay header
echo "--- Anti-Replay ---"
REPLAY_HEADERS=$(curl -sI -X POST "$BASE_URL/api/v1/biometric/enroll/test" \
    -H "Content-Type: multipart/form-data" | grep -i "nonce\|replay")
if [ -z "$REPLAY_HEADERS" ]; then
    echo "  [INFO] No anti-replay headers detected (may be handled at application level)"
else
    echo "  $REPLAY_HEADERS"
fi
echo ""

# 6. Check TLS
echo "--- TLS Configuration ---"
TLS_INFO=$(curl -sI "$BASE_URL" 2>&1 | head -1)
echo "  $TLS_INFO"
if echo "$TLS_INFO" | grep -q "HTTP/2"; then
    echo "  [PASS] HTTP/2 supported"
fi
echo ""

# 7. Check common sensitive paths
echo "--- Sensitive Path Check ---"
for path in "/.env" "/.git/config" "/wp-admin" "/phpmyadmin" "/api/v1/admin" "/swagger-ui.html"; do
    CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL$path")
    echo "  $path: HTTP $CODE"
done
echo ""

echo "=== Audit Complete ==="
