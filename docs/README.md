# FIVUCSAS Documentation

**Face and Identity Verification Using Cloud-based SaaS**

> Multi-tenant biometric authentication platform for face recognition, liveness detection, and identity management.

**Project Status:** 65% Complete | **University:** Marmara University | **Department:** Computer Engineering

---

## 🚀 Quick Start

| I want to... | Go to... |
|-------------|----------|
| **Get started quickly** | [Getting Started](01-getting-started/GETTING_STARTED.md) |
| **Run the applications** | [Running Apps](01-getting-started/RUNNING_APPS.md) |
| **Explore the API** | [Backend API](http://localhost:8080/swagger-ui.html) · [Biometric Service](http://localhost:8001/docs) |
| **Understand architecture** | [Architecture Analysis](02-architecture/ARCHITECTURE_ANALYSIS.md) |
| **Start developing** | [Developer Guide (CLAUDE.md)](03-development/CLAUDE.md) ⭐ |
| **Run tests** | [Testing Guide](05-testing/TESTING_GUIDE.md) |
| **Check project status** | [Project Status](07-status/PROJECT_STATUS.md) |

---

## 📚 Documentation Structure

### 0️⃣ [Meta Documentation](00-meta/)
**Documentation about documentation**
- [Module Design](00-meta/module-design/) - Documentation module design and analysis
- [Project Artifacts](00-meta/project-artifacts/) - PSD, proposals, original documents

### 1️⃣ [Getting Started](01-getting-started/)
**New to FIVUCSAS? Start here!**
- [GETTING_STARTED.md](01-getting-started/GETTING_STARTED.md) - Complete getting started guide
- [RUNNING_APPS.md](01-getting-started/RUNNING_APPS.md) - Running all applications

### 2️⃣ [Architecture](02-architecture/)
**System design and architectural decisions**
- [ARCHITECTURE_ANALYSIS.md](02-architecture/ARCHITECTURE_ANALYSIS.md) - Complete architecture analysis
- [SYSTEM_DESIGN_ANALYSIS_AND_DECISION.md](02-architecture/SYSTEM_DESIGN_ANALYSIS_AND_DECISION.md) - Design decisions
- [Diagrams](02-architecture/diagrams/) - 35+ professional UML/PlantUML diagrams

### 3️⃣ [Development](03-development/)
**Developer guides and implementation documentation**
- [CLAUDE.md](03-development/CLAUDE.md) - ⭐ **Main developer guide - START HERE**
- [KOTLIN_MULTIPLATFORM_GUIDE.md](03-development/KOTLIN_MULTIPLATFORM_GUIDE.md) - Mobile app development
- [IMPLEMENTATION_GUIDE.md](03-development/IMPLEMENTATION_GUIDE.md) - Implementation details
- [TECHNOLOGY_DECISIONS.md](03-development/TECHNOLOGY_DECISIONS.md) - Technology stack decisions

### 4️⃣ [API Documentation](04-api/)
**Interactive API documentation (auto-generated from code)**

#### Backend API (Spring Boot)
- **Swagger UI:** [http://localhost:8080/swagger-ui.html](http://localhost:8080/swagger-ui.html) ⭐
- **OpenAPI JSON:** [http://localhost:8080/v3/api-docs](http://localhost:8080/v3/api-docs)
- **OpenAPI YAML:** [http://localhost:8080/v3/api-docs.yaml](http://localhost:8080/v3/api-docs.yaml)

#### Biometric Service (FastAPI)
- **Interactive Docs:** [http://localhost:8001/docs](http://localhost:8001/docs) ⭐
- **ReDoc:** [http://localhost:8001/redoc](http://localhost:8001/redoc)
- **OpenAPI JSON:** [http://localhost:8001/openapi.json](http://localhost:8001/openapi.json)

#### Reference Documentation
- [SERVICES_OVERVIEW.md](04-api/SERVICES_OVERVIEW.md) - Service capabilities overview
- [BACKEND_REVIEW.md](04-api/BACKEND_REVIEW.md) - Backend code review
- [Backend SpringDoc Setup](04-api/backend-api/SPRINGDOC_SETUP.md) - SpringDoc OpenAPI implementation
- [Biometric FastAPI Setup](04-api/biometric-service/FASTAPI_SETUP.md) - FastAPI documentation setup

### 5️⃣ [Testing](05-testing/)
**Testing guides and test reports**
- [TESTING_GUIDE.md](05-testing/TESTING_GUIDE.md) - Complete testing guide (908 lines)
- [MOBILE_TESTING_GUIDE.md](05-testing/MOBILE_TESTING_GUIDE.md) - Mobile app testing
- [BACKEND_TEST_REPORT.md](05-testing/BACKEND_TEST_REPORT.md) - Backend test results

### 6️⃣ [Deployment](06-deployment/)
**Deployment and operations guides**
- [START_ALL_SERVICES.md](06-deployment/START_ALL_SERVICES.md) - Starting all services
- Local development setup guides

### 7️⃣ [Project Status](07-status/)
**Current project status and roadmaps**
- [PROJECT_STATUS.md](07-status/PROJECT_STATUS.md) - ⭐ **Authoritative project status**
- [FINAL_COMPLETION_REPORT.md](07-status/FINAL_COMPLETION_REPORT.md) - Completion summary
- [KMP_IMPLEMENTATION_STATUS.md](07-status/KMP_IMPLEMENTATION_STATUS.md) - Kotlin Multiplatform status
- [MOBILE_APP_STATUS.md](07-status/MOBILE_APP_STATUS.md) - Mobile app status

---

## 🏗️ System Architecture

```
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│   Desktop   │  │   Mobile    │  │     Web     │
│     App     │  │     App     │  │  Dashboard  │
│   (KMP)     │  │   (KMP)     │  │   (React)   │
└──────┬──────┘  └──────┬──────┘  └──────┬──────┘
       │                │                │
       └────────────────┴────────────────┘
                        │
              ┌─────────┴─────────┐
              │                   │
       ┌──────▼──────┐    ┌───────▼────────┐
       │  Identity   │    │   Biometric    │
       │  Core API   │◄───┤   Processor    │
       │ Spring Boot │    │    FastAPI     │
       └──────┬──────┘    └───────┬────────┘
              │                   │
       ┌──────▼──────┐    ┌───────▼────────┐
       │ PostgreSQL  │    │  Redis Cache   │
       │  + pgvector │    │ + Message Queue│
       └─────────────┘    └────────────────┘
```

**Full Details:** [Architecture Analysis](02-architecture/ARCHITECTURE_ANALYSIS.md)

---

## 🛠️ Technology Stack

| Component | Technology | Status | Documentation |
|-----------|-----------|--------|---------------|
| **Backend API** | Spring Boot 3.2 (Java 21) | ✅ 78% | [Swagger UI](http://localhost:8080/swagger-ui.html) |
| **ML Service** | FastAPI (Python 3.12) | ✅ 80% | [FastAPI Docs](http://localhost:8001/docs) |
| **Mobile/Desktop** | Kotlin Multiplatform | ✅ 95% | [KMP Guide](03-development/KOTLIN_MULTIPLATFORM_GUIDE.md) |
| **Database (Dev)** | H2 In-Memory | ✅ Working | [Architecture](02-architecture/ARCHITECTURE_ANALYSIS.md) |
| **Database (Prod)** | PostgreSQL + pgvector | ⏳ Planned | - |
| **Cache/Queue** | Redis 7 | ⏳ Planned | - |
| **Web Dashboard** | React 18 | ❌ Not Started | - |

---

## 📊 Project Completion Status

**Overall:** 65% Complete

```
Mobile App:      ████████████████████ 95% ✅ Production Ready
Backend API:     ███████████████░░░░░ 78% ⚠️  Minor fixes needed
Biometric:       ████████████████░░░░ 80% ✅ Core features complete
Documentation:   ██████████████████░░ 90% ✅ Comprehensive
Web Dashboard:   ░░░░░░░░░░░░░░░░░░░░  0% ❌ Not started
Deployment:      ░░░░░░░░░░░░░░░░░░░░  0% ❌ Not started
```

**Details:** [Project Status](07-status/PROJECT_STATUS.md)

---

## 🎓 Academic Information

- **Institution:** Marmara University
- **Department:** Computer Engineering
- **Course:** Engineering Project (CSE4297)
- **Project Type:** Multi-tenant Biometric SaaS Platform
- **Proposal:** [CSE4297_Project_Proposal.pdf](00-meta/project-artifacts/CSE4297_Project_Proposal.pdf)
- **Specification:** [PSD.docx](00-meta/project-artifacts/PSD.docx)

---

## 🚀 Quick Commands

### Start Backend API
```bash
cd identity-core-api
./gradlew bootRun
# Access: http://localhost:8080
# API Docs: http://localhost:8080/swagger-ui.html
```

### Start Biometric Service
```bash
cd biometric-processor
./venv/Scripts/activate
uvicorn app.main:app --reload --port 8001
# Access: http://localhost:8001
# API Docs: http://localhost:8001/docs
```

### Start Desktop App
```bash
cd mobile-app
./gradlew :desktopApp:run
```

### Run All Tests
```bash
# Backend
cd identity-core-api && ./gradlew test

# Mobile
cd mobile-app && ./gradlew :shared:test
```

---

## 📖 Key Documents

**For New Developers:**
1. [Getting Started](01-getting-started/GETTING_STARTED.md)
2. [CLAUDE.md (Developer Guide)](03-development/CLAUDE.md) ⭐
3. [Architecture Overview](02-architecture/ARCHITECTURE_ANALYSIS.md)

**For API Integration:**
1. [Backend API Docs](http://localhost:8080/swagger-ui.html)
2. [Biometric Service Docs](http://localhost:8001/docs)
3. [Services Overview](04-api/SERVICES_OVERVIEW.md)

**For Testing:**
1. [Testing Guide](05-testing/TESTING_GUIDE.md)
2. [Mobile Testing](05-testing/MOBILE_TESTING_GUIDE.md)

---

## 📞 Support & Contributing

This is a university engineering project. For development:
- Read [CLAUDE.md](03-development/CLAUDE.md) for development guidelines
- Check [Implementation Guide](03-development/IMPLEMENTATION_GUIDE.md)
- Review [Technology Decisions](03-development/TECHNOLOGY_DECISIONS.md)

---

## 📋 Documentation Design

This documentation follows professional software engineering principles:

- **DRY (Don't Repeat Yourself)** - Organized existing documentation, no duplication
- **KISS (Keep It Simple)** - Simple folder structure, easy navigation
- **YAGNI (You Aren't Gonna Need It)** - Documents what exists, not hypothetical features
- **SOLID Principles** - Separation of concerns, single responsibility
- **Automation** - API docs auto-generated from code (always accurate, zero maintenance)

See design documentation:
- [Design Analysis](00-meta/module-design/DOCS_MODULE_DESIGN_ANALYSIS.md)
- [Professional Design](00-meta/module-design/DOCS_MODULE_PROFESSIONAL_DESIGN.md)
- [Implementation Plan](00-meta/module-design/DOCS_MODULE_IMPLEMENTATION_PLAN.md)

---

**Documentation Last Updated:** 2025-11-18
**Documentation Version:** 2.1 (Refactored and Optimized)
**Project Version:** 1.0.0-SNAPSHOT
