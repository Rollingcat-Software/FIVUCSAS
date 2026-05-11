# Silent-Success / Fail-Open Audit — 2026-05-07

Repo HEAD verified at investigation time: parent `5096e8d`, identity-core-api `5096e8d`,
biometric-processor `d91760a`, web-app `d8e18b8`. All findings cite live `main`/`master` files;
the four 2026-04-30 review docs are taken as historical, not current truth.

## Methodology

1. Listed every Java auth handler under `application/service/handler/` and
   `application/service/mfa/handler/`, read full source, traced every `catch`,
   every `return StepResult.success(...)`, and every `yield` in switch
   expressions. Confirmed each terminal branch maps directly to a
   true/false verification outcome.
2. Enumerated `catch (Exception` (191 hits in main java) and grepped for
   adjacency to `ResponseEntity.ok` / `success(` / `return true` /
   `Optional.empty`. Read 20-line context windows on each suspicious match.
3. In biometric-processor: grepped `except` + `pass` / `continue` /
   `return JSONResponse`, plus `return_exceptions=True`. Read source for each.
4. Crosschecked the four most-recent 2026-04-30 review docs against current
   HEAD (per `feedback_verify_completion_claims.md`) — the documented
   "MFA fail-OPEN exception swallow" has been remediated: every
   `*VerifyMfaStepHandler` now catches and returns `MfaStepResult.fail()`
   (`WebAuthnVerifySupport.java:113-116`).
5. Frontend: read `core/api/AxiosClient.ts` interceptors and
   `core/api/errorMapper.ts` end-to-end; greppped TS for empty `catch {}`.

Severity floor: only patterns where a non-test caller can reach the branch
are reported. Worktrees under `.claude/worktrees/` were excluded — they are
detached snapshots, not deployable.

## P0 — security boundary fail-open

### F1 — `/2fa/verify-method` accepts FINGERPRINT/HARDWARE_KEY with no signature check

`identity-core-api/src/main/java/com/fivucsas/identity/controller/AuthController.java:526-532`
```java
case FINGERPRINT, HARDWARE_KEY -> {
    String assertion = (String) data.get("assertion");
    yield assertion != null && !assertion.isBlank();
    // WebAuthn verification would be done client-side via navigator.credentials.get()
    // The fact that we received a valid assertion means the browser verified it
}
```
Any non-empty string in `data.assertion` is treated as a passing 2FA factor.
There is no `webAuthnService.verifyAssertion(...)` call, no credentialId
lookup, no public-key check, no sign-counter validation. Every other case
in the same switch (TOTP, SMS_OTP, FACE, VOICE, QR_CODE, EMAIL_OTP)
performs server-side validation; FINGERPRINT/HARDWARE_KEY does not.

The endpoint is post-login (requires JWT), so this is not anonymous account
takeover, but it bypasses the 2nd factor entirely for any authenticated user
whose flow lands on `/2fa/verify-method` (admin step-up, sensitive action
re-auth). The two surrounding branches log to `auditLogPort.logTwoFactorVerified`,
so the audit trail will *also* lie ("2FA verified by FINGERPRINT").

Note: the parallel newer N-step pipeline (`VerifyMfaStepService` →
`*VerifyMfaStepHandler` + `WebAuthnVerifySupport.java`) does the right thing.
This is residual code on the legacy `/2fa/verify-method` route.

Suggested fix: dispatch to the same `WebAuthnVerifySupport.verifyAssertion`
the N-step path uses; remove the misleading comment.

### F2 — verify_puzzle spot-check converts decode/detector errors into "passed"

`biometric-processor/app/application/use_cases/verify_puzzle.py:171-196`
```python
for i, frame_b64 in enumerate(spot_frames[:3]):
    try:
        frame_bytes = base64.b64decode(frame_b64)
        ...
        if frame is None:
            logger.warning(...); continue
        result = await self._spot_check_detector.check_liveness(frame)
        if not result.is_live:
            failed_count += 1
    except Exception as e:
        logger.warning(f"Spot-check frame {i} error: {e}")
        continue

if failed_count >= 2:
    return False, "SPOT_CHECK_FAILED"
return True, ""
```
`failed_count` only increments on a *successful* liveness call returning
`is_live=False`. Frames that fail to decode (`continue`) or that throw inside
the detector (`except: continue`) are silently skipped, so a client that
submits 3 corrupt JPEGs receives `failed_count == 0` and the spot-check
returns `True`. Defeats the anti-replay spot-check entirely.

Suggested fix: treat `continue` paths as failures
(`failed_count += 1`) or require N successful evaluations rather than
counting failures.

### F3 — FaceAuthHandler confidence fallback can flip a `verified=false` to true

`identity-core-api/src/main/java/com/fivucsas/identity/application/service/handler/FaceAuthHandler.java:65-75`
```java
Object verified = result.get("verified");
boolean isVerified = Boolean.TRUE.equals(verified)
        || "true".equalsIgnoreCase(String.valueOf(verified));

if (!isVerified) {
    Object confidence = result.get("confidence");
    if (confidence instanceof Number num) {
        isVerified = num.doubleValue() >= DEFAULT_CONFIDENCE_THRESHOLD;
    }
}
```
The biometric processor's contract (`api/schemas/verification.py:15-16`)
returns `verified` as the authoritative server-side decision (already
threshold-applied with adaptive aging). The client overrides that bit on
the `confidence` field with a *fixed* threshold of 0.7. Two failure modes:

- The processor's adaptive threshold is *more lenient* than 0.7 for aged
  embeddings (`VERIFICATION_THRESHOLD_AGED_*`) — this fallback IGNORES the
  adaptive logic. Currently no impact (server returns `verified=true` first).
- For Facenet512 + cosine, similarity ≥ 0.7 with a non-matching face is
  not impossible (genuine impostor pairs sit around 0.4–0.6, but quality
  degradation pushes the tail). If the processor ever changes shape and
  starts returning `verified=false` while emitting `confidence` as cosine
  similarity (1 − distance), this branch silently overrides the rejection.

Same pattern duplicated in `AuthController.java:509-518` for the legacy
`/2fa/verify-method` FACE branch.

Severity P0 because the failure mode is one upstream contract change away,
and the fallback masks the rejection without logging.

Suggested fix: delete the fallback; trust the processor's `verified` field
(or alternatively log a P0 alert when the fallback fires).

## P1 — data-integrity fail-open

### F4 — Audit log writes silently swallow exceptions

`identity-core-api/src/main/java/com/fivucsas/identity/infrastructure/audit/AuditEventPublisher.java:65-84`
```java
@Async
public void publish(AuditLog auditLog, UUID tenantId) {
    ...
    try {
        ...
        auditLogRepository.save(auditLog);
    } catch (Exception e) {
        log.error("Failed to save audit log: {}", e.getMessage(), e);
    } finally { ... }
}
```
By design fire-and-forget, but documented compliance requires every
auth/MFA event to land in `audit_logs`. RLS rejection (TenantContext
mismatch), partition-not-yet-created (V57 pg_partman), or a constraint
violation are all swallowed. There is no metric counter, no alert hook,
no dead-letter queue, no degraded-mode flag.

Suggested fix: Micrometer counter `audit_log_drops_total` + Grafana alert,
and a fallback append to the local `backups/` log so the row is at least
forensics-recoverable.

### F5 — EnrollmentHealthService fails open on biometric service down

`identity-core-api/src/main/java/com/fivucsas/identity/application/service/EnrollmentHealthService.java:193-208`
```java
private boolean hasBiometricData(UUID userId, AuthMethodType biometricType) {
    try {
        Map<String, Object> health = biometricServicePort.checkHealth();
        ...
        return true;        // happy path
    } catch (Exception e) {
        log.warn(...);
        return true;        // fail open: don't revoke
    }
}
```
Comment is honest ("Fail open: don't revoke when service is unreachable"),
but the impact is that an enrolled user whose biometric embedding has been
purged from `biometric_db` (FK-cascade incident, deletion request, manual
ops) still passes `hasBiometricData()` and the API will offer FACE/VOICE
as a working method on the login page. The actual `/verify` call later
returns 404, so this is UX rot rather than auth bypass — flagged P1
because it can mislead the dashboard's "enrolled methods" tile.

Suggested fix: probe the actual count endpoint
(biometric-processor exposes `/api/v1/face/enrollments/{userId}` etc.)
rather than just `checkHealth`.

### F6 — RedisCacheAdapter swallows exceptions and returns empty Optional

`identity-core-api/src/main/java/com/fivucsas/identity/infrastructure/adapter/RedisCacheAdapter.java:48-55`
```java
} catch (Exception e) {
    log.error("Failed to retrieve cache for key: {}", key, e);
    return Optional.empty();
}
```
Compare with the *fail-closed* pattern explicitly added in
`JwtAuthenticationFilter.java:64-74` (uses `cachePort.existsFailClosed`,
catches `CacheUnavailableException`, clears SecurityContext). The general
adapter still has the silent-empty path — anyone calling it for a
"is this token blacklisted?" check on a different code path inherits a
fail-open behaviour. Today only the JWT filter uses the fail-closed
helper; rotation/idempotency use the silent-empty path. Severity P1
defense-in-depth.

Suggested fix: deprecate the silent-empty `get`; require callers to
opt into either the fail-closed or fail-open variant explicitly.

## P2 — UX fail-open / cosmetic

### F7 — `/2fa/verify` and `/2fa/verify-method` return HTTP 200 with `success:false`

`identity-core-api/src/main/java/com/fivucsas/identity/controller/AuthController.java:350,400,445,557,565`
```java
return ResponseEntity.ok(Map.of("success", false, "message", "..."));
```
Five rejection paths return status 200. Frontend reads `success` so the
auth check is enforced — but this confuses any non-frontend consumer
(curl-based test, OAuth library, monitoring) into recording a 200 on a
failed 2FA attempt. Severity P2: not a security boundary fail-open; rather
a contract violation that suppresses 4xx alerts in observability.

Suggested fix: switch to 401 or 400 (RFC 6749 §5.2-style error body).
The N-step `/auth/mfa/step` already does this correctly via `MfaStatus`.

### F8 — AxiosClient request interceptor swallows proactive-refresh failure

`web-app/src/core/api/AxiosClient.ts:142-148`
```ts
try {
    await this.refreshTokenProactively()
    accessToken = await this.tokenService.getAccessToken()
} catch {
    // Fall back to existing token if proactive refresh fails
}
```
Empty `catch` is intentional (fall back to the still-valid token). But it
also masks repeated network failures, audit-log loss, and persistent
401-loop scenarios. There is no counter, no UI breadcrumb, no Sentry
hook. Severity P2 cosmetic.

Suggested fix: emit a `logger.warn` and a Sentry breadcrumb so that
"refresh keeps failing but user keeps using stale token" becomes visible
in observability.

### F9 — `_to_json_safe` swallows numpy `.item()` exceptions

`biometric-processor/app/application/use_cases/check_liveness.py:36-43`
```python
item = getattr(value, "item", None)
if callable(item):
    try:
        return _to_json_safe(item())
    except Exception:
        pass
return str(value)
```
Falls through to `str(value)` on any failure — benign, but the value is
returned to the API client where downstream parsing may break silently
if a numpy scalar serializes as `"<numpy.float32 object>"`. Severity P3
cosmetic.

## P3 — defense-in-depth nits

### F10 — In-memory rate limit not coordinated across replicas
`identity-core-api/src/main/java/com/fivucsas/identity/security/RateLimitService.java:46-56`
Bucket4j with `ConcurrentHashMap`. Per-replica only. Today the API runs
as a single replica, so this is moot, but a horizontal scale-out
(2026-04-28 ROADMAP mentions BE-M5 multi-instance) silently halves the
effective rate per replica. Not fail-open but worth a Redis-backed
upgrade.

### F11 — `general_exception_handler` returns 500 with generic message
`biometric-processor/app/api/middleware/error_handler.py:108-132` Correct
behaviour (rejects the request), but the catch-all may hide downstream
contract changes from the API consumer. Add a metric counter so a regression
of `EmbeddingNotFoundError` mishandling becomes visible.

### F12 — `parallel_frame_analyzer._verify_face` returns `FaceVerificationResult()` on detector exception
`biometric-processor/app/application/use_cases/proctor/parallel_frame_analyzer.py:402-406, 425-427`
Defaults are `detected=False, matched=False` — fail-closed. Verified safe.
Listed here only because the pattern is repeated across 5+ proctor
methods and would be P0 if any default flipped to `True`. Add a unit
test pinning the defaults.

### F13 — JWT filter `catch (Exception)` clears context but does not 401
`identity-core-api/src/main/java/com/fivucsas/identity/security/JwtAuthenticationFilter.java:93-97`
On any unexpected exception the request continues unauthenticated,
relying on downstream `@PreAuthorize` to 403. Correct, but a single
malformed JWT blasting 1000 RPS of NPEs would produce 1000 ERROR log
lines. Severity P3.

### F14 — `parseInputData` swallows JSON parse error
`identity-core-api/src/main/java/com/fivucsas/identity/application/service/ManageVerificationService.java:494-506`
Falls back to `{"raw": resultData}`. Verification step handlers see the
unparsed string and reject it cleanly downstream. Verified safe but
ideally raise a `400 Bad Request` upstream so the client knows.

## Recommendation list (ordered by leverage)

1. **F1 (P0)** Remove the legacy FINGERPRINT/HARDWARE_KEY shortcut in
   `AuthController.verify2FAMethod`; route to `WebAuthnVerifySupport.verifyAssertion`.
   1 hour. **HIGHEST PRIORITY** — this is a complete 2FA bypass for a
   logged-in user.
2. **F2 (P0)** `verify_puzzle.py` spot-check: count `continue` paths as
   failure. 30 min.
3. **F3 (P0)** Delete the FaceAuthHandler + AuthController confidence
   fallback. Trust the server-side `verified` field. 30 min.
4. **F4 (P1)** Add `audit_log_drops_total` counter + Grafana alert; cap
   risk that V57 pg_partman edge cases silently drop audit rows.
5. **F7 (P2)** Switch the five `/2fa/verify*` 200-on-failure responses to
   real 4xx codes. 1 hour incl. frontend update.
6. **F5 (P1)** Probe biometric-processor count endpoint instead of just
   `/health` in `EnrollmentHealthService.hasBiometricData`. 1 hour.
7. **F6 (P1)** Deprecate silent-empty `RedisCacheAdapter.get`; require
   explicit fail-mode opt-in. 2 hours including caller migration.
8. **F8 (P2)** AxiosClient: log + Sentry breadcrumb on proactive-refresh
   failure. 15 min.
9. **F10–F14 (P3)** Defense-in-depth nits — schedule next sprint.

Word count: ~1,250.
