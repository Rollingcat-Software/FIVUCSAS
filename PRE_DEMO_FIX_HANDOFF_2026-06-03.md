# Pre-Demo Fix Handoff — 2026-06-03

> **Audience:** the next Claude session running on the developer's **local PC with an Android emulator** (this
> server cannot run an emulator / cannot reach the demo phone). Demo/jury presentation is **tomorrow**.
>
> **How to use:** every issue below has a **verified root cause (file:line)** and a **concrete fix**. Three
> implementation branches are already pushed (see *Fix branches*); fetch them, finish/verify on-device, then
> deploy. Everything here was **independently verified this session** (3 adversarial verifier agents +
> live curl/Playwright) against `web-app`/`identity-core-api` `origin/main` and `client-apps` `origin/main`
> (the installed APK = tag `v5.3.0`/#80; `origin/main` is ahead with #82/#83/#84). Do **not** trust prior
> "done" labels without re-checking — that discipline already caught several wrong claims (below).

---

## 0. Already shipped & verified LIVE this session (do NOT redo)

| Item | State | Proof |
|---|---|---|
| **#202** verify step-counter (`1/2→2/3`) | merged + deployed | live `verify.fivucsas.com` serves `index-m1t1pf45.js` with the fix; `LoginMfaFlow.tsx:590` folds out the runtime total |
| **app.fivucsas blank dashboard** | resolved | #202 Hostinger deploy (run `26882903664`) re-baked `VITE_API_BASE_URL`; live `#root` mounts, login renders |
| **amispoof claims regression** | fixed + live | redeployed `origin/main:web/amispoof/{index.html,app.js}` → **17-axis** + "in-house sample score" live; camera-falsereject preserved |
| **v5.3.0 release APK** | correct build attached | replaced stale #80 asset with verified **#84** prod-signed build (`md5 43a3e200…`, `CN=FIVUCSAS, Marmara`, contains #82/#83) — updated `2026-06-03T12:19:37Z` |

## 1. Corrections to `USER_FINDINGS_2026-06-03.md` (verified — fix these in that doc)

- **#13** verdict-table row says "verify never got the fix, port post-demo" — **WRONG/stale.** #202 ported it and it's **live**. (Doc's own "work done" section is right; the table row contradicts it.)
- **#8** cited `DashboardScreen.kt:147` — real line is **`:140`**; and it claims the label is "hardcoded, not i18n'd" — **false**, it IS i18n'd (`StringKey.DASH_ADD_CARD`, EN "Add card" / TR "Kart Ekle").
- **#5** "two MRZ buttons" — there are actually **three** entry points on `origin/main` (camera-OCR fill, NFC-read start, "scan any card"); the orphan dup screen was already deleted by #80.
- **#3A** Traefik rate-limit is at `dynamic.yml:`**183-184**, not `:212-215` (the relief script targets the right line).
- **#18** ("crashes — components removed, buttons alive") — **not reproducible as a dead-nav crash**: every `navigate(Screen.X)` / BottomNav route on `origin/main` maps to a registered composable. The crashes the user sees are **stale-contract decode crashes** (chiefly **#10**), fixed by the **#84 reinstall**.
- **`demo-day-relief.sh` had a real defect:** its **#2 session-TTL relief was a NO-OP** (compose used an explicit `environment:` block, so `JWT_EXPIRATION` appended to `.env.prod` never reached the container). Fixed — see #2 below. Its Redis-flush step is best-effort (low impact). Traefik + lockout-clear steps work and revert cleanly.

---

## 2. Issue register #1–#21 (verified root cause → fix → status)

Legend — **Where fixed:** W=web-app · A=identity-core-api · M=client-apps · I=infra/compose · OPS=operator/demo-day · — = not a bug.
**On-device?** = needs the emulator / physical phone to verify (you can; this server can't).

| # | Issue | Verified root cause (file:line) | Fix | Where | On-device? |
|---|---|---|---|---|---|
| 1 | QR *login* approved on phone, web idle | Web poller is correct (`QrLoginPanel.tsx:131-138` auto-advances on `APPROVED`+token). Mobile `QrLoginApiImpl.kt:33-37 approveSession` POSTs with **no status check** → 401 (expired bearer, see #2) swallowed → server stays PENDING. **Auto-verifies; no button needed.** | add `isSuccess()` + refresh/retry on mobile | M | yes |
| 2 | Mobile re-login after 15–30 min | access TTL = 15 min (`application-prod.yml:140 JWT_EXPIRATION:900000`); mobile refresh can't re-fire the 401'd request (`NetworkModule.kt:239-241` TODO) + `TokenManager.kt:76-78 isAuthenticated()` checks presence not expiry | Ktor `Auth{bearer{refreshTokens}}` retry + expiry-aware startup; **also** compose `JWT_EXPIRATION` passthrough so OPS can bump TTL | M + I | yes |
| 3 | "Too many requests" too aggressive | Traefik 100/200 (`dynamic.yml:183-184`); login bucket 10/5min (`RateLimitService.java:362`, Bucket4j); lockout 5→15min→423 (`LoginAccountStateGuard.java:46-47`); OTP 5→429. **Compose exposes `RATE_LIMIT_LOGIN_PER_MINUTE`/`_API_` (lines 81-82) — confirm whether the app reads them; if not, wire `@Value`.** | run `demo-day-relief.sh --go`; (opt) make thresholds env-driven | A + OPS | no |
| 4/16 | "Başka cihazdan onayla" not selectable | **Not a bug** — it IS the first-screen shortcut (`LoginPage.tsx:1296`, verify `HostedLoginApp.tsx:916`, `tr.json:2483`). The user mistook the **info-only enrollment card** (`tr.json:1536`) for the login factor. | optional copy tweak; see #21 | — | no |
| 5 | Two/three MRZ buttons | distinct by design (camera-OCR fill / NFC-read start / scan-any); orphan dup deleted by #80 | optional label clarity | M | no |
| 6 | "latest version" | = APK v5.3.0/#80; **#84 is now on the release** — reinstall it | reinstall #84 | OPS | yes |
| 7 | **NFC won't read** (OS detects card, app waits) | `AndroidManifest.xml:50-52` foreground `TECH_DISCOVERED` filter competes with reader mode + `AndroidNfcService.kt:173 processTag` early-returns unless `state==WaitingForCard`. **Byte-identical v5.3.0↔main → rebuild alone won't help.** | remove competing filter + relax guard | M | **YES — `adb logcat`** |
| 8 | "Add card" button = dead-end | `DashboardScreen.kt:140` → `CardScanScreen.kt` photo wizard, never persists; #84 fixes the misleading "Card Added"→"Photos Captured (preview only)" copy | hide or honestly relabel | M | yes |
| 9 | Activity History empty | v5.3.0 `ActivityHistoryScreen.kt:62 emptyList()`; #83 wires `AuditLogApiImpl.kt:31 client.get("my/activity")` → `AuditLogController.java:115` | **reinstall #84** | (M, in #84) | yes |
| 10 | My-Invitations "Unexpected JSON error" | v5.3.0 `InviteApiImpl.kt:63` hits non-existent `invites/received` → 404 → JSON-decode crash; #82 returns `emptyList()` (stops crash). **No member-side received-list endpoint exists on backend.** | #84 stops crash; **add backend `GET .../invites/received`** | A (+M in #84) | yes |
| 11 | Tenants show 0 members (web+mobile) | `ManageTenantService.java:313 countByTenantId` runs under Hibernate `tenantFilter` → counts only active tenant | wrap in `TenantFilterBypass.runWithoutTenantFilter()` | A | no |
| 12 | Password autofill black/blue | fix exists + theme-aware (`theme.ts:297`), **present in both live bundles** → stale service-worker cache | hard-reload / clear SW cache | OPS | no |
| 13 | verify step counter `1/2→2/3` | **FIXED LIVE** via #202 (`LoginMfaFlow.tsx:590`) | none | done | no |
| 14 | Mobile logs in with system tenant — correct? | **By design** — public client `fivucsas-mobile` (V80) under `system` tenant, `cross_tenant=TRUE` (V82); token carries the user's REAL `tenant_id`. Auth flow = OAuth2 code+PKCE, hosted-first | none | — | no |
| 15 | Dashboard shows no devices after mobile login | no login/token path creates a `UserDevice`; mobile only calls `POST /devices/push-token` = update-only (`ManageDeviceService.updatePushToken:130` throws if none) | UPSERT on push-token / create device on login | A | no |
| 17.2 | login approved on phone, browser waits ∞ | = #1 (same swallow) | = #1 | M | yes |
| 17.3 | login requests not on mobile home | approver must reach the pending-list screen; not surfaced on home | surface pending approve-login on home (assess) | M | yes |
| 18 | "crashes — removed components, live buttons" | **Not a dead-nav crash** (verified). Real cause = stale-contract decode crashes (#10). | reinstall #84; if it still crashes, capture logcat | OPS | yes |
| 19 | **app.fivucsas password box on identification layer** | `LoginPage.tsx:753 showPasswordForm = loginConfig ? … : true` defaults to the legacy password form **while `loginConfig` is loading** (null) → password box flashes before flipping to identifier-first. Sticks if config is slow/rate-limited (#3) or **stale-cached** | loading guard until config resolves (keep safe fallback) | W | no |
| 20 | **QR *factor* self-verifies (security)** | `QrCodeStep.tsx` generates a token (`POST /qr/generate/{userId}`), auto-fills it (`:83`) and submits the SAME token (`MfaStepRenderer.tsx:228`) → no second-device possession proof; Doğrula always passes | interim: stop auto-fill+instant-submit; real: cross-device approve (big) | W | no |
| 21 | APPROVE_LOGIN shows "not enrolled", no Enroll button | device-implicit method (enroll = sign into the mobile app once); Enrollments page has no web enroll affordance for it → dead-end | don't gate flow on it / "Set up on mobile" affordance | W (+A status) | no |
| — | **email vs email+password inconsistency on verify** | same as #19: `LoginMfaFlow.tsx:89 passwordIsLayer1 = !loginConfig || …` defaults to password before config loads | same loading guard | W | no |
| — | **approve-login as a mid-flow factor** | currently Layer-1 shortcut only; not wired into `MfaStepRenderer` as a selectable MFA factor | assess + wire (or flag) | W | no |

---

## 3. Fix branches (implementation in flight — fetch + verify, don't reimplement from scratch)

Three agents opened PRs with the additive/reversible fixes above. Fetch and **review + on-device verify**, then merge + deploy:

| Repo | Branch | Covers |
|---|---|---|
| `Rollingcat-Software/web-app` | `fix/predemo-web-2026-06-03` | #19 + verify-flash loading guard, #20 QR-factor interim, #21 enroll dead-end, approve-login mid-flow assessment |
| `Rollingcat-Software/identity-core-api` | `fix/predemo-api-2026-06-03` | compose `JWT_EXPIRATION` passthrough, #3 rate-limit env, #11 tenant count, #15 device row, #10 invites endpoint, approve-login decide/status |
| `Rollingcat-Software/client-apps` | `fix/predemo-mobile-2026-06-03` | #1/approve swallow, #2 token-refresh retry, #7 NFC (best-effort), #8 add-card |

> If a branch is missing/incomplete (agent interrupted), implement from the per-issue specs in §2 — each is self-contained.

The **`demo-day-relief.sh` #2 no-op fix** is committed here (this PR): the script comment is corrected; the matching compose change (`JWT_EXPIRATION: ${JWT_EXPIRATION:-900000}` in the api `environment:` block) is in the `fix/predemo-api` branch.

---

## 4. For local Claude + emulator — priority order

1. **verify.fivucsas login (jury sees this):** merge web `#19`/flash guard → rebuild verify Docker → confirm the email/password flash is gone and identifier-first is stable. Decide the `#20` QR-factor: ship the interim no-auto-submit OR simply **don't showcase QR_CODE** as a factor (use TOTP/EMAIL_OTP/FACE).
2. **Mobile (emulator):** build the mobile branch, run on the emulator, verify **#1/#17.2** (approve-login + QR login now advance the browser), **#2** (no 15-min logout), **#7 NFC** (the one thing only a device can confirm — `adb logcat`), **#8/#9/#10** (add-card hidden, activity history populates, My-Invitations no crash). Then trigger the signed CI APK (`gh workflow run android-build.yml -R Rollingcat-Software/client-apps -r main -f build_type=release`) and install it.
3. **Backend:** merge api branch → Docker rebuild → verify **#11** (tenant member counts), **#15** (mobile login shows a device), **#10** (invites endpoint), approve-login decide.
4. **Dashboard:** clear SW cache once → confirm **#12** autofill + **#19** password-flash gone.

## 5. Demo-day operator runbook (morning of)

1. `cd /opt/projects/fivucsas && ./scripts/demo-day-relief.sh --go` (raises Traefik, clears lockouts, **now actually** bumps session TTL → 2h once the api compose-passthrough is deployed). `--revert` after.
2. Install the **#84** APK on the demo phone (already on the v5.3.0 release) — or the newer build if the mobile fixes ship.
3. On the demo laptop: clear the service-worker cache once (DevTools → Application → Service Workers → Unregister → reload) — clears #12 + #19.
4. **Demo with genuine factors** (PASSWORD + TOTP/EMAIL_OTP/FACE). Avoid showcasing the **QR_CODE factor** (#20) and live **NFC chip-read** (#7) unless verified on-device first.
5. Pre-warm: log into the phone right before any cross-device QR/approve demo (fresh bearer) so #1's swallowed-401 path can't bite.

---
*Generated 2026-06-03. All root causes carry a file:line and were re-verified against current `origin/main` + live this session.*
