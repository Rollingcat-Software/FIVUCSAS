#!/usr/bin/env bash
# =============================================================================
# Cloudflare Tunnel Setup for Biometric Processor on Local GPU
# =============================================================================
#
# Purpose:
#   Run biometric-processor (FastAPI) on your local machine with GPU (GTX 1650)
#   and expose it via Cloudflare Tunnel as bpa-fivucsas.rollingcatsoftware.com
#
#   This avoids running DeepFace / Resemblyzer on the Hetzner VPS CPU,
#   giving significantly faster face/voice processing with CUDA acceleration.
#
# Prerequisites:
#   - NVIDIA GPU with CUDA drivers installed
#   - biometric-processor running locally on port 8001
#   - A Cloudflare account with rollingcatsoftware.com zone
#
# Usage:
#   ./scripts/cloudflare-tunnel.sh install    # One-time: install cloudflared
#   ./scripts/cloudflare-tunnel.sh login      # One-time: authenticate with Cloudflare
#   ./scripts/cloudflare-tunnel.sh create     # One-time: create the tunnel
#   ./scripts/cloudflare-tunnel.sh start      # Start the tunnel (run each session)
#   ./scripts/cloudflare-tunnel.sh stop       # Stop the tunnel
#   ./scripts/cloudflare-tunnel.sh status     # Check tunnel status
#   ./scripts/cloudflare-tunnel.sh quick      # Quick tunnel (no DNS config needed)
# =============================================================================

set -euo pipefail

TUNNEL_NAME="fivucsas-biometric-gpu"
HOSTNAME="bpa-fivucsas.rollingcatsoftware.com"
LOCAL_PORT=8001
LOCAL_URL="http://localhost:${LOCAL_PORT}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m'

log()  { echo -e "${GREEN}[INFO]${NC} $*"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $*"; }
err()  { echo -e "${RED}[ERROR]${NC} $*" >&2; }

# ---------------------------------------------------------------------------
# install: Install cloudflared CLI
# ---------------------------------------------------------------------------
cmd_install() {
    log "Installing cloudflared..."

    if command -v cloudflared &>/dev/null; then
        log "cloudflared already installed: $(cloudflared --version)"
        return 0
    fi

    case "$(uname -s)" in
        Linux)
            if command -v apt-get &>/dev/null; then
                # Debian/Ubuntu
                curl -fsSL https://pkg.cloudflare.com/cloudflare-main.gpg \
                    | sudo tee /usr/share/keyrings/cloudflare-main.gpg >/dev/null
                echo "deb [signed-by=/usr/share/keyrings/cloudflare-main.gpg] https://pkg.cloudflare.com/cloudflared $(lsb_release -cs) main" \
                    | sudo tee /etc/apt/sources.list.d/cloudflared.list
                sudo apt-get update && sudo apt-get install -y cloudflared
            else
                # Generic Linux binary
                curl -fsSL -o /tmp/cloudflared https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64
                chmod +x /tmp/cloudflared
                sudo mv /tmp/cloudflared /usr/local/bin/cloudflared
            fi
            ;;
        MINGW*|MSYS*|CYGWIN*)
            # Windows (Git Bash / MSYS2) -- use winget or direct download
            warn "On Windows, install via:"
            warn "  winget install --id Cloudflare.cloudflared"
            warn "  OR download from: https://github.com/cloudflare/cloudflared/releases"
            return 1
            ;;
        Darwin)
            brew install cloudflared
            ;;
        *)
            err "Unsupported OS. Download from: https://github.com/cloudflare/cloudflared/releases"
            return 1
            ;;
    esac

    log "Installed: $(cloudflared --version)"
}

# ---------------------------------------------------------------------------
# login: Authenticate with Cloudflare (opens browser)
# ---------------------------------------------------------------------------
cmd_login() {
    log "Logging in to Cloudflare..."
    log "A browser window will open. Select the rollingcatsoftware.com zone."
    cloudflared tunnel login
    log "Login successful. Credentials saved to ~/.cloudflared/cert.pem"
}

# ---------------------------------------------------------------------------
# create: Create a named tunnel and configure DNS route
# ---------------------------------------------------------------------------
cmd_create() {
    log "Creating tunnel '${TUNNEL_NAME}'..."

    # Check if tunnel already exists
    if cloudflared tunnel list | grep -q "${TUNNEL_NAME}"; then
        warn "Tunnel '${TUNNEL_NAME}' already exists."
        cloudflared tunnel list | grep "${TUNNEL_NAME}"
        return 0
    fi

    cloudflared tunnel create "${TUNNEL_NAME}"

    log "Configuring DNS route: ${HOSTNAME} -> ${TUNNEL_NAME}"
    cloudflared tunnel route dns "${TUNNEL_NAME}" "${HOSTNAME}"

    # Get tunnel UUID for config file
    TUNNEL_ID=$(cloudflared tunnel list | grep "${TUNNEL_NAME}" | awk '{print $1}')

    # Write config file
    CONFIG_DIR="${HOME}/.cloudflared"
    CONFIG_FILE="${CONFIG_DIR}/config-${TUNNEL_NAME}.yml"
    mkdir -p "${CONFIG_DIR}"

    cat > "${CONFIG_FILE}" <<YAML
tunnel: ${TUNNEL_ID}
credentials-file: ${CONFIG_DIR}/${TUNNEL_ID}.json

ingress:
  - hostname: ${HOSTNAME}
    service: ${LOCAL_URL}
    originRequest:
      noTLSVerify: true
      connectTimeout: 30s
  - service: http_status:404
YAML

    log "Config written to: ${CONFIG_FILE}"
    log "Tunnel ID: ${TUNNEL_ID}"
    log ""
    log "Next step: start the tunnel with './scripts/cloudflare-tunnel.sh start'"
}

# ---------------------------------------------------------------------------
# start: Run the tunnel (foreground)
# ---------------------------------------------------------------------------
cmd_start() {
    # Verify biometric-processor is running locally
    if ! curl -sf "${LOCAL_URL}/health" >/dev/null 2>&1; then
        warn "biometric-processor not responding at ${LOCAL_URL}/health"
        warn "Make sure it is running: cd biometric-processor && uvicorn app.main:app --port ${LOCAL_PORT}"
        warn "Starting tunnel anyway..."
    else
        log "biometric-processor is healthy at ${LOCAL_URL}"
    fi

    CONFIG_FILE="${HOME}/.cloudflared/config-${TUNNEL_NAME}.yml"

    if [[ -f "${CONFIG_FILE}" ]]; then
        log "Starting tunnel '${TUNNEL_NAME}' with config..."
        log "Accessible at: https://${HOSTNAME}"
        log "Press Ctrl+C to stop."
        cloudflared tunnel --config "${CONFIG_FILE}" run "${TUNNEL_NAME}"
    else
        warn "No config file found. Running with inline args..."
        log "Accessible at: https://${HOSTNAME}"
        log "Press Ctrl+C to stop."
        cloudflared tunnel run --url "${LOCAL_URL}" "${TUNNEL_NAME}"
    fi
}

# ---------------------------------------------------------------------------
# stop: Stop any running cloudflared processes
# ---------------------------------------------------------------------------
cmd_stop() {
    log "Stopping cloudflared processes..."
    pkill -f "cloudflared tunnel" 2>/dev/null && log "Stopped." || warn "No running tunnel found."
}

# ---------------------------------------------------------------------------
# status: Check tunnel status
# ---------------------------------------------------------------------------
cmd_status() {
    log "Tunnel list:"
    cloudflared tunnel list 2>/dev/null || warn "Not logged in. Run './scripts/cloudflare-tunnel.sh login' first."

    echo ""
    if pgrep -f "cloudflared tunnel" >/dev/null 2>&1; then
        log "cloudflared is RUNNING (PID: $(pgrep -f 'cloudflared tunnel' | head -1))"
    else
        warn "cloudflared is NOT running"
    fi

    echo ""
    log "Local biometric-processor:"
    if curl -sf "${LOCAL_URL}/health" >/dev/null 2>&1; then
        log "  ${LOCAL_URL}/health -> OK"
    else
        warn "  ${LOCAL_URL}/health -> NOT RESPONDING"
    fi
}

# ---------------------------------------------------------------------------
# quick: Quick tunnel (no DNS config, temporary URL)
# ---------------------------------------------------------------------------
cmd_quick() {
    log "Starting quick tunnel (temporary URL, no DNS setup needed)..."
    log "This creates a temporary *.trycloudflare.com URL."
    log ""
    warn "NOTE: For production use, run 'create' + 'start' instead."
    warn "Quick tunnels are ephemeral -- the URL changes every time."
    echo ""
    log "Forwarding ${LOCAL_URL} ..."
    cloudflared tunnel --url "${LOCAL_URL}"
}

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
case "${1:-help}" in
    install) cmd_install ;;
    login)   cmd_login ;;
    create)  cmd_create ;;
    start)   cmd_start ;;
    stop)    cmd_stop ;;
    status)  cmd_status ;;
    quick)   cmd_quick ;;
    help|*)
        echo "Usage: $0 {install|login|create|start|stop|status|quick}"
        echo ""
        echo "Setup (one-time):"
        echo "  install  - Install cloudflared CLI"
        echo "  login    - Authenticate with Cloudflare (opens browser)"
        echo "  create   - Create tunnel '${TUNNEL_NAME}' and DNS route to ${HOSTNAME}"
        echo ""
        echo "Daily use:"
        echo "  start    - Start the tunnel (routes ${HOSTNAME} -> localhost:${LOCAL_PORT})"
        echo "  stop     - Stop the tunnel"
        echo "  status   - Check tunnel and local service status"
        echo "  quick    - Quick tunnel with temporary URL (no DNS needed)"
        echo ""
        echo "Before starting the tunnel, run biometric-processor locally:"
        echo "  cd biometric-processor"
        echo "  python -m venv venv && source venv/bin/activate"
        echo "  pip install -r requirements.txt"
        echo "  uvicorn app.main:app --host 0.0.0.0 --port ${LOCAL_PORT}"
        echo ""
        echo "If using the GTX 1650, ensure CUDA is available:"
        echo "  pip install torch torchvision --index-url https://download.pytorch.org/whl/cu121"
        ;;
esac
