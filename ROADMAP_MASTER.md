# FIVUCSAS -- Master Roadmap

**Project**: Face and Identity Verification Using Cloud-based SaaS
**Organization**: Marmara University -- Computer Engineering Department
**Course**: CSE4297/CSE4197 Engineering Project
**Author**: Ahmet Abdullah Gultekin
**Last Updated**: 2026-04-05
**Overall Completion**: 95%

---

## Executive Summary

FIVUCSAS is a multi-tenant, cloud-based biometric authentication and identity verification platform. It supports 10 authentication methods (password, face, voice, fingerprint, NFC, TOTP, SMS OTP, email OTP, QR code, hardware key) and a 9-step identity verification pipeline with industry-specific templates for Banking, Healthcare, Education, Government, and Fintech. The platform follows hexagonal architecture across all services and is deployed in production on a Hetzner CX43 VPS with automated CI/CD. All core development phases (0-8) are complete, including an embeddable auth widget with OAuth 2.0 support and a full identity verification pipeline. Remaining work consists of SMS activation, client-side ML migration, and production hardening -- all planned with detailed design documents.

---

## Architecture Overview

```
                          CLIENTS
       +------------------+------------------+------------------+
       |  Web Dashboard   |  Client Apps     |  Third-Party     |
       |  (React 18/TS5)  |  (KMP/Compose)   |  (Auth Widget)   |
       |  17 pages, i18n  |  Android/iOS/    |  OAuth 2.0 +     |
       |  EN+TR           |  Desktop          |  JS/React SDK    |
       +--------+---------+--------+---------+--------+---------+
                |                  |                   |
                +------------------+-------------------+
                                   |
                         +---------v----------+
                         |   Traefik v3.6.12  |
                         |   (reverse proxy,  |
                         |    SSL, routing)   |
                         +---------+----------+
                                   |
                +------------------+------------------+
                |                                     |
     +----------v-----------+           +-------------v-----------+
     | Identity Core API    |           | Biometric Processor     |
     | Spring Boot 3.4.7    |           | FastAPI / Python 3.12   |
     | Java 21              |           | DeepFace + Resemblyzer  |
     | Port 8080            |           | Tesseract OCR + YOLO    |
     | 25 controllers       |           | Port 8001               |
     | 28 Flyway migrations |           | 46+ endpoints           |
     +----------+-----------+           +-------------+-----------+
                |                                     |
                +------------------+------------------+
                                   |
                +------------------+------------------+
                |                                     |
     +----------v-----------+           +-------------v-----------+
     | PostgreSQL 17        |           | Redis 7.4               |
     | + pgvector           |           | Cache, sessions,        |
     | 4 databases          |           | OTP codes, JWT blacklist|
     | RLS enabled          |           |                         |
     +----------------------+           +-------------------------+
```

---

## Completion Dashboard

| Component | Completion | Key Metric |
|-----------|-----------|------------|
| **Identity Core API** | 100% | 21 controllers, 30 migrations, 633 tests |
| **Biometric Processor** | 100% | 77 endpoints, face/voice/card/OCR/liveness |
| **Web Dashboard** | 100% | 30 pages, 619 unit + 27 E2E tests |
| **Client Apps (Android)** | 100% | 78 screens, 401 tests, APK v4.0.0 |
| **Client Apps (iOS)** | 80% | 11 platform files in iosMain, no SwiftUI app target |
| **Client Apps (Desktop)** | 90% | WebAuthn + ECDSA done, NFC pending |
| **Auth Widget + SDK** | 100% | JS SDK, React bindings, Web Component, OAuth 2.0 |
| **Verification Pipeline** | 100% | 9 step types, 7 industry templates |
| **CI/CD** | 100% | Self-hosted runner, Android + iOS + Playwright CI |
| **Infrastructure** | 95% | 19 containers healthy, daily backups, VPN |

---

## Phase History (Completed)

### Phase 0: Critical Bug Fixes -- COMPLETE

Fixed fingerprint/voice stubs returning wrong HTTP status (200 instead of 501), mobile LoginViewModel hardcoded mock token replaced with real backend login, JWT access token revocation on logout via Redis blacklist, and Redis event bus initialization.

### Phase 1: Architecture Fixes -- COMPLETE

UserController pagination moved from in-memory to DB-level (LIMIT/OFFSET), all services migrated from direct JPA repo injection to domain port injection, controller count consolidated from 27 to 15 logical groups, business logic removed from controllers into service layer.

### Phase 2: CRUD and RBAC Verification -- COMPLETE

Full CRUD operations verified for all 17 entities. RBAC enforcement tested: SUPER_ADMIN, TENANT_ADMIN, TENANT_MEMBER role boundaries confirmed. Cross-tenant isolation verified (Tenant A cannot see Tenant B data). V20 migration with schema cleanup applied.

### Phase 3: Mobile Backend Connection -- COMPLETE

Client-apps connected to real backend with real JWT authentication. Face enrollment and verification working end-to-end through biometric-processor. Step-up auth (ECDSA P-256 fingerprint challenge-response) verified. Multi-tenancy context propagated to mobile.

### Phase 4: Biometric Processor Completion -- COMPLETE

Liveness detection wired to real EnhancedLivenessDetector (LBP + blink + smile). Fingerprint decided as WebAuthn (device biometric delegation model). Enrollment idempotency added. Face pipeline fully operational: enroll, verify, search, centroid, liveness, quality.

### Phase 5: Web App Integration -- COMPLETE

TOTP enrollment connected to TotpController (setup, verify, disable). QR code login flow connected to QrCodeController. All pages accessible from sidebar. WebAuthn enrollment wired. Playwright E2E tests expanded to 28 spec files covering all pages.

### Phase 6: Domain Model Restructure -- COMPLETE

Pure domain aggregates separated from JPA entities. JPA entities isolated in infrastructure layer with mappers. Missing repository adapters created. PostgreSQL Row-Level Security (RLS) policies applied for all tenant-scoped tables.

### Phase 7: Client Integration Story -- COMPLETE (March 2026)

- **verify-app**: Standalone iframe auth widget extracted from web-app
- **@fivucsas/auth-js SDK**: 9.5KB IIFE + 12KB ESM, zero dependencies
- **@fivucsas/auth-react**: FivucsasProvider, VerifyButton, useVerification hook
- **Web Component**: `<fivucsas-verify>` custom element with Shadow DOM
- **OAuth 2.0 / OIDC**: Authorization code flow (authorize, token, userinfo, discovery, JWKS)
- **V24 migration**: `oauth2_clients` table
- **Developer Portal**: `/developer-portal` with SDK docs and integration guide
- **Widget Demo**: `/widget-demo` with live preview (public, no login required)

### Phase 8: Identity Verification Pipeline -- COMPLETE (March 2026)

Built a configurable verification pipeline transforming FIVUCSAS from authentication-only to a full Identity Verification Platform (IVP).

| Sub-Phase | Deliverable |
|-----------|-------------|
| 8A: Schema + Core API | V26 migration, VerificationController, FlowType enum, 5 industry templates |
| 8B: Document Processing | YOLO card detection, Tesseract OCR, MRZ parser (TD1/TD3), TC Kimlik parser |
| 8C: Face-to-Document | DeepFace cosine similarity, liveness pipeline, per-tenant thresholds |
| 8D: Admin UI | Verification flow builder, dashboard with analytics, session detail view |
| 8E: Advanced Integrations | 9 step types: DOCUMENT_SCAN, DATA_EXTRACT, NFC_CHIP_READ, FACE_MATCH, LIVENESS_CHECK, ADDRESS_PROOF, WATCHLIST_CHECK, AGE_VERIFICATION, VIDEO_INTERVIEW |

**Industry Templates (Turkish regulatory context):**

| Template | Steps | Regulation |
|----------|-------|-----------|
| Banking KYC | Scan -> Extract -> NFC -> Face -> Liveness -> Watchlist | BDDK |
| Healthcare | Scan -> Extract -> Face -> Liveness | SGK |
| Education | Scan -> Extract -> Face -> Age | YOK |
| Government | NFC -> Extract -> Face -> Liveness -> Watchlist | e-Devlet |
| Fintech | Scan -> Extract -> NFC -> Face -> Liveness -> Watchlist -> Credit | TCMB |
| Telecom | Scan -> Extract -> Face -> Age | BTK |
| Gig Economy | Scan -> Face -> Liveness -> Address | -- |

---

## Current Phase: Polish and Maintenance (April 2026)

### Completed Items

| ID | Item | Date |
|----|------|------|
| W2 | Face search field mismatch (matches vs results) | 2026-04-04 |
| W3 | NFC auth token fix (localStorage -> TokenService DI) | 2026-04-04 |
| W4-W5 | NFC "Whose Card" + card detection crash fix | 2026-04-04 |
| W7-W8 | Forgot password flow + SMS phone dialog | 2026-04-04 |
| W9 | Non-admin personal dashboard | 2026-04-04 |
| W10 | Login page cleanup (removed broken alt auth) | 2026-04-04 |
| W11 | Notifications: user activity via /my/activity | 2026-04-04 |
| W13 | OAuth demo tenant (Marmara Exam Portal) | 2026-04-04 |
| W14 | GitHub repos organization (all 8 repos tagged) | 2026-04-05 |
| W16 | Cross-device sessions UI in Settings | 2026-04-05 |
| W20 | Biometric Tools mobile width overflow | 2026-04-04 |
| W21 | 2FA login crash (SecondaryAuthFlow ErrorBoundary) | 2026-04-04 |
| W22 | Hardcoded strings audit (~40+ strings to i18n) | 2026-04-04 |
| W23 | Terms/Privacy placeholder pages | 2026-04-04 |
| W24 | Settings duplicate enrollment removed | 2026-04-05 |
| W25-W26 | Dashboard translation + notification date formatting | 2026-04-04 |
| -- | 2FA login flow (admin-controlled, EMAIL_OTP) | 2026-04-05 |
| -- | Multi-method 2FA dispatcher (TOTP, Face, Voice, etc.) | 2026-04-05 |
| -- | My Profile page (6 sections, data export, KVKK/GDPR) | 2026-04-05 |
| -- | BYS demo site (demo.fivucsas.com) | 2026-04-05 |
| -- | BlazeFace on-device face detection (134KB, <50ms) | 2026-04-05 |
| -- | OAuth 2.0 compliance: PKCE, nonce, ID token claims | 2026-04-05 |
| -- | PostMessage origin security fix (wildcard → referrer) | 2026-04-05 |
| -- | Widget auth light theme (dark mode fix) | 2026-04-05 |
| -- | Global footer (DashboardLayout + PublicLayout) | 2026-04-05 |
| -- | PublicLayout for widget-demo/developer-portal | 2026-04-05 |
| -- | DashboardLayout overflow fix (mobile English) | 2026-04-05 |
| -- | Cache-busting .htaccess + chunk error auto-reload | 2026-04-05 |
| -- | Auth page dark mode fixes (6 pages) | 2026-04-05 |
| -- | CI/CD: 17 fixes across 3 repos, all pipelines green | 2026-04-05 |
| -- | +269 tests (1,479 total across all modules) | 2026-04-05 |
| -- | Master roadmap consolidation (ROADMAP_MASTER.md) | 2026-04-05 |
| -- | 6 design documents (3,000+ lines in docs/plans/) | 2026-04-05 |
| -- | WebAuthn backend: 4 REST endpoints + 22 tests | 2026-04-04 |
| -- | iOS real: AVFoundation, Face ID/Touch ID, WebAuthn passkeys | 2026-04-04 |
| -- | Desktop: ECDSA authenticator + credential store | 2026-04-04 |
| -- | Performance: /ping endpoint, HNSW indexes | 2026-04-04 |
| -- | Security audit: 9 critical + 34 high findings fixed | 2026-03-31 |

### Known Limitations

| Item | Status | Notes |
|------|--------|-------|
| W1: Face enrollment slow on mobile | Known | MediaPipe fails, timeout fallback. BlazeFace added to web-app only |
| W6: Istanbul card misclassified as ehliyet | Known | YOLO training data needed |
| SMS OTP | Ready | Twilio coded, awaiting credentials ($50 GitHub Student Pack or $15.50 trial) |
| FP-External (USB scanner) | Future | Requires vendor SDK (SecuGen) |
| iOS SwiftUI wrappers | Pending | 11 platform files in iosMain, no iosApp SwiftUI target yet |
| BlazeFace client-apps | Not started | Web-app only; KMP/Android/iOS needs TFLite integration |
| APK v4.0.0 tag | Missing | Code has versionCode 4 but git tag not created |

---

## Future Roadmap

### Phase 5: SMS and Communication (Ready -- ~1 day)

**Status**: All code built. Only missing Twilio account credentials.

**What exists**: `TwilioSmsService` (adapter), `NoOpSmsService` (dev fallback), `OtpService` (Redis, 5-min TTL), `SmsOtpAuthHandler`, `setup-twilio.sh` script, 9 unit tests.

**Activation steps**:
1. Claim $50 Twilio credit via GitHub Student Developer Pack
2. Get Account SID, Auth Token, and phone number from Twilio Console
3. Run `./scripts/setup-twilio.sh` on server (writes to `.env.prod`, restarts container)
4. Verify SMS delivery end-to-end

**Future option**: Netgsm for Turkey-local SMS (cheaper for domestic numbers).

**Effort**: 1 day | **Risk**: Low | **Dependencies**: Twilio account only

---

### Phase 6: Client-Side ML Migration (~10 weeks)

**Goal**: Move compute-intensive ML inference from server to client for sub-500ms latency, offline capability, and reduced server load. Server remains the trust anchor for verification.

**Model Catalog**:

| Model | Size | Target Latency | Runtime |
|-------|------|----------------|---------|
| MediaPipe BlazeFace (detection) | 1.2 MB | <30ms | TFLite / CoreML / WASM |
| MobileFaceNet (embedding) | 4.9 MB | <100ms | TFLite / CoreML / ONNX |
| Silero VAD + ECAPA-TDNN Lite (voice) | 8.2 MB | <200ms | TFLite / CoreML / ONNX |
| YOLOv8n Istanbul Card (detection) | 6.2 MB | <500ms | TFLite / CoreML / ONNX |
| MobileNet-v3 Anti-Spoof (liveness) | 3.1 MB | <50ms | TFLite / CoreML / ONNX |

**Timeline**:

| Week | Phase | Deliverable |
|------|-------|-------------|
| 1-2 | Face detection + quality | BlazeFace across all platforms, quality gate |
| 3-5 | Face embedding + local verify | MobileFaceNet with 128->512 projection layer |
| 6-7 | Voice embedding | ECAPA-TDNN Lite with projection to Resemblyzer 256-dim |
| 8-9 | Card detection YOLO nano | Custom YOLOv8n for TC Kimlik/passport/license |
| 10 | Integration + model delivery | Model versioning manifest, encrypted local cache |

**Key design**: Client-first with server-verify. Embeddings sent (not images) for privacy. Graceful degradation to server on client ML failure.

**Detailed plan**: `docs/plans/CLIENT_SIDE_ML_PLAN.md`

---

### Phase 7: BYOD Enterprise (~8 weeks)

**Goal**: Allow enterprise tenants (banks, government, hospitals) to use their own PostgreSQL instance for biometric data storage, satisfying KVKK/GDPR data sovereignty requirements.

**Architecture**: Dynamic DataSource routing per tenant. Shared DB remains the default for SaaS customers. BYOD tenants provide their own PostgreSQL + pgvector instance.

**Timeline**:

| Week | Phase | Deliverable |
|------|-------|-------------|
| 1-3 | Foundation | TenantAware DataSource router, connection pool management, credential encryption |
| 4-5 | Repository refactor | All biometric repos route through DataSource router, biometric-processor proxy |
| 6-7 | Migration engine | Dual-write, cutover, rollback capability |
| 8 | Hardening | Monitoring, health checks, documentation |

**Competitive advantage**: Auth0 is SaaS-only, Keycloak is self-hosted-only. FIVUCSAS offers hybrid (SaaS default + BYOD option).

**Detailed plan**: `docs/plans/BYOD_ARCHITECTURE.md`

---

### Phase 8: Voice STT Verification (~3.5 weeks)

**Goal**: Add speech-to-text verification to existing voice biometrics, creating a dual-factor voice system: WHO is speaking (voiceprint) + WHAT they said (dynamic passphrase). Makes voice replay attacks virtually impossible.

**Architecture**: Whisper STT engine added alongside existing Resemblyzer. Server generates a random passphrase per attempt, displayed on screen. Both speaker match (>0.75 cosine) and content match (>85% word accuracy) required.

**Timeline**:

| Week | Phase | Deliverable |
|------|-------|-------------|
| 1 | Whisper integration | STT endpoints in biometric-processor, Turkish language support |
| 2 | Backend integration | Dual verification service, auth flow config |
| 3 | Frontend | Web-app + client-apps passphrase display and recording UI |
| 3.5 | Hardening | Accent testing, Turkish phonetics, performance tuning |

**Detailed plan**: `docs/plans/VOICE_STT_PLAN.md`

---

### Phase 9: BaaS Rental Model (~11 weeks)

**Goal**: Offer individual biometric capabilities as rentable APIs (Biometrics as a Service). Developers sign up, get an API key, and call endpoints without deploying infrastructure.

**Pricing tiers**: Free ($0, 100 calls, face only), Developer ($29/mo, 10K calls, all features), Enterprise (custom, unlimited, BYOD option).

**Timeline**:

| Week | Phase | Deliverable |
|------|-------|-------------|
| 1-3 | API gateway + keys | Per-key rate limiting, tenant API key management |
| 4-5 | Feature isolation + metering | Usage tracking, per-call billing pipeline |
| 6-8 | SDKs | npm, Maven Central, CocoaPods, PyPI packages |
| 9-10 | Billing + dev portal | Stripe integration, self-service developer portal |
| 11 | Launch preparation | Documentation, examples, landing page |

**Detailed plan**: `docs/plans/BAAS_RENTAL_MODEL.md`

---

### Phase 10: Production Hardening (~6 weeks)

**Goal**: Bring FIVUCSAS from "works in production" to "enterprise-ready production" with formal SLAs, automated backup verification, zero-downtime deployment, and incident response.

**Already done**: SSH hardening, Docker security, firewall, SSL/TLS, rate limiting, security audit (Semgrep/Trivy/Hadolint/ShellCheck), daily backups, VPN, CI/CD.

**Timeline**:

| Week | Phase | Deliverable |
|------|-------|-------------|
| 1-2 | Monitoring + alerting | Prometheus rules, Grafana dashboards, PagerDuty/Slack alerts |
| 3 | Backup + recovery | Automated restore testing, DR drill |
| 4 | Zero-downtime deploy | Blue-green or rolling deployment pipeline |
| 4.5 | Database maintenance | VACUUM, REINDEX, bloat monitoring automation |
| 5 | Penetration test | OWASP methodology, full endpoint audit |
| 5.5 | Incident response | Runbooks, escalation matrix, post-mortem template |

**Detailed plan**: `docs/plans/PRODUCTION_HARDENING_PLAN.md`

---

## Test Coverage

| Module | Type | Count | Framework |
|--------|------|-------|-----------|
| Identity Core API | Unit + Integration | 633 | JUnit 5 + TestContainers |
| Identity Core API | API (automated) | 103 | curl scripts (Health 17, CRUD 33, RBAC 40, Verification 13) |
| Web Dashboard | Unit | 619 | Vitest |
| Web Dashboard | E2E | 27 specs | Playwright |
| Client Apps | Unit + ViewModel | 401 | Kotlin Test + Compose UI |
| Client Apps | Instrumented | 17 | Android Compose UI Test |
| Biometric Processor | Unit | -- | pytest |
| **Total** | | **1,800+** | |

---

## Deployment Status

| Service | URL / Host | Status | Technology |
|---------|-----------|--------|------------|
| Identity Core API | api.fivucsas.com | Healthy | Spring Boot 3.4.7, Java 21 |
| Biometric Processor | bio.fivucsas.com (port 8001) | Healthy | FastAPI, Python 3.12, 4GB RAM |
| Web Dashboard | app.fivucsas.com | Live | React 18, Hostinger |
| Landing Website | fivucsas.com | Live | React + Tailwind, Hostinger |
| PostgreSQL 17 | Internal (port 5432) | Healthy | pgvector, 4 databases |
| Redis 7.4 | Internal (port 6379) | Healthy | Sessions, OTP, JWT blacklist |
| Traefik v3.6.12 | Ports 80/443 | Healthy | Reverse proxy, Let's Encrypt |
| WireGuard VPN | wg-easy | Healthy | Admin access from Turkey |

**Server**: Hetzner CX43 (8 vCPU, 16 GB RAM, 150 GB NVMe), Nuremberg, Ubuntu 24.04
**Resource usage**: Disk ~36%, RAM ~36%, 16 containers running

---

## Technology Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| **Backend API** | Spring Boot (Java) | 3.4.7 / Java 21 |
| **ML Service** | FastAPI (Python) | Python 3.12 |
| **Web Frontend** | React + TypeScript + Vite | 18 / 5 / 8 |
| **Mobile/Desktop** | Kotlin Multiplatform + Compose | KMP 2.1 |
| **Database** | PostgreSQL + pgvector | 17 |
| **Cache** | Redis | 7.4 |
| **Reverse Proxy** | Traefik | 3.6.12 |
| **Face ML** | DeepFace (ArcFace 512-dim) | 0.0.98 |
| **Voice ML** | Resemblyzer (256-dim) | Latest |
| **Document OCR** | Tesseract | 5.x |
| **Card Detection** | YOLOv8 (ONNX) | v8n |
| **Auth Standard** | WebAuthn / FIDO2 | L2 |
| **OAuth** | OAuth 2.0 / OIDC | RFC 6749 |
| **CI/CD** | GitHub Actions | Self-hosted runner |
| **Containerization** | Docker + Docker Compose | 29.3.0 / v5.1.0 |
| **VPN** | WireGuard (wg-easy) | Latest |
| **UI Framework** | Material-UI (MUI) | 5.x |
| **DI (Web)** | InversifyJS | Latest |
| **DI (Mobile)** | Koin | Latest |
| **Testing** | JUnit 5, Vitest, Playwright, Kotlin Test | Various |

---

## Key Metrics

| Metric | Value |
|--------|-------|
| Total codebase | ~224,000 lines (Java 33K + TS 63K + Kotlin 75K + Python 53K) |
| API endpoints | 77 biometric + identity controllers (across 21 REST controllers) |
| Flyway migrations | 30 (V0-V30) |
| Auth methods | 10 (all production-ready) |
| Verification step types | 9 |
| Industry templates | 7 (Turkish regulatory context) |
| Supported platforms | Web, Android, iOS (platform layer), Desktop |
| Tests | 1,800+ (unit, integration, E2E, API) |
| Docker containers | 19 (production) |
| Submodules | 6 (identity-core-api, biometric-processor, web-app, client-apps, docs, practice-and-test) |
| APK releases | v4.0.0 (latest) |
| Production uptime | Since March 2026 |

---

## Risk Register

| # | Risk | Likelihood | Impact | Mitigation |
|---|------|-----------|--------|------------|
| R1 | Single server failure (Hetzner CX43) | Medium | Critical | Daily backups (4 DBs, 7-day retention), DR plan in hardening phase |
| R2 | Twilio dependency for SMS OTP | Low | Medium | Twilio is the adapter; can swap to Netgsm or Firebase Phone Auth without code changes |
| R3 | Biometric data breach | Low | Critical | pgvector stores embeddings (not raw images), RLS per tenant, AES-256 encryption, Docker read-only containers |
| R4 | ML model accuracy degradation | Low | High | Server-authoritative verification as trust anchor, client-side ML is pre-screen only |
| R5 | Scaling beyond single VPS | Medium | High | BYOD offloads enterprise tenants, horizontal scaling planned in BaaS phase |

---

## Authentication Methods

| # | Method | Web | Mobile | Backend | Status |
|---|--------|-----|--------|---------|--------|
| 1 | Password | OK | OK | OK | Production |
| 2 | Email OTP | OK | OK | OK | Production |
| 3 | SMS OTP | OK | OK | OK | Production (Twilio activation pending) |
| 4 | TOTP | OK | OK | OK | Production |
| 5 | Face | OK | OK | OK | Production (0.9-1.5s) |
| 6 | QR Code | OK | OK | OK | Production |
| 7 | Hardware Key (FIDO2) | OK | N/A | OK | Production |
| 8 | Fingerprint (WebAuthn) | OK | OK | OK | Production |
| 9 | Voice | OK | OK | OK | Production (490-585ms) |
| 10 | NFC Document | Stub | OK | OK | Mobile-only (eID reading) |

---

## Component Responsibility Matrix

| Component | Responsibilities |
|-----------|-----------------|
| **identity-core-api** | User identity, authentication sessions (multi-step), JWT issuance/revocation, RBAC, tenant config, device registry, enrollment records, audit trail, multi-tenancy, OAuth 2.0 server, verification pipeline orchestration |
| **biometric-processor** | Face embeddings (DeepFace), voice embeddings (Resemblyzer), liveness detection, image quality assessment, document scan (YOLO), OCR (Tesseract), MRZ parsing, face-to-document matching, video interview storage |
| **web-app** | Tenant admin dashboard, user management, auth flow builder, verification flow builder, analytics, audit log, embeddable widget, developer portal, i18n (EN+TR) |
| **client-apps** | End-user mobile/desktop app, face/voice capture, NFC eID reading (11K lines), fingerprint step-up (ECDSA P-256), QR scanning, TOTP, kiosk mode |

---

## References

| Document | Path | Description |
|----------|------|-------------|
| SMS Activation Plan | `docs/plans/SMS_ACTIVATION_PLAN.md` | Twilio integration, activation steps, cost estimation |
| Client-Side ML Plan | `docs/plans/CLIENT_SIDE_ML_PLAN.md` | Model catalog, KMP inference strategy, 10-week timeline |
| BYOD Architecture | `docs/plans/BYOD_ARCHITECTURE.md` | Dynamic DataSource routing, migration engine, 8-week plan |
| Voice STT Plan | `docs/plans/VOICE_STT_PLAN.md` | Whisper integration, dual verification, 3.5-week plan |
| BaaS Rental Model | `docs/plans/BAAS_RENTAL_MODEL.md` | Pricing tiers, API gateway, SDK distribution, 11-week plan |
| Production Hardening | `docs/plans/PRODUCTION_HARDENING_PLAN.md` | Pen testing, SLAs, DR, monitoring, 6-week plan |
| Biometric Engine Architecture | `docs/BIOMETRIC_ENGINE_ARCHITECTURE.md` | Engine architecture v2.0 (2,615 lines) |
| Integration Guide | `docs/INTEGRATION_GUIDE.md` | Third-party integration with SDK and OAuth 2.0 |
| Security Audit | `docs/audit/AUDIT-2026-03-31.md` | Full audit report (Semgrep, Trivy, Hadolint, ShellCheck) |
| Client Apps Roadmap | `client-apps/ROADMAP_CLIENT_APPS.md` | Phase 1-3 complete, Phase 4 maintenance |

---

*This document consolidates all previous roadmaps (ROADMAP.md, ROADMAP_V2.md, MASTER_PLAN.md, and per-component roadmaps) into a single source of truth. For detailed plan documents, see the references above.*
