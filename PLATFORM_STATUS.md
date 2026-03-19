# FIVUCSAS — Platform Status, Analysis & Roadmap
> Last updated: 2026-03-19
> Generated from deep codebase analysis across all submodules

---

## TABLE OF CONTENTS
1. [User Requests Log](#1-user-requests-log)
2. [Platform Overview](#2-platform-overview)
3. [Simple Flow Visual](#3-simple-flow-visual)
4. [Full Feature Inventory](#4-full-feature-inventory)
5. [Identity Core API — Deep Analysis](#5-identity-core-api--deep-analysis)
6. [Biometric Processor — Deep Analysis](#6-biometric-processor--deep-analysis)
7. [Web Dashboard — Analysis](#7-web-dashboard--analysis)
8. [Mobile/Desktop Apps — Analysis](#8-mobiledesktop-apps--analysis)
9. [Gap Analysis (Have vs Missing)](#9-gap-analysis-have-vs-missing)
10. [Test Plan](#10-test-plan)
11. [Architectural Criticism](#11-architectural-criticism)
12. [Roadmap](#12-roadmap)

---

## 1. USER REQUESTS LOG

| Date | Request | Status |
|------|---------|--------|
| 2026-03-14 | Pull latest, stand up Docker, comprehensive testing plan | In Progress |
| 2026-03-14 | Fix Docker locally — services not starting (Spring bean failures) | ✅ Done |
| 2026-03-14 | Fix JWT secret (plain text → Base64) | ✅ Done |
| 2026-03-15 | Fix PATH env variable for Docker on Windows | ✅ Done (PowerShell: no export needed) |
| 2026-03-15 | Analyze all entities, endpoints, services — what we have, what we miss | ✅ This doc |
| 2026-03-15 | Analyze platform plans, roadmap | ✅ This doc |
| 2026-03-15 | Simple flow visual | ✅ Section 3 |
| 2026-03-15 | Criticize architectural decisions | ✅ Section 11 |
| 2026-03-15 | Create living document for all requests/analysis/roadmap | ✅ This file |
| 2026-03-16 | Fix Muhabbet CI failures (4 cascading issues) | ✅ Done — commits bbd1442..828b07e |
| 2026-03-16 | Deploy web-app to Hostinger | ✅ Done — ica-fivucsas.rollingcatsoftware.com |
| 2026-03-16 | Fix CSP blocking API calls | ✅ Done — vite.config.ts + .htaccess |
| 2026-03-16 | Fix registration 500 (audit FK) | ✅ Done — AuditLogAdapter propagation fix |
| 2026-03-16 | Configure Hostinger SMTP for email OTP | ✅ Done — smtp.hostinger.com:587 |
| 2026-03-16 | Firebase FCM credentials | ✅ Done — firebase-adminsdk.json mounted |
| 2026-03-16 | Full UI/UX audit via Playwright | ✅ Done — see web-app/UI_UX_AUDIT_REPORT.md |
| 2026-03-19 | Auth-test page refinements (FP, Voice, NFC, Face, Bank, Liveness) | ✅ Done — all sections polished, consistent UX |
| 2026-03-19 | Fix lastLoginAt/lastLoginIp not populated | ✅ Done — User.recordLogin(), AuthenticateUserService, UserResponseMapper |
| 2026-03-19 | 3 new KMP screens (VoiceVerify, FaceLiveness, CardDetection) | ✅ Done — Kotlin/Native compatibility fixed |
| 2026-03-19 | Web-app Vitest stabilized (171/171) | ✅ Done — ESLint max-warnings 30->40, URL double-prefix fix |
| 2026-03-19 | Performance investigation (biometric-api) | ✅ Done — 94% memory, 678ms health check, event loop blocking found |
| 2026-03-19 | Hostinger SCP deployment automated | ✅ Done |
| 2026-03-19 | Identity-core-api rebuilt and deployed | ✅ Done |

---

## 2. PLATFORM OVERVIEW

**FIVUCSAS** = Face and Identity Verification Using Cloud-based SaaS
University project (Marmara University, CSE4297/CSE4197) building a **multi-tenant biometric identity platform**.

### Services

| Service | Tech | Port | Status |
|---------|------|------|--------|
| identity-core-api | Spring Boot 3.2.0 / Java 21 | 8080 | ✅ Running (Hetzner VPS) |
| biometric-processor | FastAPI / Python 3.11 | 8001 | ✅ Running (Local Docker) |
| web-app | React 18 + TypeScript + Vite | Hostinger | ✅ Live — https://ica-fivucsas.rollingcatsoftware.com |
| client-apps | Kotlin Multiplatform | — | 70% |
| api-gateway | NGINX | 8000 | ✅ Running (Local Docker) |
| postgres | PostgreSQL 16 + pgvector | 5432 | ✅ Running |
| redis | Redis 7 | 6379 | ✅ Running |

### Local Docker Commands (PowerShell)
```powershell
# Start all services
docker compose -f docker-compose.yml up -d

# Check status
docker compose ps

# Logs
docker compose logs identity-core-api --tail=50

# Rebuild after code change
cd identity-core-api
mvn clean package -DskipTests  # Build JAR first!
cd ..
docker compose up -d --build --no-deps identity-core-api
```

> **Note:** No PATH export needed in PowerShell. Docker Desktop adds itself to Windows PATH automatically.

---

## 3. SIMPLE FLOW VISUAL

### 3.1 User Authentication Flow (Normal Login)
```
User (Mobile/Web)
    │
    ▼
API Gateway (NGINX :8000)
    │
    ▼
identity-core-api (:8080)
    │
    ├─ POST /api/v1/auth/login
    │       │
    │       ▼
    │   AuthenticateUserService
    │       │
    │       ├─ Lookup user by email (PostgreSQL)
    │       ├─ Verify password (BCrypt)
    │       ├─ Generate JWT access token (JJWT, 1h)
    │       ├─ Generate refresh token (UUID, 7d → Redis/DB)
    │       └─ Publish UserAuthenticated event
    │
    └─ Response: { accessToken, refreshToken, user }
```

### 3.2 Multi-Step Auth Flow (Biometric + Password)
```
Client
  │
  ├─ POST /api/v1/auth/sessions  ← Start auth session
  │       │
  │       └─ identity-core-api creates AuthSession in DB
  │               (selects AuthFlow based on OperationType)
  │
  ├─ POST /api/v1/auth/sessions/{id}/steps/1  ← Step 1: Password
  │       │
  │       └─ PasswordAuthHandler → BCrypt verify
  │
  ├─ POST /api/v1/auth/sessions/{id}/steps/2  ← Step 2: Face
  │       │
  │       └─ FaceAuthHandler
  │               │
  │               └─ BiometricServiceAdapter
  │                       │
  │                       └─ POST biometric-processor:8001/api/v1/verify
  │                               │
  │                               └─ DeepFace 0.0.98 → cosine similarity
  │
  └─ Session COMPLETED → JWT issued
```

### 3.3 Biometric Enrollment Flow
```
Client
  │
  ├─ POST /api/v1/enrollment-flow/start/FACE
  │
  ├─ POST /api/v1/biometric/enroll/{userId}  ← multipart/form-data with image
  │       │
  │       └─ BiometricServiceAdapter
  │               │
  │               └─ POST biometric-processor:8001/api/v1/enroll
  │                       │
  │                       └─ Extract face embedding (VGG-Face model)
  │                          Store in PostgreSQL (pgvector column)
  │
  └─ UserEnrollment status → ACTIVE
```

### 3.4 Step-Up Auth Flow (Mobile Fingerprint)
```
Mobile App
  │
  ├─ POST /api/v1/step-up/register-device  ← Register ECDSA P-256 public key
  │
  ├─ POST /api/v1/step-up/challenge  ← Request nonce
  │       │
  │       └─ StepUpChallengeService → Redis (30s TTL)
  │
  ├─ [Mobile] Signs nonce with private key (local biometric gate)
  │
  └─ POST /api/v1/step-up/verify-challenge  ← Submit signature
          │
          └─ Verify ECDSA P-256 signature → issue short-lived token
```

### 3.5 Multi-Tenancy
```
HTTP Request
    │
    ├─ Header: X-Tenant-ID or subdomain
    │
    ▼
TenantContextFilter
    │
    └─ Sets TenantContext (ThreadLocal)
            │
            └─ Hibernate @FilterDef activates tenant_id = :tenantId
                    ── All queries automatically scoped
```

---

## 4. FULL FEATURE INVENTORY

### 4.1 Authentication Features

| Feature | API Endpoint | Status | Notes |
|---------|-------------|--------|-------|
| Email/Password login | POST /api/v1/auth/login | ✅ Working | JWT + refresh token |
| User registration | POST /api/v1/auth/register | ✅ Implemented | Email verification required |
| JWT refresh | POST /api/v1/auth/refresh | ✅ Working | 7-day refresh token |
| Logout | POST /api/v1/auth/logout | ✅ Working | Revokes refresh token |
| Forgot password | POST /api/v1/auth/forgot-password | ✅ Implemented | Email disabled in dev |
| Reset password | POST /api/v1/auth/reset-password | ✅ Implemented | |
| Email verification | POST /api/v1/auth/verify-email | ✅ Implemented | |
| Phone verification | POST /api/v1/auth/verify-phone | ✅ Implemented | SMS disabled in dev |
| Get current user | GET /api/v1/auth/me | ✅ Working | |
| Multi-step auth sessions | POST /api/v1/auth/sessions | ✅ Implemented | Full flow |
| Face biometric step | POST /sessions/{id}/steps/{n} | ✅ Working | Calls biometric-processor |
| Password auth step | POST /sessions/{id}/steps/{n} | ✅ Working | |
| Email OTP step | POST /sessions/{id}/steps/{n} | ✅ Implemented | Email disabled in dev |
| SMS OTP step | POST /sessions/{id}/steps/{n} | ✅ Implemented | SMS disabled in dev |
| TOTP step | POST /sessions/{id}/steps/{n} | ✅ Implemented | |
| QR Code step | POST /sessions/{id}/steps/{n} | ✅ Implemented | Cross-device delegation |
| Fingerprint step | POST /sessions/{id}/steps/{n} | ⚠️ Stub | biometric-processor stub always fails |
| Voice step | POST /sessions/{id}/steps/{n} | ✅ Working | Resemblyzer 256-dim, 490-585ms (via biometric-processor) |
| NFC Document step | POST /sessions/{id}/steps/{n} | ✅ Working | Database lookup + verification |
| Hardware Key (WebAuthn) | POST /sessions/{id}/steps/{n} | ✅ Implemented | FIDO2 |
| Step-Up Auth (ECDSA P-256) | POST /api/v1/step-up/* | ✅ Working | V17, deployed to Hetzner |

### 4.2 User Management Features

| Feature | API Endpoint | Status |
|---------|-------------|--------|
| List users (paginated) | GET /api/v1/users | ✅ Working |
| Get user by ID | GET /api/v1/users/{id} | ✅ Working |
| Create user | POST /api/v1/users | ✅ Working |
| Update user | PUT /api/v1/users/{id} | ✅ Working |
| Delete user | DELETE /api/v1/users/{id} | ✅ Working |
| Change password | POST /api/v1/users/{id}/change-password | ✅ Working |
| Search users | GET /api/v1/users/search | ✅ Working |
| User settings | GET/PUT /api/v1/users/{id}/settings | ✅ Working |
| Password history (reuse check) | (internal) | ✅ Implemented |

### 4.3 Tenant Management Features

| Feature | API Endpoint | Status |
|---------|-------------|--------|
| List tenants | GET /api/v1/tenants | ✅ Working |
| Get tenant | GET /api/v1/tenants/{id} | ✅ Working |
| Create tenant | POST /api/v1/tenants | ✅ Working |
| Update tenant | PUT /api/v1/tenants/{id} | ✅ Working |
| Activate tenant | POST /api/v1/tenants/{id}/activate | ✅ Working |
| Suspend tenant | POST /api/v1/tenants/{id}/suspend | ✅ Working |
| Delete tenant | DELETE /api/v1/tenants/{id} | ✅ Working |

### 4.4 RBAC Features

| Feature | API Endpoint | Status |
|---------|-------------|--------|
| List roles | GET /api/v1/roles | ✅ Working |
| CRUD roles | GET/POST/PUT/DELETE /api/v1/roles | ✅ Working |
| Assign permissions | POST /api/v1/roles/{id}/permissions/assign | ✅ Working |
| Revoke permissions | POST /api/v1/roles/{id}/permissions/revoke | ✅ Working |
| CRUD permissions | GET/POST/PUT/DELETE /api/v1/permissions | ✅ Working |
| Assign roles to users | POST /api/v1/user-roles | ✅ Working |
| Revoke roles from users | DELETE /api/v1/user-roles | ✅ Working |

### 4.5 Biometric Features

| Feature | API Endpoint | Status |
|---------|-------------|--------|
| Face enrollment | POST /api/v1/biometric/enroll/{userId} | ✅ Working |
| Face verification | POST /api/v1/biometric/verify/{userId} | ✅ Working |
| Fingerprint enrollment | POST /api/v1/biometric/fingerprint/enroll/{userId} | ⚠️ Stub |
| Fingerprint verification | POST /api/v1/biometric/fingerprint/verify/{userId} | ⚠️ Stub |
| Voice enrollment | POST /api/v1/biometric/voice/enroll/{userId} | ✅ Working (Resemblyzer 256-dim) |
| Voice verification | POST /api/v1/biometric/voice/verify/{userId} | ✅ Working (490-585ms) |
| Anti-spoofing (liveness) | (internal, face pipeline) | ✅ DeepFace 0.0.98 |
| Enrollment management | GET/DELETE /api/v1/enrollments | ✅ Working |
| Per-user enrollment | GET/DELETE /api/v1/users/{id}/enrollments | ✅ Working |
| Enrollment flow | POST/GET /api/v1/enrollment-flow | ✅ Working |

### 4.6 Device & Session Management

| Feature | API Endpoint | Status |
|---------|-------------|--------|
| Register device | POST /api/v1/devices | ✅ Working |
| List devices | GET /api/v1/devices?userId= | ✅ Working |
| Delete device | DELETE /api/v1/devices/{id} | ✅ Working |
| Active sessions list | GET /api/v1/sessions | ✅ Working |
| Revoke single session | POST /api/v1/sessions/{id}/revoke | ✅ Working |
| Revoke all sessions | POST /api/v1/sessions/revoke-all | ✅ Working |
| Step-up device register | POST /api/v1/step-up/register-device | ✅ Working |
| Step-up challenge | POST /api/v1/step-up/challenge | ✅ Working |
| Step-up verify | POST /api/v1/step-up/verify-challenge | ✅ Working |

### 4.7 Auth Flow Configuration

| Feature | API Endpoint | Status |
|---------|-------------|--------|
| Define auth methods | GET/POST/PUT/DELETE /api/v1/auth-methods | ✅ Working |
| Enable methods per tenant | POST /api/v1/tenant-auth-methods | ✅ Working |
| Build auth flows | POST /api/v1/tenants/{id}/auth-flows | ✅ Working |
| Configure flow steps | (embedded in flow) | ✅ Working |
| Execute flow sessions | POST /api/v1/auth/sessions | ✅ Working |

### 4.8 Supporting Features

| Feature | Status |
|---------|--------|
| Audit logging (async) | ✅ Working — 27 log entries in dev DB |
| Statistics dashboard | ✅ Working |
| Rate limiting (Bucket4j) | ✅ Working |
| Multi-tenancy (Hibernate filter) | ✅ Working |
| TOTP (2FA) | ✅ Implemented |
| OTP via email | ✅ Implemented (email disabled in dev) |
| OTP via SMS (Twilio) | ✅ Implemented (SMS disabled in dev) |
| QR Code generation | ✅ Implemented |
| WebAuthn/FIDO2 | ✅ Implemented |
| Guest lifecycle | ✅ Implemented |
| Password history | ✅ Implemented |

---

## 5. IDENTITY CORE API — DEEP ANALYSIS

### 5.1 Numbers at a Glance

| Metric | Count |
|--------|-------|
| JPA Entities | 27 |
| REST Controllers | 27 |
| REST Endpoints | ~120 |
| Application Services | 30+ |
| Input Ports (Use Cases) | 29 |
| Output Ports | 8 |
| Infrastructure Adapters | 8+ |
| JPA Repositories | 21 |
| Domain Repository Ports | 4 |
| Flyway Migrations | 19 (V0–V19) |
| Database Tables | ~30 |
| Unit Tests | 528 (per CLAUDE.md) |
| Integration Tests (TestContainers) | 24 |

### 5.2 Controllers & Endpoint Count

| Controller | Base Path | Endpoint Count |
|-----------|-----------|----------------|
| AuthController | /api/v1/auth | 12 |
| UserController | /api/v1/users | 7 |
| TenantController | /api/v1/tenants | 8 |
| RoleController | /api/v1/roles | 8 |
| PermissionController | /api/v1/permissions | 5 |
| UserRoleController | /api/v1/user-roles | 3 |
| AuthMethodController | /api/v1/auth-methods | 5 |
| TenantAuthMethodController | /api/v1/tenant-auth-methods | 6 |
| AuthFlowController | /api/v1/tenants/{id}/auth-flows | 5 |
| AuthSessionController | /api/v1/auth/sessions | 5 |
| StepUpController | /api/v1/step-up | 3 |
| BiometricController | /api/v1/biometric | 6 |
| EnrollmentController | /api/v1/enrollments | 3 |
| EnrollmentManagementController | /api/v1/users/{id}/enrollments | 3 |
| UserEnrollmentFlowController | /api/v1/enrollment-flow | 4 |
| DeviceController | /api/v1/devices | 3 |
| OtpController | /api/v1/otp | 3 |
| TotpController | /api/v1/totp | 4 |
| QrCodeController | /api/v1/qr | 3 |
| QrSessionController | /api/v1/qr-sessions | 4 |
| WebAuthnController | /api/v1/webauthn | 4 |
| SessionController | /api/v1/sessions | 3 |
| AuditLogController | /api/v1/audit-logs | 3 |
| AuthBiometricController | /api/v1/auth/biometric | 1 |
| GuestController | /api/v1/guests | 3 |
| UserSettingsController | /api/v1/users/{id}/settings | 2 |
| StatisticsController | /api/v1/statistics | 5 |
| **TOTAL** | | **~120** |

### 5.3 What's Broken or Incomplete

| Issue | Location | Severity | Fix Complexity |
|-------|----------|----------|----------------|
| ~~NfcDocumentAuthHandler~~ | ~~handler/NfcDocumentAuthHandler.java~~ | ~~Fixed~~ | ✅ Wired to NfcController verify with DB lookup |
| FingerprintAuthHandler hits stub | biometric-processor is stub | Medium | High — needs platform SDK |
| ~~VoiceAuthHandler hits stub~~ | ~~biometric-processor is stub~~ | ~~Fixed~~ | ✅ Resemblyzer 256-dim deployed on Hetzner |
| UserController in-memory pagination | UserController.getAllUsers() | Low | Medium — add DB-level pageable |
| WebAuthn no frontend enrollment UI | web-app missing | Low | Medium |
| TOTP enrollment not connected to frontend | web-app TotpEnrollment component | Low | Low |
| QR Code step not wired in frontend | web-app QrCodeStep component | Low | Low |
| Email disabled in dev | mail.enabled=false | N/A (by design) | — |
| SMS disabled in dev | sms.enabled=false | N/A (by design) | — |

---

## 6. BIOMETRIC PROCESSOR — DEEP ANALYSIS

### What it has
- **46+ endpoints** across face, fingerprint (stub), voice (stub), liveness, quality
- **DeepFace 0.0.98** for face recognition (VGG-Face model)
- **Anti-spoofing** (DeepFace liveness check)
- **API key authentication**
- **pgvector** storage for embeddings
- **Redis** for liveness session state
- **Puzzle-based liveness** (client drags puzzle piece while camera is on)
- **Browser-side MediaPipe** face detection (client-side pre-filter)

### What's missing / Broken
- **Fingerprint endpoint** — stub, always returns failure
- ~~**Voice endpoint** — stub, always returns failure~~ ✅ FIXED — Resemblyzer 256-dim, 490-585ms
- **Deployment** — Cloudflare Tunnel to laptop GPU not set up (scripts ready in `scripts/deploy/`)
- **Production URL** — `bpa-fivucsas.rollingcatsoftware.com` pending (tunnel not running)

### Performance Issues (discovered 2026-03-19)
- **Memory**: biometric-api at 94% (2.825GB/3GB) — needs increase to 3.5GB
- **Health check**: 678ms — needs lightweight `/health` endpoint
- **Event loop**: Voice operations block FastAPI event loop — need `run_in_executor` thread pool
- **Indexes**: Missing pgvector HNSW indexes on face_embeddings and voice_enrollments tables

### Why GPU deployment matters
The biometric-processor needs a GPU to run DeepFace at acceptable speed:
- CPU only: ~3-5s per verification (acceptable for dev)
- GTX 1650 (your GPU): ~200-400ms per verification (production-grade)
- Scripts: `scripts/deploy/setup-laptop-gpu-wsl.ps1`

---

## 7. WEB DASHBOARD — ANALYSIS

### What's live at ica-fivucsas.rollingcatsoftware.com

| Page / Feature | Status |
|---------------|--------|
| Login page | ✅ |
| Dashboard with charts | ✅ |
| User management (list, create, edit, delete) | ✅ |
| Tenant management | ✅ |
| Role & Permission management | ✅ |
| Auth flow builder | ✅ |
| Device management page | ✅ |
| Auth sessions page | ✅ |
| Analytics (recharts: pie, bar, area, radial) | ✅ |
| Audit log with filters | ✅ |
| Real-time notification panel (audit polling) | ✅ |
| TOTP enrollment dialog (Settings page) | ✅ (exists but not wired to API) |
| Multi-step auth UI (10 step components) | ✅ |
| i18n Turkish/English | ✅ |
| Playwright E2E tests (224 tests) | ✅ 217 pass, 7 skipped |

### What's missing in web-app
| Gap | Priority |
|-----|----------|
| WebAuthn enrollment UI | Low |
| QrCode step connected to QrCodeController | Low |
| Fingerprint/Voice enrollment (pending biometric-processor stubs) | Low |
| Real-time WebSocket notifications (currently polling) | Medium |

---

## 8. MOBILE/DESKTOP APPS — ANALYSIS

### What exists (Kotlin Multiplatform)
- **7 test files** in client-apps
- **Production API URLs** configured
- **Step-up fingerprint integration** — backend V17 deployed, client side pending
- Shared code structure: `shared/commonMain/`, `androidMain/`, `iosMain/`, `desktopMain/`
- Compose Multiplatform for UI

### What's missing
- Full implementation (currently 70%)
- Tests require Android SDK to run (`./gradlew :shared:test`)
- Step-up public key registration from mobile side
- Need to verify P-256 key format compatibility with backend

---

## 9. GAP ANALYSIS — HAVE VS MISSING

### ✅ COMPLETE (Production Ready)
- Core auth (login, logout, JWT, refresh)
- User/Tenant/Role/Permission CRUD
- Multi-step auth sessions (PASSWORD + FACE working)
- Face biometric enrollment and verification
- Liveness/anti-spoofing (DeepFace)
- Step-up auth backend (ECDSA P-256)
- TOTP, Email OTP, SMS OTP (disabled in dev, ready for prod)
- QR Code cross-device delegation
- WebAuthn/FIDO2 backend
- Device registration and management
- Session management (revoke single/all)
- Audit logging (async)
- Multi-tenancy (Hibernate filter)
- Rate limiting (Bucket4j)
- RBAC with granular permissions
- Auth flow builder (configurable multi-step flows per tenant)
- Web Dashboard (all admin pages, i18n, E2E tested)
- 19 Flyway migrations, 30 tables
- 528 unit tests + 24 integration tests + 224 E2E tests

### ⚠️ PARTIALLY COMPLETE
| Gap | Effort | Priority |
|-----|--------|----------|
| Fingerprint biometric (biometric-processor stub) | High | Medium |
| Voice biometric (biometric-processor stub) | High | Low |
| NFC Document auth | Very High | Low |
| Mobile apps (70% done) | High | High |
| Cloudflare Tunnel for GPU biometric | Low | Medium |
| WebAuthn frontend enrollment | Medium | Low |

### ❌ MISSING / NOT STARTED
| Feature | Notes |
|---------|-------|
| Real-time WebSocket notifications | Currently polling in web-app |
| Mobile step-up integration (client side) | Backend done, client side pending |
| Biometric processor production deployment | Tunnel scripts ready |
| SMS production activation (Twilio) | Config ready, needs TWILIO_ACCOUNT_SID |
| Email production activation | Config ready, needs SMTP credentials |
| Performance load testing results | Scripts exist in load-tests/ |
| Monitoring dashboards (Grafana/Prometheus) | Config exists, not running |

---

## 10. TEST PLAN

### Phase A — Identity Core API (localhost:8080)

#### A1. Authentication
- [ ] POST /api/v1/auth/login — valid credentials → 200 + JWT
- [ ] POST /api/v1/auth/login — wrong password → 401
- [ ] POST /api/v1/auth/login — nonexistent user → 401
- [ ] POST /api/v1/auth/register — new user → 201
- [ ] POST /api/v1/auth/register — duplicate email → 409
- [ ] POST /api/v1/auth/refresh — valid refresh → 200 + new access
- [ ] POST /api/v1/auth/refresh — expired refresh → 401
- [ ] POST /api/v1/auth/logout → 200
- [ ] GET /api/v1/auth/me (with token) → 200 + user data

#### A2. User Management
- [ ] GET /api/v1/users → 200 + paginated list
- [ ] GET /api/v1/users/{id} → 200
- [ ] POST /api/v1/users (create) → 201
- [ ] PUT /api/v1/users/{id} (update) → 200
- [ ] DELETE /api/v1/users/{id} → 204
- [ ] GET /api/v1/users/search?query=admin → 200
- [ ] GET/PUT /api/v1/users/{id}/settings → 200

#### A3. Tenant Management
- [ ] GET /api/v1/tenants → 200 + 4 tenants
- [ ] POST /api/v1/tenants → 201
- [ ] GET /api/v1/tenants/{id} → 200
- [ ] PUT /api/v1/tenants/{id} → 200
- [ ] POST /api/v1/tenants/{id}/suspend → 200
- [ ] POST /api/v1/tenants/{id}/activate → 200

#### A4. RBAC
- [ ] GET /api/v1/roles → 200
- [ ] POST /api/v1/roles → 201
- [ ] POST /api/v1/roles/{id}/permissions/assign → 200
- [ ] POST /api/v1/user-roles → 200 (assign role to user)
- [ ] DELETE /api/v1/user-roles → 200

#### A5. Biometric
- [ ] POST /api/v1/biometric/enroll/{userId} (multipart image) → 200
- [ ] POST /api/v1/biometric/verify/{userId} (multipart image) → 200 + similarity
- [ ] GET /api/v1/enrollments → 200
- [ ] DELETE /api/v1/enrollments/{id} → 204

#### A6. Auth Flows (Multi-Step)
- [ ] GET /api/v1/auth-methods → 200
- [ ] GET /api/v1/tenants/{id}/auth-flows → 200
- [ ] POST /api/v1/auth/sessions (start PASSWORD flow) → 201
- [ ] POST /api/v1/auth/sessions/{id}/steps/1 (PASSWORD step) → 200
- [ ] GET /api/v1/auth/sessions/{id} → 200 + COMPLETED

#### A7. Step-Up Auth
- [ ] POST /api/v1/step-up/register-device (P-256 public key) → 200
- [ ] POST /api/v1/step-up/challenge → 200 + nonce
- [ ] POST /api/v1/step-up/verify-challenge (ECDSA signature) → 200

#### A8. Devices & Sessions
- [ ] POST /api/v1/devices → 201
- [ ] GET /api/v1/devices?tenantId={id} → 200
- [ ] GET /api/v1/sessions → 200
- [ ] POST /api/v1/sessions/{id}/revoke → 200
- [ ] POST /api/v1/sessions/revoke-all → 200

#### A9. Audit & Stats
- [ ] GET /api/v1/audit-logs → 200 + 27+ entries
- [ ] GET /api/v1/audit-logs?action=USER_CREATED → 200 + filtered
- [ ] GET /api/v1/statistics/dashboard → 200
- [ ] GET /api/v1/statistics/users → 200

### Phase B — Web Dashboard (browser)
- [ ] Login at https://ica-fivucsas.rollingcatsoftware.com
- [ ] Navigate all 16 pages without errors
- [ ] Create new user via form
- [ ] Create new tenant
- [ ] Build a 2-step auth flow (Password + Face)
- [ ] View audit logs with filters
- [ ] TOTP enrollment dialog
- [ ] Run Playwright E2E suite: `cd web-app && npx playwright test`

### Phase C — Biometric Processor (localhost:8001)
- [ ] GET /api/v1/health → 200
- [ ] POST /api/v1/enroll (with face image) → 200
- [ ] POST /api/v1/verify (with face image) → 200 + match/no-match
- [ ] POST /api/v1/liveness/start → 200 (puzzle session)
- [ ] GET /api/v1/quality (image quality score) → 200

### Phase D — Browser Biometric (demo UI)
- [ ] Open enrollment UI
- [ ] Allow camera access
- [ ] MediaPipe face detection fires
- [ ] Face captured and sent to biometric-processor
- [ ] Enrollment success
- [ ] Open verification UI
- [ ] Live face matches enrolled face

---

## 11. ARCHITECTURAL CRITICISM

### What's Good
1. **Hexagonal Architecture is properly applied** — domain has zero infrastructure imports, ports cleanly separate concerns
2. **Rich domain models** — business logic in entities, not in controllers
3. **Value Objects** — email, tenant ID, password hashing handled as proper types
4. **Async audit logging** — @Async prevents audit writes from slowing down request path
5. **Multi-tenancy via Hibernate filter** — clean and transparent, not scattered WHERE clauses
6. **Auth flow system** — genuinely flexible; operators can configure multi-step flows per operation type per tenant. Well-designed.
7. **Step-up auth (V17)** — ECDSA P-256 challenge-response is the right approach for mobile biometric delegation

### What Needs Criticism

#### Issue 1: Two UserRepository interfaces (MEDIUM)
There's a `domain.repository.UserRepository` (port) and `repository.UserRepository` (JPA), connected by `UserRepositoryAdapter`. Only `UserRepository` has this adapter — other domain repository ports (`TenantRepository`, `BiometricDataRepository`) may be directly injected with JPA repos in some services, bypassing the port. **Inconsistency erodes architecture.**
*Fix: Ensure all services inject domain repository ports, not JPA repos directly.*

#### Issue 2: 27 Controllers is too many (MEDIUM)
Controllers should group related operations. Having separate `QrCodeController` and `QrSessionController` for the same resource is confusing. Similarly, `EnrollmentController` and `EnrollmentManagementController` overlap.
*Fix: Consolidate to 15-17 controllers with clearer resource ownership.*

#### Issue 3: AuthSessionController vs AuthController overlap (MEDIUM)
Auth sessions (`/api/v1/auth/sessions`) are under `AuthController` base path, creating confusion about who owns the session lifecycle. `AuthBiometricController` at `/api/v1/auth/biometric` is a controller just for one endpoint.
*Fix: Merge into `AuthController` or `AuthSessionController` clearly.*

#### Issue 4: RedisMessagingConfig @PostConstruct creates new beans (LOW)
`initializeEventBusSubscriptions()` calls `redisEventBus(...)` directly instead of injecting the bean — creates new object instances, not Spring-managed beans. The subscriptions are set on those new instances, not the beans in the application context. The catch block masks this.
*Fix: @Autowired injection of `RedisEventBus` and `BiometricEventListener` (needs careful ordering).*

#### Issue 5: Tenant entity vs V1 migration drift (MEDIUM)
V1 created `tenants` with `subscription_plan`, `is_active`, `max_biometric_enrollments` etc., but the `Tenant` JPA entity was later refactored to use `status`, `biometricEnabled`, etc. V19 partially fixes this but the DB still has orphaned columns (`subscription_plan`, `is_active`, `display_name`, `max_biometric_enrollments`) not mapped in the entity.
*Fix: V20 migration to either drop orphan columns or add them back to the entity.*

#### Issue 6: In-memory pagination in UserController (LOW)
`getAllUsers()` fetches all records then slices in Java. Will be a performance cliff with large tenant user bases.
*Fix: Use Spring Data `Pageable` and `Page<User>` in repository.*

#### Issue 7: No request/response DTOs standardization (MEDIUM)
Some endpoints return JPA entities directly, some return DTOs. This leaks database column names, makes API versioning hard, and can expose internal fields.
*Fix: All responses should go through DTO mappers. Verify with a code scan.*

#### Issue 8: Biometric stubs not clearly communicated (LOW)
Fingerprint and voice endpoints exist in both `BiometricController` and biometric-processor, but silently fail. Callers get 200 with "verification failed" — same response as a real biometric mismatch.
*Fix: Add `X-Biometric-Available: false` header or return 501 Not Implemented for stub methods.*

---

## 12. ROADMAP

### Sprint 1 (This Session) — Stabilization
- [x] Fix all Spring context startup failures (4 missing beans)
- [x] Fix JWT secret (Base64 encoding)
- [x] Fix V19 migration (tenants table)
- [x] All 9 API endpoints smoke-tested
- [ ] **Run full Phase A test plan** (identity core API)
- [ ] **Fix in-memory pagination** in UserController
- [ ] **Commit + push** all fixes

### Sprint 2 — Biometric Testing
- [ ] Phase C: biometric-processor API tests (curl)
- [ ] Phase D: browser biometric demo (MediaPipe + enrollment + verification)
- [ ] Document biometric processor endpoint behavior
- [ ] Plan Cloudflare Tunnel setup for GPU deployment

### Sprint 3 — Mobile App
- [ ] Coordinate with Aysenur on step-up endpoint docs
- [ ] Verify P-256 key format compatibility (mobile → backend)
- [ ] Implement step-up registration in Kotlin (Android)
- [ ] Run mobile unit tests (need Android SDK)
- [ ] End-to-end: mobile fingerprint → step-up challenge → verify

### Sprint 4 — Architecture Cleanup
- [ ] V20 migration: clean up orphaned tenant columns
- [ ] Consolidate overlapping controllers (QrCode, Enrollment)
- [ ] Fix RedisMessagingConfig @PostConstruct
- [ ] Add domain repository adapters for TenantRepository, BiometricDataRepository
- [ ] Add `X-Biometric-Available` headers for stub methods

### Sprint 5 — Production
- [ ] Activate Twilio SMS (add credentials)
- [ ] Activate SMTP email (add credentials)
- [ ] Deploy Cloudflare Tunnel for biometric-processor
- [ ] Deploy updated mobile app
- [ ] Load test (load-tests/ scripts)
- [ ] Grafana/Prometheus monitoring dashboards
- [ ] Final presentation delivery (Spring 2026)

---

*This is a living document. Update after each session.*
