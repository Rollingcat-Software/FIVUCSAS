# FIVUCSAS — Auth Program Roadmap (2026-05-30)

> Consolidated tracker for the 2026-05-30 cross-device / authenticator / config-driven
> login program. Source of truth for the auth work; the parent `ROADMAP.md` links here.
> Design principle (settled): **secret generation/storage — TOTP seeds, passkeys, device
> keys — lives ONLY where there is OS-secure storage (native + desktop apps + the
> browser/OS passkey store), NEVER on mobile-web; mobile-web only consumes factors.**
> Plan of record: `~/.claude/plans/shiny-munching-feigenbaum.md`.
> Reversibility rule for any login-path change: `feedback_reversible_risky_changes`
> (ship dark → staging → canary one tenant → broad; feature-flag default OFF).

---

## 1. SHIPPED + DEPLOYED (verified live)

All items below are merged to `main` (submodules) and deployed/verified in prod on 2026-05-30.

| Capability | What shipped | PRs | Deploy / verification |
|---|---|---|---|
| **Passkey hybrid web login** | Discoverable + usernameless passkeys. `register-options` → `residentKey=required` + `UV=required`; `WebAuthnCredential` gains `discoverable` + `user_handle` (**Flyway V72**); NEW anonymous `POST /webauthn/passkey/authenticate-options` (empty `allowCredentials`) + `POST /webauthn/passkey/authenticate` (resolves user by `userHandle`, mints session), both `permitAll` in SecurityConfig. Web adds a "Sign in with a passkey" button on `verify-app/HostedLoginApp.tsx` + `LoginPage.tsx` → `navigator.credentials.get()` with empty `allowCredentials` → browser-native hybrid QR ("use your phone"), no app needed. **This is THE cross-device answer.** | api #161, web #137 | api rebuilt, V72 applied to `identity_core`; `/webauthn/passkey/authenticate-options` returns 200 in prod; register→login 201/200 confirmed. web → Hostinger (`app.fivucsas.com` bundle `index-B7OwE7r8.js`) + verify.fivucsas.com Docker rebuild (bundle `index-BBN--UaC.js`, `/login` 200). |
| **No-Firebase number-matching approve-login** | Operator chose NO Firebase → poll-based. Redis-backed (modeled on `QrSessionService`): `POST /auth/approve-login/session {email}` → `{sessionId, matchNumber, …}`, GET poll, `GET /auth/approve-login/pending` (auth'd approver), `POST …/decide {decision, matchNumber}` (mints tokens like QR approve; unknown-email decoy = no oracle). **`matchNumber` is a zero-padded STRING ("07")** — web initially typed it `number` (would drop leading zeros) → fixed. Web initiator + client-apps approver share a stack (`ApproveLoginApi` / `Repository` / `ViewModel`, reuses the `NfcApproval*` convention). | api #161, web #137, client-apps #53 | `/auth/approve-login/session` returns 200 in prod (same rebuild as passkeys). Approver UI SCREEN deferred (gated on Phase 0 — see In-Flight). |
| **NFC chip-trust / serial canonicalization / guest-email** | Chip passive-auth trust wired (api consumes bio `POST /nfc/verify-authenticity`, **fail-closed** — error/`NO_TRUST_STORE`/non-authentic ⇒ reject); NFC serial canonicalized to UPPERHEX-no-separators at the ingest boundary so a mobile-enrolled card matches a web verify and vice-versa; guest-invite email gets EN/TR i18n + tenant name. **Flyway V72** family also covers the NFC credential columns. | api #159, bio #131 | bio + the eMRTD verifier shipped earlier same day; api rebuilt with #159. **Operator-blocked at runtime:** CSCA roots must be dropped into `NFC_CSCA_TRUST_DIR` before any SOD-carrying client passes (serial-only flows unaffected). |
| **Mobile login flicker + MFA-completion fixes** | (1) v5.2.2 — login flicker / can't-pass-MFA: `MfaHandoff` JSON carried in the nav route instead of a fresh `LoginViewModel` factory instance (which had a null `mfaSessionToken` → instant bounce). (2) v5.2.3 — false "Verification failed" after a server `200 AUTHENTICATED`: publish `_authResult` + `Authenticated` FIRST, then run `cacheLoginData`/`registerPushToken` best-effort (`runCatching`); outer catch returns early if an auth result already exists. Regression test `MfaFlowAuthenticatedRegressionTest`. (3) UX: dropped the divergent guest-login button, added show/hide password, fixed system-nav-bar covering the bottom Cancel. | client-apps #44, #46, #52 | Releases **v5.2.2 / v5.2.3** published (signed APK, cert SHA-256 `5e403eca…`, versionCode 9/10). **NOTE:** these are real fixes, but a SEPARATE on-device login bug remains OPEN — see In-Flight / Waiting-on-operator. |
| **Web puzzle/quality + bio liveness** | Client biometric quality scoring + passive-liveness gate (web); liveness on bio `/enroll/multi`; CPU-only server NFC trust verify. | web (WS1), bio #131 | Deployed with the same wave (see parent CLAUDE.md "Operator reality (2026-05-30)"). |
| **Desktop installers** | Desktop Linux/Windows installers — OAuth loopback (RFC 8252) + OS token storage. | client-apps (WS4) | Scaffolding shipped; Phase-2 desktop exit per parent `ROADMAP.md` (2026-06-27 target). |

**Integration-gate one-time exception (logged here intentionally):** the
`Integration tests (Testcontainers)` gate was made REQUIRED (P1-1, #155) while NEVER
green (deep pre-existing test-infra rot). The operator authorized a **ONE-TIME
admin-merge exception** for the four orthogonal auth PRs above (the gate stays REQUIRED
for everyone else), plus manual cross-tenant staging smoke. #160 began genuinely greening
the gate; the remaining work is tracked below. **Do not treat the gate as trustworthy
until that task closes.**

Rollback image: `identity-core-api-identity-core-api:rollback-pre-passkeys-20260530`.

---

## 2. IN-FLIGHT

### Config-driven login (password-as-a-factor + usernameless-in-flow)

Plan: `~/.claude/plans/shiny-munching-feigenbaum.md`. Turns login into a pure render of the
tenant's auth-flow config: password becomes a normal, removable Layer-1 method (not a hard
gate); usernameless methods (passkey / approve / QR) become flow-aware Layer-1 methods that
hand off to additional factors instead of minting tokens directly; a new unauthenticated
`GET /auth/login-config` endpoint drives the UI; the flow builder gains CHOICE-step editing
and usernameless-Layer-1 marking.

- **Reversibility (mandatory):** the engine change is gated by the feature flag
  **`app.auth.config-driven-login`, default OFF** = byte-identical to current
  password-first behavior, per-tenant overridable for a canary. `login-config` returns the
  legacy password-first shape when the flag is off; the web UI renders purely from
  `login-config`, so flipping the flag reverts everything with **no web redeploy**.
- **Rollout:** ships **dark → staging → canary one tenant → broad**. A tagged rollback
  image is kept. Don't flip any tenant's default flow until the engine + UI are proven on a
  canary.
- **Status:** api workstreams (A model + B engine + C discovery + F guardrails + G
  reconcile) and web workstreams (D UI + E builder + F dialog + G reconcile) are in
  progress in worktree-isolated branches; lands with its own PRs.
- **Docs note:** internals are intentionally NOT documented in the per-repo CLAUDE.md
  files yet — they land with the PRs.

---

## 3. WAITING ON OPERATOR

- **Mobile-app login debug-build logcat.** A separate on-device login bug persists even on
  v5.2.3: the server returns `200 AUTHENTICATED` (prod logs confirm — no 500, refresh token
  created) but the app still shows "Verification failed". Every server-side throw has been
  ruled out. Needs the developer's **debug-build `adb logcat`** to name the on-device error.
  This Hetzner box cannot run an Android emulator (no `/dev/kvm`). See
  `client-apps/docs/MOBILE_TESTING_GUIDE.md`.
- **NFC trust roots + test cards.** Drop **ICAO CSCA roots (Turkey)** into the bio
  container's `NFC_CSCA_TRUST_DIR`; provide **physical eID / PACE test cards** for NFC
  passive-auth + PACE validation. Until the trust store is populated, any client that SENDS
  a SOD is rejected (`NO_TRUST_STORE`); serial-only flows are unaffected.
- **Try passkey + install v5.2.3.** Operator to exercise the new passkey login on a real
  device and install the v5.2.3 release (was workaround-using web during the data-cap
  window).

---

## 4. TRACKED / BACKLOG

- **Genuinely green the integration-test gate.** #160 started it; remaining causes include
  `java.time.Instant` JDBC bind in seeds, `unique_tenant_email` seed collisions, CI not
  running biometric-processor `:8001` / Redis `:6379`. The **one-time admin-merge
  exception is logged** (above); the gate stays REQUIRED for everyone else and is to be made
  trustworthy. (Task #15.)
- **Marmara 3FA default-flow flip.** Set Marmara's default APP_LOGIN to a 3-step flow
  (Layer 1 = CHOICE of all identity-capable methods incl. PASSWORD + usernameless; Layers 2
  & 3 = CHOICE of all methods). **Canary only, after the config-driven engine is proven.**
  Apply via the flow API with the default-impact check first; rollback runbook in
  `identity-core-api/docs`.
- **Mobile config-driven login.** Point the mobile login at `login-config`, add
  PASSKEY / APPROVE_LOGIN / QR branches, stop defaulting to a password form except as the
  genuine fallback. **Gated on the Phase-0 mobile login-bug fix** (shared stacks already
  merged; screens deferred).

---

## Cross-references

- Plan: `~/.claude/plans/shiny-munching-feigenbaum.md`
- Reversibility rule: memory `feedback_reversible_risky_changes`
- Program detail: memory `project_auth_enhancements_20260530`, `project_mobile_login_saga_20260530`
- Per-repo specifics: `identity-core-api/CLAUDE.md` (V72, passkey/approve-login endpoints,
  integration-gate note), `web-app/CLAUDE.md` (passkey + approve-login UI), `client-apps/CLAUDE.md`
  (v5.2.3 fixes + approve-login approver stack)
- Parent product roadmap: `ROADMAP.md`
