# Fact Pack — Client Surfaces (Web dashboard, hosted login, auth widget + JS SDK, mobile, desktop)

Ground-truth extracted from `/opt/projects/fivucsas/web-app`, `/opt/projects/fivucsas/client-apps`,
`/opt/projects/fivucsas/verify-widget` (HEAD as of 2026-06-05). All claims below are sourced to
real files. PAST-TENSE conversion is the writer's job; figures in the catalog that match (e.g.
`seq_registration`, `face_enroll_quality`) may be referenced. **Honesty flags are called out
explicitly** (esp. iOS / desktop delivery status).

---

## 1. React 18 Admin Dashboard (app.fivucsas.com)

**Stack (`web-app/package.json`):** React **18.3.1** + TypeScript **5.5** + Vite **8.0.3**.
Material-UI (MUI) v5.16, Emotion styling, **InversifyJS 7** dependency injection
(`reflect-metadata`), React Router **6.26**, `react-hook-form` + **Zod 3.23** validation,
`react-i18next` 16 + `i18next` 25, `axios` 1.15, `framer-motion`, `recharts` (analytics),
`socket.io-client` (live proctoring), `notistack`, `qrcode.react`, `jwt-decode`. Build is
`tsc && vite build`; PWA via `vite-plugin-pwa`. Architecture = Clean Architecture / feature-folders
+ DI (`src/core/di/`), domain models in `src/domain/models/`, repositories in
`src/core/repositories/`.

**Routing (`src/App.tsx`).** Public routes: `/login`, `/register`, `/forgot-password`,
`/reset-password`, `/accept-invite`, `/onboarding`, `/verify-email`, `/widget-auth`; public-layout:
`/terms`, `/privacy`, `/widget-demo`, `/developer-portal`, `/face-demo`. Protected (under
`<DashboardLayout>` + `<ProtectedRoute>`): dashboard index, `users` + CRUD, `tenants` + CRUD
(`PLATFORM_OWNER_ROLES`), `roles` + CRUD, `auth-flows`, `devices`, `auth-sessions`, `enrollments`
+ `:id`, `enrollment` (biometric enrollment), `biometric-tools`, `biometric-puzzles`,
`auth-methods-testing`, `verification-flows`, `verification-dashboard`, `verification-sessions/:id`,
`audit-logs`, `guests`, `analytics`, `my-profile`, `settings`. Access is gated by `<RoleRoute>` /
`<AdminRoute>` (delegates to `RoleRoute`); the sidebar filters by `user.isAdmin()`.
Several legacy routes (`card-detection`, `face-search`, `voice-search`, `nfc-enrollment`,
`user-enrollment`) now `<Navigate>`-redirect into the consolidated `biometric-tools`.

**Page inventory (`src/pages/`, ~38 page components):** Dashboard, Analytics, AuditLogs,
AuthFlowBuilder, AuthMethodsTesting, AuthSessions, BiometricPuzzles, BiometricTools,
CardDetection, DeveloperPortal, Devices, EnrollmentDetails, EnrollmentsList, FaceDemo, FaceSearch,
ForgotPassword, Guests, MyProfile, Onboarding, Privacy, ResetPassword, RoleForm, RolesList,
Settings, TenantForm, TenantsList, Terms, UserDetails, UserForm, VerificationDashboard,
VerificationFlowBuilder, VerificationSessionDetail, VerifyEmail, VoiceSearch, WidgetAuth,
WidgetDemo, NfcEnrollment, AcceptInvite.

**Feature modules (`src/features/`):** accountSwitcher, auditLogs, auth, authFlows,
auth-methods-testing, biometric-consent, biometric-puzzles, dashboard, devices, enrollments,
guests, linkedAccounts, roles, settings, tenants, users, verification.

**MyProfile + identity UI:** enrollments list, activity history, KVKK/GDPR data export, Linked
Accounts (Model-A account linking via `GET /identity/me` + `/identity/link/initiate|confirm` +
`/unlink`), per-tenant Biometric Consent toggle (`GET/POST /identity/biometric/consents`,
default-DENY), and a TopBar account/workspace switcher (`POST /auth/switch-membership`) shown when
`/identity/me` reports more than one membership.

**Auth-Flow Builder (`features/authFlows/AuthFlowBuilder.tsx`):** a tenant-admin tool that models a
login flow as an ordered list of **layers**; each layer is a checkbox set of allowed methods +
a "Required" switch (satisfy any one of a layer's methods); a "usernameless" switch appears on
Layer 1 when a selected method supports it. Wire contract: a layer persists as `authMethodType`
= set[0] + `alternativeMethodTypes` = the rest.

**PWA service worker (`vite.config.ts`):** app shell served **network-first** (navigations →
NetworkFirst, 3s timeout, fall back to precached `index.html`); hashed JS/CSS precached +
cache-first; `api.fivucsas.com` NetworkFirst. Deploy target = Hostinger (static rsync).

---

## 2. Hosted Login (verify.fivucsas.com) — the primary integration mode

**Architectural decision (2026-04-16, "hosted-first"):** the primary third-party integration is
**redirective OIDC**, mirroring Auth0 Universal Login / Okta / Microsoft Entra / Keycloak / AWS
Cognito / e-Devlet. A tenant calls `FivucsasAuth.loginRedirect({...})` → the browser navigates
(top-level context) to `verify.fivucsas.com/login` via the API's `/oauth2/authorize` endpoint with
`display=page` → user completes MFA → the browser returns to the tenant's `redirect_uri` with
`?code=…&state=…` → the tenant exchanges the code at `/oauth2/token`. The embeddable iframe widget
is **demoted to inline step-up MFA only**. Reason given in code: top-level context is required for
Web NFC, WebAuthn, autofill/password managers, and is robust against Safari ITP and 3rd-party
cookie deprecation.

**Hosting:** `verify.fivucsas.com` is served by an **nginx Docker container behind Traefik v3**
(`verify-widget/Dockerfile`, `nginx.conf`, `docker-compose.prod.yml`) — NOT Hostinger. The React
bundle is built from web-app via `npm run build:verify` (`vite.verify.config.ts`), synced into
`verify-widget/html/`, and containerized. The vanilla SDK files
(`fivucsas-auth.js`, `fivucsas-auth.esm.js`, ~16–19 KB each) live at the html root.

**`HostedLoginApp.tsx` (root of `/login`):** parses OAuth params from the URL
(`client_id`, `redirect_uri`, `scope`, `state`, `nonce`, `code_challenge`,
`code_challenge_method`, `ui_locales`/`locale`, `theme`, `api_base_url`). It:
- Resolves UI locale by priority `ui_locales` (OIDC §3.1.2.1) → `locale` → `navigator.language` → `en`.
- Fetches tenant-branding metadata `GET /oauth2/clients/{client_id}/public` (10s abort timeout +
  retry UI) and the tenant Layer-1 login config (`fetchLoginConfig`) BEFORE first paint, to avoid a
  password-first → identifier-first flash.
- Renders an **IntegratorLanding** explainer (with a copy-paste `<script>` snippet) when hit with no
  OAuth params (developer evaluating the URL), instead of a red error.
- **Frame-busts** (B9): if loaded inside an iframe it renders nothing and tries to navigate the top
  window out; CSP `frame-ancestors 'none'` is the authoritative guard (clickjacking defense).
- On MFA completion, mints the authorization code two ways: (a) multi-step flow → `POST
  /oauth2/authorize/complete` spending the `mfaSessionToken`; (b) single-factor flow → re-hits `GET
  /oauth2/authorize` with the Bearer token. Validates `redirect_uri` scheme again
  (`assertSafeRedirectScheme`) before navigating, then `window.location.replace(redirect_uri?code&state)`.
- On structured OAuth2 errors, redirects back to the RP with `error`/`error_description`/`state` per
  RFC 6749 §4.1.2.1 (after a 4s localized message); maps backend error codes
  (`unknown_mfa_session`, `mfa_session_expired`, `mfa_not_completed`, `mfa_already_consumed`,
  `client_id_mismatch`, `pkce_missing`, `redirect_uri_mismatch`) to localized copy.
- Shows an in-card EN|TR language toggle and Layer-1 usernameless shortcuts (passkey / "approve on
  another device" / "sign in with your phone" QR) on the initial identity-entry screen only.

**`LoginMfaFlow.tsx`** is the shared MFA engine for both the hosted page and the iframe widget. It
drives `POST /auth/login` (first-factor password, lockout-protected) and `POST /auth/mfa/step`
(subsequent factors, JWT deferred until all steps complete; RFC 8176 `amr` claim). The identifier
step calls `POST /auth/login/preflight`, which returns the resolved tenant login-config so the step
counter reads the tenant's REAL flow size (1/3, 2/3, 3/3). Config-driven login is feature-flagged
(`app.auth.config-driven-login`, kill-switch by env, default-OFF reverts to legacy email+password).

**`VerifyApp.tsx`** is the iframe widget root with two modes: **session mode** (a `session_id` is
pre-created on the backend → renders `MultiStepAuthFlow`) and **login mode** (`client_id`, no
session → renders `LoginMfaFlow`). It talks to the parent via a typed `postMessage` bridge.

---

## 3. Embeddable Auth Widget + JavaScript SDK

Two npm-publishable packages live in `web-app/packages/`, both `0.1.0`, MIT:

### `@fivucsas/auth-js` (zero-dependency vanilla SDK)
Source: `src/verify-app/sdk/FivucsasAuth.ts` + `core.ts`. Tree-shakeable
(`"sideEffects": false`). Public surface:
- **`new FivucsasAuth({ clientId, baseUrl?, apiBaseUrl?, locale?, theme? })`** — requires `clientId`;
  defaults `baseUrl=https://verify.fivucsas.com`, `apiBaseUrl=https://api.fivucsas.com/api/v1`.
- **`loginRedirect({ redirectUri, scope?, state?, nonce?, display? })`** — the primary entry point.
  Generates **PKCE (S256)** (`crypto.subtle.digest('SHA-256', …)` + base64url), a CSRF `state`, and
  an OIDC `nonce`; stores all four (+ redirect URI) in `sessionStorage`; builds and navigates to
  `/oauth2/authorize?response_type=code&code_challenge_method=S256&...&ui_locales=<locale>`.
- **`handleRedirectCallback()`** — validates `state` against sessionStorage, exchanges the code at
  `POST /oauth2/token` (`grant_type=authorization_code` + `code_verifier`), single-use clears PKCE
  state even on failure, validates the id_token `nonce` claim (OIDC §3.1.3.7), decodes id_token
  claims (`sub`/`email`/`name`/`amr`, UTF-8-safe so Turkish "Gültekin" survives), and falls back to
  `GET /oauth2/userinfo` for missing fields. Returns a `VerifyResult`
  (`accessToken`/`refreshToken`/`idToken`/`completedMethods`/etc.).
- **`verify({ container?, flow?, sessionId?, methods?, onStepChange, onError, onCancel })`** — the
  iframe/modal step-up path: injects a modal overlay (or mounts into a container), creates the
  `verify.fivucsas.com` iframe with `allow="camera; microphone; publickey-credentials-get;
  publickey-credentials-create"` + a sandbox allowlist, validates `event.origin`, and resolves on a
  `fivucsas:complete` postMessage. Handles `ready`/`config`/`step-change`/`complete`/`error`/
  `cancel`/`resize` message types.
- **Security helpers (exported + unit-tested):** `assertSafeRedirectScheme` (allows `https`, RFC 8252
  loopback `http://127.0.0.1|[::1]|localhost`, RFC 3986 custom schemes; blocks
  `javascript:`/`data:`/`vbscript:`/`file:`/`blob:`), `assertNonceMatches`, `decodeJwtPayload`.

### `@fivucsas/auth-elements` (Web Component)
Source: `src/verify-app/sdk/FivucsasAuthElement.ts`. Registers
`customElements.define('fivucsas-verify', …)` — a framework-agnostic custom element wrapping the
flow, with `observedAttributes` (e.g. `client-id` required, theme/locale), distributed as ESM/CJS +
an IIFE `index.global.js` for `<script>` / unpkg / jsdelivr usage. Depends optionally on
`@fivucsas/auth-js` as a peer.

### React bindings
`src/verify-app/react/` exposes `FivucsasProvider`, `useVerification`, and a `VerifyButton`
component for React consumers.

---

## 4. Authentication Methods (12 total)

The login-method enum (`web-app/src/domain/models/AuthMethod.ts`,
`AuthMethodType`) — mirrored in the backend `AuthMethodType.java`:

The **documented 10**: `PASSWORD`, `EMAIL_OTP`, `SMS_OTP`, `TOTP`, `FACE`, `VOICE`,
`FINGERPRINT`, `HARDWARE_KEY`, `QR_CODE`, `NFC_DOCUMENT` — **plus** `PASSKEY` (discoverable /
usernameless WebAuthn) and `APPROVE_LOGIN` (cross-device number-matching). `LOGIN_METHOD_TYPES`
enumerates all 12.

**HONESTY FLAG — GESTURE_LIVENESS is NOT a login method.** It is an active-liveness anti-spoofing
sub-component of FACE (no auth handler) and is deliberately excluded from selectable auth methods
(backend migration V75 note; `AuthMethod.ts` comment).

**HONESTY FLAG — FINGERPRINT.** Per `identity-core-api/CLAUDE.md`, `FINGERPRINT` is delivered
exclusively via WebAuthn platform authenticator; the legacy server-side fingerprint biometric path
was removed because the biometric-processor backend was a SHA-256 hash placeholder, not a real
fingerprint biometric. The enum value is retained (used by WebAuthn).

**Per-method step components** (`features/auth/components/steps/`): `PasswordStep`, `EmailOtpStep` /
`EmailOtpMfaStep`, `SmsOtpStep`, `TotpStep`, `FaceCaptureStep`, `VoiceStep`, `FingerprintStep`,
`HardwareKeyStep`, `QrCodeStep`, `NfcStep`, plus `GestureLivenessStep` and `MethodPickerStep`.
A single shared router `features/auth/login-shared/MfaStepRenderer.tsx` maps method → step component
and is rendered by BOTH the dashboard (`TwoFactorDispatcher`) and the hosted/widget
(`LoginMfaFlow`) — so adding/changing a method updates both surfaces at once. Enrollment UIs
(`features/auth/components/enrollment/methods/`) are decomposed per method: `face/`, `voice/`,
`nfc/`, `sms/`, `totp/`, `webauthn/`.

**Cross-device login surfaces** (`Layer1Shortcuts.tsx`, `PasskeyLoginButton.tsx`,
`ApproveLoginPanel.tsx`, `QrLoginPanel.tsx`): passkey login uses `navigator.credentials.get()` with
empty `allowCredentials` against `POST /webauthn/passkey/authenticate-options` + `/authenticate`
(browser handles the cross-device "use your phone" hybrid QR — no companion app). Approve-login is
no-Firebase number-matching (`POST /auth/approve-login/session`, `matchNumber` is a zero-padded
STRING). QR encodes the `sessionId` as `fivucsas://qr-login?session=<id>`.

---

## 5. Identity-Verification Pipeline (step handlers + industry templates)

Distinct from the login MFA flow, the **identity-verification pipeline** (KYC-style) is defined in
`identity-core-api` (Flyway V26–V28, seed V27) and surfaced in the web dashboard via
`VerificationFlowBuilderPage`, `VerificationDashboardPage`, `VerificationSessionDetailPage`, and
`features/verification/components/TemplateSelector.tsx`.

**Step handlers** (`application/service/verification/handlers/`, 10 handlers) — each implements
`VerificationStepHandler` and is wired by `VerificationStepHandlerRegistry`:
`DocumentScanHandler` (DOCUMENT_SCAN), `DataExtractHandler` (DATA_EXTRACT), `FaceMatchHandler`
(FACE_MATCH), `LivenessCheckHandler` (LIVENESS_CHECK), `NfcChipReadHandler` (NFC_CHIP_READ),
`AddressProofHandler` (ADDRESS_PROOF), `WatchlistCheckHandler` (WATCHLIST_CHECK),
`AgeVerificationHandler` (AGE_VERIFICATION), `PhoneVerificationHandler` (PHONE_VERIFICATION),
`VideoInterviewHandler` (VIDEO_INTERVIEW). Some handlers (e.g. WatchlistCheck) are stubs that
fail-fast in production (`WatchlistCheckHandlerStubProductionFailFastTest`).

**5 industry templates** (`ManageVerificationService.INDUSTRY_TEMPLATES`, exact step lists):
- **FINTECH_KYC** — DOCUMENT_SCAN → NFC_CHIP_READ → DATA_EXTRACT → FACE_MATCH → LIVENESS_CHECK → WATCHLIST_CHECK
- **HEALTHCARE_BASIC** — DOCUMENT_SCAN → FACE_MATCH → LIVENESS_CHECK
- **EDUCATION_AGE** — DOCUMENT_SCAN → DATA_EXTRACT → AGE_VERIFICATION → FACE_MATCH
- **TELECOM_ONBOARDING** — DOCUMENT_SCAN → DATA_EXTRACT → FACE_MATCH → LIVENESS_CHECK → PHONE_VERIFICATION
- **SIMPLE_DOCUMENT** — DOCUMENT_SCAN → FACE_MATCH

`V27__seed_verification_flows.sql` seeds 3 DB-resident flows. `StepType` enum = `SEQUENTIAL` |
`CHOICE`.

---

## 6. Client-side Machine Learning (in-browser)

All run **in the browser** (no server round-trip) as a pre-filter; per the **D2 decision the
server makes the authoritative auth decision** — client geometry embeddings are LOG-ONLY.

**Face detection / landmarks:** primary is **MediaPipe FaceLandmarker** (`@mediapipe/tasks-vision`
0.10.18, Tasks API not Solutions) returning a bounding box + **478 landmarks** in one inference pass
(`lib/biometric-engine/core/FaceDetector.ts`, GPU delegate with WASM fallback; model
`face_landmarker.task` float16 from Google Storage; WASM from jsdelivr pinned via
`src/config/cdn.ts`). Fallback / lightweight path is **BlazeFace** (`@tensorflow-models/blazeface`
+ tfjs WebGL backend, `lib/ml/BlazeFaceDetector.ts`, run at `numFaces:1` for auth → higher FPS).

**Face capture challenge (`features/auth/hooks/useFaceChallenge.ts`):** a **3-step guided capture
— center/look → turn left → turn right** (one image per step, counter X/3). Head-turn gestures are
mandatory; a liveness miss re-prompts the current step. **HONESTY FLAG — there is NO client blink
step:** EAR-based blink detection (478-pt FaceLandmarker `avgEAR`) was found too unreliable across
devices/FPS, so it was removed; server passive liveness (UniFace MiniFASNet) is authoritative.
Client passive-liveness pre-filter threshold = 0.45; enrollment quality floor = 65/100
(`QualityAssessor`, blur + lighting + bbox-size weighting).

**Card detection (`useCardDetection.ts` + `lib/biometric-engine/core/CardDetector.ts`):**
**client-only** ID-card-type detection via an in-browser **ONNX YOLOv8 model** (`onnxruntime-web`,
WASM). The server proxy `/biometric/card-detect` was removed 2026-05-29 — there is no server
fallback. **HONESTY FLAG — model size:** the deployed `public/models/yolo-card-nano.onnx` is
actually a ~51 MB **YOLOv8m** (FP16), not the intended ~12 MB nano; the true retrained YOLOv8n nano
binary is not in the repo (see parent `CLAUDE.md`).

**Biometric-engine library (`src/lib/biometric-engine/core/`):** BiometricEngine (singleton),
FaceDetector, FaceTracker, FaceMetricsCalculator, HeadPoseEstimator, EmbeddingComputer (512-dim
landmark-geometry embedding, log-only), QualityAssessor, PassiveLivenessDetector, livenessPool,
CardDetector, HandGestureDetector, VoiceVAD, EnrollmentController, FrameProcessor, challenges.

**Biometric Puzzles (`features/biometric-puzzles/`):** a registry of **23 active-liveness
micro-challenges (14 face + 9 hand)** using MediaPipe FaceLandmarker + HandLandmarker. The reliable
server-driven gesture pool is finger-count / wave / pinch; finger-math is flagged experimental.

**Continuous verification / proctoring:** `useContinuousVerification.ts` + `socket.io-client`
(WebSocket) for live session monitoring.

---

## 7. Mobile / Desktop clients — Kotlin Multiplatform (client-apps)

**Stack:** Kotlin Multiplatform (KMP) + **Compose Multiplatform**, Clean Architecture + MVVM,
**Koin** DI, Ktor HTTP client. Specs: JDK 21, compileSdk/targetSdk 35, minSdk 24. Gradle modules
(`settings.gradle.kts`): **`:shared`** (commonMain business logic), **`:androidApp`**,
**`:desktopApp`**. Repo is `Rollingcat-Software/client-apps`.

**Shared `commonMain`:** config (AppConfig, UIDimens, AnimationConfig, BiometricConfig), domain
(model/usecase/repository), data (repository + remote/Ktor API services), presentation
(ViewModels + UI state), platform abstractions (`ICameraService`, `ILogger`, `ISecureStorage`,
fingerprint/WebAuthn/auth-widget), and a shared Atomic-Design Compose UI library (atoms/molecules/
organisms + theme). Points at PROD `api.fivucsas.com/api/v1`.

**`expect`/`actual` platform seams** (`shared/src/{androidMain,desktopMain,iosMain}`): the 6 expect
declarations are `isAuthWidgetAvailable`/`launchAuthWidget` (FivucsasAuth), `platformModule` (Koin),
`provideWebAuthnAuthenticator`/`isWebAuthnAvailable`, `providePlatformFingerprintAuthenticator`/
`isFingerprintFlowAvailable`, `getCurrentPlatform`/`createPlatformServiceFactory`, and the TOTP
`hmacSha1/256/512` (`authenticator/totp/HmacPlatform.kt`).

**Shared i18n (`shared/i18n/StringResources.kt`):** an in-code `StringResources` object with a
`Language` enum (EN/TR) and `s(key)` helpers — EN + TR, switchable at runtime. (The Android
`res/values/strings.xml` exists but the cross-platform string source is the shared
`StringResources`.)

### 7a. Android — DELIVERED (full native client)
**HONESTY: this is the one fully-delivered, publicly-distributed platform.** Latest signed release
**v5.3.0** (tag `65d33306`; per parent memory v5.3.x carries MRZ + QR fixes); login-stability line
v5.2.1→v5.2.3. It is a **full native client**, NOT a thin OAuth shell: native PASSWORD + adaptive
MFA across all methods (`MfaFlowScreen`/`MfaFlowViewModel`), native **NFC document reading + card
enrollment** (`data/nfc/` with readers: `TurkishEidReader`, `PassportNfcReader`,
Mifare Classic/Desfire/Ultralight, NDEF, Generic; PACE/eID/SOD security packages — see CHANGELOG
PACE EF.CardAccess + passive-authentication work, server-authoritative `POST
/nfc/verify-authenticity`, fail-closed), on-device biometric capture (CameraX/ML Kit),
account dashboard, cross-device sessions, GDPR/KVKK export, push/WebSocket approval handling
(approve-login + QR), and a **standalone RFC 6238 TOTP authenticator**
(`com.fivucsas.authenticator.*`, AES256-GCM `EncryptedSharedPreferences`, hardware-Keystore master
key, Compose Material 3 UI). FIDO2/WebAuthn via Android Credential Manager.
**HONESTY caveat:** WebAuthn/FINGERPRINT only work on the PRODUCTION-signed release (debug
signing-cert SHA-256 isn't registered server-side); and a residual on-device "Verification failed
despite server 200 AUTHENTICATED" bug was still open on v5.3.x pending the developer's
`adb logcat` (server cannot run an Android emulator — no `/dev/kvm`).

### 7b. Desktop (JVM, Windows + Linux) — DELIVERED but narrower
**HONESTY: shipped, but it is a hosted-first OAuth client + admin/kiosk app, not a full native
biometric client like Android.** `desktopApp` (Compose for Desktop / JVM):
- **Hosted-first OAuth loopback** is the default entry: `auth/OAuthLoopbackClient.kt` (RFC 8252
  loopback + PKCE; unit-tested `OAuthLoopbackClientTest`).
- **Real secure token storage** per OS via `TokenStorageFactory`: **DPAPI** (Windows,
  `DpapiTokenStorage`), **libsecret** (Linux, `LibsecretTokenStorage`), AES-GCM file
  **fallback** (`FallbackTokenStorage`); `SecureTokenStorage` interface.
- UI modes: **Admin Dashboard** (`ui/admin/` — tabs Users/Analytics/Security/Settings, dialogs
  AddUser/EditUser/DeleteUser, NavigationRail) and **Kiosk Mode** (`ui/kiosk/screens/` — Welcome,
  Enroll, Verify), plus `ui/root`, `ui/member`, `ui/auth`. Entry `Main.kt` (Compose `application`).
- **Installers:** `.deb` (Linux) + `.msi` (Windows) produced by
  `.github/workflows/desktop-installers.yml`.
- **macOS out of scope** (no signer / no `codesign`/`notarytool`).

### 7c. iOS — NOT DELIVERED (prototype scaffolding only)
**HONESTY FLAG (critical — do not overclaim):** there is **no `iosApp` module** and **no shippable
iOS app**. The shared module declares iOS targets (`iosX64`, `iosArm64`, `iosSimulatorArm64` in
`shared/build.gradle.kts`) and an `iosMain` source set exists, but it is **stubbed / incomplete**:
- TOTP `HmacPlatform.ios.kt` is `TODO("iOS HMAC via CommonCrypto …")` — throws, not implemented.
- `IosPlatformFactory.kt` returns `StubNavigationService` / `StubDialogService` /
  `StubNotificationService`; `PlatformModule.ios.kt` has a push-notification "stub until APNs".
- README/CLAUDE.md: **"iOS: 0 / 13"**, Phase 2 (planned July 2026), blocked on Apple Developer
  enrollment; CI "iOS Build" green only validates the shared framework compiles for the iOS target,
  not a deliverable app. The parity matrix lives in `docs/plans/CLIENT_APPS_PARITY.md`.

**Platform delivery summary (state it honestly):**
| Platform | Status |
|---|---|
| Android | DELIVERED — full native client, signed APK releases (latest v5.3.x), public distribution |
| Desktop (Win/Linux) | DELIVERED — hosted-first OAuth loopback + admin/kiosk UI + OS secure storage + .deb/.msi installers |
| iOS | NOT DELIVERED — targets declared + iosMain stubs only; no iosApp module; Phase 2 / blocked on Apple enrollment |
| macOS | OUT OF SCOPE — no code-signing capability |

---

## 8. Internationalization (i18n)

- **Web (`web-app/src/i18n/`):** `react-i18next` + `i18next` with `locales/en.json` and
  `locales/tr.json` (verified equal top-level key counts: **72 = 72**). Rule (CLAUDE.md): ALL UI
  strings use `t()` with keys in both en.json + tr.json — never hardcode English. The hosted login,
  dashboard, and verify widget share the SAME i18n engine; locale flows in via OIDC `ui_locales`.
- **Mobile/Desktop (shared KMP):** `StringResources` object, EN + TR, runtime-switchable.

---

## 9. Test counts (verify, do not over-trust labels)

From repo docs (treat as reported, not independently re-counted here):
- Web-app Vitest: ~**619** unit tests; Playwright E2E: **27 specs** (`web-app/e2e`,
  `playwright.config.ts`).
- Client-apps Kotlin: **~517 total** per README (commonTest 447 + androidTest 33 + android-unit 12
  + desktopTest 25; verified 2026-05-28) — note the parent CLAUDE.md table cites ~425; use the
  per-suite breakdown and label the source.
- SDK security helpers have dedicated tests (`sdk/__tests__/FivucsasAuth.test.ts`); hosted flow has
  `verify-app/__tests__/` (HostedLoginApp, LoginMfaFlow config, postMessageBridge, StepProgress).

---

## 10. Suggested figures (from bibliography catalog)
- `seq_registration` (user registration sequence) — §1 dashboard registration / onboarding.
- `face_enroll_quality` (face enrollment with quality assessment) — §6 client ML capture.
- `face_verify_liveness` (face verification with liveness) — §6.
- `dataflow_verification` / `verify_decision` — §5 verification pipeline.
- `fsm_session`, `fsm_enrollment`, `fsm_verification` — §2/§5 state machines.

## 11. Suggested new citations (already in bibliography)
`react`, `kmp`, `oauth2-rfc6749`, `oidc-core`, `pkce-rfc7636`, `jwt-rfc7519`, `webauthn`,
`mediapipe`, `bazarevsky2019-blazeface`, `yolov8`, `pgvector` (server side), `traefik`, `icao9303`
(NFC/eMRTD), `kvkk6698`/`gdpr` (data export). No new keys required for this chapter.
