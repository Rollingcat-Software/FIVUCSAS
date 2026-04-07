# FIVUCSAS Infrastructure Review -- Hetzner VPS

**Date:** 2026-03-18
**Server:** CX33 (8GB RAM), Ubuntu 24.04, Nuremberg
**IP:** 116.203.222.213

---

## 1. Current State

### 1.1 Container Health -- ALL HEALTHY

| Container | Status | Memory | Notes |
|-----------|--------|--------|-------|
| biometric-api | Up 3h (healthy) | 603MB / 3GB (20%) | Highest memory consumer |
| identity-core-api | Up 3h (healthy) | 346MB / 768MB (45%) | Near half limit |
| sarnic-frontend | Up 23h (healthy) | 3MB / 128MB | |
| sarnic-backend | Up 23h (healthy) | 217MB / 768MB | |
| muhabbet-backend | Up 2d (healthy) | 203MB / 768MB | |
| mizan-website | Up 2d | 40MB / 256MB | **No health check** |
| mizan-api | Up 2d (healthy) | 321MB / 2GB | |
| uptime-kuma | Up 2d (healthy) | 89MB / 256MB (35%) | |
| traefik | Up 2d | 26MB | **No health check** |
| shared-minio | Up 2d (healthy) | 99MB / 512MB | |
| shared-postgres | Up 2d (healthy) | 69MB / 1.5GB | 9% CPU spike during review |
| shared-redis | Up 2d (healthy) | 7MB / 300MB | |

**Total memory in use:** ~4.7GB of 7.6GB (62%)

### 1.2 Disk Usage -- WARNING

```
/dev/sda1  75G  52G  21G  72% /
```

- Docker images: 31GB (17GB reclaimable)
- Build cache: 27.6GB (mostly reclaimable)
- Local volumes: 2GB

**Severity:** MEDIUM -- 72% usage with 28GB in reclaimable Docker artifacts.
**Action:** Run `docker system prune -a --volumes` (remove unused images/cache) to reclaim ~20GB. Set up a weekly cron job: `docker system prune -f --filter "until=168h"`.

### 1.3 Memory -- TIGHT

```
Total: 7.6GB | Used: 4.7GB | Free: 1.1GB | Buff/cache: 2.2GB | Available: 2.9GB
Swap: 4.0GB | Used: 2.0GB
```

2GB swap in use indicates memory pressure. The `biometric-api` (3GB limit) is the primary consumer. If all containers hit their limits simultaneously, total reservation exceeds physical RAM.

**Severity:** MEDIUM
**Recommendation:** Reduce `biometric-api` memory limit from 3GB to 1.5GB (current usage: 603MB). Monitor swap usage.

---

## 2. Security

### 2.1 SSH Configuration -- GOOD

- Password authentication: **disabled** (`PasswordAuthentication no`)
- Root login: default `prohibit-password` (key-only)
- Default port 22 (consider changing, but low priority behind UFW)

### 2.2 Firewall (UFW) -- GOOD

```
Default: deny (incoming), allow (outgoing), deny (routed)
22/tcp   ALLOW IN  Anywhere
80/tcp   ALLOW IN  Anywhere
443/tcp  ALLOW IN  Anywhere
```

Minimal attack surface. Only SSH, HTTP, and HTTPS exposed. Database ports not exposed to internet.

### 2.3 Docker Network Isolation -- GOOD

Two custom networks:
- `backend` (172.20.1.0/24): Internal services (postgres, redis, minio, all app containers)
- `proxy` (172.20.0.0/24): Traefik reverse proxy + exposed services

Database services bind to `127.0.0.1` only:
- PostgreSQL: `127.0.0.1:5432`
- Redis: `127.0.0.1:6379`
- MinIO: `127.0.0.1:9000-9001`

This is correct -- databases are not accessible from the internet, only via Docker networks and localhost.

### 2.4 Secret Management -- ADEQUATE

- All `.env.prod` files exist and are gitignored (verified across all repos)
- Secrets passed via environment variables in `docker-compose.prod.yml`
- No secrets found hardcoded in Docker Compose files (uses `${VAR}` syntax)

**Gap:** No secret rotation policy. JWT_SECRET, database passwords, and encryption keys appear to be static since initial deployment.
**Recommendation:** Document a quarterly secret rotation procedure.

### 2.5 SSL/TLS Configuration -- GOOD

Response headers from `api.fivucsas.com`:
- `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload` -- HSTS with preload
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: SAMEORIGIN`
- `X-XSS-Protection: 1; mode=block`
- `Cache-Control: no-cache, no-store` -- appropriate for auth endpoints

All security headers present. HSTS preload directive enabled.

### 2.6 Database Access Controls -- ADEQUATE

- PostgreSQL uses single `postgres` superuser for all services (identity_core, biometric_db, mizan, muhabbet, sarnic)
- All access via Docker internal network or localhost binding

**Gap:** All services share the `postgres` superuser. A compromised service could access all databases.
**Severity:** LOW (all services are first-party, single-developer)
**Recommendation:** Create per-service database users with restricted permissions.

### 2.7 Biometric API Key -- DISABLED

`API_KEY_ENABLED=false` on the biometric-api container. The biometric processor accepts unauthenticated requests from any container on the Docker network.

**Severity:** LOW (internal network only, no external exposure)
**Recommendation:** Enable API key authentication between identity-core-api and biometric-api for defense-in-depth.

---

## 3. Reliability

### 3.1 Container Restart Policies -- PASS

All 12 containers use `restart: unless-stopped`. This ensures automatic recovery after crashes or server reboots.

### 3.2 Health Checks -- MOSTLY PASS

10 of 12 containers have health checks configured and report healthy. Two containers lack health checks:
- `mizan-website` (Next.js frontend)
- `traefik` (reverse proxy)

**Recommendation:** Add health checks for both:
- Traefik: `healthcheck: test: ["CMD", "traefik", "healthcheck"]`
- mizan-website: HTTP check on the container port

### 3.3 Backup Strategy -- GOOD with gap

Daily automated backups via cron (`/opt/projects/infra/backup.sh` at 03:00):
- Backs up: `identity_core`, `mizan`, `muhabbet`, `sarnic`
- Retention: 7 days (auto-prune)
- Storage: `/opt/projects/backups/` (local)
- Latest backup: 2026-03-18 at 03:00 (168MB total)

**CRITICAL GAP:** `biometric_db` is NOT included in backups. This database contains face embeddings, voice enrollments, and biometric data. Loss of this data would require all users to re-enroll.

**Severity:** HIGH
**Action:** Add `biometric_db` to the backup script immediately.

**Secondary gap:** Backups are stored on the same server. No off-site backup.
**Recommendation:** Add off-site backup to object storage (Hetzner Storage Box or S3-compatible).

### 3.4 Monitoring (Uptime Kuma) -- RUNNING

Uptime Kuma is running and healthy (89MB memory). Specific monitor configuration not inspected (web UI only), but the service is operational.

### 3.5 Log Rotation -- PROPERLY CONFIGURED

Docker daemon configured with:
```json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  },
  "live-restore": true
}
```

Each container limited to 30MB of logs (3 x 10MB). `live-restore: true` allows Docker daemon updates without container restarts. System-level logrotate configured for standard services (rsyslog, apt, ufw, fail2ban).

---

## 4. Performance Concerns

### 4.1 PostgreSQL CPU Spike

During the review, `shared-postgres` showed 9.3% CPU usage -- significantly higher than other containers. This could be:
- Background vacuum/analyze
- Active query load
- Index maintenance

**Recommendation:** Monitor `pg_stat_activity` during peak hours. Consider enabling `pg_stat_statements` for query analysis.

### 4.2 Docker Build Cache Bloat

27.6GB of build cache is excessive. Only 214MB is actively referenced.

**Action:** Run `docker builder prune -a` to reclaim ~27GB. This alone drops disk usage from 72% to ~36%.

### 4.3 Swap Usage

2GB of 4GB swap is in use, indicating the system has been under memory pressure. With `biometric-api` allowed up to 3GB (currently using 603MB), a spike could push other services into swap, causing latency.

---

## 5. Summary of Findings by Severity

### CRITICAL
1. **biometric_db not backed up** -- face/voice enrollment data at risk of permanent loss

### HIGH
2. **Disk at 72%** with 28GB reclaimable Docker artifacts

### MEDIUM
3. **Memory pressure** -- 2GB swap in use, biometric-api over-provisioned at 3GB limit
4. **No off-site backups** -- all backups on same server as data
5. **No secret rotation policy** -- static credentials since deployment

### LOW
6. **Missing health checks** on mizan-website and traefik
7. **Shared postgres superuser** across all services
8. **Biometric API key disabled** (internal only, but no defense-in-depth)
9. **Per-service database users** not implemented

### PASS
- SSH hardened (password auth disabled, key-only)
- UFW properly configured (22/80/443 only)
- Docker networks properly isolated
- Database ports bound to localhost only
- SSL/TLS with full security headers + HSTS preload
- Container restart policies on all services
- Docker log rotation configured
- Daily automated backups with 7-day retention
- Uptime Kuma monitoring running
- .env.prod files properly gitignored
