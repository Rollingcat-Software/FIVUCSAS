/**
 * Biometric Enrollment Load Test
 *
 * Tests the biometric enrollment system under load:
 * - Concurrent enrollments
 * - ML pipeline performance
 * - Database write performance
 * - Audit logging throughput
 *
 * Run: k6 run scenarios/enrollment-load-test.js
 */

import { sleep, check } from 'k6';
import { Counter, Trend, Rate } from 'k6/metrics';
import config from '../config.js';
import auth from '../utils/auth.js';
import biometric from '../utils/biometric.js';

// Custom metrics
const enrollmentSuccessRate = new Rate('enrollment_success');
const enrollmentFailureRate = new Rate('enrollment_failure');
const enrollmentQualityScore = new Trend('enrollment_quality_score');
const enrollmentLivenessScore = new Trend('enrollment_liveness_score');
const enrollmentsCompleted = new Counter('enrollments_completed');

// Test configuration
export const options = {
  stages: [
    { duration: '1m', target: 10 },   // Ramp up to 10 concurrent enrollments
    { duration: '3m', target: 10 },   // Stay at 10
    { duration: '1m', target: 25 },   // Ramp to 25
    { duration: '3m', target: 25 },   // Stay at 25
    { duration: '1m', target: 50 },   // Ramp to 50
    { duration: '3m', target: 50 },   // Stay at 50
    { duration: '1m', target: 100 },  // Spike to 100
    { duration: '2m', target: 100 },  // Maintain spike
    { duration: '2m', target: 0 },    // Ramp down
  ],

  thresholds: {
    // 95% of enrollments should complete in < 2 seconds
    'enrollment_duration': ['p(95)<2000'],

    // Enrollment success rate should be > 95%
    'enrollment_success': ['rate>0.95'],

    // HTTP request failure rate should be < 5% (ML can fail on bad images)
    'http_req_failed': ['rate<0.05'],
  },

  // Graceful stop
  gracefulStop: '60s',
};

/**
 * Setup function
 */
export function setup() {
  console.log('Starting enrollment load test...');
  console.log(`Identity API: ${config.identityApiUrl}`);
  console.log(`Biometric API: ${config.biometricApiUrl}`);

  // Test authentication
  const testLogin = auth.login(config.testUserEmail, config.testUserPassword);
  if (!testLogin) {
    throw new Error('Setup failed: Unable to authenticate');
  }

  console.log('Setup complete: Ready for enrollment testing');
  return {
    setupComplete: true,
    testAccessToken: testLogin.accessToken,
  };
}

/**
 * Main test function
 */
export default function (data) {
  // Login for this VU
  const vuEmail = `loadtest-enroll-${__VU}@example.com`;
  const vuPassword = 'LoadTest123!@#';

  const loginResult = auth.login(vuEmail, vuPassword);
  if (!loginResult) {
    enrollmentFailureRate.add(1);
    sleep(1);
    return;
  }

  const { accessToken } = loginResult;

  // Generate test image URL
  const imageUrl = biometric.getTestImageUrl(__VU);

  // Metadata for enrollment
  const metadata = {
    userId: `user-${__VU}`,
    tenantId: `tenant-${__VU % 10}`, // Distribute across 10 tenants
    correlationId: `enroll-${__VU}-${__ITER}-${Date.now()}`,
  };

  // Start enrollment
  const startTime = Date.now();
  const job = biometric.startEnrollment(accessToken, imageUrl, metadata);

  if (!job) {
    enrollmentFailureRate.add(1);
    sleep(1);
    return;
  }

  // Wait for enrollment completion
  const result = biometric.waitForEnrollment(accessToken, job.jobId, 30, 1);
  const totalDuration = Date.now() - startTime;

  if (result && result.status === 'completed') {
    enrollmentSuccessRate.add(1);
    enrollmentsCompleted.add(1);

    // Record quality metrics
    if (result.qualityScore) {
      enrollmentQualityScore.add(result.qualityScore);
    }
    if (result.livenessScore) {
      enrollmentLivenessScore.add(result.livenessScore);
    }

    // Log successful enrollment
    if (__ITER % 10 === 0) {
      console.log(`Enrollment completed: ${result.embeddingId}, quality: ${result.qualityScore}, duration: ${totalDuration}ms`);
    }
  } else {
    enrollmentFailureRate.add(1);
    console.error(`Enrollment failed: ${job.jobId}`);
  }

  // Sleep before next iteration
  sleep(2 + Math.random() * 3);
}

/**
 * Teardown function
 */
export function teardown(data) {
  console.log('Enrollment load test completed');
  console.log(`Total enrollments completed: ${enrollmentsCompleted.count}`);
}
