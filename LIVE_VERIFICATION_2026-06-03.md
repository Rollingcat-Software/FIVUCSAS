# Live On-Device Verification — 2026-06-03 (Pre-Demo)

> **Purpose:** Verify, on a running device, the fixes claimed in `USER_FINDINGS_2026-06-03.md`
> and `client-apps/docs/MOBILE_TRIAGE_2026-06-03.md` ("review them and verify he did it"),
> by installing the **actual latest release APK** and exercising every reported issue.
>
> **Method:** Android emulator **Pixel_7_Pro** (API, 1440×3120). Installed the genuinely-latest
> artifact: the **CI release-signed APK** pulled from Hetzner
> (`/opt/projects/fivucsas/client-apps-apk-v5.3.0-rebuild-2026-06-03.release/androidApp-release.apk`,
> versionName **5.3.0**, versionCode **12**, `CN=FIVUCSAS` keystore). Logged in as
> **ahabgu@gmail.com** (tenant Fivucsas, ROOT) via the hosted flow (verify.fivucsas.com Custom Tab).
> Screenshots: `_ss/test/*.png`.
>
> **NOTE — first run was misleading:** the local debug APK (`client-apps/.../androidApp-debug.apk`,
> built from the *feature branch* `claude/mobile-cleanup-nfc-2026-06-02` ≈ PR #79) is **older than the
> released v5.3.0** and is missing #80/#82/#83. Testing it reproduced the *old* bugs (empty Activity
> History, etc.). All verdicts below are from the **latest release APK**.

---

## 🔴 HEADLINE NEW FINDING: Activity History crashes the app (demo-blocking)

Opening **Activity History** — via the bottom-nav **History** tab, the **"Activity History"** Quick
Action tile, **or** the home **"Recent Activity → View All"** link — **hard-crashes the app** (process
dies, returns to launcher). Reproduced deterministically (`_ss/test/25`, `26`).

**Stack (release, R8-minified):**
```
org.koin.core.error.InstanceCreationException: Could not create instance for '[Factory: 'P2.i']'
Caused by: org.koin.core.error.NoDefinitionFoundException: No definition found for type 'B2.a'
FATAL EXCEPTION: main → Process com.fivucsas.mobile has died
```

**Root cause (confirmed in source on `client-apps` `origin/main`):** PR **#83** ("wire Activity
History to GET /my/activity") added:
- `ActivityHistoryViewModel(auditLogRepository: AuditLogRepository)` — registered via
  `factoryOf(::ActivityHistoryViewModel)` in `ViewModelModule.kt`
- `AuditLogRepository` / `AuditLogRepositoryImpl(auditLogApi: AuditLogApi)`
- `AuditLogApi` / `AuditLogApiImpl(client: HttpClient)`

…but **never registered `AuditLogApi` or `AuditLogRepository` in Koin.** A repo-wide grep of all DI
modules finds **no** `single<AuditLogApi>` and **no** `single<AuditLogRepository>` anywhere
(`NetworkModule.kt` has 25 other APIs; `RepositoryModule.kt` has 14 other repos). So when Koin builds
`ActivityHistoryViewModel`, it cannot resolve `AuditLogRepository` (`B2.a`) → crash.

- `B2.a` = `AuditLogRepository`, `P2.i` = `ActivityHistoryViewModel`.
- The home **"Recent Activity" widget works** because it reads login history from a *different,
  registered* source — not `AuditLogRepository`.
- **`AuditLogDashboardViewModel` (the audit-log dashboard) shares the same missing dep → it crashes
  identically.**

**This is almost certainly the "app crashes because some components removed but buttons still alive"
report.** It is NOT a stale-APK artifact — it crashes on the *latest* release build, and a debug build
from `main` would crash the same way (Koin DI is runtime/type-based).

**Exact fix (2 bindings + imports), low-risk:**
```kotlin
// shared/.../di/NetworkModule.kt  (beside the other identityClient APIs, ~line 297)
single<com.fivucsas.shared.data.remote.api.AuditLogApi> {
    com.fivucsas.shared.data.remote.api.AuditLogApiImpl(get(named("identityClient")))
}

// shared/.../di/RepositoryModule.kt
import com.fivucsas.shared.data.remote.api.AuditLogApi            // (already needed transitively)
import com.fivucsas.shared.data.repository.AuditLogRepositoryImpl
import com.fivucsas.shared.domain.repository.AuditLogRepository
// ...
single<AuditLogRepository> { AuditLogRepositoryImpl(get()) }
```
Fixes **both** the Activity History screen (#9) and the audit-log dashboard. Requires an **APK
rebuild + reinstall** to reach a device.

---

## Per-issue live verification (latest release APK)

| # | Issue | Prior claim | **Live result** | Evidence |
|---|-------|-------------|-----------------|----------|
| 9 | Activity History empty | "FIXED #83" | 🔴 **REGRESSED → CRASH.** #83 wired the VM but omitted the Koin bindings. Was *empty* on old build; now *crashes* on latest. | `_ss/test/25,26` + source |
| 10 | My Invitations JSON error | "FIXED #82" | ✅ **VERIFIED FIXED** — clean empty state ("No Invitations…"), no crash. (Real listing endpoint still absent → stays empty by design.) | `_ss/test/31` |
| — | Settings dead toggles | "FIXED #82" | ✅ **VERIFIED** — three dead switches gone; auth section honestly retitled "Authentication / Authenticator app (TOTP)". | `_ss/test/22` |
| 8 | "Add card" purpose | "camera wizard, discards photos" | ✅ **CONFIRMED** — "Add card" opens **"Scan ID Card"** (camera capture). Mislabeled; the prior copy fix is in this build. | `_ss/test/10,11` |
| 5 | Two MRZ buttons | "FIXED-IN-5.3.0; distinct by design" | ✅ **CONFIRMED** — on NFC Reader screen: **"Scan MRZ with camera"** (OCR→fills fields) vs **"Scan with MRZ"** (NFC chip read, *disabled until the 3 MRZ fields are filled*). Distinct, but confusingly named. | `_ss/test/33` |
| 7 | NFC doesn't read card | "genuinely open; needs physical device" | ⚠️ **NOT REPRODUCIBLE ON EMULATOR** (no NFC hardware; `dumpsys nfc` empty). UI flow confirmed correct. Genuine reader-mode issue stands; **treat live chip-read as not demo-safe.** | `_ss/test/33,34` |
| 11 | Tenants show 0 members | "tenantFilter scopes the COUNT" | ✅ **CONFIRMED LIVE** — own tenant **Fivucsas = Members: 3** (correct); **all others = 0** (Marmara University, TechCorp Istanbul, Anatolia Medical Center, system). Exact `countByTenantId` + Hibernate `tenantFilter` symptom. | `_ss/test/37` |
| 4/16 | "Approve on another device" not selectable | "it IS — first-screen shortcut" | ✅ **CONFIRMED** — verify.fivucsas first screen shows **"Approve on another device"** + **"Sign in with your phone"** (QR) shortcuts, *before* entering email. Mobile **"Login requests"** approver screen (Profile → Account Actions) works (empty-state + poll). | `_ss/test/16,24` |
| 13 | verify step counter jumps 1/2→2/3 | "tenant-dependent; #202 ports the fix" | ✅ **NO JUMP for this tenant** — counter ran cleanly **1/3 → 2/3 → 3/3** (password → method select → email OTP). Confirms it only jumps when login-config vs runtime totals disagree. | `_ss/test/18,19,20` |
| 1 | QR cross-device | "mobile half built; web QR #199; multi-step deferred" | ✅ **mobile scanner works** ("Scan QR to Login", camera + manual-payload fallback). Auto-verify is the intended UX; the "press a button then can't continue" case is the **multi-step-tenant `mfaSessionToken` handoff** (deferred). | `_ss/test/38` |
| 3 (new) | "Login requests not on home screen" | — | ✅ **CONFIRMED** — the approver screen is reachable from **Profile → Login requests**, but there is **no home-screen tile** for it. Discoverability gap, not a missing feature. | `_ss/test/23,24` |

### Items not testable from the emulator (backend / web / time-based)
- **#2** mobile 15-min forced re-login — code-confirmed (access TTL 15 min + un-retried 401); not waitable live. Operator mitigation: bump `JWT_EXPIRATION`.
- **#3** rate-limit "too many requests" — backend/Traefik; see the operator script `scripts/demo-day-relief.sh`.
- **#12** password autofill color — did **not** reproduce on mobile Chrome (field stayed white); desktop-only / stale-SW per prior finding.
- **#15** dashboard shows no devices — backend write-path gap (mobile login never creates a `UserDevice`).
- **#14** system-tenant login — by-design (token carries the user's real `tenant_id`).

---

## Updated demo-day status

1. **NEW BLOCKER — Activity History / audit-dashboard crash (#9):** needs the 2-line Koin fix + an APK
   rebuild. **Until then, do NOT open the History tab / "View All" / audit dashboard during the demo**
   (it kills the app). Home "Recent Activity" is safe.
2. Everything in the prior `## DEMO-DAY ACTION PLAN` (rate limits #3, session #2, lockouts) still
   applies — run `scripts/demo-day-relief.sh --go` the morning of the demo.
3. #10, Settings, #5, #4/#16, #1, #13 all behave correctly on the latest release APK.
4. Avoid live NFC chip-read (#7) and the Devices view (#15) for a mobile-only account.

## Recommended immediate action
Apply the 2-line DI fix to `client-apps` `main`, rebuild the **release-signed** APK via CI
(`gh workflow run android-build.yml -R Rollingcat-Software/client-apps -r main -f build_type=release`),
download, and reinstall on the demo phone. This is the only code change that is itself demo-blocking.
