# FIVUCSAS - Modules Deployment & Integration Guide

**Document Purpose**: Master guide for deploying and integrating all FIVUCSAS modules
**Created**: 2025-11-17
**Status**: Active Development
**Target Audience**: DevOps, System Administrators, Lead Developers

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Module Summary](#module-summary)
3. [System Architecture](#system-architecture)
4. [Development Workflow](#development-workflow)
5. [Local Development Setup](#local-development-setup)
6. [Production Deployment](#production-deployment)
7. [Integration Points](#integration-points)
8. [Monitoring & Maintenance](#monitoring--maintenance)

---

## 🎯 Overview

### What is FIVUCSAS?

**FIVUCSAS** (Face and Identity Verification Using Cloud-based SaaS) is a comprehensive, multi-tenant biometric authentication platform.

### Module Repositories

The project is split into **5 independent repositories**:

| Repository | Purpose | Technology | Status |
|-----------|---------|-----------|--------|
| **identity-core-api** | Backend API & Auth | Spring Boot (Java) | ⚠️ 60% |
| **web-app** | Admin Dashboard | React + TypeScript | ✅ 100% UI |
| **biometric-processor** | AI/ML Service | FastAPI (Python) | ❌ 0% |
| **mobile-app** | Desktop + Mobile Apps | Kotlin Multiplatform | ⚠️ 96% Desktop |
| **docs** | Documentation | Markdown + Docusaurus | ❌ Basic |

### Why Separate Repositories?

**Benefits**:
- ✅ Independent development teams
- ✅ Separate deployment cycles
- ✅ Technology-specific best practices
- ✅ Cleaner CI/CD pipelines
- ✅ Easier to scale teams

**Challenges**:
- ⚠️ Need cross-repo coordination
- ⚠️ Integration testing more complex
- ⚠️ Version compatibility management

---

## 📊 Module Summary

### 1. identity-core-api (Backend)

**Repository**: https://github.com/Rollingcat-Software/identity-core-api

**Technology**: Spring Boot 3.2+ / Java 21
**Port**: 8080
**Database**: PostgreSQL 16

**Responsibilities**:
- User authentication (JWT)
- User CRUD operations
- Tenant management
- Audit logging
- Biometric coordination

**Current Status**: ⚠️ Basic CRUD complete, missing token refresh, tenant endpoints

**See**: `identity-core-api-MODULE_PLAN.md` for detailed implementation plan

---

### 2. web-app (Frontend Admin Dashboard)

**Repository**: https://github.com/Rollingcat-Software/web-app

**Technology**: React 18 + TypeScript + Vite
**Port**: 5173 (dev), 80/443 (prod)

**Responsibilities**:
- Admin user interface
- User management
- Tenant management
- Dashboard analytics
- Audit log viewer
- Settings

**Current Status**: ✅ 100% UI complete, ⚠️ 75% backend integration

**See**: `web-app-MODULE_PLAN.md` for detailed implementation plan

---

### 3. biometric-processor (AI/ML Service)

**Repository**: https://github.com/Rollingcat-Software/biometric-processor

**Technology**: FastAPI (Python 3.10+)
**Port**: 8000
**Database**: PostgreSQL 16 (pgvector)

**Responsibilities**:
- Face detection
- Active liveness detection (KEY INNOVATION)
- Face encoding/embedding
- Face matching (1:1 and 1:N)
- Async job processing

**Current Status**: ❌ Not started - full implementation required

**See**: `biometric-processor-MODULE_PLAN.md` for detailed implementation plan

---

### 4. mobile-app (Desktop + Mobile)

**Repository**: https://github.com/Rollingcat-Software/mobile-app

**Technology**: Kotlin Multiplatform + Compose
**Platforms**: Desktop (JVM), Android, iOS

**Responsibilities**:
- Kiosk mode (enrollment/verification)
- Admin dashboard (desktop)
- Mobile enrollment/verification
- Camera integration

**Current Status**: ⚠️ Desktop 96% (UI complete), Mobile not started

**See**: `mobile-app-MODULE_PLAN.md` for detailed implementation plan

---

### 5. docs (Documentation)

**Repository**: https://github.com/Rollingcat-Software/docs

**Technology**: Markdown + Docusaurus
**Deployment**: GitHub Pages or static hosting

**Responsibilities**:
- API documentation (OpenAPI/Swagger)
- User guides
- Developer guides
- Architecture documentation
- Deployment guides

**Current Status**: ❌ Basic README only

**See**: `docs-MODULE_PLAN.md` for detailed implementation plan

---

## 🏗️ System Architecture

### High-Level Architecture

```
┌──────────────────────────────────────────────────────────┐
│                    FIVUCSAS Platform                      │
├──────────────────────────────────────────────────────────┤
│                                                           │
│  ┌───────────────┐  ┌────────────┐  ┌────────────────┐  │
│  │   Web App     │  │ Desktop App│  │   Mobile App   │  │
│  │  (React)      │  │  (Kotlin)  │  │   (Kotlin)     │  │
│  │  Port: 5173   │  │  Kiosk Mode│  │  Android/iOS   │  │
│  └───────┬───────┘  └──────┬─────┘  └────────┬───────┘  │
│          │                 │                   │          │
│          └─────────────────┴───────────────────┘          │
│                            │                              │
│                   ┌────────▼────────┐                     │
│                   │  API Gateway    │                     │
│                   │   (NGINX)       │                     │
│                   │   Port: 80/443  │                     │
│                   └────────┬────────┘                     │
│                            │                              │
│          ┌─────────────────┴──────────────────┐          │
│          │                                     │          │
│  ┌───────▼────────────┐           ┌───────────▼──────┐   │
│  │ identity-core-api  │◄─────────►│  biometric-      │   │
│  │  (Spring Boot)     │  Webhooks │  processor       │   │
│  │  Port: 8080        │           │  (FastAPI)       │   │
│  └──────┬─────────────┘           │  Port: 8000      │   │
│         │                         └──────┬───────────┘   │
│         │                                │               │
│  ┌──────▼────────┐              ┌───────▼──────────┐    │
│  │  PostgreSQL   │              │     Redis         │    │
│  │  Port: 5432   │              │  Port: 6379       │    │
│  │  + pgvector   │              │  (Cache & Queue)  │    │
│  └───────────────┘              └───────────────────┘    │
│                                                           │
└───────────────────────────────────────────────────────────┘
```

### Component Communication

#### 1. Frontend ↔ Backend
```
web-app (React)
  ↓ HTTP REST API
identity-core-api:8080/api/v1
  ↓ JWT authentication
  ↓ JSON responses
```

#### 2. Backend ↔ Biometric Service
```
identity-core-api
  ↓ POST /biometric/enroll
biometric-processor:8000/enroll
  ↓ Returns job ID
  ↓ Processes async
  ↓ Webhook callback
identity-core-api/api/v1/biometric/callback
  ↓ Updates job status
```

#### 3. Desktop/Mobile ↔ Backend
```
mobile-app (Kotlin)
  ↓ Ktor HTTP Client
identity-core-api:8080/api/v1
  ↓ Same REST API as web-app
```

### Data Flow: Enrollment

```
1. User → mobile-app (Kiosk)
   - Enter: name, email, employee ID
   - Capture: photo with camera

2. mobile-app → identity-core-api
   POST /api/v1/users
   - Create user record

3. mobile-app → biometric-processor
   POST /enroll
   - Upload photo + user ID
   - Returns: job ID

4. biometric-processor (background)
   - Detect face
   - Assess quality
   - Perform liveness detection
   - Generate embedding
   - Store in PostgreSQL

5. biometric-processor → identity-core-api
   POST /api/v1/biometric/callback
   - Send: job status, quality, liveness

6. identity-core-api
   - Update user biometric status
   - Log audit entry

7. mobile-app (polls or WebSocket)
   GET /api/v1/biometric/enrollments/{jobId}
   - Check status
   - Display result to user
```

### Data Flow: Verification

```
1. User → mobile-app (Kiosk)
   - Enter: employee ID
   - Capture: photo

2. mobile-app → biometric-processor
   POST /verify
   - Upload photo + employee ID

3. biometric-processor (real-time)
   - Detect face
   - Generate embedding
   - Query PostgreSQL for stored embedding
   - Calculate similarity
   - Return: MATCH or NO_MATCH + confidence

4. mobile-app
   - Display result (success/failure)

5. identity-core-api (async)
   - Log verification attempt in audit logs
```

---

## 🔄 Development Workflow

### Recommended Development Order

#### Phase 1: Backend Foundation (Week 1-2)
1. Complete `identity-core-api` implementation
   - Token refresh mechanism
   - Tenant management endpoints
   - Audit logging
   - See: `identity-core-api-MODULE_PLAN.md`

#### Phase 2: Frontend Integration (Week 2-3)
2. Complete `web-app` backend integration
   - Fix npm/Vite installation
   - Connect all services to real API
   - Test end-to-end flows
   - See: `web-app-MODULE_PLAN.md`

#### Phase 3: Desktop Integration (Week 3-4)
3. Integrate `mobile-app` desktop with backend
   - Create API service layer
   - Replace mock data
   - Test kiosk mode
   - Test admin dashboard
   - See: `mobile-app-MODULE_PLAN.md`

#### Phase 4: Biometric ML (Week 5-12)
4. Implement `biometric-processor` from scratch
   - Face detection (Week 5-6)
   - Liveness detection (Week 7-8)
   - Face recognition (Week 9-10)
   - API layer & testing (Week 11-12)
   - See: `biometric-processor-MODULE_PLAN.md`

#### Phase 5: Mobile Apps (Week 13-20)
5. Implement `mobile-app` for Android and iOS
   - Android (Week 13-16)
   - iOS (Week 17-20)
   - See: `mobile-app-MODULE_PLAN.md`

#### Phase 6: Documentation (Week 21-22)
6. Create comprehensive `docs`
   - API documentation
   - User guides
   - Deployment guides
   - See: `docs-MODULE_PLAN.md`

### Git Workflow

#### Branch Strategy
```
main
├── develop
│   ├── feature/token-refresh
│   ├── feature/tenant-management
│   └── feature/audit-logging
└── release/v1.0.0
```

#### Commits & Pull Requests
```bash
# In each repository
git checkout -b feature/your-feature-name
# Make changes
git commit -m "feat: add token refresh mechanism"
git push origin feature/your-feature-name
# Create pull request to develop branch
```

#### Version Compatibility
Maintain a compatibility matrix:

| identity-core-api | web-app | biometric-processor | mobile-app |
|-------------------|---------|---------------------|-----------|
| v1.0.0            | v1.0.0  | v1.0.0              | v1.0.0    |
| v1.1.0            | v1.0.0+ | v1.0.0+             | v1.0.0+   |

---

## 💻 Local Development Setup

### Prerequisites

```bash
# Required tools
- Java 21 (for identity-core-api)
- Node.js 20+ and pnpm (for web-app)
- Python 3.10+ (for biometric-processor)
- Kotlin + IntelliJ IDEA (for mobile-app)
- Docker + Docker Compose (for databases)
- Git
```

### Step-by-Step Setup

#### Step 1: Clone All Repositories

```bash
# Create workspace directory
mkdir fivucsas-workspace
cd fivucsas-workspace

# Clone all repositories
git clone https://github.com/Rollingcat-Software/identity-core-api.git
git clone https://github.com/Rollingcat-Software/web-app.git
git clone https://github.com/Rollingcat-Software/biometric-processor.git
git clone https://github.com/Rollingcat-Software/mobile-app.git
git clone https://github.com/Rollingcat-Software/docs.git

# Directory structure:
# fivucsas-workspace/
# ├── identity-core-api/
# ├── web-app/
# ├── biometric-processor/
# ├── mobile-app/
# └── docs/
```

#### Step 2: Start Databases (Docker Compose)

Create `docker-compose.yml` in workspace root:

```yaml
version: '3.8'

services:
  postgres:
    image: pgvector/pgvector:pg16
    container_name: fivucsas-postgres
    environment:
      POSTGRES_DB: fivucsas
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    container_name: fivucsas-redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

```bash
# Start databases
docker-compose up -d

# Verify
docker ps
# Should see postgres and redis running
```

#### Step 3: Start identity-core-api

```bash
cd identity-core-api

# Option 1: Using Maven
./mvnw spring-boot:run

# Option 2: Using IntelliJ IDEA
# Open project → Run IdentityCoreApiApplication

# Wait for startup message:
# "Started IdentityCoreApiApplication in X seconds"

# Test
curl http://localhost:8080/api/v1/auth/health
# Expected: {"status":"ok"}
```

#### Step 4: Start web-app

```bash
cd ../web-app

# Install pnpm (if not already)
npm install -g pnpm

# Install dependencies
pnpm install

# Create .env file
cat > .env << EOF
VITE_API_BASE_URL=http://localhost:8080/api/v1
VITE_ENV=development
VITE_MOCK_MODE=false
EOF

# Start development server
pnpm dev

# Open browser
# http://localhost:5173
```

#### Step 5: Start biometric-processor (when ready)

```bash
cd ../biometric-processor

# Create virtual environment
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows

# Install dependencies
pip install -r requirements.txt

# Create .env file
cat > .env << EOF
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/fivucsas
REDIS_URL=redis://localhost:6379/0
APP_PORT=8000
EOF

# Start FastAPI server
uvicorn main:app --reload --port 8000

# Start Celery worker (separate terminal)
celery -A app.worker worker --loglevel=info

# Test
curl http://localhost:8000/health
# Expected: {"status":"ok","version":"1.0.0"}
```

#### Step 6: Start mobile-app (Desktop)

```bash
cd ../mobile-app

# Open in IntelliJ IDEA
# File → Open → Select mobile-app folder

# Run desktop app
./gradlew desktopApp:run

# Or in IntelliJ:
# Run → Edit Configurations → Add Gradle
# Task: desktopApp:run
```

### Verify Full Stack Running

```bash
# Check all services
curl http://localhost:8080/api/v1/auth/health  # identity-core-api
curl http://localhost:5173                     # web-app (should see HTML)
curl http://localhost:8000/health              # biometric-processor

# Check databases
docker ps | grep postgres  # PostgreSQL running
docker ps | grep redis     # Redis running

# Test integration
# 1. Open web-app: http://localhost:5173
# 2. Login with test credentials
# 3. Navigate to Users page
# 4. Create a new user
# 5. Verify user created in database:

docker exec -it fivucsas-postgres psql -U postgres -d fivucsas
fivucsas=# SELECT * FROM users;
```

---

## 🚀 Production Deployment

### Deployment Options

#### Option 1: Docker Compose (Simple)
- Good for small deployments (< 1000 users)
- Easy to set up
- Limited scalability

#### Option 2: Kubernetes (Recommended)
- Good for production (1000+ users)
- Auto-scaling
- High availability
- More complex setup

#### Option 3: Cloud Managed Services
- AWS: ECS/EKS + RDS + ElastiCache
- Azure: AKS + Azure Database + Azure Cache
- GCP: GKE + Cloud SQL + Memorystore

### Docker Compose Production Deployment

Create `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - identity-api
      - biometric-api
      - web-app

  identity-api:
    image: fivucsas/identity-core-api:1.0.0
    environment:
      SPRING_PROFILES_ACTIVE: production
      SPRING_DATASOURCE_URL: jdbc:postgresql://db:5432/fivucsas
      SPRING_DATASOURCE_USERNAME: ${DB_USER}
      SPRING_DATASOURCE_PASSWORD: ${DB_PASSWORD}
      JWT_SECRET: ${JWT_SECRET}
    depends_on:
      - db
      - redis
    deploy:
      replicas: 2
      restart_policy:
        condition: on-failure

  biometric-api:
    image: fivucsas/biometric-processor:1.0.0
    environment:
      DATABASE_URL: postgresql://${DB_USER}:${DB_PASSWORD}@db:5432/fivucsas
      REDIS_URL: redis://redis:6379/0
    depends_on:
      - db
      - redis
    deploy:
      replicas: 2

  biometric-worker:
    image: fivucsas/biometric-processor:1.0.0
    command: celery -A app.worker worker --loglevel=info
    environment:
      DATABASE_URL: postgresql://${DB_USER}:${DB_PASSWORD}@db:5432/fivucsas
      REDIS_URL: redis://redis:6379/0
    depends_on:
      - db
      - redis
    deploy:
      replicas: 3

  web-app:
    image: fivucsas/web-app:1.0.0
    environment:
      VITE_API_BASE_URL: https://api.fivucsas.com/api/v1
      VITE_ENV: production

  db:
    image: pgvector/pgvector:pg16
    environment:
      POSTGRES_DB: fivucsas
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    deploy:
      placement:
        constraints:
          - node.role == manager

  redis:
    image: redis:7-alpine
    command: redis-server --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

### Kubernetes Deployment

Create Kubernetes manifests for each service:

#### identity-core-api Deployment
```yaml
# k8s/identity-api-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: identity-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: identity-api
  template:
    metadata:
      labels:
        app: identity-api
    spec:
      containers:
      - name: identity-api
        image: fivucsas/identity-core-api:1.0.0
        ports:
        - containerPort: 8080
        env:
        - name: SPRING_DATASOURCE_URL
          valueFrom:
            secretKeyRef:
              name: db-secret
              key: url
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "1Gi"
            cpu: "1000m"
---
apiVersion: v1
kind: Service
metadata:
  name: identity-api
spec:
  selector:
    app: identity-api
  ports:
  - port: 8080
    targetPort: 8080
  type: ClusterIP
```

#### Deploy to Kubernetes
```bash
# Create namespace
kubectl create namespace fivucsas

# Create secrets
kubectl create secret generic db-secret \
  --from-literal=url=jdbc:postgresql://postgres:5432/fivucsas \
  --from-literal=username=postgres \
  --from-literal=password=yourpassword \
  -n fivucsas

# Deploy services
kubectl apply -f k8s/identity-api-deployment.yaml -n fivucsas
kubectl apply -f k8s/biometric-api-deployment.yaml -n fivucsas
kubectl apply -f k8s/web-app-deployment.yaml -n fivucsas

# Deploy Ingress
kubectl apply -f k8s/ingress.yaml -n fivucsas

# Check status
kubectl get pods -n fivucsas
kubectl get services -n fivucsas
```

---

## 🔗 Integration Points

### API Contracts

All services communicate via REST APIs. Ensure API contracts are maintained:

#### identity-core-api ↔ web-app/mobile-app
```typescript
// Shared TypeScript/Kotlin interfaces
interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: 'ADMIN' | 'USER';
  status: 'ACTIVE' | 'INACTIVE' | 'PENDING';
}

// Endpoints
POST   /api/v1/auth/login
GET    /api/v1/users
POST   /api/v1/users
PUT    /api/v1/users/{id}
DELETE /api/v1/users/{id}
```

#### identity-core-api ↔ biometric-processor
```python
# Webhook callback
POST /api/v1/biometric/callback
{
  "jobId": "uuid",
  "status": "COMPLETED",
  "quality": 88,
  "liveness": 95,
  "error": null
}
```

#### biometric-processor ↔ mobile-app
```kotlin
// Enrollment
POST /enroll
- multipart/form-data
- image: File
- userId: String

Response:
{
  "jobId": "uuid",
  "status": "PENDING"
}
```

### Environment Variables

Maintain consistent environment variables across all services:

```bash
# identity-core-api
DATABASE_URL=jdbc:postgresql://localhost:5432/fivucsas
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-secret-key
JWT_EXPIRATION=900000  # 15 minutes

# web-app
VITE_API_BASE_URL=http://localhost:8080/api/v1

# biometric-processor
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/fivucsas
REDIS_URL=redis://localhost:6379/0
IDENTITY_API_URL=http://localhost:8080/api/v1
```

---

## 📊 Monitoring & Maintenance

### Health Checks

Implement health check endpoints in all services:

```bash
# identity-core-api
GET /api/v1/auth/health
Response: {"status":"ok","database":"connected"}

# biometric-processor
GET /health
Response: {"status":"ok","version":"1.0.0","workers":3}

# web-app (static)
GET /
Response: 200 OK (HTML)
```

### Logging

Centralize logs using ELK stack or similar:

```yaml
# docker-compose.monitoring.yml
services:
  elasticsearch:
    image: elasticsearch:8.11.0
    ports:
      - "9200:9200"

  logstash:
    image: logstash:8.11.0
    volumes:
      - ./logstash.conf:/usr/share/logstash/pipeline/logstash.conf

  kibana:
    image: kibana:8.11.0
    ports:
      - "5601:5601"
```

### Metrics

Use Prometheus + Grafana:

```yaml
# docker-compose.monitoring.yml (continued)
  prometheus:
    image: prom/prometheus
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
    ports:
      - "9090:9090"

  grafana:
    image: grafana/grafana
    ports:
      - "3000:3000"
    environment:
      GF_SECURITY_ADMIN_PASSWORD: admin
```

---

## 📈 Success Criteria

### Development Complete
- ✅ All 5 repositories have code and tests
- ✅ All services run locally without errors
- ✅ Integration tests pass
- ✅ Documentation complete

### Deployment Ready
- ✅ Docker images built for all services
- ✅ Kubernetes manifests tested
- ✅ CI/CD pipelines configured
- ✅ Monitoring and logging set up

### Production Ready
- ✅ Load testing passed (1000+ concurrent users)
- ✅ Security audit passed
- ✅ 99.9% uptime SLA achieved
- ✅ Backup and disaster recovery tested

---

## 📞 Next Actions

### Immediate (This Week)
1. Review all MODULE_PLAN documents
2. Set up local development environment
3. Complete identity-core-api Phase 1 (token management)
4. Test end-to-end flow

### Short-term (Next 2 Weeks)
1. Complete web-app backend integration
2. Test admin dashboard with real data
3. Start biometric-processor implementation

### Medium-term (Next Month)
1. Complete biometric-processor MVP
2. Integrate mobile-app desktop with backend
3. Begin mobile app development (Android)

---

**Document Version**: 1.0
**Created**: 2025-11-17
**Last Updated**: 2025-11-17
**Next Review**: Weekly during active development

---

## 📚 Related Documents

- `identity-core-api-MODULE_PLAN.md` - Backend implementation plan
- `web-app-MODULE_PLAN.md` - Frontend implementation plan
- `biometric-processor-MODULE_PLAN.md` - ML/AI implementation plan
- `mobile-app-MODULE_PLAN.md` - Desktop/Mobile implementation plan
- `docs-MODULE_PLAN.md` - Documentation implementation plan
