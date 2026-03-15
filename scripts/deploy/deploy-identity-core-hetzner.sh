#!/bin/bash
# ============================================================================
# FIVUCSAS - Deploy Identity-Core-API to Hetzner VPS
# Target: 116.203.222.213
# ============================================================================

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
