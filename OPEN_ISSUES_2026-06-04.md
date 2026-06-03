# FIVUCSAS — Open Issues & TODOs (living doc, 2026-06-04)

Tracking every known issue so nothing is forgotten — including ones not yet fixed.
Branch: `feat/qr-completion-2026-06-03`. Prod api `37ea212` (healthy); app.fivucsas + verify.fivucsas redeployed. See `SESSION_2026-06-04_AUTH_FACTORS.md` for the deploy detail.

## 🔴 BROKEN — needs a fix (verified failing on prod)
1. **QR factor (mid-flow) — "QR ile giriş başlatılamadı".** The new `QrSessionMfaStep` POSTs `/auth/mfa/step {action:"challenge"}` to mint a step-bound session; it fails before showing the QR. Root cause UNCONFIRMED (need the server audit reason — `method_not_permitted_for_step` vs `challenge-handler-contract-violation` vs a handler exception). Diagnosis blocked: pulling api logs needs WARP-on (fail2ban bans the laptop's bare IP). **Next: WARP on → read `docker logs identity-core-api` for the `logMfaStepFailed` reason at the failure timestamp → fix → redeploy.**
2. **APPROVE_LOGIN factor (mid-flow) — "Onay isteği başlatılamadı".** Same `action:challenge` path as #1 (`ApproveLoginMfaStep`); same unconfirmed root cause. Almost certainly the SAME fix as #1.
3. **QR-login (identifier layer) dead-ends on app.fivucsas** — "Telefonunuzdan onaylandı… lütfen girişi buradan sürdürün". CAUSE FOUND (code): `LoginPage.tsx:652` wires `QrLoginPanel` with `onApproved` but **no `onMfaPending`**, and the dashboard `TwoFactorDispatcher` has no resume path (verify.fivucsas's `LoginMfaFlow` does, via `resumeSession`). FIX: thread `onMfaPending` → set the returned `mfaSessionToken` into the dashboard MFA state so it continues into the next factor. Web-only; pairs with the #1/#2 redeploy.

## 🟡 BUILT but DARK / deferred (no demo impact)
4. **NFC cross-tenant** (card enrolled in tenant A usable when same identity logs in via tenant B). Shipped behind flag `FIVUCSAS_CROSS_MEMBERSHIP_ENROLLMENT_RESOLUTION` (default OFF). Native-query bypass, NFC exempt from biometric consent (audit-logged). **TODO: staging smoke-test → flip flag in prod.** Demo workaround: demo NFC under the FIVUCSAS tenant.
5. **QR legacy-token kill-switch** `FIVUCSAS_QR_SESSION_APPROVAL_REQUIRED` (default OFF) — flip true post-verify to reject the old token API-side (new web never shows the field anyway).

## 📱 MOBILE — needs a new APK + release (NOT done)
6. **eID dedup** — the app enrolls the random per-tap chip UID instead of the DG1 documentNumber → duplicate Turkish eID rows (08570ECC + 081245B0). Fix: send DG1 documentNumber as the canonical card_serial.
7. **Session-clearing** — the v5.3.0 #2 fix is insufficient; the app still clears the session on launch in some cases. Needs deeper token-persistence work (the JWT is now 2h via demo-relief, which masks but doesn't fix it).

## 🛠 OPERATOR / infra
8. **CSCA trust store empty** (`app/core/csca_trust_store/`, bio container) → NFC verify-authenticity returns `NO_TRUST_STORE`. Load Turkey's CSCA cert to enable real passive auth. Until then NFC serial-only works; chip authenticity does not.
9. **demo-relief** applied (JWT 15m→2h, rate 100→1000/s, lockouts cleared). **Run `scripts/demo-day-relief.sh --revert` after the demo.**
10. **Hetzner fail2ban** bans the laptop's bare IP after repeated SSH (deploy floods) — ping + :443 stay up, only :22 blocked. Workaround: Cloudflare WARP gives a fresh egress IP. (WARP-on = deploy/SSH works but the user can't reach app/verify/demo.fivucsas; WARP-off = user tests but no SSH. Alternate.)

## 🟢 VERIFIED WORKING (this session)
- Edit user: **status persists**, **ROOT** assignable, **Turkish names** save (was the firstName/lastName ASCII regex).
- approve-login **enrollment** shows enrolled (V83 + any-device gate).
- approve-login **removed** from the identifier layer.
- Guest **invitations** (Guests page → Invite; ROOT must pass tenantId) + AcceptInvitePage exist.
- NFC chip read on the phone (Turkish eID DG1/DG2).

## ⚪ MINOR / cosmetic (don't block demo)
- Service-worker can serve a stale shell after deploy → **hard-refresh once** (the immutable-SW .htaccess fix is in draft web PR #206, not deployed).
- `[DOM] Input elements should have autocomplete attributes` warning on the create-user/password fields — cosmetic; add `autoComplete` attrs.
- `contentscript.js` MaxListeners / ObjectMultiplex console spam = the user's **browser wallet extension** (MetaMask-style), NOT our app.

## Demo readiness (honest)
**Presentation-ready:** password+FACE login, dashboard, users (create/edit/status/ROOT), tenants, guest invitations, NFC chip read, biometric enrollment, identity/account-linking.
**NOT ready:** cross-device QR factor + approve-login factor (#1/#2 failing), QR-login multi-step bridge on app.fivucsas (#3). Recommend demoing the working flows and presenting QR/approve as "shipping" unless #1/#2 are fixed first (needs the log diagnosis).
