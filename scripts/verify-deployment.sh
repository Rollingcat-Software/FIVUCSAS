#!/bin/bash
# ============================================================================
# FIVUCSAS - Deployment Verification Script
# ============================================================================
# Checks all services are running and healthy
#
# Usage:
#   chmod +x verify-deployment.sh
#   ./verify-deployment.sh
#
# ============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Counters
PASS=0
FAIL=0
WARN=0

log_pass() { echo -e "  ${GREEN}[PASS]${NC} $1"; ((PASS++)); }
log_fail() { echo -e "  ${RED}[FAIL]${NC} $1"; ((FAIL++)); }
log_warn() { echo -e "  ${YELLOW}[WARN]${NC} $1"; ((WARN++)); }
log_info() { echo -e "  ${BLUE}[INFO]${NC} $1"; }
log_section() { echo -e "\n${CYAN}=== $1 ===${NC}"; }

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

check_docker() {
    log_section "Docker Status"

    if command -v docker &>/dev/null; then
        log_pass "Docker installed: $(docker --version | cut -d',' -f1)"
    else
        log_fail "Docker not installed"
        return
    fi

    if docker info &>/dev/null; then
        log_pass "Docker daemon running"
    else
        log_fail "Docker daemon not running"
    fi

    if command -v docker compose &>/dev/null; then
        log_pass "Docker Compose available"
    else
        log_warn "Docker Compose not available (using docker-compose)"
    fi
}

check_containers() {
    log_section "Container Status"

    cd "$PROJECT_ROOT"

    # Define expected containers
    CONTAINERS=("postgres" "redis" "identity-core-api" "biometric-processor" "api-gateway")

    for container in "${CONTAINERS[@]}"; do
        status=$(docker compose ps --format json 2>/dev/null | jq -r "select(.Name | contains(\"$container\")) | .State" 2>/dev/null || echo "unknown")

        if [ "$status" = "running" ]; then
            log_pass "$container: Running"
        elif [ "$status" = "unknown" ]; then
            # Try alternative method
            if docker ps --format '{{.Names}}' | grep -q "$container"; then
                log_pass "$container: Running"
            else
                log_fail "$container: Not running"
            fi
        else
            log_fail "$container: $status"
        fi
    done
}

check_postgresql() {
    log_section "PostgreSQL Health"

    cd "$PROJECT_ROOT"

    # Check connection
    if docker compose exec -T postgres pg_isready -U postgres &>/dev/null; then
        log_pass "PostgreSQL accepting connections"
    else
        log_fail "PostgreSQL not responding"
        return
    fi

    # Check database exists
    if docker compose exec -T postgres psql -U postgres -lqt 2>/dev/null | grep -q "identity_core_db"; then
        log_pass "Database 'identity_core_db' exists"
    else
        log_warn "Database 'identity_core_db' not found"
    fi

    # Check pgvector extension
    pgvector_check=$(docker compose exec -T postgres psql -U postgres -d identity_core_db -tAc \
        "SELECT COUNT(*) FROM pg_extension WHERE extname = 'vector';" 2>/dev/null || echo "0")

    if [ "$pgvector_check" = "1" ]; then
        log_pass "pgvector extension enabled"
    else
        log_warn "pgvector extension not enabled"
        log_info "Run: docker compose exec postgres psql -U postgres -d identity_core_db -c 'CREATE EXTENSION IF NOT EXISTS vector;'"
    fi
}

check_redis() {
    log_section "Redis Health"

    cd "$PROJECT_ROOT"

    # Check ping
    if docker compose exec -T redis redis-cli ping 2>/dev/null | grep -q "PONG"; then
        log_pass "Redis responding to PING"
    else
        log_fail "Redis not responding"
        return
    fi

    # Check memory
    memory=$(docker compose exec -T redis redis-cli info memory 2>/dev/null | grep "used_memory_human" | cut -d':' -f2 | tr -d '\r')
    if [ -n "$memory" ]; then
        log_pass "Redis memory usage: $memory"
    fi
}

check_biometric_processor() {
    log_section "Biometric Processor Health"

    # Wait for service to be ready
    local max_attempts=3
    local attempt=1

    while [ $attempt -le $max_attempts ]; do
        response=$(curl -sf http://localhost:8001/health 2>/dev/null || echo "")

        if [ -n "$response" ]; then
            log_pass "Health endpoint responding"
            break
        else
            if [ $attempt -eq $max_attempts ]; then
                log_fail "Health endpoint not responding (port 8001)"
            else
                log_info "Attempt $attempt/$max_attempts - waiting..."
                sleep 5
            fi
        fi
        ((attempt++))
    done

    # Check Swagger docs
    if curl -sf http://localhost:8001/docs &>/dev/null; then
        log_pass "API documentation available at /docs"
    else
        log_warn "API documentation not accessible"
    fi

    # Check key endpoints
    endpoints=("/api/v1/face/detectors" "/api/v1/face/models" "/api/v1/liveness/methods")
    for endpoint in "${endpoints[@]}"; do
        if curl -sf "http://localhost:8001$endpoint" &>/dev/null; then
            log_pass "Endpoint $endpoint accessible"
        else
            log_warn "Endpoint $endpoint not accessible"
        fi
    done
}

check_identity_api() {
    log_section "Identity Core API Health"

    # Check actuator health
    response=$(curl -sf http://localhost:8080/actuator/health 2>/dev/null || echo "")

    if echo "$response" | grep -q '"status":"UP"'; then
        log_pass "Spring Boot actuator health: UP"
    elif [ -n "$response" ]; then
        log_warn "Spring Boot health: $response"
    else
        log_fail "Spring Boot not responding (port 8080)"
        return
    fi

    # Check Swagger UI
    if curl -sf http://localhost:8080/swagger-ui.html &>/dev/null || curl -sf http://localhost:8080/swagger-ui/index.html &>/dev/null; then
        log_pass "Swagger UI available"
    else
        log_warn "Swagger UI not accessible"
    fi
}

check_api_gateway() {
    log_section "API Gateway (NGINX)"

    # Check if responding
    response_code=$(curl -sf -o /dev/null -w "%{http_code}" http://localhost:8000/ 2>/dev/null || echo "000")

    if [ "$response_code" != "000" ]; then
        log_pass "NGINX responding (HTTP $response_code)"
    else
        log_fail "NGINX not responding (port 8000)"
    fi

    # Check proxy to biometric
    if curl -sf http://localhost:8000/biometric/health &>/dev/null; then
        log_pass "Proxy to biometric-processor working"
    else
        log_warn "Proxy to biometric-processor not configured or not working"
    fi
}

check_network() {
    log_section "Network Configuration"

    # Check ports
    ports=("5432:PostgreSQL" "6379:Redis" "8000:API Gateway" "8001:Biometric API" "8080:Identity API")

    for port_info in "${ports[@]}"; do
        port="${port_info%%:*}"
        name="${port_info##*:}"

        if ss -tuln 2>/dev/null | grep -q ":$port " || netstat -tuln 2>/dev/null | grep -q ":$port "; then
            log_pass "Port $port ($name) listening"
        else
            log_warn "Port $port ($name) not listening"
        fi
    done
}

check_disk_space() {
    log_section "Disk Space"

    # Check root partition
    usage=$(df -h / | awk 'NR==2 {print $5}' | tr -d '%')
    available=$(df -h / | awk 'NR==2 {print $4}')

    if [ "$usage" -lt 80 ]; then
        log_pass "Disk usage: ${usage}% (${available} available)"
    elif [ "$usage" -lt 90 ]; then
        log_warn "Disk usage: ${usage}% (${available} available) - Consider cleanup"
    else
        log_fail "Disk usage critical: ${usage}% (${available} available)"
    fi

    # Check Docker disk usage
    docker_usage=$(docker system df --format "{{.Size}}" 2>/dev/null | head -1 || echo "unknown")
    log_info "Docker disk usage: $docker_usage"
}

check_memory() {
    log_section "Memory Status"

    # Get memory info
    total=$(free -h | awk '/^Mem:/ {print $2}')
    used=$(free -h | awk '/^Mem:/ {print $3}')
    available=$(free -h | awk '/^Mem:/ {print $7}')

    log_info "Total: $total | Used: $used | Available: $available"

    # Check if memory is low
    avail_mb=$(free -m | awk '/^Mem:/ {print $7}')
    if [ "$avail_mb" -gt 4096 ]; then
        log_pass "Sufficient memory available (${avail_mb}MB)"
    elif [ "$avail_mb" -gt 2048 ]; then
        log_warn "Memory getting low (${avail_mb}MB available)"
    else
        log_fail "Low memory (${avail_mb}MB available)"
    fi
}

print_summary() {
    echo ""
    echo "============================================================"
    echo "  Verification Summary"
    echo "============================================================"
    echo ""
    echo -e "  ${GREEN}Passed:${NC}   $PASS"
    echo -e "  ${YELLOW}Warnings:${NC} $WARN"
    echo -e "  ${RED}Failed:${NC}   $FAIL"
    echo ""

    if [ $FAIL -eq 0 ]; then
        echo -e "  ${GREEN}Status: All critical checks passed!${NC}"
    else
        echo -e "  ${RED}Status: Some checks failed. Review logs above.${NC}"
    fi

    # Get server IP
    SERVER_IP=$(curl -sf ifconfig.me 2>/dev/null || hostname -I | awk '{print $1}')

    echo ""
    echo "  Access Points:"
    echo "    - Biometric API Docs: http://${SERVER_IP}:8001/docs"
    echo "    - Identity API Docs:  http://${SERVER_IP}:8080/swagger-ui.html"
    echo "    - API Gateway:        http://${SERVER_IP}:8000"
    echo ""
}

main() {
    echo ""
    echo "============================================================"
    echo "  FIVUCSAS - Deployment Verification"
    echo "  $(date)"
    echo "============================================================"

    check_docker
    check_containers
    check_postgresql
    check_redis
    check_biometric_processor
    check_identity_api
    check_api_gateway
    check_network
    check_disk_space
    check_memory
    print_summary

    # Exit with error code if any failures
    if [ $FAIL -gt 0 ]; then
        exit 1
    fi
}

main "$@"
