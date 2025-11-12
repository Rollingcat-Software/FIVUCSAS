/**
 * Biometric utilities for K6 load tests
 */

import http from 'k6/http';
import { check } from 'k6';
import { Trend } from 'k6/metrics';
import config from '../config.js';
import { authHeaders } from './auth.js';

// Custom metrics for biometric operations
export const enrollmentDuration = new Trend('enrollment_duration', true);
export const verificationDuration = new Trend('verification_duration', true);
export const embeddingGenerationDuration = new Trend('embedding_generation_duration', true);

/**
 * Start biometric enrollment
 */
export function startEnrollment(accessToken, imageUrl, metadata = {}) {
  const enrollUrl = `${config.biometricApiUrl}/api/v1/biometric/enroll`;

  const payload = JSON.stringify({
    image_url: imageUrl,
    user_id: metadata.userId || 'load-test-user',
    tenant_id: metadata.tenantId || 'load-test-tenant',
    correlation_id: metadata.correlationId || `enrollment-${Date.now()}-${Math.random()}`,
    ...metadata,
  });

  const params = {
    headers: authHeaders(accessToken),
    tags: { name: 'enrollment_start' },
  };

  const startTime = Date.now();
  const response = http.post(enrollUrl, payload, params);
  const duration = Date.now() - startTime;

  const success = check(response, {
    'enrollment status is 202': (r) => r.status === 202,
    'enrollment returns job_id': (r) => r.json('job_id') !== undefined,
  });

  if (!success) {
    console.error(`Enrollment failed: ${response.status} ${response.body}`);
    return null;
  }

  enrollmentDuration.add(duration);

  return {
    jobId: response.json('job_id'),
    correlationId: response.json('correlation_id'),
    status: response.json('status'),
  };
}

/**
 * Check enrollment status
 */
export function checkEnrollmentStatus(accessToken, jobId) {
  const statusUrl = `${config.biometricApiUrl}/api/v1/biometric/enroll/${jobId}`;

  const params = {
    headers: authHeaders(accessToken),
    tags: { name: 'enrollment_status' },
  };

  const response = http.get(statusUrl, params);

  const success = check(response, {
    'enrollment status check is 200': (r) => r.status === 200,
    'enrollment has status': (r) => r.json('status') !== undefined,
  });

  if (!success) {
    return null;
  }

  return {
    status: response.json('status'),
    embeddingId: response.json('embedding_id'),
    qualityScore: response.json('quality_score'),
    livenessScore: response.json('liveness_score'),
    error: response.json('error'),
  };
}

/**
 * Wait for enrollment completion (polling)
 */
export function waitForEnrollment(accessToken, jobId, maxAttempts = 30, pollInterval = 1) {
  for (let i = 0; i < maxAttempts; i++) {
    const status = checkEnrollmentStatus(accessToken, jobId);

    if (!status) {
      return null;
    }

    if (status.status === 'completed') {
      return status;
    }

    if (status.status === 'failed') {
      console.error(`Enrollment failed: ${status.error}`);
      return null;
    }

    // Sleep before next poll
    sleep(pollInterval);
  }

  console.error(`Enrollment timeout: job ${jobId}`);
  return null;
}

/**
 * Perform biometric verification
 */
export function verify(accessToken, imageUrl, userId, metadata = {}) {
  const verifyUrl = `${config.biometricApiUrl}/api/v1/biometric/verify`;

  const payload = JSON.stringify({
    image_url: imageUrl,
    user_id: userId,
    tenant_id: metadata.tenantId || 'load-test-tenant',
    correlation_id: metadata.correlationId || `verify-${Date.now()}-${Math.random()}`,
    ...metadata,
  });

  const params = {
    headers: authHeaders(accessToken),
    tags: { name: 'verification' },
  };

  const startTime = Date.now();
  const response = http.post(verifyUrl, payload, params);
  const duration = Date.now() - startTime;

  const success = check(response, {
    'verification status is 200': (r) => r.status === 200,
    'verification returns verified': (r) => r.json('verified') !== undefined,
    'verification returns similarity_score': (r) => r.json('similarity_score') !== undefined,
  });

  if (!success) {
    console.error(`Verification failed: ${response.status} ${response.body}`);
    return null;
  }

  verificationDuration.add(duration);

  return {
    verified: response.json('verified'),
    similarityScore: response.json('similarity_score'),
    qualityScore: response.json('quality_score'),
    livenessScore: response.json('liveness_score'),
    correlationId: response.json('correlation_id'),
  };
}

/**
 * Delete biometric data (GDPR)
 */
export function deleteBiometricData(accessToken, userId) {
  const deleteUrl = `${config.biometricApiUrl}/api/v1/biometric/user/${userId}`;

  const params = {
    headers: authHeaders(accessToken),
    tags: { name: 'biometric_delete' },
  };

  const response = http.del(deleteUrl, null, params);

  return check(response, {
    'delete status is 200': (r) => r.status === 200,
  });
}

/**
 * Generate test image URL
 * In production, this would return URLs to actual face images in S3
 */
export function getTestImageUrl(index = 0) {
  // For load testing, we'll use a placeholder service or mock URLs
  // Replace with actual S3 URLs in production
  return `https://storage.googleapis.com/fivucsas-test/faces/face-${index % 100}.jpg`;
}

/**
 * Complete enrollment flow (start + wait + validate)
 */
export function enrollComplete(accessToken, imageUrl, metadata = {}) {
  const startTime = Date.now();

  // Start enrollment
  const job = startEnrollment(accessToken, imageUrl, metadata);
  if (!job) {
    return null;
  }

  // Wait for completion
  const result = waitForEnrollment(accessToken, job.jobId);
  if (!result) {
    return null;
  }

  const duration = Date.now() - startTime;
  enrollmentDuration.add(duration);

  return result;
}

/**
 * Get embedding by ID
 */
export function getEmbedding(accessToken, embeddingId) {
  const embeddingUrl = `${config.biometricApiUrl}/api/v1/biometric/embedding/${embeddingId}`;

  const params = {
    headers: authHeaders(accessToken),
    tags: { name: 'get_embedding' },
  };

  const response = http.get(embeddingUrl, params);

  const success = check(response, {
    'get embedding status is 200': (r) => r.status === 200,
  });

  if (!success) {
    return null;
  }

  return response.json();
}

export default {
  startEnrollment,
  checkEnrollmentStatus,
  waitForEnrollment,
  verify,
  deleteBiometricData,
  getTestImageUrl,
  enrollComplete,
  getEmbedding,
  enrollmentDuration,
  verificationDuration,
  embeddingGenerationDuration,
};
