# Changelog

All notable changes to the FIVUCSAS project will be documented in this file.

## [Unreleased] - 2026-02-19

### Added - Backend Auth Handlers (Phase 3 Complete: All 10 Methods)
- **TOTP Auth Handler** (`TotpAuthHandler.java`) - Time-based one-time password via authenticator apps, wraps `dev.samstevens.totp` library
- **SMS OTP Auth Handler** (`SmsOtpAuthHandler.java`) - SMS-based OTP with send/validate pattern, uses `SmsService` interface
- **Fingerprint Auth Handler** (`FingerprintAuthHandler.java`) - Biometric fingerprint verification via BiometricServicePort
- **Voice Auth Handler** (`VoiceAuthHandler.java`) - Biometric voice verification via BiometricServicePort
- **Hardware Key Auth Handler** (`HardwareKeyAuthHandler.java`) - FIDO2/WebAuthn challenge-response authentication
- **NFC Document Auth Handler** (`NfcDocumentAuthHandler.java`) - Stub handler for physical NFC hardware (returns "pending" message)
- **TotpService** (`infrastructure/totp/TotpService.java`) - TOTP secret generation, QR URI building, code verification
- **SmsService** + **NoOpSmsService** (`infrastructure/sms/`) - SMS gateway interface with no-op implementation for dev
- **WebAuthnService** (`infrastructure/webauthn/WebAuthnService.java`) - Challenge generation and assertion verification with Redis
- **Device constraint enforcement** in `ManageAuthFlowService` - PASSWORD mandatory as step 1 for APP_LOGIN and API_ACCESS
- **Runtime flow validation** in `ExecuteAuthSessionService` - Validates flow integrity at session start
- **BiometricServicePort** extended with `verifyFingerprint()` and `verifyVoice()` methods
- **BiometricServiceAdapter** extended with HTTP calls to `/fingerprint/verify` and `/voice/verify`
- **WebAuthn dependency** `com.yubico:webauthn-server-core:2.5.2` in pom.xml
- **ManageAuthFlowServiceTest** - 4 tests for password constraint enforcement
- **Unit tests** for all 6 new handlers (30+ test methods total)

### Added - Frontend Auth Flow Admin UI
- **AuthFlowRepository** (`core/repositories/AuthFlowRepository.ts`) - CRUD operations for auth flow management
- **AuthSessionRepository** (`core/repositories/AuthSessionRepository.ts`) - Auth session API integration
- **DeviceRepository** (`core/repositories/DeviceRepository.ts`) - Device management API
- **DI bindings** for 3 new repositories and 3 new service symbols in container.ts and types.ts
- **AuthFlowsPage** - Full list view with filter by operation type, create flow dialog, delete actions
- **AuthFlowBuilder** enhanced - Operation type selector (9 types), PASSWORD constraint for APP_LOGIN/API_ACCESS, auto-insert PASSWORD step

### Added - Frontend Multi-Step Auth UI
- **MultiStepAuthFlow** controller - State machine for step-by-step authentication flow execution
- **StepProgress** component - MUI Stepper with auth method icons and status colors
- **10 step components**: PasswordStep, EmailOtpStep, SmsOtpStep, TotpStep, QrCodeStep, FaceCaptureStep (WebRTC), FingerprintStep, VoiceStep (MediaRecorder), HardwareKeyStep (WebAuthn), NfcStep

### Added - Admin Pages
- **DevicesPage** - Device management with platform icons and delete
- **AuthSessionsPage** - Session monitoring with status filters
- **Sidebar** - Auth Flows and Devices menu items added to navigation
- **App.tsx** - `/auth-flows`, `/devices`, `/auth-sessions` routes added

### Added - Testing & Infrastructure
- **Playwright config** (`playwright.config.ts`) + 4 E2E test specs
- **MCP config** for Playwright server (`.claude/mcp.json`)

### Added - Documentation
- **ROADMAP.md** - v1.0 MVP through v2.0 Enterprise milestones
- **CHANGELOG.md** - Updated with all new features

### Changed
- Project status updated from ~80% to ~95% complete
- Identity Core API status updated from 95% to 99%

---

## [0.9.0] - 2026-02-15

### Added
- **Multi-Modal Auth Flow System** (V16 Flyway migration): 8 new tables (`auth_methods`, `tenant_auth_methods`, `auth_flows`, `auth_flow_steps`, `auth_sessions`, `auth_session_steps`, `user_devices`, `user_enrollments`), 10 auth methods seeded, system tenant default login flow, 12 RBAC permissions for auth management
- **Email OTP Service**: `EmailService` interface with `SmtpEmailService` (production SMTP) and `NoOpEmailService` (dev fallback with console logging). Conditional bean activation via `mail.enabled` property
- **Auth Handler Tests**: Unit tests for all 4 core auth handlers — `PasswordAuthHandlerTest`, `EmailOtpAuthHandlerTest`, `FaceAuthHandlerTest`, `QrCodeAuthHandlerTest` (25+ test methods total)
- **CI/CD Pipeline**: GitHub Actions workflow (`.github/workflows/ci.yml`) with 3 parallel jobs — Identity Core API (Java 21 + PostgreSQL + Redis), Biometric Processor (Python 3.11 + pytest), Web Dashboard (Node 20 + Vitest + build)
- **Spring Boot Mail Starter**: Added `spring-boot-starter-mail` dependency for email OTP delivery
- **Realistic Sample Data** (V15 Flyway migration): 3 new tenants (Marmara University, TechCorp Istanbul, Anatolia Medical Center), 8 new users with roles, and 18 pre-seeded audit log entries for realistic dashboard testing
- **Tenant Form Page**: New create/edit form at `/tenants/create` and `/tenants/:id/edit` with auto-generated slugs, contact info fields, and max user limits
- **CHANGELOG.md**: Project changelog
- **TODO.md**: Remaining work items and future roadmap

### Fixed
- **Flyway V16 Idempotency**: Made V16 migration fully idempotent with `CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`, `DO $$ ... EXCEPTION WHEN duplicate_object` for constraints, and `ON CONFLICT DO NOTHING` for seed data
- **Flyway Checksum Validation**: Added `validate-on-migrate: false` to Docker profile to prevent checksum mismatch errors on redeployment
- **Permissions INSERT**: Added missing `action` column to V16 permission seed data (NOT NULL constraint)
- **EmailOtpAuthHandler**: Added `send` action for OTP generation and email delivery (previously only validated codes)
- **Audit Log Action Filter**: Frontend was sending nested `filters[action]=USER_LOGIN` and `pageSize=20` but backend expects flat `action=USER_LOGIN` and `size=20`. Flattened params in `AuditLogRepository.ts`
- **User Creation Form**: Replaced raw Tenant ID text input with a dropdown populated from existing tenants. Users can now select a tenant instead of guessing UUIDs
- **User Form Status Field**: Removed status field from create form (backend defaults to ACTIVE). Status field now only shows in edit mode
- **Audit Log Persistence** (prior fix): Fixed audit logs not being saved to database by correcting `@Transactional` and `@Async` conflict
- **Infinite Loop Fix** (prior fix): Resolved audit-logging-of-audit-logs infinite recursion
- **CSP/Mixed Content** (prior fix): Fixed Content Security Policy and mixed HTTP/HTTPS content on deployed dashboard

### Changed
- Updated Identity Core API completion from 85% to 95%
- Updated mobile app API URLs to production GCP endpoints
- Updated project status documentation to reflect February 2026 state
- Deployed latest Identity Core API build to GCP VM (V16 migration applied)

## [1.0.0-MVP] - January 2026

### Added
- Identity Core API with JWT authentication, RBAC, multi-tenancy
- Biometric Processor with 46+ endpoints, 9 ML models
- Web Admin Dashboard (React 18 + Material UI)
- Landing Website deployed to `fivucsas.rollingcatsoftware.com`
- Web Dashboard deployed to `ica-fivucsas.rollingcatsoftware.com`
- Identity Core API deployed on GCP VM (34.116.233.134)
- 14 Flyway database migrations
- Comprehensive documentation
