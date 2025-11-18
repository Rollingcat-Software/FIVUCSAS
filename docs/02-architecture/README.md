# FIVUCSAS Architecture Documentation

System architecture, design decisions, and architectural diagrams.

## Key Documents

- **[ARCHITECTURE_ANALYSIS.md](ARCHITECTURE_ANALYSIS.md)** - ⭐ Comprehensive architecture analysis (1,339 lines)
- **[SYSTEM_DESIGN_ANALYSIS_AND_DECISION.md](SYSTEM_DESIGN_ANALYSIS_AND_DECISION.md)** - Design decisions
- **[PROJECT_DESIGN_AUDIT.md](PROJECT_DESIGN_AUDIT.md)** - Design audit report
- **[DESIGN_AUDIT_REPORT.md](DESIGN_AUDIT_REPORT.md)** - Detailed audit findings
- **[PROJECT_DESIGN_AND_STATUS_ANALYSIS.md](PROJECT_DESIGN_AND_STATUS_ANALYSIS.md)** - Design and status analysis

## Diagrams

See [diagrams/](diagrams/) folder for 35+ professional UML diagrams:
- Entity-Relationship (ER) diagrams
- Use case diagrams (end-user, admin, external systems)
- Activity diagrams (enrollment, verification, tenant management)
- State machine diagrams (user, session, verification)
- Deployment diagrams (development, Kubernetes, HA, multi-region)
- Network architecture diagrams
- Security architecture diagrams

## Architecture Overview

FIVUCSAS follows:
- **Hexagonal Architecture** (Ports and Adapters)
- **Microservices Architecture**
- **SOLID Principles**
- **Clean Architecture** with separation of concerns
- **Domain-Driven Design (DDD)**
- **MVVM Pattern** for presentation layer
- **Repository Pattern** for data access

## Technology Stack

- **Backend:** Spring Boot 3.2 (Java 21)
- **ML Service:** FastAPI (Python 3.12)
- **Mobile/Desktop:** Kotlin Multiplatform with Compose
- **Database:** H2 (dev), PostgreSQL + pgvector (prod planned)
- **Cache/Queue:** Redis 7 (planned)

## Related Documentation

- [Development Guide](../03-development/CLAUDE.md) - Implementation details
- [API Documentation](../04-api/) - API specifications
- [Testing Guide](../05-testing/) - Testing strategy

---

[← Back to Main Documentation](../README.md)
