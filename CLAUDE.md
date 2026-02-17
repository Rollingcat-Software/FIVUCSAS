# FIVUCSAS - Claude Code Project Instructions

## Project Overview

**FIVUCSAS** (Face and Identity Verification Using Cloud-based SaaS) is a multi-tenant biometric authentication platform with microservices architecture.

- **Organization**: Marmara University - Computer Engineering Department
- **Course**: CSE4297/CSE4197 Engineering Project
- **Status**: ~80% Complete (February 2026)

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

**Use gcloud with IAP tunnel instead:**
```powershell
# List instances
gcloud compute instances list

# SSH via IAP tunnel (REQUIRED)
gcloud compute ssh fivucsas-identity-core --zone=europe-central2-a --tunnel-through-iap --command="docker ps"

# Interactive SSH
gcloud compute ssh fivucsas-identity-core --zone=europe-central2-a --tunnel-through-iap
```

**GCP VM Details:**
- **Instance Name**: `fivucsas-identity-core`
- **Zone**: `europe-central2-a`
- **External IP**: `34.116.233.134`
- **Project**: `fivucsas`

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
- Biometric Processor (46+ endpoints)
- Web Admin Dashboard (Identity Core Admin)
- Database Schema (15 Flyway migrations)
- Documentation
- Identity Core API endpoints (auth, users, tenants, audit logs, enrollments, settings, statistics)
- ✅ Landing Website deployed to `fivucsas.rollingcatsoftware.com`
- ✅ Web Dashboard deployed to `ica-fivucsas.rollingcatsoftware.com`
- ✅ Identity Core API running on GCP VM
- ✅ Audit log persistence fix (infinite loop + @Transactional/@Async conflict)
- ✅ Realistic sample data seeding (V15 migration: 3 tenants, 8 users, audit logs)
- ✅ Audit log action filter fix (frontend param flattening)
- ✅ User creation form UX fix (tenant dropdown)
- ✅ Tenant create/edit form page
- ✅ Multi-modal auth system architecture (10 documents in docs/09-auth-flows/)

### In Progress
- Identity Core API (90%) - multi-modal auth flow implementation in progress
- Mobile/Desktop Apps (60%) - Backend integration pending
- Biometric Processor laptop GPU deployment (Cloudflare Tunnel setup pending)

### Next Steps
1. ~~Deploy web-app to `ica-fivucsas.rollingcatsoftware.com` (Hostinger)~~ ✅ DONE
2. ~~Create landing page for `fivucsas.rollingcatsoftware.com`~~ ✅ DONE
3. ~~Multi-modal auth system architecture documentation~~ ✅ DONE
4. Implement Phase 1: Backend foundation (V16 migration, entities, repos, services, controllers)
5. Implement Phase 2: Core auth handlers (Password, Face, Email OTP, QR Code)
6. Setup Cloudflare Tunnel for biometric-processor on laptop GPU
7. Connect mobile apps to backend
8. End-to-end testing

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
