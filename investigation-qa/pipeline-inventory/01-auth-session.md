# Auth / Session / OAuth2 / WebAuthn / MFA — Pipeline Inventory (2026-05-28)

Status legend: ✅ full | 🟡 partial | ❌ missing | 🐞 broken | ❔ unverified

---

## 1. Signup / Register

| Operation | DB (table/migration) | Backend (file:method → endpoint) | Web (page/component) | Mobile | Desktop | SDK | Status | Notes/gaps |
|---|---|---|---|---|---|---|---|---|
| Register user | `users` (V2), `refresh_tokens` (V6/V50/V55/V60) | `AuthController.java:111` → `POST /api/v1/auth/register` | `RegisterPage.tsx` | `AuthRepositoryImpl.kt` → `AuthApiImpl.kt` `POST auth/register` | Shared screen via `AppRoot` | N/A | ✅ | No email-verification gate on register; email must be separately verified via `/auth/verify-email` |

---

## 2. Login / Signin

| Operation | DB (table/migration) | Backend (file:method → endpoint) | Web (page/component) | Mobile | Desktop | SDK | Status | Notes/gaps |
|---|---|---|---|---|---|---|---|---|
| Password login (direct JWT) | `users`, `refresh_tokens`, `active_sessions` (V5), `audit_logs` | `AuthController.java:133` → `POST /api/v1/auth/login` | `LoginPage.tsx`, `AuthService.ts:32` | `AuthApiImpl.kt` `POST auth/login` | `OAuthLoopbackClient.kt` (PKCE, loopback) | N/A | ✅ | clientId forwarded for tenant-gate since 2026-05-07 |
| Passwordless primary step | `auth_flows`, `auth_flow_steps` (V16), `mfa_sessions` (V35) | `AuthController.java:133` (same login triggers MFA session) | `LoginScreen` shared multi-step, `MultiStepAuthFlow.tsx` | `LoginScreen.kt` + `MfaFlowScreen.kt` | `LoginScreen` (shared) | N/A | 🟡 | Desktop doesn't have a dedicated non-loopback MFA primary-step flow; relies on the web redirect |
| Account lock / unlock | `users.is_locked`, `users.failed_login_attempts` (V2) | Login path checks `user.isLocked()` + `user.isActive()` | N/A (admin panel) | N/A | N/A | N/A | 🟡 | No self-service unlock for users; admin-only; frontend shows error message only |

---

## 3. Logout / Signout

| Operation | DB (table/migration) | Backend (file:method → endpoint) | Web (page/component) | Mobile | Desktop | SDK | Status | Notes/gaps |
|---|---|---|---|---|---|---|---|---|
| Logout (revoke refresh token) | `refresh_tokens.is_revoked`, `active_sessions` (V5) | `AuthController.java:172` → `POST /api/v1/auth/logout` | `AuthService.ts:122` | `AuthApiImpl.kt` `POST auth/logout` (no body — refresh token not sent) | `AuthStateManager.kt:58` wipes local token | N/A | 🐞 | Mobile `AuthApiImpl.logout()` calls `client.post("auth/logout")` with NO BODY — backend requires `{refreshToken}` in body (`AuthController.java:176`). Server-side token is never revoked on mobile logout. |

---

## 4. Forgot Password + Reset Password

| Operation | DB (table/migration) | Backend (file:method → endpoint) | Web (page/component) | Mobile | Desktop | SDK | Status | Notes/gaps |
|---|---|---|---|---|---|---|---|---|
| Forgot password (send OTP) | `users` (OTP stored in Redis, not DB) | `AuthController.java:210` → `POST /api/v1/auth/forgot-password` | `ForgotPasswordPage.tsx:128` → `POST /auth/forgot-password` | `ForgotPasswordScreen.kt` — UI ONLY, no API call (just `isSubmitted = true`) | `ForgotPasswordScreen` (same shared screen — same stub) | N/A | 🐞 | Mobile/desktop ForgotPasswordScreen is a stub: `onClick { isSubmitted.value = true }` — never calls backend. No API exists in `AuthApi.kt` for this. |
| Reset password (OTP + new password) | `users.password_hash` | `AuthController.java:240` → `POST /api/v1/auth/reset-password` | `ResetPasswordPage.tsx:190` → `POST /auth/reset-password` | ❌ No screen or API | ❌ No screen or API | N/A | 🐞 | Mobile/desktop have no reset-password flow at all. No `forgotPassword`/`resetPassword` in `AuthApi` interface. |

---

## 5. Password Change

| Operation | DB (table/migration) | Backend (file:method → endpoint) | Web (page/component) | Mobile | Desktop | SDK | Status | Notes/gaps |
|---|---|---|---|---|---|---|---|---|
| Change password (authenticated) | `users.password_hash`, `password_history` (V5) | `UserController.java:180` → `POST /api/v1/users/{id}/change-password` | `ChangePasswordDialog.tsx`, `PasswordService.ts:29` → `POST /users/{userId}/change-password` | `AuthApiImpl.kt` → `POST auth/change-password` (`AuthController` has no such endpoint) | `ChangePasswordScreen.kt` (viewModel not wired to API — single `fun ChangePasswordScreen`) | N/A | 🐞 | **Path mismatch**: Mobile calls `POST auth/change-password` → backend has no such route. `UserController` exposes `POST /api/v1/users/{id}/change-password`. Desktop `ChangePasswordScreen` shows no viewModel binding. |

---

## 6. Refresh Token Rotation

| Operation | DB (table/migration) | Backend (file:method → endpoint) | Web (page/component) | Mobile | Desktop | SDK | Status | Notes/gaps |
|---|---|---|---|---|---|---|---|---|
| Refresh access token | `refresh_tokens` (V6, V50 family_id, V55 hash, V60 drop plaintext) | `AuthController.java:154` → `POST /api/v1/auth/refresh` | `AuthService.ts:139` | `AuthApiImpl.kt` `POST auth/refresh` | `RefreshInterceptor.kt:84` `POST <TOKEN_URL>` with `grant_type=refresh_token` | N/A | 🟡 | Desktop uses token-endpoint refresh (not `/auth/refresh`) — different path. RFC 6749 family reuse detection (V50) active. V60 plaintext drop applied. |

---

## 7. Session List + Revoke

| Operation | DB (table/migration) | Backend (file:method → endpoint) | Web (page/component) | Mobile | Desktop | SDK | Status | Notes/gaps |
|---|---|---|---|---|---|---|---|---|
| List active sessions (user) | `refresh_tokens`, `active_sessions` (V5) | `AuthSessionController.java` → `GET /api/v1/auth/sessions/my` | `AuthSessionsPage.tsx`, `AuthSessionRepository.ts:getActiveSessions` | `SessionApiImpl.kt:14` `GET sessions` | `SecurityTab.kt` + `SessionViewModel` → `SessionApiImpl` | N/A | 🐞 | **Path mismatch**: Mobile `SessionApiImpl` calls `GET sessions` (→ `/api/v1/sessions`) but backend exposes `GET /api/v1/auth/sessions/my`. Request hits a 404/not-found. |
| Revoke single session | `refresh_tokens.is_revoked` | `AuthSessionController.java` → `DELETE /api/v1/auth/sessions/my/{sessionId}` | `AuthSessionRepository.ts:revokeSession` → `DELETE /auth/sessions/my/{sessionId}` | `SessionApiImpl.kt:18` `DELETE sessions/{id}` (→ `/api/v1/sessions/{id}`) | Same SessionApiImpl | N/A | 🐞 | Same path mismatch as list. Also, backend requires authentication (`authenticated()`), mobile may be missing auth header in the call path. |
| Revoke all other sessions | `refresh_tokens` | `AuthSessionController.java` → `DELETE /api/v1/auth/sessions/my/all?currentTokenId=` | `AuthSessionRepository.ts:revokeAllOtherSessions` | ❌ Not in `SessionApi` or `AuthRepository` | ❌ Not present | N/A | ❌ | Missing on mobile and desktop entirely. |
| Admin list auth sessions | `auth_sessions` (V16 `auth_flows`; auth_sessions runtime table if any) | `AuthSessionController.java:getMapping` → `GET /api/v1/auth/sessions` (admin paginated) | `AuthSessionRepository.ts:listSessions` → admin `AuthSessionsPage` | ❌ Not wired | ❌ Not wired | N/A | 🟡 | Admin-only view exists on web; not on mobile/desktop. |
| Auth session start (N-step) | `auth_flows`, `auth_flow_steps`, `mfa_sessions` | `AuthSessionController.java:startSession` → `POST /api/v1/auth/sessions` | `AuthSessionRepository.ts:startSession` | `AuthSessionApiImpl.kt:19` | N/A | N/A | ✅ | Correctly wired in web + mobile. |
| Auth session step complete | Same as above | `AuthSessionController.java:completeStep` → `POST /api/v1/auth/sessions/{id}/steps/{order}` | `AuthSessionRepository.ts:completeStep` | `AuthSessionApiImpl.kt:29` | N/A | N/A | ✅ | |
| Auth session step skip | Same | `AuthSessionController.java:skipStep` → `POST /api/v1/auth/sessions/{id}/steps/{order}/skip` | `AuthSessionRepository.ts:skipStep` | `AuthSessionApiImpl.kt:40` | N/A | N/A | 🟡 | SecurityConfig marks skip as `authenticated()` — not public; anon callers would get 401. |
| Auth session cancel | Same | `AuthSessionController.java:cancelSession` → `POST /api/v1/auth/sessions/{id}/cancel` AND `DELETE /api/v1/auth/sessions/{id}` | `AuthSessionRepository.ts:cancelSession` | `AuthSessionApiImpl.kt:47` | N/A | N/A | ✅ | Cancel requires auth per SecurityConfig for DELETE form; POST form also `authenticated()`. |
| Get session status | Same | `AuthSessionController.java:getSession` → `GET /api/v1/auth/sessions/{id}` | `AuthSessionRepository.ts:getSession` | `AuthSessionApiImpl.kt:25` | N/A | N/A | ✅ | |

---

## 8. OAuth2 / OIDC

| Operation | DB (table/migration) | Backend (file:method → endpoint) | Web (page/component) | Mobile | Desktop | SDK | Status | Notes/gaps |
|---|---|---|---|---|---|---|---|---|
| Authorization endpoint | `oauth2_clients` (V24), `mfa_sessions` (V35/V36) | `OAuth2Controller.java:77` → `GET /api/v1/oauth2/authorize` | N/A (redirect flow) | N/A | `OAuthLoopbackClient.kt:73` builds authorize URL | `FivucsasAuth.ts:loginRedirect` + `handleRedirectCallback` | ✅ | PKCE S256 enforced for public clients; display=page triggers redirect |
| Authorize complete (hosted-login) | `mfa_sessions`, `oauth2_clients` | `OAuth2Controller.java:199` → `POST /api/v1/oauth2/authorize/complete` | `HostedLoginApp.tsx` / `LoginMfaFlow.tsx` | N/A | N/A | `FivucsasAuth.ts:handleRedirectCallback` | ✅ | Anti-replay via `consumed_at` |
| Token endpoint | `oauth2_clients`, `refresh_tokens` | `OAuth2Controller.java:498` → `POST /api/v1/oauth2/token` | `FivucsasAuth.ts:handleRedirectCallback:488` | N/A | `OAuthLoopbackClient.kt:129` | SDK `handleRedirectCallback` | ✅ | PKCE verifier checked; tenant rate-limit applied |
| UserInfo endpoint | `users` | `OAuth2Controller.java` → `GET /api/v1/oauth2/userinfo` | N/A (post-login claim fetch in SDK) | N/A | N/A | `FivucsasAuth.ts:handleRedirectCallback:559` | ✅ | ID-token replay guard (type=oauth2 claim check) |
| OIDC discovery | N/A | `OpenIDConfigController.java` → `GET /.well-known/openid-configuration` | N/A | N/A | N/A | Referenced in SDK | ✅ | RS256 + HS512 dual-alg published |
| JWKS endpoint | N/A | `OpenIDConfigController.java` → `GET /.well-known/jwks.json` | N/A | N/A | N/A | N/A | ✅ | RSA public key only; HS512 secret intentionally excluded |
| Public client metadata | `oauth2_clients` | `OAuth2Controller.java:288` → `GET /api/v1/oauth2/clients/{clientId}/public` | `HostedLoginApp.tsx` (branding) | N/A | N/A | N/A | ✅ | |
| OAuth2 client CRUD (admin) | `oauth2_clients` (V24, V34 confidential, V37 index, V38 dashboard, V58 rotation) | `OAuth2ClientController.java` → `GET/POST/DELETE /api/v1/oauth2/clients`, `POST /{id}/rotate-secret`, `PATCH /{id}/status` | Tenant developer portal pages | `OAuth2ClientApiImpl.kt` (list/register/delete) | N/A | N/A | 🟡 | Mobile missing rotate-secret and status-toggle; web has full CRUD |

---

## 9. WebAuthn / Passkeys

| Operation | DB (table/migration) | Backend (file:method → endpoint) | Web (page/component) | Mobile | Desktop | SDK | Status | Notes/gaps |
|---|---|---|---|---|---|---|---|---|
| Register options (challenge) | `webauthn_credentials` (V18) | `DeviceController.java:106` → `POST /api/v1/webauthn/register/options/{userId}` (legacy) AND `DeviceController.java:234` → `POST /api/v1/webauthn/register-options` (current-user) | `WebAuthnEnrollmentDialog.tsx` | `WebAuthnApiImpl.kt:17` → `POST webauthn/register/options/{userId}` | N/A | N/A | ✅ | Two endpoints: user-specific (by id) and authenticated (current user) |
| Register verify (attestation) | `webauthn_credentials` | `DeviceController.java:137` → `POST /api/v1/webauthn/register/verify` (legacy) AND `DeviceController.java:275` → `POST /api/v1/webauthn/register` | `WebAuthnEnrollmentDialog.tsx` | `WebAuthnApiImpl.kt:21` → `POST webauthn/register/verify` | N/A | N/A | ✅ | |
| Authenticate options (pre-login challenge) | `webauthn_credentials` | `DeviceController.java:336` → `POST /api/v1/webauthn/authenticate-options` (public) | `HardwareKeyStep.tsx`, `FingerprintStep.tsx` | `WebAuthnRepositoryImpl.kt:verifyCredential` (uses register-options as workaround) | N/A | N/A | 🐞 | Mobile `verifyCredential` comment admits it uses register-options endpoint not the dedicated authenticate-options. Full server-side assertion verification labeled TODO. |
| Authenticate assertion (verify) | `webauthn_credentials.sign_count` | `DeviceController.java:391` → `POST /api/v1/webauthn/authenticate` (public) | `HardwareKeyStep.tsx` | ❌ Not implemented — assertion response never sent to server | N/A | N/A | 🐞 | `WebAuthnRepositoryImpl.kt:107-115`: "Step 3: The assertion result would be sent to a verify endpoint... Full server-side assertion verification can be added" — explicitly stubbed. |
| List credentials | `webauthn_credentials` | `DeviceController.java:195` → `GET /api/v1/webauthn/credentials/{userId}` | `DevicesPage.tsx` | `DeviceApiImpl.kt:getWebAuthnCredentials` → `GET devices/webauthn/credentials/{userId}` | `DevicesScreen.kt` shows WebAuthn cards | N/A | 🐞 | Mobile calls `GET devices/webauthn/credentials/{userId}` — backend exposes `GET /api/v1/webauthn/credentials/{userId}`, not under `/devices/`. Path mismatch — 404. |
| Delete credential | `webauthn_credentials` | `DeviceController.java:215` → `DELETE /api/v1/webauthn/credentials/by-id/{id}` AND `DeviceController.java:223` → `DELETE /api/v1/webauthn/credentials/{credentialId}` | `DevicesPage.tsx` / DeviceCard delete | ❌ Not in `DeviceRepository` or `WebAuthnRepository` | ❌ Not present | N/A | ❌ | Mobile/desktop missing WebAuthn credential delete entirely. `DeviceRepository.kt` has no `deleteWebAuthnCredential`. |

---

## 10. Device Management

| Operation | DB (table/migration) | Backend (file:method → endpoint) | Web (page/component) | Mobile | Desktop | SDK | Status | Notes/gaps |
|---|---|---|---|---|---|---|---|---|
| Register device | `user_devices` (V17) | `DeviceController.java:87` → `POST /api/v1/devices` | N/A (admin/step-up only) | N/A | N/A | N/A | 🟡 | Register requires `device:register` permission + tenant check; no self-service in UI |
| List devices | `user_devices` | `DeviceController.java:51` → `GET /api/v1/devices` | `DevicesPage.tsx`, `DeviceRepository.ts:listDevices` | `DeviceApiImpl.kt:getDevices` → `GET devices?userId=` | `DevicesScreen.kt` | N/A | ✅ | SUPER_ADMIN cross-tenant supported |
| Delete device | `user_devices` | `DeviceController.java:97` → `DELETE /api/v1/devices/{deviceId}` | `DeviceRepository.ts:deleteDevice` | `DeviceApiImpl.kt:removeDevice` → `DELETE devices/{deviceId}` | `DevicesScreen` via `DeviceViewModel` | N/A | ✅ | |
| Step-up device register | `user_devices.public_key` (V17) | `StepUpController.java:33` → `POST /api/v1/step-up/register-device` | `StepUpDeviceRegistration.tsx` | ❌ Not wired | N/A | N/A | 🟡 | Mobile missing step-up device register |
| Step-up challenge | N/A (Redis/session) | `StepUpController.java:43` → `POST /api/v1/step-up/challenge` | N/A | ❌ Not wired | N/A | N/A | 🟡 | |
| Step-up verify | `user_devices` | `StepUpController.java:52` → `POST /api/v1/step-up/verify-challenge` | N/A | ❌ Not wired | N/A | N/A | 🟡 | |

---

## 11. MFA Orchestration

| Operation | DB (table/migration) | Backend (file:method → endpoint) | Web (page/component) | Mobile | Desktop | SDK | Status | Notes/gaps |
|---|---|---|---|---|---|---|---|---|
| MFA step verify (N-step) | `mfa_sessions` (V35 consumed_at, V36 client_id), `auth_flows`, `auth_flow_steps` | `AuthController.java:656` → `POST /api/v1/auth/mfa/step` (public) | `MultiStepAuthFlow.tsx`, all step components | `AuthApiImpl.kt:verifyMfaStep` + `requestMfaChallenge` | `MfaFlowScreen.kt` (Android-only screen) | N/A | ✅ | All 10 auth methods dispatched via `VerifyMfaStepService` |
| MFA session cancel | `mfa_sessions` | `AuthController.java:696` → `DELETE /api/v1/auth/mfa/session/{token}` (public) | `AuthSessionRepository.ts:cancelSession` | `AuthApiImpl.kt:cancelMfaSession` | N/A | N/A | ✅ | |
| MFA switch method | `mfa_sessions`, `auth_flow_steps.available_methods` | `AuthController.java:767` → `POST /api/v1/auth/mfa/switch-method` (public) | `MultiStepAuthFlow.tsx` + `MethodPickerStep.tsx` | `AuthApiImpl.kt:switchMfaMethod` | N/A | N/A | ✅ | |
| MFA send OTP (email/SMS) | `mfa_sessions` | `AuthController.java:1001` → `POST /api/v1/auth/mfa/send-otp` (public) | Step components for email/SMS OTP | `AuthApiImpl.kt:sendMfaOtp` | N/A | N/A | ✅ | |
| MFA QR generate | `mfa_sessions` | `AuthController.java:977` → `POST /api/v1/auth/mfa/qr-generate` (public) | `QrCodeStep.tsx` | `AuthApiImpl.kt:generateMfaQr` | N/A | N/A | ✅ | |
| Available methods / 2FA status | `auth_flows`, `user_enrollments` | `AuthController.java:1058` → `GET /api/v1/auth/my/2fa-status` | Used by auth flow builder | ❌ Not in `AuthApi` | ❌ Not in desktop | N/A | 🟡 | Mobile/desktop missing 2FA status check |
| Legacy 2FA send code | `mfa_sessions` | `AuthController.java:421` → `POST /api/v1/auth/2fa/send` | `TwoFactorVerification.tsx` | ❌ Not in `AuthApi` | N/A | N/A | 🟡 | Legacy endpoint; new code uses `/mfa/step` |
| Legacy 2FA verify | `mfa_sessions` | `AuthController.java:438` → `POST /api/v1/auth/2fa/verify` | `TwoFactorVerification.tsx` | ❌ Not in `AuthApi` | N/A | N/A | 🟡 | Legacy endpoint; new code uses `/mfa/step` |
| Legacy 2FA verify-method | `mfa_sessions`, `user_enrollments` | `AuthController.java:464` → `POST /api/v1/auth/2fa/verify-method` | `TwoFactorDispatcher.tsx` | ❌ Not in `AuthApi` | N/A | N/A | 🟡 | No auth gate per previous audit (2026-04-30/05-07 notes) |
| AMR / step sequencing | `auth_flow_steps`, `mfa_sessions.completed_steps` | `VerifyMfaStepService.java` | Step progress component | `AuthRepository.discoverPrimaryStep()` | N/A | N/A | ✅ | RFC 8176 AMR in JWT |
| Auth flow CRUD (admin) | `auth_flows`, `auth_flow_steps`, `auth_methods`, `tenant_auth_methods` (V16, V29, V30) | `AuthFlowController.java` → `GET/POST/PUT/DELETE /api/v1/tenants/{tenantId}/auth-flows` | `AuthFlowsPage.tsx`, `AuthFlowBuilder.tsx` | `AuthFlowApiImpl.kt` | N/A | N/A | ✅ | Full CRUD on web and mobile |
| Auth methods list / configure | `auth_methods`, `tenant_auth_methods` | `AuthMethodController.java` → `GET /api/v1/auth-methods`, `GET/PUT /api/v1/tenants/{tenantId}/auth-methods` | `TenantAuthMethods.tsx` | N/A | N/A | N/A | 🟡 | Mobile/desktop missing tenant auth-method configuration |

---

## 12. Email / Phone Verification

| Operation | DB (table/migration) | Backend (file:method → endpoint) | Web (page/component) | Mobile | Desktop | SDK | Status | Notes/gaps |
|---|---|---|---|---|---|---|---|---|
| Send email verification OTP | `users.email_verified` (V2) | `AuthController.java:315` → `POST /api/v1/auth/send-email-verification` | ❔ No dedicated page found | ❌ Not in `AuthApi` | ❌ | N/A | 🟡 | OTP stored in Redis, not DB |
| Verify email | `users.email_verified` | `AuthController.java:332` → `POST /api/v1/auth/verify-email` | ❔ No dedicated page found | ❌ Not in `AuthApi` | ❌ | N/A | 🟡 | |
| Send phone verification OTP | `users.phone_verified` (V2, V54 E.164) | `AuthController.java:366` → `POST /api/v1/auth/send-phone-verification` | N/A | ❌ | ❌ | N/A | 🟡 | |
| Verify phone | `users.phone_verified` | `AuthController.java:387` → `POST /api/v1/auth/verify-phone` | N/A | ❌ | ❌ | N/A | 🟡 | |

---

## 13. Legacy OTP Direct Endpoints (non-MFA-flow)

| Operation | DB (table/migration) | Backend (file:method → endpoint) | Web (page/component) | Mobile | Desktop | SDK | Status | Notes/gaps |
|---|---|---|---|---|---|---|---|---|
| Email OTP send/verify (user-level) | `mfa_sessions` or Redis | `OtpController.java:78/97` → `POST /api/v1/otp/email/send/{userId}`, `POST /api/v1/otp/email/verify/{userId}` | `OtpManagement.tsx` | `OtpApiImpl.kt` | N/A | N/A | 🟡 | Admin/enrollment use-case; not the main login flow |
| SMS OTP send/verify (user-level) | Redis | `OtpController.java:153/191` → `POST /api/v1/otp/sms/send/{userId}`, `POST /api/v1/otp/sms/verify/{userId}` | `SmsOtpEnrollmentFlow.tsx` | `OtpApiImpl.kt` | N/A | N/A | 🟡 | |
| TOTP setup/verify-setup/status/delete | `users` (V39/V42 encrypted TOTP secret) | `OtpController.java:272/294/347/373` → `/api/v1/totp/*` | `TotpEnrollmentDialog.tsx` | `TotpRepository.kt` | N/A | N/A | ✅ | Encryption at rest via V39/V42 |

---

## Cross-cutting findings

### Gaps (missing operations / surfaces)

1. **Mobile / Desktop: forgot-password and reset-password not implemented** — `ForgotPasswordScreen.kt` is a UI stub with no API call; reset-password has no screen or API method in any mobile/desktop layer. `AuthApi` interface has no `forgotPassword` or `resetPassword` methods.
2. **Mobile / Desktop: session list and revoke broken (wrong URL)** — `SessionApiImpl` calls `GET sessions` / `DELETE sessions/{id}` (base `/api/v1/sessions/*`); backend exposes `/api/v1/auth/sessions/my` and `/api/v1/auth/sessions/my/{id}`. These will always 404.
3. **Mobile / Desktop: revoke-all-sessions missing** — `DELETE /api/v1/auth/sessions/my/all` exists on backend and web; no mobile/desktop equivalent.
4. **Mobile: logout does not revoke server-side token** — `AuthApiImpl.logout()` sends no body; backend `POST /auth/logout` requires `{refreshToken}`. Refresh token is never invalidated on mobile logout.
5. **Mobile: change-password hits wrong endpoint** — calls `POST auth/change-password`; backend has `POST /api/v1/users/{id}/change-password` (UserController). No route exists at the path mobile calls.
6. **WebAuthn assertion (authenticate) not implemented on mobile** — `WebAuthnRepositoryImpl.verifyCredential` has an explicit TODO at line ~107; the assertion response is never submitted to `/api/v1/webauthn/authenticate`.
7. **WebAuthn credential list: mobile path mismatch** — `DeviceApiImpl.getWebAuthnCredentials` calls `GET devices/webauthn/credentials/{userId}` → backend has `GET /api/v1/webauthn/credentials/{userId}`. Different path → 404.
8. **WebAuthn credential delete: missing on mobile/desktop** — `DeviceRepository.kt` interface has no `deleteWebAuthnCredential`; backend provides two DELETE endpoints.
9. **Email and phone verification endpoints not surfaced on mobile/desktop, and missing a dedicated web page** — four endpoints exist on backend but no corresponding UI pages were found in web-app.
10. **Desktop session management is read-only** — `SecurityTab.kt` shows sessions but relies on same broken `SessionApiImpl`; no revoke-all.
11. **Step-up device register/challenge/verify not in mobile** — three endpoints on `StepUpController` have no mobile counterpart.

### Issues / bugs (file:line)

- `AuthApiImpl.kt` (client-apps shared): `logout()` sends no body — server never invalidates refresh token. Confirmed by comparing with `AuthController.java:176` which calls `.getRefreshToken()` from request body.
- `ForgotPasswordScreen.kt:~130`: `onClick { isSubmitted.value = true }` — hardcoded success with no network call; English hardcoded strings (violates i18n feedback rule).
- `WebAuthnRepositoryImpl.kt:82-115`: `verifyCredential` uses registration-options endpoint for challenge, never calls `/api/v1/webauthn/authenticate`. Assertion result is computed locally but discarded.
- `SessionApiImpl.kt:14,18`: Paths `sessions` and `sessions/{id}` resolve to `/api/v1/sessions/*` — backend controller is at `/api/v1/auth/sessions/my`. All session-list and revoke calls from mobile/desktop will 404.
- `DeviceApiImpl.kt:getWebAuthnCredentials` calls `devices/webauthn/credentials/{userId}` — backend path is `webauthn/credentials/{userId}`.
- `AuthApiImpl.kt:changePassword` calls `auth/change-password` — no such route on backend. UserController exposes `/api/v1/users/{id}/change-password`.
- `SecurityConfig.java:119`: `POST /api/v1/auth/sessions/*/steps/*/skip` requires authentication (`authenticated()`) but is used pre-JWT in anon flows. Anon callers get 401.

### Inconsistencies across layers/clients

- **Session management** path convention is inconsistent: web uses `/auth/sessions/my/*`, mobile uses `/sessions/*`, authSession operations use `/auth/sessions/*` (without `/my`). Three different path patterns for what are logically related operations.
- **Token refresh**: web calls `/auth/refresh` (proprietary), desktop calls `/oauth2/token` with `grant_type=refresh_token` (standard). Two different token refresh mechanisms.
- **WebAuthn registration endpoints**: backend has two parallel sets (`/webauthn/register/options/{userId}` + `/webauthn/register/verify` for admin-proxied, and `/webauthn/register-options` + `/webauthn/register` for self-service). Mobile uses the legacy user-id form; web enrollment uses both depending on context.
- **Legacy 2FA vs N-step MFA**: both coexist. `/api/v1/auth/2fa/send`, `/2fa/verify`, `/2fa/verify-method` are legacy. `/auth/mfa/step` is the new system. No deprecation barrier prevents clients from mixing them.

### What could not be fully determined

- Whether the `ChangePasswordScreen.kt` in Android is actually backed by a ViewModel that calls `AuthRepository.changePassword()` — the file showed no viewModel reference in the grep output.
- Whether the desktop `SecurityTab` revoke button actually calls `SessionApiImpl.revokeSession` or is disabled — not confirmed whether revoke button is rendered.
- Whether the TOTP setup enrollment in mobile actually uses the correct path (`/api/v1/totp/setup/{userId}`) vs a different path — `TotpRepository` was not fully inspected.
