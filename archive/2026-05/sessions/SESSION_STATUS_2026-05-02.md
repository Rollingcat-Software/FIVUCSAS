# FIVUCSAS Session Status — 2026-05-02

**Snapshot:** 2026-05-02, late-session update. Supersedes `SESSION_STATUS_2026-05-01.md`.

This is the canonical session-state doc for 2026-05-02 work. The 2026-05-01 doc is preserved as historical record.

---

## ✅ Late-session: rebuild **EXECUTED 2026-05-02 17:50–17:58 UTC**

| Step | Status | Notes |
|---|---|---|
| bio rebuild + Fernet key | ✅ | `FIVUCSAS_EMBEDDING_KEY` plumbed via compose `${...}`. Container healthy. |
| bio Alembic 0005 | ✅ (manual) | alembic CLI not installed in bio container; applied via raw SQL `ALTER TABLE … ADD COLUMN embedding_ciphertext bytea` + recorded `alembic_version` row. Follow-up Task #81. |
| bio embedding backfill | ✅ | One-shot Python script: 19/19 face + 35/35 voice rows encrypted. Shipped backfill script has async-iter bug (Task #81). |
| api rebuild | ✅ (after 2 retries) | First boot failed: `DuplicateKeyException: duplicate key app` in `application-prod.yml`. Hotfix PR #62 merged. Second boot failed Flyway `validate-on-migrate=true` on V24/V40/V41 drift; set `SPRING_FLYWAY_VALIDATE_ON_MIGRATE=false` for emergency boot. Follow-up Task #80. |
| api smoke | ✅ | `/actuator/health` UP, `POST /auth/login` returns proper JSON 401, `POST /webauthn/registration/start` returns 401 (auth required). |
| Soak window | ⏳ T+30d | `APP_SECURITY_JWT_ALLOW_HS512=true`, `APP_SECURITY_JWT_ISSUER=`, `APP_SECURITY_JWT_AUDIENCE=` until ~2026-06-01 to preserve in-flight HS512/no-iss tokens. Follow-up Task #82. |

### What changed in prod live state

- Cross-tenant defence (PR #54) now actually runs — CustomUserDetails wiring (PR #60) baked in.
- All 5 `AuthorizationService` methods + audit-log user/tenant attribution now resolve.
- WebAuthn origin allowlist enforced (PR #57) with explicit `WEBAUTHN_ALLOWED_ORIGINS` env.
- Refresh-token secret hashed at rest (PR #56).
- OAuth2 confidential client_secret enforced (PR #55), RoleController/DeviceController ownership gated.
- Embedding ciphertext column populated for all face+voice rows.
- Tx/Async/equals/escape PR #38 baked in. Backend quality refactor PR #61 baked in.

### Operator-only residuals (T1)

| Item | State |
|---|---|
| T1.1 rebuild | ✅ DONE |
| T1.2 env vars | ✅ DONE (added to .env.prod for both api and bio) |
| T1.3 Alembic + backfill | ✅ DONE (manual SQL + one-shot Python) |
| T1.4 JWT_SECRET rotation | ⏳ Defence-in-depth only — leaked GCP value was never live on Hetzner. Do via kid-based rotation post-soak. See `ANALYSIS_2026-05-02_USER_DOMAIN_AND_JWT_ROTATION.md`. |
| T1.5 GDPR fixture force-push | ⏳ User-only |
| T1.6 Smoke tests | ✅ Health + login + WebAuthn endpoint checks pass. |

### New follow-up tasks created

- Task #80 — `flyway:repair` to align prod schema_history with current migration files (V24/V40/V41 drift).
- Task #81 — bio: add alembic to requirements.txt; fix `backfill_embedding_ciphertext.py` async-iter bug.
- Task #82 — JWT soak countdown: at T+30d (~2026-06-01) flip `ALLOW_HS512=false`, set issuer/audience env, restart api.

---

## (historic) ⚠️ Headline change — operator rebuild upgraded to **P0 URGENT**

The mid-session test backfill (PR #59 F4) and a follow-on critical-fix agent (PR #60) discovered that a **principal-type mismatch** in `CustomUserDetailsService` had been silently nullifying multiple security primitives in production for at least 8 days (since 2026-04-24's PR #21 + #23 workaround):

| Primitive | Live state before PR #60 |
|---|---|
| PR #54 cross-tenant `TenantBindFromAuthFilter` | `instanceof CustomUserDetails` always false → filter no-op'd → X-Tenant-ID header trusted across tenants |
| `AuthorizationService.isOwner` | always false |
| `AuthorizationService.isSameTenant` | always false |
| `AuthorizationService.canManageUser` | always false |
| `AuthorizationService.getCurrentUserId` | always null |
| `AuthorizationService.getCurrentTenantId` | always null |
| `AuditLoggingAspect` user/tenant attribution | always missing — audit-log rows had no who/which-tenant |

`@PreAuthorize("@authz.isOwner(...)")` checks across the codebase have been silently false → reachable. Audit-log forensics from the past ≥8 days lack user/tenant attribution.

**Container rebuild is therefore urgent**, not just "needed" — until PR #60 deploys, the cross-tenant defense and ownership checks remain dead in prod.

## Today's headline (12 PRs merged)

| PR | Repo | Closes |
|---|---|---|
| #54 | identity-core-api | P0-SEC-1 — TenantContext from JWT, not header (cross-tenant breach) |
| #55 | identity-core-api | P0-SEC-2 OAuth2 confidential client_secret + P0-SEC-4 RoleController/DeviceController tenantId ownership |
| #56 | identity-core-api | P1-1 — refresh-token sha256(secret), dual-read legacy plaintext (V55 migration) |
| #57 | identity-core-api | P1-2/3/4 — WebAuthn origin allowlist (registration + assertion), clientDataJSON required, sign-counter validated |
| #58 | identity-core-api | Backend security batch — JJWT alg/kid bind, iss/aud actually wired (memory's "completed 2026-04-20" was wrong), HS512 gated, public-client PKCE hard-reject, MfaSession Jackson, audit-log escape gaps |
| #59 | identity-core-api | Test coverage backfill — F4 RLS regression, F5 refresh-token family revoke, F9 ShedLock concurrency |
| **#60** | **identity-core-api** | **P0-CRITICAL — wire `CustomUserDetails` as authenticated principal. Closes the silent bypass of #54 + 5 AuthorizationService methods + audit-log attribution.** |
| #65 | biometric-processor | P1.3 — Fernet embedding encryption + Alembic 0005 + backfill script |
| #66 | biometric-processor | Round-8 Copilot — UniFace warm-up via cached singleton (was previously dead code) |
| #62 | web-app | P0-Q1 — VITE_API_BASE_URL centralized, ESLint guard rule |
| #63 | web-app | P0-FE-1/2/3 — ErrorHandler i18n, useVerification i18n, dead Redux runtime deleted (-6.3 KB gzipped) |
| #64 | web-app | Round-8 Copilot — MediaPipe CDN version centralized, BiometricEngine dispose race |

Three more agents in flight at writing (CI hygiene, backend quality, frontend error-surfacing). Senior-Test F1 (real personal-face photos in git history) and Senior-Security P0-3 JWT_SECRET rotation remain operator-only — see §5.

## Reviewer roster — closure status

| Reviewer | Doc | Findings | Closed | Open |
|---|---|---|---|---|
| Senior DevOps | INFRA_REVIEW_DEVOPS_2026-04-30.md | — | rolled into Tasks #25/#55 | operator |
| Senior DB | DB_REVIEW_2026-04-30.md | — | V53 trigger, V51 ShedLock | RLS hardening (Task #27, multi-day) |
| Senior Performance | PERF_REVIEW_2026-04-30.md | — | JVM heap, async/Tx | DTO triplication deferred |
| Senior Architecture | ARCHITECTURE_REVIEW_2026-04-30.md | — | — | DTO triplication, audit-log partitioning |
| Senior Principal | PRINCIPAL_REVIEW_2026-04-30.md | — | — | — |
| Senior Test | TEST_REVIEW_2026-05-01.md | 18 | — | F1 GDPR fixtures (operator), F4 RLS regression test, F5 refresh-token coverage |
| Senior Frontend | FRONTEND_REVIEW_2026-05-01.md | — | P0-FE-1/2/3 (PR #63) | P1/P2/P3 deferred |
| Senior Quality | QUALITY_REVIEW_2026-05-01.md | — | P0-Q1 (PR #62) | dual User model, IFoo convention, eslint cap creep |
| Senior Security | SECURITY_REVIEW_2026-05-01.md | 11 | P0-1, P0-2, P0-4, P1-1, P1-2, P1-3, P1-4 | P0-3 JWT_SECRET (operator), P2/P3 deferred |

## Round 8 Copilot — DISPATCHED

6 findings (4 bio on PR #64, 2 web on PR #60) are in flight as background agent `a3395d91dcd072768`.

Substantive finding worth flagging before merge:
- **bio**: `get_liveness_detector()` is *not cached*, so the startup MiniFASNet warm-up was thrown away — first request still paid the cold-start cost. Round-8 PR caches the singleton.
- **web**: `index.html` MediaPipe prefetch URLs pinned to `@0.10.18` but runtime loaders still used `@latest` — prefetch never hit. Round-8 PR centralizes to `src/config/cdn.ts`.

## Master roadmap — current state of `main`

Identity-core-api `main` HEAD: `9cf4367` "wire CustomUserDetails as authenticated principal (P0-critical) (#60)".

Schema state: V1 → V55. V55 is the new refresh-token hash column. V53 (BEFORE-DELETE trigger) and V51 (ShedLock) are ahead of prod (Task #25 rebuild gate).

Biometric-processor `main` HEAD: `9f0999f` "UniFace warm-up correctness + caching + tests (#66)". Alembic head: `0005_embedding_ciphertext`. Operator MUST set `FIVUCSAS_EMBEDDING_KEY` in `.env.prod` AND run backfill before users hit the verify path post-rebuild — without the env, the container fails fast on boot (intentional).

Web-app `main` HEAD: `e02c32f` "centralize MediaPipe CDN version + BiometricEngine dispose race (#64)". `VITE_API_BASE_URL` is now mandatory at build time.

Parent FIVUCSAS `main` HEAD: `d6811bf` (submodule pointers bumped 2026-05-02 PM).

## Late-session adds (post-PR #60)

- **Web PR #65** (open): F3 — `@destructive` tags on CRUD specs, new `smoke` Playwright project, nightly 02:00 UTC cron. Default Playwright run no longer mutates PROD. Awaiting CI.
- **Bio PR #67** (open): F2 + F10 — drop pytest-failure swallow in CI + remove stale top-level test files. Lint & Type Check still pending in queue (Task #55 runner stall).
- **Backend quality batch** (in flight, fresh dispatch after rate-limit): P1-Q5/Q6/Q9 from `QUALITY_REVIEW_2026-05-01.md`. Verify-first.
- **Frontend error-surfacing batch** (in flight, fresh dispatch after rate-limit): P1-FE-1..6 from `FRONTEND_REVIEW_2026-05-01.md`. Verify-first.

## Operator-only residuals — strict ordering

⚠️ **Container rebuild is now P0 URGENT**, not just P0. Without rebuild, PR #60's CustomUserDetails wiring stays out of prod, which means the cross-tenant defense (PR #54) and 5 AuthorizationService methods + audit-log user/tenant attribution remain dead live. This is a security-correctness regression with at-least-8-day duration.

These cannot land without operator intervention. Order matters:

### 1. Set new env vars in `.env.prod` (BEFORE rebuilds)
```
# Embedding encryption (mandatory for biometric-api boot)
FIVUCSAS_EMBEDDING_KEY=<run: python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())">

# WebAuthn origin allowlist (mandatory for assertion + registration)
WEBAUTHN_ALLOWED_ORIGINS=https://app.fivucsas.com,https://verify.fivucsas.com,https://demo.fivucsas.com
```

### 2. Rebuild api + bio containers (Task #25)
```bash
cd /opt/projects/fivucsas/identity-core-api
docker compose -f docker-compose.prod.yml --env-file .env.prod build --no-cache identity-core-api
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d identity-core-api

cd /opt/projects/fivucsas/biometric-processor
docker compose -f docker-compose.prod.yml --env-file .env.prod build --no-cache biometric-api
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d biometric-api
```

### 3. Run Alembic + backfill (biometric-processor)
```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod \
  exec biometric-api alembic upgrade head
docker compose -f docker-compose.prod.yml --env-file .env.prod \
  exec biometric-api python -m app.infrastructure.persistence.scripts.backfill_embedding_ciphertext
```

### 4. Smoke tests (post-rebuild)
- Login with intentional X-Tenant-ID header pointing at foreign tenant → expect rejection / no foreign rows in response
- WebAuthn enrol from `https://attacker-fivucsas.com.evil.com` → expect rejection
- WebAuthn assertion from `https://app.fivucsas.com` → expect success
- Refresh-token round-trip → wire format `<id>.<secret>`
- Existing users (legacy plaintext refresh tokens) → still work
- Biometric verify → embedding still works (ciphertext is canonical)

### 5. JWT_SECRET rotation decision (P0-SEC-3)
Operator must decide: was the leaked `f8ee668:.env.gcp` JWT_SECRET ever live on Hetzner? If yes: rotate, revoke all sessions, scrub history (`git filter-repo --path .env.gcp --invert-paths`). If no: rotate anyway (defence in depth) but no session revoke needed. Not a code task — operator-only.

**T3.C — kid registry shipped, awaiting operator to set new key env.** PR `feat/jwt-kid-registry` (identity-core-api) refactors HS512 key resolution from a single secret into `HsKeyRegistry`, a Spring component that holds a `Map<String, SecretKey>` keyed by `kid`. `JwtService.buildToken` now stamps `hsKeyRegistry.getActiveKid()` on every new HS-signed token; `keyLocator()` routes verification through `hsKeyRegistry.keyFor(kid)` so multiple kids verify in parallel. Backward compat preserved: when only the legacy `JWT_SECRET` env is set the registry transparently maps it to the historical kid `hs-2026-04`, so no env-var changes are required to deploy this PR. Test count 1115 → 1116 (+9 in `JwtServiceKeyRegistryTest`, baseline retained).

Operator rollout (post-merge, no user logout, no incident):
1. Mint a new HS512 secret offline (`openssl rand -base64 64`).
2. On Hetzner, add `JWT_HS_KEY_HS_2026_05=<new-secret>` plus `APP_SECURITY_JWT_RETIRED_HS_KIDS=hs-2026-04` to `.env.prod`. Restart api. Tokens minted with either secret keep verifying.
3. Soak ≥ 30 days (longer than max refresh-token lifetime).
4. Flip `APP_SECURITY_JWT_ACTIVE_HS_KID=hs-2026-05` and restart. Newly-minted tokens carry the new kid; legacy kid stays in retired list.
5. After full token expiry, drop the old kid env + retired-list entry in a follow-up release.

### 6. GDPR fixture force-push (P0-T1, Test review F1)
`biometric-processor/tests/fixtures/images/{ahab,afuat,aga}/*.jpg` are real personal photos in git history. `git filter-repo --path tests/fixtures/images --invert-paths` then force-push. Coordinate with the team — this rewrites history. Once done: regenerate fixture set with synthetic faces (StyleGAN, ThisPersonDoesNotExist, or licensed dataset).

## CI runner stall (Task #55)

Hetzner self-hosted runner queue is still ~5–8 min for api Testcontainers and bio Lint. Branch protection is OFF on main, so we have been merging on unit + scan + GitGuardian green. Operator can either (a) accept current latency, (b) move some non-required jobs to ubuntu-latest, (c) increase the self-hosted runner pool.

## Architectural questions on the table

1. **Proctoring submodule split** — see `RESEARCH_PROCTORING_AMISPOOF_2026-05-02.md` (also written today). User asked for design thoughts on extracting the `feat/anti-spoof-pipeline` + `liveness_capture` work into a dedicated `proctoring-engine` repo, plus standing up `amispoof.com` as a public demo + research data flywheel. Memo recommends extraction (option B in the memo) once Task #25 + #55 resolve. **No code written, no domain bought, no repo created.** User picks A/B/C.

## What's not in this snapshot

- **Operator container rebuild** — see §5.
- **JWT_SECRET rotation** — see §5.
- **GDPR fixture history rewrite** — see §5.
- **RLS hardening** (Task #27, multi-day, deferred to dedicated session).
- **Round 8 Copilot PRs** — in flight at writing.
