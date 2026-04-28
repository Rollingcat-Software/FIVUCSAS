# FIVUCSAS - Face and Identity Verification Using Cloud-based SaaS

![Version](https://img.shields.io/badge/version-4.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Status](https://img.shields.io/badge/status-Production-brightgreen.svg)
![Last verified](https://img.shields.io/badge/last%20verified-2026--04--28-informational.svg)

> **Current state:** see [ROADMAP_2026-04-28.md](ROADMAP_2026-04-28.md)
> for the canonical record. Older audits / roadmaps are in
> [archive/2026-04-pre-roadmap-2028/](archive/2026-04-pre-roadmap-2028/).

## Overview

**FIVUCSAS** is a comprehensive, multi-tenant biometric authentication platform designed for secure identity verification. Developed as an Engineering Project at **Marmara University's Computer Engineering Department**.

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
| **Backend Core** | Spring Boot 3.2+ (Java 21) | Identity & Auth Management |
| **AI/ML Service** | FastAPI (Python 3.11+) | Biometric Processing |
| **Mobile App** | Kotlin Multiplatform + Compose | Cross-platform (Android/iOS) |
| **Web Dashboard** | React 18 + TypeScript | Admin Panel |
| **Desktop Client** | Kotlin Multiplatform + Compose | Kiosk Mode |
| **Database** | PostgreSQL 16 + pgvector | Data & Vector Storage |
| **Cache/Queue** | Redis 7 | Session & Messaging |
| **API Gateway** | NGINX | Routing & Rate Limiting |

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
# Windows
./scripts/run-all-tests.ps1

# Linux/Mac
./scripts/run-tests.sh

# Integration tests
./scripts/test-integration.sh

# E2E tests (Playwright, against production)
cd web-app && npx playwright test

# Mobile unit tests (requires Android SDK)
cd client-apps && ./gradlew :shared:test
```

## Documentation

- **[Full Documentation](./docs/README.md)** - Start here
- [Getting Started Guide](./docs/01-getting-started/)
- [Architecture Analysis](./docs/02-architecture/)
- [Development Guide](./docs/03-development/)
- [API Documentation](./docs/04-api/)
- [Implementation Status](./docs/IMPLEMENTATION_STATUS_REPORT.md)
- [Multi-Modal Auth Architecture](./docs/09-auth-flows/README.md)

## Project Status (March 2026)

### Completed
- [x] Biometric Processor API (100%) - 46+ endpoints, 9 ML models, anti-spoofing support
- [x] Web Admin Dashboard (100%) - React 18, Material-UI, deployed to Hostinger
- [x] Database Schema (100%) - PostgreSQL 16 + pgvector, 17 Flyway migrations
- [x] Comprehensive Documentation (100%)
- [x] Identity Core API (100%) - JWT auth, RBAC, multi-tenancy, all 10 auth handlers, deployed on Hetzner
- [x] Landing Website - deployed to `fivucsas.rollingcatsoftware.com`
- [x] Multi-Modal Auth System - 10 auth handlers, device constraints, configurable auth flows
- [x] Browser-Side Face Detection - MediaPipe Tasks API for real-time face quality checks
- [x] Anti-Spoofing Integration - DeepFace 0.0.98 built-in + config for MiniFASNet
- [x] CI/CD Pipeline - GitHub Actions for all 3 services
- [x] E2E Testing - 224 Playwright tests (217 pass, 7 skipped) against production
- [x] Mobile App Backend Integration - Production API URLs configured
- [x] Fingerprint Step-Up Auth - ECDSA P-256 challenge-response, deployed on Hetzner VPS (V17)
- [x] 528+ Unit Tests - including step-up, auth handlers, TestContainers integration
- [x] Auth Flow Contract Alignment - backend-driven auth method sourcing and typed operation contracts in web-app
- [x] QR Auth Runtime Integration - QR token generation wired to backend in multi-step flow with manual fallback
- [x] WebAuthn Settings Integration - platform authenticator and hardware key enrollment dialogs added to Settings
- [x] Auth Flow Guardrails Hardened - required-step restrictions expanded for unsupported methods (NFC/Fingerprint/Voice)

### In Progress
- [ ] Mobile/Desktop Apps (70%) - 7 test files ready, need Android SDK to run
- [ ] Biometric Processor deployment - Cloudflare Tunnel scripts ready, WSL2 setup pending
- [ ] Full web-app Vitest stabilization - legacy e2e/service tests still contain baseline failures
- [ ] biometric-processor submodule fast-forward blocked by local untracked-file conflict (`uniface_liveness_detector.py`)

## Team

**Marmara University - Computer Engineering Department**

- **Ahmet Abdullah Gultekin** - Project Lead & Backend Developer
- **Ayse Gulsum Eren** - Mobile App Developer
- **Aysenur Arici** - AI/ML & Biometric Systems

**Advisor:** Assoc. Prof. Dr. Mustafa Agaoglu

**Course:** CSE4297/CSE4197 Engineering Project

## License

Copyright 2025 FIVUCSAS Team. Licensed under the MIT License.

---

**Built with passion for security and innovation** | Marmara University 2025-2026
