# FIVUCSAS Load Testing Suite

Comprehensive load testing suite for the FIVUCSAS biometric platform using **Grafana K6**.

## 📊 Overview

This suite tests the performance, scalability, and reliability of the FIVUCSAS platform under various load conditions:

- **Authentication Load Test**: Login, token refresh, session management
- **Enrollment Load Test**: Biometric enrollment throughput and ML pipeline performance
- **Verification Load Test**: Biometric verification speed and accuracy under load
- **Multi-Tenant Load Test**: Tenant isolation and performance with multiple tenants
- **Stress Test**: Finding system breaking points and maximum capacity
- **Spike Test**: Response to sudden traffic surges

## 🚀 Quick Start

### Prerequisites

1. **Install K6**:
   ```bash
   # macOS
   brew install k6

   # Linux (Debian/Ubuntu)
   sudo gpg -k
   sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
   echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
   sudo apt-get update
   sudo apt-get install k6

   # Windows (via Chocolatey)
   choco install k6

   # Docker
   docker pull grafana/k6
   ```

2. **Start Services**:
   ```bash
   # Start Identity Core API
   cd identity-core-api
   ./mvnw spring-boot:run

   # Start Biometric Processor
   cd biometric-processor
   uvicorn app.main:app --reload

   # Start PostgreSQL and Redis
   docker-compose up -d postgres redis
   ```

### Running Tests

**Basic test run**:
```bash
cd load-tests

# Authentication test
k6 run scenarios/auth-load-test.js

# Enrollment test
k6 run scenarios/enrollment-load-test.js

# Verification test
k6 run scenarios/verification-load-test.js

# Multi-tenant test
k6 run scenarios/multi-tenant-load-test.js

# Stress test
k6 run scenarios/stress-test.js

# Spike test
k6 run scenarios/spike-test.js
```

**With custom configuration**:
```bash
# Override API URLs
K6_IDENTITY_API_URL=https://api.fivucsas.com \
K6_BIOMETRIC_API_URL=https://biometric.fivucsas.com \
k6 run scenarios/auth-load-test.js

# With results output
k6 run --out json=results/auth-test-results.json scenarios/auth-load-test.js

# With Grafana Cloud integration
k6 run --out cloud scenarios/auth-load-test.js
```

**Using Docker**:
```bash
docker run --rm -i --network=host \
  -v $(pwd):/tests \
  grafana/k6 run /tests/scenarios/auth-load-test.js
```

## 📁 Project Structure

```
load-tests/
├── config.js                       # Global configuration
├── README.md                       # This file
├── LOAD_TESTING_GUIDE.md          # Comprehensive guide
│
├── scenarios/                      # Test scenarios
│   ├── auth-load-test.js          # Authentication load test
│   ├── enrollment-load-test.js    # Enrollment load test
│   ├── verification-load-test.js  # Verification load test
│   ├── multi-tenant-load-test.js  # Multi-tenant test
│   ├── stress-test.js             # Stress test
│   └── spike-test.js              # Spike test
│
├── utils/                          # Helper utilities
│   ├── auth.js                    # Authentication helpers
│   └── biometric.js               # Biometric operation helpers
│
└── results/                        # Test results (gitignored)
    ├── auth-test-results.json
    ├── enrollment-test-results.json
    └── ...
```

## 🎯 Test Scenarios

### 1. Authentication Load Test

**Purpose**: Test login, token refresh, and session management

**Load Pattern**:
- Ramp up: 50 → 100 → 200 VUs
- Duration: ~20 minutes
- Operations: Login, token refresh, logout

**Thresholds**:
- Login: p95 < 300ms
- Token refresh: p95 < 200ms
- Failure rate: < 1%

**Run**:
```bash
k6 run scenarios/auth-load-test.js
```

---

### 2. Enrollment Load Test

**Purpose**: Test biometric enrollment pipeline

**Load Pattern**:
- Ramp up: 10 → 25 → 50 → 100 VUs
- Duration: ~15 minutes
- Operations: Image upload, ML processing, embedding storage

**Thresholds**:
- Enrollment: p95 < 2000ms
- Success rate: > 95%
- ML quality: Quality score > 0.5

**Run**:
```bash
k6 run scenarios/enrollment-load-test.js
```

---

### 3. Verification Load Test

**Purpose**: Test biometric verification speed

**Load Pattern**:
- Ramp up: 50 → 100 → 200 → 500 VUs
- Duration: ~17 minutes
- Operations: Face verification, embedding comparison

**Thresholds**:
- Verification: p95 < 500ms, p99 < 1000ms
- Success rate: > 95%
- False positive rate: < 1%

**Run**:
```bash
k6 run scenarios/verification-load-test.js
```

---

### 4. Multi-Tenant Load Test

**Purpose**: Test tenant isolation and performance

**Load Pattern**:
- 20 tenants, 100-200 VUs distributed
- Duration: ~16 minutes
- Operations: Mixed (enrollment, verification, auth)

**Thresholds**:
- Response time: p95 < 1000ms
- Failure rate: < 1%
- Tenant isolation violations: 0

**Run**:
```bash
k6 run scenarios/multi-tenant-load-test.js
```

---

### 5. Stress Test

**Purpose**: Find system breaking point

**Load Pattern**:
- Gradual increase: 50 → 1500 VUs
- Duration: ~25 minutes
- Operations: Mixed workload

**Expected**:
- System will fail at some point
- Goal: Identify maximum capacity

**Run**:
```bash
k6 run scenarios/stress-test.js
```

---

### 6. Spike Test

**Purpose**: Test response to traffic spikes

**Load Pattern**:
- Baseline: 50 VUs
- Spike 1: 300 VUs (6x)
- Spike 2: 500 VUs (10x)
- Spike 3: 1000 VUs (20x)

**Thresholds**:
- Spike errors: < 15%
- Recovery: Return to baseline performance

**Run**:
```bash
k6 run scenarios/spike-test.js
```

## 📈 Analyzing Results

### Console Output

K6 provides real-time metrics in the console:

```
execution: local
    script: scenarios/auth-load-test.js
    output: -

scenarios: (100.00%) 1 scenario, 200 max VUs, 20m30s max duration

     data_received..................: 15 MB  50 kB/s
     data_sent......................: 8.0 MB 27 kB/s
     http_req_blocked...............: avg=1.2ms    p(95)=3.5ms
     http_req_duration..............: avg=245ms    p(95)=450ms
     http_req_failed................: 0.12%  ✓ 42       ✗ 35258
     http_reqs......................: 35300  117/s
     login_duration.................: avg=210ms    p(95)=380ms
     token_refresh_duration.........: avg=150ms    p(95)=250ms
     vus............................: 200    min=0      max=200
```

### JSON Output

Export results to JSON for detailed analysis:

```bash
k6 run --out json=results/test-results.json scenarios/auth-load-test.js
```

### Grafana Cloud

Stream results to Grafana Cloud for visualization:

```bash
# Set up Grafana Cloud token
export K6_CLOUD_TOKEN=your-token-here

# Run with cloud output
k6 run --out cloud scenarios/auth-load-test.js
```

### HTML Report

Generate HTML report using `k6-reporter`:

```bash
npm install -g k6-reporter
k6 run --out json=results/test-results.json scenarios/auth-load-test.js
k6-reporter results/test-results.json
```

## 🔧 Configuration

### Environment Variables

Configure test parameters via environment variables:

```bash
# API URLs
export IDENTITY_API_URL=http://localhost:8080
export BIOMETRIC_API_URL=http://localhost:8000

# Test credentials
export TEST_TENANT=my-tenant
export TEST_USER_EMAIL=test@example.com
export TEST_USER_PASSWORD=SecurePassword123!

# Monitoring
export K6_CLOUD_URL=https://ingest.k6.io
export PROMETHEUS_PUSHGATEWAY=http://localhost:9091
```

### Custom Thresholds

Edit `config.js` to adjust performance thresholds:

```javascript
thresholds: {
  http_req_duration: ['p(95)<500'],      // 95% < 500ms
  http_req_failed: ['rate<0.01'],        // < 1% failures
  enrollment_duration: ['p(95)<2000'],   // Enrollment < 2s
  verification_duration: ['p(95)<500'],  // Verification < 500ms
}
```

### Load Stages

Adjust load patterns in each scenario file:

```javascript
stages: [
  { duration: '2m', target: 50 },   // Ramp up to 50 VUs over 2 minutes
  { duration: '5m', target: 50 },   // Hold at 50 VUs for 5 minutes
  { duration: '2m', target: 100 },  // Ramp to 100 VUs
  { duration: '2m', target: 0 },    // Ramp down
]
```

## 🎯 Performance Baselines

Expected performance metrics for a properly configured system:

| Operation | Target | Threshold | Notes |
|-----------|--------|-----------|-------|
| Login | p95 < 300ms | p99 < 500ms | JWT generation |
| Token Refresh | p95 < 200ms | p99 < 400ms | Token rotation |
| Enrollment | p95 < 2000ms | p99 < 3000ms | Includes ML processing |
| Verification | p95 < 500ms | p99 < 1000ms | Embedding comparison |
| API Calls | p95 < 200ms | p99 < 500ms | General API operations |

**Throughput Targets**:
- Logins: 100-200 req/sec
- Token Refresh: 500-1000 req/sec
- Enrollments: 20-50 req/sec (ML-bound)
- Verifications: 100-200 req/sec

**Resource Limits**:
- Database connections: 50-100 concurrent
- Redis connections: 20-50 concurrent
- ML workers: 2-5 concurrent jobs

## 🐛 Troubleshooting

### Connection Refused

```
ERRO[0001] Connection refused
```

**Solution**: Ensure services are running:
```bash
# Check Identity API
curl http://localhost:8080/actuator/health

# Check Biometric API
curl http://localhost:8000/health
```

### High Error Rate

```
http_req_failed: 45.2% ✗ 4520 ✓ 5480
```

**Solution**:
1. Check service logs for errors
2. Verify database connections not exhausted
3. Check Redis connectivity
4. Review ML worker capacity

### Slow Performance

```
http_req_duration: avg=5.2s p(95)=12s
```

**Solution**:
1. Add database indexes (see audit logs correlation_id)
2. Increase connection pool size
3. Add more ML workers
4. Enable Redis caching
5. Profile slow endpoints

## 📚 Additional Resources

- [K6 Documentation](https://k6.io/docs/)
- [Load Testing Best Practices](https://k6.io/docs/testing-guides/test-types/)
- [Grafana Cloud K6](https://grafana.com/products/cloud/k6/)
- [FIVUCSAS Load Testing Guide](./LOAD_TESTING_GUIDE.md)

## 🤝 Contributing

To add new test scenarios:

1. Create new file in `scenarios/`
2. Import utilities from `utils/`
3. Define `options` with stages and thresholds
4. Implement `setup()`, `default()`, and `teardown()`
5. Document in this README
6. Test locally before committing

## 📝 License

Copyright © 2025 FIVUCSAS. All rights reserved.
