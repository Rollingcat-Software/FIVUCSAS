# Mocks/Fakes/Placeholders Audit — 2026-05-07

Read-only investigation across the FIVUCSAS monorepo (parent + 5 submodules). Scope: production-path stubs, fake returns, hard-coded fixtures, TODO/FIXME, and silent contract bugs. Verification was done against current HEAD with grep + file reads — no memory or audit-doc claim was trusted on its own.

## Methodology

1. Ripgrep across `.java`/`.py`/`.ts`/`.tsx` for: `mock|fake|stub|dummy|placeholder|TODO|FIXME|XXX|HACK|notimplemented|UnsupportedOperation`, then for `class .*\(Stub|Mock|Fake|NoOp\)`, then for `return True`/`return null`, then for sentinel UUIDs.
2. For every Spring `@Component`/`@Service` ending in `Stub|Mock|Fake|NoOp` — checked the `@ConditionalOnProperty` predicate and the prod env var to see whether it is wired live.
3. For every Python `Stub*`/`InMemory*` — traced container.py wiring + `if settings.TESTING` / `if APP_ENV in (...)` gates.
4. Test files (`/test/`, `/__tests__/`, `*.test.ts`, `*.spec.ts`, `test_*.py`) excluded unless the test was the only thing importing the production stub.
5. Severity:
   - **P0**: production endpoint returns fake data or grants auth on a stub.
   - **P1**: feature claimed working but actually a placeholder; stale TODOs in load-bearing paths.
   - **P2**: silent contract bugs, ignored params with real callers, future-work TODOs.
   - **P3**: cosmetic (UI placeholders, doc-only).

## Critical (P0) — production endpoints returning fake data

### F-1. `WatchlistCheckHandler` always clears every sanctions check
**File**: `identity-core-api/src/main/java/com/fivucsas/identity/application/service/verification/handlers/WatchlistCheckHandler.java:14-50`
```java
 * Mock implementation that always clears the check.
 * TODO: Integrate with real sanctions/watchlist APIs (OFAC, EU sanctions list, UN Security Council)
 ...
 // TODO: Replace with real sanctions API call
 return VerificationStepResult.success(1.0, Map.of(
         "cleared", true, "checked_lists", List.of("OFAC","EU","UN"), "match_count", 0));
```
`@Component`, no profile gate — wired live in any tenant verification flow that includes a `WATCHLIST_CHECK` step. Returns `cleared=true, match_count=0` for every input. The auth/verification pipeline will accept a literal sanctioned name. **P0** — KYC/AML compliance promise not delivered. (Mitigant: most tenant flows likely don't enable this step today; risk realises the moment one does.)

### F-2. `live_camera_analysis` returns `is_live=True` when no detector is wired
**File**: `biometric-processor/app/application/use_cases/live_camera_analysis.py:184-193`
```python
if self._liveness_detector:
    liveness = await self._analyze_liveness(face_region)
else:
    response.liveness = LivenessResult(
        is_live=True,  # Default to true if no detector
        confidence=0.5, method="none", checks={"passive": True})
```
The `LIVE_ANALYSIS` route (`/api/v1/live-analysis/...`) silently returns `is_live=True` if the DI container fails to inject a detector — there is no fail-closed guard. If a deployment misconfigures `LIVENESS_BACKEND` or the detector errors at boot, every live-camera frame is auto-approved. **P0**.

### F-3. `StubLivenessDetector` exists but is gated to non-prod APP_ENV
**File**: `biometric-processor/app/infrastructure/ml/liveness/stub_liveness_detector.py` (entire file) + `factories/liveness_factory.py:144-163`
```python
def _create_stub(liveness_threshold, **kw):
    env = os.getenv("APP_ENV", "production").lower()
    if env not in ("development","test","testing","ci"):
        logger.error("StubLivenessDetector requested in non-test environment...")
        return EnhancedLivenessDetector(...)  # safe fallback
    return StubLivenessDetector(default_score=85.0)
```
**Verdict: safe today** because the factory falls back to `EnhancedLivenessDetector` in prod. But `StubLivenessDetector.check_liveness` returns `is_live=True, score=85.0` for ANY image, and `LIVENESS_MODE` legacy alias `"stub"` is still in the `Literal[...]` type. If a future operator sets `APP_ENV=development` on prod by mistake, liveness silently green-lights spoof attempts. **P0 latent**, P2 today. Recommend deleting the stub class entirely now that prod is on UniFace.

## High (P1) — features claimed working but stub-implemented

### F-4. `AddressProofHandler` does no validation, just stores + flags
**File**: `identity-core-api/.../verification/handlers/AddressProofHandler.java:11-43`
```java
// TODO: Integrate with OCR/address validation service
// TODO: Add address matching against government databases
...
log.info("Address proof document received ... Flagged for manual review.");
return VerificationStepResult.success(Map.of("status", "PENDING_REVIEW", "document_stored", true));
```
Returns `success` regardless of image content (`document_stored=true` is asserted with no storage call — the comment says "would be stored via a media storage service in production"). UX-wise the user passes the step, downstream sees `PENDING_REVIEW`; no human review queue is wired. **P1** — KYC step that always succeeds.

### F-5. `iosMain HmacPlatform.ios.kt` throws `TODO()` for HMAC-SHA1/256/512
**File**: `client-apps/shared/src/iosMain/kotlin/com/fivucsas/authenticator/totp/HmacPlatform.ios.kt`
```kotlin
actual fun hmacSha1(...): ByteArray = TODO("iOS HMAC via CommonCrypto — tracked in CLIENT_APPS_PARITY.md")
actual fun hmacSha256(...) = TODO(...)
actual fun hmacSha512(...) = TODO(...)
```
Kotlin's `TODO()` throws `NotImplementedError` at runtime. Per memory `iosMain` is permanently OUT-OF-SCOPE (no Apple hardware), but file ships in the KMP shared module. If the iOS target is ever built and run, TOTP enrollment crashes. **P1** for build hygiene; **P3** for runtime risk (no iOS app shipping).

### F-6. `LoggerService.sendToLogService` / `sendToErrorTracking` are silent no-ops
**File**: `web-app/src/core/services/LoggerService.ts:130-145`
```ts
private sendToLogService(_level, _message, _meta?: unknown): void {
    // Implementation would go here
    // Example: CloudWatch.putLogEvents(...)
    // For now, no console logging in production for security
}
private sendToErrorTracking(_message, _error?: unknown): void {
    // Implementation would go here ; Example: Sentry.captureException(...)
}
```
Underscore-prefixed params confirm they are ignored. Production browser errors are dropped on the floor. With `console.log` also disabled in prod (per the comment), the dashboard has effectively zero client-side error telemetry. **P1** — operability gap, every user-side bug is invisible.

### F-7. `analyze_quality.py` occlusion is hardcoded to 0.0
**File**: `biometric-processor/app/application/use_cases/analyze_quality.py:136-145`
```python
# Occlusion (placeholder - normalize to 0-100)
occlusion = 0.0  # 0% occlusion = good
return QualityMetrics(blur_score, brightness, face_size, face_angle, occlusion)
```
Quality metrics report "no occlusion" for every face (sunglasses, mask, hand-over-mouth). Feeds into enrollment readiness gating. **P1** — `quality_threshold` cannot reject occluded captures.

### F-8. `multi_face._find_additional_faces` returns `[]` — single-face fallback only
**File**: `biometric-processor/app/application/use_cases/detect_multi_face.py:120-129`
```python
def _find_additional_faces(self, image, excluded_regions):
    """This is a placeholder for more sophisticated multi-face detection.
    In production, use a detector that natively supports multiple faces."""
    return []
```
The `multi_face` endpoint advertises multi-face detection but only ever returns the primary face from MTCNN (whose API gives one). Used in proctoring / "detect strangers in frame" — silently misses the second person. **P1** — proctoring regressions.

### F-9. `DeepFace Facenet512` weight integrity check is opt-in (no pinned hash)
**File**: `biometric-processor/app/infrastructure/ml/extractors/deepface_extractor.py:90-99` + `app/core/config.py:671`
```python
if not expected:
    # TODO: pin DEEPFACE_FACENET512_SHA256 in config.py once known-good hash recorded
    logger.warning("DeepFace model integrity check skipped (no pinned hash)")
    return
```
SHA-256 verifier is wired but `settings.DEEPFACE_FACENET512_SHA256` is empty/unpinned in prod, so a tampered weight file passes silently. Promised SHA-pin (memory `feedback_bcrypt_verify_first` and `D-tasks: SHA256 model delivery`) not delivered for the production model. **P1** — supply-chain control absent.

### F-10. `OAuth2Service` legacy pipe-format auth-code parser still present
**File**: `identity-core-api/.../service/OAuth2Service.java:66-71`
```java
// BE-M1 (2026-04-19): Redis auth-code metadata is now JSON. The legacy pipe
// format is still tolerated on read for in-flight codes written before deploy ...
// TODO(2026-04-19 +15m / 2026-04-19 03:15Z): delete legacy pipe parser below.
```
Self-imposed cleanup deadline elapsed 18 days ago. Dead-code surface left in OAuth token endpoint. **P1** — code smell; ensure the legacy parser doesn't accept malformed inputs.

## Medium (P2) — TODOs in non-trivial code paths

### F-11. `EventPublisherAdapter` / `AuditLogPort` doc says "placeholder for Phase 4"
**File**: `identity-core-api/.../application/port/output/AuditLogPort.java:7,14` and `EventPublisherPort.java:8,15`
```java
 * Currently a placeholder for future implementation.
 * NOTE: This is a placeholder for Phase 4 implementation.
```
JavaDoc is **stale** — `AuditLogAdapter` and `EventPublisherAdapter` are real implementations (Spring `ApplicationEventPublisher`, JPA persistence). Risk: a future engineer reads "placeholder" and replaces the working class. **P2** — doc lie.

### F-12. `NoOpSmsService` defaults on missing config (`matchIfMissing=true`)
**File**: `identity-core-api/.../infrastructure/sms/NoOpSmsService.java:7-8`
```java
@ConditionalOnProperty(name = "sms.provider", havingValue = "noop", matchIfMissing = true)
public class NoOpSmsService implements SmsService {
    public void sendOtp(String phoneNumber, String code) {
        log.info("SMS disabled - OTP for {}: {}", phoneNumber, code); }
```
Prod is safe (`SMS_PROVIDER=twilio-verify` in `.env.prod`). But `matchIfMissing=true` means any deploy that drops the env var silently logs OTP codes to `stdout` instead of sending — and the user is locked out (no SMS arrives). The OTP is also **leaked to logs in plaintext**. **P2** — fragile default; logging the code is itself a finding.

### F-13. `NoOpEmailService` same pattern, also leaks the OTP to logs
**File**: `identity-core-api/.../infrastructure/email/NoOpEmailService.java:7-15`
```java
@ConditionalOnProperty(name = "mail.enabled", havingValue = "false", matchIfMissing = true)
public void sendOtp(String to, String code) { log.info("Mail disabled - OTP for {}: {}", to, code); }
```
Same `matchIfMissing=true` foot-gun; same plaintext OTP-in-logs hazard. **P2**.

### F-14. `client-apps` Android i18n TODOs in shipping screens
**Files**: `client-apps/androidApp/.../MrzInputDialog.kt:63,193,219,225,332,358`, `ExportDataRow.kt:56,145,154`, `DataExportViewModel.kt:84,94`, `ProfileScreen.kt:217`, `SettingsScreen.kt:176`, `AuthenticatorScreen.kt:111`
Multiple hardcoded English strings in NFC + data-export + theme settings flows, every one tagged `// TODO(i18n): ... in /tmp/i18n_agent_20*.txt`. Violates rule `feedback_no_hardcode`. The `/tmp/...` reference suggests an unfinished agent run. **P2** — UX defect on Android.

### F-15. `IdInfoStep.tsx` — hardcoded English placeholders + Latin name
**File**: `web-app/src/features/userEnrollment/components/steps/IdInfoStep.tsx:50-72`
```tsx
label="Full Name" ... placeholder="John Doe"
label="National ID" ... placeholder="ABC-123456"
helperText='Format: YYYY-MM-DD'
```
Three labels and one helperText hardcoded English; placeholders Latin not Turkish. Violates `feedback_no_hardcode`. **P2** for i18n rule, **P3** for UX (Turkish-first product showing "John Doe").

### F-16. `MockWebhookSender` reachable via `WebhookSenderFactory` with no env gate
**File**: `biometric-processor/app/infrastructure/webhooks/webhook_factory.py:18-47`
```python
WebhookTransport = Literal["http", "mock"]
@staticmethod
def create(transport="http", ...) -> IWebhookSender:
    if transport == "mock":
        return MockWebhookSender()
```
Factory accepts `"mock"` from any caller; no `APP_ENV` guard. Today the factory is **never imported by production code paths** (verified via grep — only the MockWebhookSender file references it). Dead-code island, but the dead code is a faux-success webhook ("Mock failure" string in line 56 suggests it was once an integration toggle). **P2** — delete or lock to test fixtures.

### F-17. `OptionalThreadPoolExecutor` "fake" comment mis-describes implementation
**File**: `biometric-processor/app/domain/interfaces/thread_pool_executor.py:7-8` (doc only — interface itself is sound)
**P3** — comment hygiene.

### F-18. `UserDomainRepositoryAdapter` throws UnsupportedOperationException on a delete-by-email path
**File**: `identity-core-api/.../infrastructure/adapter/UserDomainRepositoryAdapter.java:48-52`
Per `feedback_no_hard_delete_users` and V53 trigger this is intentional — `delete(User)` blocks raw deletion. The throw is the safety guard. **Not a bug.** Documenting only because the grep flagged it.

### F-19. `AuthMethodHandlerRegistry` / `VerificationStepHandlerRegistry` throw `UnsupportedOperationException` on missing handler type
**Files**: `AuthMethodHandlerRegistry.java:34`, `VerificationStepHandlerRegistry.java:36`
Legit defensive programming for `getHandler(unknown)`. Caller paths are `Optional<>`-style guarded. **Not a bug.**

### F-20. `FaceAuthHandler.transferTo` throws `UnsupportedOperationException`
**File**: `FaceAuthHandler.java:124-127` — narrow override on an in-memory `MultipartFile` adapter; `transferTo(File)` is unreachable from the upload path. **Not a bug.**

## Low (P3) — cosmetic / documentation only

### F-21. Stale `Mock implementation that always clears the check` JavaDoc lines
Multiple occurrences (e.g. `WatchlistCheckHandler.java:14`). Surface them as part of the F-1 fix.

### F-22. `verify-widget/html/` is built JS bundles
Source-of-truth lives in `web-app` `verify-app/`; bundle artifacts unsearchable. **P3** — no source mocks here, but the dist directory should probably be `.gitignore`d.

### F-23. `archived` and `practice-and-test/` submodules carry experimental stubs
Not user-facing, not deployed. **P3** — out of scope per "test files unless they reveal a production stub" rule.

### F-24. `auth-methods-testing` page intentionally exposes "stub" mode
`web-app/src/features/auth-methods-testing/AuthMethodModeContext.ts:23` — `AuthMethodModeKind = 'real' | 'test' | 'stub'`. Contracted UI feature on an admin-only page. **Not a bug.**

### F-25. `NodDetector` / `TurnLeftDetector` etc. have `_metrics` underscored params
`web-app/src/lib/biometric-engine/core/challenges/*.ts` — these motion-aware detectors only need `headPose` + motion history; `_metrics` underscore is the standard ts-eslint "intentionally unused" convention, **not** a contract bug. **Not a bug.**

### F-26. `live_camera_analysis` API route is publicly accessible internally only
Bio container is internal-only per CLAUDE.md, mitigates F-2 blast radius — but does not erase it. **P3 mitigation note.**

### F-27. `EnrollmentController` literal "85.0/1.0" comment about V47-superseded hardcode
`EnrollmentController.java:244` says "captured by V47 instead of the previous hard-coded 85.0/1.0" — historical, fixed. **Not a bug.**

### F-28. `hosted-first` placeholder text "Phase 4" in port docs
Same as F-11; dual-tagged for visibility.

### F-29. `WebhookSenderFactory` `WebhookTransport = Literal["http","mock"]` allows `mock`
Same as F-16, dead surface.

### F-30. `TODO(2026-04-19 +15m)` self-imposed deadline in OAuth2Service
Same as F-10; documenting the elapsed-deadline flavour.

## Summary table — findings by repo

| Repo                | P0 | P1 | P2 | P3 | Notable |
|---------------------|----|----|----|----|---------|
| identity-core-api   | 1 (F-1) | 2 (F-4, F-10) | 4 (F-11, F-12, F-13, F-19/F-20 OK) | 2 | WatchlistCheck mock + NoOp{Sms,Email} matchIfMissing |
| biometric-processor | 1 (F-2) + 1 latent (F-3) | 3 (F-7, F-8, F-9) | 2 (F-16, F-17) | 1 (F-26) | live_camera_analysis fail-open + occlusion=0 + multi-face stub |
| web-app             | 0 | 1 (F-6) | 2 (F-15, F-25 OK) | 2 (F-22, F-24, F-25) | LoggerService is silent no-op in prod |
| client-apps         | 0 | 1 (F-5) | 1 (F-14) | 0 | iOS HMAC unimplemented (out of scope per memory) |
| docs                | 0 | 0  | 0 | 0 | n/a |
| verify-widget       | 0 | 0  | 0 | 1 (F-22) | dist artifacts only |

**Top concerns to address first** (concrete production damage potential):
1. **F-1** WatchlistCheckHandler — KYC compliance.
2. **F-2** live_camera_analysis fail-open `is_live=True`.
3. **F-7** Occlusion always 0 — quality gate is a lie.
4. **F-9** Pin `DEEPFACE_FACENET512_SHA256`.
5. **F-12 + F-13** Flip `matchIfMissing` to `false` and stop logging plaintext OTPs.

End of report.
