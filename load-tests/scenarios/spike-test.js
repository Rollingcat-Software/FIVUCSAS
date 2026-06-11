/**
 * Spike Test
 *
 * Tests system response to sudden traffic spikes:
 * - Sudden increase in load (e.g., viral event, marketing campaign)
 * - Auto-scaling response time
 * - System stability during spikes
 * - Recovery after spike
 *
 * Run: k6 run scenarios/spike-test.js
 */

import { sleep } from 'k6';
import { Counter, Trend, Rate } from 'k6/metrics';
import config, { profileStages } from '../config.js';
import auth from '../utils/auth.js';
import biometric from '../utils/biometric.js';
import { requireMutationsOptIn } from '../utils/guard.js';

// Custom metrics
const spikePerformance = new Trend('spike_performance');
const spikeErrors = new Rate('spike_errors');
const recoveryTime = new Trend('recovery_time');

// Test configuration. Run with -e PROFILE=spike for the sudden-surge stages;
// any other profile (default smoke) uses a small ramp. See config.js.
export const options = {
  stages: profileStages(),

  thresholds: {
    // Allow higher failure rate during spikes
    'http_req_failed': ['rate<0.15'], // 15% failure acceptable during spikes

    // Response times will spike
    'http_req_duration': ['p(50)<3000', 'p(95)<8000'],

    // Spike errors should recover quickly
    'spike_errors': ['rate<0.15'],
  },
};

/**
 * Setup function
 */
export function setup() {
  requireMutationsOptIn('spike-test');
  console.log('=================================================');
  console.log('Starting SPIKE TEST (MUTATING — mixed verify/refresh/enroll)');
  console.log('Simulating sudden traffic surges. Run with -e PROFILE=spike.');
  console.log('=================================================');

  const testLogin = auth.login(config.testUserEmail, config.testUserPassword, config.clientId);
  if (!testLogin) {
    throw new Error('Setup failed: Unable to authenticate');
  }

  return {
    setupComplete: true,
    spikes: [],
  };
}

/**
 * Main test function
 */
export default function (data) {
  const vuEmail = `spike-${__VU}@example.com`;
  const vuPassword = 'LoadTest123!@#';

  const startTime = Date.now();

  // Login
  const loginResult = auth.login(vuEmail, vuPassword);
  if (!loginResult) {
    spikeErrors.add(1);
    sleep(0.5);
    return;
  }

  const { accessToken } = loginResult;

  // Simulate typical user action (verification most common)
  const operation = __ITER % 10;

  try {
    if (operation < 7) {
      // 70% verifications (most common during authentication)
      const imageUrl = biometric.getTestImageUrl(__VU);
      const userId = `spike-user-${__VU % 100}`; // Simulate 100 users
      const metadata = {
        tenantId: `spike-tenant-${__VU % 5}`,
        correlationId: `spike-verify-${__VU}-${__ITER}`,
      };

      const result = biometric.verify(accessToken, imageUrl, userId, metadata);

      if (!result) {
        spikeErrors.add(1);
      }

    } else if (operation < 9) {
      // 20% token refresh
      const result = auth.refreshToken(loginResult.refreshToken);

      if (!result) {
        spikeErrors.add(1);
      }

    } else {
      // 10% enrollments
      const imageUrl = biometric.getTestImageUrl(__VU);
      const metadata = {
        userId: `spike-user-${__VU}`,
        tenantId: `spike-tenant-${__VU % 5}`,
        correlationId: `spike-enroll-${__VU}-${__ITER}`,
      };

      const job = biometric.startEnrollment(accessToken, imageUrl, metadata);

      if (!job) {
        spikeErrors.add(1);
      }
    }

  } catch (error) {
    spikeErrors.add(1);
  }

  const duration = Date.now() - startTime;
  spikePerformance.add(duration);

  // Track recovery time (time to get back to normal performance)
  if (duration < 1000) {
    recoveryTime.add(duration);
  }

  // Very short sleep (spike load)
  sleep(0.05 + Math.random() * 0.1);
}

/**
 * Teardown function
 */
export function teardown(data) {
  console.log('=================================================');
  console.log('Spike test completed');
  console.log('=================================================');
  console.log('');
  console.log('Analysis:');
  console.log('- Check if system handled spikes gracefully');
  console.log('- Review error rates during each spike');
  console.log('- Examine recovery time after spikes');
  console.log('- Verify auto-scaling triggered (if enabled)');
  console.log('- Check if performance returned to baseline');
}
