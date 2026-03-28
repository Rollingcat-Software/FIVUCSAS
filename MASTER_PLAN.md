# FIVUCSAS — Master Plan: Honest Assessment & Gate-Driven Roadmap
> Created: 2026-03-15

---

## ANSWERS TO YOUR 9 QUESTIONS

---

### Q1. Is the entire project well-placed, responsible, designed and implemented with SE principles?

**Honest answer: No, not fully. Per component:**

| Component | SE Quality | Critical Problem |
|-----------|-----------|-----------------|
| **biometric-processor** | ✅ 8.2/10 — genuinely professional | Fingerprint/voice stubs lie to callers |
| **web-app** | ✅ 8.5/10 — professional, clean architecture | TOTP/QR enrollment not wired to backend |
| **client-apps** | ⚠️ 7/10 — architecture is good | **LoginViewModel uses hardcoded mock auth. Not real login.** |
| **identity-core-api** | ⚠️ 6.5/10 — structure present, implementation broken | Services bypass domain ports, 27 controllers, UserController loads ALL users into memory |

**Biggest single issue:** The mobile app's `LoginViewModel` has real login code commented out and returns a hardcoded `dev-token`. The mobile app has never authenticated against the real backend.

---

### Q2. Are architectures, decisions, and designs verified with tests? Run and verified everything?

**Honest answer: No.**

| What is tested | What is NOT tested |
|---------------|-------------------|
| Domain value objects (✅ 100% unit test coverage) | 24 of 27 controllers have zero tests |
| 10 auth handler units (✅) | Mobile app cannot run tests without Android SDK |
| 24 TestContainers integration tests | Fingerprint/voice stubs fail silently — not caught by tests |
| 224 Playwright E2E tests (web-app UI) | No end-to-end test: mobile → identity-core-api → biometric-processor |
| Face enrollment/verification (manual smoke test) | RBAC — no tests that unauthorized role gets 403 |
| Login + JWT (manual smoke test ✅ this session) | No test verifying logout actually invalidates tokens |

**The tests that exist are good. But critical paths have no coverage.**

---

### Q3. Should we move things to professional design first before testing?

**Answer: Yes, in this specific order:**

You cannot trust test results if the code is structurally wrong. Example: testing `UserController.getAllUsers()` with 9 users passes today. With 10,000 users it crashes (OOM). The bug is architectural, not behavioral.

**But do not do big-bang refactoring.** That breaks everything. The right order:

```
Fix what breaks at runtime first (P0)
     ↓
Fix what produces wrong results silently (P1)
     ↓
Test systematically
     ↓
Then refactor structure
     ↓
Re-test after each structural change
```

---

### Q4. Are client apps and web apps correctly designed, placed, named, implemented?

**Web-App:** Yes. Professional architecture. Feature-based folders, InversifyJS DI, clean TypeScript, 224 E2E tests. **One gap:** TOTP and QR enrollment dialogs exist in the UI but call no backend endpoints.

**Client-Apps (Kotlin Multiplatform):** Architecture is professional — Koin DI, Clean Architecture, expect/actual platform code. **Critical gap:**

```kotlin
// LoginViewModel.kt — THIS IS THE CURRENT STATE:
// Real login commented out, hardcoded token returned:
return "dev-token"  // TODO: connect to real backend
```

The entire fingerprint step-up flow is implemented correctly in Kotlin. But basic login is mocked. This means **the mobile app has never gone through the real auth flow end-to-end.**

---

### Q5. What is the real user flow of this platform?

This platform is a **B2B authentication-as-a-service**. The flow has two distinct actors: the **Tenant Admin** who sets up the system, and the **End User** who authenticates.

```
═══════════════════════════════════════════════════════════════
ACTOR 1: TENANT ADMIN (sets up once)
═══════════════════════════════════════════════════════════════

Step 1 — Tenant Setup
  Admin logs into web-app (ica-fivucsas.rollingcatsoftware.com)
  Creates or configures their tenant
  Sets: max users, session timeout, MFA required, biometric enabled

Step 2 — Auth Method Configuration
  Admin goes to Auth Methods page
  Enables methods for their tenant (PASSWORD, FACE, TOTP, SMS_OTP, etc.)

Step 3 — Auth Flow Builder
  Admin creates an auth flow for each operation type:
    APP_LOGIN → [PASSWORD]                    (simple)
    DOOR_ACCESS → [FACE]                       (biometric only)
    HIGH_SECURITY_OP → [PASSWORD → FACE]       (multi-step)
    API_ACCESS → [PASSWORD]                   (mandatory for API)

Step 4 — User Management
  Admin creates user accounts (or users self-register)
  Assigns roles and permissions
  Users get an invite/welcome email

Step 5 — Enrollment Setup
  Users enroll in required auth methods:
    Face → open camera, capture 3 angles → stored in biometric-processor
    TOTP → scan QR code with Google Authenticator
    Hardware Key → register FIDO2 device

═══════════════════════════════════════════════════════════════
ACTOR 2: END USER (every authentication attempt)
═══════════════════════════════════════════════════════════════

Step 1 — Initiate Authentication
  User opens the client app (mobile/desktop) or web app
  Enters email address → system identifies their tenant
  System loads the auth flow configured for APP_LOGIN

Step 2 — Auth Session Created
  POST /api/v1/auth/sessions
  → AuthSession created in DB, status: IN_PROGRESS
  → First step returned: e.g., step 1 = PASSWORD

Step 3 — Execute Steps
  For each step in the flow:
    If PASSWORD → enter password → POST /sessions/{id}/steps/1
    If FACE → camera opens → capture face → POST /sessions/{id}/steps/2
    If TOTP → enter 6-digit code → POST /sessions/{id}/steps/3

Step 4 — Session Completes
  All steps pass → session status: COMPLETED
  → identity-core-api issues JWT (access + refresh tokens)
  → User is authenticated

Step 5 — Access Resources
  Client attaches JWT to every request: Authorization: Bearer {token}
  → identity-core-api validates JWT + checks RBAC permissions
  → If authorized → return resource
  → If 401 → use refresh token to get new access token
  → If 403 → user does not have permission for this resource

Step 6 — Logout
  User logs out → POST /api/v1/auth/logout
  → Refresh token revoked from DB
  → Access token added to Redis blacklist (JTI) until expiry
  → User cannot authenticate with the old tokens

═══════════════════════════════════════════════════════════════
SPECIAL FLOW: STEP-UP AUTH (sensitive operations)
═══════════════════════════════════════════════════════════════

  User is already logged in (has JWT) but wants to do something sensitive
  App calls POST /api/v1/step-up/challenge → gets nonce
  Device signs nonce with ECDSA P-256 (gated by biometric prompt on device)
  POST /api/v1/step-up/verify-challenge → returns step-up token
  Step-up token attached to sensitive request headers

═══════════════════════════════════════════════════════════════
MISSING FLOW: THIRD-PARTY INTEGRATION (currently not supported)
═══════════════════════════════════════════════════════════════

  Currently there is NO way for a third-party app to use our auth.
  The web-app is an admin dashboard.
  The mobile app is internal.
  There is no embeddable widget, JavaScript SDK, or OAuth flow.
  → See Q7 for what this needs to look like.
```

---

### Q6. Do we have all basic CRUD for all entities with professional RBAC? Verified?

**CRUD coverage: mostly yes. RBAC enforcement: not verified.**

#### CRUD Status
| Entity | Create | Read | Update | Delete | Notes |
|--------|--------|------|--------|--------|-------|
| User | ✅ | ✅ | ✅ | ✅ | In-memory pagination bug |
| Tenant | ✅ | ✅ | ✅ | ✅ | Orphaned DB columns |
| Role | ✅ | ✅ | ✅ | ✅ | Soft delete |
| Permission | ✅ | ✅ | ✅ | ✅ | |
| UserRole | ✅ assign | ✅ | ✅ | ✅ revoke | |
| AuthMethod | ✅ | ✅ | ✅ | ✅ | |
| TenantAuthMethod | ✅ | ✅ | ✅ | ✅ | |
| AuthFlow | ✅ | ✅ | ✅ | ✅ | |
| AuthFlowStep | ✅ embedded | ✅ | ✅ | ✅ | |
| AuthSession | ✅ | ✅ | ❌ no update | ✅ cancel | Sessions are append-only — correct |
| UserDevice | ✅ | ✅ | ❌ no update | ✅ | Update (rename?) may be needed |
| UserEnrollment | ✅ | ✅ | ❌ | ✅ revoke | No direct update — managed by enrollment flow |
| AuditLog | ❌ (only created internally) | ✅ | ❌ (immutable) | ❌ (immutable) | Correct — audit logs must be immutable |
| WebAuthnCredential | ✅ | ✅ | ❌ | ✅ | |
| UserSettings | auto-create | ✅ | ✅ | ❌ | |
| GuestInvitation | ✅ invite | ✅ | ❌ | ❌ | |
| RefreshToken | internal | ❌ not exposed | ❌ | ✅ revoke | Correct — internal token management |

#### RBAC Status: NOT VERIFIED

We have `@PreAuthorize` annotations on controllers. But:
- **No test verifies that a TENANT_MEMBER cannot access `/api/v1/tenants`**
- **No test verifies that a user from Tenant A cannot see users from Tenant B**
- **No test verifies that a SUPER_ADMIN can do things a TENANT_ADMIN cannot**

The RBAC configuration exists and is logically correct, but it has never been systematically tested with different roles making requests.

---

### Q7. How do clients integrate our auth methods? How will they use our embedded GUIs?

**Current answer: They cannot. There is no integration path for third-party clients.**

What we have today is an **admin dashboard** for managing the identity service, plus an **internal mobile app**. There is no way for a company (our tenant) to embed our authentication into their own app or website.

**What a professional auth-as-a-service needs:**

```
INTEGRATION PATH 1: JavaScript/Web SDK (priority for web apps)
  <script src="https://cdn.fivucsas.com/sdk.js"></script>

  FivucsasAuth.init({ tenantId: 'company-x', apiUrl: '...' });
  FivucsasAuth.login({
    onSuccess: (token) => { /* store token, redirect */ },
    onError: (err) => { /* handle */ }
  });

  → SDK opens a popup or redirect to our hosted auth page
  → User completes configured auth flow (password, face, etc.)
  → SDK returns JWT to the calling app
  → Calling app uses JWT for their own API calls

INTEGRATION PATH 2: Redirect/OAuth Flow (like Google OAuth)
  1. Company's app redirects user to:
     https://auth.fivucsas.com/authorize?tenant_id=X&redirect_uri=Y&scope=openid
  2. User completes our auth flow
  3. We redirect back to Y with: ?code=ABC
  4. Company's server exchanges code for JWT

  → This is the standard OAuth2 Authorization Code flow
  → We currently have NO OAuth2 server implementation

INTEGRATION PATH 3: Direct REST API (exists today)
  Companies call our API directly and build their own UI:
  POST /api/v1/auth/sessions → execute steps → get JWT

  → This works TODAY for technical integrators
  → But requires implementing the multi-step UI themselves

INTEGRATION PATH 4: Embedded UI Components (for mobile)
  Android/iOS SDK (AAR / Swift Package) that companies add to their app
  Component shows our face capture / TOTP / password UI
  Returns JWT to the host app

  → Our client-apps code is a starting point but is not packaged as an SDK
```

**For university project scope:** Path 3 (direct REST API) is sufficient to demonstrate integration. Path 1 and 2 are production goals.

---

### Q8. We go step by step and do not continue until each step is comprehensively approved.

**Agreed. This is the correct approach.** The gate-driven roadmap is in Section 2 below.

---

### Q9. Are you clear?

Yes. You want:
1. Honest assessment (not optimistic progress reports)
2. Professional execution — no shortcuts, no half-done steps
3. Every step verified before the next begins
4. Architecture fixed before features are added
5. A clear picture of what the platform does, what it misses, what each component's job is

---

---

## SECTION 2: GATE-DRIVEN ROADMAP

Each phase has an **entry condition** (what must be true to start) and an **exit gate** (what must be true to finish). You do not move to the next phase until the exit gate is fully met.

---

## PHASE 0 — STOP AND FIX CRITICAL BUGS (No gate to enter, must exit before anything else)

**These bugs produce wrong results silently. Fix them first.**

### 0.1 Fingerprint/Voice Stubs Return Wrong HTTP Status
**Problem:** Returning `{ success: false }` (200 OK) instead of `501 Not Implemented`. Callers cannot distinguish "biometric mismatch" from "feature not available."
**Fix:** Change fingerprint.py and voice.py to return HTTP 501.
**File:** `biometric-processor/app/api/routes/fingerprint.py`, `voice.py`

### 0.2 Mobile LoginViewModel Uses Hardcoded Mock Token
**Problem:** `return "dev-token"` — mobile app never actually logs in.
**Fix:** Uncomment real login call in `LoginViewModel.kt`, connect to backend.
**File:** `client-apps/shared/src/commonMain/.../presentation/viewmodel/auth/LoginViewModel.kt`

### 0.3 RedisMessagingConfig Creates Unmanaged Beans
**Problem:** @PostConstruct calls @Bean factory methods directly — event subscriptions never fire.
**Fix:** Inject beans with @Lazy to avoid circular dependency.
**File:** `identity-core-api/.../infrastructure/messaging/RedisMessagingConfig.java`

### 0.4 JWT Access Token Not Revoked on Logout
**Problem:** Logout only revokes refresh token. A stolen access token is valid for 1 hour after logout.
**Fix:** Add JTI to Redis blacklist on logout. Check blacklist in `JwtAuthenticationFilter`.

### Phase 0 Exit Gate:
- [ ] `POST /fingerprint/enroll` on biometric-processor returns 501
- [ ] Mobile app calls real `/api/v1/auth/login`, gets real JWT
- [ ] Logout test: token invalid immediately after logout (Redis blacklist works)
- [ ] No errors in identity-core-api logs about event bus initialization

---

## PHASE 1 — FIX ARCHITECTURE IN identity-core-api

**Entry:** Phase 0 exit gate passed.

### 1.1 Fix In-Memory Pagination in UserController
**Problem:** Loads ALL users → slices in Java. OOM with large datasets.
**Fix:** Add `Pageable` parameter to `UserRepository.findAll()`. One method change.
**Verification:** Query with 1 user vs 1000 users, confirm DB LIMIT/OFFSET in logs.

### 1.2 Make All Services Use Domain Ports (Not JPA Repos)
**Problem:** `AuthenticateUserService` injects `com.fivucsas.identity.repository.UserRepository` (JPA) instead of the domain port. Pattern repeated in most services.
**Fix:** Replace all direct JPA repo injections in application services with domain port injections. `UserRepositoryAdapter` already exists — use it.
**Verification:** No import of `com.fivucsas.identity.repository.*` should exist in `application/service/*`.

### 1.3 Consolidate 27 Controllers to 15
**Fix:** Merge overlapping controllers:
- `QrCodeController` + `QrSessionController` → `OtpController`
- `EnrollmentController` + `EnrollmentManagementController` → `EnrollmentController`
- `AuthBiometricController` (1 endpoint) → merge into `BiometricController`
**Verification:** All endpoints still return same HTTP codes. Swagger shows 15 controllers.

### 1.4 Remove Business Logic From UserController
**Fix:** Move `enrichWithLoginInfo()` and pagination math to service layer. Controller only calls use case port.

### Phase 1 Exit Gate:
- [ ] `UserController` uses DB-level pagination (LIMIT/OFFSET visible in Hibernate logs)
- [ ] No `com.fivucsas.identity.repository.*` imports in any file under `application/service/`
- [ ] Controller count ≤ 15
- [ ] `mvn clean test` passes without failures

---

## PHASE 2 — COMPREHENSIVE CRUD AND RBAC VERIFICATION

**Entry:** Phase 1 exit gate passed.

### 2.1 Write CRUD test scripts for all entities
For each entity: test Create, Read (single + list), Update, Delete.
Run against `localhost:8080` with JWT from admin login.

### 2.2 Write RBAC verification tests
Test each combination:
- `SUPER_ADMIN` can do everything → expect 200
- `TENANT_ADMIN` cannot access other tenant's data → expect 403
- `TENANT_MEMBER` cannot create users → expect 403
- Unauthenticated request → expect 401
- Missing JWT → expect 401

### 2.3 Fix Any CRUD Gaps Found
Based on test results, fix missing endpoints or wrong HTTP codes.

### 2.4 DB Schema Cleanup (V20 Migration)
- Add missing indexes
- Decide: keep or drop orphaned tenant columns (`subscription_plan`, `is_active`, etc.)
- Add `deleted_at` to entities that do soft-delete but don't have it

### Phase 2 Exit Gate:
- [ ] All entity CRUD operations return correct HTTP codes in test script
- [ ] RBAC test: TENANT_MEMBER cannot call `/api/v1/tenants` → 403 confirmed
- [ ] Cross-tenant isolation test passes (Tenant A user cannot see Tenant B users)
- [ ] V20 migration applied cleanly
- [ ] `mvn clean test` still passes

---

## PHASE 3 — CONNECT MOBILE APP TO REAL BACKEND (End-to-End)

**Entry:** Phase 2 exit gate passed.

### 3.1 Mobile Real Login
- Uncomment real login in LoginViewModel (Phase 0 done)
- Add token storage (Android Keystore)
- Add token refresh interceptor in Ktor client
- Test: login → JWT → authenticated API call

### 3.2 Mobile Face Enrollment → Verification Flow
- Implement face capture → POST to biometric-processor
- Update UserEnrollment status
- Implement face verification in auth session step

### 3.3 Mobile Fingerprint Step-Up
- FingerprintViewModel already implemented (ECDSA P-256)
- Verify public key format compatibility with backend
- Test: register device → request challenge → sign → verify → get step-up token

### 3.4 Mobile RBAC and Multi-Tenancy
- Mobile app must send tenant context (header or login response)
- Test: login as TENANT_MEMBER → cannot call admin endpoints

### Phase 3 Exit Gate:
- [ ] Mobile app logs in with real credentials and gets real JWT
- [ ] Mobile app can enroll face and verify face against real biometric-processor
- [ ] Step-up auth works end-to-end: fingerprint prompt → ECDSA → step-up token
- [ ] Mobile logout invalidates tokens (blacklist check)

---

## PHASE 4 — FIX BIOMETRIC PROCESSOR STUBS

**Entry:** Phase 3 exit gate passed.

### 4.1 Wire Liveness Detection to Real Implementation
- `EnhancedLivenessDetector` (LBP + blink + smile) exists but is not wired to `/liveness` endpoint
- Connect it when `ANTI_SPOOFING_ENABLED=true`
- Test: static image returns low liveness score, live face returns high score

### 4.2 Fingerprint: Decide and Implement or Formally Disable
**Option A (disable cleanly):**
- Return 501 from endpoints (done in Phase 0)
- Remove `FingerprintAuthHandler` from available auth methods
- Remove fingerprint from any configured auth flows
- Document: fingerprint biometrics = future work

**Option B (implement via device biometric delegation):**
- Fingerprint verification happens ON the device (FaceID/TouchID)
- biometric-processor is not involved
- Identity-core-api issues step-up token after ECDSA challenge
- This is actually the RIGHT model for mobile biometrics

### 4.3 Enrollment Synchronization
- Add idempotency key to enrollment endpoint
- Test: duplicate enrollment request returns same result (not duplicate embedding)

### Phase 4 Exit Gate:
- [ ] `/api/v1/liveness` returns meaningful liveness scores (not always 1.0)
- [ ] Fingerprint endpoints return 501 OR are implemented via step-up model
- [ ] Duplicate enrollment test passes (idempotency)
- [ ] Face enrollment + verification end-to-end verified with real images

---

## PHASE 5 — WEB APP INTEGRATION GAPS

**Entry:** Phase 4 exit gate passed.

### 5.1 Connect TOTP Enrollment to Backend
- `TotpEnrollment.tsx` dialog exists but doesn't call `TotpController`
- Wire: POST `/api/v1/totp/setup` → show QR → POST `/api/v1/totp/verify` to confirm

### 5.2 Connect QR Code Step
- `QrCodeStep.tsx` exists but doesn't use `QrCodeController` or `QrSessionController`
- Wire cross-device delegation flow

### 5.3 Add Missing Sidebar Navigation
- `AuthSessionsPage` exists but has no sidebar link

### 5.4 WebAuthn Enrollment (Low Priority)
- UI component exists but not wired
- Wire to `WebAuthnController` registration endpoints

### Phase 5 Exit Gate:
- [ ] TOTP enrollment works end-to-end from web-app settings page
- [ ] QR code login works: scan QR on mobile → web-app gets logged in
- [ ] All pages accessible from sidebar navigation
- [ ] Playwright E2E tests pass: 217+ of 224

---

## PHASE 6 — DOMAIN MODEL RESTRUCTURE (Highest Architecture Value)

**Entry:** Phase 5 exit gate passed. This phase is explicitly last because it has the highest risk of regression.

### 6.1 Create Pure Domain Aggregates
Move business logic from JPA entities to pure domain classes:
```
entity/User.java  →  domain/model/user/User.java (no JPA annotations)
entity/Tenant.java →  domain/model/tenant/Tenant.java (no JPA annotations)
```

### 6.2 Create JPA Entities as Separate Infrastructure Classes
```
infrastructure/persistence/entity/UserJpaEntity.java  (only @Entity, columns)
infrastructure/persistence/entity/TenantJpaEntity.java
infrastructure/persistence/mapper/UserMapper.java (domain ↔ JPA)
```

### 6.3 Create Missing Domain Repository Adapters
`TenantRepositoryAdapter`, `BiometricDataRepositoryAdapter` (parallel to existing `UserRepositoryAdapter`)

### 6.4 Add PostgreSQL Row-Level Security
V21 migration: add RLS policies for all tenant-scoped tables.

### Phase 6 Exit Gate:
- [ ] No `@Entity` annotations in `domain/` package
- [ ] No JPA imports in `application/service/` package
- [ ] All existing tests still pass after restructure
- [ ] RLS: database query blocked without tenant context even if Java filter is bypassed

---

## PHASE 7 — CLIENT INTEGRATION STORY (Third-Party Use)

**Entry:** Phase 6 exit gate passed.

### 7.1 Define Integration API (OAuth2-like)
Minimal viable integration story:
- Document the REST API integration path clearly
- Create a "getting started" guide for tenant developers
- Define API key management (tenant gets API key, uses it to call identity-core-api)

### 7.2 JavaScript SDK (Minimal)
A thin wrapper over our REST API that third-party web apps can use:
```javascript
import { FivucsasClient } from '@fivucsas/sdk';
const client = new FivucsasClient({ tenantId, apiUrl });
const { token, user } = await client.login(email, password);
```

### 7.3 Hosted Auth Page (Optional, Production Goal)
A standalone page at `auth.fivucsas.com` that any app can redirect to for authentication, similar to Auth0's universal login.

### Phase 7 Exit Gate:
- [ ] Integration guide written and reviewed
- [ ] JavaScript SDK published (internal package is sufficient)
- [ ] Demo: third-party app uses our SDK and gets back a valid JWT

---

## PHASE 8 — IDENTITY VERIFICATION PIPELINE (~8-12 weeks)

**Entry:** Phase 7 exit gate passed. Authentication platform is complete with SDK, OAuth 2.0, and embeddable widget. The platform now evolves from authentication-only to a full Identity Verification Platform (IVP).

### 8A. Schema + Core API (Week 1-2)

**What:** Database schema for verification sessions, step results, and documents. Core API for creating, managing, and executing verification pipelines. Industry-specific templates (Banking KYC, Healthcare, Education, etc.) with Turkish regulatory context.

**Component responsibilities:**
- `identity-core-api`: VerificationController, ManageVerificationService, V26 migration, FlowType enum, industry templates
- `web-app`: no changes yet (Phase 8D)
- `biometric-processor`: no changes yet (Phase 8B-8C)

**Exit gate:**
- [ ] V26 migration applies cleanly (verification_sessions, verification_step_results, verification_documents)
- [ ] `mvn clean compile` passes with new domain classes
- [ ] GET /api/v1/verification/templates returns industry template list
- [ ] POST /api/v1/verification/sessions creates a new verification session
- [ ] FlowType enum distinguishes AUTHENTICATION vs VERIFICATION flows

### 8B. Document Processing (Week 3-4)

**What:** Wire existing YOLO card detection and NFC reader into the verification pipeline. Add Tesseract OCR for text extraction from identity documents. Turkish ID card (TC Kimlik) specific parsing.

**Component responsibilities:**
- `biometric-processor`: DOCUMENT_SCAN endpoint (YOLO), DATA_EXTRACT endpoint (Tesseract OCR), MRZ parser
- `identity-core-api`: pipeline step orchestration, NFC_CHIP_READ step (delegates to existing NfcController)
- `client-apps`: NFC reading (already integrated, 11,089 lines)

**Exit gate:**
- [ ] DOCUMENT_SCAN step accepts image and returns detected card boundaries
- [ ] DATA_EXTRACT step extracts name, TC number, DOB, photo from TC Kimlik image
- [ ] NFC_CHIP_READ step reads chip data via existing NFC infrastructure
- [ ] Turkish ID card parser handles both front and back sides

### 8C. Face-to-Document Matching (Week 5-6)

**What:** Compare live face against document photo using existing DeepFace infrastructure. Integrate liveness detection into verification pipeline. Cross-reference extracted data against user profile.

**Component responsibilities:**
- `biometric-processor`: FACE_MATCH endpoint (DeepFace cosine similarity between live face and document photo)
- `biometric-processor`: LIVENESS_CHECK via existing EnhancedLivenessDetector
- `identity-core-api`: pipeline orchestrator chains steps, short-circuits on failure, stores results

**Exit gate:**
- [ ] FACE_MATCH returns confidence score comparing live face to document photo
- [ ] LIVENESS_CHECK integrated into pipeline (not just standalone)
- [ ] Full pipeline: scan → extract → match face → liveness → verified status
- [ ] Threshold configuration per tenant (face match >= 85%, liveness >= 90%)

### 8D. Admin UI + Templates (Week 7-8)

**What:** Verification Flow Builder UI, industry template selector, verification dashboard with analytics.

**Component responsibilities:**
- `web-app`: VerificationFlowBuilderPage, VerificationDashboardPage, VerificationSessionDetailPage
- `web-app`: template selector component, per-step threshold configuration
- `identity-core-api`: dashboard statistics endpoints (completion rates, avg time, failure reasons)

**Exit gate:**
- [ ] Tenant admin can create a Banking KYC pipeline from template
- [ ] Verification Dashboard shows completion rates, avg verification time, failure reasons
- [ ] Per-step threshold configuration works (sliders for face match %, liveness %)
- [ ] Verification session detail view shows step-by-step results with confidence scores

### 8E. Advanced Integrations (Week 9-12)

**What:** Additional verification step types — address proof, watchlist screening, age verification, phone verification, credit check interface, video interview recording.

**Component responsibilities:**
- `biometric-processor`: ADDRESS_PROOF (OCR on utility bills), VIDEO_INTERVIEW (WebRTC recording storage)
- `identity-core-api`: WATCHLIST_CHECK (mock + interface for real provider), AGE_VERIFICATION (DOB calculation), PHONE_VERIFICATION (wire existing Twilio SMS OTP), CREDIT_CHECK (interface only)

**Exit gate:**
- [ ] All 9 verification step types functional (at minimum mock implementations)
- [ ] PHONE_VERIFICATION reuses existing Twilio SMS OTP infrastructure
- [ ] WATCHLIST_CHECK has clear interface for future real sanctions/PEP provider
- [ ] E2E test covers full Banking KYC pipeline from start to verified status

### Phase 8 Exit Gate (Overall):
- [ ] Complete verification pipeline: document scan → OCR → NFC → face match → liveness → verified
- [ ] 7 industry templates with Turkish regulatory context
- [ ] Admin UI for creating, monitoring, and configuring verification flows
- [ ] All 9 step types implemented (real or mock)
- [ ] `industry_verified` flag set on users who complete verification
- [ ] Playwright E2E tests cover verification flow builder and dashboard

---

## CURRENT PHASE STATUS

```
Phase 0 — Critical Bug Fixes          [x] COMPLETE (fingerprint/voice 501, login fixed, token blacklist)
Phase 1 — Architecture Fixes          [x] COMPLETE (pagination, ports, controller consolidation)
Phase 2 — CRUD + RBAC Verification    [x] COMPLETE (all CRUD working, RBAC enforced)
Phase 3 — Mobile Backend Connection   [x] COMPLETE (real login, face, step-up, multi-tenancy)
Phase 4 — Biometric Stubs             [x] COMPLETE (liveness wired, FP via WebAuthn, idempotency)
Phase 5 — Web App Integration Gaps    [x] COMPLETE (TOTP, QR, sidebar, WebAuthn enrolled)
Phase 6 — Domain Model Restructure    [x] COMPLETE (domain/JPA separation, adapters, RLS)
Phase 7 — Client Integration Story    [x] COMPLETE (SDK, OAuth 2.0, widget, demo)
Phase 8 — Verification Pipeline       [ ] NOT STARTED
```

**Next: Phase 8 — Identity Verification Pipeline.**

---

## COMPONENT RESPONSIBILITY MATRIX

```
┌──────────────┬──────────────────────────────────────────────────────┐
│ Component    │ Responsible For                                       │
├──────────────┼──────────────────────────────────────────────────────┤
│ identity-    │ • User identity (who you are)                        │
│ core-api     │ • Authentication sessions (multi-step flow)          │
│              │ • Token issuance + revocation (JWT)                  │
│              │ • RBAC (roles, permissions, enforcement)             │
│              │ • Tenant configuration                               │
│              │ • Device registry                                    │
│              │ • Enrollment records (status, not data)              │
│              │ • Audit trail (all security events)                  │
│              │ • Multi-tenancy isolation                            │
├──────────────┼──────────────────────────────────────────────────────┤
│ biometric-   │ • Face embeddings (ML storage + matching)            │
│ processor    │ • Liveness detection (is this a real person?)        │
│              │ • Image quality assessment                           │
│              │ • Anti-spoofing (DeepFace)                          │
│              │ • ML model management                                │
│              │ • Enrollment data (the actual vectors)               │
├──────────────┼──────────────────────────────────────────────────────┤
│ web-app      │ • Tenant admin interface                             │
│              │ • User management UI                                 │
│              │ • Auth flow builder UI                               │
│              │ • Analytics and audit log UI                         │
│              │ • Multi-step auth UI (for embedded use)              │
├──────────────┼──────────────────────────────────────────────────────┤
│ client-apps  │ • End-user mobile/desktop experience                 │
│              │ • Face capture (client-side detection)               │
│              │ • Fingerprint step-up (ECDSA P-256 on device)       │
│              │ • QR code scanning                                   │
│              │ • Push notification handling                         │
├──────────────┼──────────────────────────────────────────────────────┤
│ DONE (Ph7)   │ • OAuth2 authorization server (OIDC/OAuth2) ✅        │
│              │ • JavaScript SDK (@fivucsas/auth-js) ✅              │
│              │ • React bindings (@fivucsas/auth-react) ✅           │
│              │ • Embeddable auth widget (verify-app) ✅             │
├──────────────┼──────────────────────────────────────────────────────┤
│ Phase 8      │ • Verification pipeline orchestration (ICA)          │
│ (NEXT)       │ • Document scan + OCR (biometric-processor)          │
│              │ • Face-to-document matching (biometric-processor)     │
│              │ • Verification flow builder UI (web-app)             │
│              │ • Industry templates — Banking/Healthcare/Education  │
│              │ • Watchlist/sanctions screening (interface + mock)    │
│              │ • Video interview recording (WebRTC)                 │
├──────────────┼──────────────────────────────────────────────────────┤
│ FUTURE       │ • Notification service (email/SMS as separate svc)   │
│              │ • Admin API keys (for tenant developers)             │
└──────────────┴──────────────────────────────────────────────────────┘
```

---

## NEXT IMMEDIATE ACTION

**Start Phase 0. Do not touch anything else until these 4 fixes are done and verified:**

1. `biometric-processor/app/api/routes/fingerprint.py` → return 501
2. `biometric-processor/app/api/routes/voice.py` → return 501
3. `client-apps/LoginViewModel.kt` → real backend login
4. `identity-core-api/LogoutUserService.java` + `JwtAuthenticationFilter.java` → token blacklist

**Ready to start? Say "start Phase 0" and we execute each fix, test it, then check the gate.**
