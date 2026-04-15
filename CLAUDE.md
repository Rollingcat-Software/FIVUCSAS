# FIVUCSAS — Claude Code Instructions

## Project
**FIVUCSAS** (Face and Identity Verification Using Cloud-based SaaS)
Multi-tenant biometric auth platform | Marmara University CSE4297 | Hexagonal Architecture

**Status**: Production deployed. Phases 0-8 complete. 1,800+ tests. All services healthy.
**Last verified**: 2026-04-15 (V33 voice_enrollments deployed; client-side ML split Phases 1-4 committed)

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
| Uptime Monitor | https://status.fivucsas.com |
| Swagger | https://api.fivucsas.com/swagger-ui.html |

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
└── ROADMAP.md               # Product roadmap
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

- Flyway migrations V1-V33 (identity-core-api) + Alembic 0001-0004 (biometric-processor)
- Key tables: users, tenants, auth_flows, auth_flow_steps, auth_methods, biometric_enrollments, audit_logs, oauth2_clients, verification_sessions, voice_enrollments (V33), client_embedding_observations (Alembic 0004, log-only per D2)
- pgvector HNSW indexes on face_embeddings + voice_enrollments; no HNSW on observations (log, not search surface)

## Testing

| Module | Tests |
|--------|-------|
| Identity Core API (Java) | 633 |
| Web-app (Vitest) | 619 |
| Client-apps (Kotlin) | 401 |
| Playwright E2E | 27 specs |
| **Total** | **~1,800+** |

## CI/CD

- Self-hosted runner `hetzner-cx43` on GitHub Actions
- All pipelines GREEN (web-app, identity-core-api, client-apps, biometric-processor)
- Dependabot configured (weekly, grouped, limit 5)

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
- Recommend first, implement only after explicit approval
