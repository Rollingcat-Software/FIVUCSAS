# FIVUCSAS - Claude Code Project Instructions

## Project Overview

**FIVUCSAS** (Face and Identity Verification Using Cloud-based SaaS) is a multi-tenant biometric authentication platform with microservices architecture.

- **Organization**: Marmara University - Computer Engineering Department
- **Course**: CSE4297/CSE4197 Engineering Project
- **Status**: Production deployed and running (March 2026)
- **Last verified**: 2026-04-05 — All services UP and healthy. Phases 0-8 complete. Client-apps Phases 1-3 complete. 304 unit + 28 Playwright + 103 automated API tests. W14/W16/W24 resolved. Widget-demo & developer-portal public. Biometric-processor on Python 3.12 (TF compat).

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
| Web Dashboard | React 18 + TypeScript 5 + Vite 8 | 5173 |
| Mobile/Desktop | Kotlin Multiplatform | - |
| Database | PostgreSQL 16 + pgvector | 5432 |
| Cache/Queue | Redis 7 | 6379 |
| API Gateway | NGINX | 8000 |

### Deployment & Subdomains

| Subdomain | Purpose | Status |
|-----------|---------|--------|
| `ica-fivucsas.rollingcatsoftware.com` | Identity Core Admin (web-app) | ✅ LIVE (Hostinger) |
| `bpa-fivucsas.rollingcatsoftware.com` | Biometric Processor API | ✅ Running (Hetzner, port 8001) |
| `fivucsas.rollingcatsoftware.com` | Landing Page | ✅ LIVE (Hostinger) |

### Production URLs (REMEMBER!)

| Service | URL | Status |
|---------|-----|--------|
| **Identity Core API** | https://auth.rollingcatsoftware.com | ✅ Running |
| **Swagger UI** | https://auth.rollingcatsoftware.com/swagger-ui.html | ✅ Available |
| **Web Dashboard** | https://ica-fivucsas.rollingcatsoftware.com | ✅ Live |
| **Landing Website** | https://fivucsas.rollingcatsoftware.com | ✅ Live |
| **Biometric API** | Hetzner VPS (port 8001, internal) | ✅ Running |

## Hetzner VPS Access

**SSH directly with key:**
```bash
# Check running containers
ssh -i <YOUR_SSH_KEY_PATH> root@<YOUR_SERVER_IP> "docker ps"

# Interactive SSH
ssh -i <YOUR_SSH_KEY_PATH> root@<YOUR_SERVER_IP>

# Copy files to server
scp -i <YOUR_SSH_KEY_PATH> LOCAL_FILE root@<YOUR_SERVER_IP>:/opt/identity-core-api/
```

**Hetzner VPS Details:**
- **IP**: See `.env.prod` or infrastructure docs
- **Type**: CX43 (16GB RAM, 8 vCPU, 150GB disk), Nuremberg, Ubuntu 24.04
- **SSH key**: `<YOUR_SSH_KEY_PATH>`
- **Docker**: 29.3.0, Docker Compose v5.1.0
- **Firewall**: UFW — 22/80/443 open

**Running Containers on Hetzner (deploy user, /opt/projects/fivucsas/):**
- `identity-core-api` (port 8080, healthy) — Spring Boot 3.2.0 / Java 21
- `biometric-api` (port 8001, healthy) — FastAPI, CPU mode, Resemblyzer + DeepFace
- `shared-redis` (port 6379, internal only)
- `shared-postgres` with pgvector (port 5432, internal only) — biometric_db: face_embeddings, voice_enrollments

**Shared Infrastructure (all FIVUCSAS services + Mizan + Sarnic share these):**
- PostgreSQL 17 with pgvector — shared instance, per-service databases
- Redis 7.4 — shared instance, per-service database numbers
- Deployment via `docker-compose.prod.yml` + `.env.prod` per service

**CI/CD:**
- Self-hosted runner `hetzner-cx43` — unlimited free CI minutes
- GitHub Actions workflows optimized with path filters, caching, concurrency groups
- Dependabot configured: weekly schedule, grouped updates, limit 5 PRs

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
├── web-app/                 # React dashboard (submodule) → ica-fivucsas.rollingcatsoftware.com
├── landing-website/         # Landing page (React + Tailwind) → fivucsas.rollingcatsoftware.com
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
- **Identity API Swagger**: https://auth.rollingcatsoftware.com/swagger-ui.html
- **Biometric API Swagger**: https://bpa-fivucsas.rollingcatsoftware.com/docs (when tunnel is running)

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

# Playwright E2E tests (28 spec files)
cd web-app && npx playwright test

# Verification pipeline tests (13 tests)
# Health: 17/17, CRUD: 33/33, RBAC: 40/40, Verification: 13/13

# E2E tests require auth setup: e2e/.auth/session.json (generated by auth.setup.ts)
# Target: E2E_BASE_URL env var or default https://ica-fivucsas.rollingcatsoftware.com
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

## Test Credentials

See `.env.example` for test credentials setup. Do not commit real credentials to version control.

## Useful Paths

- Main README: `./README.md`
- **ROADMAP_V2.md**: `./ROADMAP_V2.md` — Browser-first roadmap, 9 phases (0-8 complete), ~23 weeks
- Full Documentation: `./docs/README.md`
- API Integration: `./docs/04-api/`
- Architecture: `./docs/02-architecture/`
- Implementation Status: `./docs/07-status/IMPLEMENTATION_STATUS_REPORT.md`
- Security Audit Report: `./docs/audit/AUDIT-2026-03-31.md`
- Custom Commands: `/security-audit`, `/arch-review`, `/test-gaps`, `/docker-review`, `/perf-review` (defined in `.claude/commands/`)

## Current Focus Areas

### Completed (100%)
- Biometric Processor (46+ endpoints, DeepFace 0.0.98, anti-spoofing, API key auth)
- Web Admin Dashboard (Identity Core Admin)
- Database Schema (28 Flyway migrations, V1-V28)
- Documentation
- Identity Core API (100% - all endpoints complete, 528 tests pass, deployed on Hetzner VPS)
- ✅ Landing Website deployed to `fivucsas.rollingcatsoftware.com`
- ✅ Web Dashboard deployed to `ica-fivucsas.rollingcatsoftware.com`
- ✅ Identity Core API running on Hetzner VPS (V28 migration applied)
- ✅ Audit log persistence fix (infinite loop + @Transactional/@Async conflict)
- ✅ Realistic sample data seeding (V15 migration: 3 tenants, 8 users, audit logs)
- ✅ Audit log action filter fix (frontend param flattening)
- ✅ User creation form UX fix (tenant dropdown)
- ✅ Tenant create/edit form page
- ✅ Multi-modal auth system architecture (10 documents in docs/09-auth-flows/)
- ✅ Phase 1: Backend foundation (V16 migration, 8 entities, 8 repos, 5 services, 6 controllers)
- ✅ Phase 2: Core auth handlers (Password, Face, Email OTP, QR Code) + EmailService + unit tests
- ✅ CI/CD Pipeline (GitHub Actions on self-hosted runner `hetzner-cx43`: Java 21 + Python 3.11 + Node 20)
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

### Phase 8: Identity Verification Pipeline (Completed 2026-03-28)
- ✅ **Phase 8A**: V26 migration, VerificationSession/StepResult/Document entities, ManageVerificationService, VerificationController, FlowType enum, 5 industry templates (Banking KYC, Healthcare, Education, Government, Fintech)
- ✅ **Phase 8B**: Document scan (YOLO), MRZ parser (TD1/TD3), Tesseract OCR for TC Kimlik field extraction
- ✅ **Phase 8C**: Face-to-document matching (DeepFace cosine similarity), liveness pipeline integration, threshold config per tenant
- ✅ **Phase 8D**: Verification flow builder UI, verification dashboard, session detail page, template selector component
- ✅ **Phase 8E**: 9 step handlers (DOCUMENT_SCAN, DATA_EXTRACT, NFC_CHIP_READ, FACE_MATCH, LIVENESS_CHECK, ADDRESS_PROOF, WATCHLIST_CHECK, AGE_VERIFICATION, VIDEO_INTERVIEW), handler registry, biometric client, orchestration engine
- ✅ **V28 migration**: Video interview step with admin review queue
- ✅ **Android CI**: GitHub Actions APK build workflow
- ✅ **iOS CI**: GitHub Actions iOS build workflow
- ✅ **Tesseract OCR**: TC Kimlik field extraction (name, TC number, DOB, photo)
- ✅ **Test results**: Health 17/17, CRUD 33/33, RBAC 40/40, Verification 13/13, Playwright 28 specs, 304 unit tests
- ✅ **Fixes**: Liveness 415 (explicit multipart header), RLS wired, CORS, CSP, Turkish chars, quality score display, profile menu, card type display, admin-only pages, login page cleanup, hardware key info

### Recently Completed
- ✅ **Client-apps Phase 1 complete** (2026-04-04): build fixes, deprecated APIs, RECORD_AUDIO permission, FIDO2/WebAuthn integration (1,058 lines, 19 files)
- ✅ **Enrollment page 10-bug fix** (2026-04-04): enrollment status (PENDING→ENROLLED auto-complete), face mobile UX (timeout+relaxed thresholds), WebAuthn delete (UUID endpoint), floating Snackbar, human-readable messages, TOTP/WebAuthn enrollment records

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

### Session 2026-04-04 (continued) — Performance + Platform + WebAuthn
- ✅ **WebAuthn backend endpoints** — 4 new endpoints (register-options, register, authenticate-options, authenticate) + 22 tests
- ✅ **iOS real implementations** — AVFoundation camera, LocalAuthentication (Face ID/Touch ID), WebAuthn passkeys (iOS 16+)
- ✅ **Desktop WebAuthn** — Software ECDSA authenticator + PKCS12 keystore + persistent credential store
- ✅ **Client-apps Phase 2 complete** (8/8)
- ✅ **W20-W22, W25-W26 fixed** — mobile responsive, 2FA crash, i18n audit (~40+ strings), date formatting
- ✅ **Performance: `/ping` endpoint** — instant health check (0ms vs 678ms)
- ✅ **Performance: pgvector HNSW indexes** — face_embeddings + voice_enrollments
- ✅ **Performance: biometric-api memory** already at 4GB, voice thread pool already in place

### Session 2026-04-05 Results
- ✅ **W14 GitHub repos cleanup** — all 8 repos tagged and organized
- ✅ **W16 Cross-device sessions UI** — SessionsSection added to Settings page, i18n EN+TR
- ✅ **W24 Settings duplicate enrollment removed** — Continuous Face Verification section removed from Settings
- ✅ **Widget-demo & developer-portal made public** — removed AdminRoute wrapper, accessible without login
- ✅ **OAuth endpoints verified working** — authorization code flow confirmed
- ✅ **Biometric-processor reverted to Python 3.12** — TensorFlow compatibility (TF does not support 3.13)
- ✅ **Web-app deployed to Hostinger** — latest build live at ica-fivucsas.rollingcatsoftware.com
- ✅ **All services healthy** — identity-core-api, biometric-api, shared-postgres, shared-redis

### In Progress
- Client-side ML migration (feature branch `feature/client-side-ml`) — see `CLIENT_SIDE_ML_REPORT.md`

### Next Steps (Priority Order)
1. ~~Phases 0-8 all complete~~ ✅ Done (March 28)
2. ~~iOS real implementations~~ ✅ Done (April 4)
3. ~~Desktop WebAuthn~~ ✅ Done (April 4)
4. ~~WebAuthn backend endpoints~~ ✅ Done (April 4)
5. ~~Performance optimization~~ ✅ Done (April 4)
6. ~~Client-apps Phase 3~~ ✅ Done (April 4)
7. ~~W14/W16/W24 cleanup~~ ✅ Done (April 5)
8. Setup Cloudflare Tunnel for biometric-processor on laptop GPU
9. Final presentation delivery (Spring 2026)
10. Production penetration test

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
scp -P 65002 -r auth-test/* <YOUR_HOSTINGER_USER>@<YOUR_HOSTINGER_IP>:~/public_html/auth-test/
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
2. **Test against production**: Use `curl` to test `https://auth.rollingcatsoftware.com/api/v1/...`
3. **Commit & push**: Push changes to GitHub from within the session
4. **Deployment**: Flag changes that need deployment — user deploys from local machine

### Key API Endpoints for Testing
```bash
# Health check
curl https://auth.rollingcatsoftware.com/actuator/health

# Login (get JWT token) — use credentials from .env.example
curl -X POST https://auth.rollingcatsoftware.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"<ADMIN_EMAIL>","password":"<ADMIN_PASSWORD>"}'

# Use token for authenticated requests
curl https://auth.rollingcatsoftware.com/api/v1/users \
  -H "Authorization: Bearer <TOKEN>"

# Swagger UI (browser): https://auth.rollingcatsoftware.com/swagger-ui.html
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
- ESLint 42→39, 304/304 unit tests passing, TS 0 errors
- identity-core-api rebuilt and deployed (healthy)
- web-app deployed to Hostinger 5x with all fixes
- bpa-fivucsas DNS fully working
- Embeddable Auth Widget Architecture doc created
- All 10 auth handlers production-ready
- Phase 7 complete: verify-app, auth-js SDK, auth-react, OAuth 2.0 endpoints
- Phase 8 complete: Full identity verification pipeline (8A-8E)
  - V26: verification_sessions, verification_step_results, verification_documents
  - V28: video_interview step with admin review
  - 9 step handlers, handler registry, biometric client, orchestration
  - Document scan (YOLO), MRZ parser, Tesseract OCR (TC Kimlik)
  - Face-to-document matching (DeepFace), liveness pipeline
  - Verification flow builder UI, dashboard, session detail, template selector
  - 5 industry templates (Banking KYC, Healthcare, Education, Government, Fintech)
- DeveloperPortalPage (/developer-portal) and WidgetDemoPage (/widget-demo) added
- Playwright CI workflow added, E2E: 28 specs
- Android CI + iOS CI GitHub Actions workflows added
- biometric-processor dependencies updated
- OAuth2Controller, OpenIDConfigController, V24 migration (oauth2_clients), OAuth2Service
- Test results: Health 17/17, CRUD 33/33, RBAC 40/40, Verification 13/13
- Flyway migrations: V1-V28
- Overall project: Phases 0-8 COMPLETE

### Security Audit & Remediation (March 2026)
- ✅ **4 security tools installed**: Semgrep 1.156.0, Trivy 0.69.3, Hadolint 2.12.0, ShellCheck 0.9.0
- ✅ **5 custom review commands created**: `/security-audit`, `/arch-review`, `/test-gaps`, `/docker-review`, `/perf-review`
- ✅ **Audit results**: 9 critical + 34 high findings identified across dependencies, code, Dockerfiles, and shell scripts
- ✅ **All fixed except 1 CVE** (CVE-2026-22732 — Spring Security 6.5.x not yet compatible with Spring Boot 3.4.x)
- ✅ **Dependency upgrades**: Spring Boot 3.4.5→3.4.7, Spring Security→6.4.13, Tomcat→10.1.53, Netty→4.1.132, PostgreSQL JDBC→42.7.7, Commons-IO→2.21.0
- ✅ **Code fixes**: JWT tokens removed from config, shell=True→False, SRI hashes on CDN scripts, template literals
- ✅ **Infrastructure hardening**: Docker no-new-privileges + read_only, Nginx header fix, Dockerfile consolidation
- ✅ **Full audit report**: `docs/audit/AUDIT-2026-03-31.md`
