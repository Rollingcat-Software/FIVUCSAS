# FIVUCSAS — Scoped Remediation Plan (2026-05-28)

Re-triage of `issues.md` + `gaps.md` against `../design/client-support-matrix.md`. IDs reference those files. **Re-verify each on current HEAD before changing code.**

Dispositions: **FIX** (in-scope, do it) · **ELEVATED** (must-fix; mobile owns this) · **DESCOPE** (won't-fix; remove half-built native screen, route to hosted web) · **ADD** (missing functionality to build) · **TRIAGE** (needs a design/intent decision first).

## A. Backend / server security — FIX (client-agnostic, top priority)
| ID | Disposition | Item | Evidence |
| --- | --- | --- | --- |
| S1 | FIX | Cross-tenant write on `PUT /tenants/{id}` — add `canAccessTenant` | `ManageTenantService.java:123` |
| S2 | FIX | `VerificationController` 5 endpoints lack `@PreAuthorize` + ownership | `VerificationController.java:32,39,47,52,130` |
| S3 | FIX | proctor endpoints: tenant-scope + drop `X-Reviewer-ID` trust | `proctor.py` |
| S4 | FIX | `/enroll/multi` must call liveness | `enrollment.py:223` |
| S5 | FIX | `/search` must gate on liveness/anti-spoof | `search.py` |
| S7 | FIX | `FaceUsabilityGate` no-ops in `/verify` (pass landmarks) | `pipeline/assembler.py:~130` |
| S11 | FIX | `GET /nfc/search/{serial}` add RBAC | `NfcController.java:118` |
| S13 | FIX | TOTP used-code replay blacklist | `TotpService.java` |
| S14 | FIX | Implement `FIVUCSAS_TOTP_REJECT_PLAINTEXT` | `TotpSecretCipher.decryptIfNeeded:119` |
| F7 | FIX | step-skip authz wrong for anon pre-JWT flow | `SecurityConfig.java:119` |
| F8 | FIX | `send2FASms` local-OTP vs Twilio mismatch | `AuthController.java:1044` |
| F10 | FIX | Voice search cross-tenant (add tenant_id) | `voice.py:204` |
| F11 | FIX | Voice replay detector never called | `voice.py` |
| F12 | FIX | Voice `SEARCH_THRESHOLD` distance/similarity semantics | `voice.py:191` |
| F14 | FIX | GDPR export returns empty voiceEnrollments | `UserDataExportService.java:83` |
| S15(web) | FIX | TOTP secret/email → third-party QR; generate locally (web) | `TotpEnrollment.tsx:325` |
| F13 | FIX | VoiceEnrollmentDialog swallows failure (web) | `VoiceEnrollmentDialog.tsx:59` |
| F9(web) | FIX | Surface `OTP_ATTEMPTS_EXHAUSTED` (web) | `OtpManagement.tsx:113` |

## B. Mobile native-essential — ELEVATED must-fix (NFC + face capture)
| ID | Disposition | Item | Evidence |
| --- | --- | --- | --- |
| S6 | ELEVATED | Mobile/desktop biometrics MUST go through identity-core-api (not bypass) | `BiometricApiImpl.kt` |
| S9 | ELEVATED | Server must verify BAC/chip crypto evidence (not just UID) | `NfcDocumentAuthHandler.java:29`, `NfcChipReadHandler.java:39-40` |
| S10 | ELEVATED | `isAuthenticated` must reflect SOD signature, not hardcoded true | `NfcCardReader.kt:403-426` |
| F16 | ELEVATED | NFC chip photo (DG2) store + match | `NfcStepViewModel.kt:226-228` |
| F15 | TRIAGE→FIX | NFC push-approval 404 — add backend endpoint or remove feature | `NfcApprovalRepositoryImpl.kt:19` |
| gap | ADD | PACE handshake (modern passports) | `UniversalCardDetector.kt:150` |
| F9(mob)/S15(mob) | FIX-or-DESCOPE | OTP error surfacing during MFA verify (keep); TOTP-enroll QR leak → descope mobile enroll to hosted | mobile TOTP enroll |
| F3 | FIX | Mobile logout must send refresh token (login is in-scope) | `AuthApiImpl.kt` |

## C. DESCOPE — won't-fix; remove native screen, route to hosted web
| ID | Item | Action |
| --- | --- | --- |
| F2 | Mobile forgot-password stub | redirect to hosted web reset |
| F4 | Mobile session list/revoke (404) | remove; route to hosted web |
| F5 | Mobile change-password (wrong route) | route to hosted web |
| F6 + S12 | Mobile WebAuthn (local-only assertion, wrong list path) | remove custom impl; use platform passkey or hosted |
| gap | Mobile TOTP-disable | route to hosted web |
| gap | Mobile revoke-all-sessions | route to hosted web |
| gap | Desktop voice | dropped per matrix |
| gap | Mobile voice-delete | route to hosted web (voice low-priority on mobile) |

## D. ADD — missing functionality (web-full)
| Item | Evidence |
| --- | --- |
| API Keys: create/list/revoke pipeline + web UI (orphaned table V19) | `ApiKey.java` |
| OAuth2 client update (PUT) | `OAuth2ClientController` |
| GDPR purge execute endpoint | `PurgeAdminController` |
| Backup codes: generate/verify/regenerate/count (F1 — currently `null`) | `OtpController.java:337` |
| RBAC assignment web UI (role↔perm, user↔role) | backend exists |
| Tenant suspend/activate web UI | backend gated |
| WebAuthn credential delete UI (web) | — |
| Document field extraction for ehliyet / ogrenci / akademisyen | YOLO classifier |

## E. TRIAGE / design decisions
| Item | Question |
| --- | --- |
| S8 | Prod anti-spoof flags default OFF — confirm intended posture; likely enable fusion + usability (heavy-ML stays off on CPU host) |
| gap | 6 unwired spoof-detector analyzers (ar_filter, background_grid, landmark_variance, micro_tremor, rppg, temporal) — wire or document as intentionally inactive |
| gap | amispoof ↔ web-app integration — integrate the TS engine into enroll/verify, or keep standalone? |
| gap | Video-interview AI analysis — build or defer |
| M1/M2/M3 | Minor: web voice WAV dedupe; encoding consistency; spoof staging-copy cleanup |

## Suggested execution order (after owner review + QA phase planning)
1. **B-side server trust + A-side authz P0s** (S1, S2, S3, S9, S10, S6) — highest risk.
2. Anti-spoof actually-on (S4, S5, S7, S8) + TOTP hardening (S13, S14, S15).
3. Voice backend correctness (F10–F14).
4. DESCOPE cleanup (remove half-built native screens → hosted).
5. ADD web features (API keys, RBAC UI, backup codes, OAuth2 PUT, purge execute).
6. QA pass per pipeline.
