# FIVUCSAS — Client Feature Support Matrix (decided 2026-05-28)

**Decision (owner):** the **web** client carries full functionality; native clients are scoped to what genuinely needs native hardware or is their core value. This formalizes the existing hosted-first direction and is the basis for re-triaging the remediation backlog (see `../backlog/remediation-plan.md`).

## Tiers
- **Web (React/Vite + hosted login at verify.fivucsas.com):** FULL — every pipeline.
- **Mobile (Android, KMP):** NATIVE-ESSENTIAL only — NFC chip reading, camera-based face/document capture + liveness, and core login + MFA verify. Everything else (account management, admin, voice) routes to the hosted web flow (webview / OIDC redirect).
- **Desktop (JVM):** THIN — hosted-login wrapper (OIDC redirect / webview). Optional NFC only if a reader is attached. No native feature parity.
- **SDK:** hosted-first `loginRedirect` + `mountStepUp` (already the strategy).

## Matrix
| Capability | Web | Mobile | Desktop | SDK |
| --- | --- | --- | --- | --- |
| Login, MFA verify (step), logout | ✅ full | ✅ native or hosted | ✅ hosted webview | ✅ redirect/step-up |
| Signup, forgot/reset password, change password | ✅ | → hosted web | → hosted web | — |
| Session list / revoke / revoke-all | ✅ | → hosted web | → hosted web | — |
| OAuth2 client management | ✅ | → web | → web | — |
| WebAuthn / passkeys | ✅ | platform passkey OR hosted (no custom impl) | hosted | hosted |
| Email / SMS OTP entry (during MFA) | ✅ | ✅ | ✅ | hosted |
| TOTP enroll / disable | ✅ | → hosted web (entry during verify only) | → hosted | hosted |
| Backup codes | ✅ | → hosted web | → hosted | — |
| Face enroll / verify (camera + liveness) | ✅ | ✅ **native capture (through backend)** | optional / hosted | hosted widget |
| **NFC: TCK / BAC / passport (chip)** | — (no NFC hw) | ✅ **mobile-owned (native)** | optional w/ reader | — |
| Document scan / extract | ✅ | ✅ native camera | hosted | hosted |
| Voice enroll / verify | ✅ | optional (low priority) | ❌ dropped | hosted |
| Tenant / user / RBAC / API-keys / audit / dev-portal / verification dashboards | ✅ full | → web | → web | — |

## Consequences for remediation
1. **Drop (won't-fix, route to hosted):** mobile forgot-password, mobile session mgmt, mobile change-password, mobile/desktop revoke-all, custom mobile WebAuthn, mobile TOTP-disable, desktop voice, mobile voice-delete. Action = remove the half-built native screen and redirect to hosted web (not "fix").
2. **Elevate (must-fix, because mobile owns it):** NFC server-side trust (chip/BAC evidence, SOD signature, RBAC), NFC chip-photo match, mobile biometrics must go **through** identity-core-api (not bypass it).
3. **Backend/web items are unaffected** by client scope and remain prioritized on their own merits.

## Invariant
Native clients must never weaken server-side guarantees: any in-scope native feature (NFC, face capture) MUST call through identity-core-api so `@PreAuthorize`, tenant isolation, and audit logging apply. "Native capture" ≠ "native trust."
