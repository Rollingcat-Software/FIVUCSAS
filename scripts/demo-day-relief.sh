#!/usr/bin/env bash
#
# demo-day-relief.sh — temporarily relax rate limits / lockouts / token TTL for a demo.
#
# WHY: FIVUCSAS has 3 hardcoded rate-limit layers + a per-account lockout, none of
# which (except Traefik) is env-configurable. On shared conference Wi-Fi every
# request pools onto one NAT IP, so the IP-keyed limiters trip fast and a demo
# user hits HTTP 429 ("too many requests") or HTTP 423 (account locked). See
# USER_FINDINGS_2026-06-03.md issue #3 (+ #2 for the 15-min session).
#
# WHAT IT DOES (all reversible):
#   1. Traefik global rate limit  100/s → 1000/s, burst 200 → 2000   (YAML edit + restart)
#   2. Clear account lockouts      (failed_login_attempts=0, locked_until=NULL)
#   3. Flush Redis 429 counters    (rate_limit:* and otp:*:attempts)
#   4. Raise access-token TTL       15 min → 2 h   (.env.prod JWT_EXPIRATION, no rebuild)
#   5. Recreate identity-core-api   (applies #4 + resets in-memory Bucket4j login buckets)
#
# It does NOT rebuild any image. Step 4 sets JWT_EXPIRATION in .env.prod; this only
# reaches the container because docker-compose.prod.yml passes it through in the api
# `environment:` block (`JWT_EXPIRATION: ${JWT_EXPIRATION:-900000}`, added 2026-06-03).
# A var that lives ONLY in .env.prod is NOT injected — the service uses an explicit
# `environment:` block, not `env_file:`. The app reads it as
# `expiration: ${JWT_EXPIRATION:900000}` (application-prod.yml:140), so `up -d` recreates
# the container with the new value. (Earlier the compose set a DEAD `JWT_ACCESS_TOKEN_EXPIRATION`
# the app never reads, so step 4 silently no-op'd — fixed.)
#
# Secrets are NEVER hardcoded in this script. Step 2 (psql lockout clear) execs inside
# shared-postgres. Step 3 (Redis flush) is BEST-EFFORT — shared-redis has no REDIS_PASSWORD
# env (password is on --requirepass), so the AUTH may fail; that is OK because step 5's api
# recreate is what actually resets the high-value in-memory login/MFA buckets, and the Redis
# counters self-expire in 1-5 min anyway.
#
# USAGE:
#   ./demo-day-relief.sh            # DRY RUN — prints what it would do, changes nothing
#   ./demo-day-relief.sh --go       # apply (prompts once for confirmation)
#   ./demo-day-relief.sh --revert   # restore everything to pre-demo defaults
#
# Run it the MORNING of the demo (the lockout-clear + Redis-flush are point-in-time).
# After the demo, run --revert to restore the hardened defaults.
#
# Reference values verified 2026-06-03 against:
#   infra/traefik/config/dynamic.yml:183-184                       (average/burst)
#   identity-core-api/src/main/resources/application-prod.yml:140  (JWT_EXPIRATION default)
#   identity-core-api/.../ratelimit/RateLimitFilter.java:78        (rate_limit: prefix)
#   identity-core-api/.../entity/User.java:199-204                 (locked_until / failed_login_attempts)

set -euo pipefail

# ── Paths / names (edit here if infra moves) ────────────────────────────────
PROJ=/opt/projects/fivucsas
TRAEFIK_DYNAMIC="$PROJ/infra/traefik/config/dynamic.yml"
API_DIR="$PROJ/identity-core-api"
ENV_PROD="$API_DIR/.env.prod"
COMPOSE="$API_DIR/docker-compose.prod.yml"
PG_CONTAINER=shared-postgres
REDIS_CONTAINER=shared-redis

# Demo values vs hardened defaults
TRAEFIK_AVG_DEMO=1000;   TRAEFIK_AVG_DEFAULT=100
TRAEFIK_BURST_DEMO=2000; TRAEFIK_BURST_DEFAULT=200
JWT_DEMO=7200000        # 2 hours
JWT_DEFAULT=900000      # 15 minutes (the application-prod.yml default)

MODE="${1:-dry}"
case "$MODE" in
  dry)      ACTION="DRY RUN (nothing changes)";;
  --go)     ACTION="APPLY demo relief";;
  --revert) ACTION="REVERT to hardened defaults";;
  *) echo "Unknown arg '$MODE'. Use: (no arg)=dry-run | --go | --revert"; exit 1;;
esac

dry()  { [ "$MODE" = "dry" ]; }
say()  { printf '\n\033[1m== %s ==\033[0m\n' "$*"; }
skip() { echo "   [dry-run] $*"; }

[ -f "$ENV_PROD" ] || { echo "FATAL: $ENV_PROD not found — run on the prod host."; exit 1; }
echo "Mode: $ACTION"

if [ "$MODE" = "--go" ]; then
  read -r -p "Apply DEMO rate-limit relief to PRODUCTION now? [y/N] " ok; [ "$ok" = "y" ] || exit 0
elif [ "$MODE" = "--revert" ]; then
  read -r -p "REVERT to hardened production defaults now? [y/N] " ok; [ "$ok" = "y" ] || exit 0
fi

if [ "$MODE" = "--revert" ]; then
  AVG=$TRAEFIK_AVG_DEFAULT; BURST=$TRAEFIK_BURST_DEFAULT; JWT=$JWT_DEFAULT
else
  AVG=$TRAEFIK_AVG_DEMO; BURST=$TRAEFIK_BURST_DEMO; JWT=$JWT_DEMO
fi

# ── 1. Traefik global rate limit ────────────────────────────────────────────
say "1. Traefik rate limit → average:$AVG burst:$BURST"
if dry; then
  skip "cp -n $TRAEFIK_DYNAMIC{,.predemo.bak}; sed average/burst → $AVG/$BURST; docker restart traefik"
else
  cp -n "$TRAEFIK_DYNAMIC" "$TRAEFIK_DYNAMIC.predemo.bak" 2>/dev/null || true
  # Only the two indented lines inside the rate-limit middleware.
  sed -i -E "s/^( +)average: [0-9]+/\1average: $AVG/; s/^( +)burst: [0-9]+/\1burst: $BURST/" "$TRAEFIK_DYNAMIC"
  grep -nE 'average:|burst:' "$TRAEFIK_DYNAMIC" | head
  docker restart traefik
fi

# ── 2. Clear account lockouts (skip on --revert: do NOT re-lock anyone) ──────
say "2. Clear account lockouts"
if [ "$MODE" = "--revert" ]; then
  echo "   (revert: nothing to do — lockouts expire naturally in 15 min)"
elif dry; then
  skip "docker exec $PG_CONTAINER psql → UPDATE users SET failed_login_attempts=0, locked_until=NULL ..."
else
  docker exec -i "$PG_CONTAINER" sh -c \
    'PGPASSWORD="$POSTGRES_PASSWORD" psql -U "${POSTGRES_USER:-postgres}" -d "${POSTGRES_DB:-identity_core}" -v ON_ERROR_STOP=1 -c \
     "UPDATE users SET failed_login_attempts=0, locked_until=NULL WHERE locked_until IS NOT NULL OR failed_login_attempts>0;"'
fi

# ── 3. Flush Redis 429 counters ─────────────────────────────────────────────
say "3. Flush Redis rate-limit + OTP-attempt counters"
if [ "$MODE" = "--revert" ]; then
  echo "   (revert: nothing to do — counters refill on their own window)"
elif dry; then
  skip "docker exec $REDIS_CONTAINER redis-cli DEL rate_limit:*  and  otp:*:attempts"
else
  docker exec "$REDIS_CONTAINER" sh -c \
    'for p in "rate_limit:*" "otp:*:attempts"; do redis-cli -a "$REDIS_PASSWORD" --no-auth-warning --scan --pattern "$p" | xargs -r redis-cli -a "$REDIS_PASSWORD" --no-auth-warning DEL; done'
fi

# ── 4. Access-token TTL (.env.prod) ─────────────────────────────────────────
say "4. JWT_EXPIRATION → $JWT ($([ "$JWT" = "$JWT_DEMO" ] && echo '2h' || echo '15min'))"
if dry; then
  skip "set JWT_EXPIRATION=$JWT in $ENV_PROD (replace existing line or append)"
else
  cp -n "$ENV_PROD" "$ENV_PROD.predemo.bak" 2>/dev/null || true
  if grep -q '^JWT_EXPIRATION=' "$ENV_PROD"; then
    sed -i -E "s/^JWT_EXPIRATION=.*/JWT_EXPIRATION=$JWT/" "$ENV_PROD"
  else
    printf '\nJWT_EXPIRATION=%s\n' "$JWT" >> "$ENV_PROD"
  fi
  grep -n '^JWT_EXPIRATION=' "$ENV_PROD"
fi

# ── 5. Recreate api (applies #4 + resets in-memory login buckets) ───────────
say "5. Recreate identity-core-api (no rebuild)"
if dry; then
  skip "cd $API_DIR && docker compose -f $COMPOSE --env-file .env.prod up -d identity-core-api"
else
  ( cd "$API_DIR" && docker compose -f "$COMPOSE" --env-file "$ENV_PROD" up -d identity-core-api )
fi

say "DONE — $ACTION"
echo "Verify:  curl -s -o /dev/null -w '%{http_code}\\n' https://api.fivucsas.com/   # expect 401 (origin alive)"
echo "Backups: $TRAEFIK_DYNAMIC.predemo.bak  +  $ENV_PROD.predemo.bak"
dry && echo "This was a DRY RUN. Re-run with --go to apply."
[ "$MODE" = "--go" ] && echo "After the demo, run:  $0 --revert"
exit 0
