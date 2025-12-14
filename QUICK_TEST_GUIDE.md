# Quick Test Guide for FIVUCSAS

## Running Tests by Module

### 1. Identity Core API (Java/Spring Boot)

#### Run All Tests
```bash
cd C:\Users\ahabg\OneDrive\Belgeler\GitHub\FIVUCSAS\identity-core-api
./gradlew test
```

#### Run Tests with Coverage
```bash
./gradlew test jacocoTestReport
```

#### View Coverage Report
Open in browser: `identity-core-api/build/reports/jacoco/test/html/index.html`

#### Run Specific Test
```bash
./gradlew test --tests "AuthControllerTest"
./gradlew test --tests "JwtServiceTest"
```

#### Clean and Test
```bash
./gradlew clean test
```

---

### 2. Biometric Processor (Python/FastAPI)

#### Setup Virtual Environment (First Time)
```bash
cd C:\Users\ahabg\OneDrive\Belgeler\GitHub\FIVUCSAS\biometric-processor
python -m venv .venv
.venv\Scripts\activate  # On Windows
# source .venv/bin/activate  # On Linux/Mac
pip install -r requirements.txt
```

#### Activate Virtual Environment
```bash
cd C:\Users\ahabg\OneDrive\Belgeler\GitHub\FIVUCSAS\biometric-processor
.venv\Scripts\activate  # On Windows
```

#### Run All Tests
```bash
pytest
```

#### Run Tests with Coverage
```bash
pytest --cov=app --cov-report=html --cov-report=term
```

#### View Coverage Report
Open in browser: `biometric-processor/htmlcov/index.html`

#### Run Specific Test
```bash
pytest tests/unit/application/test_enroll_face_complete.py
pytest tests/unit/application/test_enroll_face_complete.py::test_enroll_face_success
```

#### Run Tests with Verbose Output
```bash
pytest -v
```

#### Run Only Unit Tests
```bash
pytest tests/unit/
```

#### Run Only Integration Tests
```bash
pytest tests/integration/
```

---

### 3. Mobile App Shared Module (Kotlin Multiplatform)

#### Run All Tests
```bash
cd C:\Users\ahabg\OneDrive\Belgeler\GitHub\FIVUCSAS\mobile-app
./gradlew shared:test
```

#### Run Tests with Coverage
```bash
./gradlew shared:koverHtmlReport
```

#### View Coverage Report
Open in browser: `mobile-app/shared/build/reports/kover/html/index.html`

#### Run Specific Test
```bash
./gradlew shared:test --tests "LoginViewModelTest"
```

#### Clean and Test
```bash
./gradlew shared:clean shared:test
```

---

## Quick Troubleshooting

### Java Tests

**Problem**: Tests won't compile
```bash
# Clean build cache
./gradlew clean
# Rebuild
./gradlew build --refresh-dependencies
```

**Problem**: Out of memory
```bash
# Edit gradle.properties, add:
org.gradle.jvmargs=-Xmx2048m
```

**Problem**: Tests are slow
```bash
# Run tests in parallel
./gradlew test --parallel
```

### Python Tests

**Problem**: Module not found
```bash
# Reinstall dependencies
pip install -r requirements.txt --upgrade
```

**Problem**: Import errors
```bash
# Add project root to PYTHONPATH
export PYTHONPATH="${PYTHONPATH}:$(pwd)"  # Linux/Mac
set PYTHONPATH=%PYTHONPATH%;%CD%  # Windows
```

**Problem**: Tests are cached
```bash
# Clear pytest cache
pytest --cache-clear
```

### Kotlin Tests

**Problem**: Tests won't run
```bash
# Invalidate caches
./gradlew clean
rm -rf .gradle
./gradlew build
```

**Problem**: Coroutine test timeout
```kotlin
// Increase test timeout in test
@Test
fun test() = runTest(timeout = 10.seconds) {
    // Test code
}
```

---

## Coverage Thresholds

### Minimum Required Coverage
- **Overall**: 80%
- **Controllers/Routes**: 85%
- **Services/Use Cases**: 90%
- **Domain Models**: 95%
- **Repositories**: 80%
- **Infrastructure**: 75%

### Check Coverage
```bash
# Java
./gradlew jacocoTestCoverageVerification

# Python
pytest --cov=app --cov-report=term --cov-fail-under=80

# Kotlin
./gradlew shared:koverVerify
```

---

## Test File Locations

### Java Tests
```
identity-core-api/src/test/java/com/fivucsas/identity/
├── controller/
│   ├── AuthControllerTest.java ✓
│   ├── UserControllerTest.java (TODO)
│   └── BiometricControllerTest.java (TODO)
├── security/
│   ├── JwtServiceTest.java ✓
│   ├── CustomUserDetailsServiceTest.java (TODO)
│   └── RateLimitServiceTest.java (TODO)
├── service/
│   ├── AuthServiceTest.java (TODO)
│   ├── UserServiceTest.java (TODO)
│   └── BiometricServiceTest.java (TODO)
└── integration/
    └── AuthenticationFlowIntegrationTest.java ✓
```

### Python Tests
```
biometric-processor/tests/
├── unit/
│   ├── application/
│   │   ├── test_enroll_face_complete.py ✓
│   │   ├── test_verify_face.py (TODO)
│   │   └── test_check_liveness.py (TODO)
│   ├── domain/
│   │   ├── test_entities.py ✓
│   │   └── test_exceptions.py ✓
│   └── infrastructure/
│       ├── test_factories.py ✓
│       ├── test_liveness_detector.py ✓
│       └── test_quality_assessor.py ✓
├── integration/
│   └── test_api_routes.py ✓
└── e2e/
    └── test_workflows.py ✓
```

### Kotlin Tests
```
mobile-app/shared/src/commonTest/kotlin/com/fivucsas/shared/
├── presentation/viewmodel/
│   ├── LoginViewModelTest.kt ✓
│   ├── RegisterViewModelTest.kt (TODO)
│   ├── BiometricViewModelTest.kt (TODO)
│   ├── AdminViewModelTest.kt ✓
│   └── KioskViewModelTest.kt ✓
├── domain/usecase/
│   ├── auth/
│   │   ├── LoginUseCaseTest.kt (TODO)
│   │   └── RegisterUseCaseTest.kt (TODO)
│   ├── biometric/
│   │   ├── EnrollBiometricUseCaseTest.kt (TODO)
│   │   └── VerifyBiometricUseCaseTest.kt (TODO)
│   └── admin/
│       ├── GetStatisticsUseCaseTest.kt ✓
│       ├── GetUsersUseCaseTest.kt ✓
│       └── SearchUsersUseCaseTest.kt ✓
└── data/repository/
    ├── UserRepositoryImplTest.kt ✓
    ├── BiometricRepositoryImplTest.kt (TODO)
    └── AuthRepositoryImplTest.kt (TODO)
```

---

## Continuous Integration

### Run All Tests (All Modules)
```bash
# From project root
cd C:\Users\ahabg\OneDrive\Belgeler\GitHub\FIVUCSAS

# Java tests
cd identity-core-api && ./gradlew test && cd ..

# Python tests
cd biometric-processor && .venv\Scripts\activate && pytest && deactivate && cd ..

# Kotlin tests
cd mobile-app && ./gradlew shared:test && cd ..
```

### PowerShell Script (Windows)
Save as `run-all-tests.ps1`:
```powershell
#!/usr/bin/env pwsh

Write-Host "Running all FIVUCSAS tests..." -ForegroundColor Green

# Java tests
Write-Host "`nRunning Identity Core API tests..." -ForegroundColor Yellow
Set-Location identity-core-api
./gradlew test
$javaResult = $LASTEXITCODE
Set-Location ..

# Python tests
Write-Host "`nRunning Biometric Processor tests..." -ForegroundColor Yellow
Set-Location biometric-processor
& .venv\Scripts\Activate.ps1
pytest
$pythonResult = $LASTEXITCODE
deactivate
Set-Location ..

# Kotlin tests
Write-Host "`nRunning Mobile App tests..." -ForegroundColor Yellow
Set-Location mobile-app
./gradlew shared:test
$kotlinResult = $LASTEXITCODE
Set-Location ..

# Summary
Write-Host "`n=== Test Results ===" -ForegroundColor Green
Write-Host "Java:   $(if($javaResult -eq 0){'PASS'}else{'FAIL'})" -ForegroundColor $(if($javaResult -eq 0){'Green'}else{'Red'})
Write-Host "Python: $(if($pythonResult -eq 0){'PASS'}else{'FAIL'})" -ForegroundColor $(if($pythonResult -eq 0){'Green'}else{'Red'})
Write-Host "Kotlin: $(if($kotlinResult -eq 0){'PASS'}else{'FAIL'})" -ForegroundColor $(if($kotlinResult -eq 0){'Green'}else{'Red'})

exit $(if($javaResult -eq 0 -and $pythonResult -eq 0 -and $kotlinResult -eq 0){0}else{1})
```

### Bash Script (Linux/Mac)
Save as `run-all-tests.sh`:
```bash
#!/bin/bash

echo "Running all FIVUCSAS tests..."

# Java tests
echo -e "\nRunning Identity Core API tests..."
cd identity-core-api
./gradlew test
java_result=$?
cd ..

# Python tests
echo -e "\nRunning Biometric Processor tests..."
cd biometric-processor
source .venv/bin/activate
pytest
python_result=$?
deactivate
cd ..

# Kotlin tests
echo -e "\nRunning Mobile App tests..."
cd mobile-app
./gradlew shared:test
kotlin_result=$?
cd ..

# Summary
echo -e "\n=== Test Results ==="
echo "Java:   $([ $java_result -eq 0 ] && echo 'PASS' || echo 'FAIL')"
echo "Python: $([ $python_result -eq 0 ] && echo 'PASS' || echo 'FAIL')"
echo "Kotlin: $([ $kotlin_result -eq 0 ] && echo 'PASS' || echo 'FAIL')"

exit $([ $java_result -eq 0 ] && [ $python_result -eq 0 ] && [ $kotlin_result -eq 0 ] && echo 0 || echo 1)
```

---

## Quick Commands Reference

| Task | Java | Python | Kotlin |
|------|------|--------|--------|
| Run all tests | `./gradlew test` | `pytest` | `./gradlew shared:test` |
| Run with coverage | `./gradlew jacocoTestReport` | `pytest --cov=app` | `./gradlew shared:koverHtmlReport` |
| Run specific test | `./gradlew test --tests "ClassName"` | `pytest path/to/test.py` | `./gradlew shared:test --tests "ClassName"` |
| Clean | `./gradlew clean` | `pytest --cache-clear` | `./gradlew clean` |
| Verbose | `./gradlew test --info` | `pytest -v` | `./gradlew test --info` |
| Watch mode | N/A | `pytest-watch` | N/A |

---

## Tips

### Speed Up Tests
- Use `--parallel` flag in Gradle
- Use `pytest-xdist` for parallel Python tests: `pytest -n auto`
- Run only changed tests: `./gradlew test --continuous`

### Debug Tests
- Java: Add `--debug-jvm` flag
- Python: Use `pytest --pdb` for debugger
- Kotlin: Run tests in debug mode in IDE

### Skip Slow Tests
- Java: Use `@Tag("slow")` and `./gradlew test -Dexclude.tags=slow`
- Python: Use `@pytest.mark.slow` and `pytest -m "not slow"`
- Kotlin: Use `@Tag("slow")` with Gradle filters

---

## Documentation

- **Full Coverage Plan**: `TEST_COVERAGE_PLAN.md`
- **Implementation Summary**: `TEST_COVERAGE_IMPLEMENTATION_SUMMARY.md`
- **This Quick Guide**: `QUICK_TEST_GUIDE.md`
