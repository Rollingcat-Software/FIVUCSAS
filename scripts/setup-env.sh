#!/bin/bash
# ============================================================================
# FIVUCSAS - Environment Setup Script
# ============================================================================
# Generates secure credentials and creates .env file
#
# Usage:
#   chmod +x setup-env.sh
#   ./setup-env.sh [--regenerate]
#
# Options:
#   --regenerate    Force regenerate credentials even if .env exists
#
# ============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Get script directory (works even when called from different location)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

generate_password() {
    if command -v openssl &>/dev/null; then
        openssl rand -base64 32 | tr -dc 'a-zA-Z0-9' | head -c 32
    else
        head -c 32 /dev/urandom | base64 | tr -dc 'a-zA-Z0-9' | head -c 32
    fi
}

generate_jwt_secret() {
    if command -v openssl &>/dev/null; then
        openssl rand -base64 48 | tr -dc 'a-zA-Z0-9' | head -c 64
    else
        head -c 48 /dev/urandom | base64 | tr -dc 'a-zA-Z0-9' | head -c 64
    fi
}

main() {
    cd "$PROJECT_ROOT"

    echo ""
    echo "============================================================"
    echo "  FIVUCSAS - Environment Setup"
    echo "============================================================"
    echo ""

    # Check if .env exists
    if [ -f ".env" ] && [ "$1" != "--regenerate" ]; then
        log_warning ".env file already exists!"
        read -p "Overwrite with new credentials? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_info "Keeping existing .env file"
            exit 0
        fi
    fi

    # Prompt for environment type
    echo "Select environment type:"
    echo "  1) Development (local/testing)"
    echo "  2) Production (VPS/cloud)"
    read -p "Choice [1/2]: " -n 1 -r ENV_CHOICE
    echo

    case $ENV_CHOICE in
        2)
            ENV_TYPE="production"
            SPRING_PROFILE="prod"
            NODE_ENV="production"
            ;;
        *)
            ENV_TYPE="development"
            SPRING_PROFILE="dev"
            NODE_ENV="development"
            ;;
    esac

    # Generate credentials
    log_info "Generating secure credentials..."
    POSTGRES_PASSWORD=$(generate_password)
    REDIS_PASSWORD=$(generate_password)
    JWT_SECRET=$(generate_jwt_secret)

    # Determine host settings
    if [ "$ENV_TYPE" = "production" ]; then
        POSTGRES_HOST="postgres"
        REDIS_HOST="redis"
        IDENTITY_API_URL="http://identity-core-api:8080"
        BIOMETRIC_URL="http://biometric-processor:8001"
        API_GATEWAY_URL="http://api-gateway:8000"
    else
        POSTGRES_HOST="localhost"
        REDIS_HOST="localhost"
        IDENTITY_API_URL="http://localhost:8080"
        BIOMETRIC_URL="http://localhost:8001"
        API_GATEWAY_URL="http://localhost:8000"
    fi

    # Create .env file
    log_info "Creating .env file..."
    cat > ".env" << EOF
# ============================================================================
# FIVUCSAS - Environment Variables
# Generated: $(date -Iseconds)
# Environment: ${ENV_TYPE}
# ============================================================================

# ============================================================================
# Database Configuration
# ============================================================================
POSTGRES_DB=identity_core_db
POSTGRES_USER=postgres
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
POSTGRES_HOST=${POSTGRES_HOST}
POSTGRES_PORT=5432

# ============================================================================
# Redis Configuration
# ============================================================================
REDIS_HOST=${REDIS_HOST}
REDIS_PORT=6379
REDIS_PASSWORD=${REDIS_PASSWORD}

# ============================================================================
# JWT Configuration
# ============================================================================
JWT_SECRET=${JWT_SECRET}
JWT_ACCESS_TOKEN_EXPIRATION=3600000
JWT_REFRESH_TOKEN_EXPIRATION=604800000

# ============================================================================
# Service URLs
# ============================================================================
IDENTITY_CORE_API_URL=${IDENTITY_API_URL}
BIOMETRIC_PROCESSOR_URL=${BIOMETRIC_URL}
API_GATEWAY_URL=${API_GATEWAY_URL}

# ============================================================================
# Environment
# ============================================================================
ENVIRONMENT=${ENV_TYPE}
NODE_ENV=${NODE_ENV}
SPRING_PROFILES_ACTIVE=${SPRING_PROFILE}

# ============================================================================
# Biometric Processor Configuration
# ============================================================================
FACE_MODEL=VGG-Face
FACE_DETECTOR=opencv
SIMILARITY_THRESHOLD=0.6
USE_GPU=False
BATCH_SIZE=16
MAX_IMAGE_SIZE=1920
EOF

    chmod 600 ".env"

    # Save credentials separately
    cat > ".credentials" << EOF
# ============================================================================
# FIVUCSAS - Generated Credentials
# Generated: $(date -Iseconds)
# ============================================================================
# WARNING: Keep this file secure! Delete after noting credentials.

PostgreSQL Password: ${POSTGRES_PASSWORD}
Redis Password:      ${REDIS_PASSWORD}
JWT Secret:          ${JWT_SECRET}

Database Connection (${ENV_TYPE}):
postgresql://postgres:${POSTGRES_PASSWORD}@${POSTGRES_HOST}:5432/identity_core_db

Redis Connection (${ENV_TYPE}):
redis://:${REDIS_PASSWORD}@${REDIS_HOST}:6379
EOF
    chmod 600 ".credentials"

    echo ""
    log_success "Environment setup complete!"
    echo ""
    echo "Files created:"
    echo "  - .env         (environment variables)"
    echo "  - .credentials (credential reference)"
    echo ""
    echo "Generated Credentials:"
    echo "  PostgreSQL: ${POSTGRES_PASSWORD}"
    echo "  Redis:      ${REDIS_PASSWORD}"
    echo "  JWT Secret: ${JWT_SECRET:0:20}..."
    echo ""
    log_warning "Save these credentials securely, then delete .credentials file"
    echo ""

    if [ "$ENV_TYPE" = "production" ]; then
        echo "Start production services with:"
        echo "  docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d"
    else
        echo "Start development services with:"
        echo "  docker compose up -d"
    fi
    echo ""
}

main "$@"
