#!/usr/bin/env bash
#
# run.sh — one-command k6 runner for the FIVUCSAS load-test kit.
#
# Thin wrapper around `k6 run`: picks the scenario, sets the target + profile,
# writes a JSON summary into results/, and prints the p95/p99/error numbers.
#
# USAGE:
#   ./run.sh <scenario> [BASE_URL]
#
#   <scenario>  one of: public-read | auth | enrollment | verification |
#               verify-embedding | multi-tenant | stress | spike
#               (also accepts the full file name, e.g. public-read-load-test.js)
#   [BASE_URL]  optional target; defaults to https://api.fivucsas.com
#
# ENV (read from the environment — nothing is baked in):
#   LOAD_PROFILE   smoke (default) | load | full | stress | spike
#                  smoke = ~1 min / 5 VUs, SAFE to run against prod.
#                  Anything else is heavy — do NOT run it against prod.
#   PROFILE        canonical alias of LOAD_PROFILE (wins if both set).
#   TEST_USER_EMAIL / TEST_USER_PASSWORD
#                  REAL, disposable prod test account (auth/mutating scenarios).
#                  Defaults like loadtest@example.com do NOT exist on prod -> 401.
#   CLIENT_ID      optional OIDC client_id (e.g. marmara-bys-demo).
#   ALLOW_MUTATIONS  set to true for auth/biometric/stress/spike (writes data).
#   BIOMETRIC_API_URL / TEST_IMAGE_BASE  only for internal/VPN biometric runs.
#
# EXAMPLES:
#   # SAFE prod smoke — read-only public endpoints, no creds, ~1 min:
#   LOAD_PROFILE=smoke ./run.sh public-read https://api.fivucsas.com
#
#   # SAFE prod smoke — authenticated (needs a REAL test account):
#   LOAD_PROFILE=smoke ALLOW_MUTATIONS=true \
#     TEST_USER_EMAIL='you@real-test.acct' TEST_USER_PASSWORD='...' \
#     ./run.sh auth https://api.fivucsas.com
#
# !! SAFETY: never run stress/spike or a non-smoke profile against prod. The API
#    shares a small Hetzner host with ~23 other containers; heavy external load
#    self-DoSes the box, trips the rate-limiter/fail2ban, and yields meaningless
#    numbers. Heavy profiles are for a LOCAL or throwaway stack only.
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SELF="${BASH_SOURCE[0]}"
case "$SELF" in /*) : ;; *) SELF="$SCRIPT_DIR/$(basename "$SELF")" ;; esac
cd "$SCRIPT_DIR"

# --- args ------------------------------------------------------------------
if [[ $# -lt 1 || "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  sed -n '2,40p' "$SELF" | sed 's/^# \{0,1\}//'
  exit 0
fi

SCENARIO_ARG="$1"
BASE_URL_ARG="${2:-https://api.fivucsas.com}"

# Map a short name to a scenario file (also accept a full file name).
case "$SCENARIO_ARG" in
  public-read|public_read|read) SCENARIO_FILE="scenarios/public-read-load-test.js" ;;
  auth)                          SCENARIO_FILE="scenarios/auth-load-test.js" ;;
  enrollment|enroll)             SCENARIO_FILE="scenarios/enrollment-load-test.js" ;;
  verification|verify)           SCENARIO_FILE="scenarios/verification-load-test.js" ;;
  verify-embedding|embedding)    SCENARIO_FILE="scenarios/verify-embedding-load-test.js" ;;
  multi-tenant|multitenant)      SCENARIO_FILE="scenarios/multi-tenant-load-test.js" ;;
  stress)                        SCENARIO_FILE="scenarios/stress-test.js" ;;
  spike)                         SCENARIO_FILE="scenarios/spike-test.js" ;;
  *.js)                          SCENARIO_FILE="$SCENARIO_ARG" ;;
  scenarios/*)                   SCENARIO_FILE="$SCENARIO_ARG" ;;
  *)
    echo "ERROR: unknown scenario '$SCENARIO_ARG'." >&2
    echo "Use one of: public-read auth enrollment verification verify-embedding multi-tenant stress spike" >&2
    exit 2
    ;;
esac

if [[ ! -f "$SCENARIO_FILE" ]]; then
  echo "ERROR: scenario file not found: $SCENARIO_FILE" >&2
  exit 2
fi

# --- profile (LOAD_PROFILE alias -> PROFILE; PROFILE wins if both set) ------
PROFILE_EFFECTIVE="${PROFILE:-${LOAD_PROFILE:-smoke}}"

# --- loud guard: heavy profile against the public prod host -----------------
# (Checked BEFORE the k6-installed check so the safety refusal can never be
# skipped just because k6 is missing.)
case "$BASE_URL_ARG" in
  *api.fivucsas.com*)
    case "$PROFILE_EFFECTIVE" in
      smoke) ;;  # smoke is fine against prod
      *)
        echo "============================================================" >&2
        echo "REFUSING: profile '$PROFILE_EFFECTIVE' against PROD ($BASE_URL_ARG)." >&2
        echo "Only 'smoke' is safe against the shared prod host." >&2
        echo "For heavier load run against a LOCAL or throwaway stack, e.g.:" >&2
        echo "  LOAD_PROFILE=$PROFILE_EFFECTIVE ./run.sh $SCENARIO_ARG http://localhost:8080" >&2
        echo "Override (you accept the risk): set ALLOW_PROD_HEAVY=1" >&2
        echo "============================================================" >&2
        if [[ "${ALLOW_PROD_HEAVY:-}" != "1" ]]; then
          exit 3
        fi
        echo "ALLOW_PROD_HEAVY=1 set — proceeding against prod with '$PROFILE_EFFECTIVE'." >&2
        ;;
    esac
    ;;
esac

if ! command -v k6 >/dev/null 2>&1; then
  echo "ERROR: k6 is not installed or not on PATH." >&2
  echo "Install it (see RUN_GUIDE.md): brew install k6  |  winget install k6  |  apt-get install k6" >&2
  exit 127
fi

# --- output paths -----------------------------------------------------------
mkdir -p results
STAMP="$(date +%Y%m%d-%H%M%S)"
TAG="$(basename "$SCENARIO_FILE" .js)"
SUMMARY_JSON="results/${TAG}-${PROFILE_EFFECTIVE}-${STAMP}.summary.json"

# --- build k6 env flags -----------------------------------------------------
K6_ARGS=( run )
K6_ARGS+=( -e "BASE_URL=${BASE_URL_ARG}" )
K6_ARGS+=( -e "PROFILE=${PROFILE_EFFECTIVE}" )
[[ -n "${ALLOW_MUTATIONS:-}" ]]   && K6_ARGS+=( -e "ALLOW_MUTATIONS=${ALLOW_MUTATIONS}" )
[[ -n "${TEST_USER_EMAIL:-}" ]]    && K6_ARGS+=( -e "TEST_USER_EMAIL=${TEST_USER_EMAIL}" )
[[ -n "${TEST_USER_PASSWORD:-}" ]] && K6_ARGS+=( -e "TEST_USER_PASSWORD=${TEST_USER_PASSWORD}" )
[[ -n "${CLIENT_ID:-}" ]]          && K6_ARGS+=( -e "CLIENT_ID=${CLIENT_ID}" )
[[ -n "${LOGIN_SHARE:-}" ]]        && K6_ARGS+=( -e "LOGIN_SHARE=${LOGIN_SHARE}" )
[[ -n "${BIOMETRIC_API_URL:-}" ]]  && K6_ARGS+=( -e "BIOMETRIC_API_URL=${BIOMETRIC_API_URL}" )
[[ -n "${TEST_IMAGE_BASE:-}" ]]    && K6_ARGS+=( -e "TEST_IMAGE_BASE=${TEST_IMAGE_BASE}" )
K6_ARGS+=( --summary-export="${SUMMARY_JSON}" )
K6_ARGS+=( "$SCENARIO_FILE" )

echo "------------------------------------------------------------"
echo "scenario : $SCENARIO_FILE"
echo "target   : $BASE_URL_ARG"
echo "profile  : $PROFILE_EFFECTIVE"
echo "summary  : $SUMMARY_JSON"
echo "------------------------------------------------------------"

# k6 exits non-zero if a threshold fails; capture that but still print summary.
set +e
k6 "${K6_ARGS[@]}"
K6_EXIT=$?
set -e

# --- print the headline numbers from the summary ----------------------------
echo ""
echo "==================== SUMMARY ($TAG / $PROFILE_EFFECTIVE) ===================="
if [[ -f "$SUMMARY_JSON" ]]; then
  if command -v jq >/dev/null 2>&1; then
    jq -r '
      .metrics
      | to_entries
      | map(select(.value.p95 != null or .value["p(95)"] != null or .value.rate != null))
      | (["metric","avg","p95","p99","rate"] | @tsv),
        (.[] | [
          .key,
          (.value.avg // "-" | tostring),
          ((.value["p(95)"] // .value.p95) // "-" | tostring),
          ((.value["p(99)"] // .value.p99) // "-" | tostring),
          (.value.rate // "-" | tostring)
        ] | @tsv)
    ' "$SUMMARY_JSON" | column -t -s "$(printf '\t')" || cat "$SUMMARY_JSON"
  else
    echo "(install jq for a formatted table; raw summary below)"
    cat "$SUMMARY_JSON"
  fi
  echo ""
  echo "Full summary: $SUMMARY_JSON"
else
  echo "No summary file was written (k6 may have failed early). Exit code: $K6_EXIT"
fi
echo "============================================================================"

exit $K6_EXIT
