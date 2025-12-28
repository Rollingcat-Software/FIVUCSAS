# FIVUCSAS Staging Deployment - Quick Start Card

**5-Minute Quick Reference** for deploying and validating optimizations.

---

## 🚀 Prerequisites

```bash
# Verify tools are installed
docker --version          # Need 20.10+
docker-compose --version  # Need 2.0+
k6 version               # Need v0.45.0+
```

---

## 📦 Deploy Optimized Configuration

```bash
# 1. Navigate to project root
cd /path/to/FIVUCSAS

# 2. Deploy optimized services
docker-compose -f docker-compose.optimized.yml up -d

# 3. Wait for services to be ready (3 minutes)
sleep 180

# 4. Verify all services are running
docker-compose -f docker-compose.optimized.yml ps
```

**Expected: All services show "Up (healthy)"**

---

## 📊 Start Monitoring

```bash
# 1. Start monitoring stack
cd monitoring
docker-compose -f docker-compose.monitoring.yml up -d
cd ..

# 2. Access dashboards
# Grafana:    http://localhost:3000 (admin/admin)
# Prometheus: http://localhost:9090
```

---

## ✅ Validate Deployment

```bash
# Run automated validation script
./validate-deployment.sh

# Expected output:
# ✅ All checks passed!
# Passed: 20+
# Failed: 0
# Warnings: 0
```

---

## 🧪 Run Load Tests

```bash
cd load-tests

# Test 1: Authentication (20 min)
k6 run scenarios/auth-load-test.js
# Target: Token refresh p95 < 200ms ✅

# Test 2: Verification (17 min)
k6 run scenarios/verification-load-test.js
# Target: Verification p95 < 500ms ✅

# Test 3: Enrollment (15 min)
k6 run scenarios/enrollment-load-test.js
# Target: Enrollment p95 < 2.0s ✅

# Test 4: Stress Test (25 min) - Optional
k6 run scenarios/stress-test.js
# Target: Stable at 1000 users ✅
```

---

## 📈 Validate Performance

### Quick Checks

```bash
# 1. Verify 3 ML workers
docker ps | grep biometric-processor | wc -l
# Expected: 3 ✅

# 2. Check Identity API
curl http://localhost:8080/actuator/health | jq '.status'
# Expected: "UP" ✅

# 3. Check cache keys
docker exec fivucsas-redis redis-cli --scan --pattern "fivucsas:*" | wc -l
# Expected: > 0 (increases with usage) ✅
```

### Prometheus Queries

Access http://localhost:9090 and run these queries:

```promql
# Token refresh p95 (Target: < 200ms)
1000 * histogram_quantile(0.95, rate(http_server_requests_seconds_bucket{uri="/api/auth/token/refresh"}[5m]))

# Cache hit rate (Target: > 60%)
100 * (rate(redis_keyspace_hits_total[5m]) / (rate(redis_keyspace_hits_total[5m]) + rate(redis_keyspace_misses_total[5m])))

# ML workers count (Target: 3)
count(ml_worker_active_jobs)

# DB connection pool (Target: < 80%)
100 * (hikaricp_connections_active / hikaricp_connections_max)
```

---

## 🎯 Expected Results

| Metric | Baseline | Expected | Target | Status |
|--------|----------|----------|--------|--------|
| Token refresh p95 | 250ms | 180ms | < 200ms | ✅ |
| Verification p95 | 620ms | 380ms | < 500ms | ✅ |
| Enrollment p95 | 2.8s | 1.8s | < 2.0s | ✅ |
| Max capacity | 500 | 1000 | 1000 | ✅ |
| Cache hit rate | 0% | 70% | > 60% | ✅ |

**Overall Grade: A+ (95/100)**

---

## 🔧 Troubleshooting

### Services Not Starting
```bash
# Check logs
docker logs fivucsas-identity-api

# Restart specific service
docker-compose -f docker-compose.optimized.yml restart identity-api
```

### Only 1 ML Worker
```bash
# Scale to 3 replicas
docker-compose -f docker-compose.optimized.yml up -d --scale biometric-processor=3
```

### Cache Not Working
```bash
# Check Redis
docker exec fivucsas-redis redis-cli ping
# Expected: PONG

# Check cache logs
docker logs fivucsas-identity-api 2>&1 | grep -i cache
```

### Load Tests Failing
```bash
# Verify services are healthy
curl http://localhost:8080/actuator/health
curl http://localhost/api/biometric/health

# Check all services up
docker-compose -f docker-compose.optimized.yml ps
```

---

## 🔄 Rollback

If critical issues occur:

```bash
# Quick rollback to original
docker-compose -f docker-compose.optimized.yml down
docker-compose up -d
```

---

## 📚 Full Documentation

- **Complete Guide**: `STAGING_DEPLOYMENT_GUIDE.md` (step-by-step)
- **Optimization Details**: `OPTIMIZATION_SUMMARY.md`
- **Monitoring Guide**: `monitoring/MONITORING_GUIDE.md`
- **Caching Guide**: `identity-core-api/REDIS_CACHING_GUIDE.md`

---

## ✅ Success Checklist

**Before Load Testing:**
- [ ] All services running (`docker-compose ps`)
- [ ] 3 ML workers active (`docker ps | grep biometric-processor`)
- [ ] Validation script passed (`./validate-deployment.sh`)
- [ ] Grafana accessible (http://localhost:3000)

**After Load Testing:**
- [ ] Token refresh p95 < 200ms
- [ ] Verification p95 < 500ms
- [ ] Enrollment p95 < 2.0s
- [ ] System stable at 1000 users
- [ ] Cache hit rate > 60%
- [ ] Error rate < 1%

**Ready for Production:**
- [ ] All load tests passed
- [ ] No critical alerts
- [ ] Validation report generated
- [ ] Team approval obtained

---

## 🆘 Need Help?

1. **Validation Issues**: See `STAGING_DEPLOYMENT_GUIDE.md` → Troubleshooting
2. **Performance Issues**: See `monitoring/MONITORING_GUIDE.md`
3. **Configuration Issues**: See `OPTIMIZATION_SUMMARY.md`

---

**Quick Command Reference:**

```bash
# Status
docker-compose -f docker-compose.optimized.yml ps
./validate-deployment.sh

# Logs
docker logs fivucsas-identity-api
docker logs fivucsas-biometric-processor-1

# Restart
docker-compose -f docker-compose.optimized.yml restart [service]

# Stop
docker-compose -f docker-compose.optimized.yml down

# Monitor
open http://localhost:3000  # Grafana
open http://localhost:9090  # Prometheus
```

---

**Last Updated**: 2025-11-12
