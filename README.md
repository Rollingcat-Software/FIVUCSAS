# FIVUCSAS - Face and Identity Verification Using Cloud-based SaaS

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Status](https://img.shields.io/badge/status-In%20Development-yellow.svg)

## 📋 Overview

**FIVUCSAS** (Face and Identity Verification Using Cloud-based SaaS) is a comprehensive, multi-tenant biometric authentication platform designed to provide secure identity verification for both physical and digital access control. Developed as an Engineering Project at **Marmara University's Computer Engineering Department**, this platform combines cutting-edge deep learning with modern cloud-native architecture.

### Key Innovation: The Biometric Puzzle

Our unique **active liveness detection algorithm** requires users to perform a random sequence of facial actions (smile, blink, look left/right), making it highly resistant to spoofing attacks using photos, videos, or masks.

---

## 🏗️ Architecture

### System Components

```
┌──────────────────────────────────────────────────────────────┐
│                        FIVUCSAS Platform                      │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────┐    │
│  │  Mobile App │  │   Web App    │  │  Desktop App    │    │
│  │  (Flutter)  │  │   (React)    │  │  (Electron)     │    │
│  └──────┬──────┘  └──────┬───────┘  └────────┬────────┘    │
│         │                │                     │              │
│         └────────────────┼─────────────────────┘              │
│                          │                                    │
│                  ┌───────▼────────┐                          │
│                  │  API Gateway   │                          │
│                  │    (NGINX)     │                          │
│                  └───────┬────────┘                          │
│                          │                                    │
│         ┌────────────────┴────────────────┐                  │
│         │                                 │                  │
│  ┌──────▼──────────┐          ┌──────────▼────────┐         │
│  │ Identity Core   │◄────────►│  Biometric         │         │
│  │ API (Spring)    │          │  Processor (FastAPI)│        │
│  └────────┬────────┘          └──────────┬─────────┘         │
│           │                              │                   │
│  ┌────────▼────────┐          ┌──────────▼─────────┐         │
│  │  PostgreSQL     │          │     Redis           │         │
│  │  + pgvector     │          │ (Cache & Queue)     │         │
│  └─────────────────┘          └─────────────────────┘         │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

### Technology Stack

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **Backend Core** | Spring Boot 3.2+ (Java 21) | Identity & Auth Management |
| **AI/ML Service** | FastAPI (Python 3.11+) | Biometric Processing |
| **Mobile App** | Kotlin Multiplatform + Compose | Cross-platform (Android/iOS) |
| **Web Dashboard** | React 18 + TypeScript | Admin Panel |
| **Desktop Client** | Kotlin Multiplatform + Compose | Kiosk Mode + Admin Dashboard (90% code shared with mobile) |
| **Database** | PostgreSQL 16 + pgvector | Data & Vector Storage |
| **Cache/Queue** | Redis 7 | Session & Messaging |
| **API Gateway** | NGINX | Routing & Rate Limiting |

---

## 📁 Repository Structure

```
FIVUCSAS/
├── identity-core-api/       # Spring Boot microservice
├── biometric-processor/     # FastAPI ML service
├── mobile-app/              # Kotlin Multiplatform (Android/iOS)
├── web-app/                 # React admin dashboard
├── desktop-app/             # Kotlin Multiplatform (Desktop)
├── docs/                    # Documentation & configs
│   ├── nginx/               # API Gateway configuration
│   ├── sql/                 # Database initialization
│   └── monitoring/          # Prometheus/Grafana configs
├── docker-compose.yml       # Unified development environment
├── docker-compose.dev.yml   # Development overrides
├── docker-compose.prod.yml  # Production configuration
├── .env.example             # Environment variables template
└── README.md               # This file
```

---

## 🚀 Quick Start

### ⚠️ Important: Git Submodules

This repository uses **Git Submodules** to manage component repositories. When cloning:

```bash
# Clone with submodules (RECOMMENDED)
git clone --recurse-submodules https://github.com/Rollingcat-Software/FIVUCSAS.git

# Or if already cloned, initialize submodules:
git submodule update --init --recursive
```

📖 **See [SUBMODULES_GUIDE.md](./SUBMODULES_GUIDE.md) for complete submodule workflow documentation.**

### Prerequisites

- **Git** with submodule support
- **Docker & Docker Compose** (recommended)
- **Java 21** (for identity-core-api)
- **Python 3.11+** (for biometric-processor)
- **Kotlin 1.9+** (for mobile-app & desktop-app)
- **Android Studio / IntelliJ IDEA** (for KMP development)
- **Node.js 18+** (for web-app)

### Option 1: Docker Compose (Recommended)

```bash
# 1. Clone the repository
git clone https://github.com/your-org/FIVUCSAS.git
cd FIVUCSAS

# 2. Copy and configure environment variables
cp .env.example .env
# Edit .env with your configuration

# 3. Start all services
docker-compose up -d

# 4. Check service status
docker-compose ps

# 5. View logs
docker-compose logs -f
```

**Access Points:**
- API Gateway: http://localhost:8000
- Identity Core API: http://localhost:8080
- Biometric Processor: http://localhost:8001
- Swagger UI: http://localhost:8080/swagger-ui.html

### Option 2: Manual Setup

#### 1. Start Infrastructure

```bash
# Start PostgreSQL
docker run -d --name fivucsas-postgres \
  -e POSTGRES_DB=identity_core_db \
  -e POSTGRES_PASSWORD=postgres \
  -p 5432:5432 \
  pgvector/pgvector:pg16

# Start Redis
docker run -d --name fivucsas-redis \
  -p 6379:6379 \
  redis:7-alpine
```

#### 2. Run Identity Core API

```bash
cd identity-core-api
cp .env.example .env
./gradlew bootRun
```

#### 3. Run Biometric Processor

```bash
cd biometric-processor
cp .env.example .env
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8001
```

#### 4. Run Mobile App

```bash
cd mobile-app
./gradlew :androidApp:installDebug
# Or open in Android Studio / IntelliJ IDEA
```

#### 5. Run Web App

```bash
cd web-app
npm install
npm run dev
```

---

## 📖 Documentation

### Individual Component Documentation

Each repository has comprehensive README documentation:

- **[Git Submodules Guide](./SUBMODULES_GUIDE.md)** ⭐ **START HERE**
- [Identity Core API Documentation](./identity-core-api/README.md)
- [Biometric Processor Documentation](./biometric-processor/README.md)
- [Kotlin Multiplatform Guide](./KOTLIN_MULTIPLATFORM_GUIDE.md)
- [Mobile App Documentation](./mobile-app/README.md)
- [Web App Documentation](./web-app/README.md)
- [Desktop App Documentation](./desktop-app/README.md)

### API Documentation

When services are running:
- **OpenAPI/Swagger**: http://localhost:8080/swagger-ui.html
- **FastAPI Docs**: http://localhost:8001/docs

### Database Schema

Database migrations are managed by Flyway. See:
- `identity-core-api/src/main/resources/db/migration/`

Initial schema includes:
- `V1` - Tenants table
- `V2` - Users table
- `V3` - Roles & permissions
- `V4` - Biometric data with pgvector
- `V5` - Audit logs & sessions

---

## 🛠️ Development

### Environment Setup

1. **Copy environment templates:**
   ```bash
   cp .env.example .env
   cp identity-core-api/.env.example identity-core-api/.env
   cp biometric-processor/.env.example biometric-processor/.env
   # ... repeat for other services
   ```

2. **Configure each `.env` file** with your local settings

### Development with Docker Compose

```bash
# Start with development overrides
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up

# Rebuild after code changes
docker-compose up -d --build

# View specific service logs
docker-compose logs -f identity-core-api
```

### Running Tests

```bash
# Identity Core API
cd identity-core-api
./gradlew test

# Biometric Processor
cd biometric-processor
pytest

# Mobile App
cd mobile-app
flutter test

# Web App
cd web-app
npm test
```

---

## 🔐 Security

### Default Credentials (DEVELOPMENT ONLY)

**Database:**
- Username: `postgres`
- Password: `postgres_dev_password`

**System Admin:**
- Email: `admin@fivucsas.local`
- Password: `Admin@123`

⚠️ **WARNING**: Change all default passwords before deploying to production!

### Security Features

- ✅ JWT-based authentication with refresh tokens
- ✅ BCrypt password hashing (work factor 12)
- ✅ AES-256 encryption for sensitive data
- ✅ Row-level security for multi-tenancy
- ✅ Rate limiting on authentication endpoints
- ✅ CORS configuration
- ✅ SQL injection prevention (parameterized queries)
- ✅ XSS protection
- ✅ KVKK/GDPR compliance features

---

## 🧪 Testing

### Test Coverage Goals

- Unit Tests: > 80%
- Integration Tests: > 70%
- Overall Coverage: > 75%

### Running All Tests

```bash
# Run tests for all components
./scripts/run-all-tests.sh
```

---

## 📦 Deployment

### Production Deployment

```bash
# Build production images
docker-compose -f docker-compose.yml -f docker-compose.prod.yml build

# Start in production mode
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

### Environment Variables for Production

Make sure to set secure values for:
- `JWT_SECRET` - Use a strong 256-bit random key
- `POSTGRES_PASSWORD` - Strong database password
- `REDIS_PASSWORD` - Strong Redis password
- `ENCRYPTION_KEY` - 32-byte AES key

---

## 👥 Team

**Marmara University - Computer Engineering Department**

**Project Team:**
- [Your Name] - Project Lead & Backend Developer
- [Team Member 1] - Mobile App Developer
- [Team Member 2] - AI/ML & Biometric Systems

**Supervisor:** [Supervisor's Name]

**Course:** CSE4297 Engineering Project 1

---

## 📅 Project Timeline

### Phase 1: Foundation (Weeks 1-4) ✅
- [x] Project specification document
- [x] Repository setup
- [x] Docker Compose configuration
- [x] Database schema design
- [ ] Basic API endpoints

### Phase 2: Core Features (Weeks 5-8)
- [ ] User authentication & JWT
- [ ] Multi-tenant implementation
- [ ] Face recognition integration
- [ ] Mobile app camera integration
- [ ] Biometric Puzzle algorithm

### Phase 3: Integration (Weeks 9-12)
- [ ] Full API integration
- [ ] Redis message queue
- [ ] Admin dashboard
- [ ] Testing suite
- [ ] Performance optimization

### Phase 4: Finalization (Weeks 13-16)
- [ ] Security audit
- [ ] Documentation completion
- [ ] Demo preparation
- [ ] Final report

---

## 🤝 Contributing

### Git Workflow

```bash
# Create feature branch
git checkout -b feature/your-feature-name

# Make changes and commit
git add .
git commit -m "feat: add your feature"

# Push and create PR
git push origin feature/your-feature-name
```

### Commit Convention

Follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `style:` - Code style changes
- `refactor:` - Code refactoring
- `test:` - Adding tests
- `chore:` - Maintenance tasks

---

## 📄 License

This project is part of the FIVUCSAS platform developed as an Engineering Project at Marmara University, Faculty of Engineering, Computer Engineering Department.

Copyright © 2025 FIVUCSAS Team. All rights reserved.

Licensed under the MIT License - see individual component LICENSE files for details.

---

## 🙏 Acknowledgments

- **Marmara University** Computer Engineering Department
- **Project Supervisor:** [Supervisor's Name]
- **Open Source Libraries:**
  - Spring Framework, PostgreSQL, Redis
  - DeepFace, MediaPipe, TensorFlow
  - Flutter, React, Electron
- **Inspiration:** Okta, Auth0, Azure AD

---

## 📞 Support & Contact

- **GitHub Issues:** [Repository Issues](https://github.com/your-org/FIVUCSAS/issues)
- **Email:** [team-email@example.com]
- **Documentation:** [Project Wiki](https://github.com/your-org/FIVUCSAS/wiki)

---

## 🔌 Backend-Frontend Integration

The FIVUCSAS platform features a complete integration layer connecting React Web App and Kotlin Multiplatform Mobile App to the Spring Boot backend API.

### Quick Start

```bash
# 1. Start backend
cd identity-core-api
export JWT_SECRET=your-dev-secret-key
./gradlew bootRun --args='--spring.profiles.active=dev'

# 2. Start web app (in new terminal)
cd web-app
pnpm install
pnpm dev

# 3. Test integration (in new terminal)
./test-integration.sh  # Linux/Mac
# or
test-integration.bat   # Windows
```

### Key Features

- **JWT Authentication**: Automatic token injection and refresh
- **CORS Configuration**: Properly configured for all origins
- **Error Handling**: Robust error handling with automatic retry
- **Mock Mode**: Toggle between real API and mock data for development

### Documentation

- **Comprehensive Guide**: [`docs/04-api/BACKEND_FRONTEND_INTEGRATION.md`](docs/04-api/BACKEND_FRONTEND_INTEGRATION.md)
- **Quick Start**: [`docs/01-getting-started/API_INTEGRATION_QUICKSTART.md`](docs/01-getting-started/API_INTEGRATION_QUICKSTART.md)
- **Integration Summary**: [`INTEGRATION_SUMMARY.md`](INTEGRATION_SUMMARY.md)

### Configuration Status

| Component | Status | Configuration |
|-----------|--------|---------------|
| Web App | ✅ Configured | `VITE_ENABLE_MOCK_API=false` |
| Mobile App | ✅ Configured | `ApiConfig.useRealApi = true` |
| Backend CORS | ✅ Configured | Allows `localhost:5173` |
| JWT Interceptor (Web) | ✅ Implemented | Auto token injection & refresh |
| JWT Interceptor (Mobile) | ✅ Implemented | Auto token injection |

---

## 🗺️ Roadmap

### MVP (Current Focus)
- [ ] Basic authentication system
- [ ] Face recognition & verification
- [ ] Liveness detection (Biometric Puzzle)
- [ ] Mobile app for enrollment
- [ ] Admin dashboard

### Future Enhancements
- [ ] Additional biometric modalities (fingerprint, voice)
- [ ] Risk-based adaptive authentication
- [ ] OAuth2/OpenID Connect provider
- [ ] Kubernetes deployment
- [ ] Advanced analytics dashboard
- [ ] API key management for developers
- [ ] Webhook system for events

---

**Built with passion for security and innovation** | Marmara University © 2025
