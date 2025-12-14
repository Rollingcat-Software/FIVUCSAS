# Test Coverage Improvement Plan for FIVUCSAS

**Goal**: Achieve 80%+ test coverage across all modules

## Current Status

### 1. Identity Core API (Java/Spring Boot)
**Location**: `C:\Users\ahabg\OneDrive\Belgeler\GitHub\FIVUCSAS\identity-core-api\src\test\java`

#### Existing Tests (✓ Complete)
- ✓ Domain model tests (Email, UserId, FullName, HashedPassword, PhoneNumber, Address, IdNumber)
- ✓ Converter tests (all value object converters)
- ✓ Application service tests (AuthenticateUserService, RegisterUserService, EnrollBiometricService, etc.)
- ✓ Integration test (AuthenticationFlowIntegrationTest)

#### Missing Tests (Need to Add)

##### A. Controller Layer Tests
**Priority: HIGH** - Currently 0% coverage on controllers

1. **AuthController** Tests
```java
Location: src/test/java/com/fivucsas/identity/controller/AuthControllerTest.java
Tests needed:
- POST /api/auth/register - success (201)
- POST /api/auth/register - duplicate email (409)
- POST /api/auth/register - invalid email format (400)
- POST /api/auth/register - weak password (400)
- POST /api/auth/login - success (200)
- POST /api/auth/login - invalid credentials (401)
- POST /api/auth/login - user not found (401)
- POST /api/auth/refresh - success (200)
- POST /api/auth/refresh - invalid token (401)
- POST /api/auth/refresh - expired token (401)
- POST /api/auth/logout - success (200)
- POST /api/auth/logout - unauthorized (401)
```

2. **UserController** Tests
```java
Location: src/test/java/com/fivucsas/identity/controller/UserControllerTest.java
Tests needed:
- GET /api/users/me - success (200)
- GET /api/users/me - unauthorized (401)
- GET /api/users/{id} - success (200)
- GET /api/users/{id} - not found (404)
- GET /api/users/{id} - forbidden (403)
- PUT /api/users/{id} - success (200)
- PUT /api/users/{id} - validation error (400)
- DELETE /api/users/{id} - success (204)
- DELETE /api/users/{id} - forbidden (403)
```

3. **BiometricController** Tests
```java
Location: src/test/java/com/fivucsas/identity/controller/BiometricControllerTest.java
Tests needed:
- POST /api/biometric/enroll - success (200)
- POST /api/biometric/enroll - already enrolled (409)
- POST /api/biometric/enroll - invalid image (400)
- POST /api/biometric/verify - success (200)
- POST /api/biometric/verify - not enrolled (404)
- POST /api/biometric/verify - verification failed (401)
- POST /api/biometric/verify - liveness check failed (401)
```

4. **StatisticsController** Tests
```java
Location: src/test/java/com/fivucsas/identity/controller/StatisticsControllerTest.java
Tests needed:
- GET /api/statistics - success (200)
- GET /api/statistics - unauthorized (401)
- GET /api/statistics - forbidden (403)
```

5. **TenantController** Tests
```java
Location: src/test/java/com/fivucsas/identity/controller/TenantControllerTest.java
Tests needed:
- POST /api/tenants - success (201)
- POST /api/tenants - duplicate name (409)
- GET /api/tenants - success (200)
- GET /api/tenants/{id} - success (200)
- PUT /api/tenants/{id} - success (200)
- DELETE /api/tenants/{id} - success (204)
```

##### B. Security Layer Tests
**Priority: HIGH** - Critical security components

1. **JwtService** Tests
```java
Location: src/test/java/com/fivucsas/identity/security/JwtServiceTest.java
Tests needed:
- generateAccessToken - valid token
- generateAccessToken - includes email claim
- generateAccessToken - includes expiration
- generateRefreshToken - valid token
- validateToken - valid token returns true
- validateToken - expired token returns false
- validateToken - invalid signature returns false
- validateToken - malformed token throws exception
- extractEmail - valid token returns email
- extractEmail - invalid token throws exception
- isTokenExpired - expired token returns true
- isTokenExpired - valid token returns false
```

2. **CustomUserDetailsService** Tests
```java
Location: src/test/java/com/fivucsas/identity/security/CustomUserDetailsServiceTest.java
Tests needed:
- loadUserByUsername - user exists
- loadUserByUsername - user not found throws exception
- loadUserByUsername - returns correct authorities
```

3. **RateLimitService** Tests
```java
Location: src/test/java/com/fivucsas/identity/security/RateLimitServiceTest.java
Tests needed:
- isAllowed - first request allowed
- isAllowed - within limit allowed
- isAllowed - exceeds limit not allowed
- isAllowed - resets after window
```

##### C. Service Layer Tests (Additional Coverage)

1. **AuthService** Tests
```java
Location: src/test/java/com/fivucsas/identity/service/AuthServiceTest.java
Tests needed:
- login - success
- login - invalid credentials
- login - user not found
- register - success
- register - duplicate email
- refreshToken - success
- refreshToken - invalid token
- logout - success
```

2. **BiometricService** Tests
```java
Location: src/test/java/com/fivucsas/identity/service/BiometricServiceTest.java
Tests needed:
- enrollBiometric - success
- enrollBiometric - already enrolled
- enrollBiometric - API call failure
- verifyBiometric - success
- verifyBiometric - not enrolled
- verifyBiometric - verification failed
- verifyBiometric - liveness check failed
```

3. **UserService** Tests
```java
Location: src/test/java/com/fivucsas/identity/service/UserServiceTest.java
Tests needed:
- createUser - success
- createUser - duplicate email
- getUserById - success
- getUserById - not found
- getUserByEmail - success
- getUserByEmail - not found
- updateUser - success
- updateUser - not found
- deleteUser - success
- deleteUser - not found
```

4. **RefreshTokenService** Tests (Additional)
```java
Location: src/test/java/com/fivucsas/identity/service/RefreshTokenServiceTest.java
Tests needed:
- createRefreshToken - success
- createRefreshToken - revokes old tokens
- verifyExpiration - valid token
- verifyExpiration - expired token throws exception
- verifyExpiration - revoked token throws exception
- findByToken - success
- findByToken - not found throws exception
- revokeToken - success
- revokeAllUserTokens - success
- rotateRefreshToken - success
- deleteExpiredTokens - success
```

5. **StatisticsService** Tests
```java
Location: src/test/java/com/fivucsas/identity/service/StatisticsServiceTest.java
Tests needed:
- getStatistics - success
- getStatistics - returns correct counts
```

##### D. Infrastructure Layer Tests

1. **Multitenancy Tests**
```java
Location: src/test/java/com/fivucsas/identity/infrastructure/multitenancy/TenantHibernateAspectTest.java
Tests needed:
- enableTenantFilter - enables filter when tenant exists
- enableTenantFilter - skips when no tenant context
- enableTenantFilter - doesn't enable if already enabled
```

##### E. Configuration Tests

1. **SecurityConfig** Tests
```java
Location: src/test/java/com/fivucsas/identity/config/SecurityConfigTest.java
Tests needed:
- public endpoints accessible without auth
- protected endpoints require auth
- JWT filter configured correctly
```

### 2. Biometric Processor (Python/FastAPI)
**Location**: `C:\Users\ahabg\OneDrive\Belgeler\GitHub\FIVUCSAS\biometric-processor\tests`

#### Existing Tests (✓ Complete)
- ✓ Domain entities tests
- ✓ Domain exceptions tests
- ✓ Use cases tests (basic)
- ✓ Infrastructure tests (factories, quality, similarity, liveness)
- ✓ Integration tests (API routes)
- ✓ E2E workflow tests

#### Missing Tests (Need to Add)

##### A. API Route Tests (Additional Coverage)
**Priority: HIGH**

1. **Enrollment Routes** Tests
```python
Location: tests/integration/test_enrollment_routes.py
Tests needed:
- POST /enroll - success (200)
- POST /enroll - invalid image format (400)
- POST /enroll - no face detected (400)
- POST /enroll - multiple faces detected (400)
- POST /enroll - poor quality image (400)
- POST /enroll - liveness check failed (400)
- POST /enroll - duplicate user (409)
```

2. **Verification Routes** Tests
```python
Location: tests/integration/test_verification_routes.py
Tests needed:
- POST /verify - success match (200)
- POST /verify - no match (200 with match=false)
- POST /verify - user not enrolled (404)
- POST /verify - invalid image (400)
- POST /verify - liveness check failed (400)
```

3. **Liveness Routes** Tests
```python
Location: tests/integration/test_liveness_routes.py
Tests needed:
- POST /liveness - real face (200)
- POST /liveness - fake face detected (200 with is_live=false)
- POST /liveness - invalid image (400)
- POST /liveness - no face detected (400)
```

4. **Search Routes** Tests
```python
Location: tests/integration/test_search_routes.py
Tests needed:
- POST /search - found matches (200)
- POST /search - no matches (200 with empty results)
- POST /search - invalid image (400)
- POST /search - invalid threshold (400)
```

5. **Batch Processing Routes** Tests
```python
Location: tests/integration/test_batch_routes.py
Tests needed:
- POST /batch/enroll - success (200)
- POST /batch/enroll - partial success (207)
- POST /batch/verify - success (200)
- POST /batch/verify - mixed results (200)
```

##### B. Domain Layer Tests (Additional)

1. **Face Detection** Tests
```python
Location: tests/unit/domain/test_face_detection.py
Tests needed:
- FaceDetection creation with valid data
- FaceDetection validation rules
- FaceDetection quality thresholds
- FaceDetection bounding box calculations
```

2. **Face Embedding** Tests
```python
Location: tests/unit/domain/test_face_embedding.py
Tests needed:
- FaceEmbedding creation
- FaceEmbedding vector validation
- FaceEmbedding similarity calculation
- FaceEmbedding normalization
```

3. **Liveness Result** Tests
```python
Location: tests/unit/domain/test_liveness_result.py
Tests needed:
- LivenessResult creation
- LivenessResult score validation
- LivenessResult is_live determination
```

4. **Quality Assessment** Tests
```python
Location: tests/unit/domain/test_quality_assessment.py
Tests needed:
- QualityAssessment creation
- QualityAssessment score validation
- QualityAssessment passes_threshold
```

##### C. Use Case Tests (Complete Coverage)

1. **Enroll Face Use Case** Tests
```python
Location: tests/unit/application/test_enroll_face.py
Tests needed:
- enroll_face - success
- enroll_face - no face detected
- enroll_face - multiple faces detected
- enroll_face - poor quality
- enroll_face - liveness check failed
- enroll_face - duplicate user
- enroll_face - storage error
```

2. **Verify Face Use Case** Tests
```python
Location: tests/unit/application/test_verify_face.py
Tests needed:
- verify_face - match found
- verify_face - no match
- verify_face - user not enrolled
- verify_face - liveness check failed
- verify_face - poor quality
- verify_face - threshold validation
```

3. **Check Liveness Use Case** Tests
```python
Location: tests/unit/application/test_check_liveness.py
Tests needed:
- check_liveness - real face
- check_liveness - fake face
- check_liveness - no face detected
- check_liveness - texture analysis
- check_liveness - depth analysis
```

4. **Search Face Use Case** Tests
```python
Location: tests/unit/application/test_search_face.py
Tests needed:
- search_face - matches found
- search_face - no matches
- search_face - top_k limitation
- search_face - threshold filtering
```

##### D. Infrastructure Tests (Additional)

1. **DeepFace Detector** Tests
```python
Location: tests/unit/infrastructure/test_deepface_detector.py
Tests needed:
- detect - single face
- detect - multiple faces
- detect - no face
- detect - invalid image
- detect - different backends (retinaface, mtcnn)
```

2. **DeepFace Extractor** Tests
```python
Location: tests/unit/infrastructure/test_deepface_extractor.py
Tests needed:
- extract - success
- extract - invalid image
- extract - different models (VGG-Face, Facenet, ArcFace)
```

3. **PGVector Repository** Tests
```python
Location: tests/unit/infrastructure/test_pgvector_repository.py
Tests needed:
- store_embedding - success
- find_by_user_id - success
- find_by_user_id - not found
- search_similar - matches found
- search_similar - no matches
- delete_by_user_id - success
```

4. **Enhanced Liveness Detector** Tests
```python
Location: tests/unit/infrastructure/test_enhanced_liveness_detector.py
Tests needed:
- detect_liveness - real face
- detect_liveness - fake face
- detect_liveness - texture analysis
- detect_liveness - frequency analysis
- detect_liveness - edge analysis
```

##### E. Middleware Tests

1. **Error Handler** Tests
```python
Location: tests/unit/api/test_error_handler.py
Tests needed:
- handle_face_errors
- handle_liveness_errors
- handle_repository_errors
- handle_validation_errors
- handle_generic_errors
```

### 3. Mobile App Shared Module (Kotlin Multiplatform)
**Location**: `C:\Users\ahabg\OneDrive\Belgeler\GitHub\FIVUCSAS\mobile-app\shared\src\commonTest\kotlin`

#### Existing Tests (✓ Complete)
- ✓ Admin ViewModel tests
- ✓ Kiosk ViewModel tests
- ✓ User repository tests
- ✓ Admin use cases tests (GetStatistics, SearchUsers, GetUsers)
- ✓ Test mocks and test data

#### Missing Tests (Need to Add)

##### A. Presentation Layer Tests (ViewModels)
**Priority: HIGH**

1. **LoginViewModel** Tests
```kotlin
Location: shared/src/commonTest/kotlin/com/fivucsas/shared/presentation/viewmodel/LoginViewModelTest.kt
Tests needed:
- login - success emits Success state
- login - invalid credentials emits Error state
- login - network error emits Error state
- login - loading state emitted during call
- updateEmail - updates state
- updatePassword - updates state
- clearError - clears error state
```

2. **RegisterViewModel** Tests
```kotlin
Location: shared/src/commonTest/kotlin/com/fivucsas/shared/presentation/viewmodel/RegisterViewModelTest.kt
Tests needed:
- register - success emits Success state
- register - duplicate email emits Error state
- register - validation error emits Error state
- register - network error emits Error state
- validateInputs - valid inputs
- validateInputs - invalid email
- validateInputs - weak password
- validateInputs - name validation
```

3. **BiometricViewModel** Tests
```kotlin
Location: shared/src/commonTest/kotlin/com/fivucsas/shared/presentation/viewmodel/BiometricViewModelTest.kt
Tests needed:
- enrollBiometric - success
- enrollBiometric - already enrolled error
- enrollBiometric - no face detected error
- enrollBiometric - poor quality error
- verifyBiometric - success match
- verifyBiometric - no match
- verifyBiometric - not enrolled error
- verifyBiometric - liveness check failed
- checkLiveness - real face
- checkLiveness - fake face detected
```

4. **UserProfileViewModel** Tests
```kotlin
Location: shared/src/commonTest/kotlin/com/fivucsas/shared/presentation/viewmodel/UserProfileViewModelTest.kt
Tests needed:
- loadUserProfile - success
- loadUserProfile - user not found
- updateProfile - success
- updateProfile - validation error
- updateProfilePicture - success
- logout - clears user data
```

##### B. Domain Layer Tests (Use Cases)

1. **LoginUseCase** Tests
```kotlin
Location: shared/src/commonTest/kotlin/com/fivucsas/shared/domain/usecase/auth/LoginUseCaseTest.kt
Tests needed:
- execute - success returns tokens
- execute - invalid credentials throws exception
- execute - network error throws exception
- execute - validates email format
- execute - validates password not empty
```

2. **RegisterUseCase** Tests
```kotlin
Location: shared/src/commonTest/kotlin/com/fivucsas/shared/domain/usecase/auth/RegisterUseCaseTest.kt
Tests needed:
- execute - success returns user
- execute - duplicate email throws exception
- execute - validates all fields
- execute - password strength validation
- execute - network error throws exception
```

3. **EnrollBiometricUseCase** Tests
```kotlin
Location: shared/src/commonTest/kotlin/com/fivucsas/shared/domain/usecase/biometric/EnrollBiometricUseCaseTest.kt
Tests needed:
- execute - success enrolls biometric
- execute - already enrolled throws exception
- execute - no face detected throws exception
- execute - poor quality throws exception
- execute - validates image data
```

4. **VerifyBiometricUseCase** Tests
```kotlin
Location: shared/src/commonTest/kotlin/com/fivucsas/shared/domain/usecase/biometric/VerifyBiometricUseCaseTest.kt
Tests needed:
- execute - success match returns true
- execute - no match returns false
- execute - not enrolled throws exception
- execute - liveness check failed throws exception
- execute - validates image data
```

5. **CheckLivenessUseCase** Tests
```kotlin
Location: shared/src/commonTest/kotlin/com/fivucsas/shared/domain/usecase/biometric/CheckLivenessUseCaseTest.kt
Tests needed:
- execute - real face returns true
- execute - fake face returns false
- execute - no face throws exception
- execute - validates image data
```

6. **GetUserProfileUseCase** Tests
```kotlin
Location: shared/src/commonTest/kotlin/com/fivucsas/shared/domain/usecase/user/GetUserProfileUseCaseTest.kt
Tests needed:
- execute - success returns user
- execute - user not found throws exception
- execute - unauthorized throws exception
```

7. **UpdateUserProfileUseCase** Tests
```kotlin
Location: shared/src/commonTest/kotlin/com/fivucsas/shared/domain/usecase/user/UpdateUserProfileUseCaseTest.kt
Tests needed:
- execute - success updates user
- execute - validation error throws exception
- execute - unauthorized throws exception
```

##### C. Data Layer Tests (Repositories)

1. **BiometricRepositoryImpl** Tests
```kotlin
Location: shared/src/commonTest/kotlin/com/fivucsas/shared/data/repository/BiometricRepositoryImplTest.kt
Tests needed:
- enrollBiometric - success
- enrollBiometric - API error
- verifyBiometric - success match
- verifyBiometric - no match
- verifyBiometric - API error
- checkLiveness - real face
- checkLiveness - fake face
- checkLiveness - API error
```

2. **AuthRepositoryImpl** Tests
```kotlin
Location: shared/src/commonTest/kotlin/com/fivucsas/shared/data/repository/AuthRepositoryImplTest.kt
Tests needed:
- login - success
- login - invalid credentials
- login - network error
- register - success
- register - duplicate email
- refreshToken - success
- refreshToken - invalid token
- logout - success
```

##### D. Network Layer Tests

1. **ApiClient** Tests
```kotlin
Location: shared/src/commonTest/kotlin/com/fivucsas/shared/data/remote/ApiClientTest.kt
Tests needed:
- makeRequest - success
- makeRequest - 400 error
- makeRequest - 401 error
- makeRequest - 500 error
- makeRequest - network timeout
- makeRequest - includes auth header
```

2. **TokenManager** Tests
```kotlin
Location: shared/src/commonTest/kotlin/com/fivucsas/shared/data/local/TokenManagerTest.kt
Tests needed:
- saveTokens - success
- getAccessToken - returns saved token
- getRefreshToken - returns saved token
- clearTokens - clears all tokens
- isTokenExpired - expired token
- isTokenExpired - valid token
```

##### E. Model Tests

1. **User Model** Tests
```kotlin
Location: shared/src/commonTest/kotlin/com/fivucsas/shared/domain/model/UserTest.kt
Tests needed:
- User creation with valid data
- User validation rules
- User toDto conversion
- User equality and hashCode
```

2. **BiometricData Model** Tests
```kotlin
Location: shared/src/commonTest/kotlin/com/fivucsas/shared/domain/model/BiometricDataTest.kt
Tests needed:
- BiometricData creation
- BiometricData validation
- BiometricData image encoding/decoding
```

## Test Implementation Guidelines

### Java Tests (Spring Boot)
```java
@SpringBootTest
@AutoConfigureMockMvc
class ControllerTest {
    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private SomeService service;

    @Test
    void testEndpoint_Success() {
        // Arrange
        when(service.method()).thenReturn(expectedResult);

        // Act & Assert
        mockMvc.perform(get("/api/endpoint"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.field").value("value"));
    }
}
```

### Python Tests (pytest)
```python
@pytest.mark.asyncio
async def test_use_case_success(mock_repository, mock_detector):
    # Arrange
    use_case = UseCase(mock_repository, mock_detector)
    mock_detector.detect.return_value = expected_result

    # Act
    result = await use_case.execute(input_data)

    # Assert
    assert result.success
    assert result.data == expected_data
    mock_repository.save.assert_called_once()
```

### Kotlin Tests (Coroutines + Flow)
```kotlin
@Test
fun `test use case success`() = runTest {
    // Arrange
    val repository = FakeRepository()
    val useCase = UseCase(repository)

    // Act
    val result = useCase.execute(input)

    // Assert
    assertEquals(expected, result)
}

@Test
fun `test view model state flow`() = runTest {
    // Arrange
    val viewModel = ViewModel(useCase)
    val states = mutableListOf<State>()
    val job = launch { viewModel.state.toList(states) }

    // Act
    viewModel.performAction()

    // Assert
    assertEquals(State.Loading, states[0])
    assertEquals(State.Success(data), states[1])
    job.cancel()
}
```

## Coverage Targets

### Minimum Coverage by Layer
- **Controllers/Routes**: 85% (high priority - API contract)
- **Services/Use Cases**: 90% (business logic)
- **Domain Models**: 95% (critical validation)
- **Repositories**: 80% (data access)
- **Infrastructure**: 75% (external integrations)

### Overall Target
- **Line Coverage**: 80%+
- **Branch Coverage**: 75%+
- **Method Coverage**: 85%+

## Running Tests with Coverage

### Java (Gradle + JaCoCo)
```bash
cd identity-core-api
./gradlew test jacocoTestReport
# Report: build/reports/jacoco/test/html/index.html
```

### Python (pytest + coverage)
```bash
cd biometric-processor
pytest --cov=app --cov-report=html --cov-report=term
# Report: htmlcov/index.html
```

### Kotlin (Gradle + Kover)
```bash
cd mobile-app
./gradlew shared:koverHtmlReport
# Report: shared/build/reports/kover/html/index.html
```

## Priority Order

1. **HIGH PRIORITY** (Core Functionality - Week 1)
   - AuthController tests
   - JwtService tests
   - BiometricController tests
   - LoginViewModel tests
   - RegisterViewModel tests
   - BiometricViewModel tests

2. **MEDIUM PRIORITY** (Additional Coverage - Week 2)
   - UserController tests
   - All use case tests (Python & Kotlin)
   - Repository tests
   - API route tests (Python)

3. **LOW PRIORITY** (Nice to Have - Week 3)
   - StatisticsController tests
   - TenantController tests
   - Configuration tests
   - Middleware tests

## Notes

- Use AAA pattern (Arrange, Act, Assert) consistently
- Mock external dependencies
- Test both success and error paths
- Include edge cases
- Use descriptive test names
- Keep tests isolated and independent
- Aim for fast execution times
- Use test fixtures/factories for test data
