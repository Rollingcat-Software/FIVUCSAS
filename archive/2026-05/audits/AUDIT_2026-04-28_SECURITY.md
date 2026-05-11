# FIVUCSAS Security Audit — 2026-04-28

Independent read-only review. 2 P0, 3 P1, 3 P2 violations + 6 missing controls.

## P0 — fix urgently

1. **Prod secrets in git history** — `.env.gcp` committed in `f8ee668` (removed in `69c9a79`) and `web-app/.env.production` committed in `6bdedd2` (removed in `a5069e9`) — but the secrets remain in history (full HS512 JWT signing key, DB password, Redis password, VITE_BIOMETRIC_API_KEY). Anyone with repo read access can extract them.
   **Fix**: rotate all (TODO Phase C1a-f) + `git filter-repo` both repos + force-push + add gitleaks/push-protection.

2. **`VITE_BIOMETRIC_API_KEY` shipped in browser bundle** — `BiometricService.ts:54-56` reads it and ships it as `X-API-Key` on every browser-originated call. Multiple consumers: face enrollment, login face check, continuous verification. Today's `useFaceSearch` reroute (commit `fc16cdd`) closed ONE callsite; the others remain.
   **Fix**: route ALL biometric calls through identity-core-api (which uses internal docker DNS — see `f359f50` / `9d4481f` taking bio.fivucsas.com fully internal). Drop the env var from the SPA bundle entirely.

## P1

3. **JWT default-algo on `main` is HS512, not RS256** — `application.yml:77` and `.env.example:48` default `JWT_DEFAULT_ALGO=HS512`. The flip-to-RS256 commit `3eb0161` lives only on the unmerged `security/phase-1-auth-hardening` branch. Prod posture depends entirely on whether `.env.prod` overrides — verify or lock the default in `application-prod.yml`.

4. **`POST /auth/mfa/step` has no rate-limit bucket** — the `RateLimitInterceptor` only matches `/auth/login`, `/auth/register`, `/oauth2/clients/.../public`, `/auth/mfa/qr-generate`. The `MFA_STEP` bucket from `3eb0161` was never merged.
   **Fix**: cherry-pick the MFA_STEP bucket OR add a path match here.

5. **bio.fivucsas.com publicly routed** — **CLOSED 2026-04-28**, commit `9d4481f`. Public Traefik router stripped; internal docker DNS only.

## P2

6. **Refresh-token rotation has no reuse-detection** — `RefreshTokenService.rotateRefreshToken` revokes the presented token and mints a new one, but presenting a previously-revoked token throws `TokenRevokedException` without revoking the active descendant. RFC 6749 §10.4 best practice not implemented.

7. **`OAuth2Controller.HostedAuthorizeCompleteRequest` lacks @Valid** — no Bean Validation constraints; manual null/blank checks substitute.

8. **Audit log `details` strings include unescaped user input** — fine for log files; must be HTML-escaped if rendered in a future audit-log UI.

## What's PASSing

- JWKS / kid routing / alg-vs-key enforcement
- OAuth2: PKCE S256 mandatory for public clients, state+nonce echo, redirect URI exact-match, single-use authorize-code, cross-client code replay blocked, **tenant-bound client refusal** (today's commit 5446d57)
- RBAC: `TenantScopeResolver` fail-closed zero-UUID, comprehensive `@PreAuthorize` coverage
- `.env.example` clean (placeholders only)
- TOTP encrypted at rest + V42 CHECK constraint (today)
- Security headers: HSTS, X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy
- CSP on web-app + auth-test
- CORS allow-list (4 explicit origins, never `*`)
- Login + register + forgot/reset rate-limited + Retry-After on 429
- @Valid on most @RequestBody controllers
- No SQL injection (Spring Data JPA parameterized)
- Biometric processor X-API-Key middleware enforced; demo UI disabled in prod; container hardened (read_only, cap_drop, no-new-privileges)
- CSRF immune by design (Bearer-token in Authorization header, STATELESS sessions)
- audit_logs.tenant_id populated (V46 backfill)

## Missing controls (not actioned, recorded for backlog)

- JWT secret rotation runbook + `kid` rotation schedule
- Refresh-token-reuse family revocation
- WAF / IP allowlist on bio.fivucsas.com — **closed today** (no longer publicly routed)
- CSP `report-uri` for production violation telemetry
- DNSSEC / CAA records for `*.fivucsas.com`
- Static analysis hook (gitleaks / trufflehog) on every PR

## Top 3 actionable this week

1. **#2 Bundle-shipped biometric API key** — extends today's `useFaceSearch` reroute to all callsites. ~1 hour of work.
2. **#1 Secret rotation + history rewrite** — multi-hour, coordinated. Plan a maintenance window.
3. **#4 MFA_STEP rate-limit** — cherry-pick from `security/phase-1-auth-hardening` or add path-match. Small change.
