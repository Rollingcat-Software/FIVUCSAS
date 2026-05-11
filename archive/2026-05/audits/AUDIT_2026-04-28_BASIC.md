# FIVUCSAS Basic-Cases Audit — 2026-04-28

Read-only audit by the Basic-Cases team. Scope: 10 auth methods, login flows, admin surfaces, tenant isolation. 13 findings (1 P0 — false positive on verification, 9 P1, 2 P2 + a 23-key i18n bulk).

## P0 — re-verified false positive

- `LoginPage.tsx:876` flagged "demo creds in prod bundle" but the
  block IS gated by `{import.meta.env.DEV && (...)}` at line 849.
  Vite tree-shakes it from the production bundle. Confirmed via
  `curl https://app.fivucsas.com/<index-hash>.js | grep
  'admin@fivucsas.local'` → 0 hits.

## P1 — i18n + raw err.message hygiene

| # | Location | Issue | Fix |
|---|---|---|---|
| 2 | `web-app/src/i18n/locales/tr.json` | 23 keys missing under `biometricPuzzle.puzzles.*.hint` (face_blink, face_close_*, face_look_*, face_nod, face_open_mouth, face_raise_*_brow, face_shake_head, face_smile, face_turn_*, hand_finger_*, hand_flip, hand_math, hand_peek_a_boo, hand_pinch, hand_shape_trace, hand_trace_template, hand_wave) | Add Turkish translations |
| 3 | `web-app/src/App.tsx:14-46` | `PAGE_TITLES` is a hardcoded English Record used for `document.title` | Switch to `t('pageTitles.X') + ' — FIVUCSAS'` on locale change |
| 4 | `web-app/src/features/auth/components/LoginPage.tsx:595` | Renders `error?.message` raw in fallback chain | Use `formatApiError(error, t)` |
| 5 | `web-app/src/pages/AuthSessionsPage.tsx:165` | Renders `{error.message}` raw in Alert | Wrap with `formatApiError` |
| 6 | `web-app/src/features/auth/components/TotpEnrollment.tsx:145` | Hardcoded English `'Invalid verification code'` fallback | Use `t('auth.totp.error.invalidCode')` |
| 7 | `web-app/src/features/auth/components/TotpEnrollment.tsx:165` | `window.confirm('Are you sure...')` hardcoded English | `t('auth.totp.disableConfirm')` |
| 8 | `web-app/src/features/users/services/UserService.ts:76,112` + `web-app/src/features/auth/services/AuthService.ts:56` | Service layer emits `err.message` to UI state | Translate at consumer with `formatApiError` or never bubble raw past service boundary |
| 9 | `web-app/src/features/userEnrollment/hooks/useUserEnrollment.ts:131` | Hardcoded `'Failed to submit enrollment'` | Use `formatApiError(err, t)` |
| 10 | `web-app/src/features/auth/hooks/useLivenessPuzzle.ts:541` + `useBankEnrollment.ts:274` | Hardcoded English fallbacks | Route through `formatApiError` |

## P2 — cosmetic / a11y

| # | Location | Issue | Fix |
|---|---|---|---|
| 11 | `TotpEnrollment.tsx:306` | `<img alt="TOTP QR Code">` hardcoded | `alt={t('auth.totp.qrAltText')}` |
| 12 | `useSessions.ts:74` | Fallback `'Failed to load sessions'` not localized | Use `formatApiError` |

## Areas cleared (no violations)

- **Tenant isolation**: list endpoints (`/users`, `/audit-logs`, `/enrollments`, `/devices`, `/auth-sessions`) all use `TenantScopeResolver` with fail-closed zero-UUID sentinel.
- **All 10 auth methods** wired in `MultiStepAuthFlow.tsx:308-447`.
- **All step components present** under `src/features/auth/components/steps/`.
- **All enrollment dialogs** make real backend calls. EMAIL_OTP and QR_CODE explicitly auto-bind on the server with `refetchEnrollments()` (no fake-success).
- **Sidebar↔route parity**: every `SIDEBAR_ENTRIES` item has a route; legacy paths Navigate-replace to canonical.
- **RBAC gates**: every public-facing controller method carries `@PreAuthorize`. Public-by-design endpoints (auth, OIDC discovery, step-up, OAuth, QR) explicitly `permitAll()`.
- **Hosted-login / verify-app**: `LoginMfaFlow.tsx` + `VerifyApp.tsx` consistently use `formatApiError`.
- **Forgot/Reset Password**: enumeration-safe (silent error → navigate anyway).
- **Biometric tools / puzzles / my-profile**: no hardcoded user-facing English.

Today's morning fixes (LoginPage 401 i18n, optional MFA-step skip, EMAIL_OTP/QR_CODE auto-bind, useQualityAssessment bbox fallback) all live in the read-tree.
