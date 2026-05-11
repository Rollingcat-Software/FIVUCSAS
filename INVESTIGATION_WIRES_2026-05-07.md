# Wire Contract Audit — 2026-05-07

Read-only audit of frontend ↔ backend payload contracts across 10 user flows.
File:line citations are literal at HEAD; verified per memory rule
`feedback_verify_completion_claims.md` by re-reading code, not docs.

## Methodology

For each flow:
1. Read frontend method (request body keys + types).
2. Read backend `@PostMapping` / DTO declaration (required vs optional).
3. Diff: missing required, extra-dropped, naming, types, error shape.
4. Cross-check downstream proxy (BiometricServiceAdapter) when relevant.

## Per-flow contract table

| # | Flow | Path | Req shape match | Resp shape match | Error shape | Severity |
|---|------|------|-----------------|------------------|-------------|----------|
| 1 | Login | `POST /api/v1/auth/login` | OK | drops `tokenType`, `completedMethods` | `ErrorResponse` envelope | P3 |
| 2 | MFA step | `POST /api/v1/auth/mfa/step` | OK | extra `error`/`expectedMethods` keys not on FE type | mixed (200+`status:ERROR` vs 400/401/409) | **P1** |
| 3 | Refresh | `POST /api/v1/auth/refresh` | OK (`refreshToken`) | drops `tokenType` | OK | P3 |
| 4 | Face verify | `POST /api/v1/biometric/verify/{userId}` | tenant_id never sent | `distance`, `threshold` never returned | OK | **P1** |
| 5 | Face enroll | `POST /api/v1/biometric/enroll/{userId}` | tenant_id, client_embedding(s) never sent | OK | OK | **P1** |
| 6 | Face search | `POST /api/v1/biometric/search` | tenant_id, max_results never sent | mixed `matches`/`results`/`best_match` | OK | **P1** |
| 7 | OAuth2 authorize / complete | GET/POST `/api/v1/oauth2/authorize[/complete]` | OK | OK | RFC 6749 `{error,error_description}` (different from rest) | P1 |
| 8 | User register (open) | `POST /api/v1/auth/register` | OK | OK | OK | — |
| 8b | User create (admin) | `POST /api/v1/users` | OK | OK | OK | — |
| 9 | Auth-session step | `POST /api/v1/auth/sessions/{id}/steps/{order}` | path mismatch + DTO mismatch | OK | OK | **P0** (dead path) |
| 10 | Voice verify | `POST /api/v1/biometric/voice/verify/{userId}` | OK | OK (proxy translates) | OK | — |

## Cited evidence

### 1. POST /auth/login
- FE: `web-app/src/core/repositories/AuthRepository.ts:59-62` sends `{email, password}`.
- BE: `identity-core-api/.../controller/AuthController.java:132-150` accepts `LoginRequest`.
- BE DTO: `identity-core-api/.../dto/LoginRequest.java:9-26` — fields `email`, `password`, optional `clientId`. FE never sends `clientId` (memory hint: OAuth widget call would benefit from it; today it is silently null in audit logs).
- Response: `dto/AuthResponse.java:17-48` carries `tokenType`, `completedMethods`. FE `AuthApiResponse` (`AuthRepository.ts:18-37`) does not declare either field — silently dropped. Type-confusion-safe but loses the post-password completed-methods hint that informs MFA UI.

### 2. POST /auth/mfa/step
- FE: `AuthRepository.ts:137-141` sends `{sessionToken, method, data}`. Type `MfaStepResponse` (`domain/interfaces/IAuthRepository.ts:28-45`) expects `status` ∈ `STEP_COMPLETED|AUTHENTICATED|FAILED|ERROR|CHALLENGE`.
- BE controller: `AuthController.java:580-604` reads `Map<String,Object>` keys `sessionToken`, `method`, `data`. No DTO; missing key is null and surfaces inside `VerifyMfaStepService`.
- BE response shape: `application/service/mfa/VerifyMfaStepResponse.java:28-97`.
  - `status: "FAILED"` (line 28) — returns HTTP 200 with body `{status:"FAILED", message, currentStep, totalSteps, expectedMethod, completedMethods, nextAction}`.
  - `status: "ERROR"` (line 54) — returns HTTP 200.
  - `status: "ERROR"` + `error: "METHOD_ALREADY_USED"` (line 82-97) — returns HTTP **409** with extra fields `error`, `expectedMethods`, `nextAction` that are NOT in the FE TS type.
  - `badRequest`/`unauthorized` (lines 59,64) return HTTP 400/401 with `{status:"ERROR", message}` — same body shape as 200-ERROR; FE distinguishes only via HTTP status, never via body.
- **P1**: success uses 200 always; failure uses a *mix* of 200+`status:"FAILED"` AND 400/401/409. FE error mapping (`utils/formatApiError.ts`) only sees the HTTP code, so a `200/FAILED` is treated as success unless every caller also reads `data.status`. The two MFA callers (`TwoFactorDispatcher.tsx:82`, `LoginMfaFlow.tsx:186`) do read `.status`, so live-correct, but the contract is fragile.

### 3. POST /auth/refresh
- FE: `AuthRepository.ts:110-112` sends `{refreshToken}`.
- BE: `AuthController.java:153-169` + `dto/RefreshTokenRequest.java:11-15` accept `{refreshToken}` (NotBlank). Match. P3: response `tokenType` again silently dropped.

### 4. POST /biometric/verify/{userId}
- FE: `BiometricService.ts:201-211` sends multipart `image` field. **Does NOT send** `tenant_id` (signature uses `_tenantId`).
- BE: `BiometricController.java:120-128` accepts `image`, `tenant_id` (snake_case), `client_embedding`, `client_embeddings`.
- BE forwarder: `BiometricServiceAdapter.java:127-139` sets `user_id`, `tenant_id` parts and POSTs to `/verify` on bio-processor.
- Bio: `biometric-processor/app/api/routes/verification.py:32-43` requires `user_id`+`file`, optional `tenant_id`.
- **P1 silent-drop**: FE never sends `tenant_id` so multi-tenant scoping is lost at the proxy boundary. Today the backend derives tenant from JWT principal, so this is masked, but the comment on `BiometricService.ts:103-106` explicitly says "currently dropped at the proxy boundary" — that comment is outdated. The adapter at line 290 actually does forward `tenant_id` if present.
- **P1 response gap**: FE expects `{verified, confidence, distance, threshold, message}` (`BiometricService.ts:14-20`). BE returns `BiometricVerificationResponse` with only `{verified, confidence, message}` — `distance`/`threshold` default to sentinel `1` / `0.4` (line 218-219). Decisions cannot be re-tuned client-side.

### 5. POST /biometric/enroll/{userId}
- FE: `BiometricService.ts:115-124`, multipart only `image`. Multi: `enrollFaceMulti` sends `files` only (line 146).
- BE: `BiometricController.java:80-95` accepts `image`, `tenant_id`, `client_embedding`, `client_embeddings`. Multi: `:104-110` accepts `files`, same optional 3.
- **P1**: `_tenantId`+`_clientEmbeddings` parameters on FE are accepted but not forwarded — comment line 96-99 admits this. D2 telemetry captures nothing client-side because the proxy sees no payload.

### 6. POST /biometric/search
- FE: `BiometricService.ts:229-240` multipart only `file`. Underscore params `_tenantId`, `_maxResults`.
- BE: `BiometricController.java:249-256` accepts `file`, `tenant_id`, `client_embedding`, `client_embeddings`.
- **P1**: confirmed memory note. `_tenantId` and `_maxResults` silently dropped. Cross-tenant hits possible if RBAC misconfigured (mitigated by Sec-P0 #54 cross-tenant guard, but defense-in-depth `tenant_id` form field never reaches bio-processor).
- Response shape (`BiometricService.ts:242-253`) reads three different keys: `data.matches`, `data.results`, `data.best_match`. The fact the FE tries all three is itself evidence the contract is undefined — bio-processor `search.py` returns one canonical shape; the proxy may not pass through unchanged.

### 7. OAuth2 authorize / complete
- FE GET: `verify-app/HostedLoginApp.tsx:323` — query params `client_id`, `redirect_uri`, `response_type`, `scope`, optional `state`/`nonce`/`code_challenge`/`code_challenge_method`.
- BE GET: `controller/OAuth2Controller.java:77-99` matches.
- FE POST: `HostedLoginApp.tsx:291-303` sends `{mfaSessionToken, clientId, redirectUri, scope, state, nonce, codeChallenge, codeChallengeMethod}` with **null** for missing optional fields.
- BE POST: `OAuth2Controller.java:420-451` (`HostedAuthorizeCompleteRequest`) — required `mfaSessionToken`, `clientId`, `redirectUri`. Optional `state`/`nonce`/`codeChallenge`/`codeChallengeMethod` use `@Size` only — null is accepted (Bean Validation `@Size` does not trigger on null). Match.
- **P1 redirectUri regex pitfall**: `OAuth2Controller.java:430-433` — `^https?://[\w.-]+(:\d+)?(/[\w./?%&=#:+~,@!$'()*;\[\]-]*)?$`. Custom-scheme tenants (e.g. `com.acme://auth`) **WILL be rejected by Bean Validation** with HTTP 400 `invalid_request` even though `web-app/CLAUDE.md` advertises "custom schemes (com.acme://auth) and loopback per RFC 8252" support. This is a documented-vs-enforced mismatch.
- Error envelope: `OAuth2Controller.java:463-478` — uses RFC-6749 `{error, error_description, state?}` for this controller, but the rest of the API uses `dto/ErrorResponse.java:16-43` `{timestamp, status, error, message, path, errors[]}`. **P1 inconsistent error shape across endpoints** — `formatApiError` must branch.

### 8. POST /api/v1/users (admin create) and POST /auth/register (open)
- FE admin: `core/repositories/UserRepository.ts:160` sends `CreateUserData` body verbatim. Type `domain/interfaces/IUserRepository.CreateUserData` matches `CreateUserRequest` fields.
- BE admin: `controller/UserController.java:131-149` + `dto/CreateUserRequest.java:16-56`. Required `firstName`, `lastName`, `email`, `password`. `phoneNumber` optional but if present must match strict E.164 (`^\+[1-9]\d{9,14}$`). FE phone input does not enforce — backend will 400 with `phone.e164` code (`formatApiError.ts` does map this — confirmed in `feedback_no_hardcode.md` follow-up). OK.
- FE open register: `features/auth/components/RegisterPage.tsx:199-204` sends `{firstName, lastName, email, password}`.
- BE open register: `AuthController.java:110-130` + `dto/RegisterRequest.java:9-27` — exact match. OK.

### 9. POST /auth/sessions/{id}/steps/{order} — auth-session step
- FE: `core/repositories/AuthSessionRepository.ts:178-181` sends `{data}` to `/auth/sessions/${sessionId}/steps/${stepOrder}`.
- BE: `controller/AuthSessionController.java:151-157` matches path; `CompleteAuthStepCommand.java:7-9` accepts `{data: Map}`. **Match — for the step.**
- **P0 mismatch on session START**: `AuthSessionRepository.ts:128-139` sends `{tenantId, userId, operationType}` (defined in `StartSessionCommand` lines 9-15). BE `StartAuthSessionCommand.java:7-15` expects `{tenantSlug, operationType, platform, deviceFingerprint, email, ipAddress, userAgent}`. **No field overlap except `operationType`**; backend would reject as `tenantSlug` `@NotBlank`. The FE-`AuthSessionService.startSession` call is currently used by no production caller (verified by grep of `web-app/src` excluding tests — sole import is from the service file itself). So this dead surface is a **P0 latent bug** if anyone wires it up. Recommend either deleting the FE method or fixing the field names.

### 10. POST /biometric/voice/verify/{userId}
- FE: `features/auth/components/VoiceEnrollmentFlow.tsx:281-282` and `WidgetAuthPage.tsx:388` send `{voiceData}` JSON.
- BE: `controller/BiometricController.java:183-209` reads `request.get("voiceData")`, then forwards to bio-processor as `voice_data` (`BiometricServiceAdapter.java:178-179`). Bio: `voice.py:35-37` (`VoiceRequest.voice_data`). Match through translation. OK.

## P0/P1 findings (consolidated)

**P0** — `AuthSessionRepository.startSession` is broken end-to-end (different field names, missing `tenantSlug` `@NotBlank`). Today it has no live callers, so no live damage. Risk: silent failure when someone wires it up. Action: delete or repair.

**P1.1** — `BiometricService` underscore-ignored params (`_tenantId`, `_maxResults`, `_clientEmbeddings`) are accepted at the public method signature but never reach the wire. The verbal contract suggests tenant scoping; the runtime behavior depends entirely on JWT principal. D2 client-embedding telemetry never lands. Confirms memory note `project_biometric_pipeline.md`.

**P1.2** — Error-shape inconsistency across the API:
- Standard endpoints: `ErrorResponse` `{timestamp, status, error, message, path, errors[]}` (`dto/ErrorResponse.java:16-43`).
- MFA-step: HTTP 200 + `{status, message, ...}` for "soft" failures; HTTP 400/401/409 + `{status:"ERROR", ...}` for "hard" (`VerifyMfaStepResponse.java`).
- OAuth2: RFC-6749 `{error, error_description, state?}` (`OAuth2Controller.java:463-478`).
- Bio: `{detail}` (FastAPI default) when proxy passes through; `BiometricService.ts:173-191` already special-cases this.
Frontend `formatApiError` cannot reliably map all three. Recommend adopting one envelope.

**P1.3** — `tokenType: "Bearer"` and `completedMethods` on `AuthResponse` (login/refresh) silently dropped by FE — the latter loses MFA-flow continuity.

**P1.4** — `BiometricVerificationResponse` lacks `distance` and `threshold`; `BiometricService.ts:218-219` substitutes hardcoded `1` and `0.4`. Any client-side decision is bogus.

**P1.5** — OAuth2 `redirectUri` Bean Validation regex blocks custom-scheme RFC 8252 redirects despite SDK marketing. Tenants integrating from native apps will see HTTP 400 `invalid_request`.

**P1.6** — Auth-session `StartAuthSessionCommand` expects `email` to identify user; FE sends `userId` (UUID). If anyone re-enables this, no login by email works.

## Recommendations

1. **Delete dead surface or repair contract**: `AuthSessionRepository.startSession` and the Java `StartAuthSessionCommand` must agree. Either FE migrates to `{tenantSlug, email, operationType, platform, deviceFingerprint}` or BE adds `tenantId`/`userId` aliases.
2. **Forward `tenantId` everywhere**: drop the `_tenantId` underscore convention in `BiometricService` — either send it (preferred for defense-in-depth) or remove from public signatures.
3. **Unify error envelope**: pick one of `ErrorResponse`, RFC-6749, or `{detail}`. OAuth2 must stay RFC-compliant, so isolate that and standardize the rest. Document at `docs/04-api/error-shapes.md`.
4. **Add `distance` + `threshold` to `BiometricVerificationResponse`**: trivially proxy-able from bio-processor's `VerificationResponse`. Removes hardcoded sentinels.
5. **Fix OAuth2 `redirectUri` regex** to accept custom schemes (`^([a-z][a-z0-9+.-]*://|http://127\.0\.0\.1:\d+).*$`) or document the limitation.
6. **Promote `completedMethods` from /auth/login response** to `AuthApiResponse` so the MFA UI doesn't have to re-derive after step 1.
7. **MFA-step: collapse 200+`status:"FAILED"` to HTTP 4xx** (or document the mixed convention loudly). At minimum, add `error` field to FE `MfaStepResponse` type so `METHOD_ALREADY_USED` discriminator is type-safe.
8. **Add explicit FE `tokenType` field or strip it from BE** — currently inert but invites future bearer-vs-mac confusion.
9. **Document the BiometricController/bio-processor field-name translation** (`voiceData`↔`voice_data`, `tenant_id` form vs JSON) in a single integration note. Today it's distributed across three files and a spec table.

— end —
