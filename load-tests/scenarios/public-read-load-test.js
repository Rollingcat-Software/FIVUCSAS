/**
 * Public Read-Path Load Test  (SAFE — DEFAULT EXTERNAL RUN)
 *
 * Exercises ONLY unauthenticated, read-only, publicly-routable endpoints. This
 * is the scenario to run from your own PC against https://api.fivucsas.com:
 *   - it writes NOTHING (no rows, no audit mutations),
 *   - it is NOT throttled by the login rate-limiter (10/5min per IP — see below),
 *   - it measures the real edge-to-app latency a tenant integrator sees.
 *
 * Endpoints hit (all verified public + HTTP 200 on prod):
 *   GET /.well-known/openid-configuration   (OIDC discovery)
 *   GET /.well-known/jwks.json              (signing keys)
 *   GET /api/v1/auth/health                 (liveness)
 *   GET /api/v1/auth-methods                (catalog)
 *   GET /api/v1/auth/login-config           (public login-flow config)
 *
 * Run (see RUN_GUIDE.md):
 *   k6 run -e PROFILE=smoke scenarios/public-read-load-test.js
 *   k6 run -e PROFILE=load  -e BASE_URL=https://api.fivucsas.com scenarios/public-read-load-test.js
 *   k6 run -e PROFILE=spike scenarios/public-read-load-test.js
 *
 * NB: the api root (GET /) returns 401 BY DESIGN (it is an API origin, not a
 * page); /actuator/health is admin-IP-gated (403 externally). Neither is used
 * here so they don't pollute http_req_failed.
 */

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Trend } from 'k6/metrics';
import config, { profileStages, PROFILE_NAME } from '../config.js';

const readDuration = new Trend('public_read_duration', true);

export const options = {
  stages: profileStages(),
  thresholds: {
    'public_read_duration': ['p(95)<500'],
    'http_req_failed': ['rate<0.01'],
    'http_req_duration': ['p(95)<800'],
  },
  gracefulStop: '15s',
};

const BASE = config.identityApiUrl;

export function setup() {
  console.log('========================================================');
  console.log('FIVUCSAS public read-path load test (SAFE, read-only)');
  console.log(`Target : ${BASE}`);
  console.log(`Profile: ${PROFILE_NAME}`);
  console.log('========================================================');

  // Connectivity smoke before the run (counts toward nothing).
  const ping = http.get(`${BASE}/api/v1/auth/health`, { tags: { name: 'setup_ping' } });
  if (ping.status !== 200) {
    throw new Error(`Setup failed: ${BASE}/api/v1/auth/health returned ${ping.status} (expected 200). ` +
      `Check BASE_URL and that you can reach the host from this network.`);
  }
  return { base: BASE };
}

function timedGet(url, name, expectStatus = 200) {
  const start = Date.now();
  const res = http.get(url, { tags: { name } });
  readDuration.add(Date.now() - start);
  check(res, {
    [`${name} status is ${expectStatus}`]: (r) => r.status === expectStatus,
  });
  return res;
}

export default function () {
  group('oidc-metadata', function () {
    const disc = timedGet(`${BASE}/.well-known/openid-configuration`, 'oidc_discovery');
    check(disc, {
      'discovery has issuer': (r) => {
        try { return r.json('issuer') !== undefined; } catch (e) { return false; }
      },
    });
    timedGet(`${BASE}/.well-known/jwks.json`, 'jwks');
  });

  group('public-api-reads', function () {
    timedGet(`${BASE}/api/v1/auth/health`, 'auth_health');
    timedGet(`${BASE}/api/v1/auth-methods`, 'auth_methods');

    // login-config: pass clientId if provided (resolves a tenant), else the
    // platform default config. Both return 200.
    const lcUrl = config.clientId
      ? `${BASE}/api/v1/auth/login-config?clientId=${encodeURIComponent(config.clientId)}`
      : `${BASE}/api/v1/auth/login-config`;
    timedGet(lcUrl, 'login_config');
  });

  // Think time so we model paced clients, not a tight CPU-bound hammer.
  sleep(0.5 + Math.random());
}

export function teardown() {
  console.log('Public read-path load test completed (no data was written).');
}
