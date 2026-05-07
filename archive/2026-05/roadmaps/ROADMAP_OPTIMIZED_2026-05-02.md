# FIVUCSAS Optimized Roadmap — 2026-05-02 (post-deploy refresh)

**Supersedes:** the same file's earlier mid-session version.
**Source-of-truth review docs:** `/opt/projects/SECURITY_REVIEW_2026-05-01.md`, `TEST_REVIEW_2026-05-01.md`, `QUALITY_REVIEW_2026-05-01.md`, `FRONTEND_REVIEW_2026-05-01.md`, plus the five 2026-04-30 reviews (DevOps/DB/Performance/Architecture/Principal).

This document is the **single source of truth for what's open**. Everything not on this list is closed or out-of-scope.

---

## Headline — what changed this turn

- **Operator rebuild EXECUTED 2026-05-02 17:50–17:58 UTC.** Both `identity-core-api` and `biometric-api` containers running on rebuilt images with all 2026-05-02 security PRs baked in. Live cross-tenant defence + CustomUserDetails wiring + WebAuthn origin allowlist + refresh-token hash + Fernet embedding ciphertext (54/54 rows backfilled).
- **JWT_SECRET investigation closed:** leaked `f8ee668:.env.gcp` value (`0fxTk5RdD…`) is **not** the live Hetzner value (`tu9IMTc1…`). Defence-in-depth rotation only via kid-based registry; no urgency.
- **User-domain decision made:** keep both files, ship an ArchUnit guard against new direct `entity.User` imports. Gradual migration over time.
- **Proctoring direction (B):** extract submodule, defer amispoof.com demo. **Phase 0 is operator-resolve Task #55 (CI runner stall) before touching this.**

---

## Status by tier

### Tier 1 — Operator-only ✅ DONE except residuals

| ID | Item | State |
|---|---|---|
| T1.1 | Container rebuild | ✅ DONE 17:50–17:58 UTC, both healthy |
| T1.2 | New env vars in `.env.prod` (Fernet, WebAuthn origins, JWT soak overrides) | ✅ DONE |
| T1.3 | Alembic 0005 schema + ciphertext backfill (19 face + 35 voice) | ✅ DONE (manual SQL — alembic CLI missing in container, see T3.A) |
| T1.4 | JWT_SECRET rotation context | ✅ INVESTIGATED — leak is dead bytes; rotation = kid-based, planned T3.C |
| T1.5 | GDPR fixture history rewrite (real personal photos in bio test fixtures) | ⏳ Operator-only, low cosmetic priority. See `feedback_audit_quality.md` |
| T1.6 | Smoke tests post-deploy | ✅ Health UP, login + WebAuthn endpoints reachable |

### Tier 2 — Awaiting user input

| ID | Item | Decision needed |
|---|---|---|
| T2.1 | Proctoring direction | ✅ B (extract submodule, defer amispoof) — start once T3.D resolved |
| T2.2 | Bifurcated User domain | ✅ Keep both + ArchUnit guard. Plan in T3.B. |
| T2.3 | Web `IFoo` convention (P0-Q3) | ⏳ Solo dev preference — recommend keep (matches Inversify DI pattern). Confirm? |
| T2.4 | V56 — drop `refresh_tokens.token` plaintext column | ⏳ Schedule for ~2026-05-09 (T+7d soak) |

### Tier 3 — Active execution wave (this turn)

| ID | Item | Owner |
|---|---|---|
| T3.A | Bio: add `alembic` to requirements + fix `backfill_embedding_ciphertext.py` async-iter bug (Task #81) | agent |
| T3.B | api: ArchUnit guard against new direct `entity.User` imports outside `infrastructure/`/`repository/`/`entity/` (T2.2 implementation) | agent |
| T3.C | api: kid-based JWT second-key registry — adds new key entry, both kids verify in parallel during soak. Sets up no-logout rotation. | agent |
| T3.D | Bio CI runner stall (Task #55) | operator |

### Tier 4 — Open backlog (leverage-ranked)

#### T4.1 Test infrastructure (carryover Test review)
- **F6** — 11 controller slice tests use `addFilters=false`, hiding SecurityConfig regressions. Switch to filter-chain-enabled `@WebMvcTest`.
- **F7** — JaCoCo + 70% gate on `mvn verify`.
- **F8** — Vitest "e2e" specs are unit-shaped; rename or add real Playwright e2e.
- **F11** — Java test factory builders (`aUser().withEmail("x").build()`).
- **F12** — MSW + API contract tests on web side.
- **F13** — k6 load tests not invoked from CI.
- **F14** — Audit-log emission asserted at port-mock layer, not row count.
- **F15** — `Thread.sleep` smell in `JwtServiceTest`.
- **F17** — No CodeQL / Semgrep / DAST despite RS256 + TOTP + WebAuthn surface.
- **NEW** — Add a smoke test that loads `application-prod.yml` in CI to catch YAML duplicate-key bugs (caught by accident in PR #62 today).

#### T4.2 Quality cleanup (carryover Quality review)
- **P1-Q7** — `EnrollmentPage.tsx` 1350 LOC + 38 hooks. Decompose by method.
- **P1-Q8** — Service-class naming inconsistency.
- **P1-Q10** — Web-app linter ceiling drift; tighten `--max-warnings` and ratchet.
- **P2-Q11..Q16** — bio `container.py` 1133 LOC, dead `@deprecated` aliases, dup script trees, 16 `@SuppressWarnings`, MDC under-used, audit-log prefix inconsistency.
- **P3-Q17..Q22** — minor hygiene.

#### T4.3 Frontend P2/P3
- **P2-FE-1** — Component decomposition (3 files >900 LOC).
- **P2-FE-2** — Form-validation inconsistency (raw `useState` vs `useForm + zod`).
- **P2-FE-3** — Zod parsing at API boundary.
- **P2-FE-4** — `react-hooks/exhaustive-deps` disabled in 28 spots.
- **P2-FE-5** — Hardcoded English `aria-label` template literals.
- **P2-FE-6** — `any` casts in critical paths.
- **P3-FE-1..6** — index.html title, `setTimeout` cleanups, empty-state copy, `NotificationPanel` polling, CSP drift, dead `connect-src tfhub.dev`.

#### T4.4 Security tail
- **P2/P3** — see `SECURITY_REVIEW_2026-05-01.md` deferred items.
- **NEW** — `DeviceController` has 3 direct `credentialRepository.save(...)` writes outside the new service boundary. Pre-existing; wrap in `WebAuthnCredentialService.saveCredential(...)` for full strict hygiene.

#### T4.5 RLS hardening (Task #27, multi-day)
Application DB role + `FORCE ROW LEVEL SECURITY`. Currently RLS opt-in via app-level `SET app.current_tenant_id`; hardening makes it impossible for any session to bypass.

#### T4.6 Architecture (carryover)
- **DTO triplication** — Performance + Architecture review item.
- **Audit-log partitioning advanced** — pg_partman cron vs current startup-time pre-create.

### Tier 5 — Long-running, scheduled

| ID | Item | Trigger |
|---|---|---|
| T5.1 | Phase 4 productization (self-serve signup, Stripe, tenant-branded hosted login, status page) | After T2.x decisions |
| T5.2 | Phase 5 mobile parity + iBeta Level-1 prep | Parallel with T5.1 |
| T5.3 | Aysenur rPPG integration | Post-rebase, into proctoring submodule |
| T5.4 | **Proctoring submodule (Option B)** — Phase 1 `shared-detection`, Phase 2 `proctoring-engine`. amispoof.com deferred. | Gated on T3.D |
| T5.5 | JWT soak end (Task #82): flip `ALLOW_HS512=false`, set issuer/audience env, restart api | ~2026-06-01 (env-var only, no rebuild) |
| T5.6 | Flyway repair (Task #80): align prod schema_history with V24/V40/V41 file checksums, then flip `validate-on-migrate=true` | Within next week, low risk |

---

## Closed since 2026-04-30 (do not relist)

- All 4 senior reviews from 2026-05-01 — P0 items shipped.
- All 8 P0/P1 security findings (PR #54-#60).
- Embedding encryption shipped + backfilled live.
- WebAuthn origin allowlist enforced live.
- Refresh-token hash live.
- CustomUserDetails wiring live (closed PR #54 silent bypass).
- Backend quality batch (PR #61) live.
- Frontend error-surfacing (PR #66) live.
- Playwright @destructive tags + nightly cron (PR #65) live.
- application-prod.yml duplicate-key hotfix (PR #62) live.

---

## What I won't do without explicit user go-ahead

- Touch the prod live JWT_SECRET on Hetzner (current rotation plan = kid-based parallel, no logout — T3.C).
- Force-push `git filter-repo` on biometric-processor or identity-core-api history (T1.5, T1.4 history rewrite).
- Buy `amispoof.com` domain or stand up a public service (Option B defers this).
- Rotate Twilio / SMTP credentials (out of scope; not part of any leak).
- Touch `feat/anti-spoof-pipeline` or `liveness_capture` branches (operator decision per T5.4).

---

## Snapshot questions for the user

1. **T2.3** — keep `IFoo` convention or sweep to TS-idiomatic? (Recommend keep.)
2. **T2.4** — schedule V56 (drop plaintext refresh-token column) for 2026-05-09?
3. **T5.6** — schedule flyway repair this weekend?
4. **T5.5** — `/schedule` an agent for 2026-06-01 to flip the JWT soak vars?

---

*Last updated: 2026-05-02 18:10 UTC*
