/**
 * K6 Load Testing Configuration — EXTERNAL RUN KIT
 *
 * This config is written for running the load generator from an EXTERNAL client
 * (the author's own PC), NOT from the server that hosts the API. Running the
 * generator on the same host as the service under test skews the numbers (shared
 * CPU/RAM/network) and risks the production box — so all defaults point at the
 * public endpoint and the safe (read-only) path.
 *
 * Everything is overridable via environment variables (k6 -e KEY=VALUE or shell
 * exports). NO secrets are baked in — credentials, if needed, come from env only.
 *
 * Quick reference (see RUN_GUIDE.md for full instructions):
 *   k6 run -e PROFILE=smoke scenarios/public-read-load-test.js
 *   k6 run -e PROFILE=load  scenarios/public-read-load-test.js
 *   k6 run -e PROFILE=spike scenarios/public-read-load-test.js
 */

// ---------------------------------------------------------------------------
// Small env helpers
// ---------------------------------------------------------------------------
function envStr(name, fallback) {
  const v = __ENV[name];
  return v === undefined || v === '' ? fallback : v;
}
function envBool(name, fallback) {
  const v = __ENV[name];
  if (v === undefined || v === '') return fallback;
  return /^(1|true|yes|on)$/i.test(v);
}

// ---------------------------------------------------------------------------
// Profiles — staged ramps. Start small (smoke) and work up.
// Select with -e PROFILE=smoke|load|stress|spike (default: smoke).
//
// These are deliberately CONSERVATIVE for an external run against a single
// 8-core / 15 GiB shared host. They ramp, they do not nuke. The high-VU stress
// and spike profiles are still real stress/spike tests but they top out far
// below "take prod down" territory — raise the numbers yourself if you have a
// throwaway environment.
// ---------------------------------------------------------------------------
export const PROFILE_NAME = envStr('PROFILE', 'smoke').toLowerCase();

const PROFILES = {
  // ~1 min, a handful of VUs — proves the kit + endpoints work end-to-end.
  smoke: [
    { duration: '20s', target: 5 },
    { duration: '30s', target: 5 },
    { duration: '10s', target: 0 },
  ],
  // ~6 min sustained moderate load — the headline "normal load" number for ch5.
  load: [
    { duration: '1m', target: 20 },
    { duration: '3m', target: 20 },
    { duration: '1m', target: 50 },
    { duration: '1m', target: 0 },
  ],
  // ~7 min ramp to find the knee of the curve. Read-path only by default.
  stress: [
    { duration: '1m', target: 50 },
    { duration: '2m', target: 100 },
    { duration: '2m', target: 200 },
    { duration: '1m', target: 300 },
    { duration: '1m', target: 0 },
  ],
  // ~4 min — a sudden 10x surge and recovery.
  spike: [
    { duration: '1m', target: 20 },   // baseline
    { duration: '20s', target: 200 }, // sudden 10x spike
    { duration: '1m', target: 200 },  // hold
    { duration: '20s', target: 20 },  // drop
    { duration: '1m', target: 20 },   // recover
    { duration: '20s', target: 0 },
  ],
};

export function profileStages(name) {
  return PROFILES[(name || PROFILE_NAME)] || PROFILES.smoke;
}

export const config = {
  // -----------------------------------------------------------------------
  // Targets — default to the PUBLIC production endpoint.
  // -----------------------------------------------------------------------
  // Accept both BASE_URL (preferred, generic) and the legacy IDENTITY_API_URL.
  identityApiUrl: envStr('BASE_URL', envStr('IDENTITY_API_URL', 'https://api.fivucsas.com')),

  // NOTE: the biometric processor has NO public route (Docker-network-only,
  // X-API-Key). It CANNOT be reached from an external client. The enroll/verify
  // scenarios that target it are mutation-only and OFF by default (see
  // ALLOW_MUTATIONS). This value exists only for an internal/VPN run; it defaults
  // to the api host so an accidental external run fails fast against a known host
  // rather than silently hitting a stranger's server.
  biometricApiUrl: envStr('BIOMETRIC_API_URL', envStr('BASE_URL', 'https://api.fivucsas.com')),

  // -----------------------------------------------------------------------
  // SAFETY: mutating scenarios are OFF unless you explicitly opt in.
  //
  // The demo is over and there are no real users, so authenticated load IS
  // acceptable — but it still writes real rows (registrations, biometric
  // enrollments, audit logs) and the biometric endpoints aren't externally
  // reachable anyway. Read-path load (public-read-load-test.js) needs NOTHING
  // here. Only set ALLOW_MUTATIONS=true for a deliberate, scoped run.
  // -----------------------------------------------------------------------
  allowMutations: envBool('ALLOW_MUTATIONS', false),

  // -----------------------------------------------------------------------
  // Credentials / client — env only, never committed.
  // Needed only by the authenticated (login/refresh) and mutating scenarios.
  // -----------------------------------------------------------------------
  testUserEmail: envStr('TEST_USER_EMAIL', ''),
  testUserPassword: envStr('TEST_USER_PASSWORD', ''),
  // OIDC client_id (optional) — stamped into login for audit attribution and
  // used by login-config?clientId=... reads.
  clientId: envStr('CLIENT_ID', ''),
  testTenantSubdomain: envStr('TEST_TENANT', ''),
  // Base URL for reachable test face images (mutation/biometric scenarios only).
  testImageBase: envStr('TEST_IMAGE_BASE', ''),

  // -----------------------------------------------------------------------
  // Performance thresholds. p95/p99 targets used in the thesis (ch5).
  // Reads are cheap; login/refresh are the gated, meaningful auth numbers.
  // -----------------------------------------------------------------------
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.01'],
    iteration_duration: ['p(95)<2000'],
    // Custom per-operation trends (added by scenarios/utils when used)
    public_read_duration: ['p(95)<500'],
    login_duration: ['p(95)<300'],
    token_refresh_duration: ['p(95)<200'],
    enrollment_duration: ['p(95)<2000'],
    verification_duration: ['p(95)<500', 'p(99)<1000'],
  },

  // 1x1 px JPEG placeholder for biometric payloads (mutation scenarios only).
  sampleImages: {
    smallJpeg: '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAA8A/9k=',
  },
};

export default config;
