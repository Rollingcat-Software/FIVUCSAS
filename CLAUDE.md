# FIVUCSAS — Claude Code Instructions

## Project
**FIVUCSAS** (Face and Identity Verification Using Cloud-based SaaS)
Multi-tenant biometric auth platform | Marmara University CSE4297 | Hexagonal Architecture

**Status**: Production deployed. Phases 0-8 complete. 1,479+ tests. All services healthy.
**Last verified**: 2026-04-05

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
| Identity API | https://auth.rollingcatsoftware.com |
| Web Dashboard | https://ica-fivucsas.rollingcatsoftware.com |
| Landing Site | https://fivucsas.rollingcatsoftware.com |
| BYS Demo | https://bys-demo.rollingcatsoftware.com |
| Swagger | https://auth.rollingcatsoftware.com/swagger-ui.html |

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
scp -P 65002 -r dist/* u349700627@46.202.158.52:~/domains/ica-fivucsas.rollingcatsoftware.com/public_html/

# BYS demo deploy
scp -P 65002 -r /opt/projects/fivucsas/bys-demo/* u349700627@46.202.158.52:~/domains/bys-demo.rollingcatsoftware.com/public_html/

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
├── practice-and-test/       # R&D experiments
├── scripts/                 # Deploy scripts, setup-twilio.sh
└── ROADMAP_MASTER.md        # Single source of truth roadmap
```

## Auth Methods (10)

PASSWORD | EMAIL_OTP | SMS_OTP | TOTP | FACE | VOICE | FINGERPRINT | HARDWARE_KEY | QR_CODE | NFC_DOCUMENT

## Key Features

- Multi-tenant with tenant-controlled auth flows
- 2FA (admin-configurable: PASSWORD + any second factor)
- OAuth 2.0 / OIDC with PKCE support
- Embeddable auth widget (iframe + postMessage)
- Identity verification pipeline (9 steps, 7 industry templates)
- BlazeFace on-device face detection (client-side ML)
- My Profile page (enrollments, activity, data export, KVKK/GDPR)
- Cross-device session management (view/revoke)

## Database

- Flyway migrations V1-V29
- Key tables: users, tenants, auth_flows, auth_flow_steps, auth_methods, biometric_enrollments, audit_logs, oauth2_clients, verification_sessions
- pgvector HNSW indexes on face_embeddings + voice_enrollments

## Testing

| Module | Tests |
|--------|-------|
| Identity Core API (Java) | 628 |
| Web-app (Vitest) | 431 |
| Client-apps (Kotlin) | 386 |
| Playwright E2E | 34 specs |
| **Total** | **~1,479** |

## CI/CD

- Self-hosted runner `hetzner-cx43` on GitHub Actions
- All pipelines GREEN (web-app, identity-core-api, client-apps, biometric-processor)
- Dependabot configured (weekly, grouped, limit 5)

## Design Documents (docs/plans/)

| Document | Topic |
|----------|-------|
| SMS_ACTIVATION_PLAN.md | Twilio integration (hexagonal) |
| CLIENT_SIDE_ML_PLAN.md | On-device ML migration (10 weeks) |
| BYOD_ARCHITECTURE.md | Tenant own-DB (8 weeks) |
| VOICE_STT_PLAN.md | Speech-to-text verification |
| BAAS_RENTAL_MODEL.md | BaaS pricing model |
| PRODUCTION_HARDENING_PLAN.md | Security + performance |
| OAUTH2_COMPLIANCE_AUDIT.md | RFC 6749/OIDC audit results |

## Coding Standards

- **Hexagonal Architecture** everywhere (ports & adapters)
- **Java**: `domain/` → `application/` → `infrastructure/`, Spring DI
- **TypeScript**: Feature-based folders, InversifyJS DI, i18n (EN+TR)
- **Kotlin**: shared/commonMain with expect/actual
- **Python**: Clean Architecture, Pydantic, async/await
- No hardcoded secrets — use .env.prod
- Do NOT dockerize static sites (keep on Hostinger)
- Recommend first, implement only after explicit approval
