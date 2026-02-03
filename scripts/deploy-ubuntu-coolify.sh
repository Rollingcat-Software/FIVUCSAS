#!/bin/bash
# ============================================================================
# FIVUCSAS - Ubuntu + Coolify VPS Deployment Script
# ============================================================================
# Deploys the complete FIVUCSAS stack on a fresh Ubuntu 22.04/24.04 VPS
#
# Requirements:
#   - Fresh Ubuntu 22.04 LTS or 24.04 LTS
#   - Root or sudo access
#   - Minimum: 8 cores, 24GB RAM, 150GB SSD
#   - Ports 80, 443, 8000 available
#
# Usage:
#   chmod +x deploy-ubuntu-coolify.sh
#   sudo ./deploy-ubuntu-coolify.sh
#
# ============================================================================

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
REPO_URL="${REPO_URL:-https://github.com/your-org/FIVUCSAS.git}"
INSTALL_DIR="/opt/fivucsas"
COOLIFY_DATA_DIR="/data/coolify"

# ============================================================================
# Helper Functions
# ============================================================================

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_root() {
    if [[ $EUID -ne 0 ]]; then
        log_error "This script must be run as root (use sudo)"
        exit 1
    fi
}

check_ubuntu() {
    if ! grep -q "Ubuntu" /etc/os-release 2>/dev/null; then
        log_error "This script is designed for Ubuntu. Detected: $(cat /etc/os-release | grep PRETTY_NAME)"
        exit 1
    fi
    log_success "Ubuntu detected"
}

check_resources() {
    local cores=$(nproc)
    local mem_gb=$(free -g | awk '/^Mem:/{print $2}')
    local disk_gb=$(df -BG / | awk 'NR==2 {print $4}' | tr -d 'G')

    log_info "System Resources:"
    echo "  CPU Cores: $cores (minimum: 4, recommended: 8+)"
    echo "  Memory: ${mem_gb}GB (minimum: 8GB, recommended: 24GB+)"
    echo "  Free Disk: ${disk_gb}GB (minimum: 50GB, recommended: 150GB+)"

    if [[ $cores -lt 4 ]]; then
        log_warning "CPU cores below minimum (4). Performance may be degraded."
    fi

    if [[ $mem_gb -lt 8 ]]; then
        log_error "Memory below minimum (8GB). Deployment may fail."
        read -p "Continue anyway? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
}

generate_password() {
    openssl rand -base64 32 | tr -dc 'a-zA-Z0-9' | head -c 32
}

generate_jwt_secret() {
    openssl rand -base64 48 | tr -dc 'a-zA-Z0-9' | head -c 64
}

# ============================================================================
# Phase 1: System Preparation
# ============================================================================

phase1_system_prep() {
    log_info "=== Phase 1: System Preparation ==="

    # Update system
    log_info "Updating system packages..."
    apt-get update -y
    apt-get upgrade -y

    # Install essential packages
    log_info "Installing essential packages..."
    apt-get install -y \
        curl \
        wget \
        git \
        htop \
        vim \
        unzip \
        apt-transport-https \
        ca-certificates \
        gnupg \
        lsb-release \
        software-properties-common \
        ufw \
        fail2ban \
        openssl

    log_success "System preparation complete"
}

# ============================================================================
# Phase 2: Docker Installation
# ============================================================================

phase2_docker_install() {
    log_info "=== Phase 2: Docker Installation ==="

    # Check if Docker is already installed
    if command -v docker &> /dev/null; then
        log_info "Docker already installed: $(docker --version)"
        read -p "Reinstall Docker? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            return 0
        fi
    fi

    # Remove old Docker versions
    log_info "Removing old Docker versions (if any)..."
    apt-get remove -y docker docker-engine docker.io containerd runc 2>/dev/null || true

    # Install Docker using official script
    log_info "Installing Docker..."
    curl -fsSL https://get.docker.com | sh

    # Start and enable Docker
    systemctl start docker
    systemctl enable docker

    # Add current user to docker group (if not root)
    if [ -n "$SUDO_USER" ]; then
        usermod -aG docker "$SUDO_USER"
        log_info "Added $SUDO_USER to docker group"
    fi

    # Verify installation
    docker --version
    docker compose version

    log_success "Docker installation complete"
}

# ============================================================================
# Phase 3: Coolify Installation
# ============================================================================

phase3_coolify_install() {
    log_info "=== Phase 3: Coolify Installation ==="

    # Check if Coolify is already running
    if docker ps --format '{{.Names}}' | grep -q "coolify"; then
        log_warning "Coolify appears to be already running"
        read -p "Skip Coolify installation? (Y/n): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Nn]$ ]]; then
            return 0
        fi
    fi

    # Install Coolify
    log_info "Installing Coolify..."
    curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash

    # Wait for Coolify to start
    log_info "Waiting for Coolify to start..."
    sleep 30

    # Get server IP
    SERVER_IP=$(curl -s ifconfig.me || hostname -I | awk '{print $1}')

    log_success "Coolify installation complete"
    log_info "Access Coolify at: http://${SERVER_IP}:8000"
}

# ============================================================================
# Phase 4: FIVUCSAS Deployment
# ============================================================================

phase4_fivucsas_deploy() {
    log_info "=== Phase 4: FIVUCSAS Deployment ==="

    # Create installation directory
    mkdir -p "$INSTALL_DIR"
    cd "$INSTALL_DIR"

    # Clone repository (if not exists)
    if [ -d "$INSTALL_DIR/.git" ]; then
        log_info "Repository already exists, pulling latest..."
        git pull origin master
        git submodule update --init --recursive
    else
        log_info "Cloning FIVUCSAS repository..."
        if [ -n "$REPO_URL" ] && [ "$REPO_URL" != "https://github.com/your-org/FIVUCSAS.git" ]; then
            git clone --recurse-submodules "$REPO_URL" .
        else
            log_warning "Repository URL not set. Please clone manually:"
            echo "  cd $INSTALL_DIR"
            echo "  git clone --recurse-submodules <your-repo-url> ."
            read -p "Press Enter after cloning, or Ctrl+C to abort..."
        fi
    fi

    # Generate secure credentials
    log_info "Generating secure credentials..."
    POSTGRES_PASSWORD=$(generate_password)
    REDIS_PASSWORD=$(generate_password)
    JWT_SECRET=$(generate_jwt_secret)

    # Create .env file
    log_info "Creating environment configuration..."
    cat > "$INSTALL_DIR/.env" << EOF
# ============================================================================
# FIVUCSAS - Production Environment Variables
# Generated: $(date -Iseconds)
# ============================================================================
# WARNING: Keep this file secure! Contains sensitive credentials.

# ============================================================================
# Database Configuration
# ============================================================================
POSTGRES_DB=identity_core_db
POSTGRES_USER=postgres
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
POSTGRES_HOST=postgres
POSTGRES_PORT=5432

# ============================================================================
# Redis Configuration
# ============================================================================
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=${REDIS_PASSWORD}

# ============================================================================
# JWT Configuration
# ============================================================================
JWT_SECRET=${JWT_SECRET}
JWT_ACCESS_TOKEN_EXPIRATION=3600000
JWT_REFRESH_TOKEN_EXPIRATION=604800000

# ============================================================================
# Service URLs (Docker internal network)
# ============================================================================
IDENTITY_CORE_API_URL=http://identity-core-api:8080
BIOMETRIC_PROCESSOR_URL=http://biometric-processor:8001
API_GATEWAY_URL=http://api-gateway:8000

# ============================================================================
# Environment
# ============================================================================
ENVIRONMENT=production
NODE_ENV=production
SPRING_PROFILES_ACTIVE=prod

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

    # Secure the .env file
    chmod 600 "$INSTALL_DIR/.env"

    # Save credentials for user reference
    cat > "$INSTALL_DIR/.credentials" << EOF
# ============================================================================
# FIVUCSAS - Generated Credentials (KEEP SECURE!)
# Generated: $(date -Iseconds)
# ============================================================================

PostgreSQL Password: ${POSTGRES_PASSWORD}
Redis Password: ${REDIS_PASSWORD}
JWT Secret: ${JWT_SECRET}

Database Connection String:
postgresql://postgres:${POSTGRES_PASSWORD}@localhost:5432/identity_core_db

Redis Connection String:
redis://:${REDIS_PASSWORD}@localhost:6379
EOF
    chmod 600 "$INSTALL_DIR/.credentials"

    log_success "Environment configuration created"
    log_warning "Credentials saved to: $INSTALL_DIR/.credentials"
}

# ============================================================================
# Phase 5: Start Services
# ============================================================================

phase5_start_services() {
    log_info "=== Phase 5: Starting Services ==="

    cd "$INSTALL_DIR"

    # Pull images first
    log_info "Pulling Docker images..."
    docker compose -f docker-compose.yml -f docker-compose.prod.yml pull || true

    # Build custom images
    log_info "Building custom images..."
    docker compose -f docker-compose.yml -f docker-compose.prod.yml build

    # Start services
    log_info "Starting services..."
    docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d

    # Wait for services to be healthy
    log_info "Waiting for services to be healthy..."
    sleep 30

    # Initialize pgvector extension
    log_info "Initializing pgvector extension..."
    docker compose exec -T postgres psql -U postgres -d identity_core_db -c \
        "CREATE EXTENSION IF NOT EXISTS vector CASCADE;" 2>/dev/null || true

    log_success "Services started"
}

# ============================================================================
# Phase 6: Firewall Configuration
# ============================================================================

phase6_firewall_config() {
    log_info "=== Phase 6: Firewall Configuration ==="

    # Configure UFW
    log_info "Configuring firewall (UFW)..."

    # Default policies
    ufw default deny incoming
    ufw default allow outgoing

    # Allow SSH (important - don't lock yourself out!)
    ufw allow 22/tcp comment 'SSH'

    # Allow HTTP/HTTPS
    ufw allow 80/tcp comment 'HTTP'
    ufw allow 443/tcp comment 'HTTPS'

    # Allow Coolify
    ufw allow 8000/tcp comment 'Coolify/API Gateway'

    # Enable firewall
    echo "y" | ufw enable

    # Show status
    ufw status verbose

    log_success "Firewall configured"
}

# ============================================================================
# Phase 7: Verification
# ============================================================================

phase7_verify() {
    log_info "=== Phase 7: Verification ==="

    cd "$INSTALL_DIR"

    # Check container status
    log_info "Container Status:"
    docker compose -f docker-compose.yml -f docker-compose.prod.yml ps

    # Wait a bit for services to fully initialize
    sleep 10

    # Health checks
    log_info "Running health checks..."

    # Check PostgreSQL
    if docker compose exec -T postgres pg_isready -U postgres &>/dev/null; then
        log_success "PostgreSQL: Healthy"
    else
        log_error "PostgreSQL: Not responding"
    fi

    # Check Redis
    if docker compose exec -T redis redis-cli ping &>/dev/null; then
        log_success "Redis: Healthy"
    else
        log_error "Redis: Not responding"
    fi

    # Check Biometric Processor
    if curl -sf http://localhost:8001/health &>/dev/null; then
        log_success "Biometric Processor: Healthy"
    else
        log_warning "Biometric Processor: Starting (may take 1-2 minutes for ML models to load)"
    fi

    # Check Identity Core API
    if curl -sf http://localhost:8080/actuator/health &>/dev/null; then
        log_success "Identity Core API: Healthy"
    else
        log_warning "Identity Core API: Starting (may take 30-60 seconds)"
    fi

    # Get server IP
    SERVER_IP=$(curl -s ifconfig.me 2>/dev/null || hostname -I | awk '{print $1}')

    echo ""
    log_success "=========================================="
    log_success "  FIVUCSAS Deployment Complete!"
    log_success "=========================================="
    echo ""
    echo "Access Points:"
    echo "  - Coolify Dashboard: http://${SERVER_IP}:8000"
    echo "  - API Gateway:       http://${SERVER_IP}:8000/api"
    echo "  - Biometric API:     http://${SERVER_IP}:8001/docs"
    echo "  - Identity API:      http://${SERVER_IP}:8080/swagger-ui.html"
    echo ""
    echo "Credentials saved to: $INSTALL_DIR/.credentials"
    echo ""
    echo "Useful Commands:"
    echo "  cd $INSTALL_DIR"
    echo "  docker compose -f docker-compose.yml -f docker-compose.prod.yml logs -f"
    echo "  docker compose -f docker-compose.yml -f docker-compose.prod.yml ps"
    echo "  docker compose -f docker-compose.yml -f docker-compose.prod.yml restart"
    echo ""
    log_warning "Next Steps:"
    echo "  1. Set up SSL/TLS certificates (Let's Encrypt via Coolify)"
    echo "  2. Configure DNS to point to ${SERVER_IP}"
    echo "  3. Change default passwords in Coolify dashboard"
    echo "  4. Review firewall rules: ufw status"
    echo ""
}

# ============================================================================
# Main Execution
# ============================================================================

main() {
    echo ""
    echo "============================================================"
    echo "  FIVUCSAS - Ubuntu + Coolify Deployment Script"
    echo "  $(date)"
    echo "============================================================"
    echo ""

    check_root
    check_ubuntu
    check_resources

    echo ""
    read -p "Start deployment? (Y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Nn]$ ]]; then
        log_info "Deployment cancelled"
        exit 0
    fi

    phase1_system_prep
    phase2_docker_install
    phase3_coolify_install
    phase4_fivucsas_deploy
    phase5_start_services
    phase6_firewall_config
    phase7_verify
}

# Run main function
main "$@"
