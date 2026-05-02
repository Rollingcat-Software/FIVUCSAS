# FIVUCSAS Session Status — 2026-05-02

**Snapshot:** 2026-05-02, mid-session. Supersedes `SESSION_STATUS_2026-05-01.md`.

This is the canonical session-state doc for 2026-05-02 work. The 2026-05-01 doc is preserved as historical record.

---

## Today's headline

Eight P0/P1 security findings from the four 2026-05-01 senior reviews are closed end-to-end. **Five PRs merged across two repos**:

| PR | Repo | Closes |
|---|---|---|
| #54 | identity-core-api | P0-SEC-1 — TenantContext from JWT, not header (cross-tenant breach) |
| #55 | identity-core-api | P0-SEC-2 OAuth2 confidential client_secret + P0-SEC-4 RoleController/DeviceController tenantId ownership |
| #56 | identity-core-api | P1-1 — refresh-token sha256(secret), dual-read legacy plaintext (V55 migration) |
| #57 | identity-core-api | P1-2/3/4 — WebAuthn origin allowlist (registration + assertion), clientDataJSON required, sign-counter validated |
| #65 | biometric-processor | P1.3 — Fernet embedding encryption + Alembic 0005 + backfill script |
| #62 | web-app | P0-Q1 — VITE_API_BASE_URL centralized, ESLint guard rule |
| #63 | web-app | P0-FE-1/2/3 — ErrorHandler i18n, useVerification i18n, dead Redux runtime deleted (-6.3 KB gzipped) |

Senior-Test review's F1 (real personal-face photos in git history at `biometric-processor/tests/fixtures/images/`) and Senior-Security's P0-3 (JWT_SECRET rotation + history scrub) remain operator-only — see §5 below.

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

Identity-core-api `main` HEAD: `cf398b9` "WebAuthn origin allowlist + clientDataJSON + counter (#57)".

Schema state: V1 → V55. V55 is the new refresh-token hash column. V53 (BEFORE-DELETE trigger) and V51 (ShedLock) are ahead of prod (Task #25 rebuild gate).

Biometric-processor `main` HEAD: `611a3cc` "Fernet embedding encryption (#65)". Alembic head: `0005_embedding_ciphertext`. Operator MUST set `FIVUCSAS_EMBEDDING_KEY` in `.env.prod` AND run backfill before users hit the verify path post-rebuild — without the env, the container fails fast on boot (intentional).

Web-app `main` HEAD: `88ae52c` "ErrorHandler + Redux removal (#63)". `VITE_API_BASE_URL` is now mandatory at build time.

## Operator-only residuals — strict ordering

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
