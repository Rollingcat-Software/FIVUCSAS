#!/bin/bash
# ============================================================================
# FIVUCSAS - Deploy Identity-Core-API to Hetzner VPS
# Target: 116.203.222.213
# ============================================================================
# Image-SHA tagging added 2026-04-29 per Ops-P2 #7 (parity with
# /opt/projects/infra/deploy.sh e3e9056). Allows rollback without rebuild.

set -e

# Configuration
HETZNER_HOST="root@116.203.222.213"
SSH_KEY="$HOME/.ssh/hetzner_ed25519"
REMOTE_DIR="/opt/identity-core-api"
LOCAL_DIR="$(dirname "$0")/../../identity-core-api"

echo "=========================================="
echo "FIVUCSAS Identity-Core-API Deployment"
echo "=========================================="

# Step 1: Build JAR
echo ""
echo "[1/4] Building JAR..."
cd "$LOCAL_DIR"
mvn clean package -DskipTests -q
JAR_FILE=$(ls target/*.jar | head -1)
echo "Built: $JAR_FILE"

# Step 2: Prepare remote directory
echo ""
echo "[2/4] Preparing remote directory..."
ssh -i "$SSH_KEY" "$HETZNER_HOST" "mkdir -p $REMOTE_DIR"

# Step 3: Copy files to Hetzner VPS
echo ""
echo "[3/4] Copying files to Hetzner VPS..."
scp -i "$SSH_KEY" "$JAR_FILE" "$HETZNER_HOST:$REMOTE_DIR/app.jar"
scp -i "$SSH_KEY" docker-compose.yml "$HETZNER_HOST:$REMOTE_DIR/"
scp -i "$SSH_KEY" .env.hetzner "$HETZNER_HOST:$REMOTE_DIR/.env"
scp -i "$SSH_KEY" Dockerfile "$HETZNER_HOST:$REMOTE_DIR/"

# Step 4: Deploy with Docker Compose
echo ""
echo "[4/4] Deploying..."
ssh -i "$SSH_KEY" "$HETZNER_HOST" "cd $REMOTE_DIR && docker compose down && docker compose up -d --build"

# Step 4b: Tag built :latest images with :sha-<short> on the remote host so
# we can roll back without rebuilding (Ops-P2 #7, parity with infra/deploy.sh).
SHORT_SHA=$(git -C "$LOCAL_DIR" rev-parse --short HEAD 2>/dev/null || echo "unknown")
echo ""
echo "[4b/4] Tagging built images with sha-${SHORT_SHA}..."
ssh -i "$SSH_KEY" "$HETZNER_HOST" "cd $REMOTE_DIR && \
  repos=\$(docker compose images 2>/dev/null | awk 'NR>1 {print \$2}' | sort -u | grep -v '^\$' || true); \
  for repo in \$repos; do \
    if docker image inspect \"\${repo}:latest\" >/dev/null 2>&1; then \
      docker tag \"\${repo}:latest\" \"\${repo}:sha-${SHORT_SHA}\" && echo \"  tagged \${repo}:sha-${SHORT_SHA}\"; \
    fi; \
  done"

# Verify
echo ""
echo "Waiting for service to start..."
sleep 10

echo ""
echo "Checking health..."
curl -s "http://116.203.222.213:8080/actuator/health" | head -c 200
echo ""

echo ""
echo "=========================================="
echo "Deployment complete!"
echo "API: http://116.203.222.213:8080"
echo "Swagger: http://116.203.222.213:8080/swagger-ui.html"
echo "=========================================="
