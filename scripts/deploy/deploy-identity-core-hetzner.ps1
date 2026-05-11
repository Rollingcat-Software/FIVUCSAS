# ============================================================================
# FIVUCSAS - Deploy Identity-Core-API to Hetzner VPS (PowerShell)
# Target: 116.203.222.213
# ============================================================================
# Image-SHA tagging added 2026-04-29 per Ops-P2 #7 (parity with
# /opt/projects/infra/deploy.sh e3e9056). Allows rollback without rebuild.

$ErrorActionPreference = "Stop"

# Configuration
$HETZNER_HOST = "root@116.203.222.213"
$SSH_KEY = "$env:USERPROFILE\.ssh\hetzner_ed25519"
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

# Step 2: Copy files to Hetzner VPS
Write-Host ""
Write-Host "[2/4] Copying files to Hetzner VPS..." -ForegroundColor Yellow
& scp -i $SSH_KEY "$LOCAL_DIR\target\$($JAR_FILE.Name)" "${HETZNER_HOST}:${REMOTE_DIR}/app.jar"
& scp -i $SSH_KEY "$LOCAL_DIR\docker-compose.yml" "${HETZNER_HOST}:${REMOTE_DIR}/"
& scp -i $SSH_KEY "$LOCAL_DIR\.env.hetzner" "${HETZNER_HOST}:${REMOTE_DIR}/.env"
& scp -i $SSH_KEY "$LOCAL_DIR\Dockerfile" "${HETZNER_HOST}:${REMOTE_DIR}/"

# Step 3: Deploy with Docker Compose
Write-Host ""
Write-Host "[3/4] Deploying..." -ForegroundColor Yellow
& ssh -i $SSH_KEY $HETZNER_HOST "cd $REMOTE_DIR && docker compose down && docker compose up -d --build"

# Step 3b: Tag built :latest images with :sha-<short> on the remote host so
# we can roll back without rebuilding (Ops-P2 #7, parity with infra/deploy.sh).
$SHORT_SHA = (& git -C $LOCAL_DIR rev-parse --short HEAD 2>$null)
if ($LASTEXITCODE -ne 0 -or -not $SHORT_SHA) { $SHORT_SHA = "unknown" }
Write-Host ""
Write-Host "[3b/4] Tagging built images with sha-$SHORT_SHA..." -ForegroundColor Yellow
$tagCmd = @"
cd $REMOTE_DIR && \
repos=`$(docker compose images 2>/dev/null | awk 'NR>1 {print `$2}' | sort -u | grep -v '^`$' || true); \
for repo in `$repos; do \
  if docker image inspect "`${repo}:latest" >/dev/null 2>&1; then \
    docker tag "`${repo}:latest" "`${repo}:sha-$SHORT_SHA" && echo "  tagged `${repo}:sha-$SHORT_SHA"; \
  fi; \
done
"@
& ssh -i $SSH_KEY $HETZNER_HOST $tagCmd

# Step 4: Verify
Write-Host ""
Write-Host "[4/4] Verifying deployment..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

try {
    $response = Invoke-RestMethod -Uri "http://116.203.222.213:8080/actuator/health" -TimeoutSec 10
    Write-Host "Health check: $($response.status)" -ForegroundColor Green
}
catch {
    Write-Host "Health check failed (service may still be starting)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Deployment complete!" -ForegroundColor Green
Write-Host "API: http://116.203.222.213:8080" -ForegroundColor White
Write-Host "Swagger: http://116.203.222.213:8080/swagger-ui.html" -ForegroundColor White
Write-Host "==========================================" -ForegroundColor Cyan
