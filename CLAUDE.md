# FIVUCSAS — Claude Code Instructions

## Project
**FIVUCSAS** (Face and Identity Verification Using Cloud-based SaaS)
Multi-tenant biometric auth platform | Marmara University CSE4297 | Hexagonal Architecture

**Status**: Production deployed. Phases 0-8 complete. ~4,400 authored tests. All services healthy.
**Last verified**: 2026-06-03 (**Docs/diagrams/poster overhaul (2026-06-03 eve, PRs #146–#150):** poster→**v6** (decoded the self-unpacking design bundle → static no-JS HTML + the supplied A0 PDF master) LIVE at fivucsas.com/poster, old LaTeX poster suite + variants removed; **diagrams.html gallery** gained a polished hand-built **C4 hero SVG**, a new **Section 05** (threat model · tenant-flow composition · KVKK/GDPR lifecycle · deployment trust-boundary), a **Biometric-Puzzle** sequence, **ER split 1b/1c/1d**, and an HTML **use-case grid** (replacing the 3173px-tall flowchart); **docs.fivucsas.com rebuilt as a VitePress "book"** (`docs-site/book/`: guide chapters + inline Mermaid + gallery/API-ref appendix in `book/public/`, cross-site launcher in `head`, local search, sitemap, clean-URL `try_files`, no-cache HTML, multi-stage Dockerfile) — all live-verified incl. click-tests; rollback images `docs-site-docs:rollback-20260603` (static) + `rollback-bookv1-20260603` kept. Gallery accuracy validated vs code: Flyway→**V83**, MfaSession TTL→**15m** (AuthenticateUserService). **GALLERY-EDIT GOTCHA:** edit `docs-site/html/diagrams.html` then copy to `docs-site/book/public/diagrams.html` (the book serves the copy); links to static files need `target="_blank"` or the SPA 404s. bio benchmark harness **PR #137 OPEN** for the teammate's eval CSVs — the LFW/AgeDB/CFP-FP face numbers are **Ayşenur's real eval (held off-repo), NOT fabricated** (the earlier "fabricated" call was retracted). 2026-06-03 (pre-demo sweep): **16-finding user sweep — canonical doc `USER_FINDINGS_2026-06-03.md`** (per-issue root cause + demo-day operator plan + post-demo backlog). 3 operator-requested deliverables DONE: **(1) APK rebuilt** — release-signed from `client-apps` origin/main (verified `CN=FIVUCSAS, O=Marmara University`, upgrades in place), clears #9 Activity History / #10 My-Invitations error / #8 copy (all stale-APK — fixed by #82/#83, just never rebuilt); artifact at `client-apps-apk-v5.3.0-rebuild-2026-06-03.release/`. **(2) Demo-day relief script** `scripts/demo-day-relief.sh` (dry-run default / `--go` / `--revert`): raises Traefik rate limit, clears account lockouts, flushes Redis `rate_limit:*` + `otp:*:attempts`, bumps `JWT_EXPIRATION` 15m→2h, recreates api — **no rebuild**, all reversible; addresses #3 "too many requests" + #2 short mobile session. Secrets never touch the host (expanded inside containers). **(3) Verify step-counter fix** — web-app PR #202 ports the dashboard #158 preflight-authoritative `flowTotalSteps` into `verify-app/LoginMfaFlow.tsx`, killing the 1/2→2/3 denominator jump (#13); display-only/additive/reversible. **MERGED + FULLY DEPLOYED 2026-06-03** (user chose "full ship"): squash-merged to main (`9796d869`) → `app.fivucsas.com` dashboard auto-deployed via Hostinger (run 26882903664 success) + `verify.fivucsas.com` Docker rebuilt to bundle `index-m1t1pf45.js` (container healthy, asset + `/health` 200, CSP/cache/XFO headers preserved). Safe because the uncommitted verify-widget infra changes (`secure-headers-framable@file` middleware, framing-CSP allowlist, `Cache-Control: no-cache`) were already LIVE + the middleware is defined in `infra/traefik/config/dynamic.yml:157`. Perception/by-design (no code change): #4/#16 approve-login IS selectable as a Layer-1 shortcut on the FIRST login screen (before entering email); #5 duplicate MRZ already fixed in #80; #12 autofill color fix already deployed (stale SW cache → hard-reload); #14 mobile system-tenant login is BY DESIGN (`fivucsas-mobile` OAuth client, `cross_tenant=TRUE`, token carries the real tenant). Genuinely-open code (POST-DEMO backlog, NOT shipped — reversibility-sensitive): #7 NFC chip-read needs on-device `adb logcat` (manifest `TECH_DISCOVERED` races reader-mode + `WaitingForCard` guard; byte-identical v5.3.0 vs main so a rebuild won't help), #2 mobile refresh never retries the 401'd request, #11 tenant member COUNT zeroed by Hibernate `tenantFilter` (→ `TenantFilterBypass`), #15 mobile login never creates a `UserDevice` row, #1 mobile QR approve swallows non-2xx (→ `isSuccess()` guard), #3 make rate-limit/lockout thresholds env-configurable. Earlier 2026-06-03: **Mobile triage + cross-device login finish.** Investigated ~10 user-reported v5.3.0 mobile issues (doc `client-apps/docs/MOBILE_TRIAGE_2026-06-03.md`). **NFC-MRZ-disabled + QR-invisible-button were already fixed in the v5.3.0 tag (#80)** — re-reports = stale APK; verify the installed build first. Mobile demo-safe fixes (**client-apps #82**, merged): My-Invitations crash→empty (the `GET /api/v1/invites/received` it called has NO backend endpoint, so the 404 body was decoded as a list → crash), removed 3 dead Settings toggles (Notifications/Biometric/Analytics, 2 default-ON no-ops) + fixed the false "Voice, Voice Search, OTP, TOTP, Liveness, Card, Token" auth-methods label → "Authenticator app (TOTP)" (card retitled "Authentication"), "Card Added"→"Photos Captured (preview only)" (Add-Card images are never uploaded), hid the dead notifications bell (no backend feed). Activity History wired to the existing user-scoped `GET /api/v1/my/activity` (**client-apps #83**, merged; admin `/audit-logs` 403s for users). **Web cross-device login (web-app #199, merged + DEPLOYED):** re-homed the "Approve on another device" button (it had been removed from `Layer1Shortcuts` in #141 and never re-attached → the mobile "Login requests" screen was permanently empty because nothing could initiate a request) + NEW "Sign in with your phone" QR scan-to-login (`qr-login.ts` + `QrLoginPanel` on BOTH dashboard `LoginPage` + hosted `HostedLoginApp`; the QR encodes the **sessionId** as `fivucsas://qr-login?session=<id>`, NOT the API's random `qrContent` which is not a Redis lookup key → would 404). Deploy: `app.fivucsas.com` auto-deployed via the `deploy-hostinger.yml` workflow on merge; `verify.fivucsas.com` rebuilt (Docker, bundle `index-C-1n2ebY.js`, container healthy). Browser-verified LIVE on app.fivucsas.com — both buttons render + QR panel creates a real session and polls, 0 console errors. **DEFERRED (user chose deploy-web-now):** QR multi-step handoff — a multi-step tenant (e.g. Marmara) returns `mfaRequired` and the panel shows "continue here" rather than bridging the `mfaSessionToken` into the step-up flow; the clean fix needs the next step's `availableMethods` added to the QR poll response (mirror `beginIdentifierLogin`) + wiring, held to avoid a prod API rebuild ~2 days pre-demo. Mobile fixes (scope-A + #83) reach the phone only on an operator **APK rebuild + reinstall**. Backend invitations-received listing + notifications-feed endpoints still do not exist. 2026-05-30: **Auth program — cross-device / authenticator login.** SHIPPED + DEPLOYED: **passkey hybrid web login** (discoverable + usernameless; anonymous `POST /webauthn/passkey/authenticate-options` + `/passkey/authenticate`, **Flyway V72** adds `WebAuthnCredential.discoverable` + `user_handle`; "Sign in with a passkey" → browser-native hybrid QR, no app needed — THE cross-device answer; api #161, web #137); **no-Firebase number-matching approve-login** (Redis-backed `POST /auth/approve-login/session` → poll → authed-approver `/decide`; `matchNumber` is a zero-padded STRING; web initiator + client-apps approver shared KMP stack; api #161, web #137, client-apps #53); **NFC chip-trust** (api consumes bio `POST /nfc/verify-authenticity`, **fail-closed**), **serial canonicalization** (UPPERHEX-no-separators so mobile-enrolled cards match web verify), **guest-invite email EN/TR i18n** (api #159, bio #131); **mobile login fixes v5.2.3** (MFA-handoff flicker fix + the "server-200-flipped-to-failure" regression fix + UX, client-apps #44/#46/#52). Prod: api rebuilt + V72 applied; web → Hostinger (`index-B7OwE7r8.js`) + verify.fivucsas.com Docker (`index-BBN--UaC.js`, /login 200); rollback tag `identity-core-api-…:rollback-pre-passkeys-20260530`. **OPERATOR-BLOCKED at runtime:** ICAO CSCA roots (Turkey) must land in bio `NFC_CSCA_TRUST_DIR` before any SOD-carrying NFC client passes (serial-only unaffected). **OPEN:** a separate on-device mobile login bug (server 200 AUTHENTICATED, app shows "Verification failed") — needs the developer's debug-build adb logcat. **CONFIG-DRIVEN + IDENTIFIER-FIRST LOGIN — SHIPPED + DEPLOYED (Marmara canary; global switch still OFF).** The config-driven engine (password-as-a-factor + usernameless-in-flow + `GET /auth/login-config` + flow-builder) and its **identifier-first** UI are live: `login-config` returns **`engineActive`** (api #168); engine-ON tenants open identity-first (email screen 1, password + every factor after — web #141), with the async-config opening-phase fix in web #142. Verified live on `verify.fivucsas.com?client_id=marmara-bys-demo` (2-step identifier-first; dashboard login unchanged). Flag-gated (`app.auth.config-driven-login` default OFF + `app.auth.config-driven-login-tenants` canary = Marmara `1111…`); **revert = env flag, no redeploy**. Next: global enable after canary soak. Full tracker: `ROADMAP_AUTH_2026-05-30.md`. 2026-05-29: **Card detection client-only + true nano model + launcher/rebrand finish.** Card detection is now **CLIENT-ONLY** — the server `/biometric/card-detect` fallback was removed (web-app #111), so the in-browser ONNX model is the sole path and the bio container needs no card-path rebuild. The shipped card model is **Ayşenur's true 12.3 MB YOLOv8n (opset 12)**, integrated client- and server-side (web-app #109, biometric-processor #116) — replacing the old 51 MB YOLOv8m; user-verified detecting correctly and loading ~4× faster. `amispoof` got an **"Am I Spoof?"** display rebrand (launcher app-switcher tile + amispoof page hero/titles + landing labels; the domain stays lowercase `amispoof.fivucsas.com`). The shared suite-launcher rollout is **finished**, including the verify surface (landing + integrator explainer ONLY — NOT the active auth/login flow) and the authenticated app dashboard. MFA dark-mode "black box" code-input fix + auth-flow editing hardened to create-first (delete→create data-loss + dropped-default bugs) shipped in web-app #108. Marmara's default `APP_LOGIN` flow is now **PASSWORD + pick-one {EMAIL_OTP, TOTP, QR_CODE}** (prod DB; rollback runbook in identity-core-api/docs). Details in `PROJECT_STATUS_2026-05-29.md`. 2026-05-28: **Suite launcher unified + security backlog.** Redesigned shared `<fivucsas-launcher>` web component (web-app #103) — hosted at `app.fivucsas.com/launcher.js` (ships in web-app `public/` → Hostinger deploy), it is the ONE cross-site app switcher + global EN/TR toggle. Rolled out to `demo`, `docs` (+3 subpages: biometric/identity/sdk), `amispoof` (web-app #104 removed the amispoof auto-skip), and `landing`; deleted every site's bespoke "FIVUCSAS suite" cross-site bar + per-site EN/TR switch, incl. the dashboard TopBar toggle (Settings-page language `<select>` kept). One toggle drives `html[data-lang]` (static sites localize via `[data-lang]` CSS) and fires a `fivucsas:languagechange` CustomEvent → `i18n.changeLanguage` for the React surfaces (dashboard + verify share `web-app/src/i18n/index.ts`; landing listens in `App.tsx`). `links.fivucsas.com` keeps its own controls — it IS the hub. **api #111 (S13)**: TOTP used-code replay prevention — bounded ~120s Redis `SET key 1 EX NX` marker per `(userId, timeStep)`, max ~3 in-window markers/user, in-memory fallback capped 50k; NOT an infinite blacklist; enrollment keeps plain verify (legit retries). **web #102 (F13/F9)**: surfaced swallowed voice-enrollment errors via `formatApiError` + the `OTP_ATTEMPTS_EXHAUSTED` state. **F12** voice threshold verified CORRECT (verify = cosine *similarity* `>=` 0.65; search = pgvector `<=>` cosine *distance* `< 0.6`) — no change. **Prod rebuild + full-repo unmerged-work scan (2026-05-28 cont'd):** rebuilt `identity-core-api` (image was 2 weeks old) → deployed 8 merged-but-undeployed security fixes (S1/S2/S9/S11/S13/S14/F14 + the JWT-aud/MFA-fail-open bundle). The rebuild crash-looped ~11 min because `.env.prod` had `APP_SECURITY_JWT_AUDIENCE=` **blank** (an empty value OVERRIDES the `:fivucsas-api` default; #100 fails fast on blank in prod) — fixed to `fivucsas-api`, see api CLAUDE.md operator note. Docker build also needed api #112: `mvn dependency:go-offline` is now best-effort (a purged upstream `jackson-databind:*-SNAPSHOT` in the transitive closure broke it; the real `mvn package` resolves via the jackson-bom pin). Scanned ALL repos (most "unmerged" branches are squash-merge debris). **Merged:** FIVUCSAS #70 (redacted a still-live partial secret on master), web #94 (ws CVE DoS), bio #104/#108/#109, api #101 + #102 (rebased onto main + ArchUnit store re-frozen via Maven container) + #99 (**V61** `audit_logs.tenant_id NOT NULL` — self-gating: pre-checks 0 NULLs & fails loud, metadata-only ALTER; applies on the next api rebuild), bio #106 (mp.solutions→`mp.tasks.vision.FaceLandmarker` port, bakes `face_landmarker.task`). **Closed superseded:** spoof #18, FIVUCSAS #68, **bio #107** (mislabeled — deleted best.pt + repointed to a non-existent best.onnx, added no model). **Held (need work):** bio #105 (`liveness_errors.py` already on main + failing test → rebase), web #90 (server-validate puzzles — its 2 backend routes are unshipped, soft-passes on 404), spoof #54 (paper-section rebase + pilot-table integrity) + #56 (stacked on #54). Flagged NO-merge: spoof `learned-fuser` branch ("100% accuracy / ACER 0.00%" on a 120-video subset — reproducibility review before any paper use). **Card detection → CLIENT-ONLY** (web-app #106, made client-only in web-app #111): `useCardDetection` runs the YOLO model in-browser (onnxruntime-web, no server round-trip). The server fallback to identity-core-api `/biometric/card-detect` was REMOVED in #111 — the in-browser ONNX model is the only path. The deployed `web-app/public/models/yolo-card-nano.onnx` is now Ayşenur's TRUE **12.3 MB YOLOv8n** (opset 12), delivered + integrated via web-app #109 (client manifest/labels + bucket SHA256) and biometric-processor #116 (`best.onnx` in-repo, `best.pt` dropped). The biometric-processor container does NOT need a rebuild for the card model anymore (server card path removed). 2026-05-21: `links.fivucsas.com` hub — API tile → `/swagger-ui.html` with admin-IP "gated" badge (raw API root returned 401), Turkish i18n role-label fixes (English under `lang=tr` was İ-mangling Latin `i` under uppercase), team contact info, Ayşenur LinkedIn URL fix; poster author contact block + **regenerated A0 PDF/PNG** from `landing-website/public/poster/files/fivucsas-poster.html`; attribution — Ayşe Gülsüm Eren GitHub `@aysegulsum` + `marun.edu.tr` academic emails across `spoof-detector` + `practice-and-test` (forensic git-author records left intact); bilingual TR/EN switchers completed on `bys-demo`/`docs-site`/`verify-widget`. Consolidated into PR #69 → `master` (whole `fix/2026-05-12-bake-mini-fasnet-models` branch). NOTE: `api.fivucsas.com/` returns 401 by design (it's an API origin, not a page); Swagger/`/v3/api-docs`/`/actuator` are admin-IP gated (403 public), OIDC discovery is public (200). Carry-forward from 2026-05-12 / 2026-05-11: 11 PRs shipped across 5 repos + Flyway repair on prod, V59/V60 applied, branch protection on 6 branches, master/main reconciled, INVESTIGATION 2026-05-07 P1 residue closed, tenant onboarding playbook + 8 ADRs + docs/ hierarchy consolidated, spoof-detector blink cache + EAR recalibration paper-P0. **Added today**: parent PR #57 (poster suite: A0 default + 4 style variants compliant with CSE4198 §5.1) + parent PR #58 (archived 18 dated 2026-04/2026-05-04 docs into `archive/2026-05/{audits,plans,reviews,roadmaps,sessions}/`, tidied `.gitignore`); bio PR #99 (closed issue #91: 32 stale unit tests + 3 asyncio-fixture leaks fixed, no production code touched, module-scoped TestClient pattern documented for follow-ups); bio Dependabot #97/#98 in flight (rebased post-#99). Submodule pointer for biometric-processor bumped to post-#99 main.)

## Architecture

```
Clients: Web (React 18) | Mobile (KMP/Compose) | Third-Party (Auth Widget/OAuth 2.0)
    ↓ Traefik v3.6.12 (SSL, routing)
Backend: Identity Core API (Spring Boot 3.4.7 / Java 21, port 8080)
         Biometric Processor (FastAPI / Python 3.12, port 8001)
Storage: PostgreSQL 17 + pgvector | Redis 7.4
```

## Production URLs

| Service | URL |
|---------|-----|
| Identity API | https://api.fivucsas.com |
| Web Dashboard | https://app.fivucsas.com |
| Landing Site | https://fivucsas.com |
| Auth Widget / SDK | https://verify.fivucsas.com |
| BYS Demo | https://demo.fivucsas.com |
| Am I Spoof? — browser anti-spoof tester | https://amispoof.fivucsas.com/ (old https://fivucsas.com/amispoof/ now 301s to the subdomain) |
| Uptime Monitor | https://status.fivucsas.com |
| Swagger | https://api.fivucsas.com/swagger-ui.html (admin-IP-gated since IN-H2 2026-04-19; allowlist in `infra/traefik/config/dynamic.yml`) |

### Internal Services (no public route)
| Service | Access |
|---------|--------|
| Biometric Processor | Docker network only (port 8001), API key required |

### Redirects
| From | To |
|------|-----|
| fivucsas.com.tr | 301 → fivucsas.com |
| www.fivucsas.com | 301 → fivucsas.com |

## Server (Hetzner CX43)

- 8 CPU / 16GB RAM / 150GB disk / Ubuntu 24.04
- Docker 29.3.0, Compose v5.1.0
- SSH: `deploy` user, key-based auth
- All projects at `/opt/projects/`

## Key Commands

```bash
# Rebuild + deploy backend
cd /opt/projects/fivucsas/identity-core-api
docker compose -f docker-compose.prod.yml --env-file .env.prod build --no-cache identity-core-api
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d identity-core-api

# Deploy web-app to Hostinger
cd /opt/projects/fivucsas/web-app && npm run build
scp -P 65002 -r dist/* u349700627@46.202.158.52:~/domains/app.fivucsas.com/public_html/

# BYS demo deploy
scp -P 65002 -r /opt/projects/fivucsas/bys-demo/* u349700627@46.202.158.52:~/domains/demo.fivucsas.com/public_html/

# amispoof deploy (TypeScript spoof-detector + webcam tester to amispoof.fivucsas.com)
# Migrated 2026-05-17 from fivucsas.com/amispoof/ → amispoof.fivucsas.com subdomain.
# Old URL serves a 301 to the new one via ~/domains/fivucsas.com/public_html/amispoof/.htaccess.
# We deploy to the NEW subdomain root; the lazy chunks under lib/ + models/ need to be sent too.
cd /opt/projects/fivucsas/spoof-detector/web
npm run build && npm run amispoof:bundle
scp -P 65002 amispoof/index.html amispoof/app.js u349700627@46.202.158.52:~/domains/amispoof.fivucsas.com/public_html/
scp -P 65002 amispoof/lib/spoof-detector.js amispoof/lib/spoof-detector.js.map amispoof/lib/spoof-detector-*.js amispoof/lib/spoof-detector-*.js.map u349700627@46.202.158.52:~/domains/amispoof.fivucsas.com/public_html/lib/
# Models only need to be sent once after the subdomain is created; subsequent deploys can skip these.
# scp -P 65002 amispoof/models/minifasnet_v2.onnx amispoof/models/face_landmarker.task u349700627@46.202.158.52:~/domains/amispoof.fivucsas.com/public_html/models/

# Deploy links hub (links.fivucsas.com — single static index.html)
scp -P 65002 /opt/projects/fivucsas/links-website/index.html u349700627@46.202.158.52:~/domains/links.fivucsas.com/public_html/index.html

# Deploy verify.fivucsas.com (hosted login + auth widget — Docker/nginx via Traefik, NOT Hostinger)
# CRITICAL: build:verify needs VITE_API_BASE_URL. vite.verify.config.ts sets envDir=project root
# so .env.production is loaded — without it env.ts throws at boot and /login renders blank
# (#verify-root never mounts). Preserve the SDK files (fivucsas-auth*.js) at the html root.
cd /opt/projects/fivucsas/web-app && npm run build:verify
rsync -a --delete dist-verify/assets/ ../verify-widget/html/assets/   # assets/ = verify build only
cp dist-verify/index.html ../verify-widget/html/index.html            # keep html/fivucsas-auth*.js
cd /opt/projects/fivucsas/verify-widget
docker compose -f docker-compose.prod.yml build && docker compose -f docker-compose.prod.yml up -d
# Verify: curl -s https://verify.fivucsas.com/ | grep assets/index-  (new hash) — /login must mount React

# Poster = v6 (A0 portrait, 841×1189mm). The PDF is the authoritative print master
# (supplied pre-rendered in RemoteUploads/"FIVUCSAS Poster v6.pdf"). The source design
# is a self-unpacking JS bundle ("FIVUCSAS Poster v6.html"); we ship a DECODED static,
# no-JS HTML as the canonical fivucsas-poster.html. Do NOT headless-render the bundle.
# Canonical served file = landing-website/public/poster/files/fivucsas-poster.html
#   (served at fivucsas.com/poster/files/; the viewer poster/index.html links only to files/*).
cd /opt/projects/fivucsas/landing-website/public/poster/files
# 1) Decode the design-tool bundle → static no-JS HTML (uuids→inline data: URIs):
node /opt/projects/fivucsas/scripts/decode-poster-bundle.js "<path to FIVUCSAS Poster vN.html>" fivucsas-poster.html
# 2) PDF = copy the supplied A0 master (already print-ready):
cp "<path to FIVUCSAS Poster vN.pdf>" fivucsas-poster.pdf
# 3) Preview PNG = first page of the PDF (A0 @ 36dpi ≈ 1192×1686 px):
pdftoppm -png -r 36 -f 1 -l 1 fivucsas-poster.pdf /tmp/v6prev && mv /tmp/v6prev-1.png fivucsas-poster-preview.png
# 4) Deploy (Hostinger static; the bundle embeds its own fonts/crests — no files/assets/ dir):
scp -P 65002 fivucsas-poster.html fivucsas-poster.pdf fivucsas-poster-preview.png u349700627@46.202.158.52:~/domains/fivucsas.com/public_html/poster/files/
scp -P 65002 /opt/projects/fivucsas/landing-website/public/poster/index.html u349700627@46.202.158.52:~/domains/fivucsas.com/public_html/poster/index.html

# Deploy docs.fivucsas.com — the VitePress "book" (Docker/nginx via Traefik, NOT Hostinger)
# Source: docs-site/book/ (VitePress; chapters + inline Mermaid). The multi-stage Dockerfile
# (node build -> nginx serve) builds it; book/public/ carries the diagram gallery + the 3
# OpenAPI ref pages verbatim (so /diagrams.html + /identity//biometric//sdk/ still resolve).
# GALLERY SOURCE = docs-site/html/diagrams.html; after editing it, copy it to
#   docs-site/book/public/diagrams.html (the book SERVES the public/ copy). Likewise links to
#   the gallery / API refs MUST use target="_blank" (raw <a> in md; target on nav/sidebar/hero
#   items) or VitePress's SPA router 404s them. nginx try_files resolves the clean /diagrams URL.
# The old static docs-site/html/ stays in-repo for a trivial revert.
cd /opt/projects/fivucsas/docs-site
docker tag docs-site-docs:latest docs-site-docs:rollback-$(date +%Y%m%d)   # capture rollback point first
docker compose -f docker-compose.prod.yml build && docker compose -f docker-compose.prod.yml up -d
# REVERT (instant, no rebuild): docker tag docs-site-docs:rollback-YYYYMMDD docs-site-docs:latest \
#   && docker compose -f docker-compose.prod.yml up -d --no-build    (or: git revert the PR + rebuild)

# Check all services
docker ps --format "table {{.Names}}\t{{.Status}}"

# Drift check — production vs origin/master (run before demos/deploys; read-only)
# Catches fixes shipped straight to prod but never merged back. Exit 1 = live
# static content out of sync with master; submodule/docker findings are advisory.
scripts/drift-check.sh                 # full sweep (static + submodules + docker)
scripts/drift-check.sh --static        # only Hostinger static files
scripts/drift-check.sh --no-fetch -q   # fast, summary only
```

**ALWAYS use `--env-file .env.prod`** for Docker compose on prod.
**ALWAYS use bare `git push`** (not `git push origin main 2>&1`).

## Repository Structure

```
FIVUCSAS/                    # Parent repo (submodules)
├── identity-core-api/       # Spring Boot API (Maven, NOT Gradle)
├── biometric-processor/     # FastAPI ML service
├── web-app/                 # React dashboard → Hostinger
├── client-apps/             # Kotlin Multiplatform (Android/iOS/Desktop)
├── docs/                    # Architecture docs + plans
├── bys-demo/                # Demo site (static HTML)
├── landing-website/         # Landing page → Hostinger
├── links-website/           # links.fivucsas.com hub (static index.html) → Hostinger
├── practice-and-test/       # R&D experiments
├── scripts/                 # Deploy scripts, setup-twilio.sh
└── ROADMAP.md               # Product roadmap
```

## Auth Methods (10)

PASSWORD | EMAIL_OTP | SMS_OTP | TOTP | FACE | VOICE | FINGERPRINT | HARDWARE_KEY | QR_CODE | NFC_DOCUMENT

**Cross-device login surfaces (2026-05-30, shipped):** **passkey hybrid login** (discoverable
WebAuthn mode — browser/OS resolves the user by `userHandle`, no app needed; folds into the
WebAuthn/HARDWARE_KEY method as its discoverable mode) and **approve-login** (no-Firebase,
number-matching, poll-based cross-device approval; companion to QR_CODE). The config-driven
login work (in-flight, feature-flagged) will surface PASSKEY + APPROVE_LOGIN as selectable
Layer-1 methods in the flow builder — see `ROADMAP_AUTH_2026-05-30.md`.

## Architectural direction (2026-04-16)

**Hosted-first auth.** Primary integration mode is redirective OIDC: tenants call `FivucsasAuth.loginRedirect({...})` → user redirected to `verify.fivucsas.com/login` → MFA → browser returns with `?code=…&state=…` → tenant exchanges at `/oauth2/token`. Widget iframe remains for **inline step-up MFA** only. See `web-app/docs/AUDIT_REPORT_2026-04-16.md` and `web-app/docs/plans/HOSTED_LOGIN_INTEGRATION.md` (PR-1).

**Why:** Industry pattern (Auth0 Universal Login, Okta, Microsoft Entra, Google, Apple, Keycloak, AWS Cognito, Stripe, Turkish banks, e-Devlet all use hosted-first). Solves Web NFC iframe restriction, WebAuthn cross-origin edge cases, Safari ITP, 3P cookie death.

**Platform coverage:** web, iOS (ASWebAuthenticationSession + AppAuth), Android (Custom Tabs + AppAuth), Electron/desktop (loopback per RFC 8252), CLI. Redirect-URI allowlist accepts HTTPS, custom schemes, and `http://127.0.0.1:*`.

## Key Features

- Multi-tenant with tenant-controlled auth flows
- 2FA (admin-configurable: PASSWORD + any second factor)
- OAuth 2.0 / OIDC with PKCE support (code + id_token, JWKS, discovery)
- Hosted login page (primary) + embeddable widget (step-up MFA, secondary)
- Identity verification pipeline (~10 step-type handlers — DOCUMENT_SCAN, DATA_EXTRACT, FACE_MATCH, LIVENESS_CHECK, NFC_CHIP_READ, ADDRESS_PROOF, WATCHLIST_CHECK, AGE_VERIFICATION, PHONE_VERIFICATION, VIDEO_INTERVIEW — and 5 industry templates: FINTECH_KYC, HEALTHCARE_BASIC, EDUCATION_AGE, TELECOM_ONBOARDING, SIMPLE_DOCUMENT; 3 DB-seeded flows)
- BlazeFace on-device face detection (client-side ML)
- My Profile page (enrollments, activity, data export, KVKK/GDPR)
- Cross-device session management (view/revoke)

## Biometric Pipeline (CRITICAL — Read Before Touching biometric-processor or web-app auth)

**Architecture decision:** Auth kararı sunucuda olmalı — tarayıcı güvenilmez. Client geometry embedding (512-dim landmark distance) LOG-ONLY'dir, auth için kullanılmaz (D2 kararı).

### Gerçek Üretim Durumu (2026-04-28 afternoon, post-fix)
| Katman | Durum |
|---|---|
| Client detection (auth) | ✅ MediaPipe FaceLandmarker 478pt primary, BlazeFace fallback |
| Server detection | ✅ MTCNN (bundled weights, deviation from centerface roadmap due to DeepFace bug) |
| Server embedding | ✅ Facenet512 (512-dim) |
| Server liveness (/verify) | ✅ UniFace MiniFASNet passive — `LIVENESS_BACKEND=uniface`, `LIVENESS_MODE=passive` |
| Server liveness (/enroll) | ✅ Wired |
| Server anti-spoofing | ✅ `ANTI_SPOOFING_ENABLED=true` |
| Client passive liveness | ✅ `PASSIVE_LIVENESS_THRESHOLD=0.45` gate in useFaceChallenge |
| Client quality scoring | ✅ Bbox fallback when no landmarks; weights redistribute to blur*0.55+lighting*0.45 |
| pgvector search | ✅ Üretimde |
| Adaptive threshold | ✅ `VERIFICATION_THRESHOLD_AGED_*` for >2yr-old embeddings |

### Kural: Embedding Dimension Tutarlılığı
`FACE_RECOGNITION_MODEL` ile `EMBEDDING_DIMENSION` her zaman eşleşmeli:
- `Facenet` → `EMBEDDING_DIMENSION=128`
- `Facenet512` → `EMBEDDING_DIMENSION=512`
- Model değiştirince **tüm embeddingler geçersiz** — yeniden enrollment zorunlu

### Kural: GPU Gerektiren Modeller
`ALLOW_HEAVY_ML=false` (default) iken bu modeller boot'u engeller:
- `FACE_DETECTION_BACKEND`: `retinaface`, `yolov8`, `yolov11*`, `yolov12*`
- `FACE_RECOGNITION_MODEL`: `ArcFace`, `VGG-Face`, `GhostFaceNet`

CX43 CPU-only — GPU ihtiyacı doğmaz (Faz 1-3 roadmap CPU-safe).

### Kural: Liveness Entegrasyonu
`/liveness` endpoint'i ayrı çalışıyor. `/enroll` ve `/verify` liveness çağırmıyor — bu kasıtlı değil, açık bir boşluk. Faz 2'de düzeltilecek.

**Detay:** `archive/2026-04-pre-roadmap-2028/BIOMETRIC_PIPELINE_AUDIT_2026-04-28.md` | **Roadmap:** `archive/2026-04-pre-roadmap-2028/BIOMETRIC_ROADMAP_2026-04-28.md`

## Database

- Flyway migrations V0-V83 — 83 files, V13 number unused (identity-core-api; e.g. V37 tenant_id index, V38 SPA public client flip, V59 audit_logs tenant_id backfill, V60 refresh_tokens plaintext column drop, V73 passkey seed, V79 NFC serial backfill, V80 fivucsas-mobile OAuth client, V81 consent singleton, V82 cross_tenant clients, V83 widen chk_enrollment_method for approve_login/passkey) + Alembic 0001-0005 (biometric-processor)
- Key tables: users, tenants, auth_flows, auth_flow_steps, auth_methods, biometric_enrollments, audit_logs, oauth2_clients, verification_sessions, voice_enrollments (V33), client_embedding_observations (Alembic 0004, log-only per D2), mfa_sessions (V35 consumed_at, V36 client_id for cross-client replay guard), oauth2_clients.confidential (V34)
- pgvector HNSW indexes on face_embeddings + voice_enrollments; no HNSW on observations (log, not search surface)

## Testing

| Module | Tests |
|--------|-------|
| Identity Core API (JUnit) | 1,595 (+22 parameterized) |
| Biometric Processor (pytest) | 888 |
| Web-app (Vitest) | ~1,025 |
| Client-apps (Kotlin) | 561 |
| Playwright E2E | 336 |
| **Total** | **≈4,405 authored** |

> Authored test cases, re-verified 2026-06-11 against the source tree (Kotlin exact: 489 commonTest + 30 androidApp instrumented + 25 desktopTest + 17 androidApp JVM unit; `~` = counting-method tolerance for parameterized/e2e). Same numbers cited in the graduation thesis — see `Thesis/README_THESIS.md`. (Earlier "633 Java / ~1,800" and "568 Kotlin / 1,591 Java" were stale.)

## CI/CD

- **web-app** CI runs on `ubuntu-latest` (both public-repo jobs). Self-hosted
  `hetzner-cx43` runner reserved for the `Deploy to Hostinger` workflow only.
- **identity-core-api** CI split: unit tests (`mvn -T 2C test`) on `ubuntu-latest`,
  integration tests (Testcontainers, gated on `RUN_INTEGRATION=true`) on the
  self-hosted runner.
- All pipelines GREEN (web-app, identity-core-api, client-apps, biometric-processor).
- Dependabot configured (weekly, grouped, limit 5). As of 2026-04-18: 0 open
  vulnerabilities after protobufjs + follow-redirects merges.

## Design Documents (docs/plans/)

| Document | Topic |
|----------|-------|
| SMS_ACTIVATION_PLAN.md | Twilio integration (hexagonal) |
| CLIENT_SIDE_ML_PLAN.md | Pre-filter-only strategy v2.0 (D1-D4 locked 2026-04-14) |
| BYOD_ARCHITECTURE.md | Tenant own-DB (8 weeks) |
| VOICE_STT_PLAN.md | Speech-to-text verification |
| BAAS_RENTAL_MODEL.md | BaaS pricing model |
| PRODUCTION_HARDENING_PLAN.md | Security + performance |
| MULTI_METHOD_2FA_DESIGN.md | Multi-method 2FA dispatcher |
| OAUTH2_COMPLIANCE_AUDIT.md | RFC 6749/OIDC audit results |

## Coding Standards

- **Hexagonal Architecture** everywhere (ports & adapters)
- **Java**: `domain/` → `application/` → `infrastructure/`, Spring DI
- **TypeScript**: Feature-based folders, InversifyJS DI, i18n (EN+TR)
- **Kotlin**: shared/commonMain with expect/actual
- **Python**: Clean Architecture, Pydantic, async/await
- No hardcoded secrets — use .env.prod
- Do NOT dockerize static sites (keep on Hostinger)
- Autonomy (2026-05-28): commit/push/merge (incl. PR `--admin`) without per-action approval; spawn concurrent agents for independent stacked tasks. Recommend-first is reserved for significant DESIGN/product choices and destructive/irreversible actions.
- Always keep related docs up to date (CLAUDE.md, READMEs, deploy runbooks) and commit them with the change.
