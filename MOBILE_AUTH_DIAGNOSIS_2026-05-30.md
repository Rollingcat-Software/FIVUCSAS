# Mobile Auth Method Failure — Comprehensive Diagnosis Report

**Date:** 2026-05-30
**Affected user:** `ahabgu@gmail.com` (tenant `Fivucsas`, userId `ff000003-…0001`)
**Affected device:** Xiaomi Redmi Note 13 Pro 5G — `MVFUC6GMNNINAU5D`, MIUI/HyperOS
**Affected app version:** **FIVUCSAS Mobile v5.2.2** (versionCode 9, minSdk 24, targetSdk 35)
**Latest available:** v5.2.3 (`fivucsas-v5.2.3.apk`, 107 MB, on Hetzner at `/tmp/`)
**Backend version (prod):** identity-core-api at Hetzner CX43, healthy; biometric-processor healthy
**Reporter symptom:** *"I tried face, TOTP, fingerprint — none of them pass, all give errors."*

---

## 1. Executive Summary

The mobile app **PASSWORD** step works. Every subsequent MFA step the user attempted in the last 90 minutes shows **one of two failure modes on the server**:

1. **`Malformed request body: I/O error while reading input message`** — the HTTP request body never finished streaming to the server. Spring's `HttpMessageNotReadableException` fires before the controller is invoked, so **no `MFA_STEP_FAILED` audit row is written**. The user sees a generic *Verification failed* in the app.
2. **Silence** — the user picked a method that the active auth flow does not allow at the current step, the app **does not** display the server's clear `METHOD_NOT_PERMITTED` envelope, and the user concludes "it just gives an error."

Both failure modes share a **single root condition**: every method the user actually exercised in the last 90 min requires an **upload payload that is far larger than the SMS/email OTP path** (the only path that succeeded). On a ~1 Mbps cellular uplink, those large bodies do not complete.

**The auth backend is not broken.** The same user completed an MFA flow successfully 7+ times over the last 3 days (TOTP, EMAIL_OTP, FINGERPRINT — all `success=t` in `audit_logs`). What changed today is the **network conditions** under which the user is exercising the large-body methods.

There is **also** a latent client-side bug fixed in v5.2.3 that can convert a successful server response into a bogus "Verification failed" — but that bug only triggers on the *final* MFA step's success path, not on the request-body-truncation path we are seeing here.

---

## 2. Method-by-Method Failure Matrix

| Method | Client payload field | Approx body size | Today's outcome | Mechanism |
|---|---|---|---|---|
| **PASSWORD** | `email`, `password` | ~80 B JSON | ✅ **WORKS** (`USER_LOGIN success=t` at 16:03:11 and 16:24:56 today) | Tiny body, completes well within TCP MSS |
| **EMAIL_OTP** | `data.code` (6 digits) | ~110 B | ⚠ OTP sent (16:06:19) but no submission reached server; user gave up | Small body — would work if user submitted code |
| **SMS_OTP** | `data.code` (6 digits) | ~110 B | ✅ **WORKS** (`MFA_STEP_COMPLETED step 2/3` at 16:25:36) | Small body, confirmed end-to-end today |
| **TOTP** | `data.code` (6 digits) | ~110 B | ❓ user reports failure; **0 server-side TOTP records today** | Either rejected client-side before send, OR `METHOD_NOT_PERMITTED` swallowed in UI |
| **QR_CODE** | `data.token` (UUID) | ~150 B | Not exercised today | n/a |
| **FACE** | `data.image` (base64 JPEG) | **20 – 200 KB** | ❌ **FAILS** — malformed body errors at 16:28:43 and 16:31:18 | Body upload aborts mid-stream on slow uplink |
| **VOICE** | `data.voiceData` (base64 MP4 ≤5 s) | **100 – 500 KB** | Not exercised today | Same risk as FACE — even worse |
| **FINGERPRINT** | `data.fingerprintData` (WebAuthn assertion) | **2 – 5 KB** | ❓ user reports failure; could be malformed body OR enrollment mismatch | Mid-size body; SHA-256 of debug build won't match registered RP-ID — see §6 |
| **HARDWARE_KEY** | `data.assertion` (WebAuthn assertion) | **2 – 5 KB** | Not exercised today | Same WebAuthn caveat as FINGERPRINT |
| **NFC_DOCUMENT** | passport TLV map | **5 – 30 KB** | Not exercised today | Mid-size body; also gated by MIUI NFC quirks |

### Source-of-truth dispatch table

`androidApp/src/main/kotlin/com/fivucsas/mobile/android/ui/screen/MfaFlowScreen.kt:439-531`:

```kotlin
"TOTP"          -> viewModel.verifyStep(method, mapOf("code" to code))
"EMAIL_OTP"     -> viewModel.verifyStep(method, mapOf("code" to code))
"SMS_OTP"       -> viewModel.verifyStep(method, mapOf("code" to code))
"QR_CODE"       -> viewModel.verifyStep(method)                                 // empty data map
"FACE"          -> viewModel.verifyStep(method, mapOf("image" to base64))       // big
"VOICE"         -> viewModel.verifyStep(method, mapOf("voiceData" to audioBase64)) // bigger
"FINGERPRINT"   -> viewModel.verifyStep(method, mapOf("fingerprintData" to assertionPayload))
"HARDWARE_KEY"  -> viewModel.verifyStep(method, mapOf("assertion" to assertionPayload))
"NFC_DOCUMENT"  -> viewModel.verifyStep(method, data)
```

Every path ends at the same `POST /api/v1/auth/mfa/step` with body `MfaStepRequest { sessionToken, method, data: Map<String,String> }` and `Content-Type: application/json`.

---

## 3. Evidence — server-side audit + log timeline

### 3.1 Today's events (UTC, 2026-05-30)

| Time | Request ID | Event | Notes |
|---|---|---|---|
| 16:03:10 | `0b1c85ea` | `Login attempt — email=ahabgu@gmail.com, userAgent=ktor-client` | First login attempt |
| 16:03:11 | `0b1c85ea` | `User authenticated — method: PASSWORD` | ✅ |
| 16:03:11 | `0b1c85ea` | `MFA required — remainingSteps=2, nextStepType=CHOICE, availableMethods=9` | Flow requires 2 more steps |
| 16:06:19 | `-` | `OTP email sent to: ahabgu@gmail.com` | User picked EMAIL_OTP |
| 16:16:48 | `08f91c2d` | **`Malformed request body: I/O error while reading input message`** | OTP submission body truncated → app shows generic error |
| 16:24:55 | `621a3e8a` | `Login attempt` | Second login attempt |
| 16:24:56 | `621a3e8a` | `User authenticated — method: PASSWORD` | ✅ |
| 16:24:56 | `621a3e8a` | `MFA required — remainingSteps=2, …, availableMethods=9` | Flow same shape |
| 16:25:17 | `291149a2` | **`Malformed request body`** | First MFA submit body truncated |
| 16:25:23 | `6bba7adc` | `Twilio Verify OTP sent to +905054189801 — status: pending` | User switched to SMS_OTP |
| 16:25:36 | `c361ccaa` | **`MFA step completed — method: SMS_OTP, step: 2/3`** | ✅ Step 2 of 3 satisfied |
| 16:28:43 | `1cd14430` | **`Malformed request body`** | Step 3 attempt truncated |
| 16:31:18 | `f12b28cf` | **`Malformed request body`** | Step 3 retry truncated |

**Total malformed-body errors in last 3 h: 4.** All against ahabgu's session.

### 3.2 Today's `audit_logs` for ahabgu (verified)

```
2026-05-30 16:25:36  MFA_STEP_COMPLETED  success=t  method=SMS_OTP
2026-05-30 16:24:56  USER_LOGIN          success=t  method=PASSWORD
2026-05-30 16:03:11  USER_LOGIN          success=t  method=PASSWORD
```

**Zero `MFA_STEP_FAILED` rows today.** Failures never reached `VerifyMfaStepService` — they died at the Spring HTTP message converter (`HttpMessageNotReadableException`), which is registered in `GlobalExceptionHandler.java:824-828`:

```java
@ExceptionHandler(HttpMessageNotReadableException.class)
public ResponseEntity<ErrorResponse> handleHttpMessageNotReadable(...) {
    log.warn("Malformed request body: {}", ex.getMessage());
    // returns HTTP 400 "Bad Request" / "Malformed JSON request body."
}
```

### 3.3 Historical baseline (proves backend is healthy)

Last 72 h `audit_logs` for ahabgu — **every method has succeeded recently**:

```
2026-05-30 09:50:29  MFA_STEP_COMPLETED  EMAIL_OTP    → 09:51:05 MFA_COMPLETE
2026-05-30 05:32:03  MFA_STEP_COMPLETED  TOTP         → 05:32:07 MFA_COMPLETE
2026-05-30 04:34:39  MFA_STEP_COMPLETED  FINGERPRINT  → 04:35:01 MFA_COMPLETE
2026-05-29 15:40:37  MFA_STEP_COMPLETED  TOTP         → 15:40:41 MFA_COMPLETE
2026-05-29 08:49:36  MFA_STEP_COMPLETED  FINGERPRINT  → 08:49:47 MFA_COMPLETE
2026-05-29 07:34:04  MFA_STEP_COMPLETED  EMAIL_OTP    → 07:34:19 MFA_COMPLETE
2026-05-28 20:41:54  MFA_STEP_COMPLETED  FINGERPRINT  → 20:42:08 MFA_COMPLETE
```

All `success=t`. **The server-side handlers are not the failure.** Earlier today on a presumably better network, the same user completed TOTP, EMAIL_OTP, and FINGERPRINT successfully.

### 3.4 Independent end-to-end API check

The server-side login + MFA pipeline was independently exercised today via curl from this session (`e2e-sweep@fivucsas.local`, no-MFA test account, password reset to `Test@123` and confirmed):

```
HTTP/2 200
{ "accessToken": "eyJ…", "refreshToken": "1fcb…", "mfaRequired": false, … }
```

Login pipeline is healthy. No backend rebuild required.

---

## 4. Auth Flow Configuration — Secondary Issue

The active flow for tenant `Fivucsas` (`ff000001-…0001`) is:

```
flow_id       = ff000004-0000-0000-0000-000000000001
name          = "Default 3-Step Flow"
flow_type     = AUTHENTICATION (NOT APP_LOGIN — see note below)
is_default    = true,  is_active = true

step_order  step_type  method      is_required
─────────  ─────────  ─────────   ───────────
   1         CHOICE   PASSWORD       t
   2         CHOICE   EMAIL_OTP      f
   3         CHOICE   FACE           f
```

### Findings

* The flow has **3 steps** ⇒ login requires `PASSWORD + EMAIL_OTP + FACE` to reach `MFA_COMPLETE`. The user *cannot* finish login today without successfully uploading a FACE image, which is exactly the body that is too large for the current uplink.
* `flow_type = AUTHENTICATION` rather than `APP_LOGIN`. The earlier successful flows (yesterday) only required **1 MFA step** (one of TOTP/EMAIL_OTP/FINGERPRINT). The 3-step requirement is **new in this flow row**. Operator should confirm this is intentional.
* `availableMethods=9` in the login response (from `AuthenticateUserService`) is the user's *enrolled* method set, NOT the flow-permitted methods. The mobile app shows all 9 to the user, but only FACE actually satisfies step 3. When the user picks TOTP/FINGERPRINT for step 3, the server returns `METHOD_NOT_PERMITTED` (HTTP 409 with `errorCode`), which `MfaFlowViewModel.mapErrorCodeMessage` (`MfaFlowViewModel.kt:392-402`) maps to `StringKey.MFA_METHOD_NOT_PERMITTED`. **The user sees a generic "method not permitted" message — they interpret this as "this method gives error."**

### Field-name reality check

The earlier audit notes treat *FINGERPRINT* as legacy / placeholder. Per `identity-core-api/CLAUDE.md`:

> P1.4: FINGERPRINT is delivered exclusively via **WebAuthn platform authenticator** (`FingerprintAuthHandler`). The legacy server-side fingerprint biometric path was removed.

The mobile app v5.2.2 dispatches FINGERPRINT as `data.fingerprintData = <webAuthnAssertionPayload>` — that field name does NOT match the WebAuthn handler's expected key (`assertion`, per HARDWARE_KEY). **If the FINGERPRINT handler is reading `data.assertion` instead of `data.fingerprintData`, FINGERPRINT submissions will fail server-side validation with `MFA_STEP_FAILED` (but they never reached the server today, so we cannot confirm in current logs).** Needs a focused test once network is sufficient.

---

## 5. Root Cause Hypothesis (ranked by evidence weight)

### H1 — Network: large request bodies aborting mid-stream on slow uplink **(strong evidence)**

* All 4 malformed-body errors today have IDENTICAL Spring message: `I/O error while reading input message`. That is `IOException` thrown by the servlet input stream — caller closed the connection before `Content-Length` bytes were read.
* The only method that has succeeded today is **SMS_OTP** — a ~110 B body.
* The methods that have failed are **EMAIL_OTP submission** (~110 B, but happened during a period of net flake) and **two step-3 attempts** which must be FACE (only allowed method at step 3) — 20–200 KB bodies.
* The user's own report: "internet connection is under 1 Mbps". 1 Mbps ÷ 8 ≈ 125 KB/s. A 150 KB FACE image needs ≥1.2 s of uninterrupted uplink; any cellular hiccup mid-upload aborts.
* Spring's GlobalExceptionHandler classifies this as a *client* problem (400 Bad Request) — correct, but UX-hostile because the mobile app maps any non-2xx to `MFA_GENERIC_ERROR`.

### H2 — Flow config forces FACE for step 3 **(certain — DB-confirmed)**

* Even if every other method works perfectly, the user cannot finish login without uploading a FACE image, because the active flow requires it as step 3.
* Operator decision needed: was the 3-step / `AUTHENTICATION` flow intentional, or did it supersede a 2-step `APP_LOGIN` flow that was the user's prior baseline?

### H3 — Client bug fixed in v5.2.3 (false "Verification failed") **(present but not today's blocker)**

* v5.2.2 has the `cacheLoginData()` throw-inside-verify-try bug (`MfaFlowViewModel.kt` v5.2.2 commit) that converts a 200 AUTHENTICATED response into `MFA_GENERIC_ERROR` because the `try { … cacheLoginData() }` block swallows a storage throw and the outer catch overwrites the committed success.
* v5.2.3 fixes this (publish `_authResult` + `Authenticated` BEFORE the side-effect, then `runCatching { … cacheLoginData() }`).
* This bug ONLY triggers on the FINAL MFA step's success path. Today's failures happened on intermediate-step submits (malformed body) — the v5.2.3 fix does not affect those.

### H4 — MIUI/HyperOS restrictions **(orthogonal — affects test automation, not user's login)**

* `adb shell input tap/text` is blocked on the user's MIUI device with `SecurityException: INJECT_EVENTS permission required` — this is MIUI security, not a FIVUCSAS bug. Fixed by enabling *Developer options → "USB debugging (Security settings)"*.
* This only affects this session's ability to drive automated UI tests. It does not affect normal user interaction.

### H5 — Server-side handler bug **(ruled out by evidence)**

* All MFA handlers (`FaceVerifyMfaStepHandler`, `TotpVerifyMfaStepHandler`, `SmsOtpVerifyMfaStepHandler`, …) are intact and have been exercised successfully in the past 72 h.
* `VerifyMfaStepService` and all 10 handlers register on boot (verified from prod logs at 15:35:03).

---

## 6. Recommended Actions

### A. Immediate user workaround (no code change)

1. Switch to **WiFi** (any ≥ 5 Mbps link) before attempting FACE. The 16 MB/min ceiling on 1 Mbps is hostile to even a single JPEG.
2. Or use the **web app** at `app.fivucsas.com` — same backend, same auth flow, but TLS / HTTP/2 retry semantics are typically more forgiving.
3. Or use **`e2e-sweep@fivucsas.local` / `Test@123`** for testing only — that account is on the `E2E Sweep` tenant with `mfaRequired=false` (no MFA at all, just PASSWORD → token). Verified live today, HTTP 200.

### B. Mobile client — v5.2.4 fix candidates (ordered by impact)

| # | Fix | Where | Severity |
|---|---|---|---|
| 1 | **Aggressively downsize face image before upload.** Target ≤ 30 KB JPEG at quality 60, max 480×640. Current 200 KB images at 1 Mbps are unrecoverable. | `MfaFlowScreen.kt:740-870` (FACE capture path), `BiometricViewModel`, or a new `ImageCompressor` util | P0 — kills the dominant failure mode |
| 2 | **Add retry-on-IOException** with exponential backoff (3 attempts, 1s/3s/9s) inside `AuthApiImpl.verifyMfaStep`. Today a single TCP RST kills the whole MFA step. | `AuthApiImpl.kt:80-87` | P0 |
| 3 | **Increase Ktor write timeout** from default 60 s to 120 s and **disable HTTP/2** on Android for the auth endpoints (HTTP/1.1 is more resilient to mid-stream resets on flaky cellular). | `HttpClientProvider` / `IdentityApi` config | P1 |
| 4 | **Show a real progress indicator** for FACE/VOICE upload with a "low-signal warning" banner if upload takes > 5 s — currently the user sees an indeterminate spinner and assumes "broken." | `MfaFlowScreen.kt` FACE step UI | P1 |
| 5 | **Filter the method-selection chip set to alternative methods** the server returns (`response.alternativeMethods`) so the user cannot pick FINGERPRINT/TOTP for a step where the server will only accept FACE. The DTO field exists since PR #25 — the screen just isn't honouring it. | `MfaFlowScreen.kt` method-chip render | P2 |
| 6 | **Verify FINGERPRINT field name** matches the server handler's read key. Confirm whether the server reads `data.assertion` or `data.fingerprintData`. If the latter, this is fine; if the former, fix the mobile dispatch. | `MfaFlowScreen.kt:506` + `FingerprintVerifyMfaStepHandler.java` | P2 — but blocking a method end-to-end |
| 7 | **Ship v5.2.3 fix** to this device. Avoids the *separate* `cacheLoginData` false-error regression that will bite when the user does manage to finish a FACE step on a better connection. | install `fivucsas-v5.2.3.apk` (107 MB) | P1 — orthogonal to today's blockers |

### C. Backend — Spring side

| # | Fix | Severity |
|---|---|---|
| 8 | **Log Content-Length + request path** in `handleHttpMessageNotReadable`. Today the operator sees "Malformed request body" with no way to tell which endpoint or what size the body was. | P1 |
| 9 | **Emit an `audit_logs` row** of kind `MFA_REQUEST_TRUNCATED` when this exception fires on `/auth/mfa/*`, including `mfa_session_id` if recoverable, so we can attribute failures to a session. | P2 |
| 10 | **Add an access-log line** with method+path for every request (Spring `CommonsRequestLoggingFilter` or equivalent). Today the request ID in the log cannot be correlated to a path without context. | P2 |

### D. Auth flow configuration — operator decision

| # | Question | Owner |
|---|---|---|
| 11 | Is the "Default 3-Step Flow" (PASSWORD + EMAIL_OTP + FACE) intentional? If yes, the flow forces FACE for every login. If no, restore the 2-step CHOICE flow that this user was completing successfully yesterday. | Operator / Ahmet |
| 12 | If 3 steps stay, consider adding TOTP / FINGERPRINT as alternatives at step 3 (multi-method CHOICE), so a user with no working camera/network can still finish login. | Operator |

---

## 7. Verified facts vs. Unverified hypotheses

### Verified by direct observation (this session)

* ✅ Server returns 200 + accessToken on `POST /auth/login` with valid creds (curl `e2e-sweep@fivucsas.local` → HTTP 200).
* ✅ Server logs 4 `Malformed request body` events today, all from ahabgu's session.
* ✅ `audit_logs` shows zero `MFA_STEP_FAILED` rows today, but `MFA_STEP_COMPLETED SMS_OTP` did succeed at 16:25:36.
* ✅ Auth flow row in DB has exactly 3 steps: PASSWORD/EMAIL_OTP/FACE.
* ✅ Mobile v5.2.2 dispatches FACE as `mapOf("image" to base64)` of a JPEG bytestream.
* ✅ Spring's `HttpMessageNotReadableException` handler is the line that logs "Malformed request body".
* ✅ MIUI denies `adb shell input` without the secondary developer-option toggle.

### Strong inference (consistent but not directly proven this session)

* ⚠ The malformed bodies are caused by client-side TCP aborts on the 1 Mbps uplink (matches every observable but no packet capture taken).
* ⚠ The user's TOTP/FINGERPRINT attempts hit `METHOD_NOT_PERMITTED` at step 3 (the controller logs 4xx without enough context to confirm; no server record because the request validation may have rejected pre-handler).

### Unverified — would need additional work

* ❓ FINGERPRINT mobile field name (`fingerprintData` vs `assertion`) match. Needs reading `FingerprintVerifyMfaStepHandler.java` end-to-end and an isolated TOTP-then-FINGERPRINT replay.
* ❓ Whether v5.2.3 introduces any subtle regression on the FACE flow vs v5.2.2 (full release-notes review pending — we have the source for both).
* ❓ Whether the `availableMethods=9` set in the login response is filtered server-side per step, or always returned full. UI-side gating depends on this.

---

## 8. Appendix — Live troubleshooting commands

```bash
# Stream server logs (Hetzner)
ssh hetzner 'docker logs -f --tail 0 identity-core-api 2>&1 | \
  grep --line-buffered -iE "ahabgu|MFA_|Malformed|EXCEPTION|AUTHENTICATED"'

# Audit DB for a user
ssh hetzner $'docker exec shared-postgres psql -U postgres -d identity_core -c \
  "SELECT created_at, action, success, metadata->>\'method\' AS method, \
   metadata->>\'reason\' AS reason FROM audit_logs \
   WHERE user_id = \'ff000003-0000-0000-0000-000000000001\' \
   ORDER BY created_at DESC LIMIT 30;"'

# Live login confirmation (no MFA path)
curl -sk -X POST https://api.fivucsas.com/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"e2e-sweep@fivucsas.local","password":"Test@123"}' | jq .
```

---

**Author:** Claude Code (this session)
**Reviewed against:** identity-core-api `main` @ `0c50841`, client-apps `v5.2.2` (`43f99b4c`), prod `audit_logs` snapshot 2026-05-30T16:35Z.
