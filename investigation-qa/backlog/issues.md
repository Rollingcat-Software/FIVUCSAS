# FIVUCSAS — Issues Backlog (broken / buggy pipelines)

Consolidated from `pipeline-inventory/*.md` (2026-05-28). Every item is code-evidenced with `file:line`. **Re-verify on current HEAD at fix time before changing code** (findings are from a read-only snapshot).

Priority: **P0** security/integrity · **P1** functional correctness · **P2** minor/cosmetic.

> **Independent review 2026-05-28** (`findings-review-2026-05-28.md`) verified these: 13 CONFIRMED / 2 NUANCED / 0 refuted. Key corrections: **S2** is an *authenticated* IDOR → fix is object-level authz (+ a write-side IDOR in `createSession`); **S5** is liveness-only (cross-tenant is voice = F10); **S10/F16** NFC paths corrected and moot until **S9**; **S6** targets `bio.fivucsas.com` (API-key-in-APK risk). See the review doc for the authoritative per-item verdict.

## P0 — Security / integrity
| ID | Domain | Evidence | Problem | Fix direction |
| --- | --- | --- | --- | --- |
| S1 | tenant | `ManageTenantService.java:123`, `TenantController.java:140` | Cross-tenant write: `PUT /tenants/{tenantId}` needs only `tenant:configure`; `updateTenant` never calls `canAccessTenant` → a tenant admin can overwrite ANY tenant | add `tenantScopeResolver.canAccessTenant` guard |
| S2 | tenant | `VerificationController.java:32,39,47,52,130` | 5 endpoints have no `@PreAuthorize`; `getUserVerificationStatus` has no service-layer authz → any user reads any user's verification status | add per-endpoint authz + ownership check |
| S3 | tenant | `biometric-processor/app/api/routes/proctor.py` | `get_incident` no tenant-ownership check (cross-tenant read); `review_incident` trusts `X-Reviewer-ID` header (no JWT/permission) | enforce tenant scope + authenticated reviewer |
| S4 | face | `biometric-processor/.../enrollment.py:223` | `/enroll/multi` skips liveness (single `/enroll` checks) → printed-photo template enrollment | call liveness use-case in multi path |
| S5 | face | `biometric-processor/.../search.py` | `/search` (1:N) has no liveness/anti-spoof gate → still image can query the DB | gate search behind liveness |
| S6 | face | `client-apps .../BiometricApiImpl.kt` | mobile/desktop call biometric-processor:8001 directly → bypass `BiometricController` `@PreAuthorize`, tenant isolation, audit | route clients through identity-core-api |
| S7 | face | `biometric-processor/.../pipeline/assembler.py:~130` | `FaceUsabilityGate` no-ops in `/verify` (only runs if landmarks passed; `verification.py` never passes them) | pass landmarks / wire gate |
| S8 | face | `config.py:127,691,697,701,739` | All prod anti-spoof flags default OFF (fusion/usability/EAR/device-risk + `ANTI_SPOOFING_ENABLED`); only liveness active | **triage**: heavy-ML-off on CPU host is intended; fusion/usability off likely is not — confirm intended posture |
| S9 | nfc | `NfcDocumentAuthHandler.java:29`, `NfcChipReadHandler.java:39-40` | BAC/chip crypto evidence dropped server-side (reads only UID; trusts client MRZ with length/`<` check only) | verify chip-session proof server-side |
| S10 | nfc | `NfcCardReader.kt:403-426` | `isAuthenticated` hardcoded `true` regardless of SOD signature (validateSod result not propagated) | propagate SOD verification result |
| S11 | nfc | `NfcController.java:118` | `GET /nfc/search/{serial}` only `isAuthenticated()` — no admin RBAC | add RBAC |
| S12 | auth | `WebAuthnRepositoryImpl.kt:~107-115` | Mobile WebAuthn assertion verified locally only, never sent to server | submit assertion to server for verification |
| S13 | otp | `TotpService.java` | No used-code replay blacklist — a TOTP code stays valid within its ~30s window | blacklist consumed codes |
| S14 | otp | `TotpSecretCipher.decryptIfNeeded:119` | `FIVUCSAS_TOTP_REJECT_PLAINTEXT` unimplemented — legacy plaintext secrets still accepted | implement reject flag |
| S15 | otp (privacy) | `TotpEnrollment.tsx:325`, `TotpEnrollScreen.kt:175` | `otpauth://` URI (email + secret) sent to third-party `api.qrserver.com` | generate QR locally |

## P1 — Functional correctness
| ID | Domain | Evidence | Problem |
| --- | --- | --- | --- |
| F1 | otp | `OtpController.java:337` | Backup codes never generated (`enable2FA(..., null)`) |
| F2 | auth/otp | `ForgotPasswordScreen.kt` | Mobile forgot-password is a stub (sets submitted state, no API call) |
| F3 | auth | `AuthApiImpl.kt` (logout) | Mobile logout sends empty body → refresh token never revoked server-side |
| F4 | auth | `SessionApiImpl.kt:14,18` | Mobile/desktop session list/revoke 404 (`/api/v1/sessions/*` vs real `/api/v1/auth/sessions/my`) |
| F5 | auth | `AuthApiImpl.kt` (changePassword) | Wrong route `auth/change-password` (real `POST /api/v1/users/{id}/change-password`) |
| F6 | auth | `DeviceApiImpl.kt` | `getWebAuthnCredentials` wrong path (`devices/webauthn/...` vs `webauthn/...`) |
| F7 | auth | `SecurityConfig.java:119` | Step-skip requires `authenticated()` but used in anon pre-JWT flow |
| F8 | otp | `AuthController.java:1044` | `send2FASms` writes local OTP to Redis even when Twilio Verify active → code-source mismatch with verify path |
| F9 | otp | `OtpManagement.tsx:113`, `OtpViewModel.kt:54` | Clients discard `OTP_ATTEMPTS_EXHAUSTED`/`remainingAttempts` → generic error instead of "request new code" |
| F10 | voice | `voice.py:204`, `pgvector_voice_repository.py:341` | Voice search cross-tenant (no `tenant_id`); tenant-scoped branch is dead code |
| F11 | voice | `voice.py` (verify_voice) | Replay detection dead code — `VoiceReplayDetector` never instantiated/called |
| F12 | voice | `voice.py:191` | `SEARCH_THRESHOLD=0.6` used as a cosine *distance* cap → effective similarity cutoff is not what the name implies |
| F13 | voice | `VoiceEnrollmentDialog.tsx:59` | Swallows `createEnrollment` failure → embedding exists without enrollment record |
| F14 | voice | `UserDataExportService.java:83` | GDPR export returns empty `voiceEnrollments` |
| F15 | nfc | `NfcApprovalRepositoryImpl.kt:19` | NFC push-approval 404 (client `POST /api/v1/auth/approval/{id}/decide`; no controller) |
| F16 | nfc | `NfcStepViewModel.kt:226-228` | Chip photo (DG2) attached then discarded — never stored/compared |

## P2 — Minor / cosmetic
| ID | Domain | Evidence | Problem |
| --- | --- | --- | --- |
| M1 | voice | `VoiceSearchPage.tsx:26-73` | Duplicate WAV conversion (not reusing `audioToWav16k.ts`); divergent on older Safari |
| M2 | voice | `VoiceStep.tsx:118` vs `VoiceEnrollmentFlow.tsx:212` | Inconsistent data-URI vs stripped-prefix encoding across enroll surfaces (no crash) |
| M3 | face | spoof-detector `from_biometric_processor/` | Staging copies possibly not re-integrated into `src/` (unverified) |
