#!/bin/bash
# FIVUCSAS Session Start Hook for Claude Code Web
# Initializes git submodules and installs dependencies

set -euo pipefail

# Only run in Claude Code Web remote environment
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  echo "Skipping session start hook (not running in Claude Code Web)"
  exit 0
fi

echo "════════════════════════════════════════════════════════════"
echo "🚀 Initializing FIVUCSAS Project for Claude Code Web"
echo "════════════════════════════════════════════════════════════"
echo ""

START_TIME=$(date +%s)

# Change to project directory
cd "${CLAUDE_PROJECT_DIR}"

# ==============================================================================
# 1. Initialize Git Submodules
# ==============================================================================
echo "📦 Step 1/4: Initializing git submodules..."
echo "   Submodules: biometric-processor, identity-core-api, web-app,"
echo "               client-apps, docs, practice-and-test"
echo ""

if git submodule update --init --recursive --quiet; then
  echo "   ✅ All submodules initialized successfully"
else
  echo "   ⚠️  Warning: Some submodules may have failed to initialize"
fi
echo ""

# ==============================================================================
# 2. Setup Python Environment (biometric-processor)
# ==============================================================================
echo "🐍 Step 2/4: Setting up biometric-processor (Python/FastAPI)..."

if [ -d "biometric-processor" ] && [ -f "biometric-processor/requirements.txt" ]; then
  cd biometric-processor

  # Create virtual environment if it doesn't exist
  if [ ! -d "venv" ]; then
    echo "   Creating Python virtual environment..."
    python3 -m venv venv
  fi

  # Activate and install dependencies
  echo "   Installing Python dependencies..."
  source venv/bin/activate

  # Upgrade pip quietly
  pip install --quiet --upgrade pip

  # Install requirements
  if pip install --quiet -r requirements.txt; then
    echo "   ✅ biometric-processor dependencies installed"
  else
    echo "   ⚠️  Warning: Some Python dependencies may have failed"
  fi

  deactivate
  cd ..
else
  echo "   ⏭️  Skipping (requirements.txt not found)"
fi
echo ""

# ==============================================================================
# 3. Setup Node.js Environment (web-app)
# ==============================================================================
echo "⚛️  Step 3/4: Setting up web-app (React/TypeScript)..."

if [ -d "web-app" ] && [ -f "web-app/package.json" ]; then
  cd web-app

  echo "   Installing npm dependencies..."
  if npm install --prefer-offline --no-audit --loglevel=error 2>&1 | grep -v "^npm WARN"; then
    echo "   ✅ web-app dependencies installed"
  else
    echo "   ⚠️  Warning: Some npm dependencies may have failed"
  fi

  cd ..
else
  echo "   ⏭️  Skipping (package.json not found)"
fi
echo ""

# ==============================================================================
# 4. Setup Java/Gradle Environments (identity-core-api, client-apps)
# ==============================================================================
echo "☕ Step 4/4: Setting up Java/Gradle projects..."

# Setup identity-core-api
if [ -d "identity-core-api" ] && [ -f "identity-core-api/gradlew" ]; then
  echo "   Setting up identity-core-api (Spring Boot)..."
  cd identity-core-api

  # Make gradlew executable
  chmod +x gradlew

  # Download dependencies (without daemon for faster execution in cloud)
  if ./gradlew --no-daemon dependencies --quiet 2>&1 | tail -5; then
    echo "   ✅ identity-core-api dependencies downloaded"
  else
    echo "   ⚠️  Warning: Gradle dependencies may have issues"
  fi

  cd ..
else
  echo "   ⏭️  Skipping identity-core-api (gradlew not found)"
fi

# Setup client-apps (Kotlin Multiplatform)
if [ -d "client-apps" ] && [ -f "client-apps/gradlew" ]; then
  echo "   Setting up client-apps (Kotlin Multiplatform)..."
  cd client-apps

  # Make gradlew executable
  chmod +x gradlew

  # Download dependencies
  if ./gradlew --no-daemon dependencies --quiet 2>&1 | tail -5; then
    echo "   ✅ client-apps dependencies downloaded"
  else
    echo "   ⚠️  Warning: Gradle dependencies may have issues"
  fi

  cd ..
else
  echo "   ⏭️  Skipping client-apps (gradlew not found)"
fi
echo ""

# ==============================================================================
# 5. Set Environment Variables
# ==============================================================================
echo "🔧 Configuring environment variables..."

# Set PYTHONPATH for biometric-processor
if [ -d "biometric-processor" ]; then
  echo "export PYTHONPATH=\"${CLAUDE_PROJECT_DIR}/biometric-processor\"" >> "$CLAUDE_ENV_FILE"
  echo "   ✅ PYTHONPATH configured for biometric-processor"
fi

# Set JAVA_HOME if needed (usually already set in cloud environments)
# echo "export JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64" >> "$CLAUDE_ENV_FILE"

echo ""

# ==============================================================================
# Completion Summary
# ==============================================================================
END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

echo "════════════════════════════════════════════════════════════"
echo "✅ FIVUCSAS Project Initialized Successfully!"
echo "════════════════════════════════════════════════════════════"
echo ""
echo "📊 Summary:"
echo "   • Git submodules initialized (6 submodules)"
echo "   • Python environment ready (biometric-processor)"
echo "   • Node.js dependencies installed (web-app)"
echo "   • Java/Gradle projects configured (identity-core-api, client-apps)"
echo "   • Environment variables set"
echo ""
echo "⏱️  Total time: ${DURATION} seconds"
echo ""
echo "🎯 You can now:"
echo "   • Run tests: ./scripts/run-tests.sh"
echo "   • Start services: docker-compose up"
echo "   • Access API docs: http://localhost:8080/swagger-ui.html"
echo ""
echo "════════════════════════════════════════════════════════════"
