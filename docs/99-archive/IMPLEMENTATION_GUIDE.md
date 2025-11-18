# FIVUCSAS Implementation Guide

## 🎯 Quick Start Implementation Checklist

This guide will help you implement the FIVUCSAS platform step-by-step based on all the configurations and recommendations we've set up.

---

## ✅ Phase 0: Setup & Verification (Week 1)

### Day 1-2: Environment Setup

- [ ] **Install Required Tools**
  - [ ] Docker Desktop
  - [ ] Java 21 JDK
  - [ ] Python 3.11+
  - [ ] Node.js 18+
  - [ ] Flutter 3.24+
  - [ ] PostgreSQL client (pgAdmin or DBeaver)
  - [ ] Postman or Insomnia (API testing)
  - [ ] Git

- [ ] **Verify Docker Compose**
  ```bash
  cd C:\Users\ahabg\OneDrive\Belgeler\GitHub\FIVUCSAS
  docker-compose up postgres redis
  ```
  - [ ] PostgreSQL running on port 5432
  - [ ] Redis running on port 6379
  - [ ] pgvector extension enabled

- [ ] **Test Database Connection**
  ```bash
  psql -h localhost -U postgres -d identity_core_db
  # Should connect successfully
  # Run: SELECT version();
  # Run: CREATE EXTENSION IF NOT EXISTS vector;
  ```

### Day 3-5: Initial Code Structure

- [ ] **Identity Core API**
  - [ ] Create Spring Boot project structure
  - [ ] Add dependencies (see README)
  - [ ] Configure `application.yml`
  - [ ] Test Flyway migrations run successfully
  - [ ] Verify tables created in PostgreSQL

- [ ] **Biometric Processor**
  - [ ] Create FastAPI project structure
  - [ ] Set up Python virtual environment
  - [ ] Install requirements.txt
  - [ ] Test DeepFace model download
  - [ ] Verify MediaPipe works

---

## ✅ Phase 1: Backend Foundation (Weeks 2-4)

### Week 2: Identity Core API - Authentication

**Goal: Working JWT authentication**

- [ ] **Domain Layer**
  ```
  Create entities:
  - User.java
  - Tenant.java
  - Role.java
  - Permission.java
  ```

- [ ] **Repository Layer**
  ```
  Create JPA repositories:
  - UserRepository.java
  - TenantRepository.java
  - RoleRepository.java
  ```

- [ ] **Service Layer**
  ```
  Implement services:
  - AuthenticationService.java
  - UserService.java
  - JwtService.java
  - TenantService.java
  ```

- [ ] **Controller Layer**
  ```
  Create REST controllers:
  - AuthController.java (/api/v1/auth/*)
  - UserController.java (/api/v1/users/*)
  ```

- [ ] **Security Configuration**
  ```
  - SecurityConfig.java (Spring Security)
  - JwtAuthenticationFilter.java
  - PasswordEncoder configuration
  ```

**Testing:**
```bash
# Register new user
POST http://localhost:8080/api/v1/auth/register
{
  "email": "test@test.com",
  "password": "Test@123",
  "firstName": "Test",
  "lastName": "User"
}

# Login
POST http://localhost:8080/api/v1/auth/login
{
  "email": "test@test.com",
  "password": "Test@123"
}
# Should receive JWT tokens

# Access protected endpoint
GET http://localhost:8080/api/v1/users/me
Authorization: Bearer <access_token>
```

### Week 3: Biometric Processor - Face Recognition

**Goal: Working face recognition API**

- [ ] **Core Modules**
  ```python
  app/
  ├── core/
  │   ├── face_recognition.py
  │   ├── quality_assessment.py
  │   └── vector_operations.py
  ├── services/
  │   └── deepface_service.py
  └── api/
      └── endpoints/
          └── face.py
  ```

- [ ] **Implement Face Enrollment**
  ```python
  POST /api/v1/face/enroll
  - Accept image file
  - Detect face using DeepFace
  - Generate 2622-d embedding (VGG-Face)
  - Return embedding + quality score
  ```

- [ ] **Implement Face Verification (1:1)**
  ```python
  POST /api/v1/face/verify
  - Accept user_id + image
  - Retrieve stored embedding from database
  - Calculate cosine similarity
  - Return verified: true/false + confidence
  ```

**Testing:**
```bash
# Enroll face
curl -X POST http://localhost:8001/api/v1/face/enroll \
  -F "user_id=<uuid>" \
  -F "image=@face.jpg"

# Verify face
curl -X POST http://localhost:8001/api/v1/face/verify \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "<uuid>",
    "image_base64": "<base64_image>"
  }'
```

### Week 4: Integration & Multi-Tenancy

- [ ] **Implement Row-Level Security (RLS)**
  ```java
  @Filter(name = "tenantFilter", condition = "tenant_id = :tenantId")
  ```

- [ ] **Tenant Context Provider**
  ```java
  - TenantContext.java (ThreadLocal)
  - TenantInterceptor.java (Extract from X-Tenant-ID header)
  ```

- [ ] **Redis Integration**
  ```java
  - Configure RedisTemplate
  - Implement caching for user data
  - Set up message queue channels
  ```

- [ ] **Biometric Data Storage**
  ```java
  - BiometricData entity with pgvector
  - Store embeddings from Biometric Processor
  - Implement vector similarity search
  ```

---

## ✅ Phase 2: Mobile App (Weeks 5-8)

### Week 5: Flutter Project Setup

- [ ] **Initialize Project**
  ```bash
  flutter create --org com.fivucsas mobile_app
  cd mobile_app
  flutter pub add flutter_bloc dio camera google_mlkit_face_detection
  ```

- [ ] **Project Structure**
  ```
  lib/
  ├── core/
  ├── features/
  │   ├── auth/
  │   ├── biometric/
  │   └── profile/
  └── main.dart
  ```

- [ ] **Authentication Feature**
  ```
  - LoginPage
  - RegisterPage
  - AuthBloc (state management)
  - AuthRepository (API calls)
  ```

### Week 6: Camera Integration

- [ ] **Camera Service**
  ```dart
  - Initialize camera
  - Capture frames
  - Display camera preview
  ```

- [ ] **Face Detection**
  ```dart
  - Integrate Google ML Kit
  - Detect faces in real-time
  - Draw bounding boxes
  ```

### Week 7-8: Biometric Puzzle

- [ ] **Facial Landmarks Detection**
  ```dart
  - Use MediaPipe Face Mesh
  - Calculate EAR (Eye Aspect Ratio)
  - Calculate MAR (Mouth Aspect Ratio)
  ```

- [ ] **Puzzle Logic**
  ```dart
  - Fetch puzzle from backend
  - Display instructions to user
  - Detect each action in sequence
  - Show progress indicator
  - Submit result to backend
  ```

- [ ] **Enrollment Flow**
  ```dart
  1. User registers account
  2. Completes Biometric Puzzle (liveness check)
  3. Captures final face image
  4. Sends to backend for enrollment
  5. Receives confirmation
  ```

---

## ✅ Phase 3: Web Dashboard (Weeks 9-10)

### Week 9: React Setup

- [ ] **Initialize Project**
  ```bash
  npm create vite@latest web-app -- --template react-ts
  cd web-app
  npm install @reduxjs/toolkit react-router-dom @mui/material axios
  ```

- [ ] **Core Features**
  - [ ] Login page
  - [ ] Dashboard with statistics
  - [ ] User list with DataGrid
  - [ ] User details page
  - [ ] Role management

### Week 10: Analytics & Reports

- [ ] **Dashboard Widgets**
  - [ ] Total users chart
  - [ ] Authentication attempts (line chart)
  - [ ] Success/failure rates (pie chart)
  - [ ] Recent activity table

---

## ✅ Phase 4: Testing & Documentation (Weeks 11-12)

### Week 11: Testing

- [ ] **Backend Tests**
  ```bash
  # Identity Core API
  - Unit tests for services
  - Integration tests with TestContainers
  - API endpoint tests with RestAssured

  # Biometric Processor
  - Unit tests for core functions
  - Integration tests for DeepFace
  ```

- [ ] **Frontend Tests**
  ```bash
  # Mobile App
  - Widget tests
  - Integration tests

  # Web App
  - Component tests with Jest
  - E2E tests with Cypress
  ```

### Week 12: Documentation & Demo

- [ ] **Update All READMEs**
- [ ] **Create API Documentation**
- [ ] **Write User Manual**
- [ ] **Prepare Demo Scenarios**
- [ ] **Create Demo Video**

---

## 🚀 Quick Commands Reference

### Start Everything

```bash
# Full stack
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all
docker-compose down

# Rebuild after changes
docker-compose up -d --build
```

### Database

```bash
# Connect to PostgreSQL
docker exec -it fivucsas-postgres psql -U postgres -d identity_core_db

# Run migration
cd identity-core-api
./gradlew flywayMigrate

# Reset database
./gradlew flywayClean flywayMigrate
```

### Individual Services

```bash
# Identity Core API
cd identity-core-api
./gradlew bootRun

# Biometric Processor
cd biometric-processor
uvicorn app.main:app --reload --port 8001

# Mobile App
cd mobile-app
flutter run

# Web App
cd web-app
npm run dev
```

---

## 🐛 Troubleshooting

### Common Issues

**Docker Compose fails to start:**
```bash
# Remove old volumes
docker-compose down -v
docker-compose up -d
```

**Flyway migration fails:**
```bash
# Check database connection
psql -h localhost -U postgres -d identity_core_db

# Repair Flyway
cd identity-core-api
./gradlew flywayRepair
```

**DeepFace model download fails:**
```bash
# Manual download
python -c "from deepface import DeepFace; DeepFace.build_model('VGG-Face')"
```

**Flutter build fails:**
```bash
flutter clean
flutter pub get
flutter run
```

---

## 📝 Daily Development Workflow

### Morning Routine
1. Pull latest changes: `git pull origin develop`
2. Start services: `docker-compose up -d`
3. Check logs: `docker-compose logs -f`
4. Run tests: `./run-tests.sh`

### Before Committing
1. Run linters
2. Run tests
3. Update documentation if needed
4. Create meaningful commit message

### End of Day
1. Push changes to your branch
2. Create/update PR if ready
3. Stop services: `docker-compose down`

---

## 🎓 Learning Resources

### Spring Boot
- [Official Documentation](https://docs.spring.io/spring-boot/docs/current/reference/html/)
- [Spring Security](https://docs.spring.io/spring-security/reference/index.html)

### FastAPI
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [DeepFace GitHub](https://github.com/serengil/deepface)

### Flutter
- [Flutter Documentation](https://docs.flutter.dev/)
- [BLoC Pattern](https://bloclibrary.dev/)

### PostgreSQL
- [pgvector Documentation](https://github.com/pgvector/pgvector)

---

## 🎯 Success Metrics

Track your progress:

- [ ] All services start without errors
- [ ] User can register and login
- [ ] JWT authentication works
- [ ] Face can be enrolled
- [ ] Face can be verified
- [ ] Biometric Puzzle works on mobile
- [ ] Admin can view users in dashboard
- [ ] Tests pass with >80% coverage
- [ ] Documentation is complete

---

**Good luck with your implementation!** 🚀

For questions or issues, refer to individual component READMEs or create a GitHub issue.
