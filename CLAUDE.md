# FIVUCSAS — Claude Code Instructions

## Project
**FIVUCSAS** (Face and Identity Verification Using Cloud-based SaaS)
Multi-tenant biometric auth platform | Marmara University CSE4297 | Hexagonal Architecture

**Status**: Production deployed. Phases 0-8 complete. ~1,900+ tests. All services healthy.
**Last verified**: 2026-05-11 (Session shipped 11 PRs across 5 repos + Flyway repair on prod. Prod containers rebuilt: api image `179d34a5`, bio `75347c98`, both healthy. **V59 + V60 applied successfully** (audit_logs.tenant_id NULL count 140→0 via backfill + sentinel; `refresh_tokens.token` plaintext column dropped; only `token_secret_hash` remains). **Flyway repair on prod completed** — 7 NULL-checksum + description-mismatch rows fixed (V24, V40-V43, V49, V50); `SPRING_FLYWAY_VALIDATE_ON_MIGRATE=true` now enforced; Task #80 emergency override retired. **Branch protection live** on FIVUCSAS main+master, identity-core-api, biometric-processor, web-app, client-apps (1-review + admin bypass + force-push/deletion blocked). master+main parent branches reconciled and byte-identical. INVESTIGATION 2026-05-07 P1 residue closed: NFC MRZ wired (api→bio), real occlusion detector, anti-spoof verdict policy verified, dev-gate handlers confirmed, soft-delete purge default-on. Docs: tenant onboarding playbook + 8 ADRs + hierarchy consolidation. spoof-detector blink cache + EAR recalibration (paper P0). Operator-only items handed off in `infra/OPERATOR_HANDOFF_2026-05-11.md`.)

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

## Architectural direction (2026-04-16)

**Hosted-first auth.** Primary integration mode is redirective OIDC: tenants call `FivucsasAuth.loginRedirect({...})` → user redirected to `verify.fivucsas.com/login` → MFA → browser returns with `?code=…&state=…` → tenant exchanges at `/oauth2/token`. Widget iframe remains for **inline step-up MFA** only. See `web-app/docs/AUDIT_REPORT_2026-04-16.md` and `web-app/docs/plans/HOSTED_LOGIN_INTEGRATION.md` (PR-1).

**Why:** Industry pattern (Auth0 Universal Login, Okta, Microsoft Entra, Google, Apple, Keycloak, AWS Cognito, Stripe, Turkish banks, e-Devlet all use hosted-first). Solves Web NFC iframe restriction, WebAuthn cross-origin edge cases, Safari ITP, 3P cookie death.

**Platform coverage:** web, iOS (ASWebAuthenticationSession + AppAuth), Android (Custom Tabs + AppAuth), Electron/desktop (loopback per RFC 8252), CLI. Redirect-URI allowlist accepts HTTPS, custom schemes, and `http://127.0.0.1:*`.

## Key Features

- Multi-tenant with tenant-controlled auth flows
- 2FA (admin-configurable: PASSWORD + any second factor)
- OAuth 2.0 / OIDC with PKCE support (code + id_token, JWKS, discovery)
- Hosted login page (primary) + embeddable widget (step-up MFA, secondary)
- Identity verification pipeline (9 steps, 7 industry templates)
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

- Flyway migrations V1-V38 (identity-core-api; V37 tenant_id index, V38 SPA public client flip) + Alembic 0001-0004 (biometric-processor)
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
- Recommend first, implement only after explicit approval
