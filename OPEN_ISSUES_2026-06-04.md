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
