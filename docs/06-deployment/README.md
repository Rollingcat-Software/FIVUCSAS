# Deployment Documentation

Deployment and operations guides for FIVUCSAS.

## Local Development

- **[START_ALL_SERVICES.md](START_ALL_SERVICES.md)** - How to start all services locally
- **[BACKEND_DAY_1_PLAN.md](BACKEND_DAY_1_PLAN.md)** - Backend setup plan
- **[BACKEND_NEXT_STEPS.md](BACKEND_NEXT_STEPS.md)** - Backend next steps

## Quick Start All Services

See [START_ALL_SERVICES.md](START_ALL_SERVICES.md) for detailed instructions.

### Start Backend API
```bash
cd identity-core-api
./gradlew bootRun
# Access: http://localhost:8080
```

### Start Biometric Service
```bash
cd biometric-processor
./venv/Scripts/activate
uvicorn app.main:app --reload --port 8001
# Access: http://localhost:8001
```

### Start Desktop App
```bash
cd mobile-app
./gradlew :desktopApp:run
```

## Production Deployment

⚠️ Production deployment not yet configured. Coming soon.

**Planned Production Setup:**
- PostgreSQL database (replacing H2 in-memory)
- Redis cache and message queue
- Docker containers
- Kubernetes orchestration (optional)
- NGINX reverse proxy
- Monitoring and logging

## Environment Configuration

### Development
- H2 in-memory database
- Local file storage
- Debug logging enabled
- CORS permissive

### Production (Planned)
- PostgreSQL with pgvector extension
- Redis for caching and queuing
- Structured logging
- CORS restricted to specific origins
- HTTPS only
- Environment-based configuration

---

[← Back to Main Documentation](../README.md)
