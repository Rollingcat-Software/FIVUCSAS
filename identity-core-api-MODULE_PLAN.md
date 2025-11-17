# Identity Core API - Module Implementation Plan

**Module Name**: identity-core-api
**Repository**: https://github.com/Rollingcat-Software/identity-core-api
**Technology**: Spring Boot 3.2+ / Java 21
**Purpose**: Core authentication and user management microservice
**Status**: ⚠️ Basic CRUD Complete, Advanced Features Missing
**Priority**: 🔴 HIGH - Required for all other modules

---

## 📋 Table of Contents

1. [Module Overview](#module-overview)
2. [Current Status](#current-status)
3. [Architecture](#architecture)
4. [Database Schema](#database-schema)
5. [API Endpoints](#api-endpoints)
6. [Implementation Tasks](#implementation-tasks)
7. [Testing Requirements](#testing-requirements)
8. [Deployment](#deployment)
9. [Integration Points](#integration-points)

---

## 🎯 Module Overview

### Purpose
The Identity Core API is the central authentication and user management service for the FIVUCSAS platform. It handles:
- User authentication (JWT-based)
- User CRUD operations
- Tenant management (multi-tenant SaaS)
- Audit logging
- Token management
- Biometric enrollment coordination

### Key Responsibilities
1. **Authentication**: Login, logout, token refresh
2. **Authorization**: Role-based access control (RBAC)
3. **User Management**: CRUD operations for users
4. **Tenant Management**: Multi-tenant isolation
5. **Audit Logging**: Security event tracking
6. **Biometric Coordination**: Interface with biometric-processor
7. **Statistics**: Dashboard metrics and KPIs

---

## 📊 Current Status

### ✅ What's Implemented (Verified)

#### Database Migrations (Flyway)
- ✅ `V1__create_tenants_table.sql` - Tenants table with capacity tracking
- ✅ `V2__create_users_table.sql` - Users with tenant relationship
- ✅ `V3__create_roles_and_permissions.sql` - RBAC system
- ✅ `V4__create_biometric_tables.sql` - Biometric enrollment tracking
- ✅ `V5__create_audit_and_session_tables.sql` - Audit logs and sessions

#### Java Components (28 files)
**Controllers** (4 files):
- ✅ `AuthController.java` - Login, register, health check
- ✅ `UserController.java` - User CRUD operations
- ✅ `BiometricController.java` - Enrollment endpoints
- ✅ `StatisticsController.java` - Dashboard statistics

**Services** (5+ files):
- ✅ `AuthService.java` - Authentication logic
- ✅ `UserService.java` - User business logic
- ✅ `BiometricService.java` - Biometric coordination
- ✅ `StatisticsService.java` - Metrics aggregation
- ✅ `JwtService.java` - JWT token generation/validation

**Models & DTOs** (10+ files):
- ✅ `User.java`, `Tenant.java`, `BiometricData.java`, `AuditLog.java`
- ✅ Request/Response DTOs for all endpoints

**Repositories** (5 files):
- ✅ `UserRepository.java`, `TenantRepository.java`
- ✅ `BiometricDataRepository.java`, `AuditLogRepository.java`

**Configuration**:
- ✅ `SecurityConfig.java` - Spring Security with JWT
- ✅ `CorsConfig.java` - CORS for frontend integration
- ✅ Database connection (H2/PostgreSQL)

### ❌ What's Missing (High Priority)

#### Missing Endpoints
- ❌ `POST /api/v1/auth/refresh` - Token refresh mechanism
- ❌ `POST /api/v1/auth/logout` - Logout and token invalidation
- ❌ `GET /api/v1/auth/me` - Get current user info
- ❌ `GET /api/v1/tenants` - List tenants
- ❌ `POST /api/v1/tenants` - Create tenant
- ❌ `PUT /api/v1/tenants/{id}` - Update tenant
- ❌ `DELETE /api/v1/tenants/{id}` - Delete tenant
- ❌ `GET /api/v1/audit-logs` - Audit log retrieval
- ❌ `GET /api/v1/audit-logs/{id}` - Get specific audit log

#### Missing Services
- ❌ `RefreshTokenService.java` - Token refresh logic
- ❌ `AuditLogger.java` - Comprehensive audit logging
- ❌ `TenantService.java` - Tenant management business logic

#### Missing Models
- ❌ `RefreshToken.java` - Refresh token entity
- ❌ `RefreshTokenRepository.java` - Refresh token persistence

#### Missing Features
- ❌ Token rotation on refresh
- ❌ Automatic audit logging on all operations
- ❌ IP address and user agent tracking
- ❌ Session management
- ❌ Rate limiting
- ❌ Password reset flow

---

## 🏗️ Architecture

### Technology Stack
```yaml
Framework: Spring Boot 3.2+
Language: Java 21
Database: PostgreSQL 16 (production) / H2 (development)
ORM: Spring Data JPA + Hibernate
Migration: Flyway
Security: Spring Security + JWT
Validation: Jakarta Validation
API Docs: SpringDoc OpenAPI
Build Tool: Maven
```

### Architecture Pattern
```
┌─────────────────────────────────────────────┐
│          Spring Boot Application            │
├─────────────────────────────────────────────┤
│                                              │
│  ┌──────────────┐      ┌─────────────────┐ │
│  │ Controllers  │─────►│   Services       │ │
│  │ (REST API)   │      │ (Business Logic) │ │
│  └──────────────┘      └─────────────────┘ │
│         │                       │           │
│         │                       ▼           │
│         │              ┌─────────────────┐  │
│         │              │  Repositories    │  │
│         │              │  (Data Access)   │  │
│         │              └─────────────────┘  │
│         │                       │           │
│         ▼                       ▼           │
│  ┌──────────────┐      ┌─────────────────┐ │
│  │   Security   │      │   Database       │ │
│  │   Filters    │      │  (PostgreSQL)    │ │
│  └──────────────┘      └─────────────────┘ │
│                                              │
└─────────────────────────────────────────────┘
```

### Layered Architecture
1. **Controller Layer**: REST endpoints, request/response handling
2. **Service Layer**: Business logic, validation, orchestration
3. **Repository Layer**: Database access via Spring Data JPA
4. **Security Layer**: JWT authentication, RBAC authorization
5. **Model Layer**: Entities and DTOs

---

## 💾 Database Schema

### Tables (Implemented)

#### 1. TENANTS
```sql
CREATE TABLE tenants (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    domain VARCHAR(255) UNIQUE NOT NULL,
    max_users INTEGER DEFAULT 100,
    status VARCHAR(50) DEFAULT 'ACTIVE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 2. USERS
```sql
CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT REFERENCES tenants(id),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    role VARCHAR(50) DEFAULT 'USER',
    status VARCHAR(50) DEFAULT 'ACTIVE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP
);
```

#### 3. BIOMETRIC_DATA
```sql
CREATE TABLE biometric_data (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id),
    template_data BYTEA,
    quality_score DECIMAL(5,2),
    liveness_score DECIMAL(5,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 4. AUDIT_LOGS
```sql
CREATE TABLE audit_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id),
    tenant_id BIGINT REFERENCES tenants(id),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(100),
    resource_id BIGINT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    details JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Indexes (Recommended)
```sql
-- Performance indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_tenant_id ON users(tenant_id);
CREATE INDEX idx_biometric_user_id ON biometric_data(user_id);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
```

### Tables (To Be Added)

#### 5. REFRESH_TOKENS
```sql
CREATE TABLE refresh_tokens (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(512) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    revoked BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_token ON refresh_tokens(token);
```

---

## 🔌 API Endpoints

### Implemented Endpoints

#### Authentication
```
POST   /api/v1/auth/register          Register new user
POST   /api/v1/auth/login             User login (returns JWT)
GET    /api/v1/auth/health            Health check
```

#### Users
```
GET    /api/v1/users                  List all users (paginated)
GET    /api/v1/users/{id}             Get user by ID
POST   /api/v1/users                  Create new user
PUT    /api/v1/users/{id}             Update user
DELETE /api/v1/users/{id}             Delete user
```

#### Statistics
```
GET    /api/v1/statistics             Get dashboard statistics
```

#### Biometric
```
POST   /api/v1/biometric/enroll       Initiate enrollment
GET    /api/v1/biometric/enrollments  List enrollments
```

### Missing Endpoints (To Implement)

#### Authentication (Priority: HIGH)
```
POST   /api/v1/auth/refresh           Refresh access token
POST   /api/v1/auth/logout            Logout (invalidate tokens)
GET    /api/v1/auth/me                Get current user info
POST   /api/v1/auth/forgot-password   Password reset request
POST   /api/v1/auth/reset-password    Reset password with token
```

#### Tenants (Priority: MEDIUM)
```
GET    /api/v1/tenants                List tenants
GET    /api/v1/tenants/{id}           Get tenant by ID
POST   /api/v1/tenants                Create tenant
PUT    /api/v1/tenants/{id}           Update tenant
DELETE /api/v1/tenants/{id}           Delete tenant
GET    /api/v1/tenants/{id}/stats     Tenant statistics
```

#### Audit Logs (Priority: MEDIUM)
```
GET    /api/v1/audit-logs             List audit logs (filtered)
GET    /api/v1/audit-logs/{id}        Get specific audit log
GET    /api/v1/audit-logs/stats       Audit statistics
```

---

## 📝 Implementation Tasks

### Phase 1: Token Management (4-6 hours)
**Priority**: 🔴 CRITICAL

#### Task 1.1: Implement Refresh Token Entity and Repository
- [ ] Create `RefreshToken.java` entity
- [ ] Create `RefreshTokenRepository.java` interface
- [ ] Create migration `V6__create_refresh_tokens_table.sql`
- [ ] Add indexes for performance

#### Task 1.2: Implement Refresh Token Service
- [ ] Create `RefreshTokenService.java`
- [ ] Method: `generateRefreshToken(User user)`
- [ ] Method: `validateRefreshToken(String token)`
- [ ] Method: `revokeRefreshToken(String token)`
- [ ] Method: `deleteExpiredTokens()` (scheduled job)

#### Task 1.3: Update AuthService and AuthController
- [ ] Update `login()` to return both access + refresh tokens
- [ ] Implement `POST /auth/refresh` endpoint
- [ ] Implement `POST /auth/logout` endpoint
- [ ] Implement `GET /auth/me` endpoint

#### Task 1.4: Token Rotation
- [ ] Implement token rotation (new refresh token on each refresh)
- [ ] Revoke old refresh token when new one is issued
- [ ] Add refresh token expiration (7 days)

**Acceptance Criteria**:
- ✅ Login returns both access token (15 min) and refresh token (7 days)
- ✅ Refresh endpoint exchanges valid refresh token for new access + refresh tokens
- ✅ Old refresh token is revoked when new one is issued
- ✅ Logout invalidates all user tokens
- ✅ Expired tokens are automatically cleaned up

---

### Phase 2: Audit Logging (3-4 hours)
**Priority**: 🟠 HIGH

#### Task 2.1: Implement AuditLogger Service
- [ ] Create `AuditLogger.java` service
- [ ] Method: `logAuthentication(userId, action, success, ipAddress, userAgent)`
- [ ] Method: `logCrudOperation(userId, action, resourceType, resourceId, details)`
- [ ] Method: `logSecurityEvent(userId, event, severity, details)`

#### Task 2.2: Integrate Audit Logging
- [ ] Add audit log calls to `AuthService` (login, logout, register)
- [ ] Add audit log calls to `UserService` (create, update, delete)
- [ ] Add audit log calls to `TenantService` (all operations)
- [ ] Add aspect-oriented logging for all API calls

#### Task 2.3: Implement Audit Log Endpoints
- [ ] Create `AuditLogController.java`
- [ ] Implement `GET /audit-logs` with filtering (action, userId, dateRange)
- [ ] Implement `GET /audit-logs/{id}`
- [ ] Implement `GET /audit-logs/stats`

**Acceptance Criteria**:
- ✅ All authentication events are logged
- ✅ All CRUD operations are logged
- ✅ Logs include IP address, user agent, timestamp
- ✅ Audit logs are queryable via API
- ✅ Audit logs cannot be deleted (append-only)

---

### Phase 3: Tenant Management (3-4 hours)
**Priority**: 🟠 HIGH

#### Task 3.1: Implement TenantService
- [ ] Create `TenantService.java`
- [ ] Method: `createTenant(CreateTenantDto)`
- [ ] Method: `updateTenant(id, UpdateTenantDto)`
- [ ] Method: `deleteTenant(id)` (soft delete)
- [ ] Method: `getTenantStats(id)` (user count, capacity, etc.)
- [ ] Validate max user capacity

#### Task 3.2: Implement Tenant Controller
- [ ] Create `TenantController.java`
- [ ] Implement all CRUD endpoints
- [ ] Add admin-only authorization
- [ ] Add validation for tenant domain uniqueness

#### Task 3.3: Default Tenant Creation
- [ ] Create `V7__insert_default_tenant.sql`
- [ ] Insert default tenant with ID=1, name="Default", domain="default"
- [ ] Update existing users to belong to default tenant

**Acceptance Criteria**:
- ✅ Tenants can be created, updated, deleted via API
- ✅ Default tenant (ID=1) always exists
- ✅ Tenant capacity limits are enforced
- ✅ Only ADMIN users can manage tenants

---

### Phase 4: Security Enhancements (2-3 hours)
**Priority**: 🟡 MEDIUM

#### Task 4.1: Rate Limiting
- [ ] Add Spring rate limiting dependencies
- [ ] Implement rate limiting on auth endpoints (5 login attempts per minute)
- [ ] Return HTTP 429 (Too Many Requests) when exceeded

#### Task 4.2: Password Reset Flow
- [ ] Create `PasswordResetToken.java` entity
- [ ] Implement `POST /auth/forgot-password` endpoint
- [ ] Implement email sending (or placeholder)
- [ ] Implement `POST /auth/reset-password` endpoint
- [ ] Add token expiration (1 hour)

#### Task 4.3: Enhanced Validation
- [ ] Add password strength validation (min 8 chars, uppercase, lowercase, number)
- [ ] Add email format validation
- [ ] Add SQL injection prevention (already handled by JPA, but verify)
- [ ] Add XSS prevention in input validation

**Acceptance Criteria**:
- ✅ Login attempts are rate limited
- ✅ Password reset flow works end-to-end
- ✅ Strong password requirements are enforced
- ✅ All inputs are validated and sanitized

---

### Phase 5: Testing & Documentation (3-4 hours)
**Priority**: 🟡 MEDIUM

#### Task 5.1: Unit Tests
- [ ] AuthService unit tests (80%+ coverage)
- [ ] UserService unit tests (80%+ coverage)
- [ ] TenantService unit tests (80%+ coverage)
- [ ] JWT token validation tests

#### Task 5.2: Integration Tests
- [ ] Auth flow integration tests (register → login → refresh → logout)
- [ ] User CRUD integration tests
- [ ] Tenant management integration tests
- [ ] Audit logging integration tests

#### Task 5.3: API Documentation
- [ ] Add SpringDoc OpenAPI annotations
- [ ] Generate Swagger UI
- [ ] Document all request/response schemas
- [ ] Add example requests and responses

**Acceptance Criteria**:
- ✅ 80%+ test coverage
- ✅ All critical paths have integration tests
- ✅ Swagger UI accessible at `/swagger-ui.html`
- ✅ All endpoints documented with examples

---

## 🧪 Testing Requirements

### Unit Tests
```java
// AuthServiceTest.java
- testRegisterUser_Success()
- testRegisterUser_DuplicateEmail_ThrowsException()
- testLogin_ValidCredentials_ReturnsToken()
- testLogin_InvalidCredentials_ThrowsException()
- testRefreshToken_ValidToken_ReturnsNewTokens()
- testRefreshToken_ExpiredToken_ThrowsException()

// UserServiceTest.java
- testCreateUser_Success()
- testUpdateUser_Success()
- testDeleteUser_Success()
- testGetUser_NotFound_ThrowsException()

// TenantServiceTest.java
- testCreateTenant_Success()
- testUpdateTenant_Success()
- testDeleteTenant_Success()
- testEnforceUserCapacity_Exceeds_ThrowsException()
```

### Integration Tests
```java
// AuthControllerIntegrationTest.java
- testFullAuthFlow() // register → login → refresh → logout

// UserControllerIntegrationTest.java
- testUserCrudFlow() // create → read → update → delete

// TenantControllerIntegrationTest.java
- testTenantManagement()
```

### Manual Testing Checklist
- [ ] Register new user via API
- [ ] Login with credentials, receive JWT
- [ ] Access protected endpoint with JWT
- [ ] Refresh token before expiration
- [ ] Logout and verify token invalidation
- [ ] Create, update, delete users
- [ ] Create, update, delete tenants
- [ ] View audit logs
- [ ] Test CORS with frontend (http://localhost:5173)

---

## 🚀 Deployment

### Environment Variables
```bash
# Database
SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5432/fivucsas
SPRING_DATASOURCE_USERNAME=postgres
SPRING_DATASOURCE_PASSWORD=your_password

# JWT
JWT_SECRET=your_secret_key_here_min_256_bits
JWT_EXPIRATION=900000          # 15 minutes in ms
JWT_REFRESH_EXPIRATION=604800000  # 7 days in ms

# Server
SERVER_PORT=8080
SPRING_PROFILES_ACTIVE=production

# CORS
CORS_ALLOWED_ORIGINS=http://localhost:5173,https://app.fivucsas.com

# H2 Console (disable in production)
SPRING_H2_CONSOLE_ENABLED=false
```

### Docker Deployment
```dockerfile
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY target/identity-core-api-*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
```

### Build Commands
```bash
# Development
./mvnw spring-boot:run

# Build JAR
./mvnw clean package -DskipTests

# Run tests
./mvnw test

# Run with specific profile
./mvnw spring-boot:run -Dspring-boot.run.profiles=production
```

---

## 🔗 Integration Points

### Frontend Integration (web-app)
```typescript
// Expected API responses
interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number; // seconds
  user: {
    id: number;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
  };
}

interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: 'ADMIN' | 'USER';
  status: 'ACTIVE' | 'INACTIVE' | 'PENDING';
  tenantId: number;
  createdAt: string;
}
```

### Biometric Processor Integration
```
POST /api/v1/biometric/enroll
→ Calls biometric-processor: POST /enroll
← Returns job ID for tracking

GET /api/v1/biometric/enrollments/{jobId}
→ Checks enrollment status
← Returns: PENDING | PROCESSING | COMPLETED | FAILED
```

### Database Backup Integration
- Automated daily backups of PostgreSQL
- Backup retention: 30 days
- Point-in-time recovery enabled

---

## 📈 Success Criteria

### Functionality
- ✅ All authentication flows work (register, login, refresh, logout)
- ✅ User CRUD operations complete
- ✅ Tenant management operational
- ✅ Audit logging captures all events
- ✅ JWT tokens work with proper expiration

### Performance
- ✅ Login response time: < 200ms (p95)
- ✅ Token refresh: < 100ms (p95)
- ✅ User CRUD: < 150ms (p95)
- ✅ Supports 1000+ concurrent users

### Security
- ✅ Password hashing with BCrypt
- ✅ JWT tokens properly signed and validated
- ✅ CORS configured correctly
- ✅ SQL injection prevention (JPA)
- ✅ XSS prevention in validation
- ✅ Rate limiting on auth endpoints

### Quality
- ✅ 80%+ test coverage
- ✅ All endpoints documented in Swagger
- ✅ No critical security vulnerabilities
- ✅ Clean code with proper error handling

---

## 📅 Implementation Timeline

| Phase | Tasks | Estimated Time | Priority |
|-------|-------|----------------|----------|
| **Phase 1** | Token Management | 4-6 hours | 🔴 CRITICAL |
| **Phase 2** | Audit Logging | 3-4 hours | 🟠 HIGH |
| **Phase 3** | Tenant Management | 3-4 hours | 🟠 HIGH |
| **Phase 4** | Security Enhancements | 2-3 hours | 🟡 MEDIUM |
| **Phase 5** | Testing & Docs | 3-4 hours | 🟡 MEDIUM |
| **Total** | | **15-21 hours** | **~3-4 days** |

---

## 📞 Next Steps

### Immediate Actions
1. Pull latest code from main branch
2. Verify all existing endpoints work
3. Run existing tests
4. Review database schema
5. Start Phase 1: Token Management

### Development Environment Setup
```bash
# Clone repository
git clone https://github.com/Rollingcat-Software/identity-core-api.git
cd identity-core-api

# Start PostgreSQL (via Docker)
docker run -d --name fivucsas-db \
  -e POSTGRES_DB=fivucsas \
  -e POSTGRES_PASSWORD=postgres \
  -p 5432:5432 \
  postgres:16

# Run application
./mvnw spring-boot:run

# Access H2 Console (dev only)
# http://localhost:8080/h2-console
# JDBC URL: jdbc:h2:mem:fivucsas_db

# Access Swagger UI (after implementing Phase 5)
# http://localhost:8080/swagger-ui.html
```

---

**Document Version**: 1.0
**Created**: 2025-11-17
**Last Updated**: 2025-11-17
**Owner**: Backend Team
**Review Date**: Weekly during implementation
