# FIVUCSAS - Product Roadmap

> Last updated: 2026-03-13

## Project Status Summary

- **Overall Completion**: ~95%
- **Production Services**: Identity Core API (GCP), Web Dashboard (Hostinger), Landing Website (Hostinger)
- **Local Dev**: Docker Compose (5 services, all healthy)
- **Tests**: 528+ backend, 224 E2E, 20 step-up unit tests

---

## Phase 1: Critical Fixes (IMMEDIATE)

### 1.1 Docker Health Checks
- [x] Fix identity-core-api health check (wget -> curl, install curl in Dockerfile)
- [x] Fix biometric-processor health check (wrong endpoint `/health` -> `/api/v1/health`)
- [x] Fix api-gateway health check (localhost -> 127.0.0.1 for Alpine)
- [x] Add HEALTHCHECK directive to biometric-processor Dockerfile
- [ ] Rebuild and verify all 5/5 containers healthy from clean state
- [ ] Test `docker compose down && docker compose up -d` works first-time clean

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
| 3 | SMS OTP | OK | OK | N/A | PRODUCTION (needs Twilio) |
| 4 | TOTP | OK | OK | N/A | PRODUCTION |
| 5 | Face | OK | OK | DeepFace | PRODUCTION |
| 6 | QR Code | OK | Token generation + manual entry | N/A | PARTIAL |
| 7 | Hardware Key | OK | Settings enrollment UI integrated | N/A | PARTIAL |
| 8 | Fingerprint | OK | WebAuthn mismatch | **Stub fails** | BROKEN |
| 9 | Voice | OK | Disabled | **Stub fails** | BROKEN |
| 10 | NFC Document | Hardcoded fail | Placeholder | N/A | FUTURE |

### 2.1 QR Code Auth Fix
- [x] Frontend: Fetch QR code challenge/token from QrCodeController
- [ ] Frontend: Display QR code image in QrCodeStep component
- [ ] Frontend: Add polling for scan completion
- [ ] Mobile: Implement QR scanner in client-apps
- [ ] E2E test for QR code flow

### 2.2 Hardware Key / WebAuthn Enrollment
- [ ] Create `HardwareKeyEnrollmentFlow.tsx` component
- [ ] Flow: register -> credentials.create() -> verify-registration
- [x] Add enrollment in Settings page
- [ ] Test with YubiKey, Windows Hello, Touch ID

### 2.3 Fingerprint Auth (Decision: Use WebAuthn)
- [ ] Refactor FingerprintAuthHandler to accept WebAuthn assertions
- [ ] Frontend: Use only `navigator.credentials.get()` with platform authenticator
- [ ] Backend: Validate WebAuthn signature instead of biometric-processor stub
- [ ] Remove biometric-processor fingerprint stub

### 2.4 Voice Auth (Decision Pending)
- [ ] **Option A**: Implement SpeechBrain/Resemblyzer in biometric-processor
- [ ] **Option B**: Mark as premium/future feature
- [ ] If implementing: voice enrollment + verification endpoints
- [ ] Re-enable in DEFAULT_AUTH_METHODS

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

### 4.1 Biometric Processor Deployment
- [ ] Setup Cloudflare Tunnel on laptop GPU (GTX 1650)
- [ ] Configure `bpa-fivucsas.rollingcatsoftware.com`
- [ ] Deploy with GPU acceleration
- [ ] Verify face operations through tunnel

### 4.2 Production Sync
- [ ] Rebuild and deploy identity-core-api to GCP VM
- [ ] Rebuild and deploy web-app to Hostinger
- [ ] Run E2E tests against production
- [ ] Verify all services healthy

### 4.3 CI/CD
- [ ] Add Docker build verification to GitHub Actions
- [ ] Add health check verification
- [ ] Add Playwright E2E in CI pipeline

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
- [ ] Fix UserController.getAllUsers() pagination (in-memory -> DB query)
- [x] Connect TotpController to frontend enrollment
- [x] Connect QrCodeController to frontend
- [ ] Connect EnrollmentManagementController to frontend

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

## Architecture Decisions

| ID | Decision | Rationale | Status |
|----|----------|-----------|--------|
| AD-001 | Fingerprint: Use WebAuthn | No fingerprint SDK for web; WebAuthn is standard | Pending |
| AD-002 | Voice: TBD | Needs ML model, high effort | Pending |
| AD-003 | NFC: Deferred | Mobile-only, needs hardware | Deferred |
| AD-004 | Health checks: curl | wget missing from Alpine, python fragile | Implemented |

---

## Timeline

| Phase | Target | Status |
|-------|--------|--------|
| Phase 1: Critical Fixes | March 2026 | In Progress |
| Phase 2: Auth Completion | March 2026 | Planned |
| Phase 3: AI Testing | March 2026 | Planned |
| Phase 4: Deployment | March-April 2026 | Planned |
| Phase 5: Mobile | April 2026 | Planned |
| Phase 6: Polish | April 2026 | Planned |
| Final Presentation | Spring 2026 | Scheduled |
