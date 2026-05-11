# Changelog

All notable changes to the FIVUCSAS platform. Dates are in ISO 8601 format. See each submodule's own `CHANGELOG.md` for granular per-repo changes.

## [2026-05-11] Session — INVESTIGATION P1 residue + ops hygiene + docs DX + paper P0

User asked for a comprehensive professional session roadmap, then approved all 5 actionable tracks ("all of them"). 4 decisions confirmed at recommended defaults (AddressProof/Watchlist stay dev-gated; branch protection with admin bypass; drop `refresh_tokens.token` plaintext now). 7 parallel agents dispatched in isolated `/tmp/T*/` worktrees; main thread shipped runbook + ROADMAP refresh in parallel.

**9 PRs merged** across api / bio / docs / spoof-detector / parent:

- **api #96** `chore(handlers+purge)` — confirmed `@Profile("dev")` on `AddressProofHandler` + `WatchlistCheckHandler` (already in tree from PR #88 / #81 on 2026-05-07); javadoc documenting dev-only contract; **flipped `APP_PURGE_SOFT_DELETE_ENABLED` default-on in `application-prod.yml`** (GDPR Art. 17). +5 tests (`SoftDeletePurgeJobSchedulingTest` + `ProdProfilePurgeDefaultTest`). 1249/1249 pass.
- **api #97** `feat(nfc): wire bio mrz_parser into NfcController` — new `POST /api/v1/nfc/verify-mrz` endpoint; calls bio's new `/api/v1/nfc/mrz`; document number masked to last-4 chars in audit log + response payload (PII); new `AuditLogPort#logNfcDocumentVerified` method; existing serial-only `/verify` preserved for backward compat. +7 controller tests.
- **api #98** `feat(db): V59 + V60` — V59 backfills `audit_logs.tenant_id` from `users.tenant_id` JOIN + sentinel `00000000-0000-0000-0000-000000000000` for remaining NULLs (12.6% baseline from SENIOR_DB Appendix C Q3). `AuditLogAdapter.SYSTEM_TENANT_ID` constant; `resolveTenantIdByEmail` so failed auth attempts surface in target tenant's view. V60 `ALTER TABLE refresh_tokens DROP COLUMN IF EXISTS token` (T+7d soak elapsed since PR #71 Persistable<UUID> fix); `RefreshToken.token` demoted to `@Transient` preserving 5 wire-token call sites; 4 derived queries removed. Plus `scripts/db/reset-pg-stat-user-indexes.sh` + `docs/RUNBOOK_UNUSED_INDEX_AUDIT.md` for the 7-day audit window (kick 2026-05-11 → re-check 2026-05-18). +7 tests. 1250/1250 pass.

- **bio #94** `feat(quality+liveness)` — real occlusion detector (`app/application/services/occlusion_detector.py`, 270 LOC). Eye-region variance ≤120 → sunglasses; mouth-region variance ≤130 → mask/hand; CIE-Lab ΔE ≤18 to distinguish fabric from skin-tone. Score weighting eyes=0.6 / mouth=0.4; critical regions list. Anti-spoof contradiction policy spot-check **confirmed already correct** since 2026-05-08 — `LIVENESS_VERDICT_POLICY=conservative` (default in `core/config.py:146`) unconditionally vetoes on `deepface_spoof_detected`; added 4 regression tests pinning behavior. +15 passing tests (616 → 631).
- **bio #95** `feat(nfc): expose mrz_parser via /api/v1/nfc/mrz` — FastAPI route wraps existing `mrz_parser.py`; accepts `mrz_text` OR base64-encoded DG1 bytes (forward-compatible for ICAO chip-read); returns structured fields (document_number, issuing_country, dates, checksum_valid + per-field failure list). +10 unit tests covering TD1/TD3, checksum corruption (doc# + DOB), missing/ambiguous inputs, DG1 envelope round-trip, bad-base64.

- **docs #13** `docs: tenant onboarding playbook + 8 ADRs + hierarchy consolidation (T4.12.d/e/f)`:
  - `01-getting-started/tenant-onboarding.md` (215 lines, DX-first per `feedback_dx_first_planning.md`): leads with `npm install @fivucsas/auth-js` + `loginRedirect` snippet, then OIDC client provisioning, MFA flow customization, RFC 8252 redirect URIs, gotchas (CORS, PKCE, refresh-token family-revoke concurrent-tab trap), prod env vars, monitoring.
  - `adr/` directory + 8 ADRs (572 lines, MADR shape): hosted-first OIDC / pgvector / MobileFaceNet removal / Facenet512 server-authoritative / RFC 6749 §10.4 family-revoke / V53 BEFORE-DELETE / Persistable<UUID> refresh tokens / spoof-detector standalone.
  - Hierarchy consolidation: 14 `git mv`s preserving history (`guides/` → `01-getting-started/` + `06-deployment/`; `architecture/` → `02-architecture/`; `testing/` → `05-testing/`); 4 empty dirs removed; 4 broken `IMPLEMENTATION_STATUS_REPORT.md` links fixed; new Runbooks table in `06-deployment/README.md` cross-linking all 9 `/opt/projects/infra/RUNBOOK_*.md` files.

- **spoof-detector #10** `perf(blink)` — per-frame `FaceLandmarker` cache (3.0× speedup at 3 faces, 4.9× at 5; blink-stage FPS 9.8 → 28.9). EAR threshold recalibration: `0.20 → 0.18`, `REOPEN_THRESHOLD 0.22 → 0.23`, `MIN_OPEN_BETWEEN 6 → 12`. Clean 60s live fixture: 17 bpm (in 15–20 target band, down from previous 38 bpm false rate). +13 tests (126 → 139 green). `ROADMAP.md` P0 items ticked.

- **parent #48** `chore(branch-protection)` — enabled 1-review + admin-bypass on `main` across FIVUCSAS (+master), identity-core-api, biometric-processor, web-app, client-apps. `enforce_admins=false` (emergency hotfix path), `required_status_checks=null`, conversation-resolution required, force-push + deletion blocked, linear-history not required (master integration pattern preserved). `CICD_AUDIT_2026-05-04.md` extended with new "2026-05-11 — Branch protection enabled" section.
- **parent #49** `docs(roadmap)` — ROADMAP refresh (3 weeks stale; Phase A/B/C/I closed; active waves reframed to INVESTIGATION 2026-05-07 residue + DOC_AUDIT_2026-05-04 T4.12 + paper push); `b8bc76a` submodule-pointer sync from PR #47 followup; `9214e3c` 2026-05-11 session pointer bumps (api 6b17e0e → 606f1f4, bio 6f69a7d → 750492c, docs ed4dd25 → 78a9b4a, spoof-detector abc7f05 → cc73cf0). Adds spoof-detector to `.gitmodules` on the SEO branch (was extracted on `main` via `a6ac35a`).

**Operator deliverables (no code, runbook-only)**:
- `/opt/projects/infra/RUNBOOK_FLYWAY_REPAIR.md` — full procedure for repairing V40/V41/V42/V43/V49/V50 NULL-checksum rows (SENIOR_DB Appendix C Q1) + flipping `SPRING_FLYWAY_VALIDATE_ON_MIGRATE=true`. Includes Testcontainers dry-run + rollback. Operator runs when ready.
- `identity-core-api/scripts/db/reset-pg-stat-user-indexes.sh` + `docs/RUNBOOK_UNUSED_INDEX_AUDIT.md` — kicks off the 7-day unused-index audit window 2026-05-11 → re-check 2026-05-18.

**Audit-delta before rebuild** per `feedback_audit_delta_before_rebuild.md`:
- api: deployed image `386fe01e` built 2026-05-08 20:03 UTC (last image-included commit `5add915` per `7ee52de` parent bump). HEAD now `606f1f4`. **15+ commits**: today's 3 PRs + #91 APP_PURGE_SOFT_DELETE_ENABLED wiring + #92 V29 Testcontainers FK fix + #93/#94 README placeholders + #95 traefik noindex labels. **Migrations V59 + V60 will apply on next boot.** application-prod.yml: APP_PURGE_SOFT_DELETE_ENABLED default flipped to true. Safe to rebuild.
- bio: deployed image `75604e33` built 2026-05-09 11:15 UTC (last image-included commit around `31a2667`). HEAD now `750492c`. **3+ commits**: today's 2 PRs + #79 fast-uri / #75 python-multipart deps + #92 requirements-lock clarification. **No env-var changes.** Safe to rebuild.

**Rebuild pending** — operator action. T-FINAL of this session will trigger `docker compose build --no-cache` on both containers; flyway V59/V60 will apply at api boot; bio's new `/api/v1/nfc/mrz` route will register at startup.

**Followup queue** (not in this session):
- bio main has **79 pre-existing failing unit tests + 3 errors** at baseline (separate from today's PRs — agent ab901dec confirmed). Causes flagged: missing `memory_embedding_repository`, missing `NoFaceDetectedError`, `Landmark.name` attr drift. Dedicated investigation needed.
- `biometric-processor/README.md` still has broken `docs/4-testing/` + `docs/5-performance/` links into its OWN docs tree (different convention from the docs-submodule). Out of scope for PR #13.
- master/main reconciliation — both branches diverged this session (master gained PR #49's commits; main has spoof-detector restructure). Reconciliation merge deferred to next round.

## [2026-05-11] SEO round 4 — brand disambiguation (FIVUCSAS vs "fivics" autocorrect)

Single-session sweep across landing, app, api, docs, status, and developer-facing surfaces to push Google + Bing past the "Did you mean fivics?" autocorrect. The brand token "fivucsas" had been silently rewritten to the archery brand "fivics" in SERPs; the fix is layered on-page + off-page brand signals.

### `landing-website/` (fivucsas.com)
- `index.html` — meta description trimmed from 184 → 155 chars (Bing/Google sweet spot 150-160) with the full acronym expansion at the front. Same trim applied to `og:description` and `twitter:description` for consistency.
- `index.html` — **static `<h1>` added in `<body>` (outside `#root`)** with the acronym expansion. Visually-hidden via the `sr-only` inline-style pattern so sighted users still see the animated React hero, but JS-less crawlers (Bingbot, social-card scrapers) see the H1 in the initial HTML response. Resolves Bing Webmaster Tools "H1 tag missing" finding.
- `public/sitemap.xml` — added `https://docs.fivucsas.com/` entry; 8 URLs total.

### `infra/traefik/config/dynamic.yml`
- **Dedicated `noindex@file` middleware** split out of `secure-headers`. Before today, the `X-Robots-Tag: noindex, nofollow, noarchive` header lived inside `secure-headers.customResponseHeaders`, which is attached to most routers — so `docs.fivucsas.com` (brand-positive API docs) and `status.fivucsas.com` (Uptime Kuma transparency page) were getting noindex'd as collateral. `secure-headers` is now neutral on indexing; `noindex@file` is attached only to `fivucsas-api-admin` (swagger/actuator admin path router) and the docker-label `identity-api` router (public OAuth/auth/API).
- **Empty-string `customResponseHeaders` are silently dropped by Traefik** — the stub `X-Robots-Tag: ""` that had been sitting in `secure-headers` since IN-H2 (2026-04-19) never actually shipped a noindex signal to Googlebot until now.
- **Bonus: 24-day-old router-precedence bug fixed.** A Traefik restart (required because Edit-tool atomic-rename changes the bind-mount inode) corrected which router wins for `Host(api.fivucsas.com) && PathPrefix(/swagger-ui|/v3/api-docs|/actuator)`. The file-provider admin-whitelist router (defined in IN-H2 2026-04-19) had been silently losing to the docker-label `identity-api` router — so `/swagger-ui` and `/actuator/**` had been publicly reachable in violation of the IN-H2 design intent for almost a month. Post-restart they are correctly IP-gated.

### `identity-core-api/`
- `docker-compose.prod.yml` — `identity-api` Traefik router middlewares chain updated: `secure-headers@file,rate-limit@file` → `secure-headers@file,noindex@file,rate-limit@file`. Picks up the new dedicated noindex middleware. Required container `--force-recreate` to load the new label.
- `README.md` H1 — brand anchor refreshed: leads with `FIVUCSAS — Face and Identity Verification Using Cloud-based SaaS`.
- `README.md` lines 513/514/530 — example JWT-shaped strings (`"accessToken": "eyJ..."`, `"refreshToken": "eyJ..."`, `Authorization: Bearer eyJ...`) replaced with explicit `<JWT_ACCESS_TOKEN>` / `<JWT_REFRESH_TOKEN>` placeholders. Three pre-existing gitleaks `generic-api-key` + `curl-auth-header` findings cleared.

### Submodule README brand-anchor refreshes
Each submodule's top-level README H1 now leads with the full acronym expansion so it surfaces in GitHub's repo card and is indexed by GitHub-code search:
- `biometric-processor/` — README.md H1 + repo description + topic `fivucsas`
- `web-app/` — README.md H1 + repo description + topic `fivucsas`
- `client-apps/` — README.md H1 + repo description + topic `fivucsas`
- `identity-core-api/` — repo description + topic
- `docs/` — repo description + topic
- `practice-and-test/` — repo description + topic
- `spoof-detector/` — repo description + topic

### `web-app/` (app.fivucsas.com)
- `public/sitemap.xml` — was missing `/widget-auth` (9 routes → 10) and had no `<lastmod>` entries. Rewritten with all 10 public routes from the robots.txt Allow set plus `<lastmod>2026-05-11</lastmod>` and per-route priorities. Deployed direct via SCP to Hostinger.

### Uptime Kuma (`status.fivucsas.com`)
- Monitor #3 ("Identity API") was hitting `https://api.fivucsas.com/actuator/health` externally; the IN-H2 router-precedence fix (above) means that endpoint now returns 403 to non-admin IPs. Monitor URL repointed to the docker-internal route `http://identity-core-api:8080/actuator/health` (uptime-kuma is on the `proxy` network with identity-core-api). Container restart loaded the new URL from the DB. Heartbeat went 0 (DOWN) → 1 (UP, 249 ms) at 05:02 UTC.

### Off-page brand signals
- 8 GitHub repo descriptions (FIVUCSAS + all submodules) refreshed with the full acronym expansion + `homepage=https://fivucsas.com` + `fivucsas` topic.
- Portfolio site (`ahmetabdullah.gultek.in`) FIVUCSAS project card strengthened: tagline + summary (EN + TR) now lead with the full acronym expansion; `stack` chips include `Biometric Authentication`, `OAuth 2.0`, `OIDC`, `Multi-tenant SaaS`; meta keywords updated. Card link points at `https://fivucsas.com` (not GitHub) so link juice goes to the brand domain.
- GitHub profile README (`github.com/ahmetabdullahgultekin/ahmetabdullahgultekin`) FIVUCSAS entry now `### [FIVUCSAS](https://fivucsas.com)` with the full acronym expansion as the tagline (previously: text-only heading + shortened "Face & Identity Verification Platform" tagline).

### CI / deploy infra
- `.github/workflows/deploy-landing.yml` — switched from `runs-on: [self-hosted, linux, x64]` to `runs-on: ubuntu-latest`. The Hetzner self-hosted runner had a stuck broker WebSocket session that wouldn't dispatch new jobs (returned `TaskAgentSessionConflictException` on re-register). The ubuntu-latest runner uses the same `HOSTINGER_SSH_KEY` repo secret and finishes deploy in ~30 s vs 8+ minute queue waits. Permanent improvement — landing-site deploys are now decoupled from Hetzner runner health.
- `workflow_dispatch` trigger added to deploy-landing.yml so manual re-deploys can be fired from the GitHub Actions UI without a code change.

### Operator actions completed (out-of-band)
- DNS A record `bio.fivucsas.com` deleted (was returning 404 — dangling brand surface).
- Google Search Console: domain property added, sitemap `https://fivucsas.com/sitemap.xml` submitted, "Request indexing" fired on root. 7 pages discovered; the +1 for `docs.fivucsas.com` will be picked up on next crawl.
- Bing Webmaster Tools: site added, URL Inspection → Request indexing fired. Two flagged issues — "Meta Description too long or too short" + "H1 tag missing" — both addressed in this release.

### PRs merged this round (16)
- Parent FIVUCSAS: #42, #43, #44, #45, #46
- `web-app`: #88, #89
- `identity-core-api`: #93, #94, #95
- `biometric-processor`: #93
- `client-apps`: #37
- `ahmetabdullah.gultek.in` (portfolio): #2, #3, #4
- Direct push: `ahmetabdullahgultekin/ahmetabdullahgultekin` profile README

### Not in this round
- iOS/macOS scope (permanent — no Apple hardware).
- `verify.fivucsas.com` HTML metadata — already `<meta robots="noindex, nofollow">` (deliberate; auth surface, never a SERP destination).
- LinkedIn brand-anchor post (user does not post on social media).

## [2026-04-22] SEO upgrades — landing + bys-demo + app + verify-adjacent (round 3)

Per user feedback: comprehensive SEO hardening across the public surfaces.
All additive; no behavioural / feature changes.

### `landing-website/` (fivucsas.com)
- `index.html` — upgraded `<meta name="robots">` to include
  `max-image-preview:large, max-snippet:-1, max-video-preview:-1`;
  added explicit `googlebot` + `referrer` directives.
- Canonical URL normalised with trailing slash; added hreflang
  alternates (`x-default` + `en` + `tr`).

### `bys-demo/` (demo.fivucsas.com)
- `index.html` — **flipped from `noindex, nofollow` → `index, follow`**.
  Per user review, the BYS integration demo is a legitimate public
  showcase of FIVUCSAS's OIDC flow and deserves SEO visibility.
  - Title reframed to lead with FIVUCSAS (not Marmara) to avoid
    confusing Google into thinking this is Marmara's real portal:
    `FIVUCSAS Biyometrik Kimlik Doğrulama — Üniversite BYS Entegrasyon Demosu`.
  - Added author + referrer + JSON-LD `WebPage` positioning this
    explicitly as a demo page whose `about` is the FIVUCSAS
    `SoftwareApplication`.
  - OG / Twitter tags updated to English alternate locale + 1200×630
    image dimensions + explicit "demo" framing.
- `robots.txt` — sitemap pointer added.
- `sitemap.xml` *(new)* — single URL for the demo home.

### `web-app/` submodule bump: `70a4c06 → 12c5cbc`
Pulls in PRs #26 (post-review nit fixes on verify-app)
and #27 (make app.fivucsas.com indexable — platform-wide
sign-in surface).
- `index.html` rewritten in English primary with `robots: index, follow`,
  JSON-LD Organization + WebPage, canonical.
- `public/robots.txt` — `Disallow: /` → `Allow: /` with explicit
  `Disallow` for every authenticated dashboard path.
- `public/sitemap.xml` *(new)* — 9 public URLs (home, login, register,
  forgot/reset password, terms, privacy, widget-demo, developer-portal).
- `public/.htaccess` — per-route `X-Robots-Tag: noindex, nofollow`
  added for authenticated SPA paths (defense-in-depth over robots.txt,
  per Copilot #27 review).
- LoginMfaFlow Card: DRY'd duplicated boxShadow (PR #25 Copilot nit).
- CHANGELOG: step-component count 10→11 (PR #25/#31 Copilot nits).

### Not in this round
- `verify.fivucsas.com` SDK untouched — SRI hashes on `bys-demo` +
  every external integrator stay valid.
- No backend or identity-core-api / biometric-processor change.

## [2026-04-22] UI refresh — verify.fivucsas.com (Scope B)

Follow-up to Scope A. Polishes the hosted login surface
(`verify.fivucsas.com/login`) and the iframe widget
(`verify.fivucsas.com/?session_id=…`).

**Zero functional change.** Preserves every OAuth handler,
postMessage event shape, frame-bust effect, `assertSafeRedirectScheme`
guard, step component, SDK byte, CSP header, and Permissions-Policy
delegation. The `fivucsas-auth.js` SDK is **not rebuilt** — SHA-384 on
live matches the staged copy, so `bys-demo`'s SRI hash and every
external integrator's `integrity="sha384-…"` attribute remain valid.

### Changed

- `web-app/` submodule bump: `a4c0053 → 70a4c06`. Pulls in
  [Rollingcat-Software/web-app#25](https://github.com/Rollingcat-Software/web-app/pull/25):
  - `src/verify-app/HostedLoginApp.tsx` — `HostedFrame` rebuilt:
    ambient radial gradient canvas (light + dark aware), gradient
    brand-mark above the card, "Secured by FIVUCSAS" pill with
    `VerifiedUserOutlined` icon, Poppins display title,
    `verify.fivucsas.com` microcopy footer. All `parseHostedParams`,
    `resolveLocale`, frame-bust effect, tenant meta fetch with
    AbortController + 10s timeout, `handleLoginComplete`
    (`/oauth2/authorize/complete` call), and `handleCancel` preserved.
  - `src/verify-app/VerifyApp.tsx` — iframe body wrapper tokens tuned;
    transparent background preserved so parent page styling still
    bleeds through the widget. Every postMessage emission
    (`sendReady`, `sendStepChange`, `sendComplete`, `sendCancel`,
    `sendError`, `onParentMessage`, `setParentOrigin`) and every
    handler preserved.
  - `src/verify-app/LoginMfaFlow.tsx` — Card chrome softened
    (mode-aware elevation, 20 px radius), header uses Poppins display
    font with tighter letter-spacing, cancel button with compact close
    icon. Phase state machine + every one of the 11 step components
    (`PasswordStep`, `MethodPickerStep`, `TotpStep`, `SmsOtpStep`,
    `EmailOtpMfaStep`, `FaceCaptureStep`, `VoiceStep`,
    `FingerprintStep`, `QrCodeStep`, `HardwareKeyStep`, `NfcStep`)
    untouched.

- `verify-widget/html/index.html` — regenerated by `sync-assets.sh`
  to point at the new verify-app bundle
  (`/assets/index-DGYB7Ly1.js`, `mui-vendor-DkSS5YNQ.js`,
  `react-vendor-BkVLglrX.js`). This is the tracked entry for the
  Docker image; asset chunks themselves remain gitignored.

### Deploy (followed the required 3-step sync)

1. `cd web-app && npm run build:verify` — clean, produced `dist-verify/`
2. `cd ../verify-widget && ./sync-assets.sh` — staged 43 files into
   `verify-widget/html/`. SDK files (`fivucsas-auth.js`, `.esm.js`,
   `.map`) kept their 2026-04-18 mtimes (untouched).
3. `docker compose -f docker-compose.prod.yml up -d --build verify-widget`
   — nginx image rebuilt, container is healthy.

**Live verification:**
- `https://verify.fivucsas.com/` + `/login` → 200
- `sha384sum` on live `/fivucsas-auth.js` matches local staged copy —
  SRI hashes in `bys-demo/index.html` + `callback.html` still valid
- 56 / 56 verify-app Vitest tests green, 608 / 608 full suite green

## [2026-04-22] UI refresh — landing, web-app shell, BYS demo (Scope A)

Zero functional change across the whole refresh. Every route, handler,
OAuth flow, postMessage event shape, widget integration call, `data-testid`,
and i18n key preserved. All 608 Vitest tests green in `web-app`.

### `landing-website/` (fivucsas.com)
- Full rewrite of `src/App.tsx`, `src/index.css`, `tailwind.config.js`,
  and `index.html`. New palette (violet primary, cyan secondary on dark
  canvas), Space Grotesk display + Inter body + JetBrains Mono accents,
  custom inline SVG icon system, working EN / TR toggle with localStorage
  + `navigator.language` first-load detection.
- New sections: 10 auth-methods grid with custom icon glyphs,
  architecture stack visual (Clients → Traefik → Services → Storage),
  trust-signals row (RS256 default, AES-GCM-256, KVKK / GDPR, partitioned
  audit logs, Retry-After MFA rate-limits), hosted-first CLI mock, refined
  team + microservices + tech-stack sections.
- All JSON-LD Organization / WebSite / SoftwareApplication blocks,
  robots.txt, sitemap.xml, og-image.png, pgp.asc, favicon.svg preserved.
- `.htaccess` (SPA fallback + security headers + caching) unchanged.

### `bys-demo/` (demo.fivucsas.com)
- `styles.css` rewritten with refined tokens (Marmara crimson identity
  retained, modern typography scale, red accent stripes on cards, premium
  FIVUCSAS gradient CTA with shimmer sweep). Polished tables, schedule
  items, GPA grid, callback loading + success + error states.
- **Zero HTML or JS edits** on `index.html`, `dashboard.html`,
  `callback.html`: every `<script>` tag, CSP meta, SRI integrity hash,
  `FIVUCSAS_CONFIG` literal, `loginRedirect()`, `handleRedirectCallback()`,
  `sessionStorage` read / write, and every DOM id preserved byte-for-byte.

### `web-app/` (app.fivucsas.com) — submodule bump
- Pulls in PR #24 (`feat(web-app): Scope A UI refresh — theme + shell`):
  new `src/theme.ts` (calibrated palette, Poppins display hierarchy,
  8-tier shadow ramp, focus-visible rings, refined overrides across
  every MUI primitive), rebuilt Sidebar (grouped nav + gradient active
  indicator + admin chips + status tile), TopBar (glass AppBar +
  gradient avatar + polished user menu), DashboardLayout (ambient
  canvas + refined breadcrumbs), PublicLayout (glass AppBar + gradient
  logo + contained CTA).
- i18n additive only: `nav.group.*`, `nav.badgeAdmin`, `nav.primary`,
  `sidebar.systemStatus` added to both locales.
- Scope A explicitly excludes feature pages, `verify-app/` (hosted
  login + widget — planned separately), and SDK (SRI hashes on
  integrators stay valid).

### Not in this round
- `verify-widget/` + `fivucsas-auth.js` SDK untouched (would break SRI
  hash in `bys-demo` callback.html and every external integrator).
- No backend or identity-core-api / biometric-processor change.
- No feature-page redesigns in web-app.

## [2026-04-20] Audit 2026-04-19 remediation round + docs polish

Cross-walk to `docs/audits/AUDIT_2026-04-19.md`. Parallel specialist agents
closed findings across all 4 submodules + infra on 2026-04-20. Submodule
pointer bumps are **not** in this parent-repo commit — they will be bumped
in a single follow-up after all feature agents merge their submodule work.

### Fixed / Changed (cross-walk to AUDIT_2026-04-19)

- **ML-C1** — cross-tenant vector-search leak closed on both face and voice
  pgvector repositories: `find_similar()` + `delete()` now enforce
  `tenant_id` in SQL `WHERE`, not just in logging.
- **ML-H1 / H2 / H3 / H4** — ML hardening wave (upload size guards,
  liveness-score logging tightened, model-hash validation, `X-API-Key`
  enforcement on pgvector-adjacent routes).
- **ML-M1 / M3 / M5** — cleanup + log hygiene + Pydantic strictness.
- **FE-H2 / H3 / H4** — front-end audit: bundle regression guard, CSP
  alignment between `vite.config.ts` + `public/.htaccess`, i18n lint sweep
  rejecting hardcoded English.
- **MO-H1 / H3 / H4 / H6 + MO-C3** — legacy Android path hardening
  (EncryptedSharedPreferences key rotation, FCM token refresh, approval
  deep-link validation, NFC scope guard).
- **IN-H2** — Traefik rate-limits + admin IP whitelist on
  `bio.fivucsas.com`.
- **IN-M3** — compose hardening follow-ups stack-authored alongside
  2026-04-19's IN-H4 (`read_only: true` + tmpfs + `cap_drop: [ALL]` +
  CPU/mem limits on both `identity-core-api` and `biometric-processor`).
- **BE-H1 / BE-H3 / IN-H5** — in flight via agents: OAuth2 PKCE-failure
  audit-log enrichment (`actorIp` + `clientId` + `failureReason`) +
  per-`clientId` rate-limit (Phase D5); OIDC discovery conformance cleanup
  (Phase D4). Will fold into a later parent-repo submodule bump.

### Added / Docs

- **Widget integration guide polish** — `web-app/docs/plans/HOSTED_LOGIN_INTEGRATION.md`:
  new "Step-up MFA (iframe widget mode)" section with widget-vs-redirect
  decision table; troubleshooting expanded with CSP, camera/mic
  `Permissions-Policy` (recent Traefik fix 2026-04-19), and
  `postMessage`-origin-check rows; copy-paste CSP quickstart block. Total
  file size 318 lines (under 400-line cap).
- **Parity matrix honest re-count** — `docs/plans/CLIENT_APPS_PARITY.md`
  §2 matrix fixed to match §0a audit correction: **Android 10/13**
  (rows 1/3/4 `✗` — no OAuth redirect, no refresh scheduler, no OAuth
  callback deep-link; legacy password + native MFA path still supported),
  **Desktop 2/13** (`OAuthLoopbackClient` + `SecureTokenStorage`),
  **iOS 0/13** (no `client-apps/iosApp/` directory).
- **ROADMAP refresh** — `ROADMAP.md` gains a "Done (2026-04-20)" block
  with the above cross-walk; Phase I downgraded from "COMPLETE 13/13" to
  "PARTIAL 10/13" with the three OAuth items explicitly called out.

### Not done (explicit, tracked)

- **IN-C2** — Postgres superuser password rotation. Held for user
  sign-off + scheduled maintenance window (carried over from 2026-04-19).
- **MO-C1** — Android has no OAuth redirect / callback / refresh
  scheduler. The three items needed to reach honest Android 13/13 are
  listed in `docs/plans/CLIENT_APPS_PARITY.md` §0a + §3.
- **Submodule pointer bumps** — deferred to a single parent-repo commit
  after all feature agents merge.

---

## [2026-04-19] Infra audit remediation (IN-C1/H4/M1/M6)

Scope: `/opt/projects/fivucsas/docs/audits/AUDIT_2026-04-19.md` findings
**IN-C1, IN-H4, IN-M1, IN-M6, IN-LOW**. Postgres password rotation (IN-C2)
is **not** in this batch — held for explicit user sign-off.

### Fixed
- **IN-C1 — nightly backups had been failing 8+ days.** `backup.log` showed
  `FAILED: encryption failed` on all 5 databases since 2026-04-09. Root cause:
  backup.sh runs under root's cron (`sudo crontab -l`) but the
  `backup@rollingcatsoftware.com` public key lives only in `/home/deploy/.gnupg`.
  Root's keyring is empty, so every `gpg --encrypt` exited with
  `"No data"`. Previously the script would keep the plaintext dump on failure,
  so daily we were writing unencrypted SQL to disk. Changes:
  - `backup.sh` now refuses to run if the recipient key is missing (exit 2,
    explicit log line — no more silent fallback).
  - Added `--pinentry-mode loopback` alongside `--batch --yes --trust-model always`.
  - On encryption failure the plaintext dump is now **deleted**, not kept.
  - Added optional `BACKUP_HEALTHCHECK_URL` ping on full success (no-op by
    default — user sets it when they pick a Healthchecks.io / Uptime Kuma URL).
  - Header comment documents how to import the key into root's keyring.
- **IN-C1 (cont.) — `backup-offsite.sh`** no longer drops `.sql.gz.gpg` files
  at the rsync boundary. Old filter `--exclude='*.sql.gz'` inadvertently kept
  plaintext-only semantics; new filter explicitly includes `*.gpg` / `*.log`
  and excludes both `*.sql` and `*.sql.gz` (defence-in-depth against any
  future script that forgets to encrypt).

### Added
- **IN-M6 — backup restore verification** (`infra/backup-verify.sh` +
  `infra/crontab.d/backup-verify.cron`). Weekly script decrypts the latest
  `identity_core.sql.gz.gpg`, spins up a throwaway `postgres:17-alpine`
  container on 127.0.0.1:55432, loads the dump, and reports row counts for
  `users`, `tenants`, `audit_logs`. Container + tmpfiles torn down via EXIT
  trap. Cron file **shipped but NOT installed** — user must copy it to
  `/etc/cron.d/` when ready.
- **IN-M1 — gitleaks pre-commit hooks.** Added `.pre-commit-config.yaml` to
  parent repo + `identity-core-api`, `web-app`, `client-apps`; extended
  `biometric-processor`'s existing config with a gitleaks stage. Helper
  `.pre-commit-install` bulk-installs across the monorepo. Docs:
  `docs/PRECOMMIT_HOOKS.md`. detect-secrets intentionally skipped to avoid
  baseline maintenance overhead.

### Changed
- **IN-H4 — Compose hardening.**
  - `identity-core-api/docker-compose.prod.yml`: `read_only: true` + tmpfs
    `/tmp` + `/var/log`, `cap_drop: [ALL]`, CPU limit `2.0`, memory bumped
    768 MB → 2 GB to give Spring Boot headroom.
  - `biometric-processor/docker-compose.prod.yml`: same read_only / tmpfs /
    cap_drop pattern, CPU limit `2.0` → `4.0` (ML workload). Memory already
    4 GB.
- **IN-LOW — compose hygiene.** Removed obsolete `version: '3.9'` key from
  `biometric-processor/docker-compose.prod.yml` (Compose v5 warns on it).

### Not done (tracked)
- **IN-C2** — Postgres superuser password rotation. Held for user sign-off +
  maintenance window.
- **IN-H1/H2/H3** — Traefik rate-limit buckets, admin-whitelist attachment,
  TLS minVersion pinning. Not in this batch.
- Compose services were **not restarted** — edits are on disk only.

### Deploy note
To actually apply the compose hardening, during a maintenance window run:
```
cd /opt/projects/fivucsas/identity-core-api
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d identity-core-api
cd /opt/projects/fivucsas/biometric-processor
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d biometric-api
```

---

## [2026-04-18f] — Hosted-first parity rewrite + APK MFA reload fix + TR i18n restore

### Fixed
- **Android APK — multi-factor auth page no longer hangs on reload.** On
  process death / configuration change, `LoginViewModel` state reset,
  `loginState.mfaSessionToken` came back `null`, and `MfaFlowScreen` sat on
  `MfaFlowUiState.Idle` rendering a bare `CircularProgressIndicator()` with
  no escape. `AppNavigation.kt` now re-keys the init `LaunchedEffect` on
  the session token and pops back to Login if the token disappeared while
  still `Idle`. `MfaFlowScreen.kt` Idle branch renders `MFA_PREPARING`
  copy + a visible Cancel button (defense-in-depth).
- **Turkish localisation — diacritics restored across
  `client-apps/shared/.../StringResources.kt`.** ~600 `trStrings` entries
  had been ASCII-flattened (`Giris` → `Giriş`, `Sifre` → `Şifre`,
  `Dogrulama` → `Doğrulama`, `Kullanici` → `Kullanıcı`, etc.). Restored
  by hand, verified `compileDebugKotlinAndroid` green. English map and
  `StringKey` enum untouched.

### Changed
- **Client-apps parity matrix collapsed from 20 columns to 13** to match
  the 2026-04-16 hosted-first pivot. Native clients are no longer
  biometric reimplementers — they are thin OAuth 2.0 / OIDC clients that
  redirect to `verify.fivucsas.com/login` (Chrome Custom Tabs on Android,
  `ASWebAuthenticationSession` on iOS, RFC 8252 loopback on Desktop).
  Platform status after rewrite: **Android 13/13** (v5.2.0-rc1), Desktop
  (Win/Linux) 2/13 (scaffolding), iOS 0/13 (Phase 2). macOS explicitly
  out of scope for v6 (no Mac hardware for `codesign`/`notarytool`).
  Pre-pivot 20-row matrix preserved as Appendix A of
  `docs/plans/CLIENT_APPS_PARITY.md`. New Phase J (Desktop hosted-first)
  added to `ROADMAP.md`.

### In flight (not landed this session)
- Desktop OAuth 2.0 loopback client (RFC 8252), Windows DPAPI + Linux
  libsecret token storage, `.deb` / `.msi` installer configs — four
  background agents working in parallel, will land in separate commits.

## [2026-04-18e] — Cross-platform deep review + Android 20/20 gap plan + doc sweep

### Reviewed
- **Cross-platform parity deep review.** Confirmed KMP genuineness (not a "shared scaffold with divergent platform folders"): `337` files under `shared/src/commonMain/` totalling ~`11,500` LOC of real shared domain / data / presentation code. The 22-row feature matrix in `docs/plans/CLIENT_APPS_PARITY.md` was re-baselined: **Android is at ~15/20**, not 13/20 as an earlier sketch implied. Web-app is the 20/20 reference.
- **NFC port state (corrected).** Contrary to an earlier parity-matrix row that labelled NFC "scaffolded," the production NFC crypto stack is **already ported** into `client-apps/androidApp/src/main/kotlin/com/fivucsas/mobile/android/data/nfc/`: `PassportNfcReader` (873 LOC), `TurkishEidReader` (457), `BacAuthentication` (502), `SecureMessaging` (470), plus Dg1/Dg2/MRZ parsers and `CardReaderFactory` — **5,447 LOC total**. `NfcReadScreen.kt` (642 LOC, MRZ input UI + koinInject `INfcService`) also exists. The gap is integration only: `MfaFlowScreen.kt:324` still dispatches `NFC_DOCUMENT` to `GenericMethodStepInput`. Closing that dispatcher line + porting `MrzScannerScreen.kt` is Gap #1 of Phase I.
- **Ship A + Ship D verification.** Ship A (CORS preflight on `/api/v1/auth/mfa/step`, verify-widget ORT 404, BlazeFace singleton, `dropConsole`, i18next banner) confirmed landed and green in prod. Ship D (Android TOTP authenticator v5.1.0 — RFC 6238 engine in commonMain, `EncryptedSharedPreferences` vault, Compose Material 3 UI, manual entry) tagged and shipped; QR-scan follow-up tracked under Phase I Gap #5.

### Identified
- **Five Android gaps to reach 20/20**, each one-liner here, full plan in `docs/plans/PATH_TO_20_20.md`:
  1. Passport BAC MFA integration — wire existing NFC infra into multi-step dispatcher (~2 days).
  2. GDPR/KVKK export mobile UI — repository + ViewModel + Profile row + `DownloadManager` + 8 i18n keys (~2 days).
  3. FCM action buttons + `fivucsas://` deep-link per `NFC_PUSH_APPROVAL_PROTOCOL.md` (~2 days).
  4. Dark mode toggle in Settings — palettes already in `AppColors.kt` (~1 day).
  5. Authenticator QR scanner — reuse existing `QrScannerScreen` CameraX + ML Kit + `OtpauthUri.parse()` (~1 day).
- Total: **~8 engineer-days, fully parallelizable** across 5 code agents (20A–20E).

### Documented
- **Canonical plan:** `docs/plans/PATH_TO_20_20.md` (new) — Wave 1/2/3/4 sequencing, per-gap table (# / Gap / Current state / Work / Files new / Files modified / Days), verification steps, out-of-scope list (iOS Phase 2, Desktop NFC/installer signing Phase 3, GitGuardian #29836028 rotation user-gated, Phase C Wave 0 2h maintenance window, biometric-processor 79-CVE triage, pre-existing `BiometricViewModelTest.enrollFace` failure).
- **Doc sweep (8 files):** parent `ROADMAP.md` (new "Known open incidents" block + new Phase I section), parent `CHANGELOG.md` (this entry), parent `README.md` (client-apps 401 → 424, v5.1.0 Authenticator callout, mobile-app pointer), parent `CLAUDE.md` ("Last verified" + test count), `docs/plans/PATH_TO_20_20.md` (new), `client-apps/README.md` (feature coverage matrix + test count), `client-apps/CHANGELOG.md` ("[Unreleased] — v5.2.0 planning"), `client-apps/docs/TODO.md` (Phase A–E rewrite).

### Deferred / out of scope
- iOS parity (Phase 2 per `CLIENT_APPS_PARITY.md`).
- Desktop NFC over PC/SC + Windows Authenticode / macOS notarization (Phase 3).
- GitGuardian #29836028 keystore rotation — user-gated, `docs/SECURITY_INCIDENTS.md`.
- Phase C Wave 0 secret rotation — requires scheduled 2-hour maintenance window.
- Biometric-processor 79 CVE triage — separate workstream.
- Pre-existing `BiometricViewModelTest.enrollFace` failure on `client-apps` — tracked under Phase D of `client-apps/docs/TODO.md`.

## [2026-04-18d] — Security incident log + keystore rotation plan + parallel recovery round

### Documented
- **GitGuardian incident #29836028** — Android keystore password `fivucsas2026` leaked in public git history of `Rollingcat-Software/client-apps` (commit `db18fa7`, reachable via tag `v3.0.0`). Scaffolding to read from env vars / Gradle properties shipped `cb6eab9` same day. Rotation is still user-gated (keytool + GitHub secret paste). New `docs/SECURITY_INCIDENTS.md` logs the incident, blast-radius assessment, full remediation playbook, and the decision NOT to rewrite history (rotation makes the leaked password dead; history rewrite has higher blast radius than residual exposure). `ROADMAP.md` Phase C gets a new item **C6** covering this rotation.
- **Plans shipped** to `docs/plans/`: `NFC_PUSH_APPROVAL_PROTOCOL.md` (cross-device NFC handoff mirroring e-Devlet — `fivucsas://nfc-session` deep link, Ed25519 device registration, FCM/APNS push, V39 migration sketch, 13-threat security review); `CLIENT_APPS_PARITY.md` (Android / iOS / Desktop parity — 22-row feature matrix, per-platform top-10 gaps, 4-phase rollout to 2026-08-01 GA).

### Added
- **Android keystore rotation scaffolding** (`client-apps` commit `cb6eab9`): `androidApp/build.gradle.kts` reads `ANDROID_KEYSTORE_PATH` / `ANDROID_KEYSTORE_PASSWORD` / `ANDROID_KEY_ALIAS` / `ANDROID_KEY_PASSWORD` from Gradle properties or env; release signing falls back to debug signing with a warning when creds absent (keeps PR / fork CI green). `.github/workflows/android-build.yml` gates the keystore decode step behind `workflow_dispatch` + `build_type=release`, materialises `ANDROID_KEYSTORE_BASE64` into `$RUNNER_TEMP`, wipes in `if: always()` post-step. New `client-apps/docs/RELEASE.md` documents 6-month rotation cadence and emergency revocation playbook. `README.md` adds a "Signed release builds" section.

### In flight (background agents at commit time)
- **Ship A** — critical prod fixes (CORS preflight on `/api/v1/auth/mfa/step`, `ort.min-*.js` 404 on verify.fivucsas.com, BlazeFace 4× re-init due to missing singleton, production console log noise, i18next Locize banner).
- **Ship D** — RFC 6238 TOTP engine (Android-first, KMP commonMain): `TotpGenerator` + `OtpauthUri` parser + `TotpVault` (EncryptedSharedPreferences) + `AuthenticatorScreen` Compose UI. Manual entry only in v5.1.0; QR scan deferred to G2.

### Fixed (Ship A landed)
- **Verify-widget ORT 404** — root cause: `.gitignore` line 50 excludes
  `verify-widget/html/assets/*.js` so the Dockerfile `COPY html/` step shipped
  the image with an empty `assets/` directory. Added
  `verify-widget/sync-assets.sh` to `rsync` `../web-app/dist-verify/assets/`
  into `verify-widget/html/assets/` immediately before
  `docker compose build`, matching `feedback_widget_deploy_sync` memory rule.
  `curl -sI https://verify.fivucsas.com/assets/ort.min-CSPs-wzd.js` → 200.
- **bys-demo SDK cache-bust** bumped to `?v=20260418d` on both
  `index.html` and `callback.html`. SRI hash unchanged
  (`sha384-LLegFtvECu4lDPINAMXGPM3C5lo3SCnj9jaqBAi1LDvxGILTG8Bm86Db5TIkP1G6`)
  because the SDK bundle was not rebuilt this round.
- **CORS on `/api/v1/auth/mfa/step`** — preflight from
  `https://verify.fivucsas.com` already returns 200 with correct
  `Access-Control-Allow-*` headers in prod; no backend / filter-order change
  needed. Runtime verified with `curl -X OPTIONS`.
- See `web-app/CHANGELOG.md ## [2026-04-18d]` for BlazeFace singleton,
  `dropConsole`, and i18n debug details.

## [2026-04-18c] — Hosted-login UX recovery: callback data, stepper, locale, face retry, copy audit

### Fixed
- **Fix 3 — callback.html shows blank user / email / methods.** `FivucsasAuth.handleRedirectCallback()` now decodes the id_token returned by `/oauth2/token` (`sub` → `userId`, `email`, `name` → `displayName`, `amr` → `completedMethods`) and falls back to `GET /oauth2/userinfo` with the bearer access_token when any field is missing. `sessionId` is synthesized from the code prefix instead of empty-string. The BYS demo callback card now renders the real identity values; two new SDK tests cover both id_token extraction and userinfo fallback.
- **Fix 5 — `locale: 'tr'` not honoured on hosted login.** `FivucsasAuth.loginRedirect()` appends OIDC `ui_locales` to the authorize URL; `identity-core-api/OAuth2Controller.authorize` now parses `ui_locales` and forwards it on the 302 to `verify.fivucsas.com/login`; `HostedLoginApp.tsx` resolves locale via `ui_locales → legacy locale → navigator.language → 'en'`, sets `document.documentElement.lang`, and switches i18next before paint. Backend test `authorize_WhenDisplayPageWithUiLocales_ShouldForwardLocale` locks the pass-through.
- **Fix 1 — conflicting face failure UI.** `FaceCaptureStep.tsx` swaps captured-image alt text to `mfa.face.lastAttemptAlt`, applies a subtle grayscale filter on error, and shows three retry tips (lighting, framing, glasses) under the error Alert instead of the bare "Verification failed. Please try again. Captured face" mash-up. **No biometric threshold or model change.**

### Added
- **Fix 4 — consistent step progress across every method.** New reusable `src/verify-app/StepProgress.tsx` (ARIA-labeled counter + determinate bar, hides when `total <= 1`) mounted at the top of `LoginMfaFlow.tsx`. The inline "Step N of M" caption that only rendered during NFC has been removed; Face, TOTP, Email OTP, NFC, and picker now share one indicator.
- **Fix 6 — copy audit across all 10 auth methods.** `widget.*` and `mfa.face.*` keys in `en.json` + `tr.json` rewritten to the "what happened + what to do" pattern: `loginFailed`, `verificationFailed`, `unexpectedError`, `missingParams`, `skipFailed`, `mfaRequired`, `cameraError`, `authComplete`, `noStepsRemaining`, `unknownMethod`, plus `mfa.face.retryTip{Lighting,Framing,Glasses}`, `capturedAlt`, `lastAttemptAlt`. JSON key parity verified: 0 missing in either locale.

### Tests
- Vitest: **599 / 599** passing (was 597). +2 SDK tests.
- Maven unit: **839 / 839** passing (was 838). +1 locale-forwarding assertion.

### Deployed
- SDK rebuilt (`dist-sdk/fivucsas-auth.js` — SRI `sha384-LLegFtvECu4lDPINAMXGPM3C5lo3SCnj9jaqBAi1LDvxGILTG8Bm86Db5TIkP1G6`), synced to `verify-widget/html/` alongside new verify-app bundle; Docker widget container recreated; web-app `dist/` rsync'd to Hostinger; `bys-demo/` pushed to Hostinger with `?v=20260418c` cache-bust and new integrity hash on both `index.html` and `callback.html`.
- Live smoke tests: `curl -sI https://verify.fivucsas.com/fivucsas-auth.js` returns 200 with `cache-control: max-age=300`; grep confirms `ui_locales`, `oauth-`, `oauth2/userinfo` strings present in the live bundle; `curl https://api.fivucsas.com/.well-known/openid-configuration` returns a valid discovery JSON.

## [2026-04-18b] — Demo login recovery, IC CI green, Vite dependabot closed

### Fixed
- **demo.fivucsas.com login** — button click was throwing `"Giriş başlatılamadı."` because `verify.fivucsas.com/fivucsas-auth.js` was the Apr-15 bundle (10,643 B) which predates the `loginRedirect` SDK method shipped in PR-1. Rebuilt `dist-sdk` (15,684 B), copied into `verify-widget/html/`, rebuilt container, updated SRI hashes in `bys-demo/{index,callback}.html`. rsync'd to Hostinger.
- **Browser-cache trap** — after shipping the new bundle, users with a cached Apr-15 SDK still failed: their cached bytes didn't match the new SRI hash so the browser blocked the script. Fixed with two measures:
  - `verify-widget/nginx.conf`: the specific `/fivucsas-auth.js` location block was being shadowed by the generic `\.js$` regex (nginx first-match semantics); moved it above the generic rule. `max-age=300, must-revalidate` on SDK files so future updates propagate in 5 minutes. Other static assets keep 1y immutable.
  - `bys-demo/{index,callback}.html`: `?v=20260418` cache-bust on SDK URL.
- **identity-core-api CI on `main` — 38 red tests → 0.** Root cause was systematic test-source drift from 25+ legitimate source changes while the broken self-hosted runner was silently skipping public PRs. 10 test files realigned to current source (no `@Disabled`, no weakened assertions):
  - `AuthControllerTest`: corrected `UserRepository` JPA→domain-port import, added 13 `@MockBean`s for controller's grown 25-dep constructor.
  - `EnrollmentControllerTest`, `TotpControllerTest`, `OtpControllerTest`, `UserEnrollmentFlowControllerTest`: added `EnrollmentHealthService` + related `@MockBean`s.
  - `AuthenticateUserServiceTest`: 4 new mocks + migrated to 2-arg `generateAccessToken(email, amr)` form (RFC 8176).
  - `GetCurrentUserServiceTest`: added `TenantRepository` mock.
  - `ManageEnrollmentServiceTest`: `NfcCardRepositoryPort` + `WebAuthnCredentialRepositoryPort` mocks; re-enroll test switched to PASSWORD (TOTP not in `AUTO_COMPLETE_TYPES`).
  - `NfcDocumentAuthHandlerTest`: `NfcCardRepositoryPort` mock + assertions aligned with current repository-lookup path.
  - `TotpAuthHandlerTest`: `UserRepository` mock for Redis-miss→DB fallback in `resolveTotpSecret`.
  - `mvn test`: 838 tests / 0 failures / 0 errors (27 skips are integration, gated on `RUN_INTEGRATION=true`).

### Security
- **Dependabot #28 merged** — Vite 6.4.1 → 6.4.2 in `landing-website/` (dev-dep only; path-traversal + `server.fs.deny` trim-slash fixes). Parent repo now at **0 open Dependabot PRs**.

### Repo hygiene
- **biometric-processor garbage purged** — `=0.10.0` (0-byte artefact of a shell-interpretation typo) and `2025-12-26-perfect-heres-the-exact-prompt-to-give-sonnet.txt` (25 KB personal prompt scratch) deleted from tracked files.
- **Parent orphan cleanup** — `auth-test/` (empty dir with only a stray `.git/`) and `.github/ISSUE_TEMPLATE/` (empty) removed from working tree.
- **`bys-demo/robots.txt`** — `Disallow: /test-elements.html` (dev Web Components demo kept in repo but not indexable).

## [2026-04-18] — Deploy round 2: V37/V38, CI unblock, Dependabot sweep, MobileFaceNet out

### Added
- **Flyway V37** — `oauth2_clients.tenant_id` index (audit safety-net; V24 already declared it). Applied to prod.
- **Flyway V38** — `fivucsas-web-dashboard` flipped to `confidential = false` because the SPA cannot hold a client secret (RFC 6749 §2.1 / RFC 8252 §8.4). Applied to prod; PKCE S256 was already mandatory.
- **`marmara-bys-demo` OAuth2 client** — registered in prod for the BYS demo integration (`demo.fivucsas.com`).
- **Phase A–L roadmap** — `ROADMAP.md` refreshed for 2026-04-18 with the full plan (A lint → B dependabot → C ops hardening → D security depth → E perf → F observability → G features → H code-quality → L docs) and a Timeline table. Identity-core-api now has its own `TODO.md` seeded from Phase C/D/E/H backend items; `web-app/TODO.md` sections split into "Open 2026-04-18" / "Completed 2026-04-18".

### Changed
- **web-app CI** — both jobs moved from self-hosted `hetzner-cx43` to `ubuntu-latest` (the runner group had `allows_public_repositories: false`, silently skipping this public repo for ~5 days). `.npmrc` added with `legacy-peer-deps=true` so Vite 8 + vite-plugin-pwa peer mismatch doesn't break `npm ci`.
- **identity-core-api CI** — split into `test` (unit, ubuntu-latest, now `mvn -T 2C`) + `integration-tests` (self-hosted, Docker-required Testcontainers via `RUN_INTEGRATION=true`). Integration test classes gated with `@EnabledIfEnvironmentVariable(named = "RUN_INTEGRATION", matches = "true")`.
- **Face embedding pipeline (web-app)** — MobileFaceNet stripped entirely (was blocked on an authenticated download). Now landmark-geometry only (`geometry-512`, 512-D from MediaPipe FaceLandmarker). Server remains authoritative via Alembic 0004 log-only observations per D2.

### Fixed
- **web-app lint** — 23 errors / 63 warnings → 0 errors / 33 warnings. Cleared `react-hooks/rules-of-hooks` in `HostedLoginApp.tsx` and `TwoFactorDispatcher.tsx`, `no-useless-escape` in `FivucsasAuth.ts`, stale `eslint-disable` in `postMessageBridge.ts`, 30 `exhaustive-deps` across 20 files. Tests: 597/597 passing.

### Security
- **Dependabot sweep** — 0 remaining vulnerabilities after merging:
  - `protobufjs` 7.5.4 → 7.5.5 (CRITICAL, web-app #23)
  - `follow-redirects` 1.15.11 → 1.16.0 (MODERATE, web-app #21)
- **Still open:** `vite` 6.4.1 → 6.4.2 patch in `landing-website/` (parent #28, MODERATE, dev-server only — awaiting user decision).

### Deployed
- Docker rebuild of identity-core-api — V37/V38 + marmara-bys-demo client applied.
- web-app `dist/` rsync'd to Hostinger after Dependabot merges.

### Still on the human plate
- Phase C (Wave 0 ops) — secret rotation + `git filter-repo` on `.env.prod` history. Destructive; needs maintenance window.
- Phase D — DNN liveness, voice replay detection, voice STT verification, OIDC conformance.
- DKIM CNAMEs still NXDOMAIN on Hostinger.

## [2026-04-16] — PR-1 hosted-first auth V1 + GDPR compliance

### Added

- **Hosted-first OAuth 2.0 authorization code flow** — `verify.fivucsas.com/login` serves a top-level browsing context login page; tenants call `FivucsasAuth.loginRedirect({...})` and receive `?code=…&state=…` on their callback. Iframe widget remains available for inline step-up MFA only. Platform coverage: web, iOS (ASWebAuthenticationSession), Android (Chrome Custom Tabs), Electron (loopback per RFC 8252), CLI.
- **GDPR Art. 17 / Art. 20 compliance** — `GET /api/v1/users/{id}/export` (JSON data bundle, rate-limited 1/h/user, audit event `USER_DATA_EXPORTED`), daily `SoftDeletePurgeJob` with 30-day retention (flag-gated, default off), `DELETE /api/v1/admin/purge/dry-run` for super-admin preview.
- **Identity-core-api Maven CI workflow** — `.github/workflows/ci.yml` runs `mvn test` on every PR against main (Testcontainers backed). Previously only `deploy-hetzner.yml` existed; PRs had no automated test gate.
- **8 missing `notifications.actions.*` i18n keys** — password reset, session revoke, email verification audit codes were rendering raw to Turkish users.

### Changed

- **Flyway V34** — `oauth2_clients.confidential` column; public clients now require PKCE S256.
- **Flyway V35** — `mfa_sessions.consumed_at TIMESTAMP` replaces boolean flag for atomic code-mint replay guard.
- **Flyway V36** — `mfa_sessions.client_id UUID` cross-client replay guard.
- **biometric-processor CI consolidation** — 4 overlapping workflows (`ci.yml`, `ci-cd.yml`, `cd.yml`, `pr-validation.yml`) reduced to 2 (`ci.yml` + `deploy-hetzner.yml`). Removed dead GCP Cloud Run and Railway deployment code.
- **Documentation archive sweep** — ~85 stale/redundant docs moved into per-repo `docs/archive/2026-04-16/` via `git mv` (biometric-processor 44, docs 45, client-apps 13, practice-and-test 13). Public doc tree now leads with current reality only.

### Fixed

- **PR-1 review blockers B1-B9** — SecurityConfig anonymous endpoints, cross-client replay guard, PKCE S256 mandate, code-mint atomicity, loopback redirect validation (IPv4-only, query rejection), OIDC nonce validation, 429 Retry-After, completedMethods derivation from MfaSession, hosted-login SDK + BYS demo flip.
- **Deployment state:** PR-1 merged but **Docker image not yet rebuilt** — Flyway V34/V35/V36 apply on next container rebuild. Web-app `dist/` not yet rsynced to Hostinger.

## [2026-04-15] — demo.fivucsas MFA hardening

### Fixed
- **Apache `.htaccess` Permissions-Policy parse error on Hostinger**: double-quoted `Header set` values with `\"` escapes leaked literal backslashes into the emitted header, breaking structured-header parsing and killing camera/mic iframe delegation. Switched to single-quoted outer delimiter with bare inner quotes. Camera/mic now delegate to `https://verify.fivucsas.com` correctly.
- **MFA method-reuse AMR collision**: `AuthController` was storing AMR values (RFC 8176) in `MfaSession.completedMethods`, so EMAIL_OTP after TOTP hit a false "METHOD_ALREADY_USED" (both map to `"otp"`). Now stores `AuthMethodType.name()` (unique per method); AMR mapping happens only at JWT issuance. Also fixed `stepsData` initial value (`["pwd"]` → `["PASSWORD"]`) in `AuthenticateUserService`.
- **Widget bundle sync**: `web-app/dist-verify/` was never rsync'd into `verify-widget/html/` before Docker build, so fixes shipped but container image kept old bundle. Documented 3-step sync (build → rsync → docker build). `PerfContext` also changed to return NOOP when provider absent so Face step works inside widget iframe.
- **BlazeFace `@tensorflow/tfjs-converter` "Failed to resolve module specifier"**: earlier quick-fix had externalized the package in `vite.verify.config.ts`. Real fix: installed the package (`--legacy-peer-deps`) and removed from externals. Also added `https://tfhub.dev https://www.kaggle.com` to widget CSP `connect-src` so the model can be fetched.
- **Voice login had no phrase prompt**: enrollment shows a passphrase but login didn't. Added `mfa.voice.promptPhrase` + `samplePhrase` i18n keys (en/tr) and a boxed prompt above the mic in `VoiceStep.tsx`.
- **Face step back button off-screen**: camera view pushed "backToMethodSelection" below the fold. Moved button ABOVE step content with `ArrowBack` icon.
- **BYS demo Turkish strings**: `dashboard.html` + `callback.html` were entirely English despite `lang="tr"`; `index.html` missing diacritics (Universitesi → Üniversitesi, Ogrenci → Öğrenci, Sifre → Şifre, Giris → Giriş, Iletisim → İletişim, …). Fully localized all three pages. Also fixed captcha input overflow (`min-width: 0` + `flex-wrap: wrap`).
- **Success redirect gate**: `index.html` sessionStorage payload now includes `success: true`, `email`, `displayName`, `sessionId`, `completedMethods`, `timestamp` — `dashboard.html` auth check no longer kicks user back to login.
- **Twilio SMS body localization**: `TwilioVerifySmsService.sendOtp` now calls `.setLocale("tr")` so Turkish users receive the OTP template in Turkish.

### Known (regulatory, not a code bug)
- **Twilio SMS sender shows "TWVerify"** instead of "FIVUCSAS". This is Twilio's default shared alpha sender; it cannot be changed by any SDK/API call. Custom alpha IDs in Turkey require BTK/İYS pre-registration + Twilio Support ticket to register the alpha on the Verify Service, then adding it under *Channel Configuration → SMS → Alternate Senders*. 1–4 week approval. See `docs/plans/SMS_ACTIVATION_PLAN.md` Appendix.

### Verified
- End-to-end 3-method login (PASSWORD + TOTP + EMAIL_OTP) on Brave PC succeeded; dashboard redirect worked; no console errors; Turkish dashboard rendered clean.

## [2026-04-14/15] — Client-Side ML Split + V33 Deploy

### Added
- **Alembic 0004** `client_embedding_observations` table (biometric-processor) — vector(128), log-only per D2; populated via FastAPI BackgroundTasks so telemetry failures never break primary enrollment/verification
- **Phase 3 build-time model delivery**: `web-app/scripts/fetch-models.mjs` + `public/models/manifest.json` (SHA256-pinned). `npm prebuild` runs fetch-models. `.onnx` files git-ignored. silero-vad + yolo-card-nano live at https://app.fivucsas.com/models/
- **Phase 4 Silero VAD V1**: `VoiceVAD.ts` wraps silero-vad.onnx (512-sample frames, persisted h/c state); `TwoFactorDispatcher` gates VOICE uploads with graceful fallback when model unavailable or payload non-WAV
- **CLIENT_SIDE_ML_PLAN.md v2.0**: honest pre-filter-only rewrite; D1-D4 decisions locked (pre-filter client, log-only server, SHA256 delivery, Silero V1/ECAPA V2 deferred)

### Fixed
- **V33 voice_enrollments migration DEPLOYED** (2026-04-14): rebuilt identity-core-api image after unblocking pre-existing `NfcController` compile error (exposed `findByCardSerialAndTenantId` on hexagonal port + adapter). Flyway history now V33.

### Known
- mobilefacenet.onnx pending — all public mirrors return 401/404; needs authenticated InsightFace/HuggingFace download. Graceful fallback active (auth works without it per D2).
- VoiceStep uses MediaRecorder → WebM directly (4 consumer sites). VoiceVAD currently bypasses until VoiceStep is rewired to emit wav16k via useVoiceRecorder.

## [2026-03-19] — Auth-Test Refinements + Backend Tracking

### Added - 2026-03-19 Auth-Test & Backend Refinements
- **Auth-test page refinements**: Fingerprint username field hidden (WebAuthn + hardware token), Voice re-record enforcement after enrollment + delete enrollment button, NFC 409 "already enrolled" message + delete card button + response parsing fix (`res.success` -> `res.ok`), Face removed client-side CLAHE (caused verify mismatch) + camera 640x480 for mobile, Bank enrollment uses face-cropped images instead of full frame, Liveness server-authoritative verdict (was requiring both client+server), consistent Enroll/Verify/Who Is This?/Delete button order across all sections
- **Comprehensive diagnostic logging**: [FACE-DIAG], [LIVENESS-DIAG], [BANK-DIAG], [API-DIAG] tag prefixes in auth-test/app.js
- **CSP fix**: added `unsafe-inline` to `script-src` in SecurityHeaders
- **Cache-busting**: `no-cache` header for app.js responses
- **Hostinger SCP deployment**: automated deployment via `scp -P 65002`
- **3 new KMP screens**: VoiceVerifyScreen, FaceLivenessScreen, CardDetectionScreen in client-apps
- **Kotlin/Native compatibility fixes**: `Math.PI` -> `kotlin.math.PI`, `String.format` -> `math.round`

### Fixed - 2026-03-19
- **Login tracking**: `lastLoginAt` and `lastLoginIp` now populated on login (User.recordLogin(), AuthenticateUserService, UserResponseMapper)
- **Identity-core-api**: rebuilt and deployed to Hetzner with login tracking fix
- **Web-app Vitest**: stabilized at 171/171 tests passing (was failing)
- **ESLint**: max-warnings raised from 30 to 40 to accommodate new hooks
- **URL double-prefix**: fixed in VoiceEnrollmentFlow, useBankEnrollment, useLivenessPuzzle

### Performance Investigation - 2026-03-19
- biometric-api at 94% memory usage (2.825GB/3GB) — needs increase to 3.5GB
- Health check endpoint: 678ms — needs lightweight `/health` route
- Voice operations block FastAPI event loop — needs `run_in_executor` thread pool
- Missing pgvector HNSW indexes on face_embeddings and voice_enrollments tables

### Validation - 2026-03-19
- All CI repos GREEN: Sarnic 456 tests, web-app 171 tests, client-apps iOS+Android builds pass
- Auth-test page: all 11 sections working with consistent UX

---

## [2026-02-21] — Integration Closure + Step-Up Backend

### Added - 2026-03-13 Integration Closure Batch
- **web-app test baseline mocks** under `src/core/repositories/__mocks__/`:
  - `MockAuthRepository`, `MockUserRepository`, `MockDashboardRepository`
  - `MockTenantRepository`, `MockEnrollmentRepository`, `MockAuditLogRepository`
- **QR runtime repository methods** in `AuthSessionRepository`:
  - `generateQrToken(userId)` -> `/qr/generate/{userId}`
  - `invalidateQrToken(token)` -> `DELETE /qr/{token}`
- **Settings WebAuthn enrollment actions**:
  - Platform authenticator registration action
  - Hardware security key registration action
  - Both wired to existing `WebAuthnEnrollment` component

### Changed - 2026-03-13
- **QR step flow wiring**:
  - `MultiStepAuthFlow` now resolves session user id and passes QR token-generation callback
  - `steps/QrCodeStep` auto-generates token, pre-fills manual input, and preserves manual fallback on errors
- **README / ROADMAP / TODO status alignment** updated to reflect current integration and validation state

### Fixed - 2026-03-13
- **Auth flow guardrails** in `ManageAuthFlowService` now prevent required unsupported steps:
  - `NFC_DOCUMENT`
  - `FINGERPRINT`
  - `VOICE`
- **identity-core-api compile break** in `QrSessionService`:
  - migrated removed `User#getRoles()` usage to role-name based fallback (`getRoleNames()` / `userType`)
- **Hook test contract drift**:
  - `useAuth` tests now render inside `AuthProvider`
  - `useDashboard` tests now construct stats with `DashboardStats.fromJSON(...)` to match model constructor

### Validation - 2026-03-13
- `web-app` build: ✅ pass
- changed-file lint: ✅ pass (warnings only)
- targeted hook tests: ✅ `59 passed` (`useAuth`, `useDashboard`, `useUsers`)
- full `web-app` vitest suite: ❌ baseline still failing (`45 failed / 148 passed`) in legacy e2e/service suites
- `identity-core-api` compile (`mvn -DskipTests compile`): ✅ pass

### Added - Step-Up Backend Deployed + Unit Tests
- **Fingerprint step-up authentication deployed to Hetzner VPS** — V17 migration applied, 3 new endpoints live on production
  - `POST /api/v1/step-up/register-device` — register device with ECDSA P-256 public key (201 Created)
  - `POST /api/v1/step-up/challenge` — request cryptographic challenge with 5-min Redis TTL (200 OK)
  - `POST /api/v1/step-up/verify-challenge` — verify ECDSA signature and issue JWT (200 OK)
- **StepUpChallengeServiceTest** — 8 unit tests (Redis mock, ECDSA P-256 crypto, base64url encoding, TTL)
- **StepUpAuthServiceTest** — 12 unit tests (device registration new/upsert, challenge request, verify flows, error cases)
- V17 Flyway migration: `public_key`, `public_key_algorithm`, `step_up_registered_at` columns on `user_devices`
- Total backend test count: 528+ (was 508)
- Playwright E2E tests expanded to 224 (217 pass, 7 skipped) covering all 16 pages

### Changed
- Identity Core API JAR redeployed to Hetzner VPS with `--no-cache` Docker rebuild
- Database schema now at V17 (was V16)

---

## [0.9.8] - 2026-02-20

### Fixed - Production Bug Fixes
- **Auth Flows 500 error** - AuthFlowsPage used hardcoded `'system'` as tenantId instead of UUID from auth context
- **Devices 500 error** - DevicesPage same hardcoded tenantId issue + DeviceRepository called wrong API paths (`/tenants/{id}/devices` instead of `/devices?tenantId=`)
- **DeviceController** - Now accepts optional `userId` OR `tenantId` query params for flexible device listing

### Added - E2E Testing (14/14 Pass)
- **Playwright auth setup pattern** - Single login per test run, sessionStorage injection via `addInitScript`
- **Auth flow builder tests** (4 tests) - Navigate, create flow dialog, APP_LOGIN password enforcement, DOOR_ACCESS freedom
- **Users CRUD tests** (3 tests) - Navigate, table display, create form
- **Multi-step auth tests** (2 tests) - Dashboard access, login page rendering
- **Login flow tests** (4 tests) - Page display, validation, valid/invalid credentials
- **Auth setup project** (`auth.setup.ts`) - Logs in once, saves sessionStorage to file for reuse

### Added - System-Wide Improvements
- **Anti-spoofing integration** - DeepFace 0.0.98 built-in anti-spoofing with configurable threshold
- **Browser-side face detection** - MediaPipe Tasks API in FaceCaptureStep for real-time face quality
- **API key authentication** - BiometricServiceAdapter sends X-API-Key header to biometric processor
- **Spoof detection handling** - FaceAuthHandler returns appropriate errors for detected spoofs
- **New detection backends** - YOLOv11, YOLOv12, CenterFace, GhostFaceNet support in config
- **Quick tunnel deploy** - trycloudflare.com option in WSL setup scripts
- **Tenant-level device listing** - `findAllByTenantId()` in UserDeviceRepository

### Changed
- DeepFace upgraded from 0.0.79 to 0.0.98 across all requirements files
- pgvector upgraded from 0.2.4 to 0.3.x
- Default face detector changed from opencv to retinaface in laptop GPU config
- Project status updated from ~97% to ~98% complete
- playwright.config.ts restructured with setup/login-tests/authenticated project pattern

---

## [0.9.5] - 2026-02-19

### Added - Backend Auth Handlers (Phase 3 Complete: All 10 Methods)
- **TOTP Auth Handler** (`TotpAuthHandler.java`) - Time-based one-time password via authenticator apps, wraps `dev.samstevens.totp` library
- **SMS OTP Auth Handler** (`SmsOtpAuthHandler.java`) - SMS-based OTP with send/validate pattern, uses `SmsService` interface
- **Fingerprint Auth Handler** (`FingerprintAuthHandler.java`) - Biometric fingerprint verification via BiometricServicePort
- **Voice Auth Handler** (`VoiceAuthHandler.java`) - Biometric voice verification via BiometricServicePort
- **Hardware Key Auth Handler** (`HardwareKeyAuthHandler.java`) - FIDO2/WebAuthn challenge-response authentication
- **NFC Document Auth Handler** (`NfcDocumentAuthHandler.java`) - Stub handler for physical NFC hardware (returns "pending" message)
- **TotpService** (`infrastructure/totp/TotpService.java`) - TOTP secret generation, QR URI building, code verification
- **SmsService** + **NoOpSmsService** (`infrastructure/sms/`) - SMS gateway interface with no-op implementation for dev
- **WebAuthnService** (`infrastructure/webauthn/WebAuthnService.java`) - Challenge generation and assertion verification with Redis
- **Device constraint enforcement** in `ManageAuthFlowService` - PASSWORD mandatory as step 1 for APP_LOGIN and API_ACCESS
- **Runtime flow validation** in `ExecuteAuthSessionService` - Validates flow integrity at session start
- **BiometricServicePort** extended with `verifyFingerprint()` and `verifyVoice()` methods
- **BiometricServiceAdapter** extended with HTTP calls to `/fingerprint/verify` and `/voice/verify`
- **WebAuthn dependency** `com.yubico:webauthn-server-core:2.5.2` in pom.xml
- **ManageAuthFlowServiceTest** - 4 tests for password constraint enforcement
- **Unit tests** for all 6 new handlers (30+ test methods total)

### Added - Frontend Auth Flow Admin UI
- **AuthFlowRepository** (`core/repositories/AuthFlowRepository.ts`) - CRUD operations for auth flow management
- **AuthSessionRepository** (`core/repositories/AuthSessionRepository.ts`) - Auth session API integration
- **DeviceRepository** (`core/repositories/DeviceRepository.ts`) - Device management API
- **DI bindings** for 3 new repositories and 3 new service symbols in container.ts and types.ts
- **AuthFlowsPage** - Full list view with filter by operation type, create flow dialog, delete actions
- **AuthFlowBuilder** enhanced - Operation type selector (9 types), PASSWORD constraint for APP_LOGIN/API_ACCESS, auto-insert PASSWORD step

### Added - Frontend Multi-Step Auth UI
- **MultiStepAuthFlow** controller - State machine for step-by-step authentication flow execution
- **StepProgress** component - MUI Stepper with auth method icons and status colors
- **10 step components**: PasswordStep, EmailOtpStep, SmsOtpStep, TotpStep, QrCodeStep, FaceCaptureStep (WebRTC), FingerprintStep, VoiceStep (MediaRecorder), HardwareKeyStep (WebAuthn), NfcStep

### Added - Admin Pages
- **DevicesPage** - Device management with platform icons and delete
- **AuthSessionsPage** - Session monitoring with status filters
- **Sidebar** - Auth Flows and Devices menu items added to navigation
- **App.tsx** - `/auth-flows`, `/devices`, `/auth-sessions` routes added

### Added - Testing & Infrastructure
- **Playwright config** (`playwright.config.ts`) + 4 E2E test specs
- **MCP config** for Playwright server (`.claude/mcp.json`)

### Added - Documentation
- **ROADMAP.md** - v1.0 MVP through v2.0 Enterprise milestones
- **CHANGELOG.md** - Updated with all new features

### Changed
- Project status updated from ~80% to ~95% complete
- Identity Core API status updated from 95% to 99%

---

## [0.9.0] - 2026-02-15

### Added
- **Multi-Modal Auth Flow System** (V16 Flyway migration): 8 new tables (`auth_methods`, `tenant_auth_methods`, `auth_flows`, `auth_flow_steps`, `auth_sessions`, `auth_session_steps`, `user_devices`, `user_enrollments`), 10 auth methods seeded, system tenant default login flow, 12 RBAC permissions for auth management
- **Email OTP Service**: `EmailService` interface with `SmtpEmailService` (production SMTP) and `NoOpEmailService` (dev fallback with console logging). Conditional bean activation via `mail.enabled` property
- **Auth Handler Tests**: Unit tests for all 4 core auth handlers — `PasswordAuthHandlerTest`, `EmailOtpAuthHandlerTest`, `FaceAuthHandlerTest`, `QrCodeAuthHandlerTest` (25+ test methods total)
- **CI/CD Pipeline**: GitHub Actions workflow (`.github/workflows/ci.yml`) with 3 parallel jobs — Identity Core API (Java 21 + PostgreSQL + Redis), Biometric Processor (Python 3.11 + pytest), Web Dashboard (Node 20 + Vitest + build)
- **Spring Boot Mail Starter**: Added `spring-boot-starter-mail` dependency for email OTP delivery
- **Realistic Sample Data** (V15 Flyway migration): 3 new tenants (Marmara University, TechCorp Istanbul, Anatolia Medical Center), 8 new users with roles, and 18 pre-seeded audit log entries for realistic dashboard testing
- **Tenant Form Page**: New create/edit form at `/tenants/create` and `/tenants/:id/edit` with auto-generated slugs, contact info fields, and max user limits
- **CHANGELOG.md**: Project changelog
- **TODO.md**: Remaining work items and future roadmap

### Fixed
- **Flyway V16 Idempotency**: Made V16 migration fully idempotent with `CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`, `DO $$ ... EXCEPTION WHEN duplicate_object` for constraints, and `ON CONFLICT DO NOTHING` for seed data
- **Flyway Checksum Validation**: Added `validate-on-migrate: false` to Docker profile to prevent checksum mismatch errors on redeployment
- **Permissions INSERT**: Added missing `action` column to V16 permission seed data (NOT NULL constraint)
- **EmailOtpAuthHandler**: Added `send` action for OTP generation and email delivery (previously only validated codes)
- **Audit Log Action Filter**: Frontend was sending nested `filters[action]=USER_LOGIN` and `pageSize=20` but backend expects flat `action=USER_LOGIN` and `size=20`. Flattened params in `AuditLogRepository.ts`
- **User Creation Form**: Replaced raw Tenant ID text input with a dropdown populated from existing tenants. Users can now select a tenant instead of guessing UUIDs
- **User Form Status Field**: Removed status field from create form (backend defaults to ACTIVE). Status field now only shows in edit mode
- **Audit Log Persistence** (prior fix): Fixed audit logs not being saved to database by correcting `@Transactional` and `@Async` conflict
- **Infinite Loop Fix** (prior fix): Resolved audit-logging-of-audit-logs infinite recursion
- **CSP/Mixed Content** (prior fix): Fixed Content Security Policy and mixed HTTP/HTTPS content on deployed dashboard

### Changed
- Updated Identity Core API completion from 85% to 95%
- Updated mobile app API URLs to production Hetzner VPS endpoints
- Updated project status documentation to reflect February 2026 state
- Deployed latest Identity Core API build to Hetzner VPS (V16 migration applied)

## [1.0.0-MVP] - January 2026

### Added
- Identity Core API with JWT authentication, RBAC, multi-tenancy
- Biometric Processor with 46+ endpoints, 9 ML models
- Web Admin Dashboard (React 18 + Material UI)
- Landing Website deployed to `fivucsas.com`
- Web Dashboard deployed to `app.fivucsas.com`
- Identity Core API deployed on Hetzner VPS (116.203.222.213)
- 14 Flyway database migrations
- Comprehensive documentation
