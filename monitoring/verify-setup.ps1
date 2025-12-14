# FIVUCSAS Monitoring Setup Verification Script (PowerShell)
# This script verifies that all monitoring components are properly configured

Write-Host "=================================="
Write-Host "FIVUCSAS Monitoring Setup Verification"
Write-Host "=================================="
Write-Host ""

# Function to check if service is running
function Check-Service {
    param(
        [string]$ServiceName,
        [int]$Port
    )

    $container = docker ps --filter "name=$ServiceName" --format "{{.Names}}"

    if ($container) {
        Write-Host "✓ $ServiceName is running" -ForegroundColor Green

        # Check if port is accessible
        try {
            $response = Invoke-WebRequest -Uri "http://localhost:$Port" -TimeoutSec 2 -UseBasicParsing -ErrorAction Stop
            Write-Host "  └─ Port $Port is accessible" -ForegroundColor Green
        } catch {
            Write-Host "  └─ Port $Port is not responding (may be starting up)" -ForegroundColor Yellow
        }
    } else {
        Write-Host "✗ $ServiceName is NOT running" -ForegroundColor Red
        return $false
    }
    return $true
}

# Function to check if file exists
function Check-File {
    param([string]$FilePath)

    if (Test-Path $FilePath) {
        Write-Host "✓ $FilePath exists" -ForegroundColor Green
        return $true
    } else {
        Write-Host "✗ $FilePath is missing" -ForegroundColor Red
        return $false
    }
}

Write-Host "1. Checking Monitoring Services..."
Write-Host "-----------------------------------"
Check-Service -ServiceName "fivucsas-prometheus" -Port 9090
Check-Service -ServiceName "fivucsas-grafana" -Port 3000
Check-Service -ServiceName "fivucsas-alertmanager" -Port 9093
Check-Service -ServiceName "fivucsas-postgres-exporter" -Port 9187
Check-Service -ServiceName "fivucsas-redis-exporter" -Port 9121
Check-Service -ServiceName "fivucsas-node-exporter" -Port 9100
Write-Host ""

Write-Host "2. Checking Application Services..."
Write-Host "-----------------------------------"
Check-Service -ServiceName "fivucsas-identity-core-api" -Port 8080
Check-Service -ServiceName "fivucsas-biometric-processor" -Port 8001
Write-Host ""

Write-Host "3. Checking Metrics Endpoints..."
Write-Host "-----------------------------------"

# Check Identity Core API metrics
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8080/actuator/prometheus" -TimeoutSec 5 -UseBasicParsing -ErrorAction Stop
    Write-Host "✓ Identity Core API metrics endpoint (/actuator/prometheus)" -ForegroundColor Green
    $metricCount = ($response.Content -split "`n" | Where-Object { $_ -match "^[a-z]" }).Count
    Write-Host "  └─ Found $metricCount metrics" -ForegroundColor Green
} catch {
    Write-Host "✗ Identity Core API metrics endpoint not accessible" -ForegroundColor Red
}

# Check Biometric Processor metrics
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8001/metrics" -TimeoutSec 5 -UseBasicParsing -ErrorAction Stop
    Write-Host "✓ Biometric Processor metrics endpoint (/metrics)" -ForegroundColor Green
    $metricCount = ($response.Content -split "`n" | Where-Object { $_ -match "^[a-z]" }).Count
    Write-Host "  └─ Found $metricCount metrics" -ForegroundColor Green
} catch {
    Write-Host "✗ Biometric Processor metrics endpoint not accessible" -ForegroundColor Red
}
Write-Host ""

Write-Host "4. Checking Configuration Files..."
Write-Host "-----------------------------------"
Check-File -FilePath ".\prometheus.yml"
Check-File -FilePath ".\alert_rules.yml"
Check-File -FilePath ".\alertmanager.yml"
Check-File -FilePath ".\docker-compose.monitoring.yml"
Check-File -FilePath ".\grafana\provisioning\datasources\prometheus.yml"
Check-File -FilePath ".\grafana\provisioning\dashboards\dashboards.yml"
Write-Host ""

Write-Host "5. Checking Grafana Dashboards..."
Write-Host "-----------------------------------"
Check-File -FilePath ".\grafana\dashboards\overview.json"
Check-File -FilePath ".\grafana\dashboards\identity-core.json"
Check-File -FilePath ".\grafana\dashboards\biometric-processor.json"
Check-File -FilePath ".\grafana\dashboards\infrastructure.json"
Write-Host ""

Write-Host "6. Checking Prometheus Targets..."
Write-Host "-----------------------------------"
try {
    $targets = Invoke-RestMethod -Uri "http://localhost:9090/api/v1/targets" -TimeoutSec 5
    $activeTargets = $targets.data.activeTargets | Where-Object { $_.health -eq "up" }

    if ($activeTargets) {
        Write-Host "✓ Prometheus targets:" -ForegroundColor Green
        foreach ($target in $activeTargets) {
            Write-Host "  • $($target.labels.job)" -ForegroundColor Green
        }
    } else {
        Write-Host "⚠ No active targets found (may still be initializing)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "✗ Cannot connect to Prometheus API" -ForegroundColor Red
}
Write-Host ""

Write-Host "7. Checking Dependencies..."
Write-Host "-----------------------------------"

# Check Java dependencies
$buildGradlePath = "..\identity-core-api\build.gradle"
if (Test-Path $buildGradlePath) {
    $buildGradleContent = Get-Content $buildGradlePath -Raw

    if ($buildGradleContent -match "spring-boot-starter-actuator") {
        Write-Host "✓ Spring Boot Actuator dependency found" -ForegroundColor Green
    } else {
        Write-Host "✗ Spring Boot Actuator dependency missing" -ForegroundColor Red
    }

    if ($buildGradleContent -match "micrometer-registry-prometheus") {
        Write-Host "✓ Micrometer Prometheus dependency found" -ForegroundColor Green
    } else {
        Write-Host "✗ Micrometer Prometheus dependency missing" -ForegroundColor Red
    }
}

# Check Python dependencies
$requirementsPath = "..\biometric-processor\requirements.txt"
if (Test-Path $requirementsPath) {
    $requirementsContent = Get-Content $requirementsPath -Raw

    if ($requirementsContent -match "prometheus-fastapi-instrumentator") {
        Write-Host "✓ Prometheus FastAPI Instrumentator dependency found" -ForegroundColor Green
    } else {
        Write-Host "✗ Prometheus FastAPI Instrumentator dependency missing" -ForegroundColor Red
    }
}
Write-Host ""

Write-Host "=================================="
Write-Host "Verification Complete!"
Write-Host "=================================="
Write-Host ""
Write-Host "Access URLs:"
Write-Host "  • Grafana:      http://localhost:3000 (admin/admin)"
Write-Host "  • Prometheus:   http://localhost:9090"
Write-Host "  • Alertmanager: http://localhost:9093"
Write-Host ""
Write-Host "Next Steps:"
Write-Host "  1. Login to Grafana and change admin password"
Write-Host "  2. Navigate to Dashboards → Browse → FIVUCSAS"
Write-Host "  3. Check Prometheus targets at http://localhost:9090/targets"
Write-Host "  4. Configure alert notifications in alertmanager.yml"
Write-Host ""
Write-Host "Documentation: See MONITORING.md and README.md"
Write-Host ""
