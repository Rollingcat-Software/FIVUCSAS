# Password / OTP / TOTP / Recovery — Pipeline Inventory (2026-05-28)

Status legend: ✅ full | 🟡 partial | ❌ missing | 🐞 broken | ❔ unverified

---

## 1. Password

### 1a. Set (at signup / registration)

| Operation | DB (table/migration) | Backend (file:method → endpoint) | Web | Mobile | Desktop | SDK | Status | Notes/gaps |
|---|---|---|---|---|---|---|---|---|
| Create/set password at registration | `users.password_hash` VARCHAR(255) — V2 | `AuthController.register:111` → `POST /api/v1/auth/register` via `RegisterUserUseCase` → `RegisterUserService` | `RegisterPage.tsx` | `shared/ui/screen/RegisterScreen.kt` + `RegisterViewModel.kt` | Deprecated — hosted-first pivot 2026-04-18; stub still present `Main.kt:302` | `LoginMfaFlow.tsx` (password step only) | ✅ | BCrypt hash (V2 comment confirms `$2a$12$`). Policy enforced via `PasswordPolicy.java` domain object. |

### 1b. Policy / Validation

| Operation | DB | Backend | Web | Mobile | Desktop | SDK | Status | Notes/gaps |
|---|---|---|---|---|---|---|---|---|
| Password policy enforcement | N/A (stateless) | `PasswordPolicy.java:44` — min 8, max 128, uppercase, lowercase, digit, special char. Also duplicated inline in `AuthController.validatePasswordComplexity:297` | `passwordValidator.ts` + `PasswordStrengthIndicator` on `RegisterPage.tsx` | `ValidationRules.kt:196` — identical policy (min 8, max 128, uppercase, lowercase, digit, special) | `DesktopChangePasswordScreen.kt:76` + `PasswordStrengthIndicator.kt` shared component | N/A | 🟡 | Policy duplicated between `PasswordPolicy.java` and `AuthController.validatePasswordComplexity:297` — drift risk. Breach-check (Have I Been Pwned / hibp) is absent in all layers. |

### 1c. Change Password (authenticated user)

| Operation | DB | Backend | Web | Mobile | Desktop | SDK | Status | Notes/gaps |
|---|---|---|---|---|---|---|---|---|
| Change password (current + new) | `password_history` (V5) — last 5 hashes checked | `UserController` → `ChangePasswordUseCase` → `ChangePasswordService.execute:42` → `PUT /api/v1/users/{id}/password` (or similar) | `ChangePasswordDialog.tsx` | `ChangePasswordScreen.kt` (Android) → `ChangePasswordViewModel.kt:23` → `ChangePasswordUseCase.kt` | `DesktopChangePasswordScreen.kt:118` → `viewModel.changePassword()` | N/A | ✅ | History check enforced (last 5) in `ChangePasswordService:52`. Audit log emitted `PASSWORD_CHANGED` (`ChangePasswordService:80`). |

### 1d. Forgot Password / Request Reset

| Operation | DB | Backend | Web | Mobile | Desktop | SDK | Status | Notes/gaps |
|---|---|---|---|---|---|---|---|---|
| Request reset (email enumeration-safe) | `users.password_reset_token` / `password_reset_expires_at` (V2 — columns present but unused by OTP path) | `AuthController.forgotPassword:211` → `POST /api/v1/auth/forgot-password`; generates 6-digit OTP in Redis key `password-reset:<userId>`, TTL via `OtpService.generate` (5 min) | `ForgotPasswordPage.tsx:129` → `POST /auth/forgot-password` | `ForgotPasswordScreen.kt:119` — **BUG**: button only sets `isSubmitted=true` locally, no API call made | Desktop: deprecated `Main.kt:314-315`, routes to hosted page | N/A | 🐞 | **Mobile forgot-password screen makes NO API call** (`ForgotPasswordScreen.kt:119-123`). The `onClick` flips `isSubmitted.value = true` immediately without calling any use case or repository. The entire reset link concept is misleading — the backend sends a 6-digit OTP code, not a reset link, but the mobile UI says "reset link". Also: `users.password_reset_token` column exists in DB but backend uses Redis OTP instead — column is dead. |

### 1e. Reset Password (verify code + set new)

| Operation | DB | Backend | Web | Mobile | Desktop | SDK | Status | Notes/gaps |
|---|---|---|---|---|---|---|---|---|
| Reset password with OTP code | Redis `password-reset:<userId>` consumed on success | `AuthController.resetPassword:244` → `POST /api/v1/auth/reset-password`; validates account active+unlocked, checks complexity, consumes OTP | `ResetPasswordPage.tsx:136` — Zod schema validates code + newPassword | Mobile: N/A (no reset-code confirmation screen found) | Desktop: deprecated, hosted page | N/A | 🟡 | Web full. Mobile has no reset-code entry screen — forgot-password flow dead-ends. Rate limit on `forgotPassword` by IP (`allowPasswordResetAttempt`) but no per-user rate limit. `users.password_reset_token`/`password_reset_sent_at`/`password_reset_expires_at` columns (V2) are never written — leftover schema. |

---

## 2. Email OTP

### 2a. Send / Request

| Operation | DB | Backend | Web | Mobile | Desktop | SDK | Status | Notes/gaps |
|---|---|---|---|---|---|---|---|---|
| Send email OTP (standalone) | Redis `otp:email:<userId>` — 5 min TTL | `OtpController.sendEmailOtp:78` → `POST /api/v1/otp/email/send/{userId}` | `OtpManagement.tsx:81` (admin/settings dialog) | `OtpViewModel.sendEmailOtp:22` → `OtpApiImpl` → `POST /otp/email/send/{userId}` | N/A | N/A | ✅ | |
| Send email OTP during 2FA flow | Redis `2fa-login:<userId>` | `AuthController.send2FACode:422` → `POST /api/v1/auth/2fa/send`; also `AuthController.sendMfaOtp:1001` → `POST /api/v1/auth/mfa/send-otp` | `LoginMfaFlow.tsx` + `EmailOtpMfaStep.tsx` | `MfaFlowScreen.kt` / `EmailOtpScreen.kt` | N/A | `LoginMfaFlow.tsx` via `/auth/mfa/send-otp` | ✅ | |
| Send email verification OTP | Redis `email-verify:<userId>` | `AuthController.sendEmailVerification:315` → `POST /api/v1/auth/send-email-verification` | `MyProfilePage.tsx` | Not found | N/A | N/A | 🟡 | Mobile email verification trigger absent. |

### 2b. Verify

| Operation | DB | Backend | Web | Mobile | Desktop | SDK | Status | Notes/gaps |
|---|---|---|---|---|---|---|---|---|
| Verify email OTP (standalone) | Redis consumed on success | `OtpController.verifyEmailOtp:97` → `POST /api/v1/otp/email/verify/{userId}` — returns `remainingAttempts` | `OtpManagement.tsx:108` | `OtpViewModel.verifyEmailOtp:49` → `OtpApiImpl` | N/A | N/A | ✅ | Max 5 attempts (NIST 800-63B) enforced server-side via `OtpService.MAX_ATTEMPTS`. |
| Verify email OTP during MFA step | Redis `2fa-login:<userId>` consumed | `AuthController.verify2FACode:438` → `POST /api/v1/auth/2fa/verify`; `AuthController.verify2FAMethod:463` for multi-method; `VerifyMfaStepService` via `POST /api/v1/auth/mfa/step` | `EmailOtpMfaStep.tsx` + `MultiStepAuthFlow.tsx` | `MfaFlowViewModel.kt` + `EmailOtpScreen.kt` | N/A | `LoginMfaFlow.tsx` | ✅ | |
| Verify email address OTP | Redis `email-verify:<userId>` | `AuthController.verifyEmail:332` → `POST /api/v1/auth/verify-email` — returns 401 on failure | `MyProfilePage.tsx` | N/A | N/A | N/A | 🟡 | Mobile absent. |

### 2c. Resend

| Operation | DB | Backend | Web | Mobile | Desktop | SDK | Status | Notes/gaps |
|---|---|---|---|---|---|---|---|---|
| Resend email OTP | Same as send — `OtpService.generate` clears old counter | Calling send endpoint again serves as resend | `OtpManagement.tsx:237` (resend button) | `OtpViewModel` / `SmsOtpScreen.kt` (resend with 30s cooldown for SMS; email variant via same `sendEmailOtp`) | N/A | N/A | ✅ | No explicit resend endpoint; re-calling `/send` resets attempt counter (`OtpService.generate:59`). |

### 2d. Attempt limits / lockout

| Operation | DB | Backend | Web | Mobile | Desktop | SDK | Status | Notes/gaps |
|---|---|---|---|---|---|---|---|---|
| OTP attempt exhaustion | Redis `otp:email:<userId>:attempts` | `OtpService.validateWithResult:82` — 5 strikes burns OTP, returns `exhausted()`. `OtpController.buildVerifyResponse:130` sends `OTP_ATTEMPTS_EXHAUSTED` + `remainingAttempts:0` | `OtpManagement.tsx:113` reads `success` field only — does NOT surface `remainingAttempts` or `OTP_ATTEMPTS_EXHAUSTED` error code | `OtpViewModel:54` reads `result.success` only — no `errorCode` branch | N/A | N/A | 🐞 | **Web and mobile do not read `errorCode`/`remainingAttempts` fields** from verify response. User sees generic failure message instead of "request a new code" prompt. Backend sends the data; clients ignore it. `OtpManagement.tsx:113`: `if (response.data.success !== false)` — treats `{success:false, errorCode:"OTP_ATTEMPTS_EXHAUSTED"}` the same as `OTP_INVALID`. |

---

## 3. SMS OTP

### 3a. Send / Request

| Operation | DB | Backend | Web | Mobile | Desktop | SDK | Status | Notes/gaps |
|---|---|---|---|---|---|---|---|---|
| Send SMS OTP (standalone) | Redis `otp:sms:<userId>` — unless Twilio Verify (provider-managed) | `OtpController.sendSmsOtp:153` → `POST /api/v1/otp/sms/send/{userId}`. Twilio Verify path delegates entirely to provider `OtpController:176`. | `SmsOtpEnrollmentFlow.tsx:129` → `POST /otp/sms/send/{userId}` | `SmsOtpScreen.kt:166` → `OtpViewModel.sendSmsOtp` → `OtpApiImpl` | N/A | N/A | ✅ | Phone number required (validated). Twilio Verify path vs local Redis path branched at `OtpController:176`. |
| Send SMS OTP during 2FA | Redis `2fa-sms:<userId>` | `AuthController.send2FASms:1038` → `POST /api/v1/auth/2fa/send-sms`; also `AuthController.sendMfaOtp:1020` for MFA flow | `SmsOtpStep.tsx` + `LoginMfaFlow.tsx` | `MfaFlowScreen.kt` / `SmsOtpScreen.kt` | N/A | `LoginMfaFlow.tsx` | ✅ | Note: `send2FASms:1044` always uses local OTP regardless of SmsService type — **BUG**: if Twilio Verify is configured, `2fa-sms:` key is generated locally but `/2fa/verify-method` SMS branch checks `verifiable.verifyCode(phone, code)` against Twilio (different source) → mismatch. Verify via `OtpController.verifySmsOtp` is correct; the `AuthController.send2FASms` path is not. |

### 3b. Verify

| Operation | DB | Backend | Web | Mobile | Desktop | SDK | Status | Notes/gaps |
|---|---|---|---|---|---|---|---|---|
| Verify SMS OTP (standalone) | Redis consumed | `OtpController.verifySmsOtp:191` → `POST /api/v1/otp/sms/verify/{userId}`. Twilio path: `verifiable.verifyCodeDetailed(phone, code)` | `OtpManagement.tsx:108` | `OtpViewModel.verifySmsOtp:103` | N/A | N/A | ✅ | Twilio Verify path correctly uses `verifyCodeDetailed`. Local OTP path uses `validateWithResult`. |
| Verify SMS OTP during 2FA | Redis `2fa-sms:<userId>` or Twilio | `AuthController.verify2FAMethod:488-511` (SMS_OTP branch); `VerifyMfaStepService` via MFA step | `SmsOtpStep.tsx` | `MfaFlowViewModel.kt` | N/A | `LoginMfaFlow.tsx` | 🟡 | See send-path bug above. |
| Verify phone number OTP | Redis `phone-verify:<userId>` | `AuthController.verifyPhone:387` → `POST /api/v1/auth/verify-phone` — 401 on failure | N/A (profile page?) | N/A | N/A | N/A | 🟡 | Phone verification UI not found in web or mobile; backend endpoint exists. |

### 3c. Resend

| Operation | DB | Backend | Web | Mobile | Desktop | SDK | Status | Notes/gaps |
|---|---|---|---|---|---|---|---|---|
| Resend SMS OTP | Re-generate via send endpoint | Same send endpoint | `SmsOtpEnrollmentFlow.tsx:141` — `handleResendOtp` | `SmsOtpScreen.kt:214` — resend button with 30s cooldown timer | N/A | N/A | ✅ | Mobile has client-side 30s resend cooldown (`resendSeconds`). No server-side resend rate limit beyond IP-level bucket. |

---

## 4. TOTP (Authenticator App)

### 4a. Enroll / Provision

| Operation | DB | Backend | Web | Mobile | Desktop | SDK | Status | Notes/gaps |
|---|---|---|---|---|---|---|---|---|
| Generate secret + QR | `users.two_factor_secret` VARCHAR(512) — V23; Redis `totp:secret:pending:<userId>` 10 min TTL | `OtpController.setupTotp:272` → `POST /api/v1/totp/setup/{userId}` — generates 32-char Base32 secret, `otpauth://totp/` URI, stores pending in Redis | `TotpEnrollment.tsx:138` — calls `/totp/setup/{userId}`, renders QR from external `api.qrserver.com` | `TotpViewModel.setup:44` → `TotpApiImpl.setup` → `POST /totp/setup/{userId}`; `TotpEnrollScreen.kt` renders QR from external `api.qrserver.com` | No TOTP enrollment screen in desktop | `TotpStep.tsx` in `LoginMfaFlow` (verify only, not enroll) | 🟡 | QR rendered via external third-party service (`api.qrserver.com`) — privacy leak of `otpauth://` URI including email to external server. Desktop has no TOTP enrollment screen. |
| Verify setup code (confirm enrollment) | Writes `enc:v1:...` to `users.two_factor_secret` via `TotpSecretCipher.encrypt`; clears Redis pending | `OtpController.verifyTotpSetup:294` → `POST /api/v1/totp/verify-setup/{userId}` — verifies code, moves secret from pending Redis to active Redis + DB with encryption | `TotpEnrollment.tsx:163` | `TotpViewModel.verifySetup:72` → `TotpApiImpl.verifySetup` | N/A | N/A | ✅ | Secret encrypted at rest (AES-GCM-256) via `TotpSecretCipher`. V42 CHECK constraint enforces `enc:v1:` prefix. |

### 4b. Read / Status

| Operation | DB | Backend | Web | Mobile | Desktop | SDK | Status | Notes/gaps |
|---|---|---|---|---|---|---|---|---|
| Get TOTP status | `users.two_factor_secret IS NOT NULL` + Redis | `OtpController.getTotpStatus:347` → `GET /api/v1/totp/status/{userId}` — Redis-first, falls back to DB, re-caches | `TotpEnrollment.tsx:101` checks on open | `TotpViewModel.checkStatus:22` → `TotpApiImpl.getStatus` | N/A | N/A | ✅ | |

### 4c. Verify / Authenticate

| Operation | DB | Backend | Web | Mobile | Desktop | SDK | Status | Notes/gaps |
|---|---|---|---|---|---|---|---|---|
| Verify TOTP code during MFA | `users.two_factor_secret` (Redis-first lookup) | `AuthController.verify2FAMethod:489` (TOTP branch); `TotpVerifyMfaStepHandler` via `VerifyMfaStepService`; `TotpAuthHandler.java` for auth-session flow | `TotpStep.tsx` | `MfaFlowViewModel.kt` | N/A | `LoginMfaFlow.tsx:296` `<TotpStep>` | ✅ | `TotpService.verifyCode` — SHA1/6-digit/30s window (IETF RFC 6238). No replay protection (used code not blacklisted). |

### 4d. Disable / Delete

| Operation | DB | Backend | Web | Mobile | Desktop | SDK | Status | Notes/gaps |
|---|---|---|---|---|---|---|---|---|
| Disable TOTP | Clears `users.two_factor_secret` + `two_factor_backup_codes` | `OtpController.revokeTotp:373` → `DELETE /api/v1/totp/{userId}` — clears Redis + DB | `TotpEnrollment.tsx:192` — `handleDisable` with `window.confirm` | **Missing** — `TotpApi` interface has no `delete`/`disable` method; `TotpApiImpl` has no DELETE | N/A | N/A | 🐞 | **Mobile cannot disable TOTP.** `TotpApi.kt:16` only declares `setup`, `verifySetup`, `getStatus`. No `revoke`/`delete` method. `TotpApiImpl.kt` confirms — only 3 endpoints. Mobile users who enrolled TOTP have no path to remove it. |

### 4e. Strict Mode

| Operation | DB | Backend | Web | Mobile | Desktop | SDK | Status | Notes/gaps |
|---|---|---|---|---|---|---|---|---|
| TOTP strict mode (require before any operation) | N/A | `FIVUCSAS_TOTP_REJECT_PLAINTEXT` application property mentioned in V42 runbook — no implementation found in Java sources searched | N/A | N/A | N/A | N/A | ❔ | V42 runbook mentions `FIVUCSAS_TOTP_REJECT_PLAINTEXT=true` flag for "application-side reads refuse plaintext"; not found in `TotpSecretCipher.java` (`decryptIfNeeded:119` still returns legacy plaintext). May be a planned-but-unimplemented guard. |

---

## 5. Recovery / Backup Codes

| Operation | DB | Backend | Web | Mobile | Desktop | SDK | Status | Notes/gaps |
|---|---|---|---|---|---|---|---|---|
| Generate backup codes at TOTP enrollment | `users.two_factor_backup_codes` VARCHAR(1024) — V23 | `User.enable2FA:816` — accepts `String[] backupCodes` and joins as CSV. `TwoFactorSetupResponse.java:25` DTO has `backupCodes` field. Called from `OtpController.verifyTotpSetup:337` but `backupCodes` param is **null** | N/A — web TOTP enrollment flow does not display backup codes | N/A | N/A | N/A | ❌ | **Backup codes are never generated.** `OtpController.verifyTotpSetup:337`: `user.enable2FA(totpSecretCipher.encrypt(secret), null)` — always passes `null` for `backupCodes`. The DB column, DTO field, and domain method all exist but no code path ever generates actual codes or presents them to the user. |
| Verify backup code | `users.two_factor_backup_codes` | No controller endpoint found for backup code verification | N/A | N/A | N/A | N/A | ❌ | No endpoint exists. Checked `OtpController`, `AuthController`, `UserController` — zero references to backup code verification. |
| Regenerate backup codes | `users.two_factor_backup_codes` | No endpoint found | N/A | N/A | N/A | N/A | ❌ | Entirely missing. |
| Count remaining backup codes | N/A | No endpoint found | N/A | N/A | N/A | N/A | ❌ | Entirely missing. |

---

## Cross-cutting findings

### Gaps / Issues (file:line) / Inconsistencies

**P0 — Broken / Security Critical**

1. **Mobile forgot-password makes no API call** — `ForgotPasswordScreen.kt:119-123` (`shared/src/commonMain`): `onClick` sets local state to `true` without calling any repository or use case. Mobile users believe a reset link was sent; nothing was.

2. **Backup codes never generated** — `OtpController.java:337`: `user.enable2FA(totpSecretCipher.encrypt(secret), null)` — `backupCodes` is hardcoded `null`. The entire backup-code pipeline (DB column V23, `TwoFactorSetupResponse.backupCodes`, `User.enable2FA` signature, `User.twoFactorBackupCodes` field) exists but is inert. No verification, regeneration, or count-remaining endpoint exists anywhere.

3. **Mobile cannot disable TOTP** — `TotpApi.kt:16` and `TotpApiImpl.kt` have no `revoke`/`delete` method. `DELETE /api/v1/totp/{userId}` exists on backend (`OtpController:373`) but no mobile call site exists.

**P1 — Partial / Incorrect**

4. **`send2FASms` uses local OTP key with Twilio Verify** — `AuthController.java:1044`: when `SmsService` is a `VerifiableSmsService`, `send2FASms` still writes to Redis `2fa-sms:<userId>` via local `OtpService`. But `verify2FAMethod` SMS branch calls `verifiable.verifyCode(phone, code)`. The codes are from different sources — Twilio Verify would reject a locally-generated code. `OtpController.sendSmsOtp:176` correctly handles this bifurcation; `AuthController.send2FASms:1044` does not.

5. **OTP exhaustion `errorCode` ignored by web and mobile** — `OtpManagement.tsx:113` and `OtpViewModel.kt:54` only check `result.success`; they discard `errorCode:"OTP_ATTEMPTS_EXHAUSTED"` and `remainingAttempts`. Users see a generic error instead of "max attempts reached — request a new code."

6. **`users.password_reset_token` columns are dead schema** — V2 creates `password_reset_token`, `password_reset_sent_at`, `password_reset_expires_at`. The reset flow uses Redis OTP exclusively; these columns are never written.

7. **TOTP replay attack possible** — `TotpService.verifyCode:36` uses `DefaultCodeVerifier.isValidCode` which checks a time window but does NOT blacklist consumed codes. A used code remains valid within the ~30s TOTP window.

8. **QR code rendered via external service** — `TotpEnrollment.tsx:325` and `TotpEnrollScreen.kt:175` both construct `api.qrserver.com/v1/create-qr-code/?...data=<otpauth://...>`. This sends the TOTP secret URI (including user email and issuer) to a third-party API.

9. **`FIVUCSAS_TOTP_REJECT_PLAINTEXT` unimplemented** — V42 runbook references this flag but `TotpSecretCipher.decryptIfNeeded:119` returns legacy plaintext without checking it. The DB constraint (`enc:v1:`) was added but the application-side guard was not.

10. **Mobile ForgotPassword UI says "reset link" but backend sends 6-digit OTP code** — UX/copy mismatch even aside from the no-API-call bug.

**N/A notes**
- Desktop: password reset/forgot-password deprecated at `Main.kt:314-315` (hosted-first pivot 2026-04-18). `DesktopChangePasswordScreen` wires through shared KMP viewmodel — full.
- SDK (`verify-app`): covers password step + all 10 MFA step types in `LoginMfaFlow.tsx`. No enrollment flows in SDK — enrollment is dashboard-only.
