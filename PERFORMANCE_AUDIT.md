# FIVUCSAS Performance Audit

**Date:** 2026-03-18
**Auditor:** Automated
**Status:** Completed with optimizations applied

---

## 1. Database Health

### 1.1 Table Sizes (identity_core)

| Table | Size | Rows |
|-------|------|------|
| biometric_data | 1160 kB | 0 |
| audit_logs | 280 kB | 154 |
| users | 248 kB | 14 |
| refresh_tokens | 200 kB | 135 |
| tenants | 144 kB | 5 |
| rate_limit_buckets | 136 kB | 3 |
| role_permissions | 88 kB | 162 |
| permissions | 96 kB | 44 |
| roles | 80 kB | 18 |

**Assessment:** Tables are very small. No size concerns at current scale.

### 1.2 Table Sizes (biometric_db)

| Table | Size | Rows |
|-------|------|------|
| face_embeddings | 216 kB | 7 |
| voice_enrollments | 120 kB | 24 |
| fingerprint_enrollments | 64 kB | 2 |

**Assessment:** Minimal data. No concerns.

### 1.3 Unused Indexes (identity_core) -- ATTENTION

15 indexes with **zero scans** detected:

| Table | Index | Size |
|-------|-------|------|
| biometric_data | idx_biometric_embedding_ivfflat | 1080 kB |
| rate_limit_buckets | idx_rate_limit_metadata_gin | 24 kB |
| roles | idx_roles_tenant | 16 kB |
| tenants | idx_tenants_domain | 16 kB |
| tenants | idx_tenants_subscription_plan | 16 kB |
| tenants | tenants_domain_key | 16 kB |
| tenants | idx_tenants_active | 16 kB |
| tenants | idx_tenants_name | 16 kB |
| users | idx_users_email | 16 kB |
| users | idx_users_tenant_id | 16 kB |
| users | idx_users_tenant_email | 16 kB |
| users | idx_users_active | 16 kB |
| users | idx_users_phone | 16 kB |
| permissions | idx_permissions_name | 16 kB |

**Note:** Zero scans is expected for a system with low traffic / recently restarted stats. These indexes will become critical at scale -- DO NOT DROP them. The `idx_biometric_embedding_ivfflat` (1080 kB) on an empty table is the only candidate for eventual review.

### 1.4 Unused Indexes (biometric_db)

All 5 indexes show zero scans -- same low-traffic reasoning applies. Keep them.

### 1.5 pg_stat_statements -- NOT ENABLED

**Finding:** `pg_stat_statements` extension is available but not loaded. It requires `shared_preload_libraries` configuration.

**Recommendation:** Add to PostgreSQL container command:
```
command: postgres -c shared_preload_libraries=pg_stat_statements -c pg_stat_statements.track=all
```
This requires a PostgreSQL restart. Enables slow query tracking for future audits.

### 1.6 Connection Pool

| Database | Active Connections |
|----------|-------------------|
| muhabbet | 10 |
| sarnic | 5 |
| identity_core | 5 |
| mizan | 4 |
| postgres | 1 |

**Max connections:** 100
**Total active:** 30 (30% utilization)
**Assessment:** Healthy. No connection pressure.

### 1.7 PostgreSQL Configuration

| Parameter | Value | Assessment |
|-----------|-------|------------|
| max_connections | 100 | OK for current load |
| shared_buffers | 128MB | LOW -- recommend 384MB (25% of 1.5GB limit) |
| work_mem | 4MB | OK |
| effective_cache_size | 4GB | OK |

**Recommendation:** Increase `shared_buffers` to 384MB for the 1.5GB memory limit on the container.

---

## 2. Performance

### 2.1 Container Resource Usage

| Container | CPU | Memory | Mem % | Status |
|-----------|-----|--------|-------|--------|
| mizan-api | **324%** | 1.66G / 2G | **83%** | CRITICAL |
| identity-core-api | 0.15% | 441M / 768M | 57% | OK |
| sarnic-backend | 0.12% | 204M / 768M | 27% | OK |
| muhabbet-backend | 0.12% | 150M / 768M | 20% | OK |
| shared-postgres | 0.49% | 227M / 1.5G | 15% | OK |
| shared-minio | 0.00% | 95M / 512M | 19% | OK |
| uptime-kuma | 0.39% | 89M / 256M | 35% | OK |
| biometric-api | 0.12% | 35M / 3G | 1% | OK (over-provisioned) |
| shared-redis | 3.26% | 4M / 300M | 1% | OK |
| traefik | 0.04% | 32M / 7.6G | 0.4% | OK |

**CRITICAL: mizan-api** is consuming 324% CPU and 83% memory. Logs show it's handling semantic search queries (hybrid search with 237 fused results, 5892ms per request). This is the primary performance bottleneck on the server.

**biometric-api** has 3GB limit but uses only 35MB -- reduce limit to 512MB to free memory.

### 2.2 System Resources

| Resource | Used | Total | Utilization |
|----------|------|-------|-------------|
| RAM | 4.7 GB | 7.6 GB | 62% |
| Swap | 3.4 GB | 4.0 GB | **85%** |
| Disk | 39 GB | 75 GB | 54% |

**CRITICAL: Swap usage at 85%** (3.4G / 4G). This indicates the server is memory-constrained. The mizan-api's high memory usage is likely forcing other processes into swap, degrading overall performance.

### 2.3 API Response Times

| Endpoint | Latency |
|----------|---------|
| identity-core /actuator/health | 0.29s |
| biometric /api/v1/health | 0.06s |

**Assessment:** Health endpoints are responsive. Identity-core at 290ms is acceptable but could be faster (likely JVM cold path or DB health check).

### 2.4 JVM Configuration (identity-core-api)

```
-Xms256m -Xmx512m -XX:+UseContainerSupport -XX:MaxRAMPercentage=75.0
```

**Assessment:** Good. Container-aware JVM settings. 512M max heap within 768M container limit is appropriate.

### 2.5 Redis

| Metric | Value |
|--------|-------|
| Used memory | 1.44 MB |
| Max memory | 256 MB |
| Policy | allkeys-lru |
| Keys | 14 |

**Assessment:** Redis is barely utilized. Good eviction policy configured.

---

## 3. Monitoring Coverage

### 3.1 Docker Log Rotation

All containers have log rotation configured:
- Max size: 10MB per file
- Max files: 3
- **Assessment:** Good. No risk of log-driven disk exhaustion.

### 3.2 Uptime Kuma

Status page at `status.fivucsas.com` returns HTTP 302 (redirect to dashboard). Monitoring is active.

### 3.3 Recommended Monitors

| Monitor | Priority |
|---------|----------|
| identity-core-api /actuator/health | HIGH -- likely already monitored |
| biometric-api /api/v1/health | HIGH -- likely already monitored |
| PostgreSQL connectivity (port 5432) | HIGH |
| Redis connectivity (port 6379) | HIGH |
| SSL certificate expiry | MEDIUM |
| Disk space > 80% | HIGH |
| Swap usage > 70% | HIGH |
| mizan-api /health | HIGH |
| Container restart alerts | MEDIUM |

---

## 4. Optimizations Applied

### 4.1 VACUUM ANALYZE (Done)
Ran `VACUUM ANALYZE` on all 5 databases:
- identity_core
- biometric_db
- muhabbet
- sarnic
- mizan

All tables now show 0 dead tuples.

### 4.2 Docker Disk Cleanup (Done)
- Pruned all build cache: **40.57 GB freed**
- Pruned unused images: **1.01 GB freed**
- **Total freed: ~41.6 GB**
- Disk went from 90% to 54% utilization

---

## 5. Action Items

### Immediate (This Week)

1. **Investigate mizan-api CPU/memory** -- 324% CPU and 83% memory is unsustainable
   - Semantic search taking ~6 seconds per query
   - Consider adding result caching, reducing candidate count, or indexing optimization
2. **Reduce biometric-api memory limit** from 3GB to 512MB (only using 35MB)
3. **Add disk space and swap monitoring** to Uptime Kuma

### Short-Term (Next 2 Weeks)

4. **Enable pg_stat_statements** for query performance tracking
   - Add `shared_preload_libraries=pg_stat_statements` to PostgreSQL config
   - Requires container restart
5. **Increase shared_buffers** from 128MB to 384MB
6. **Add PostgreSQL and Redis connectivity monitors** to Uptime Kuma
7. **Set up automated VACUUM schedule** (autovacuum is enabled by default but verify thresholds)

### Medium-Term

8. **Consider memory upgrade** -- 7.6GB with 85% swap usage suggests the server is at capacity
9. **Add SSL certificate expiry monitoring**
10. **Review refresh_tokens table** -- 135 tokens for 14 users may indicate stale tokens not being cleaned up
