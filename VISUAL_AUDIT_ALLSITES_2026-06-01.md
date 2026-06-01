# FIVUCSAS — All-Sites Visual / UX Audit

**Date:** 2026-06-01
**Surfaces audited (all HTTP 200):** fivucsas.com (landing) + /poster/, verify.fivucsas.com (hosted login), app.fivucsas.com (dashboard login), links.fivucsas.com (hub), amispoof.fivucsas.com, docs.fivucsas.com (+ /biometric /identity /sdk), status.fivucsas.com. **demo.fivucsas.com is covered separately** in `DEMO_FIVUCSAS_AUDIT_2026-06-01.md`.
**Method:** one headless-Chrome inspector per surface — desktop (1440px) + true mobile (390px **CDP device emulation**, not `--window-size` which clamps to ~500px), full-page screenshots Read back visually, horizontal overflow measured from the DOM (`scrollWidth` vs `innerWidth`), plus console/network capture and launcher/toggle interaction. Each agent inspected only public/pre-auth UI; no credentials were entered.

---

## Cross-cutting themes (fix these once, fix them everywhere)

These recur across multiple surfaces and are the highest-leverage fixes.

### CC-1 — EN/TR localization is half-wired platform-wide *(the #1 "unfinished" tell)* — **HIGH**
The global EN/TR toggle is prominent, but it **silently no-ops on most surfaces**, and the one Turkish-university tenant gets an English-only login:
- **verify.fivucsas.com** (Marmara hosted login): `lang="en"`, English-only, **no toggle at all** — Marmara is a Turkish institution. Real localization gap.
- **app.fivucsas.com** login: `lang="en"`, no language control.
- **docs.fivucsas.com**: the toggle exists but **only the home page has Turkish content** — `/sdk`, `/biometric`, `/identity` have zero TR, so toggling does nothing on 3 of 4 pages.
- **/poster/**: hardcoded mixed EN+TR, ignores the global toggle.
- **amispoof.fivucsas.com**: English-only, no toggle/launcher present.
- **demo callback.html**: unlocalized (see demo doc).
**Fix:** decide the policy and make the control honest — either provide real EN+TR strings on a surface, **or hide/disable the toggle where there is no TR variant**. A persistent control that does nothing reads as broken. Prioritize giving the **Marmara login** a Turkish option.

### CC-2 — Shared launcher is inconsistent / CSP-blocked across sites — **HIGH**
The `<fivucsas-launcher>` app-switcher is rolled out unevenly:
- **CSP-blocked** (script never loads) on **verify.fivucsas.com** and on demo's **callback.html** — both omit `https://app.fivucsas.com` from `script-src`.
- **Absent entirely** on **amispoof.fivucsas.com** (DOM scan finds none).
- **Cache-bust version drift:** docs loads `launcher.js?v=2026-05-28` while landing/demo/etc. use `?v=2026-05-29`.
- Works correctly on landing, dashboard, links (its own controls), docs home, status.
**Fix:** add `https://app.fivucsas.com` to `script-src` everywhere the launcher is referenced (Traefik edge CSP and/or each SPA's `index.html`/meta); add the launcher to amispoof (or decide it's standalone); unify the `?v=` cache-bust.

### CC-3 — Heavy MediaPipe FaceLandmarker WebGL graph initializes on the pre-auth login — **MEDIUM**
Both **app.fivucsas.com** and **verify.fivucsas.com** logins (shared web-app code) spin up the MediaPipe `face_landmarker_graph` / WebGL context on page load — **before any face factor is selected** (console: "Graph successfully started running"). It contributes to a near-blank first paint on app `/` and wastes CPU/battery for users who only type an email.
**Fix:** lazy-load the face-landmarker graph only when a FACE step is actually chosen; it should not run on the email/password screen.

### CC-4 — Internal details leak onto public surfaces — **HIGH (status) / decision (docs)**
- **status.fivucsas.com (HIGH):** the "Identity API" monitor renders a **clickable public link to the internal Docker address** `http://identity-core-api:8080/actuator/health` (internal hostname + port + actuator path). Fix: in Uptime Kuma, turn **off "Show URL on status page"** for that monitor (`sendUrl:0`) — as already done for others. The monitored URL itself can stay.
- **docs.fivucsas.com/biometric (decision):** publishes the **complete Swagger API surface of the internal-only biometric microservice** (proctoring, embeddings, webhooks, admin) on a public domain — and the page's own banner says the service is "not publicly accessible." Decide whether to gate/remove it.

### CC-5 — Personal email addresses in public DOM — **LOW–MED**
- **links.fivucsas.com:** two personal addresses as plaintext `mailto:` (`ahmetabdullahgultekin@gmail.com`, `ahmet.abdullah@marun.edu.tr`) + 2 more `@marun.edu.tr` student emails — harvestable for spam.
- **verify.fivucsas.com:** `rollingcat.help@gmail.com` ships in the page DOM (footer/marketing).
**Fix:** use a branded support address (e.g. `info@`/`support@fivucsas.com`) on production surfaces; the personal Gmail in particular is a judgment call on a public IdP.

---

## Per-surface findings

### fivucsas.com — landing ✅ production-clean
- Launcher + global EN/TR toggle both work end-to-end (page + launcher panel switch to Turkish; diacritics correct); Turkish names render with no mojibake; mobile reflows to a single column; "10 auth methods" is internally consistent; zero console errors / failed requests / real overflow.
- **LOW** — scroll-reveal animations leave the page looking *empty* for any view that doesn't scroll (sections start at `opacity:0`, stat counters frozen at `0`/`0+`). Affects social-card/print/screenshot bots and deep-link-no-scroll visitors. Fix: respect `prefers-reduced-motion`, reveal elements already near the viewport on load, and start counters at their final value when animation is disabled.

### fivucsas.com/poster/
- **HIGH** — **dotted-İ on English text.** The wrapper is `lang="tr"` + `text-transform:uppercase`, so under the Turkish locale `i→İ` and English labels render as **VİEW · DOWNLOAD · SHARE**, **LİVE · İNTERACTİVE**, **BİOMETRİC**, **LİNES OF CODE**, **DATABASE MİGRATİONS**, **SUGGESTED CİTATİON**, etc. Embarrassing on an academic artifact; single-line locale fix. Fix: scope `lang="en"` to the uppercased English elements (or a `:lang(en)` exception) — do **not** remove `text-transform`, the design relies on it.
- **MED** — page mixes EN+TR within the same components and **does not honor the global EN/TR toggle** (hardcoded bilingual). Fix: honor the language event with full EN+TR strings, or make one language internally consistent per render.
- **LOW** — "~691k LINES OF CODE" reads as an overclaim for a 3-person capstone (likely includes generated/vendored code). It is sourced ("from POSTER_BRIEF.MD, file:line cited") but an examiner may read it as inflated — consider qualifying ("incl. generated") or showing hand-written LOC.
- Clean: the A0 poster PNG is high-quality (`3179×4494`, true A0 aspect, sharp), the embedded HTML poster renders legibly and professionally, facts grid aligned, proper citation block.

### verify.fivucsas.com — hosted login *(most UX-critical surface)*
- **HIGH** — **login flow is unstable.** Marmara renders two materially different first screens depending on load timing: **identifier-first** ("Step 1 of 2", email-only) vs **combined credentials** (email + password together, no step counter). Observed flipping mid-audit (the documented `engineActive` identifier-first canary). A returning user sees a different login on different visits. Fix: pin Marmara to **one** flow; gate canary flips behind a stable cohort, not a global/TTL flip.
- **HIGH** — launcher **CSP-blocked** (`app.fivucsas.com` missing from `script-src`). See CC-2.
- **MED** — English-only for a Turkish tenant (see CC-1).
- **MED** — MediaPipe graph on the credentials step (see CC-3).
- **MED** — email & password inputs lack `name` and `autocomplete` → **password managers won't autofill or offer to save**; email input also has no `aria-label`/`placeholder` (relies only on the floating label). Fix: add `name`/`autocomplete="email"`/`autocomplete="current-password"`. *(Note: app.fivucsas.com's login DOES set `autocomplete="email"` — the two login surfaces are inconsistent.)*
- **LOW** — `favicon.ico` → 404 (blank tab icon); personal Gmail in DOM (CC-5); no dark theme (not a defect — means the historical black-on-dark MFA-input contrast bug can't occur here).
- Clean: form renders fully (email, password w/ show-hide, passkey option), no overflow, coherent branding ("Signing in to Marmara University", "SECURED BY FIVUCSAS"); the bare `/login` (no client_id) degrades gracefully to a tidy "Hosted Sign-In Surface" explainer card.

### app.fivucsas.com — dashboard login ✅ ship-quality
- **MED** — login form **reflows/grows** from identifier-first (Email + Continue) to the full password form (+ Password + Forgot + passkey) after login-config resolves — a visible layout shift/FOUC. Fix: reserve the final height (skeleton/min-height) or defer first paint until config resolves.
- **MED** — root `/` shows a near-blank early paint tied to the MediaPipe graph initializing on login (see CC-3).
- **LOW** — no EN/TR control on the login screen (the bottom-right widget is the app-switcher, not a language toggle) — design decision to confirm.
- Clean: renders fully; consistent purple-gradient branding; proper `<label for>` + `type=email` + `autocomplete=email` + password show/hide; mobile `scrollWidth==innerWidth` (no overflow); no console errors / failed requests; valid `favicon.svg`.

### links.fivucsas.com — hub ✅ polished
- **LOW–MED** — personal/student emails in plaintext `mailto:` (CC-5).
- **LOW** — confirm `/favicon.svg` ships 200 (hero uses a CSS monogram so the page never visually depends on it, but a 404 favicon is a minor tell); footer "Spring 2025–2026" date phrasing — confirm it's the intended two-semester (CSE4297/4298) span.
- Clean: custom-branded dark navy + cyan/gold, IBM Plex, consistent SVG icon set (none broken), working TR/EN toggle with no FOUC, all 14 tiles active/styled (no dead "coming soon" tiles), Ayşenur Arıcı's LinkedIn slug correctly percent-encoded, Swagger tile honestly labeled "gated/kısıtlı", no typos/mojibake, no real overflow.

### amispoof.fivucsas.com ✅ professional
- **MED** — **no shared launcher and no EN/TR toggle** present (DOM scan finds neither) — diverges from the other public sites (see CC-1/CC-2). Decide: add the launcher, or accept it as deliberately standalone.
- **LOW** — emoji-prefixed toolbar buttons (💡 🎛 🎤 ✋ ⏺ ▶ 📊 ↓) — the one "amateur tell" amid an otherwise restrained UI; emoji rendering varies by OS. Optional: monochrome icon set.
- **LOW** — attack-category percentages render in **alarm-red even at 0%** while idle (red usually = danger); use neutral/grey for 0%/idle.
- **LOW** — label casing from enum keys: "Mask 3d" → should be "Mask 3D", "Ar Filter" → "AR Filter".
- Clean: renders a coherent, professional lab UI even with no camera (graceful "Click Start to enable camera" placeholder, idle readouts, JSON tucked behind a disclosure — no raw debug leak); no console errors / failed model fetches; no overflow/mojibake; **no overclaiming** (honest AUC values, "runs entirely client-side" messaging).

### docs.fivucsas.com (4 pages)
- **HIGH** — **template/branding split:** `/` and `/sdk` are bespoke on-brand dark pages; `/biometric` and `/identity` are **stock Swagger UI** with different header/typography/interaction. Clicking from the polished landing into "Identity Core API" lands on a visibly different tool. Fix: theme Swagger to the brand palette or wrap all four in one shell with a shared top bar.
- **HIGH** — EN/TR toggle is a **dead control on 3 of 4 pages** (only home has TR content) — see CC-1.
- **MED** — `https://docs.fivucsas.com/biometric` **301-redirects to `http://…`** (plaintext scheme in the `Location` header); survives only via HSTS re-upgrade. Fix: make the trailing-slash redirect preserve `https://`.
- **LOW** — SDK "Constructor Options" table is cramped (contained scroll) at 390px; stack into definition-list cards under ~480px.
- **LOW/decision** — `/biometric` publishes the full internal-service API surface publicly (CC-4).
- Clean: no mojibake/lorem/TODO/broken images; no page-level overflow at 390px on any page; all outbound links resolve 200; dark theme consistent + high-contrast on home/SDK; SDK copy is precise and high-quality; Swagger server selector targets the real prod endpoint.

### status.fivucsas.com (Uptime Kuma)
- **HIGH** — internal Docker hostname exposed as a clickable public link (CC-4).
- **LOW** — cert-expiry shows ~35 days across the board — confirm Let's Encrypt/Traefik ACME auto-renew is healthy so it doesn't quietly approach zero.
- **LOW** — "Core Services" group has only the Identity API monitor; the biometric/ML services aren't surfaced — optional, for fuller coverage.
- Clean: genuinely well-branded (custom title "FIVUCSAS Status", custom icon, custom footer, "Powered by Uptime Kuma" hidden), sensible monitor groups + professional names, "All Systems Operational", uptime ribbons + cert badges. Not a stock default.

---

## Severity rollup (this audit; demo.fivucsas in its own doc)

| Severity | Count | Items |
|----------|-------|-------|
| **HIGH** | 7 | CC-1 localization half-wired; CC-2 launcher CSP/inconsistency; CC-4 status internal-hostname leak; verify flow instability; verify launcher CSP; docs template split; docs dead EN/TR toggle; poster dotted-İ |
| **MEDIUM** | ~8 | CC-3 MediaPipe-on-login (×2 surfaces); verify EN-only + missing input autocomplete; app login reflow + blank first paint; amispoof missing launcher; docs HTTPS→HTTP redirect; poster mixed EN/TR |
| **LOW** | ~12 | landing scroll-reveal empties page; poster LOC overclaim; verify favicon 404 + personal email + no dark theme; app no login toggle; links personal emails + favicon + date; amispoof emoji/red-0%/casing; docs mobile table; status cert-renewal + core-group coverage |

*(HIGH counts the cross-cutting themes once plus their per-site instances; several HIGHs share a single root fix.)*

## Recommended fix order

1. **CC-4 status internal-hostname leak** — flip the Identity API monitor's Show-URL off (1 click; security/professionalism).
2. **CC-2 launcher CSP** — add `app.fivucsas.com` to `script-src` on verify + demo callback (and unify `?v=`); restores the launcher on 2 surfaces.
3. **verify flow instability** — pin Marmara to one login flow / stable canary cohort (every tenant user sees this).
4. **CC-1 localization** — at minimum give the Marmara login Turkish; hide the EN/TR toggle where there's no TR variant (docs sdk/biometric/identity, poster).
5. **CC-3 MediaPipe-on-login** — lazy-load the face graph off the login screen (perf + blank first paint on app `/`).
6. **poster dotted-İ** — scope `lang="en"` on the uppercased English labels (single-line, but visible on an academic artifact).
7. **docs template split** — brand the Swagger pages / shared shell.
8. **verify input autocomplete + favicon**, **app login reflow**, then the remaining LOW polish.

> Note: the recurring "the EN/TR toggle does nothing here" and "the launcher is missing/blocked here" findings are the two biggest "is this finished?" signals across the platform — both are consistency fixes rather than per-page rebuilds.
