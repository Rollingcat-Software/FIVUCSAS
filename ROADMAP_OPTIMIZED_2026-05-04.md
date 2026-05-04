# FIVUCSAS Optimized Roadmap — 2026-05-04 (post-Wave-2 + senior reviews)

**Supersedes:** `ROADMAP_OPTIMIZED_2026-05-02.md` (kept in tree for history).
**Source-of-truth review docs added today:** `SENIOR_DB_REVIEW_2026-05-04.md`,
`SENIOR_UIUX_REVIEW_2026-05-04.md`. Earlier reviews still relevant:
the four 2026-05-01 reviews + the five 2026-04-30 reviews.

This document is the **single source of truth for what's open**. Everything not
on this list is closed or out of scope.

---

## Headline — what changed since 2026-05-02

- **9 backend PRs squashed into `main`** today: #63 user-domain ArchUnit,
  #64 JWT kid registry, #65 login edge cases (#1/#3/#4/#5/#6/#9), #66
  DeviceController WebAuthn boundary, #67 `/oauth2/userinfo` type-claim,
  #68 V57 pg_partman + V56 placeholder, #69 F15 deterministic clock,
  #70 User `@SQLDelete` + `@SQLRestriction`, **#71 P0-PROD refresh-token
  `Persistable<UUID>` fix**.
- **4 web-app PRs squashed into `main`** today: #67 P3 hygiene batch,
  #68 lint ratchet 90→2, #69 EnrollmentPage decomposition by method,
  #70 NfcStep timeout copilot nit.
- **2 senior reviews landed** — DB engineer (`b5291f2`) and UI/UX
  designer (`044d537`); their P0/P1 lists are folded into the open
  items below.
- **Operator reality:** 2026-05-02 17:50 UTC was the last container
  rebuild. **2026-05-04 rebuild PENDING** to pick up #63–#71 (notably
  the P0 refresh-token fix #71 — `MFA_STEP_FAILED` rows captured in the
  audit log between 06:34–06:38 UTC for `ahabgu@gmail.com`).
- **Web auto-deploys via GitHub Actions** to Hostinger on every push to
  web-app `main` — confirmed working today.

---

## Status by tier

### Tier 1 — Operator-only

| ID | Item | State |
|---|---|---|
| T1.1 | **2026-05-04 container rebuild** to pick up PR #63–#71 | ⏳ PENDING (dispatched-from-Hetzner agents can run, but the agent dispatching this task may not be on the host; cf. SENIOR_DB_REVIEW Appendix C) |
| T1.2 | New env vars (`FIVUCSAS_EMBEDDING_KEY`, `WEBAUTHN_ALLOWED_ORIGINS`) | ✅ Done 2026-05-02 |
| T1.3 | Alembic 0005 schema + ciphertext backfill | ✅ Done 2026-05-02 (manual) — alembic-in-runtime now available since bio PR #68, future migrations idiomatic |
| T1.5 | GDPR fixture history rewrite | ⏳ Cosmetic, low priority |
| T1.6 | Smoke tests post-rebuild (when T1.1 closes) | Pending T1.1 |
| T1.7 | First DR drill cadence (after the 2026-04-30 one-off success) | Schedule for ~weekly |

### Tier 2 — Awaiting user input

| ID | Item | Decision needed |
|---|---|---|
| T2.3 | Web `IFoo` convention (P0-Q3) | ⏳ Solo dev preference — recommend keep (matches Inversify DI pattern). Confirm? |
| T2.4 | V56 — drop `refresh_tokens.token` plaintext column | ⏳ T+7d soak from 2026-05-02 = ~2026-05-09 (unblocks once #71 is in prod) |
| T2.5 | Self-serve developer-portal (UI/UX P0) | ⏳ Currently behind admin auth. Decide: public read-only with "Sign in to test", or keep gated and add tenant-onboarding doc? |

### Tier 3 — Active execution wave (next dispatch)

| ID | Item | Notes |
|---|---|---|
| T3.E | Senior UI/UX P0/P1 implementation (cold-load error on `verify.fivucsas.com`, 11 hardcoded English aria-labels, developer-portal gating) | Web work; matches PR-#69-style decomposition |
| T3.F | Senior DB Appendix C — 7 prod queries (need Hetzner SSH) | Operator OR an agent already on the host can answer in-place |
| T3.G | T-CICD-AUDIT, T-COPILOT-DEEP, T-UIUX-P1 (parallel agents in flight) | Already dispatched per the user's parallel-agent pattern; ship when their PRs open |

### Tier 4 — Open backlog (leverage-ranked)

#### T4.1 Test infrastructure (carryover Test review)
- **F6** — 11 controller slice tests use `addFilters=false`, hiding SecurityConfig regressions. Switch to filter-chain-enabled `@WebMvcTest`.
- **F7** — JaCoCo + 70% gate on `mvn verify`.
- **F8** — Vitest "e2e" specs are unit-shaped; rename or add real Playwright e2e.
- **F11** — Java test factory builders (`aUser().withEmail("x").build()`).
- **F12** — MSW + API contract tests on web side.
- **F13** — k6 load tests not invoked from CI.
- **F14** — Audit-log emission asserted at port-mock layer, not row count.
- **F17** — No CodeQL / Semgrep / DAST despite RS256 + TOTP + WebAuthn surface.
- **NEW** — Smoke test that loads `application-prod.yml` in CI to catch YAML duplicate-key bugs.

#### T4.2 Quality cleanup (carryover Quality review)
- **P1-Q8** — Service-class naming inconsistency.
- **P2-Q11..Q16** — bio `container.py` 1133 LOC, dead `@deprecated` aliases, dup script trees, 16 `@SuppressWarnings`, MDC under-used, audit-log prefix inconsistency.
- **P3-Q17..Q22** — minor hygiene.

#### T4.3 Frontend P2/P3 (carryover + UI/UX review)
- **P2-FE-1** — Component decomposition (3 files >900 LOC remaining after PR #69).
- **P2-FE-2** — Form-validation inconsistency (raw `useState` vs `useForm + zod`).
- **P2-FE-3** — Zod parsing at API boundary.
- **P2-FE-4** — `react-hooks/exhaustive-deps` disabled in 28 spots.
- **P2-FE-5** — Hardcoded English `aria-label` template literals (11 sites per UI/UX review).
- **P2-FE-6** — `any` casts in critical paths.
- **P3 set (UI/UX review)** — 11 P3 items in `SENIOR_UIUX_REVIEW_2026-05-04.md`.

#### T4.4 Security tail
- See `SECURITY_REVIEW_2026-05-01.md` deferred items.
- ✅ DeviceController WebAuthn boundary — closed by PR #66 today.

#### T4.5 RLS hardening (Task #27, multi-day)
Application DB role + `FORCE ROW LEVEL SECURITY`. Currently RLS opt-in via app-level `SET app.current_tenant_id`; hardening makes it impossible for any session to bypass.

#### T4.6 Architecture (carryover)
- **DTO triplication** — Performance + Architecture review item.
- ✅ Audit-log partitioning advanced — closed by PR #68 today (V57 pg_partman, fail-soft).

### Tier 5 — Long-running, scheduled

| ID | Item | Trigger |
|---|---|---|
| T5.1 | Phase 4 productization (self-serve signup, Stripe, tenant-branded hosted login, status page) | After T2.5 decision |
| T5.2 | Phase 5 mobile parity + iBeta Level-1 prep | Parallel with T5.1 |
| T5.3 | Aysenur rPPG integration | Post-rebase, into proctoring submodule |
| T5.4 | **Proctoring submodule (Option B)** — Phase 1 `shared-detection`, Phase 2 `proctoring-engine`. amispoof.com deferred. | Gated on Task #55 CI runner stall (operator) |
| T5.5 | JWT soak end (Task #82): flip `ALLOW_HS512=false`, set issuer/audience env, restart api | ~2026-06-01 (env-var only, no rebuild) |
| T5.6 | Flyway repair (Task #80): align prod schema_history with V24/V40/V41 file checksums, then flip `validate-on-migrate=true` | After 2026-05-04 rebuild lands |

---

## Closed since 2026-05-02 (do not relist)

- 9 backend PRs (#63–#71) — see `identity-core-api/CHANGELOG.md` 2026-05-04 entry.
- 4 web-app PRs (#67–#70) — see `web-app/CHANGELOG.md` 2026-05-04 entry.
- T3.A bio alembic in runtime image (PR bio#68 squashed earlier).
- T3.B api ArchUnit user-domain boundary (PR api#63).
- T3.C api JWT kid registry (PR api#64).
- DB-P0-2 + DB-P0-3 from senior DB review — closed by PR api#70.
- T-SEC-TAIL §T4.4 — closed by PR api#66.
- SECURITY_REVIEW_2026-05-01 deferred `/oauth2/userinfo` type-check — closed by PR api#67.
- T4.6 audit-log pg_partman — closed by PR api#68 (fail-soft V57 + V56 placeholder).
- F15 `Thread.sleep` smell in `JwtServiceTest` — closed by PR api#69.
- T4.2 P1-Q7 EnrollmentPage decomposition — closed by PR web#69.
- T4.2 P1-Q10 lint ratchet — closed by PR web#68.
- P3 hygiene batch (title, setTimeout cleanups, NotificationPanel pause-on-hidden, CSP cleanup) — closed by PR web#67 + #70.
- **P0-PROD refresh-token mint** — closed by PR api#71 (code merged; awaits T1.1 rebuild).

---

## What I won't do without explicit user go-ahead

- Touch the prod live JWT_SECRET on Hetzner.
- Force-push `git filter-repo` on biometric-processor or identity-core-api history.
- Buy `amispoof.com` domain or stand up a public service.
- Rotate Twilio / SMTP credentials.
- Touch `feat/anti-spoof-pipeline` or `liveness_capture` branches.
- Hard-delete user rows (memory `feedback_no_hard_delete_users.md`).

---

## Snapshot questions for the user

1. **T2.3** — keep `IFoo` convention or sweep to TS-idiomatic? (Recommend keep.)
2. **T2.4** — green-light V56-real to drop `refresh_tokens.token` plaintext column on/after 2026-05-09?
3. **T2.5** — developer-portal: keep gated or expose as public read-only?
4. **T1.1** — schedule the 2026-05-04 rebuild now or wait for more PRs?
5. **T5.5** — `/schedule` an agent for 2026-06-01 to flip the JWT soak vars?

---

*Last updated: 2026-05-04 12:00 UTC*
