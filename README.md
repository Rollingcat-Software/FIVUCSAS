# FIVUCSAS

**Face and Identity Verification Using Cloud-based SaaS**

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Status](https://img.shields.io/badge/status-In%20Development-yellow.svg)

A comprehensive, multi-tenant biometric authentication platform with active liveness detection. Developed as an Engineering Project at **Marmara University's Computer Engineering Department**.

## Key Innovation

**Active Liveness Detection (Biometric Puzzle)**: Random facial action challenges (smile, blink, look left/right) to prevent spoofing attacks.

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│               FIVUCSAS Platform                     │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────────┐     │
│  │ Web App  │  │ Desktop  │  │  Mobile App  │     │
│  │ (React)  │  │ (Kotlin) │  │   (Kotlin)   │     │
│  └────┬─────┘  └────┬─────┘  └──────┬───────┘     │
│       └─────────────┼───────────────┘             │
│                     │                              │
│            ┌────────▼────────┐                    │
│            │   API Gateway   │                    │
│            │     (NGINX)     │                    │
│            └────────┬────────┘                    │
│                     │                              │
│       ┌─────────────┴─────────────┐              │
│       │                           │              │
│  ┌────▼────────┐        ┌────────▼──────┐       │
│  │identity-api │◄──────►│  biometric-   │       │
│  │(Spring Boot)│        │  processor    │       │
│  └──────┬──────┘        │  (FastAPI)    │       │
│         │               └────────┬──────┘       │
│  ┌──────▼──────┐        ┌───────▼───────┐       │
│  │ PostgreSQL  │        │    Redis      │       │
│  │ + pgvector  │        │ Cache & Queue │       │
│  └─────────────┘        └───────────────┘       │
│                                                   │
└───────────────────────────────────────────────────┘
```

---

## Modules

| Module | Technology | Description | Status |
|--------|------------|-------------|--------|
| [identity-core-api](./identity-core-api) | Spring Boot / Java 21 | Authentication & user management | 60% |
| [web-app](./web-app) | React / TypeScript | Admin dashboard | 100% UI |
| [biometric-processor](./biometric-processor) | FastAPI / Python | Face recognition & liveness | 0% |
| [mobile-app](./mobile-app) | Kotlin Multiplatform | Desktop & mobile apps | 96% Desktop |
| [docs](./docs) | Markdown | API documentation | Basic |

---

## Quick Start

### Prerequisites

- Java 21
- Node.js 20+ (pnpm)
- Python 3.10+
- Docker & Docker Compose

### 1. Clone Repository

```bash
git clone https://github.com/Rollingcat-Software/FIVUCSAS.git
cd FIVUCSAS
git submodule update --init --recursive
```

### 2. Start Infrastructure

```bash
docker-compose -f config/docker-compose.yml up -d
```

### 3. Start Backend

```bash
cd identity-core-api
./mvnw spring-boot:run
```

### 4. Start Frontend

```bash
cd web-app
pnpm install && pnpm dev
```

Open http://localhost:5173

---

## Repository Structure

```
FIVUCSAS/
├── README.md
├── .env.example
│
├── docs/                      # Documentation
│   ├── architecture/          # System design docs
│   ├── guides/                # User & developer guides
│   │   └── deployment/        # Deployment guides
│   ├── modules/               # Module implementation plans
│   ├── testing/               # Test documentation
│   ├── project/               # Project management
│   └── archive/               # Historical docs
│
├── scripts/                   # Automation scripts
│   ├── setup/                 # Setup & initialization
│   ├── testing/               # Test scripts
│   ├── diagnostics/           # Debug & diagnostic tools
│   └── deployment/            # Deployment scripts
│
├── config/                    # Configuration files
│   ├── docker-compose.yml     # Main compose
│   ├── docker-compose.dev.yml # Development
│   └── docker-compose.prod.yml# Production
│
├── infrastructure/            # Infrastructure config
│   ├── nginx/                 # API gateway
│   ├── monitoring/            # Prometheus/Grafana
│   └── load-tests/            # k6 load tests
│
└── modules (submodules)/      # Git submodules
    ├── identity-core-api/     # Backend API
    ├── web-app/               # Admin dashboard
    ├── biometric-processor/   # ML/AI service
    ├── mobile-app/            # Desktop & mobile
    └── docs/                  # API documentation
```

---

## Documentation

### Getting Started
- [Quick Start Guide](./docs/guides/quick-start.md)
- [Local Development](./docs/guides/local-development.md)

### Architecture
- [System Overview](./docs/architecture/structure.md)
- [Data Flow](./docs/architecture/data-flow.md)
- [Security Model](./docs/architecture/security.md)

### Module Implementation Plans
- [identity-core-api](./docs/modules/identity-core-api.md)
- [web-app](./docs/modules/web-app.md)
- [biometric-processor](./docs/modules/biometric-processor.md)
- [mobile-app](./docs/modules/mobile-app.md)

### Deployment
- [Deployment Guide](./docs/guides/deployment/deployment-guide.md)
- [Staging Deployment](./docs/guides/deployment/staging.md)
- [Monitoring](./docs/guides/deployment/monitoring.md)

### Testing
- [Test Report](./docs/testing/test-report.md)
- [Integration Testing](./docs/testing/integration-testing.md)
- [Load Testing](./docs/testing/load-testing.md)

---

## Technology Stack

### Backend
- **Framework**: Spring Boot 3.2+
- **Language**: Java 21
- **Database**: PostgreSQL 16 + pgvector
- **Cache**: Redis 7
- **Auth**: JWT

### Frontend
- **Framework**: React 18
- **Language**: TypeScript 5
- **Build**: Vite 5
- **UI**: Material-UI v5
- **State**: Redux Toolkit

### ML/AI
- **Framework**: FastAPI
- **Language**: Python 3.10+
- **ML**: TensorFlow / PyTorch
- **Queue**: Celery + Redis

### Desktop/Mobile
- **Framework**: Kotlin Multiplatform
- **UI**: Compose Multiplatform
- **Platforms**: Windows, macOS, Linux, Android, iOS

---

## Development Workflow

1. Create feature branch from `develop`
2. Implement changes following SOLID principles
3. Write tests (80%+ coverage)
4. Create pull request
5. Code review
6. Merge to `develop`

See [Project Planning](./docs/project/planning-summary.md) for detailed roadmap.

---

## License

MIT License - see [LICENSE](./LICENSE) for details.

---

## Team

**Marmara University - Computer Engineering Department**

Engineering Project 2024-2025

---

## Contributing

1. Fork the repository
2. Create feature branch
3. Commit changes
4. Push to branch
5. Create pull request

See module implementation plans in `docs/modules/` for specific contribution areas.
