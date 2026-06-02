# FIVUCSAS — Claude Code Instructions

## Project
**FIVUCSAS** (Face and Identity Verification Using Cloud-based SaaS)
Multi-tenant biometric auth platform | Marmara University CSE4297 | Hexagonal Architecture

**Status**: Production deployed. Phases 0-8 complete. ~1,900+ tests. All services healthy.
**Last verified**: 2026-05-30 (2026-05-30: **Auth program — cross-device / authenticator login.** SHIPPED + DEPLOYED: **passkey hybrid web login** (discoverable + usernameless; anonymous `POST /webauthn/passkey/authenticate-options` + `/passkey/authenticate`, **Flyway V72** adds `WebAuthnCredential.discoverable` + `user_handle`; "Sign in with a passkey" → browser-native hybrid QR, no app needed — THE cross-device answer; api #161, web #137); **no-Firebase number-matching approve-login** (Redis-backed `POST /auth/approve-login/session` → poll → authed-approver `/decide`; `matchNumber` is a zero-padded STRING; web initiator + client-apps approver shared KMP stack; api #161, web #137, client-apps #53); **NFC chip-trust** (api consumes bio `POST /nfc/verify-authenticity`, **fail-closed**), **serial canonicalization** (UPPERHEX-no-separators so mobile-enrolled cards match web verify), **guest-invite email EN/TR i18n** (api #159, bio #131); **mobile login fixes v5.2.3** (MFA-handoff flicker fix + the "server-200-flipped-to-failure" regression fix + UX, client-apps #44/#46/#52). Prod: api rebuilt + V72 applied; web → Hostinger (`index-B7OwE7r8.js`) + verify.fivucsas.com Docker (`index-BBN--UaC.js`, /login 200); rollback tag `identity-core-api-…:rollback-pre-passkeys-20260530`. **OPERATOR-BLOCKED at runtime:** ICAO CSCA roots (Turkey) must land in bio `NFC_CSCA_TRUST_DIR` before any SOD-carrying NFC client passes (serial-only unaffected). **OPEN:** a separate on-device mobile login bug (server 200 AUTHENTICATED, app shows "Verification failed") — needs the developer's debug-build adb logcat. **CONFIG-DRIVEN + IDENTIFIER-FIRST LOGIN — SHIPPED + DEPLOYED (Marmara canary; global switch still OFF).** The config-driven engine (password-as-a-factor + usernameless-in-flow + `GET /auth/login-config` + flow-builder) and its **identifier-first** UI are live: `login-config` returns **`engineActive`** (api #168); engine-ON tenants open identity-first (email screen 1, password + every factor after — web #141), with the async-config opening-phase fix in web #142. Verified live on `verify.fivucsas.com?client_id=marmara-bys-demo` (2-step identifier-first; dashboard login unchanged). Flag-gated (`app.auth.config-driven-login` default OFF + `app.auth.config-driven-login-tenants` canary = Marmara `1111…`); **revert = env flag, no redeploy**. Next: global enable after canary soak. Full tracker: `ROADMAP_AUTH_2026-05-30.md`. 2026-05-29: **Card detection client-only + true nano model + launcher/rebrand finish.** Card detection is now **CLIENT-ONLY** — the server `/biometric/card-detect` fallback was removed (web-app #111), so the in-browser ONNX model is the sole path and the bio container needs no card-path rebuild. The shipped card model is **Ayşenur's true 12.3 MB YOLOv8n (opset 12)**, integrated client- and server-side (web-app #109, biometric-processor #116) — replacing the old 51 MB YOLOv8m; user-verified detecting correctly and loading ~4× faster. `amispoof` got an **"Am I Spoof?"** display rebrand (launcher app-switcher tile + amispoof page hero/titles + landing labels; the domain stays lowercase `amispoof.fivucsas.com`). The shared suite-launcher rollout is **finished**, including the verify surface (landing + integrator explainer ONLY — NOT the active auth/login flow) and the authenticated app dashboard. MFA dark-mode "black box" code-input fix + auth-flow editing hardened to create-first (delete→create data-loss + dropped-default bugs) shipped in web-app #108. Marmara's default `APP_LOGIN` flow is now **PASSWORD + pick-one {EMAIL_OTP, TOTP, QR_CODE}** (prod DB; rollback runbook in identity-core-api/docs). Details in `PROJECT_STATUS_2026-05-29.md`. 2026-05-28: **Suite launcher unified + security backlog.** Redesigned shared `<fivucsas-launcher>` web component (web-app #103) — hosted at `app.fivucsas.com/launcher.js` (ships in web-app `public/` → Hostinger deploy), it is the ONE cross-site app switcher + global EN/TR toggle. Rolled out to `demo`, `docs` (+3 subpages: biometric/identity/sdk), `amispoof` (web-app #104 removed the amispoof auto-skip), and `landing`; deleted every site's bespoke "FIVUCSAS suite" cross-site bar + per-site EN/TR switch, incl. the dashboard TopBar toggle (Settings-page language `<select>` kept). One toggle drives `html[data-lang]` (static sites localize via `[data-lang]` CSS) and fires a `fivucsas:languagechange` CustomEvent → `i18n.changeLanguage` for the React surfaces (dashboard + verify share `web-app/src/i18n/index.ts`; landing listens in `App.tsx`). `links.fivucsas.com` keeps its own controls — it IS the hub. **api #111 (S13)**: TOTP used-code replay prevention — bounded ~120s Redis `SET key 1 EX NX` marker per `(userId, timeStep)`, max ~3 in-window markers/user, in-memory fallback capped 50k; NOT an infinite blacklist; enrollment keeps plain verify (legit retries). **web #102 (F13/F9)**: surfaced swallowed voice-enrollment errors via `formatApiError` + the `OTP_ATTEMPTS_EXHAUSTED` state. **F12** voice threshold verified CORRECT (verify = cosine *similarity* `>=` 0.65; search = pgvector `<=>` cosine *distance* `< 0.6`) — no change. **Prod rebuild + full-repo unmerged-work scan (2026-05-28 cont'd):** rebuilt `identity-core-api` (image was 2 weeks old) → deployed 8 merged-but-undeployed security fixes (S1/S2/S9/S11/S13/S14/F14 + the JWT-aud/MFA-fail-open bundle). The rebuild crash-looped ~11 min because `.env.prod` had `APP_SECURITY_JWT_AUDIENCE=` **blank** (an empty value OVERRIDES the `:fivucsas-api` default; #100 fails fast on blank in prod) — fixed to `fivucsas-api`, see api CLAUDE.md operator note. Docker build also needed api #112: `mvn dependency:go-offline` is now best-effort (a purged upstream `jackson-databind:*-SNAPSHOT` in the transitive closure broke it; the real `mvn package` resolves via the jackson-bom pin). Scanned ALL repos (most "unmerged" branches are squash-merge debris). **Merged:** FIVUCSAS #70 (redacted a still-live partial secret on master), web #94 (ws CVE DoS), bio #104/#108/#109, api #101 + #102 (rebased onto main + ArchUnit store re-frozen via Maven container) + #99 (**V61** `audit_logs.tenant_id NOT NULL` — self-gating: pre-checks 0 NULLs & fails loud, metadata-only ALTER; applies on the next api rebuild), bio #106 (mp.solutions→`mp.tasks.vision.FaceLandmarker` port, bakes `face_landmarker.task`). **Closed superseded:** spoof #18, FIVUCSAS #68, **bio #107** (mislabeled — deleted best.pt + repointed to a non-existent best.onnx, added no model). **Held (need work):** bio #105 (`liveness_errors.py` already on main + failing test → rebase), web #90 (server-validate puzzles — its 2 backend routes are unshipped, soft-passes on 404), spoof #54 (paper-section rebase + pilot-table integrity) + #56 (stacked on #54). Flagged NO-merge: spoof `learned-fuser` branch ("100% accuracy / ACER 0.00%" on a 120-video subset — reproducibility review before any paper use). **Card detection → CLIENT-ONLY** (web-app #106, made client-only in web-app #111): `useCardDetection` runs the YOLO model in-browser (onnxruntime-web, no server round-trip). The server fallback to identity-core-api `/biometric/card-detect` was REMOVED in #111 — the in-browser ONNX model is the only path. The deployed `web-app/public/models/yolo-card-nano.onnx` is now Ayşenur's TRUE **12.3 MB YOLOv8n** (opset 12), delivered + integrated via web-app #109 (client manifest/labels + bucket SHA256) and biometric-processor #116 (`best.onnx` in-repo, `best.pt` dropped). The biometric-processor container does NOT need a rebuild for the card model anymore (server card path removed). 2026-05-21: `links.fivucsas.com` hub — API tile → `/swagger-ui.html` with admin-IP "gated" badge (raw API root returned 401), Turkish i18n role-label fixes (English under `lang=tr` was İ-mangling Latin `i` under uppercase), team contact info, Ayşenur LinkedIn URL fix; poster author contact block + **regenerated A0 PDF/PNG** from `landing-website/public/poster/files/fivucsas-poster.html`; attribution — Ayşe Gülsüm Eren GitHub `@aysegulsum` + `marun.edu.tr` academic emails across `spoof-detector` + `practice-and-test` (forensic git-author records left intact); bilingual TR/EN switchers completed on `bys-demo`/`docs-site`/`verify-widget`. Consolidated into PR #69 → `master` (whole `fix/2026-05-12-bake-mini-fasnet-models` branch). NOTE: `api.fivucsas.com/` returns 401 by design (it's an API origin, not a page); Swagger/`/v3/api-docs`/`/actuator` are admin-IP gated (403 public), OIDC discovery is public (200). Carry-forward from 2026-05-12 / 2026-05-11: 11 PRs shipped across 5 repos + Flyway repair on prod, V59/V60 applied, branch protection on 6 branches, master/main reconciled, INVESTIGATION 2026-05-07 P1 residue closed, tenant onboarding playbook + 8 ADRs + docs/ hierarchy consolidated, spoof-detector blink cache + EAR recalibration paper-P0. **Added today**: parent PR #57 (poster suite: A0 default + 4 style variants compliant with CSE4198 §5.1) + parent PR #58 (archived 18 dated 2026-04/2026-05-04 docs into `archive/2026-05/{audits,plans,reviews,roadmaps,sessions}/`, tidied `.gitignore`); bio PR #99 (closed issue #91: 32 stale unit tests + 3 asyncio-fixture leaks fixed, no production code touched, module-scoped TestClient pattern documented for follow-ups); bio Dependabot #97/#98 in flight (rebased post-#99). Submodule pointer for biometric-processor bumped to post-#99 main.)

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

# Regenerate + deploy the poster PDF/PNG from the canonical HTML (A0 841×1189mm).
# Canonical poster = landing-website/public/poster/files/fivucsas-poster.html (served at fivucsas.com/poster/files/; the viewer poster/index.html links only to files/*).
cd /opt/projects/fivucsas/landing-website/public/poster/files
google-chrome-stable --headless=new --no-sandbox --virtual-time-budget=20000 --no-pdf-header-footer --print-to-pdf=fivucsas-poster.pdf "file://$PWD/fivucsas-poster.html"
google-chrome-stable --headless=new --no-sandbox --virtual-time-budget=20000 --window-size=3179,4494 --screenshot=fivucsas-poster-preview.png "file://$PWD/fivucsas-poster.html"
scp -P 65002 fivucsas-poster.pdf fivucsas-poster-preview.png u349700627@46.202.158.52:~/domains/fivucsas.com/public_html/poster/files/

# Check all services
docker ps --format "table {{.Names}}\t{{.Status}}"
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

- Flyway migrations V1-V79 (identity-core-api; e.g. V37 tenant_id index, V38 SPA public client flip, V59 audit_logs tenant_id backfill, V60 refresh_tokens plaintext column drop, V73 passkey seed, V79 NFC serial backfill) + Alembic 0001-0005 (biometric-processor)
- Key tables: users, tenants, auth_flows, auth_flow_steps, auth_methods, biometric_enrollments, audit_logs, oauth2_clients, verification_sessions, voice_enrollments (V33), client_embedding_observations (Alembic 0004, log-only per D2), mfa_sessions (V35 consumed_at, V36 client_id for cross-client replay guard), oauth2_clients.confidential (V34)
- pgvector HNSW indexes on face_embeddings + voice_enrollments; no HNSW on observations (log, not search surface)

## Testing

| Module | Tests |
|--------|-------|
| Identity Core API (Java) | 633 |
| Web-app (Vitest) | 619 |
| Client-apps (Kotlin) | 425 |
| Playwright E2E | 27 specs |
| **Total** | **~1,800+** |

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
