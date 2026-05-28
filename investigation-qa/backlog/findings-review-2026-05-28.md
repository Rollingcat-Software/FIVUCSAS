# Independent Review — FIVUCSAS Remediation Backlog (2026-05-28)

**Reviewer role:** independent senior reviewer; read-only verification of `issues.md` + `gaps.md` + `remediation-plan.md` against fresh `origin/main` snapshots of all 6 repos.

**Re-fetched & verified against `origin/main`** (heads at review time): identity-core-api `6f5d8d5`, biometric-processor `7880ebd`, spoof-detector `2b1a162`, web-app `ecab561`, client-apps `795b8bb`, practice-and-test `0d20a27`. Merges since the snapshot are docs-only + spoof-detector paper/benchmark; all cited CODE findings re-verified on current HEAD with fresh line numbers below.

---

## Summary verdict

**GO** — use this plan as the remediation basis. Of 15 P0s: **13 CONFIRMED, 2 NUANCED, 0 REFUTED**. All 6 elevated items are real. The most important corrections:

- **S2 is an authenticated IDOR, not an unauthenticated read.** The SecurityConfig catch-all (`/api/v1/** → authenticated()`, SecurityConfig.java:166) does enforce authn, so the fix is object-level/ownership authz, not just adding `@PreAuthorize`.
- **Several NFC findings cite stale paths** (`NfcCardReader.kt` doesn't exist) and S10/F16 mis-attribute who drops the evidence — but the underlying defects are real and the dispositions hold.
- **S5's remaining gap is liveness only** — the biometric-processor face `/search` route already *requires* `tenant_id` (search.py:27); cross-tenant is a voice-search-specific bug (F10), not a face-search one.

P0 tally: **CONFIRMED 13 · NUANCED 2 · REFUTED 0.**

---

## P0 + Elevated verification table

| ID | Verdict | Fresh file:line | Note |
| --- | --- | --- | --- |
| **S1** | CONFIRMED | `ManageTenantService.java:123-154` (no scope check); `TenantController.java:140-141` (`tenant:configure` only) | `updateTenant` has zero `canAccessTenant`. GET siblings (TenantController:75,89) DO call it — pattern exists, just missing on PUT. Any `tenant:configure` admin overwrites any tenant. |
| **S2** | NUANCED | endpoints `VerificationController.java:32,39,47,52,130`; service `ManageVerificationService.java:344-360`; catch-all `SecurityConfig.java:166` | Not "any user" — catch-all requires a JWT. Real bug = authenticated IDOR / missing object-level authz: any logged-in user reads any other user's verification status/sessions by id. Still P0; fix = ownership/tenant check, not just an annotation. |
| **S3** | CONFIRMED | `proctor.py:466-484` (`get_incident` no `tenant_id` dep, calls `get_by_id(incident_id)`); `proctor.py:62-64,487-498` (`get_reviewer_id` returns header verbatim) | Contrast `get_session` (proctor.py:233 passes tenant_id). Prod shared API key (main.py:215-235; forced on in prod via config.py:570-576) is perimeter only — carries no tenant/reviewer identity. Cross-tenant read + reviewer spoof both stand. |
| **S4** | CONFIRMED | `enrollment.py:223-415` (no liveness dep); contrast single `/enroll` (enrollment.py:49,134-146) | `EnrollMultiImageUseCase` has zero liveness refs; multi route never injects liveness. Printed-photo template via `/enroll/multi`. |
| **S5** | CONFIRMED (narrowed) | `search.py:22-29` (`search_face` deps = use_case + storage only; no liveness); `search_face.py` use-case has no liveness | 1:N face search has no liveness/anti-spoof gate. NOTE: tenant scoping is NOT missing here — `search.py:27` requires `tenant_id=Form(..., min_length=1)`. So S5 = liveness gap only. |
| **S6** | NUANCED | `BiometricApiImpl.kt:38-92` → `ApiConfig.kt:35` `PROD_BIOMETRIC_URL="https://bio.fivucsas.com/api/v1"`; bypassed guards `BiometricController.java:79,104,122,263` | Real: mobile hits the processor directly, bypassing @PreAuthorize, `resolveCurrentTenantId`, audit. Correction: target is public subdomain `bio.fivucsas.com`, NOT docker `:8001`. Open Q: if that host isn't routed (CLAUDE.md says no public route) mobile face 404s in prod; if routed it ships the shared API key in the APK. Either way → route through identity-core-api. |
| **S7** | CONFIRMED | call omits landmarks `verification.py:321-324`; gate guard `spoof-detector/src/pipeline/assembler.py:150` (`landmark_result is not None`) | `assembler.evaluate(frame_bgr=..., cutout_enabled=...)` passes no `landmark_result`; gate skipped. Dead in `/verify`. Severity slightly lower — DeviceSpoofRisk (assembler L104+64) + EAR veto still run — but the usability/occlusion gate genuinely no-ops. |
| **S8** | CONFIRMED (TRIAGE) | `config.py:127,690,698,702,709,739` all default `False`; `.env.example` sets none | Correctly needs-intent. All detectors OFF in code AND example. Nuance: `ANTISPOOF_BLOCK_ENFORCE` defaults True (config.py:724) — enforcement works once detectors on; with them off nothing to enforce. Real prod posture depends on `.env.prod` (not in snapshot); CLAUDE.md claims `ANTI_SPOOFING_ENABLED=true` live — verify before assuming exposure. |
| **S9** | CONFIRMED | `NfcDocumentAuthHandler.java:28-63` (reads only `nfcData` UID); `NfcChipReadHandler.java:26-52` (MRZ len>=30 + contains `<` only; returns `success(1.0)`) | Server drops all chip crypto. Auth on bare UID match; chip-read passes on any 30-char string containing `<`. No SOD/DG-hash/session proof. |
| **S10** | NUANCED | issue path `NfcCardReader.kt` does NOT exist. Real: `TurkishEidReader.kt:175-193` never reads/validates SOD (`TurkishEidData.sodValid` defaults null, CardData.kt:132); `PassportNfcReader.kt:275,304` DOES propagate `sodValid` | "Hardcoded true" inaccurate — passports propagate SOD (sub-claim REFUTED); Turkish eID never computes it (null). Net (SOD not enforced for eID) holds, moot anyway because server (S9) ignores chip evidence. Fix belongs server-side. |
| **S11** | CONFIRMED | `NfcController.java:118-121` `@PreAuthorize("isAuthenticated()")` | `GET /nfc/search/{serial}` ("Look up who owns a specific NFC card serial", line 119) returns owner identity to any authenticated user. PII leak + serial enumeration. No admin RBAC. |
| **S12** | CONFIRMED | `WebAuthnRepositoryImpl.kt` assertion path (~L107-115) | Comment: "the assertion result would be sent to a verify endpoint... for now a successful assertion from the authenticator is sufficient proof." Returns `assertionResult` with no server POST. Local-only = client-controlled boolean. (Matrix correctly descopes custom mobile WebAuthn.) |
| **S13** | CONFIRMED | `TotpService.java:36-45` (`verifyCode` = `isValidCode` only); callers `TotpVerifyMfaStepHandler.java:38`, `TotpAuthHandler.java:59`, `AuthController.java:493` add no guard | No consumed-code blacklist at any layer. Captured TOTP code replayable for full window + skew. |
| **S14** | CONFIRMED | `TotpSecretCipher.java:114-120` (returns legacy plaintext unchanged); flag only in `V42__totp_secret_check_encrypted.sql:16` | `FIVUCSAS_TOTP_REJECT_PLAINTEXT` named in a migration comment but never read in code (no @Value/getenv/Field). Legacy plaintext still accepted. |
| **S15** | CONFIRMED (web+mobile) | web `TotpEnrollment.tsx:325` (`qrUri`=response.data.otpAuthUri, L140); mobile `TotpEnrollScreen.kt:175` (`uri`=uiState.otpAuthUri, L161) | Full `otpauth://` URI (secret seed + email) sent to `api.qrserver.com`. Whoever logs it mints valid codes. Generate QR locally. |
| **F16 (elev)** | NUANCED | `NfcStepViewModel.kt:226-227` ATTACHES `dg2_photo_b64`; server `NfcDocumentAuthHandler.java:30` / `NfcChipReadHandler.java:27-49` never read it | Mis-attributed: client SENDS the chip photo; SERVER discards it (no field reads it, no storage, no face-match). Net (never stored/compared) correct; disposition (store + match server-side) correct. |
| **F15 (elev)** | CONFIRMED | client `NfcApprovalApiImpl.kt:12,16` POSTs `auth/approval/{id}/decide`; repo-wide grep finds NO approval/decide controller in identity-core-api | 404. Push-approval has no backend. Correctly TRIAGE->FIX. |
| **PACE (elev)** | CONFIRMED | `UniversalCardDetector.kt:150,166,174,178` (PACE used only for card detection); readers hardcode `paceSuccessful=false` (`PassportNfcReader.kt:274,303`); only `performBacAuthentication` exists | No PACE handshake anywhere; only BAC. PACE-only passports / newer eID fail. Correctly elevated (mobile owns NFC). |

---

## Spot-check results (P1/F# + gaps)

| Item | Verdict | Fresh file:line | Note |
| --- | --- | --- | --- |
| F1 backup codes never generated | CONFIRMED | `OtpController.java:337` `user.enable2FA(...encrypt(secret), null)` | Backup-codes arg is literally `null`. |
| F2 mobile forgot-password stub | CONFIRMED | `ForgotPasswordScreen.kt:119,162` flip `isSubmitted` only; no API call | Pure UI stub. Descope->hosted OK. |
| F3 mobile logout empty body | CONFIRMED | `AuthApiImpl.kt:61-63` `client.post("$BASE/logout")` with no `setBody` | Refresh token never sent -> server can't revoke. FIX correct. |
| F4 mobile session 404 | CONFIRMED | `SessionApiImpl.kt:13-19` calls `sessions` / `sessions/{id}` (→ /api/v1/sessions/*); real routes `AuthSessionController.java:42,195` = `/api/v1/auth/sessions/my[...]` | Wrong base path. Descope->hosted consistent with matrix. |
| F5 mobile change-password wrong route | CONFIRMED | `AuthApiImpl.kt:72-76` posts `auth/change-password`; no such server route | 404. Descope->hosted OK. |
| F7 step-skip authz vs anon flow | NUANCED | `SecurityConfig.java:119` `.../steps/*/skip → authenticated()`; siblings start/get/complete permitAll (SecurityConfig:116-118); use-case session-token based (`AuthSessionController.java:159-164`, `ExecuteAuthSessionService.java:212`) | Real inconsistency, but `cancel` (SecurityConfig:120) was a deliberate post-2026-04-24 hardening; skip may be the same over-correction. Only breaks if optional-step skip during pre-JWT is a live path. Confirm intent before flipping to permitAll. |
| F8 send2FASms local-OTP vs Twilio | CONFIRMED | `AuthController.java:1044` generates local OTP into Redis then `smsService.sendOtp` (L1049); `TwilioVerifySmsService.java:33-41` IGNORES the code (Twilio mints its own) | Under `sms.provider=twilio-verify` user gets Twilio's code while a stale local code sits in Redis -> code-source mismatch. |
| F10 voice search cross-tenant | CONFIRMED | `voice.py:189-211` (`search_voice` has no tenant_id; L204 `find_similar(...threshold=...)`); dead scoped branch `pgvector_voice_repository.py:334-346` (`AND tenant_id=$4`) | Repo supports scoping; route never passes it. Asymmetric vs FACE search which requires tenant_id. |
| F11 voice replay detector dead | CONFIRMED | class exists `app/infrastructure/ml/voice/replay_detector.py`; `voice.py:115 verify_voice` has zero replay refs | Never instantiated/called. |
| F12 voice SEARCH_THRESHOLD semantics | CONFIRMED | `voice.py:191` `SEARCH_THRESHOLD=0.6` passed as `threshold`; results `similarity = 1.0 - m[1]` (L210) -> `m[1]` is distance -> effective sim floor = 0.4, not 0.6 | verify_voice uses similarity correctly (L152); search(distance) vs verify(similarity) really diverge. |
| F14 GDPR export empty voice | CONFIRMED | `UserDataExportService.java:83` `bundle.put("voiceEnrollments", List.of())` (+L84 biometric=List.of()) | Hardcoded empty. KVKK/GDPR completeness gap. |
| GAP API Keys orphaned | CONFIRMED | entity `ApiKey.java` + `ApiKeyResponse.java` + `V19__create_api_keys_table.sql` exist; NO controller/service/repository; zero other refs to `ApiKey` | Fully orphaned. ADD correct. |
| GAP GDPR purge execute | CONFIRMED | `PurgeAdminController.java:33-40` exposes only `DELETE /dry-run`; no execute/run endpoint | Purge runs only via cron. ADD correct. |
| GAP 6 unwired analyzers | NUANCED | referenced by `spoof-detector/src/application/session_engine.py` + `multi_class_fuser.py`, consumed only by `src/presentation/app.py` (a cv2 DESKTOP GUI demo, not an HTTP route); NOT imported by biometric-processor at all | "No call path into any route" too strong (desktop demo uses them) but TRUE for production: never reach prod `/verify`/`/enroll` (which use assembler.py = FaceUsabilityGate + DeviceSpoofRisk only). TRIAGE framing right. |
| GAP amispoof <-> web-app | CONFIRMED | `web-app/package.json` has no spoof-detector dep; web-app uses own `src/lib/biometric-engine/core/PassiveLivenessDetector.ts` | Standalone amispoof engine not integrated into enroll/verify. TRIAGE correct. |

---

## Critique of the remediation plan

**Bucketing — correct.** P0/ELEVATED/DESCOPE/ADD/TRIAGE all check out.
- DESCOPE set (F2/F4/F5/F6+S12, mobile TOTP-disable, revoke-all, desktop voice, mobile voice-delete) matches the client-support-matrix tiers; no item mis-marked "descope->hosted" that must stay native. The two things that MUST stay native — NFC (S9/S10/F15/F16/PACE) and face capture (S6) — are all correctly ELEVATED. Matrix invariant ("native capture != native trust") honored.
- ADD set is genuinely missing functionality (API Keys, purge-execute, backup codes all verified orphaned/absent).

**Execution order — sound, with refinements:**
1. **S9 must gate S10/F16.** Server is the trust boundary; until `NfcChipReadHandler`/`NfcDocumentAuthHandler` validate SOD/DG-hash/session-proof, fixing client SOD propagation (S10) or sending the chip photo (F16) changes nothing. Plan order #1 already groups S9+S10 — good — but make S9 the hard dependency: no mobile S10/F16 effort until the server consumes+enforces the evidence.
2. **S2 fix is object-level authz, not endpoint annotation.** The catch-all already enforces authn, so adding `@PreAuthorize("isAuthenticated()")` is a no-op against the IDOR. Fix = ownership/tenant checks in `ManageVerificationService` (mirror `canAccessTenant`/`isCurrentUser` already used in TenantController + BiometricController). Update the plan's S2 line.
3. **S7 depends on S8.** Wiring landmarks (S7) only matters once `ANTISPOOF_USABILITY_GATE_ENABLED=true` (S8); enabling the flag without passing landmarks still no-ops. Do them together.
4. **S5 line wording.** Drop "anti-spoof" tenant framing — face search already scopes tenant; S5 is liveness-only.

**Re-triage accuracy:** good. Beyond S2: S6 should say "route through identity-core-api" and drop ":8001 direct" (it's `bio.fivucsas.com`), and add a step to verify that subdomain's prod reachability (affects whether mobile face works at all today).

---

## Missing from the backlog (noticed while reading)

1. **IDOR is broader than S2's `getUserVerificationStatus`.** Same controller's `getSession`, `submitStepResult`, `completeSession` (`VerificationController.java:39,47,52`) also take caller-supplied ids with no ownership check in `ManageVerificationService`. Fix scope = whole controller.
2. **`createSession` trusts client-supplied `userId` AND `tenantId`** (`VerificationController.java:32-37` -> `verificationService.createSession(command.userId(), command.tenantId(), command.flowId())`). An authenticated caller can open a verification session FOR another user / another tenant — a write-side IDOR. Deserves its own line.
3. **Replay guard scoped to TOTP only (S13).** The local `otpService.generate/verify` path used by F8 `send2FASms` (AuthController.java:1044) and email OTP has no consumed-on-use check via the bare `/2fa/*` controller paths (AuthController.java:493,501 call `verifyCode` directly). Verify whether mfa_sessions.consumed_at (V35) actually covers these.
4. **`bio.fivucsas.com` routing/secret question (S6).** If the processor is exposed for mobile, the shared API key ships in an APK; if not, mobile face has been silently broken. Either is a finding; neither is in the backlog.

---

## Fix-first list (highest confidence + impact)

1. **S9 — server-side NFC chip-evidence verification** (`NfcChipReadHandler.java:26-52`, `NfcDocumentAuthHandler.java:28-63`). Largest trust hole: identity "verified" on a UID or a 30-char MRZ-shaped string. Gates all other NFC work.
2. **S1 — `canAccessTenant` on `PUT /tenants/{id}`** (`ManageTenantService.java:123`). Small fix, pattern already in the same file's GET path; stops any tenant admin overwriting any tenant.
3. **S2 (+missing #1/#2) — object-level authz across `VerificationController`** (`ManageVerificationService.java:83,110,344,363`). Authenticated cross-user/cross-tenant READ and WRITE of verification data.
4. **S15 — generate TOTP QR locally, web + mobile** (`TotpEnrollment.tsx:325`, `TotpEnrollScreen.kt:175`). Active third-party seed leak; trivial, high severity, no design decision.
5. **S3 — proctor tenant-scope + drop `X-Reviewer-ID` trust** (`proctor.py:466-484, 487-498`). Cross-tenant incident read + reviewer spoof behind only a shared service key.

Runner-up, near-trivial: **S11** admin RBAC on `NfcController.java:118`; **S13** TOTP replay blacklist.
