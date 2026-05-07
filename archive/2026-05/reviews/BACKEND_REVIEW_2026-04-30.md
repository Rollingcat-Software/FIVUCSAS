# FIVUCSAS Backend Review — 2026-04-30

**Reviewer:** Senior Backend Engineer (acting).
**Scope:** `identity-core-api` (Spring Boot / Java 21) and `biometric-processor`
(FastAPI / Python 3.12). Read-only. The Product Owner and Chief Engineer
reviews are sibling documents — this review intentionally avoids
duplicating system-level architecture/ops content and focuses on the
backend craft layer: per-endpoint correctness, transaction boundaries,
JPA footguns, validation rigor, error handling, ML pipeline correctness,
and test quality.

---

## 1. Executive Summary

- **Maturity grade per service**: `identity-core-api` **B+** for code, **B**
  for test discipline; `biometric-processor` **B** for code (modular, well
  laid-out), **C+** for correctness because the fingerprint modality is a
  SHA-256 placeholder still wired into routes that return 501 yet the
  full embed/centroid stack is also kept in the tree
  (`biometric-processor/app/infrastructure/ml/fingerprint/hash_embedder.py:24`).
- **Top 3 backend craft strengths**:
  1. **Hexagonal port-and-adapter discipline.** Clean split of
     `domain/`, `application/port/`, `application/service/`,
     `infrastructure/adapter/`. The audit-log writer is a textbook
     example: `AuditLogPort` (output port), `AuditLogAdapter` (adapter)
     using `Propagation.REQUIRES_NEW` so audit rows survive the
     business transaction's rollback
     (`identity-core-api/src/main/java/com/fivucsas/identity/infrastructure/adapter/AuditLogAdapter.java:38-94`).
  2. **Pessimistic locking on the MFA hot path.** `@Transactional` +
     `findBySessionTokenForUpdate(...)` on `/auth/mfa/step` closes the
     "two parallel correct OTPs both increment currentStep" race
     (`AuthController.java:597-624`). This is exactly the locking call
     most teams forget until they see double-MFA-credit in prod.
  3. **Refresh-token rotation with family-revocation.** RFC 6749 §10.4 +
     OAuth 2.0 Security BCP §4.13 implemented with reuse-detection
     (`RefreshTokenService.java:75-94`, `V50__refresh_tokens_family_id.sql`).
     One presented-but-revoked token kills the entire descendant family.
- **Top 3 backend craft risks**:
  1. **`JwtAuthenticationFilter` does a synchronous DB hit per
     authenticated request.** `userDetailsService.loadUserByUsername`
     joins `users` + `user_roles` + `roles` + `permissions` on every
     request that carries a Bearer token
     (`JwtAuthenticationFilter.java:76`,
     `CustomUserDetailsService.java:47-83`). At ~500 RPS authenticated
     traffic this is the largest single performance gap; no caching
     layer exists.
  2. **Unit tests run with `@AutoConfigureMockMvc(addFilters = false)`.**
     `AuthControllerTest`, `BiometricControllerTest`, `OAuth2ControllerTest`
     all bypass the `SecurityFilterChain`
     (`AuthControllerTest.java:82`, `BiometricControllerTest.java:46`,
     `OAuth2ControllerTest.java:47`). PR-1's anonymous-OAuth-leak class
     of bug (memory feedback rule) cannot be caught here.
  3. **Fingerprint modality is a 256-dim SHA-256 hash, not a biometric.**
     The route file returns 501 to all callers
     (`biometric-processor/app/api/routes/fingerprint.py:39-57`) but the
     `FingerprintHashEmbedder` is still in tree, deployable, and the
     web-app advertises "fingerprint" in the auth method picker. The
     CLAUDE.md says "Fingerprint: enroll, verify, delete — SHA-256
     hash-based 256-dim embeddings" — a security-correctness time bomb
     if anyone re-wires the routes.
- **Test ratio (file-level)**: 92 test files / 468 production files in
  identity-core-api (~20 %); 60 `test_*.py` / 434 production files in
  biometric-processor (~14 %). Good Testcontainers usage in 3+
  integration suites
  (`AuthenticationFlowIntegrationTest.java:42-55`,
  `UserApiIntegrationTest.java:22-35`,
  `OAuth2PublicEndpointsSecurityIntegrationTest.java:42-48`).
  Coverage is not gated.
- **Memory cross-checks**:
  - V50 refresh-token family revocation — **CONFIRMED in code**
    (`V50__refresh_tokens_family_id.sql`, `RefreshTokenService.java:75`).
  - V42 TOTP strict CHECK constraint — **CONFIRMED**
    (`V42__totp_secret_check_encrypted.sql:22-27`).
  - V49 tenants soft-delete + index — **CONFIRMED**
    (`Tenant.java:41-42`, `V49__tenants_deleted_at.sql:27-29`).
  - "Embedding encryption staged" — **FALSE in code** (CE was right). Zero
    matches for `encrypt|fernet|AESGCM|cipher` under
    `biometric-processor/app/infrastructure/persistence/`. The
    pgvector embedding table holds plaintext float arrays.
  - `findByEmail` soft-delete patch — **CONFIRMED**
    (`UserRepository.java:29-30`).

---

## 2. identity-core-api: Module Map

Hexagonal monolith. Aggregates: **User** (`User`, `UserRole`,
`UserDevice`, `UserEnrollment`, `Role`, `Permission`, `PasswordHistory`);
**Tenant** (`Tenant`, `TenantAuthMethod`, `TenantEmailDomain` — soft-
deleted via `@SQLDelete`/`@SQLRestriction`, `Tenant.java:41-42`);
**Auth-flow** (`AuthFlow`, `AuthFlowStep`, `AuthMethod`, `AuthSession`,
`MfaSession` — N-step MFA state-machine); **OAuth2/OIDC** (`OAuth2Client`,
`OAuth2Service` + Redis auth-code store); **Biometric** metadata
(`WebAuthnCredential`, `NfcCard`, `VerificationSession`, `VerificationDocument`,
embeddings live in biometric-processor's separate DB); **Audit/governance**
(`AuditLog` range-partitioned per V40, `RateLimitBucket`, `RefreshToken`,
`ApiKey`).

### Call graph for the 5 most critical endpoints

1. **`POST /auth/login`** — `AuthController:132 → AuthenticateUserService.execute (@Tx)
   → UserRepository.findByEmail (soft-delete-aware) → PasswordEncoderPort.matches
   → OAuth2ClientRepositoryPort.findByClientId (tenant-lock)
   → EnrollmentHealthService.validateEnrollments (@Tx, lazy-revokes stale)
   → AuthFlowRepositoryPort.findByTenant... → MfaSessionRepository.save
   OR RefreshTokenService.createRefreshToken → TokenGenerationPort.generateAccessToken`,
   one outer Tx (`AuthenticateUserService.java:62`).
2. **`POST /auth/mfa/step` (challenge)** — `AuthController:597 → @Tx →
   findBySessionTokenForUpdate (SELECT FOR UPDATE) → UserRepository.findById →
   method-specific verifier (TotpService, SmsService, BiometricServicePort,
   WebAuthnService) → MfaSession.markMethodComplete → on last step mints JWT+RT`.
3. **`POST /auth/mfa/step` (final)** — same path then `mfaSessionRepository.markConsumed`
   (V35 atomic guard) → JWT + RT in same Tx.
4. **`POST /enrollments`** — `EnrollmentController → EnrollBiometricService (@Tx) →
   BiometricServicePort.enroll (blocking HTTP to biometric-processor) →
   UserEnrollmentRepository.save (V47 quality_score/liveness_score) →
   AuditLogPort.logBiometricEnrollment (REQUIRES_NEW)`.
5. **`POST /oauth2/token`** — `OAuth2Controller → OAuth2Service.exchangeCodeForToken →
   Redis GET oauth2:code:<code> + DEL → PKCE code_verifier (RFC 7636) →
   JwtService.generateAccessToken + OIDC ID-token claims →
   RefreshTokenService.createRefreshToken (fresh family)`.

The `OAuth2Service` is **not** annotated `@Transactional` at class
level (`OAuth2Service.java:46` — class has no `@Transactional`); none of
its methods carry it either. Code-exchange is mostly Redis-bound so
this is *probably* fine, but the userinfo/PKCE failure paths emit
audit events through `AuditLogPort` and any future
`refreshTokenService.createRefreshToken` call from inside
`exchangeCodeForToken` will run in its own Tx — flag it.

---

## 3. Transaction & Concurrency Discipline

The service has **124** `@Transactional` annotations across services and
adapters and only **3** `@Async` annotations (the audit aspect, the SMTP
sender, and the executor enabler).

### Specific issues with `path:line`

1. **`AuthenticateUserService.java:62`** — outer `@Transactional` wraps
   the entire login (failed-attempt counter, lockout, MFA-session,
   JWT mint). Mitigated only because `AuditLogAdapter` uses
   `REQUIRES_NEW` — implicit seam, not enforced. A refactor dropping
   `REQUIRES_NEW` would silently lose audit on failure.

2. **`AuthController.java:597-598`** — `@Transactional` on a controller
   method. Smell: pairs with `findBySessionTokenForUpdate`. Move the
   locking+verification block into a `VerifyMfaStepService`. The
   controller method is **740 lines** (597 → 1093), largest
   transactional unit in the codebase.

3. **`EnrollmentHealthService.java:81`** — `@Transactional` on
   `validateEnrollments`, called from inside `AuthenticateUserService.execute`
   (already in Tx). Default `REQUIRED` joins the outer Tx; if the parent
   rolls back, the stale-enrollment auto-revoke is also reverted. Use
   `REQUIRES_NEW`.

4. **`OAuth2Service.java`** — **no `@Transactional` anywhere**. Code
   exchange does 5 JPA reads + Redis ops outside any Tx, so each query
   opens its own implicit Tx. Add class-level
   `@Transactional(readOnly = true)`.

5. **`RefreshTokenService.java:69-94`** — **correctness bug**:
   `verifyExpiration` calls `revokeFamily(...)` and throws
   `TokenRevokedException` in the same Tx. Spring rolls back on
   `RuntimeException`, **including the family-revoke**. The family is
   never actually revoked — V50 is defeated. Fix: mark
   `revokeFamily(...)` `Propagation.REQUIRES_NEW` OR
   `@Transactional(noRollbackFor = TokenRevokedException.class)`.

6. **`AuditLoggingAspect.java:50`** — `@Async` on a **private** method
   called via `this.logAuditEvent(...)` from another method in the same
   class. Proxy is bypassed → `@Async` is a **no-op**, audit save
   runs synchronously on the request thread. Make public or extract
   to a separate component.

7. **`AsyncConfig.java:1-13`** — `@EnableAsync` without a custom
   `TaskExecutor` bean. Spring falls back to `SimpleAsyncTaskExecutor`
   (unbounded threads). Define a bounded `ThreadPoolTaskExecutor`.

8. **`SoftDeletePurgeJob.java:126`** — `REQUIRES_NEW` correct, but no
   ShedLock. Two replicas running the same scheduled job race.

### Async / executor

`@EnableAsync` is enabled but no `TaskExecutor` bean is provided. The
default `SimpleAsyncTaskExecutor` is NOT a thread pool — every
invocation creates a new thread. Combined with the no-op
`@Async` from the aspect (issue #6 above), the only place async
actually runs is `SmtpEmailService` (`@Async` on a `public` method,
proxy-invoked from outside). With unbounded threads this is a latent
DoS-amplifier under SMTP outage.

---

## 4. JPA / Hibernate Footguns

### N+1 queries

- **`User.userRoles → role → permissions`** is `LAZY` in three places
  (`User.java:220-222`, `Role.java:55`). The
  `CustomUserDetailsService.loadUserByUsername` flow at
  `CustomUserDetailsService.java:105-122` calls
  `userRoleRepository.findActiveUserRolesWithPermissions(userId,
  Instant.now())` which **does** appear to fetch with a join (good),
  but iterating `role.getPermissions()` in the loop at line 118 will
  trigger one SELECT per role unless the repo query
  `JOIN FETCH r.permissions` is in place. **Open the repo to verify**
  — `UserRoleRepository.findActiveUserRolesWithPermissions` is a
  named query; if it isn't `JOIN FETCH role.permissions`, the inner
  loop is N+1 once per request. Mitigation: `@EntityGraph` on the
  query (the same pattern is already used in
  `UserRepository.findAllWithRoles` at `UserRepository.java:104-110`).
- **`AuthFlow.steps → availableMethods` is `EAGER`**
  (`AuthFlowStep.java:45 — @ManyToMany(fetch = FetchType.EAGER)`).
  This is the **correct trade-off** here (a flow's steps are always
  needed when the flow is loaded), but it forces a JOIN every time
  even when the caller only wants flow metadata. For the admin "list
  flows" endpoint this materialises every step + every available
  method — a single tenant with 5 flows × 4 steps × 5 methods = 100
  rows per list. Acceptable now, will hurt at >1k flows.

### Lazy-loading on detached entities

- `UserResponseMapper.toResponse(user)` (referenced at
  `AuthenticateUserService.java:170`) is called **after** the
  surrounding service Tx commits. If the mapper accesses
  `user.getEnrollments()` or `user.getDevices()` outside the Tx, you
  get `LazyInitializationException`. The mapper isn't shown here but
  this is the classic detachment trap. Audit
  `UserResponseMapper.java` and confirm it touches only fields
  initialised inside the Tx.

### `@OneToMany` without pagination

- **`User.userRoles: Set<UserRole>`** with `cascade = CascadeType.ALL,
  orphanRemoval = true` (`User.java:220`). Fine for typical 1-10 roles
  per user. But ROOT users that accumulate role grants over years are
  unbounded. No `@BatchSize` annotation either — when 50 users are
  loaded, that's 50 × N role-fetches.
- **`Tenant.users` and `Tenant.roles`** (`Tenant.java:113, 117`) are
  `@OneToMany` cascade-ALL with no `@BatchSize`. Loading a tenant
  with 100k users via `tenant.getUsers()` is a footgun waiting for the
  first ill-considered admin endpoint. **Add `@BatchSize(size = 50)`
  or kill the back-reference; query users by tenantId via the
  repository.**

### `equals` / `hashCode` on entities

- **None of the entities I read define `equals`/`hashCode` explicitly**
  (`User`, `Tenant`, `RefreshToken`, `MfaSession`, `AuthFlow`).
  Lombok `@Builder` doesn't generate them either. With JPA's identity
  semantics this means two reads of the same row return entities that
  pass `==` only if both come from the persistence context (1st-level
  cache). Once detached (e.g. across `@Transactional` boundaries),
  `Set<User>` and `HashMap<User,…>` lookups misbehave silently.
  **Add explicit `equals`/`hashCode` based on the immutable `id`
  field** — this is the most under-rated correctness fix in JPA.

### FK-cascade hazards (memory cross-check)

The 2026-04-28 incident wiped a user's TOTP/WebAuthn/NFC because
13 child tables cascade on `users`. Verified:

- `findByEmail` patched to filter `deletedAt IS NULL`
  (`UserRepository.java:29-30, 32-33`). ✅
- `Tenant` has `@SQLDelete` + `@SQLRestriction` for soft delete
  (`Tenant.java:41-42`). ✅
- `User` does **NOT** have `@SQLDelete` / `@SQLRestriction` — the
  soft-delete contract is enforced only by `findByEmail` filtering
  and the explicit `softDelete()` business method
  (`User.java:487-491`). A direct `userRepository.delete(u)` call
  still hard-deletes the row and cascades. **Recommend** adding
  `@SQLDelete("UPDATE users SET deleted_at = NOW() WHERE id = ?")`
  on `User` for parity with `Tenant`.
- DB-level **trigger** to forbid `DELETE FROM users` is missing.
  Belt-and-suspenders — add a `BEFORE DELETE` trigger that
  `RAISE EXCEPTION` so a careless DBA can't bypass the contract.

### Native vs JPQL

`UserRepository` uses pure JPQL with `@Query`. No `@Query(nativeQuery=true)`
in the file. Healthy. Pgvector queries live in biometric-processor
where they're justified.

---

## 5. Validation & Input Hygiene

- **Controller `@Valid` coverage is partial** — 31 occurrences across
  23 controllers. `AuthController.register` and `.login` use
  `@Valid @RequestBody` (✅), but `AuthController.verifyMfaStep`
  receives `Map<String, Object> request` and parses fields manually
  with null-checks (`AuthController.java:600-613`). This is a **DTO
  bypass**: there is no Bean Validation, no `@NotBlank`, no max-size
  constraints. A 50 MB JSON body would be parsed and processed
  before the manual `if (sessionToken == null)` ever runs. Replace
  with `@Valid VerifyMfaStepRequest` carrying `@NotBlank
  sessionToken`, `@NotBlank @Pattern(regexp = "^[A-Z_]{1,32}$") method`,
  and a typed `data` payload per method.

- **`MfaSession.stepsData`** stores JSON as `String` and is parsed
  ad-hoc on read. Should be `@Type(JsonType.class)` (Hibernate Types)
  or jackson-converted in the entity for type-safety.

- **No regex DoS guard** on `RegisterRequest.email`, `password`, etc.
  Bean Validation `@Email` is regex-based; modern Hibernate Validator
  does NOT use catastrophic backtracking, but the combo with a
  permissive client-supplied `userAgent` (logged unbounded) is a
  diagnostic-log DoS.

- **File upload limits**: `application-prod.yml:10-11` sets
  `multipart.max-file-size: 10MB` / `max-request-size: 15MB`. Good.
  Mirrored in biometric-processor (`MAX_UPLOAD_SIZE: 10485760`,
  `docker-compose.prod.yml:86`).

- **`RegisterRequest.idNumber`** is bound to `String idNumber` with
  `@Column(unique = true, length = 11)` (`User.java:71-73`). 11 chars
  is the TC Kimlik length, but Bean Validation on the request DTO
  isn't shown — verify the request DTO carries
  `@Pattern(regexp = "^\\d{11}$")` so non-numeric inputs are rejected
  before they hit the DB.

- **`userAgent` and `ipAddress` fields** are passed straight into audit
  logs from `request.getHeader("User-Agent")` (no length cap) and from
  `X-Forwarded-For`'s first segment (no IP-format validation). A 64KB
  User-Agent header lands in the DB row and the log line.

---

## 6. Authn / Authz at Code Level

### `@PreAuthorize` audit (10-controller spot-check)

- `UserController.java:88-251` — every endpoint guarded;
  `@rbac.hasPermission(...)` + `isCurrentUser(#id)` self-access. ✅
- `TenantController.java:43-178` — guarded; ROOT-only writes. ✅
- `AuditLogController.java:51-190` — `@rbac.isTenantAdmin() or
  hasAuthority('audit:read')`. ✅
- `AuthController` — zero `@PreAuthorize`. Login/register/refresh/MFA
  intentionally public; `/me`+`/logout` via `.authenticated()`
  (`SecurityConfig.java:151-154`). Other 2FA + verification endpoints
  fall under the catch-all `requestMatchers("/api/v1/**").authenticated()`
  (`SecurityConfig.java:158`). Functional but means controller manually
  reads `Authentication` — a smell at this file size.
- `StepUpController.java:33-58` — no `@PreAuthorize`, but each method
  calls `rbacService.getCurrentUser().orElseThrow(UnauthorizedException)`
  (lines 36-37, 47-48, 56-57). JWT required via the catch-all. CE
  flagged this; **no actual authz gap**, just per-method check is in
  the service, not the controller.
- `OAuth2Controller`, `OpenIDConfigController` — public per spec. ✅
- `StatisticsController.java:1-3` — empty stub. CE flagged as authz
  gap; **verified empty**. Delete file.
- `BiometricController`, `EnrollmentController` — guarded with mix of
  `@rbac.hasPermission` + `isCurrentUser`. ✅

### JWT verification path

- `JwtAuthenticationFilter.java:35-100` — fail-closed on Redis blacklist
  unavailable (lines 64-74). Good.
- `JwtService.java:69-95` — `@PostConstruct` asserts prod profile uses
  RS256. Good.
- `JwtService.java:192-215` — kid-routed key locator, rejects unknown
  kids with `SignatureException`. Good. Backward-compat with legacy
  `null kid` tokens (line 201-203) — make sure this gets removed
  after a soak window; right now any HS256 token with no kid passes.
- **`isTokenValid(token, email)` only checks email-equality and
  expiration** (`JwtService.java:155-158`). It does NOT validate
  `iss` or `aud` claims. For prod, the issuer is `api.fivucsas.com`;
  a token minted by some other RS256 issuer that happens to share
  the same kid (extremely unlikely but defensive) would pass. Add
  issuer/audience checks at parse-time using the JJWT
  `requireIssuer`/`requireAudience` builder helpers.

### Refresh-token rotation — the bug

**See §3 issue #5.** The family-revoke is correct in spirit but
buggy in execution: `verifyExpiration` does the revoke and throws
`TokenRevokedException` in the same transaction. Spring rolls back
the same Tx that did the revoke. Net effect: the family is NOT
revoked. **High-severity, behavioral bug. Recommend fixing
immediately.**

### TOTP strict mode (V42)

`TotpSecretAttributeConverter` (referenced at `User.java:167`) +
V42 CHECK constraint (`V42__totp_secret_check_encrypted.sql:22-27`)
ensure no plaintext TOTP secret can be persisted. Good.

### WebAuthn ceremony

`AuthController.java:649-677` runs the WebAuthn challenge inline. The
`allowCredentials` filter by transport (lines 656-666) is correct
for the platform/hardware split. The challenge is stored via
`webAuthnService.generateChallenge(mfaSession.getId())` and verified
later via `WebAuthnService`. I did not deep-read the verifier — the
yubico library handles the signature math, but verify the
`origin` and `rpId` are pinned to `*.fivucsas.com` (CORS allows
`api`, `app`, `demo`, `verify` per `application-prod.yml:57`).

### NFC

`NfcController` (referenced from grep) auto-creates user_enrollments
on enroll, reactivates inactive cards on re-enroll. Server-side
cardSerial persistence required before `startEnrollment` flips to
ENROLLED (per `EnrollmentHealthService.AUTO_COMPLETE_TYPES` comment
at `EnrollmentHealthService.java:44-64`).

---

## 7. Error Handling & Logging

### `@ControllerAdvice`

`GlobalExceptionHandler.java` covers 17+ exception types with
explicit handlers. Notable strengths:

- `RateLimitExceededException` re-attaches `Retry-After` from the
  exception payload (`GlobalExceptionHandler.java:281`) because the
  ResponseEntity build path otherwise overwrites it. ✅
- `ConstraintViolationException` handled cleanly (`:347`), closes the
  500-leak the audit edge identified.
- `NeedsEnrollmentException` returns a **bespoke JSON body** carrying
  `method` + `enrollmentUrl` (`:149-166`). The frontend depends on
  these fields. This breaks the standard `ErrorResponse` envelope
  and any client expecting it. Consider extending `ErrorResponse`
  with optional details rather than a one-off Map.

### Swallowed exceptions

- `AuthenticateUserService.java:114-119` — `catch (Exception e)` on the
  tenant-lock check, logs as `warn` and continues. Means a thrown
  `JpaSystemException` from a busted DB is silently treated as
  "no tenant lock" and the login proceeds. Should narrow the catch to
  the expected exception types.
- `AuthenticateUserService.java:155-157` — same pattern for OAuth
  client-name lookup. Same risk.
- `AuthenticateUserService.java:250-252` — `catch (Exception e)`
  around the entire MFA-flow check. Comment says "log and continue
  with single-factor login" — that's a **fail-OPEN to single-factor**
  on any unrelated DB hiccup. Risky for a system that promises MFA.
  Tighten to `DataAccessException` only; rethrow others.
- `AuthController.java:720-723` (current-step lookup for reuse check)
  — `catch (Exception e)` falls back to "strict" behavior (empty
  set), which is the safe direction. ✅
- `AuditLoggingAspect.java:79-82` — broad catch in audit-write path
  is correct (audit failure must not break business logic), but
  paired with the `@Async` no-op (§3 issue 6) means failures happen
  on the request thread. Once `@Async` is fixed properly, the
  swallow is fine.
- `BiometricProcessorClient.java:152-154` — broad catch, returns
  `None`. For the auth path this means the API key middleware
  returns 401 on any DB error during key lookup. Fail-closed,
  reasonable.

### PII in logs

- `AuthenticateUserService.java:64,77,127,135,146` — every login
  attempt logs the **email** at INFO. KVKK/GDPR-wise that's
  arguable but defensible because audit logs are sealed. The
  `userAgent` is logged verbatim, no truncation.
- `JwtService.java:151` — logs only "Generated JWT token for user:
  {email} (alg=...)". Never logs the token. ✅
- `EnrollmentHealthService.java:104-105` — logs raw enrollment
  method type, no PII concern.

### Correlation / trace IDs

- I see no `MDC.put("requestId", ...)` filter in the chain. There is
  an `AntiReplayFilter` (`config/`), and an
  `AuditLoggingAspect`, but no request-correlation MDC. **Add
  one** — without it, distributed tracing across api +
  biometric-processor is impossible. The biometric-processor uses
  `structlog` with structured-logging support; it would consume an
  X-Request-Id header today if the Java side set it.

### Log levels

- Root `com.fivucsas: INFO` in prod (`application-prod.yml:87`).
  Reasonable. Hibernate WARN. ✅
- Some `log.error` are used for **expected** failures
  (`AuditLoggingAspect.java:81`, `JwtAuthenticationFilter.java:94`).
  These should be WARN — error-level alerts for routine 401s create
  noise.

---

## 8. Data Layer Performance

### Index coverage on hot queries

- `users.email` is `unique = true, length = 255` (`User.java:56`).
  PostgreSQL auto-creates a unique B-tree. The
  `@Index(name = "idx_users_tenant_id", columnList = "tenant_id")`
  at `User.java:38` covers tenant filtering. ✅
- `findByEmail` filters by `email` AND `deletedAt IS NULL`
  (`UserRepository.java:29`). The unique index on `email` is fine for
  exact match; PG will short-circuit the deletedAt check. No
  partial index on `(email) WHERE deletedAt IS NULL` because the
  expected hit-rate of soft-deleted rows is very low.
- `refresh_tokens.family_id` indexed in V50
  (`V50__refresh_tokens_family_id.sql:37-38`). ✅
- `tenants.deleted_at` partial index covering the inverse
  (`V49__tenants_deleted_at.sql:27-29`). ✅

### pgvector index parameters

Not in identity-core-api. Embedding indexes live in biometric-processor's
DB. `face_embeddings` uses `<=>` cosine search on a vector column;
HNSW vs IVFFlat parameters not visible from this scan — recommend
verifying `m`, `ef_construction`, `ef_search` are tuned for the
~10k-row scale (likely OK at this size, will need re-tuning at 1M+).

### Partitioning (V40)

`audit_logs` range-partitioned monthly by `created_at`
(`V40__partition_audit_logs.sql:1-35`). Operator-applied during a
maintenance window (NOT auto-run in CI). Partition cutover well-
documented; the migration safely renames the legacy table to
`audit_logs_legacy` and ATTACHes it as a historical partition.
**Maintenance gap**: V41 only pre-creates partitions through
2026-07. After 2026-07-01 the application will emit
`no partition of relation audit_logs found for row` errors at INSERT
time. Either schedule a recurring partition-maintenance job
(pg_cron, pg_partman) or add a startup-time check that pre-creates
the next 2 months.

### Connection pool

HikariCP `maximum-pool-size: 20`, `minimum-idle: 5`
(`application-prod.yml:21-22`). Two API instances × 20 = 40
connections. Postgres max likely 100-200. Headroom is fine **at
two-replica scale**; will need PgBouncer once horizontal-scaled.

### Statement timeouts

I did not see a `statement_timeout` configured at JDBC URL or
`hibernate.javax.persistence.query.timeout` level. **Add**
`?options=-c%20statement_timeout=30000` (or
`spring.datasource.hikari.connection-init-sql`) so a runaway query
can't hold a connection forever. The 30s biometric-processor RPC
(line 80 of prod yml) implies the API can already block that long
on a single query slot.

---

## 9. Flyway Migration Discipline

**Total: 50 migrations** (`V0` through `V50`), counted in
`identity-core-api/src/main/resources/db/migration/`.

### Latest 8 migrations

| File | Purpose | Idempotent | NOT NULL backfill safe |
|---|---|---|---|
| `V43__noop_reserved_v43_ships_as_V48.sql` | Reserved/noop | n/a | n/a |
| `V44__tenant_email_domains.sql` | Multi-domain | ✅ (IF NOT EXISTS, ON CONFLICT) | Backfill before NOT NULL |
| `V45__tenant_admin_permissions_baseline.sql` | TENANT_ADMIN seed | ✅ | n/a |
| `V46__backfill_audit_log_tenant_id.sql` | Backfill | ✅ | n/a |
| `V47__add_enrollment_scores.sql` | quality+liveness cols | ✅ (`ADD COLUMN IF NOT EXISTS`) | ✅ NULL-allowed |
| `V48__drop_biometric_data.sql` | Drop dead table | ✅-ish (DROP IF EXISTS) | n/a; verified 0 rows |
| `V49__tenants_deleted_at.sql` | Soft-delete index | ✅ | n/a |
| `V50__refresh_tokens_family_id.sql` | Family ID + index | ✅ deterministic backfill | ✅ 3-step (add, backfill, NOT NULL) |

**Strengths**: every recent migration carries a prose-quality comment
explaining intent, idempotency, rollback. V50's three-step NOT-NULL
pattern is textbook. V40's partition cutover is one of the most
carefully documented migrations I've seen at this codebase size.

**Weaknesses**: V40 partition cutover is operator-applied (not
CI-exercised); no fixture proves the partitioned schema matches the
legacy schema. V42 is non-rollback-safe — any leftover plaintext row
breaks the CHECK constraint, contract relies on operator discipline.
`validate-on-migrate: false` in prod (`application-prod.yml:33`) hides
checksum drift; revisit after the schema settles.

---

## 10. biometric-processor Service Quality

### Model loading + warmup

- `app/main.py:88-91` — `initialize_dependencies()` pre-loads ML
  models at startup via lifespan handler. Good — first request
  doesn't pay the cold-start tax.
- `configure_gpu()` at `app/main.py:49` runs **before** any ML
  model import (per the comment), avoiding the
  TensorFlow / DeepFace device-claim race.

### Cache dirs + container hardening

`UNIFACE_CACHE_DIR=/app/uniface-cache` named volume + HOME=/tmp + uid-100
chown (`docker-compose.prod.yml:57-62`). `read_only: true` rootfs +
`cap_drop: ALL` (`docker-compose.prod.yml:13,17`). Matches memory
feedback rule.

### Request validation order (Edge-P2 #10)

The CE-flagged "size guard before API key" is now correct in code:

`app/main.py:206-263` — `request_size_guard` is registered AFTER
the api_key_auth middleware (line 187), and Starlette stacks
middlewares LIFO so the size guard runs FIRST. The comment at
lines 213-218 calls this out explicitly. Verified.

**Edge case** documented at line 219-223: chunked transfer encoding
has no Content-Length, so it bypasses this guard. The mitigation
relies on Traefik upstream to terminate chunked uploads. **If
Traefik ever changes config**, the guard is silently bypassed. Add
a fallback that checks `request.state.body_bytes` mid-read or
configures Starlette `max_body_size` directly.

### Liveness mode (memory feedback rule)

`docker-compose.prod.yml:57-58` — `LIVENESS_MODE=passive` +
`LIVENESS_BACKEND=uniface`. ✅ matches the memory rule.
`config.py:196-207` resolves backend from mode if not set.

### Embedding generation determinism

- Facenet512 (DeepFace) outputs are deterministic given the same
  preprocessing. The L2-normalization step happens at the embedder
  (verified via grep — visible in the call into the storage
  repository).
- Anti-spoof + liveness are **stochastic at the bbox-quality level**
  (DeepFace + UniFace MiniFASNet). Two calls on the same image
  may produce slightly different scores. **This is a problem for
  the `verify` flow's score-threshold check** — at the boundary,
  retries could flip the verdict. Mitigation: log the per-call
  score and surface to ops dashboards, then choose a threshold
  with margin.

### Timeout / back-pressure

- `BiometricProcessorClient.java:39-40` (Java side) sets a 30 s read
  timeout per call. **No retries**. Given that the call sits inside
  a `@Transactional` Java service, a 30 s wait holds a Hikari
  connection for 30 s — at 20 connections per replica and 100
  concurrent verify attempts, the pool exhausts in seconds.
- biometric-processor's request-handling is `async def` but the
  embedded ML call (DeepFace, UniFace) is **synchronous CPU work**
  blocking the FastAPI event loop. There is no
  `run_in_executor` or `asyncio.to_thread` wrapper visible at the
  route layer. Under concurrent load, FastAPI's single event loop
  serialises ML calls, defeating the async illusion.

### GPU vs CPU

- `MODEL_DEVICE=cpu` (per CLAUDE.md) — CX43 is CPU-only.
- The `ALLOW_HEAVY_ML=false` guard prevents accidental GPU-only
  model selection at boot. Good ergonomic safety net.

### Fingerprint stub (CE concern)

- `app/api/routes/fingerprint.py:39-57` returns 501 to **every**
  call. Routes are kept for API stability. ✅
- BUT `app/infrastructure/ml/fingerprint/hash_embedder.py:24` defines
  `FingerprintHashEmbedder` with full SHA-256 logic, and
  `app/infrastructure/persistence/pgvector_fingerprint_repository.py`
  exists per the CLAUDE.md. The wiring is dormant but the class
  is one config flag away from being used. **Recommend deleting
  the embedder + repo** and renaming the modality to `WEBAUTHN`
  in the auth method picker. Memory feedback note already calls
  this out.

---

## 11. Tests

### File counts

- identity-core-api: **92** test files / 468 production files
  (~20 % file ratio). 3+ Testcontainers-based integration suites
  (`AuthenticationFlowIntegrationTest.java`,
  `UserApiIntegrationTest.java`,
  `OAuth2PublicEndpointsSecurityIntegrationTest.java`).
- biometric-processor: **60** `test_*.py` / 434 production files
  (~14 %).
- web-app (out of scope but referenced): 58 `*.test.tsx?` files.

### Testcontainers usage

- `AuthenticationFlowIntegrationTest` runs the full auth flow against
  a real Postgres container with Flyway migrations applied
  (`AuthenticationFlowIntegrationTest.java:42-63`). Strong.
- `UserApiIntegrationTest`, `OAuth2PublicEndpointsSecurityIntegrationTest`
  — same pattern.

### `addFilters = false` trap (memory feedback rule)

**Trap is present**:
- `AuthControllerTest.java:82` — `@AutoConfigureMockMvc(addFilters = false)`.
- `BiometricControllerTest.java:46` — same.
- `OAuth2ControllerTest.java:47` — same.

These tests **cannot catch** a missing `permitAll()` rule, a wrong
`@PreAuthorize` expression, or a broken JWT filter. The PR-1
anonymous-OAuth-leak class of bug is invisible here. **Mitigation**:
the named integration tests above DO exercise the full filter
chain, so the gap is partially covered. But the unit-test class
of bugs the memory rule warns about remains: developers spotting a
controller test failure typically fix the controller, not the
SecurityConfig. Add a separate `SecurityConfigTest` that asserts
which paths are `permitAll()` vs `authenticated()`.

### CI test gating

- Java unit tests on `ubuntu-latest`; Testcontainers integration
  on a self-hosted runner per CE review.
- No coverage gate (CE found this; verified — `pom.xml` doesn't
  configure JaCoCo `check` goal, only `report`).
- Python: `pytest --cov` available locally but not enforced.

---

## 12. Top 10 Backend Recommendations

Ranked by impact × ease.

| # | Recommendation | Why | Effort | Impact | Sequencing |
|---|---|---|---|---|---|
| 1 | **Fix `RefreshTokenService.verifyExpiration` family-revoke rollback bug** (§6). Annotate `revokeFamily` with `Propagation.REQUIRES_NEW`, OR mark `verifyExpiration` `noRollbackFor = TokenRevokedException.class`. | Currently the family is NOT actually revoked on reuse-detection — the same Tx that did the revoke is rolled back by the same throw. Defeats V50. | S | High (security correctness) | First. Add a Testcontainers test that asserts the family rows are actually revoked after a reuse-detection event. |
| 2 | **Define a bounded `TaskExecutor` bean** for `@EnableAsync` (`AsyncConfig.java`). Currently default is `SimpleAsyncTaskExecutor` with unbounded threads. | Latent DoS under SMTP outage; one mis-configured `@Async` that's actually async will spawn unlimited threads. | S | High (reliability) | Second. Bundle with fix #3. |
| 3 | **Remove `@Async` from the private aspect method or make it public** (`AuditLoggingAspect.java:50`). Today the annotation is a no-op (private method, AOP proxy bypassed); audit save runs synchronously on the request thread. | Hidden latency in every audited request, plus a misleading code signal that suggests async behavior that doesn't exist. | S | Medium (perf + clarity) | Concurrent with #2. |
| 4 | **Cache `UserDetails` for short TTL in `JwtAuthenticationFilter`** (e.g. Caffeine, 30s TTL keyed by JTI). Currently every authenticated request triggers a full users + roles + permissions fetch. | At ~500 auth'd RPS this is the largest single perf gap. The user's authority set rarely changes within 30 s. | M | High (perf) | After #1. Coordinate with logout/blacklist invalidation: on logout, invalidate the user's cache entry too. |
| 5 | **Tighten exception catches in `AuthenticateUserService`** (lines 116-119, 155-157, 250-252). Today a generic `catch (Exception)` around the MFA-flow check fails OPEN to single-factor login on ANY DB hiccup. | Silent MFA bypass on transient infra error. Highest-severity authz risk in the codebase. | S | High (security) | Independent. |
| 6 | **Move `verifyMfaStep`'s logic out of the controller into a service** (`AuthController.java:597-1093`, 740 LoC). Annotate the service method `@Transactional` instead of the controller method. | Controllers shouldn't carry `@Transactional`; a 740-line method violates SRP and is the largest single hotspot in the codebase. | L | Medium (maintainability) | After #1, before adding new MFA methods. |
| 7 | **Add `@SQLDelete` + `@SQLRestriction` to `User`** for parity with `Tenant`. Add a `BEFORE DELETE` trigger on `users` and `tenants` that raises an exception. | The 2026-04-28 FK-cascade incident proved soft-delete must be enforced at multiple levels. JPA-only enforcement loses to a careless raw SQL. | M | High (data safety) | Independent. |
| 8 | **Add explicit `equals`/`hashCode` based on `id` to all entities.** | Standard JPA best practice. Today the bug is latent (most code doesn't use entities as map keys), but the first developer who does will find a silent `Set` deduplication failure. | S | Medium (correctness) | Independent. |
| 9 | **Introduce a request-correlation ID filter and MDC.** Read `X-Request-Id` (or generate UUID) and add to MDC at the start of every request. Forward to biometric-processor on outbound calls. | Today distributed tracing across api → biometric-processor is impossible. Critical for debugging the 30 s timeout chain. | M | High (operability) | Independent; pair with the new Loki/Promtail stack already deployed. |
| 10 | **Wrap CPU-bound ML calls in biometric-processor with `asyncio.to_thread` or `run_in_executor`** in the route handlers. Today FastAPI's event loop serialises Facenet512 + UniFace + DeepFace calls. | Concurrent verify attempts queue serially behind the event loop; throughput is single-core regardless of workers. | M | High (perf) | After #1. Verify with locust/k6 load test before/after. |

**Bonus tracking**: delete `StatisticsController` stub; delete
`FingerprintHashEmbedder` + pgvector_fingerprint_repository if modality
is permanently WebAuthn; add 30 s JDBC `statement_timeout`; replace
`Map<String,Object>` MFA-step body with typed DTO; schedule audit-logs
partition-creation cron; tighten web-app lint gate (CE call-out);
fix tenant-lock-check fail-OPEN catch.

---

*End of Backend Review.*
