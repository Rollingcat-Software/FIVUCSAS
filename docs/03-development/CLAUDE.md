# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**FIVUCSAS** (Face and Identity Verification Using Cloud-based SaaS) is a multi-tenant biometric authentication platform developed as an Engineering Project at Marmara University's Computer Engineering Department. The system combines face recognition, liveness detection ("Biometric Puzzle"), and identity management for both physical and digital access control.

**Current Status (65% Complete):**
- ✅ Mobile/Desktop App (Kotlin Multiplatform): 95% - Production ready
- ✅ Backend API (Spring Boot + Java): 78% - Running on :8080
- ✅ Biometric Processor (FastAPI + Python): Core functionality implemented, running on :8001
- ⚠️ Integration & Testing: In progress

## Architecture Principles

This codebase strictly follows:
- **Hexagonal Architecture** (Ports and Adapters)
- **SOLID Principles**
- **Clean Architecture** with clear separation of concerns
- **MVVM Pattern** for presentation layer
- **Repository Pattern** for data access
- **DRY, KISS, YAGNI**

All new code MUST adhere to these principles.

## Repository Structure

```
FIVUCSAS/
├── identity-core-api/       # Spring Boot backend (Java 21)
├── biometric-processor/     # FastAPI ML service (Python 3.12)
├── mobile-app/              # Kotlin Multiplatform (Desktop/Android/iOS)
├── web-app/                 # React dashboard (not started)
├── desktop-app/             # Legacy - use mobile-app instead
├── practice-and-test/       # DeepFace experiments
└── docs/                    # Documentation
```

## Development Workflow

### 1. Backend API (identity-core-api)

**Technology:** Spring Boot 3.2+, Java 21, H2 Database (in-memory)

**Running the service:**
```bash
cd identity-core-api
.\gradlew.bat bootRun
# Service runs on http://localhost:8080
```

**Key endpoints:**
- `POST /api/v1/auth/register` - User registration
- `POST /api/v1/auth/login` - User login
- `GET /api/v1/users` - List all users
- `POST /api/v1/biometric/enroll/{userId}` - Enroll face
- `POST /api/v1/biometric/verify/{userId}` - Verify face

**Testing:**
```bash
.\gradlew.bat test
```

**Architecture:**
- Domain Layer: `src/main/java/com/fivucsas/identity/entity/`, `domain/`, `service/`
- Application Layer: `dto/`, `controller/`
- Infrastructure: `repository/`, `config/`, `security/`

**Important notes:**
- Currently uses H2 in-memory database (data lost on restart)
- Spring Security is enabled with dev password
- JWT authentication via `JwtService`
- Biometric service integration via `WebClient` to port 8001

### 2. Biometric Processor (biometric-processor)

**Technology:** FastAPI, Python 3.12, DeepFace, OpenCV

**Running the service:**
```bash
cd biometric-processor
.\venv\Scripts\activate
uvicorn app.main:app --reload --port 8001
# Service runs on http://localhost:8001
# API docs at http://localhost:8001/docs
```

**Key endpoints:**
- `POST /api/v1/face/enroll` - Extract face embedding (512-d vector)
- `POST /api/v1/face/verify` - Compare face embeddings
- `GET /health` - Health check

**Testing:**
```bash
pytest
```

**Architecture:**
- `app/main.py` - FastAPI application entry
- `app/services/face_recognition.py` - DeepFace integration
- `app/api/endpoints/face.py` - REST endpoints
- `app/models/schemas.py` - Pydantic models
- `app/core/config.py` - Configuration

**Important notes:**
- Uses DeepFace with VGG-Face model
- Embeddings are 512-dimensional vectors
- Cosine similarity threshold: 0.7 for verification
- Automatic temp file cleanup after processing

### 3. Mobile/Desktop App (mobile-app)

**Technology:** Kotlin Multiplatform, Compose Multiplatform, Clean Architecture

**Running desktop app:**
```bash
cd mobile-app
.\gradlew.bat :desktopApp:run
```

**Building for Android:**
```bash
.\gradlew.bat :androidApp:assembleDebug
```

**Architecture:**
```
mobile-app/
├── shared/
│   ├── src/commonMain/kotlin/
│   │   ├── domain/              # Business logic
│   │   │   ├── model/           # Domain entities
│   │   │   ├── repository/      # Repository interfaces
│   │   │   └── usecase/         # Use cases
│   │   ├── data/                # Data layer
│   │   │   ├── repository/      # Repository implementations
│   │   │   └── remote/          # API clients
│   │   └── presentation/        # UI logic
│   │       └── viewmodel/       # ViewModels
├── desktopApp/                  # Desktop-specific code
├── androidApp/                  # Android-specific code
└── iosApp/                      # iOS-specific code
```

**Important notes:**
- 90% code sharing between platforms
- Dependency Injection ready (Koin)
- MVVM pattern with ViewModels
- Two modules: Admin (user management) and Kiosk (face verification)

## Common Development Tasks

### Starting All Services

**PowerShell script:**
```powershell
# Terminal 1: Backend API
cd identity-core-api
.\gradlew.bat bootRun

# Terminal 2: Biometric Service
cd biometric-processor
.\venv\Scripts\activate
uvicorn app.main:app --reload --port 8001

# Terminal 3: Desktop App
cd mobile-app
.\gradlew.bat :desktopApp:run
```

### Testing the Complete Flow

**1. Register a user:**
```powershell
Invoke-RestMethod -Method POST -Uri "http://localhost:8080/api/v1/auth/register" `
  -ContentType "application/json" `
  -Body (@{
    email = "test@example.com"
    password = "Test123!"
    firstName = "John"
    lastName = "Doe"
    phoneNumber = "+1234567890"
    idNumber = "12345678901"
  } | ConvertTo-Json)
```

**2. Enroll face biometric:**
```powershell
$userId = "<user-id-from-registration>"
Invoke-RestMethod -Method POST -Uri "http://localhost:8080/api/v1/biometric/enroll/$userId" `
  -Form @{image = Get-Item "path\to\face.jpg"}
```

**3. Verify face:**
```powershell
Invoke-RestMethod -Method POST -Uri "http://localhost:8080/api/v1/biometric/verify/$userId" `
  -Form @{image = Get-Item "path\to\face2.jpg"}
```

### Running Tests

**Backend:**
```bash
cd identity-core-api
.\gradlew.bat test --tests "com.fivucsas.identity.*"
```

**Biometric Service:**
```bash
cd biometric-processor
pytest tests/ -v
```

**Mobile App:**
```bash
cd mobile-app
.\gradlew.bat :shared:test
```

## Key Design Patterns Used

1. **Repository Pattern** - All data access abstracted behind repositories
2. **Factory Pattern** - Object creation (services, clients)
3. **Singleton Pattern** - Service instances (FaceRecognitionService)
4. **Strategy Pattern** - Different authentication strategies
5. **Observer Pattern** - Event-driven architecture (future: Redis pub/sub)
6. **Dependency Injection** - Spring's DI in backend, Koin in mobile
7. **Builder Pattern** - Complex object construction (DTOs, requests)
8. **Adapter Pattern** - External API integrations

## Critical Conventions

### Naming Conventions

**Java/Kotlin:**
- Classes: `PascalCase` (e.g., `UserService`, `BiometricData`)
- Methods: `camelCase` (e.g., `findUserById`, `enrollBiometric`)
- Constants: `UPPER_SNAKE_CASE` (e.g., `MAX_FILE_SIZE`)
- Packages: `lowercase.separated` (e.g., `com.fivucsas.identity.service`)

**Python:**
- Classes: `PascalCase` (e.g., `FaceRecognitionService`)
- Functions: `snake_case` (e.g., `extract_embedding`)
- Constants: `UPPER_SNAKE_CASE` (e.g., `VERIFICATION_THRESHOLD`)
- Files/modules: `snake_case` (e.g., `face_recognition.py`)

### Folder Structure

**Backend:** Follow Hexagonal Architecture layers strictly
- `entity/` - Domain models
- `repository/` - Data access interfaces
- `service/` - Business logic
- `controller/` - REST endpoints
- `dto/` - Data transfer objects
- `config/` - Configuration classes

**Biometric Service:** Feature-based organization
- `core/` - Core business logic
- `services/` - Service layer
- `api/endpoints/` - API routes
- `models/` - Pydantic schemas

**Mobile App:** Clean Architecture
- `domain/` - Business logic (platform-independent)
- `data/` - Data sources and repositories
- `presentation/` - UI and ViewModels

## Environment Configuration

### Backend API (identity-core-api)

**application.properties:**
```properties
spring.datasource.url=jdbc:h2:mem:fivucsas_db
spring.jpa.hibernate.ddl-auto=update
server.port=8080
biometric.service.url=http://localhost:8001
```

### Biometric Processor

**app/core/config.py:**
```python
FACE_RECOGNITION_MODEL = "VGG-Face"
FACE_DETECTION_BACKEND = "opencv"
VERIFICATION_THRESHOLD = 0.30  # Cosine distance threshold
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
```

### Mobile App

API endpoints configured in shared module via dependency injection.

## Troubleshooting

### Backend won't start
```bash
# Check if port 8080 is in use
netstat -ano | findstr :8080
# Kill process if needed
taskkill /PID <pid> /F
# Restart
.\gradlew.bat clean bootRun
```

### Biometric service errors
```bash
# Reinstall dependencies
pip install -r requirements.txt --force-reinstall
# Clear DeepFace model cache
rm -rf ~/.deepface/weights/
# Restart service
```

### H2 Console Access
- URL: `http://localhost:8080/h2-console`
- JDBC URL: `jdbc:h2:mem:fivucsas_db`
- Username: `sa`
- Password: (leave empty)

## Security Considerations

- **Never commit** `.env` files or credentials
- JWT tokens are signed with HS512 algorithm
- Passwords are hashed with BCrypt (work factor 12)
- Biometric embeddings stored as encrypted JSON strings
- CORS is currently permissive for development - restrict in production
- Spring Security dev password is auto-generated on startup

## Integration Points

### Backend → Biometric Service
```java
// BiometricService.java
WebClient client = WebClient.builder()
    .baseUrl("http://localhost:8001")
    .build();

// Enroll
client.post()
    .uri("/api/v1/face/enroll")
    .contentType(MediaType.MULTIPART_FORM_DATA)
    .body(BodyInserters.fromMultipartData(formData))
    .retrieve()
    .bodyToMono(EnrollResponse.class);
```

### Mobile App → Backend
```kotlin
// ApiClient.kt
interface AuthApi {
    @POST("auth/register")
    suspend fun register(@Body request: RegisterRequest): AuthResponse

    @POST("auth/login")
    suspend fun login(@Body request: LoginRequest): AuthResponse
}
```

## Important Files to Review

**For understanding auth flow:**
- `identity-core-api/src/main/java/com/fivucsas/identity/service/AuthService.java`
- `identity-core-api/src/main/java/com/fivucsas/identity/security/JwtService.java`
- `identity-core-api/src/main/java/com/fivucsas/identity/controller/AuthController.java`

**For understanding biometric integration:**
- `biometric-processor/app/services/face_recognition.py`
- `biometric-processor/app/api/endpoints/face.py`
- `identity-core-api/src/main/java/com/fivucsas/identity/service/BiometricService.java`

**For understanding mobile architecture:**
- `mobile-app/shared/src/commonMain/kotlin/domain/`
- `mobile-app/shared/src/commonMain/kotlin/data/repository/`

## Database Schema

**Users table:**
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone_number VARCHAR(20),
    id_number VARCHAR(11) UNIQUE,
    status VARCHAR(20) CHECK (status IN ('ACTIVE','INACTIVE','SUSPENDED')),
    is_biometric_enrolled BOOLEAN,
    verification_count INTEGER,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

**Biometric data table:**
```sql
CREATE TABLE biometric_data (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    embedding TEXT NOT NULL,
    enrolled_at TIMESTAMP
);
```

## Next Development Priorities

Based on current project status (see PROJECT_STATUS_NOW.md):

1. **Complete biometric integration testing** - End-to-end face enrollment and verification
2. **Add comprehensive error handling** - All edge cases in biometric flow
3. **Implement production database** - Switch from H2 to PostgreSQL
4. **Add liveness detection** - Biometric Puzzle algorithm in biometric-processor
5. **Mobile app API integration** - Connect mobile app to real backend

## Documentation References

- Main README: `README.md`
- Backend details: `identity-core-api/README.md`
- Biometric service: `biometric-processor/README.md`
- Mobile app: `mobile-app/README.md`
- Current status: `PROJECT_STATUS_NOW.md`
- Running services: `RUNNING_SERVICES_CAPABILITIES.md`
- Quick start: `START_HERE.md`

## Notes for Claude Code

- Always check `PROJECT_STATUS_NOW.md` for current implementation status
- When adding features, follow existing architecture patterns strictly
- Test changes with the test scripts in root directory (`test-*.ps1`)
- Backend has Swagger docs at `http://localhost:8080/swagger-ui.html`
- Biometric service has FastAPI docs at `http://localhost:8001/docs`
- Use `RUNNING_SERVICES_CAPABILITIES.md` to understand available endpoints
