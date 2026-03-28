# TODO - FIVUCSAS Remaining Work

## ~~High Priority — Phase 8: Identity Verification Pipeline~~ ✅ COMPLETE (2026-03-28)

- [x] **V26 Flyway migration** — `verification_sessions`, `verification_step_results`, `verification_documents` tables + `industry_verified` flag on users
- [x] **VerificationController + ManageVerificationService** — Core API for creating/executing verification pipelines (hexagonal architecture)
- [x] **FlowType enum** — Distinguish AUTHENTICATION vs VERIFICATION vs ENROLLMENT vs ONBOARDING flows
- [x] **Document scan → OCR pipeline** — Wire YOLO card detection + Tesseract OCR for MRZ/text extraction from TC Kimlik and passports
- [x] **NFC chip read in pipeline** — Wire existing NFC reader (11,089 lines) into verification step flow
- [x] **Face-to-document matching** — DeepFace cosine similarity between live face and document photo (FACE_MATCH step)
- [x] **Liveness in pipeline** — Integrate EnhancedLivenessDetector as LIVENESS_CHECK verification step
- [x] **Verification flow builder UI** — Extend existing Auth Flow Builder for verification pipelines
- [x] **Industry templates** — Banking KYC (BDDK), Healthcare (SGK), Education (YOK), Government (e-Devlet), Fintech (TCMB), Telecom (BTK), Gig Economy
- [x] **Verification dashboard** — Pipeline completion rates, avg time, failure reasons (recharts)
- [x] **Advanced steps** — ADDRESS_PROOF, WATCHLIST_CHECK, AGE_VERIFICATION, PHONE_VERIFICATION, CREDIT_CHECK, VIDEO_INTERVIEW (V28)
- [x] **9 step handlers** — handler registry, biometric client, orchestration engine
- [x] **Android CI** — GitHub Actions APK build workflow
- [x] **iOS CI** — GitHub Actions iOS build workflow
- [x] **Tesseract OCR** — TC Kimlik field extraction (name, TC number, DOB, photo)
- [x] **Fixes** — Liveness 415, RLS wired, CORS, CSP, Turkish chars, quality score display, profile menu, card type display, admin-only pages, login page cleanup, hardware key info
- [x] **Tests** — Health 17/17, CRUD 33/33, RBAC 40/40, Verification 13/13, Playwright 28 specs

## High Priority — Remaining

- [ ] **Coordinate with Aysenur** - Share step-up endpoint docs, verify public key format (X.509 DER Base64 vs Android Keystore), test end-to-end
- [ ] **Cloudflare Tunnel for Biometric Processor** - Setup tunnel from laptop GPU (GTX 1650) to `bpa-fivucsas.rollingcatsoftware.com` (scripts ready in deploy/)
- [ ] **Final Presentation Delivery** - Spring 2026 (slides and speaker notes ready)
- [ ] **Performance optimization** — biometric-api memory (3.5GB+), pgvector HNSW indexes, voice thread pool, health check latency

## Medium Priority

- [ ] **Mobile App Unit Tests** - Run `./gradlew :shared:test` (7 test files, needs Android SDK)
- [ ] **Desktop App (Kiosk Mode)** - Finalize Kotlin Compose Desktop for kiosk enrollment stations
- [ ] **NFC Document Hardware Integration** - Physical NFC reader support for document verification
- [ ] **Full WebAuthn Attestation** - CBOR signature verification for hardware keys

## Completed

- [x] Identity Core API deployment on Hetzner VPS
- [x] Web Dashboard deployment to Hostinger
- [x] Landing Website deployment
- [x] Audit log persistence fix
- [x] Sample data seeding (V15 migration)
- [x] Audit log filter fix (frontend params flattening)
- [x] User creation form UX fix (tenant dropdown)
- [x] Tenant create/edit form page
- [x] Multi-modal auth system architecture (10 documents)
- [x] Phase 1: Backend foundation (V16 migration, entities, repos, services, controllers)
- [x] Phase 2: Core auth handlers (Password, Face, Email OTP, QR Code)
- [x] CI/CD Pipeline (GitHub Actions)
- [x] Mobile app production API URLs configured
- [x] **All 10 auth handlers implemented** (TOTP, SMS OTP, Fingerprint, Voice, Hardware Key, NFC Document)
- [x] **Device constraint enforcement** (PASSWORD mandatory for APP_LOGIN/API_ACCESS)
- [x] **BiometricServicePort extended** (verifyFingerprint, verifyVoice)
- [x] **Infrastructure services** (TotpService, SmsService/NoOpSmsService, WebAuthnService)
- [x] **Frontend Auth Flow Admin UI** (AuthFlowRepository, AuthFlowBuilder with operation types, flows list page)
- [x] **Frontend Multi-Step Auth UI** (10 step components, MultiStepAuthFlow controller, StepProgress)
- [x] **Admin Pages** (DevicesPage, AuthSessionsPage)
- [x] **Navigation updated** (Auth Flows, Devices in sidebar)
- [x] **E2E test setup** (Playwright config, 4 test specs, MCP config)
- [x] **Unit tests** (6 new handler tests + ManageAuthFlowService constraint tests)
- [x] **Tenant-Configurable Auth Methods** - Auth flow builder with per-tenant operation type config
- [x] **Automated Deployment Pipeline** - CI/CD with GitHub Actions
- [x] **Deploy Updated Backend** - JAR deployed to Hetzner VPS (all 10 auth handlers live)
- [x] **Deploy Updated Frontend** - Web-app uploaded to Hostinger (multi-step auth UI live)
- [x] **Playwright E2E Tests** - 14/14 pass against production (auth setup pattern, sessionStorage injection)
- [x] **Production 500 fixes** - Auth-flows/devices hardcoded tenantId replaced with auth context UUID
- [x] **System-wide improvements** - DeepFace 0.0.98, anti-spoofing, browser face detection, API key auth
- [x] **Tenant-level device listing** - DeviceController accepts userId or tenantId
- [x] **Deploy scripts updated** - trycloudflare.com quick tunnel, DeepFace 0.0.98
- [x] **Rate Limiting verified** - Confirmed working via E2E tests (429 responses observed and handled)
- [x] **i18n (Turkish/English)** - Full bilingual UI with i18next
- [x] **Advanced Analytics** - Charts and trends with recharts (pie, bar, area, radial bar)
- [x] **TOTP Enrollment Flow** - TOTP setup with QR code in Settings page
- [x] **Real-time Notifications** - Audit log polling notification panel
- [x] **TestContainers Integration Tests** - 24 tests (5 auth flow + 19 user API)
- [x] **SMS Gateway Integration** - TwilioSmsService implemented (ready for activation)
- [x] **Presentation Slides** - Spring 2026 final presentation and speaker notes
- [x] **MediaPipe Face Detection** - Browser-side face quality checks
- [x] **Playwright E2E expanded** - 224 tests (217 pass, 7 skipped) covering all 16 pages
- [x] **Fingerprint step-up backend** - V17 migration, StepUpController, ECDSA P-256, Redis challenges
- [x] **Step-up backend deployed to Hetzner VPS** - V17 applied, 3 endpoints live, smoke-tested (Feb 21)
- [x] **Step-up unit tests** - 20 tests (8 StepUpChallengeService + 12 StepUpAuthService)
- [x] **Auth flow contract alignment (web-app)** - backend-driven auth methods and typed operation mapping
- [x] **TOTP frontend wiring** - `TotpEnrollment` integrated with backend setup/verify endpoints
- [x] **QR runtime wiring** - multi-step flow now generates QR token from backend with manual fallback
- [x] **WebAuthn settings integration** - platform and hardware-key enrollment dialogs added
- [x] **Auth flow guardrails hardened** - required-step restrictions expanded (NFC_DOCUMENT/FINGERPRINT/VOICE)
- [x] **Identity-core compile blocker fixed** - `QrSessionService` updated for role-name accessors
- [x] **Phase 8 Verification Pipeline** - Full IVP with 9 step types, 7 industry templates, V26-V28 migrations (2026-03-28)
- [x] **Embeddable Auth Widget** - verify-app, @fivucsas/auth-js SDK, @fivucsas/auth-react, OAuth 2.0 (2026-03-28)
- [x] **All 10 auth methods production** - Fingerprint/HardwareKey→WebAuthn, Voice→Resemblyzer, data wrapping fix (2026-03-28)
- [x] **Flyway V1-V28** - All migrations applied including verification pipeline and video interview (2026-03-28)
- [x] **Android CI + iOS CI** - GitHub Actions build workflows (2026-03-28)
