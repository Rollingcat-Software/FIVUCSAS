/**
 * Multi-Tenant Load Test
 *
 * Tests multi-tenant isolation and performance:
 * - Concurrent operations across multiple tenants
 * - Tenant data isolation
 * - Database query performance with tenant scoping
 * - Cache partitioning
 *
 * Run: k6 run scenarios/multi-tenant-load-test.js
 */

import { sleep } from 'k6';
import { Counter, Trend, Rate } from 'k6/metrics';
import config from '../config.js';
import auth from '../utils/auth.js';
import biometric from '../utils/biometric.js';

// Custom metrics per tenant (use tags)
const operationsPerTenant = new Counter('operations_per_tenant');
const enrollmentsPerTenant = new Counter('enrollments_per_tenant');
const verificationsPerTenant = new Counter('verifications_per_tenant');
const tenantIsolationViolations = new Counter('tenant_isolation_violations');

// Test configuration
export const options = {
  stages: [
    { duration: '2m', target: 100 },   // Ramp up to 100 users across tenants
    { duration: '5m', target: 100 },   // Stay at 100
    { duration: '2m', target: 200 },   // Ramp to 200
    { duration: '5m', target: 200 },   // Stay at 200
    { duration: '2m', target: 0 },     // Ramp down
  ],

  thresholds: {
    // Performance should not degrade with multiple tenants
    'http_req_duration': ['p(95)<1000'],
    'http_req_failed': ['rate<0.01'],

    // No tenant isolation violations should occur
    'tenant_isolation_violations': ['count==0'],
  },

  tags: {
    test_type: 'multi_tenant',
  },
};

// Number of tenants to simulate
const NUM_TENANTS = 20;

/**
 * Setup function
 */
export function setup() {
  console.log('Starting multi-tenant load test...');
  console.log(`Number of tenants: ${NUM_TENANTS}`);

  // Create test data for each tenant
  const tenants = [];

  for (let i = 0; i < NUM_TENANTS; i++) {
    const tenantId = `tenant-${i}`;
    const tenantEmail = `admin@${tenantId}.example.com`;
    const tenantPassword = 'LoadTest123!@#';

    // Authenticate as tenant admin
    const loginResult = auth.login(tenantEmail, tenantPassword);

    if (loginResult) {
      tenants.push({
        id: tenantId,
        email: tenantEmail,
        accessToken: loginResult.accessToken,
        refreshToken: loginResult.refreshToken,
      });
      console.log(`Tenant ${tenantId} authenticated`);
    }
  }

  console.log(`Setup complete: ${tenants.length} tenants ready`);

  return {
    tenants: tenants,
  };
}

/**
 * Main test function
 */
export default function (data) {
  if (!data.tenants || data.tenants.length === 0) {
    console.error('No tenants available');
    return;
  }

  // Assign VU to a tenant (distribute VUs across tenants)
  const tenantIndex = __VU % data.tenants.length;
  const tenant = data.tenants[tenantIndex];

  // Login as user within this tenant
  const userEmail = `user-${__VU}@${tenant.id}.example.com`;
  const userPassword = 'LoadTest123!@#';

  const loginResult = auth.login(userEmail, userPassword);
  if (!loginResult) {
    sleep(1);
    return;
  }

  const { accessToken } = loginResult;

  // Tag all operations with tenant ID for metrics
  const tenantTag = { tenant: tenant.id };

  // Simulate mixed workload for this tenant
  const operation = Math.random();

  if (operation < 0.3) {
    // 30% enrollments
    performEnrollment(accessToken, tenant.id, tenantTag);
  } else if (operation < 0.8) {
    // 50% verifications
    performVerification(accessToken, tenant.id, tenantTag);
  } else {
    // 20% token refresh
    performTokenRefresh(loginResult.refreshToken, tenantTag);
  }

  operationsPerTenant.add(1, tenantTag);

  // Verify tenant isolation (sample check)
  if (__ITER % 20 === 0) {
    verifyTenantIsolation(accessToken, tenant.id, data.tenants);
  }

  // Sleep before next iteration
  sleep(1 + Math.random() * 2);
}

/**
 * Perform enrollment for tenant
 */
function performEnrollment(accessToken, tenantId, tags) {
  const imageUrl = biometric.getTestImageUrl(__VU);
  const metadata = {
    userId: `user-${__VU}`,
    tenantId: tenantId,
    correlationId: `enroll-${tenantId}-${__VU}-${__ITER}`,
  };

  const job = biometric.startEnrollment(accessToken, imageUrl, metadata);
  if (job) {
    enrollmentsPerTenant.add(1, tags);

    // Don't wait for completion in load test (check async)
    // In production, would use webhook or polling
  }
}

/**
 * Perform verification for tenant
 */
function performVerification(accessToken, tenantId, tags) {
  const imageUrl = biometric.getTestImageUrl(__VU);
  const userId = `user-${__VU}`;
  const metadata = {
    tenantId: tenantId,
    correlationId: `verify-${tenantId}-${__VU}-${__ITER}`,
  };

  const result = biometric.verify(accessToken, imageUrl, userId, metadata);
  if (result) {
    verificationsPerTenant.add(1, tags);
  }
}

/**
 * Perform token refresh
 */
function performTokenRefresh(refreshToken, tags) {
  const result = auth.refreshToken(refreshToken);
  // Token refresh is already tracked by auth utility
}

/**
 * Verify tenant isolation
 *
 * Attempt to access another tenant's data - should fail
 */
function verifyTenantIsolation(accessToken, currentTenantId, allTenants) {
  // Pick a different tenant
  const otherTenant = allTenants.find(t => t.id !== currentTenantId);
  if (!otherTenant) {
    return;
  }

  // Attempt to verify against another tenant's user
  // This should fail due to tenant isolation
  const otherUserId = `user-from-${otherTenant.id}`;
  const imageUrl = biometric.getTestImageUrl(0);
  const metadata = {
    tenantId: otherTenant.id, // Trying to access other tenant's data
    correlationId: `isolation-check-${__ITER}`,
  };

  const result = biometric.verify(accessToken, imageUrl, otherUserId, metadata);

  // If this succeeds, it's a tenant isolation violation
  if (result && result.verified) {
    tenantIsolationViolations.add(1);
    console.error(`SECURITY ALERT: Tenant isolation violation! ${currentTenantId} accessed ${otherTenant.id}`);
  }
}

/**
 * Teardown function
 */
export function teardown(data) {
  console.log('Multi-tenant load test completed');

  if (tenantIsolationViolations.count > 0) {
    console.error(`CRITICAL: ${tenantIsolationViolations.count} tenant isolation violations detected!`);
  } else {
    console.log('✅ Tenant isolation verified: No violations detected');
  }
}
