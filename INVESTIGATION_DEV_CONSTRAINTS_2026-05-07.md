# Developer / Tenant / Integrator Constraint Audit
**Date:** 2026-05-07 · **Scope:** read-only, HEAD of every submodule under `/opt/projects/fivucsas/`.
**Method:** verified each row by reading source on disk; no doc claims trusted (per `feedback_verify_completion_claims.md`).

---

## 1. Inventory & Findings

| # | Constraint | Defined | Server-enforced | Surfaced (API/UI) | Reasonable | Severity | Citation |
|---|---|---|---|---|---|---|---|
| 1 | OAuth client RPM cap | NO global / per-client RPM bucket. Only **PKCE-failure** bucket: 30 fails / 5 min / `clientId`. | Partial — failures only; success path unbounded. | 429 + `Retry-After` in failure path. | NO — a client minting 10k tokens/min cannot be capped. | **P1** | `RateLimitService.java:218`-`230`, `:370`-`377` |
| 2 | OAuth scopes — declared vs enforced on `/userinfo` | Stored in `allowed_scopes` (space-sep). | `/userinfo` returns **all** profile claims regardless of token's `scope` claim. | Discrepancy invisible to integrator. | NO — declared scope filtering on ID-token issuance only (`OAuth2Service.java:372`-`384`); `/userinfo` ignores scope. | **P1** | `OAuth2Service.java:445`-`474` |
| 3 | Redirect-URI allowlist | JSON-array in `oauth2_clients.redirect_uris`; exact string + RFC 8252 §7.3 loopback handling. | YES — `OAuth2Client.isRedirectUriAllowed` + `OAuth2Service.validateClient`. | 400 `invalid_request`. | YES — query-smuggling guard, IPv4-loopback only. | OK | `OAuth2Client.java:111`-`166`, `OAuth2Service.java:80`-`89` |
| 4 | Allowed origins per client | NOT per client — single global list `app.cors.allowed-origins`. | YES at CORS filter, NO per-client. | None. | NO — every registered client implicitly trusts every CORS origin. | **P2** | `SecurityConfig.java:48`-`49`, `:248` |
| 5 | `client_secret` strength + rotation | Generated via `SecureRandom`, 64 hex chars (256-bit). **No rotation endpoint.** Plaintext shown ONCE on create. | Strength YES; rotation NOT possible. | New client only. | NO — operators must DELETE+CREATE to rotate, breaking downstream config. | **P1** | `OAuth2ClientController.java:85`, `:139`-`155`, `:190`-`198` |
| 6 | Confidential vs public clients | Boolean `confidential` on entity, default true; V38 sets `dashboard` confidential=false. | YES — confidential clients require `client_secret`; public clients require PKCE-S256. | RFC 6749 §5.2 errors. | YES — strong, post-2026-05-02 hardening. | OK | `OAuth2Client.java:74`-`77`, `OAuth2Service.java:307`-`341`, `OAuth2Controller.java:332`-`342` |
| 7 | Token TTL per client | NOT per client. Single `JwtService.getExpirationMillis()`. | Global only. | None. | Acceptable for v1 but a gap vs Auth0/Okta. | P3 | `OAuth2Service.java:354` |
| 8 | Per-tenant allowed auth methods | `tenant_auth_methods` table (`is_enabled` + JSONB `config`). | Read-side only — entity exists but I found no enforcement gate at `/auth/login` that filters disabled methods. | Admin UI lists, but server lets disabled methods proceed in flows. | NO — partial. | **P1** | `TenantAuthMethod.java:33`-`56` |
| 9 | Per-tenant rate limits / quotas | NO per-tenant rate limit. RateLimitService keys = IP / userId / clientId / email. | NO. | None. | NO — noisy-neighbour exposure. | **P1** | `RateLimitService.java:46`-`62` |
| 10 | Max users per tenant | Column `tenants.max_users` default **100**. | **NOT enforced** — `RegisterUserService` and `ManageUserService` never read `tenant.maxUsers`. Only used for read-side reporting. | Field returned in tenant dashboard but ignored on insert. | NO — false sense of cap. | **P0** | `Tenant.java:86`-`88`; `RegisterUserService.java` (no maxUsers ref); `ManageUserService.java:202` (count, not enforce) |
| 11 | Max OAuth clients per tenant | NO cap. | No. | None. | NO — runaway spam vector for self-service tenants. | **P2** | `OAuth2ClientController.java:72`-`116` |
| 12 | Tenant suspension / disable | `TenantStatus` {ACTIVE, INACTIVE, SUSPENDED, TRIAL, PENDING}; `Tenant.suspend()`/`deactivate()`. | **NOT checked at JWT issuance.** `AuthenticateUserService` has no `tenant.isActive()` gate; `Tenant.canAcceptUsers()` exists but is unused outside reporting. | Admin UI sets status; runtime ignores it. | NO — suspended tenants keep authenticating. | **P0** | `Tenant.java:178`-`187`, `:249`-`251`; verified zero call-sites for `isSuspended()`/`canAcceptUsers()` outside DTO mapping. |
| 13 | Tenant deletion (GDPR) | Hibernate `@SQLDelete` + `@SQLRestriction`; V49 schema; `softDeleteTenant(UUID)`. | YES — hard delete intercepted to UPDATE. | `ManageTenantService.softDeleteTenant`. | YES. | OK | `Tenant.java:41`-`42`, `ManageTenantService.java:175`-`200` |
| 14 | Tenant cross-isolation | Application-layer: `TenantBindFromAuthFilter` overwrites a forged `X-Tenant-ID`. Postgres RLS NOT yet hardened (JPA still runs as superuser per file comment). | Partial — filter blocks header forgery. RLS bypass remains. | None visible to dev. | Application path good; DB path is the operator residual. | **P1** | `TenantBindFromAuthFilter.java:81`-`132`; comment `:54`-`58` flags Task #27 unfinished. |
| 15 | Biometric-processor `X-API-Key` | `API_KEY_SECRET` env, no length validation. Production `get_api_key_config` raises if `API_KEY_ENABLED=false`. Single shared secret across all tenants. | YES — `hmac.compare_digest` per request. | 401 + `WWW-Authenticate: ApiKey`. | NO — single secret, no per-tenant key, no rotation tooling. | **P1** | `biometric-processor/app/main.py:182`-`204`, `app/core/config.py:472`-`528` |
| 16 | Per-API-key rate limit (bio) | Tier table `{free, standard, premium, unlimited}` based on `api_key_context`. **A validated API key bypasses rate limiting entirely.** | Mostly NO — `dispatch:88-90` short-circuits. | None when bypassed. | NO — defeats DoS protection for the only authenticated caller (identity-core-api). | **P2** | `biometric-processor/app/api/middleware/rate_limit.py:87`-`90`, `:63`-`68` |
| 17 | Webhook signing secret | **No webhooks implemented.** Zero matches for webhook anywhere in identity-core-api java tree. | N/A | N/A | Gap — common SaaS feature missing. | P3 | `grep -rln webhook` returns no source files. |
| 18 | Admin RBAC (SUPER_ADMIN vs TENANT_ADMIN) | Hierarchical: ROOT > TENANT_ADMIN > TENANT_MEMBER > GUEST. | YES — `RbacAuthorizationService.hasPermission` + `canAccessTenant`. | 403 JSON envelope. | YES — clean. | OK | `RbacAuthorizationService.java:43`-`107` |
| 19 | Admin-only routes guarded | Mostly via `@PreAuthorize("@rbac…")` SpEL. **OAuth2ClientController uses only `isAuthenticated()`** — no role check. | Partial — any authenticated user (incl. GUEST) of a tenant can register/delete OAuth2 clients for **their** tenant. | Cross-tenant blocked by tenant filter; intra-tenant role check missing. | NO — guests/members can mint clients. | **P1** | `OAuth2ClientController.java:53`,`:73`,`:122`,`:140`,`:161` |
| 20 | Audit log retention | V57 hands `audit_logs` to pg_partman (fail-soft if extension absent). No tenant-specific retention policy. | Partition lifecycle only; no per-tenant TTL. | Operator runbook only. | OK platform-wide; gap for per-tenant SLA. | P3 | `db/migration/V57__audit_logs_pg_partman.sql:1`-`27` |
| 21 | GDPR export shape & SLA | `UserDataExportController` returns JSON bundle, `Content-Disposition: attachment`. Rate-limited 1/h/caller. SLA implicit (synchronous). | YES. | `200` + JSON. | OK for individual; no tenant-bulk export. | OK | `UserDataExportController.java:49`-`94`, `RateLimitService.java:354`-`360` |
| 22 | GDPR data-erasure pipeline | `PurgeAdminController` gated on `@rbac.isSuperAdmin()`. `Tenant`+`User` soft-delete via `@SQLDelete`. | YES at admin endpoint; user soft-delete has FK-cascade safeguards (V53 trigger). | 403 for non-ROOT. | OK — tenant admins cannot trigger purge directly (P1 gap if KVKK ops on their own users). | OK | `PurgeAdminController.java:37`, `Tenant.java:41`-`42`, V53 trigger comment in `identity-core-api/CLAUDE.md`. |
| 23 | WebAuthn allowed origins | `app.webauthn.allowed-origins` env, default-empty in `application.yml` warns "every assertion will be rejected". Prod default: `https://app/verify/demo.fivucsas.com`. | YES — `WebAuthnService` rejects unlisted origins. | 401-style WebAuthn errors. | YES — fail-closed. | OK | `WebAuthnService.java:42`-`47`, `application-prod.yml:69` |
| 24 | Embeddable widget — `client_id` | `verify-app` reads `client_id` from URL query (hosted-login). Iframe widget (`verify-widget/html/`) is anonymous-permitted on the SDK lifecycle but the **server still demands client_id at `/oauth2/authorize`** — verified `OAuth2Controller.java:80` `@RequestParam("client_id")` (required). | YES. | 400 if missing. | YES. | OK | `OAuth2Controller.java:79`-`97` |
| 25 | SDK CSP / iframe sandboxing | `postMessageBridge.ts:48`-`80`: `parentOrigin` stays null until config handshake; outbound dropped (NOT `'*'`). Inbound origin check exists. | YES — handshake-gated. | DEV warning only. | YES — strong. | OK | `postMessageBridge.ts:39`-`80` |

### Anonymous-endpoint compare (per `feedback_pr_review_workflow.md`)

`SecurityConfig.java` permitAll list (lines 75-149) cross-checked against controllers:
- `/api/v1/oauth2/authorize`, `/oauth2/authorize/complete`, `/oauth2/token`, `/.well-known/*`, `/oauth2/clients/*/public` — intentional, all RFC-mandated.
- `POST /auth/sessions/*/steps/*` is permitAll (line 118). Controller relies on session-token validity; no JWT required. Verified intentional (multi-step pre-JWT).
- `POST /api/v1/auth/mfa/step` permitAll (line 85) BUT bucketed at 30/min/IP via `allowMfaStepAttempt` — confirmed at `RateLimitService.java:181`-`191`.
- **No unintentional permitAll found** in current `SecurityConfig`.

### Cross-tenant boundary check
SUPER_ADMIN of tenant A → tenant B: `RbacAuthorizationService.canAccessTenant(UUID)` lines 97-107 — `ROOT` (== platform super-admin) bypasses tenant equality check; `TENANT_ADMIN` is constrained to `currentUser.getTenant().getId().equals(tenantId)`. So **TENANT_ADMIN cannot read another tenant**; only `ROOT` (platform owner) can. Naming in the prompt was ambiguous — codebase distinguishes `ROOT` (platform) from `TENANT_ADMIN` (one tenant). Boundary is correct.

`TenantBindFromAuthFilter.java:114`-`131` enforces JWT tenantId override for non-SUPER_ADMIN users. Verified.

---

## 2. P0 / P1 / P2 / P3

### P0 — Production-impacting today
1. **`tenants.max_users` is decorative.** Field exists, dashboard reads it, no insert path enforces it. A self-service tenant can add unlimited users. (`Tenant.java:86`-`88` + absence at `RegisterUserService`.)
2. **Tenant suspension does not stop authentication.** `TenantStatus.SUSPENDED` is settable in admin UI but no auth-time check. A suspended tenant's users keep logging in and minting JWTs. (`AuthenticateUserService` has no `tenant.isActive()` call; `Tenant.canAcceptUsers()` zero non-DTO callers.)

### P1 — Fix this milestone
3. **No global RPM rate limit on `/oauth2/token`** success path. Only PKCE-failure throttled. (`RateLimitService.java:218`-`230`.)
4. **`/userinfo` ignores token's scope claim.** Returns email/name/phone irrespective of `scope`. RFC 6749 violation. (`OAuth2Service.java:445`-`474` — no `scope` filtering.)
5. **No client_secret rotation** endpoint on `OAuth2ClientController`. Only delete+recreate. (Lines 50-186 — no `/rotate-secret`.)
6. **`OAuth2ClientController` lacks role check.** `@PreAuthorize("isAuthenticated()")` only. A `TENANT_MEMBER` (or `GUEST` with non-expired token) can register OAuth clients in their tenant. Should require `@rbac.isTenantAdmin()`. (Lines 53, 73, 122, 140, 161.)
7. **Tenant cross-isolation depends on app-layer filter alone.** Postgres RLS not yet hardened — `TenantBindFromAuthFilter.java:54`-`58` flags Task #27 unfinished; if filter is bypassed (e.g. raw SQL endpoint, native queries) tenant rows leak.
8. **Per-tenant auth-method allowlist (`tenant_auth_methods.is_enabled`) lacks runtime enforcement gate.** Disabled methods can still be selected at session start.
9. **Single biometric-processor API key shared across all tenants** with no rotation tooling and no per-tenant identity. Loss = full bypass for every tenant. (`biometric-processor/app/main.py:182`-`204`.)

### P2 — Schedule
10. **CORS allowed-origins is global, not per OAuth2 client.** (`SecurityConfig.java:48`-`49`.)
11. **No max OAuth-clients-per-tenant cap.**
12. **Validated API-key calls bypass rate limiting in biometric-processor** (`rate_limit.py:87`-`90`). Means identity-core-api's caller has no upper bound; a runaway loop can pin the GPU/CPU container.

### P3 — Track
13. No per-client token TTL override.
14. No webhooks subsystem.
15. No per-tenant audit-log retention policy (platform-wide pg_partman only).

---

## 3. Recommendations

1. **Wire `tenants.max_users` into `RegisterUserService` and `ManageUserService.createUser`** before the next demo. Throw a dedicated `TenantUserCapException` → 409 with `Retry-After: never` semantic. Keep `ROOT` exempt.
2. **Gate JWT issuance on `tenant.canAcceptUsers()`.** Add a single line to `AuthenticateUserService.authenticate` that 403s with `tenant_suspended` if status ∈ {SUSPENDED, INACTIVE, PENDING}. Same gate at OAuth2 `/authorize`.
3. **Add `OAuth2ClientController` role check.** Replace `@PreAuthorize("isAuthenticated()")` with `@PreAuthorize("@rbac.isTenantAdmin()")` on POST/DELETE/PATCH; keep GETs at `isAuthenticated()` for self-introspection.
4. **Add `/oauth2/clients/{id}/rotate-secret`** that mints a new 256-bit secret and returns it once; old secret invalidated on commit. Document grace window (no overlap by default).
5. **Filter `/userinfo` by access-token scope.** `scope.contains("email")` → include email; `"profile"` → name set; `"phone"` → phone. Mirror `OAuth2Service.java:372`-`384` pattern.
6. **Add a global `clientId`-keyed token bucket** (e.g. 600 req/min default) to `/oauth2/token` success path. Per-tenant override stored in `Tenant.rateLimitTier`.
7. **Move biometric-processor to per-tenant API keys** stored in DB, hashed at rest, rotated independently. Drop the single `API_KEY_SECRET` env to legacy fallback only.
8. **Lift `is_enabled=false` enforcement** into `AuthSessionController.startSession` — strip disabled methods from the allowed-step list before persisting.
9. **Finish Task #27 (RLS hardening)** — switch JPA datasource to a non-superuser role and enable `FORCE ROW LEVEL SECURITY` on tenant-scoped tables. The TenantBindFromAuthFilter is the application half; RLS is the DB half.
10. **Cap `oauth2_clients` per tenant** (default 25) and surface the limit on the Developer Portal UI.
11. **Stop bypassing rate limits for validated API keys** in biometric-processor; instead apply the `unlimited` tier (999 999) which is effectively the same but keeps headers + observability.
12. **Document developer-facing constraints in one place** — currently spread across `OAuth2Client` Javadoc, `Tenant` entity, `RateLimitService`. A single `DEV_LIMITS.md` table the Developer Portal can render would close the discoverability gap.

---

**Word count:** ~1,690.
