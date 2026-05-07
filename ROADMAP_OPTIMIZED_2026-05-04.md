# FIVUCSAS Optimized Roadmap — 2026-05-04 (post-Wave-2 + late-day P0 deploy)

**Supersedes:** `ROADMAP_OPTIMIZED_2026-05-02.md` (kept for history).

**Authoritative source-of-truth review docs (all under `/opt/projects/fivucsas/` unless noted):**
- 2026-05-04 — `SENIOR_DB_REVIEW_2026-05-04.md`, `SENIOR_UIUX_REVIEW_2026-05-04.md`, `CICD_AUDIT_2026-05-04.md`
- 2026-05-01 — `/opt/projects/SECURITY_REVIEW_2026-05-01.md`, `TEST_REVIEW_2026-05-01.md`, `QUALITY_REVIEW_2026-05-01.md`, `FRONTEND_REVIEW_2026-05-01.md`
- 2026-04-30 — DevOps / DB / Performance / Architecture / Principal reviews

This document is the **single source of truth for what is open**. Anything not listed here is either closed (see `CHANGELOG.md` 2026-05-04 entry) or out of scope.

---

## Headline — what changed in this session

- **16 PRs squashed into `main` today** across api (#63–#73), web (#67–#73), and bio (#69 docs).
- **2 senior reviews + 1 CI/CD audit landed** as authoritative read-only docs.
- **P0-PROD refresh-token mint bug DIAGNOSED, FIXED, AND DEPLOYED** (api PR #71 → image `e9a33cef`, recreated 2026-05-04 12:01 UTC). Closed the 6 audit-log `MFA_STEP_FAILED` rows for `ahabgu@gmail.com` between 06:34–06:38 UTC. No new orchestration errors since.
- **web auto-deployed to Hostinger** on every push — confirmed working (Hostinger CI run `25317948466` SUCCESS).
- **SENIOR_DB Appendix C 7 prod queries** — answered in §A below; carryover items added to Tier 4.
- **Concurrent-agent collision pattern reconfirmed** — agents now use `/tmp/<task>/<repo>` worktrees when ≥3 share a submodule.

---

## A. SENIOR_DB Appendix C — prod-query results (run 2026-05-04 12:30 UTC)

| Q | Finding | State | Action |
|---|---|---|---|
| 1 | Flyway schema_history NULL checksums on V40, V41, V42, V43, V49, V50 | Drift carrying forward from baseline-skip + emergency rebuilds | T6.1 — `flyway repair` after next rebuild lands |
| 2 | `archive_mode = off`, `archive_command = (disabled)`, `wal_level = replica` | WAL archiving NOT live despite parent commit `1ab95e9` | Commit body declared "deploy DEFERRED" — confirmed |
| 3 | `audit_logs.tenant_id IS NULL` count = **140 / 1107 = 12.6%** | Drifted up from 12.4% on 2026-04-30 | T4.7 — investigate which paths still write null tenant; backfill |
| 4 | 25+ `pg_stat_user_indexes` rows with `idx_scan = 0` (active_sessions, api_keys, audit_logs subset, auth_flow_*) | Some are unused; some are tables not exercised yet | T4.8 — careful audit; do NOT just drop |
| 5 | `webauthn_credentials` dead/live = **9.00** (27 dead / 3 live, never autovacuumed) | Bloat | T4.9 — `VACUUM ANALYZE` + investigate why autovacuum hasn't fired |
| 6 | `alembic_version` table EXISTS in `biometric_db`, version_num = `0005_embedding_ciphertext` | Closed — Senior DB's "missing entirely" claim was stale from 04-30 | — |
| 7 | `face_embeddings` = 19, `voice_enrollments` = 35 | Same as 2026-05-02 (no new biometric enrollments this week) | Indicator-only, no action |

---

## Tier 1 — Operator-only, cannot be done from this session

These require an external system the host cannot reach (registrar console, upstream SaaS console, hardware), or are destructive enough to require explicit user authorization beyond the standing "fix everything" mandate.

| ID | Item | Why operator | Priority |
|---|---|---|---|
| T1.A | DNS A record `grafana.fivucsas.com → 116.203.222.213` | TurkTicaret nameserver registrar console | P2 (Grafana works on direct IP; cosmetic) |
| T1.B | GDPR fixture force-push (`git filter-repo --path tests/fixtures/images --invert-paths` on bio repo) | History-rewrite + force-push to public; needs explicit user OK because every collaborator's clone diverges irreversibly | P3 (cosmetic — leaked secret was already rotated 2026-04-30) |
| T1.C | Twilio + SMTP credential rotation | Upstream provider consoles | P2 hygiene (was NOT part of any leak; routine rotation only) |
| T1.D | iBeta certification submission for Phase 5 | Legal / vendor process | Phase 5 trigger |
| T1.E | Stripe / payment gateway provisioning for Phase 4 | Vendor account setup | Phase 4 trigger |
| T1.F | APK signing keystore generation + 4 GitHub secrets | User keystore + secret-manager UI | Phase 5 trigger |
| T1.G | Custom postgres image with `postgresql-16-partman` + `postgresql-16-cron` (V57 Option A — full pg_partman) | Maintenance-window decision; `RUNBOOK_AUDIT_LOG_PARTMAN.md` Option B (skip GUC) is in effect today | P2 (V57 already fail-soft live) |
| T1.H | amispoof.com domain purchase + setup | Domain registration; Option B in `RESEARCH_PROCTORING_AMISPOOF_2026-05-02.md` defers this | Phase 4+ |
| T1.I | Hetzner self-hosted GitHub Actions runner re-pairing (Task #55) | Runner shows online but does not pull jobs; needs SSH-level inspection of `_work/` quarantine OR Runner-Group repo-access scope adjustment in GitHub org settings | P0 per CICD_AUDIT but cosmetic-only because we already have ubuntu-latest fallbacks queued (T4.A) |
| T1.J | Hetzner CX43 vertical scale or runner pool expansion | Hetzner console | Decide once T4.A lands |

---

## Tier 2 — Decisions awaiting the user

| ID | Decision | Recommendation | Blocking |
|---|---|---|---|
| T2.1 | Proctoring direction A/B/C | **B** (extract submodule, defer amispoof.com) — confirmed in `RESEARCH_PROCTORING_AMISPOOF_2026-05-02.md` | T5.4 |
| T2.2 | Bifurcated `User` domain | **Keep both + ArchUnit guard** — shipped via PR #63 | (closed) |
| T2.3 | Web `IFoo` interface convention (Quality P0-Q3) | **Keep** — matches Inversify DI pattern, solo-dev preference | T4.2 cleanup scope |
| T2.4 | V56-real — drop `refresh_tokens.token` plaintext column | Schedule for **2026-05-09** (T+7d soak from 2026-05-02 rebuild). Now safer because PR #71 fix is live and refresh-token mint flow is healthy. | T5.6 |
| T2.5 | Developer portal / widget demo gating | **Already public** — verified at HEAD (`App.tsx:223-226` in `<PublicLayout>`); SENIOR_UIUX P0-1 closed by inspection | (closed) |
| T2.6 | "Fix all" mandate scope on prod-side actions | **Standing approval until otherwise told** — destructive actions still ask, audit-driven rebuilds proceed | (process) |

---

## Tier 0 — INVESTIGATION 2026-05-07 P0 batch (highest priority, dispatched 2026-05-07 06:00 UTC)

Six-lens audit on 2026-05-07 surfaced 10 P0 items. Source: `INVESTIGATION_MASTER_2026-05-07.md` (synthesis) + 6 sibling docs. Plain-language description for each.

### T0.1 — Legacy `/2fa/verify-method` 2FA bypass [P0, agent-actionable]
`AuthController.java:526-532` accepts ANY non-empty `assertion` string for FINGERPRINT/HARDWARE_KEY without signature/public-key/sign-counter checks; audit log records "success." N-step `WebAuthnVerifySupport` does this correctly — legacy route was missed. **Fix**: delegate to `WebAuthnVerifySupport.verifyAssertion(...)` or remove the legacy route if no client uses it.

### T0.2 — Embedding encryption never invoked [P0, agent-actionable]
`pgvector_embedding_repository.py` and `pgvector_voice_repository.py` write `embedding_ciphertext` on save but `find_similar` / `find_by_user_id` read the plaintext `embedding` column. `decrypt_vector` defined at `embedding_cipher.py:75` and **called nowhere**. **Fix**: replace plaintext column reads with decryption from ciphertext, then drop plaintext column once verified. Embedding-at-rest "encryption" is theater until this lands.

### T0.3 — `WatchlistCheckHandler` is a hardcoded mock in production [P0, decision-then-agent]
Live `@Component` returning `cleared=true, match_count=0` for every input (`WatchlistCheckHandler.java:14-50`). KYC/AML claim broken on any flow including `WATCHLIST_CHECK`. **Decision needed**: profile-gate to `@Profile("dev")` for now (default-safe — flow misses are explicit) OR commit to a real provider (Refinitiv/Dow Jones/etc.). **Default**: profile-gate this round, treat real-provider as a separate Tier-1 backlog.

### T0.4 — `live_camera_analysis.py` boot fail-open [P0, agent-actionable]
Returns `is_live=True` when `self._liveness_detector` is None (`live_camera_analysis.py:184-193`). DI failure at boot = silent fail-open. **Fix**: fail-closed (`is_live=False, reason="liveness_detector_unavailable"`) and add a startup health-check that aborts boot if detector is None.

### T0.5 — Account-lockout error never surfaces to user [P0, agent-actionable]
`AuthenticateUserService.java:79,127` throws `InvalidCredentialsException` for locked accounts. The dedicated `AccountLockedException` exists at `AccountLockedException.java:7` with `remainingLockTimeSeconds` but is never thrown. Frontend has full i18n keys for `ACCOUNT_LOCKED` (`web-app/.../tr.json:1576`) — dead code. Server lockout works (5 attempts → 15 min); only the surfacing is broken. **Fix**: throw `AccountLockedException` with remaining seconds when lockout fires; map in `GlobalExceptionHandler` to a structured 423 LOCKED response carrying the seconds.

### T0.6 — OTP no per-code attempt counter [P0, agent-actionable]
`OtpService.java:29-43` keeps the OTP on mismatch (no counter, no delete). Only defense is 30/min/IP `mfa-step` rate-limit. ~150 guesses/code against 10⁶ space; rotating IPs improves attacker odds. NIST 800-63B requires 3-5 failures then invalidate. **Fix**: add `attempts INTEGER NOT NULL DEFAULT 0` to OTP entity (or Redis key), increment on mismatch, invalidate at 5, surface remaining attempts in error response.

### T0.7 — `tenants.max_users` never enforced [P0, agent-actionable]
Field exists at `Tenant.java:86-88` (default 100), surfaced in admin UI; zero insert-path readers. **Fix**: in `RegisterUserService` (and `ManageUserService.create`) check `userRepository.countByTenantId(tenantId) < tenant.getMaxUsers()` before insert; new error code `TENANT_USER_QUOTA_EXCEEDED`. Decision needed on default cap policy for unmigrated tenants — sensible default is 1000 with admin-overridable.

### T0.8 — Suspended tenants keep minting JWTs [P0, agent-actionable]
`Tenant.canAcceptUsers()` exists (`Tenant.java:249-251`) with zero non-DTO callers. `AuthenticateUserService` has no `tenant.isActive()` gate. **Fix**: gate auth path with `if (tenant.getStatus() != ACTIVE) throw TenantSuspendedException` mapping to 423; same gate in token-refresh path.

### T0.9 — Anti-replay spot-check defeated by corrupt frames [P0, agent-actionable]
`verify_puzzle.py:171-196` only counts `is_live=False` outcomes as failures; any `continue` (decode error, detector exception) skips silently. 3 corrupt JPEGs → `failed_count=0` → spot-check pass. **Fix**: count exceptions/decode-errors as failures, raise `failed_count` and abort spot-check on threshold.

### T0.10 — Face confidence fallback override [P0, agent-actionable]
`FaceAuthHandler.java:65-75` and `AuthController.java:509-518` fall back to hardcoded 0.7 cosine threshold when processor's `verified` field is missing/false, ignoring the adaptive aging threshold. Override never logs. **Fix**: trust the processor `verified` field; on missing field log + reject; remove the duplicated fallback in both call sites.

### T0.11 — INVESTIGATION P1 hardening backlog [staged after P0 batch]
Round 2-6 in `INVESTIGATION_MASTER_2026-05-07.md`: AddressProofHandler real impl or profile-gate, LoggerService prod wiring, occlusion implementation, NFC MRZ wiring, access-token TTL = 15 min, voice/device caps, OAuth2 client RBAC, `/userinfo` scope filter, client_secret rotation, per-tenant rate limit, BiometricService underscore-prefix surfacing, error-shape unification, face-verify response shape, RFC 8252 redirect_uri schemes, AuthSessionRepository contract, AuditEventPublisher exception counter, 3 audit-log blind spots, `/2fa/verify*` HTTP status corrections, anti-spoof contradiction policy, SoftDeletePurgeJob default-on confirmation.

---

## Tier 3 — Next active wave (agent-actionable, dispatch when quota window opens)

These are the highest-leverage open items, ranked. Each is scoped tight enough for a single sub-agent to ship in one PR.

### T3.1 — CI/CD pipeline P0 fixes (CICD_AUDIT)
- **T3.1.a** — Move bio CI 5 jobs (`Lint & Type Check`, `Unit Tests`, `Security Scan`, `Integration Tests`, `Build Frontend`) from `[self-hosted, linux, x64]` to `ubuntu-latest`. Bio CI dead 27 days; 82/100 cancelled, 2/100 success.
- **T3.1.b** — Move api `Integration tests (Testcontainers)` job to `ubuntu-latest`. Currently queues 5h+ then cancels; 0/30 success on `main`.
- **T3.1.c** — Fix `.github/workflows/deploy-landing.yml` — last successful run 2026-03-28 (5+ weeks). Switch to `ubuntu-latest` + rsync (web-app already does this with `HOSTINGER_SSH_KEY`).
- **T3.1.d** — Decide branch protection: enable on `main` for api/bio/web with 1-review requirement (admin bypass allowed for emergency hotfixes), OR explicitly document accept-no-protection rationale in `CICD_AUDIT_2026-05-04.md`. Currently OFF on all 5 repos.

### T3.2 — TEST_REVIEW deferred items
- **T3.2.a** — F6: 11 controller slice tests using `addFilters=false`. Switch to filter-chain-enabled `@WebMvcTest` so SecurityConfig regressions surface. (Memory rule `feedback_pr_review_workflow.md` directly applies.)
- **T3.2.b** — F8: Vitest "e2e" specs are unit-shaped — rename or relocate to `src/__tests__/`.
- **T3.2.c** — NEW: smoke test that loads `application-prod.yml` in CI to catch YAML duplicate-key bugs (would have prevented PR #62 emergency hotfix on 2026-05-02).

### T3.3 — SENIOR_UIUX P1-3 + P2 batch (deferred from today's UIUX-P1)
- **T3.3.a** — P1-3 sidebar dev-tools collapse (M-effort, single PR scope).
- **T3.3.b** — P2 batch (20 items): component decomposition (3 files >900 LOC remaining), zod parsing at API boundary, exhaustive-deps disabled in 28 spots, `any` casts in critical paths, microcopy consistency sweep.

### T3.4 — Login edge-case carryover
- **T3.4.a** — Item #10: Session/flow tight binding — DB migration + entity column for flow snapshot so admin can mid-flight reassign user without invalidating session. (Adds V58.)
- **T3.4.b** — Item #7: "Adaptive" flow naming — UI hint not migration (per PR #65 deferral note).

### T3.5 — SENIOR_DB Appendix C derived actions
- **T3.5.a** — `flyway repair` on prod for V40/V41/V42/V43/V49/V50 NULL-checksum rows; then flip `SPRING_FLYWAY_VALIDATE_ON_MIGRATE=true`. Removes Task #80 emergency override.
- **T3.5.b** — Investigate the 12.6% `audit_logs.tenant_id IS NULL` paths; ship a one-shot backfill + tighten anonymous-endpoint audit-emission.
- **T3.5.c** — `VACUUM (FULL, ANALYZE) webauthn_credentials;` + check why autovacuum has never fired. (3 live / 27 dead is a local outlier.)
- **T3.5.d** — Unused-index audit: reset `pg_stat_user_indexes`, monitor for 7 days, then `DROP INDEX` for confirmed-zero-scan indexes. Caution: do NOT drop indexes on `webauthn_credentials`, `oauth2_clients`, `refresh_tokens`, `audit_logs` until traffic patterns settle post-rebuild.

### T3.6 — 2026-05-04 deploy follow-up
- **T3.6.a** — Rebuild api with PR #73 included (today's image is from PR #71). Deferred because #73's contents (SoftDeletePurgeJob `hardDeleteById`, WebAuthn `deleteByCredentialId` enrollment-revoke, `Locale.ROOT`, OAuth2 `invalid_token`) are not user-visible blockers.
- **T3.6.b** — Confirm post-#71 prod stability over 24h. If clean, close P0-PROD definitively in CHANGELOG.

---

## Tier 4 — Open backlog (leverage-ranked)

### T4.1 Test infrastructure (carryover from `TEST_REVIEW_2026-05-01.md`)
- F7 — JaCoCo + 70% gate on `mvn verify` (P1)
- F11 — Java test factory builders (`aUser().withEmail("x").build()`) (P2)
- F12 — MSW + API contract tests on web side (P2)
- F13 — k6 load tests not invoked from CI (P2)
- F14 — Audit-log emission asserted at port-mock layer, not row count (P2)
- F17 — No CodeQL / Semgrep / DAST despite RS256 + TOTP + WebAuthn surface (P1, ops-coordination)

### T4.2 Quality cleanup (carryover from `QUALITY_REVIEW_2026-05-01.md`)
- P1-Q8 — Service-class naming inconsistency (P1)
- P2-Q11..Q16 — bio `container.py` 1133 LOC, dead `@deprecated` aliases, dup script trees, 16 `@SuppressWarnings`, MDC under-used, audit-log prefix inconsistency
- P3-Q17..Q22 — minor hygiene

### T4.3 Frontend P3 (carryover from `FRONTEND_REVIEW_2026-05-01.md` + UI/UX 2026-05-04)
- 11 P3 items in `SENIOR_UIUX_REVIEW_2026-05-04.md`

### T4.4 Security tail
- See `SECURITY_REVIEW_2026-05-01.md` deferred P2/P3 items.
- ✅ DeviceController WebAuthn boundary — closed by PR #66 today.
- ✅ `/oauth2/userinfo` type-claim check — closed by PR #67 today.

### T4.5 RLS hardening (Task #27, multi-day)
Application DB role + `FORCE ROW LEVEL SECURITY` + per-table policies. Currently RLS is opt-in via app-level `SET app.current_tenant_id`; hardening makes it impossible for any session to bypass. Multi-day scope; needs dedicated session.

### T4.6 Architecture (carryover)
- DTO triplication — Performance + Architecture review item
- ✅ Audit-log partitioning advanced — closed by PR #68 today (V57 pg_partman, fail-soft)

### T4.7 Audit-log tenant_id NULL backfill (NEW from Appendix C)
12.6% (140/1107) audit-log rows still have `tenant_id IS NULL`. Drift up from 12.4% on 2026-04-30 means new rows are still being written without it. Two work items:
- One-shot backfill via `audit_logs.user_id → users.tenant_id` JOIN (mirrors V46)
- Audit emission tightening: anonymous endpoints (login attempt before auth, oauth2 token endpoint, etc.) need a deliberate decision to write `tenant_id` (e.g. tenant from email-domain lookup, or explicit "system" tenant UUID)

### T4.8 Unused-index audit (NEW from Appendix C)
25+ indexes with `idx_scan = 0`. Need a 7-day post-stats-reset re-audit before any `DROP INDEX`. Some are likely fine to keep (FK-covering indexes that just haven't seen traffic yet); some are likely droppable (e.g. duplicate composite indexes).

### T4.9 webauthn_credentials VACUUM (NEW from Appendix C)
27 dead / 3 live, never autovacuumed. ✅ **`VACUUM ANALYZE` run 2026-05-04 12:27 UTC — ratio 9.00 → 0.00, 14 dead tuples reclaimed.** Follow-up: tune `autovacuum_vacuum_scale_factor` for low-row-count tables so this doesn't recur.

### T4.12 Documentation gaps (NEW from `DOC_AUDIT_2026-05-04.md` commit `f2efeac`)

**P0 — quick wins, ≤2 hours each:**
- **T4.12.a** — Add `SECURITY.md` to all 6 repos (parent + 5 submodules). Vulnerability-disclosure policy is the single highest-priority gap on an auth/biometric platform with JWT + OAuth2 + WebAuthn + RFC 6749 §10.4 family-revoke. Use the GitHub-recommended template; route to `info@app.fivucsas.com`.
- **T4.12.b** — Add `LICENSE` file to every repo. All READMEs display MIT badges but no `LICENSE` file exists anywhere. Legally weak. XS effort.
- **T4.12.c** — Add `landing-website/README.md`. The repo is currently completely undocumented.

**P1 — multi-day initiatives:**
- **T4.12.d** — Tenant onboarding playbook in `docs/01-getting-started/tenant-onboarding.md`. Covers OIDC client provisioning, redirect-URI allowlist, SDK install, first-signup → first-MFA flow.
- **T4.12.e** — ADR (Architecture Decision Records) directory `docs/adr/`. Backfill the major decisions that currently live only in CHANGELOG narrative + session memos: hosted-first OIDC, pgvector, MobileFaceNet removal, Facenet512, log-only client embeddings, RFC 6749 §10.4 family-revoke, V53 BEFORE-DELETE trigger pattern, Persistable<UUID> wire-format trade-off.

**P2 — cleanup:**
- **T4.12.f** — `docs/` submodule has duplicate hierarchies (`02-architecture/` vs `architecture/`, `05-testing/` vs `testing/`, `01-getting-started/` vs `guides/`). Broken links to `docs/4-testing/`, `docs/5-security/`, `07-status/IMPLEMENTATION_STATUS_REPORT.md`. Consolidate into the numbered tree.
- **T4.12.g** — `/opt/projects/infra/` has 8 strong runbooks but no public docs-index entry points to them. Cross-link from `docs/06-operations/` (or wherever the right index lives).
- **T4.12.h** — Dated-doc reorganization: move 25+ `AUDIT_*` / `*REVIEW_*` / `SESSION_STATUS_*` / `ROADMAP_*` / `ANALYSIS_*` / `RESEARCH_*` files out of parent root into `docs/reviews/YYYY-MM-DD/<slug>.md`. **Hold for explicit user OK** — moves git history for many files.

### T4.11 User-reported bugs 2026-05-04 afternoon (NEW)

User testing surfaced 6 issues. Each entry below shows status as of 12:45 UTC.

- **USER-BUG-1 — Documentation gap audit (META).** Research what a professional production-grade SaaS platform should document, audit current state, recommend reorganization. ⏳ T-DOC-AUDIT in flight.
- **USER-BUG-2 — Guest invitation creation crashed with `column "metadata" is of type jsonb but expression is of type character varying`.** Root cause: `GuestInvitation.metadata` had `@Column(columnDefinition = "jsonb")` but no `@JdbcTypeCode(SqlTypes.JSON)`, so Hibernate bound the String as varchar at runtime. ✅ Closed by api PR #74 (squash `5096e8d`); api container rebuilt + recreated 2026-05-04 12:39 UTC with image `0fd02c48`. Operator-side: try `POST /api/v1/guests/invite` again — should now return 201.
- **USER-BUG-3 — SMS step has black/wrong colors for code label and resend button in dark mode.** `SmsOtpStep.tsx` lines 102-131 (TextField label) + 167-199 (resend Button). Likely missing theme-aware overrides on `MuiInputLabel-root` color and on the outlined Button text color. ⏳ T-WEB-USERBUGS in flight.
- **USER-BUG-4 — Biometric Tools → Face Search returns "Eşleşme Bulunamadı" for a face that successfully logs in via face-verify.** Same face, different result. Likely tenant-scope mismatch in the search endpoint, OR a stricter threshold than verify, OR an image-encoding mismatch. ⏳ T-FACE-SEARCH in flight.
- **USER-BUG-5 — Auth Methods Testing page mostly broken.** Most stubbed cards don't let the user click through. Possibly stale imports after PR web#69 EnrollmentPage decomposition relocated method-flows. ⏳ T-WEB-USERBUGS in flight.
- **USER-BUG-6 — Settings page "Two-Factor Authentication" section is misleading.** Header says "Required by your organization / Managed by your organization's admin via Auth Flows" but then shows 3 buttons (Setup TOTP, Register Passkey, Register Hardware Key) which are actually for *device registration*, not method enablement. Rename + reword + i18n. ⏳ T-WEB-USERBUGS in flight.

### T4.10 Copilot-deferred items from today's review (NEW from T-COPILOT-DEEP report)
Issues raised by Copilot that the post-merge follow-up agent deliberately deferred — each has a real fix but is out of scope for a single PR.

- **T4.10.a (api PR #66 follow-up)** — `WebAuthnCredentialService.saveCredential` lacks `completeEnrollment` rollback on partial failure. Needs proxy-level integration test + transaction redesign. **P2 — security-positive but not user-blocking.**
- **T4.10.b (api PR #68 follow-up)** — V57 pg_partman migration has 3 secondary issues: RLS predicate not yet plumbed into the partitioned hierarchy, missing FK on partition key, oversized legacy 2026-01..2026-06 static partition. V57 is fail-soft and not yet deployed via Option A; redesign needs prod-data testing in a dedicated PR. **P1 — must-fix before T1.G Option A (custom postgres image with pg_partman + pg_cron).**
- **T4.10.c (api PR #67 follow-up)** — `/oauth2/userinfo` parses the JWT twice (once for type-claim extract, once for email). Minor perf. Would require widening `JwtService.extractAllClaims` visibility from package-private to public, OR extracting both claims in a single parse via `extractClaim`-with-tuple. **P3.**
- **T4.10.d (api PR #65 follow-up)** — `verifyUserCanCompleteFlow` duplicated across `AuthenticateUserService` and `ExecuteAuthSessionService`. Pure refactor; pull into a shared service. **P2 — Quality-cleanup tier.**
- **T4.10.e (api PR #69 follow-up)** — `isTokenValid` is not exercised in the expired-token test path. Minor coverage gap; ship a single test case calling `jwtService.isTokenValid(alreadyExpired)` and asserting false. **P3 — Test-infra tier.**
- **T4.10.f (web PR #67 + PR #68 follow-ups)** — Cosmetic: `vite.config.ts` has a duplicate CSP block (one in JS, one in injected meta — only one path is hot); PR #68 ratchet's doc-name nit. **P3 — single-PR cleanup.**

---

## Tier 5 — Long-running, scheduled

| ID | Item | Trigger | Phase |
|---|---|---|---|
| T5.1 | Phase 4 productization — self-serve signup, Stripe, tenant-branded hosted login, status page | T1.E (Stripe) ready | Phase 4 |
| T5.2 | Phase 5 mobile parity (KMP Compose UI) + iBeta Level-1 prep | T1.F (keystore) + T1.D (iBeta) | Phase 5 |
| T5.3 | Aysenur rPPG integration | Post-rebase, into proctoring submodule | Phase 4+ |
| T5.4 | Proctoring submodule extraction (Option B) — Phase 1 `shared-detection`, Phase 2 `proctoring-engine` | Gated on T1.I CI runner stall (operator) | Phase 4 |
| T5.5 | JWT soak end (Task #82) — flip `ALLOW_HS512=false`, set issuer/audience env, restart api | ~2026-06-01 (env-only, no rebuild) | Scheduled |
| T5.6 | V56-real — drop `refresh_tokens.token` plaintext column | T2.4 confirmed; ~2026-05-09 | Scheduled |

---

## Tier 6 — Today's prod state and verification cadence

| ID | Item | Cadence |
|---|---|---|
| T6.1 | Flyway repair (Task #80) | Within next 7 days |
| T6.2 | DR drill cadence (after the 2026-04-30 one-off success) | Weekly |
| T6.3 | Rebuild for PR #73 (T3.6.a) | When #73 contents become user-visible OR next batch lands |
| T6.4 | 24h post-#71 prod-stability confirmation | 2026-05-05 by ~12:30 UTC |
| T6.5 | Smoke-test live login from a real user device | Ongoing (user-driven) |

---

## Tier 7 — Next-phase preparation (foundation for "complete project perfectly")

These are not blockers for current work but should be set up now so Phase 4+ rolls smoothly.

### T7.1 — Branch protection on `main`
Per CICD_AUDIT P0: enable 1-review requirement on api/bio/web `main`. Admin bypass allowed for emergency hotfixes. Disclosed in repo settings + CHANGELOG so collaborators understand the discipline shift.

### T7.2 — Senior-reviewer doc archive
The growing collection of dated review docs (`SENIOR_DB_REVIEW_*`, `SENIOR_UIUX_REVIEW_*`, etc.) should move to `/opt/projects/fivucsas/docs/reviews/` rather than the project root. One commit, no behavior change.

### T7.3 — RUNBOOK_AUDIT_LOG_PARTMAN.md operator decision Option A vs B
T1.G is the long-form Option A; today's V57 fail-soft is Option B. Document the decision criteria explicitly so the next operator knows what cadence to monitor.

### T7.4 — `application-prod.yml` content-test (NEW T3.2.c) + add similar config-validation tests
After T3.2.c lands, generalize the pattern: a per-profile config sanity test that loads each YAML and asserts (a) no duplicate keys, (b) all `${ENV_VAR}` placeholders are reachable from a known list. Closes a class of boot-time failures.

### T7.5 — Memory hygiene
The auto-memory `MEMORY.md` index has accumulated 13 session notes. Consolidate sessions older than 7 days into a single archive entry; keep recent sessions verbatim for resume context. Manual one-shot.

### T7.6 — Secret-rotation calendar
Document a 90-day rotation cadence for: `JWT_SECRET` (kid-based, no logout), Twilio API token, SMTP password, biometric API key, refresh-token plaintext column drop (one-shot). Calendar lives in `infra/RUNBOOK_SECRET_ROTATION.md`.

### T7.7 — `docs/architecture/` synthesis
The three senior reviews (Architecture, Principal, DB) plus today's CICD_AUDIT contain the full picture of the platform. A Phase-4 readiness doc should distill them into one architecture overview that a new hire can read in 30 minutes.

### T7.8 — Status page + uptime tracking (Phase 4 gate)
Pick a vendor (Statuspage, BetterUptime, Instatus) and stand up a basic page showing api / bio / web / verify / demo / landing health. Operator-driven choice; product-side prerequisite for self-serve Phase 4.

---

## Closed since 2026-05-02 — do not re-list

- 9 backend PRs `#63–#71` — see `identity-core-api/CHANGELOG.md` 2026-05-04 entry; #72 docs sweep + #73 Copilot follow-ups also landed.
- 4 web-app PRs `#67–#70` — see `web-app/CHANGELOG.md` 2026-05-04 entry; #71 docs sweep + #72 UIUX P1 + #73 Copilot follow-ups also landed.
- 1 bio PR `#69` (docs).
- T-MERGE / T-FRONTEND-HYGIENE / T-SEC-TAIL / T-ARCH / T-LOGIN-EDGE / T-TEST-INFRA-F15 / T-DB-P0 / T-QUALITY / T-UIUX-P1 / T-CICD-AUDIT / T-COPILOT-DEEP / T-DOC-SWEEP — all dispatched and reported.
- DB-P0-1 (chain contiguity) — pre-empted by T-ARCH's V56 placeholder
- DB-P0-2 + DB-P0-3 — closed by PR api#70
- F15 deterministic clock — closed by PR api#69
- Q1-Q7 lint ratchet, Q1-Q7 EnrollmentPage decomposition — closed by PR web#68 + #69
- DeviceController WebAuthn boundary — closed by PR api#66
- `/oauth2/userinfo` type-claim — closed by PR api#67
- pg_partman audit-log advanced — closed by PR api#68 (fail-soft)
- **P0-PROD refresh-token mint** — closed by PR api#71, **DEPLOYED 12:01 UTC**
- SENIOR_UIUX P0-1 + P1-1 + P1-2 + P1-4 — closed by PR web#72
- T-DOC-SWEEP per-submodule docs — closed by api#72 + web#71 + bio#69 + parent `28f2b33`
- T-CICD-AUDIT — closed by parent `ac0b78d` (CICD_AUDIT_2026-05-04.md)

---

## What I won't do without explicit user go-ahead

- Touch the prod live `JWT_SECRET` on Hetzner (kid registry is the no-logout path; rotation per T5.5)
- Force-push `git filter-repo` on any submodule history (T1.B)
- Buy domain names or stand up new public services
- Rotate Twilio / SMTP credentials (T1.C)
- Touch `feat/anti-spoof-pipeline` or `liveness_capture` branches before T2.1 confirms direction
- Hard-delete user rows outside the `SoftDeletePurgeJob` 30-day path (memory `feedback_no_hard_delete_users.md`)
- Drop refresh-token plaintext column before T+7d soak (T5.6 / 2026-05-09)
- Schedule a Hetzner downtime window (T1.G Option A custom postgres image)
- Change branch-protection settings without confirmation (T7.1)

---

## Snapshot questions for the user (decision queue)

1. **T2.4 / T5.6** — green-light V56-real (drop `refresh_tokens.token` plaintext column) on or after **2026-05-09**?
2. **T1.B** — proceed with the GDPR fixture history rewrite, or accept the cosmetic-only carry-forward (leaked secret already rotated 2026-04-30)?
3. **T7.1** — enable branch protection on api/bio/web `main` with 1-review (admin bypass)?
4. **T1.G** — Option A (custom postgres image with pg_partman + pg_cron, ~30 min maintenance window) or stay on Option B (V57 fail-soft GUC, zero downtime)?
5. **T1.I** — diagnose Hetzner self-hosted runner stall (Task #55), or fully commit to ubuntu-latest fallbacks per T3.1?
6. **T5.5** — `/schedule` an agent for 2026-06-01 to flip the JWT soak vars?
7. **T7.5** — consolidate older session memories into an archive entry now, or wait for the auto-memory system to handle it?

---

## Appendix — Today's PR ledger (all 16 squashed to `main`)

### identity-core-api
| PR | Squash | Scope |
|---|---|---|
| #63 | `432b4d3` | ArchUnit `entity.User` import boundary |
| #64 | `2d958c5` | JWT kid-based key registry |
| #65 | `d224ad1` | Login edge cases #1/#3/#4/#5/#6/#9 |
| #66 | `e986609` | DeviceController WebAuthn service boundary + ArchUnit guard |
| #67 | `2b49bd5` | `/oauth2/userinfo` type-claim |
| #68 | `d95425c` | V57 pg_partman + V56 placeholder + Testcontainers IT |
| #69 | `70036a5` | F15 deterministic clock |
| #70 | `1e23ef0` | User `@SQLDelete` + `@SQLRestriction` |
| **#71** | **`a77c844`** | **P0-PROD refresh-token `Persistable<UUID>` (DEPLOYED)** |
| #72 | `eaf8111` | docs sweep |
| #73 | `1c9e9be` | Copilot follow-ups (Locale.ROOT, OAuth2 invalid_token, SoftDeletePurgeJob hardDelete, WebAuthn enrollment-revoke) |

### web-app
| PR | Squash | Scope |
|---|---|---|
| #67 | `319b457` | P3 hygiene (title, setTimeout, CSP, NotificationPanel pause-on-hidden) |
| #68 | `386b904` | Lint ratchet 90 → 2 |
| #69 | `35c116c` | EnrollmentPage decomposition by biometric method |
| #70 | `9bcf16a` | NfcStep timeout copilot nit |
| #71 | `120c35b` | docs sweep |
| #72 | `bfb31c7` | SENIOR_UIUX P1 batch (IntegratorLandingCard + 11 aria-labels + nav rename) |
| #73 | `e47d464` | Copilot follow-ups |

### biometric-processor
| PR | Squash | Scope |
|---|---|---|
| #69 | `d91760a` | docs sweep (alembic in runtime image) |

---

*Last updated: 2026-05-04 12:50 UTC — added §T4.11 (6 user-reported bugs from afternoon testing). USER-BUG-2 (guest invitation jsonb) closed in-session: api PR #74 merged + rebuilt. T-DOC-AUDIT, T-WEB-USERBUGS, T-FACE-SEARCH dispatched in parallel for the remaining 5.*
