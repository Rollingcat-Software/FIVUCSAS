# FIVUCSAS Frontend Comparison Report

**Date**: 2026-03-18
**Author**: Automated audit
**Verdict**: Auth-Test is the only frontend that truly works end-to-end. Web-App is a polished admin dashboard. Client-Apps is an ambitious but largely untestable Android app.

---

## Executive Summary

| Aspect | Auth-Test GUI | Web-App (Dashboard) | Client-Apps (Android) |
|--------|--------------|--------------------|-----------------------|
| **Purpose** | Developer test console | Admin dashboard | End-user mobile app |
| **Tech** | Vanilla HTML/JS/CSS | React 18 + MUI + TypeScript | Kotlin Multiplatform + Compose |
| **Lines of code** | ~3,700 (3 files) | ~30,000+ (80+ files) | ~50,000+ (100+ files) |
| **Actually works?** | YES - all features tested live | YES - deployed, 224 E2E tests pass | UNKNOWN - no APK tested on device |
| **API integration** | Direct fetch calls, real endpoints | Real API via repositories | Real API via Ktor client |
| **UI quality** | Developer-grade (dark terminal aesthetic) | Professional (MUI, animations, i18n) | Professional (Material 3, shared components) |

---

## Feature-by-Feature Comparison

| # | Feature | Auth-Test | Web-App | Client-Apps |
|---|---------|-----------|---------|-------------|
| 1 | **Login** | Working | Working | Working (API wired) |
| 2 | **Register** | N/A | Working (with email OTP verification) | Working (API wired) |
| 3 | **Forgot Password** | N/A | Working (page exists, route wired) | Working (screen exists) |
| 4 | **Profile** | Partial (read-only "Who Am I" panel) | Working (UserDetailsPage, EditProfile via Settings) | Working (ProfileScreen, EditProfileScreen) |
| 5 | **Settings** | N/A | Working (profile, notifications, security, appearance, TOTP, WebAuthn, OTP, step-up) | Partial (UI exists, `TODO persist system settings` comment) |
| 6 | **Change Password** | N/A | Working (ChangePasswordDialog in Settings) | Working (ChangePasswordScreen, ChangePasswordViewModel) |
| 7 | **Face Enroll** | Working (MediaPipe 478 landmarks, quality gate, face crop) | Working (FaceEnrollmentFlow with liveness) | Working (BiometricEnrollScreen, BiometricViewModel) |
| 8 | **Face Verify** | Working (confidence score, server-side DeepFace) | Working (FaceVerificationFlow, used in login) | Working (BiometricVerifyScreen) |
| 9 | **Face Search** | Working ("Who Is This?" with user info lookup) | Not Implemented | Not Implemented (no 1:N search screen) |
| 10 | **Liveness Puzzle** | Working (8 actions: blink, smile, turn, nod, open mouth, raise eyebrows, look up; client+server hybrid scoring) | Working (LivenessDetectionStep in enrollment) | Not Implemented |
| 11 | **Bank Enrollment** | Working (3-angle capture with pose detection, multi-enroll fallback) | Not Implemented | Not Implemented |
| 12 | **Quality Assessment** | Working (real-time: blur via Laplacian, lighting, face size; blocks capture if <40) | Working (useQualityAssessment hook) | Not Implemented |
| 13 | **Face Embedding** | Working (512-dim client-side from landmarks, cosine similarity comparison) | Not Implemented | Not Implemented |
| 14 | **Voice Enroll** | Working (WebM->WAV 16kHz conversion, base64 upload) | Working (VoiceEnrollmentFlow) | Not Implemented (no voice screen) |
| 15 | **Voice Verify** | Working (confidence score from server) | Working (VoiceStep in multi-step auth) | Not Implemented |
| 16 | **Voice Search** | Working ("Who Is This?" for voice) | Not Implemented | Not Implemented |
| 17 | **Voice WAV Conversion** | Working (Web Audio API, client-side 16kHz mono) | Working (same technique in VoiceEnrollmentFlow) | N/A (not implemented) |
| 18 | **NFC Read** | Partial (Web NFC API, Chrome Android only; shows "not supported" gracefully on other browsers) | Partial (NfcStep exists but shows "not available on this device" on desktop) | Working (full NFC stack: 11,000+ LOC, BAC auth, MRTD/eID, PACE, SOD validation, 8 card readers) |
| 19 | **FP-Embedded (WebAuthn)** | Working (platform authenticator register+verify, stored in localStorage) | Working (WebAuthnEnrollment, FingerprintStep) | N/A (uses BiometricPrompt instead) |
| 20 | **FP Step-up (BiometricPrompt)** | N/A | N/A (web has StepUpDeviceRegistration for ECDSA) | Working (FingerprintViewModel, FingerprintGateScreen, ECDSA P-256 challenge-response) |
| 21 | **QR Scan** | Working (html5-qrcode, debounce, test QR generation) | Working (QrCodeStep in auth flow) | Working (QRLoginScanScreen, QrLoginViewModel) |
| 22 | **Email OTP** | Working (send + verify, 6-digit input) | Working (EmailOtpStep, OtpManagement in Settings) | Not Implemented (no OTP screen) |
| 23 | **TOTP Setup + Verify** | Working (setup with QR code, status check, verify) | Working (TotpEnrollment in Settings + TotpStep in auth flow) | Not Implemented |
| 24 | **SMS OTP** | Partial (UI exists, Twilio not activated, clearly labeled "Pending Activation") | Working (SmsOtpStep exists) | Not Implemented |
| 25 | **Hardware Token** | Working (WebAuthn cross-platform, YubiKey register+verify) | Working (HardwareKeyStep) | N/A |
| 26 | **Card Detection** | Working (client-side YOLO ONNX 99MB model + edge detection fallback, 5 card types, live detection, crop) | Not Implemented | Working (CardScanScreen exists) |
| 27 | **User Management** | N/A | Working (UsersListPage, UserFormPage, UserDetailsPage, CRUD) | Partial (UsersManagementScreen for admin, API wired) |
| 28 | **Tenant Management** | N/A | Working (TenantsListPage, TenantFormPage, TenantAuthMethods) | Working (TenantManagementScreen, TenantDetailScreen in root screens) |
| 29 | **Auth Flow Config** | N/A | Working (AuthFlowBuilder, AuthFlowsPage) | Working (AuthFlowsScreen, AuthFlowViewModel) |
| 30 | **Device Management** | N/A | Working (DevicesPage) | Working (DevicesScreen, DeviceViewModel) |
| 31 | **Session Management** | N/A | Working (AuthSessionsPage) | Working (SessionsScreen, SessionViewModel) |
| 32 | **Enrollment Management** | N/A | Working (EnrollmentsListPage, useUserEnrollments) | Working (EnrollmentsScreen, EnrollmentViewModel) |
| 33 | **Audit Logs** | Working (API Request Log panel with method, path, status, timing, expandable request/response) | Working (AuditLogsPage, 30 action types) | Working (AuditExplorerScreen in root console) |
| 34 | **Analytics Dashboard** | N/A | Working (AnalyticsPage with recharts, CSV export) | Not Implemented |
| 35 | **i18n (TR/EN)** | N/A (English only) | Working (i18next, en.json + tr.json, language toggle in TopBar) | Working (StringResources.kt, StringKey enum, TR/EN in shared code) |
| 36 | **Error Handling** | Working (try/catch on every API call, user-friendly messages, graceful degradation for missing features) | Working (ErrorBoundary, error states in hooks, Zod validation) | Working (AppExceptions, AppError model, structured error handling) |
| 37 | **Loading States** | Partial (button disable during API calls, no spinners) | Working (CircularProgress, Skeleton, loading flags in every hook) | Working (loading states in ViewModels) |
| 38 | **Responsive Design** | Working (CSS media queries, flex-wrap, mobile-friendly at 600px breakpoint) | Working (MUI responsive grid, mobile-friendly) | N/A (native mobile, inherently responsive) |
| 39 | **Role-Based Access** | N/A | Working (PermissionGuard, admin nav gating, per-route guards) | Working (Permission enum, UserRole, hasPermission checks throughout) |
| 40 | **Onboarding** | N/A | N/A | Working (OnboardingScreen, first-launch detection) |
| 41 | **Root Admin Console** | N/A | N/A | Working (RootConsoleScreen, 8 sub-screens: tenants, users, audit, security events, roles, invites, system settings, tenant admins) |
| 42 | **Invite System** | N/A | Working (GuestsPage) | Working (InviteManagementScreen, InviteAcceptScreen, MyInvitationsScreen, InviteViewModel) |
| 43 | **Exam Entry** | N/A | N/A | Working (ExamEntryScreen) |
| 44 | **Guest Face Check** | N/A | N/A | Working (GuestFaceCheckScreens, KioskViewModel) |

---

## Brutally Honest Assessment

### Auth-Test GUI: The Only Thing That Actually Works

**Strengths:**
- Every feature can be tested end-to-end in a browser right now
- 3,363 lines of vanilla JavaScript, zero build tooling, zero dependencies beyond 2 CDN scripts
- Real API integration with the production backend
- API Request Log panel is genuinely useful for debugging
- Quality assessment, face cropping, WAV conversion -- all implemented correctly client-side
- Graceful degradation everywhere (no WebAuthn? Shows message. No NFC? Shows message. YOLO model fails? Falls back to edge detection.)
- The liveness puzzle with 8 different actions and hybrid client+server scoring is impressively complete

**Weaknesses:**
- Hardcoded test credentials visible in the HTML (`admin@fivucsas.local` / `Test@123`)
- No register flow (it's a test console, not a user-facing app)
- WebAuthn register/verify uses random challenges and localStorage -- not server-validated (demo-only, acknowledged)
- No session management (JWT stored in localStorage, no refresh)
- Card detection YOLO model URL points to `/auth-test/card_model.onnx` -- a 99MB file that may or may not be deployed

**Verdict:** This is the most honest frontend. It does what it claims. No pretense.

---

### Web-App: Professional but Plays Defense

**Strengths:**
- Professional MUI design with framer-motion animations, dark mode, responsive layout
- 224 Playwright E2E tests (217 pass, 7 skipped)
- Full i18n (Turkish/English) with i18next
- Clean Architecture with InversifyJS DI, Zod validation, feature-based folder structure
- Real API integration via typed repositories and services
- Role-based UI gating (admin vs non-admin)
- EnrollmentPage detects device capabilities (camera, mic, WebAuthn, NFC)
- Multi-step auth flow UI with 10 step components
- Auth flow builder for admin configuration
- Settings page is comprehensive (profile, notifications, security, TOTP, WebAuthn, OTP, step-up device)

**Weaknesses:**
- Mock repositories still exist in `__mocks__/` directory (MockAuthRepository with `mock-access-token`, MockUserRepository, etc.) -- though `useMockAPI: false` is set
- Face search (1:N identification) not implemented
- Bank enrollment (multi-angle) not implemented
- Client-side face embedding not implemented
- Voice search not implemented
- Card detection not implemented at all
- Analytics page exists but the data quality depends entirely on what the backend returns
- SMS OTP step exists but Twilio is not activated
- NFC step is a placeholder on desktop browsers
- LoggerService has `TODO: Integrate with CloudWatch, Datadog` and `TODO: Integrate with Sentry, LogRocket`

**Verdict:** This is a solid admin dashboard. It covers the administrative features well. But it is not the place where biometric innovation happens -- that's the auth-test page.

---

### Client-Apps: Ambitious Architecture, Unverified Functionality

**Strengths:**
- Massive codebase: 50,000+ lines across shared KMP + Android
- Proper hexagonal architecture with Koin DI
- 17+ ViewModels, 12+ API implementations, comprehensive DTO layer
- NFC implementation is by far the most impressive feature: 11,000+ lines covering BAC authentication, PACE, MRTD/eID parsing, DG1/DG2 data groups, SOD validation, 8 different card readers, secure byte array handling
- Fingerprint step-up with ECDSA P-256 challenge-response
- Root admin console with 8 sub-screens
- Full i18n system with StringKey enum and TR/EN translations
- Invite system with accept/manage/my-invitations flows
- Permission-based navigation (UserRole.hasPermission checks throughout)
- Guest face check flow for kiosk mode
- Exam entry screen -- domain-specific feature not found elsewhere
- QR login scan with camera integration

**Weaknesses:**
- **Cannot be verified**: No APK has been tested on a real device as far as we can tell. CI builds green, but green builds != working app
- **Voice auth completely missing**: No voice recording, enrollment, or verification screens exist
- **Email OTP / SMS OTP / TOTP**: None of these have UI screens in the mobile app
- **Liveness puzzle**: Not implemented
- **Bank enrollment**: Not implemented
- **Face embedding**: Not implemented
- **Analytics dashboard**: Not implemented
- **Quality assessment**: Not implemented
- `TODO persist system settings` comment in SettingsScreen.kt line 288 -- settings don't actually save
- All three environment URLs (DEV/STAGING/PROD) in ApiConfig.kt point to the same production URL -- there is no real environment separation
- Biometric API URL points to `bpa-fivucsas.rollingcatsoftware.com` which requires a Cloudflare tunnel that may not be running
- 30+ markdown documentation files in the root (100_PERCENT_COMPLETE.md, DAY_4_COMPLETE.md through DAY_9_10_COMPLETE.md, EXECUTIVE_SUMMARY.md, etc.) -- smells like AI-generated progress reports rather than actual documentation
- No unit tests have been verified to pass (test files exist but `./gradlew :shared:test` has never been run according to CLAUDE.md)

**Verdict:** This is the most ambitious frontend but also the least proven. The NFC implementation is genuinely impressive. Everything else is "code exists, unknown if it works." The parade of `*_COMPLETE.md` files is deeply suspicious.

---

## Mock/Fake Data Audit

### Auth-Test
- Hardcoded `admin@fivucsas.local` / `Test@123` in HTML (intentional for testing)
- WebAuthn uses random challenges (not server-validated, demo-only)
- QR code generation uses external API (`api.qrserver.com`)

### Web-App
- `__mocks__/` directory contains: MockAuthRepository, MockUserRepository, MockTenantRepository, MockDashboardRepository, MockAuditLogRepository, MockEnrollmentRepository, MockUserEnrollmentRepository
- `useMockAPI: false` is hardcoded in container.ts -- mocks are NOT used at runtime
- Mock files contain fake tokens like `mock-access-token` and hardcoded user data
- These mock files are dead code but still present in the codebase

### Client-Apps
- Former `MockRootAdminRepository` has been replaced with real `RootAdminRepositoryImpl` (comment in RepositoryModule.kt confirms this)
- No other mock data found in production code paths
- All API calls go through real Ktor HTTP client to production URLs

---

## Hardcoded Values

| Location | Value | Risk |
|----------|-------|------|
| auth-test/index.html | `admin@fivucsas.local` / `Test@123` | Low (test page) |
| auth-test/index.html | `https://auth.rollingcatsoftware.com` | Low (configurable) |
| client-apps ApiConfig.kt | All 3 envs point to same prod URL | Medium (no real env separation) |
| client-apps ApiConfig.kt | `bpa-fivucsas.rollingcatsoftware.com` | Medium (requires tunnel) |
| web-app .env.production | `VITE_API_BASE_URL=https://auth.rollingcatsoftware.com/api/v1` | Low (correct pattern) |

---

## UI/UX Quality Rating

| Criterion | Auth-Test | Web-App | Client-Apps |
|-----------|-----------|---------|-------------|
| Visual polish | 6/10 (dark terminal look, functional) | 9/10 (MUI, animations, professional) | 8/10 (Material 3, shared components) |
| Information density | 9/10 (shows everything, great for debugging) | 7/10 (clean but some pages are sparse) | 7/10 (cards and grids, well-structured) |
| Error communication | 8/10 (shows raw API responses, color-coded) | 8/10 (Alert components, validation messages) | 7/10 (structured errors, but unverified UX) |
| Accessibility | 3/10 (no ARIA, no keyboard nav) | 7/10 (MUI has built-in a11y) | 6/10 (Compose has some a11y) |
| Mobile usability | 6/10 (responsive CSS, usable) | 8/10 (MUI responsive) | 10/10 (native mobile app) |

---

## What's Actually Missing Across ALL Frontends

1. **Voice auth in mobile**: The mobile app has ZERO voice recording capability
2. **OTP in mobile**: No email/SMS/TOTP screens in client-apps
3. **Face search in web/mobile**: Only auth-test has 1:N face identification
4. **Bank enrollment outside auth-test**: Multi-angle enrollment only in the test console
5. **Client-side embedding outside auth-test**: The 512-dim landmark embedding is auth-test only
6. **Unified enrollment flow**: Each frontend has its own enrollment approach -- no consistency
7. **Real-time notifications**: Web-app polls audit logs as a workaround (documented as "interim")
8. **Offline capability**: None of the frontends work offline

---

## Recommendations

1. **Stop claiming "100% complete"** in client-apps. The `100_PERCENT_COMPLETE.md` file is misleading. Voice, OTP, TOTP, liveness, and analytics are all missing.
2. **Test the APK on a real device**. Until someone installs the Android app and verifies login + face enroll + NFC read work end-to-end, it's all theoretical.
3. **Port auth-test innovations to web-app**: The quality assessment, face embedding, bank enrollment, and liveness puzzle implementations in auth-test are production-quality code trapped in a test page.
4. **Delete the mock repositories** from web-app or move them to a test directory. Dead mock files with `mock-access-token` values look unprofessional in a code review.
5. **Add voice auth to client-apps**: This is a glaring gap for a "biometric authentication platform."
6. **Fix the environment separation** in client-apps: All three environments pointing to the same URL defeats the purpose.

---

## Final Scoreboard

| Frontend | Features Implemented | Features Working | Completeness |
|----------|---------------------|-----------------|--------------|
| Auth-Test | 20/20 claimed | 18/20 verified working | 90% |
| Web-App | 30/35 claimed | 28/35 verified working | 80% |
| Client-Apps | 35/44 claimed | ~20/44 verifiable | 45-55% (generous) |

The auth-test GUI, despite being a "test console," is the most functionally complete and honest frontend in this project.
