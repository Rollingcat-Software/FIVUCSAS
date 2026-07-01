# FIVUCSAS — Open Issues & TODOs (living doc, 2026-06-04)

Tracking every known issue so nothing is forgotten — including ones not yet fixed.
Branch: `feat/qr-completion-2026-06-03` (api) / `feat/qr-approve-completion-web-2026-06-03` (web). See `SESSION_2026-06-04_AUTH_FACTORS.md` for deploy detail.

## ✅ RESOLVED + DEPLOYED — 2026-06-04 morning session
- **#1/#2 QR factor + APPROVE_LOGIN factor "başlatılamadı"** — ROOT CAUSE: the `action:challenge` handlers returned the challenge fields at the TOP LEVEL of the body, but the shared web `MfaStepRenderer` reads them from `response.data.data` (the `WebAuthnVerifySupport` convention `{status:CHALLENGE, data:{…}}`). Backend WAS creating the sessions all along (logs confirmed). Fixed both handlers to wrap under `data`. api `d0f9731` rebuilt + live, verified serving 200.
- **#3 QR-login dead-end on app.fivucsas** — wired `onMfaPending` on `LoginPage` `QrLoginPanel` → seeds the MFA session into the dashboard picker/dispatcher (parity with verify's `resumeSession`). web `42a6f59`, app.fivucsas redeployed.
- **Ayşenur fingerprint enrollment "unexpected error"** — NOT her-specific. WebAuthn enrollment forced `attestation:'direct'`, which aborts the platform-authenticator ceremony on Android Chrome (extra OS consent → NotAllowedError); backend never validates attestation. Changed to `'none'` (constants `ATTESTATION_NONE` + `WebAuthnEnrollment.tsx`). web `42a6f59`, live. (Only 3 users ever enrolled WebAuthn, all via desktop hybrid-QR — this blocked ALL on-device mobile enrollment.)
- **Passkey button missing on app.fivucsas** (vs verify.fivucsas) — the platform login-config listed only PASSWORD. Added usernameless PASSKEY to `LoginConfigService.getPlatformLoginConfig()` ONLY (not the shared `passwordFirstConfig`). Drives UI render only; enforcement stays per-tenant. api `babf746`, live (config returns PASSKEY; deployed dashboard shows it via strict-config gating — no web redeploy needed).
- **Forgot-password missing on verify.fivucsas** — added optional `forgotPasswordHref` to the shared `PasswordStep`, wired from `LoginMfaFlow` → dashboard reset flow (new tab). web `16a2ab8`, verify.fivucsas rebuilt + live.

## ✅ RESOLVED + DEPLOYED — 2026-06-04 midday (proactive sweep round)
- **Ayşenur fingerprint — REAL cause fixed.** The attestation fix got her ceremony to the server, which then 500'd: `saveCredential` (@Transactional) called `completeEnrollment` → `EntityNotFoundException "Enrollment not found"` for a FIRST-TIME enrollment → marked the tx rollback-only → `UnexpectedRollbackException` at commit ("Beklenmeyen bir hata"). Blocked EVERY first-time WebAuthn enrollment. Fixed: `autoBindEnrollment` (upsert, REQUIRES_NEW). api `2f97245`. **Ayşenur to retest.**
- **3 more rollback-poisoning sites hardened** (same class, found by a static scan; latent, not firing, but on demo paths): `ManageDeviceService.recordLoginDevice` (REQUIRES_NEW — every login's final step), `ManageEnrollmentService.recordBiometricScores` (REQUIRES_NEW — FACE/VOICE enroll), `ManageEnrollmentService.completeEnrollment` (now UPSERT — the public `/complete` endpoint). api `e321ed2`.
- **Ayşenur fingerprint — CONFIRMED FIXED by user (2026-06-04).**
- **glsm — RESOLVED (user reduced the platform login flow to 2FA, 2026-06-04).** Data was already clean (only her ACTIVE ROOT row `c259933c` live). Reducing to 2FA also fixes the platform-wide forced-3FA footgun (the `is_required=false` steps that the engine wrongly enforced) for ALL platform/ROOT logins.

## ✅ RESOLVED — glsm "no QR button on mobile" (VERIFIED + server-side fix, api `6bf5d52`)
The mobile QR scanner IS in released v5.3.0; the route is role-gated (`QR_SCAN`/`QR_DISPLAY`, TENANT_MEMBER+). **Real cause (DB-confirmed, not a stale session):** `UserResponseMapper.resolvePrimaryRole` only returned `"ROOT"` when `user_type==ROOT` **AND** the user held a literal `"ROOT"` role row. glsm is `user_type=ROOT` but `role_names={USER}` → resolved to **USER** → QR hidden. The mobile trusts this `role`; the WEB trusts `userType` directly (so she looked ROOT on web). DB proof: glsm (ROOT/USER)→USER; ahabgu (ROOT/ROOT,TENANT_ADMIN)→ROOT; rollingcat.help (ROOT/none)→USER (same latent bug). **Fix:** `user_type==ROOT` is authoritative → returns ROOT regardless of role rows (before the empty-roles guard), matching the web. Server-side, **no APK**; tests 6/6. **glsm re-logs-in after the deploy** → fresh token role=ROOT → QR + admin surfaces appear.

## 🟡 LATENT — documented, fix POST-demo (not firing)
- 3 lower-risk tx-poisoning sites: `UsernamelessLoginFlowService.ensureApproveLoginEnrollment` inline save (A1, login race), `ManageNfcCardService.enrollCard` start-enrollment (A5), `MemberRoleAssignmentAdapter.assignDefaultMemberRole` + `GuestLifecycleService` cleanup job (A6/A7). Same REQUIRES_NEW remedy.
- biometric-processor `pytz` not installed → traceback on every `/verify` (verify still succeeds; adaptive-threshold-by-age degrades to default). Fix: stdlib `datetime.timezone.utc` (no new dep). Needs a biometric redeploy — deferred (don't destabilize pre-demo).
- **Lockout (per user decision: LEAVE AS-IS):** failed FACE/VOICE MFA steps count toward the 5-strike account lockout (15-min, HTTP 423). Mitigation if it bites mid-demo: `scripts/demo-day-relief.sh` clears `failed_login_attempts`.

## 🟠 (SUPERSEDED) glsm 3FA login block
**Ayşe Gülsüm Eren** (`glsm.2212@gmail.com`, ROOT, platform tenant `ff000001`) can't finish login: the platform's "Default 3-Step Flow" demands **3 DISTINCT factors**; she has exactly 3 (PASSWORD, EMAIL_OTP, QR_CODE) and her 3rd is **QR_CODE** — the cross-device factor that was throwing "başlatılamadı". **The QR fix above likely unblocks her** (she can now complete step-3 QR with her phone). Deeper bug: the flow's steps 2&3 are flagged `is_required=false` but the engine **ignores that** (no skip-optional logic in `VerifyMfaStepService` / `AuthFlow.getStepCount` / `MfaSession.allStepsCompleted`) → a forced 3FA that was meant to be lighter. **OPTIONS:** (a) she retries QR now (likely works); (b) reduce the platform flow to 2 steps — reversible SQL `DELETE FROM auth_flow_steps WHERE auth_flow_id='34ef5783-3849-4245-b06c-b26cc8f887c7' AND step_order=3;` (affects ALL platform-tenant logins → 2FA, matches every other tenant); (c) fix the engine to honor `is_required=false` (proper fix, larger). Pending user's call.

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

## 📄 LANDING-PAGE (fivucsas.com) CLAIM CORRECTIONS
Verified against the codebase 2026-06-04 (5-agent sweep). Edit `landing-website/src/App.tsx`.

**🔴 INACCURATE — must fix (a jury can trivially catch these):**
- **"rPPG pulse cues"** (anti-spoof) — **TOP PRIORITY, REMOVE.** `rppg_analyzer.py` exists but is **DISABLED** (`config.yaml` rPPG weight = **0.0**); internal notes mark it ANTI-CORRELATED ("detects screen flicker as pulse"). Advertising a switched-off liveness defense is the worst credibility hit. Delete the rPPG claim.
- **"Redux Toolkit"** → **InversifyJS** (web-app has no redux; DI is InversifyJS v7.10.4).
- **"3 Microservices"** → **2 backend microservices** (Identity Core API + Biometric Processor); the Admin Dashboard is a React 18 SPA, not a microservice.
- **"and CLI"** (SDKs) → **REMOVE** — no CLI client exists anywhere.
- **"10 Auth methods"** → **12** (PASSKEY + APPROVE_LOGIN added V73–74) — or keep "10" and don't list the 2 new ones; pick one and be consistent.
- **"DeepFace"** (implied primary detector) → **MTCNN detection + Facenet512 embeddings + DeepFace anti-spoof veto + pgvector**.
- **iOS via KMP** (implies a shipped iOS app) → "Android via KMP; **iOS host app on roadmap**" (shared lib targets iOS, but no iOS app ships).
- **"250+ API endpoints"** → fine as a floor (actual **~308** = 230 api + 78 bio), but the breakdown shouldn't imply they're all in Identity Core.
- **"1,800+ tests"** → an **undercount** (~7,032 test methods: 1,600 Java + 896 Kotlin + 1,780 JS/TS + 2,756 Python). Either bump the number OR keep "1,800+" as a safe floor — but **don't say "passing"** unless you've run them green (currently unverified).

**🟡 OVERSTATED — soften:**
- **"JWT signing: RS256 default"** → "RS256 in prod (enforced at boot; RS256-only JWKS)". The coded *default* is HS512; prod fail-fasts to RS256. HS512 verify path exists but is disabled by default.
- **"MFA rate-limiting: Retry-After + lockout"** → there's **no explicit account lockout**; it's per-client/IP rate buckets (429 + Retry-After) + refresh-token-family revocation on replay (RFC 6749 §10.4).

**🟢 CONFIRMED accurate (keep):** OAuth2/OIDC/PKCE S256 + discovery + JWKS + refresh rotation; at-rest AES-GCM-256 (TOTP) / Fernet (embeddings); RFC 8176 amr; monthly pg_partman audit partitioning; Spring Boot 3.4.7 / Java 21 / FastAPI / Python 3.12 / React 18 / Traefik v3.6.12; bio "70+ endpoints" (78); Web CDN SDK + iframe widget; Android KMP; **desktop loopback RFC 8252** (OAuthLoopbackClient.kt — real); on-device passive liveness; screen-replay analyzer; NFC ICAO-9303 passive-auth cross-reference.

## ☀️ MORNING PUNCH-LIST (for the fresh session — start here)
1. **Diagnose #1/#2 (QR + approve factors "başlatılamadı"):** WARP on → `ssh hetzner` → `docker logs identity-core-api | grep -iE "mfa.?step|QR_CODE|APPROVE_LOGIN|logMfaStepFailed|Exception"` at a failure timestamp → read the audit reason → fix (likely `method_not_permitted_for_step` on the dashboard's CHOICE step, or a challenge-handler issue) → redeploy api (branch `feat/qr-completion-2026-06-03`).
2. **Fix #3 (QR-login dead-end on app.fivucsas):** wire `LoginPage.tsx` `QrLoginPanel` `onMfaPending` → set the returned `mfaSessionToken` into the dashboard MFA state (so it continues like verify.fivucsas's `LoginMfaFlow.resumeSession`). Batch the web redeploy with #1/#2.
3. **Landing-page corrections** (above) — edit `landing-website/src/App.tsx`, rebuild, deploy to Hostinger. Lead with removing **rPPG**.
4. Optional: eID-dedup + session-clearing mobile fixes → new APK (v5.3.1).
5. After demo: `scripts/demo-day-relief.sh --revert`; flag-flips post staging smoke-test.
