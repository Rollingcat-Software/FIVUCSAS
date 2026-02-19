# TODO - FIVUCSAS Remaining Work

## High Priority

- [ ] **Cloudflare Tunnel for Biometric Processor** - Setup tunnel from laptop GPU (GTX 1650) to `bpa-fivucsas.rollingcatsoftware.com`
- [ ] **Mobile App E2E Testing** - Full integration testing with production API URLs
- [ ] **Deploy Updated Backend** - Build JAR, deploy to GCP VM with new auth handlers
- [ ] **Deploy Updated Frontend** - Build web-app, upload to Hostinger

## Medium Priority

- [ ] **Identity Core API Integration Tests** - Comprehensive API test suite with TestContainers
- [ ] **Playwright E2E Tests** - Run automated browser tests against production
- [ ] **Rate Limiting Verification** - Test rate limiting on production endpoints
- [ ] **Desktop App (Kiosk Mode)** - Finalize Kotlin Compose Desktop for kiosk enrollment stations
- [ ] **SMS Gateway Integration** - Replace NoOpSmsService with Twilio/Vonage
- [ ] **TOTP Enrollment Flow** - Complete TOTP setup with QR code in web dashboard

## Low Priority / Future

- [ ] **Real-time Notifications** - WebSocket or SSE for admin dashboard alerts
- [ ] **Advanced Analytics** - Charts and trends in dashboard (login patterns, biometric success rates)
- [ ] **Multi-language Support** - i18n for web dashboard (Turkish, English)
- [ ] **NFC Document Hardware Integration** - Physical NFC reader support for document verification
- [ ] **Full WebAuthn Attestation** - CBOR signature verification for hardware keys

## Completed

- [x] Identity Core API deployment on GCP
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
