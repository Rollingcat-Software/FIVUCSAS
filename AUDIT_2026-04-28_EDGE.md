# FIVUCSAS Edge-Cases Audit — 2026-04-28

17 findings: 2 P0 (both shipped today, see footer), 5 P1, 4 P2, 6 cleared.

## Findings

| # | Family | Location | Sev | Description | Mitigation |
|---|---|---|---|---|---|
| 1 | Concurrency | `AuthController.java:614-880` (`/auth/mfa/step`) | **P0** | Read-validate-write was non-locked. Two parallel correct OTPs in the same session could double-credit `completedMethods`, advancing `currentStep` twice — would let an attacker bypass an N-step MFA when method lists overlap. | **SHIPPED 2026-04-28** — commit `24d3784`. `MfaSessionRepository.findBySessionTokenForUpdate()` with `@Lock(PESSIMISTIC_WRITE)`; `verifyMfaStep` now wrapped in `@Transactional`. |
| 2 | Cross-tenant | `UserController.java:115-173`, `ManageUserService.java:124-132` | **P0** | `GET/PUT/DELETE /api/v1/users/{id}` only checked `@PreAuthorize` permission — no tenant scope. TENANT_ADMIN of tenant A could fetch/edit users in tenant B by direct UUID. List/search were correctly scoped. | **SHIPPED 2026-04-28** — commit `24d3784`. `enforceTenantScope()` helper in `ManageUserService` called from `getUserById`, `updateUser`, `deleteUser`. Returns 404 (no enumeration leak). SUPER_ADMIN bypasses. |
| 3 | Concurrency | `ManageEnrollmentService.java:96-121` | P1 | `startEnrollment` does `findByUserIdAndAuthMethodType().orElseGet(...)` — two parallel calls hit the DB unique violation as `DataIntegrityViolationException` → 500 instead of idempotent 200/409. | Catch `DataIntegrityViolationException` and re-fetch; or `INSERT … ON CONFLICT DO NOTHING` + reselect. |
| 4 | Resource exhaustion | `AuditLogController.java:49-50` | P1 | `/api/v1/audit-logs` accepts unbounded `size` (no `@Max`). `?size=10000000` allocates the whole result list. `/my/activity` correctly caps at 50. | Add `@Max(100)` to size, mirror `UserController:91`. |
| 5 | FK cascade | `db/migration/V44`, V10, V16, V19, V22, V30, V3, V24 | P1 | `ON DELETE CASCADE` on `tenants.id` is in tenant_email_domains, roles, auth_flows, api_keys, nfc_cards, etc. A tenant hard-delete vaporises ~10 dependent tables. Same shape as the `feedback_no_hard_delete_users` lesson, applied at tenant level. | Document tenant-hard-delete prohibition; add `@SQLDelete` soft-delete on Tenant. |
| 6 | Stale state | `MfaSessionRepository.java:19` vs entity | P2 | `deleteExpiredSessions` uses `<` while `MfaSession.isExpired()` likely uses `isBefore` — at exact `expiresAt == now` the two can disagree. Minor. | Standardize on `<= now` everywhere. |
| 7 | DB constraint corner | `V42` + `User.java:152` | P1 | `chk_two_factor_secret_encrypted` requires `enc:v1:*` prefix, but `User.two_factor_secret` has no `@Convert` — encryption is service-layer only. Any callsite that bypasses `TotpService.encrypt(...)` and writes the column raw will fail the CHECK at flush, surfacing as 500. | Add `@Convert(converter=TotpSecretAttributeConverter.class)` for defense-in-depth. (Already noted as f1ea4b0 PARTIAL in last-2-weeks audit.) |
| 8 | Migration gap | `db/migration/` | P1 | Version chain V42 → V44 (V43 missing — that work shipped as V48 instead). `out-of-order=false` in prod, so a future PR submitting a real V43 will fail at boot. | Reserve V43 with a no-op marker, or set `out-of-order=true`. |
| 9 | PWA stale cache | `web-app/vite.config.ts:97-127` | P2 | `VitePWA({registerType:'autoUpdate'})` with no `navigateFallback` and no `cleanupOutdatedCaches` — service worker can serve stale `index.html` referencing chunks that no longer exist on Hostinger. | Add `navigateFallback: '/index.html'`, `cleanupOutdatedCaches: true`. |
| 10 | Biometric input | `biometric-processor app/api/routes/enrollment.py:118`, `verification.py:89` | P2 | Magic-byte validation present but no `MAX_FILE_SIZE` cap in routes. 100 MB upload reaches `validate_image_file` before rejection, eating CX43 RAM. | Starlette `UploadFile` size guard (`if file.size > MAX_BYTES: 413`) or NGINX `client_max_body_size 10m;`. |

## Cleared (no edge-case violations)

- **#11 JWT alg-confusion** — JJWT 0.12 enforces alg/key consistency; `keyLocator` routes by kid.
- **#12 Pagination negatives on /users** — `@Min(0)`, `@Min(1) @Max(100)` correct.
- **#13 NFC/WebAuthn cross-user** — both check credential/card belongs to MFA-session user.
- **#14 OAuth2 cross-tenant** — explicit user.tenant.id == client.tenant.id check (and today's tenant-lock at AuthenticateUserService).
- **#15 Login rate limit** — per-IP+path bucket, fail-closed in-memory fallback, sensitive-paths whitelist + PKCE_FAILURE per-client.
- **#16 Soft-delete email reuse** — partial unique index on `WHERE deleted_at IS NULL` works correctly.
- **#17 Java multipart limits** — 10 MB / 15 MB enforced by Spring before controller. Biometric processor side is the gap (#10).

## Top 3 to fix this week (carryover from this audit)

1. **#3 startEnrollment race → 500** — wrap with conflict-tolerant insert.
2. **#4 Audit-log unbounded page size** — easiest DoS vector, one-line fix.
3. **#5 Tenant CASCADE trap** — document policy + add `@SQLDelete`.

Today shipped: #1 (MFA race) + #2 (cross-tenant by-id).
