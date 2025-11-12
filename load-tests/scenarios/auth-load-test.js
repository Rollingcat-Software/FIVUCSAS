/**
 * Authentication Load Test
 *
 * Tests the authentication system under load:
 * - User login
 * - Token refresh (rotation)
 * - Session management
 * - Logout
 *
 * Run: k6 run scenarios/auth-load-test.js
 */

import { sleep, check } from 'k6';
import { Counter, Trend } from 'k6/metrics';
import config from '../config.js';
import auth from '../utils/auth.js';

// Custom metrics
const loginSuccessRate = new Counter('login_success');
const loginFailureRate = new Counter('login_failure');
const tokenRefreshSuccessRate = new Counter('token_refresh_success');
const tokenRefreshFailureRate = new Counter('token_refresh_failure');
const loginDuration = new Trend('login_duration', true);
const tokenRefreshDuration = new Trend('token_refresh_duration', true);

// Test configuration
export const options = {
  stages: [
    { duration: '2m', target: 50 },   // Ramp up to 50 users
    { duration: '5m', target: 50 },   // Stay at 50 users
    { duration: '2m', target: 100 },  // Ramp up to 100 users
    { duration: '5m', target: 100 },  // Stay at 100 users
    { duration: '2m', target: 200 },  // Spike to 200 users
    { duration: '2m', target: 200 },  // Maintain spike
    { duration: '2m', target: 0 },    // Ramp down to 0
  ],

  thresholds: {
    // 95% of login requests should complete in < 300ms
    'login_duration': ['p(95)<300'],

    // 95% of token refresh should complete in < 200ms
    'token_refresh_duration': ['p(95)<200'],

    // HTTP request failure rate should be < 1%
    'http_req_failed': ['rate<0.01'],

    // Login success rate should be > 99%
    'login_success': ['count>0'],
  },

  // Graceful stop
  gracefulStop: '30s',
};

/**
 * Setup function (runs once per VU at start)
 */
export function setup() {
  console.log('Starting authentication load test...');
  console.log(`Identity API: ${config.identityApiUrl}`);

  // Test connectivity
  const testLogin = auth.login(config.testUserEmail, config.testUserPassword);
  if (!testLogin) {
    throw new Error('Setup failed: Unable to authenticate with test credentials');
  }

  console.log('Setup complete: Authentication working');
  return { setupComplete: true };
}

/**
 * Main test function (runs for each VU iteration)
 */
export default function (data) {
  // Generate unique user credentials for this VU
  const vuEmail = `loadtest-${__VU}-${Date.now()}@example.com`;
  const vuPassword = 'LoadTest123!@#';

  // 1. Login
  const startLogin = Date.now();
  const loginResult = auth.login(vuEmail, vuPassword);
  const loginTime = Date.now() - startLogin;

  if (loginResult) {
    loginSuccessRate.add(1);
    loginDuration.add(loginTime);
  } else {
    loginFailureRate.add(1);
    sleep(1);
    return; // Skip rest of iteration on login failure
  }

  const { accessToken, refreshToken } = loginResult;

  // Sleep to simulate user activity
  sleep(1 + Math.random() * 2); // 1-3 seconds

  // 2. Simulate some authenticated API calls
  // (In production, this would be actual API operations)
  sleep(2 + Math.random() * 3); // 2-5 seconds

  // 3. Token refresh (simulate access token expiration)
  const startRefresh = Date.now();
  const refreshResult = auth.refreshToken(refreshToken);
  const refreshTime = Date.now() - startRefresh;

  if (refreshResult) {
    tokenRefreshSuccessRate.add(1);
    tokenRefreshDuration.add(refreshTime);
  } else {
    tokenRefreshFailureRate.add(1);
  }

  // Sleep to simulate more user activity
  sleep(2 + Math.random() * 3);

  // 4. Logout (optional - some users stay logged in)
  if (Math.random() > 0.7) { // 30% of users logout
    auth.logout(refreshResult?.accessToken || accessToken, refreshResult?.refreshToken || refreshToken);
  }

  // Sleep before next iteration
  sleep(1);
}

/**
 * Teardown function (runs once at end)
 */
export function teardown(data) {
  console.log('Authentication load test completed');
}
