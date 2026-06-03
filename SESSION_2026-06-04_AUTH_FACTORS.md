# Session 2026-06-03 → 04 — Cross-device auth factors + edit-user fixes (pre-demo)

**Demo:** Marmara jury, 2026-06-04. **Deploy branch (all repos):** `feat/qr-completion-2026-06-03`.
**Prod state:** api commit `37ea212` (healthy); app.fivucsas (Hostinger) + verify.fivucsas (Hetzner `fivucsas-verify-widget`) redeployed.

## Shipped + LIVE

| # | Fix | Where | Notes |
|---|-----|-------|-------|
| 1 | **QR factor = real cross-device** (kill self-fillable token) | api + web | Two-phase `QrCodeVerifyMfaStepHandler` + `QrSessionService.createStepSession/isStepApprovedBy`; web `QrSessionMfaStep` (new) scans+polls+auto-completes. Phone uses the EXISTING `/qr/session/{id}/approve` — no mobile change. Flag `fivucsas.qr.session-approval-required` (default false → legacy token still accepted; flip true to reject). |
| 2 | **APPROVE_LOGIN = real mid-flow factor** | api + web | New `ApproveLoginVerifyMfaStepHandler` + `ApproveLoginService` step session + web `ApproveLoginMfaStep` (match number). Surfaces in phone "Login Requests". Was "Bilinmeyen yöntem". |
| 3 | **approve-login removed from identifier layer** | web | `Layer1Shortcuts` — it needs email → factor, not usernameless. QR stays. |
| 4 | **approve-login enrollment** (was permanently "not enrolled") | api | V83 widens `chk_enrollment_method` (V73 missed APPROVE_LOGIN/PASSKEY) + gate on ANY device, not FCM push token (`hasApproverDevice`). |
| 5 | **Edit-user: Turkish names** | web | `userValidator` regex `[a-zA-Z]` → `\p{L}/u` (ş/ü/ğ rejected → "Gülsüm/Gültekin" failed before any PUT). |
| 6 | **Edit-user: status didn't persist** | api | `status` was bound on the request but never threaded into `UpdateUserCommand`/applied. Now threaded + `user.setStatus()`. |
| 7 | **Edit-user: status dropdown blank** | web | `<Select>` listed 4/6 enum values; added INACTIVE + DELETED + en/tr i18n. |
| 8 | **NFC cross-tenant** — **shipped DARK** | api | Resolve `NFC_DOCUMENT` enrollment across linked memberships (same `identity_id`). Flag `app.identity.cross-membership-enrollment-resolution` (default false). NFC possession EXEMPT from biometric consent (audit-logged). **Staging smoke-test before flipping.** |

Also: multi-step bridge live on verify.fivucsas; demo-relief applied (JWT 2h, rate 1000/s) — `--revert` after.

## Test (WARP off + hard-refresh once)
- Edit user → status + ROOT + Turkish names all save + reopen-persist.
- QR factor: no token field → scan with phone → auto-completes.
- approve-login factor: match number → phone "Login Requests" → tap → completes.
- Identifier layer: only Email + QR.

## NOT done / pending
- **Mobile (need new APK):** eID dedup (app sends random chip UID, not DG1 doc number → duplicate Turkish eID rows); deeper session-clearing (v5.3.0 fix insufficient). Phone on `v5.3.0` GitHub release.
- **Operator:** CSCA trust store empty → NFC verify-authenticity = NO_TRUST_STORE.
- **Flag flips (post-demo, after staging smoke-test):** `FIVUCSAS_QR_SESSION_APPROVAL_REQUIRED=true`, `FIVUCSAS_CROSS_MEMBERSHIP_ENROLLMENT_RESOLUTION=true`.
- web PR #206 (immutable-SW + config-fetch banner) — draft.

## Flags (no redeploy to flip; set in `.env.prod` + `up -d`)
- `FIVUCSAS_QR_SESSION_APPROVAL_REQUIRED` (default false) — reject the legacy QR token API-side.
- `FIVUCSAS_CROSS_MEMBERSHIP_ENROLLMENT_RESOLUTION` (default false) — NFC cross-membership.
