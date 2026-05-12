# Master Investigation Synthesis — 2026-05-07

Six parallel read-only audits across `/opt/projects/fivucsas/` (parent + 5 submodules). No code changed. Source docs:

- `INVESTIGATION_MOCKS_2026-05-07.md` — mock/fake/placeholder hunter
- `INVESTIGATION_USER_CONSTRAINTS_2026-05-07.md` — user-facing limits/quotas
- `INVESTIGATION_DEV_CONSTRAINTS_2026-05-07.md` — tenant/integrator limits
- `INVESTIGATION_PIPELINES_2026-05-07.md` — production-claimed feature E2E verification
- `INVESTIGATION_WIRES_2026-05-07.md` — frontend↔backend payload contract diff
- `INVESTIGATION_FAILOPEN_2026-05-07.md` — silent-success / fail-open hunter

Total findings: ~120 across 6 lenses. This doc consolidates the **P0/P1** items into a single ranked dispatch plan.

---

## P0 — security/correctness boundary breaks

| # | Finding | File:line | Source |
|---|---|---|---|
| 1 | `/2fa/verify-method` accepts ANY non-empty `assertion` string for FINGERPRINT/HARDWARE_KEY — full 2FA bypass; audit log records "success" | `identity-core-api/.../AuthController.java:526-532` | failopen F1 |
| 2 | Embedding "encryption-at-rest" is theater — ciphertext column written, plaintext `embedding` column read; `decrypt_vector` defined but never called | `biometric-processor/.../pgvector_embedding_repository.py:227,304,766` + `embedding_cipher.py:75` | pipelines |
| 3 | `WatchlistCheckHandler` is a live `@Component` hardcoding `cleared=true, match_count=0` — KYC/AML claim broken on every flow including `WATCHLIST_CHECK` | `identity-core-api/.../verification/handlers/WatchlistCheckHandler.java:14-50` | mocks |
| 4 | `live_camera_analysis.py` returns `is_live=True` when detector is None — boot DI fail = silent fail-open | `biometric-processor/.../live_camera_analysis.py:184-193` | mocks |
| 5 | Account-lockout exception never thrown — locked users see generic "invalid credentials"; full i18n keys for `ACCOUNT_LOCKED` exist as dead code | `AuthenticateUserService.java:79,127` + `AccountLockedException.java:7` | user constraints |
| 6 | OTP has no per-code attempt counter; only 30/min IP throttle. ~150 guesses/code against 10⁶ space (NIST 800-63B violates) | `OtpService.java:29-43` | user constraints |
| 7 | `tenants.max_users` field exists, default 100, surfaced in admin UI — never read by any insert path | `Tenant.java:86-88`, `RegisterUserService`, `ManageUserService.java:202` | dev constraints |
| 8 | `TenantStatus.SUSPENDED` not gated in auth path — `Tenant.canAcceptUsers()` exists, zero non-DTO callers; suspended tenants keep minting JWTs | `AuthenticateUserService` (no tenant check), `Tenant.java:249-251` | dev constraints |
| 9 | Anti-replay spot-check defeated by corrupt frames — `continue` on decode error doesn't count as failure; 3 corrupt JPEGs = `failed_count=0` | `biometric-processor/.../verify_puzzle.py:171-196` | failopen F2 |
| 10 | Face confidence fallback can override server `verified=false` with hardcoded 0.7 threshold; never logs | `FaceAuthHandler.java:65-75` + `AuthController.java:509-518` | failopen F3 |

---

## P1 — high-priority hardening

### Mock/stub residuals
- `AddressProofHandler` always returns success without storage or validation (`AddressProofHandler.java:11-43`)
- `LoggerService.sendToLogService` + `sendToErrorTracking` are silent no-ops in prod — every browser-side error dropped (`web-app/src/core/services/LoggerService.ts:130-145`)
- `analyze_quality.py` hardcodes `occlusion=0.0` — cannot reject sunglasses/mask/hand-over-mouth (`biometric-processor/.../analyze_quality.py:136-137`)
- NFC auth is serial-only stub: no MRZ/DG1/DG2/checksum/challenge-response. Bio `mrz_parser.py` exists but only wired to manual-KYC pipeline, not NFC auth method (`NfcController.java:35-108`)

### User constraints
- Access-token TTL = **24h** (`application.yml:81`, `JWT_EXPIRATION=86400000`). Recommend 15 min in `application-prod.yml`. Refresh-rotation is solid; this is just a giant blast radius.
- Voice clip uncapped beyond 10MB upload (~5min PCM @16k); device count per user unbounded → bloated WebAuthn allowList
- Password-policy errors return concatenated English from `PasswordPolicy.java:69`; bio 413s return raw English from `main.py:247-256` — Turkish-locale users see English

### Developer/tenant constraints
- `OAuth2ClientController` is role-blind: all 5 endpoints `@PreAuthorize("isAuthenticated()")`. Any TENANT_MEMBER (incl. unexpired GUEST) can create/delete/disable OAuth2 clients (`OAuth2ClientController.java:53,73,122,140,161`)
- `/userinfo` ignores OAuth2 scope — returns email/name/given_name/family_name/phone unconditionally. Token-issuance path correctly filters by scope; userinfo doesn't. OIDC §5.4 + RFC 6749 §3.3 violation. (`OAuth2Service.java:445-474`)
- No `client_secret` rotation endpoint — operators must delete+recreate clients, breaking active integrations (`OAuth2ClientController.java:50-186`)
- No per-tenant rate-limit bucket — only per-IP/userId/clientId; `/oauth2/token` success path unbounded; only PKCE-failures throttled (30/5min, `RateLimitService.java:218-230`)

### Wire contracts
- `BiometricService.searchFace`/`enrollFace` accept `_tenantId`/`_maxResults`/`_clientEmbeddings` and silently drop them; backend supports them (`BiometricService.ts:105,201,229` vs `BiometricServiceAdapter.java:290`)
- 3 distinct error envelopes (`ErrorResponse`, RFC-6749 OAuth2, MFA-step mixed-status). Frontend `formatApiError` can't reliably distinguish.
- Face-verify response missing `distance`/`threshold` — frontend defaults `distance=1, threshold=0.4` as fake sentinels (`BiometricService.ts:218-219`)
- OAuth2 `redirectUri` regex `^https?://` rejects RFC 8252 custom schemes (`com.acme://auth`) advertised in docs (`OAuth2Controller.java:430-433`)
- `AuthSessionRepository.startSession` payload completely mismatched (`tenantId/userId` sent vs `tenantSlug/email` required) — currently zero callers, would 400 100% if wired (`AuthSessionRepository.ts:128-139`)

### Fail-open
- `AuditEventPublisher.publish` `@Async` catches all exceptions with no counter/DLQ/alert (`AuditEventPublisher.java:65-84`)
- 3 audit-log blind spots: `ChangePasswordService` has zero `auditLogPort` reference; `ManageUserService` + `ManageTenantService` import only the read port → user delete + tenant create/delete write no audit row
- 5 `/2fa/verify*` rejection paths return HTTP 200 with `success:false` — observability never sees 4xx; non-frontend consumers misinterpret (`AuthController.java:350,400,445,557,565`)

### Pipeline gaps
- Anti-spoof verdict ignores DeepFace `spoof` label when UniFace confidence ≥0.85 (`check_liveness.py:157`) — high-conf UniFace + DeepFace-spoof contradiction silently resolves in favor of UniFace
- `SoftDeletePurgeJob` default-off (`APP_PURGE_SOFT_DELETE_ENABLED=false`, `application.yml:26-27`) — implementation correct; if flag off in prod, GDPR Art. 17 unfulfilled

---

## What's working as advertised (sanity floor)

Per pipeline auditor, these features pass end-to-end at HEAD:
- Voice auth (Resemblyzer 256-dim + quality-weighted centroid)
- UniFace passive liveness (load-bearing in `/verify`)
- Refresh-token family-revoke (V50 RFC 6749 §10.4)
- GDPR data export (correctly excludes secrets/embeddings/refresh tokens)
- WebAuthn full ceremony (sig verify + sign-count check + origin allowlist)
- OAuth2 `/authorize` tenant guard (both single-step and step-up)
- Hosted-login MFA full flow (state echo + single-use code + redirect_uri re-validation)
- Cross-tenant boundary (`RbacAuthorizationService.canAccessTenant` correct; `TenantBindFromAuthFilter` enforces JWT-tenant override on header forgery)
- `SecurityConfig.java:75-149` — no unintentional permitAll
- Memory cross-checks: SHA-256 fingerprint placeholder genuinely removed; Fernet code shipped (but not invoked — see P0 #2); `BiometricServiceAdapter` is real

---

## Recommended dispatch plan

**Round 1 — P0 batch (parallel-agent, ~8 hours wall-clock)**:
1. P0-#1 fail-open in legacy `/2fa/verify-method` — short fix: remove the legacy route OR delegate to `WebAuthnVerifySupport` like the N-step path
2. P0-#2 wire `decrypt_vector` into `find_similar` + `find_by_user_id` — embedding encryption rescue
3. P0-#5 throw `AccountLockedException` from auth path with `remainingLockTimeSeconds` — frontend already has the i18n keys
4. P0-#6 add per-code OTP attempt counter (3-5 max) → invalidate code; new error code
5. P0-#10 remove the 0.7 fallback in `FaceAuthHandler` + `AuthController` — trust server `verified` field, log explicit reasons

**Round 2 — P0 product/data (parallel)**:
6. P0-#3 `WatchlistCheckHandler` — either wire to a real provider OR move to `@Profile("dev")` and document
7. P0-#4 `live_camera_analysis.py` fail-closed when detector None
8. P0-#7 enforce `tenants.max_users` in `RegisterUserService`
9. P0-#8 add `tenant.isActive()` gate in `AuthenticateUserService`
10. P0-#9 anti-replay spot-check: count corrupt frames as failures, not skips

**Round 3 — P1 hardening, dev constraints**: OAuth2ClientController RBAC + scope-filter `/userinfo` + client_secret rotation + per-tenant rate-limit bucket + RFC 8252 redirect_uri scheme support

**Round 4 — P1 wires/UX**: error-shape unification + face-verify response shape fix + BiometricService underscore-param surfacing + AuthSessionRepository contract fix or deletion

**Round 5 — P1 fail-open + audit gaps**: AuditEventPublisher exception counter + 3 audit-log blind spots filled + HTTP status code corrections on `/2fa/verify*`

**Round 6 — P1 product**: AddressProofHandler real impl OR profile-gate + LoggerService prod wiring + occlusion implementation + NFC MRZ wiring

**Operator-only follow-ups**:
- Confirm `APP_PURGE_SOFT_DELETE_ENABLED=true` on prod
- Decide watchlist provider (Refinitiv/Dow Jones/etc.) before flipping flag
- Decide OAuth2 redirect_uri policy (loosen regex vs. document HTTPS-only)

---

## Headline numbers

- **2 P0 + 1 latent P0** straight mock/fake (mocks audit)
- **2 P0** silent success in security-relevant code paths (failopen)
- **2 P0** missing user-facing constraints (lockout + OTP attempts)
- **2 P0** missing tenant-facing constraints (max_users, suspended)
- **1 P0** broken encryption-at-rest (pipelines)
- **1 P0** complete 2FA bypass on legacy route (failopen)
- **~25 P1** across the 6 lenses
- **~50 P2/P3** cosmetic/defense-in-depth

This is a substantial backlog but the P0 set is **bounded** (10 items, all narrowly scoped).
