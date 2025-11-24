# FIVUCSAS - Implementation Ready Guide
**All Modules Professional Design & Implementation Roadmap**
**Status**: Ready for Implementation
**Compliance**: se-checklist.md

---

## 📋 Quick Reference

| Document | Purpose | Status |
|----------|---------|--------|
| [COMPREHENSIVE_CODE_REVIEW_SUMMARY.md](./COMPREHENSIVE_CODE_REVIEW_SUMMARY.md) | Complete analysis of all issues | ✅ Complete |
| [PROFESSIONAL_DESIGN_IDENTITY_CORE_API.md](./PROFESSIONAL_DESIGN_IDENTITY_CORE_API.md) | Detailed design for Identity API | ✅ Complete |
| **This Document** | Implementation roadmap for all modules | ✅ Current |

---

## 🎯 Implementation Priority Matrix

### Week 1: Critical Security Fixes (ALL MODULES)

#### Identity Core API - Security (2 days)
```bash
Priority: CRITICAL
Effort: 16 hours
Files: 8 files to modify, 5 new files

Tasks:
1. Move JWT secret to environment variable                    [2h]
2. Remove default admin password                              [2h]
3. Disable H2 console in production                           [2h]
4. Remove JWT token logging                                   [1h]
5. Implement rate limiting (Bucket4j)                         [6h]
6. Add password strength validation (OWASP)                   [3h]

Implementation Details: See PROFESSIONAL_DESIGN_IDENTITY_CORE_API.md § 1.1-1.5
```

#### Biometric Processor - Security (1.5 days)
```python
Priority: CRITICAL
Effort: 12 hours
Files: 4 files to modify

Tasks:
1. Fix path traversal vulnerability in local_file_storage.py [4h]
   - Add _validate_path() method
   - Check paths are within storage directory

2. Add file size validation with chunked reading            [3h]
   - MAX_FILE_SIZE = 10MB
   - Read in 8KB chunks
   - Enforce limits

3. Implement thread-safe repository                          [4h]
   - Add asyncio.Lock to InMemoryEmbeddingRepository
   - Protect all mutations with lock

4. Add image content validation (magic bytes)               [1h]
   - Use python-magic library
   - Validate JPEG/PNG only
```

**Implementation Code**:
```python
# biometric-processor/app/infrastructure/storage/local_file_storage.py

from pathlib import Path
from typing import Optional

class LocalFileStorage(IFileStorage):
    def __init__(self, storage_path: str):
        self._storage_path = Path(storage_path).resolve()
        self._storage_path.mkdir(parents=True, exist_ok=True)

    def _validate_path(self, file_path: str) -> Path:
        """Ensure path is within storage directory."""
        path = Path(file_path).resolve()

        # Check if path is relative to storage directory
        try:
            path.relative_to(self._storage_path)
        except ValueError:
            raise FileStorageError(
                operation="validation",
                file_path=file_path,
                reason="Path outside storage directory"
            )

        return path

    async def save_temp(self, file: UploadFile) -> str:
        """Save uploaded file with size validation."""
        MAX_SIZE = 10 * 1024 * 1024  # 10MB
        CHUNK_SIZE = 8192  # 8KB

        # Validate content type with magic bytes
        header = await file.read(1024)
        await file.seek(0)

        file_type = magic.from_buffer(header, mime=True)
        if file_type not in {'image/jpeg', 'image/png'}:
            raise FileStorageError(
                operation="save",
                file_path=file.filename,
                reason=f"Invalid file type: {file_type}"
            )

        # Read file in chunks with size limit
        total_size = 0
        chunks = []

        while True:
            chunk = await file.read(CHUNK_SIZE)
            if not chunk:
                break

            total_size += len(chunk)
            if total_size > MAX_SIZE:
                raise FileStorageError(
                    operation="save",
                    file_path=file.filename,
                    reason=f"File size exceeds {MAX_SIZE} bytes"
                )

            chunks.append(chunk)

        content = b''.join(chunks)

        # Save to disk
        temp_file_path = self._storage_path / f"temp_{uuid.uuid4()}_{file.filename}"
        with open(temp_file_path, "wb") as buffer:
            buffer.write(content)

        return str(temp_file_path)

    def exists(self, file_path: str) -> bool:
        """Check if file exists (path validated)."""
        try:
            path = self._validate_path(file_path)
            return path.exists()
        except FileStorageError:
            return False

# Thread-safe repository
import asyncio

class InMemoryEmbeddingRepository(IEmbeddingRepository):
    def __init__(self):
        self._embeddings: Dict[Tuple[str, Optional[str]], FaceEmbedding] = {}
        self._lock = asyncio.Lock()  # ADD LOCK

        logger.warning(
            "═══════════════════════════════════════════════════════════════"
            "\n  InMemoryEmbeddingRepository is NOT thread-safe across workers"
            "\n  Use with single worker only or upgrade to PostgreSQL"
            "\n  Lock added for single-process safety only"
            "\n═══════════════════════════════════════════════════════════════"
        )

    async def save(self, user_id: str, embedding: np.ndarray,
                   quality_score: float, tenant_id: Optional[str] = None) -> None:
        async with self._lock:  # PROTECT WITH LOCK
            key = (user_id, tenant_id)
            face_embedding = FaceEmbedding(
                user_id=user_id,
                embedding=embedding.tolist(),
                quality_score=quality_score,
                enrolled_at=datetime.now(),
                tenant_id=tenant_id,
            )
            self._embeddings[key] = face_embedding
            logger.debug(f"Saved embedding for user {user_id}")

    async def find_by_user_id(self, user_id: str,
                              tenant_id: Optional[str] = None) -> Optional[FaceEmbedding]:
        async with self._lock:  # PROTECT WITH LOCK
            key = (user_id, tenant_id)
            return self._embeddings.get(key)
```

#### Mobile App (Kotlin MP) - Security (0.5 days)
```kotlin
Priority: CRITICAL
Effort: 4 hours
Files: 3 files to modify

Tasks:
1. Remove hardcoded credentials in AuthRepositoryImpl.kt    [1h]
2. Inject CoroutineScope in ViewModels                      [2h]
3. Fix date handling with kotlinx-datetime                  [1h]
```

**Implementation Code**:
```kotlin
// shared/src/commonMain/kotlin/com/fivucsas/shared/data/repository/AuthRepositoryImpl.kt

// BEFORE (INSECURE):
private val validCredentials = mapOf(
    "admin@fivucsas.com" to "admin123",  // REMOVE THIS
    "user@fivucsas.com" to "user123",
    "test@fivucsas.com" to "test123"
)

// AFTER (SECURE):
@Singleton
class AuthRepositoryImpl(
    private val authApi: AuthApi,
    private val credentialsProvider: CredentialsProvider  // INJECT
) : AuthRepository {

    override suspend fun login(email: String, password: String): Result<AuthDto> {
        return try {
            // Always use real API in production
            val response = authApi.login(email, password)
            Result.success(response)
        } catch (e: Exception) {
            // Only fall back to mock in development if configured
            if (BuildConfig.ENABLE_MOCK_AUTH && credentialsProvider.isValid(email, password)) {
                Result.success(createMockAuthDto(email))
            } else {
                Result.failure(e)
            }
        }
    }
}

// Inject CoroutineScope in ViewModels
class AdminViewModel(
    private val getUsersUseCase: GetUsersUseCase,
    private val createUserUseCase: CreateUserUseCase,
    private val updateUserUseCase: UpdateUserUseCase,
    private val deleteUserUseCase: DeleteUserUseCase,
    private val getStatisticsUseCase: GetStatisticsUseCase,
    private val coroutineScope: CoroutineScope = CoroutineScope(Dispatchers.Main)  // INJECT
) : ViewModel() {

    // Use injected scope
    fun loadUsers() {
        coroutineScope.launch {
            // ... implementation
        }
    }

    // Override onCleared to cancel scope
    override fun onCleared() {
        coroutineScope.cancel()
        super.onCleared()
    }
}

// Fix date handling
// Add dependency to build.gradle.kts:
// implementation("org.jetbrains.kotlinx:kotlinx-datetime:0.5.0")

import kotlinx.datetime.*

fun getCurrentDate(): String {
    return Clock.System.now()
        .toLocalDateTime(TimeZone.currentSystemDefault())
        .date
        .toString()
}

fun formatTimestamp(timestamp: String): String {
    return try {
        val instant = Instant.parse(timestamp)
        instant.toLocalDateTime(TimeZone.currentSystemDefault())
            .toString()
    } catch (e: Exception) {
        timestamp
    }
}
```

#### Web App (React) - Security (2 days)
```typescript
Priority: CRITICAL
Effort: 16 hours
Files: 8 files to modify, 4 new files

Tasks:
1. Remove hardcoded admin credentials from LoginPage          [1h]
2. Implement httpOnly cookies for token storage              [8h]
3. Add CSRF protection to AxiosClient                        [4h]
4. Remove token logging in TokenService                      [1h]
5. Fix TypeScript 'any' usage - define proper DTOs           [2h]
```

**Implementation Code**:
```typescript
// src/features/auth/components/LoginPage.tsx

// BEFORE (INSECURE):
defaultValues: {
    email: 'admin@fivucsas.com',     // REMOVE
    password: 'password123',          // REMOVE
}

// AFTER (SECURE):
defaultValues: {
    email: '',
    password: '',
}

// Only show demo credentials in development
{import.meta.env.DEV && (
    <Alert severity="info">
        <Typography variant="caption">
            Demo Mode: Email: admin@fivucsas.com / Password: password123
        </Typography>
    </Alert>
)}

// ===================================================================
// src/core/services/SecureStorageService.ts

// BEFORE (INSECURE):
public setItem(key: string, value: string): void {
    const prefixedKey = this.prefix + key
    this.storage.setItem(prefixedKey, value)  // UNENCRYPTED!
}

// AFTER (SECURE - Option 1: Web Crypto API):
private async encrypt(value: string): Promise<string> {
    const encoder = new TextEncoder()
    const data = encoder.encode(value)

    // Use AES-GCM encryption
    const key = await this.getEncryptionKey()
    const iv = crypto.getRandomValues(new Uint8Array(12))

    const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        data
    )

    // Combine IV and encrypted data
    const combined = new Uint8Array(iv.length + encrypted.byteLength)
    combined.set(iv)
    combined.set(new Uint8Array(encrypted), iv.length)

    return btoa(String.fromCharCode(...combined))
}

private async decrypt(encrypted: string): Promise<string> {
    const combined = Uint8Array.from(atob(encrypted), c => c.charCodeAt(0))
    const iv = combined.slice(0, 12)
    const data = combined.slice(12)

    const key = await this.getEncryptionKey()
    const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        key,
        data
    )

    const decoder = new TextDecoder()
    return decoder.decode(decrypted)
}

public async setItem(key: string, value: string): Promise<void> {
    const prefixedKey = this.prefix + key
    const encrypted = await this.encrypt(value)
    this.storage.setItem(prefixedKey, encrypted)
}

// AFTER (SECURE - Option 2: BEST - Use httpOnly cookies):
// Backend sets cookies, frontend never sees tokens
// See backend implementation in Identity Core API design document

// ===================================================================
// src/core/api/AxiosClient.ts - Add CSRF Protection

private setupInterceptors(): void {
    // Request interceptor
    this.client.interceptors.request.use(
        (config) => {
            // Add CSRF token for state-changing operations
            if (['post', 'put', 'delete', 'patch'].includes(config.method!)) {
                const csrfToken = this.getCsrfToken()
                if (csrfToken) {
                    config.headers['X-CSRF-TOKEN'] = csrfToken
                }
            }

            return config
        }
    )
}

private getCsrfToken(): string | null {
    // Get CSRF token from meta tag (set by backend)
    const metaTag = document.querySelector('meta[name="csrf-token"]')
    if (metaTag) {
        return metaTag.getAttribute('content')
    }

    // Or from cookie
    const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/)
    return match ? match[1] : null
}

// ===================================================================
// Define proper DTOs instead of 'any'

// src/domain/models/dtos/LoginResponse.dto.ts
export interface LoginResponseDto {
    accessToken: string
    refreshToken: string
    expiresIn: number
    user: UserDto
}

export interface UserDto {
    id: number
    email: string
    firstName: string
    lastName: string
    role: string
    status: string
    tenantId: number
    createdAt: string
    updatedAt: string
    lastLoginAt?: string
    lastLoginIp?: string
}

// Update AuthRepository
async login(credentials: LoginCredentials): Promise<LoginResponseDto> {
    const response = await this.httpClient.post<LoginResponseDto>(
        '/auth/login',
        credentials
    )
    return response.data  // Now properly typed!
}
```

---

### Week 2-3: SOLID Refactoring (ALL MODULES)

Each module has specific SOLID violations detailed in the comprehensive design documents. Here's the priority order:

#### Priority 1: Split God Objects (4 days)

**Identity Core API**:
- Refactor User.java (331 lines) → UserEntity + User domain model
- Extract UserMapper, UserFactory
- Files: 6 new files, 1 major refactor
- Effort: 16 hours
- See: PROFESSIONAL_DESIGN_IDENTITY_CORE_API.md § 2.1

**Mobile App**:
- Split AdminViewModel (402 lines) → 5 smaller ViewModels
- Split KioskViewModel (350 lines) → 4 smaller ViewModels
- Files: 8 new files
- Effort: 20 hours

**Web App**:
- Refactor DashboardPage (337 lines) → Extract chart components
- Refactor SettingsPage (349 lines) → 4 section components
- Files: 10 new files
- Effort: 12 hours

#### Priority 2: Extract Duplicate Code (2 days)

**All Modules**: Create mappers and utilities to eliminate copy-paste code
- Identity API: UserResponseMapper, RequestMetadataExtractor
- Biometric: L2 normalization utility, image loading utility
- Mobile App: Error handling extension functions
- Web App: Error handling decorators

---

### Week 3-4: Design Pattern Implementation (6 days)

Each module needs specific patterns. Implementation order:

**Day 1-2: Factory Pattern** (All modules)
- Identity API: UserFactory
- Biometric: Already has factories (maintain)
- Mobile App: Builder pattern for complex objects
- Web App: Builder pattern for complex objects

**Day 3-4: Strategy Pattern** (All modules)
- Identity API: ID validation strategies
- Biometric: Already good
- Mobile App: Environment configuration strategies
- Web App: Error handling strategies

**Day 5-6: Observer Pattern** (Domain Events)
- Identity API: Implement domain events (detailed in design doc)
- Biometric: Add metrics/observability events
- Mobile App: Add event bus for cross-component communication
- Web App: Implement WebSocket observer pattern

---

## 📁 File Creation Checklist

### Identity Core API

#### Security (Week 1)
- [ ] src/main/java/com/fivucsas/identity/config/JwtSecretConfig.java
- [ ] src/main/java/com/fivucsas/identity/security/JwtSecretProvider.java
- [ ] src/main/java/com/fivucsas/identity/config/DevelopmentDataInitializer.java
- [ ] src/main/java/com/fivucsas/identity/config/DevelopmentSecurityConfig.java
- [ ] src/main/java/com/fivucsas/identity/config/ProductionSecurityConfig.java
- [ ] src/main/java/com/fivucsas/identity/config/RateLimitConfig.java
- [ ] src/main/java/com/fivucsas/identity/service/RateLimitService.java
- [ ] src/main/java/com/fivucsas/identity/config/PasswordPolicyConfig.java
- [ ] src/main/java/com/fivucsas/identity/service/PasswordValidatorService.java
- [ ] src/main/resources/db/migration/V7__add_password_change_fields.sql

#### SOLID Refactoring (Week 2-3)
- [ ] src/main/java/com/fivucsas/identity/entity/UserEntity.java (rename from User.java)
- [ ] src/main/java/com/fivucsas/identity/domain/model/user/User.java (NEW domain model)
- [ ] src/main/java/com/fivucsas/identity/domain/model/user/UserProfile.java
- [ ] src/main/java/com/fivucsas/identity/domain/model/user/BiometricStatus.java
- [ ] src/main/java/com/fivucsas/identity/domain/model/user/AccountSecurity.java
- [ ] src/main/java/com/fivucsas/identity/domain/model/user/AuditInfo.java
- [ ] src/main/java/com/fivucsas/identity/infrastructure/mapper/UserMapper.java
- [ ] src/main/java/com/fivucsas/identity/application/mapper/UserResponseMapper.java

#### Design Patterns (Week 3-4)
- [ ] src/main/java/com/fivucsas/identity/domain/factory/UserFactory.java
- [ ] src/main/java/com/fivucsas/identity/infrastructure/factory/UserFactoryImpl.java
- [ ] src/main/java/com/fivucsas/identity/domain/validation/IdNumberValidator.java
- [ ] src/main/java/com/fivucsas/identity/infrastructure/validation/TurkishIdValidator.java
- [ ] src/main/java/com/fivucsas/identity/domain/event/DomainEvent.java
- [ ] src/main/java/com/fivucsas/identity/domain/event/UserRegisteredEvent.java
- [ ] src/main/java/com/fivucsas/identity/infrastructure/listener/AuditLogEventListener.java

#### Constants & Cleanup
- [ ] src/main/java/com/fivucsas/identity/constants/SecurityConstants.java
- [ ] src/main/java/com/fivucsas/identity/constants/ValidationConstants.java
- [ ] src/main/java/com/fivucsas/identity/constants/ApiConstants.java

### Biometric Processor

#### Security (Week 1)
- [ ] Modify: app/infrastructure/storage/local_file_storage.py
- [ ] Modify: app/infrastructure/persistence/repositories/memory_embedding_repository.py
- [ ] Modify: app/api/routes/enrollment.py

#### Code Quality (Week 2)
- [ ] Create: app/constants/quality_constants.py
- [ ] Create: app/constants/liveness_constants.py
- [ ] Create: app/core/image_utils.py
- [ ] Create: app/core/math_utils.py

#### Design Patterns (Week 3)
- [ ] Create: app/application/use_cases/unit_of_work.py
- [ ] Create: app/infrastructure/monitoring/metrics.py

### Mobile App (Kotlin MP)

#### Security (Week 1)
- [ ] Modify: shared/src/commonMain/kotlin/com/fivucsas/shared/data/repository/AuthRepositoryImpl.kt
- [ ] Modify: shared/src/commonMain/kotlin/com/fivucsas/shared/presentation/viewmodel/AdminViewModel.kt
- [ ] Modify: shared/src/commonMain/kotlin/com/fivucsas/shared/data/repository/UserRepositoryImpl.kt

#### SOLID Refactoring (Week 2-3)
- [ ] Create: shared/src/commonMain/kotlin/com/fivucsas/shared/presentation/viewmodel/AdminNavigationViewModel.kt
- [ ] Create: shared/src/commonMain/kotlin/com/fivucsas/shared/presentation/viewmodel/UserManagementViewModel.kt
- [ ] Create: shared/src/commonMain/kotlin/com/fivucsas/shared/core/error/DomainError.kt
- [ ] Create: shared/src/commonMain/kotlin/com/fivucsas/shared/core/extension/ViewModelExtensions.kt

#### Design Patterns (Week 3)
- [ ] Create: shared/src/commonMain/kotlin/com/fivucsas/shared/core/event/EventBus.kt
- [ ] Create: shared/src/commonMain/kotlin/com/fivucsas/shared/core/navigation/NavigationCoordinator.kt

#### Constants
- [ ] Create: shared/src/commonMain/kotlin/com/fivucsas/shared/config/AppColors.kt
- [ ] Modify: Extract magic numbers from all UI files

### Web App (React + TypeScript)

#### Security (Week 1)
- [ ] Modify: src/features/auth/components/LoginPage.tsx
- [ ] Modify: src/core/services/SecureStorageService.ts
- [ ] Modify: src/core/api/AxiosClient.ts
- [ ] Modify: src/core/services/TokenService.ts
- [ ] Create: src/domain/models/dtos/*.dto.ts (10+ files)

#### SOLID Refactoring (Week 2)
- [ ] Create: src/features/dashboard/components/UserGrowthChart.tsx
- [ ] Create: src/features/dashboard/components/EnrollmentTrendChart.tsx
- [ ] Create: src/features/dashboard/components/AuthMethodsChart.tsx
- [ ] Create: src/pages/settings/components/ProfileSection.tsx
- [ ] Create: src/pages/settings/components/SecuritySection.tsx

#### Design Patterns (Week 3)
- [ ] Create: src/core/patterns/ErrorHandlerStrategy.ts
- [ ] Create: src/core/services/WebSocketService.ts
- [ ] Create: src/hooks/useAsyncAction.ts
- [ ] Create: src/components/common/ConfirmDialog.tsx

#### Constants
- [ ] Create: src/constants/ui.constants.ts
- [ ] Create: src/constants/api.constants.ts
- [ ] Create: src/constants/storage.constants.ts

---

## 🧪 Testing Strategy

### Unit Tests (Each Module)

**Identity Core API**:
```java
// Test security configurations
@Test
void jwtSecretShouldBeLoadedFromEnvironment() {
    assertThat(jwtSecretProvider.getSecret()).isNotNull();
    assertThat(jwtSecretProvider.getSecret().length()).isGreaterThanOrEqualTo(32);
}

@Test
void h2ConsoleShouldBeDisabledInProduction() {
    // Set prod profile
    // Verify H2 console endpoint returns 403
}

@Test
void rateLimitShouldBlockExcessiveRequests() {
    // Make 6 requests
    // 6th should return 429
}

// Test domain model
@Test
void userShouldPublishEventWhenSuspended() {
    User user = userFactory.createNewUser(...);
    user.suspend("Suspicious activity");

    assertThat(user.getDomainEvents()).hasSize(1);
    assertThat(user.getDomainEvents().get(0))
        .isInstanceOf(UserStatusChangedEvent.class);
}
```

**Biometric Processor**:
```python
# Test security
def test_path_traversal_prevented():
    storage = LocalFileStorage("/safe/path")
    with pytest.raises(FileStorageError):
        storage.exists("/etc/passwd")

def test_file_size_limit_enforced():
    large_file = create_large_file(11 * 1024 * 1024)  # 11MB
    with pytest.raises(FileStorageError):
        await storage.save_temp(large_file)

# Test thread safety
async def test_concurrent_saves_are_thread_safe():
    repo = InMemoryEmbeddingRepository()
    tasks = [repo.save(f"user_{i}", embedding, 0.9) for i in range(100)]
    await asyncio.gather(*tasks)
    # Should not have race conditions
```

**Mobile App**:
```kotlin
// Test ViewModel lifecycle
@Test
fun `viewModel should cancel scope on cleared`() {
    val viewModel = AdminViewModel(...)
    viewModel.onCleared()
    assertTrue(viewModel.coroutineScope.isActive.not())
}

// Test error handling
@Test
fun `typed errors should be handled correctly`() {
    val error = DomainError.NetworkError("Connection failed")
    val message = errorMessageProvider.getMessage(error)
    assertEquals("Network connection failed", message)
}
```

**Web App**:
```typescript
// Test security
describe('TokenService', () => {
    it('should not log token values', () => {
        const consoleSpy = jest.spyOn(console, 'log')
        tokenService.setAccessToken('secret-token')
        expect(consoleSpy).not.toHaveBeenCalledWith(expect.stringContaining('secret-token'))
    })
})

// Test error handling
describe('ErrorHandler', () => {
    it('should use strategy for error handling', () => {
        const handler = new ErrorHandler()
        handler.handle(new UnauthorizedError())
        expect(notifier.error).toHaveBeenCalledWith('Session expired')
    })
})
```

### Integration Tests

**End-to-End Critical Flows**:
1. User Registration → Email Verification → Login
2. Login → Rate Limit Exceeded → 429 Response
3. Biometric Enrollment → Path Traversal Attempt → Rejected
4. Token Refresh → CSRF Attack → Blocked

---

## 📊 Success Metrics

### Week 1 (Security)
- [ ] 0 hardcoded secrets in code
- [ ] 0 default credentials
- [ ] 0 security vulnerabilities in SonarQube scan
- [ ] Rate limiting active and tested
- [ ] All tokens encrypted or in httpOnly cookies

### Week 2-3 (SOLID)
- [ ] No classes >300 lines
- [ ] No methods >50 lines
- [ ] 0 duplicate code blocks >10 lines
- [ ] All dependencies injected via interfaces
- [ ] Code coverage >80%

### Week 4 (Polish)
- [ ] 0 magic numbers
- [ ] 0 dead code
- [ ] 0 compiler warnings
- [ ] Documentation complete
- [ ] All tests passing

---

## 🚀 Quick Start Commands

### Set Up Environment

```bash
# Identity Core API
cd identity-core-api
export JWT_SECRET=$(openssl rand -base64 32)
export APP_ADMIN_EMAIL=admin@fivucsas.local
export APP_ADMIN_PASSWORD=$(openssl rand -base64 16)
./gradlew bootRun --args='--spring.profiles.active=dev'

# Biometric Processor
cd biometric-processor
pip install python-magic
export MAX_FILE_SIZE=10485760  # 10MB
uvicorn app.main:app --reload

# Mobile App
cd mobile-app
# Add to gradle.properties:
# ENABLE_MOCK_AUTH=false
./gradlew :desktopApp:run

# Web App
cd web-app
# Add to .env:
# VITE_ENABLE_DEMO=false
npm run dev
```

### Run Tests

```bash
# Identity Core API
./gradlew test jacocoTestReport

# Biometric Processor
pytest --cov=app tests/

# Mobile App
./gradlew :shared:testDebugUnitTest

# Web App
npm test -- --coverage
```

### Security Scan

```bash
# Run SonarQube analysis
sonar-scanner \
  -Dsonar.projectKey=fivucsas \
  -Dsonar.sources=. \
  -Dsonar.host.url=http://localhost:9000

# Run OWASP dependency check
./gradlew dependencyCheckAnalyze

# Run Snyk security scan
snyk test
```

---

## 📞 Implementation Support

### Code Review Checklist

Before submitting PR, verify:
- [ ] All magic numbers extracted to constants
- [ ] No hardcoded secrets
- [ ] No 'any' types (TypeScript)
- [ ] All public methods documented
- [ ] Unit tests added
- [ ] Integration tests pass
- [ ] No security vulnerabilities
- [ ] Follows SOLID principles
- [ ] Design patterns applied correctly

### Getting Help

1. **Check Detailed Design**: See PROFESSIONAL_DESIGN_IDENTITY_CORE_API.md for Identity API
2. **Review Code Examples**: All examples in this guide are production-ready
3. **Run Tests**: Verify implementation with provided test cases
4. **Security Scan**: Always run security checks before committing

---

## 📚 Additional Resources

### Design Pattern References
- Factory Pattern: Gang of Four Design Patterns
- Strategy Pattern: Head First Design Patterns
- Observer Pattern: Domain-Driven Design by Eric Evans

### Security Resources
- OWASP Top 10: https://owasp.org/www-project-top-ten/
- JWT Best Practices: https://tools.ietf.org/html/rfc8725
- Password Policy: NIST SP 800-63B

### Architecture Resources
- Clean Architecture: Robert C. Martin
- Hexagonal Architecture: Alistair Cockburn
- Domain-Driven Design: Eric Evans

---

## ✅ Final Checklist

### Before Starting Implementation
- [x] Code review summary read and understood
- [x] Professional design documents reviewed
- [x] Development environment set up
- [x] Git branches created
- [ ] Team assigned to tasks

### During Implementation
- [ ] Follow TDD (Test-Driven Development)
- [ ] Commit frequently with clear messages
- [ ] Run tests before each commit
- [ ] Security scan on critical changes
- [ ] Code review for each PR

### After Implementation
- [ ] All tests passing
- [ ] Code coverage >80%
- [ ] Security scan clean
- [ ] Documentation updated
- [ ] Performance benchmarks met

---

**Document Version**: 1.0
**Status**: Ready for Implementation
**Last Updated**: 2025-01-24
**Estimated Total Effort**: 17-21 developer days (2-3 weeks with 2 developers)

**Next Step**: Begin Week 1 security fixes immediately!
