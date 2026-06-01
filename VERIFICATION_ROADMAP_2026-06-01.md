# FIVUCSAS — Verification Roadmap (verify the entire platform end-to-end)

**Date:** 2026-06-01 · **Goal:** prove every demo-relevant feature *actually works end-to-end* before Thursday — not "exists in code." Authorized to create + clean up disposable test data on prod.

## Status of verification

| Phase | What | State |
|-------|------|-------|
| **1. Static audit** | Logic-correctness (38 bugs), feature-by-code (144 claims), visual (8 surfaces), prod-readiness, NFC/eID | ✅ done — see the 5 detail docs + `MASTER_GAP_REGISTER` |
| **2. Live end-to-end** | Exercise the real happy-paths with a disposable test tenant/admin/users | ▶ next (this roadmap) |
| **3. Demo-script rehearsal** | Walk the exact sequence the team will present, on the exact tenant/accounts | ⏳ after Phase 2 + the fixes |
| **4. Fix re-verification** | Re-test each `MASTER_GAP_REGISTER` item after tomorrow's fixes | ⏳ after fix day |

## Phase 2 — live end-to-end test plan

**Harness:** create one disposable tenant `__audit_<ts>` + a ROOT-capable admin + 2–3 test users via the onboarding/admin API; exercise flows; then **soft-delete** everything (never hard-delete — `users` is FK-cascaded by ~13 tables). Record PASS/FAIL/BLOCKED per item with evidence (HTTP, audit row, screenshot).

### 2a. What I can verify solo (backend/API + headless browser)
- **PASSWORD** login (+ lockout now that the strike-counter fix lands), **TOTP** (I compute codes), **EMAIL_OTP**/**SMS_OTP** *code path* (trigger + assert "sent"; delivery confirmation is the operator's live test).
- **OAuth/OIDC round-trip**: `/oauth2/authorize` → MFA → `code` → `/oauth2/token` → `/oauth2/userinfo` + JWKS/discovery.
- **Dashboard admin CRUD** (as test admin): users, roles/RBAC, auth-flow builder (create/edit/set-default + impact guard), tenants, audit logs, sessions (view/revoke), enrollments list/detail, self-onboarding, guest invite→accept→revoke, DNS-TXT domain verify.
- **Account-linking**: link/initiate→confirm, unlink, `/identity/me`, membership-switch (same-identity gate), biometric consent grant/revoke (P1-7 watch).
- **Multi-tenancy isolation**: cross-tenant read probes (confirm no leak; `@Filter` + scope).
- **GDPR**: data export bundle; purge dry-run.
- **SDK**: confirm `verify()/loginRedirect()/handleRedirectCallback()` exist in the served `fivucsas-auth.js`; web-component renders.
- **Config-driven login**: re-confirm the P0-1 bypass is closed (optional non-PASSWORD Layer-1 no longer mints a token).

### 2b. Needs operator/physical input (I'll prep + script; you provide the device)
- **FACE** enroll/verify — the anti-spoof liveness gate (correctly) blocks still photos, so a real camera/face is needed. (Server pipeline already proven working in prod logs: `is_live=True`, `verified=True`.)
- **VOICE** enroll/verify — real microphone audio (watch P1-10 centroid drift).
- **NFC** — physical İstanbulkart/student card (your enrolled card now works after the V79 backfill — please confirm).
- **PASSKEY / WebAuthn / FINGERPRINT** — a real authenticator/platform biometric (watch P1-4 UV).
- **HARDWARE_KEY** — needs a physical FIDO2 key (not purchased — operator TODO).
- **APPROVE_LOGIN** — number-matching across two devices.
- **Mobile app** — this host can't run an Android emulator; verify via code + prod logs + a real device you hold.

### needsLiveTest checklist (from `FEATURE_COMPLETENESS`, ~70 items)
Auth factors 2–12 · MFA dispatcher 13–14 · auth-flow builder 17 · arbitrary-first-factor 20 · hosted login 22 · token/userinfo 24–25 · refresh rotation 29 · client mgmt 31 · doc/MRZ/card 34/37/38 · face 39–41 · voice 48 · liveness 49 · anti-spoof 50–51 · puzzle 55 · amispoof tester + analyzers 56/59–74/78 · tenancy 83/86/87/89 · identity-linking 91–94 · dashboard 96–105/107 · SDK 109–113/119 · mobile 120–129 · GDPR export 131 · i18n 140 · self-host 142 · BYS demo 144.

## Phase 3 — demo-script rehearsal
Once the demo script is fixed (operator decision #2/#6), walk it exactly: the surfaces, the tenant (`marmara-bys-demo`), the accounts, each factor shown, the OAuth round-trip on demo.fivucsas.com, the dashboard tour, the amispoof live test. Catch any "works in isolation but not in the actual sequence" issue. Confirm every claim in the script maps to a PASS in Phase 2.

## Phase 4 — fix re-verification
After tomorrow's fixes, re-run the relevant Phase-2 checks for each `MASTER_GAP_REGISTER` P0/P1 item and flip its status to verified-fixed. No item ships "fixed" without a re-test.

## Cleanup protocol
All test tenants/users **soft-deleted** (status + `deleted_at`), never `DELETE FROM users`. Test OAuth clients deactivated. Confirm the disposable tenant is gone from the dashboard + not on any public surface before demo day. Keep a short log of created/removed IDs in this file as Phase 2 runs.

---
*I'll begin Phase 2 (the solo backend/API scenarios) next, and flag the operator-assisted items for when you're at a device.*
