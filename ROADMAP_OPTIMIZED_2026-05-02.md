# FIVUCSAS Optimized Roadmap — 2026-05-02

**Supersedes:** `ROADMAP_2026-04-28.md` (stale; many items shipped) and the Phase-A–L roadmap (mostly merged).
**Source-of-truth review docs:** `SECURITY_REVIEW_2026-05-01.md`, `TEST_REVIEW_2026-05-01.md`, `QUALITY_REVIEW_2026-05-01.md`, `FRONTEND_REVIEW_2026-05-01.md`, plus the four 2026-04-30 reviews (PO/CE/Senior-FE/Senior-BE/DevOps/DB/Performance/Architecture/Principal).

This document is the **single source of truth for what's open**. Everything not on this list is closed or out-of-scope.

---

## Status as of 2026-05-02 (late session)

13 PRs merged today across api/bio/web (PR #65 web added late). Eight P0/P1 from the senior reviews shipped. One critical post-merge bug (CustomUserDetails principal-type) found and closed in PR #60 — that bug had been silently nullifying the cross-tenant defense AND five `AuthorizationService` checks AND audit-log user/tenant attribution since at least 2026-04-24.

**Late-session adds (post-summary):**
- PR #65 (web, MERGED): F3 Playwright `@destructive` tags + `smoke` project + nightly cron — default test run no longer mutates PROD.
- PR #67 (bio, OPEN): F2/F10 CI hygiene — Lint & Type Check still queued (Task #55 runner stall).
- Backend quality + frontend error-surfacing agents re-dispatched after rate-limit; worktree salvage confirmed neither had draft work, so fresh dispatches are running.
- Parent submodule pointers bumped to 2026-05-02 main heads (commits d6811bf + 54bb412).

---

## Tier 1 — Operator-only, P0-URGENT

These cannot land without operator intervention. **Without these, the security work merged this week does not run live in prod.**

### T1.1 Container rebuild (Task #25) — UPGRADED to URGENT
Without rebuild, the following are no-op'd in production:
- PR #54 cross-tenant filter
- PR #60 CustomUserDetails wiring (which fixed the silent bypass of #54 + 5 AuthorizationService methods + audit-log attribution)
- PR #58 alg/kid bind + iss/aud + HS512 gating + PKCE hard-reject
- V51 ShedLock, V53 BEFORE-DELETE trigger, V55 refresh-token hash
- PR #65 embedding encryption (also requires `FIVUCSAS_EMBEDDING_KEY` env)
- PR #57 WebAuthn fixes (also requires `WEBAUTHN_ALLOWED_ORIGINS` env)

Operator runbook in `SESSION_STATUS_2026-05-02.md` §5.

### T1.2 New env vars in `.env.prod` (gate to T1.1)
```bash
FIVUCSAS_EMBEDDING_KEY=$(python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())")
WEBAUTHN_ALLOWED_ORIGINS=https://app.fivucsas.com,https://verify.fivucsas.com,https://demo.fivucsas.com
# Optional, defaults to false:
APP_SECURITY_JWT_ALLOW_HS512=false
APP_SECURITY_JWT_ISSUER=https://api.fivucsas.com
APP_SECURITY_JWT_AUDIENCE=https://app.fivucsas.com
```
bio container fails-fast on boot if `FIVUCSAS_EMBEDDING_KEY` is missing. WebAuthn fails-fast on assertion if `WEBAUTHN_ALLOWED_ORIGINS` is missing.

### T1.3 Alembic upgrade + backfill (post-T1.1)
```bash
docker compose ... exec biometric-api alembic upgrade head
docker compose ... exec biometric-api python -m app.infrastructure.persistence.scripts.backfill_embedding_ciphertext
```

### T1.4 JWT_SECRET rotation decision (P0-SEC-3)
Was the leaked `f8ee668:.env.gcp` JWT_SECRET ever live on Hetzner? If yes: rotate, revoke all sessions, scrub history (`git filter-repo --path .env.gcp --invert-paths`). If no: rotate anyway (defense in depth) but no session revoke. Operator-only.

### T1.5 GDPR fixture force-push (Test review F1)
`biometric-processor/tests/fixtures/images/{ahab,afuat,aga}/*.jpg` are real personal photos. `git filter-repo --path tests/fixtures/images --invert-paths` then force-push. Coordinate with team. Once done: regenerate fixtures with synthetic faces (StyleGAN, ThisPersonDoesNotExist, or licensed dataset).

### T1.6 Smoke tests (post-T1.1)
- Login as `alice@tenantA` with `X-Tenant-ID: <tenantB-UUID>` → expect rejection (logs should show `AUDIT: tenant-rebind rejected cross-tenant assertion`)
- Same as SUPER_ADMIN → expect success
- WebAuthn enroll from `https://attacker-fivucsas.com.evil.com` → expect rejection
- Refresh token round-trip with new `<id>.<secret>` wire format
- Biometric verify still works (ciphertext canonical)

---

## Tier 2 — Awaiting user decision

These require the user to choose a direction before any implementation work makes sense.

### T2.1 Proctoring submodule extraction (A/B/C)
Memo at `RESEARCH_PROCTORING_AMISPOOF_2026-05-02.md`. User picks:
- **A** — extract proctoring submodule + stand up amispoof.com (~3 weeks to demo, ~3 months to paper)
- **B** — extract submodule, defer demo (recommended — lower risk, slower paper)
- **C** — keep proctoring inside biometric-processor (memo argues against)

### T2.2 Bifurcated User domain (P0-Q2)
`identity/domain/model/user/User.java` (610 LOC) is "pure domain", aspirational, NOT used in prod. `entity/User.java` (817 LOC) is the real model. Choose:
- **a)** Annotate the pure-domain file `[NOT YET ADOPTED — see entity/User.java]` and keep as design doc
- **b)** Delete the pure-domain file (saves 610 LOC, less confusion, but loses the design intent)

### T2.3 Web `IFoo` interface convention (P0-Q3)
41 `IFoo` interfaces across 27 files. Reviewer flagged "ask before sweeping; depends on whether this is intentional team convention." Choose:
- **a)** Keep — it's our DI pattern with Inversify, `IFoo` makes the interface name clear
- **b)** Sweep to TS-idiomatic naming (`Foo` interface, `FooImpl` class, or just `Foo` interface with multiple implementations)

### T2.4 V56 — drop refresh_tokens.token plaintext column
PR #56 left the plaintext column for backward-compat dual-read. Operator soak window of ≥7 days (TTL of refresh tokens). After soak, V56 migration drops the column. Schedule for ~2026-05-09.

---

## Tier 3 — In flight at this snapshot

Three parallel agents working as of writing:

| Agent | Scope | Target |
|---|---|---|
| `a7386e95a7e4986b8` | F2 + F10 (bio) + F3 (web) — CI hygiene | bio + web PRs |
| `acaa44d86e730d707` | P1-Q5 + P1-Q6 + P1-Q9 — backend quality | api PR |
| `abc0b423115f48e25` | P1-FE-1..6 — frontend error-surfacing | web PR |

If all three land green, T3 backlog closes.

---

## Tier 4 — Open code work, leverage-ranked

Pick from this list when scheduling a future session.

### T4.1 — Test infrastructure (carryover Test review)
- **F6** — 11 controller slice tests use `addFilters = false`, hiding SecurityConfig regressions. Needs `@WebMvcTest` with the security filter chain enabled. Tedious but valuable.
- **F7** — JaCoCo instrumentation + 70% gate on `mvn verify`. Self-contained.
- **F8** — Vitest "e2e" specs are unit-shaped; rename to `.unit.test.ts` or add real Playwright e2e.
- **F11** — Test factories / builders (Java side). Currently `User user = new User(); user.setEmail(...)` everywhere; should be `aUser().withEmail("x").build()`.
- **F12** — MSW + API contract tests on web side.
- **F13** — k6 load tests not invoked from CI.
- **F14** — Audit-log emission is asserted at port-mock layer, not actual row count.
- **F15** — `Thread.sleep` smell concentrated in `JwtServiceTest`.
- **F17** — No CodeQL / Semgrep / DAST despite RS256 + TOTP + WebAuthn surface.

### T4.2 — Quality cleanup (carryover Quality review)
- **P1-Q7** — `EnrollmentPage.tsx` 1350 LOC + 38 hooks. Decompose by method (mirror existing `FaceEnrollmentFlow`).
- **P1-Q8** — Service-class naming inconsistency in `application/service/`. Style sweep.
- **P1-Q10** — Web-app linter ceiling crept up. Tighten `--max-warnings` to current actual count, then ratchet down by ~5/quarter.
- **P2-Q11..Q16** — bio container.py 1133 LOC, dead `@deprecated` aliases, duplicate Python script trees, 16 `@SuppressWarnings`, MDC under-used, audit-log prefix inconsistency.
- **P3-Q17..Q22** — `@Deprecated` constants in RequestIdFilter, bio `print()` in production, 4 `RuntimeException` in SMS adapters, `console.log` in prod build, magic numbers, `as any` casts.

### T4.3 — Frontend (P2/P3 in Frontend review)
- **P2-FE-1** — Component decomposition (3 files >900 LOC).
- **P2-FE-2** — Form validation: raw `useState` vs `useForm + zod` inconsistency.
- **P2-FE-3** — No Zod parsing at API boundary.
- **P2-FE-4** — `react-hooks/exhaustive-deps` disabled in 28 spots / 16 files.
- **P2-FE-5** — Hardcoded English `aria-label` template literals.
- **P2-FE-6** — `any` casts in critical paths.
- **P3-FE-1..6** — index.html EN title/description, WidgetDemoPage timer cleanup, empty-state copy, NotificationPanel polling backoff, CSP comment drift, dead `tfhub.dev` in `connect-src`.

### T4.4 — Security tail (P2/P3 in Security review)
Most P0/P1 closed in this session. Remaining:
- **P1-6** — In-memory rate-limit buckets. Only matters at >1 instance. Switch to Bucket4j-Redis when scaling. Track as P1 but dormant.
- **P2-4** — `extractEmail` reads claims twice (perf, low value).
- **P2-5** — CSRF disabled, no SameSite enforcement on cookies. App is JWT-bearer so no immediate exploit, but document and add a test that fails if a cookie-bearing session is added.
- **P2-6** — Actuator endpoints can be exposed via profile flag. Document and operationally hard-code to false.
- **P2-7** — Bio `/health` + `/metrics` are public. Mitigated by Traefik admin-whitelist; document rather than code-fix.
- **P3-1..7** — All positive call-outs (good practices); no work needed.

### T4.5 — RLS hardening (Task #27)
Multi-day refactor. Switch JPA datasource from `postgres` superuser → app role with row-level-security enforced. Apply `FORCE ROW LEVEL SECURITY` on all 9 multi-tenant tables. Validate every existing repository query under the new role. Roll out behind a feature flag with shadow-traffic comparison. Estimate: 3-5 days.

### T4.6 — Architecture review (carryover)
- DTO triplication (mobile/web/verify-app hand-roll the same auth DTOs). OpenAPI codegen would solve once. Multi-week.
- Audit-log partition tree empty (V40/V41 baseline-skip). 1082 rows fine now; bloat at scale. Migration to re-establish.
- Facenet512 cold-start 250-400 ms on CX43 CPU. ONNX export or model swap.

---

## Tier 5 — Long-running, scheduled

### T5.1 — Phase 4 productization (from earlier roadmap)
Self-serve tenant signup, Stripe + plan enforcement, tenant-scoped subdomains, sandbox / test mode, trust center + status page, auth-flow templates UI, Turkish landing page rewrite, multi-tenant isolation SOC2 audit, onboarding email drip, support tooling. Sequenced post-T1 (rebuild) + T2.1 decision.

### T5.2 — Phase 5 mobile parity
client-apps real screens, /auth-flows preflight, PR #25 endpoints wired, DTO alignment, dual-abstraction consolidation, tenant picker for SUPER_ADMIN. Plus liveness Priority 1 (active-illumination) and 2 (virtual-camera fingerprint).

### T5.3 — Aysenur rPPG integration
Branch `liveness_capture` is delivered. Integrate post-rebase. **Conditional on T2.1 outcome** — if option B (extract proctoring submodule), this work moves into the new submodule.

---

## Closed, do not relist

The following are done. Audits that re-cite them should be updated.

- **Phase 1 hotfix** (RefreshTokenService Tx, MFA exception narrow, JWT iss/aud — actually wired today in #58, V51 BEFORE-DELETE trigger, fingerprint placeholder)
- **Phase 2 sweep** (validate-on-migrate, statement_timeout, MDC, ShedLock, JPA hashCode, async/Tx)
- **P2.9 deferrals** (ShedLock SoftDeletePurgeJob, AuthController.verifyMfaStep extraction)
- **All 10 user-reported bugs** (closed end-to-end across 2026-04-30 + 2026-05-01)
- **All 8 today's P0/P1 from senior reviews** (PR #54, #55, #56, #57, #58, #59, #60, #62, #63, #65)
- **Round 1–8 Copilot post-merge cleanups**

---

## What I won't do without explicit user go-ahead

- Any T2 (decisional) work
- Any T1 (operator-only) work
- Splitting / creating new repos
- Buying domains
- History rewrites
- Force-pushing to `main`
- Container rebuilds on Hetzner
- Dispatching agents for items already covered by an in-flight agent

---

## Snapshot questions for the user

1. **Pick A / B / C on proctoring extraction** (T2.1).
2. **P0-Q2** — keep `User.java` pure-domain as aspirational doc, or delete?
3. **P0-Q3** — keep `IFoo` convention or sweep to idiomatic TS naming?
4. **T1.4** — was the leaked `f8ee668:.env.gcp` JWT_SECRET ever live on Hetzner?
5. **T1.1** — when do you want to schedule the container rebuild + env var update?
