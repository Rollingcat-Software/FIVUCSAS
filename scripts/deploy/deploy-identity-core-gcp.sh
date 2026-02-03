#!/bin/bash
# ============================================================================
# FIVUCSAS - Deploy Identity-Core-API to GCP VM
# Target: 34.116.233.134
# ============================================================================

set -e

# Configuration
GCP_HOST="user@34.116.233.134"
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
ssh "$GCP_HOST" "sudo mkdir -p $REMOTE_DIR && sudo chown \$(whoami):\$(whoami) $REMOTE_DIR"

# Step 3: Copy files to GCP
echo ""
echo "[3/4] Copying files to GCP..."
scp "$JAR_FILE" "$GCP_HOST:$REMOTE_DIR/app.jar"
scp docker-compose.yml "$GCP_HOST:$REMOTE_DIR/"
scp .env.gcp "$GCP_HOST:$REMOTE_DIR/.env"
scp Dockerfile "$GCP_HOST:$REMOTE_DIR/"

# Step 4: Deploy with Docker Compose
echo ""
echo "[4/4] Deploying..."
ssh "$GCP_HOST" "cd $REMOTE_DIR && docker compose down && docker compose up -d --build"

# Verify
echo ""
echo "Waiting for service to start..."
sleep 10

echo ""
echo "Checking health..."
curl -s "http://34.116.233.134:8080/actuator/health" | head -c 200
echo ""

echo ""
echo "=========================================="
echo "Deployment complete!"
echo "API: http://34.116.233.134:8080"
echo "Swagger: http://34.116.233.134:8080/swagger-ui.html"
echo "=========================================="
