# FIVUCSAS — Deep Architectural Analysis
> Produced: 2026-03-15 | Based on full codebase read of identity-core-api + biometric-processor

---

## 0. THE FUNDAMENTAL QUESTION: WHO OWNS WHAT?

Before fixing anything, we must agree on service responsibilities. This is the root cause of almost every architectural problem found.

```
┌─────────────────────────────────────────────────────────────────┐
│                    WHAT EACH SERVICE SHOULD OWN                 │
├─────────────────────────┬───────────────────────────────────────┤
│  identity-core-api      │  biometric-processor                  │
├─────────────────────────┼───────────────────────────────────────┤
│  WHO you are            │  WHAT your face/voice/finger looks    │
│  (identity)             │  like (biometric data)                │
│                         │                                       │
│  Can you log in?        │  Does this face match stored face?    │
│  (authentication)       │  (biometric matching)                 │
│                         │                                       │
│  What can you do?       │  Is this a real live person?          │
│  (authorization/RBAC)   │  (liveness detection)                 │
│                         │                                       │
│  Which tenant are you?  │  What quality is this image?          │
│  (multi-tenancy)        │  (quality assessment)                 │
│                         │                                       │
│  Session tokens (JWT)   │  Embedding storage + search (pgvec)   │
│  Device registration    │  ML model management                  │
│  Enrollment records     │  Anti-spoofing                        │
│  Audit trail            │                                       │
└─────────────────────────┴───────────────────────────────────────┘
```

**The iron rule**: identity-core-api NEVER stores biometric embeddings. biometric-processor NEVER issues JWTs or manages users.

---

## 1. IDENTITY-CORE-API: ARCHITECTURAL PROBLEMS

### 1.1 CRITICAL — Domain Model Is Split Across Two Packages

**What we have now:**
```
entity/User.java          ← JPA entity WITH business methods (@Entity, used as domain object)
entity/Tenant.java        ← JPA entity WITH business methods

domain/model/user/Email.java        ← Value object (immutable, validated)
domain/model/user/FullName.java     ← Value object
domain/model/tenant/TenantId.java   ← Value object
```

**The problem:** Services must import from BOTH packages:
```java
import com.fivucsas.identity.entity.User;           // infrastructure!
import com.fivucsas.identity.domain.model.user.Email; // domain
```

The JPA `@Entity` annotation belongs to infrastructure (it's a database concern), yet the entity classes contain business logic (`user.activate()`, `tenant.suspend()`). This means the domain layer leaks into infrastructure.

**What it should look like:**
```
domain/model/user/User.java         ← Pure domain aggregate (no JPA annotations)
domain/model/tenant/Tenant.java     ← Pure domain aggregate

infrastructure/persistence/entity/UserJpaEntity.java   ← JPA mapping only
infrastructure/persistence/entity/TenantJpaEntity.java ← JPA mapping only
infrastructure/persistence/mapper/UserMapper.java       ← Maps domain ↔ JPA
```

**Effort to fix:** High. Requires creating separate JPA entities and mappers. But without this fix, the domain layer can never be truly isolated.

---

### 1.2 CRITICAL — Services Bypass Domain Ports and Inject JPA Repos Directly

**What we have now:**
```java
// AuthenticateUserService.java (line 30)
private final com.fivucsas.identity.repository.UserRepository userRepository;
// ↑ This is a Spring Data JPA repo — NOT the domain port!

// Should be:
private final com.fivucsas.identity.domain.repository.UserRepository userRepository;
// ↑ This is the domain port — dependency inversion correct
```

This pattern appears in **almost every service**. The `UserRepositoryAdapter` was created to bridge the gap, but services still import the JPA repo directly. This means:
- Business logic couples to the database technology
- You cannot swap the persistence layer without touching services
- Tests must mock JPA repos instead of domain ports

**Additionally, services inject infrastructure services directly:**
```java
// RegisterUserService.java (line 51)
private final com.fivucsas.identity.infrastructure.otp.OtpService otpService;
private final com.fivucsas.identity.infrastructure.email.EmailService emailService;
// ↑ These are infrastructure classes, not ports!
// Should inject EmailServicePort and CachePort (for OTP)
```

**Effort to fix:** Medium. Replace direct JPA repo injections with domain port injections across all services.

---

### 1.3 HIGH — 27 Controllers, Many With Overlapping Concerns

We have two controllers for QR codes (`QrCodeController` at `/api/v1/qr` and `QrSessionController` at `/api/v1/qr-sessions`), two for enrollment (`EnrollmentController` and `EnrollmentManagementController`), and one controller with a single endpoint (`AuthBiometricController`).

**Problems found in controllers:**

**a) Business logic inside a controller:**
```java
// UserController.getAllUsers() — loads ALL users, then pages in Java memory
List<UserResponse> allUsers = responses.stream().map(this::enrichWithLoginInfo).collect(...);
int totalElements = allUsers.size();
int totalPages = (int) Math.ceil((double) totalElements / size);
int fromIndex = Math.min(page * size, totalElements);
// ↑ This is O(n) memory. With 10,000 users in a tenant = OOM risk.
// Should be: repository.findAll(PageRequest.of(page, size))
```

**b) Direct repository injection in a controller:**
```java
// UserController (lines 13-14)
private final UserRepository userRepository;         // JPA repo in controller!
private final PasswordEncoder passwordEncoder;       // BCrypt in controller!
```

Controllers should only call use case input ports. Nothing else.

**Target controller count: 15 (consolidated)**
```
AuthController          /api/v1/auth                  (login, logout, register, me, verify)
TokenController         /api/v1/auth/tokens           (refresh, revoke, revoke-all)
UserController          /api/v1/users                 (CRUD + settings + password)
TenantController        /api/v1/tenants               (CRUD + status)
RbacController          /api/v1/rbac                  (roles + permissions + assignments)
AuthFlowController      /api/v1/auth-flows            (flows + methods + tenant config)
AuthSessionController   /api/v1/auth/sessions         (start + execute + complete)
BiometricController     /api/v1/biometric             (enroll + verify + enrollments)
DeviceController        /api/v1/devices               (register + list + step-up)
OtpController           /api/v1/otp                   (generate + validate + TOTP + QR)
WebAuthnController      /api/v1/webauthn              (register + authenticate)
GuestController         /api/v1/guests                (invite + accept)
AuditController         /api/v1/audit                 (logs + search)
StatisticsController    /api/v1/statistics            (dashboard + metrics)
AdminController         /api/v1/admin                 (system admin operations)
```

---

### 1.4 HIGH — No Token Revocation on Logout

**What we have:**
```java
// LogoutUserService.java — revokes refresh token from DB
refreshTokenRepository.revokeByUserId(userId);
```

**The problem:** Access tokens (JWTs) are NOT revoked on logout. They remain valid until expiry (1 hour). If someone has a stolen access token, logout doesn't invalidate it.

**Fix:** On logout, add the access token's JTI (JWT ID) to a Redis blacklist with TTL = token expiry. The `JwtAuthenticationFilter` must check this blacklist on every request.

```java
// On logout:
String jti = jwtService.extractJti(accessToken);
cachePort.set("blacklist:" + jti, "1", Duration.ofHours(1));

// In JwtAuthenticationFilter:
if (cachePort.exists("blacklist:" + jti)) {
    return unauthorized();
}
```

---

### 1.5 HIGH — Multi-Tenancy Has No Database-Level Enforcement

**What we have:** Tenant isolation is enforced by a Java ThreadLocal (`TenantContext`) and Hibernate `@FilterDef`:
```java
// TenantContextFilter.java
TenantContext.setCurrentTenant(tenantId);

// Hibernate filter activates:
@Filter(name = "tenantFilter", condition = "tenant_id = :tenantId")
```

**The problem:** If the filter fails, is bypassed, or a developer forgets to set the context, queries return data from ALL tenants. There is NO safety net at the database level.

**Fix:** Add PostgreSQL Row-Level Security (RLS):
```sql
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON users
    USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
```

Set `SET app.current_tenant_id = '...'` per connection in the connection pool. This enforces isolation even if the Java filter fails.

---

### 1.6 HIGH — Schema Drift Between Migrations and Entities

The `tenants` table has columns from V1 (`subscription_plan`, `is_active`, `display_name`, `max_biometric_enrollments`) that are NOT mapped in the `Tenant` entity. Conversely, the entity has columns (`biometricEnabled`, `sessionTimeoutMinutes`, `mfaRequired`) that were added by V19 — months after the initial schema.

**Orphaned DB columns in `tenants` (mapped in DB, NOT in entity):**
- `subscription_plan`
- `is_active` (entity uses `status` enum instead)
- `display_name`
- `max_biometric_enrollments`
- `domain`
- `settings` (jsonb)
- `metadata` (jsonb)
- `deleted_at`

**Risk:** Any raw SQL query, reporting tool, or future migration touching these columns will not align with what the application expects.

**Fix:** V20 migration — either map them to the entity or drop them with a deprecation note.

---

### 1.7 MEDIUM — Redis Used for Four Different Purposes With No Separation

```
Redis is currently used for:
1. CachePort → general application cache (session data, OTP codes)
2. Rate limit buckets → Bucket4j integration
3. Event bus → pub/sub messaging to biometric-processor
4. Token blacklist → (needed but not implemented yet)
```

All four use the same Redis instance with no namespace separation beyond key prefixes. This creates:
- Risk of key collisions across purposes
- No independent TTL policies per use case
- Harder to troubleshoot (all keys mixed together)

**Fix (minimum):** Enforce key namespace prefixes rigorously:
```
cache:*        → application cache
ratelimit:*    → rate limiting
events:*       → pub/sub channels
blacklist:*    → token revocation
otp:*          → OTP codes
```

**Fix (ideal):** Use separate Redis databases (DB 0-3) or separate Redis instances per concern.

---

### 1.8 MEDIUM — JWT Validation Logic Is Scattered

JWT-related code exists in three places:
- `JwtService` — token generation and claim extraction
- `TokenGenerationAdapter` — wraps `JwtService`, implements `TokenGenerationPort`
- `JwtAuthenticationFilter` — validates tokens on every request

But some services call `JwtService` directly instead of going through `TokenGenerationPort`. This means if you change the JWT library, you must find all call sites.

**Fix:** Single rule — only `TokenGenerationAdapter` calls `JwtService`. Everything else injects `TokenGenerationPort`.

---

### 1.9 MEDIUM — The RedisMessagingConfig @PostConstruct Bug

```java
// RedisMessagingConfig.java — initializeEventBusSubscriptions()
RedisEventBus eventBus = redisEventBus(
    redisTemplate(redisConnectionFactory()),     // ← Creates NEW instances!
    redisMessageListenerContainer(redisConnectionFactory()),
    objectMapper()
);
```

This calls `@Bean` factory methods directly, creating NEW object instances that are NOT managed by Spring. The subscriptions are set on these unmanaged instances, not the application context beans. The catch block hides this error. The event bus subscriptions never actually work.

**Fix:**
```java
@Autowired private RedisEventBus redisEventBus;
@Autowired private BiometricEventListener biometricEventListener;

@PostConstruct
public void initializeEventBusSubscriptions() {
    redisEventBus.subscribe(CHANNEL_ENROLLMENT, biometricEventListener);
    // ...
}
```
The circular dependency can be resolved by using `@Lazy` on one injection, or by extracting initialization to an `ApplicationReadyEvent` listener.

---

### 1.10 MEDIUM — Application Services Have 41+ Classes, Many Are Too Thin

41 service classes for a single Spring Boot application is too many. Several services are wrappers that do nothing but delegate:
- `EnrollmentQueryService` — just queries the repository
- `GetStatisticsService` — one method, calls the repository
- `GuestLifecycleService` — scheduled cleanup, not a use case

**Fix:** Group related use cases into fewer, cohesive service classes. A `UserManagementService` can implement all user-related use cases. 15-20 service classes is the right range for this domain.

---

## 2. BIOMETRIC-PROCESSOR: ARCHITECTURAL PROBLEMS

The biometric-processor is **genuinely well-architected** (8.2/10). It has proper hexagonal architecture with clean layer separation. The domain layer imports NOTHING from FastAPI, SQLAlchemy, or DeepFace. Use cases depend on interfaces. Adapters implement those interfaces. This is correct.

The problems are **feature gaps and integration gaps**, not architectural violations.

### 2.1 CRITICAL — Fingerprint and Voice Are Permanent Stubs

```python
# fingerprint.py, lines 32-52
@router.post("/fingerprint/enroll")
async def enroll_fingerprint(request: FingerprintRequest) -> BiometricResponse:
    return BiometricResponse(
        success=False,      # ← ALWAYS FAILS
        message="Fingerprint biometric processing is not yet implemented...",
        confidence=0.0,
    )
```

Every call to `FingerprintAuthHandler` in identity-core-api fails silently. Users see "authentication failed" instead of "fingerprint not available."

**Fix options:**
- **Option A (correct):** Remove fingerprint/voice from all auth flows until implemented. Return `HTTP 501 Not Implemented` instead of a fake `success: false` response.
- **Option B (future):** Implement real fingerprint matching via SDK (e.g., libfprint for Linux, Apple's LocalAuthentication for iOS).

### 2.2 HIGH — Liveness Detection Is Also a Stub

```python
# liveness.py (line 47-48)
# Currently uses stub liveness detector.
# Will be updated in Sprint 3 with real smile/blink detection.
```

The `EnhancedLivenessDetector` (LBP + blink + smile) exists in infrastructure but is NOT wired to the liveness endpoint. The endpoint returns a placeholder `liveness_score: 1.0` for everything.

**Fix:** Route the `/liveness` endpoint to `EnhancedLivenessDetector` when `ANTI_SPOOFING_ENABLED=true`.

### 2.3 HIGH — Enrollment Synchronization Gap

When a user enrolls:
1. `identity-core-api` creates `user_enrollments` record (status: IN_PROGRESS)
2. `identity-core-api` calls `biometric-processor` → stores `face_embeddings`
3. `identity-core-api` updates `user_enrollments` status to ACTIVE

**The gap:** If step 3 fails (network error, crash), the embedding is stored in biometric-processor but identity-core-api thinks enrollment failed. Next enrollment attempt creates a duplicate embedding.

**Fix:** Implement idempotency key on enrollment:
```python
# biometric-processor enrollment endpoint
POST /api/v1/enroll
Body: { user_id, image, idempotency_key }
# If same idempotency_key arrives twice → return cached result, don't re-store
```

### 2.4 MEDIUM — No Circuit Breaker Between Services

If PostgreSQL (pgvector) is down, every biometric call fails with an unhandled database exception. There is no circuit breaker or fallback.

**Fix:** Add `tenacity` retry with exponential backoff for DB operations, and a circuit breaker state that returns `503 Service Unavailable` after N consecutive failures.

### 2.5 MEDIUM — Thread Pool Exhaustion Risk

ML operations (DeepFace) run in a thread pool. The pool size is `min(cpu_count, 8)`. If 8 concurrent requests arrive and each takes 2 seconds, the 9th request blocks the async event loop.

**Fix:** Add a semaphore around ML operations:
```python
ml_semaphore = asyncio.Semaphore(settings.ML_MAX_CONCURRENT)
async with ml_semaphore:
    result = await executor.run(deepface_operation)
```

---

## 3. WHAT SHOULD EACH COMPONENT OWN

### 3.1 identity-core-api (Identity Plane)

**Owns:**
- User identity (email, name, credentials, status)
- Tenant configuration (settings, limits, status)
- Authentication sessions (multi-step flow execution)
- Authorization (RBAC — roles, permissions)
- Token lifecycle (JWT issuance, refresh, revocation)
- Device registry (registered devices, step-up keys)
- Enrollment records (which methods a user has enrolled, status)
- Auth flow configuration (which steps, which order, per tenant)
- Audit trail (all security events)
- Multi-tenancy isolation

**Does NOT own:**
- Biometric embeddings (vectors)
- ML model outputs
- Liveness session state
- Image processing results

**Calls:**
- biometric-processor (for face/fingerprint/voice operations)
- Redis (for tokens, cache, OTP)
- SMTP (for email OTP, password reset)
- Twilio (for SMS OTP)

---

### 3.2 biometric-processor (Biometric Plane)

**Owns:**
- Face embeddings (pgvector storage)
- Enrollment data (images, quality scores)
- Liveness session state (Redis)
- ML model management (loading, caching)
- Anti-spoofing results

**Does NOT own:**
- User records
- Auth sessions
- JWT tokens
- Tenant configuration
- RBAC

**Receives calls from:**
- identity-core-api (only)

**Calls:**
- PostgreSQL + pgvector (own embedding tables)
- Redis (liveness session state, embedding cache)

---

### 3.3 What Is Missing — Components We Should Have

**Currently missing from the platform:**

#### A. Notification Service (MISSING)
Right now, email and SMS are handled inside identity-core-api as infrastructure adapters. This couples the identity domain to communication channels.

```
notification-service (NEW)
  → SMTP email (registration, OTP, password reset)
  → Twilio SMS (OTP)
  → Push notifications (mobile)
  → Webhook delivery
```

**For now:** Keep email/SMS in identity-core-api but behind ports. When ready to split, only adapters change.

#### B. API Gateway (EXISTS — NGINX, needs config improvement)
The NGINX gateway exists but routes everything to both services without:
- Request authentication at gateway level
- Rate limiting at gateway level
- Request routing by path prefix
- SSL termination

#### C. Observability Stack (EXISTS — config ready, not running)
Prometheus + Grafana configs exist in `monitoring/`. Should be running locally to catch performance issues.

#### D. Config Server / Secret Management (MISSING)
Secrets are passed as environment variables in docker-compose. For production this is acceptable, but there is no:
- Secret rotation mechanism
- Centralized config management
- Audit of secret access

---

## 4. TARGET CLEAN ARCHITECTURE

### 4.1 identity-core-api Target Structure

```
com.fivucsas.identity/
│
├── domain/                         ← PURE BUSINESS LOGIC (no framework imports)
│   ├── model/
│   │   ├── user/
│   │   │   ├── User.java           ← Aggregate root (NO @Entity here)
│   │   │   ├── Email.java          ← Value object ✅ exists
│   │   │   ├── HashedPassword.java ← Value object ✅ exists
│   │   │   └── UserId.java         ← Value object ✅ exists
│   │   ├── tenant/
│   │   │   ├── Tenant.java         ← Aggregate root (NO @Entity)
│   │   │   └── TenantId.java       ← Value object ✅ exists
│   │   └── auth/
│   │       ├── AuthSession.java    ← Domain object
│   │       ├── AuthFlow.java       ← Domain object
│   │       └── [enums]             ← ✅ exists
│   ├── repository/                 ← Outbound ports for persistence
│   │   ├── UserRepository.java     ← Interface (✅ exists, not fully used)
│   │   ├── TenantRepository.java
│   │   └── AuthSessionRepository.java
│   ├── event/                      ← Domain events (NEW — currently empty)
│   │   ├── UserRegistered.java
│   │   ├── UserAuthenticated.java
│   │   └── BiometricEnrolled.java
│   └── exception/                  ← Domain exceptions ✅ exists
│
├── application/                    ← ORCHESTRATION (depends only on domain)
│   ├── port/
│   │   ├── input/                  ← Use case interfaces (✅ 29 exist)
│   │   └── output/                 ← Infrastructure ports (✅ 8 exist)
│   │       ├── BiometricServicePort.java
│   │       ├── EmailServicePort.java
│   │       ├── CachePort.java
│   │       ├── AuditLogPort.java
│   │       └── EventPublisherPort.java
│   ├── service/                    ← Use case implementations (CONSOLIDATE from 41 → 15)
│   │   ├── AuthService.java        ← login, logout, register, verify
│   │   ├── UserService.java        ← user CRUD, settings, password
│   │   ├── TenantService.java      ← tenant CRUD, config
│   │   ├── RbacService.java        ← roles, permissions, assignments
│   │   ├── AuthFlowService.java    ← flow config, session execution
│   │   ├── BiometricService.java   ← enrollment, verification (calls port)
│   │   ├── DeviceService.java      ← device register, step-up
│   │   ├── SessionService.java     ← active sessions, revocation
│   │   ├── AuditService.java       ← audit log queries
│   │   └── StatisticsService.java  ← dashboard stats
│   └── dto/                        ← Request/Response DTOs (✅ partially exists)
│
├── infrastructure/                 ← ADAPTERS (depends on application + domain)
│   ├── persistence/
│   │   ├── entity/                 ← JPA entities (UserJpaEntity, TenantJpaEntity)
│   │   ├── repository/             ← Spring Data JPA repos
│   │   ├── adapter/                ← Implements domain.repository ports
│   │   │   ├── UserRepositoryAdapter.java   ← ✅ created this session
│   │   │   └── TenantRepositoryAdapter.java ← MISSING
│   │   └── mapper/                 ← Domain ↔ JPA mappers
│   ├── web/                        ← Controllers (HTTP driving adapters)
│   │   └── [15 controllers]        ← Consolidate from 27 → 15
│   ├── security/                   ← JWT, BCrypt, Spring Security config
│   ├── messaging/                  ← Redis pub/sub
│   ├── external/
│   │   ├── BiometricServiceAdapter.java  ← Calls biometric-processor
│   │   └── EmailServiceAdapter.java      ← ✅ created this session
│   └── cache/
│       └── RedisCacheAdapter.java  ← Implements CachePort
│
└── config/                         ← Spring @Configuration classes
```

### 4.2 biometric-processor Target Structure (Already Good)

The biometric-processor architecture is already correct. The only structural change needed:

```
app/
├── domain/          ← ✅ Pure, no framework imports
├── application/     ← ✅ Use cases depend on interfaces
├── api/             ← ✅ FastAPI routes, Pydantic schemas
└── infrastructure/  ← ✅ DeepFace, pgvector, Redis implementations
    └── ml/
        ├── face/        ← ✅ Working
        ├── liveness/    ← ⚠️ EXISTS but not wired to endpoint
        ├── fingerprint/ ← ❌ STUB — return 501 or implement
        └── voice/       ← ❌ STUB — return 501 or implement
```

---

## 5. INTER-SERVICE COMMUNICATION DESIGN

### Current (Synchronous HTTP Only)
```
identity-core-api  ──HTTP──>  biometric-processor
                   (sync, blocking, no retry, no circuit breaker)
```

### Target (Sync + Async Events)
```
identity-core-api  ──HTTP──>  biometric-processor
                              (sync for verify/enroll — need immediate result)

identity-core-api  ──Redis Pub/Sub──>  biometric-processor
                              (async for batch enrollment, model pre-load hints)

biometric-processor  ──Webhook──>  identity-core-api
                              (enrollment completion callback — fix the sync gap)
```

**Why keep sync HTTP for verification:** You need the result before issuing a JWT. You cannot be asynchronous here.

**Why async for enrollment:** Enrollment can take 2-5 seconds (image processing). The client does not need to wait — the enrollment can complete in the background and a webhook updates the status.

---

## 6. DATABASE OWNERSHIP AND SCHEMA DESIGN

### Rule: Each Service Owns Its Tables

```
PostgreSQL (shared instance, separate schemas)
│
├── schema: identity                    ← owned by identity-core-api
│   ├── tenants
│   ├── users
│   ├── roles, permissions, user_roles
│   ├── auth_flows, auth_flow_steps
│   ├── auth_sessions, auth_session_steps
│   ├── auth_methods, tenant_auth_methods
│   ├── user_devices, user_enrollments
│   ├── refresh_tokens
│   ├── audit_logs
│   ├── api_keys, rate_limit_buckets
│   ├── guest_invitations, user_settings
│   ├── password_history, webauthn_credentials
│   └── active_sessions
│
└── schema: biometric                   ← owned by biometric-processor
    ├── face_embeddings (pgvector)
    ├── proctor_sessions
    ├── proctor_incidents
    └── api_keys (biometric service keys — separate from identity keys)
```

**Why separate schemas matter:** Right now both services use the `public` schema. This makes it possible (and tempting) for identity-core-api to directly query face_embeddings, bypassing the biometric service API. Schema separation enforces the service boundary even at the database level.

### Tables That Need Cleanup (V20 Migration)

**In `tenants` table — orphaned columns not mapped in entity:**
```sql
-- These exist in DB but have NO corresponding Java field:
subscription_plan        VARCHAR(50)    -- NOT in Tenant entity
is_active                BOOLEAN        -- entity uses 'status' enum instead
display_name             VARCHAR(255)   -- NOT in Tenant entity
max_biometric_enrollments INTEGER       -- NOT in Tenant entity
domain                   VARCHAR(255)   -- NOT in Tenant entity
settings                 JSONB          -- NOT in Tenant entity
metadata                 JSONB          -- NOT in Tenant entity
deleted_at               TIMESTAMP      -- NOT in Tenant entity (no soft delete!)
```

**Decision needed:** Either add these back to the entity or drop them. Pick one.

### Missing Database-Level Protections

```sql
-- 1. Row-Level Security for tenant isolation
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_users ON users
    USING (tenant_id = current_setting('app.tenant_id', true)::uuid
           OR current_setting('app.tenant_id', true) = 'system');

-- 2. Indexes missing on high-cardinality FK columns
CREATE INDEX idx_auth_sessions_user_id ON auth_sessions(user_id);
CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_user_enrollments_user_method ON user_enrollments(user_id, auth_method_type);

-- 3. Soft delete consistency — add deleted_at to tables that support it
ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
ALTER TABLE permissions ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
```

---

## 7. PRIORITY FIX LIST

### P0 — Breaking / Data Integrity

| # | Problem | File | Fix |
|---|---------|------|-----|
| 1 | Fingerprint/Voice stubs return fake success:false — auth flows silently fail | `biometric-processor/app/api/routes/fingerprint.py` | Return `HTTP 501` or disable in auth flow config |
| 2 | Enrollment sync gap — duplicate embeddings possible | `biometric-processor` + `identity-core-api` | Add idempotency key to enrollment endpoint |
| 3 | @PostConstruct in RedisMessagingConfig creates unmanaged beans — event subscriptions never fire | `RedisMessagingConfig.java:226` | Use @Autowired fields + @Lazy |

### P1 — Architecture Violations

| # | Problem | Fix |
|---|---------|-----|
| 4 | Services inject JPA repos directly, bypass domain ports | Replace all `com.fivucsas.identity.repository.*` imports in services with domain ports |
| 5 | UserController in-memory pagination | Add `Pageable` to `UserRepository.findAll()` |
| 6 | JWT access tokens not revoked on logout | Add JTI blacklist in Redis, check in `JwtAuthenticationFilter` |
| 7 | No DB-level tenant isolation (RLS) | Add PostgreSQL RLS policies (V20 migration) |
| 8 | Schema drift — orphaned tenant columns | V20 migration: decide map or drop |

### P2 — Code Quality / Maintainability

| # | Problem | Fix |
|---|---------|-----|
| 9 | 27 controllers → consolidate to 15 | Merge QrCode, Enrollment, AuthBiometric |
| 10 | Domain model split across `entity/` and `domain/model/` | Create domain aggregates in `domain/model/`, JPA entities in `infrastructure/persistence/entity/` |
| 11 | Infrastructure services injected in application services | Create ports for OtpService, replace direct injection |
| 12 | JWT logic in three places | Single rule: only `TokenGenerationAdapter` calls `JwtService` |
| 13 | Liveness detection stub not wired | Wire `/liveness` to `EnhancedLivenessDetector` |

### P3 — Production Readiness

| # | Problem | Fix |
|---|---------|-----|
| 14 | No circuit breaker on biometric-processor calls | Add resilience4j to `BiometricServiceAdapter` |
| 15 | Redis key namespace collisions possible | Enforce `cache:`, `ratelimit:`, `blacklist:`, `otp:` prefixes |
| 16 | Thread pool exhaustion in biometric-processor | Add `asyncio.Semaphore(ML_MAX_CONCURRENT)` |
| 17 | No distributed tracing | Propagate `X-Correlation-ID` header through both services |
| 18 | Monitoring not running | Start Prometheus + Grafana with docker-compose |

---

## 8. WHAT A PROFESSIONAL VERSION OF THIS PLATFORM LOOKS LIKE

```
Client (Web / Mobile / Desktop)
    │
    ▼
API Gateway (NGINX / Kong)
    ├── /api/v1/auth/*        → identity-core-api
    ├── /api/v1/users/*       → identity-core-api
    ├── /api/v1/biometric/*   → identity-core-api (which internally calls biometric-processor)
    └── [rate limiting, JWT validation, TLS termination at gateway]
    │
    ├─────────────────────────┐
    ▼                         ▼
identity-core-api         biometric-processor
(Spring Boot / Java 21)   (FastAPI / Python 3.11)
    │                         │
    ├── PostgreSQL             ├── PostgreSQL
    │   schema: identity       │   schema: biometric
    │                         │
    ├── Redis (identity DB 0)  ├── Redis (biometric DB 1)
    │   cache, OTP, tokens     │   liveness sessions, embedding cache
    │
    └── Event Bus (Redis Streams or Kafka)
            ├── enrollment.completed → updates user_enrollments
            ├── verification.completed → updates audit_log
            └── user.created → triggers welcome email
    │
    ▼
Notification Service (future)
    ├── SMTP (email)
    ├── Twilio (SMS)
    └── FCM/APNs (push)
    │
    ▼
Observability
    ├── Prometheus (metrics from both services)
    ├── Grafana (dashboards)
    └── Loki/ELK (logs with correlation IDs)
```

**What makes this professional:**
1. Services own their own data (no shared tables)
2. Communication is via well-defined APIs + async events (not shared DB)
3. Identity plane handles WHO you are; Biometric plane handles WHAT you look like
4. Gateway handles cross-cutting concerns (rate limit, TLS, auth)
5. Notification is a separate concern, not embedded in identity logic
6. Every action has a correlation ID traceable across all services

---

## 9. RECOMMENDED REFACTORING ORDER

This is a **running platform** — refactoring must not break working features. Do these in order:

```
Week 1 — Fix P0 (breaking)
  □ Return 501 from fingerprint/voice stubs
  □ Add idempotency key to enrollment
  □ Fix RedisMessagingConfig @PostConstruct

Week 2 — Fix pagination + JWT revocation
  □ Replace UserController in-memory pagination with DB Pageable
  □ Add JTI blacklist to logout flow
  □ Add missing DB indexes (V20 migration)

Week 3 — Service layer cleanup
  □ Replace all JPA repo direct injections with domain port injections
  □ Create TenantRepositoryAdapter (mirrors UserRepositoryAdapter)
  □ Create OTP port to remove OtpService from application layer

Week 4 — Controller consolidation
  □ Merge QrCodeController + QrSessionController
  □ Merge EnrollmentController + EnrollmentManagementController
  □ Remove business logic from UserController

Week 5 — DB hardening
  □ V20 migration: schema drift cleanup + RLS policies
  □ Separate Redis key namespaces
  □ Wire biometric-processor liveness to EnhancedLivenessDetector

Week 6+ — Domain model restructure (highest effort, highest architectural value)
  □ Create pure domain aggregates in domain/model/
  □ Create JPA entities in infrastructure/persistence/entity/
  □ Create mappers
  □ Update all services to use domain objects
```

---

*This document is the architectural source of truth. Update after each refactoring sprint.*
