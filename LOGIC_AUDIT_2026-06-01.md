# FIVUCSAS Platform-Wide Logic-Correctness Audit

**Date:** 2026-06-01

## 1. Scope

This report documents a FIVUCSAS-wide logic-correctness audit conducted across five repositories at the following revisions: **identity-core-api** (`main` @ `e6d94e8`), **biometric-processor** (`main`), **web-app** (`main`), **client-apps** (`fix/mfa-request-retry-stale-connection`), and **spoof-detector** (`main`). The audit deployed 18 subsystem reviewers, each examining a distinct functional area (MFA engine, auth handlers, WebAuthn/passkey, OAuth/JWT tokens, tenancy isolation, RBAC/permissions, identity linking, lockout/rate-limit, enrollment/onboarding, auth-flow config login, Flyway migrations, guest/tenant management, face pipeline, liveness/anti-spoof, voice/NFC biometrics, web login, mobile login, and spoof detection). Every finding raised by a reviewer was then handed to an independent verification agent that re-read the cited source against the live revision and either confirmed, downgraded, or refuted the claim. Only adversarially-confirmed findings (plus two explicitly-flagged uncertain items) appear in the detailed sections below; refuted claims are catalogued in the appendix.

## 2. Methodology

The audit followed a three-stage pipeline:

1. **Fan-out review.** 18 reviewers each independently audited one subsystem for logic-correctness defects (not style, not coverage), citing exact `file:line` evidence and a proposed exploit/impact narrative.
2. **Adversarial verification.** Each finding was assigned to a separate agent with no stake in the original claim. That agent re-read the cited code and surrounding call chain from scratch, attempted to falsify the claim, and corrected severity where the original reviewer over- or under-stated impact.
3. **Disposition.** Findings were classified **confirmed** (verifier reproduced the defect from source), **uncertain** (defect plausible but unresolvable by code-only inspection, needs runtime/human confirmation), or **refuted** (verifier disproved the central failure mode).

### Counts

| Disposition | Count |
|---|---|
| Confirmed | 38 |
| Uncertain | 2 |
| Refuted | 4 |
| **Subsystem areas reviewed** | **18** |

## 3. Executive Summary — Confirmed Findings (severity-sorted)

| Severity | Repo | Area | Title | Location |
|---|---|---|---|---|
| Critical | identity-core-api | oauth-jwt-tokens | Refresh-token reuse-detection family revocation rolled back by enclosing transaction (no-op) | `RefreshTokenService.java:111-137` |
| Critical | identity-core-api | rbac-permissions | TENANT_ADMIN can assign global ROOT role → full platform-tier escalation | `ManageUserRoleService.java:44-79` |
| Critical | identity-core-api | lockout-ratelimit | Account lockout fully bypassable via identifier-first / MFA-step login path | `AuthenticateUserService.java:646-721` |
| Critical | identity-core-api | authflow-config-login | Config-driven login mints full session with ZERO factors verified (auth bypass) | `AuthenticateUserService.java:287-379` |
| High | identity-core-api | mfa-engine | `/auth/mfa/step` does not enforce submitted method belongs to current step's method set | `VerifyMfaStepService.java:249-316` |
| High | identity-core-api | auth-handlers | QR_CODE second-factor validated against wrong Redis store (always fail-closed) | `QrCodeVerifyMfaStepHandler.java:26-33` |
| High | identity-core-api | webauthn-passkey | User Verification (UV) flag never enforced — server accepts UP-only assertions | `WebAuthnService.java:324-363` |
| High | identity-core-api | oauth-jwt-tokens | OIDC id_token `aud` polluted with API's own audience (multi-aud, no `azp`) | `OAuth2Service.java:384-415` |
| High | identity-core-api | tenancy-isolation | Email-keyed caller resolution non-unique cross-tenant → NonUniqueResultException | `UserRepository.java:30-31` |
| High | identity-core-api | rbac-permissions | `canAssignRole` privilege-ceiling guard is dead code; weaker gate used | `RbacAuthorizationService.java:159-175` |
| High | identity-core-api | rbac-permissions | Admin `/users` update lets TENANT_ADMIN assign global ROOT role (48 perms) | `ManageUserService.java:489-506` |
| High | identity-core-api | identity-linking | All-methods biometric consent not a singleton (inverted UNIQUE comment) → revoke fails | `V68__...consent.sql:41-47` |
| High | identity-core-api | lockout-ratelimit | Per-account lockout counter never increments for password at MFA step | `PasswordVerifyMfaStepHandler.java:35-42` |
| High | identity-core-api | lockout-ratelimit | Admin-suspended / inactive users can still authenticate (no status gate at login) | `AuthenticateUserService.java:72-119` |
| High | identity-core-api | enrollment-onboarding | NFC re-enroll reactivates revoked card and silently reassigns ownership | `ManageNfcCardService.java:58-115` |
| High | identity-core-api | guest-tenant-mgmt | Guest invitation acceptance bypasses tenant `max_users` quota | `GuestLifecycleService.java:197-250` |
| High | biometric-processor | voice-nfc-bio | Voice verify uses non-normalized centroid → score shrinks below threshold with enrollment count | `voice.py:233-238` |
| Medium | identity-core-api | webauthn-passkey | Usernameless passkey cannot resolve credentials app's own UI registers | `WebAuthnUserHandle.java:41-58` |
| Medium | identity-core-api | tenancy-isolation | AuthFlow `@Filter` intersects to EMPTY for ROOT with mismatched active X-Tenant-ID | `ManageAuthFlowService.java:50-62` |
| Medium | identity-core-api | identity-linking | Method-specific consent REVOKE overridden by broad all-methods GRANT | `BiometricConsentService.java:118-132` |
| Medium | identity-core-api | enrollment-onboarding | Re-enrolling auto-complete method resurrects REVOKED enrollment to ENROLLED | `ManageEnrollmentService.java:114-152` |
| Medium | identity-core-api | authflow-config-login | `/auth/login/preflight` is an account-existence + tenant-disclosure oracle | `AuthController.java:168-187` |
| Medium | identity-core-api | flyway-migrations | Global UNIQUE on `users.email` blocks cross-tenant same-email memberships | `V7__add_performance_indexes.sql:8-12` |
| Medium | identity-core-api | flyway-migrations | DR-rebuilt audit_logs has no partition past 2026-07-01 (V57 fail-soft, V41 unscheduled) | `V40__partition_audit_logs.sql:124-135` |
| Medium | identity-core-api | guest-tenant-mgmt | Guest invite/accept ignores tenant status — guests can join SUSPENDED tenant | `GuestLifecycleService.java:94-134,197-250` |
| Medium | identity-core-api | guest-tenant-mgmt | accept-invite existing-email check is global, not tenant-scoped | `GuestLifecycleService.java:215-218` |
| Medium | biometric-processor | liveness-antispoof | `/verify` liveness floor compares 0–100 score against 0.4 → dead no-op | `verification.py:403-423` |
| Medium | biometric-processor | voice-nfc-bio | eMRTD passive auth never checks DS/CSCA certificate validity period | `emrtd_passive_auth.py:440-453` |
| Medium | client-apps | mobile-login | MFA-step retry on socket/read timeout resubmits consumed OTP/TOTP → false failure | `NetworkModule.kt:115-124` |
| Low | identity-core-api | mfa-engine | Optional skipped steps desynchronize `currentStep` | `AuthenticateUserService.java:287-330` |
| Low | identity-core-api | auth-handlers | VOICE verified-field parsing diverges (rejects string `"true"`) | `VoiceVerifyMfaStepHandler.java:31-34` |
| Low | identity-core-api | webauthn-passkey | Registration fallback stores raw attestationObject as public key → bricked credential | `WebAuthnEnrollment.tsx:227-229` |
| Low | identity-core-api | oauth-jwt-tokens | Expired-but-active OAuth2 client can still complete authorize/token | `OAuth2Service.java:86-95,301-303` |
| Low | biometric-processor | face-pipeline | Settings defaults pair Facenet (128-dim) with EMBEDDING_DIMENSION=512, no validator | `config.py:96-107,358` |
| Low | biometric-processor | voice-nfc-bio | SOD signature verification omits CMS content-type signed-attribute check | `emrtd_passive_auth.py:386-401` |
| Low | web-app | web-login | ApproveLoginPanel: APPROVED without token strands user in waiting state | `ApproveLoginPanel.tsx:138-149` |
| Low | web-app | web-login | ApproveLoginPanel: poll not stopped on APPROVED → duplicate onApproved | `ApproveLoginPanel.tsx:111-159` |
| Low | web-app | web-login | LoginMfaFlow STEP_COMPLETED with no remaining methods → empty MethodPicker dead-end | `LoginMfaFlow.tsx:408-424` |

---

## 4. Detailed Findings

### 4.1 identity-core-api

#### CRITICAL

##### [CRITICAL] Refresh-token reuse-detection family revocation is rolled back by the enclosing transaction (reuse-detection is a no-op)

**Location:** `src/main/java/com/fivucsas/identity/service/RefreshTokenService.java:111-137` (`verifyExpiration`), caller `application/service/RefreshAccessTokenService.java:31-52`

**The bug.** `verifyExpiration()` detects a replayed/revoked refresh token, calls `refreshTokenRepository.revokeFamily(familyId, now)` to revoke every token in the rotation family, then throws `TokenRevokedException`. That exception extends `DomainException` → `RuntimeException`. `verifyExpiration` is `@Transactional` (REQUIRED) and is invoked from `RefreshAccessTokenService.execute()`, which is also `@Transactional` (REQUIRED) — so both methods share one physical transaction. When the unchecked exception propagates out of `execute()` (which does not catch it and specifies no `noRollbackFor`), Spring marks the shared transaction rollback-only and rolls back the `revokeFamily` UPDATE. The family rows are therefore never actually revoked. The `REFRESH_TOKEN_REUSE_DETECTED` audit row, however, is written through `AuditLogPort.logSecurityEvent`, which is `@Transactional(REQUIRES_NEW)` and commits independently — so the audit log claims the family was revoked while the DB rows stay `is_revoked=false`.

**Impact.** RFC 6749 §10.4 / OAuth 2.0 Security BCP §4.13 refresh-token reuse-detection is defeated. After a stolen refresh token is detected as replayed, both the attacker's and the victim's tokens in the family remain valid and keep minting access tokens. The only surviving DB effect is a misleading audit row claiming the family was revoked. Expired-token cleanup (`refreshTokenRepository.delete` in the same method) is likewise rolled back (cosmetic only).

**Evidence.** The verifier confirmed: `verifyExpiration` is `@Transactional`, line 125 calls `revokeFamily`, line 133 throws `TokenRevokedException`; `execute()` is `@Transactional` and calls `verifyExpiration` on an injected bean (proxy exercised, same transaction) with no surrounding catch; `DomainException extends RuntimeException`; neither method sets `noRollbackFor`; `AuditLogAdapter.logSecurityEvent` is `REQUIRES_NEW`. The unit test `RefreshTokenFamilyRevocationTest` mocks the repository and calls `verifyExpiration` directly, so it only asserts `revokeFamily` was *called*, never that it *commits* — explaining why the defect was never caught.

**Suggested fix.** Annotate the reuse-detection branch (or `verifyExpiration`) with `@Transactional(noRollbackFor = TokenRevokedException.class)`, or — more robustly — perform the family revocation in a `REQUIRES_NEW` transaction that commits before the `TokenRevokedException` is thrown, mirroring how the audit row is already persisted. Add an integration (Spring-context) test that asserts `is_revoked=true` on the family rows after a detected reuse, not just that the repository method was invoked.

##### [CRITICAL] TENANT_ADMIN can assign the global ROOT role to any user → full platform-tier escalation to ROOT

**Location:** `src/main/java/com/fivucsas/identity/application/service/ManageUserRoleService.java:44-79`; endpoint `RoleController.java:194`; adapter `UserTypeElevationAdapter.java:41-86`

**The bug.** `POST /api/v1/users/{userId}/roles/{roleId}` is gated only by `@PreAuthorize("@rbac.hasPermission('user_role:assign')")`. In `RbacAuthorizationService.hasPermission` (lines 70-73) a TENANT_ADMIN receives an implicit `true` for any permission that is not a *system* permission, and `isSystemPermission` (lines 189-194) matches only `system:*` or `tenant:create` — so `user_role:assign` is implicitly granted to every TENANT_ADMIN. `assignRoleToUser` then performs **no** tenant-scope check on the target user and **no** privilege-ceiling check on the role; it accepts any `roleId`, including the well-known global ROOT role UUID `10000000-0000-0000-0000-000000000001`. It calls `userTypeElevationPort.elevateForGrantedRole(...)`, and `UserTypeElevationAdapter.tierForRole` maps that role to `UserType.ROOT` and sets `users.user_type=ROOT`. `user_type=ROOT` bypasses *all* permission checks. The purpose-built guard `RbacAuthorizationService.canAssignRole` — which would restrict this — is dead code (zero callers).

**Impact.** Any TENANT_ADMIN (or any account holding `user_role:assign`) can promote any user — including a controlled account — to `user_type=ROOT`, the cross-tenant platform-owner tier that bypasses every permission and tenant-scope check. This is a complete vertical privilege escalation and cross-tenant compromise from a single tenant-admin account. V76 does not mitigate it: the implicit-access bypass never consults the role's grant list.

**Evidence.** Verifier confirmed the full chain: `RoleController.java:194` single gate; implicit TENANT_ADMIN bypass at `RbacAuthorizationService:70-73`; `isSystemPermission` does not match `user_role:assign`; no scope/ceiling check in `ManageUserRoleService`; `UserTypeElevationAdapter:78-81` maps `ROOT_ROLE_ID` → `UserType.ROOT` and line 62 saves it; `hasPermission:57-61` returns `true` unconditionally for ROOT; `grep canAssignRole` returns only its definition. V25 leaves `FORCE ROW LEVEL SECURITY` commented out, so RLS does not compensate.

**Suggested fix.** Replace the `@PreAuthorize` on the assign endpoint with `@rbac.canAssignRole(#roleId)` **and** implement a real privilege-ceiling inside `canAssignRole` (reject when the target role is a system/global role or maps to a tier ≥ the caller's). Additionally, `ManageUserRoleService.assignRoleToUser` should reject any role whose `tier` exceeds the caller's tier and should not invoke `elevateForGrantedRole` for roles the caller cannot themselves hold.

##### [CRITICAL] Account lockout fully bypassable via the identifier-first / MFA-step login path

**Location:** `src/main/java/com/fivucsas/identity/application/service/AuthenticateUserService.java:646-721` (`beginIdentifierLogin`) vs `:95-118` (lock gate only in `execute`)

**The bug.** The `user.isLocked()` gate (plus auto-unlock and `AccountLockedException`) exists only in the password-first `execute()` method. The second login entry point `beginIdentifierLogin()` (`POST /auth/login/begin`) opens an `MfaSession` at step 1 with no lock check, and `VerifyMfaStepService.execute()` (`POST /auth/mfa/step`) loads the user via `findById` and completes/mints tokens with no lock check either. A user locked out by the 5-strike counter can simply switch to the identifier-first entry point, complete the same flow (even a PASSWORD step — `PasswordVerifyMfaStepHandler` never touches `failedLoginAttempts`/`isLocked`), and authenticate.

**Impact.** NIST 5-strike account lockout provides zero protection. After locking an account, an attacker continues brute-forcing the password (or any factor) through `/auth/login/begin` + `/auth/mfa/step`, throttled only by the per-IP 30/min MFA-step bucket (rotatable across IPs). Brute-forcing this path also never increments `failedLoginAttempts`, so a new lockout never triggers. The lockout the user sees on `/auth/login` is security theater. Live in prod: `.env.prod` sets `APP_AUTH_CONFIG_DRIVEN_LOGIN=true`, so the begin path is reachable for every tenant.

**Evidence.** Verifier confirmed: lock gate exists only at `execute():95-118`; absent from `beginIdentifierLogin():646-721` and `VerifyMfaStepService.execute():134-340` (grep for `isLocked`/`getLockedUntil`/`AccountLockedException` returns zero hits in the MFA service); `PasswordVerifyMfaStepHandler.verify` does pure `checkPassword` with no counter mutation. `ConfigDrivenLoginPolicy.isEnabledFor()` returns `true` for all tenants with the global flag on.

**Suggested fix.** Centralize the account-state gate (lock, suspended, inactive) into a single method invoked by **all three** entry points: `execute()`, `beginIdentifierLogin()`, and `VerifyMfaStepService.execute()` (checked after `findById`). Increment `failedLoginAttempts` / call `lockAccount()` on every failed factor in `VerifyMfaStepService` (or in each handler), so the strike counter is path-independent.

##### [CRITICAL] Config-driven login mints a full session with ZERO factors verified when Layer-1 step is optional + non-enrollment (auth bypass)

**Location:** `src/main/java/com/fivucsas/identity/application/service/AuthenticateUserService.java:287-379`

**The bug.** In the config-driven branch of `execute()`, when the tenant's default APP_LOGIN flow has a non-PASSWORD Layer-1 (`layer1IsPassword==false`, so no password is checked at line 203), the remaining-steps filter (lines 295-299) keeps a step only if `step.isRequired() || stepHasBiometricEnrollment(...)`. `stepHasBiometricEnrollment` counts only methods with `requires_enrollment=true`, and EMAIL_OTP is seeded `requires_enrollment=false` (V16:213). So if step 1 is EMAIL_OTP and marked optional (`isRequired=false`), step 1 is filtered out of `remainingSteps`. If no later step survives, `remainingSteps` is empty, the `if (!remainingSteps.isEmpty())` block is skipped, and control falls through to lines 369-379 which mint a real access+refresh token via `AuthenticationResponse.of(...)` — having verified no password and no OTP. The sibling `beginIdentifierLogin()` guards this exact case with `step.getStepOrder() == 1 ||` (line 680); `execute()` is missing that guard, and `createFlow`/`validateFirstStepStructure` never force step 1 to be required.

**Impact.** Complete authentication bypass. Anyone who submits `POST /auth/login` with a valid email (any/empty password) at a config-driven tenant whose default flow has an optional, non-enrollment Layer-1 (e.g. optional EMAIL_OTP first step) receives a fully authenticated JWT + refresh token without proving any factor. The config-driven engine is globally ON in prod (`APP_AUTH_CONFIG_DRIVEN_LOGIN=true`), so this is live for every tenant.

**Evidence.** Verifier traced line-by-line: password check skipped at line 203 when `layer1IsPassword=false`; filter drops optional non-enrollment step; empty `remainingSteps` skips the MFA-session block; lines 373-379 mint tokens unconditionally with `amrFor(layer1Methods)` falsely claiming the factor was verified. `beginIdentifierLogin:680` has the `getStepOrder() == 1` guard that `execute()` lacks. `validateFirstStepStructure:347-382` does not enforce `isRequired=true` on step 1.

**Suggested fix.** Add the `step.getStepOrder() == 1 ||` clause to the `execute()` remaining-steps filter so step 1 always survives, mirroring `beginIdentifierLogin`. Additionally enforce in `validateFirstStepStructure` that the first step must be `isRequired=true`. As defense-in-depth, never mint a session when `remainingSteps` is empty *and* no factor (password or otherwise) was actually verified — treat that as an internal error, not a success.

#### HIGH

##### [HIGH] `/auth/mfa/step` does not enforce that the submitted method belongs to the current step's configured method set

**Location:** `src/main/java/com/fivucsas/identity/application/service/mfa/VerifyMfaStepService.java:249-316`

**The bug.** After session lookup and the tenant-level policy check, the service resolves the current step's allowed methods into `currentStepMethodNames` but uses it only for the same-method reuse guard and for response bodies. It never rejects a submitted `methodType` that is not one of the current step's configured `availableMethods`. The only gates before `handler.verify(...)` are (a) `tenantAuthMethodPolicy.isLoginMethodAllowedForTenant` (tenant-wide, not step-scoped) and (b) the substitution guard, which only blocks methods *already completed*. A method that is tenant-enabled, not yet completed, but not part of the current step still reaches its handler and, on success, calls `session.addCompletedMethod` + `session.advanceStep()`. By contrast, `/auth/mfa/switch-method` *does* enforce step membership via `permitted.contains(requestedType)` (`AuthController.java:930`), so the two entry points disagree.

**Impact.** A logged-in-mid-flow user can satisfy a step with a method the tenant's flow did not configure for that step. A flow whose step 2 requires FACE (or TOTP) can be advanced by submitting EMAIL_OTP: the attacker self-triggers the code via `POST /auth/mfa/send-otp` (also unscoped to the step) and completes it. This defeats the tenant-configured per-step factor policy. Exploitation is bounded to factors the user is actually enrolled in, so it is a policy/assurance bypass within a user's own factors rather than third-party impersonation.

**Evidence.** Verifier confirmed three gates before `handler.verify` (line 173 handler existence, line 185 tenant-wide policy, lines 256-266 reuse guard) and that the reuse guard fires only when `completedMethods.contains(reuseKey) && !submittedMethodIsExpectedAtCurrentStep` — so a not-yet-completed off-step method evaluates `false && true = false` and falls through. No `if (!currentStepMethodNames.contains(reuseKey)) { reject; }` exists. `resolveCurrentStepMethodNames` (451-470) reads the correct step methods but its result is used only for response bodies.

**Suggested fix.** Before dispatching to `handler.verify`, reject (HTTP 409 `METHOD_NOT_PERMITTED`) any submitted method not in `currentStepMethodNames` (plus the configured `fallbackMethod`), exactly as `/auth/mfa/switch-method` already does. Scope `/auth/mfa/send-otp` to the current step's method set as well.

##### [HIGH] QR_CODE second-factor validated against the wrong Redis store on the LIVE MFA path — token can never match

**Location:** `src/main/java/com/fivucsas/identity/application/service/mfa/handler/QrCodeVerifyMfaStepHandler.java:26-33`

**The bug.** The QR token presented as a 2FA step is generated by `QrCodeService.generateToken(userId)`, which stores it in Redis keyed **by token**: `qr:token:<token>` = userId. But `QrCodeVerifyMfaStepHandler.verify` validates it with `otpService.validate("2fa-qr:" + user.getId(), token)` — reading a different OTP store keyed **by user** (`2fa-qr:<userId>`) and string-comparing the stored value to the token. Nothing in the codebase ever writes key `2fa-qr:<userId>` (grep confirms `2fa-qr:` appears only at two validate call sites and zero generate sites). So `otpService.validate` always sees a null stored value and returns false. The legacy `QrCodeAuthHandler.validate` does it correctly via `qrCodeService.validateToken(qrToken, userId)`.

**Impact.** QR_CODE as a configured 2FA/MFA step on the live hosted-login path can never succeed. Any tenant flow that includes QR_CODE as a step permanently locks users out of that factor (they must switch method). It fails closed (not a security hole) but is a hard functional break of an advertised auth method. The same defect exists in the legacy `AuthController` `/2fa/verify-method` QR_CODE branch (`AuthController.java:670-673`).

**Evidence.** Verifier confirmed generation writes `qr:token:<token>` (QrCodeService.java:29-30), validation reads `2fa-qr:<userId>` (handler line 31, also AuthController.java:672), full grep of `2fa-qr:` returns only the two validate sites, and the correct direction exists only in `QrCodeAuthHandler.java:41`.

**Suggested fix.** Change both `QrCodeVerifyMfaStepHandler.verify` and the legacy `/2fa/verify-method` branch to call `qrCodeService.validateToken(token, user.getId())` (token-keyed lookup with userId equality), matching the generation path and the legacy `QrCodeAuthHandler`. Add a unit/integration test that generates a QR token via `QrCodeService` and verifies it through the MFA-step handler end-to-end.

##### [HIGH] User Verification (UV) flag never enforced — passkey path declares `userVerification="required"` but server accepts UP-only assertions

**Location:** `src/main/java/com/fivucsas/identity/infrastructure/webauthn/WebAuthnService.java:324-363`

**The bug.** `validateAuthenticatorData()` checks only the User Present bit (`flags & 0x01`) and never the User Verified bit (`flags & 0x04`). Both the usernameless passkey options (`DeviceController:529` sets `userVerification:"required"`) and the register-options ceremony (`DeviceController:290`) demand UV=required, but the assertion verifier never enforces that UV was actually performed. Grep for `0x04`/`userVerified` returns nothing across `verifyAssertion`, `passkeyAuthenticate`, and `authenticate`.

**Impact.** A discoverable passkey satisfying only a presence test (touch, no PIN/biometric) is accepted as a full single-factor login by the anonymous, token-minting `POST /api/v1/webauthn/passkey/authenticate` endpoint (`permitAll`, SecurityConfig 120-123). The factor that was supposed to require user verification degrades to user-presence only — a stolen/unlocked authenticator or a roaming key left plugged in can mint a session without the second-factor proof the policy promised. Per WebAuthn Level 2 §7.2 step 17, the relying party MUST independently verify the UV bit when it requested UV=required.

**Evidence.** Verifier confirmed `validateAuthenticatorData` returns `true` immediately after UP is set; UV bit `0x04` is never inspected anywhere in the package (exhaustive grep); both passkey endpoints are `permitAll`. The cryptographic signature and public-key checks are present and correct, which is why severity is high rather than critical.

**Suggested fix.** In `validateAuthenticatorData` (or `verifyAssertion`), when the ceremony requested `userVerification=required`, reject the assertion unless `(flags & 0x04) != 0`. Thread the requested UV level from the stored challenge/options into the verifier so the requirement is enforced per-ceremony rather than hard-coded.

##### [HIGH] OIDC id_token `aud` claim is polluted with the API's own audience (multi-aud id_token without `azp`)

**Location:** `src/main/java/com/fivucsas/identity/application/service/OAuth2Service.java:384-415` (id_token build); `security/JwtService.java:283-285` (audience append)

**The bug.** `exchangeCode()` builds id_token claims with `idTokenClaims.put("aud", clientId)` (the relying party) and signs via `jwtService.generateToken(...)` → `buildToken()`. `buildToken()` unconditionally appends the API's own audience with `builder.audience().add(expectedAudience)` (`fivucsas-api` in prod). In JJWT 0.12.6, `audience().add()` reads any pre-existing single-string `aud`, converts it into the audience set, then appends — so the id_token carries `aud = {clientId, "fivucsas-api"}` with no `azp` claim.

**Impact.** Per OIDC Core §3.1.3.7, a relying party MUST reject an id_token whose `aud` contains an untrusted audience, and when multiple audiences are present an `azp` claim is REQUIRED (and is absent here). Strict OIDC clients (most off-the-shelf libraries) will reject the id_token, breaking hosted-login interop. It also collapses the access-token vs id_token audience separation: the id_token now satisfies the API's own `requireAudience("fivucsas-api")` check, so the only thing distinguishing it from an access token at `/userinfo` is the `type` claim.

**Evidence.** Verifier disassembled JJWT 0.12.6 `DelegatingClaimsMutator`/`DefaultCollectionMutator`: `.claims(map)` stores `clientId` via `audienceSingle`, then `.audience().add("fivucsas-api")` reads it back into a `LinkedHashSet` and appends, yielding `[clientId, "fivucsas-api"]`. No `azp` set anywhere; every `exchangeCode()` takes this path (no flag/profile gate). `OAuth2ServiceTest` mocks `generateToken` so the merge is never exercised.

**Suggested fix.** Generate the id_token through a dedicated path that does **not** append the API audience — set `aud` to exactly `clientId` and add `azp=clientId`. Either give `buildToken` an overload/flag that suppresses the API-audience append for id_tokens, or build the id_token with a separate JJWT builder that sets the audience once. Add a test asserting the decoded id_token's `aud` equals `[clientId]` and `azp == clientId`.

##### [HIGH] Email-keyed caller resolution is globally unique-by-email but the DB only guarantees uniqueness per (tenant_id, email) → NonUniqueResultException

**Location:** `src/main/java/com/fivucsas/identity/repository/UserRepository.java:30-31`

**The bug.** `findByEmail` is `@Query("SELECT u FROM User u WHERE u.email = :email AND u.deletedAt IS NULL")` returning `Optional<User>`, with no tenant predicate and no LIMIT. Both `CustomUserDetailsService.loadUserByUsername` and `RbacAuthorizationService.getCurrentUser` call this inside `tenantFilterBypass.runWithoutTenantFilter(...)`, which deliberately disables the Hibernate `tenantFilter`. With the filter disabled, if the same email exists in two tenants the query matches both rows → Spring Data raises `IncorrectResultSizeDataAccessException`/`NonUniqueResultException`.

**Impact.** Any user whose email exists in two or more tenants cannot authenticate or be authorized: `loadUserByUsername` throws during login (500/auth failure), and every authenticated request through `getCurrentUser()` (the `@PreAuthorize`/RBAC hot path) throws → 500 instead of a permission decision. The filter bypass was added to fix the ROOT tenant-switcher 403, but it removed the only thing that disambiguated cross-tenant duplicate emails. The identity-linking V67 backfill notes confirm `glsm.2212@gmail.com` already maps to 1 identity / 2 user rows across tenants in prod.

> **Note on apparent tension with the V7 global unique index** (see the refuted appendix item and the V7 migration finding below): the schema *intends* per-tenant uniqueness for identity-linking, but V7 also created a global partial unique index on `email`. The identity-linking layer operates on pre-existing rows; the verifier here confirmed at least one prod email already has two active rows across tenants, so the multi-row failure mode is reachable for those already-linked accounts. This finding and the V7 finding should be reconciled together as a single schema-vs-feature contradiction.

**Evidence.** Verifier confirmed `findByEmail` has no tenant predicate/LIMIT; `TenantFilterBypass.runWithoutTenantFilter` disables the filter and clears `TenantContext`; both hot-path callers use the bypass; schema enforces only `(tenant_id, email)`; prod already contains a 2-active-row email.

**Suggested fix.** Resolve the architectural contradiction first (decide whether email is globally unique or per-tenant). If per-tenant is the intended model, change the email-keyed lookups to return `List<User>` and have callers select deterministically (e.g. by active tenant context, or the user's `identity_id` home tenant), or add a `LIMIT 1`/`DISTINCT ON` strategy with explicit precedence. Do not rely on the tenant filter being active in code paths that intentionally bypass it.

##### [HIGH] `canAssignRole` privilege-ceiling guard is dead code; assign-role endpoint uses the weaker `hasPermission` gate

**Location:** `src/main/java/com/fivucsas/identity/security/RbacAuthorizationService.java:159-175`

**The bug.** `canAssignRole(UUID roleId)` is the only method encoding the intended rule "Only ROOT and TENANT_ADMIN can assign roles; TENANT_ADMIN cannot assign ROOT-level roles" (per its own Javadoc). A grep of the whole `src/main` tree shows it is referenced by no `@PreAuthorize` and no service. The live assign endpoint instead uses `@rbac.hasPermission('user_role:assign')`, which (a) is implicitly granted to every TENANT_ADMIN and (b) carries no role-id ceiling. Moreover, `canAssignRole`'s own body never uses its `roleId` argument — it delegates straight to `hasPermission(...)`, so even if it were wired it would not enforce the ceiling.

**Impact.** The intended privilege-ceiling invariant for role assignment is silently absent at runtime; the system behaves as if any role (including ROOT) is assignable by a TENANT_ADMIN. This is the direct enabler of the critical ROOT-escalation finding above.

**Evidence.** Verifier confirmed `canAssignRole` appears only at its definition; the endpoint uses `hasPermission('user_role:assign')`; `canAssignRole` loads and discards `roleId`; `ManageUserService.applyRoleIds` is a partial compensating control for *other-tenant* roles but the ROOT role has `tenant_id IS NULL` and is treated as accessible, and that path is not exercised by the direct `POST .../roles/{roleId}` endpoint anyway.

**Suggested fix.** Implement a real ceiling in `canAssignRole` (load the role, reject system/global roles and any role whose tier ≥ caller's), wire the assign endpoint to `@rbac.canAssignRole(#roleId)`, and delete or repurpose the unused method to avoid future confusion.

##### [HIGH] Admin `/users` update path lets a TENANT_ADMIN assign the global ROOT role definition (grants all 48 permissions)

**Location:** `src/main/java/com/fivucsas/identity/application/service/ManageUserService.java:489-506`

**The bug.** `applyRoleIds` validates that a scoped (non-ROOT) caller may only assign roles accessible to them, but defines accessible as `roleTenantId == null || (callerScope != null && callerScope.equals(roleTenantId))`. Global/system role *definitions* have `tenant_id IS NULL` — including the renamed global ROOT role (V69/V71), which holds all 48 permissions. So a TENANT_ADMIN editing a user via `PUT /api/v1/users/{id}` can attach the ROOT role to that user. This path deliberately skips elevate-on-grant (so `user_type` stays put), but `loadUserAuthorities` still emits `ROLE_ROOT` + every permission authority for that user.

**Impact.** A TENANT_ADMIN can grant the platform's most powerful (global, all-48-permission) role to an arbitrary user. Even without the `user_type` bump, that user gains every permission-based capability cross-tenant (e.g. `audit:read`, all `hasAuthority(...)`-gated and `@rbac.hasPermission(...)` endpoints) — a serious over-grant distinct from, and broader than, the V76-stripped role grants. The `@rbac.isRoot()` hard gates (tenant delete/suspend/purge) remain intact, which is why this is high rather than critical.

**Evidence.** Verifier confirmed the accessibility check treats `tenant_id IS NULL` (ROOT role) as accessible; `loadUserAuthorities` emits `ROLE_ROOT` + all 48 permission authorities; `applyUserType` is ROOT-only so `user_type` is unchanged; `@rbac.isRoot()` checks `user_type`, not role name, so those gates still hold.

**Suggested fix.** In `applyRoleIds`, treat `tenant_id IS NULL` system/global roles as **not** assignable by scoped callers (require ROOT to assign any global role), and explicitly blacklist the ROOT role UUID for non-ROOT callers. Align this rule with the centralized `canAssignRole` ceiling so both the direct role endpoint and the `/users` update path share one enforcement point.

##### [HIGH] All-methods biometric consent (method=NULL) is not a singleton — inverted UNIQUE-constraint comment lets duplicate NULL rows exist; revoke then fails

**Location:** `src/main/resources/db/migration/V68__create_identity_tenant_biometric_consent.sql:41-47`; service `BiometricConsentService.java:73-81`

**The bug.** The migration relies on `UNIQUE (identity_id, tenant_id, method)` to guarantee at most one all-methods (`method IS NULL`) consent row per (identity, tenant). The inline comment claims "Postgres treats NULLs as DISTINCT in a UNIQUE constraint, so at most ONE row may exist with method = NULL" — the reasoning is inverted. PostgreSQL's default is `NULLS DISTINCT` (no `NULLS NOT DISTINCT` clause present), so two rows `(identity, tenant, NULL)` are both permitted (`NULL <> NULL`). `setConsent()` does a non-atomic read-then-write: it calls `findByIdentityIdAndTenantIdAndMethod(..., null)`, and if empty builds + saves a new row with no DB guard. Two concurrent grant-ALL requests both see empty and both insert.

**Impact.** (1) Broken revoke / default-DENY-after-revoke: once two granted NULL rows exist, a later revoke-ALL updates only one, leaving a second `granted=true` all-methods row, so a tenant the person tried to revoke keeps cross-tenant biometric verify access. (2) Every subsequent grant/revoke-ALL for that pair calls `findByIdentityIdAndTenantIdAndMethod(..., null)` which now matches two rows → `IncorrectResultSizeDataAccessException` (HTTP 500), permanently wedging consent management for that pair.

**Evidence.** Verifier confirmed the constraint lacks `NULLS NOT DISTINCT`; PostgreSQL default allows multiple NULL-method rows; the read-then-write has no SELECT-FOR-UPDATE/advisory lock; the repository returns `Optional` and throws on two rows; the JPA `@UniqueConstraint` mirror does not add `NULLS NOT DISTINCT` (and JPA has no such attribute).

**Suggested fix.** Replace the constraint with either `UNIQUE NULLS NOT DISTINCT (identity_id, tenant_id, method)` (PostgreSQL 15+) or keep the existing constraint and add a partial unique index `CREATE UNIQUE INDEX ... ON ... (identity_id, tenant_id) WHERE method IS NULL`. De-duplicate existing rows in the same migration. Make `setConsent` upsert atomic (e.g. `INSERT ... ON CONFLICT DO UPDATE`).

##### [HIGH] Per-account lockout counter never increments for a password verified at an MFA step

**Location:** `src/main/java/com/fivucsas/identity/application/service/mfa/handler/PasswordVerifyMfaStepHandler.java:35-42`

**The bug.** `PasswordVerifyMfaStepHandler.verify()` calls `user.checkPassword(...)` and returns ok/fail, but does not call `user.incrementFailedLoginAttempts()` / `lockAccount()` on a wrong password, nor does `VerifyMfaStepService` do so on a failed step. Only `AuthenticateUserService.execute()` (the legacy `/auth/login` path) increments the counter and locks at `MAX_FAILED_ATTEMPTS=5`. Any password check through `/auth/mfa/step` (the live config-driven path, and any flow with PASSWORD as a non-Layer-1 step) bypasses the strike counter entirely.

**Impact.** Online password guessing through the MFA-step path never trips the 5-strike lockout and never sets `lockedUntil`, so the account is never locked regardless of how many wrong passwords are submitted. This defeats the NIST 800-63B online-guessing throttle for the config-driven login surface; only the coarse 30/min/IP MFA-step rate limit remains.

**Evidence.** Verifier confirmed `PasswordVerifyMfaStepHandler.verify` does pure `checkPassword` with no mutation; `VerifyMfaStepService:297-312` on `!result.valid()` only logs/audits; `AuthenticateUserService:203-233` is the only place `incrementFailedLoginAttempts`/`lockAccount` are called, gated behind `layer1IsPassword`. The handler's own Javadoc confirms PASSWORD is a valid later-step reauth method in production.

**Suggested fix.** Move the strike-counter logic into a shared component invoked on every failed factor in `VerifyMfaStepService` (or have `PasswordVerifyMfaStepHandler` increment on failure and reset on success), so the lockout is enforced regardless of which login path exercises the password.

##### [HIGH] Admin-suspended / inactive users can still authenticate (no user-status gate at login)

**Location:** `src/main/java/com/fivucsas/identity/application/service/AuthenticateUserService.java:72-119`; `User.java:543-578`

**The bug.** The login path gates on tenant status (`TenantStatus.ACTIVE`) and on `user.isLocked()`, but never on the user's own status. `User.suspend()` sets `status=SUSPENDED, isActive=false` but leaves `isLocked=false`; `deactivate()` sets `INACTIVE`. `findByEmail`/`findById` filter only `deleted_at IS NULL`, so SUSPENDED/INACTIVE rows are returned. Neither `execute()`, `beginIdentifierLogin()`, nor `VerifyMfaStepService` calls `user.isActive()`/`isSuspended()`/checks status. Additionally, `JwtAuthenticationFilter` builds the authentication token without checking `userDetails.isEnabled()`, so even a suspended user's existing JWT is accepted on subsequent calls.

**Impact.** A user an admin suspended for security/compliance (or deactivated) can continue to log in and mint tokens through every login path. Suspension/deactivation is non-enforcing — only soft-delete actually blocks login (via the SQL restriction). The one correct gate (`PasswordAuthHandler.validate` `if (!user.isActive())`) lives in the legacy session path that the modern `/auth/login` flow bypasses entirely.

**Evidence.** Verifier confirmed no status check in `execute()`, `VerifyMfaStepService.execute()`, or `RefreshAccessTokenService.execute()`; `CustomUserDetailsService.isUserActive()` correctly sets `enabled=false` for SUSPENDED but `JwtAuthenticationFilter` never consults `isEnabled()`; `User.suspend()` leaves `isLocked=false`; grep finds zero `user.isActive`/`isSuspended`/`getStatus` call sites in login-path services.

**Suggested fix.** Add a single user-status gate (reject non-ACTIVE status with a clear error) to the centralized account-state check used by all login entry points, and make `JwtAuthenticationFilter` reject tokens whose `userDetails.isEnabled() == false`.

##### [HIGH] NFC re-enroll reactivates a revoked card and silently reassigns it to an arbitrary user

**Location:** `src/main/java/com/fivucsas/identity/application/service/ManageNfcCardService.java:58-115`

**The bug.** `enrollCard()` rejects only when an **active** card with the serial exists. It then looks up any card with that serial via `findByCardSerialAndTenantId`; since the active case already returned CONFLICT, any row found here is necessarily inactive/revoked. The branch then unconditionally calls `existing.activate()` (sets `isActive=true`, clears `revokedAt`) + `existing.setUser(targetUser)` + `existing.setEnrolledAt(now)` — reactivating a deliberately-deactivated credential and re-pointing its ownership to the caller-chosen `targetUserId`. There is no prior-owner check and no honoring of the prior revocation. The endpoint is only `@PreAuthorize("isAuthenticated()")` and accepts an arbitrary `userId` in the body.

**Impact.** A revoked NFC card (e.g. a lost/stolen card an admin deactivated) can be re-enrolled by any authenticated user in the tenant and reassigned to any `userId` they choose, flipping `is_active` back to true and clearing `revoked_at`. The intentional revocation is silently undone and the physical credential is transferred without authorization. Since NFC_DOCUMENT is an MFA factor, this re-arms a credential that was meant to be dead. (Cross-*tenant* reassignment is blocked by the tenant filter, which is why the verifier scoped this to intra-tenant; the revocation bypass + unauthorized intra-tenant ownership transfer remains.)

**Evidence.** Verifier confirmed the active-only conflict check passes through for inactive rows; lines 85-90 unconditionally `activate()` + `setUser` + reset `enrolledAt`; `NfcCard.activate()` clears `revokedAt`; the endpoint is only `isAuthenticated()`; the `userRepository.findById` is tenant-filtered (so cross-tenant is blocked) but no prior-owner assertion exists.

**Suggested fix.** Refuse to reactivate a revoked card automatically: require an explicit re-authorization (admin permission such as `nfc:enroll`/`device:write`) and assert that `targetUser` equals the card's prior owner unless a privileged caller explicitly transfers it. Gate the endpoint behind a proper permission rather than bare `isAuthenticated()`.

##### [HIGH] Guest invitation acceptance bypasses the tenant `max_users` quota

**Location:** `src/main/java/com/fivucsas/identity/application/service/GuestLifecycleService.java:197-250`

**The bug.** `acceptInvitation()` creates a real `users` row (`userType(GUEST)`, `status(ACTIVE)`) and saves it via `userRepository.save(...)` with no check against `tenant.max_users`. The normal registration path (`RegisterUserService.register:134-148`) enforces this gate (`countByTenantId >= getMaxUsers()` → `TenantUserQuotaExceededException`). The guest path has no equivalent, and `createInvitation()` performs no quota pre-check either.

**Impact.** A tenant can be pushed past its licensed user cap simply by inviting + accepting guests. Guest accounts count toward `countByTenantId` (they are ordinary `users` rows) yet none are gated, so the license ceiling is unenforceable whenever guests are used — re-opening the documented P0-#7 quota invariant for the guest path.

**Evidence.** Verifier confirmed `acceptInvitation` saves the guest user with no `countByTenantId`/`getMaxUsers` call; `countByTenantId` is called only in `RegisterUserService`, `ManageUserService`, and a read-only display in `ManageTenantService`; no AOP aspect compensates.

**Suggested fix.** Add the same quota gate (`countByTenantId >= getMaxUsers()` → `TenantUserQuotaExceededException`) to `acceptInvitation()` (and ideally a pre-check in `createInvitation()` so invitations are not issued that cannot be honored).

#### MEDIUM

##### [MEDIUM] Usernameless passkey login cannot resolve credentials the app's own UI registers (userHandle byte-length + discoverable mismatch)

**Location:** `src/main/java/com/fivucsas/identity/infrastructure/webauthn/WebAuthnUserHandle.java:41-58`

**The bug.** `decodeToUserId()` requires the handle to decode to exactly 16 bytes (returns null otherwise). But the only passkey-registration path actually invoked by the web UI is the legacy `/webauthn/register/options/{userId}` + `/webauthn/register/verify` pair, which (a) sets the browser `PublicKeyCredentialUserEntity.id` to `new TextEncoder().encode(options.userId)` — a 36-byte ASCII UUID string, not the 16 raw bytes `WebAuthnUserHandle.encode()` produces — and (b) stores the credential with `discoverable=false`, `userHandle=null`. The discoverable-aware endpoints that set the correct 16-byte handle (`/webauthn/register-options` + `/webauthn/register`) have no front-end caller.

**Impact.** Every credential created through the live dashboard returns a 36-byte userHandle on a usernameless assertion, so `decodeToUserId()` returns null and `passkeyAuthenticate()` rejects with 401. The advertised cross-device/usernameless passkey login (V72/PR #161) is non-functional for credentials the platform itself enrolls; it only works for resident keys created out-of-band against the unused discoverable endpoints. (Email+password fallback is unaffected, hence medium.)

**Evidence.** Verifier confirmed `WebAuthnEnrollment.tsx:156` calls the legacy options endpoint; the new `WEBAUTHN_REGISTER_SELF*` constants have zero callers; legacy options return only `userId` (36-char); line 180 uses `TextEncoder().encode(options.userId)` (36 bytes); legacy verify stores no `userHandle`/`discoverable`; the new handler correctly sets both but is never called; `decodeToUserId` rejects non-16-byte handles.

**Suggested fix.** Repoint `WebAuthnEnrollment.tsx` at the discoverable endpoints (`WEBAUTHN_REGISTER_SELF_OPTIONS`/`WEBAUTHN_REGISTER_SELF`, already defined in `constants.ts`) and use the server-provided `userHandle` from the options object as `PublicKeyCredentialUserEntity.id` instead of `TextEncoder().encode(options.userId)`.

##### [MEDIUM] AuthFlow `@Filter(tenantFilter)` intersects to EMPTY against the path tenant for a ROOT whose active X-Tenant-ID differs → spurious 404 / empty list

**Location:** `src/main/java/com/fivucsas/identity/application/service/ManageAuthFlowService.java:50-62`

**The bug.** AuthFlow endpoints are path-scoped (`/api/v1/tenants/{tenantId}/auth-flows`) and authorize via `@PreAuthorize("@rbac.canAccessTenant(#tenantId)")` (true for ROOT against any tenant). The service queries by the **path** tenant (`findByIdAndTenantId`/`findAllByTenantId`). But `AuthFlow` carries `@Filter(name="tenantFilter", condition="tenant_id = :tenantId")` driven by the **active** X-Tenant-ID. When a ROOT has tenant A selected (filter=A) but requests path tenant B, the SQL becomes `... AND tenant_id = B AND tenant_id = A` → matches nothing.

**Impact.** A ROOT authorized to read/edit tenant B's auth-flows gets a spurious 404 (`getFlow`/`updateFlow`/`deleteFlow`/`computeDefaultImpact`) or empty list (`listFlows`) whenever their active X-Tenant-ID is some other tenant. It is fail-closed (no cross-tenant leak), but the invariant is broken: authorization says yes, the query returns nothing. web-app #126 papered over this on the dashboard (always sends active tenant as path), but the backend defect remains for any non-web caller (API/OIDC/widget/mobile).

**Evidence.** Verifier confirmed the active-tenant filter is applied on every repository call via `TenantFilterAspect`, ANDing a second tenant predicate against the path tenant; `RbacAuthorizationService.canAccessTenant` returns true for ROOT; `TenantFilterBypass` is not used in `ManageAuthFlowService`; the project's own `CLAUDE.md:430-432` documents the issue.

**Suggested fix.** Wrap the AuthFlow path-scoped queries in `tenantFilterBypass.runWithoutTenantFilter(...)` (the path tenant + `@PreAuthorize` already provide the scoping), or temporarily set `TenantContext` to the path tenant for the duration of the call.

##### [MEDIUM] A method-specific consent REVOKE is silently overridden by a broad all-methods GRANT

**Location:** `src/main/java/com/fivucsas/identity/application/service/BiometricConsentService.java:118-132`

**The bug.** `resolveConsentedCanonicalTarget` treats consent as granted if **any** applicable row is granted: `findApplicable(...).anyMatch(isGranted)`. `findApplicable` returns both the method-specific row and the all-methods (`method IS NULL`) row. So if a person granted ALL biometric methods to a tenant but then explicitly revoked the FACE method (a `granted=false` FACE row + a `granted=true` NULL row), a FACE verify still resolves as consented because the all-methods row matches `anyMatch`. The more-specific revoke has no effect.

**Impact.** A user who narrows consent by revoking a single biometric method still has that tenant routed to their canonical template for that method — the per-method revoke is a no-op against a standing all-methods grant, contradicting least-privilege. The primary default-DENY invariant is unaffected (no rows → empty, correct); only the grant-broad-then-revoke-narrow combination is broken.

**Evidence.** Verifier confirmed `findApplicable` returns both specificity levels (`c.method = :method OR c.method IS NULL`) with no ORDER BY specificity; `anyMatch(isGranted)` has no most-specific-wins logic; the entity Javadoc documents per-method scoping as intended but no code implements precedence; the design doc defines no precedence rules.

**Suggested fix.** Implement most-specific-wins: if a method-specific row exists for the requested method, its `granted` value governs; only fall back to the `method IS NULL` row when no method-specific row exists. (E.g. order `findApplicable` by `method NULLS LAST` and take the first matching row.)

##### [MEDIUM] Re-enrolling an auto-complete method silently resurrects a REVOKED enrollment record to ENROLLED

**Location:** `src/main/java/com/fivucsas/identity/application/service/ManageEnrollmentService.java:114-152`

**The bug.** `startEnrollment()` fetches the existing enrollment via `findByUserIdAndAuthMethodType`, which does not filter on status, so it returns a row even when its status is REVOKED. For `AUTO_COMPLETE_TYPES` it then calls `enrollment.completeEnrollment("{}")`, which sets `status=ENROLLED, enrolledAt=now` with no check that the row was previously REVOKED/FAILED. There is no transition guard from REVOKED back to ENROLLED. (Verifier correction: `AUTO_COMPLETE_TYPES` is only `{PASSWORD, NFC_DOCUMENT}`, not the broader set the reviewer listed — so the scope is narrower than originally claimed.)

**Impact.** A previously-revoked auth-method enrollment for PASSWORD or NFC_DOCUMENT is silently flipped back to ENROLLED on a re-enroll call, re-enabling the method as a usable login factor without explicit re-authorization. Combined with the NFC card-reactivation path above (`enrollCard` calls `startEnrollment` for NFC_DOCUMENT), a revoked NFC enrollment is fully resurrected — both the card and the enrollment record.

**Evidence.** Verifier confirmed `AUTO_COMPLETE_TYPES = {PASSWORD, NFC_DOCUMENT}`; `findByUserIdAndAuthMethodType` has no status predicate; `completeEnrollment` sets ENROLLED unconditionally; `ensureAutoBoundEnrollment` is correctly guarded (returns early if any row exists) but `startEnrollment` is not; `enrollCard` calls `startEnrollment(... NFC_DOCUMENT)` unconditionally.

**Suggested fix.** In `startEnrollment`, if the existing row's status is REVOKED, require an explicit re-authorization rather than auto-completing — or at minimum refuse to transition REVOKED → ENROLLED without a deliberate flag. Mirror the guard already present in `ensureAutoBoundEnrollment`.

##### [MEDIUM] `/auth/login/preflight` is an account-existence + tenant-disclosure oracle on an unauthenticated endpoint

**Location:** `src/main/java/com/fivucsas/identity/controller/AuthController.java:168-187`

**The bug.** `loginPreflight` always returns the resolved `LoginConfigResponse` for the typed email: `resolveHomeTenantId(email)` → `getLoginConfigForTenantOrPlatform(homeTenantId)`. For an unknown email this yields the platform default (`tenantName="platform"`, `totalSteps=1`, Layer-1=PASSWORD). For a known email it yields that user's real tenant config — including the tenant display name, true `totalSteps`, and configured Layer-1 method set. The docstring claims the response is "indistinguishable from a single-step password tenant", but that holds only for tenants whose flow is exactly PASSWORD/1-step; for any multi-step or non-password tenant the response visibly differs, and `tenantName` alone distinguishes a real tenant from the hardcoded `"platform"`.

**Impact.** An unauthenticated attacker can enumerate valid accounts and learn the owning tenant's display name + login-flow shape by diffing the preflight response against the platform default. The endpoint requires no auth and no password. No tokens are minted and the tenant config is also queryable via `tenantId` on the public `/login-config` endpoint, so severity is medium — the marginal new capability is bridging from email to tenant identity without prior knowledge.

**Evidence.** Verifier confirmed the endpoint is `permitAll`; `resolveHomeTenantId` returns null for unknown emails and the tenant UUID for known; `getPlatformLoginConfig` hardcodes `tenantName="platform"` while `getLoginConfig` returns the real DB name; `LoginConfigResponse` exposes `tenantName`/`totalSteps`/Layer-1 methods.

**Suggested fix.** Make the preflight response uniform regardless of account existence: either always return the platform default shape (deferring real config until after the first factor is proven), or rate-limit and require a partial proof before disclosing tenant-specific flow shape. At minimum, do not return the tenant display name from an unauthenticated, email-keyed endpoint.

##### [MEDIUM] Global UNIQUE on `users.email` (V7) blocks the cross-tenant same-email memberships the V67/V78 identity-linking design depends on

**Location:** `src/main/resources/db/migration/V7__add_performance_indexes.sql:8-12`

**The bug.** V7 creates `CREATE UNIQUE INDEX idx_users_email_unique ON users (email) WHERE deleted_at IS NULL` — a global (tenant-agnostic) live-email uniqueness rule. This contradicts the invariant the entire account-linking feature is built on. V67's own comment asserts `users` has only a `(tenant_id, email)` UNIQUE and that the same person can hold accounts in several tenants under the same email. With `idx_users_email_unique` present, a second live row with the same email in a different tenant is rejected. V78 made `unique_tenant_email` soft-delete-aware but left V7's stricter global index untouched. In practice the application guard `existsByEmail` (also global) fires first, producing a clean 409 rather than the DB 500.

**Impact.** A person cannot be a live member of two tenants under the same email — the headline identity-linking use case is structurally impossible for *new* rows. Cross-tenant registration/guest-accept with an already-used email is rejected. (The identity-linking feature works only because it re-points `identity_id` on pre-existing rows; it never creates a second live cross-tenant row.) This finding and the tenancy `findByEmail` HIGH finding are two faces of the same schema-vs-feature contradiction.

**Evidence.** Verifier confirmed V7's global partial unique index exists and is never dropped through V78; the V67 comment's invariant is factually wrong (V7 predates V67); `RegisterUserService:68` and `GuestLifecycleService:215` call the global `existsByEmail` which throws `DuplicateEmailException` before the DB index is reached.

**Suggested fix.** Decide the canonical model. If cross-tenant same-email memberships are intended, drop `idx_users_email_unique` and replace the global `existsByEmail` guards with tenant-scoped `existsByTenantIdAndEmail`. If global uniqueness is intended, correct the V67/V78 comments and the identity-linking documentation to reflect it. Reconcile with the `findByEmail` HIGH finding as one unit of work.

##### [MEDIUM] DR rebuild yields an audit_logs partition that ends 2026-07-01, with V57 fail-soft and V41 maintenance never scheduled

**Location:** `src/main/resources/db/migration/V40__partition_audit_logs.sql:124-135`

**The bug.** V40 pre-creates monthly partitions only through `FOR VALUES FROM ('2026-06-01') TO ('2026-07-01')`. The only forward-maintenance mechanisms are (a) V57's pg_partman handoff, which `RETURN`s early as a no-op when the partman extension is absent, and (b) V41's `ensure_audit_logs_partition()` helper, which (per V57's own comment and the runbook) was never wired to any scheduler. The shared `pgvector/pgvector:pg17` image does not bundle pg_partman, so on a fresh DR rebuild V40 builds the partitioned table, V57 silently skips, and nothing creates a partition past 2026-07-01.

**Impact.** On a DR-rebuilt or fresh database, every INSERT into audit_logs with `created_at >= 2026-07-01` fails with "no partition of relation found for row." (Verifier correction: this does **not** break logins — `AuditEventPublisher.publish()` is `@Async` and swallows all exceptions, incrementing `audit_publish_failure_total`. So the impact is silent audit-log loss, observable only via the metric, not a platform outage. Severity is medium, not high.) Current prod is spared incidentally because its `audit_logs` is still a plain heap (V40's conversion isn't actually live there despite Flyway marking V40/V57 success).

**Evidence.** Verifier confirmed V40's last partition boundary; V57's early `RETURN` when partman absent; V41's helper has no `@Scheduled`/cron caller anywhere (grep); the fire-and-forget, exception-swallowing audit write path in `AuditEventPublisher` refutes the "breaks logins" claim.

**Suggested fix.** Either bundle pg_partman in the image and verify V57's handoff actually runs, or wire `ensure_audit_logs_partition()` to a `@Scheduled` job (or a DB cron) that pre-creates the next N months. Add a startup health check that fails loudly if no audit_logs partition covers `now()`. Reconcile the prod heap-vs-partition drift so Flyway's success markers reflect reality.

##### [MEDIUM] Guest invite/accept ignores tenant status — guests can be invited into and join a SUSPENDED tenant

**Location:** `src/main/java/com/fivucsas/identity/application/service/GuestLifecycleService.java:94-134,197-250`

**The bug.** Neither `createInvitation()` nor `acceptInvitation()` checks `tenant.getStatus()`. The login path refuses non-ACTIVE tenants (`AuthenticateUserService:84-91` throws `TenantSuspendedException`), but the guest endpoints create an ACTIVE guest user regardless of whether the invitation's tenant is SUSPENDED/INACTIVE. The `Tenant.canAcceptUsers()` method exists but has zero callers in the write path.

**Impact.** An admin of a suspended tenant (or a still-pending invitation issued before suspension) can mint brand-new active guest accounts inside a tenant the platform has administratively suspended, contradicting the suspension invariant enforced at login. The new guest's own subsequent login would be blocked, but the account row, role assignment, and ACCEPTED invitation are still created, leaving inconsistent state and bypassing the "suspended tenant cannot grow" intent.

**Evidence.** Verifier confirmed no `TenantStatus`/`getStatus`/`canAcceptUsers` reference in `GuestLifecycleService` or the guest endpoints; `Tenant.canAcceptUsers()` has no application-layer callers; the only status enforcement is at login.

**Suggested fix.** Check `!targetTenant.canAcceptUsers()` (or `status != ACTIVE`) in both `createInvitation` and `acceptInvitation`, throwing `TenantSuspendedException` consistently with the login path.

##### [MEDIUM] accept-invite existing-email check is global, not tenant-scoped — wrongly blocks legitimate cross-tenant guests

**Location:** `src/main/java/com/fivucsas/identity/application/service/GuestLifecycleService.java:215-218`

**The bug.** The guard `if (userRepository.existsByEmail(invitation.getEmail())) throw DomainStateConflictException(...)` resolves to `SELECT COUNT(u) > 0 FROM User u WHERE u.email = :email AND u.deletedAt IS NULL` — a global, cross-tenant existence test with no tenant predicate. The DB uniqueness constraint it is meant to pre-empt is per-tenant (`UNIQUE(tenant_id, email)`; V78 partial `unique_tenant_email_active`).

**Impact.** A person who already has an account in tenant B can never accept a guest invitation in tenant A: the global `existsByEmail` returns true and the accept is rejected with "sign in instead," even though inserting `(tenantA, email)` would not violate the per-tenant unique index. This breaks the legitimate multi-tenant guest scenario the identity/account-linking layer explicitly supports. (Note: this guard is itself one of the mechanisms enforcing the global-uniqueness behavior described in the V7 finding — they should be addressed together.)

**Evidence.** Verifier confirmed `existsByEmail` has no tenant argument; the backing query has no `tenant_id`; the actual constraint is per-tenant; the multi-tenant identity model (Phases 1-5, V65-V71) expects the same email across tenants.

**Suggested fix.** Replace the guard with `existsByTenantIdAndEmail(invitation.getTenant().getId(), invitation.getEmail())`, mirroring the actual DB constraint — but only after the global-vs-per-tenant model decision (V7 finding) is settled, since they must be consistent.

#### LOW

##### [LOW] Optional skipped steps desynchronize `currentStep`

**Location:** `src/main/java/com/fivucsas/identity/application/service/AuthenticateUserService.java:287-330`

**The bug.** At login, `remainingSteps` filters to `stepOrder >= startStep` AND `(isRequired || stepHasBiometricEnrollment)`, dropping an optional step with no enrolled method. But the `MfaSession` is created with `currentStep = startStep` (raw start order) and `totalSteps = flow.getStepCount()` (full count), while the response presents methods from `remainingSteps.get(0)`. If the first runnable step's `stepOrder` differs from `startStep` (the start step was skipped), `currentStep` points at the skipped step. Compounding this, `advanceToNextStep` looks up the next step purely by `stepOrder == currentStep` and throws if absent, and `allStepsCompleted()` is `currentStep > totalSteps` over the full count.

**Impact.** For any flow with an optional non-final step the user cannot satisfy: (1) `resolveCurrentStepMethodNames` returns the wrong step's methods (mis-firing the reuse guard / wrong `expectedMethods` in responses), and (2) after the user completes the runnable step, `advanceStep()` lands on the previously-skipped optional step's order and re-prompts it, producing a re-prompting loop or a hard login block. Required-only flows (the common case) are unaffected. The verifier noted **no production flow currently has `isRequired=false` steps**, so the real-world blast radius is zero today — the bug is latent and reachable only via admin configuration, hence low.

**Evidence.** Verifier confirmed `currentStep=startStep` (not `remainingSteps.get(0).getStepOrder()`); `totalSteps=flow.getStepCount()` (full count); `advanceToNextStep` looks up by `stepOrder==currentStep` with no optional-skip; all seeded `auth_flow_steps` rows are `is_required=true`.

**Suggested fix.** Set `currentStep = remainingSteps.get(0).getStepOrder()` and `totalSteps = remainingSteps.size()` (the runnable count), and re-apply the optional-skip filter inside `advanceToNextStep` so the engine advances to the next *runnable* step. Add a guard preventing admins from authoring flows where an optional step precedes a required one in a way that can strand users.

##### [LOW] VOICE verified-field parsing diverges: MFA handler rejects a string `"true"` verdict that other handlers accept

**Location:** `src/main/java/com/fivucsas/identity/application/service/mfa/handler/VoiceVerifyMfaStepHandler.java:31-34`

**The bug.** `VoiceVerifyMfaStepHandler` accepts the bio verdict only via `Boolean.TRUE.equals(result.get("verified"))`. The parallel `VoiceAuthHandler` and both face handlers accept `Boolean.TRUE.equals(verified) || "true".equalsIgnoreCase(String.valueOf(verified))`. If the biometric-processor ever returns `verified` as the JSON string `"true"` (it currently returns a JSON boolean, deserialized by Jackson to `Boolean`, so this is presently latent), the MFA voice step would reject a genuine match while the legacy path accepts it.

**Impact.** Currently latent (bio returns a real JSON boolean). Becomes a fail-closed correctness bug for legitimate users if the bio response shape for VOICE ever serializes `verified` as a string, while the other three biometric handlers keep working — making the failure hard to diagnose.

**Evidence.** Verifier confirmed `VoiceVerifyMfaStepHandler:32-34` lacks the string fallback while `VoiceAuthHandler:43-44`, `FaceVerifyMfaStepHandler:69-70`, and `FaceAuthHandler:80-81` all have it; the RestClient/Jackson path currently yields a `Boolean`, so the bug is latent.

**Suggested fix.** Adopt the dual-check pattern (`Boolean.TRUE.equals(verified) || "true".equalsIgnoreCase(String.valueOf(verified))`) in `VoiceVerifyMfaStepHandler` for consistency with the other three handlers; better still, centralize verdict parsing in a shared helper used by all biometric handlers.

##### [LOW] Registration fallback stores the raw attestationObject as the credential public key, producing credentials that can never authenticate

**Location:** `web-app/src/features/auth/components/WebAuthnEnrollment.tsx:227-229`

**The bug.** When `AuthenticatorAttestationResponse.getPublicKey()` is unavailable, the client falls back to sending the entire `attestationObject` (CBOR) as the publicKey: `publicKey: publicKeyBytes ? bytesToBase64url(publicKeyBytes) : bytesToBase64url(attestationResponse.attestationObject)`. The server stores this verbatim and later feeds it to `X509EncodedKeySpec` in `WebAuthnService.verifyCryptographicSignature`, which parses only an SPKI/X.509 DER key.

**Impact.** On any browser/authenticator lacking `getPublicKey()`, the stored "public key" is a CBOR attestation object, so `KeyFactory.generatePublic` throws, the signature check catches it and returns false, and that credential is permanently unable to authenticate (every assertion → 401). It fails closed (no security hole) but silently bricks the credential at enrollment time while returning a success response. Affected population is narrow (very old browsers / exotic authenticators), hence low.

**Evidence.** Verifier confirmed the optional-chaining fallback sends `attestationObject`; the server stores `publicKey` verbatim with no parsing at registration; `verifyCryptographicSignature` feeds it to `X509EncodedKeySpec` which throws `InvalidKeySpecException`, swallowed by a broad catch returning false.

**Suggested fix.** Do not fall back to the raw attestationObject. If `getPublicKey()` is unavailable, either decode the COSE key from the attestationObject's authenticatorData client-side, or send the attestationObject under a distinct field and have the server CBOR-decode and extract the COSE public key (converting to SPKI) before storing. Fail the enrollment loudly if no usable key can be derived, rather than persisting an unusable credential.

##### [LOW] Expired-but-active OAuth2 client can still complete authorize/token (expiresAt not enforced)

**Location:** `src/main/java/com/fivucsas/identity/application/service/OAuth2Service.java:86-95,301-303`

**The bug.** `validateClient()` and `exchangeCode()` resolve the client via `findByClientIdAndActiveTrue(clientId)`, which filters only on `active=true`. `OAuth2Client.isValid()` additionally checks `!isExpired()` (expiresAt) and `revokedAt == null`, but neither auth method calls `isValid()`/`isExpired()`. `revoke()`/`deactivate()` set `active=false` (so revoked clients are excluded), but a client whose `expiresAt` has passed while `active` remains true would pass validation and mint tokens.

**Impact.** A registered OAuth2 client past its configured `expiresAt` can still drive the authorization-code flow and obtain tokens, bypassing the registration-expiry control. Lower severity because `expiresAt` cannot currently be set via any API endpoint (only direct DB manipulation) and no seed data sets it — the practical attack surface is near-zero today.

**Evidence.** Verifier confirmed both auth methods use `findByClientIdAndActiveTrue` with no `isExpired()` check; `isExpired()` is only consulted by `isValid()`, which is wired solely to the non-auth `getClientPublicMeta` branding endpoint; no admin endpoint writes `expiresAt`.

**Suggested fix.** Have `validateClient()` and `exchangeCode()` call `client.isValid()` (or explicitly check `!client.isExpired() && client.getRevokedAt() == null`) after resolving the client, returning the appropriate OAuth2 error when the client is expired.

---

### 4.2 biometric-processor

#### HIGH

##### [HIGH] Voice verify computes `np.dot` against a non-normalized centroid, systematically shrinking the confidence score below the fixed 0.65 threshold (grows with enrollment count)

**Location:** `app/api/routes/voice.py:233-238`

**The bug.** `verify_voice` computes `similarity = float(np.dot(probe_embedding, enrolled_embedding))` with the comment "both vectors are already L2-normalized," then gates on `similarity >= VERIFY_THRESHOLD (0.65)`. But the enrolled centroid is built in the repository as SQL `AVG(embedding)::vector(256)` and persisted **without** re-normalization in the normal (non-optimize) enroll path. The average of L2-normalized unit vectors has norm < 1, so `np.dot(unit_probe, centroid) = true_cosine * ||centroid||`, strictly smaller than the true cosine similarity. Only the `optimize=True` fusion branch L2-normalizes (via `EmbeddingFusionService` with `normalization_strategy="l2"`); the default append/average path does not.

**Impact.** Legitimate voice re-verification confidence is attenuated by the factor `||centroid||` (≈0.71 at 2 enrolled samples, ≈0.61 at 3, ≈0.47 at 5), so the same speaker's score drops further below the fixed 0.65 threshold the **more** samples they enroll — a growing false-reject bias that can lock genuine users out of voice login. The face path is unaffected because it uses pgvector's magnitude-invariant cosine operators (`<=>`), not a raw dot product.

**Evidence.** Verifier confirmed the probe is unit-norm (Resemblyzer); the default enroll path (`fuse_with_existing=False`, the `optimize` default) persists the plain `AVG` with the explicit comment "Normal enroll skips this"; only the opt-in fusion path normalizes; the `<=>`-based SEARCH endpoint (the "F12 voice threshold verified CORRECT" note) is a different code path that does not have this bug.

**Suggested fix.** L2-normalize the centroid on the normal enroll path before persisting (or normalize at verify time before the dot product), so `np.dot` measures true cosine similarity regardless of enrollment count. Add a test that enrolls N samples of the same speaker and asserts the self-verification score does not decay with N.

#### MEDIUM

##### [MEDIUM] `/verify` liveness score floor compares a 0–100 score against 0.4 → the extra safety floor is a dead no-op

**Location:** `app/api/routes/verification.py:403-423`

**The bug.** `VERIFY_MIN_LIVENESS_SCORE = 0.4` is compared against `liveness_result.score`, but `LivenessResult.score` is validated to the 0–100 scale and the configured `LIVENESS_THRESHOLD` is 70.0 on that same scale. The route comment states the intent is to reject even marginal borderline cases with a 0.4 floor — but `liveness_result.score < 0.4` only fires for scores between 0.0 and 0.4 out of 100, i.e. essentially never for any frame that produced a face. The intended floor was almost certainly 40.0.

**Impact.** The documented secondary liveness floor on `/verify` is non-functional. It provides a false sense of an extra margin above `is_live`; in practice the only effective gate is `is_live` (score ≥ 70). Not a fail-open by itself (70 is stricter than a 40 floor), but the safety net the code claims does not exist, and any future loosening of `LIVENESS_THRESHOLD` would silently leave this floor doing nothing.

**Evidence.** Verifier confirmed `score` is hard-validated to 0–100; `LIVENESS_THRESHOLD` defaults to 70.0 on the same scale; `0.4` corresponds to 0.4%, above which essentially every real frame scores; no normalization step exists between the use case and the comparison.

**Suggested fix.** Change `VERIFY_MIN_LIVENESS_SCORE` to `40.0` (or whatever margin is intended on the 0–100 scale), and add a unit test asserting a 35-point liveness score is rejected by the floor even when `is_live` happens to be true.

##### [MEDIUM] eMRTD passive auth never checks Document Signer / CSCA certificate validity period

**Location:** `app/domain/services/emrtd_passive_auth.py:440-453`

**The bug.** `_ds_chains_to_csca` matches `csca.subject == ds_cert.issuer` and cryptographically verifies the DS signature under the CSCA key, but neither this function, `verify()`, nor `_verify_sod_signature` ever inspects `not_valid_before`/`not_valid_after` of the DS or CSCA certificate (grep for `not_valid`/`valid_after`/`expire`/`validity` returns nothing). ICAO 9303 Part 11 passive authentication requires the chain to be valid at verification time.

**Impact.** A passport/eID signed by a Document Signer certificate whose validity window has fully expired (or a retired/expired CSCA) is reported `is_authentic=true` / `reason_code=OK`. A self-signed fixture probe confirmed: a DS cert with `not_valid_after=2001-01-01`, still issued by the trusted CSCA, returned `is_authentic=True, reason_code=OK`. This weakens the module's advertised fail-closed guarantee. The attacker still needs a DS key that legitimately signed a real SOD, hence medium.

**Evidence.** Verifier confirmed the chain check performs only subject/issuer match + signature verification; no temporal check anywhere in the service or route (grep returned zero time-comparison primitives); the `ReasonCode` enum has no `CERT_EXPIRED` variant; the test fixture uses a far-future `not_valid_after` and never exercises an expired cert.

**Suggested fix.** In `_ds_chains_to_csca` (and for the CSCA), reject the chain unless `not_valid_before <= now <= not_valid_after` for both the DS and CSCA certificates, returning a new `ReasonCode.CERT_EXPIRED`. Add a test with an expired DS cert asserting `is_authentic=False`.

#### LOW

##### [LOW] Settings defaults pair Facenet (128-dim) with EMBEDDING_DIMENSION=512 and no validator ties model to dimension

**Location:** `app/core/config.py:96-107,358`

**The bug.** `FACE_RECOGNITION_MODEL` defaults to `"Facenet"` (`DeepFaceExtractor.EMBEDDING_DIMENSIONS["Facenet"]=128`) while `EMBEDDING_DIMENSION` defaults to 512. There is a model_validator for the aged-threshold inversion and a CPU-safety validator, but none asserting that `EMBEDDING_DIMENSION` matches the model's native output dimension. A deployment on these defaults would extract 128-dim embeddings while the repository/pgvector column expect 512.

**Impact.** If any deployment relied on the Settings defaults, enrollment would extract a 128-dim vector and `PgVectorEmbeddingRepository.save()` would raise `ValueError("Embedding dimension mismatch: expected 512, got 128")` for every user. It fails loudly (not silent truncation), and production is **not** affected because `docker-compose.prod.yml` explicitly pins `EMBEDDING_DIMENSION:512` + `FACE_RECOGNITION_MODEL:Facenet512`. This is a latent config trap, not a live defect.

**Evidence.** Verifier confirmed the default mismatch, the `EMBEDDING_DIMENSIONS["Facenet"]=128` map, the repository's loud `ValueError`, the absence of any cross-checking validator, and the explicit prod pins that protect production.

**Suggested fix.** Add a model_validator that derives the expected dimension from `FACE_RECOGNITION_MODEL` (via `DeepFaceExtractor.EMBEDDING_DIMENSIONS`) and asserts it equals `EMBEDDING_DIMENSION`, failing fast at startup — or make `EMBEDDING_DIMENSION` default to the model's native dimension rather than a hard-coded 512.

##### [LOW] SOD signature verification does not validate the CMS content-type signed attribute against the ICAO LDS OID

**Location:** `app/domain/services/emrtd_passive_auth.py:386-401`

**The bug.** When signed attributes are present, `_verify_sod_signature` verifies only the `messageDigest` attribute and the signature over the signed-attrs SET. RFC 5652 §11 requires that when signed attributes are present a `content-type` attribute MUST be present and MUST equal the `eContentType` (the ICAO LDS Security Object OID). The verifier neither requires the content-type attribute to exist nor checks its value, and never checks `encap_content_info.content_type` either.

**Impact.** Low direct exploitability for forgery (the `messageDigest` still binds the LDS eContent, so the DG-hash manifest cannot be altered without re-signing), but the verifier accepts non-conformant SODs that omit/misstate the content-type attribute and loses a defense-in-depth binding against content-type substitution. A probe with `signed_attrs` containing only `message_digest` (no `content_type`) returned `is_authentic=True / OK`.

**Evidence.** Verifier confirmed only `message_digest` is consulted; `_ICAO_LDS_SECURITY_OBJECT_OID` is defined but never referenced in the service; the outer `signed_data` type check is separate from the §11 requirement; every test fixture includes `content_type` so the missing-attribute case is untested.

**Suggested fix.** When signed attributes are present, require a `content-type` attribute and assert it equals the `eContentType` OID (`2.23.136.1.1.1`); reject otherwise (new `ReasonCode`). Add a test with `signed_attrs` lacking `content_type`.

---

### 4.3 web-app

#### LOW

##### [LOW] ApproveLoginPanel: APPROVED without an access token silently strands the user in the waiting state

**Location:** `web-app/src/features/auth/components/ApproveLoginPanel.tsx:138-149`

**The bug.** The poll handler acts on only three discrete outcomes: `if (poll.status === 'APPROVED' && poll.accessToken) {...} else if (poll.status === 'DENIED') {...} else if (poll.status === 'EXPIRED') {...}`. A response with `status === 'APPROVED'` but a missing/empty `accessToken` matches none of the branches, so no state transition happens and no error is surfaced. The phase stays `'waiting'` and the panel keeps polling.

**Impact.** If the backend ever returns APPROVED without tokens (a race between approval and token mint, or any token-issuance hiccup), the user sees the waiting screen with no error and no recovery affordance, even though the login was approved on the other device. The success is effectively swallowed. (The session does eventually terminate at expiry via a secondary `secsLeft <= 0` branch, so not literally forever; low probability given it requires a backend contract violation, hence low.)

**Evidence.** Verifier confirmed there is no else/catch-all branch; the `pollApproveLoginSession` does no payload validation; the optional `accessToken` type does not enforce the server-side invariant; `cancelled` stays false so polling continues until expiry.

**Suggested fix.** Add an explicit branch: when `status === 'APPROVED'` but `accessToken` is missing, set an error phase (and stop polling) so the user gets a recoverable failure state rather than a stuck spinner.

##### [LOW] ApproveLoginPanel: poll interval is not stopped on APPROVED, allowing duplicate onApproved → duplicate token-store / navigate

**Location:** `web-app/src/features/auth/components/ApproveLoginPanel.tsx:111-159`

**The bug.** On the APPROVED branch the effect calls `onApprovedRef.current(...)` but does not set `cancelled = true`, clear the `setInterval`, or move `phase` to a terminal state. The 2s interval keeps firing `tick()` until the component unmounts. In the caller, `completeTokenLogin` awaits `storeTokens()` and `refreshUser()` before setting `setShowApproveLogin(false)`, so the panel stays mounted across those awaits and the next tick re-invokes `onApproved`.

**Impact.** `onApproved` can fire more than once for a single approval, causing a duplicate token store + duplicate `refreshUser()` + duplicate `navigate('/')`. Usually masked by the eventual unmount and the idempotent navigate, but it is an unguarded repeated side-effect on the auth-completion path.

**Evidence.** Verifier confirmed the APPROVED branch does not set `cancelled=true`/`clearInterval`; React 18 commits the `setShowApproveLogin(false)` re-render asynchronously, leaving the component mounted through `await refreshUser()`; the same pattern exists in the `HostedLoginApp.tsx` caller.

**Suggested fix.** Set `cancelled = true` (and `clearInterval(id)`) on the APPROVED branch immediately before calling `onApprovedRef.current()`, so no subsequent tick can re-enter the APPROVED path.

##### [LOW] LoginMfaFlow STEP_COMPLETED with no remaining enrolled methods routes to an empty/unusable MethodPicker (dead-end)

**Location:** `web-app/src/verify-app/LoginMfaFlow.tsx:408-424`

**The bug.** On STEP_COMPLETED the next-method set is computed as `enrolled = methods.filter(m => m.enrolled && !mergedUsed.has(m.methodType))`. When that is empty (backend omits/empties `availableMethods`, or every remaining method is already in `mergedUsed`), the `else` branch still does `setPhase(FlowPhase.MethodPicker)` with `availableMethods` that contain only used/un-enrolled entries — all rendered disabled by `MethodPickerStep`. The user lands on a picker with nothing selectable and no automatic advance.

**Impact.** A flow that legitimately has another step but returns an empty actionable method list strands the user on a picker where every card is disabled ("Already used" / "Not enrolled"); only the back/cancel button works, aborting the login. Triggered only under a backend contract violation or misconfiguration, not the happy path, hence low.

**Evidence.** Verifier confirmed the empty case falls into the same picker branch as the `>1` case; `MethodPickerStep` disables every card when `used || !enrolled`; the only escape rendered is "Back to Login," which aborts the session; the trigger requires the backend to omit `availableMethods` or return only used/un-enrolled entries.

**Suggested fix.** Add an explicit `enrolled.length === 0` branch that either auto-advances (re-requests the next step / current config) or renders a clear "no available methods" error with a recovery action, rather than routing to a dead-end picker.

---

### 4.4 client-apps

#### MEDIUM

##### [MEDIUM] MFA-step retry on socket/read timeout resubmits an already-consumed OTP/TOTP code, turning a server success into a false failure

**Location:** `client-apps/shared/src/commonMain/kotlin/com/fivucsas/shared/di/NetworkModule.kt:115-124`

**The bug.** The global `HttpRequestRetry` on `identityClient` retries on `SocketTimeout` and `ClosedReceiveChannelException` (in addition to `IOException`/`ConnectTimeout`). The commit comment claims this is safe because retries are scoped to IO/socket/connect exceptions "so a consumed MFA code is never resubmitted." That reasoning is wrong: `SocketTimeout` (`socketTimeoutMillis=30_000`) and `ClosedReceiveChannelException` fire on read inactivity / connection-drop **after** the request body has already been fully transmitted and possibly processed. `/auth/mfa/step` is not idempotent — on a correct code the server consumes it (`OtpService.validateWithResult` deletes the OTP key on match; TOTP `markConsumed` records the timeStep as used). No idempotency key is sent. So when the request reaches the server, the step is verified and the code consumed, but if the response read times out or the keep-alive drops, the retry re-POSTs the same `sessionToken+method+code`; the server now returns notFound/mismatch/replay-rejected and the user sees "Invalid code" for a step they actually passed.

**Impact.** A user who enters a correct OTP/TOTP under a flaky network (the precise condition the retry targets — stale HTTP/2 keep-alive) can be wrongly told the code is invalid and/or forced to restart MFA, despite the server having authenticated the step. For TOTP the retry is also flagged server-side as an anti-replay event. This re-introduces the "server 200 but app shows failure" class the v5.2.3 work tried to eliminate, now at the transport layer. Manifests only under degraded-network conditions and partially mitigated by a `withTimeoutOrNull` race, hence medium.

**Evidence.** Verifier confirmed the retry covers `SocketTimeout`/`ClosedReceiveChannelException` (post-transmission exceptions); the server consumes OTP via `redisTemplate.delete(key)` and TOTP via `setIfAbsent NX`; `MfaStepRequest` carries no idempotency key/nonce; the `withTimeoutOrNull(30_000)` coroutine timeout races the equal Ktor socket timeout non-deterministically.

**Suggested fix.** Remove `SocketTimeout`/`ClosedReceiveChannelException` from the retry predicate for non-idempotent POSTs (or scope retries to idempotent GETs only). If retry-on-timeout is required for resilience, add a client-generated idempotency key to `MfaStepRequest` and have the server cache the result of a consumed step so a retried submission returns the original success rather than a replay rejection.

---

## 5. Uncertain Findings (need human confirmation)

The following two findings could not be conclusively resolved by code-only inspection. They are plausible but require runtime confirmation or external data before being treated as actionable.

### 5.1 identity-core-api

#### [UNCERTAIN — MEDIUM] TENANT_ADMIN implicit-permission bypass ignores V76 grant-scoping and revoked grants

**Location:** `src/main/java/com/fivucsas/identity/security/RbacAuthorizationService.java:69-77`

**The claim.** `hasPermission` grants a TENANT_ADMIN implicit `true` for every non-system permission regardless of the `role_permissions` actually attached to their role, so any `@rbac.hasPermission(...)`-gated endpoint whose permission is not `system:*`/`tenant:create` is authorized for a TENANT_ADMIN — bypassing V76's intended least-privilege scoping. It also notes a mismatch with raw `hasAuthority(...)` gates, which **do** read the static authority set.

**Why uncertain.** The verifier confirmed the implicit-bypass code is exactly as described and that two gate styles disagree on what a TENANT_ADMIN may do (real technical debt). However, the specific framing as a "V76 bypass" is not substantiated: a grep finds **none** of V76's 7 stripped permission strings used as `@rbac.hasPermission(...)` gates on any endpoint, and `tenant:create` is already covered by `isSystemPermission`. So while the inconsistent-authorization-surface concern is valid, the claim that V76's least-privilege scoping is bypassed at runtime is not demonstrably true with the current gate distribution. **Needs human confirmation** of whether any current or planned endpoint gates on one of the V76-stripped permissions via `@rbac.hasPermission`.

### 5.2 spoof-detector

#### [UNCERTAIN — CRITICAL] Texture-collapse VIDEO_REPLAY veto suppressed on real replays — skin_score co-signal threshold may be inverted (potential fail-OPEN)

**Location:** `spoof-detector/web/src/application/SessionEngine.ts:442-509` (gate), `:156` (`TEXTURE_COSIGNAL_SKIN_MIN`), `:481-488` (suppression branch)

**The claim.** The texture-collapse VIDEO_REPLAY veto requires its co-signal `screen_replay.skin_score` median to be `>= TEXTURE_COSIGNAL_SKIN_MIN (30)` before raising an incident, treating a HIGH skin_score as REPLAY-like. But `ScreenReplayAnalyzer.scoreSkin()` returns `100*(1-risk)` where HIGH = live-like skin and LOW = replay/spoof-like. If a genuine screen replay emits a LOW skin_score, `skinMedian < 30` hits the suppression branch and the veto returns without raising the VIDEO_REPLAY incident — meaning the primary passive replay defense could fail open.

**Why uncertain.** The verifier confirmed `scoreSkin()` is `100*(1-risk)` (HIGH = live-like) and that the suppression branch fires when `skinMedian < 30`. **But** the developer's own empirical calibration comment in the same file states the *measured* ranges are LIVE `skin_score` 0.1–27.8 (a dark/twilight live face fails the skin-detection thresholds, yielding a LOW score) and SPOOF 31.9–65.5 (a bright backlit replay yields a HIGHER score). Under that calibration the gate direction is internally consistent (suppress when `< 30` = the measured LIVE-in-low-light range; fire when `>= 30` = the measured SPOOF range), and texture collapse itself only triggers in low-light conditions where the calibration applies. The claim's premise ("a genuine replay emits a LOW skin_score") is contradicted by the code's own data table for the scenario the veto targets. Resolving this requires **actual experiments** (running live faces and real screen-replay attacks through the analyzer across lighting conditions) to confirm whether the empirical table is correctly labeled — a code-only review cannot settle it. Given the critical severity if the table is mislabeled, this warrants prioritized empirical validation rather than dismissal.

---

## 6. Appendix — Refuted Claims

The following claims were raised by reviewers and **dismissed** after adversarial verification. They are listed so reviewers can see what was checked and why it does not hold.

| Area | Title | File | Why refuted (one line) |
|---|---|---|---|
| auth-handlers | NFC chip passive-auth (WS2 trust gate) absent from live MFA NFC handler | `NfcDocumentVerifyMfaStepHandler.java` | Asymmetry is real but intentional and documented (Javadoc + CLAUDE.md): prod hardware is plain MIFARE campus cards with no ICAO chip/SOD, serial-only mode is a deliberate flag-gated choice with a kill-switch; a future-proofing gap, not a present runtime bug. |
| tenancy-isolation | Unauthenticated login resolves user by global email with no tenant scoping → NonUniqueResultException / wrong-tenant auth | `AuthenticateUserService.java` | V7's global partial unique index on `email` (never dropped) makes a multi-row `findByEmail` structurally impossible, and `enforceTenantLock` (line 139, before password check) blocks cross-tenant login on a clientId-bound surface; reviewer misread V67's comment as schema authority. |
| liveness-antispoof | DeepFace anti-spoof veto fails OPEN when detector result omits `is_real` | `deepface_detector.py` | DeepFace 0.0.99 unconditionally writes `is_real` when `anti_spoofing=True`; the only exception path is caught and hard-codes `antispoof_label="spoof"` (fail-CLOSED); the `get("is_real", True)` default is unreachable in the installed version. |
| web-login | LoginMfaFlow PASSWORD-first detection (`usedMethods.length===0`) can be non-empty after beginIdentifierLogin and misroute PASSWORD off the lockout path | `LoginMfaFlow.tsx` | `beginIdentifierLogin` always returns `completedMethods = List.of()` (hardcoded empty, "nothing satisfied yet"), so the frontend never seeds `usedMethods`; the `=== 0` check correctly identifies PASSWORD as first factor; the misroute scenario is structurally impossible. |

> Note: the second refuted claim above (V7 global unique → no NonUniqueResultException) is in apparent tension with the **confirmed** tenancy HIGH finding and the **confirmed** V7-migration MEDIUM finding. The reconciliation: the global unique index does prevent *new* duplicate-email rows, but at least one prod email already has two active cross-tenant rows (pre-dating or surviving the index via the identity-linking backfill), making the multi-row `findByEmail` failure reachable for already-linked accounts. The refutation holds for the reviewer's stated mechanism (a fresh duplicate insert); the confirmed findings address the already-existing duplicate and the design contradiction. These three items should be triaged together.

---

## 7. How to Reproduce This Audit

1. **Pin revisions.** Check out identity-core-api at `main`/`e6d94e8`, biometric-processor `main`, web-app `main`, client-apps `fix/mfa-request-retry-stale-connection`, spoof-detector `main`.
2. **Fan-out review.** Assign one reviewer per subsystem (the 18 areas in §1). Each reads only its subsystem's source, citing exact `file:line` evidence and a concrete impact narrative for every candidate logic bug (correctness only — not style or coverage).
3. **Adversarial verification.** For each candidate finding, hand it to a *different* agent that re-reads the cited code and full call chain from scratch, attempts to falsify the claim, and corrects severity. Confirm only when the verifier reproduces the defect from source; mark uncertain when code-only inspection cannot resolve it (note what runtime/empirical evidence is needed); refute when the central failure mode is disproved.
4. **Disposition + tally.** Record confirmed/uncertain/refuted counts and assemble the severity-sorted summary. For confirmed findings, infer a concrete fix from the surrounding code.
5. **Spot-check the load-bearing claims.** For the transaction-rollback, JJWT audience-merge, and Redis-key-mismatch findings, confirm the runtime behavior with a targeted Spring-context / library-bytecode / integration test rather than a mock-based unit test, since each of those defects is masked by the existing mocked tests.
