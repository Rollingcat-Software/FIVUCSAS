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
import config, { profileStages } from '../config.js';
import auth from '../utils/auth.js';
import biometric from '../utils/biometric.js';
import { requireMutationsOptIn } from '../utils/guard.js';

// Custom metrics
const systemOverloaded = new Rate('system_overloaded');
const responseTime = new Trend('response_time');
const errorRate = new Rate('error_rate');
const throughput = new Counter('throughput');

// Test configuration. Run with -e PROFILE=stress to get the ramp-to-the-knee
// stages; any other profile (default smoke) uses a small ramp so a casual run
// can't accidentally fire a full stress test. See config.js for the numbers.
export const options = {
  stages: profileStages(),

  thresholds: {
    // We expect some failures in stress test
    'http_req_failed': ['rate<0.10'], // Allow 10% failures

    // Response times will degrade under stress
    'http_req_duration': ['p(50)<2000', 'p(95)<5000'],

    // System should not be overloaded for > 10% of requests
    'system_overloaded': ['rate<0.10'],
  },

  // NB: httpDebug was intentionally REMOVED — at high VU it dumps every request
  // to stdout, drowning the summary and skewing the client. Use --http-debug on
  // the CLI for a one-off debug run instead.
};

/**
 * Setup function
 */
export function setup() {
  requireMutationsOptIn('stress-test');
  console.log('=================================================');
  console.log('Starting STRESS TEST (MUTATING — mixed enroll/verify/refresh)');
  console.log('WARNING: This test pushes the system hard. Run with -e PROFILE=stress.');
  console.log('=================================================');

  const testLogin = auth.login(config.testUserEmail, config.testUserPassword, config.clientId);
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
