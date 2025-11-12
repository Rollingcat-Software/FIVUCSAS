/**
 * Stress Test
 *
 * Pushes the system beyond normal capacity to find breaking points:
 * - Gradually increase load until system fails
 * - Identify bottlenecks (CPU, memory, database connections, etc.)
 * - Determine maximum throughput
 * - Test system recovery
 *
 * Run: k6 run scenarios/stress-test.js
 */

import { sleep } from 'k6';
import { Counter, Trend, Rate } from 'k6/metrics';
import config from '../config.js';
import auth from '../utils/auth.js';
import biometric from '../utils/biometric.js';

// Custom metrics
const systemOverloaded = new Rate('system_overloaded');
const responseTime = new Trend('response_time');
const errorRate = new Rate('error_rate');
const throughput = new Counter('throughput');

// Test configuration
export const options = {
  stages: [
    // Phase 1: Baseline
    { duration: '2m', target: 50 },     // Baseline: 50 VUs

    // Phase 2: Gradual increase
    { duration: '2m', target: 100 },    // 100 VUs
    { duration: '2m', target: 200 },    // 200 VUs
    { duration: '2m', target: 300 },    // 300 VUs
    { duration: '2m', target: 400 },    // 400 VUs
    { duration: '2m', target: 500 },    // 500 VUs

    // Phase 3: Extreme stress
    { duration: '2m', target: 750 },    // 750 VUs
    { duration: '2m', target: 1000 },   // 1000 VUs
    { duration: '2m', target: 1500 },   // 1500 VUs (likely to fail)

    // Phase 4: Recovery
    { duration: '2m', target: 100 },    // Drop back to 100 VUs
    { duration: '2m', target: 50 },     // Drop to baseline
    { duration: '1m', target: 0 },      // Ramp down
  ],

  thresholds: {
    // We expect some failures in stress test
    'http_req_failed': ['rate<0.10'], // Allow 10% failures

    // Response times will degrade under stress
    'http_req_duration': ['p(50)<2000', 'p(95)<5000'],

    // System should not be overloaded for > 10% of requests
    'system_overloaded': ['rate<0.10'],
  },

  // Increase timeout for stress conditions
  httpDebug: 'full',
};

/**
 * Setup function
 */
export function setup() {
  console.log('=================================================');
  console.log('Starting STRESS TEST');
  console.log('WARNING: This test will push the system to failure');
  console.log('=================================================');

  const testLogin = auth.login(config.testUserEmail, config.testUserPassword);
  if (!testLogin) {
    throw new Error('Setup failed: Unable to authenticate');
  }

  return {
    setupComplete: true,
  };
}

/**
 * Main test function - Mixed workload
 */
export default function (data) {
  const vuEmail = `stress-${__VU}@example.com`;
  const vuPassword = 'LoadTest123!@#';

  // 1. Login
  const startLogin = Date.now();
  const loginResult = auth.login(vuEmail, vuPassword);
  const loginDuration = Date.now() - startLogin;

  // Check for slow response (system overload indicator)
  if (loginDuration > 3000) {
    systemOverloaded.add(1);
  }

  responseTime.add(loginDuration);

  if (!loginResult) {
    errorRate.add(1);
    sleep(1);
    return;
  }

  const { accessToken, refreshToken } = loginResult;

  // 2. Simulate application usage (mixed operations)
  const operation = __ITER % 3;

  try {
    if (operation === 0) {
      // Enrollment
      const imageUrl = biometric.getTestImageUrl(__VU);
      const metadata = {
        userId: `stress-user-${__VU}`,
        tenantId: `stress-tenant-${__VU % 5}`,
        correlationId: `stress-enroll-${__VU}-${__ITER}`,
      };

      const start = Date.now();
      const job = biometric.startEnrollment(accessToken, imageUrl, metadata);
      const duration = Date.now() - start;

      responseTime.add(duration);

      if (duration > 5000) {
        systemOverloaded.add(1);
      }

      if (job) {
        throughput.add(1);
      } else {
        errorRate.add(1);
      }

    } else if (operation === 1) {
      // Verification
      const imageUrl = biometric.getTestImageUrl(__VU);
      const userId = `stress-user-${__VU}`;
      const metadata = {
        tenantId: `stress-tenant-${__VU % 5}`,
        correlationId: `stress-verify-${__VU}-${__ITER}`,
      };

      const start = Date.now();
      const result = biometric.verify(accessToken, imageUrl, userId, metadata);
      const duration = Date.now() - start;

      responseTime.add(duration);

      if (duration > 3000) {
        systemOverloaded.add(1);
      }

      if (result) {
        throughput.add(1);
      } else {
        errorRate.add(1);
      }

    } else {
      // Token refresh
      const start = Date.now();
      const result = auth.refreshToken(refreshToken);
      const duration = Date.now() - start;

      responseTime.add(duration);

      if (duration > 1000) {
        systemOverloaded.add(1);
      }

      if (result) {
        throughput.add(1);
      } else {
        errorRate.add(1);
      }
    }

  } catch (error) {
    errorRate.add(1);
    console.error(`Error during operation: ${error.message}`);
  }

  // Minimal sleep (high load)
  sleep(0.1 + Math.random() * 0.2);
}

/**
 * Teardown function
 */
export function teardown(data) {
  console.log('=================================================');
  console.log('Stress test completed');
  console.log('=================================================');
  console.log(`Total throughput: ${throughput.count} operations`);
  console.log(`Total errors: ${errorRate.count}`);
  console.log('');
  console.log('Analysis:');
  console.log('- Check system_overloaded rate to find capacity limit');
  console.log('- Check error_rate trend to find breaking point');
  console.log('- Review response_time degradation across stages');
  console.log('- Examine resource usage (CPU, memory, DB connections)');
}
