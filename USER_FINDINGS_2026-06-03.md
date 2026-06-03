# User-Reported Findings — 2026-06-03 (Pre-Demo)

> **Context:** Demo/presentation is **tomorrow**. User tested across all surfaces: web app (`app.fivucsas.com`), `verify.fivucsas.com`, and the Android mobile app (states he is on the latest version — released **APK v5.3.0**).
>
> **Directive (#17):** Deeply examine all issues → **document them first** (this section) → **document findings** (see `## FINDINGS` below).
>
> **Repo state at investigation time:**
> - `client-apps`: released APK tag `v5.3.0` = commit `65d33306` (PR #80). `origin/main` is **4 commits ahead** of that tag — notably **#82** (My-Invitations crash fix, dead-toggle cleanup, copy fixes) and **#83** (Activity History wiring). **⇒ The installed APK predates #82/#83.** Local working tree is on `fix/mfa-request-retry-stale-connection` (≈ main + 1 unmerged MFA-retry commit).
> - `web-app`: `main` (current). Includes #199 (re-homed approve-login button + cross-device QR sign-in).
> - `identity-core-api`: `main` (current).

---

## ISSUES (verbatim capture)

| # | Surface | Issue (as reported) |
|---|---------|---------------------|
| 1 | Mobile + Web | Mobile app shows "QR login approved" but the web app does not react. Should it react? Realized you have to press a button to pass — should it be a button, or should it auto-verify once the QR is scanned/approved? |
| 2 | Mobile | Login works, but reopening the app after **15–30 minutes** forces sign-in again. An already-logged-in app should keep the session active longer. |
| 3 | All (web, verify, app, mobile) | After a while, **"too many requests"** error appears when signing in / test signing in anywhere. Should be more lenient — **presentation is tomorrow.** |
| 4 | Web | "Başka cihazdan onayla" (approve-login from another device) **does not work because it's passive** — cannot select it on login on the web app. How to activate and use it? |
| 5 | Mobile | Mobile app has **two MRZ buttons** — why duplicate? |
| 6 | Mobile | (Context) "I use the latest version of the app." |
| 7 | Mobile | **NFC does not scan the card.** Screen waits on "ready to scan"; phone detects the card (haptic/OS), but the app does not read it. |
| 8 | Mobile | There is an **"Add card" button on the home screen** — as a FIVUCSAS engineer, what is it for? (Purpose unclear / possibly misleading.) |
| 9 | Mobile | **Activity History always shows empty.** |
| 10 | Mobile | **My Invitations** shows an illegal-input error: "Unexpected JSON error!" |
| 11 | Mobile + Web | "Join a tenant": **tenants show zero members**, which is incorrect. Same bug observed on the web app before. |
| 12 | Web + Verify | When a password is filled (autofill) on web app or verify.fivucsas, the box turns **black/blue** — an unrelated, nonsensical, ugly color. Why? |
| 13 | Mobile → Verify | Mobile sign-in redirects to `verify.fivucsas` (correct), but it shows **steps incorrectly: 1/2, then 2/3**, etc. (inconsistent denominators). |
| 14 | Mobile / Backend | Investigate: for mobile sign-in, is it correct behavior to **log in with the system tenant**? If yes, what auth flow should be configured? |
| 15 | Web (dashboard) | `app.fivucsas` dashboard shows **no devices** ("Tüm kiracılardaki cihazlar gösteriliyor (Root görünümü). Kayıtlı cihaz yok…") even though I signed in on the mobile app. Mobile login should register/show a device. |
| 16 | Web (enrollment) | "Başka cihazdan onayla" enrollment box copy: "Mobil uygulama / Başka cihazdan onayla / FIVUCSAS mobil uygulamasında eşleşen numaraya dokunarak girişleri onaylayın / …orada bir kez giriş yapın." (Relates to #4 — the method shows as an enrollment-only thing, not a selectable login factor.) |
| 17 | — | Deeply examine all issues; document them first, then document findings. |

### Triage clustering (for investigation)

- **Cluster A — Mobile auth & session** (`client-apps`): #2 (session/token TTL), #13 (step counter), #14 (system-tenant login + auth flow), #1-mobile (QR approval send path).
- **Cluster B — Mobile features & UI** (`client-apps`): #5 (duplicate MRZ buttons), #7 (NFC stuck on "ready to scan"), #8 ("Add card" purpose), #9 (Activity History empty), #10 (My-Invitations JSON error). *Cross-reference APK v5.3.0 vs origin/main.*
- **Cluster C — Web/verify login UX** (`web-app`): #1-web (QR no auto-advance / button), #4 + #16 (approve-login not selectable on login), #12 (password autofill color), #13-web (verify step counter denominators).
- **Cluster D — Backend tenants/devices/limits** (`identity-core-api`): #11 (tenant member count = 0), #15 (mobile login doesn't register a device), #3 (rate-limiting too aggressive — **demo-critical**).

---

## FINDINGS

> Investigated 2026-06-03 by 4 parallel agents (mobile auth, mobile features, web/verify UX, backend), each reading the **deployed** code: `client-apps` via `git show v5.3.0:` / `origin/main:` (the local checkout is a **stale divergent branch** ~9–22 commits behind v5.3.0 and is NOT representative of the APK), `web-app` and `identity-core-api` from `main`.

### The single biggest finding: the user's APK is stale

The user states he's on "the latest version." That is **APK `v5.3.0` (#80)** — but `origin/main` is **4 commits ahead**, and two of those commits fix issues he's reporting:

- **#82** (`10140b19`): My-Invitations crash fix + dead-toggle cleanup + honest copy ("Card Added" → "Photos Captured (preview only)").
- **#83** (`fbe7249b`): Activity History wired to `GET /my/activity`.

**No APK was rebuilt after v5.3.0.** So **#9, #10, and the misleading copy in #8 are already fixed in source and just need a rebuilt+reinstalled APK.** This was a known-deferred operator task ("operator APK rebuild") — it is now the highest-leverage mobile action.

### Verdict table

| # | Issue | Verdict | Where the fix lives | Demo-day action |
|---|-------|---------|---------------------|-----------------|
| 1 | QR approved on mobile, web doesn't react | **Web is correct** — poller auto-advances (2.5s). Real cause: mobile approve POST **swallows non-2xx**, so an expired mobile bearer leaves the server session `PENDING` → web never sees `APPROVED`. **It auto-verifies; no button needed.** | mobile `QrLoginApiImpl.approveSession` (no `isSuccess()` check) | Re-login on phone right before demo; use a single-factor tenant for QR |
| 2 | Mobile session dies after 15–30 min | Backend access-token TTL = **15 min**; mobile has a refresh handler that **never retries the original 401'd request** (its own TODO admits it) → first call after expiry surfaces as logout | backend `application-prod.yml` TTL + mobile `NetworkModule` refresh | **Operator: bump `JWT_EXPIRATION` env to 1–2h** (no rebuild) |
| 3 | "Too many requests" too aggressive | **3 rate-limit layers + a lockout, ALL hardcoded** (no env knob): Traefik 100/s, login bucket 10/5min, account lockout 5→15min, etc. | Traefik YAML (editable) + hardcoded Java constants | **Operator knobs below** — raise Traefik, clear lockouts/Redis, restart api, demo from few IPs |
| 4/16 | "Başka cihazdan onayla" not selectable | **It IS selectable** — as a Layer-1 shortcut button on the **first** login screen (before entering email), both surfaces. The enrollment card is informational-only (no web enrollment); that's what the user mistook for "enrollment-only." | web `Layer1Shortcuts.tsx` (works), `methodConfigs.tsx` (info card) | Click "Başka bir cihazdan onayla" **before** typing email; optional copy tweak |
| 5 | Two MRZ buttons | **Already fixed in v5.3.0** — orphan duplicate screen deleted by #80. The 2 remaining buttons are distinct by design ("Scan MRZ with camera" = OCR fill; "Scan with MRZ" = start NFC read), just similarly named | n/a (fixed) | None needed; optional label clarification |
| 6 | "Latest version" | = APK v5.3.0; see stale-APK finding above | — | Rebuild APK |
| 7 | NFC doesn't read card (OS vibrates) | **Genuinely open; NOT fixed by rebuild.** Reader-mode wiring looks correct, but a manifest `TECH_DISCOVERED` filter competes with reader mode + a `WaitingForCard` state guard can drop the tap. **Needs on-device `adb logcat`** (server can't run emulator). | mobile `MainActivity`/`AndroidNfcService`/`AndroidManifest` | **Treat NFC chip-read as NOT demo-safe**; have a fallback |
| 8 | "Add card" button purpose | A **camera photo wizard that never uploads/persists** anything — functionally a dead-end, mislabeled. Honest success copy is on main (#82) but the **button is still labeled "Add card"** even on main (hardcoded, not i18n'd) | mobile `DashboardScreen.kt:147`, `CardScanScreen.kt` | Rebuild fixes success copy; consider hiding/renaming the button for demo |
| 9 | Activity History always empty | **Pure APK gap** — v5.3.0 hardcodes `emptyList()`; #83 wires `GET /my/activity` (endpoint exists). | mobile `ActivityHistoryViewModel` (#83, main only) | **Rebuild APK** |
| 10 | My Invitations "Unexpected JSON error" | **APK gap + missing backend.** v5.3.0 calls non-existent `invites/received` → 404 body fails JSON decode. #82 returns `emptyList()` (stops crash). The listing endpoint **still doesn't exist on backend.** | mobile `InviteApiImpl` (#82 stops crash) | Rebuild stops the error (empty state); real listing needs new backend endpoint |
| 11 | Tenants show 0 members | Backend `countByTenantId` runs under the active **Hibernate `tenantFilter`**, which adds `AND tenant_id = activeTenant` → every other tenant counts 0. DTO field is fine; the COUNT is silently scoped. | backend `ManageTenantService.java:313` | Cosmetic (no data leak); fix = wrap count in `TenantFilterBypass` |
| 12 | Password autofill ugly black/blue | **Fix already exists & is theme-aware** (`theme.ts` global + dashboard per-field overrides). Most likely the user sees a **stale PWA/service-worker cached bundle**. | web `theme.ts:297`, `LoginPage.tsx` | **Hard-reload / clear SW cache** on demo machine and re-test |
| 13 | verify.fivucsas step counter (1/2 → 2/3) | **Real web divergence.** Dashboard got the preflight `flowTotalSteps` fix (#158); **verify never did** — it recomputes `Math.max(loginConfig.totalSteps, runtime totalSteps, current)` so the denominator jumps when those two disagree | web `verify-app/LoginMfaFlow.tsx:566` | Pick a demo tenant where login-config `totalSteps` == runtime flow length; real fix = port #158 to verify (post-demo) |
| 14 | Mobile logs in with system tenant — correct? | **Yes, by design.** Mobile uses public OAuth client `fivucsas-mobile`, seeded under the `system` tenant and flagged `cross_tenant=TRUE` (same as web dashboard). The **minted token carries the user's real `tenant_id`**, so isolation holds. Auth flow = OAuth2 auth-code + PKCE, hosted-first. | backend V80/V82 migrations | None — working as designed (ties to #13's flow) |
| 15 | Dashboard shows no devices after mobile login | **Mobile login never creates a `UserDevice` row.** Rows are only created by admin `POST /devices`, step-up, or WebAuthn enroll. Mobile only calls `/devices/push-token`, which is **update-only** (throws if no device exists) and the client swallows the error. Listing is fine. | backend login/token paths (no device create) | Don't change login path pre-demo; pre-seed a device row for the demo account, or skip the Devices view |

---

### Detailed root causes

**#1 — QR login (mobile approved, web idle).** Web side is healthy: `QrLoginPanel.tsx:105-160` polls `GET /auth/qr/session/{id}` every 2500ms and **auto-completes** on `APPROVED` when an `accessToken` is present (`:131-144`) — no button press required. The real defect is on mobile: `QrLoginApiImpl.approveSession` POSTs to `auth/qr/session/{id}/approve` **without checking the HTTP status** (unlike every other call), so a 401/403 (e.g. expired bearer — compounded by #2) is swallowed, the UI flips to "APPROVED," but the server session stays `PENDING` and the web poller correctly never advances. **Answer to the user's question: it's designed to auto-verify; the only case needing a "continue" tap is an approved-but-multi-step tenant flow (the `mfaSessionToken` handoff is an admitted unbuilt follow-up).**

**#2 — Mobile session expiry.** `application-prod.yml` sets `JWT_EXPIRATION=900000` (15 min) access / 24h refresh. Tokens persist fine in `EncryptedSharedPreferences`. The mobile HTTP layer refreshes on 401 in `HttpResponseValidator.validateResponse`, but that hook **cannot re-fire the failed request** — the code's own TODO says the caller receives the 401. Startup `isAuthenticated()` only checks token presence (not expiry), so the app shows the dashboard then the first data call 401s → perceived logout. Present in both v5.3.0 and main.

**#3 — Rate limiting (demo-critical).** Three independent layers, all hardcoded (no `@Value`/env): **(A)** Traefik global `average:100, burst:200` per IP on `:443` (`infra/traefik/config/dynamic.yml:212-215`); **(B)** `RateLimitFilter` Redis bucket 100/min per IP+path; **(C)** `RateLimitService`/Bucket4j — **login 10/5min per IP** (`security/RateLimitService.java:362`), mfa/step 30/min, register 5/hr, etc.; **(D)** OTP 5 wrong-guesses → 429+Retry-After:300. Plus a per-account **lockout** (`LoginAccountStateGuard.java:46-47`: 5 fails → 15-min lock, HTTP 423). On shared conference Wi-Fi (one NAT IP), the IP-keyed limiters trip fast.

**#7 — NFC.** Reader mode is registered (`MainActivity.onResume → enableReaderMode`, flags incl. `SKIP_NDEF_CHECK`), routing tags to `processTag`. Two suspects, neither resolvable from source: (1) the manifest still declares a foreground `TECH_DISCOVERED` intent-filter that competes with reader mode (the "OS vibrates but app doesn't read" signature = system dispatcher winning); (2) `processTag` early-returns unless state is exactly `WaitingForCard`, so a tap in any other state is dropped. **Byte-identical in v5.3.0 and main** → a rebuild won't help. Needs physical-device `adb logcat`.

**#11 — Tenant member count = 0.** `ManageTenantService.java:313` calls `userRepository.countByTenantId(tenant.getId())` while the Hibernate `tenantFilter` (`TenantHibernateAspect`) is active, injecting `AND tenant_id = :activeTenant`. The web dashboard always sends `X-Tenant-ID`, so the COUNT only matches the caller's own tenant → all others read 0. Fix = `TenantFilterBypass.runWithoutTenantFilter(...)` (the established idiom, already used for `/my` endpoints). Mobile "Join a Tenant" is separately a stub (`emptyList()`, "available soon").

**#13 — verify step counter.** `verify-app/LoginMfaFlow.tsx:566` computes `flowTotal = Math.max(loginConfig.totalSteps, runtime totalSteps, currentStep)` per render. The password screen shows `1/loginConfig.totalSteps`; the MFA step shows `currentStep/runtime-totalSteps` from `/auth/login`. When those two totals disagree (2 vs 3), the denominator jumps 1/2 → 2/3. The dashboard fixed this on 2026-05-31 (#158) by storing the preflight-resolved `flowTotalSteps`; **verify fetches the preflight but discards it** (uses it only for tenant-mismatch).

**#15 — No device on dashboard.** No login/token path creates a `UserDevice`. Mobile login only calls `POST /devices/push-token`, which is update-only (`ManageDeviceService.updatePushToken` throws `EntityNotFoundException` if the user has no device) and the client catches/ignores it. So mobile-only users have zero device rows; the dashboard listing (which would show them for ROOT) has nothing to show. Fix = upsert on the push-token path or register a device on login completion.

---

## DEMO-DAY ACTION PLAN (tomorrow)

**Operator actions (no code rebuild, do the morning of the demo):**

1. **Rate limits (#3) — Traefik:** in `infra/traefik/config/dynamic.yml:212-215` raise `average: 100→1000`, `burst: 200→2000` (or remove `- rate-limit@file` from the `websecure` entrypoint in `traefik.yml`), then `docker restart traefik`.
2. **Clear account lockouts (#3) right before demoing:**
   `docker exec -it shared-postgres psql -U postgres -d identity_core -c "UPDATE users SET failed_login_attempts=0, locked_until=NULL WHERE locked_until IS NOT NULL;"`
3. **Flush Redis 429 counters (#3):** `redis-cli ... --scan --pattern 'rate_limit:*' | xargs ... DEL`, then `docker restart identity-core-api` (resets the in-memory Bucket4j login/mfa buckets).
4. **Session length (#2):** bump `JWT_EXPIRATION` in `.env.prod` to `7200000` (2h), `docker compose ... up -d identity-core-api`. (No rebuild — it's env-driven.)
5. **Demo from as few IPs as possible** — every limiter except per-user/per-tenant is keyed on client IP, and shared Wi-Fi pools everyone onto one NAT IP.
6. **Web autofill (#12):** hard-reload / clear service-worker cache on the demo machine; re-test. The fix is already deployed.

**Mobile (one APK rebuild from `origin/main` clears 3 issues):**

7. **Rebuild + reinstall the APK from `client-apps` `origin/main`** → fixes **#9** (Activity History), **#10** (My-Invitations error → empty state), and **#8** (honest success copy). Optionally also rename/hide the "Add card" button (`DashboardScreen.kt:147`).

**Demo choreography (avoid the genuinely-open bugs):**

8. **#1 QR:** re-login on the phone immediately before the QR demo (fresh bearer) and use a **single-factor** tenant so `APPROVED` returns an `accessToken` and auto-completes.
9. **#4/#16 approve-login:** demonstrate it by clicking **"Başka bir cihazdan onayla" on the first login screen, before entering an email.**
10. **#7 NFC:** treat live chip-read as **not demo-safe**; have a fallback (or reproduce/fix on a physical device with `adb logcat` first).
11. **#13 step counter:** pick a verify demo tenant whose login-config `totalSteps` already equals the runtime flow length.
12. **#15 devices:** either skip the Devices view for a mobile-only account, or pre-seed a device row via admin `POST /api/v1/devices`.

---

## POST-DEMO FIX BACKLOG (real code work, reversibility-sensitive — defer past demo)

- **#2:** replace mobile `HttpResponseValidator` refresh with Ktor `Auth { bearer { refreshTokens {…} } }` so the original request auto-retries; fix startup `isAuthenticated()` to check expiry.
- **#1:** add `isSuccess()` guard to mobile `QrLoginApiImpl.approveSession` (surface real errors instead of false "approved"); build the `mfaSessionToken` step-up handoff for multi-step QR.
- **#3:** make rate-limit thresholds + lockout env-configurable (`@Value`) instead of hardcoded constants.
- **#7:** remove the foreground `TECH_DISCOVERED` manifest filter and/or relax the `WaitingForCard` guard; verify on-device.
- **#10 + #11 + #15:** backend — add an `invites-received` listing endpoint; wrap tenant member COUNT in `TenantFilterBypass`; upsert `UserDevice` on login/push-token.
- **#13:** port the dashboard's #158 preflight `flowTotalSteps` pattern into `verify-app/LoginMfaFlow.tsx` (touches hosted login — flag-guard / canary per project rules).
- **#8:** decide the "Add card" feature's fate (wire OCR+upload, or remove); i18n the button label.

---

## WORK DONE THIS SESSION (2026-06-03)

Three actions taken at the user's request (rebuild APK / prep operator script / fix safe web items):

1. **Rebuilt the mobile APK from `origin/main`** (clears #9, #10, and #8's misleading copy):
   - **✅ Release-signed APK READY (clean in-place upgrade over v5.3.0):**
     `/opt/projects/fivucsas/client-apps-apk-v5.3.0-rebuild-2026-06-03.release/androidApp-release.apk` (103 MB, versionName 5.3.0 / versionCode 12).
     Built by the official CI signed-release job (`gh run` 26877927845, `android-build.yml`, `build_type=release`) and verified signed with the real keystore (`CN=FIVUCSAS, O=Marmara University`) — **no uninstall needed**, just install it on the demo phone.
   - The keystore password is **not on this host** (only in CI secrets), so a *local* build is debug-signed; that's why the signed APK came from CI. To rebuild later: `gh workflow run android-build.yml -R Rollingcat-Software/client-apps -r main -f build_type=release` → `gh run download <id> -R Rollingcat-Software/client-apps -n fivucsas-release-apk`.

2. **Demo-day operator script:** `/opt/projects/fivucsas/scripts/demo-day-relief.sh` — automates the #3 rate-limit relief + #2 session bump, all reversible.
   - `./demo-day-relief.sh` = dry run (prints, changes nothing) · `--go` = apply · `--revert` = restore hardened defaults.
   - Does: Traefik 100/s→1000/s, clear lockouts, flush Redis `rate_limit:*`/`otp:*:attempts`, bump `JWT_EXPIRATION` 15min→2h, recreate api (no rebuild). Secrets never touch the host (expanded inside containers); writes `.predemo.bak` backups. **Run it the morning of the demo; `--revert` after.**

3. **Fixed the verify step counter (#13):** web-app **PR #202** (`fix/verify-step-counter-2026-06-03`). Ports the dashboard's #158 preflight-authoritative `flowTotalSteps` into `verify-app/LoginMfaFlow.tsx` so the denominator no longer jumps 1/2→2/3. Display-only, additive, reversible. `tsc` clean; verify-app suite green + a new regression test. **Not deployed** — left for you to ship (demo-freeze + login-path reversibility); the zero-deploy demo workaround (pick a tenant whose login-config `totalSteps` == runtime flow) still applies until then.

**Not changed** (per the directive + reversibility rules): no prod deploys, no login/auth logic, no changes to the genuinely-open backend items (#11/#15) or the on-device-only NFC bug (#7).
