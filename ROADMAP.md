# FIVUCSAS — Product Roadmap

> Last updated: 2026-04-18e — Cross-platform deep review confirmed KMP genuineness (337 commonMain files, ~11.5k LOC); Android v5.1.0 standalone TOTP authenticator shipped; NFC crypto (5,447 LOC) already ported into `androidApp/data/nfc/` but not yet wired into `MfaFlowScreen`; 5-gap close-out plan to reach 20/20 docketed as Phase I.

## Known open incidents

- **GitGuardian #29836028** — Android keystore password `fivucsas2026` leaked in public git history of `Rollingcat-Software/client-apps` (commit `db18fa7`, tag `v3.0.0`). Scaffolding that reads creds from env / Gradle properties shipped `cb6eab9` 2026-04-18. **Rotation is user-gated** (keytool + GitHub-secret paste). Full playbook: `docs/SECURITY_INCIDENTS.md`. Also tracked as Phase C6 below.
- **Phase C Wave 0 secret rotation pending** — `.env.prod` values (PostgreSQL, Redis, JWT signing key, Twilio SID+token, biometric `X-API-Key`, Hostinger SMTP) are live in committed history. Rotation requires a scheduled 2-hour maintenance window (JWT rotation signs everyone out). Playbook: Phase C1–C5 below.

## Project Status Summary

- **Overall Completion**: ~99%
- **Production Services**: Identity Core API (Hetzner VPS), Web Dashboard (Hostinger), Landing Website (Hostinger), Verify Widget / Hosted Login (Hetzner)
- **Local Dev**: Docker Compose (5 services, all healthy)
- **Tests**: 633 backend, 619 web-app (Vitest), 425 client-apps, 27 Playwright specs (~1,800 total)

---

## Active initiative: Post-V38 stabilization + lint-debt burn-down + Phase J Desktop hosted-first

**Status (2026-04-18):**
- Flyway **V38** flipped `fivucsas-web-dashboard` OAuth2 client to public + PKCE-only (SPA cannot hold a secret).
- **MobileFaceNet deprecated** (commit `9e15cdd`) — landmark-geometry (512-dim MediaPipe) is now the sole client embedding. 4.9 MB download + ONNX startup overhead eliminated; server DeepFace Facenet512 remains authoritative per D2 log-only rule.
- **`marmara-bys-demo`** OAuth2 client registered for `demo.fivucsas.com` hosted-login flow.
- **Web-app PR CI migrated to `ubuntu-latest`** (commit `cd0c1ba`) — `.npmrc legacy-peer-deps=true` added to compensate (fd9092c). Move revealed pre-existing lint debt the self-hosted runner was silently skipping.
- **GDPR front-end export wire-up** shipped (commit `52f2fe1`), completing the Art. 20 data-portability surface started 2026-04-16b.
- **ORT + BlazeFace lazy-load** verified via bundle audit (commit `91064ed` — already dynamic imports; off the critical path).
- **Phase J (Desktop hosted-first) now active** — `CLIENT_APPS_PARITY.md` rewritten 2026-04-18 post hosted-first pivot; matrix collapsed from 20 columns to 13 (OAuth client + dashboard + TOTP companion, no native biometrics). Android done; Desktop scaffolding in flight (Agents B/C/D on OAuth loopback + `SecureTokenStorage` + installers). See `docs/plans/CLIENT_APPS_PARITY.md`.

**Blockers surfaced today:**
- 23 lint errors + 63 warnings on web-app — worst offender `HostedLoginApp.tsx` (15 `react-hooks/rules-of-hooks` errors from an early-return placed before hook calls). 1 error in `FivucsasAuth.ts` (`no-useless-escape`), 1 in `postMessageBridge.ts` (stale eslint-disable), 6 `no-unused-vars` in tests.
- **Dependabot gated on lint-green**: web-app #29 `protobufjs` **CRITICAL**, #28 `follow-redirects` MODERATE, FIVUCSAS parent #8 Vite MODERATE.
- Actual critical-path bundle hotspots (post-ORT-lazy): `mui-vendor-*.js` 548 KB, Recharts `container-*.js` 398 KB + `PieChart-*.js` 397 KB.

**Next:** Phase A lint sweep → Phase B Dependabot merge → Phase C Wave 0 ops hardening (during a scheduled maintenance window — JWT rotation signs everyone out).

---

## Phases A–H (2026-04-18 restructure)

This replaces the former Wave 0 / 2 / 3 / 4 tables. Historical Phase 1–7 sections (Auth Method Completion, Widget Architecture, etc.) are retained below unchanged.

### Phase A — Green the PR CI (unblocks Dependabot)

- [ ] **A1.** Refactor `src/verify-app/HostedLoginApp.tsx` so all hooks run above the early `return <ErrorCard/>`; gate internal effects on `authParams` truthiness (15 errors → 0).
- [ ] **A2.** Misc errors: `FivucsasAuth.ts:105` useless regex escape; `postMessageBridge.ts:74` stale eslint-disable; test-file `no-unused-vars` (`act`, `afterEach`, `waitFor`, `userEvent`).
- [ ] **A3.** Exhaustive-deps warnings (63) in `GuestsPage`, `NfcEnrollmentPage`, `SettingsPage`, `WidgetAuthPage`, `TenantFormPage`, `UserFormPage`, `useBlazeFace` — intentional stale closures get inline `// eslint-disable-next-line` + WHY comment.
- [ ] **A4.** `npm test -- --run` — 597 passing; update `HostedLoginApp.test.tsx` if hook-order change breaks it.
- [ ] Ship as one commit: `fix(lint): unblock ubuntu-latest CI — hooks rules-of-hooks + unused vars`.

### Phase B — Merge Dependabot security patches

- [ ] **B1.** `@dependabot rebase` web-app #23 protobufjs + #21 follow-redirects once A is green.
- [ ] **B2.** `gh pr merge --squash --delete-branch` each.
- [ ] **B3.** FIVUCSAS parent Dependabot #8 (Vite) — verify transitive vs direct; bump if direct.
- [ ] **B4.** Rsync rebuilt web-app to Hostinger after protobufjs bump (TensorFlow.js runtime dep).

### Phase C — Wave 0 ops hardening (CRITICAL — real secret exposure)

`.env.prod` files are committed with live DB / Redis / JWT / Twilio / biometric creds. Rotate BEFORE history purge so the leaked values are already dead. Schedule a 2-hour maintenance window — JWT rotation signs everyone out.

- [ ] **C1.** Rotate: PostgreSQL, Redis, JWT signing key, Twilio SID+token, biometric `X-API-Key`, Hostinger SMTP.
- [ ] **C2.** Move secrets to runtime injection: GitHub Actions → workflow env → Docker `--env-file /etc/fivucsas/.env.prod` (root:root, 0600, never in git).
- [ ] **C3.** `git filter-repo --path .env.prod --invert-paths` on identity-core-api, web-app, FIVUCSAS parent. Force-push. Update all clones.
- [ ] **C4.** `bio.fivucsas.com` Traefik: add `rate-limit` (avg 30 r/s, burst 50) + `admin-whitelist` (VPS, laptop, on-call).
- [ ] **C5.** Enable GitHub push-protection + add `gitleaks` to CI.
- [ ] **C6.** Android keystore password rotation — GitGuardian incident **#29836028** (2026-04-08) flagged `fivucsas2026` hardcoded in `client-apps/androidApp/build.gradle.kts` (commit `db18fa7`, tag `v3.0.0`, still reachable on public repo history). Scaffolding to read from env vars shipped `cb6eab9` 2026-04-18. Rotation steps: (a) `keytool -storepasswd -keystore keystore/release.jks` → new store password; (b) `keytool -keypasswd -alias fivucsas -keystore keystore/release.jks` → new key password; (c) base64 the rotated JKS → GitHub secret `ANDROID_KEYSTORE_BASE64` on `Rollingcat-Software/client-apps`; (d) paste new passwords into `ANDROID_KEYSTORE_PASSWORD` + `ANDROID_KEY_PASSWORD` secrets; (e) `git filter-repo --path androidApp/build.gradle.kts --invert-paths` is NOT recommended (rewrites every commit). Instead, accept residual history exposure + rely on rotation making the old values dead. Mark GitGuardian incident resolved.

### Phase D — Security depth

- [ ] **D1.** DNN liveness detection — evaluate DeepPixBiS / MiniFASNet / Silent-Face-v2; target <8 MB ONNX, >15 FPS mid-phone; wire as 3rd pre-filter in `BiometricEngine.ts`, log-only first.
- [ ] **D2.** Voice replay detection — spectral cosine > 0.95 reject.
- [ ] **D3.** Voice STT verification per `docs/plans/VOICE_STT_PLAN.md` (Whisper.cpp tiny.en WASM + server confirm). 2 weeks.
- [ ] **D4.** OIDC discovery conformance-suite run; fix deviations; target Basic certification profile.
- [ ] **D5.** PKCE failure audit logging (`actorIp` + `clientId` + `failureReason`) + rate-limit by `clientId`.

### Phase E — Performance (bundle + CI)

- [ ] **E1.** Recharts lazy-load via `React.lazy()` on `AnalyticsPage` / `DashboardPage` (PieChart 397 KB + container 398 KB).
- [ ] **E2.** MUI vendor split in `vite.config.ts` `manualChunks` — `mui-core` (Button/TextField/Box/Typography) vs `mui-data` (DataGrid/AutoComplete/DatePicker). 548 KB → ~300 KB + ~250 KB.
- [ ] **E3.** CI speed: Maven `-T 2C` in IC ci.yml; Vitest `--pool=threads --poolOptions.threads.maxThreads=4`.
- [x] **E4.** `oauth2_clients.tenant_id` index — present since V24, reaffirmed V37.
- [ ] **E5.** `size-limit` CI gate — fail if any chunk grows >10 % from baseline.

### Phase F — Compliance & observability

- [ ] **F1.** DKIM CNAMEs on Hostinger hPanel (`hostingermail1/2/3._domainkey.fivucsas.com`).
- [ ] **F2.** Weekly backup-restore cron — unzip latest dump, restore to throwaway DB, `SELECT COUNT(*) FROM users`, alert on mismatch.
- [ ] **F3.** Loki + Grafana sidecar on Hetzner; ship Traefik + identity-core-api + biometric-processor logs; `grafana.fivucsas.com` behind admin-whitelist.
- [ ] **F4.** Define 99.5 % monthly uptime SLA + error budget; wire `status.fivucsas.com` to Traefik health.
- [ ] **F5.** `docs/runbooks/INCIDENTS.md` — one page per failure mode (DB, Redis, Traefik cert, SMTP rate-limit, biometric-processor OOM).

### Phase G — Feature completions

- [ ] **G1.** YubiKey hardware testing (purchase ~2,200 TRY; E2E on web-app + verify.fivucsas.com).
- [ ] **G2.** Mobile QR scanner in `client-apps/` (mlkit-barcode-scanning, POST to QR session).
- [ ] **G3.** NFC document (Android) — ICAO MRTD chip read (DG1 MRZ, DG2 face).
- [ ] **G4.** Native-app SDK integration docs (`ios-appauth.md`, `android-customtabs.md`, `electron-loopback.md`, `cli-loopback.md`).
- [ ] **G5.** Voice STT integration (ties to D3).
- [ ] **G6.** BYOD architecture (`BYOD_ARCHITECTURE.md`) — 8-week lift; book after A–F green.
- [ ] **G7.** `<fivucsas-verify>` + `<fivucsas-button>` Web Components + CSS Custom Properties theming.

### Phase H — Code-quality waves 2/3/4

- [ ] **H1 (Wave 2)** — unify `LoginMfaFlow` + `MultiStepAuthFlow`; 135 `Map.of()` → typed DTOs; admin `@PreAuthorize` sweep; unified `ErrorResponse`.
- [ ] **H2 (Wave 3)** — `@WebMvcTest` for 17 controllers; `@Version` on `User` / `AuthFlow` / `Tenant`; JPA cascade `ALL` → `PERSIST, MERGE`; `@Transactional(readOnly=true)` sweep on 50+ services; CI i18n lint rule rejecting hardcoded English in `.tsx`.
- [ ] **H3 (Wave 4 polish)** — MFA terminology canonicalization; `docs/04-api/ERROR_CODES.md`, `QUICKSTART.md`, `FEATURE_FLAGS.md`; `console.log` purge in auth paths; `aria-describedby` sweep; mobile table breakpoints.

### Phase I — Android hosted-first 13/13 done (2026-04-18e)

Android reached **13/13** on the post-pivot (2026-04-16) hosted-first parity matrix. The pre-pivot "20/20" framing is obsolete — the matrix collapsed to 13 thin-OAuth-client columns (see `docs/plans/CLIENT_APPS_PARITY.md` §2, rewritten 2026-04-18). Biometric auth surfaces live on the hosted login page (`verify.fivucsas.com/login`), not in the native app.

Closed during this phase (tagged `v5.2.0-rc1` 2026-04-18e):

- [x] **I1.** Passport BAC MFA integration — `NfcStepScreen` + ported `MrzScannerScreen` wired into `MfaFlowScreen.kt:324`. Shipped in client-apps `1b378e1`. (Note: retained as a reference implementation; hosted-first means future tenants hit the web surface, but this path remains available for legacy mobile flows.)
- [x] **I2.** GDPR/KVKK export mobile UI — `DataExportViewModel` + `ExportDataRow` + MediaStore Downloads + 8 i18n keys. Shipped in v5.2.0-rc1.
- [x] **I3.** FCM action buttons + `fivucsas://` deep-link — `ApprovalActionReceiver` + `NfcApprovalViewModel` + `MainActivity.onNewIntent` handler. Shipped in v5.2.0-rc1.
- [x] **I4.** Dark mode toggle in Settings — `ThemeMode { SYSTEM, LIGHT, DARK }` enum + `LocalThemeMode` CompositionLocal + Settings radio row. Shipped in v5.2.0-rc1.
- [x] **I5.** Authenticator QR scanner — `OtpQrScannerScreen` reusing `QrScannerScreen` CameraX + `OtpauthUri.parse()`. Shipped in v5.2.0-rc1.

**Phase I COMPLETE** — Android hosted-first 13/13. Tag `v5.2.0-rc1` placed 2026-04-18e; full `v5.2.0` after Ship B (verify-app StepLayout) lands + any follow-ups. Remaining Android work is release-level only (Play Store listing, AAB from CI, Baseline Profile, test-coverage bump) — tracked in `docs/plans/CLIENT_APPS_PARITY.md` §3.

### Phase J — Desktop hosted-first 13/13 (ACTIVE 2026-04-18)

Desktop (Windows + Linux; macOS out of scope for v6) is the current active client-apps workstream. Agents B/C/D are in flight on OAuth loopback, secure token storage (DPAPI on Windows, libsecret on Linux), and code-signed installers. Target Phase 2 exit 2026-06-27 (unsigned `.msi` + `.deb` on `fivucsas.com/download/beta`). See `docs/plans/CLIENT_APPS_PARITY.md` §3 "Desktop — gaps" for the 13-item priority-ordered breakdown.

---

## Timeline (2026-04-18 restructure)

| Month | Planned | Status |
|-------|---------|--------|
| April 2026 | Phase A (lint green) + Phase B (Dependabot merges) + Phase I (Android 20/20) + Phase L (docs refresh) | **DONE** (A/B/I/L shipped 2026-04-18) |
| May 2026 | Phase C (Wave 0 ops — secrets rotation + history purge + Traefik tightening) + Phase E (bundle + CI speed) + Phase D start (D4 OIDC conformance + D5 PKCE audit) | Planned |
| June 2026 | Phase G quick wins (G1 YubiKey testing, G4 native-app SDK docs, G7 Web Components) + Phase D continued (D1 DNN liveness + D2 voice replay) | Planned |
| July 2026 | Phase F observability (Loki/Grafana, backup-restore cron, SLA + incident runbooks) | Planned |
| August 2026 | Phase H waves 2 + 3 + 4 code-quality burn-down | Planned |
| September 2026+ | Phase G6 BYOD architecture (8-week lift, book after A–F green) | Deferred |

---

## Phase 1: Critical Fixes (IMMEDIATE)

### 1.1 Docker Health Checks
- [x] Fix identity-core-api health check (wget -> curl, install curl in Dockerfile)
- [x] Fix biometric-processor health check (wrong endpoint `/health` -> `/api/v1/health`)
- [x] Fix api-gateway health check (localhost -> 127.0.0.1 for Alpine)
- [x] Add HEALTHCHECK directive to biometric-processor Dockerfile
- [x] Rebuild and verify all 5/5 containers healthy from clean state
- [x] Test `docker compose down && docker compose up -d` works first-time clean (services run from individual submodule compose files, all healthy)

### 1.2 Port Conflict Resolution
- [x] Document port assignments (FIVUCSAS: 5432, 6379, 8080, 8001, 8000)
- [x] Sarnic project moved to alternative ports (5433, 6380, 8090, 3001)

---

## Phase 2: Auth Method Completion (HIGH PRIORITY)

### Auth Method Status

| # | Method | Backend | Frontend | Service | Status |
|---|--------|---------|----------|---------|--------|
| 1 | Password | OK | OK | N/A | PRODUCTION |
| 2 | Email OTP | OK | OK | N/A | PRODUCTION |
| 3 | SMS OTP | OK | OK | Twilio | PRODUCTION ✅ |
| 4 | TOTP | OK | OK | N/A | PRODUCTION |
| 5 | Face | OK | OK | DeepFace | PRODUCTION |
| 6 | QR Code | OK | OK | N/A | PRODUCTION |
| 7 | Hardware Key | OK | OK (server challenge) | WebAuthn | PRODUCTION |
| 8 | Fingerprint | OK | OK (WebAuthn assertion) | WebAuthn | PRODUCTION |
| 9 | Voice | OK | OK | Resemblyzer | PRODUCTION |
| 10 | NFC Document | OK (backend) | Placeholder | N/A | MOBILE ONLY |

### 2.1 QR Code Auth Fix
- [x] Frontend: Fetch QR code challenge/token from QrCodeController
- [x] Frontend: Display QR code image in QrCodeStep component
- [x] Frontend: Add polling for scan completion
- [ ] Mobile: Implement QR scanner in client-apps
- [ ] E2E test for QR code flow

### 2.2 Hardware Key / WebAuthn Enrollment ✅ DONE
- [x] Create `HardwareKeyEnrollmentFlow.tsx` component
- [x] Flow: register -> credentials.create() -> verify-registration
- [x] Add enrollment in Settings page
- [x] Server challenge flow added, frontend wired
- [ ] Test with YubiKey — awaiting hardware purchase (see procurement section below)

### 2.3 Fingerprint Auth (Decision: Use WebAuthn) ✅ DONE
- [x] Refactor FingerprintAuthHandler to use WebAuthn
- [x] Frontend uses `credentials.get()`
- [x] Backend validates WebAuthn signature
- [x] Remove biometric-processor stub

### 2.4 Voice Auth ✅ DONE
- [x] Implemented with Resemblyzer 256-dim in biometric-processor
- [x] Voice enrollment endpoint working
- [x] Voice verification endpoint working
- [x] Re-enabled in DEFAULT_AUTH_METHODS

### 2.5 NFC Document Auth (Deferred)
- Requires Android NFC API + physical device
- MRTD/ICAO passport chip reading
- Target: Future release

---

## Phase 3: AI-Powered Testing (HIGH PRIORITY)

### 3.1 Playwright MCP Setup
- [x] Fix MCP config (`@anthropic-ai/mcp-server-playwright` -> `@playwright/mcp`)
- [ ] Install `@playwright/mcp` package
- [ ] Restart Claude Code session to activate
- [ ] Verify MCP tools available (navigate, click, screenshot, etc.)

### 3.2 Visual UI Audit (All 20 Pages)
- [ ] Login page (form validation, error messages, remember me)
- [ ] Register page (form fields, validation, success flow)
- [ ] Dashboard (stat cards, charts, recent activity)
- [ ] Users List (table, search, pagination, sorting)
- [ ] User Create/Edit (form, tenant dropdown, role assignment)
- [ ] User Details (profile, enrollments, devices)
- [ ] Tenants List (table, CRUD operations)
- [ ] Tenant Create/Edit (form, settings)
- [ ] Roles List (table, permissions)
- [ ] Role Create/Edit (permission checkboxes)
- [ ] Auth Flows (flow builder, operation types, step configuration)
- [ ] Devices (device list, status)
- [ ] Auth Sessions (session list, status tracking)
- [ ] Enrollments (enrollment list, user enrollments)
- [ ] Audit Logs (log table, filters, pagination)
- [ ] Analytics (pie/bar/area/radial charts)
- [ ] Settings (profile, theme, language, TOTP enrollment)
- [ ] Biometric Demo UI (localhost:8001 - enrollment, verification, liveness)

### 3.3 UI Quality Checks
- [ ] Responsive design (mobile, tablet, desktop viewports)
- [ ] Dark/light theme switching
- [ ] Turkish/English language switching (i18n completeness)
- [ ] Form validations (empty, invalid, boundary values)
- [ ] Error states (network errors, 403, 404, 500)
- [ ] Loading states (spinners, skeletons)
- [ ] Empty states (no data views)
- [ ] Navigation flow (sidebar, breadcrumbs, back button)

### 3.4 Auth Flow E2E Testing
- [ ] Password login flow (web)
- [ ] Email OTP flow (check logs for OTP code)
- [ ] TOTP flow (with authenticator app)
- [ ] Face verification flow (with camera)
- [ ] Multi-step flows (Password + TOTP, Password + Face)
- [ ] Auth flow builder (create, edit, delete flows)

### 3.5 Cross-Platform Testing
- [ ] Chrome, Firefox, Edge (via Playwright)
- [ ] Android APK (client-apps)
- [ ] Windows desktop (client-apps)
- [ ] API testing via Swagger UI

---

## Phase 4: Deployment & Infrastructure (MEDIUM)

### 4.1 CI/CD Pipeline ✅ DONE
- [x] Fix CI workflow (submodule checkout → infrastructure validation only)
- [x] Fix test scripts to use production HTTPS URL (Copilot review feedback)
- [x] Add `deploy-hetzner.yml` SSH deploy workflow to identity-core-api
- [x] Set GitHub secrets (VPS_HOST, VPS_USER, VPS_SSH_KEY) on FIVUCSAS + identity-core-api repos
- [x] Deploy key generated and authorized on Hetzner VPS

### 4.2 Biometric Processor Deployment ✅ DONE
- [x] `bio.fivucsas.com` DNS fully working
- [ ] Setup Cloudflare Tunnel on laptop GPU (GTX 1650) for GPU acceleration
- [ ] Deploy with GPU acceleration
- [ ] Verify face operations through tunnel

### 4.3 Production Sync
- [x] Identity Core API running on Hetzner VPS (api.fivucsas.com)
- [x] Rebuild and deploy web-app to Hostinger
- [ ] Run E2E tests against production
- [ ] Verify all services healthy

### 4.4 Real Email/SMS OTP Delivery
- [ ] Configure SMTP credentials for email OTP (SendGrid / AWS SES / direct SMTP) — DNS pending
- [ ] Test email OTP flow end-to-end
- [x] SMS gateway: Twilio activated, TwilioSmsService live ✅ 2026-04-13
- [x] Test SMS OTP flow end-to-end ✅ 2026-04-13

### 4.5 Web Frontend Sync
- [ ] Rebuild and deploy web-app dashboard to Hostinger if auth flow UI changed
- [ ] Verify multi-step auth flows work in production
- [ ] Test all 10 auth methods via production UI

### 4.6 Playwright E2E in CI ✅ DONE
- [x] Add Playwright E2E tests to GitHub Actions CI pipeline (playwright.yml workflow)
- [x] E2E failures reduced 54→9
- [ ] Run against production or staging environment
- [ ] Gate deployments on E2E pass

---

## Phase 5: Mobile App Completion (MEDIUM)

### 5.1 Client Apps (Kotlin Multiplatform)
- [ ] Run unit tests (needs Android SDK)
- [ ] Test step-up auth with fingerprint (ECDSA P-256)
- [ ] Test face enrollment via camera
- [ ] Build and test Android APK
- [ ] Build and test desktop JAR
- [ ] Coordinate with Aysenur on public key format

---

## Phase 6: Polish & Documentation (LOW)

### 6.1 Code Quality
- [ ] Remove fingerprint/voice stubs after WebAuthn decision
- [x] Fix UserController.getAllUsers() pagination (in-memory -> DB query) ✅ verified 2026-04-13
- [x] Connect TotpController to frontend enrollment
- [x] Connect QrCodeController to frontend
- [x] Connect EnrollmentManagementController to frontend ✅ verified 2026-04-13 (EnrollmentRepository.ts)

### 6.2 Documentation
- [ ] API documentation for auth endpoints
- [ ] Auth flow creation guide for admins
- [ ] Deployment procedures
- [ ] Update CLAUDE.md files
- [ ] Final project report

### 6.3 Security Audit
- [ ] JWT token expiration and refresh
- [ ] Rate limiting configuration
- [ ] CORS for production
- [ ] Biometric data encryption
- [ ] WebAuthn FIDO2 compliance

---

## Phase 7: Embeddable Auth Widget (March 2026)

Architecture: "Stripe Elements for Biometrics" — iframe-isolated biometric capture with Web Components API

### 7.1 Extract verify-app ✅ DONE
- [x] Extract MultiStepAuthFlow + 10 steps + biometric engine into standalone verify-app
- [x] WidgetDemoPage (/widget-demo) polished with live preview
- [x] Deploy to verify.fivucsas.com ✅
- [x] Implement postMessage bridge in verify-app (emit ready, step-change, complete, error, resize events to parent SDK) ✅ 2026-04-13

### 7.2 Build @fivucsas/auth-js SDK ✅ DONE
- [x] SDK module created (src/features/auth/components/sdk/)
- [x] Iframe creation and lifecycle management
- [x] postMessage communication bridge
- [x] Token management (exchange auth code for JWT)

### 7.3 Build @fivucsas/auth-elements
- [ ] <fivucsas-verify> Web Component
- [ ] <fivucsas-button> Web Component
- [ ] CSS Custom Properties theming

### 7.4 Build @fivucsas/auth-react ✅ DONE
- [x] FivucsasProvider context (src/features/auth/components/react/)
- [x] VerifyButton component
- [x] useVerification hook

### 7.5 OAuth 2.0 Endpoints ✅ DONE
- [x] POST /oauth2/authorize — OAuth2Controller
- [x] POST /oauth2/token — OAuth2Controller
- [x] GET /oauth2/userinfo — OAuth2Controller
- [x] GET /.well-known/openid-configuration — OpenIDConfigController
- [x] V24 migration: oauth2_clients table
- [x] OAuth2Service implementation

### 7.6 Dogfooding & Developer Portal
- [x] DeveloperPortalPage (/developer-portal) — SDK docs and integration guide
- [ ] web-app uses @fivucsas/auth-react for its own login
- [ ] client-apps uses WebView + verify-app
- [ ] Landing page demo with Web Component

---

## Hardware Procurement (Awaiting Purchase)

> Code is production-ready. Physical devices needed only for testing.

### Recommended Devices — Turkey (Best Price/Performance)

| Device | Est. TRY Price | Where to Buy | Use Case |
|--------|---------------|--------------|----------|
| **YubiKey Security Key C NFC** | ~2,000–2,500 | Trendyol, Hepsiburada | Hardware Key auth (USB-C + NFC) — best p/p |
| **YubiKey 5 NFC** | ~3,510 | Trendyol, Hepsiburada | Hardware Key (USB-A, wider compat) |
| **Token2 T2F2-PIN** | ~2,500–3,100 | token2.com (ships to TR) | Cheapest FIDO2, no NFC |

### Fingerprint
Platform authenticators (Windows Hello, Touch ID, Android biometrics) cover fingerprint via WebAuthn — no external reader needed. Kensington VeriMark is the only confirmed WebAuthn-compatible USB reader but is scarce and expensive in Turkey (~4,000–6,000 TRY, limited availability).

**Decision: Use built-in platform authenticators for fingerprint. Only buy a YubiKey for hardware key testing.**

---

## Architecture Decisions

| ID | Decision | Rationale | Status |
|----|----------|-----------|--------|
| AD-001 | Fingerprint: Use WebAuthn | No fingerprint SDK for web; WebAuthn is standard | Implemented |
| AD-002 | Voice: Resemblyzer 256-dim | Lightweight speaker verification, CPU-friendly | Implemented |
| AD-003 | NFC: Deferred | Mobile-only, needs hardware | Deferred |
| AD-004 | Health checks: curl | wget missing from Alpine, python fragile | Implemented |
| AD-005 | Client embedding: landmark-geometry only (2026-04-18) | MobileFaceNet deprecated; MediaPipe 512-dim covers pre-filter, server DeepFace Facenet512 authoritative | Implemented |
| AD-006 | SPA OAuth2 client: public + PKCE-only (2026-04-18) | `fivucsas-web-dashboard` flipped via Flyway V38 — SPA cannot hold secret | Implemented |

---

## Legacy timeline (pre-restructure reference)

| Phase | Target | Status |
|-------|--------|--------|
| Phase 1: Critical Fixes | March 2026 | DONE |
| Phase 2: Auth Completion | March 2026 | DONE (10/10 methods production) |
| Phase 3: AI Testing | March 2026 | In Progress |
| Phase 4: Deployment | March-April 2026 | In Progress |
| Phase 5: Mobile | April 2026 | In Progress (75%) |
| Phase 6: Polish | April 2026 | In Progress |
| Phase 7: Embeddable Auth Widget | March 2026 | In Progress (~90%) |
| Final Presentation | Spring 2026 | Scheduled |
