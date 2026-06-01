# FIVUCSAS — Master Gap Register (Pre-Demo)

**Date:** 2026-06-01 · **Demo:** Thursday + Friday this week
**Purpose:** the single prioritized list of everything found across today's audits, so tomorrow is pure fixing. Goal: Thursday/Friday no professional / production / deployment / security issue, and **no claimed feature that doesn't actually work**.

**Source audits (detail docs in repo root):**
- `LOGIC_AUDIT_2026-06-01.md` — 18 subsystems, 38 confirmed logic bugs (adversarially verified)
- `FEATURE_COMPLETENESS_2026-06-01.md` — 144 claimed features verified (96 work / 21 partial / 4 not-built / 6 do-not-demo)
- `VISUAL_AUDIT_ALLSITES_2026-06-01.md` — all 8 public surfaces
- `DEMO_FIVUCSAS_AUDIT_2026-06-01.md` — the BYS demo site
- `NFC_EID_READINESS_2026-06-01.md` — NFC / passport chip readiness
- Production-readiness sweep (folded into §5 + `OPERATOR_TODO_2026-06-01.md`)

**Legend — Status:** ✅ fixed today · 🔧 fix tomorrow · ⚠️ mitigate/avoid on stage · 📋 operator action · 🔮 roadmap (not before demo)
**Severity:** P0 critical (security/demo-blocker) · P1 high · P2 medium · P3 low

---

## 0. Fixed today (verified)

| Item | What | Status |
|------|------|--------|
| NFC login regression | Re-enabled serial-only (compose `environment:` gap — the flag in `.env.prod` never reached the container) + canonicalize on the live `/auth/mfa/step` handler (#189) + **V79 backfill** of pre-WS2 non-canonical stored serials + prod data fix. İstanbulkart/student-card login works again. | ✅ live |
| **Config-driven zero-factor login bypass** (P0) | `AuthenticateUserService.execute()` could mint a full token with **no factor verified** (optional non-PASSWORD Layer-1). Added the step-1-always-runs filter + fail-closed guard. | ✅ deployed (api rebuilt 17:59) |
| NFC hint over-claim | Step hint promised passport/national-ID/residence-permit (random-UID chips that can't work). Softened to "your enrolled NFC card". | ✅ committed (web deploy pending) |

---

## 1. P0 — Critical (must fix before demo)

| # | Item | Where | Status | Effort |
|---|------|-------|--------|--------|
| P0-1 | Config-driven login mints session with ZERO factors verified | `AuthenticateUserService.execute()` | ✅ fixed today | — |
| P0-2 | **Account lockout fully bypassable** via identifier-first/MFA-step path; the strike counter never increments at `/auth/mfa/step`, so brute-force is unthrottled (only 30/min/IP). | `VerifyMfaStepService.execute()`, `PasswordVerifyMfaStepHandler.verify()` | 🔧 | medium |
| P0-3 | **TENANT_ADMIN can assign the global ROOT role** → full platform escalation. Two paths: `POST /users/{id}/roles/{roleId}` (implicit-permission grant) and admin `/users` update. `canAssignRole` privilege-ceiling guard is dead code (0 callers). | `RbacAuthorizationService.hasPermission/assignRoleToUser`, `ManageUserService` | 🔧 | medium |
| P0-4 | **Refresh-token reuse-detection revocation is a no-op** — family revocation runs inside the enclosing transaction that then rolls back, so a stolen refresh token's family is never actually revoked. | refresh-token rotation service | 🔧 | medium |

> P0-2 / P0-3 are the security questions a CS professor is most likely to probe on an *auth* platform. P0-2 shares the same root cause as P0-1 (the `layer1IsPassword` dual-path — see §6).

## 2. P1 — High

| # | Item | Where | Status | Demo impact |
|---|------|-------|--------|-------------|
| P1-1 | `/auth/mfa/step` doesn't enforce the submitted method belongs to the current step's method set | `VerifyMfaStepService` | 🔧 | step-skipping/factor-substitution risk |
| P1-2 | **QR_CODE as a 2nd factor always fails** — handler reads the wrong Redis store (`2fa-qr:<userId>`, never written) | `QrCodeVerifyMfaStepHandler.verify` | 🔧 / ⚠️ | **don't demo QR-as-2FA** until fixed (QR-as-Layer-1 via the legacy handler is fine) |
| P1-3 | **Suspended/inactive users can still authenticate** — no status gate on the modern login/refresh paths | `execute()`, `VerifyMfaStepService`, `RefreshAccessTokenService` | 🔧 | don't showcase "suspend a user" then expect login to fail |
| P1-4 | WebAuthn UV (user-verification) bit never enforced — UP-only assertions accepted as full factor | passkey `authenticate` | 🔧 | passkey "works" but weaker than claimed |
| P1-5 | OIDC `id_token` `aud` polluted with the API's own audience (multi-aud, no `azp`) | token mint | 🔧 | strict OIDC validators may reject |
| P1-6 | Email-keyed caller resolution non-unique cross-tenant → `NonUniqueResultException` | caller resolution | 🔧 | a duplicate-email person can 500 on login |
| P1-7 | All-methods biometric consent not a singleton (inverted UNIQUE) → revoke fails | `V68` / consent service | 🔧 | consent revoke path |
| P1-8 | **NFC re-enroll reactivates a revoked card + silently reassigns ownership** | `ManageNfcCardService.enrollCard` | 🔧 | data-integrity/security |
| P1-9 | Guest invitation acceptance bypasses tenant `max_users` quota | `GuestLifecycleService` | 🔧 | quota integrity |
| P1-10 | Voice verify uses a non-normalized centroid → confidence shrinks below threshold as enrollment count grows | biometric-processor voice | 🔧 | voice verify degrades over time |
| P1-11 | **status.fivucsas.com leaks internal Docker hostname** `http://identity-core-api:8080/actuator/health` as a public clickable link | Uptime Kuma monitor | 📋 1-click | professors will see it |
| P1-12 | **verify.fivucsas.com login flow unstable** — Marmara shows two different first screens depending on load timing (engineActive canary flip) | web login config | 🔧 / ⚠️ | pin Marmara to ONE flow before demo |
| P1-13 | Shared launcher CSP-blocked on verify + demo callback (`app.fivucsas.com` missing from `script-src`); absent on amispoof | CSP / Traefik + SPA | 🔧 | cross-site nav/EN-TR dead on those pages |
| P1-14 | docs.fivucsas.com: bespoke `/`+`/sdk` vs **stock Swagger** `/biometric`+`/identity`; EN/TR toggle dead on 3/4 pages | docs site | 🔧 | "is this finished?" tell |

## 3. P2 — Medium (polish; fix what time allows)

- MediaPipe FaceLandmarker WebGL graph initializes on the **pre-auth login** on app + verify (shared web-app code) — defer/lazy-load off the login screen (perf + near-blank first paint).
- app.fivucsas.com login **form reflows** identifier-first → password (reserve height).
- poster **dotted-İ** on English uppercased labels (`lang="tr"` + `text-transform`) — "BİOMETRİC", "LİNES OF CODE" (single-line locale fix).
- demo callback.html **no HSTS**; callback page unlocalized (Turkish-only).
- docs subpage **HTTPS→HTTP** redirect downgrade.
- EN/TR toggle no-ops platform-wide (verify/app/amispoof/poster/docs-subpages) — localize or hide where there's no TR.
- OIDC/OAuth: registered-client `expiresAt` not enforced (near-zero surface today).
- amispoof: emoji-on-buttons, red 0% labels, "Mask 3d"/"Ar Filter" casing.

## 4. Feature claim-gaps — "we have it but it doesn't (fully) work"

**DO NOT present these as working/live (from `FEATURE_COMPLETENESS`):**

| Feature | Reality | Action |
|---------|---------|--------|
| **HARDWARE_KEY (FIDO2/YubiKey)** | Code complete, but no physical key purchased | Don't demo live; describe as "supported, hardware on order" |
| **npm packages** (`@fivucsas/auth-js`, `-elements`, `-react`) | Packaged but **NOT published** → `npm install` returns E404; `-react` doesn't exist | Either publish (📋 operator) or change docs to **CDN-only** before demo |
| **iOS app** | Not built (0/13, no Xcode module) | Roadmap only; demo Android + web |
| **BYOD** | Design doc only, unbuilt | Roadmap only |
| **Biometric demographics** (age/gender/emotion) | Route not mounted → would 404; +400 MB RAM on a 94%-full box | Don't claim as a live endpoint |
| **Bio "sprint-4"** (multi-face / similarity-matrix / webhooks) | Run inside bio service but **unreachable externally** (no api proxy) | Present as internal capability only, not user-facing |
| **Pairwise OIDC `sub`** | Flag default OFF / dormant | Don't claim per-RP subjects are active |
| **Poster paper metrics** (CASIA AUC, ISO 30107-3, iBeta) | Flagged for integrity review; `learned-fuser` "100%/ACER 0%" is NO-MERGE | **Do not present as verified results**; iBeta is "submission pending" |

Plus **21 "partial"** features (work with caveats) — see `FEATURE_COMPLETENESS_2026-06-01.md` per-group tables.

## 5. Demo-day operational risk list (production-readiness)

1. **📋 Send one real EMAIL OTP + one real SMS OTP before Thursday.** Both are wired + live (Twilio Verify initialized, SMTP enabled), but *delivery* (Hostinger SMTP auth / Twilio balance / spam) can't be proven read-only. A dead OTP on stage is the most visible failure. **#1 pre-demo check.**
2. **⚠️ Do NOT `--no-cache` rebuild any container Thu/Fri.** Disk 89% (18 GB free); the only past ENOSPC incident was a rebuild. Recreates are fine. Optional margin: `docker image prune -af --filter until=168h`.
3. **⚠️ Mobile demo = pre-installed app** (signed-APK keystore unprovisioned — see operator TODO).
4. P3: JWT issuer not pinned (empty env override); biometric-processor missing `pytz` → aged-embedding threshold silently disabled (face verify still works). Leave for after demo.
5. ✅ Healthy now: all containers up (RestartCount=0), TLS 35+ days, nightly encrypted backups, face-verify + liveness work end-to-end in prod.

## 6. Cross-cutting refactor (root cause of P0-1/P0-2/P1-3) — 🔮 roadmap

`AuthenticateUserService.execute()` verifies PASSWORD **inline** and special-cases it via the `layer1IsPassword` boolean, while every other factor runs through the uniform `VerifyMfaStepService` step engine. This **dual login path** is the root of the zero-factor bypass, the lockout bypass, and the suspended-user bypass (each is "the two paths disagree"). **Fix: retire `layer1IsPassword` — make PASSWORD just another step so the single step engine enforces lockout, account-status, replay, and step-membership for every factor.** Larger than a Thursday patch; today's P0-1 fix is a targeted guard. Track as the top backend refactor.

## 7. What is genuinely solid (demo with confidence)

Landing site, links hub, amispoof tester, status page (modulo P1-11), the hosted-login + dashboard login *forms*, OAuth/OIDC discovery + JWKS + token, **face enroll/verify + liveness end-to-end in prod**, password + TOTP + EMAIL_OTP login, multi-tenancy isolation, audit logs, RBAC, account-linking, the auth-flow builder, GDPR export. 96/144 features verified working.

---

### Suggested order for tomorrow
1. P0-2, P0-3, P0-4 (the remaining criticals) — security questions professors will probe.
2. P1-11 (1-click status fix), P1-12 (pin Marmara flow), P1-13 (launcher CSP) — visible "polish/finished" signals.
3. P1-2/P1-3 (QR-2FA + suspended-user) if demoing those flows.
4. Feature-claim doc/CDN corrections (§4) + npm decision.
5. §5 operator checks (OTP delivery test).
6. P2 polish as time allows.
