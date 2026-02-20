# FIVUCSAS - Claude Code Project Instructions

## Project Overview

**FIVUCSAS** (Face and Identity Verification Using Cloud-based SaaS) is a multi-tenant biometric authentication platform with microservices architecture.

- **Organization**: Marmara University - Computer Engineering Department
- **Course**: CSE4297/CSE4197 Engineering Project
- **Status**: ~99% Complete (February 2026)
- **Last verified**: 2026-02-20 — All services UP, backend deployed, web dashboard live, E2E tests 14/14 pass

## Architecture

### Design Principles
- **Hexagonal Architecture** (Ports & Adapters) across all services
- **SOLID Principles** strictly enforced
- **Clean Architecture** separation of concerns
- **DRY, KISS, YAGNI** - avoid over-engineering

### Technology Stack

| Component | Technology | Port |
|-----------|-----------|------|
| Identity Core API | Spring Boot 3.2 (Java 21) | 8080 |
| Biometric Processor | FastAPI (Python 3.11+) | 8001 |
| Web Dashboard | React 18 + TypeScript | 5173 |
| Mobile/Desktop | Kotlin Multiplatform | - |
| Database | PostgreSQL 16 + pgvector | 5432 |
| Cache/Queue | Redis 7 | 6379 |
| API Gateway | NGINX | 8000 |

### Deployment & Subdomains

| Subdomain | Purpose | Status |
|-----------|---------|--------|
| `ica-fivucsas.rollingcatsoftware.com` | Identity Core Admin (web-app) | ✅ LIVE (Hostinger) |
| `bpa-fivucsas.rollingcatsoftware.com` | Biometric Processor API | ⏳ Pending (Cloudflare Tunnel) |
| `fivucsas.rollingcatsoftware.com` | Landing Page | ✅ LIVE (Hostinger) |

### Production URLs (REMEMBER!)

| Service | URL | Status |
|---------|-----|--------|
| **Identity Core API** | http://34.116.233.134:8080 | ✅ Running |
| **Swagger UI** | http://34.116.233.134:8080/swagger-ui.html | ✅ Available |
| **Web Dashboard** | https://ica-fivucsas.rollingcatsoftware.com | ✅ Live |
| **Landing Website** | https://fivucsas.rollingcatsoftware.com | ✅ Live |
| **Biometric API** | https://bpa-fivucsas.rollingcatsoftware.com | ⏳ Pending |

## ⚠️ IMPORTANT: GCP VM Access (REMEMBER!)

**Direct SSH does NOT work** - Port 22 is blocked by firewall.

**Use gcloud with IAP tunnel instead (ALWAYS include `--project=fivucsas`):**
```powershell
# List instances
gcloud compute instances list --project=fivucsas

# SSH via IAP tunnel (REQUIRED - note --project flag!)
gcloud compute ssh fivucsas-identity-core --zone=europe-central2-a --tunnel-through-iap --project=fivucsas --command="docker ps"

# Interactive SSH
gcloud compute ssh fivucsas-identity-core --zone=europe-central2-a --tunnel-through-iap --project=fivucsas

# SCP files to VM
gcloud compute scp LOCAL_FILE fivucsas-identity-core:/remote/path --zone=europe-central2-a --tunnel-through-iap --project=fivucsas
```

**⚠️ Default gcloud project is `muhabbet-app-prod` (NOT fivucsas!) — always pass `--project=fivucsas`**

**GCP VM Details:**
- **Instance Name**: `fivucsas-identity-core`
- **Zone**: `europe-central2-a`
- **External IP**: `34.116.233.134`
- **Project**: `fivucsas` (NOT the default project!)

**Running Containers on GCP:**
- `fivucsas-identity-core-api` (port 8080)
- `fivucsas-redis` (port 6379, internal only)
- `fivucsas-postgres` with pgvector (port 5432, internal only)

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
- **Identity API Swagger**: http://34.116.233.134:8080/swagger-ui.html
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
- `user_devices` - Registered user devices
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
curl -X POST http://34.116.233.134:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@fivucsas.local","password":"Test@123"}'
```

## Useful Paths

- Main README: `./README.md`
- Full Documentation: `./docs/README.md`
- API Integration: `./docs/04-api/`
- Architecture: `./docs/02-architecture/`
- Implementation Status: `./docs/07-status/IMPLEMENTATION_STATUS_REPORT.md`

## Current Focus Areas

### Completed (100%)
- Biometric Processor (46+ endpoints, DeepFace 0.0.98, anti-spoofing, API key auth)
- Web Admin Dashboard (Identity Core Admin)
- Database Schema (16 Flyway migrations)
- Documentation
- Identity Core API (100% - all endpoints complete, 508 tests pass, deployed on GCP)
- ✅ Landing Website deployed to `fivucsas.rollingcatsoftware.com`
- ✅ Web Dashboard deployed to `ica-fivucsas.rollingcatsoftware.com`
- ✅ Identity Core API running on GCP VM (V16 migration applied)
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

### In Progress
- Mobile/Desktop Apps (70%) - Production URLs configured, 7 test files exist (need Android SDK to run)
- Biometric Processor laptop GPU deployment (Cloudflare Tunnel setup pending, scripts ready)

### Next Steps (Priority Order)
1. ~~Deploy updated backend JAR to GCP VM~~ ✅ Done (Feb 19, all 10 auth handlers live)
2. ~~Build and deploy updated web-app to Hostinger~~ ✅ Done (multi-step auth UI live)
3. ~~Run Playwright E2E tests against production~~ ✅ Done (14/14 pass, Feb 20)
4. ~~Fix production 500 errors (auth-flows, devices)~~ ✅ Done (Feb 20)
5. ~~TestContainers integration tests~~ ✅ Done (24 tests pass)
6. ~~i18n, analytics, TOTP enrollment, notification panel~~ ✅ Done
7. ~~Twilio SMS gateway~~ ✅ Done (ready for activation)
8. ~~Spring 2026 presentation slides~~ ✅ Done
9. Setup Cloudflare Tunnel for biometric-processor on laptop GPU (scripts ready in deploy/)
10. Mobile app unit tests (need Android SDK: `cd client-apps && ./gradlew :shared:test`)
11. Final presentation delivery (Spring 2026)

## Deployment Scripts (REMEMBER!)

| Script | Purpose |
|--------|---------|
| `scripts/deploy/deploy-identity-core-gcp.ps1` | Deploy Identity Core API to GCP |
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
- Access local gcloud credentials (no GCP VM deployment)
- Access Hostinger cPanel (no frontend deployment)
- Run local Docker Compose
- Access local GPU for biometric processing
- Access local IDE or file system outside the repo

### Recommended Cloud Workflow
1. **Code changes**: Edit files directly in submodules
2. **Test against production**: Use `curl` to test `http://34.116.233.134:8080/api/v1/...`
3. **Commit & push**: Push changes to GitHub from within the session
4. **Deployment**: Flag changes that need deployment — user deploys from local machine

### Key API Endpoints for Testing
```bash
# Health check
curl http://34.116.233.134:8080/actuator/health

# Login (get JWT token)
curl -X POST http://34.116.233.134:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@fivucsas.local","password":"Test@123"}'

# Use token for authenticated requests
curl http://34.116.233.134:8080/api/v1/users \
  -H "Authorization: Bearer <TOKEN>"

# Swagger UI (browser): http://34.116.233.134:8080/swagger-ui.html
```

### Submodule Development Pattern
Each submodule is an independent Git repo. When making changes:
1. `cd` into the submodule directory
2. Make changes and commit within the submodule
3. Push the submodule to its own remote
4. Update the parent repo's submodule pointer: `git add <submodule-dir>`
5. Commit and push the parent repo
