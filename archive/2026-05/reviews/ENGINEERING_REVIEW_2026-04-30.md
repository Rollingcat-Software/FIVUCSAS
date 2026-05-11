# FIVUCSAS Engineering Review — 2026-04-30

Author: Chief Engineer (review pass).
Scope: parent meta-repo `/opt/projects/fivucsas` and the seven submodules:
`identity-core-api` (Java/Spring Boot), `biometric-processor` (Python/FastAPI),
`web-app` (React/TS), `client-apps` (KMP), `landing-website`, `verify-widget`,
`practice-and-test`. Read-only; no source files modified.

The Product Owner agent is reviewing UX/roadmap/business in parallel. This
document covers HOW the system is built — architecture, debt, reliability,
scalability, and the engineering practices around the codebase.

---

## Executive Summary

- **Maturity: late-MVP / early-production.** The platform is deployed,
  Flyway-migrated through `V50` (`identity-core-api/src/main/resources/db/migration/V50__refresh_tokens_family_id.sql:1`),
  has a working DR drill (`AUDIT_2026-04-29_OPS_FOLLOWUP.md:33`), and ships
  a coherent OAuth2/OIDC + N-step MFA stack. But it runs on a **single
  Hetzner CX43 host with no read-replica, no PgBouncer, no PITR**, and the
  observability stack is not yet fully wired into alert routing in-repo
  (see §6).
- **Top 3 architectural strengths**: (1) clean hexagonal split in
  `identity-core-api` between `domain/`, `application/service/`, and
  `infrastructure/` adapters with 130 `@PreAuthorize` annotations across
  controllers; (2) defence-in-depth on biometric-processor — request-size
  guard registered ahead of API-key middleware, content-type sanitization,
  hardened container (read_only, cap_drop) per `biometric-processor/CLAUDE.md`;
  (3) disciplined Flyway migrations — every recent migration has a
  prose-quality block comment explaining intent, idempotency, and rollback
  considerations (e.g. `V40__partition_audit_logs.sql:1-35`,
  `V49__tenants_deleted_at.sql:1-20`).
- **Top 3 engineering risks**:
  - **Critical** — single-host single-region. CX43 dies → entire platform
    dies. RTO depends on a manual Hetzner snapshot restore; RPO 24 h
    because no PITR/WAL archiving (`AUDIT_2026-04-29_OPS_FOLLOWUP.md:39`).
  - **High** — biometric pipeline is ML-heavy in the request path.
    Facenet512 + UniFace MiniFASNet + DeepFace anti-spoof, all on CPU,
    inside the verify hot path. No queue, no async fallback. Latency
    target is `<500ms p95` (`docker-compose.prod.yml:188`) but the load
    test never validated this with liveness on.
  - **High** — fingerprint modality is a SHA-256 placeholder
    (`biometric-processor/app/infrastructure/ml/fingerprint/hash_embedder.py:1-30`)
    that can be falsely advertised as "biometric authentication" via the
    UI. This is a security-correctness risk if a customer relies on it.
- **Quality signal**: 92 Java test files for 468 source files (~20 % file
  ratio; LoC ratio is harder to estimate without coverage runs). 58
  `*.test.tsx?` files in web-app for 410 source files. 68 Python test files
  for 434 sources. Coverage is not gated in CI.
- **Repo hygiene**: gitleaks runs on push for both api and web-app
  (`identity-core-api/.github/workflows/gitleaks.yml`,
  `web-app/.github/workflows/gitleaks.yml`). One historical leak
  (`web-app/.env.production` in commit `6bdedd2`,
  `AUDIT_2026-04-28_SECURITY.md:5`) was already rotated 2026-04-30 per
  memory; history rewrite is still cosmetic-only.

---

## System Architecture Overview

```
                           Internet
                              |
                       Traefik (Hetzner)
                  ┌────────────┴───────────┐
                  ▼                        ▼
           api.fivucsas.com         (Hostinger static)
        identity-core-api         app/verify/demo/landing
         Spring Boot 3.4.7              React + Vite
              :8080
                │                        │
                │   X-API-Key (internal) │  Bearer JWT (RS256)
                ▼                        ▼
       ┌────────────────┐         ┌─────────────────┐
       │ biometric-proc │◄────────┤ identity-core   │
       │ FastAPI :8001  │  proxy  │  /api/v1/*      │
       │ DeepFace+      │         └────────┬────────┘
       │ UniFace+MTCNN  │                  │
       └───────┬────────┘                  │
               │                           │
               ▼                           ▼
        ┌──────────────────────────────────────┐
        │   shared-postgres pgvector pg16       │
        │   identity_core_db + biometric_db     │
        └──────────────────┬───────────────────┘
                           │
                  ┌────────┴───────┐
                  ▼                ▼
              shared-redis      Daily backups
              (cache+AMR)       GPG → offsite
```

Source-of-truth files:
- Compose: `docker-compose.yml:1`, `docker-compose.prod.yml:1`,
  `docker-compose.dev.yml`.
- Reverse proxy: `nginx/nginx.conf` for the dev gateway;
  `docs/nginx/conf.d/` and a Traefik label set on the prod compose
  (referenced from `AUDIT_2026-04-28_OPS.md:8`). The Traefik instance
  itself lives at `/opt/projects/infra/` on the host, not in this repo
  — verified by absence of `infra/traefik/` here despite its mention in
  prior memory.
- Service entry points: `biometric-processor/app/main.py:1`,
  `identity-core-api/src/main/java/com/fivucsas/identity/IdentityCoreApiApplication.java`.

**Sync vs async**:
- Almost everything is sync. `BiometricProcessorClient` (Java) calls FastAPI
  with blocking RestTemplate/WebClient inside the request thread.
- Biometric-processor uses `BackgroundTasks` to fire-and-forget
  `client_embedding_observation` writes (`biometric-processor/app/api/routes/enrollment.py:39-55`)
  — log-only, never read for auth (per D2 invariant in
  `biometric-processor/CLAUDE.md`).
- Redis event bus is enabled (`application.yml:34-36`,
  `REDIS_EVENT_BUS_ENABLED=true`), but the only active subscribers are
  cache invalidation and JWT blacklist propagation. There is no real
  async work queue — no Celery, no Spring `@Async` task pool with
  durability.

**Third-party integrations**:
- Twilio Verify (SMS) — `application.yml:50-55`. Custom alpha sender ID
  blocked by Turkish BTK/IYS (memory note).
- Hostinger SMTP — `smtp.hostinger.com:587`,
  `info@app.fivucsas.com` (`identity-core-api/CLAUDE.md`).
- Cloudflare/Hostinger DNS — DNSSEC and CAA records still missing
  (`AUDIT_2026-04-28_SECURITY.md:50`).

---

## Code Quality & Technical Debt

### identity-core-api (Java 21, Spring Boot 3.4.7, ~38.6 KLOC)
- 23 controllers (`controller/*.java`), 58 services (`*Service.java`),
  65 entity/model classes. 130 `@PreAuthorize` usages — broad authz coverage,
  but uneven (`AuthController.java`, `OAuth2Controller.java`,
  `StatisticsController.java`, `OpenIDConfigController.java`,
  `StepUpController.java` have **zero** `@PreAuthorize` — verified via grep).
  Some are intentionally public (login/register), but `StepUpController`
  and `StatisticsController` look like authz gaps worth manual review.
- Big-file debt: `application/service/ManageVerificationService.java:1`
  is 439 LoC; `AuthenticateUserService.java` 390 LoC; `OAuth2Service.java`
  369 LoC. Past 350 LoC, the SRP violations creep in — these are prime
  refactor candidates.
- Test ratio: 92 test files for 468 source files. CI splits unit-tests
  on `ubuntu-latest` and Testcontainers integration on a self-hosted
  runner (`identity-core-api/.github/workflows/ci.yml:46-83`). No coverage
  gate.
- Idiom adherence: Lombok `@RequiredArgsConstructor` consistently
  used; `OncePerRequestFilter` for the JWT filter — idiomatic. Uses
  JJWT 0.12.6, modern API. `BCryptPasswordEncoder(12)` factor-12 is
  appropriate (`config/SecurityConfig.java:222`).
- TODO/FIXME count: only 8 in the whole tree — low ambient debt by line
  marker, but that's because debt is tracked in `TODO_POST_AUDIT_*.md`
  files rather than inline.

### web-app (React 18 + TS, ~80 KLOC)
- Feature-folder split (`features/auth`, `features/users`, …) is followed.
- `EnrollmentPage.tsx` 1340 LoC and `LoginPage.tsx` 996 LoC
  (`web-app/src/features/auth/components/EnrollmentPage.tsx:1`,
  `LoginPage.tsx:1`) are far past where a React component should live.
  These need decomposition into per-method enrollment subcomponents
  (FaceEnrollmentFlow already exists but the parent still owns too much
  state).
- Lint gate is `--max-warnings 90` (`web-app/package.json:13`). Ninety
  ESLint warnings is a **soft gate** — it normalises gradual erosion.
  Should be tightened to `--max-warnings 0` and existing ones triaged.
- Type safety: `tsc --noEmit` runs in CI (`web-app/.github/workflows/ci.yml:46-49`).
- Pre-build step `fetch-models` (`package.json:9-11`) downloads ONNX/TF
  weights at build time. CI flag `SKIP_MODEL_FETCH=1` exists but the
  default flow assumes network-reachable artifacts — a fragility for
  air-gapped builds.

### biometric-processor (Python 3.12, FastAPI, ~62 KLOC)
- Clean Architecture layered correctly: `domain/`, `application/use_cases/`,
  `infrastructure/ml/`, `api/routes/`. 17 route modules, all wired in
  `app/main.py:33-41`.
- `enrollment.py` 466 LoC, `verification.py` 198 LoC — manageable.
- 68 test files for 434 sources. `pytest` with `--cov` available
  (`biometric-processor/CLAUDE.md`), but coverage is not enforced in CI.
- Dockerfile builds in 5 explicit `pip install` layers
  (`biometric-processor/Dockerfile:32-50`) to work around DeepFace's
  hard `opencv-python` dependency vs. `opencv-python-headless`. This
  Rube-Goldberg dance works but is fragile; pin `librosa==0.9.2` is a
  Python-3.12-numba workaround.

### Concrete debt items (with `path:line`)

1. `identity-core-api/src/main/java/com/fivucsas/identity/application/service/ManageVerificationService.java:1` — 439 LoC service; split by responsibility (verification orchestration vs. result aggregation).
2. `identity-core-api/src/main/java/com/fivucsas/identity/security/JwtService.java:51` — `default-algo:HS512` baked as fallback; even though `application-prod.yml:73` overrides to RS256, the dev default biases HS512. Flip default to RS256 once dev-key generation is unconditional.
3. `identity-core-api/src/main/java/com/fivucsas/identity/controller/StepUpController.java` — zero `@PreAuthorize` on the file (grep, line 0). Audit whether method-level or filter-chain authz is sufficient.
4. `web-app/src/features/auth/components/EnrollmentPage.tsx:1` — 1340-LoC component owning all 10 enrollment-method dialogs; decompose.
5. `web-app/package.json:13` — `--max-warnings 90` soft lint gate; tighten over the next sprint.
6. `web-app/package.json:9-11` — `prebuild: fetch-models` couples build to network availability of model artifacts; add a checksum manifest + cached-fallback path.
7. ~~`biometric-processor/app/infrastructure/ml/fingerprint/hash_embedder.py:1-30` — SHA-256 "embedding" advertised as biometric. Either gate the modality behind a feature flag tied to real hardware, or rename to "fingerprint-shaped credential" in UI.~~ **DONE 2026-04-30 (P1.4)**: placeholder embedder, repository, route, and identity-core-api proxy endpoints/port methods deleted. AuthMethodType.FINGERPRINT now exclusively means WebAuthn platform authenticator. PRs: `biometric-processor#58`, `identity-core-api#39`.
8. `biometric-processor/Dockerfile:32-50` — 5-layer pip dance; consolidate behind a constraints file once `deepface 0.0.99+` drops the hard opencv-python dep.
9. `docker-compose.yml:114` — base compose hard-codes `JWT_SECRET` (a base64-encoded literal) for dev; even though it's dev-only, it's checked into the repo and indistinguishable in casual inspection from a leaked prod secret. Move to `.env.dev` with a clear placeholder.
10. `identity-core-api/src/main/resources/application.yml:77` — `JWT_DEFAULT_ALGO:HS512` default in base config; documented but easy to misconfigure when adding a new profile.
11. `identity-core-api/CLAUDE.md` references migrations "V1-V38" but the actual on-disk count is **50** through `V50__refresh_tokens_family_id.sql`. Internal docs lag the code.
12. `web-app/src/features/auth/components/LoginPage.tsx:849-876` — DEV-only credential block gated by `import.meta.env.DEV`; cleared by `AUDIT_2026-04-28_BASIC.md:6`, but a sibling block could regress. Add an ESLint custom rule preventing string-literal credentials anywhere outside `*.test.*`.

---

## Data Architecture

### Postgres schema (`identity_core_db`)
- **50 Flyway migrations** through V50 (counted in
  `identity-core-api/src/main/resources/db/migration/`). The project doc
  (`identity-core-api/CLAUDE.md`) advertises only V38; treat that doc as
  stale when planning DBA work.
- Domain aggregates: `tenants` (multi-tenant root), `users`, `roles`,
  `permissions`, `auth_flows` + `auth_flow_steps` + `auth_sessions`
  (configurable N-step MFA), `user_devices`, `user_enrollments`,
  `webauthn_credentials` (V18), `nfc_cards` (V22), `voice_enrollments`
  (V33), `oauth2_clients` (V24/V34/V37/V38), `mfa_sessions` (V35/V36),
  `refresh_tokens` (V6/V50), `audit_logs` (V5/V8/V40/V41/V46),
  `rate_limit_buckets` (V9), `tenant_email_domains` (V44),
  `face_embeddings` + `voice_enrollments` (in `biometric_db` on the
  pgvector store, owned by biometric-processor's Alembic migrations
  `biometric-processor/alembic/versions/`).
- **Partitioning**: `audit_logs` is range-partitioned by `created_at`
  monthly (`V40__partition_audit_logs.sql:1`). The migration is well-
  documented but explicitly NOT auto-run in CI — operator must apply
  during a maintenance window. Maintenance for new partitions is
  delegated to `V41__audit_logs_partition_maintenance.sql`.
- **FK cascade hazards**: a recurring theme. `feedback_no_hard_delete_users.md`
  recorded that `users` is FK-cascaded by ~13 tables. `V49__tenants_deleted_at.sql:1-20`
  applied the same lesson at the tenant level. Soft-delete contract is
  enforced via Hibernate `@SQLDelete` + `@SQLRestriction`. **Risk**: a
  developer using a raw `DELETE FROM users` SQL bypasses the contract;
  there is no DB-level trigger forbidding hard deletes. Add a
  `BEFORE DELETE` trigger on `users` and `tenants` to raise an exception.
- **Embeddings**: stored in pgvector tables on biometric-processor's DB.
  `face_embeddings` is L2-normalised + indexed for `<=>` cosine search
  (parent CLAUDE.md). **No encryption at rest** for the embedding bytes
  themselves — verified by `grep -r "encrypt\|fernet\|aesgcm"
  biometric-processor/app/` returning zero. Memory said "embedding
  encryption staged" — **trust the code: not done.** This is a GDPR
  Art. 9 ("special category data") concern.
- **TOTP secrets** ARE encrypted at rest (V39, V42 CHECK constraint;
  `application-prod.yml`/`security/TotpSecretCipher.java`).
- **Retention**: GDPR/KVKK soft-delete purge (`application.yml:22-26`)
  is OFF by default; operator must opt in per environment after dry-run.
- **Schema-migrations strategy**: Flyway with
  `validate-on-migrate: false` (prod yml) and `baseline-on-migrate: true`.
  Validate-on-migrate is off so a checksum drift won't crash the boot;
  a deliberate trade-off but should be revisited once the schema
  stabilises.
- **Connection pooling**: HikariCP, max 20 (`application-prod.yml:24`).
  Two API replicas × 20 = 40 connections; Postgres max 200 (compose
  prod). Headroom is fine, but **no PgBouncer** means DB IPC scales
  linearly with replica count.

---

## Security Architecture

### Wins
- **JWT**: dual-algo coexistence with kid-routed verification
  (`identity-core-api/src/main/java/com/fivucsas/identity/security/JwtService.java:25-36`).
  Prod profile pins RS256 (`application-prod.yml:73`), and `JwtService`
  has a `@PostConstruct` fail-fast assertion when `prod` profile is
  active but algo isn't RS256.
- **JTI blacklist** in Redis on logout (filter `JwtAuthenticationFilter.java:56-60`,
  fail-closed if Redis unavailable).
- **OAuth2/OIDC**: PKCE S256 mandatory for public clients (V34),
  authorize-code single-use, cross-client replay blocked (V36 `client_id`
  on `mfa_sessions`), JWKS at `/.well-known/jwks.json`, OIDC discovery
  at `/.well-known/openid-configuration`.
- **Refresh-token rotation with family revocation** (V50, RFC 6749 §10.4 +
  OAuth 2.0 Security BCP §4.13). On detected reuse, every descendant
  in the family is revoked.
- **TOTP**: secrets encrypted at rest (V39, V42 CHECK constraint).
- **RBAC**: `RbacPermissionEvaluator` integrates with Spring's method
  security (`SecurityConfig.java:58-62`), `TenantScopeResolver`
  fail-closes to a zero-UUID sentinel — confirmed in
  `AUDIT_2026-04-28_SECURITY.md:30`.
- **Multi-tenancy**: V25 enabled Postgres RLS on tenant-scoped tables
  with `current_tenant_id()` session var
  (`V25__add_row_level_security.sql:1`). Belt-and-suspenders with
  `TenantHibernateAspect` and `TenantFilterAspect` at the JPA layer.
- **Rate limiting**: persistent token-bucket via `RateLimitFilter` +
  `RateLimitBucketRepository`. Returns RFC-7231 `Retry-After` on 429.
- **Biometric-processor**: API-key middleware fail-closes
  (`app/main.py:182-204`); demo UI disabled in prod; container
  read_only; cap_drop; Traefik public route was stripped 2026-04-28
  (`AUDIT_2026-04-28_SECURITY.md:14`).
- **CSP** on web-app + auth-test; HSTS, X-Frame-Options, nosniff,
  Referrer-Policy, Permissions-Policy.
- **gitleaks** on push for both api and web-app; GitHub
  secret-scanning + push-protection enabled (memory 2026-04-30).

### Gaps
- **Audit-log details rendering** — log-file-only today, but
  user-supplied strings are not HTML-escaped (Sec-P2 #8). If a future
  audit-log UI renders them as HTML, stored-XSS becomes possible.
- **Refresh-token family revocation logic at the application layer** —
  V50 added the column; verify `RefreshTokenService.rotateRefreshToken`
  actually performs the bulk revoke on reuse. Memory says yes (Z1);
  code-side I read only the migration. A unit test
  `RefreshTokenFamilyRevocationTest.java` should be required.
- **Embedding encryption at rest** — not implemented (verified above).
  Highest-priority security gap given GDPR Art. 9.
- **DNSSEC / CAA records missing** (`AUDIT_2026-04-28_SECURITY.md:50`).
- **`StepUpController`, `StatisticsController` `@PreAuthorize`-free** —
  worth a manual authz audit.
- **Fingerprint placeholder embedder** — see Code Quality §7.
- **Dev `JWT_SECRET` checked in** (`docker-compose.yml:114`). Even though
  it's dev-only, it's a confusing artefact for someone reviewing the repo
  for hardcoded secrets.
- **CSP report-uri** — none configured for production violation telemetry.

---

## Reliability, Observability & Ops

- **Compose stack on prod**: 2 replicas of identity-core-api, 2 replicas
  of biometric-processor, single Postgres, single Redis, single API
  gateway (`docker-compose.prod.yml:62-122`). `update_config` declares
  `parallelism: 1, delay: 30s, failure_action: rollback` — but this is
  Docker Swarm syntax and is silently ignored under plain `docker
  compose`. Rollback is therefore manual; the project relies on the
  `RUNBOOK_ROLLBACK` and SHA-tagged images (commit `e3e9056`,
  `02db026`).
- **Observability**: per memory 2026-04-30, Loki + Promtail + Grafana
  stack is live with an ops-email contact point — **but the compose
  files for that stack live at `/opt/projects/infra/observability/`
  on the production host**, not in this repo. The repo's
  `monitoring/docker-compose.monitoring.yml` is a local-dev Prometheus
  + Grafana + Alertmanager stack; the alerting rules in
  `monitoring/alert_rules.yml` should be reviewed for false-positive
  parity with what's running on prod.
- **Health checks**: `/actuator/health` (Java) + `/health` (Python),
  wired into compose `healthcheck:` blocks. Acceptable.
- **Backups**: GPG-encrypted daily, mirrored offsite, but **3-day
  retention only** (`AUDIT_2026-04-29_OPS_FOLLOWUP.md:43`). Weekly+
  monthly retention proposed in `docs(infra): propose offsite weekly+
  monthly retention tiers` (commit `178168a`) but not yet implemented.
- **DR**: First drill ran 2026-04-30 successfully
  (`AUDIT_2026-04-29_OPS_FOLLOWUP.md:52`). RPO 24 h documented as
  accepted-risk. WAL archiving / PITR remains open.
- **SLO/SLI**: Aspirational targets in `docker-compose.prod.yml:184-188`
  (1000+ concurrent users, 120 enrollments/sec, p95 verify <500ms) —
  these are not yet codified as Prometheus SLO recording rules and have
  not been validated against real load.
- **Incident postmortems**: tracked informally in
  `feedback_*.md` memory entries (FK-cascade incident 2026-04-28,
  read-only rootfs cache dirs 3rd recurrence). No
  `docs/incidents/` directory; consider one for traceability.
- **Deployment**: `:sha-<short>` image tags now appended at deploy
  time (commit `02db026`). `RUNBOOK_ROLLBACK` exists. Hostinger
  static deploys via rsync (`web-app/.github/workflows/deploy-hostinger.yml`).

---

## Scalability & Performance

### Current bottlenecks
- **Biometric inference path is the single biggest CPU consumer.**
  CX43 has 8 vCPU / 16 GB RAM. Each verify call runs MTCNN detection +
  Facenet512 embedding + UniFace MiniFASNet liveness + DeepFace
  anti-spoof — all inside the request thread. With `WORKERS=4
  WORKER_CONCURRENCY=2 UVICORN_WORKERS=2` (`docker-compose.prod.yml:103-107`)
  per replica × 2 replicas, the platform can serve ≈8–16 concurrent
  verify calls before queueing.
- **Real ceiling estimate**: optimistically, 50–100 concurrent users
  doing biometric flows; 200+ doing pure password/TOTP login. The
  advertised 1000+ figure (`docker-compose.prod.yml:184`) is not
  achievable on this host without GPU offload or horizontal expansion.
- **Postgres**: single instance, `shared_buffers=384MB` undersized for
  a 16 GB host (`AUDIT_2026-04-29_OPS_FOLLOWUP.md:39`). No read replica;
  `audit_logs` reads will compete with writes during admin queries.
- **Redis single instance** — no Sentinel, no Cluster. Cache misses
  during a Redis restart cause boot-time JWT blacklist desync (the
  `JwtAuthenticationFilter` fail-closes when Redis is unavailable —
  good for security, bad for availability under transient Redis
  hiccups).
- **No background work queue** — every enrollment synchronously waits
  for the biometric-processor response. A user uploading a 10 MB selfie
  blocks an HTTP thread for the full processing duration.

### Sync vs async enrollment
Currently sync. A natural Phase-3 evolution: enrollment returns a
202-Accepted with a job id; biometric-processor processes via Celery /
RQ; client polls `/enrollments/{id}` for status. This decouples the
ML latency from the user-perceived response time and allows safe
horizontal scaling.

---

## DevEx, CI/CD, Repo Hygiene

- **Submodule discipline**: parent default branch is `main`, but the
  FIVUCSAS team merges integration to `master` per
  `reference_fivucsas_branch_model.md`. Verified: parent repo's current
  branch IS `master` (per gitStatus), and `web-app/.github/workflows/ci.yml:5`
  triggers on **both** `[main, master]` — deliberate accommodation.
- **Per-repo CI**:
  - `identity-core-api/.github/workflows/ci.yml` — JDK 21, `mvn -B -ntp -T 2C test`
    on ubuntu-latest, integration tests on self-hosted runner with
    Testcontainers.
  - `web-app/.github/workflows/ci.yml` — Node 22, `npm run lint`, `tsc --noEmit`,
    `vitest`, `vite build`.
  - `biometric-processor/.github/workflows/ci.yml` — Python 3.12, ruff,
    mypy (best-effort `|| true` for formatter), all on self-hosted.
- **Parent CI** (`/opt/projects/fivucsas/.github/workflows/ci.yml`)
  validates docker-compose syntax + nginx config. Lightweight but
  appropriate for a meta-repo.
- **Gitleaks** on push for api and web-app. GitHub secret-scanning +
  push-protection on (memory 2026-04-30).
- **Dependabot**: PR #28 noted in memory as open on the parent repo
  (`project_open_issues.md`); active dependency PRs across submodules
  (commit log shows recent CVE-pin work in `pom.xml:28-34`).
- **Build times**: Java multi-stage Docker build is heavy because
  `mvn package -Dmaven.test.skip=true` resolves dependencies fresh
  (`identity-core-api/Dockerfile:7-19`). A `dependency:go-offline`
  layer between COPY pom.xml and COPY src would cache deps. **High
  ROI** — Maven dep resolution often dominates a no-code-change rebuild.
- **Lint/typecheck gating**: weak in two places. (1) `--max-warnings 90`
  in web-app. (2) `ruff format --check ... || true` in biometric-processor
  CI is non-blocking.
- **Self-hosted runners** are used for integration tests and biometric
  CI. There is no documented bootstrap procedure for when the runner
  dies — capture in a runbook.

---

## Risk Register

Severity scale:
- **Critical** — service down or data loss in single failure mode; no
  documented recovery within 4 h.
- **High** — outage or data-integrity issue likely within 12 months;
  recovery possible but disruptive.
- **Medium** — degradation, regulatory/compliance exposure, or
  developer-velocity loss; can be mitigated in a sprint.
- **Low** — cosmetic, single-class regressions, or risk only
  materialises under unlikely combinations.

| # | Risk | Likelihood | Impact | Mitigation | Owner |
|---|---|---|---|---|---|
| 1 | Single-host failure (Hetzner CX43) wipes prod | Medium | Critical | Add second region / cold standby; document RTO | Infra |
| 2 | No PITR / 24 h RPO | High | High | Enable WAL archiving + offsite ship; hourly base backups | Infra |
| 3 | Embedding bytes unencrypted at rest (GDPR Art. 9) | High | High | Implement Fernet/AES-GCM around `face_embeddings` insert/read; KMS-managed key | biometric-processor |
| 4 | Sync biometric inference on hot path saturates CPU under load | Medium | High | Move enrollment to async queue; size-test verify before SLO claims | biometric-processor / api |
| 5 | Fingerprint hash-embedder advertised as biometric | Medium | High | Feature-flag behind real-hardware presence; relabel UI | product+biometric |
| 6 | `audit_logs` partition maintenance regression (no future partitions) | Medium | Medium | Add a Prometheus alert on `audit_logs` partition coverage; cron-test | Infra |
| 7 | `validate-on-migrate: false` + checksum drift hides a corrupted migration | Low | High | Re-enable validation after V52 stabilisation; canary apply on a staging DB | api |
| 8 | Refresh-token family revocation untested under concurrent reuse | Medium | High | Add `RefreshTokenFamilyRevocationTest` integration test | api |
| 9 | StepUpController / StatisticsController potentially missing authz | Low | High | Manual `@PreAuthorize` audit; `archunit` rule forbidding bare controllers | api |
| 10 | gitleaks-historic secret still present until history rewrite | Low | Medium | Rotate already done; schedule history rewrite in a maintenance window | Infra |
| 11 | Hetzner CPU saturation when liveness + anti-spoof both on | High | Medium | Profile under load; consider bypass when client-side passive liveness already passed | biometric-processor |
| 12 | Backup retention only 3 days offsite | Medium | Medium | Implement weekly + monthly tiers (already drafted in commit 178168a) | Infra |
| 13 | `EnrollmentPage.tsx` 1340 LoC — change-amplification risk | High | Medium | Decompose by method; coverage gate at component level | web-app |
| 14 | Web `--max-warnings 90` lint gate normalises decay | High | Medium | Tighten to 0; triage existing warnings | web-app |
| 15 | Dev `JWT_SECRET` literal in compose looks like a leaked secret | Low | Low | Move to `.env.dev`; document explicitly | Infra |

---

## Top 10 Engineering Recommendations

Ranked by leverage (impact ÷ effort), with sequencing.

1. **Encrypt biometric embeddings at rest** (S/M, High impact). Add a
   Fernet (or AES-GCM via `cryptography`) wrapper in
   `biometric-processor/app/infrastructure/persistence/pgvector_face_repository.py`.
   Key from env / KMS. Migrate existing rows in a one-shot script.
   **Why now**: GDPR Art. 9 exposure is the single largest legal risk.
   **Sequencing**: independent — ship before any new tenants onboard.

2. **Enable WAL archiving + PITR** (M, High impact). Postgres
   `archive_command` to ship WALs to the offsite GPG-encrypted bucket.
   Cuts RPO from 24 h to ≤5 minutes. **Sequencing**: requires Infra
   downtime window; pair with the Postgres `shared_buffers` bump.

3. **Decouple enrollment from the request path** (L, High impact). Add a
   Celery/RQ worker in biometric-processor; `/enroll` returns 202 with a
   job id; `GET /enrollments/{id}` polls. Removes the largest source of
   p95 latency variance and unblocks horizontal scaling. **Sequencing**:
   after #1 (encryption affects storage layer); requires a new Redis
   queue or RabbitMQ.

4. **Reduce Maven Docker rebuild time** (S, Medium impact). Insert a
   `mvn dependency:go-offline` layer in `identity-core-api/Dockerfile:9`
   between `COPY pom.xml` and `COPY src`. Empirical 2–4× speedup on
   no-code-change rebuilds. **Sequencing**: independent.

5. **Tighten lint gates** (S, Medium impact). Flip
   `web-app/package.json:13` to `--max-warnings 0`; convert
   biometric-processor's `ruff format --check ... || true` to a hard
   gate. Bias the codebase toward lower future-debt accumulation.
   **Sequencing**: schedule a sprint to triage existing warnings first.

6. **Audit `@PreAuthorize` coverage with ArchUnit** (S, High impact).
   Add an ArchUnit rule: every `@RestController`-annotated method
   matching `/api/v1/**` must either be in a permitAll allow-list OR
   declare `@PreAuthorize`. Catches the StepUp/Statistics gap class
   automatically. **Sequencing**: independent.

7. **Convert `update_config` to a real rollback story** (M, Medium
   impact). Either move to Docker Swarm (where the syntax works) or
   write a `deploy/rollback.sh` that pulls the previous `:sha-*` tag
   and recreates services. Today the rollback story is a runbook step.
   **Sequencing**: depends on Infra preference.

8. **Add coverage gate** (S, Medium impact). 30 % minimum on api,
   biometric-processor, and web-app. CI fails below threshold. Doesn't
   need to be high; just stops slipping. **Sequencing**: after #5
   (need clean baseline).

9. **Extract a Verification orchestrator** (M, Medium impact). Split
   `ManageVerificationService.java:1` (439 LoC) into a Saga-style
   orchestrator + step handlers. Reduces the blast radius for changes
   to the verification pipeline (each step swappable). **Sequencing**:
   independent; ideally before introducing more verification methods.

10. **Add a Postgres `BEFORE DELETE` trigger on `users` and `tenants`**
    (S, High impact). Even a future ad-hoc psql session that types
    `DELETE FROM users` should be refused at the engine level. The
    application contract is documented; the engine doesn't yet enforce
    it. **Why now**: FK-cascade incident on 2026-04-28 wiped a real
    user's TOTP/WebAuthn/NFC by accident — defence in depth is
    cheaper than the next incident. **Sequencing**: independent;
    one-line migration `V51__forbid_user_tenant_hard_delete.sql`.

---

*End of review. Cross-checked against `AUDIT_2026-04-28_*.md`,
`AUDIT_2026-04-29_OPS_FOLLOWUP.md`, `ROADMAP_2026-04-28.md`, and
direct file inspection. Where memory and code disagreed (Loki stack
location, embedding encryption, V38 vs V50 migration count, Traefik
config in repo) the code was trusted and the divergence noted.*
