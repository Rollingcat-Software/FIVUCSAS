#!/bin/bash

# FIVUCSAS Backend-Frontend Integration Test Script
# This script verifies that the integration is working correctly

set -e

echo "================================================"
echo "FIVUCSAS Integration Test"
echo "================================================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test results
PASSED=0
FAILED=0

# Function to test endpoint
test_endpoint() {
    local name=$1
    local url=$2
    local expected_status=$3
    local method=${4:-GET}
    local data=${5:-}

    echo -n "Testing $name... "

    if [ "$method" = "GET" ]; then
        response=$(curl -s -o /dev/null -w "%{http_code}" "$url")
    else
        response=$(curl -s -o /dev/null -w "%{http_code}" -X "$method" -H "Content-Type: application/json" -d "$data" "$url")
    fi

    if [ "$response" = "$expected_status" ]; then
        echo -e "${GREEN}✓ PASSED${NC} (HTTP $response)"
        ((PASSED++))
    else
        echo -e "${RED}✗ FAILED${NC} (Expected HTTP $expected_status, got HTTP $response)"
        ((FAILED++))
    fi
}

# Test 1: Backend Health Check
echo "1. Testing Backend Health"
test_endpoint "Backend Health" "http://localhost:8080/api/v1/auth/health" "200"
echo ""

# Test 2: Swagger UI
echo "2. Testing API Documentation"
test_endpoint "Swagger UI" "http://localhost:8080/swagger-ui.html" "200"
echo ""

# Test 3: CORS Preflight (simulated)
echo "3. Testing CORS Configuration"
test_endpoint "CORS Preflight" "http://localhost:8080/api/v1/auth/login" "200" "OPTIONS"
echo ""

# Test 4: Register User
echo "4. Testing User Registration"
REGISTER_DATA='{"email":"test-'$(date +%s)'@example.com","password":"Test123!","firstName":"Test","lastName":"User"}'
test_endpoint "User Registration" "http://localhost:8080/api/v1/auth/register" "201" "POST" "$REGISTER_DATA"
echo ""

# Test 5: Login (should fail with 401 for invalid credentials)
echo "5. Testing Login Validation"
LOGIN_DATA='{"email":"invalid@example.com","password":"wrong"}'
test_endpoint "Login Validation" "http://localhost:8080/api/v1/auth/login" "401" "POST" "$LOGIN_DATA"
echo ""

# Test 6: Web App
echo "6. Testing Web App"
if curl -s http://localhost:5173 > /dev/null 2>&1; then
    echo -e "${GREEN}✓ PASSED${NC} Web app is running on port 5173"
    ((PASSED++))
else
    echo -e "${YELLOW}⚠ SKIPPED${NC} Web app is not running (expected if not started)"
fi
echo ""

# Test 7: Check if mock mode is disabled
echo "7. Checking Web App Configuration"
if [ -f "web-app/.env" ]; then
    if grep -q "VITE_ENABLE_MOCK_API=false" "web-app/.env"; then
        echo -e "${GREEN}✓ PASSED${NC} Mock mode is disabled"
        ((PASSED++))
    else
        echo -e "${RED}✗ FAILED${NC} Mock mode is still enabled in .env"
        ((FAILED++))
    fi
else
    echo -e "${YELLOW}⚠ WARNING${NC} .env file not found"
fi
echo ""

# Test 8: Check mobile app configuration
echo "8. Checking Mobile App Configuration"
if [ -f "mobile-app/shared/src/commonMain/kotlin/com/fivucsas/shared/data/remote/config/ApiConfig.kt" ]; then
    if grep -q "useRealApi: Boolean = true" "mobile-app/shared/src/commonMain/kotlin/com/fivucsas/shared/data/remote/config/ApiConfig.kt"; then
        echo -e "${GREEN}✓ PASSED${NC} Real API is enabled"
        ((PASSED++))
    else
        echo -e "${RED}✗ FAILED${NC} Real API is not enabled in ApiConfig.kt"
        ((FAILED++))
    fi
else
    echo -e "${YELLOW}⚠ WARNING${NC} ApiConfig.kt not found"
fi
echo ""

# Summary
echo "================================================"
echo "Test Summary"
echo "================================================"
echo -e "Passed: ${GREEN}$PASSED${NC}"
echo -e "Failed: ${RED}$FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All tests passed! Integration is working correctly.${NC}"
    exit 0
else
    echo -e "${RED}✗ Some tests failed. Please check the errors above.${NC}"
    exit 1
fi
