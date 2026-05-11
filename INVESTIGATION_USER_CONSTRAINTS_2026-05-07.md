# User Constraints Audit — 2026-05-07

## Methodology

Read-only audit of `/opt/projects/fivucsas/` HEAD against the constraint
inventory in the brief. For each constraint I answered four questions:

1. **Defined?** — Is the value present in code/config (file:line)?
2. **Enforced server-side?** — Not only client-side?
3. **Surfaced?** — Does the user get a clear, i18n'd message?
4. **Reasonable?** — Is the value defensible for the use case?

Pattern: `grep` on per-domain anchor terms (`MAX_*`, `Duration.of*`, `*_TTL`,
`RATE_LIMIT_*`, `RETENTION`), then file reads to confirm enforcement and
exception/error-code routing. i18n confirmed by matching error codes
between Java exceptions, `GlobalExceptionHandler`, and
`web-app/src/i18n/locales/{en,tr}.json`. No code edited; no DB read.

Per `feedback_verify_completion_claims.md` I trusted only HEAD source, not
status memos.

## Findings table

| Constraint | Defined? | Enforced server-side? | Surfaced (i18n)? | Value | Severity | File:line |
|---|---|---|---|---|---|---|
| Password min length | Yes | Yes | EN + TR | 8 | OK | `identity-core-api/.../PasswordPolicy.java:23` / `web-app/.../PasswordStep.tsx:35` |
| Password max length | Yes | Yes | No (validation lumped) | 128 | P3 | `PasswordPolicy.java:24` |
| Password complexity (4 classes) | Yes | Yes | EN-only inside back-end string | upper/lower/digit/special | P2 | `PasswordPolicy.java:52-65` |
| Frontend complexity validation | No | n/a | EN+TR helper text only | min 8 only | P2 | `PasswordStep.tsx:35`, `en.json:222` |
| Max login attempts | Yes | Yes | i18n key exists but never fires | 5 | **P0** | `AuthenticateUserService.java:57`, `:79`, `en.json:1576` |
| Lockout duration | Yes | Yes | Same — wrapped as INVALID_CREDENTIALS | 15 min | **P0** | `AuthenticateUserService.java:58`, `:79`, `:126` |
| Email-OTP TTL | Yes | Yes | Generic "Invalid or expired" | 5 min | P1 | `OtpService.java:19`, `EmailOtpAuthHandler.java:49` |
| Email-OTP max attempts | **No** | **No** | n/a | unlimited until TTL | **P0** | `OtpService.java` (no counter) |
| SMS-OTP TTL | Yes | Yes | Generic | 5 min (Redis OtpService) or Twilio Verify default | P1 | `OtpService.java:19`, `SmsOtpAuthHandler.java:51` |
| SMS-OTP max attempts | **No** | **No** | n/a | unlimited until TTL (Twilio Verify enforces its own; in-house path does not) | **P0** | same |
| SMS cost guard | No | No | n/a | none beyond rate limit | P1 | `SmsOtpAuthHandler.java`, no per-user/day cap |
| TOTP window tolerance | Yes (library default) | Yes | Generic | 0 (strict, single 30s window) | P3 | `TotpService.java:22` |
| TOTP digits / period | Yes | Yes | n/a | 6 / 30s SHA1 | OK | `TotpService.java:21,32` |
| MFA session TTL | Yes | Yes | "session expired" generic | 10 min | OK | `AuthenticateUserService.java:59,222` |
| Auth-session step TTL | Yes | Yes | Generic | 10 min | OK | `ExecuteAuthSessionService.java:55,98` |
| Access token TTL | Yes (config) | Yes | n/a (silent refresh) | 24h | P1 (long for SaaS auth) | `application.yml:81`, `JwtService.java:53` |
| Refresh token TTL | Yes (config) | Yes | n/a | 7d | OK | `application.yml:82`, `RefreshTokenService.java:41` |
| Refresh token rotation + reuse-detect | Yes | Yes | TokenRevokedException → 401 | family revoke on reuse | OK | `RefreshTokenService.java:108-121` |
| WebAuthn challenge TTL | Yes | Yes | Surfaced as generic | 5 min | OK | `WebAuthnService.java:24` |
| Step-up challenge TTL | Yes | Yes | Generic | 5 min | OK | `StepUpChallengeService.java:17` |
| QR code (auth) TTL | Yes | Yes | "Invalid or expired QR token" generic | 5 min | P2 | `QrCodeService.java:20`, `QrSessionService.java:34`, `QrCodeAuthHandler.java:44` |
| Face image upload max size (bio) | Yes | Yes (middleware before auth) | 413 PAYLOAD_TOO_LARGE — message NOT i18n'd, surfaced raw | 10 MB | P2 | `biometric-processor/app/core/config.py:85`, `app/main.py:229-256` |
| Face capture frame rate (client) | Implicit | n/a | n/a | `requestAnimationFrame` (~60fps) | P2 (battery/CPU) | `useFaceDetection.ts:182,266,327,406,418` |
| Voice clip max duration | **No explicit cap** | Only by MAX_UPLOAD_SIZE (10 MB) | n/a | unlimited within 10 MB ≈ 10 min @ 16 kHz wav | **P1** | `app/api/routes/voice.py` (no duration check) |
| Voice clip min duration | **No** | **No** | n/a | none | P1 | same |
| Devices per user | **No cap** | **No** | n/a | unlimited | P1 | `DeviceController` / `WebAuthnCredential` no count check |
| Biometric enrollments per method | **No cap** (1 active per method by upsert) | Implicitly via upsert pattern | n/a | 1 active | OK | `ManageEnrollmentService.java` |
| Rate limit /auth/login | Yes | Yes | EN+TR | 10 per 5 min per IP | OK | `RateLimitService.java:71,316` |
| Rate limit register | Yes | Yes | EN+TR | 5 / hour / IP | OK | `RateLimitService.java:87,323` |
| Rate limit password reset | Yes | Yes | EN+TR | 5 / hour / IP | OK | `RateLimitService.java:104,330` |
| Rate limit /auth/mfa/step | Yes | Yes | "Too many attempts" + Retry-After | 30/min/IP | OK | `RateLimitService.java:181,362` |
| Rate limit biometric verify | Yes | Yes (api side) | EN+TR | 20/min/user | OK | `RateLimitService.java:121,338` |
| Rate limit API generic | Yes | Yes | EN+TR | 100/min/user | OK | `RateLimitService.java:138,346` |
| Rate limit GDPR export | Yes | Yes | EN+TR (`exportRateLimit`) | 1/hour/user | OK | `RateLimitService.java:157,354` |
| Rate limit PKCE failures | Yes | Yes | OAuth2 error response | 30/5min/clientId | OK | `RateLimitService.java:219,370` |
| Rate limit (bio) generic | Yes | Yes | 429 raw | 60/min default | OK | `biometric-processor/app/core/config.py:343` |
| Rate limit bio per endpoint | Yes | Yes | 429 raw | enroll 10, verify 30, search 20, liveness 15, batch 5 / min | OK | `config.py:350-379` |
| Anti-spoof confidence threshold | Yes | Yes | None — fails as generic verify-fail | 0.5 | OK | `config.py:131` |
| Liveness confidence (server) | Yes | Yes | Surfaced via score in response | 70 (0-100 scale) | OK | `config.py:140` |
| Passive liveness threshold (client) | Yes | n/a (client only) | None | 0.45 (0-1 scale) | P2 | `web-app/.../useFaceChallenge.ts:13` |
| Face match threshold | Yes | Yes | None — surface as is_match=false | 0.45 | OK | `config.py:139` |
| Face match aged threshold | Yes | Yes | None | 0.38 after 2 years | OK | `config.py:146,154` |
| Quality gate threshold | Yes | Yes | "Image quality low" | 70 (0-100) | OK | `config.py:141` |
| GDPR purge retention window | Yes | Yes (job, default OFF) | n/a (admin) | 30 days | OK | `SoftDeletePurgeJob.java:56`, `application.yml:24-27` |
| Audit log retention | Yes (V57) | Yes (pg_partman, fail-soft) | n/a | 24 months | OK | `V57__audit_logs_pg_partman.sql:265-286` |

## P0 narrative

### P0-1 — Account-lockout error code never reaches the user

`AuthenticateUserService.java:79` and `:127` both throw `InvalidCredentialsException`
when an account is locked or just got locked. The dedicated
`AccountLockedException` class exists at
`identity-core-api/.../domain/exception/AccountLockedException.java:7-25`
with error code `ACCOUNT_LOCKED` and a `remainingLockTimeSeconds` payload
field, but is **not used by the auth path** (only referenced in
`ActivityLogResponse.java:51` for past-tense audit rendering).

Consequence: the frontend's localized message
`en.json:1576` / `tr.json:1576` (`ACCOUNT_LOCKED`: "Your account is
temporarily locked. Try again in {{minutes}} minutes.") is dead. Users get
the generic "Invalid email or password" instead — they cannot tell the
account was locked, nor when to retry. This breaks the explicit UX promise
the i18n catalogue makes.

The lockout itself does work server-side (5 attempts → 15 min lock,
auto-unlock check at `:71-75`). It is the surfacing that is broken.

### P0-2 — Email/SMS OTP have no per-code attempt counter

`OtpService.java:29-43` validates an OTP by comparing the submitted code
to the stored Redis value. On mismatch the code is **kept** (no delete,
no counter increment). An attacker holding a valid MFA session token can
issue up to 30 attempts/min/IP (the `mfaStepBuckets`
limit, `RateLimitService.java:181,362`) for the full 5-min TTL = ~150
guesses against a 10⁶ space ≈ 0.015% per code. Acceptable today, but the
defense relies entirely on the IP rate limit; an attacker rotating IPs
or spreading across 10 minutes can substantially raise the success
probability. Standard practice (NIST SP 800-63B §5.1.3.2, RFC 6238 §5.2)
is to invalidate after 3-5 failures and force a regenerate.

The Twilio Verify provider path (`SmsOtpAuthHandler` when
`SMS_PROVIDER=twilio`) inherits Twilio's own attempt budget (5) — but the
in-house Redis-backed path used for email and the noop SMS provider has
no such limit.

## P1 narrative

### P1-1 — Access-token lifetime is 24 h

`application.yml:81` sets `JWT_EXPIRATION=86400000` (24 h). Industry norm
for refresh-token-bearing systems is 5-15 min. A stolen access token is
usable for an entire day. Refresh-token rotation + family revoke
(`RefreshTokenService.java:108-121`) mitigates *long-term* compromise but
does nothing for the active stolen access token. Recommend cut to 15 min
in `application-prod.yml`.

### P1-2 — Voice clip has no duration cap

`biometric-processor/app/api/routes/voice.py` accepts whatever the
upstream sends, gated only by the 10 MB `MAX_UPLOAD_SIZE`. At 16 kHz
mono PCM that is ~5 minutes. Adversary uploading near-cap voice files
times out the embedder (`ML_MODEL_TIMEOUT_SECONDS=30`,
`config.py:166`) and consumes a verify rate-limit slot per request.
Recommend a hard 10s cap (Resemblyzer typical enrolment 3-5s).

### P1-3 — No cap on devices per user

`WebAuthnCredential` and `user_devices` allow unbounded growth. A single
user can register thousands of devices, bloating the user_devices table
and the WebAuthn allowList payload at challenge time (which is sent to
the browser, increasing latency for everyone on that account).

### P1-4 — SMS cost guard is per-IP only

`RateLimitService` rate-limits login per IP and registration per IP.
There is no per-user-per-day SMS cost cap. An attacker who creates many
accounts (registration is 5/hour/IP — easily multi-IP'd) can trigger
thousands of SMS sends to victim numbers. Cost can spiral on Twilio.
Recommend a per-`phoneNumber` and per-tenant-per-day SMS quota.

## P2 narrative

- **OTP failure messages are generic** ("Invalid or expired …"). User
  cannot tell whether to retry or to request a fresh code, and cannot
  see remaining attempts (which today is "infinite", see P0-2).
  `EmailOtpAuthHandler.java:49`, `SmsOtpAuthHandler.java:51,63`,
  `QrCodeAuthHandler.java:44`.
- **Frontend register form does not preview password complexity**
  (`PasswordStep.tsx:35` only validates `min(8)`). Backend
  rejects with a long English string concatenation
  (`PasswordPolicy.java:69`) that is not i18n'd. User on `tr` locale
  sees English error.
- **Bio 413 response body is not i18n'd**
  (`biometric-processor/app/main.py:247-256` returns raw English).
- **Client passive liveness threshold** is hard-coded
  (`useFaceChallenge.ts:13` `0.45`). Server-side has the same value as
  config but the client has no way to read the operator's choice — they
  drift if operator tunes one side only.
- **Face capture loop is RAF-bound**
  (`useFaceDetection.ts`). On a 144Hz monitor a low-end phone burns
  battery for nothing. Throttle to ≥ 30 ms per detection.

## P3 narrative

- **Password max length 128** is reasonable but never surfaced in helper
  text (`en.json:222` only mentions min). Edge case for passphrase users.
- **TOTP strict (`allowedTimePeriodDiscrepancy=0`,
  `TotpService.java:22`)** rejects clock-skewed codes. dev.samstevens
  default. Reasonable but causes user-facing failures when device clock
  drifts > 30 s. Setting tolerance to 1 (allow ±30 s) is the typical
  middle ground.

## Recommendation list

1. **P0**: Throw `AccountLockedException` (with `remainingLockTimeSeconds`)
   from `AuthenticateUserService.java:79,127` instead of
   `InvalidCredentialsException`. Add a handler to
   `GlobalExceptionHandler.java` that maps it to HTTP 423 (or 429) with
   error code `ACCOUNT_LOCKED` and a `retryAfterSeconds` field. The i18n
   catalogue is already there.
2. **P0**: Add per-OTP attempt counter in `OtpService.java`. After 5
   wrong attempts, delete the code, force regenerate, and surface
   `OTP_LOCKED` with retry-after. Apply to email + SMS (in-house path)
   + QR code.
3. **P1**: Cut `JWT_EXPIRATION` default to 900 000 ms (15 min) in
   `application-prod.yml`. Audit any frontend code that assumes 24 h.
4. **P1**: Add `MAX_VOICE_DURATION_SECONDS` in `biometric-processor` and
   reject in `voice.py` before embedding. Default 10 s.
5. **P1**: Add `MAX_DEVICES_PER_USER` (suggest 20). Enforce in
   `DeviceController` create/register paths and in `WebAuthnCredential`
   registration.
6. **P1**: Add per-phone and per-tenant-per-day SMS quotas; track in
   Redis with daily key.
7. **P2**: i18n the password-complexity violation list — return error
   code `PASSWORD_POLICY_VIOLATION` plus a structured
   `requirements: string[]` in the response so the frontend can render
   each missing rule against `i18n` keys.
8. **P2**: Read passive liveness threshold from server config rather
   than hard-coding in `useFaceChallenge.ts:13`.
9. **P2**: Add i18n for biometric-processor 413 bodies (or have
   identity-core-api translate them when proxying).
10. **P2**: Throttle the face-detect RAF loop to ≥ 33 ms.
11. **P2**: Surface remaining attempts on OTP/login failure responses
    (`attemptsRemaining: n`) so the frontend can render a counter.
12. **P3**: Document password max length (128) in `passwordHelper`.
13. **P3**: Set TOTP `allowedTimePeriodDiscrepancy=1` for clock-skew
    grace.
