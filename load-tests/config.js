/**
 * K6 Load Testing Configuration
 *
 * Centralized configuration for all load test scenarios
 */

export const config = {
  // Base URLs
  identityApiUrl: __ENV.IDENTITY_API_URL || 'http://localhost:8080',
  biometricApiUrl: __ENV.BIOMETRIC_API_URL || 'http://localhost:8000',

  // Test data
  testTenantSubdomain: __ENV.TEST_TENANT || 'test-tenant',
  testUserEmail: __ENV.TEST_USER_EMAIL || 'loadtest@example.com',
  testUserPassword: __ENV.TEST_USER_PASSWORD || 'LoadTest123!@#',

  // Load test stages
  stages: {
    // Ramp-up: Gradually increase load
    rampUp: { duration: '2m', target: 50 },

    // Steady state: Maintain load
    steady: { duration: '5m', target: 50 },

    // Peak load: Stress test
    peak: { duration: '2m', target: 100 },

    // Ramp-down: Gradually decrease load
    rampDown: { duration: '1m', target: 0 },
  },

  // Stress test stages
  stressStages: {
    rampUp: { duration: '2m', target: 100 },
    steady: { duration: '5m', target: 100 },
    peak: { duration: '3m', target: 200 },
    spike: { duration: '1m', target: 500 },
    recover: { duration: '2m', target: 100 },
    rampDown: { duration: '1m', target: 0 },
  },

  // Spike test stages
  spikeStages: {
    baseline: { duration: '1m', target: 50 },
    spike1: { duration: '30s', target: 500 },
    recover1: { duration: '1m', target: 50 },
    spike2: { duration: '30s', target: 1000 },
    recover2: { duration: '1m', target: 50 },
    rampDown: { duration: '30s', target: 0 },
  },

  // Soak test stages (long duration)
  soakStages: {
    rampUp: { duration: '5m', target: 50 },
    soak: { duration: '1h', target: 50 },
    rampDown: { duration: '5m', target: 0 },
  },

  // Performance thresholds
  thresholds: {
    // HTTP request duration (95th percentile should be < 500ms)
    http_req_duration: ['p(95)<500'],

    // HTTP request failure rate (should be < 1%)
    http_req_failed: ['rate<0.01'],

    // Iteration duration
    iteration_duration: ['p(95)<2000'],

    // Custom metrics
    enrollment_duration: ['p(95)<2000'],
    verification_duration: ['p(95)<500'],
    login_duration: ['p(95)<300'],
    token_refresh_duration: ['p(95)<200'],
  },

  // Sample images for biometric testing
  sampleImages: {
    // Base64-encoded 1x1 pixel JPEG (for testing only)
    // In production, use real face images
    smallJpeg: '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAA8A/9k=',
  },

  // Grafana Cloud (optional - for cloud-based monitoring)
  grafanaCloudUrl: __ENV.K6_CLOUD_URL || '',

  // Prometheus Push Gateway (for custom metrics)
  prometheusPushGateway: __ENV.PROMETHEUS_PUSHGATEWAY || 'http://localhost:9091',
};

export default config;
