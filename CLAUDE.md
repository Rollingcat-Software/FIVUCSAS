# FIVUCSAS - Claude Code Project Instructions

## Project Overview

**FIVUCSAS** (Face and Identity Verification Using Cloud-based SaaS) is a multi-tenant biometric authentication platform with microservices architecture.

- **Organization**: Marmara University - Computer Engineering Department
- **Course**: CSE4297/CSE4197 Engineering Project
- **Status**: ~75% Complete (February 2026)

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

| Subdomain | Purpose | Hosting |
|-----------|---------|---------|
| `ica.fivucsas.rollingcatsoftware.com` | Identity Core Admin (web-app) | Hostinger |
| `bpa.fivucsas.rollingcatsoftware.com` | Biometric Processor Admin (root only) | Hostinger |
| `fivucsas.rollingcatsoftware.com` | Branding / Landing / Introduction | Hostinger |

- **Identity Core API**: `http://34.116.233.134:8080` (GCP VM)
- **Biometric Processor API**: `http://34.116.233.134:8001` (GCP VM)

## Repository Structure

```
FIVUCSAS/
├── biometric-processor/     # FastAPI ML service (submodule)
├── identity-core-api/       # Spring Boot API (submodule)
├── web-app/                 # React dashboard (submodule)
├── client-apps/             # Kotlin Multiplatform (submodule)
├── docs/                    # Documentation (submodule)
├── practice-and-test/       # R&D experiments (submodule)
├── nginx/                   # API Gateway config
├── monitoring/              # Prometheus/Grafana
├── load-tests/              # Performance testing
├── scripts/                 # Utility scripts
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
# Identity Core API (Spring Boot)
cd identity-core-api
./gradlew bootRun --args='--spring.profiles.active=dev'

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

When services are running:
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
- Database Schema (11 Flyway migrations)
- Documentation
- Identity Core API endpoints (auth, users, tenants, audit logs, enrollments, settings, statistics)

### In Progress
- Identity Core API (85%) - integration testing pending
- Mobile/Desktop Apps (60%) - Backend integration pending
- Frontend-Backend integration deployed

### Next Steps
1. Deploy web-app to `ica.fivucsas.rollingcatsoftware.com` (Hostinger)
2. Deploy biometric admin to `bpa.fivucsas.rollingcatsoftware.com`
3. Create landing page for `fivucsas.rollingcatsoftware.com`
4. Redeploy backend to GCP with latest changes
5. Connect mobile apps to backend
6. End-to-end testing
