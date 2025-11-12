#!/bin/bash

# Load Test Validation Script
# Checks if all test files are properly configured

set -e

BOLD='\033[1m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BOLD}=====================================================${NC}"
echo -e "${BOLD}FIVUCSAS Load Test Validation${NC}"
echo -e "${BOLD}=====================================================${NC}"
echo ""

# Check if we're in the right directory
if [ ! -f "config.js" ]; then
    echo -e "${RED}✗ Error: config.js not found${NC}"
    echo "Please run this script from the load-tests directory"
    exit 1
fi

echo -e "${GREEN}✓ Running from load-tests directory${NC}"
echo ""

# Check for K6
echo -e "${BOLD}Checking K6 installation...${NC}"
if command -v k6 &> /dev/null; then
    K6_VERSION=$(k6 version | head -n 1)
    echo -e "${GREEN}✓ K6 is installed: $K6_VERSION${NC}"
else
    echo -e "${YELLOW}⚠ K6 is not installed${NC}"
    echo "  Install: brew install k6 (macOS) or apt install k6 (Linux)"
fi
echo ""

# Check test files
echo -e "${BOLD}Checking test scenario files...${NC}"
SCENARIOS=(
    "scenarios/auth-load-test.js"
    "scenarios/enrollment-load-test.js"
    "scenarios/verification-load-test.js"
    "scenarios/multi-tenant-load-test.js"
    "scenarios/stress-test.js"
    "scenarios/spike-test.js"
)

MISSING=0
for scenario in "${SCENARIOS[@]}"; do
    if [ -f "$scenario" ]; then
        echo -e "${GREEN}✓ $scenario${NC}"
    else
        echo -e "${RED}✗ $scenario (missing)${NC}"
        MISSING=$((MISSING + 1))
    fi
done
echo ""

if [ $MISSING -gt 0 ]; then
    echo -e "${RED}✗ $MISSING test file(s) missing${NC}"
    exit 1
fi

# Check utility files
echo -e "${BOLD}Checking utility files...${NC}"
UTILS=(
    "utils/auth.js"
    "utils/biometric.js"
)

for util in "${UTILS[@]}"; do
    if [ -f "$util" ]; then
        echo -e "${GREEN}✓ $util${NC}"
    else
        echo -e "${RED}✗ $util (missing)${NC}"
        MISSING=$((MISSING + 1))
    fi
done
echo ""

# Check configuration
echo -e "${BOLD}Checking configuration...${NC}"
if grep -q "identityApiUrl" config.js; then
    echo -e "${GREEN}✓ identityApiUrl configured${NC}"
else
    echo -e "${RED}✗ identityApiUrl not found in config.js${NC}"
fi

if grep -q "biometricApiUrl" config.js; then
    echo -e "${GREEN}✓ biometricApiUrl configured${NC}"
else
    echo -e "${RED}✗ biometricApiUrl not found in config.js${NC}"
fi

if grep -q "thresholds" config.js; then
    echo -e "${GREEN}✓ Performance thresholds defined${NC}"
else
    echo -e "${RED}✗ Performance thresholds not found${NC}"
fi
echo ""

# Check services (optional)
echo -e "${BOLD}Checking services availability...${NC}"

# Check Identity API
if curl -s http://localhost:8080/actuator/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Identity API is running (http://localhost:8080)${NC}"
else
    echo -e "${YELLOW}⚠ Identity API is not running (http://localhost:8080)${NC}"
    echo "  Start with: cd identity-core-api && ./mvnw spring-boot:run"
fi

# Check Biometric API
if curl -s http://localhost:8000/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Biometric API is running (http://localhost:8000)${NC}"
else
    echo -e "${YELLOW}⚠ Biometric API is not running (http://localhost:8000)${NC}"
    echo "  Start with: cd biometric-processor && uvicorn app.main:app --reload"
fi

# Check PostgreSQL
if command -v psql &> /dev/null; then
    if psql -U fivucsas_user -d fivucsas -h localhost -c "SELECT 1" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ PostgreSQL is running${NC}"
    else
        echo -e "${YELLOW}⚠ PostgreSQL is not accessible${NC}"
        echo "  Start with: docker run -p 5432:5432 -e POSTGRES_DB=fivucsas -e POSTGRES_USER=fivucsas_user -e POSTGRES_PASSWORD=fivucsas_password postgres:15"
    fi
else
    echo -e "${YELLOW}⚠ psql not installed (skipping PostgreSQL check)${NC}"
fi

# Check Redis
if command -v redis-cli &> /dev/null; then
    if redis-cli ping > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Redis is running${NC}"
    else
        echo -e "${YELLOW}⚠ Redis is not accessible${NC}"
        echo "  Start with: docker run -p 6379:6379 redis:7-alpine"
    fi
else
    echo -e "${YELLOW}⚠ redis-cli not installed (skipping Redis check)${NC}"
fi
echo ""

# Summary
echo -e "${BOLD}=====================================================${NC}"
echo -e "${BOLD}Validation Summary${NC}"
echo -e "${BOLD}=====================================================${NC}"
echo ""

if [ $MISSING -eq 0 ]; then
    echo -e "${GREEN}✓ All test files are present${NC}"
else
    echo -e "${RED}✗ Some files are missing${NC}"
    exit 1
fi

echo ""
echo -e "${BOLD}Test Scenarios Available:${NC}"
echo "  1. Authentication Load Test    (20 min, 50-200 VUs)"
echo "  2. Enrollment Load Test         (15 min, 10-100 VUs)"
echo "  3. Verification Load Test       (17 min, 50-500 VUs)"
echo "  4. Multi-Tenant Load Test       (16 min, 100-200 VUs)"
echo "  5. Stress Test                  (25 min, 50-1500 VUs)"
echo "  6. Spike Test                   (15 min, spikes to 1000 VUs)"
echo ""

echo -e "${BOLD}Quick Start:${NC}"
echo ""
echo "  # Run a single test"
echo "  k6 run scenarios/auth-load-test.js"
echo ""
echo "  # Run with JSON output"
echo "  k6 run --out json=results/auth-test.json scenarios/auth-load-test.js"
echo ""
echo "  # Run demo (simulated results)"
echo "  ./demo-baseline-results.sh"
echo ""

echo -e "${BOLD}For detailed guide, see:${NC}"
echo "  • README.md - Quick start and usage"
echo "  • BASELINE_TESTING_GUIDE.md - Complete testing guide"
echo "  • LOAD_TESTING_SUMMARY.md - Test scenarios and metrics"
echo ""
