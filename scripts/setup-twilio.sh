#!/usr/bin/env bash
# ============================================================================
# FIVUCSAS — Twilio SMS OTP Setup Script
# ============================================================================
#
# This script helps configure Twilio SMS service for the Identity Core API.
#
# PREREQUISITES:
#   1. A Twilio account (https://www.twilio.com/try-twilio)
#   2. A verified phone number or purchased Twilio phone number
#   3. SSH access to the Hetzner VPS (deploy@116.203.222.213)
#
# USAGE:
#   ./scripts/setup-twilio.sh              # Interactive setup
#   ./scripts/setup-twilio.sh --check      # Check current config
#   ./scripts/setup-twilio.sh --help       # Show this help
#
# HOW IT WORKS:
#   The Identity Core API has TwilioSmsService configured with
#   @ConditionalOnProperty(name = "sms.enabled", havingValue = "true").
#   When sms.enabled=false (default), NoOpSmsService is used instead.
#   This script activates Twilio by setting the required env vars in .env.prod.
#
# ============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
ICA_DIR="$PROJECT_ROOT/identity-core-api"
ENV_FILE="$ICA_DIR/.env.prod"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

info() { echo -e "${GREEN}[INFO]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; }

show_help() {
  head -25 "$0" | tail -20
  echo ""
  echo "TWILIO DASHBOARD STEPS:"
  echo "  1. Sign up at https://www.twilio.com/try-twilio"
  echo "  2. Get your Account SID and Auth Token from Console Dashboard"
  echo "  3. Buy or verify a phone number (Messaging > Try it out > Get a number)"
  echo "  4. Run this script with those 3 values"
  echo ""
  echo "ENVIRONMENT VARIABLES SET:"
  echo "  SMS_ENABLED=true"
  echo "  TWILIO_ACCOUNT_SID=ACxxxxxx"
  echo "  TWILIO_AUTH_TOKEN=your_auth_token"
  echo "  TWILIO_FROM_NUMBER=+1234567890"
  echo ""
  echo "SPRING BOOT PROPERTIES (mapped from env vars):"
  echo "  sms.enabled=\${SMS_ENABLED:false}"
  echo "  sms.twilio.account-sid=\${TWILIO_ACCOUNT_SID:}"
  echo "  sms.twilio.auth-token=\${TWILIO_AUTH_TOKEN:}"
  echo "  sms.twilio.from-number=\${TWILIO_FROM_NUMBER:}"
}

check_config() {
  info "Checking Twilio configuration..."

  if [ ! -f "$ENV_FILE" ]; then
    warn ".env.prod not found at $ENV_FILE"
    warn "This is expected if you are not on the deployment server."
    echo ""
    info "To check on Hetzner VPS:"
    echo "  ssh deploy@116.203.222.213 'grep TWILIO /opt/projects/fivucsas/identity-core-api/.env.prod'"
    return
  fi

  if grep -q "SMS_ENABLED=true" "$ENV_FILE" 2>/dev/null; then
    info "Twilio is ENABLED in .env.prod"
    grep -E "SMS_ENABLED|TWILIO_" "$ENV_FILE" | sed 's/TWILIO_AUTH_TOKEN=.*/TWILIO_AUTH_TOKEN=****REDACTED****/'
  elif grep -q "SMS_ENABLED" "$ENV_FILE" 2>/dev/null; then
    warn "Twilio is DISABLED in .env.prod (SMS_ENABLED != true)"
  else
    warn "No SMS/TWILIO variables found in .env.prod"
    echo "  Run: ./scripts/setup-twilio.sh    to configure"
  fi

  echo ""
  info "Testing SMS OTP endpoint availability..."
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
    -X POST "https://api.fivucsas.com/api/v1/auth/sms-otp/send" \
    -H "Content-Type: application/json" \
    -d '{"phoneNumber":"+90000000000"}' 2>/dev/null || echo "000")

  if [ "$HTTP_CODE" = "401" ] || [ "$HTTP_CODE" = "403" ]; then
    info "SMS OTP endpoint reachable (HTTP $HTTP_CODE = auth required, as expected)"
  elif [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "202" ]; then
    info "SMS OTP endpoint working (HTTP $HTTP_CODE)"
  elif [ "$HTTP_CODE" = "500" ]; then
    warn "SMS OTP endpoint returned 500 - Twilio may not be configured"
  else
    warn "SMS OTP endpoint returned HTTP $HTTP_CODE"
  fi
}

interactive_setup() {
  echo "========================================"
  echo " FIVUCSAS — Twilio SMS OTP Setup"
  echo "========================================"
  echo ""

  if [ ! -f "$ENV_FILE" ]; then
    error ".env.prod not found at $ENV_FILE"
    echo ""
    echo "If you are on the Hetzner VPS, the file should be at:"
    echo "  /opt/projects/fivucsas/identity-core-api/.env.prod"
    echo ""
    echo "If you are on your local machine, SSH to Hetzner first:"
    echo "  ssh deploy@116.203.222.213"
    echo "  cd /opt/projects/fivucsas"
    echo "  ./scripts/setup-twilio.sh"
    exit 1
  fi

  echo "Enter your Twilio credentials (from https://console.twilio.com):"
  echo ""

  read -rp "Twilio Account SID (ACxxxxxxxxx): " ACCOUNT_SID
  read -rp "Twilio Auth Token: " AUTH_TOKEN
  read -rp "Twilio From Number (+1234567890): " FROM_NUMBER

  if [ -z "$ACCOUNT_SID" ] || [ -z "$AUTH_TOKEN" ] || [ -z "$FROM_NUMBER" ]; then
    error "All three values are required."
    exit 1
  fi

  # Validate format
  if [[ ! "$ACCOUNT_SID" =~ ^AC ]]; then
    warn "Account SID usually starts with 'AC'. Continuing anyway."
  fi
  if [[ ! "$FROM_NUMBER" =~ ^\+ ]]; then
    warn "Phone number should start with '+' (E.164 format). Continuing anyway."
  fi

  echo ""
  info "Adding Twilio configuration to .env.prod..."

  # Remove existing SMS/TWILIO lines if any
  sed -i '/^SMS_ENABLED/d' "$ENV_FILE"
  sed -i '/^TWILIO_/d' "$ENV_FILE"

  # Append Twilio config
  cat >> "$ENV_FILE" <<EOF

# Twilio SMS OTP Configuration (added by setup-twilio.sh)
SMS_ENABLED=true
TWILIO_ACCOUNT_SID=$ACCOUNT_SID
TWILIO_AUTH_TOKEN=$AUTH_TOKEN
TWILIO_FROM_NUMBER=$FROM_NUMBER
EOF

  info "Configuration saved to .env.prod"
  echo ""

  info "Restarting identity-core-api to apply changes..."
  cd "$ICA_DIR"
  if command -v docker &> /dev/null; then
    docker compose -f docker-compose.prod.yml --env-file .env.prod up -d identity-core-api
    info "identity-core-api restarted. Waiting 15s for startup..."
    sleep 15

    # Check health
    HEALTH=$(curl -s "http://localhost:8080/actuator/health" 2>/dev/null | grep -o '"status":"UP"' || echo "")
    if [ -n "$HEALTH" ]; then
      info "identity-core-api is UP and healthy."
    else
      warn "identity-core-api may still be starting. Check: docker logs identity-core-api --tail 50"
    fi
  else
    warn "Docker not found. Restart identity-core-api manually:"
    echo "  cd $ICA_DIR"
    echo "  docker compose -f docker-compose.prod.yml --env-file .env.prod up -d identity-core-api"
  fi

  echo ""
  info "Twilio SMS OTP is now configured."
  info "Test it with:"
  echo "  curl -X POST https://api.fivucsas.com/api/v1/auth/sms-otp/send \\"
  echo "    -H 'Content-Type: application/json' \\"
  echo "    -H 'Authorization: Bearer <YOUR_JWT>' \\"
  echo "    -d '{\"phoneNumber\":\"+90XXXXXXXXXX\"}'"
}

# Main
case "${1:-}" in
  --help|-h)
    show_help
    ;;
  --check|-c)
    check_config
    ;;
  *)
    interactive_setup
    ;;
esac
