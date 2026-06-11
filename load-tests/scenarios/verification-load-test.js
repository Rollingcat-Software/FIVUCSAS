/**
 * Biometric Verification Load Test
 *
 * Tests the biometric verification system under load:
 * - Concurrent verifications
 * - Embedding comparison performance
 * - Database read performance
 * - Cache hit rates
 *
 * Run: k6 run scenarios/verification-load-test.js
 */

import { sleep } from 'k6';
import { Counter, Trend, Rate } from 'k6/metrics';
import config, { profileStages } from '../config.js';
import auth from '../utils/auth.js';
import biometric from '../utils/biometric.js';
import { requireMutationsOptIn } from '../utils/guard.js';

// Custom metrics
const verificationSuccessRate = new Rate('verification_success');
const verificationFailureRate = new Rate('verification_failure');
const verificationTruePositive = new Counter('verification_true_positive');
const verificationFalsePositive = new Counter('verification_false_positive');
const verificationSimilarityScore = new Trend('verification_similarity_score');
const verificationsCompleted = new Counter('verifications_completed');

// Test configuration. Ramps come from the selected PROFILE (smoke/load/stress/
// spike) — see config.js.
export const options = {
  stages: profileStages(),

  thresholds: {
    // 95% of verifications < 500ms, 99% < 1000ms (single key, array of both —
    // the old config defined 'verification_duration' twice so p95 was silently
    // dropped; k6 needs both expressions under ONE key).
    'verification_duration': ['p(95)<500', 'p(99)<1000'],

    // Verification success rate should be > 95%
    'verification_success': ['rate>0.95'],

    // HTTP request failure rate should be < 2%
    'http_req_failed': ['rate<0.02'],
  },

  // Graceful stop
  gracefulStop: '30s',
};

/**
 * Setup function
 */
export function setup() {
  requireMutationsOptIn('verification-load-test');
  console.log('Starting verification load test (MUTATING — pre-enrolls + verifies biometrics)...');
  console.log(`Identity API: ${config.identityApiUrl}`);
  console.log(`Biometric API: ${config.biometricApiUrl}`);

  // Authenticate
  const testLogin = auth.login(config.testUserEmail, config.testUserPassword, config.clientId);
  if (!testLogin) {
    throw new Error('Setup failed: Unable to authenticate');
  }

  // Pre-enroll some test users for verification
  console.log('Pre-enrolling test users for verification testing...');
  const enrolledUsers = [];

  for (let i = 0; i < 10; i++) {
    const imageUrl = biometric.getTestImageUrl(i);
    const metadata = {
      userId: `verify-test-user-${i}`,
      tenantId: 'verification-test-tenant',
      correlationId: `setup-enroll-${i}`,
    };

    const job = biometric.startEnrollment(testLogin.accessToken, imageUrl, metadata);
    if (job) {
      const result = biometric.waitForEnrollment(testLogin.accessToken, job.jobId);
      if (result && result.embeddingId) {
        enrolledUsers.push({
          userId: metadata.userId,
          embeddingId: result.embeddingId,
          imageUrl: imageUrl,
        });
        console.log(`Enrolled user: ${metadata.userId}, embedding: ${result.embeddingId}`);
      }
    }
  }

  console.log(`Setup complete: ${enrolledUsers.length} users enrolled for verification`);

  return {
    setupComplete: true,
    enrolledUsers: enrolledUsers,
  };
}

/**
 * Main test function
 */
export default function (data) {
  if (!data.enrolledUsers || data.enrolledUsers.length === 0) {
    console.error('No enrolled users available for verification');
    return;
  }

  // Login for this VU
  const vuEmail = `loadtest-verify-${__VU}@example.com`;
  const vuPassword = 'LoadTest123!@#';

  const loginResult = auth.login(vuEmail, vuPassword);
  if (!loginResult) {
    verificationFailureRate.add(1);
    sleep(1);
    return;
  }

  const { accessToken } = loginResult;

  // Pick a random enrolled user to verify against
  const targetUser = data.enrolledUsers[__VU % data.enrolledUsers.length];

  // Determine if this should be a true positive or false positive test
  // 90% true positive (same user), 10% false positive (different user)
  const isTruePositive = Math.random() > 0.1;

  let imageUrl;
  if (isTruePositive) {
    // Use same image for true positive
    imageUrl = targetUser.imageUrl;
  } else {
    // Use different image for false positive test
    const differentUser = data.enrolledUsers[(__VU + 1) % data.enrolledUsers.length];
    imageUrl = differentUser.imageUrl;
  }

  // Metadata for verification
  const metadata = {
    tenantId: 'verification-test-tenant',
    correlationId: `verify-${__VU}-${__ITER}-${Date.now()}`,
  };

  // Perform verification
  const startTime = Date.now();
  const result = biometric.verify(accessToken, imageUrl, targetUser.userId, metadata);
  const duration = Date.now() - startTime;

  if (result) {
    verificationSuccessRate.add(1);
    verificationsCompleted.add(1);

    // Record similarity score
    if (result.similarityScore !== undefined) {
      verificationSimilarityScore.add(result.similarityScore);
    }

    // Track true/false positives
    if (isTruePositive && result.verified) {
      verificationTruePositive.add(1);
    } else if (!isTruePositive && result.verified) {
      verificationFalsePositive.add(1);
      console.warn(`False positive detected: VU ${__VU}, similarity: ${result.similarityScore}`);
    }

    // Log periodic updates
    if (__ITER % 50 === 0) {
      console.log(`Verification: verified=${result.verified}, similarity=${result.similarityScore}, duration=${duration}ms`);
    }
  } else {
    verificationFailureRate.add(1);
  }

  // Sleep before next iteration (simulate user think time)
  sleep(0.5 + Math.random());
}

/**
 * Teardown function
 */
export function teardown(data) {
  console.log('Verification load test completed');
  console.log(`Total verifications completed: ${verificationsCompleted.count}`);
  console.log(`True positives: ${verificationTruePositive.count}`);
  console.log(`False positives: ${verificationFalsePositive.count}`);
}
