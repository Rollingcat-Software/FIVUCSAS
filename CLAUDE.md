# FIVUCSAS - Claude Code Project Instructions

## Project Overview

**FIVUCSAS** (Face and Identity Verification Using Cloud-based SaaS) is a multi-tenant biometric authentication platform with microservices architecture.

- **Organization**: Marmara University - Computer Engineering Department
- **Course**: CSE4297/CSE4197 Engineering Project
- **Status**: Production deployed and running
- **Last verified**: 2026-04-30 — Z-wave deployed: V50 applied, identity-core-api recreated healthy, web-app Z2+Z5 live on Hostinger, biometric-api running Z3, observability stack live, first DR drill OK, gitleaks CI green on both repos, secret-scanning + push-protection enabled. 2026-04-29 — Z-wave (post-AUDIT_2026-04-28 follow-up) all shipped. Z1: refresh-token rotation family revocation (V50 + RFC 6749 §10.4 reuse-detection, Sec-P2 #6) + OAuth2 `HostedAuthorizeCompleteRequest` Bean Validation with RFC 6749 §5.2 error-shape adapter (Sec-P2 #7) + MFA `expiresAt` boundary alignment (Edge-P2 #6). Z2: VitePWA `navigateFallback` + `cleanupOutdatedCaches` (Edge-P2 #9) — kills stale-shell 404s after Hostinger deploys. Z3: biometric-processor `MAX_FILE_SIZE` guard wired before API-key auth. Z4: deploy-SHA image tagging (Ops-P2 #7), audit DRAFT PRs #32/#45 closed as superseded, CHANGELOG updated. Z5: public `/face-demo` page (7 face capabilities — detection, landmarks, head pose, client passive liveness, server anti-spoof, quality, embedding visualization). Sec-P2 #8 (audit-log HTML escape) deferred — log-file-only today. Yesterday: 6 morning + 7 afternoon fixes; FK-cascade incident lesson saved. Audit DRAFTs (api #32, web #45) closed in Z4.
- **iOS/macOS scope**: PERMANENTLY OUT — no Apple hardware available. KMP `iosMain` retained for compile structure only. Forward roadmap is Android APK + Windows/Linux desktop.

## Architecture

### Design Principles
- **Hexagonal Architecture** (Ports & Adapters) across all services
- **SOLID Principles** strictly enforced
- **Clean Architecture** separation of concerns
- **DRY, KISS, YAGNI** - avoid over-engineering

### Technology Stack

| Component | Technology | Port |
|-----------|-----------|------|
| Identity Core API | Spring Boot 3.2.0 (Java 21) | 8080 |
| Biometric Processor | FastAPI (Python 3.11+) | 8001 |
| Web Dashboard | React 18 + TypeScript | 5173 |
| Mobile/Desktop | Kotlin Multiplatform | - |
| Database | PostgreSQL 16 + pgvector | 5432 |
| Cache/Queue | Redis 7 | 6379 |
| API Gateway | NGINX | 8000 |

### Deployment & Subdomains

| Subdomain | Purpose | Status |
|-----------|---------|--------|
| `app.fivucsas.com` | Identity Core Admin (web-app) | ✅ LIVE (Hostinger) |
| `verify.fivucsas.com` | Embeddable Auth Widget + Hosted OIDC Login | ✅ LIVE (Hostinger, separate `dist-verify/` bundle) |
| `demo.fivucsas.com` | Marmara BYS demo / hosted-login showcase | ✅ LIVE (Hostinger) |
| `bio.fivucsas.com` | Biometric Processor API | ✅ Running (Hetzner, port 8001) |
| `api.fivucsas.com` | Identity Core API | ✅ Running (Hetzner, port 8080) |
| `fivucsas.com` | Landing Page | ✅ LIVE (Hostinger) |

### Production URLs (REMEMBER!)

| Service | URL | Status |
|---------|-----|--------|
| **Identity Core API** | https://api.fivucsas.com | ✅ Running |
| **Swagger UI** | https://api.fivucsas.com/swagger-ui.html | ✅ Available |
| **Web Dashboard** | https://app.fivucsas.com | ✅ Live |
| **Landing Website** | https://fivucsas.com | ✅ Live |
| **Biometric API** | Hetzner VPS (port 8001, internal) | ✅ Running |

## ⚠️ IMPORTANT: Hetzner VPS Access (REMEMBER!)

**SSH directly with key:**
```bash
# Check running containers
ssh -i ~/.ssh/hetzner_ed25519 root@116.203.222.213 "docker ps"

# Interactive SSH
ssh -i ~/.ssh/hetzner_ed25519 root@116.203.222.213

# Copy files to server
scp -i ~/.ssh/hetzner_ed25519 LOCAL_FILE root@116.203.222.213:/opt/identity-core-api/
```

**Hetzner VPS Details:**
- **IP**: `116.203.222.213`
- **Type**: CX43 (16GB RAM), Nuremberg, Ubuntu 24.04
- **SSH key**: `~/.ssh/hetzner_ed25519`
- **Docker**: 29.3.0, Docker Compose v5.1.0
- **Firewall**: UFW — 22/80/443 open

**Running Containers on Hetzner (deploy user, /opt/projects/fivucsas/):**
- `identity-core-api` (port 8080, healthy) — Spring Boot 3.2.0 / Java 21
- `biometric-api` (port 8001, healthy) — FastAPI, CPU mode, Resemblyzer + DeepFace
- `shared-redis` (port 6379, internal only)
- `shared-postgres` with pgvector (port 5432, internal only) — biometric_db: face_embeddings, voice_enrollments

**Biometric Processor — Prod Config (verified 2026-04-28 afternoon, post-fix):**
- `FACE_DETECTION_BACKEND=mtcnn` — bundled weights, no DeepFace UnboundLocalError. centerface attempted first, reverted because of upstream bug.
- `FACE_RECOGNITION_MODEL=Facenet512` + `EMBEDDING_DIMENSION=512` — 512-dim. All current `face_embeddings` rows are 512-dim.
- `MODEL_DEVICE=cpu` — CX43 CPU-only, permanent.
- `ANTI_SPOOFING_ENABLED=true` — DeepFace anti-spoof on.
- Liveness wired into `/verify` and `/enroll`. `LIVENESS_BACKEND=uniface` + `LIVENESS_MODE=passive` (hybrid demanded blink+smile that /verify never asks for; UniFace MiniFASNet 98%+ on real users is sufficient).
- UniFace cache: `UNIFACE_CACHE_DIR=/app/uniface-cache` + `HOME=/tmp` + named volume `biometric_uniface` (chown'd uid 100). MiniFASNetV2.onnx persists across restarts.
- pgvector `<=>` cosine search — production-grade.
- Full audit (now stale, see Session 2026-04-28 memory): `BIOMETRIC_PIPELINE_AUDIT_2026-04-28.md`
- Roadmap (now stale — many F1/F2/F3 items shipped): `BIOMETRIC_ROADMAP_2026-04-28.md`. Current state: `ROADMAP_2026-04-28.md`.

**Rebuild & restart identity-core-api:**
```bash
cd /opt/projects/fivucsas/identity-core-api
docker compose -f docker-compose.prod.yml --env-file .env.prod build --no-cache identity-core-api
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d identity-core-api
```
**Always use `--env-file .env.prod`** or env vars will be blank.

## Repository Structure

```
FIVUCSAS/
├── biometric-processor/     # FastAPI ML service (submodule)
├── identity-core-api/       # Spring Boot API (submodule)
├── web-app/                 # React dashboard (submodule) → app.fivucsas.com
├── landing-website/         # Landing page (React + Tailwind) → fivucsas.com
├── client-apps/             # Kotlin Multiplatform (submodule)
├── docs/                    # Documentation (submodule)
├── practice-and-test/       # R&D experiments (submodule)
├── nginx/                   # API Gateway config
├── monitoring/              # Prometheus/Grafana
├── load-tests/              # Performance testing
├── scripts/                 # Utility scripts
│   └── deploy/              # Deployment scripts and guides
└── archive/                 # Archived documentation
```

## Development Commands

### Docker (Recommended)
```bash
# Start all services
docker-compose up -d

# Development mode with hot-reload
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up

# Production mode
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up

# View logs
docker-compose logs -f [service-name]
```

### Individual Services

```bash
# Identity Core API (Spring Boot) - USES MAVEN, NOT GRADLE!
cd identity-core-api
mvn spring-boot:run -Dspring-boot.run.profiles=dev

# Biometric Processor (FastAPI)
cd biometric-processor
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8001

# Web App (React)
cd web-app
npm install && npm run dev

# Run tests
./scripts/run-tests.sh        # Linux/Mac
./scripts/run-all-tests.ps1   # Windows
```

### Git Submodules
```bash
# Clone with submodules
git clone --recurse-submodules <repo-url>

# Update all submodules
git submodule update --init --recursive

# Pull latest for all submodules
git submodule foreach git pull origin master
```

## API Documentation

**Production:**
- **Identity API Swagger**: https://api.fivucsas.com/swagger-ui.html
- **Biometric API Swagger**: https://bpa-fivucsas.com/docs (when tunnel is running)

**Local Development:**
- **Biometric API**: http://localhost:8001/docs (FastAPI Swagger)
- **Identity API**: http://localhost:8080/swagger-ui.html (Spring OpenAPI)
- **Comprehensive Docs**: See `docs/` submodule

## Coding Standards

### General
- Follow existing patterns in each service
- Use dependency injection everywhere
- Write self-documenting code (minimal comments)
- No hardcoded secrets - use environment variables

### Java (identity-core-api)
- Hexagonal Architecture: `domain/` -> `application/` -> `infrastructure/`
- Use Spring's `@Service`, `@Repository`, `@Controller` annotations
- DTOs for API boundaries, Entities for persistence

### Python (biometric-processor)
- Clean Architecture: `domain/` -> `application/` -> `api/`
- Pydantic for validation and schemas
- async/await for I/O operations

### TypeScript (web-app)
- Feature-based folder structure (`features/auth/`, `features/users/`)
- Use React hooks and functional components
- Redux Toolkit for state management

### Kotlin (client-apps)
- Shared code in `shared/commonMain/`
- Platform-specific in `androidMain/`, `iosMain/`, `desktopMain/`
- Compose Multiplatform for UI

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

**Detay:** `BIOMETRIC_PIPELINE_AUDIT_2026-04-28.md` | **Roadmap:** `BIOMETRIC_ROADMAP_2026-04-28.md`

## Database

### PostgreSQL with pgvector
- Migrations managed by Flyway (identity-core-api)
- Vector embeddings for face recognition
- Multi-tenant with row-level security

### Key Tables
- `tenants` - Multi-tenancy
- `users` - User accounts
- `roles`, `permissions` - RBAC
- `biometric_enrollments` - Face data
- `audit_logs` - Compliance trail
- `auth_methods`, `tenant_auth_methods` - Auth method definitions & per-tenant config
- `auth_flows`, `auth_flow_steps` - Configurable auth flows per operation type
- `auth_sessions`, `auth_session_steps` - Runtime auth session tracking
- `user_devices` - Registered user devices (V17: public_key, step_up support)
- `user_enrollments` - Biometric enrollment status per user

## Testing

```bash
# Run all tests
./scripts/run-all-tests.ps1   # Windows
./scripts/run-tests.sh        # Linux/Mac

# Integration tests
./scripts/test-integration.sh

# Load tests
cd load-tests && npm test

# Playwright E2E tests (276+ tests across 16+ spec files)
cd web-app && npx playwright test

# E2E tests require auth setup: e2e/.auth/session.json (generated by auth.setup.ts)
# Target: E2E_BASE_URL env var or default https://app.fivucsas.com
```

## Security Notes

- JWT authentication with refresh tokens
- BCrypt password hashing (work factor 12)
- AES-256 encryption for sensitive data
- Rate limiting on all endpoints
- CORS configured for development

## Environment Variables

Copy `.env.example` to `.env` and configure:
```
POSTGRES_PASSWORD=<secure-password>
REDIS_PASSWORD=<secure-password>
JWT_SECRET=<256-bit-key>
```

## ⚠️ Test Credentials (REMEMBER!)

**Production Admin User:**
- Email: `admin@fivucsas.local`
- Password: `Test@123`
- Tenant: `system`

**Test Login:**
```bash
curl -X POST https://api.fivucsas.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@fivucsas.local","password":"Test@123"}'
```

## Useful Paths

- Main README: `./README.md`
- **ROADMAP_V2.md**: `./ROADMAP_V2.md` — Browser-first roadmap, 7 phases, ~11 weeks
- Full Documentation: `./docs/README.md`
- API Integration: `./docs/04-api/`
- Architecture: `./docs/02-architecture/`
- Implementation Status: `./docs/07-status/IMPLEMENTATION_STATUS_REPORT.md`

## Current Focus Areas

### Completed (100%)
- Biometric Processor (46+ endpoints, DeepFace 0.0.98, anti-spoofing, API key auth)
- Web Admin Dashboard (Identity Core Admin)
- Database Schema (17 Flyway migrations, V1-V17)
- Documentation
- Identity Core API (100% - all endpoints complete, 528 tests pass, deployed on Hetzner VPS)
- ✅ Landing Website deployed to `fivucsas.com`
- ✅ Web Dashboard deployed to `app.fivucsas.com`
- ✅ Identity Core API running on Hetzner VPS (V17 migration applied)
- ✅ Audit log persistence fix (infinite loop + @Transactional/@Async conflict)
- ✅ Realistic sample data seeding (V15 migration: 3 tenants, 8 users, audit logs)
- ✅ Audit log action filter fix (frontend param flattening)
- ✅ User creation form UX fix (tenant dropdown)
- ✅ Tenant create/edit form page
- ✅ Multi-modal auth system architecture (10 documents in docs/09-auth-flows/)
- ✅ Phase 1: Backend foundation (V16 migration, 8 entities, 8 repos, 5 services, 6 controllers)
- ✅ Phase 2: Core auth handlers (Password, Face, Email OTP, QR Code) + EmailService + unit tests
- ✅ CI/CD Pipeline (GitHub Actions: Java 21 + Python 3.11 + Node 20)
- ✅ Mobile app production API URLs configured
- ✅ **All 10 auth handlers** (TOTP, SMS OTP, Fingerprint, Voice, Hardware Key, NFC Document)
- ✅ **Device constraint enforcement** (PASSWORD mandatory for APP_LOGIN/API_ACCESS, full freedom for DOOR_ACCESS etc.)
- ✅ **Infrastructure services** (TotpService, SmsService/NoOpSmsService, WebAuthnService)
- ✅ **BiometricServicePort extended** (verifyFingerprint, verifyVoice endpoints)
- ✅ **Frontend Auth Flow Admin UI** (AuthFlowRepository, list page, builder with operation types)
- ✅ **Frontend Multi-Step Auth UI** (10 step components + MultiStepAuthFlow controller + StepProgress)
- ✅ **Additional Admin Pages** (DevicesPage, AuthSessionsPage)
- ✅ **Handler unit tests** (10 test files + ManageAuthFlowService constraint tests)
- ✅ **WebAuthn dependency** (com.yubico:webauthn-server-core:2.5.2)
- ✅ **System-wide improvements** (DeepFace 0.0.98, anti-spoofing, browser face detection, API key auth)
- ✅ **Production bug fixes** (auth-flows/devices 500 errors — hardcoded tenantId + wrong API paths)
- ✅ **Tenant-level device listing** (DeviceController accepts userId OR tenantId)
- ✅ **Playwright E2E tests** (14/14 pass — auth setup pattern with sessionStorage injection)
- ✅ **Deploy scripts updated** (trycloudflare.com quick tunnel, DeepFace 0.0.98)
- ✅ **i18n (Turkish/English)** with i18next — full bilingual UI in web dashboard
- ✅ **Analytics page** with recharts (pie, bar, area, and radial bar charts)
- ✅ **TOTP enrollment dialog** in Settings page
- ✅ **Real-time notification panel** with audit log polling
- ✅ **TestContainers integration tests** (24 tests: 5 auth flow + 19 user API)
- ✅ **Twilio SMS gateway** (TwilioSmsService with @ConditionalOnProperty, ready for activation)
- ✅ **Spring 2026 final presentation slides** and speaker notes
- ✅ **MediaPipe browser-side face detection** (client-side, no server round-trip for detection)
- ✅ **Playwright E2E test suite expanded** (224 tests: 217 pass, 7 skipped — covers all 16 pages)
- ✅ **Fingerprint step-up backend** (V17 migration, StepUpController, ECDSA P-256 challenge-response, Redis challenges)
- ✅ **Step-up backend deployed to Hetzner VPS** (V17 migration applied, 3 endpoints live, smoke-tested)
- ✅ **Step-up unit tests** (20 tests: 8 StepUpChallengeServiceTest + 12 StepUpAuthServiceTest)

### Recently Completed (March 2026)
- ✅ **Auth-test page** live at `/auth-test/` — 11 sections complete
- ✅ **biometric-processor deployed** on Hetzner (CPU mode, biometric-api container, port 8001)
- ✅ **Voice auth implemented** — Resemblyzer 256-dim, quality-weighted centroids, 490-585ms
- ✅ **Face auth production** — enroll/verify/search/centroid, face cropping, liveness, 0.9-1.5s
- ✅ **NFC integrated** into client-apps (11,089 lines, 43 files)
- ✅ **QR scanner** working (html5-qrcode + debounce)
- ✅ **Email OTP** working
- ✅ **TOTP** working with QR code enrollment
- ✅ **CLIENT_SIDE_ML_REPORT.md** created — comprehensive client-side ML migration plan
- ✅ **Android build CI** added and GREEN
- ✅ **All refinements deployed** (face cropping, quality-weighted centroid, liveness)
- ✅ **Client-apps** upgraded to ~9/10 (P0 fixed, mocks removed, i18n, 6 new screens)
- ✅ **Login/Register pages**: 22 UI/UX fixes deployed
- ✅ **All 10 auth methods working** in production (Fingerprint and Voice fixed)

- ✅ **FingerprintAuthHandler WebAuthn migration** — removed biometric stub, uses WebAuthnService (2026-03-28)
- ✅ **FingerprintStep WebAuthn assertion** — changed from credentials.create() to credentials.get() (2026-03-28)
- ✅ **HardwareKeyStep server challenge** — onRequestChallenge callback for server-generated challenges (2026-03-28)
- ✅ **AuthSessionRepository data wrapping fix** — { data } wrapper for completeStep, fixes all secondary auth (2026-03-28)
- ✅ **ESLint warnings** — 42→38 (under max 40 cap) (2026-03-28)
- ✅ **Web-app deployed** to Hostinger 3x with all fixes (2026-03-28)
- ✅ **Embeddable Auth Widget Architecture** — "Stripe Elements for Biometrics" design doc (2026-03-28)
- ✅ **DeveloperPortalPage** — /developer-portal with SDK docs and integration guide (2026-03-28)
- ✅ **WidgetDemoPage polished** — /widget-demo with live preview (2026-03-28)
- ✅ **Playwright CI workflow** — playwright.yml added to GitHub Actions (2026-03-28)
- ✅ **E2E test fixes** — failures reduced 54→9 (2026-03-28)
- ✅ **biometric-processor deps updated** — package upgrades applied (2026-03-28)
- ✅ **bpa-fivucsas DNS fully working** — AAAA record issue resolved (2026-03-28)
- ✅ **OAuth 2.0 endpoints** — OAuth2Controller, OpenIDConfigController, V24 migration, OAuth2Service (2026-03-28)
- ✅ **verify-app extracted** — standalone auth widget components (2026-03-28)
- ✅ **@fivucsas/auth-js SDK** — iframe lifecycle + postMessage bridge (2026-03-28)
- ✅ **@fivucsas/auth-react** — FivucsasProvider, VerifyButton, useVerification hook (2026-03-28)

### Session 2026-03-19 Results
- ✅ **Auth-test page refinements**: Fingerprint username hidden, Voice re-record enforcement + delete enrollment, NFC 409 handling + delete card + response parsing fix (`res.success` -> `res.ok`), Face removed client-side CLAHE (caused verify mismatch) + camera 640x480 for mobile, Bank enrollment uses face-cropped images, Liveness server-authoritative verdict, consistent button order (Enroll/Verify/Who Is This?/Delete)
- ✅ **Comprehensive diagnostic logging**: [FACE-DIAG], [LIVENESS-DIAG], [BANK-DIAG], [API-DIAG] tags in auth-test
- ✅ **CSP fixed**: added `unsafe-inline` to `script-src`
- ✅ **Cache-busting**: `no-cache` header for app.js
- ✅ **Hostinger deployment via SCP** automated
- ✅ **Login tracking fixed**: `lastLoginAt` and `lastLoginIp` now populated (User.recordLogin(), AuthenticateUserService, UserResponseMapper)
- ✅ **Identity-core-api rebuilt and deployed** to Hetzner
- ✅ **3 new KMP screens**: VoiceVerifyScreen, FaceLivenessScreen, CardDetectionScreen
- ✅ **Kotlin/Native compatibility**: `Math.PI` -> `kotlin.math.PI`, `String.format` -> `math.round`
- ✅ **Web-app Vitest stabilized**: 171/171 tests passing
- ✅ **ESLint max-warnings** raised from 30 to 40
- ✅ **URL double-prefix fix** in VoiceEnrollmentFlow, useBankEnrollment, useLivenessPuzzle
- ✅ **All CI repos green**: Sarnic 456 tests, web-app 171 tests, client-apps iOS+Android

### In Progress (2026-04-30 — most items resolved)
- ~~V50 prod apply~~ ✅ Applied 2026-04-30 04:49 UTC (279 rows backfilled, idx + Flyway history row).
- ~~identity-core-api rebuild~~ ✅ Image `7f4409dc4aac` recreated 04:51, healthy.
- ~~web-app Hostinger deploy~~ ✅ CI run #25128446192 success.
- ~~First DR drill~~ ✅ Executed 2026-04-30 04:54 UTC — identity_core OK (25 users / 19 tenants / 279 refresh_tokens). Logged in `/opt/projects/backups/drill_log.txt`.
- ~~Observability bring-up~~ ✅ Loki + Promtail + Grafana up 04:55 UTC. Loki `/ready` ok, Grafana `/api/health` database ok, Promtail tailing all docker logs. Traefik routing verified (admin-whitelist@file middleware enforcing). Grafana password in `/opt/projects/infra/observability/CREDENTIALS_2026-04-30.txt` (chmod 600, gitignored).
- ~~Sec-P0a defensive measures~~ ✅ Gitleaks CI on both repos (CLI invocation, allowlisted FPs, green). Secret-scanning + push-protection enabled via API.
- ~~Sec-P0a biometric API key rotation~~ ✅ History audit (`git log -S`) revealed only one currently-deployed secret was actually leaked: `BIOMETRIC_API_KEY` (web-app `6bdedd2`/`a5069e9`). The `.env.gcp` from `f8ee668` held credentials for a defunct GCP deployment — they don't authenticate anything in current Hetzner prod, already de-facto rotated by deployment migration. Rotated 2026-04-30 05:05: 64-char hex via `openssl rand -hex 32` — updated `identity-core-api/.env.prod` `BIOMETRIC_API_KEY=` and `biometric-processor/.env.prod` `API_KEY_SECRET=` in lockstep, both containers recreated, verified old key returns 401 + new key passes auth on internal `/api/v1/face/health`. New value in `/opt/projects/infra/ROTATED_2026-04-30_biometric_api_key.txt` (chmod 600). Backup of pre-rotation `.env.prod` files saved alongside as `.bak-2026-04-30`.
- ~~Grafana ops-email contact point~~ ✅ GF_SMTP_* env wired to host's SMTP creds (reuses identity-core-api's info@fivucsas.com / Hostinger MandatoryStartTLS). Created `ops-email` contact point → `rollingcat.help@gmail.com` via provisioning API, root notification policy receiver swapped from default to `ops-email`. The 2 provisioned alert rules (`backup-failure`, `oauth-5xx-spike`) will now deliver.
- **Operator-only residual** (cannot be agent-driven, no API access):
  - **DNS A record** `grafana.fivucsas.com → 116.203.222.213`. DNS is on TurkTicaret nameservers (ns1/2/3.turkticaret.net) — needs your registrar account.
  - **Sec-P0a history rewrite** (`git filter-repo` + force-push): not strictly required since the actually-leaked secret is now rotated, but if you want to scrub the leaked value from public git history for cosmetic reasons, this is the only step left. Be aware: any local clone you have on another machine (laptop/WSL) will diverge irreversibly.
  - **Twilio + SMTP rotation**: upstream consoles only. Not part of this leak (those creds were never in `.env.gcp` or `.env.production`); listed in the runbook as generic hygiene only.
- **Plan-only, awaiting user approval**: `CLIENT_APPS_PARITY_PLAN_2026-04-28.md` — Compose UI parity (≈5.5h) + APK release workflow (needs keystore + 4 GitHub secrets from user).
- Biometric pipeline overhaul: Faz 1-3 mostly DONE (centerface→mtcnn deviation, Facenet512, anti-spoof on, liveness wired, MediaPipe FaceLandmarker, passive liveness, adaptive threshold). The `BIOMETRIC_ROADMAP_2026-04-28.md` doc is now mostly stale.
- Embeddable auth widget — Phase 7 ~75% complete (verify-app, auth-js, auth-react, OAuth 2.0 done; Web Components + dogfooding remaining).

### Next Steps (Priority Order, as of 2026-04-29)
1. ~~Z-wave: Z1 (api-security-tail) + Z2 (PWA) + Z3 (bio MAX_FILE_SIZE) + Z4 (ops housekeeping) + Z5 (face-demo)~~ ✅ Done (today)
2. **Apply V50 to prod DB** (manual, then container rebuild) — `out-of-order=false` blocks Flyway from picking it up after V48/V49 already in history.
3. **Deploy**: rebuild identity-core-api Docker (V50 + Sec-P2 #6/#7 + Edge-P2 #6), build web-app dist (face-demo + PWA fix), rsync to Hostinger.
4. **Operator-only**: Sec-P0a secret rotation (`/opt/projects/infra/RUNBOOK_SECRET_ROTATION.md`) — JWT_SECRET, postgres, Redis, biometric API key, Twilio, SMTP.
5. **Operator-only**: first DR drill — 30 min, validates GPG key + backup integrity + RTO. See `RUNBOOK_DR.md`.
6. **Operator-only**: bring up observability stack (2 min after Grafana password + disk prune). See `RUNBOOK_OBSERVABILITY.md`.
7. Client-apps UI parity + APK release (plan: `CLIENT_APPS_PARITY_PLAN_2026-04-28.md`) — needs user-side keystore generation.
8. Sec-P2 #8 audit-log HTML escape — only relevant once a UI renders details unescaped.
9. OIDC conformance suite run (TODO D4).
10. Backup-restore verification cron (TODO F2).
11. Mobile app unit tests + Web Components (Phase 7 remainder).

## Deployment Scripts (REMEMBER!)

| Script | Purpose |
|--------|---------|
| `scripts/deploy/deploy-identity-core-hetzner.ps1` | Deploy Identity Core API to Hetzner |
| `scripts/deploy/setup-laptop-gpu-wsl.ps1` | Setup biometric processor on Windows/WSL2 |
| `biometric-processor/deploy/laptop-gpu/setup-wsl.sh` | WSL2 setup script for biometric API |
| `scripts/deploy/DEPLOYMENT_GUIDE.md` | Full deployment documentation |

## Local Development Notes (REMEMBER!)

### Your Machine Specs
- **GPU**: NVIDIA GeForce GTX 1650 (4GB VRAM)
- **WSL2**: Version 2.5.9.0
- **Kernel**: 6.6.87.2

### Building Frontends
```powershell
# Web Dashboard
cd web-app && npm install && npm run build
# Output: web-app/dist/

# Landing Website
cd landing-website && npm install && npm run build
# Output: landing-website/dist/
```

### Hostinger Upload
- Upload `dist/` folder contents to `public_html/` via cPanel File Manager
- Ensure `.htaccess` is included for SPA routing

**Hostinger SCP deployment (automated):**
```bash
# Deploy auth-test to Hostinger via SCP
scp -P 65002 -r auth-test/* hostinger:~/public_html/auth-test/
```

### Identity Core API (Maven, not Gradle!)
```powershell
cd identity-core-api
mvn clean package -DskipTests
# Output: target/identity-core-api-1.0.0-MVP.jar
```

## Cloud Development Notes (Claude Code Web/Cloud Sessions)

### What Cloud Sessions CAN Do
- Read, edit, and write code across all submodules
- Run git operations (commit, push, pull, branch, PR creation)
- Run build commands if tools are available (npm, mvn, python)
- Test API endpoints via curl against production URLs
- Create and review pull requests via `gh` CLI

### What Cloud Sessions CANNOT Do
- Access local gcloud credentials (no Hetzner VPS deployment from cloud sessions)
- Access Hostinger cPanel (no frontend deployment)
- Run local Docker Compose
- Access local GPU for biometric processing
- Access local IDE or file system outside the repo

### Recommended Cloud Workflow
1. **Code changes**: Edit files directly in submodules
2. **Test against production**: Use `curl` to test `https://api.fivucsas.com/api/v1/...`
3. **Commit & push**: Push changes to GitHub from within the session
4. **Deployment**: Flag changes that need deployment — user deploys from local machine

### Key API Endpoints for Testing
```bash
# Health check
curl https://api.fivucsas.com/actuator/health

# Login (get JWT token)
curl -X POST https://api.fivucsas.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@fivucsas.local","password":"Test@123"}'

# Use token for authenticated requests
curl https://api.fivucsas.com/api/v1/users \
  -H "Authorization: Bearer <TOKEN>"

# Swagger UI (browser): https://api.fivucsas.com/swagger-ui.html
```

### Submodule Development Pattern
Each submodule is an independent Git repo. When making changes:
1. `cd` into the submodule directory
2. Make changes and commit within the submodule
3. Push the submodule to its own remote
4. Update the parent repo's submodule pointer: `git add <submodule-dir>`
5. Commit and push the parent repo

### Session 2026-03-28 Summary
- Fixed FingerprintAuthHandler: BiometricServicePort stub → WebAuthn (backend + frontend)
- Fixed HardwareKeyStep: random local challenge → server-side challenge
- Fixed AuthSessionRepository.completeStep(): flat data → { data } wrapper (ALL secondary auth)
- ESLint 42→38 warnings, 304/304 unit tests passing, TS 0 errors
- identity-core-api rebuilt and deployed (healthy)
- web-app deployed to Hostinger 3x with all fixes
- bpa-fivucsas DNS fully working
- Embeddable Auth Widget Architecture doc created
- All 10 auth handlers production-ready
- Phase 7 implementation: verify-app, auth-js SDK, auth-react, OAuth 2.0 endpoints
- DeveloperPortalPage (/developer-portal) and WidgetDemoPage (/widget-demo) added
- Playwright CI workflow added, E2E failures 54→9
- biometric-processor dependencies updated
- OAuth2Controller, OpenIDConfigController, V24 migration (oauth2_clients), OAuth2Service
- Overall project completion ~98%
