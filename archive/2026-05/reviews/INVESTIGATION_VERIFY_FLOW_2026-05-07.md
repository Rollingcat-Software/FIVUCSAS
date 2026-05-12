# verify.fivucsas E2E Flow Audit — 2026-05-07

Read-only walkthrough of the hosted-login surface at `verify.fivucsas.com/login`
(also reached as `demo.fivucsas.com` with `client_id=marmara-bys-demo`). Code at
HEAD: `web-app/master`, `identity-core-api/master`. No code edited.

## Methodology

1. Walked every render branch of `HostedLoginApp.tsx`.
2. Walked the state machine in `LoginMfaFlow.tsx` (phases: `password` →
   `method-picker` → `mfa-step` → `complete`).
3. Read each step component: Password / EmailOtpMfa / SmsOtp / Totp / Face /
   Voice / Fingerprint / HardwareKey / NFC / QrCode.
4. Cross-referenced backend `OAuth2Controller.java` `/authorize`,
   `/authorize/complete`, `/clients/{id}/public`.
5. Compared findings against `INVESTIGATION_WIRES_2026-05-07.md` and
   `INVESTIGATION_PIPELINES_2026-05-07.md` to focus on NEW issues.
6. Verified the user's three reported bugs (PASSWORD-wrong-tenant,
   NFC double-message, SMS dark-input) and the two coordinator add-ons
   (step-counter visibility, generic-error reappearance).

## Step-by-step walkthrough

### 1. URL-param parsing (`HostedLoginApp.tsx:83-97`)
`client_id`, `redirect_uri`, `state`, `nonce`, `code_challenge`,
`code_challenge_method`, `scope`, `ui_locales`, `theme`, `api_base_url`.
Defaults are forgiving (`scope` defaults to `openid profile email`,
`code_challenge_method` to `S256`). The `state` is echoed back on success
(line 356) — **but not on the `setFinalError` paths** (lines 332/338/350/381),
so a tenant that was watching for `state` to reappear on cancel/error sees
nothing. The user is left on `verify.fivucsas.com/login?...`.

### 2. Tenant-meta fetch (`HostedLoginApp.tsx:179-258`)
Calls `/oauth2/clients/{client_id}/public`. 404/400 → `paramError =
'invalidClient'`. Other failures → `metaLoadFailed` (retry button).
Timeout 10s.

**Gap**: when `client_id` resolves but the client is **`disabled`** at the
backend, `OAuth2Controller` returns 200 + meta with no `disabled` field;
the FE proceeds and only fails at `/authorize/complete` with a generic
exchange error. No early disabled-client UX.

### 3. Password step (`LoginMfaFlow.tsx:107-155`, `PasswordStep.tsx:1-161`)
Calls `authRepository.login({email, password})` — `AuthRepository.ts:54-83`
posts `/auth/login` with **email + password only**. There is **no `client_id`,
no tenant slug, no tenant_hint** sent. The user authenticates against the
*global* user table; tenant binding is checked only at
`/oauth2/authorize/complete` (`OAuth2Controller.java:359-366`) at the very end
of the flow, after the user has finished MFA.

**This is the user-reported P0 #1**: ahabgu@gmail.com (system tenant) on
`client_id=marmara-bys-demo` passes the password step because login does not
care which client they came from.

### 4. Method picker / MFA dispatch (`LoginMfaFlow.tsx:195-249`)
Step components emit a single `onSubmit` callback. `verifyStep`
(line 181) posts `/auth/mfa/step` with `{sessionToken, method, data}`.
Result branches: `AUTHENTICATED` → `onComplete`; `STEP_COMPLETED` → next step;
**any other status falls through to a generic
`t('widget.verificationFailed')`** (line 247). Backend can return a
`MfaStepResponse` with status `INVALID_CODE`, `RATE_LIMITED`, `LOCKED_OUT`,
`METHOD_ALREADY_USED` (per `identity-core-api/CLAUDE.md` PR #65) — none of these
are surfaced specifically; the user always sees "Verification failed."

### 5. NFC step (`NfcStep.tsx:30-261`)
`onSubmit` is fired inside the `reading` event handler at line 81-83 *after*
`setScanResult(serialNumber)` at line 79. The success Alert at line 191-194
renders as soon as `scanResult` is non-null. The parent
(`LoginMfaFlow.verifyStep`) then posts `/auth/mfa/step` and on backend
rejection passes `error` back through the `error` prop. Both `error` (line 168)
**and** `scanResult`-Alert (line 191) render simultaneously.

**This is the user-reported P0 #2**: "NFC belge başarıyla okundu!" + "Doğrulama
yapılamadı".

### 6. Hosted-login completion (`HostedLoginApp.tsx:263-397`)
Two paths: with `mfaSessionToken` → POST `/oauth2/authorize/complete`; without
→ GET `/oauth2/authorize` carrying `Authorization: Bearer {accessToken}`.
Both are caught at line 358 → only one specific error message
(`tenantMismatch`, lines 370-379). Every other failure mode (PKCE mismatch,
scope mismatch, redirect-URI exact-match miss, MFA session expired, MFA session
already consumed, code_challenge missing for public clients, etc.) collapses to
`hosted.exchangeFailed`.

## Findings table

| Sev | File:line | Issue | Fix sketch |
|---|---|---|---|
| P0 | `LoginMfaFlow.tsx:114` + `AuthRepository.ts:59` | `/auth/login` carries no `client_id`/tenant, lets cross-tenant users pass step 1 (user-reported #1) | Forward `_clientId` (already prop, currently `_`-prefixed unused — line 51) into `login(...)` and a new `tenantHint` field on `/auth/login`; backend rejects mismatch early with 403 + `tenantMismatch` error code |
| P0 | `NfcStep.tsx:79-83 + 168 + 191` | Success Alert (`scanResult`) and error prop render together — "successfully read" + "verification failed" (user-reported #2) | Don't render success Alert until parent confirms; alternatively, when `error` becomes truthy, also clear `scanResult` |
| P1 | `HostedLoginApp.tsx:332,338,350,381` | All non-tenant errors collapse to `hosted.exchangeFailed`. PKCE failure, expired/consumed MFA session, scope mismatch, redirect-URI mismatch all look identical to the user (coordinator-reported #2) | Inspect `error_description` for known substrings: `"MFA session expired"`, `"MFA session already used"`, `"MFA not completed"`, `"code_challenge"`, `"Invalid scope"`, `"redirect_uri"`. Map each to a dedicated `t()` key and a recovery action (re-login, contact-support, switch-account) |
| P1 | `HostedLoginApp.tsx:332,338,350,381` | `state` parameter is not echoed on error paths — RFC-6749 requires error to be returned to `redirect_uri` with `state`, but the hosted page just sets `finalError` and stays | When `redirect_uri` is known-safe, optionally redirect-back with `error=...&state=...` via a "Return to app" CTA; or document that this hosted page is the terminal failure surface |
| P1 | `LoginMfaFlow.tsx:247` | All non-`AUTHENTICATED`/`STEP_COMPLETED` MFA results collapse to `widget.verificationFailed`; no rate-limit / lockout / replay specific messages | Switch on `res.status`/`res.errorCode` and map each to its own i18n key (re-uses keys already in `tr.json`/`en.json` such as `auth.errors.locked`, `auth.errors.tooManyAttempts`) |
| P1 | `LoginMfaFlow.tsx:343` (`<QrCodeStep userId="mfa-session" ...>`) | Literal-string sentinel passed as a userId; the QR token is generated via session token but the prop name lies | Either remove the prop (refactor `QrCodeStep` to never need `userId` in MFA-mode) or pass `mfaSessionToken` and rename |
| P1 | `HostedLoginApp.tsx:418-420` | If framed, app renders `null` and *only* attempts top-window navigation in an effect. Result: blank tab if the frame-bust is blocked. No "click to open in new tab" fallback | Render a minimal "open in new window" CTA so non-script-driven framing isn't a dead end |
| P1 | `HostedLoginApp.tsx` (no disabled-client branch) | A revoked/disabled OAuth2 client returns meta successfully but fails at `/authorize/complete`. The user only learns at the very end | Add `disabled`/`revoked` field to `/oauth2/clients/{id}/public` response and render an upfront "this app is no longer enabled" panel |
| P1 | Step counter `MultiStepAuthFlow.tsx:552-565` (cross-cutting; mirrored in `LoginMfaFlow.tsx:421-430` which is the verify-app path) | `LoginMfaFlow` already renders `StepProgress` at the *top* (line 426/429) — but `MultiStepAuthFlow` (the in-app Settings re-auth flow) renders it at the BOTTOM. Coordinator-reported user bug refers to the in-app flow, not verify; verify is correct | Move `MultiStepAuthFlow` step counter to top of CardContent above the step content (mirrors `LoginMfaFlow.tsx:421`) |
| P1 | `LoginMfaFlow.tsx:135` fallback `'EMAIL_OTP'` | When `enrolledMethods` is empty (no enrolled MFA methods) and backend returns no `twoFactorMethod`, defaults silently to `EMAIL_OTP` and renders `EmailOtpMfaStep`. If user has no email enrollment either, they hit a dead-end after the empty-OTP send | When `enrolledMethods.length === 0` and no `twoFactorMethod`, show an explicit "no MFA method available — contact support" UI |
| P2 | `PasswordStep.tsx:95-97`, `QrCodeStep.tsx:46-49` (line numbers approximate to grep), `TotpStep.tsx` | Hardcoded `#f8fafc` / `#f1f5f9` / `#fff` for input backgrounds — light-only. With `theme=dark` URL param these inputs become bright-white islands inside the dark card | Replace with `(th) => alpha(th.palette.action.hover, 0.4)` and `'background.paper'` etc. |
| P2 | `EmailOtpMfaStep.tsx:181,188,227,242` | Hardcoded `color: '#1a1a2e'` (dark text on white), `'rgba(0,0,0,0.4)'`, `'rgba(0,0,0,0.6)'`, `#6366f1` — entire step ignores theme mode | Replace literal hex with `'text.primary'` / `'text.secondary'` / `'primary.main'` |
| P2 | `SmsOtpStep.tsx:122-126` | Background hover/focus all collapse to `'background.default'`; user-reported "blackness" theme bug — in dark theme the input border is invisible against the same-colored background | Use distinct `background.paper` for normal vs `action.hover` for hover; verify against light AND dark themes |
| P2 | `EmailOtpMfaStep.tsx:54-56` | `useEffect(() => { sendOtp() }, [])` with eslint-disable. In React strict-mode dev, fires twice; in prod the user can hit a `/auth/mfa/send-otp` rate limit if they refresh fast | Guard with a ref the same way `QrCodeStep` uses `didInitialGenerateRef` |
| P2 | `SmsOtpStep.tsx:45-53` | No `submitted` flag — if the user pastes a 6-digit code AND the resend timer hits zero AND they click resend, two requests can race | Mirror `EmailOtpMfaStep.tsx:84-87` (`submitted` ref) |
| P2 | `HostedLoginApp.tsx:122-123, 418` | `isFramed` is computed once at module load; if the page is opened in a new window from a framed parent, evaluation may stale on hot-reload (dev-only) | Move `window.top !== window.self` into the effect and recompute on focus |
| P2 | `LoginMfaFlow.tsx:51` | `clientId` is destructured as `_clientId` (unused) — the prop exists but is dead. Dev-readability + masks the missing tenant-context wiring (the unused prop *should* be the fix surface for the P0 above) | Wire `_clientId` through to `authRepository.login` and `verifyStep` payloads |
| P2 | `HostedLoginApp.tsx:662-664` | `appOrigin` hardcoded to `https://app.fivucsas.com` — staging/preview environments ship a broken "Open Developer Portal" CTA | Read from `envConfig.appOrigin` (mirrors how `apiBaseUrl` is handled at line 95) |
| P2 | `HostedLoginApp.tsx:399-411` (`handleCancel`) | If `redirect_uri` is missing the user gets `window.history.back()` or `window.close()` — `close()` is no-op for windows the script didn't open | Route to a friendly "/" landing on the same origin |
| P3 | `HostedLoginApp.tsx:200-215` | DEV-only `console.warn` for malformed `redirect_uri`. Prod operators cannot triage without dev tools open | Surface a non-blocking `Alert severity="info"` in dev-build (`import.meta.env.DEV`) AND log to `LoggerService` so prod is observable |
| P3 | `LoginMfaFlow.tsx:74-92` | `BiometricEngine.initialize()` warm-up runs on EVERY hosted-login page-load even when MFA may never call FACE — burns ~3-5MB WASM/model cache for users who only have password+SMS | Warm-up only once `availableMethods` is known to include FACE |
| P3 | `LoginMfaFlow.tsx:480` | `key={phase + selectedMethod}` causes a remount whenever method changes — fine for state hygiene but kills any in-progress camera stream on FACE → method-picker → FACE oscillation | Track per-method state externally |

## P0 narrative — security/correctness boundary

**1. Cross-tenant password leakage** (user-reported, confirmed). The hosted
login is advertised as "tenant-scoped sign-in" (the page renders
`signingInTo: { tenant: clientLabel }` — `HostedLoginApp.tsx:538`). A user who
belongs to a *different* tenant can fully type a password and pass step 1
because `/auth/login` is tenant-blind. They will only be rejected at the very
final exchange step (`OAuth2Controller.java:359-366`). This is bad UX, but
also a **timing-oracle**: the time-to-rejection differs depending on whether
`(email, password)` was valid (full MFA latency vs immediate
`invalid_credentials`), so an attacker can enumerate which emails are valid
across the whole platform.

**2. NFC contradictory state.** Frontend success races backend rejection. The
"successfully read" Alert is technically truthful (the chip *was* read) but in
the user's mental model "success" should mean "MFA passed." Fix: either reword
the Alert to "NFC chip read — verifying…" and clear it on parent error, or
delay rendering the success state until parent confirms `STEP_COMPLETED`.

## P1 narrative — UX-breaking

**Generic "Login could not be completed."** The coordinator-reported
re-occurrence is real: of the 6 distinct backend rejection paths in
`OAuth2Controller.java:215-249, 262, 364`, only one (`tenant`-substring) is
mapped on the FE (`HostedLoginApp.tsx:370-379`). All five others — *Unknown
MFA session, MFA session expired, MFA not completed, MFA session already used,
client_id mismatch* — fall through to `hosted.exchangeFailed`. Users see the
same useless message regardless of root cause, which means they cannot
self-recover (e.g. an "MFA session expired" should restart the flow, not
"return to app").

**OAuth-2 error-on-redirect missing.** The hosted page is the terminal
surface — when something fails after MFA, the user is stranded on
`verify.fivucsas.com` and the relying party never sees an `error=...` callback.
RFC 6749 §4.1.2.1 expects errors *to be redirected back* to the registered
`redirect_uri` with `error` and `state`. Right now we eat the error.

## P2 narrative — UX-rough

The dark-theme drift is widespread: 4 step components hardcode
light-only colors. `HostedLoginApp` honours `theme=light|dark` and forces
`document.documentElement.lang` (line 167), but theme is *not* propagated as an
override — only `theme=dark` URL param triggers it. Any tenant who omits the
param gets light mode regardless of `prefers-color-scheme`. The "blackness"
the user reported on the SMS step is the dark-theme surface meeting a
light-mode-hardcoded input.

The auto-OTP-send race (EmailOtp on mount) hasn't bitten yet because OTP
backend is rate-limited per session, but it will fire two audit-log rows for
every fresh page load, doubling observability noise.

## P3 narrative — cosmetic

Dev console warnings for `redirect_uri` shape are invisible in prod. The
QR-step `userId="mfa-session"` literal is misleading. The
`BiometricEngine.initialize()` warm-up is unconditional. None block release.

## Top recommendations to ship next

1. **Fix the user-reported NFC double-message** — single-line edit in
   `NfcStep.tsx`: clear `scanResult` when `error` becomes truthy. Smallest
   blast-radius, ships immediately.
2. **Map all `/oauth2/authorize/complete` errors to specific i18n keys** —
   regex-match `error_description` against the 5 known substrings, add
   `hosted.mfaExpired`, `hosted.mfaConsumed`, `hosted.pkceMismatch`,
   `hosted.redirectMismatch`, `hosted.scopeMismatch`. Same pattern as the
   tenant-mismatch fix in web #78.
3. **Tenant-bind the password step** — extend `/auth/login` request DTO with
   optional `tenantHint`/`clientId`, backend short-circuits with a 403 if the
   user's tenant doesn't own the client. Closes the cross-tenant timing-oracle
   AND fixes the user-reported wrong-tenant pass.
4. **Theme-correct the 4 step components** — replace hardcoded hex with
   theme-aware tokens. Mechanical change, biggest visual win in dark mode.
5. **Surface MFA-step rejection codes** — replace
   `LoginMfaFlow.tsx:247` generic message with a switch on `res.status`/
   `res.errorCode`. Reuses existing i18n keys.

## Constraints honoured

- Read-only investigation. No code edited.
- ≤2500 words (currently ~1450 prose + table).
- Every finding has a file:line citation.
- User's three reported bugs cross-checked: PASSWORD wrong-tenant
  (`AuthRepository.ts:59`, `LoginMfaFlow.tsx:114` — confirmed); NFC double
  message (`NfcStep.tsx:79-83 + 168 + 191` — confirmed); SMS dark theme
  (`SmsOtpStep.tsx:122-126` — confirmed, broader pattern across 4 components).
- Coordinator add-ons cross-checked: step-counter visibility — verify-app's
  `LoginMfaFlow` renders counter at TOP (line 421-430), so the user-reported
  bug is for `MultiStepAuthFlow.tsx:552-565` (in-app re-auth), not the verify
  flow — flagged for completeness; generic "Login could not be completed" —
  confirmed five missing error mappings.
- Cross-checked against `INVESTIGATION_WIRES_2026-05-07.md` and
  `INVESTIGATION_PIPELINES_2026-05-07.md` — those covered the OAuth2 wire
  contract and PKCE/state echo on success, but did NOT cover step-component
  state contradictions, theme drift, or error-mapping gaps. Those are this
  doc's contribution.
