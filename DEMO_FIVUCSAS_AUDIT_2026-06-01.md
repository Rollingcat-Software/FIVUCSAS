# demo.fivucsas.com — Visual / Source / Functional Anomaly Audit

**Date:** 2026-06-01
**Target:** https://demo.fivucsas.com (the Marmara "BYS demo" — static site on Hostinger, fronted by its own `.htaccess`, with the shared `<fivucsas-launcher>` app-switcher + EN/TR toggle and a hosted-login OAuth round-trip to `verify.fivucsas.com`).
**Method:** 3-agent team, independent dimensions —
1. **Visual-render** — headless-Chrome screenshots of all 4 pages at desktop (1440px) + true mobile (390px via CDP device emulation), plus a seeded authenticated dashboard render and runtime probes.
2. **Source + deploy-drift** — local source vs `origin/master` vs live byte-diff, secrets/SRI/i18n/launcher/debug review.
3. **Functional / asset / security** — every asset & link HTTP status, console/CSP probes, OAuth wiring, security headers, `.htaccess`, robots/sitemap.

Cross-agent confirmation is noted per finding. The single most-corroborated issue (the `callback.html` CSP launcher block) was found independently by **all three** agents.

---

## ⚠️ Important context: the local checkout is a stale trap (no live deploy drift)

`/opt/projects/fivucsas/bys-demo/` is on the **stale** branch `fix/2026-05-12-bake-mini-fasnet-models` with **uncommitted working-tree edits** — it holds the OLD "red v2" Marmara design, ~3 PRs behind. The **LIVE site is correct** and serves the newer "navy v3" rebrand, which is **byte-for-byte identical to `origin/master`** (index, dashboard, callback, styles.css, robots, sitemap all match). The real current source lives in the worktree `/opt/projects/_wt/fivucsas-demo` (branch `fix/marmara-demo-2026-06-01`).

- **There is NO deploy drift** — live === `origin/master`.
- The byte-size differences first observed (live index 28.9 KB vs local 24.2 KB, etc.) are this stale-checkout skew, **not** a bad deploy.
- **Action:** discard the dirty edits in `bys-demo/` and reset that checkout to `origin/master`; treat `_wt/fivucsas-demo` as the source of truth. The dirty stale copy is the trap.

All findings below were validated against the **live** site / `origin/master`, not the stale local copy.

---

## Executive summary

| Sev | Page / Scope | Finding | Confirmed by |
|-----|--------------|---------|--------------|
| **MED** | callback.html | Shared launcher blocked by the page's own CSP (`script-src` missing `https://app.fivucsas.com`) → cross-site nav bar + EN/TR toggle dead on the callback page | Visual + Functional + Source (×3) |
| **MED** | callback.html | UI text hardcoded Turkish; ignores the EN/TR toggle (states, field labels, error strings) | Source (visual confirmed TR error state) |
| **MED** | site-wide headers | No `Strict-Transport-Security` (HSTS) header — after the 301→HTTPS, the first request each visit is downgrade-attackable | Functional |
| **LOW** | dashboard.html | No CSP `<meta>` at all (inconsistent with index/callback; launcher loads but unprotected) | Visual + Functional |
| **LOW** | index.html | i18n leftovers not localized: captcha placeholder (`Kodu giriniz`), 2 `alert()` strings, a few tooltips/aria-labels | Source |
| **LOW** | robots.txt / sitemap.xml | Live `robots.txt` missing the `test-elements.html` disallow (moot — file 404s); `sitemap.xml` `lastmod 2026-04-22` stale vs 2026-06-01 content | Functional + Source |
| **LOW** | mobile (index + dashboard) | Launcher floating button overlaps the right edge of content at 390px (cosmetic, non-blocking) | Visual |
| **INFO** | /test-elements.html | Local-only dev harness, **not deployed** → HTTP 404 (falls through to index body w/ 404 status). Harmless, no inbound links | All 3 |

No HIGH/critical site defects. No broken layout, no broken OAuth, no secret leak, no mixed content.

---

## Detailed findings

### MED-1 — `callback.html`: shared launcher blocked by its own CSP *(×3 agents)*
The page includes `<script src="https://app.fivucsas.com/launcher.js?v=2026-05-29">`, but its `<meta http-equiv="Content-Security-Policy">` has `script-src 'self' 'unsafe-inline' https://verify.fivucsas.com` — **missing `https://app.fivucsas.com`**. At runtime headless Chrome emits:
> `Loading the script 'https://app.fivucsas.com/launcher.js' violates the following Content Security Policy directive: "script-src 'self' 'unsafe-inline' https://verify.fivucsas.com". … blocked.`

Result: the cross-site launcher bar and the global EN/TR toggle **silently do not appear on the callback page** (they work on index + dashboard). `index.html`'s CSP correctly whitelists `app.fivucsas.com`.
**Fix:** add `https://app.fivucsas.com` to `script-src` in `callback.html`'s CSP meta (copy the value already in `index.html`).

### MED-2 — `callback.html`: UI text hardcoded Turkish, ignores EN/TR toggle
The site localizes via `data-tr`/`data-en` spans gated by injected `html[data-lang]` CSS + the launcher toggle (dashboard.html does this well — 98 `data-tr` spans). But `callback.html` ships almost entirely **hardcoded Turkish that will not switch to English** despite carrying the gating CSS: the navbar title, all three states (`Kimlik Doğrulanıyor`, `Kimlik Doğrulama Başarılı/Başarısız`), the `fields[]` labels (`Kullanıcı ID`, `E-posta`, `Doğrulama Yöntemleri`, `Erişim Belirteci`…) and every `showError()` string. The visual agent confirmed the rendered error state shows Turkish only.
**Fix:** wrap callback state/field/error text in `data-tr`/`data-en`, or render via the lang-aware JS pattern already used in `dashboard.html`. (No mojibake — Turkish diacritics render correctly.)

### MED-3 — No HSTS header on demo.fivucsas.com
The HTTP→HTTPS 301 works and `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `X-XSS-Protection` are all present, but **`Strict-Transport-Security` is absent** (it *is* present on the verify SDK origin). Without HSTS, the first request of each visit (before the 301) is downgrade-attackable.
**Fix (`.htaccess`):** `Header always set Strict-Transport-Security 'max-age=31536000; includeSubDomains'` — use the **single-quoted outer delimiter** per the project's Hostinger-quoting rule (the existing `Permissions-Policy` line already does this correctly; `cat -A` confirmed no leaked backslash-quotes).

### LOW-1 — `dashboard.html` has no CSP meta
index.html and callback.html ship a hardening CSP `<meta>`; dashboard.html ships none, so it is inconsistent (launcher loads, but the page has no script-source policy). Add a CSP meta matching index.html for consistency.

### LOW-2 — index.html i18n leftovers
Not localized and won't switch language: captcha placeholder `Kodu giriniz` (~line 267), two `alert()` messages (~368, ~400), a few tooltips/aria-labels (~80, 208, 264). Wrap in the `data-tr`/`data-en` pattern or use lang-aware strings.

### LOW-3 — robots.txt / sitemap.xml minor drift
Live `robots.txt` disallows `/callback.html` + `/dashboard.html` but not `/test-elements.html` (harmless — that path 404s live; callback/dashboard also carry `noindex,nofollow` belt-and-suspenders). `sitemap.xml` lists only `/` (correct, since other pages are intentionally noindex) but its `<lastmod>2026-04-22</lastmod>` is stale vs the 2026-06-01 content — bump it.

### LOW-4 — Launcher FAB overlaps content on mobile
At true 390px the launcher's `position:fixed` button + "DEMO FIVUCSAS" badge sits over the right edge of the login card (index) / weekly-schedule rows (dashboard). Cosmetic, does not block interaction; fine on desktop. (Note: an earlier "horizontal overflow" suspicion was a **false positive** from `--window-size` headless clamping to a 500px min viewport; re-measured with CDP device emulation — `body.scrollWidth == innerWidth` on all pages, retracted.)

### INFO — /test-elements.html not deployed (404)
The local "Web Components Phase C" dev harness was never deployed; the server serves the index/login body as its `ErrorDocument 404` fallback (404 status). No page, robots, or sitemap links to it — harmless. Either delete it locally or leave it.

---

## Verified clean (explicitly checked, no issue)

- **Deploy drift:** none — live is byte-for-byte identical to `origin/master` for every served file.
- **Assets/links:** every `<script>`/`<link>`/`<img>`/`url()` resolves 200; **zero mixed content** (no `http://` refs).
- **SDK + SRI:** `verify.fivucsas.com/fivucsas-auth.js?v=20260531-utf8` → 200; computed `sha384` **matches** the declared `integrity=` on all pages (SDK will load).
- **Secrets:** none — only the expected **public** `client_id: marmara-bys-demo`; no client secret / bearer / API key / private key. Runtime tokens shown truncated, never hardcoded.
- **OAuth demo flow:** `client_id` + `redirect_uri` (`origin + /callback.html`) consistent across index + callback; `verify.fivucsas.com/login?client_id=marmara-bys-demo&…` → 200 and the React app mounts; OIDC discovery → 200; callback handles `?code`/`?state`/`?error`. (No real login attempted.)
- **Security headers / .htaccess:** HTTP→HTTPS 301 works; `nosniff` / `SAMEORIGIN` / Referrer-Policy / XSS-Protection present; **Permissions-Policy quoting clean** (single-quoted outer, no Hostinger backslash leak); SDK short-cache (`max-age=300`, must-revalidate) + `?v=` cache-bust working as designed.
- **Sensitive files blocked:** `/.htaccess` → 403, `/.git/config` → 403, `/.env` → 404, `.bak`/`~`/`.DS_Store` → 404; `Options -Indexes` (no listing).
- **Branding/i18n integrity:** Marmara crest renders in header + center; deployed SVG carries the correct Turkish **`ÜNİVERSİTESİ`** (prior `UNIVERSITESI→ÜNİVERSİTESİ` fix is live); all Turkish chars (İ ı Ş Ğ Ü Ö Ç) render with no mojibake; EN/TR toggle flips `data-lang` and hides the other language with no duplicated bilingual text.
- **Launcher:** exactly **one** `<fivucsas-launcher>` instance (shadow root), versioned `?v=2026-05-29` consistently; no leftover bespoke "FIVUCSAS suite" bar.
- **Debug:** the two `console.log` in index.html are guarded by `if (location.hostname === 'localhost')`; no TODO/FIXME.
- **Runtime health:** 0 failed requests + 0 console errors on index and dashboard (callback's only error is MED-1).

---

## Recommended actions (priority order)

1. **MED-1** — add `https://app.fivucsas.com` to `callback.html` CSP `script-src` (one-line; restores the launcher + EN/TR toggle on callback).
2. **MED-3** — add the HSTS header in `.htaccess` (single-quoted outer delimiter).
3. **MED-2** — localize `callback.html` (data-tr/data-en or dashboard's lang-aware JS).
4. **Hygiene** — reset the stale `bys-demo/` checkout to `origin/master` (discard the red-v2 working-tree edits); make `_wt/fivucsas-demo` the working source.
5. **LOW** — add CSP meta to dashboard.html; localize index.html leftovers; bump sitemap `lastmod`; decide test-elements.html (delete or leave).

> Source files: `/opt/projects/fivucsas/bys-demo/{index,dashboard,callback,test-elements}.html` + `styles.css` + `.htaccess` (note the checkout caveat above — edit via the `_wt/fivucsas-demo` worktree / `origin/master`).
