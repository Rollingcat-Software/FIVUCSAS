# Fact Pack — Infrastructure, Deployment, CI/CD, and Test Inventory

> Ground-truth facts extracted from the real repository, live `docker ps` on the
> production host, the `infra/`, `monitoring/`, `load-tests/` trees, the `*compose*.yml`
> files, and the GitHub Actions workflows. Where CLAUDE.md numbers conflicted with a
> direct grep / `docker ps`, the **verified** value is recorded and the discrepancy noted.
> All test counts below were obtained by grepping the source trees (canonical paths only;
> `.claude/worktrees/`, `target/`, `build/` and the throwaway `_wt-*` worktree excluded).

---

## 1. Production Deployment Topology

### 1.1 Compute — Hetzner CX43 (single VPS)
- **Provider/instance:** Hetzner Cloud CX43.
- **Specs (from CLAUDE.md, consistent with the load it carries):** 8 vCPU / 16 GB RAM /
  150 GB disk, **Ubuntu 24.04**.
- **Container runtime:** Docker 29.3.0, Docker Compose v5.1.0.
- **Access:** `deploy` user, key-based SSH only. All projects under `/opt/projects/`.
- The CX43 is **CPU-only (no GPU)** — this is an explicit design constraint driving the ML
  model choices (MTCNN + Facenet512 + UniFace MiniFASNet are all CPU-safe;
  `ALLOW_HEAVY_ML=false` blocks GPU-only backends such as RetinaFace / ArcFace / YOLOv8 at boot).

### 1.2 Edge / reverse proxy — Traefik v3 (NOT NGINX)
**Confirmed against the live host.** `docker ps` shows the edge container running
`traefik:v3.6.12` (`traefik` container, up 47h at capture time). This settles the
ADD-era ambiguity: the **Analysis & Design Document's "NGINX gateway" was a development-era
plan; production runs Traefik v3.** The only NGINX images on the host are (a) `error-pages`
(`nginx:alpine`, serves branded 401/403/404 pages for `api.fivucsas.com`) and (b) the
internal NGINX baked into the `verify-widget` container to serve the static SPA behind
Traefik. The parent-root `docker-compose.prod.yml` does contain a dev-era NGINX
`api-gateway` service block, but **that block is not deployed** — Traefik supersedes it.

Traefik configuration (`infra/traefik/config/`):
- **`traefik.yml` (static):** two entrypoints — `web` (:80, redirects all traffic to HTTPS)
  and `websecure` (:443, TLS via Let's Encrypt `certResolver`). Docker provider talks to a
  hardened **docker-socket-proxy** (`tecnativa/docker-socket-proxy`) at
  `http://docker-socket-proxy:2375`, `exposedByDefault: false`, on the `proxy` network.
  A file provider watches `dynamic.yml`. Global middlewares on `websecure`:
  `secure-headers@file` + `rate-limit@file`.
- **XFF hardening (2026-05-12):** `forwardedHeaders.trustedIPs: []` on both entrypoints, so
  Traefik overwrites `X-Forwarded-For` with the real peer IP — closing a per-IP
  rate-limit-bypass surface in the app's `RateLimitInterceptor`.
- **`dynamic.yml` (file provider):** apex/www/legacy-TLD redirects (`fivucsas.com.tr`,
  `.online`, `.info`, `rollingcatsoftware.com` → `fivucsas.com`); an **admin-surface router**
  (`fivucsas-api-admin`) that gates `/swagger-ui`, `/v3/api-docs`, `/actuator` behind an
  **IP allowlist** (`admin-whitelist`: 127.0.0.1, 10.8.0.0/24 VPN, plus campus/Marmara CIDRs
  193.140.73.0/24, 46.104.0.0/16); HSTS + `X-Content-Type-Options` + `X-Frame-Options: DENY`
  + a strict `Permissions-Policy` (camera/mic/WebAuthn scoped to `verify.fivucsas.com`); a
  separate `secure-headers-framable` variant (drops XFO so the embeddable widget can be
  iframed, framing controlled by CSP `frame-ancestors` in the widget's nginx); a `noindex`
  `X-Robots-Tag` header attached only to `api.` + admin surfaces; and the
  `rate-limit` middleware (`average: 1000`, `burst: 2000`).
- Per-service routing is via **Docker labels** (e.g. `identity-core-api` carries
  `traefik.http.routers.identity-api.rule=Host('api.fivucsas.com')` +
  `entrypoints=websecure` + `tls.certresolver=letsencrypt` +
  `middlewares=secure-headers@file,noindex@file,rate-limit@file`).

### 1.3 Static-site hosting — Hostinger (separate from the VPS)
React/static surfaces are **NOT dockerized** (a deliberate standing rule). They are deployed
to Hostinger shared hosting (`46.202.158.52`, SSH port 65002) via `rsync`/`scp`:
`app.fivucsas.com` (the React dashboard `dist/`), `fivucsas.com` (landing),
`demo.fivucsas.com` (BYS demo), `links.fivucsas.com` (static hub), `amispoof.fivucsas.com`
(the browser anti-spoof tester). The **Identity API, biometric processor, verify-widget and
docs site are dockerized on the VPS behind Traefik**; everything else is Hostinger static.

### 1.4 Production subdomains / URLs
| Service | URL | Hosting |
|---|---|---|
| Identity Core API | `https://api.fivucsas.com` | VPS / Traefik / Docker |
| Web dashboard | `https://app.fivucsas.com` | Hostinger static |
| Landing site | `https://fivucsas.com` | Hostinger static |
| Hosted login + Auth widget/SDK | `https://verify.fivucsas.com` | VPS / Traefik / Docker (nginx SPA) |
| BYS demo | `https://demo.fivucsas.com` | Hostinger static |
| Docs (VitePress) | `https://docs.fivucsas.com` | VPS / Traefik / Docker (`fivucsas-docs`) |
| amispoof tester | `https://amispoof.fivucsas.com` | Hostinger static |
| Links hub | `https://links.fivucsas.com` | Hostinger static |
| Uptime monitor | `https://status.fivucsas.com` | VPS (Uptime Kuma) |
| Swagger UI | `https://api.fivucsas.com/swagger-ui.html` | VPS, **admin-IP gated** |

`api.fivucsas.com/` deliberately returns **401** (it is an API origin, not a page); Swagger /
OpenAPI JSON / actuator return **403 to the public** (admin-IP only); OIDC discovery is public
(200). Biometric processor has **no public route** — it is reachable only on the internal
Docker `backend` network at `http://biometric-api:8001`, and every `/api/*` call requires an
`X-API-Key` header (the only caller is the Identity API).

### 1.5 Docker Compose production services, images, and resources
The deployment is split across per-service prod compose files (`identity-core-api/`,
`biometric-processor/`, `verify-widget/`, `docs-site/`) wired onto **shared external Docker
networks** (`backend`, `proxy`) plus **shared singletons**. Live `docker ps` ground truth:

| Container | Image | Role | Compose resource limits |
|---|---|---|---|
| `traefik` | `traefik:v3.6.12` | Edge TLS / routing | — |
| `shared-postgres` | `pgvector/pgvector:pg17` | **PostgreSQL 17 + pgvector** (shared by all projects) | — |
| `shared-redis` | `redis:7.4-alpine` | **Redis 7.4** cache/sessions/locks | — |
| `identity-core-api` | `identity-core-api-...` (Spring Boot 3.4.7 / Java 21) | Core IAM/OAuth2/MFA API, :8080 | `read_only` rootfs + `tmpfs /tmp,/var/log`, `cap_drop ALL`, `no-new-privileges`; **2.0 CPU / 2 GB**, pids 512 |
| `biometric-api` | `biometric-processor-...` (FastAPI / Python 3.12) | Face/voice/liveness/doc ML, :8001 internal-only | `read_only` + `cap_drop ALL` (re-adds CHOWN/SETUID/SETGID for the gosu uid-100 drop); **4.0 CPU / 4 GB**, reserve 0.5 CPU/2.5 GB, pids 256 |
| `fivucsas-verify-widget` | `verify-widget-...` (nginx SPA) | Hosted login + step-up widget | — |
| `fivucsas-docs` | `docs-site-docs` (VitePress) | docs.fivucsas.com | — |
| `identity-core-api-staging` | (staging build) | Pre-prod staging API (127.0.0.1:18080) | — |
| `error-pages` | `nginx:alpine` | Branded 401/403/404 for api. | — |
| `docker-socket-proxy` | `tecnativa/docker-socket-proxy` | Read-scoped Docker socket for Traefik | — |
| `uptime-kuma` | `louislam/uptime-kuma:1` | status.fivucsas.com uptime monitor | — |
| `grafana` | `grafana/grafana:11.3.0` | Dashboards | — |
| `loki` | `grafana/loki:3.2.0` | Log aggregation | — |
| `promtail` | `grafana/promtail:3.2.0` | Log shipping → Loki | — |

Notes on the compose model:
- **Hardened runtime** is uniform: every app container runs `read_only:true` rootfs,
  `security_opt: no-new-privileges`, `cap_drop: ALL`, with writable paths only via explicit
  `tmpfs` / named volumes (a recurring gotcha for ML cache dirs — UniFace, DeepFace, Numba
  caches needed `HOME=/tmp` + per-lib `*_CACHE_DIR` + chown'd named volumes).
- The **biometric image is digest-pinned** (`python:3.12-slim@sha256:…`) plus a frozen
  `requirements-known-good-2026-05-29.lock` constraints file, because a floating-dep rebuild
  segfaulted the UniFace MiniFASNet ONNX preload under the `read_only`+`cap_drop` runtime.
- The biometric container talks to two logical databases on the one Postgres instance
  (`identity_core` and `biometric_db`, the latter pgvector-enabled, 512-dim embeddings) and
  to Redis DB 4 (the API uses Redis DB 0).
- The parent-root `docker-compose.prod.yml` additionally describes a `replicas: 2` HA layout,
  a Prometheus+Grafana stack, and an NGINX `api-gateway` — these are **aspirational / dev-era
  blocks that are not the live deployment**. The live edge is single-instance Traefik; the
  live observability stack is **Grafana + Loki + Promtail (no Prometheus container is
  running)**. Treat the parent compose's "Expected Capacity: 1000+ users, ~120 enrollments/sec,
  p95 < 500 ms" header as a *target/estimate*, not a measured result.

### 1.6 Always-on operational rules (from CLAUDE.md)
- Production Docker Compose **must** be invoked with `--env-file .env.prod`.
- No hardcoded secrets — all credentials live in `.env.prod`; a blank var can *override* a
  YAML default (e.g. a blank `APP_SECURITY_JWT_AUDIENCE=` once crash-looped prod ~11 min).

---

## 2. CI/CD

### 2.1 GitHub Actions workflows (per repo)
| Repo | Workflows |
|---|---|
| identity-core-api | `ci.yml`, `deploy-hetzner.yml`, `gitleaks.yml` |
| web-app | `ci.yml`, `deploy-hostinger.yml`, `e2e.yml`, `gitleaks.yml`, `publish-sdk.yml` |
| biometric-processor | `ci.yml`, `deploy-hetzner.yml` |
| client-apps | `android-build.yml`, `ios-build.yml`, `desktop-installers.yml` |
| parent (FIVUCSAS) | `ci.yml`, `deploy-landing.yml` |

### 2.2 Runners — GitHub-hosted + a self-hosted Hetzner runner
- **Most jobs run on GitHub-hosted `ubuntu-latest`** (and `macos-latest` for the iOS build,
  `windows-latest` for the desktop Windows installer).
- A **self-hosted runner** labeled `[self-hosted, linux, x64]` (the Hetzner CX43 itself) is
  reserved for the **deploy** jobs only: `identity-core-api/deploy-hetzner.yml` and
  `biometric-processor/deploy-hetzner.yml`. Deploys SSH in, `git pull`, then run
  `infra/deploy.sh build|restart <svc>` and a retried `actuator/health` curl loop.
  Web-app deploys to Hostinger run on `ubuntu-latest` via the `burnett01/rsync-deployments`
  action over SSH.

### 2.3 identity-core-api CI (`ci.yml`)
Triggered on push/PR to `main` touching `src/**`, `pom.xml`, or the workflow. Two jobs:
1. **Maven test (unit)** on `ubuntu-latest` — JDK 21 (Temurin), `mvn -B -ntp -T 2C test`,
   uploads surefire reports on failure. Enforces a JaCoCo coverage gate.
2. **Integration tests (Testcontainers)** — `needs: test`, `RUN_INTEGRATION=true`, a real
   `redis:7-alpine` service, Postgres via Testcontainers (retagging `pgvector/pgvector:pg16`
   as `postgres:16-alpine` so Flyway V0's pgvector extension works). Runs
   `mvn -Dtest='*IntegrationTest,*IT' verify` and then **asserts** that five named isolation
   ITs actually executed (`CrossTenantIsolationIT`, `TenantSwitcherIsolationIT`,
   `IdentityBiometricConsentIT`, `IdentityBackfillIT`, `RoleUnificationBackfillIT`) by parsing
   the surefire XML — a guard against silently skipped security tests. `continue-on-error` was
   removed (2026-05-30, "P1-1") so a failing isolation IT now blocks the PR.
   **Honesty caveat (from CLAUDE.md):** the integration gate has a documented history of being
   un-greenable due to test-infra rot; a one-time admin-merge exception was used for four auth
   PRs, and the gate is being genuinely greened — it should not be treated as fully trustworthy
   until that work closes. This Hetzner box cannot itself run the Testcontainers ITs (no Docker
   socket in the sandboxed shell) — they are verified via CI.

### 2.4 biometric-processor CI (`ci.yml`)
Five jobs (all GREEN on `main fbe70b7`, **no `continue-on-error`, no `--ignore` flags**):
**Lint & Type Check** (Ruff lint + Ruff format check, mypy installed), **Unit Tests**
(`pytest tests/unit/ --cov=app`, coverage to Codecov), **Integration Tests** (`needs: test`,
real `redis:7-alpine` + `pgvector/pgvector:pg16` services), a **Security** job
(**Bandit** static scan `bandit -r app/ -ll` + **pip-audit** dependency vuln scan), and a
**Build Frontend** job. The heavy ML-lifespan integration tests are env-gated
(`RUN_FULL_STACK_INTEGRATION=true`, `RUN_PROCTORING_INTEGRATION=true`) so they SKIP on the
lightweight runner (where the drifted-dep ONNX preload would segfault) and run only inside
the pinned Docker ML stack. DeepFace is imported lazily so `app.main` imports without TensorFlow.

### 2.5 web-app CI (`ci.yml`, `e2e.yml`)
`ci.yml` on `ubuntu-latest`, Node 22.x: `npm ci` → ESLint → `tsc --noEmit` →
`npm test -- --run` (Vitest) → production Vite build (`SKIP_MODEL_FETCH=1` so CI doesn't pull
the 50 MB ONNX model from Hostinger) → a separate `code-quality` job. `e2e.yml` runs the
Playwright suite. SDK publishing has its own `publish-sdk.yml`.

### 2.6 Secret scanning & dependency hygiene
- **gitleaks** (`gitleaks dir . --redact`, v8.21.2) runs on every push/PR for both
  identity-core-api and web-app (full-history `fetch-depth: 0`). gitleaks is the authoritative
  secret gate.
- **Dependabot** is configured (weekly, grouped, limit 5).
- The deploy flow is `git pull` + `infra/deploy.sh` + health-check retry loop on the
  self-hosted runner; rollback is documented (`infra/RUNBOOK_ROLLBACK.md`, image rollback tags).

---

## 3. Redis Caching Strategy

Redis 7.4 (`shared-redis`, `redis:7.4-alpine`) is a multi-purpose backbone, not just a cache.
Production config (parent compose): `--maxmemory 2gb`, `--maxmemory-policy allkeys-lru`,
`--appendonly yes --appendfsync everysec` (AOF persistence). The Identity API uses Redis DB 0;
the biometric processor uses Redis DB 4.

In the Identity API it is reached through a **hexagonal `CachePort` → `RedisCacheAdapter`**
(Spring `RedisTemplate`), with **fail-safe graceful degradation** if Redis is unavailable
(`CacheUnavailableException`). 18 main-source classes use Redis directly. Documented and
grep-confirmed uses include:
- **User-lookup / permission caching** and a **JWT token blacklist** (`RedisCacheAdapter` Javadoc).
- **OTP** storage (`OtpService` — email/SMS one-time codes with TTL).
- **TOTP used-code replay prevention** (`TotpService`/`TotpAuthHandler` — a bounded ~120 s
  `SET key 1 EX NX` marker per `(userId, timeStep)`, capped per user; an in-memory fallback
  caps at 50k).
- **MFA / step-up challenges** (`StepUpChallengeService`), **QR cross-device login**
  (`QrSessionService`), **number-matching approve-login** (`ApproveLoginService`, modeled on
  the QR session service), **WebAuthn** challenge state, **OAuth2** flow state.
- **Distributed rate limiting** data (Bucket4j token buckets) and a **Redis event bus**
  (`RedisEventBus` / `RedisMessagingConfig`).
- **ShedLock** (V51/V52) uses Redis/DB for distributed scheduled-job locking (mutual exclusion
  across replicas).

The biometric processor caches face embeddings in Redis (`EMBEDDING_CACHE_ENABLED=true`,
TTL 300 s, max 500 entries) and uses in-memory rate limiting.

---

## 4. Monitoring, Observability, and Uptime

- **Uptime:** `status.fivucsas.com` is served by **Uptime Kuma** (`louislam/uptime-kuma:1`,
  containerized on the VPS) — external endpoint up/down probing + status page.
- **Logs:** the live observability stack is **Grafana 11.3.0 + Loki 3.2.0 + Promtail 3.2.0**
  (Promtail ships container logs → Loki → Grafana). Grafana is admin-IP gated (the
  `grafana.fivucsas.com` Traefik router is documented in `dynamic.yml` but created via the
  observability compose's docker labels).
- **Metrics dashboards as code:** `monitoring/grafana/dashboards/` contains four JSON
  dashboards — `overview.json`, `identity-core.json`, `biometric-processor.json`,
  `infrastructure.json`. `monitoring/` also ships `prometheus.yml`, `alert_rules.yml`, and
  `alertmanager.yml`, and a `docker-compose.monitoring.yml`. **Caveat:** there is **no
  Prometheus or Alertmanager container running** on the host at capture time — the
  Prometheus/Alertmanager configs and the parent compose's Prometheus block are
  defined-but-not-deployed; the running stack is Grafana+Loki+Promtail + Uptime Kuma. Spring
  Boot exposes `/actuator` (admin-IP gated) and the deploy health-check curls `/actuator/health`.
- **App health checks:** `identity-core-api` has a Docker `healthcheck` curling
  `/actuator/health` (30 s interval); the CI deploy job polls `https://api.fivucsas.com/actuator/health`.

### 4.1 Disk / DB / DR operational runbooks (`/opt/projects/infra/`)
A substantial runbook set governs operations: `RUNBOOK_DISK.md` (5 defense layers — capped
docker logs, journald cap, hourly disk-guard, daily sweep, weekly aggressive prune; check
before heavy rebuilds), `RUNBOOK_DR.md`, `RUNBOOK_PITR.md` (point-in-time recovery),
`RUNBOOK_ROLLBACK.md`, `RUNBOOK_FLYWAY_REPAIR.md`, `RUNBOOK_SECRET_ROTATION.md`,
`RUNBOOK_RUNNER_REPAIR.md`, `RUNBOOK_NETWORK.md`, `RUNBOOK_OFFSITE_RETENTION.md` (GPG-encrypted
off-site backups), `RUNBOOK_PG_PARTMAN_OPTION_A.md` + `RUNBOOK_AUDIT_LOG_PARTMAN.md`
(`audit_logs` partitioning via pg_partman — V57 is fail-soft when the extension is absent).
`infra/RUNBOOK_UNUSED_INDEX_AUDIT.md` (+ SQL scripts) drives periodic index hygiene.

---

## 5. REAL Test Inventory (grep-verified, NOT from CLAUDE.md labels)

> **Method-vs-file note.** Numbers below are **test-method counts** (annotation / `def` / `it()`
> occurrences) unless stated otherwise; file counts are given alongside. These are *authored*
> test counts, not *executed-and-passing* counts (some are env-gated or marked skip/xfail at
> runtime). CLAUDE.md's "~1,800+ total" table is an undercount of the authored methods.

### 5.1 Identity Core API — Java / JUnit 5
- **1,569 `@Test` methods** across **176 test files**, all under `src/test/java` (0 in main).
- Plus **22 `@ParameterizedTest`** (each expands to multiple executed cases at runtime, so the
  *executed* case count is higher than 1,569). 0 `@RepeatedTest`.
- Mix of pure unit tests, Spring-context `*IntegrationTest`, **Testcontainers `*IT`**
  (Postgres+pgvector, Redis), and **ArchUnit** boundary tests freezing the hexagonal /
  no-direct-`entity.User`-import / WebAuthn-write-boundary rules.
- (CLAUDE.md's "Java = 633" figure is **stale/low** vs. the verified 1,569.)

### 5.2 Web dashboard — Vitest (unit/component)
- **1,025 `it()`/`test()` cases** across **105 test files** under `web-app/src`
  (`.test.ts(x)` / `.spec.ts(x)`), excluding worktrees.
- Vitest + React Testing Library; runs in CI on Node 22.
- (CLAUDE.md's "619" is low vs. the verified 1,025.)

### 5.3 Web dashboard — Playwright (E2E)
- **28 spec files** in `web-app/e2e/` containing **336 `test(...)` cases** total.
- Covers login (incl. extended/MFA), forgot/reset password, users/tenants/roles CRUD,
  enrollment + user-enrollment, NFC enrollment, face/voice search, verification flows +
  session + dashboard, auth-flow builder, multi-step auth, devices/sessions, audit logs,
  analytics, settings, navigation, card detection, and a visual-audit + smoke suite.
- (CLAUDE.md says "27 specs"; the verified canonical count is 28 spec files.)

### 5.4 Mobile/desktop clients — Kotlin Multiplatform / JUnit
- **568 `@Test` methods** across **64 test files** (canonical source trees only; the
  `.claude/worktrees` copy inflates a naive grep to ~1,085 — that duplication is excluded).
- Split by source set: **commonTest 486**, **androidTest 34**, **desktopTest 25**.
- (CLAUDE.md's "425" is low vs. the verified 568.)

### 5.5 Biometric processor — pytest
- **888 `def test_` functions** across **68 test files** under `biometric-processor/tests/`.
- By directory: **unit 683**, **integration 167**, **e2e 22**, **benchmarks 10**, **manual 6**
  (the `security/` and `load/` dirs hold no `test_` functions on the canonical branch).
- Bare-host CI baseline reported in CLAUDE.md: `tests/unit/` = 647 passed / 1 skipped /
  1 xfailed; `tests/integration/` (no flag) = 50 passed / 111 skipped (the skipped ones are
  the ML-lifespan / full-stack tests gated behind `RUN_FULL_STACK_INTEGRATION=true`, run only
  inside the Docker ML stack). So the **authored** count (888) exceeds the **CI-executed**
  count by design.

### 5.6 Aggregate (authored test methods/cases, verified)
| Module | Tool | Files | Test cases (authored) |
|---|---|---|---|
| Identity Core API | JUnit 5 | 176 | 1,569 (+22 parameterized) |
| Web dashboard (unit) | Vitest | 105 | 1,025 |
| Web dashboard (E2E) | Playwright | 28 | 336 |
| Mobile/desktop clients | Kotlin/JUnit | 64 | 568 |
| Biometric processor | pytest | 68 | 888 |
| **Total** | | **441** | **≈ 4,386 authored** |

This is materially higher than CLAUDE.md's "~1,800+" summary table, which counts only a
subset and predates later test growth. The honest framing for the thesis: **~4,400 authored
automated test cases across five test technologies**, of which a large subset runs on every CI
pipeline (the heaviest ML- and Testcontainers-dependent integration tests run inside the
Docker ML/IT stacks rather than on the lightweight CI runners).

---

## 6. Load Testing and Performance Testing

- **Primary tool: Grafana k6.** `load-tests/` (canonical) is a k6 suite — `config.js` (global
  thresholds), `utils/auth.js` + `utils/biometric.js`, and **6 scenarios** in `scenarios/`:
  `auth-load-test.js`, `enrollment-load-test.js`, `verification-load-test.js`,
  `multi-tenant-load-test.js`, `stress-test.js`, `spike-test.js`. Plus helper scripts
  `demo-baseline-results.sh`, `validate-tests.sh`, and `BASELINE_TESTING_GUIDE.md`.
- **Documented k6 thresholds / targets (these are TARGETS, not measured prod results):**
  login p95 < 300 ms; token refresh p95 < 200 ms; enrollment p95 < 2000 ms (ML-bound);
  verification p95 < 500 ms (p99 < 1000 ms); failure rate < 1%; multi-tenant test asserts
  **0 tenant-isolation violations**. Load patterns ramp to 200 VUs (auth/verify), 500 VUs
  (verification), up to 1,500 VUs (stress), and 20×-baseline spikes (spike test).
- **Locust:** a `locustfile.py` exists **only in a biometric-processor `.claude/worktrees/`
  scratch copy** and `locust` is in `requirements-original.txt` — i.e. Locust was an early
  alternative, but the **canonical, maintained load-testing path is k6**. Cite k6 as the
  load-test tool; mention Locust only as an early experiment if needed.
- The parent compose header's capacity numbers (1000+ concurrent users, ~120 enrollments/sec,
  p95 < 500 ms) are **design estimates**, not benchmarked figures — do not report them as
  measured.

---

## 7. Security Testing

- **Static application security testing (Python):** **Bandit** (`bandit -r app/ -ll`) runs in
  the biometric-processor CI security job; **pip-audit** scans Python deps for known CVEs
  (report-only, `|| true`).
- **Secret scanning:** **gitleaks** v8.21.2 on every push/PR (identity-core-api + web-app),
  full-history scan; the authoritative secrets gate.
- **Dependency hygiene:** **Dependabot** (weekly, grouped). web-app CI additionally fails the
  build on TypeScript/lint errors and runs a `code-quality` job.
- **Security-invariant tests as CI gates:** the cross-tenant isolation Testcontainers ITs
  (`CrossTenantIsolationIT`, `TenantSwitcherIsolationIT`, etc.) are required, executed, and
  *asserted to have executed* in the identity-core-api CI — multi-tenant data isolation is a
  tested-every-PR security guarantee (defense-in-depth Hibernate `@Filter(tenantFilter)` on 8+
  tenant-scoped entities).
- **OWASP:** OWASP Top 10 and the OWASP API Security Top 10 are used as the **reference
  framework** for the threat model (`docs/02-architecture/security.md`); that document also
  lists "Dependency scanning (Snyk, Dependabot)", "Container scanning (Trivy, Clair)" and
  "Penetration testing (annually)" as the security posture. **Honesty caveat for the thesis:**
  there is **no automated OWASP ZAP / Snyk / Trivy job wired into the GitHub Actions
  pipelines** that I could find — the *implemented* automated security testing is Bandit +
  pip-audit + gitleaks + Dependabot + the isolation ITs; ZAP/Snyk/Trivy/annual pen-test are
  documented aspirations / manual practices, not CI-enforced. Label them accordingly.

---

## 8. Key honesty flags for the chapter authors
1. **Edge = Traefik v3.6.12** (live-verified), not NGINX. The ADD's NGINX gateway was the
   dev plan; the parent compose's NGINX `api-gateway` is undeployed.
2. **PostgreSQL 17 + pgvector, Redis 7.4** (live image tags `pgvector/pgvector:pg17`,
   `redis:7.4-alpine`) — both are single shared instances on the VPS.
3. **Observability that is actually running** = Grafana + Loki + Promtail + Uptime Kuma.
   Prometheus/Alertmanager are configured but **not deployed**.
4. **Replicas/HA** in the parent compose (`replicas: 2`, read replicas) are **not the live
   single-VPS deployment** — describe them as a scaling plan / future work.
5. **Test counts**: report the grep-verified ~4,386 authored cases (1,569 Java + 1,025 Vitest +
   336 Playwright + 568 Kotlin + 888 pytest), distinguishing authored vs. CI-executed, not the
   stale "~1,800+" CLAUDE.md table.
6. **Load tool = k6** (6 scenarios); **security testing = Bandit + pip-audit + gitleaks +
   Dependabot + isolation ITs**; OWASP ZAP / Snyk / Trivy / annual pen-test are documented
   intent, not CI-implemented.
7. Performance numbers in the k6 README and the compose header are **targets/estimates**, not
   measured production benchmarks — label as such.
