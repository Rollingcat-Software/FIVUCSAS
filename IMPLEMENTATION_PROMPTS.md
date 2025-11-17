# Implementation Prompts for FIVUCSAS Repositories

**Created**: 2025-11-17
**Purpose**: One prompt per repository for new implementation sessions

---

## Priority Order

1. **identity-core-api** (Backend) - Missing endpoints
2. **web-app** (Frontend) - Complete integration testing
3. **biometric-processor** (ML/AI) - NOT STARTED - Full implementation needed
4. **mobile-app** (Desktop/Mobile) - Complete admin dashboard settings
5. **docs** (Documentation) - API documentation

---

## 1. identity-core-api (Backend API)

**Status**: Basic CRUD complete, missing advanced features
**Priority**: HIGH
**Estimated Time**: 4-6 hours

### Prompt for New Session:

```
I'm working on the FIVUCSAS identity-core-api backend (Spring Boot Java).

Current status:
- ✅ Basic endpoints exist: /auth/register, /auth/login, /users (CRUD), /statistics
- ✅ JWT authentication working
- ✅ Database models: User, Tenant, BiometricData, AuditLog
- ❌ Missing: Token refresh, logout, advanced security features

Tasks to implement:

1. Add missing authentication endpoints:
   - POST /api/v1/auth/refresh - Token refresh mechanism
   - POST /api/v1/auth/logout - Invalidate tokens
   - GET /api/v1/auth/me - Get current user info

2. Add tenant management endpoints:
   - GET /api/v1/tenants - List tenants
   - POST /api/v1/tenants - Create tenant
   - PUT /api/v1/tenants/{id} - Update tenant
   - DELETE /api/v1/tenants/{id} - Delete tenant

3. Add audit log endpoints:
   - GET /api/v1/audit-logs - List audit logs with filtering
   - GET /api/v1/audit-logs/{id} - Get specific log

4. Implement token refresh mechanism:
   - RefreshToken entity and repository
   - Token rotation on refresh
   - Refresh token expiration (7 days)

5. Add comprehensive audit logging:
   - AuditLogger service
   - Log all security events (login, logout, failed attempts)
   - Log all CRUD operations
   - Store IP address, user agent, timestamp

Repository location: identity-core-api/
Tech stack: Spring Boot 3, Java 17, H2/PostgreSQL, JWT
```

---

## 2. web-app (Frontend Admin Dashboard)

**Status**: 100% UI complete, 75% backend integration
**Priority**: HIGH
**Estimated Time**: 2-3 hours

### Prompt for New Session:

```
I'm working on the FIVUCSAS web-app frontend (React + TypeScript + Redux).

Current status:
- ✅ All UI components built and working in mock mode
- ✅ 75% backend integration complete (auth, users, dashboard services)
- ❌ Need to complete integration and test end-to-end

Tasks to implement:

1. Complete backend integration for remaining services:
   - enrollmentsService.ts - Connect to /api/v1/biometric/enrollments
   - tenantsService.ts - Connect to /api/v1/tenants (if backend ready)
   - auditLogsService.ts - Connect to /api/v1/audit-logs (if backend ready)

2. Fix npm/vite installation issue:
   - Try: npm install -g pnpm && pnpm install
   - Or: npm install -g yarn && yarn install
   - Or: Move project outside OneDrive

3. End-to-end integration testing:
   - Start backend on port 8080
   - Start frontend: pnpm dev
   - Test login flow with real credentials
   - Test user CRUD operations
   - Test dashboard statistics
   - Verify all data comes from database
   - Check error handling

4. Fix any data mapping issues between frontend and backend

5. Implement token refresh logic in authService.ts

Repository location: web-app/
Tech stack: React 18, TypeScript, Vite, Material-UI, Redux Toolkit
Backend API: http://localhost:8080/api/v1
```

---

## 3. biometric-processor (ML/AI Service)

**Status**: NOT STARTED
**Priority**: MEDIUM
**Estimated Time**: 2-3 weeks

### Prompt for New Session:

```
I'm working on the FIVUCSAS biometric-processor service - a Python microservice for face recognition and liveness detection.

This is a NEW implementation from scratch.

Requirements:

1. Project Setup:
   - Python 3.10+ with FastAPI
   - Docker containerization
   - Requirements: opencv-python, face_recognition, tensorflow, numpy, PIL

2. Face Recognition Features:
   - Face detection using dlib/MTCNN
   - Face encoding extraction
   - 1:1 face matching (verification)
   - 1:N face matching (identification)
   - Quality score calculation (lighting, angle, blur)

3. Active Liveness Detection (KEY INNOVATION):
   - Random challenge generation (blink, smile, turn left/right)
   - Real-time challenge verification
   - Anti-spoofing detection
   - Liveness score calculation

4. API Endpoints:
   - POST /enroll - Enroll new face with liveness check
   - POST /verify - Verify face against stored template
   - POST /identify - Identify person from face
   - POST /liveness - Standalone liveness check
   - GET /health - Health check

5. Integration with identity-core-api:
   - Webhook callbacks on enrollment completion
   - Store biometric templates (encrypted)
   - Redis pub/sub for async processing
   - PostgreSQL for job status tracking

6. Processing Queue:
   - Celery for background processing
   - Redis as message broker
   - Handle concurrent enrollments
   - Job status updates

Architecture:
- FastAPI for REST API
- TensorFlow/PyTorch for ML models
- Redis for caching and messaging
- PostgreSQL for persistence
- Docker for deployment

Repository location: biometric-processor/ (create new)
Tech stack: Python, FastAPI, TensorFlow, OpenCV, Redis, PostgreSQL
```

---

## 4. mobile-app (Desktop/Mobile Kotlin Multiplatform)

**Status**: 96% complete (Settings tab done Nov 17)
**Priority**: MEDIUM
**Estimated Time**: 1-2 hours

### Prompt for New Session:

```
I'm working on the FIVUCSAS mobile-app (Kotlin Multiplatform for Desktop and Mobile).

Current status:
- ✅ Kiosk Mode complete (Welcome, Enrollment, Verification screens)
- ✅ Admin Dashboard 96% complete:
  - Users tab ✅
  - Analytics tab ✅
  - Security tab ✅
  - Settings tab ✅ (completed Nov 17)
- ❌ Need to integrate with real backend API

Tasks to implement:

1. Backend Integration (similar to web-app):
   - Update services to use real API instead of mock data
   - Create ApiService.kt for HTTP client (Ktor)
   - Implement AuthService.kt for authentication
   - Implement UsersService.kt for user CRUD
   - Implement DashboardService.kt for statistics

2. Environment Configuration:
   - Create local.properties for API URL configuration
   - Add environment variable support
   - MOCK_MODE flag for development

3. State Management:
   - Use Kotlin Flow for reactive updates
   - Implement proper error handling
   - Add loading states

4. Testing:
   - Test desktop app with backend
   - Verify all CRUD operations
   - Test camera integration for biometric enrollment

Repository location: mobile-app/
Tech stack: Kotlin Multiplatform, Compose Multiplatform, Ktor, Kotlinx Serialization
Platforms: Desktop (JVM), Android, iOS (future)
```

---

## 5. docs (API Documentation)

**Status**: Basic docs exist
**Priority**: LOW
**Estimated Time**: 2-3 hours

### Prompt for New Session:

```
I'm working on the FIVUCSAS docs repository - API documentation.

Current status:
- ✅ Basic README exists
- ❌ Need comprehensive API documentation

Tasks to implement:

1. Create OpenAPI/Swagger specification:
   - Document all identity-core-api endpoints
   - Request/response schemas
   - Authentication requirements
   - Error codes and messages

2. Create API documentation site:
   - Use Docusaurus or MkDocs
   - Getting Started guide
   - Authentication guide
   - Endpoint reference
   - Code examples (curl, JavaScript, Python)

3. Architecture documentation:
   - System architecture diagram
   - Database schema (ER diagram)
   - Microservices communication flow
   - Security model explanation

4. Deployment guides:
   - Local development setup
   - Docker deployment
   - Kubernetes deployment
   - Cloud deployment (AWS/Azure/GCP)

5. User guides:
   - Admin dashboard user guide
   - Kiosk mode setup guide
   - Integration guide for developers

Repository location: docs/
Tech stack: Markdown, Docusaurus/MkDocs, Mermaid for diagrams
```

---

## Implementation Priority Recommendation

### Phase 1 (Week 1): Backend + Frontend Integration
1. **identity-core-api**: Add missing endpoints (4-6 hours)
2. **web-app**: Complete integration and testing (2-3 hours)

### Phase 2 (Week 2): Desktop App
3. **mobile-app**: Backend integration (1-2 hours)

### Phase 3 (Week 3-5): ML/AI
4. **biometric-processor**: Full implementation (2-3 weeks)

### Phase 4 (Week 6): Documentation
5. **docs**: API documentation (2-3 hours)

---

## Notes for Each Session

### Before Starting:
1. Pull latest code: `git pull origin main`
2. Initialize submodules: `git submodule update --init --recursive`
3. Read the specific prompt above
4. Check dependencies are installed

### During Development:
1. Commit frequently with clear messages
2. Test incrementally
3. Document any issues
4. Update progress in todo list

### After Completion:
1. Run full test suite
2. Update documentation
3. Create pull request
4. Update PROJECT_PLANNING_SUMMARY.md

---

## Quick Start Commands

### identity-core-api:
```bash
cd identity-core-api
mvn spring-boot:run
# Or open in IntelliJ and run IdentityCoreApiApplication
```

### web-app:
```bash
cd web-app
pnpm install  # or yarn install
pnpm dev      # or yarn dev
```

### biometric-processor:
```bash
cd biometric-processor
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows
pip install -r requirements.txt
uvicorn main:app --reload
```

### mobile-app:
```bash
cd mobile-app
./gradlew desktopRun  # For desktop app
# Or open in IntelliJ and run desktop configuration
```

---

**Last Updated**: 2025-11-17
**Total Estimated Time**: 4-5 weeks for complete implementation
**Current Progress**: ~60% overall
