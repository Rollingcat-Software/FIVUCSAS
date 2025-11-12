#!/bin/bash

# ============================================================================
# FIVUCSAS Deployment Validation Script
# ============================================================================
#
# Purpose: Automated validation of staging deployment and optimizations
#
# Usage:
#   chmod +x validate-deployment.sh
#   ./validate-deployment.sh
#
# Requirements:
#   - Docker and Docker Compose running
#   - Services deployed with docker-compose.optimized.yml
#   - jq installed (for JSON parsing)
#
# ============================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
PASSED=0
FAILED=0
WARNINGS=0

# ============================================================================
# Helper Functions
# ============================================================================

print_header() {
    echo ""
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo ""
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
    ((PASSED++))
}

print_failure() {
    echo -e "${RED}❌ $1${NC}"
    ((FAILED++))
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
    ((WARNINGS++))
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

check_command() {
    if command -v $1 &> /dev/null; then
        print_success "$1 is installed"
        return 0
    else
        print_failure "$1 is not installed"
        return 1
    fi
}

# ============================================================================
# Validation Checks
# ============================================================================

print_header "FIVUCSAS Deployment Validation"
echo "Date: $(date)"
echo "Environment: Staging"
echo ""

# ----------------------------------------------------------------------------
# Check Prerequisites
# ----------------------------------------------------------------------------

print_header "Step 1: Checking Prerequisites"

check_command docker || exit 1
check_command docker-compose || exit 1
check_command curl || exit 1
check_command jq || print_warning "jq not installed (JSON parsing will be limited)"

# Check Docker is running
if docker info &> /dev/null; then
    print_success "Docker is running"
else
    print_failure "Docker is not running"
    exit 1
fi

# ----------------------------------------------------------------------------
# Check Service Status
# ----------------------------------------------------------------------------

print_header "Step 2: Checking Service Status"

# Check if compose file exists
if [ ! -f "docker-compose.optimized.yml" ]; then
    print_failure "docker-compose.optimized.yml not found"
    exit 1
else
    print_success "docker-compose.optimized.yml found"
fi

# Get list of running containers
SERVICES=$(docker-compose -f docker-compose.optimized.yml ps --services 2>/dev/null || echo "")

if [ -z "$SERVICES" ]; then
    print_failure "No services running. Start services first with:"
    echo "  docker-compose -f docker-compose.optimized.yml up -d"
    exit 1
fi

# Check each service
EXPECTED_SERVICES=("postgres" "redis" "identity-api" "biometric-processor" "nginx")

for service in "${EXPECTED_SERVICES[@]}"; do
    if docker-compose -f docker-compose.optimized.yml ps | grep -q "$service"; then
        if docker-compose -f docker-compose.optimized.yml ps | grep "$service" | grep -q "Up"; then
            print_success "$service is running"
        else
            print_failure "$service is not running properly"
        fi
    else
        print_failure "$service is not found"
    fi
done

# ----------------------------------------------------------------------------
# Validate Priority 3: ML Worker Replicas
# ----------------------------------------------------------------------------

print_header "Step 3: Validating Priority 3 - ML Worker Scaling"

REPLICA_COUNT=$(docker ps --filter "name=biometric-processor" --format "{{.Names}}" | wc -l)

if [ "$REPLICA_COUNT" -eq 3 ]; then
    print_success "3 ML worker replicas are running"
    docker ps --filter "name=biometric-processor" --format "  - {{.Names}} ({{.Status}})"
elif [ "$REPLICA_COUNT" -eq 1 ]; then
    print_failure "Only 1 ML worker running (expected 3)"
    echo "  To fix: docker-compose -f docker-compose.optimized.yml up -d --scale biometric-processor=3"
else
    print_warning "$REPLICA_COUNT ML workers running (expected 3)"
fi

# ----------------------------------------------------------------------------
# Check Service Health Endpoints
# ----------------------------------------------------------------------------

print_header "Step 4: Checking Service Health Endpoints"

# Identity Core API
print_info "Checking Identity Core API..."
if curl -sf http://localhost:8080/actuator/health > /dev/null 2>&1; then
    HEALTH=$(curl -s http://localhost:8080/actuator/health | jq -r '.status' 2>/dev/null || echo "UNKNOWN")
    if [ "$HEALTH" = "UP" ]; then
        print_success "Identity Core API is healthy"
    else
        print_warning "Identity Core API status: $HEALTH"
    fi
else
    print_failure "Identity Core API is not responding on port 8080"
fi

# Biometric Processor (via Nginx load balancer)
print_info "Checking Biometric Processor via Nginx..."
SUCCESS_COUNT=0
for i in {1..5}; do
    if curl -sf http://localhost/api/biometric/health > /dev/null 2>&1; then
        ((SUCCESS_COUNT++))
    fi
    sleep 1
done

if [ "$SUCCESS_COUNT" -ge 4 ]; then
    print_success "Biometric Processor responding via Nginx ($SUCCESS_COUNT/5 attempts)"
else
    print_warning "Biometric Processor partially responding ($SUCCESS_COUNT/5 attempts)"
fi

# Redis
print_info "Checking Redis..."
if docker exec fivucsas-redis redis-cli ping 2>/dev/null | grep -q "PONG"; then
    print_success "Redis is responding"
else
    print_failure "Redis is not responding"
fi

# PostgreSQL
print_info "Checking PostgreSQL..."
if docker exec fivucsas-postgres pg_isready -U fivucsas_user 2>/dev/null | grep -q "accepting connections"; then
    print_success "PostgreSQL is accepting connections"
else
    print_failure "PostgreSQL is not accepting connections"
fi

# ----------------------------------------------------------------------------
# Validate Priority 1: Database Optimization
# ----------------------------------------------------------------------------

print_header "Step 5: Validating Priority 1 - Database Optimization"

# Check if migration V8 was applied
print_info "Checking database migration V8..."
MIGRATION_CHECK=$(docker exec fivucsas-postgres psql -U fivucsas_user -d fivucsas -t -c "
    SELECT COUNT(*) FROM flyway_schema_history WHERE version = '8';
" 2>/dev/null | tr -d ' ')

if [ "$MIGRATION_CHECK" = "1" ]; then
    print_success "Migration V8 (Performance optimizations) is applied"
else
    print_failure "Migration V8 is not applied"
    echo "  To fix: Apply V8__Performance_optimizations.sql manually"
fi

# Check performance indexes exist
print_info "Checking performance indexes..."
INDEX_COUNT=$(docker exec fivucsas-postgres psql -U fivucsas_user -d fivucsas -t -c "
    SELECT COUNT(*) FROM pg_indexes WHERE indexname LIKE 'idx_%';
" 2>/dev/null | tr -d ' ')

if [ "$INDEX_COUNT" -ge 5 ]; then
    print_success "$INDEX_COUNT performance indexes found"
    docker exec fivucsas-postgres psql -U fivucsas_user -d fivucsas -t -c "
        SELECT '  - ' || indexname FROM pg_indexes WHERE indexname LIKE 'idx_%' ORDER BY indexname;
    " 2>/dev/null
else
    print_warning "Only $INDEX_COUNT indexes found (expected 5+)"
fi

# ----------------------------------------------------------------------------
# Validate Priority 2: Redis Caching
# ----------------------------------------------------------------------------

print_header "Step 6: Validating Priority 2 - Redis Caching"

# Check Redis version
print_info "Checking Redis version..."
REDIS_VERSION=$(docker exec fivucsas-redis redis-cli INFO server 2>/dev/null | grep "redis_version" | cut -d: -f2 | tr -d '\r')
if [ -n "$REDIS_VERSION" ]; then
    print_success "Redis version: $REDIS_VERSION"
else
    print_failure "Cannot determine Redis version"
fi

# Check cache keys exist (after some usage)
print_info "Checking cache keys..."
CACHE_KEY_COUNT=$(docker exec fivucsas-redis redis-cli --scan --pattern "fivucsas:*" 2>/dev/null | wc -l)
if [ "$CACHE_KEY_COUNT" -gt 0 ]; then
    print_success "$CACHE_KEY_COUNT cache keys found"
    echo "  Note: Count will increase as APIs are used"
else
    print_info "No cache keys yet (will populate when APIs are called)"
fi

# Check Identity API cache configuration
print_info "Checking cache configuration in Identity API logs..."
if docker logs fivucsas-identity-api 2>&1 | grep -qi "cache" > /dev/null; then
    print_success "Cache configuration found in logs"
else
    print_warning "Cache configuration not clearly visible in logs"
fi

# ----------------------------------------------------------------------------
# Validate Priority 4: Connection Pool Optimization
# ----------------------------------------------------------------------------

print_header "Step 7: Validating Priority 4 - Connection Pool Optimization"

# Check HikariCP configuration
print_info "Checking HikariCP configuration..."
if docker logs fivucsas-identity-api 2>&1 | grep -i "hikari" | grep -qi "maximum-pool-size"; then
    HIKARI_MAX=$(docker logs fivucsas-identity-api 2>&1 | grep "maximum-pool-size" | tail -1)
    if echo "$HIKARI_MAX" | grep -q "50"; then
        print_success "HikariCP pool size is 50"
    else
        print_warning "HikariCP pool size may not be 50"
        echo "  Found: $HIKARI_MAX"
    fi
else
    print_info "HikariCP configuration not visible in logs (may be correct)"
fi

# Check PostgreSQL max connections
print_info "Checking PostgreSQL max connections..."
PG_MAX_CONN=$(docker exec fivucsas-postgres psql -U fivucsas_user -d fivucsas -t -c "SHOW max_connections;" 2>/dev/null | tr -d ' ')
if [ "$PG_MAX_CONN" -ge 100 ]; then
    print_success "PostgreSQL max connections: $PG_MAX_CONN"
else
    print_warning "PostgreSQL max connections: $PG_MAX_CONN (may need increase for production)"
fi

# ----------------------------------------------------------------------------
# Check Monitoring Stack
# ----------------------------------------------------------------------------

print_header "Step 8: Checking Monitoring Stack"

# Check if monitoring compose file exists
if [ -f "monitoring/docker-compose.monitoring.yml" ]; then
    print_success "Monitoring compose file found"

    # Check if monitoring services are running
    cd monitoring
    if docker-compose -f docker-compose.monitoring.yml ps 2>/dev/null | grep -q "Up"; then
        print_success "Monitoring services are running"

        # Check Prometheus
        if curl -sf http://localhost:9090/-/healthy > /dev/null 2>&1; then
            print_success "Prometheus is accessible (http://localhost:9090)"
        else
            print_warning "Prometheus is not accessible on port 9090"
        fi

        # Check Grafana
        if curl -sf http://localhost:3000/api/health > /dev/null 2>&1; then
            print_success "Grafana is accessible (http://localhost:3000)"
        else
            print_warning "Grafana is not accessible on port 3000"
        fi
    else
        print_info "Monitoring services not started yet"
        echo "  To start: cd monitoring && docker-compose -f docker-compose.monitoring.yml up -d"
    fi
    cd ..
else
    print_warning "Monitoring compose file not found"
fi

# ----------------------------------------------------------------------------
# Resource Utilization
# ----------------------------------------------------------------------------

print_header "Step 9: Checking Resource Utilization"

# Get CPU and memory usage
print_info "Container resource usage:"
docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}" | grep -E "NAME|fivucsas"

# ----------------------------------------------------------------------------
# Summary
# ----------------------------------------------------------------------------

print_header "Validation Summary"

echo "Passed:   $PASSED"
echo "Failed:   $FAILED"
echo "Warnings: $WARNINGS"
echo ""

if [ $FAILED -eq 0 ]; then
    if [ $WARNINGS -eq 0 ]; then
        print_success "All checks passed! ✅"
        echo ""
        echo "Next steps:"
        echo "  1. Run load tests: cd load-tests && k6 run scenarios/auth-load-test.js"
        echo "  2. Access Grafana: http://localhost:3000 (admin/admin)"
        echo "  3. Monitor metrics in Prometheus: http://localhost:9090"
        exit 0
    else
        print_warning "All critical checks passed, but there are $WARNINGS warnings"
        echo ""
        echo "Review warnings above. You can proceed with load testing if warnings are acceptable."
        exit 0
    fi
else
    print_failure "$FAILED critical checks failed"
    echo ""
    echo "Fix the failed checks before proceeding with load testing."
    echo "See STAGING_DEPLOYMENT_GUIDE.md for troubleshooting."
    exit 1
fi
