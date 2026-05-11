# Senior UI/UX Designer Review — FIVUCSAS Auth Platform

**Date:** 2026-05-04
**Reviewer:** Senior UI/UX Designer (product design lens)
**Audience:** Founder / sole operator
**Surfaces in scope:** `app.fivucsas.com` (admin dashboard), `verify.fivucsas.com` (hosted login + embeddable widget), `demo.fivucsas.com` (Marmara BYS showcase), `fivucsas.com` (landing — brand cohesion only)
**Verification basis:** Live HTML for all four surfaces (curl), `/opt/projects/fivucsas/web-app/src` source at HEAD `319b457`, recent 30-commit window confirmed before each finding so this report does not relitigate items already shipped (Profile date-i18n leak, tenant hardcode, biometric label, dead Redux, polling pause-on-hidden, PWA `navigateFallback`, FacePuzzle/HandPuzzle overlays, USER-BUG-1..10 — all verified merged).

This is a design review. It does not duplicate the engineering, principal, backend, or DB lenses already in the repo. Where a finding overlaps an existing review item, I flag it and only re-state it if the user-experience angle is materially different.

---

## Executive summary

FIVUCSAS already feels like a real product. The design system is coherent — violet/iris primary, Inter+Poppins typographic pairing, calibrated 25-step shadow ramp, tasteful gradient brand mark, dark mode with `prefers-color-scheme` boot, `prefers-reduced-motion` honored, skip-to-content link, breadcrumbs everywhere, perfect 1700/1700 i18n key parity between `en.json` and `tr.json`. That is a level of polish most six-month-old SaaS prototypes never reach.

The friction is concentrated in three places:

1. **The verify.fivucsas.com developer entry experience is invisible.** A tenant developer landing on the bare URL sees `<title>FIVUCSAS Verify</title>` and a blank page (verify-app only mounts when an OAuth `client_id` query is present). There is no "Hello, integrator" page, no SDK snippet, no health/status indicator. Compare to Stripe's `js.stripe.com` 200-with-explanation page or Auth0's hosted-login self-document mode.
2. **The embeddable-widget developer journey is split across `app.fivucsas.com/developer-portal` and `app.fivucsas.com/widget-demo`** — both behind admin auth. A prospective tenant developer cannot evaluate the SDK without first being onboarded as an admin user. This is the single biggest *product*-level UX gap I found, and it is the same one the Principal Review called out at "no self-serve tenant signup" — viewed from the design side, it manifests as the docs being un-shareable.
3. **The admin dashboard is a polished tool but its information architecture is power-user-shaped.** A new admin opening it for the first time will see 18 sidebar entries grouped into 5 categories, three of which (Biometric Tools, Biometric Puzzles, Auth Methods Testing) are debug surfaces that should be feature-flagged or moved behind a "Developer" expander.

The good news: items 1 and 2 are agent-actionable; item 3 is a 30-minute cleanup. Nothing in this review requires the design-team-and-mockups arc that a typical senior UX review produces.

---

## 1. First impressions — the 6-second test

### 1.1 `app.fivucsas.com` (cold load, no session)

What loads — `/opt/projects/fivucsas/web-app/dist/index.html`:
- HTTP 200 in **342 ms** from a Hetzner-routed request, **8.1 KB** index.
- Title: *FIVUCSAS — Biometric Identity Verification Platform.*
- Meta description, OG, Twitter, JSON-LD Organization + WebPage, canonical, hreflang considerations all present. SEO hygiene is a 9/10.
- Five `<link rel="modulepreload">` for the critical-path bundles + a clever `<link rel="prefetch">` for the MediaPipe face-landmarker WASM and `.task` model — keeps the face-capture screen from stalling 1–2 s on first paint. Comment block in the HTML explains *why*. This is exactly the level of "design + perf" thinking I want to see and it's invisible to the user, which is the point.
- CSP includes `script-src 'unsafe-eval' 'wasm-unsafe-eval'`. Necessary for ONNX runtime; correct trade-off, but worth noting that you will fail a strict-CSP scanner at e.g. Mozilla Observatory. Defensible in the security write-up; mention it on the security page.

What the user sees post-bundle:
- `LoginPage.tsx` (1031 LOC). I did not load it visually but the source shows: full-bleed gradient hero, gradient brand-shield, tabbed Email-vs-Magic-Link entry, *Continue with passkey* CTA, language toggle (EN/TR with two-letter chip — nice touch), light/dark toggle, FIVUCSAS wordmark with the violet→iris gradient WebkitBackgroundClip text effect.
- The login page hardcodes `color: '#1a1a2e'` for the form-card background (RegisterPage.tsx:255, also LoginPage). The rest of the app uses `theme.palette.background.paper`. **Issue (P2):** when a user toggles dark mode on the login page, the inputs render dark-on-dark because the override beats the theme. Verify visually; if confirmed, swap to `(th) => th.palette.background.paper`.

**6-second verdict:** Brand impression is "high-end fintech security tool, takes itself seriously." Fast, no layout shift, accessible language pivot. I'd let an enterprise prospect see this.

### 1.2 `verify.fivucsas.com` (cold load, no query params)

What loads:
- HTTP 200 in **111 ms**, **1.8 KB** index. Notably leaner than the admin bundle (separate `dist-verify/` build).
- Title: *FIVUCSAS Verify.* No description, no OG. Robots `noindex, nofollow` (correct — this is a transactional surface).
- Body: just `<div id="verify-root"></div>`. The verify-app SPA reads OAuth params from the URL; with no params it surfaces `t('hosted.missingParams')` inside an error Alert.

**Finding (P1, agent-actionable, S):** A naked GET to `https://verify.fivucsas.com/` is the URL a tenant developer types into their browser to see what they bought. Currently they get a red error alert that says "Missing required parameters." There is no "this is what this surface does," no link to docs, no test-mode button. Stripe, Auth0, Okta, and Keycloak all show a tasteful explainer page in this case ("This page is the FIVUCSAS hosted sign-in. Tenants integrate via the SDK at fivucsas.com/docs"). Two options:

  - **Option A (smaller):** add a `?demo=1` short-circuit in `HostedLoginApp.tsx` that renders a static explainer card with "Try the demo" → links to `verify.fivucsas.com/login?client_id=demo&redirect_uri=...&...`.
  - **Option B (better):** when no query params are present, render an "Integrator landing" with three sections: *What this is* / *Try the demo* / *Read the docs*. Roughly 80 LOC, no design dependency.

The `<title>FIVUCSAS Verify</title>` is also too terse — bookmark-unfriendly. Suggest *FIVUCSAS — Sign in with biometric MFA* (i18n it).

The hosted-login surface itself (`HostedLoginApp.tsx`, lines 449-525) is genuinely well-designed — a "SECURED BY FIVUCSAS" pill chip, tenant-name interpolation in the headline (`t('hosted.signingInTo', { tenant: clientLabel })`), an iris→violet brand mark, ambient radial-gradient background that adapts to dark mode, and a `verify.fivucsas.com` microcopy footer that conveys the origin without screaming. **This is excellent work.** I would point any prospect to it as the best design surface in the platform.

### 1.3 `demo.fivucsas.com`

A faithful Turkish-language Marmara Üniversitesi Bilgi Yönetim Sistemi clone. Two strong design moves:
- It's **fully Turkish** end-to-end — students aren't context-switching to English to evaluate a Turkish product.
- It explicitly tells the visitor what's happening: *"Bu sayfa, FIVUCSAS biyometrik kimlik doğrulamanın bir üniversite BYS'ye nasıl entegre edildiğini göstermektedir."* That micro-explainer is exactly the kind of demo-affordance most B2B platforms forget.

**Finding (P3, S):** the e-Devlet button is currently disabled but visually present. To a Turkish user familiar with e-Devlet this looks broken, not coming-soon. Either remove it or wrap it with a "yakında" badge so it reads as roadmap, not bug. The third lens here (UX trust): a disabled-but-styled button on a security-product demo erodes the "this is real" feeling.

### 1.4 `fivucsas.com` (landing — brand cohesion only)

Loads in **67 ms**, **7.2 KB** index. Three Google Fonts loaded (Inter, Space Grotesk, JetBrains Mono — nice typographic system); SEO fully populated; SoftwareApplication JSON-LD declares Marmara University as `sourceOrganization`, which is a smart trust-signal play. Body class `noise` suggests a textural background overlay.

**Cohesion check across the four surfaces:**
| Surface | Theme color (meta) | Primary brand color in CSS | Typography pairing |
|---|---|---|---|
| `fivucsas.com` (landing) | `#070713` | (couldn't introspect bundled CSS) | Inter + Space Grotesk + JetBrains Mono |
| `app.fivucsas.com` | `#6366f1` | `#6366f1` (violet) primary | Inter + Poppins |
| `verify.fivucsas.com` | (none) | `#6366f1` primary | Inter + Poppins |
| `demo.fivucsas.com` | n/a (mock university site) | n/a | n/a |
| `web-app/public/manifest.json` PWA theme_color | **`#1976d2`** (MUI default blue, not violet) | — | — |

**Finding (P2, XS):** the admin PWA manifest declares a theme color `#1976d2` while the rest of the platform — meta `theme-color`, `theme.ts` `BRAND.violet`, the brand-shield gradient — is `#6366f1`. When a user installs the PWA on Android, the splash screen + tab strip will render in MUI default blue, breaking brand cohesion at the most installable moment. One-line edit in `public/manifest.json`. Same file: `theme_color: '#1976d2' → '#6366f1'`, `background_color: '#ffffff' → '#0f1220'` (or keep light, but match the dark-mode-default).

**Finding (P2, S):** landing uses `Space Grotesk` for display copy; admin + verify use `Poppins`. Both are great fonts but they read differently — Space Grotesk has more geometric, slightly-condensed feeling; Poppins is rounder. A user clicking from the marketing site to the app gets a typographic micro-jolt. Pick one. My recommendation: Poppins everywhere (already loaded in admin, latin-ext supports Turkish). Drop Space Grotesk from landing.

---

## 2. Information architecture

### 2.1 Sidebar inventory (`Sidebar.tsx`)

The sidebar groups 18 entries into 5 categories. Source of truth is `src/config/sidebarPermissions.ts`, with role filtering. Translations resolved via `nav.group.*` and `nav.*` keys. Active route gets a 3-px violet rail (`::before` pseudo-element). Admin-only items get an amber "Admin" chip.

```
Overview      Dashboard
Access        Users · Tenants · Roles · Guests
Security      Auth flows · Auth sessions · Devices · Audit logs · Analytics
Biometrics    Enrollments · Biometric tools · Biometric puzzles · Auth methods testing
Personal      My profile · Settings
```

**Finding (P1, M):** *Biometric tools*, *Biometric puzzles*, and *Auth methods testing* are developer / debug surfaces. The Sidebar code makes them visible to every authenticated user (no admin gating that I can see in the icon map alone — confirm in `sidebarPermissions.ts`). For a tenant-admin from Marmara who logs in expecting to "manage faculty enrollments," seeing three sibling entries called *Puzzles* and *Testing* makes the product feel like a half-finished playground. Recommendations:
  - Move all three behind a single `Developer Tools` collapse, default-collapsed.
  - Gate the collapse on `user.isPlatformOwner()` (or a dedicated `developer-mode` toggle in Settings).
  - Either way, rename: *Auth methods testing* → *Method sandbox*; *Biometric puzzles* → *Liveness puzzles* (it's not the user's biometric they're puzzling).

**Finding (P2, S):** the "Identity · Verified" tagline under the FIVUCSAS wordmark is hardcoded English (`Sidebar.tsx:193`). Same with *All systems operational* — it does pass through `t('sidebar.systemStatus', 'All systems operational')` so the EN string is the *fallback*, but i18n review note: confirm `sidebar.systemStatus` exists in both en.json and tr.json (key parity says yes; double-check the value reads correctly in TR — fallbacks are silent failures).

**Finding (P3, XS):** the sidebar footer status indicator hardcodes a green dot and the text *All systems operational*. There is no actual wire to a status API. If any of the three Hetzner services degrades, the sidebar will reassuringly lie to the user. Either wire it to `status.fivucsas.com` (which is the URL it points at) or remove the live-dot affordance and make it a static "View status" link.

### 2.2 Page-level layout pattern

`DashboardLayout.tsx` does the right things:
- Skip-to-content link (visually hidden until focused, lands on `#main-content`).
- Breadcrumbs from `pathSegments` with UUID-skipping logic and an i18n map. Last crumb is `text.primary`, others `text.secondary`. **Solid.**
- Footer with platform / terms / privacy / version. Version uses JetBrains Mono.
- Ambient radial-gradient page background that adapts to dark mode.

**Finding (P2, S):** there is no consistent `PageTitle` component. `TopBar.tsx` calls `getPageTitle()` (lines 46-66) which does a giant `if (path.startsWith(...))` chain. Add a one-line `<PageTitle/>` lookup that reuses `BREADCRUMB_I18N_MAP` so adding a new page = one map entry, not two. Ten new pages (`face-demo`, `voice-search`, etc.) silently fall through to `t('nav.dashboard')`. Verify by visiting `/face-demo` — top bar will say "Dashboard," not "Face Demo." A user looking at the URL bar and the top bar will see two different page identities.

**Finding (P2, XS):** there is no global "page-level empty state" pattern. List pages render `t('common.noData')` inside a `<Typography>` with no illustration, no CTA, no "create your first X" affordance. `EnrollmentsListPage`, `DevicesPage`, `AuthSessionsPage`, `GuestsPage` all share the same minimal-empty problem. Recommend creating `<EmptyState icon={...} title={...} description={...} action={...}/>` as a `shared/components/` element and adopting it on the 6 list pages. **L** in aggregate but **XS per page** — agent-actionable as a single PR.

### 2.3 Settings page mental model

`SettingsPage.tsx` (603 LOC) splits into Profile / Security / TOTP+WebAuthn enrollment / Sessions / Language. The 10 auth methods are NOT all configurable here — they're configured per-tenant in `AuthFlowBuilderPage` (admin), and per-user enrollment lives in `MyProfilePage`. A user who wants to "turn on fingerprint for myself" has to:
  1. Go to Settings → Security → click *Add a passkey* → WebAuthn dialog.
  2. Or go to MyProfile → see enrolled methods → click into Enrollment.

**Finding (P1, S):** the mental model is fragmented. *Settings* is for account-level toggles, *MyProfile* is for biometric enrollments. The split is correct in principle (settings = data; profile = identity) but the page titles lie about it. Suggest: **rename "MyProfile" to "My Identity & Biometrics"** (`nav.myIdentity` key), or merge the auth-method-enrollment subset *into* Settings under a "Authentication methods" section. Right now a non-technical tenant admin will not find their fingerprint enrollment without a guided tour.

**Finding (P2, S):** the Settings page's removed-features comment (lines 58-65) reads: *"notification toggles … and appearance toggles (dark mode / compact view) were removed from this page — the backend had no storage wired for them."* You shipped the right thing — ghost UI is worse than missing UI — but the page now feels under-stuffed. Add a one-line empty-section helper *"Notification preferences will land in v1.5"* so the absence reads as roadmap, not oversight.

---

## 3. Accessibility (WCAG 2.1 AA target)

### 3.1 What's already good

- Skip-to-content link (`DashboardLayout.tsx:144-164`).
- `aria-current="page"` on the active sidebar item (`Sidebar.tsx:227`).
- `<nav aria-label={t('nav.primary', ...)}>` wraps the drawer.
- `<main id="main-content" tabIndex={-1}>` is keyboard-focusable for the skip link.
- `prefers-reduced-motion` respected in `index.css:51-58` — animations clamp to 0.01 ms when set.
- `prefers-color-scheme: dark` boots the theme (`ThemeModeProvider.tsx:9`).
- `'*:focus-visible'` rule in `theme.ts:278-282` paints a violet 2-px outline on every focusable element. Universal focus indicator. Excellent.
- Tooltip backgrounds use `INK.light[900]` / `INK.dark[200]` against white text — WCAG AAA contrast on tooltips.
- Body `WebkitFontSmoothing: 'antialiased'` + `textRendering: 'optimizeLegibility'`.
- Form inputs get a 3-px violet outline-glow `boxShadow: '0 0 0 3px alpha(BRAND.violet, 0.2)'` on focus (`theme.ts:402-407`). Visible against dark and light. Good.

### 3.2 Findings

**Finding (P1, S, agent-actionable): hardcoded English `aria-label` in 11 locations.** Confirmed via grep: `AppShell.tsx:18` *Loading application*, `App.tsx:130` *Loading page*, `UsersListPage.tsx:194` *Loading users*, `UserDetailsPage.tsx:78` *Loading user details*, `RegisterPage.tsx:445` *Registration form*, `EnrollmentsListPage.tsx:276,285,294` *View details / Retry enrollment / Delete enrollment*, `TopBar.tsx:102,135,157` *Open navigation menu / Toggle language / Toggle dark mode*. A Turkish screen reader user gets read English labels mid-Turkish content. This is exactly the bug the user-feedback rule `feedback_no_hardcode.md` calls out. Replace each with `t('a11y.loadingApp')`, `t('a11y.loadingPage')`, etc. — add 11 keys to en.json + tr.json. **30-minute fix.** *Note this is the single highest-leverage a11y fix in the report.*

**Finding (P2, XS): tooltip-vs-aria-label duplication.** `TopBar.tsx:131-153` wraps a *Toggle language* button in a `Tooltip title={t('settings.language')}` AND gives it `aria-label="Toggle language"`. The visual tooltip is i18n; the screen-reader label is not. They should both be `t(...)`.

**Finding (P2, S): focus-trap missing in dialogs.** Every Dialog in the codebase (TOTP enrollment, WebAuthn enrollment, ChangePassword, ConfirmDialog) uses default MUI focus management, which is correct *if* the trigger is a button. Verify that the WebAuthn-prompt-success dialog has `disableEnforceFocus={false}` — I did not visually confirm. Risk: keyboard user tabs out of the modal mid-WebAuthn ceremony.

**Finding (P2, M): the FacePuzzle / HandGesturePuzzle pages have no a11y story.** `BiometricPuzzlesPage.tsx` is 43 KB of camera-driven interactive content. There is no `<canvas role="img" aria-label="Live face mesh preview">`, no captions, no instructions for screen readers, no fallback for users who decline camera. For a regulated-market vertical (TR healthcare/banking) you will need to either (a) gate the entire surface to "platform owner only" (it already may be) or (b) ship a non-biometric alternative. This is a P2 because if the puzzles are platform-internal QA tools (which they look like), a11y can be deferred. Confirm the gating.

**Finding (P3, XS): color-only state signaling on the sidebar status dot.** The footer status tile has a green dot + the text *All systems operational*. If you ever flip it to amber/red for degradation, the *only* affordance for a colorblind user is the text changing. Add a small icon (CheckCircle / AlertTriangle) inline with the dot.

**Contrast spot-checks (theme tokens):**
| Pair | Hex | Calculated ratio | WCAG AA (4.5:1 for normal text) |
|---|---|---|---|
| `text.primary` `#0f172a` on `bg.paper` `#ffffff` | 16.7:1 | ✅ AAA |
| `text.secondary` `#64748b` on `#ffffff` | 4.74:1 | ✅ AA |
| `text.disabled` `#94a3b8` on `#ffffff` | **2.84:1** | ❌ FAIL — but text.disabled is OK to fail per WCAG 1.4.3 since "disabled" is exempt |
| Dark mode: `text.primary` `#e6e8f3` on `#0f1220` | 13.4:1 | ✅ AAA |
| Dark mode: `text.secondary` `#8f96ae` on `#0f1220` | 5.18:1 | ✅ AA |
| Sidebar admin chip text `#b45309` on amber-tinted bg `#fef5e1` | ~4.6:1 | ✅ AA borderline |
| Primary button text white on `linear-gradient(#6366f1, #8b5cf6)` (midpoint ~`#777ae0`) | 3.6:1 | ⚠️ FAILS for 14-pt regular; passes for 18-pt bold (which buttons are, fontWeight 600). **Borderline.** |

**Finding (P2, XS):** the gradient-primary button is borderline AA. With Inter 600/0.9375rem (`theme.ts:213-215`) it passes the bold-large-text waiver. With smaller text variants it would fail. Fine as-is. Worth a comment on the gradient — if you ever shrink the button text, run a contrast check first.

---

## 4. Internationalization (i18n)

### 4.1 What's good

- **1700 / 1700 key parity** between `en.json` and `tr.json`. No drift. Verified by flat-key diff.
- Date helpers are funnelled through a central `dateFnsLocale(lang)` helper (PR #49, 2026-04-30) — the date-i18n leak in MyProfilePage was already fixed. Nothing to add here.
- Locale resolution in `HostedLoginApp.tsx:64-80` does the right thing: OIDC `ui_locales` → legacy `locale` → `navigator.language` → `'en'`. Most products silently default to English. This is correct.
- `<html lang="en"|"tr">` is dynamically updated on locale change (`HostedLoginApp.tsx:161-162`). Critical for screen readers.
- Language toggle visible on every page (`TopBar.tsx:131-153`) with the EN/TR chip — discoverable.
- The full Turkish translations in en+tr key sets cover error states, button labels, breadcrumbs, accessibility strings.

### 4.2 Findings

**Finding (P1, S — covered by 3.2 above):** 11 hardcoded English `aria-label` strings. This is both an a11y and an i18n finding — same fix.

**Finding (P2, XS): `Identity · Verified` brand tagline (`Sidebar.tsx:193`)** is hardcoded English. Either translate (Turkish: *Kimlik · Doğrulandı*) or — better — make it part of the wordmark image/logotype so it's brand, not text. Decision call: brand taglines are sometimes intentionally not translated (Apple keeps "Think Different" in English worldwide). Fine either way, but make the choice deliberate.

**Finding (P2, XS): `FIVUCSAS Verify` page title** is English regardless of `?ui_locales=tr`. Suggest dynamic title via `useEffect` reading the resolved locale: *FIVUCSAS Verify* / *FIVUCSAS Doğrula*. Two-line fix in `verify-app/index.html`.

**Finding (P3, S): Turkish microcopy idiom check.** I cannot natively grade Turkish, but spot-checking the recently-added section labels per CLAUDE.md ("Kayıtlı Doğrulama Yöntemleri", "Kayıtlı Gün Sayısı") — these are idiomatic and tighter than the previous strings. If you have a native TR reviewer (the user is Turkish — that's you), schedule a one-evening pass through `tr.json` looking specifically at: button verbs (avoid noun+et compounds where possible), error messages (avoid English calques like "Bir şeyler yanlış gitti" — natively Turkish would be *"Bir hata oluştu"* or *"Beklenmeyen bir durum"*), and CTA copy on dialogs.

**RTL readiness:** I checked for `dir=` and CSS logical properties (`margin-inline-*`, `padding-inline-*`). The codebase uses physical-direction CSS exclusively (`mr`, `ml`, `paddingLeft`, etc.) and MUI's `sx` shorthand is also physical. **Not RTL-ready.** That's fine — Turkish + English don't need it. If Arabic/Hebrew ever joins the locale list (Turkey has growing Arabic-speaking user populations in some verticals), expect a 1-week migration: switch all `mr` → `marginInlineEnd`, `ml` → `marginInlineStart`, set `<html dir="rtl">` on Arabic/Hebrew. Note for the roadmap, not an action today.

---

## 5. Component-level UX

### 5.1 Admin dashboard — page-by-page

**`DashboardPage.tsx` (1019 LOC):**
- KPI cards present. *Active Sessions* helperText was added 2026-04-30 (verified at HEAD) — explains why Active Sessions can differ from the audit-log USER_LOGIN count. **Good fix; clear language.**
- Sparkline trends per KPI — visually nice but verify they're not redrawing on every poll tick (a perf-overlay test would catch this).
- 1019 LOC is the warning sign. No P0/P1 design issue but the file is doing too much; same comment as Senior FE review.

**`MyProfilePage.tsx` (1007 LOC):**
- Date-i18n leak was fixed (PR #49). Confirmed at `dateFnsLocale(lang)` usage.
- "Active Sessions" vs "Recent Logins" disambiguation shipped (commit `0654b27`).
- 1007 LOC. Same warning as Dashboard.

**`EnrollmentPage.tsx` (1351 LOC):**
- Per-method enrollment flow. The flow is FaceEnrollmentFlow → VoiceEnrollmentFlow → FingerprintEnrollment → NfcEnrollment → TotpEnrollment → WebAuthnEnrollment, plus dialog wrappers. Component-tree wise, this is correct. The 1351-LOC monolith is a code-quality issue (already being decomposed in T-QUALITY-Q7 per inline comment), but the *user-facing* flow is coherent.
- One thing missing from a UX standpoint: a clear "Why are you asking me to do this?" statement at the start of each enrollment. A user clicking Voice Enrollment wants to know (a) what the recording sounds like to the system, (b) where their voice will be stored, (c) how to delete it. Today the flow opens the camera/mic with a brief *Read this sentence* prompt. Add a 1-screen privacy-and-data preamble before the first capture. (The Privacy page exists at `/privacy` but is not linked from the enrollment flow.) **Finding (P2, S, agent-actionable):** add a `<Disclosure>` block with title "Voice data privacy" and a *Read full policy* link to the first step of every biometric enrollment. KVKK Article 11 right-to-information *de facto* requires this.

**`AuditLogsPage.tsx` (334 LOC):**
- Filter UX exists; pagination via MUI TablePagination (line 322); search by subject, actor, action.
- **Finding (P2, S):** no saved-filter / no URL-shareable filter. An auditor wanting to share "all login failures yesterday" with another admin can't paste a URL. Wire filter state into `useSearchParams` so `/audit-logs?action=LOGIN_FAILURE&dateFrom=2026-05-03` is a sharable bookmark.
- Empty-state when filters return nothing: just `t('common.noData')` text. Replace with EmptyState (cf. §2.2).

**`DevicesPage` vs `AuthSessionsPage`:**
- *Devices*: physical/persistent (a registered passkey, an NFC card, a fingerprint reader binding).
- *Auth Sessions*: temporal/active (a JWT-backed login session that can be revoked).
- A non-technical admin will conflate these. Suggest top-of-page descriptor `t('devicesPage.descriptor', 'Hardware and biometric registrations bound to this user')` + `t('authSessionsPage.descriptor', 'Active login sessions — revokable in real time')`. Two i18n keys.

**Notification panel (`NotificationPanel.tsx`, 525 LOC):**
- Polling-pause-on-document-hidden was shipped 2026-04-30 (verified). Good battery-and-bandwidth hygiene.
- **Finding (P3, XS):** the bell icon should show a state badge when *new* (unseen) notifications arrive vs *unread* (seen but not clicked) — currently those are indistinguishable. Compare Slack/Linear which use a dot for unread and a number for unseen. Two states, one visual differentiation.

### 5.2 Verify widget — the integrator + end-user view

**Embed flow for a third-party site (`@fivucsas/auth-react` SDK):**
- API surface (`verify-app/sdk/FivucsasAuth.ts:382`): `loginRedirect({ redirectUri, scope, state, nonce, display })`. Clear, concise. Returns `Promise<void>`. PKCE handled internally (Web Crypto required at line 387).
- React: `<FivucsasProvider><VerifyButton onSuccess={...}/></FivucsasProvider>`. Sensible.
- DeveloperPortalPage shows a code snippet at line 260: `FivucsasAuth.init({...})`.

**Finding (P0, M, agent-actionable):** the developer-portal page is gated behind admin auth (`/developer-portal` in `App.tsx:225` is inside `<DashboardLayout>`). A prospective tenant developer cannot see the SDK docs without being onboarded as an admin. **This is a self-serve gap dressed up as a routing decision.** Move the SDK docs to a **public** route — `/developer-portal` should be reachable from the landing site, with no auth, plus a "Try in sandbox" button that uses a public `client_id=demo` allowlisted by the API. Pair this with the verify.fivucsas.com integrator-landing fix (§1.2) for one coherent developer-onboarding story.

**Step-by-step auth flow micro-interactions:**
- `LoginMfaFlow` orchestrates step components from `features/auth/components/steps/`: `PasswordStep`, `EmailOtpStep`, `SmsOtpStep`, `TotpStep`, `QrCodeStep`, `FaceCaptureStep`, `FingerprintStep`, `VoiceStep`, `NfcStep`, `HardwareKeyStep`.
- `StepProgress.tsx` renders a multi-step indicator. Combined with the headline "Signing in to {tenant}", this surface communicates progress well.
- **Finding (P2, S):** there is no estimated-time indicator. A user about to do face + voice + TOTP doesn't know whether this will be 30 s or 3 min. Add `t('mfa.estimatedTime', '~{seconds}s')` next to the step indicator based on a per-method baseline (face=10s, voice=15s, TOTP=8s, NFC=20s).
- **Finding (P2, S): error-state recovery paths.** Verified by reading `formatApiError.ts` and step components: errors surface through `t()` keys but the recovery option is generally just "Retry." Add per-method recovery: face camera-denied → "Use a different device" link to QR-code login. NFC scanner unavailable → fallback to Document upload. Voice mic-denied → SMS OTP. The MFA chain should *degrade gracefully*, not dead-end.
- **Liveness UX (passive mode):** per CLAUDE.md, `/verify` uses `LIVENESS_BACKEND=uniface` + `LIVENESS_MODE=passive`. The user sees only a face-capture frame; no blink-and-smile prompts. **Finding (P3, XS):** add a single-line privacy disclosure at the bottom of the face-capture card: *"This sign-in includes a passive liveness check. No recording is kept after verification."* — KVKK Art. 11 affordance + reassures privacy-conscious users. ~10 LOC + 2 i18n keys.

**Mobile responsiveness (375×667, iPhone SE):**
- Verified the layout hooks: `pt: { xs: 3, sm: 7 }`, `px: { xs: 2, sm: 3 }`, brand mark 44×44 (good thumb-target), Paper `maxWidth: 480`. Should fit comfortably on 375 wide.
- The admin dashboard sidebar is `display: { xs: 'none', md: 'block' }` desktop-only, with a hamburger drawer on mobile (`Drawer variant="temporary"`). Mobile menu button is `aria-label="Open navigation menu"` (hardcoded English — covered by the §3 finding).
- TopBar collapses from 64 to 56 px height on xs. Good.
- **Finding (P2, S):** the FaceCaptureStep camera viewport at 375 wide is squeezed — the ML quality threshold is calibrated to ~640×480. Verify the face-detection accuracy doesn't degrade on iPhone SE width. Engineering issue masquerading as UX, but it manifests as "face capture works on desktop, fails on phone." Worth instrumenting.

---

## 6. Performance perception

Bundle audit (`/opt/projects/fivucsas/web-app/dist/assets/`):
- `onnx-vendor`: 532 KB
- `mui-core`: 518 KB
- `recharts-vendor`: 417 KB
- `container`: 378 KB
- `dist-D0CNNh4B`: 350 KB (likely the main page bundle)
- `dist-Dih3rL_y`: 251 KB
- `vision_bundle`: 134 KB (MediaPipe)
- `EnrollmentPage`: 49 KB (lazy-chunked correctly)
- `BiometricPuzzlesPage`: 44 KB (lazy-chunked)

**Finding (P2, M):** the recharts-vendor 417 KB lands on the dashboard critical path because `DashboardPage` and `AnalyticsPage` both render charts. Consider:
  - Replace recharts with `chart.js` + `react-chartjs-2` (~120 KB) for the dashboard, keep recharts for the dedicated Analytics page.
  - Or lazy-load `<Sparkline>` only after the KPI cards are interactive.
  Engineering already noted this in FRONTEND_REVIEW_2026-05-01.md; UX angle: dashboard time-to-interactive on 3G is meaningfully degraded by recharts. Spec it.

**Finding (P2, S):** `container.js` 378 KB is the InversifyJS DI bundle. That's a lot of bytes for a SPA whose user-facing benefit is "we have a clean dependency-injection layer." Consider a tree-shake pass or moving to a lighter-weight DI (e.g. `tsyringe` is smaller). Don't pay for clean architecture in user wait-time.

**Skeletons / loading states:**
- 14 `<Skeleton>` references in the codebase. Reasonable coverage for an app this size.
- The login page uses `<CircularProgress aria-label="Loading application"/>` for boot — fine.
- Page-transition uses MUI defaults; no global Suspense skeleton on lazy-loaded routes. Consider a single `<RouteSkeleton/>` showing the page header + content blocks for ~200 ms-perceived improvement.

**MediaPipe assets:**
- `<link rel="prefetch">` for the WASM and `.task` files in `index.html:41-43`. Cache headers are best-effort (jsdelivr CDN, you don't control). Comment block in HTML explains the version-pin discipline. Good.

---

## 7. Error states + edge cases

Verified items already shipped at HEAD:
- VitePWA `navigateFallback: '/index.html'` + `cleanupOutdatedCaches` (PRs #9, #10) — kills stale-shell 404s.
- ErrorBoundary applied per-route in `App.tsx`: 22 occurrences. Good coverage.
- `formatApiError(err, t)` centralizes HTTP error → i18n message mapping (per `web-app/CLAUDE.md`).

**Finding (P2, S): no top-level offline banner.** When the SPA detects `navigator.onLine === false`, there's no banner. PWA still serves the cached shell, but API calls will fail with the generic "network error." Add a top-bar warning chip + retry button when offline. ~30 LOC.

**Finding (P2, M): session-expired redirect is jarring.** When the JWT expires mid-session, the next API call 401s and the AuthInterceptor (verify in `core/repositories/`) likely full-page-redirects to `/login`. Better: capture the *current* URL, pop a "Your session expired — please sign in again" modal with a "Continue" button that re-auths via the embedded `LoginMfaFlow` and returns to the same page. Stripe and GitHub do this; it preserves form state. **High user-frustration delta.**

**Finding (P3, XS): camera/mic denied recovery.** Verified that step components surface "permission denied" as an error string. Add a one-step recovery card with browser-specific instructions (Chrome: site-settings link; Safari: System Settings → Privacy). Common pattern, well-documented.

---

## 8. Microcopy

### 8.1 Tone

The dominant voice is *professional but approachable*. Login: *"Welcome back to FIVUCSAS"*; verify: *"Signing in to {tenant}"*; dashboard cards: short factual labels. No jargon-on-jargon. No "synergy." No "delight."

The codebase already uses good action-verb buttons: `t('common.save')` = "Save changes" / "Değişiklikleri kaydet", not "OK." Confirmation dialogs use `ConfirmDialog.tsx` with explicit verb (`Delete`, `Revoke`, `Disable`). Good.

### 8.2 Findings

**Finding (P3, XS):** the topbar reads `topbar.lightMode` / `topbar.darkMode` for the mode-toggle tooltip. Suggest *Switch to light theme* / *Switch to dark theme* — slightly more action-oriented than the noun phrase.

**Finding (P3, XS):** the sidebar systemStatus is *"All systems operational"* — passive voice + corporate. *"Everything's running"* (EN) / *"Tüm sistemler çalışıyor"* (TR) is warmer and shorter. Trivial change but matches the rest of the platform's voice better.

**Finding (P2, S): error messages are blame-neutral but un-actionable.** Examples observed in `formatApiError.ts`:
- 401 → *"Authentication required."* — should be *"Please sign in again."*
- 403 → *"You don't have permission for this action."* — should add *"Contact your tenant administrator if you think this is wrong."*
- 5xx → *"Server error."* — should be *"Something went wrong on our side. Please try again in a minute."* + a small "Report" link that pre-fills a support email with the request ID (which we already log).

Generally: every error message should answer "what should the user do next?" An "internal server error" with no recovery path is a dead-end.

---

## 9. Visual design

### 9.1 Spacing rhythm

Audited `theme.ts:255-258`:
```
'--app-radius-sm': '8px'
'--app-radius-md': '12px'
'--app-radius-lg': '18px'
'--app-radius-xl': '24px'
```
Border radius is consistent. Spacing in components uses MUI's 8-px grid via `sx={{ p: 1.5, gap: 1.25, mb: 2.5 }}` — consistent multiples.

### 9.2 Typography scale

Defined at `theme.ts:165-216`:
- h1 40 / h2 32 / h3 26 / h4 22 / h5 18 / h6 16
- subtitle1 16 / subtitle2 14 / body1 15 / body2 14 / button (no size, weight 600) / caption 12 / overline 11

Solid 8th-root proportional scale. Letter-spacing decreases with size (h1 -0.032em → h6 -0.005em). Pro pattern.

### 9.3 Iconography

`@mui/icons-material` exclusively. 18 icon imports in Sidebar alone. Consistent line-weight, no mixing of styles.

### 9.4 Dark mode

- Toggle in `TopBar.tsx:157` (with `aria-label="Toggle dark mode"` — i18n bug per §3).
- Boot detection via `prefers-color-scheme: dark`.
- All MUI components have explicit dark-mode variants in `theme.ts` overrides.
- Surface tokens: `bg.default #0f1220`, `bg.paper #1a1f33`, text on top `#e6e8f3` — 13.4:1 contrast.

**Finding (P3, XS):** there's no system-default-track option. Once a user toggles, it sticks (presumably via localStorage). Add a third state: System / Light / Dark, like macOS. Three-position toggle. Helps users whose OS auto-darkens at sunset.

### 9.5 Motion

Buttons: `transform: translateY(-1px)` on hover, `0` on active. Card: `transform`, `box-shadow`, `border-color` transition 0.18-0.30 s. All clamped by `prefers-reduced-motion`. **Best-in-class.**

**Finding (P3, XS): page transitions.** `PageTransition.tsx` exists in `components/animations/` but verifying it's actually used on lazy-loaded routes — the routes go through `<Suspense fallback={<CircularProgress/>}>`. Suggest a fade-in on Outlet mount (`<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.15 }}>`) so the page swap feels intentional, not abrupt. Reduced-motion users get the fallback.

---

## 10. Findings summary, prioritized

### P0 — broken / blocks task

| # | Finding | Path / route | Fix | Effort | Agent? |
|---|---|---|---|---|---|
| P0-1 | DeveloperPortal + WidgetDemo gated behind admin auth — prospective tenant developers cannot evaluate the SDK without being onboarded | `web-app/src/App.tsx:225,224` (routes inside `<DashboardLayout>`) | Move `/developer-portal` and `/widget-demo` to `/public/*` routes; add a public sandbox `client_id=demo`; pair with §1.2 fix | M | Yes |

### P1 — significant friction

| # | Finding | Path / route | Fix | Effort | Agent? |
|---|---|---|---|---|---|
| P1-1 | `verify.fivucsas.com` cold-load shows red "Missing parameters" alert instead of an integrator-landing | `web-app/src/verify-app/HostedLoginApp.tsx:179-183` + `verify-app/index.html` | Render an Integrator Landing card on no-query-params; link to docs and demo | S | Yes |
| P1-2 | 11 hardcoded English `aria-label` strings — Turkish screen-reader users hear English mid-content | 11 files (see §3.2) | Replace with `t('a11y.*')` keys; add 11 keys to en.json + tr.json | S | Yes |
| P1-3 | Sidebar exposes `Biometric tools` / `Biometric puzzles` / `Auth methods testing` to all users — looks like a half-finished playground to a tenant admin | `web-app/src/components/layout/Sidebar.tsx` + `config/sidebarPermissions.ts` | Group into a "Developer Tools" collapse, gate on `isPlatformOwner()` | M | Yes |
| P1-4 | "MyProfile" vs "Settings" mental model is fragmented — biometric enrollment hides under MyProfile | `web-app/src/pages/MyProfilePage.tsx` + `SettingsPage.tsx` | Rename "My Profile" → "My Identity & Biometrics" (or merge enrollment section into Settings) | S | Yes |

### P2 — polish

| # | Finding | Path / route | Fix | Effort | Agent? |
|---|---|---|---|---|---|
| P2-1 | PWA manifest theme_color is `#1976d2` (MUI default), should be `#6366f1` (brand) | `web-app/public/manifest.json` | One-line edit | XS | Yes |
| P2-2 | Landing uses Space Grotesk for display; admin/verify use Poppins — typographic micro-jolt across surfaces | `landing-website/index.html` | Drop Space Grotesk; standardize on Poppins | S | Yes |
| P2-3 | `LoginPage`/`RegisterPage` hardcode `color: '#1a1a2e'` overriding theme — risk of dark-mode contrast bug | `web-app/src/features/auth/components/LoginPage.tsx, RegisterPage.tsx:255,260` | Swap to `theme.palette.background.paper` | XS | Yes |
| P2-4 | No consistent `<PageTitle/>` component; `TopBar.getPageTitle()` if-chain misses pages (face-demo etc.) | `web-app/src/components/layout/TopBar.tsx:46` | Reuse `BREADCRUMB_I18N_MAP` for page titles | S | Yes |
| P2-5 | No EmptyState pattern on list pages — text-only "No data" feels unfinished | 6 list pages (Audit, Devices, AuthSessions, Guests, Enrollments, Verification) | Build `<EmptyState/>` in `shared/components/`; adopt on 6 pages | M | Yes |
| P2-6 | No saved/sharable filter on AuditLogs | `web-app/src/pages/AuditLogsPage.tsx` | Wire filters into `useSearchParams` | S | Yes |
| P2-7 | Devices vs AuthSessions — labeling doesn't disambiguate physical-vs-temporal | `web-app/src/pages/DevicesPage.tsx, AuthSessionsPage.tsx` | Add `*.descriptor` i18n key to each page header | XS | Yes |
| P2-8 | No estimated-time indicator on multi-step MFA | `web-app/src/verify-app/LoginMfaFlow.tsx`, `StepProgress.tsx` | Add per-method baselines + display | S | Yes |
| P2-9 | Error recovery paths are "Retry only" — should degrade gracefully | step components | Add fallback CTAs per-method (camera-denied → QR; mic-denied → SMS OTP) | M | Yes |
| P2-10 | Session-expired = full-page redirect to /login — preserves no form state | `core/repositories/HttpClient.ts` interceptor | Modal re-auth instead, returning to current URL | M | Yes |
| P2-11 | No biometric data privacy disclosure at start of enrollment flow (KVKK Art. 11) | `EnrollmentPage` and per-method enrollment components | Add `<Disclosure>` block + Privacy Page link on first step | S | Yes |
| P2-12 | `recharts-vendor` 417 KB on dashboard critical path — slow on mobile/3G | `web-app/src/features/dashboard/components/DashboardPage.tsx` | Either swap dashboard to chart.js or lazy-load `<Sparkline>` | M | Yes (eng-y) |
| P2-13 | `container.js` (InversifyJS) 378 KB — heavy DI footprint | `web-app/src/core/di/` | Tree-shake or migrate to lighter DI | M | No (eng decision) |
| P2-14 | No global offline banner; offline = generic API errors | `web-app/src/AppShell.tsx` | Add `useOnlineStatus` hook + banner | S | Yes |
| P2-15 | Settings page has empty-feeling "removed Notification toggles" — surface as roadmap, not absence | `web-app/src/pages/SettingsPage.tsx:58-65` | Add 1-line "Coming in v1.5" placeholder | XS | Yes |
| P2-16 | Tooltip-vs-aria-label duplication on TopBar buttons (one i18n, one not) | `web-app/src/components/layout/TopBar.tsx:131-153` | Use the same `t()` key for both | XS | Yes |
| P2-17 | Settings → "Identity · Verified" tagline hardcoded English | `web-app/src/components/layout/Sidebar.tsx:193` | Either translate or treat as brand image | XS | Yes |
| P2-18 | Error messages lack actionable next steps ("Server error" → no path forward) | `web-app/src/utils/formatApiError.ts` | Rewrite all error strings to "what next?" voice | S | Yes |
| P2-19 | Dialog focus-trap not explicitly verified — risk of WebAuthn ceremony tab-out | All Dialog usages (TOTP, WebAuthn, ChangePassword) | Audit all `<Dialog>` props; ensure `disableEnforceFocus={false}` | S | Yes |
| P2-20 | Borderline AA contrast on gradient-primary button at small text (currently passes via 14-pt-bold waiver) | `theme.ts:316-320` | Document the constraint; don't shrink button text | XS | No (acknowledge) |

### P3 — delight / nice-to-have

| # | Finding | Path / route | Fix | Effort |
|---|---|---|---|---|
| P3-1 | Add `<EstimatedTime>` ("~30s") next to MFA step indicator | `verify-app/StepProgress.tsx` | per-method baseline | XS |
| P3-2 | NotificationPanel: differentiate unseen vs unread (dot vs number) | `components/NotificationPanel.tsx` | two-state badge | S |
| P3-3 | Add System / Light / Dark three-state theme picker | `app/providers/ThemeModeProvider.tsx` | track `prefers-color-scheme` live | S |
| P3-4 | Sidebar status dot lies — wire to actual status API or remove the live affordance | `Sidebar.tsx:307-340` | wire or remove | S |
| P3-5 | Demo: replace disabled e-Devlet button with "yakında" badge | `demo.fivucsas.com` (`landing-website/...`?) | one-line | XS |
| P3-6 | Page-transition fade-in on Outlet mount | `DashboardLayout.tsx:200` | wrap Outlet with motion.div | XS |
| P3-7 | Liveness microcopy disclosure on face-capture card ("Passive liveness check; nothing recorded") | `FaceCaptureStep.tsx` | 10 LOC + 2 i18n keys | XS |
| P3-8 | Sidebar systemStatus copy: warmer voice ("Everything's running") | en.json + tr.json | string change | XS |
| P3-9 | Topbar light/dark tooltip text more action-oriented ("Switch to light theme") | `TopBar.tsx:156` | i18n | XS |
| P3-10 | Add color-independent state icon to sidebar status (CheckCircle/AlertTriangle next to dot) | `Sidebar.tsx:325-327` | one icon | XS |
| P3-11 | Add `<Disclosure>` privacy block at start of every enrollment with KVKK linkage | enrollment flows | reusable component + 6 invocations | S |

---

## What FIVUCSAS already does well — don't lose this

I want to be specific about what is genuinely high-craftsmanship in this codebase, because it's easy to send a finding-list and miss the substrate.

1. **The `theme.ts` design system is professional grade.** The 9-stop ink scale (light + dark), the calibrated 25-step shadow ramp with light-vs-dark variants, the `'--app-radius-*'` CSS custom-properties exposed for non-MUI consumers, the typographic letter-spacing-by-size rule, the accent-button gradient with inset highlight (`inset 0 1px 0 rgba(255,255,255,0.12)`) — none of this is automatic. Someone *thought* about the system. Keep it.

2. **The HostedLoginApp shell** (the white card with the "SECURED BY FIVUCSAS" pill, the tenant-name interpolation, the radial-gradient ambient backdrop) is the prettiest single screen in the platform. If you commission a marketing screenshot or a Product Hunt hero, use this surface, not the dashboard.

3. **`prefers-reduced-motion` honored, `prefers-color-scheme` respected, skip-to-content link, focus-visible universal outline, breadcrumbs everywhere, perfect i18n key parity, full Turkish translation, dynamic `<html lang>`, OIDC `ui_locales` resolution** — that's a half-dozen accessibility wins that 90% of B2B SaaS skips. Do not regress these.

4. **The `dist-verify/` separate bundle** for `verify.fivucsas.com` (1.8 KB index vs 8.1 KB for admin) is the right call — keeps the embed path lean. This is architecture-as-design.

5. **The MediaPipe `<link rel="prefetch">` discipline** in `index.html:41-43` — including a 6-line *why* comment about the version pin needing to match `MEDIAPIPE_VERSION` in `config/cdn.ts` — is exactly the kind of "design includes the loading experience" thinking that distinguishes a real product from a hacky one.

6. **`prefers-color-scheme` boot detection** in `ThemeModeProvider.tsx:9` — most apps default to light and force the user to discover dark mode. FIVUCSAS reads the OS hint. Small thing, big tell.

7. **The breadcrumb `BREADCRUMB_I18N_MAP` pattern** with UUID-skipping at line 85 of DashboardLayout. Every deep-route URL gets a sane crumb trail; UUID segments are silently elided. Quietly excellent.

---

## Process & disciplines for the next round

For the next quarterly UI/UX pass:

- **Run an axe-core / Pa11y CI step on the staged dist before each Hostinger deploy.** Most a11y regressions are introduced silently. Already a P2 in DEVOPS lens.
- **Visual regression**: add a Playwright + screenshot-diff job covering the 12 most-trafficked pages. Catches the "RegisterPage hardcoded `#1a1a2e`" class of bug at PR time.
- **Tenant-developer dogfooding**: pick one external developer (a Marmara senior, a friend), give them only the public marketing site + verify.fivucsas.com URL, ask them to integrate the widget against a localhost OAuth client. Time it. Watch the screen-share. The questions they ask = your P0 doc gaps.
- **TR microcopy review**: 1-evening pass through `tr.json` with a native-speaker eye for verb forms and idiomatic phrasing.

---

## Closing

FIVUCSAS is a tool a serious customer can buy and use. The product is past prototype, the design system is past brand-color-picker, the codebase shows recurring "I considered this" decisions in inline comments. The 35 findings here are not a referendum — they're the next-9-months sanding pass on something that's already shipping. The two findings that matter most this quarter are P0-1 (open the developer portal to non-admins) and P1-2 (kill the 11 hardcoded English aria-labels). Everything else can be batched into a 2-week design-polish sprint and shipped as one PR train.

— Senior UI/UX
2026-05-04
