#!/bin/bash

# FIVUCSAS Monitoring Setup Verification Script
# This script verifies that all monitoring components are properly configured

echo "=================================="
echo "FIVUCSAS Monitoring Setup Verification"
echo "=================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check if service is running
check_service() {
    local service=$1
    local port=$2

    if docker ps | grep -q "$service"; then
        echo -e "${GREEN}✓${NC} $service is running"

        # Check if port is accessible
        if curl -s -o /dev/null -w "%{http_code}" "http://localhost:$port" > /dev/null 2>&1; then
            echo -e "${GREEN}  └─ Port $port is accessible${NC}"
        else
            echo -e "${YELLOW}  └─ Port $port is not responding (may be starting up)${NC}"
        fi
    else
        echo -e "${RED}✗${NC} $service is NOT running"
        return 1
    fi
}

# Function to check if file exists
check_file() {
    local file=$1
    if [ -f "$file" ]; then
        echo -e "${GREEN}✓${NC} $file exists"
    else
        echo -e "${RED}✗${NC} $file is missing"
        return 1
    fi
}

echo "1. Checking Monitoring Services..."
echo "-----------------------------------"
check_service "fivucsas-prometheus" "9090"
check_service "fivucsas-grafana" "3000"
check_service "fivucsas-alertmanager" "9093"
check_service "fivucsas-postgres-exporter" "9187"
check_service "fivucsas-redis-exporter" "9121"
check_service "fivucsas-node-exporter" "9100"
echo ""

echo "2. Checking Application Services..."
echo "-----------------------------------"
check_service "fivucsas-identity-core-api" "8080"
check_service "fivucsas-biometric-processor" "8001"
echo ""

echo "3. Checking Metrics Endpoints..."
echo "-----------------------------------"

# Check Identity Core API metrics
if curl -s "http://localhost:8080/actuator/prometheus" > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Identity Core API metrics endpoint (/actuator/prometheus)"
    metric_count=$(curl -s "http://localhost:8080/actuator/prometheus" | grep -c "^[a-z]")
    echo -e "${GREEN}  └─ Found $metric_count metrics${NC}"
else
    echo -e "${RED}✗${NC} Identity Core API metrics endpoint not accessible"
fi

# Check Biometric Processor metrics
if curl -s "http://localhost:8001/metrics" > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Biometric Processor metrics endpoint (/metrics)"
    metric_count=$(curl -s "http://localhost:8001/metrics" | grep -c "^[a-z]")
    echo -e "${GREEN}  └─ Found $metric_count metrics${NC}"
else
    echo -e "${RED}✗${NC} Biometric Processor metrics endpoint not accessible"
fi
echo ""

echo "4. Checking Configuration Files..."
echo "-----------------------------------"
check_file "./prometheus.yml"
check_file "./alert_rules.yml"
check_file "./alertmanager.yml"
check_file "./docker-compose.monitoring.yml"
check_file "./grafana/provisioning/datasources/prometheus.yml"
check_file "./grafana/provisioning/dashboards/dashboards.yml"
echo ""

echo "5. Checking Grafana Dashboards..."
echo "-----------------------------------"
check_file "./grafana/dashboards/overview.json"
check_file "./grafana/dashboards/identity-core.json"
check_file "./grafana/dashboards/biometric-processor.json"
check_file "./grafana/dashboards/infrastructure.json"
echo ""

echo "6. Checking Prometheus Targets..."
echo "-----------------------------------"
if curl -s "http://localhost:9090/api/v1/targets" > /dev/null 2>&1; then
    targets=$(curl -s "http://localhost:9090/api/v1/targets" | jq -r '.data.activeTargets[] | select(.health=="up") | .labels.job' 2>/dev/null)

    if [ -n "$targets" ]; then
        echo -e "${GREEN}✓${NC} Prometheus targets:"
        echo "$targets" | while read -r target; do
            echo -e "${GREEN}  • $target${NC}"
        done
    else
        echo -e "${YELLOW}⚠${NC} No active targets found (may still be initializing)"
    fi
else
    echo -e "${RED}✗${NC} Cannot connect to Prometheus API"
fi
echo ""

echo "7. Checking Dependencies..."
echo "-----------------------------------"

# Check Java dependencies
if [ -f "../identity-core-api/build.gradle" ]; then
    if grep -q "spring-boot-starter-actuator" "../identity-core-api/build.gradle"; then
        echo -e "${GREEN}✓${NC} Spring Boot Actuator dependency found"
    else
        echo -e "${RED}✗${NC} Spring Boot Actuator dependency missing"
    fi

    if grep -q "micrometer-registry-prometheus" "../identity-core-api/build.gradle"; then
        echo -e "${GREEN}✓${NC} Micrometer Prometheus dependency found"
    else
        echo -e "${RED}✗${NC} Micrometer Prometheus dependency missing"
    fi
fi

# Check Python dependencies
if [ -f "../biometric-processor/requirements.txt" ]; then
    if grep -q "prometheus-fastapi-instrumentator" "../biometric-processor/requirements.txt"; then
        echo -e "${GREEN}✓${NC} Prometheus FastAPI Instrumentator dependency found"
    else
        echo -e "${RED}✗${NC} Prometheus FastAPI Instrumentator dependency missing"
    fi
fi
echo ""

echo "=================================="
echo "Verification Complete!"
echo "=================================="
echo ""
echo "Access URLs:"
echo "  • Grafana:      http://localhost:3000 (admin/admin)"
echo "  • Prometheus:   http://localhost:9090"
echo "  • Alertmanager: http://localhost:9093"
echo ""
echo "Next Steps:"
echo "  1. Login to Grafana and change admin password"
echo "  2. Navigate to Dashboards → Browse → FIVUCSAS"
echo "  3. Check Prometheus targets at http://localhost:9090/targets"
echo "  4. Configure alert notifications in alertmanager.yml"
echo ""
echo "Documentation: See MONITORING.md and README.md"
echo ""
