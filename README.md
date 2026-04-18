# FIVUCSAS — Face and Identity Verification Using Cloud-based SaaS

![License](https://img.shields.io/badge/license-MIT-green.svg)
![Status](https://img.shields.io/badge/status-Production-brightgreen.svg)
![Java](https://img.shields.io/badge/Java-21-orange.svg)
![Python](https://img.shields.io/badge/Python-3.12-yellow.svg)
![React](https://img.shields.io/badge/React-18-blue.svg)
![Kotlin](https://img.shields.io/badge/Kotlin-2.0-purple.svg)

## Overview

**FIVUCSAS** is a multi-tenant biometric authentication platform for secure identity verification. It supports ten authentication methods (password, email/SMS OTP, TOTP, QR code, face, voice, fingerprint, hardware key, NFC document) composable into tenant-configured MFA flows, and exposes a production-grade OAuth 2.0 / OIDC authorization server with hosted-first redirective login.

Engineering Project at **Marmara University's Computer Engineering Department** — CSE4297 / CSE4197.

### Key Innovation: The Biometric Puzzle

Our unique **active liveness detection algorithm** requires users to perform a random sequence of facial actions (smile, blink, look left/right), making it highly resistant to spoofing attacks.

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                      FIVUCSAS Platform                        │
├──────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────┐     │
│  │  Mobile App │  │   Web App    │  │  Desktop App    │     │
│  │    (KMP)    │  │   (React)    │  │     (KMP)       │     │
│  └──────┬──────┘  └──────┬───────┘  └────────┬────────┘     │
│         └────────────────┼───────────────────┘               │
│                  ┌───────▼────────┐                          │
│                  │  API Gateway   │                          │
│                  │    (NGINX)     │                          │
│                  └───────┬────────┘                          │
│         ┌────────────────┴────────────────┐                  │
│  ┌──────▼──────────┐          ┌───────────▼─────────┐       │
│  │ Identity Core   │◄────────►│  Biometric          │       │
│  │ API (Spring)    │          │  Processor (FastAPI)│       │
│  └────────┬────────┘          └───────────┬─────────┘       │
│  ┌────────▼────────┐          ┌───────────▼─────────┐       │
│  │  PostgreSQL     │          │       Redis          │       │
│  │  + pgvector     │          │  (Cache & Queue)     │       │
│  └─────────────────┘          └──────────────────────┘       │
└──────────────────────────────────────────────────────────────┘
```

### Technology Stack

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **Backend Core** | Spring Boot 3.4.7 (Java 21) | Identity & Auth Management, OAuth 2.0 / OIDC |
| **AI/ML Service** | FastAPI (Python 3.12) | Biometric Processing (DeepFace, MediaPipe, YOLO) |
| **Mobile App** | Kotlin Multiplatform + Compose | Cross-platform (Android/iOS/Desktop) |
| **Web Dashboard** | React 18 + TypeScript 5 + Vite 8 | Admin Panel, MUI, InversifyJS DI |
| **Hosted Login / Widget** | verify.fivucsas.com | Hosted-first redirective + iframe step-up MFA |
| **Database** | PostgreSQL 17 + pgvector | Data & HNSW vector indexes |
| **Cache / Session** | Redis 7.4 | OTP TTL, rate limits, JWKS cache |
| **Edge / Routing** | Traefik v3.6 | TLS, per-route CSP, redirect-URI allowlist |

## Repository Structure

```
FIVUCSAS/
├── biometric-processor/     # FastAPI ML service (submodule)
├── identity-core-api/       # Spring Boot microservice (submodule)
├── client-apps/             # Kotlin Multiplatform apps (submodule)
├── web-app/                 # React admin dashboard (submodule)
├── docs/                    # Comprehensive documentation (submodule)
├── practice-and-test/       # R&D experiments (submodule)
├── nginx/                   # API Gateway configuration
├── monitoring/              # Prometheus/Grafana configs
├── load-tests/              # Performance testing
├── scripts/                 # Utility scripts
├── docker-compose.yml       # Main development environment
├── docker-compose.dev.yml   # Development overrides
├── docker-compose.prod.yml  # Production configuration
└── .env.example             # Environment variables template
```

## Quick Start

### Clone with Submodules

```bash
git clone --recurse-submodules https://github.com/Rollingcat-Software/FIVUCSAS.git
cd FIVUCSAS

# Or initialize submodules if already cloned:
git submodule update --init --recursive
```

### Docker Compose (Recommended)

```bash
# 1. Configure environment
cp .env.example .env
# Edit .env with your settings

# 2. Start all services
docker-compose up -d

# 3. Check status
docker-compose ps

# 4. View logs
docker-compose logs -f
```

### Access Points

| Service | URL |
|---------|-----|
| API Gateway | http://localhost:8000 |
| Identity Core API | http://localhost:8080 |
| Biometric Processor | http://localhost:8001 |
| Swagger UI (Spring) | http://localhost:8080/swagger-ui.html |
| API Docs (FastAPI) | http://localhost:8001/docs |

### Production URLs

| Service | URL |
|---------|-----|
| Identity Core API | https://api.fivucsas.com |
| Swagger UI | https://api.fivucsas.com/swagger-ui.html |
| Web Admin Dashboard | https://app.fivucsas.com |
| Landing Page | https://fivucsas.com |

## Development

### Running Individual Services

```bash
# Identity Core API
cd identity-core-api
mvn spring-boot:run -Dspring-boot.run.profiles=dev

# Biometric Processor
cd biometric-processor
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8001

# Web App
cd web-app
npm install && npm run dev
```

### Running Tests

```bash
# Backend (identity-core-api) — Testcontainers-backed integration + unit
cd identity-core-api && mvn test

# Biometric processor — pytest
cd biometric-processor && pytest tests/unit/

# Web-app unit + component — Vitest
cd web-app && npm test

# Web-app E2E — Playwright against local or production
cd web-app && npx playwright test

# Mobile — requires Android SDK
cd client-apps && ./gradlew :shared:test
```

## Documentation

- **[Full Documentation](./docs/README.md)** — start here
- [Getting Started](./docs/01-getting-started/)
- [Architecture](./docs/02-architecture/)
- [Development Guide](./docs/03-development/)
- [API Documentation](./docs/04-api/)
- [Multi-Modal Auth Architecture](./docs/09-auth-flows/README.md)
- [Active Plans](./docs/plans/) — SMS activation, client-side ML split, BYOD, OAuth2 audit, multi-method 2FA

## Project Status (April 2026)

Production-deployed. 99% complete. ~1,820+ tests across backend/web/mobile (633 backend + 619 web-app Vitest + 424 Kotlin + 27 Playwright specs).

### What's shipped

- **Identity Core API** — Spring Boot 3.4.7 on Java 21, JWT + RBAC + multi-tenancy, all 10 auth handlers, Flyway V1–V38 (V34–V36 ship hosted-login hardening: PKCE S256 mandate for public clients, atomic code-mint replay guard, cross-client replay guard; V37 tenant_id index; V38 SPA public client flip), deployed on Hetzner VPS
- **Biometric Processor** — FastAPI on Python 3.12, DeepFace / MediaPipe / YOLO for face enroll + verify + liveness, Resemblyzer speaker embeddings for voice, document classifier + MRZ / TC OCR, deployed on Hetzner (internal Docker network, API-key gated, no public route)
- **Web Dashboard** — React 18 + TypeScript 5 + Vite 8, Clean Architecture with InversifyJS DI, 17 admin pages, full i18n (en + tr), deployed to Hostinger
- **Hosted Login + Widget** — `verify.fivucsas.com` serves a hosted-first redirective login (Auth0 / Okta pattern) at top-level browsing context; iframe widget remains available for inline step-up MFA
- **Client Apps** — KMP for Android / iOS / Desktop, platform-native WebAuthn, Custom Tabs / ASWebAuthenticationSession for hosted-login handoff. **Android v5.1.0 ships a standalone TOTP Authenticator** (RFC 6238, AES-GCM EncryptedSharedPreferences vault, Compose Material 3 UI) as a drop-in for Google/Microsoft Authenticator.
- **Identity Verification Pipeline** — 9 step types, 7 industry templates, selfie-to-document matching
- **CI/CD** — self-hosted GitHub runner on the VPS; each submodule has its own `ci.yml` + `deploy-*.yml` workflow; Dependabot configured
- **Security** — PKCE S256 mandatory for public clients, OIDC nonce validation, CSP per-route with frame-ancestors allowlist, GDPR Art. 17 / Art. 20 endpoints (data export + soft-delete purge), rate-limited on authorize-complete + login + export

### Mobile app

See [`client-apps/README.md`](./client-apps/README.md) for the KMP mobile + desktop app, including the v5.1.0 standalone TOTP Authenticator, the current Android feature-parity matrix (targeting 20/20), and the Phase I gap close-out plan in [`docs/plans/PATH_TO_20_20.md`](./docs/plans/PATH_TO_20_20.md).

## Team

**Marmara University - Computer Engineering Department**

- **Ahmet Abdullah Gultekin** - Project Lead & Backend Developer
- **Ayse Gulsum Eren** - Mobile App Developer
- **Aysenur Arici** - AI/ML & Biometric Systems

**Advisor:** Assoc. Prof. Dr. Mustafa Agaoglu

**Course:** CSE4297/CSE4197 Engineering Project

## License

Copyright 2025-2026 FIVUCSAS Team. Licensed under the MIT License.

---

**Built with passion for security and innovation** | Marmara University 2025-2026
