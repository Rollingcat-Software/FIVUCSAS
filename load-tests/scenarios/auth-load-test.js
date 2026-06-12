/**
 * Authentication Load Test  (AUTHENTICATED — opt-in)
 *
 * Drives the real login + token-refresh path with ONE shared test credential:
 *   POST /api/v1/auth/login    { email, password }  -> { accessToken, refreshToken }
 *   POST /api/v1/auth/refresh  { refreshToken }     -> { accessToken, refreshToken }
 *
 * ---------------------------------------------------------------------------
 * READ THIS BEFORE RUNNING AGAINST PROD
 * ---------------------------------------------------------------------------
 * 1) GATED. Requires ALLOW_MUTATIONS=true. Login writes audit rows and refresh
 *    ROTATES the refresh-token family (RFC 6749 reuse-detection) — it is not a
 *    pure read. For the safe default run use public-read-load-test.js instead.
 *
 * 2) RATE LIMIT. The login bucket is 10 attempts / 5 min PER IP (Bucket4j). From
 *    a single external client you ARE one IP, so a high-VU login flood will be
 *    dominated by HTTP 429 and the numbers become meaningless. This scenario
 *    therefore:
 *      - logs in ONCE in setup() and shares the refresh token across VUs, then
 *      - mostly exercises /auth/refresh (which is NOT under the login bucket),
 *      - only re-logs-in occasionally (LOGIN_SHARE fraction of iterations).
 *    If you genuinely want to measure login throughput, ask the operator to raise
 *    APP_RATE_LIMIT_LOGIN_CAPACITY / APP_RATE_LIMIT_LOGIN_WINDOW_MINUTES in
 *    .env.prod for the duration of the run (revert after).
 *
 * Required env:
 *   ALLOW_MUTATIONS=true
 *   TEST_USER_EMAIL=...      (a disposable test account, NOT a real user)
 *   TEST_USER_PASSWORD=...
 * Optional:
 *   CLIENT_ID=...            (stamped into login for audit attribution)
 *   PROFILE=smoke|load|stress|spike
 *   LOGIN_SHARE=0.05         (fraction of iterations that fully re-login)
 *
 * Run:
 *   k6 run -e ALLOW_MUTATIONS=true -e TEST_USER_EMAIL=... -e TEST_USER_PASSWORD=... \
 *          -e PROFILE=load scenarios/auth-load-test.js
 */

import { sleep } from 'k6';
import { Counter, Trend } from 'k6/metrics';
import config, { profileStages, scenarioThresholds, PROFILE_NAME } from '../config.js';
import auth from '../utils/auth.js';

const loginSuccess = new Counter('login_success');
const loginFailure = new Counter('login_failure');
const refreshSuccess = new Counter('token_refresh_success');
const refreshFailure = new Counter('token_refresh_failure');
const loginDuration = new Trend('login_duration', true);
const tokenRefreshDuration = new Trend('token_refresh_duration', true);

// Fraction of iterations that perform a fresh login (rest only refresh).
// Keep low so the per-IP login bucket (10/5min) is not the bottleneck.
const LOGIN_SHARE = parseFloat(__ENV.LOGIN_SHARE || '0.05');

export const options = {
  stages: profileStages(),
  // In smoke mode these strict thresholds are relaxed so a tiny prod sanity run
  // reports latency without exiting non-zero (see config.scenarioThresholds).
  thresholds: scenarioThresholds({
    'login_duration': ['p(95)<300'],
    'token_refresh_duration': ['p(95)<200'],
    // Allow a few 429s if you crank VUs — the login bucket is shared per IP.
    'http_req_failed': ['rate<0.05'],
  }),
  gracefulStop: '30s',
};

export function setup() {
  if (!config.allowMutations) {
    throw new Error(
      'REFUSING TO RUN: auth-load-test mutates state (audit rows + refresh-token rotation).\n' +
      'Set -e ALLOW_MUTATIONS=true to opt in, or run scenarios/public-read-load-test.js for the safe read-only load.');
  }
  if (!config.testUserEmail || !config.testUserPassword) {
    throw new Error('Missing TEST_USER_EMAIL / TEST_USER_PASSWORD env vars (no credentials are baked into the repo).');
  }
  console.log('========================================================');
  console.log('FIVUCSAS authentication load test (AUTHENTICATED)');
  console.log(`Target : ${config.identityApiUrl}`);
  console.log(`Profile: ${PROFILE_NAME}  |  login share: ${LOGIN_SHARE}`);
  console.log('========================================================');

  const seed = auth.login(config.testUserEmail, config.testUserPassword, config.clientId);
  if (!seed) {
    throw new Error('Setup failed: could not authenticate with TEST_USER_EMAIL/PASSWORD ' +
      '(check the credentials and that the account is active/unlocked).');
  }
  // Share the seed refresh token so VUs can refresh without each logging in.
  return { refreshToken: seed.refreshToken };
}

export default function (data) {
  let refreshToken = data.refreshToken;

  // Occasionally do a real login (bounded by LOGIN_SHARE to respect the bucket).
  if (Math.random() < LOGIN_SHARE) {
    const t0 = Date.now();
    const res = auth.login(config.testUserEmail, config.testUserPassword, config.clientId);
    if (res) {
      loginSuccess.add(1);
      loginDuration.add(Date.now() - t0);
      if (res.refreshToken) refreshToken = res.refreshToken;
    } else {
      loginFailure.add(1);
    }
    sleep(1 + Math.random());
  }

  // Token refresh (the main, non-bucketed auth operation under test).
  if (refreshToken) {
    const t0 = Date.now();
    const res = auth.refreshToken(refreshToken);
    if (res) {
      refreshSuccess.add(1);
      tokenRefreshDuration.add(Date.now() - t0);
      // RFC 6749 rotation: the old token is now invalid — chain forward.
      if (res.refreshToken) refreshToken = res.refreshToken;
    } else {
      refreshFailure.add(1);
    }
  }

  sleep(1 + Math.random() * 2);
}

export function teardown() {
  console.log('Authentication load test completed.');
}
