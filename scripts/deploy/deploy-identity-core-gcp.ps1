# ============================================================================
# FIVUCSAS - Deploy Identity-Core-API to GCP VM (PowerShell)
# Target: 34.116.233.134
# ============================================================================

$ErrorActionPreference = "Stop"

# Configuration
$GCP_HOST = "user@34.116.233.134"
$REMOTE_DIR = "/opt/identity-core-api"
$LOCAL_DIR = Join-Path $PSScriptRoot "..\..\identity-core-api"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "FIVUCSAS Identity-Core-API Deployment" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# Step 1: Build JAR
Write-Host ""
Write-Host "[1/4] Building JAR..." -ForegroundColor Yellow
Push-Location $LOCAL_DIR
try {
    & mvn clean package -DskipTests -q
    if ($LASTEXITCODE -ne 0) { throw "Maven build failed" }

    $JAR_FILE = Get-ChildItem -Path "target\*.jar" | Select-Object -First 1
    Write-Host "Built: $($JAR_FILE.Name)" -ForegroundColor Green
}
finally {
    Pop-Location
}

# Step 2: Copy files to GCP
Write-Host ""
Write-Host "[2/4] Copying files to GCP..." -ForegroundColor Yellow
& scp "$LOCAL_DIR\target\$($JAR_FILE.Name)" "${GCP_HOST}:${REMOTE_DIR}/app.jar"
& scp "$LOCAL_DIR\docker-compose.yml" "${GCP_HOST}:${REMOTE_DIR}/"
& scp "$LOCAL_DIR\.env.gcp" "${GCP_HOST}:${REMOTE_DIR}/.env"
& scp "$LOCAL_DIR\Dockerfile" "${GCP_HOST}:${REMOTE_DIR}/"

# Step 3: Deploy with Docker Compose
Write-Host ""
Write-Host "[3/4] Deploying..." -ForegroundColor Yellow
& ssh $GCP_HOST "cd $REMOTE_DIR && docker compose down && docker compose up -d --build"

# Step 4: Verify
Write-Host ""
Write-Host "[4/4] Verifying deployment..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

try {
    $response = Invoke-RestMethod -Uri "http://34.116.233.134:8080/actuator/health" -TimeoutSec 10
    Write-Host "Health check: $($response.status)" -ForegroundColor Green
}
catch {
    Write-Host "Health check failed (service may still be starting)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Deployment complete!" -ForegroundColor Green
Write-Host "API: http://34.116.233.134:8080" -ForegroundColor White
Write-Host "Swagger: http://34.116.233.134:8080/swagger-ui.html" -ForegroundColor White
Write-Host "==========================================" -ForegroundColor Cyan
