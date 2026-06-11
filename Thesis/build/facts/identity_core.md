# Fact Pack — Identity Core API (Spring Boot)

Source of truth: real code under `/opt/projects/fivucsas/identity-core-api` (read 2026-06-05 on branch `master`). All facts below are grounded in `pom.xml`, `src/main/java`, `src/main/resources/db/migration`, and `src/main/resources/application*.yml`. Where the code contradicts older docs, the code wins. Items that are *planned but absent* are flagged explicitly.

---

## 1. Identity & exact versions

- **Maven coordinates:** `com.fivucsas:identity-core-api:1.0.0-MVP`. Build tool is **Maven, not Gradle**.
- **Spring Boot parent:** `spring-boot-starter-parent` **3.4.7**.
- **Java:** `<java.version>21</java.version>` (records, sealed-friendly, virtual-thread-capable runtime).
- **Pinned CVE overrides (in `<properties>`):** Spring Security **6.4.13**, Spring Framework **6.2.17**, Tomcat **10.1.53**, Netty **4.1.132.Final**, commons-io **2.21.0**, Jackson BOM **2.18.4.1** (imported to stop transitive `*-SNAPSHOT` resolution).
- **Key direct dependencies & versions:**
  - JWT — `io.jsonwebtoken` (jjwt) **0.12.6** (api + impl + jackson).
  - TOTP — `dev.samstevens.totp` **1.7.1**.
  - WebAuthn/FIDO2 — `com.yubico:webauthn-server-core` **2.5.2** (with explicit `jackson-dataformat-cbor` at managed version).
  - Rate limiting — `com.bucket4j:bucket4j-core` **8.10.1**.
  - OpenAPI/Swagger — `springdoc-openapi-starter-webmvc-ui` **2.8.16**.
  - SMS — `com.twilio.sdk:twilio` **10.1.0**.
  - Scheduled-job single-replica guard — ShedLock **5.16.0** (`shedlock-spring` + `shedlock-provider-jdbc-template`).
  - Flyway — `flyway-core` + `flyway-database-postgresql` (Spring-Boot-managed version).
  - Metrics — `micrometer-registry-prometheus`.
  - DB drivers — PostgreSQL (runtime) + H2 (runtime, dev/test only).
  - Lombok (compile-time).
- **Spring Boot starters:** web (MVC, Tomcat), data-jpa (Hibernate), security, validation, actuator, mail (SMTP), data-redis, webflux (for the reactive HTTP client to the FastAPI biometric service), websocket (cross-device delegation).
- **Test stack:** JUnit 5 / `spring-boot-starter-test`, `spring-security-test`, **ArchUnit 1.3.0** (`archunit-junit5`), **Testcontainers 1.20.4** (core + postgresql + junit-jupiter), **JaCoCo 0.8.12**.
- **Quality gate (pom):** JaCoCo `check` enforces a minimum **line coverage of 0.38** (`jacoco.coverage.min`). Comment records a measured baseline of **4693/11726 = 0.4002** lines covered (mvn -T 2C test, 2026-05-21), with a documented ratchet target of 0.70.
- **Runtime ports / profiles:** server on **8080**. Maven profiles `dev` (active by default) and `prod`. Boot profiles: `application.yml` (base, default-algo HS512, no aud/iss requirement → dev/test parity), `application-prod.yml` (RS256-only, issuer `https://api.fivucsas.com`, audience `fivucsas-api`), plus `application-dev.yml` / `application-docker.yml`.

---

## 2. Hexagonal (ports & adapters) package structure

Root package `com.fivucsas.identity`. The codebase is mid-migration toward a clean hexagonal layout; two parallel structures coexist (an explicit known state, not an accident):

**Canonical hexagonal tree (`domain/` → `application/` → `infrastructure/`):**
- `domain/model/{user,tenant,role,permission,auth}` — rich domain models & value objects: `User`, `Tenant`/`TenantId`/`TenantConfiguration`, `Role`, `Permission`, and value objects `Email`, `FullName`, `HashedPassword`, `PhoneNumber`, `IdNumber`, `Address`, `PasswordPolicy`, `UserId`, `NfcSerial`. Enums `AuthMethodType`, `StepType`, `FlowType`, `EnrollmentStatus`, `VerificationSessionStatus`, `AuditAction`, `PkceFailureReason`.
- `domain/exception`, `domain/repository` — domain ports/exceptions.
- `application/port/input` — **36 inbound use-case ports** (e.g. `AuthenticateUserUseCase`, `RegisterUserUseCase`, `VerifyBiometricUseCase`, `ManageAuthFlowUseCase`, `SwitchMembershipUseCase`, `IdentityLinkUseCase`, `ManageBiometricConsentUseCase`, `StepUpAuthUseCase`, `UserDataExportUseCase`).
- `application/port/output` — **38 outbound ports** (e.g. `BiometricServicePort`, `CachePort`, `AuditLogPort`, `TokenGenerationPort`, `PasswordEncoderPort`, `RefreshTokenPort`, `EmailServicePort`, `DnsTxtLookupPort`, `WebAuthnCredentialRepositoryPort`, `MembershipSwitchPort`, `BiometricConsentResolver`, `PairwiseSubjectResolver`-adjacent ports).
- `application/service` — **~55 use-case/service classes** implementing the input ports (see §6), with sub-packages `service/handler` (login auth-method handlers), `service/mfa` + `service/mfa/handler` (N-step MFA), `service/verification` + `service/verification/handlers` (identity-verification pipeline), `service/nfc`.
- `application/dto/{command,query,response}` + `application/mapper`.
- `infrastructure/adapter` — **38 adapters** that implement the output ports (Spring-Data repositories, Redis cache, biometric REST client, SMTP, etc.).
- `infrastructure/{oauth2,webauthn,approvelogin,totp,otp,sms,qrcode,stepup,messaging,multitenancy,audit,email,health,persistence,ratelimit,web}` — concrete adapter sub-domains.
- `config` — Spring wiring (`SecurityConfig`, `SecurityHeadersConfig`, `RateLimitInterceptor`, `AntiReplayFilter`, `AsyncConfig`, `ShedLockConfig`, `WebClientConfig`, `WebMvcConfig`, `OpenApiConfig`, `DataInitializer`).
- `controller` — **29 `@RestController` classes** (web adapters).
- `security` — JWT, RBAC, key providers, rate-limit service, tenant-scope resolver.

**Legacy/anemic tree (still present, being collapsed):** flat `entity/` (32 JPA `@Entity` classes), `repository/`, `dto/`, `service/` (`RefreshTokenService`, `StatisticsService`, …), `exception/`. The dual `User` model (domain `domain.model.user.User` vs JPA `entity.User`) is frozen by an **ArchUnit** boundary test (`UserDomainBoundaryTest`) that forbids `entity.User` imports outside `infrastructure/`, `repository/`, `entity/`. A second ArchUnit test (`WebAuthnRepoWriteBoundaryTest`) forces all WebAuthn credential writes through `WebAuthnCredentialService`. Frozen rule sets live in `archunit_store/`.

Internal-structure diagram available: `[[FIG:identity_internal]]`.

---

## 3. REST controllers & endpoints (real, grepped)

29 `@RestController` classes; all under `/api/v1/**` except the OIDC discovery/JWKS (`/.well-known/**`). Selected, verified endpoint inventory:

- **`AuthController`** (`/api/v1/auth`): `POST /register`, `POST /login`, `POST /login/preflight` (identifier-first; returns `LoginPreflightResponse {eligible, loginConfig}`), `POST /login/begin` (identifier-first begin — wired & live), `GET /login-config`, `POST /refresh`, `POST /logout`, `GET /me`, `POST /forgot-password`, `POST /reset-password`, `POST /send-email-verification`, `POST /verify-email`, `POST /send-phone-verification`, `POST /verify-phone`, `POST /2fa/{send,verify,verify-method,send-sms}`, **N-step MFA**: `POST /mfa/step`, `DELETE /mfa/session/{sessionToken}`, `POST /mfa/switch-method`, `POST /mfa/qr-generate`, `POST /mfa/send-otp`, `GET /my/2fa-status`, `GET /health`.
- **`OAuth2Controller`** (`/api/v1/oauth2`): `GET /authorize`, `POST /authorize/complete`, `GET /clients/{clientId}/public`, `POST /token`, `GET /userinfo`.
- **`OAuth2ClientController`** (`/api/v1/oauth2/clients`): list/create/get, `DELETE /{id}`, `POST /{id}/rotate-secret`, `PATCH /{id}/status`.
- **`OpenIDConfigController`**: `GET /.well-known/openid-configuration`, `GET /.well-known/jwks.json`.
- **`DeviceController`** (devices + WebAuthn): `GET/POST /devices`, `DELETE /devices/{deviceId}`, `POST /devices/push-token`; WebAuthn registration `POST /webauthn/register-options`, `POST /webauthn/register`, credential CRUD; assertion `POST /webauthn/authenticate-options`, `POST /webauthn/authenticate`; **discoverable passkey** `POST /webauthn/passkey/authenticate-options`, `POST /webauthn/passkey/authenticate`.
- **`NfcController`** (`/api/v1/nfc`): `POST /enroll`, `POST /verify`, `GET /search/{serial}`, `DELETE /{userId}`, `GET /user/{userId}`, `DELETE /cards/{cardId}`, `POST /verify-mrz` (eMRTD MRZ parse), `POST /verify-authenticity` (eMRTD passive-auth, SOD→DS→CSCA chain).
- **`BiometricController`**: face `POST /biometric/enroll/{userId}`, `/enroll/multi/{userId}`, `/verify/{userId}`, `DELETE /biometric/face/{userId}`, `POST /biometric/search`; voice `/voice/{enroll,verify,search}`, `DELETE /voice/{userId}`; step-up biometric `POST /auth/biometric/{devices,challenge,verify}`; `POST /biometric/puzzles/verify-challenge` (proxy to bio liveness validator); `GET /biometric/health`.
- **`EnrollmentController`**: enrollment CRUD + health + the multipart `POST /enrollment/submit`, `GET /enrollment/status`, `POST /enrollment/liveness/challenge`, `POST /enrollment/liveness/verify`.
- **`QrController`**: `POST /qr/generate/{userId}`, `DELETE /qr/{token}`, cross-device `POST /auth/qr/session`, `GET /auth/qr/session/{sessionId}`, `POST /auth/qr/session/{sessionId}/approve`.
- **`ApproveLoginController`**: number-matching approve-login `POST /auth/approve-login/session`, `GET .../session/{id}`, `GET .../pending`, `POST .../session/{id}/decide`.
- **`OtpController`**: email OTP send/verify, SMS OTP send/verify, TOTP `setup`/`verify-setup`/`status`/delete (all per `{userId}`).
- **`StepUpController`** (`/api/v1/step-up`): `POST /register-device`, `POST /challenge`, `POST /verify-challenge` (ECDSA signed-nonce device step-up).
- **`VerificationController`** (`/api/v1/verification`): session lifecycle (`POST /sessions`, `POST /sessions/{id}/steps/{n}`, `GET /sessions/{id}`, `POST /sessions/{id}/complete`, `.../review`), `GET /templates`, `GET /flows`, `GET /stats`, `GET /sessions`, `GET /results/{userId}`.
- **`MembershipSwitchController`** (`/api/v1/auth`): `POST /switch-membership` (in-session account switch / token exchange).
- **`IdentityLinkController`** (`/api/v1/identity`): `POST /link/initiate`, `POST /link/confirm`, `POST /unlink`, `GET /me`.
- **`BiometricConsentController`** (`/api/v1/identity/biometric/consents`): `GET`, `POST` (per-tenant Model-A biometric consent).
- **`OnboardingController`** (`/api/v1/onboarding`): self-service `POST /register`, `POST /verify-email`, `GET /verify-email`.
- **Tenant / RBAC / admin:** `TenantController`, `TenantEmailDomainController` (incl. DNS-TXT `POST /{domain}/verification` + `POST /{domain}/verify`), `RoleController` (roles + permissions + user-role assignment), `UserController` (users, settings, **guest invitations**: invite/accept/resend/revoke/extend), `UserDataExportController` (`GET /users/{id}/export`, KVKK/GDPR), `AuditLogController` (`/audit-logs`, `/my/activity`, `/statistics/dashboard`), `AuthFlowController`, `AuthMethodController`, `AuthSessionController` (legacy session engine + `/sessions/my` self-service), `AdminOverviewController`, `StatisticsController`, `BiometricReconcileAdminController`, `PurgeAdminController` (`DELETE /admin/purge/dry-run`).

A single `GlobalExceptionHandler` (`@RestControllerAdvice` in `exception/`) renders consistent JSON error envelopes.

---

## 4. Domain models / `@Entity` classes

**32 JPA `@Entity` classes in `entity/`** (the persistence model): `User`, `Tenant`, `Role`, `Permission`, `UserRole` (+ `UserRoleId`), `RefreshToken`, `PasswordHistory`, `UserSettings`, `UserDevice`, `WebAuthnCredential`, `ApiKey`, `AuditLog`, `AuthFlow`, `AuthFlowStep`, `AuthMethod`, `TenantAuthMethod`, `AuthSession`, `AuthSessionStep`, `MfaSession`, `NfcCard`, `OAuth2Client`, `RateLimitBucket`, `UserEnrollment`, `VerificationSession`, `VerificationStepResult`, `VerificationDocument`, `GuestInvitation`, `TenantEmailDomain` (+ `TenantEmailDomainId`), `Identity`, `IdentityEmail`, `IdentityTenantBiometricConsent`. Supporting enums: `UserStatus`, `UserType`, `TenantStatus`, `InvitationStatus`.

Notable entity-design facts:
- **Multi-tenant Hibernate `@Filter`:** a global `@FilterDef("tenantFilter")` is declared on `User`; defense-in-depth `@Filter(name="tenantFilter", condition="tenant_id = :tenantId")` is applied on the 8 tenant-scoped entities (`AuditLog`, `AuthSession`, `MfaSession`, `UserEnrollment`, `VerificationSession`, `OAuth2Client`, `UserDevice`, `AuthFlow`). `Role`'s filter is widened to `(tenant_id = :tenantId OR tenant_id IS NULL)` so global role *definitions* stay visible. `Identity`, `IdentityEmail`, `IdentityTenantBiometricConsent` deliberately carry **no** filter — they are cross-tenant/platform-level by design.
- **Soft-delete:** `User` has `@SQLDelete` + `@SQLRestriction("deleted_at IS NULL")` so all derived finders auto-filter the GDPR retention window and `repository.delete()` doesn't trip the DB hard-delete trigger.
- **Professional state pattern:** `NfcCard`/`OAuth2Client` use `revokedAt` timestamps; `User.isActive` syncs from a status enum via `@PrePersist`/`@PreUpdate`.
- **Idempotent inserts:** `RefreshToken implements Persistable<UUID>` with an explicit `isNew()` flag (fixes Hibernate treating manually-assigned UUIDs as merge candidates).

Domain-model figures: `[[FIG:domain_model]]`, ER: `[[FIG:er_diagram]]` / `[[FIG:er_full]]` / `[[FIG:er_core]]`.

---

## 5. Auth methods (the 12 enum values, 10 are login factors)

`AuthMethodType` enum holds login factors **plus** verification-pipeline step types. The **canonical login methods** (an `EnumSet LOGIN_METHODS`, `isLoginMethod()` gate) are: `PASSWORD, EMAIL_OTP, SMS_OTP, TOTP, FACE, FINGERPRINT, VOICE, NFC_DOCUMENT, HARDWARE_KEY, QR_CODE` plus the two config-driven Layer-1 additions `PASSKEY` (discoverable WebAuthn) and `APPROVE_LOGIN` (number-matching cross-device). `GESTURE_LIVENESS` is **deliberately NOT** a login method — it is a FACE active-liveness sub-component with no handler (documented planned-but-absent-as-a-factor).

`StepType` enum has just two values: `SEQUENTIAL`, `CHOICE` (CHOICE = any-one-of for adaptive MFA).

**Login auth-method handler stack** (`application/service/handler`, `AuthMethodHandler` interface + `AuthMethodHandlerRegistry`): `PasswordAuthHandler`, `EmailOtpAuthHandler`, `SmsOtpAuthHandler`, `TotpAuthHandler`, `QrCodeAuthHandler`, `FaceAuthHandler`, `FingerprintAuthHandler` (delivered via WebAuthn platform authenticator — the legacy server-side fingerprint biometric path was *removed* as it was a SHA-256 placeholder), `VoiceAuthHandler`, `NfcDocumentAuthHandler`, `HardwareKeyAuthHandler`.

**N-step MFA verification handler stack** (`application/service/mfa/handler`, `VerifyMfaStepHandler` interface, dispatched by `VerifyMfaStepService`): `PasswordVerifyMfaStepHandler`, `EmailOtpVerifyMfaStepHandler`, `SmsOtpVerifyMfaStepHandler`, `TotpVerifyMfaStepHandler`, `FaceVerifyMfaStepHandler`, `VoiceVerifyMfaStepHandler`, `FingerprintVerifyMfaStepHandler`, `HardwareKeyVerifyMfaStepHandler`, `NfcDocumentVerifyMfaStepHandler`, `QrCodeVerifyMfaStepHandler`, `ApproveLoginVerifyMfaStepHandler` (+ `WebAuthnVerifySupport` mixin).

---

## 6. Application use-case / service classes

`application/service` (selected, by area):
- **Auth/login:** `AuthenticateUserService`, `RegisterUserService`, `LoginConfigService`, `ConfigDrivenLoginPolicy` (flag-gated identifier-first engine, default OFF), `UsernamelessLoginFlowService`, `LoginAccountStateGuard`, `TenantAuthMethodPolicy`, `ExecuteAuthSessionService`, `AuthSessionQueryService`.
- **MFA:** `mfa/VerifyMfaStepService`, `mfa/AvailableMethodsResolver`.
- **Tokens/session:** `RefreshAccessTokenService`, `LogoutUserService`, `GetActiveSessionsService`, `RevokeSessionService`, `RevokeAllSessionsService`, plus legacy `service/RefreshTokenService` + `RefreshTokenFamilyRevoker` + `RefreshTokenHasher`.
- **Password lifecycle:** `ChangePasswordService`, `ForgotPasswordService`, `ResetPasswordService`, `VerifyEmailService`, `ResendVerificationEmailService`.
- **Tenant/RBAC:** `RegisterTenantService`, `ManageTenantService`, `ManageTenantEmailDomainService`, `ManageRoleService`, `ManagePermissionService`, `ManageUserRoleService`, `ManageUserService`, `ManageAuthFlowService`, `ManageAuthMethodService`.
- **Biometric/enrollment:** `EnrollBiometricService`, `VerifyBiometricService`, `ManageEnrollmentService`, `EnrollmentQueryService`, `EnrollmentHealthService`, `BiometricEnrollmentReconciler`, `ManageNfcCardService`.
- **Verification pipeline:** `ManageVerificationService` (holds the 5 industry templates), `verification/VerificationStepHandlerRegistry`.
- **Identity layer:** `IdentityLinkService`, `SwitchMembershipService`, `BiometricConsentService`.
- **Other:** `StepUpAuthService`, `GuestLifecycleService`, `GetStatisticsService`, `GetCurrentUserService`, `GetUserActivityLogService`, `AdminOverviewService`, `UserDataExportService`, `WebAuthnCredentialService`, `ManageDeviceService`, **`SoftDeletePurgeJob`** (`@Scheduled` GDPR purge).

---

## 7. Security details (grounded)

### 7.1 Password hashing
- **BCrypt with work factor 12** — `SecurityConfig.passwordEncoder()` returns `new BCryptPasswordEncoder(12)` [CITE:bcrypt]. Spring's `DaoAuthenticationProvider` is wired to it. `HashedPassword` value object validates BCrypt format. `SecurePasswordGenerator` uses `SecureRandom` for invite/temp passwords. `PasswordHistory` entity prevents reuse.

### 7.2 JWT (`security/JwtService`, jjwt 0.12.6) [CITE:jwt-rfc7519,jjwt]
- **Dual-algorithm coexistence:** HS512 (legacy symmetric, `kid="hs-2026-04"`) and **RS256** (asymmetric, OIDC). `fivucsas.jwt.default-algo` selects the signing alg; prod pins **RS256** and a `@PostConstruct` **fails fast at boot** if prod is active but the alg isn't RS256.
- **HS512 verification is OFF by default** (`app.security.jwt.allow-hs512=false`) because the historical `.env.gcp` HS secret leaked — any HS512-tagged token is rejected with `SignatureException` unless an operator explicitly opts in for a rollback window. A `kid`-revocation list (`app.security.jwt.revoked-kids`) provides defense-in-depth even if HS512 is re-enabled.
- **Claim binding:** every minted access token carries `iss` (`https://api.fivucsas.com` in prod) and `aud` (`fivucsas-api` in prod); the parser `requireIssuer`/`requireAudience` when configured. Boot fails fast in prod if `app.security.jwt.audience` is blank. ID tokens get `aud=clientId`+`azp=clientId` only (no API audience) for strict OIDC RP compatibility.
- **Key routing:** a `Locator<Key>` reads the JWS `kid` header and routes to the matching key; unsigned JWTs and unknown/`alg`-mismatched kids are rejected (closes CVE-2018-0114-shape alg-confusion forgeries). RSA keys via `RsaKeyProvider`; HS secrets via `HsKeyRegistry` (`Map<kid,SecretKey>` enabling no-logout HS-secret rotation).
- **Access token TTL:** prod **15 minutes** (`JWT_EXPIRATION:900000`); refresh **24 hours** (`86400000`). Dev defaults are looser (24h / 7d).
- **AMR (RFC 8176):** `VerifyMfaStepService` accumulates completed-method `amr` values into the token: `PASSWORD→pwd`, `EMAIL_OTP/TOTP→otp`, `SMS_OTP→sms`, `FACE→face`, `VOICE→voice`, `FINGERPRINT→fpt`, `HARDWARE_KEY/PASSKEY→hwk`, `QR_CODE/APPROVE_LOGIN→mca`, `NFC_DOCUMENT→swk`. `auth_time` is carried through.

### 7.3 RBAC (`security/`)
- Method security via `@EnableMethodSecurity` + `@PreAuthorize`, with a custom `RbacPermissionEvaluator` wired into `DefaultMethodSecurityExpressionHandler`. `RbacAuthorizationService` (`@rbac.*`) exposes helpers (`isTenantAdmin()`, `hasPermission(...)`, `isCrossTenantAdmin()`, `getCurrentUserId()`).
- **Two-tier authority model:** `user_type` (platform tier: `ROOT > TENANT_ADMIN > TENANT_MEMBER > GUEST`) is the **sole platform-tier authority**; `role` is purely within-tenant RBAC. The former global `SUPER_ADMIN` role was renamed **ROOT** (V69) and granted all 48 permissions (V71). 48 permissions, 7 of which are platform-level.
- `CustomUserDetailsService`/`CustomUserDetails` adapt the domain user to Spring Security.

### 7.4 Rate limiting (Bucket4j 8.10.1) [CITE:bucket4j]
Two complementary layers:
- **`infrastructure/ratelimit/RateLimitFilter`** — Redis-backed sliding/INCR window: **100 req/min per IP** default; **onboarding/register = 5 req/hour per IP**. Sensitive paths (login, register, forgot/reset-password, onboarding, approve-login session) **fail closed** to a bounded (10k-entry) in-memory fallback when Redis is down; non-sensitive paths fail open. Emits `X-RateLimit-*` + `Retry-After` headers; skips actuator/swagger/health.
- **`security/RateLimitService`** — Bucket4j token-bucket per-purpose: login **10/5min/IP**, registration **5/hr/IP**, password-reset **5/hr/IP**, biometric **20/min/user**, API **100/min/user**, GDPR export **1/hr/user**, MFA-step **30/min/IP**, **PKCE failures 30/5min/clientId** (only failures consume), **tenant token mint 6000/min/tenant** (only successes consume). Maps are size-bounded (10k) with a `@Scheduled(fixedRate=300_000)` eviction sweep. Login/API caps are env-tunable for demo relief.

### 7.5 OAuth2 / OIDC / PKCE (`OAuth2Service`, `OAuth2Controller`) [CITE:oauth2-rfc6749,oidc-core,pkce-rfc7636]
- Authorization-code flow with discovery (`/.well-known/openid-configuration`), JWKS (`/.well-known/jwks.json`), token, and userinfo endpoints.
- **PKCE (RFC 7636):** `code_challenge_method` defaults to **S256**; `plain` is *rejected for public clients* (S256 mandatory per RFC 7636 + RFC 8252 §8.1). Verification computes `BASE64URL(SHA-256(code_verifier))` (no padding, US-ASCII) and constant-compares to the stored challenge.
- **Auth codes** are single-use, stored in Redis with a **10-minute TTL** (`oauth2:code:` prefix), deleted on first exchange (RFC 6749 §4.1.2). `redirect_uri` and `client_id` are exact-matched.
- **Confidential-client auth (P0-SEC-2):** confidential clients MUST present a valid `client_secret` at the token endpoint regardless of PKCE — PKCE is not a substitute for client authentication. Secret rotation supported via a grace window (V58, `matchesCurrentOrPreviousSecret`, `POST /clients/{id}/rotate-secret`).
- **ID-token replay guard:** `/oauth2/userinfo` rejects ID tokens (`type=oauth2` claim check).
- **Pairwise subject** (`PairwiseSubjectResolver`): `base64url(SHA-256(sector|identityId|salt))` per RP, behind flag `app.identity.oidc-subject-identity` (**default OFF / dormant** — `subject_types_supported=public`).

### 7.6 WebAuthn / passkeys (Yubico 2.5.2) [CITE:webauthn]
- `infrastructure/webauthn/WebAuthnService` — RP id `webauthn.rp-id` (default `fivucsas.com`); an **explicit allowlist** of accepted origins (`app.webauthn.allowed-origins`: app/verify/demo.fivucsas.com + localhost) replaces the old substring trick (closes phishing-host bypass). Manually validates the `rpIdHash` (SHA-256 of RP id), flags, and `signCount`. Registration sets `residentKey=required` + `UV=required`.
- **Discoverable/usernameless passkeys:** anonymous `permitAll` endpoints resolve the user from the asserted `userHandle` (`WebAuthnUserHandle`, backed by `webauthn_credentials.discoverable` + `user_handle`, V72). `public_key_algorithm` defaults to `ES256`.

### 7.7 Approve-login (number matching) — `infrastructure/approvelogin/ApproveLoginService`
Redis-backed, modeled on `QrSessionService`: session TTL **2 min**, `matchNumber` is a zero-padded **String** (e.g. "07"); unknown-email requests return a **decoy session** (no account-existence oracle). No Firebase.

### 7.8 MFA factors & other auth surfaces
- **TOTP** (`infrastructure/totp/TotpService`, samstevens 1.7.1): **S13 used-code replay prevention** — a verified `(userId, timeStep)` is marked consumed in Redis via `SET key 1 EX 120 NX` (`totp:used:` prefix, 120s TTL); bounded in-memory fallback. Secrets encrypted at rest **AES-GCM-256** (`TotpSecretCipher`, V39/V42; `TotpSecretMigrator`).
- **OTP** (`infrastructure/otp/OtpService`): email/SMS OTP in Redis with **5-min TTL**; per-OTP attempt counter (`<key>:attempts`, same TTL) — a wrong guess deletes the OTP, capping the guess budget.
- **QR cross-device** (`QrSessionService`): session TTL **5 min**, approved-state TTL **2 min**.
- **Step-up** (`StepUpChallengeService` + `StepUpAuthService`): ECDSA signed-nonce device challenge, challenge TTL **5 min**.
- **SMS gateway abstraction** (`infrastructure/sms`): `SmsService` interface with `TwilioSmsService`, `TwilioVerifySmsService`, `NetgsmSmsService`, `NoOpSmsService` implementations.
- **NFC / eMRTD:** serial canonicalization (`NfcSerial.canonicalize` → upper-hex, no separators) at every ingest boundary; serial-only login is flag-gated and fail-closed by default; **eMRTD passive authentication** (`POST /nfc/verify-authenticity`) delegates the EF.SOD→Document-Signer→CSCA chain + DG-hash binding to the biometric-processor and is **fail-closed** (any error / `NO_TRUST_STORE` / non-authentic ⇒ reject), interpreted in one place (`NfcChipAuthenticityVerdict`) [CITE:icao9303].

### 7.9 Transport/edge & headers
- `SecurityConfig`: stateless sessions, CSRF disabled (token auth), CORS allowlist (api/app/demo/verify.fivucsas.com + dev origins), `SecurityHeadersConfig`, `RequestIdFilter` (correlation id), `JwtAuthenticationFilter`, and `TenantBindFromAuthFilter` (rebinds tenant from the JWT after auth so a forged `X-Tenant-ID` can't swap tenants; ROOT keeps the legitimate cross-tenant override). `AntiReplayFilter` enforces an `X-Request-Nonce` (5-min Redis window) on biometric/NFC enroll/verify/search.

Security-architecture figure: `[[FIG:security_arch]]`.

---

## 8. Flyway migrations V0–V83 (grouped) [CITE:flyway,postgresql,pgvector]

**84 migration files on disk** (`V0` plus `V1`–`V83`, with `V13` skipped in numbering; `V43`/`V56` are reserved no-ops for chain contiguity). Max applied in prod = **V83** (verified 2026-06-04). All apply 71/71 (the count at the time) cleanly from an empty DB after the V29/V40/V41 DR-safety rewrite. Grouped summary:

- **V0:** extensions `uuid-ossp` + **`vector` (pgvector)**.
- **V1–V12, V14–V15, V20–V21:** core IAM schema — `tenants`, `users`, `roles`/`permissions`/`user_roles`, `audit_logs`, sessions, `refresh_tokens`, performance indexes, RBAC user-types + guest lifecycle, `user_settings`, entity-alignment fixes, sample-data seed.
- **V4:** biometric tables — `biometric_data` with `embedding vector(512)` (Facenet512 dimension) and `biometric_type`/`biometric_quality` enums. (`biometric_data` later dropped in V48; the live face/voice vector store lives in the biometric-processor's pgvector schema.)
- **V16–V17:** auth-flow system (`auth_flows`, `auth_flow_steps`, `auth_methods`, `tenant_auth_methods`), device step-up public key.
- **V18–V19:** `webauthn_credentials` (credential_id, public_key, `public_key_algorithm` default ES256, sign_count), `api_keys`.
- **V22–V23:** `nfc_card_enrollment`, two-factor columns.
- **V24, V34, V37, V38, V58:** OAuth2 — `oauth2_clients`, `.confidential` flag, tenant_id index, dashboard→public, secret-rotation grace window.
- **V25:** enrollment scoping + **Row-Level-Security policies** (`user_enrollments` tenant isolation — note: RLS later found INERT in prod; @Filter is the operative isolation).
- **V26–V28, V30–V31:** identity-verification pipeline (`verification_sessions`, step results, documents), seeded flows, video-interview step, **adaptive-MFA engine** (CHOICE steps), display-order fix.
- **V29:** EMAIL_OTP added to default login flow (rewritten to resolve by natural keys for DR-safety).
- **V32:** entity professionalization (`revokedAt`/`expiresAt`/`verifiedAt`).
- **V33:** `voice_enrollments` table.
- **V35–V36:** `mfa_sessions.consumed_at` (single-use) + `.client_id` (cross-client replay guard).
- **V39, V42:** TOTP secret AES-GCM-256 encryption + `chk` constraint.
- **V40–V41, V46, V57, V59, V61:** `audit_logs` partitioning → handed to **pg_partman** (V57, fail-soft when extension missing), tenant_id backfill + "system" sentinel tenant, `tenant_id NOT NULL` (self-gating).
- **V44, V62–V64:** `tenant_email_domains` + `enforce_domain_matching` + `verified` flag + **DNS-TXT verification token** + `default_member_role`.
- **V45, V76:** TENANT_ADMIN permission baseline; later scope tenant-scoped TENANT_ADMIN to TENANT-level permissions only (strip 7 platform grants).
- **V47–V48:** enrollment quality/liveness score columns; drop legacy `biometric_data`.
- **V49, V53:** `tenants.deleted_at`; PL/pgSQL **trigger forbidding hard-delete** of users/tenants.
- **V50, V55, V56, V60:** refresh-token **rotation family_id** (RFC 6749 §10.4 reuse-detection), token **hash-at-rest + dual-read**, then drop of the plaintext column.
- **V51–V52:** ShedLock tables (+ TZ fix).
- **V54, V79:** phone E.164 normalization; canonicalize existing NFC serials.
- **V65–V71:** identity & account-linking — `identities`, `identity_emails` (unique on `lower(email)`), `users.identity_id` (FK → backfill → trigger `ensure_user_identity` → NOT NULL), `identity_tenant_biometric_consent` (Model A, cross-tenant), SUPER_ADMIN→ROOT rename + user_type elevate-only backfill + ROOT all-48-permissions.
- **V72–V75, V83:** WebAuthn discoverable-passkey columns; auth-method seeds for `PASSKEY`/`APPROVE_LOGIN` + `supports_usernameless`; activate VOICE login method (V16 had seeded it inactive); widen `chk_enrollment_method` to include APPROVE_LOGIN+PASSKEY.
- **V77–V78, V80–V82:** cascade session FKs on auth-flow delete; partial-unique tenant-email under soft-delete; `fivucsas-mobile` OAuth client; all-methods consent singleton; `oauth2_clients.cross_tenant`.

**Key resulting tables:** `users`, `tenants`, `roles`/`permissions`/`user_roles`, `auth_flows`/`auth_flow_steps`/`auth_methods`/`tenant_auth_methods`, `auth_sessions`/`auth_session_steps`, `mfa_sessions`, `refresh_tokens` (hashed + family), `webauthn_credentials`, `nfc_cards`, `oauth2_clients`, `verification_sessions`/`verification_step_results`/`verification_documents`, `user_enrollments`, `voice_enrollments`, `audit_logs` (partitioned), `user_settings`, `user_devices`, `api_keys`, `guest_invitations`, `tenant_email_domains`, `identities`/`identity_emails`/`identity_tenant_biometric_consent`, `password_history`, `shedlock`. (Face/voice **embedding vectors with HNSW indexes** live in the biometric-processor's pgvector store, not here.)

---

## 9. Redis caching (keys / TTLs) [CITE:redis]

Redis (Spring Data Redis; `infrastructure/messaging/RedisMessagingConfig`, host/port `REDIS_HOST`/`REDIS_PORT` default `localhost:6379`, prod **Redis 7.4**) is used for distributed coordination far more than for read caching:

| Purpose | Key prefix | TTL |
|---|---|---|
| OAuth2 authorization codes | `oauth2:code:` | 10 min (single-use) |
| Email/SMS OTP (+ `:attempts` counter) | OTP key (+ `:attempts`) | 5 min |
| TOTP used-code replay marker | `totp:used:` | 120 s (`SET … EX NX`) |
| QR cross-device session | QR session key | 5 min (approved: 2 min) |
| Approve-login (number matching) | approve-login key | 2 min |
| Step-up ECDSA challenge | step-up key | 5 min |
| Anti-replay nonces | `antireplay:nonce:` | 5 min |
| HTTP rate-limit counters | `rate_limit:<ip>:<path>` | window (1 min / 1 hr) |
| Generic cache port | via `RedisCacheAdapter` | per-call `Duration` |

`infrastructure/adapter/RedisCacheAdapter` (implements `CachePort`) is the generic put/get/evict/exists adapter, with **graceful degradation** (logs and continues when Redis is unavailable) and an `existsFailClosed` variant for security-sensitive checks. `RedisEventBus` provides pub/sub messaging (e.g. biometric event listener/publisher).

---

## 10. Concurrency / idempotency / OS-level patterns

- **Single-replica scheduled jobs:** ShedLock (`@SchedulerLock`) guards `@Scheduled` jobs so a rolling deploy can't double-run them. `SoftDeletePurgeJob` runs `@Scheduled(cron="0 30 3 * * *")` (daily 03:30) under a `@SchedulerLock`; `GuestLifecycleService` expires invitations every 15 min; `RateLimitService` evicts buckets every 5 min.
- **Single-use tokens / atomic consume:** `mfa_sessions.consumed_at` + the OAuth2 mint path marks the MFA session consumed **before** minting the code and deletes it in the **same `@Transactional`**, so a crash leaves it poisoned (replay-proof). Auth codes deleted from Redis on first exchange. TOTP `SET … NX` is the atomic single-use primitive.
- **Refresh-token rotation reuse-detection (RFC 6749 §10.4):** `RefreshTokenService` rotates within a `family_id`; presenting a revoked/replayed sibling triggers `RefreshTokenFamilyRevoker.revokeFamily(...)` running in **`Propagation.REQUIRES_NEW`** so the family revocation **commits even when the outer transaction rolls back** (a red-team-confirmed 2026-06-01 fix — previously the revoke rolled back with the rejected request, leaving stolen siblings valid).
- **Hibernate insert idempotency:** `RefreshToken implements Persistable<UUID>` so manually-assigned UUIDs insert rather than silently no-op as merges.
- **Async:** `AsyncConfig` enables `@Async`; synchronous `RestClient` calls the FastAPI biometric service (`BiometricServiceAdapter`).
- **Thread-safe in-memory fallbacks:** `ConcurrentHashMap` + `AtomicInteger`/`AtomicLong`, bounded with periodic cleanup and CAS guards, across rate-limit, anti-replay, and TOTP fallbacks.
- **Tenant context propagation:** `TenantContext` (thread-local) set by `TenantContextFilter`, re-bound from the JWT by `TenantBindFromAuthFilter`, enabled/disabled around repo calls by `TenantHibernateAspect`/`TenantFilterAspect`, with `TenantFilterBypass` (clears context + disables `tenantFilter`) for user-centric `/my` self-resolution under a foreign tenant scope.

---

## 11. Notable algorithms & design patterns

- **Hexagonal / ports-&-adapters** [CITE:cockburn-hexagonal] with **Domain-Driven value objects** [CITE:evans2003-ddd]; **microservices** split (this API ↔ FastAPI biometric processor over REST + `X-API-Key`) [CITE:richardson2018-microservices,newman2021-microservices].
- **Strategy + Registry** for both login (`AuthMethodHandler`/`AuthMethodHandlerRegistry`), MFA (`VerifyMfaStepHandler` injected as a `List` → `Map<AuthMethodType,…>` in `VerifyMfaStepService`), and the verification pipeline (`VerificationStepHandler`/`VerificationStepHandlerRegistry`).
- **Adapter** for every output port; **Dependency Inversion** throughout (application defines ports, infrastructure implements).
- **Token-bucket rate limiting** (Bucket4j) + Redis sliding-window counter.
- **PKCE S256** = `BASE64URL(SHA-256(verifier))`; **pairwise OIDC sub** = `base64url(SHA-256(sector|identityId|salt))`.
- **WebAuthn assertion validation** (rpIdHash SHA-256 compare, signCount monotonicity, explicit origin allowlist).
- **AES-GCM-256** TOTP-secret-at-rest encryption; **SHA-256** refresh-token hashing-at-rest.
- **RFC 8176 amr accumulation** for true N-factor evidence in the access token.
- **Saga-like transactional consume-then-mint** for MFA→OAuth code; **REQUIRES_NEW compensating commit** for family revocation.
- **Adaptive MFA engine** (SEQUENTIAL vs CHOICE steps, V30) — tenant-configurable flows.
- **Verification-pipeline step handlers (10):** `DocumentScanHandler`, `DataExtractHandler`, `FaceMatchHandler`, `LivenessCheckHandler`, `NfcChipReadHandler`, `AddressProofHandler`, `WatchlistCheckHandler`, `AgeVerificationHandler`, `PhoneVerificationHandler`, `VideoInterviewHandler`, driven by **5 industry templates** (`FINTECH_KYC`, `HEALTHCARE_BASIC`, `EDUCATION_AGE`, `TELECOM_ONBOARDING`, `SIMPLE_DOCUMENT`) in `ManageVerificationService`.

---

## 12. Testing (this module)

- **177 test source files**, **1586 `@Test`-annotated methods** in `src/test/java` (HEAD, 2026-06-05). (Module CLAUDE.md historically cited 633; the live count is higher.)
- **Levels:** JUnit 5 unit tests; Spring Boot slice/context tests; `spring-security-test`; **ArchUnit** boundary tests (`UserDomainBoundaryTest`, `WebAuthnRepoWriteBoundaryTest`); **Testcontainers** integration tests (`*IntegrationTest`, `*IT`) gated by `RUN_INTEGRATION=true`, run on a self-hosted CI runner.
- Integration cross-tenant-isolation ITs (`CrossTenantIsolationIT`, `TenantSwitcherIsolationIT`, `IdentityBiometricConsentIT`) are a CI gate; the local/sandbox box cannot run Testcontainers (no Docker socket) so ITs are verified via CI. [CITE:testcontainers]

---

## 13. Planned-but-absent / honesty flags

- **`GESTURE_LIVENESS`** exists conceptually as a FACE active-liveness sub-component but has **no auth handler** and is **not** a selectable login factor (never seeded).
- **Row-Level Security policies** (V25, etc.) were authored in SQL but found **INERT in production** — the operative tenant isolation is the Hibernate `@Filter` + `TenantScopeResolver`, not Postgres RLS.
- **OIDC pairwise subject** (`PairwiseSubjectResolver`) is shipped but **dormant** (flag default OFF; discovery advertises `subject_types_supported=public`).
- **Server-side fingerprint biometric** was **removed** (it was a SHA-256 placeholder); `FINGERPRINT` is delivered only via WebAuthn platform authenticator.
- **Face/voice embedding storage + HNSW pgvector search** is owned by the **biometric-processor**, not this Java service — `BiometricServiceAdapter` is a thin REST client; do not attribute the vector store to identity-core-api.
- **Config-driven identifier-first login engine** is gated by `ConfigDrivenLoginPolicy` and ships **OFF by default** (legacy password-first is byte-identical when off); rollout is dark → canary → global, reversible by an env flag with no redeploy.
