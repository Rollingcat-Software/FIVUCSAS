# FIVUCSAS — Code-Quality / SE-Principles Audit (2026-05-31)

Concurrent read-only audit of the whole platform against **SOLID, DRY, YAGNI, KISS, Clean Code, design patterns**, with a hard focus on **hardcoded strings / values** and **sloppy implementations** (recurring owner concerns). Four parallel auditors covered `identity-core-api`, `web-app`, `biometric-processor`, and `spoof-detector`. Findings are evidence-based (file:line) and ranked P1 (must-fix) / P2 (should-fix) / P3 (polish).

This document is the canonical backlog; fixes will be PR'd against it. Items already fixed this session are marked ✅.

---

## Cross-cutting themes (what keeps recurring)
1. **Hardcoded magic values that bypass an existing config/constant mechanism** — present in all four repos. Worst: a typo-prone duplicated Redis key prefix in api, decision thresholds not wired to config in bio, analyzer weights triplicated-and-drifted in spoof-detector.
2. **God classes / 1000+-line files mixing concerns** — `AuthController` (api), `LoginPage`/`HostedLoginApp` (web), `SessionEngine`/`SpoofDetector` (spoof), `Settings`/`enhanced_liveness_detector` (bio).
3. **DRY violations in security-sensitive code** — duplicated MFA-method building, error-body shaping, tenant-scope, file-validate boilerplate.
4. **Dead / speculative code** shipped to prod — a whole dead `userEnrollment/` web feature, a dead `@authz` auth service in api, a dead `HybridEvaluator` fusion path + 11 weight-0 analyzers in spoof, an always-false "strict profile" in bio.
5. **Hardcoded user-facing English strings** (web) — ~70 across ~10 files, the exact class of bug flagged before.

---

## identity-core-api (Java / Spring, hexagonal) — 53k LOC

### P1
- **`"2fa-sms:"` Redis key prefix hardcoded as a raw literal in 5+ places** (`controller/AuthController.java:561,953,1079,1098`) while sibling prefixes ARE constants. A typo in any one silently breaks SMS-OTP verify (generate vs validate key mismatch). → one `SMS_2FA_OTP_PREFIX` constant.
- **`AuthController` god-controller** — 1247 lines, **28 injected deps**, orchestrating OTP/SMS/TOTP/WebAuthn/QR/NFC business logic + importing `entity.MfaSession`. → extract into `application/service/mfa/` services.
- **Turkish-ID checksum validation is commented out** (`domain/model/user/IdNumber.java:68-71`) → `validate()` accepts any 11 digits while the Javadoc claims "official checksum"; `isValidTurkishId(...)` is now dead. → re-enable or delete + fix the lying doc.
- **Two parallel authz services; the hardcoded-role one is dead** — `security/AuthorizationService.java` (`@authz`, `hasRole("ROOT")` literals) has ZERO references; all sites use `@rbac`. → delete the stale duplicate.
- **System-tenant UUID `00000000-…` hardcoded inline in 3 places** incl. security-critical tenant-mismatch logic (`AuthenticateUserService.java:560`, `AuditLogAdapter.java:51`, `entity/AuditLog.java:47`). → one `SYSTEM_TENANT_ID` constant. *(Note: this session's pre-flight extraction reused that inline literal — folding it into the shared `enforceTenantLock`; the constant cleanup is still owed.)*
- **Email-verification token logged at INFO** (`VerifyEmailService.java:43`) — a bearer credential in plaintext logs → Loki. → drop/hash it.

### P2
- **MFA-available-methods build duplicated** between `AuthController.buildMfaAvailableMethods` and `AuthenticateUserService.buildAvailableMethods` (the most security-sensitive construction, copied). → one shared builder.
- **OTP key prefixes fragmented** across `OtpController`/`AuthController` with no registry. → `OtpKeys` holder.
- **Duplicated session-TTL / lockout / attempt magic numbers** (`MFA_SESSION_TTL` in 2 services, `MAX_FAILED_ATTEMPTS`/`LOCKOUT_DURATION`/`OtpService.MAX_ATTEMPTS`, `ofMinutes(5)`×4 in `RateLimitService`). → `@ConfigurationProperties`.
- **Dual `User` model** (`entity.User` 854 LOC + `domain.model.user.User` 616 LOC; `entity.User` imported into 118 files; `UserDomainBoundaryTest` freeze masks the existing set). The single biggest architectural debt — the freeze baseline should be **shrunk over time, not grown**. *(This session refroze +1 for a needed pre-flight in the already-canonical consumer; tracked here.)*
- **`AuthenticateUserService.execute()` is a ~280-line method** doing 12 distinct things with deep nesting. → decompose into named steps/collaborators.
- **Broad fail-OPEN `catch (Exception)` around the MFA-flow decision** (`AuthenticateUserService.java:330-332`) → falls through to single-factor JWT mint on any error. For an auth decision, prefer **fail-closed**.
- **Hand-rolled JSON error bodies via string concat in `SecurityConfig`** (401/403 entry points) + **`Map.of("error",…)` error bodies duplicated** (AuthController 32×, DeviceController 22×, NfcController 11×). → serialize `ErrorResponse` / throw domain exceptions through `GlobalExceptionHandler`.

### P3
- `BCryptPasswordEncoder(12)` strength + CORS default list with a baked prod origin hardcoded in `SecurityConfig`.
- Redundant/dead `permitAll` matchers after the terminal `/api/v1/**` rule; 26 `permitAll` entries with no inventory comment.
- OTP lifecycle logged 10× at INFO (PII-adjacent noise).
- `pickPrimaryMethod` hardcodes `"EMAIL_OTP"` fallback string; `amrValue` has a dead `default` arm; `stepsData` built as raw JSON string literals; 6 inline audit "reason" strings (→ enum).

---

## web-app (React / TS, Clean Architecture) — 96k LOC

### P1 — i18n / hardcoded user-facing strings (TOP PRIORITY)
- **i18n key files are clean** (en.json/tr.json both 2,015 keys, zero drift) — but **~70+ hardcoded English UI strings across ~10 files** violate the `t()` rule:
  - `pages/AnalyticsPage.tsx` (~17 strings, only 2 `t()` calls) — admin dashboard headings/empty-states.
  - `features/auth/components/RegisterPage.tsx` (~16) — **public** signup page.
  - `pages/UserFormPage.tsx` (8 labels), `pages/UserDetailsPage.tsx` (8 + raw `status.replace('_',' ')`), `pages/TenantFormPage.tsx` (7 + placeholder), `pages/EnrollmentsListPage.tsx` (table headers/filters).
  - `hooks/useAuthFlowBuilder.ts:40,58,77,93,104` — hardcoded English `setError('Failed to …')` shown to users (should return error → `formatApiError(err,t)`).
  - `features/userEnrollment/**` step components — 0 `t()` calls (also dead, see P2).
- **Raw `err.message` shown to users** instead of `formatApiError`: `useFaceSearch.ts:40`, `useVoiceSearch.ts:107`, `useCardDetection.ts:107`, `puzzles/useHandLandmarker.ts:84`.

### P2 — SOLID / DRY / dead code
- **Dead `userEnrollment/` feature (~11 files)** — `UserEnrollmentPage` is never routed (`App.tsx:265` redirects the path away); `UserEnrollmentService` still bound in DI but unconsumed. → delete (also resolves the i18n P1 for those files) or wire it.
- **Form pages duplicate the Controller+TextField+label scaffold** (UserForm/TenantForm/UserDetails/Register) — each independently hardcodes labels. → a `<FormTextField name labelKey/>` wrapper closes the duplication AND the i18n gap structurally.
- **Repeated try/catch+logger+setError CRUD skeleton** ×5 in `useAuthFlowBuilder.ts`. → `runMutation(fn, errKey)`.
- **God components**: `LoginPage.tsx` (1,287 LOC, 36 hooks), `HostedLoginApp.tsx` (1,019), `DashboardPage.tsx` (1,019), `MyProfilePage.tsx` (1,023), `AnalyticsPage.tsx` (768) — mix fetch+logic+render. → extract hooks/sub-sections (the old monolithic EnrollmentPage was already split this way — same playbook).

### P3
- Scattered magic timeouts (toast 2000/3000/4000ms, abort 10000ms) → named constants.
- CSP `script-src` drift: `public/.htaccess` has `'wasm-unsafe-eval'`, `vite.config.ts` prod omits it. → align (`.htaccess` is authoritative on Hostinger).
- Hardcoded prod URLs in demo/SDK components (mostly defensible copy-paste snippets / SDK defaults; flagged for awareness).
- 17 `: any`/`as any` in non-test source; stray literals on otherwise-localized pages.

---

## biometric-processor (Python / FastAPI, Clean Architecture) — 102k LOC

> Healthier than its history suggests: **liveness fails CLOSED**, anti-spoof veto defaults ON, heavy-ML CPU guardrails present, tests carry honest skip reasons, no bare `except` in `app/`.

### P1
- **Config default `FACE_RECOGNITION_MODEL=Facenet` (128-dim) contradicts `EMBEDDING_DIMENSION=512`** (`app/core/config.py:107` vs `:358`) — violates the project's own model↔dimension invariant. Prod overrides both (safe), but any default/dev/test run writes 128-dim into a 512 schema. → set default to `Facenet512` or add a `@model_validator` mapping model→dim (one exists for the aged-threshold inversion; none for this).
- **Decision thresholds hardcoded, bypassing the centralized `Settings`**: voice verify `0.65`/search `0.6` (`routes/voice.py:195,278`), verify quality `50.0` (`use_cases/verify_face.py:40`), liveness floor `0.4` (`routes/verification.py:408`), pipeline face-match `0.6` (`verification_pipeline.py:469,590`) + others. An operator tuning FAR/FRR via env silently can't move them. → promote each to a `Settings` field.
- **Enrollment route imports private `_`-prefixed helpers from the verification route** (`routes/enrollment.py:8,171-173` → `verification._evaluate_antispoof_pipeline_safe` etc.) — route-to-route private coupling. → extract an `application/services/antispoof_gate.py`.
- **Module-level mutable ML singletons hand-rolled in a route** (`routes/verification.py:49-59`, `global` mutation) parallel to the established `container.py` `@lru_cache` factory pattern. → move into the container.

### P2
- `Settings` god-class (~1100 lines, config + behavioral `get_strict_*`/`get_proctor_*` methods returning hardcoded magic-number dicts). → nested sub-models; move constant dicts to the scoring module.
- **Dead "strict exam security profile"** — `LIVENESS_SECURITY_PROFILE` is a single-value `Literal["standard"]`, `is_strict_exam_security_profile()` always returns False, and the `get_strict_*` configs it gates are unreachable. → remove or wire the Literal.
- `enhanced_liveness_detector.check_liveness()` ~256-line method with inline magic numbers; `DeviceSpoofRiskEvaluator` (772) + `verification_pipeline.py` `pipeline_test` (~250-line route holding orchestration + a private-symbol import).
- Duplicated `save_temp`→`validate_image_file`→cleanup boilerplate across 4 routes. → a FastAPI `validated_image_path` dependency.
- **Two divergent liveness-selection maps** — `config.get_liveness_backend()` maps `combined→hybrid`, `LivenessDetectorFactory._resolve_backend` maps `combined→enhanced`. Latent config bug. → factory delegates to settings.
- **`StubLivenessDetector` (always `is_live=True`) ships in the prod image** — guarded by `APP_ENV` (dev/test only), but it keys off `APP_ENV` while the rest of the app uses `ENVIRONMENT`; a misconfig could select it. → move to test fixtures or gate on the same env var.

### P3
- Stale "uses stub liveness … Sprint 3" docstring (`routes/liveness.py:87`); a local literally named `unused`; `_find_additional_faces` permanent `return []` placeholder; `_to_json_safe` bare-`pass` swallow; un-pinned DeepFace weight-hash TODO; liveness calibration payload logged TWICE per request (disk pressure on CX43).

---

## spoof-detector (TS lib + amispoof app.js)

> TS lib hygiene is genuinely good (1 `any` in the whole tree, consistent options pattern, lazy init).

### P1
- ✅ **app.js dropped the UNCERTAIN verdict state** → real faces flickered to SPOOF. **FIXED this session** (PR #69, deployed): tri-state LIVE/UNCERTAIN/SPOOF render.
- **Analyzer weights triplicated across TS / Python / app.js AND already diverged** — `device_boundary`/`micro_tremor` are `0.5` in the running TS fuser but `2.5` in Python + the app.js UI badge; `texture`/`moire` `0.0` vs `0.1`. **The UI badges lie about the running config.** → single-source from the lib's exported `DEFAULT_ANALYZER_WEIGHTS`; pick TS or Python canonical + a parity test.
- **`SessionEngine` god class** (767 LOC: state machine + 5 incident detectors + quality floor + fps scaling + verdict math + reporting). → strategy-per-incident-detector.
- **`SpoofDetector` facade**: 24 analyzer fields × 24 identical `ensure*()` methods × 24 toggles × 24 options; `analyzeFrame` ~300 lines of copy-pasted blocks. → an analyzer registry + one loop (~250 lines deleted).
- **`round()` duplicated in 24 files**; fps-measurement + a hand-rolled DFT each duplicated 4×; clamp-to-0-100 in 10+. → `utils/math.ts` + `utils/FpsMeter`.

### P2
- **Dead alternate fusion engine** `HybridEvaluator` + `Assembler` (~420 LOC, `index.ts` says "NOT wired", zero callers) shipped in the bundle. → `experimental/` entry or delete.
- **~11 weight-0 analyzers still execute every frame** (temporal/gaze/eyebrow/3d-pose/…) — CPU + UI noise for ~zero verdict contribution. → promote or stop running.
- Magic numbers `60` (proven-live) hardcoded in 5+ sites across TS+app.js; warmup `30` duplicated and not exported; `RAW_CONFIDENCE_CEILING=0.88` reverse-engineered from engine internals (breaks silently if the engine changes). → export the constants.
- **`app.js` (2,031 LOC hand-written vanilla JS) shadows the typed lib** — no compiler/tests; the UNCERTAIN bug is proof of drift. → extract pure logic into a shared typed module both consume, or port to TS.
- Inconsistent units/scales (0-100 vs 0-1 vs 0.88-capped confidence; degrees vs unitless) with no documented contract.

### P3
- Public export aliased to single-letter `l` (`CasiaFasdMicroBench.ts`); silent `catch {}` swallows gate failures; hardcoded `rgba()` colors duplicating CSS vars; `analyzeFrame` worker/inline/cache branching inline.

---

## amispoof RUNTIME regressions (separate from code-quality — user-reported)
Full investigation in this session. Three issues:
1. ✅ **False "SPOOF" flicker on real faces** — UNCERTAIN mislabel. **FIXED + DEPLOYED** (PR #69).
2. ⚠️ **Auto-flash feature "gone"** — the auto-flash replay detector (`FlashTemporalAnalyzer` + `runFlashProbe(auto=true)`) was **never merged**; it lives on unmerged branch `claude/flash-temporal-probe` (commit `5a492bc`, validated "phone replay caught 0.74-0.98", held "pending approval"). The deployed `💡 Light` button is a manual opt-in only. → **DECISION NEEDED:** review + merge that branch (it also fixes #3 below).
3. ⚠️ **Video replay now passes as LIVE** (missed spoof) — two compounding deployed changes: (a) the `screen_flicker` analyzer (weight 3.0, the strongest screen detector) is dropped by a Nyquist fps-gate whenever fps < 18, and amispoof runs ~8-13 fps → dropped every session (`MultiClassFuser.ts:64-78`); (b) the planarity rotation gate was raised 4°→15° (`LandmarkPlanarityAnalyzer`, commit `40f0d4a`), so a replay held within 15° never triggers the planar veto and (since replays blink) never the no-blink incident. → **DECISION NEEDED + on-device re-validation** (these are security-sensitive detection thresholds; per the reversible-risky-changes rule, do not flip blindly). NOTE: the earlier "prime suspect" commit `851d4d2` is NOT a cause (Python/docs only; the browser uses the TS fuser).

---

## Recommended remediation order (by value × safety)
1. **Quick safe wins (low risk, high clarity)** — api `2fa-sms:` constant (#1), api dead `@authz` service delete, api email-token log removal, `SYSTEM_TENANT_ID` constant, spoof-detector weight single-source (#P1, fixes the lying UI badges), web `userEnrollment/` dead-code delete (kills a chunk of i18n debt too).
2. **i18n sweep (web P1)** — introduce `<FormTextField labelKey/>` + extract the ~70 strings to `en.json`/`tr.json`. Mechanical, well-bounded, directly addresses the recurring concern.
3. **Fail-closed audit (api P1)** — replace the auth-flow `catch(Exception)→single-factor` fall-through with fail-closed.
4. **bio config integrity** — model↔dimension validator + promote the hardcoded decision thresholds to `Settings`.
5. **amispoof detection (DECISION)** — review/merge `flash-temporal-probe`; re-arm `screen_flicker` without the over-broad Nyquist drop; lower the planarity gate or add a still-replay path. Requires on-device validation.
6. **God-class decomposition (larger refactors)** — AuthController, SessionEngine/SpoofDetector, LoginPage/HostedLoginApp, bio Settings. Sequence behind tests; reversible, incremental.

Items 1-2 are safe to ship incrementally now; items 5-6 are design decisions / need validation and should be scheduled and approved per change.
