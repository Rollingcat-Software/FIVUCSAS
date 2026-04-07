# FIVUCSAS Production & Open-Source Readiness Audit Report

**Date**: 2026-03-30
**Audited by**: Automated deep audit (5 parallel agents)
**Scope**: All 6 submodules + infrastructure + documentation

---

## Executive Summary

| Component | Production Score | Open-Source Score | Findings |
|-----------|-----------------|-------------------|----------|
| identity-core-api | 70/100 | 65/100 | 35 |
| biometric-processor | 75/100 | 75/100 | 25 |
| web-app | 80/100 | 70/100 | 19 |
| client-apps | 60/100 | 55/100 | 17 |
| Infrastructure | 55/100 | 45/100 | 33 |
| **Overall** | **68/100** | **62/100** | **133** |

---

## Phase 1: CRITICAL Issues (10 findings)

### C-1: Production secrets committed to git
- **Status**: [ ] FIXED
- **Files**: `identity-core-api/.env.prod`, `biometric-processor/.env.prod`
- **Issue**: Real POSTGRES_PASSWORD, REDIS_PASSWORD, JWT_SECRET, MAIL_PASSWORD in plaintext
- **Fix**: Add to .gitignore, create .env.example templates, rotate credentials

### C-2: Admin credentials in CLAUDE.md
- **Status**: [ ] FIXED
- **Files**: `CLAUDE.md:205-212`, `docs/03-development/CLAUDE.md`
- **Issue**: `admin@fivucsas.local / Test@123` exposed
- **Fix**: Remove credentials, reference .env.example instead

### C-3: Server IPs & SSH paths in tracked docs
- **Status**: [ ] FIXED
- **Files**: `CLAUDE.md`, `scripts/deploy/*.ps1`
- **Issue**: Hetzner `116.203.222.213`, Hostinger `46.202.158.52:65002`, SSH key paths
- **Fix**: Replace with `<YOUR_SERVER_IP>` placeholders

### C-4: Production URLs hardcoded in source
- **Status**: [ ] FIXED
- **Files**: `client-apps/.../ApiConfig.kt:26-35`, `landing-website/src/App.tsx:80`
- **Issue**: Dev/staging/prod all point to same fivucsas.com URLs
- **Fix**: Use environment-based configuration with example.com defaults

### C-5: Hardcoded JWT secret in dev config
- **Status**: [ ] FIXED
- **File**: `identity-core-api/src/main/resources/application-dev.yml:49`
- **Issue**: Base64-encoded weak secret in version control
- **Fix**: Reference ${JWT_SECRET} env var, provide .env.example

### C-6: JWT secret in dev docker-compose
- **Status**: [ ] FIXED
- **File**: `docker-compose.yml:85`
- **Issue**: Base64 "fivucsas-dev-secret-key-for-local-docker-development"
- **Fix**: Reference ${JWT_SECRET} from .env file

### C-7: Alertmanager has placeholder passwords
- **Status**: [ ] FIXED
- **File**: `monitoring/alertmanager.yml:8,61,76`
- **Issue**: `smtp_auth_password: 'password'`, Slack/PagerDuty placeholders
- **Fix**: Template with env vars, rename to .example

### C-8: CORS allows all headers in production
- **Status**: [ ] FIXED
- **Files**: `application-docker.yml:26`, `docker-compose.prod.yml:27`
- **Issue**: `CORS_ALLOWED_HEADERS: "*"`
- **Fix**: Explicit header list

### C-9: No LICENSE file
- **Status**: [ ] FIXED
- **File**: Missing `/opt/projects/fivucsas/LICENSE`
- **Fix**: Create MIT LICENSE file

### C-10: API key auth + HTTPS disabled in production
- **Status**: [ ] FIXED
- **File**: `biometric-processor/docker-compose.prod.yml:44-45`
- **Issue**: `API_KEY_ENABLED: "false"`, `REQUIRE_HTTPS: "false"`
- **Fix**: Enable both

---

## Phase 2: HIGH Issues (18 findings)

### H-1: JWT algorithm enforcement missing
- **Status**: [ ] FIXED
- **File**: `JwtService.java:95-99`
- **Fix**: Add `.requireAlgorithm("HS256")`

### H-2: JWT secret fallback to config instead of fail-fast
- **Status**: [ ] FIXED
- **File**: `JwtSecretProvider.java:52-55`
- **Fix**: Fail-fast in production profile

### H-3: Empty JWT_SECRET warns instead of throws in biometric-processor
- **Status**: [ ] FIXED
- **File**: `biometric-processor/app/core/config.py:380-383`
- **Fix**: Raise ValueError in production

### H-4: No pagination validation (DoS via size=999999)
- **Status**: [ ] FIXED
- **File**: `UserController.java:85-87`
- **Fix**: Add @Min(1) @Max(100)

### H-5: CSRF protection disabled globally
- **Status**: [ ] FIXED
- **File**: `SecurityConfig.java:67`
- **Note**: Acceptable for stateless JWT API, document rationale

### H-6: Swagger exposed in docker profile
- **Status**: [ ] FIXED
- **File**: `SecurityConfig.java:118-119`
- **Fix**: Treat docker as production-equivalent

### H-7: Rate limiting falls open when Redis is down
- **Status**: [ ] FIXED
- **File**: `RateLimitFilter.java:93-107`
- **Fix**: Fail-closed for all paths

### H-8: Biometric Dockerfile runs as root
- **Status**: [ ] FIXED
- **File**: `biometric-processor/Dockerfile`
- **Fix**: Add non-root USER

### H-9: Missing .dockerignore files
- **Status**: [ ] FIXED
- **Files**: Both services
- **Fix**: Create .dockerignore excluding .env*, .git/, tests/

### H-10: Nginx has no rate limiting
- **Status**: [ ] FIXED
- **File**: `nginx/nginx.conf`
- **Fix**: Add limit_req_zone for auth endpoints

### H-11: Dev docker-compose hardcoded passwords
- **Status**: [ ] FIXED
- **File**: `docker-compose.yml:19,42,50,77,82,138,148`
- **Fix**: Use ${VARIABLE} references from .env

### H-12: Token stored in sessionStorage (XSS risk)
- **Status**: [ ] NOTED
- **File**: `TokenService.ts:16,30-32`
- **Note**: Document that backend must use httpOnly cookies

### H-13: Client-side API key in env var
- **Status**: [ ] NOTED
- **File**: `BiometricService.ts:54-64`
- **Note**: Document in SECURITY.md, future: route through backend proxy

### H-14: Monitoring ports exposed to 0.0.0.0
- **Status**: [ ] FIXED
- **File**: `monitoring/docker-compose.monitoring.yml`
- **Fix**: Bind to 127.0.0.1

### H-15: Grafana default admin password
- **Status**: [ ] FIXED
- **File**: `monitoring/docker-compose.monitoring.yml:50`
- **Fix**: Fail if GRAFANA_ADMIN_PASSWORD not set

### H-16: Email addresses logged in plaintext
- **Status**: [ ] FIXED
- **File**: `EmailServicePortAdapter.java:32`
- **Fix**: Log only domain

### H-17: run-tests.sh uses Gradle instead of Maven
- **Status**: [ ] FIXED
- **File**: `scripts/run-tests.sh:59`
- **Fix**: Change to mvn

### H-18: CI || true suppresses failures
- **Status**: [ ] FIXED
- **Files**: `.github/workflows/ci.yml:31-34`, `biometric-processor/.github/workflows/ci.yml:88,186`
- **Fix**: Remove || true from test and security audit steps

---

## Phase 3: MEDIUM Issues (selected, 30+ findings)

### M-1: Watchlist/Address proof handlers are MOCK
- **Status**: [ ] DOCUMENTED
- **Note**: Document as "not production-ready" in verification pipeline docs

### M-2: Inference timeout configured but not implemented
- **Status**: [ ] FIXED
- **File**: `biometric-processor/app/core/config.py:92`

### M-3: Model cold start ~10s with no preloading
- **Status**: [ ] FIXED

### M-4: Flyway validate-on-migrate: false in production
- **Status**: [ ] FIXED
- **File**: `application-prod.yml:33`

### M-5: Missing pytest.ini
- **Status**: [ ] FIXED

### M-6: docker-compose version deprecated
- **Status**: [ ] FIXED
- **Files**: All docker-compose files

### M-7: Redis healthcheck exposes password
- **Status**: [ ] FIXED
- **File**: `docker-compose.yml:50`

### M-8: Dockerfile port mismatch
- **Status**: [ ] FIXED
- **File**: `biometric-processor/Dockerfile:10`

### M-9: Missing .env.example files
- **Status**: [ ] FIXED

### M-10: ESLint max-warnings at limit
- **Status**: [ ] NOTED

### M-11: Large components (800+ lines)
- **Status**: [ ] NOTED
- **Note**: Track in GitHub Issues for future refactoring

### M-12: i18n incomplete
- **Status**: [ ] NOTED

### M-13: Structured JSON logging not enabled
- **Status**: [ ] NOTED

### M-14: Python version inconsistency (3.11 vs 3.13)
- **Status**: [ ] FIXED

### M-15: Maven dependency pre-fetch in Dockerfile
- **Status**: [ ] FIXED

---

## Completion Tracking

| Phase | Total | Fixed | Noted | Remaining |
|-------|-------|-------|-------|-----------|
| Phase 1 (CRITICAL) | 10 | 0 | 0 | 10 |
| Phase 2 (HIGH) | 18 | 0 | 0 | 18 |
| Phase 3 (MEDIUM) | 15 | 0 | 0 | 15 |
| **Total** | **43** | **0** | **0** | **43** |

---

*Report will be updated as fixes are applied.*
