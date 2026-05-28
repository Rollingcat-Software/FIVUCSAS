# FIVUCSAS — Scoped Remediation Plan (2026-05-28)

Re-triage of `issues.md` + `gaps.md` against `../design/client-support-matrix.md`. IDs reference those files. **Re-verify each on current HEAD before changing code.**

Dispositions: **FIX** (in-scope, do it) · **ELEVATED** (must-fix; mobile owns this) · **DESCOPE** (won't-fix; remove half-built native screen, route to hosted web) · **ADD** (missing functionality to build) · **TRIAGE** (needs a design/intent decision first).

## Independent review (2026-05-28) — verdict GO (see `findings-review-2026-05-28.md`)
All 15 P0 + 6 elevated verified vs fresh origin/main: **13 CONFIRMED, 2 NUANCED, 0 REFUTED.** Corrections to apply:
- **S2 — reword.** Authenticated IDOR, not unauthenticated: `SecurityConfig.java:166` catch-all requires a JWT on `/api/v1/**`. Fix = **object-level/ownership authz** in `ManageVerificationService` (NOT `@PreAuthorize("isAuthenticated()")` — that's a no-op). Extends to a **write-side IDOR in `createSession`** (trusts client `userId`+`tenantId`) — in-scope.
- **S5 — narrower.** No tenant gap: face `/search` already requires `tenant_id` (`search.py:27`). S5 is **liveness/anti-spoof-only**. Cross-tenant search is **voice-specific = F10**.
- **S10 / F16 — path/claim fixes.** `NfcCardReader.kt` path is stale; passports DO propagate `sodValid` (sub-claim refuted); Turkish eID never computes it (null, not hardcoded true). F16: chip photo is sent by the client and **discarded by the server** (no receiving endpoint). Both **moot until S9** is fixed.
- **S6 — RESOLVED (investigated 2026-05-28).** `bio.fivucsas.com` has NO public DNS ("Could not resolve host"); it's internal-only since 2026-04-28 (`infra/RUNBOOK_DR.md:189`). So mobile/desktop biometric calls pointed at it **fail to resolve in prod — face features are broken there**, not leaking. Desktop exposes a user-editable `biometricProcessorUrl` (`desktopApp/.../SettingsTab.kt`); no hardcoded API key found in the client. **Fix:** route mobile/desktop biometric through identity-core-api (`api.fivucsas.com` `BiometricController`) per the support-matrix invariant — no public-key-leak remediation needed.
- **S8 — confirmed TRIAGE.** Anti-spoof flags default OFF in code + `.env.example`, but `ANTISPOOF_BLOCK_ENFORCE` defaults ON; true posture depends on prod `.env.prod` (not in snapshot).

**Sequencing:** S9 must hard-gate S10/F16; S7 depends on S8 (landmarks pointless until the gate flag is on).
**Fix-first (highest confidence):** S9 → S1 → S2 → S15 → S3.

## A. Backend / server security — FIX (client-agnostic, top priority)
| ID | Disposition | Item | Evidence |
| --- | --- | --- | --- |
| S1 | ✅ DONE — PR #107 merged 2026-05-28 | Cross-tenant write on `PUT /tenants/{id}` — add `canAccessTenant` | `ManageTenantService.java:123` |
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
| S15(web) | ✅ DONE — PR #99 merged 2026-05-28 (QRCodeSVG local render) | TOTP secret/email → third-party QR; generate locally (web) | `TotpEnrollment.tsx:325` |
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
| repro | spoof-detector `requirements.txt` uses floating `>=` pins for `uniface`/`onnxruntime` → paper AUC not reproducible (calibrated reproduced 0.9424 vs committed 0.9497; surfaced by PR #61). Pin the ML deps and re-run §8.2+§8.3 in one env so the paper's calibrated AUC is single-valued. |

## Suggested execution order (after owner review + QA phase planning)
1. **B-side server trust + A-side authz P0s** (S1, S2, S3, S9, S10, S6) — highest risk.
2. Anti-spoof actually-on (S4, S5, S7, S8) + TOTP hardening (S13, S14, S15).
3. Voice backend correctness (F10–F14).
4. DESCOPE cleanup (remove half-built native screens → hosted).
5. ADD web features (API keys, RBAC UI, backup codes, OAuth2 PUT, purge execute).
6. QA pass per pipeline.
