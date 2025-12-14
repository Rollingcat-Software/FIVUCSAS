# FIVUCSAS Testing Infrastructure

This document describes the End-to-End (E2E) testing setup for the FIVUCSAS project.

## Overview

The FIVUCSAS project has comprehensive E2E testing infrastructure across all three modules:

1. **biometric-processor** (Python/FastAPI)
2. **identity-core-api** (Java/Spring Boot)
3. **web-app** (TypeScript/React)

## Quick Start

### Run All Tests

```powershell
# Run all tests
.\run-all-tests.ps1

# Run specific module
.\run-all-tests.ps1 -Module biometric-processor
.\run-all-tests.ps1 -Module identity-core-api
.\run-all-tests.ps1 -Module web-app

# Run with coverage
.\run-all-tests.ps1 -Coverage

# Skip build steps (faster, for development)
.\run-all-tests.ps1 -SkipBuild

# Verbose output
.\run-all-tests.ps1 -Verbose
```

## Module-Specific Testing

### 1. Biometric Processor (Python)

**Location:** `biometric-processor/tests/`

**Test Structure:**
```
tests/
├── conftest.py              # Shared fixtures
├── unit/                    # Unit tests
│   ├── domain/             # Domain entity tests
│   ├── application/        # Use case tests
│   └── infrastructure/     # Infrastructure tests
├── integration/            # Integration tests
│   └── test_api_routes.py # API endpoint tests
└── e2e/                    # End-to-end tests
    └── test_workflows.py   # Complete workflow tests
```

**Run Tests:**
```bash
cd biometric-processor

# Run all tests
pytest

# Run E2E tests only
pytest tests/e2e/

# Run with coverage
pytest --cov=app --cov-report=html

# Run specific test
pytest tests/e2e/test_workflows.py::TestEnrollmentVerificationWorkflow::test_enroll_then_verify_same_user
```

**E2E Test Coverage:**
- ✅ Enrollment Flow: Upload image → Detect face → Extract embedding → Store
- ✅ Verification Flow: Upload image → Detect → Compare → Return result
- ✅ Liveness Check Flow: Upload image → Detect → Check liveness
- ✅ Multi-tenant Isolation: Same user_id in different tenants
- ✅ Error Recovery: Re-enrollment, file cleanup on errors

**Configuration:** `pytest.ini`

**Requirements:**
- Python 3.13+
- pytest >= 7.0
- pytest-asyncio
- pytest-cov (for coverage)

### 2. Identity Core API (Java)

**Location:** `identity-core-api/src/test/java/`

**Test Structure:**
```
src/test/java/com/fivucsas/identity/
├── domain/                                      # Domain model tests
│   ├── model/
│   └── exception/
├── application/                                 # Application service tests
│   └── service/
│       ├── AuthenticateUserServiceTest.java
│       ├── RegisterUserServiceTest.java
│       └── ...
├── infrastructure/                              # Infrastructure tests
│   └── persistence/
└── integration/                                 # Integration tests
    └── AuthenticationFlowIntegrationTest.java  # ⭐ NEW E2E Test
```

**Run Tests:**
```bash
cd identity-core-api

# Run all tests
./gradlew test

# Run only integration tests
./gradlew test --tests "*Integration*"

# Run specific test
./gradlew test --tests "AuthenticationFlowIntegrationTest"

# Run with coverage
./gradlew test jacocoTestReport

# View test report
# Open: build/reports/tests/test/index.html
```

**E2E Test Coverage:**
- ✅ Complete Authentication Flow:
  1. Register new user
  2. Login with credentials
  3. Receive JWT access token
  4. Access protected endpoint using token
- ✅ Multiple Login Sessions: Different devices, multiple refresh tokens
- ✅ Token Validation: Extract email from JWT
- ✅ User Profile: Complete user data verification

**Test Profile:** Uses H2 in-memory database (configured in `src/test/resources/application-test.yml`)

**Requirements:**
- Java 21
- Gradle 8.5+
- Spring Boot 3.2.0

### 3. Web App (TypeScript/React)

**Location:** `web-app/src/test/`

**Test Structure:**
```
src/test/
├── setup.ts                # Test environment setup
├── testUtils.tsx          # Testing utilities
└── e2e/                   # End-to-end tests
    ├── login.test.tsx     # ⭐ NEW Login flow E2E tests
    └── dashboard.test.tsx # ⭐ NEW Dashboard E2E tests
```

**Run Tests:**
```bash
cd web-app

# Run all tests
npm test

# Run E2E tests only
npm test e2e

# Run with coverage
npm run test:coverage

# Run with UI
npm run test:ui

# Run in watch mode
npm test -- --watch
```

**E2E Test Coverage:**

**Login Flow (`login.test.tsx`):**
- ✅ Form Display: Email, password, submit button
- ✅ Form Validation: Empty fields, invalid email, short password
- ✅ Password Toggle: Show/hide password
- ✅ Loading States: Disable inputs during submission
- ✅ Demo Credentials: Pre-filled values
- ✅ Accessibility: ARIA labels, keyboard navigation

**Dashboard Flow (`dashboard.test.tsx`):**
- ✅ Dashboard Display: Title, statistics cards
- ✅ Loading States: Progress indicators
- ✅ Data Refresh: Manual refresh functionality
- ✅ Navigation: Links to other pages
- ✅ Error Handling: API error display
- ✅ Accessibility: Semantic HTML, keyboard support
- ✅ Responsive: Different viewport sizes

**Configuration:** `vite.config.ts` (test section)

**Requirements:**
- Node.js 18+
- npm 9+
- Vitest 2.0+
- @testing-library/react

## Test Coverage Goals

| Module               | Unit Tests | Integration Tests | E2E Tests | Coverage Goal |
|---------------------|------------|-------------------|-----------|---------------|
| biometric-processor | ✅ 95%+    | ✅ Comprehensive   | ✅ Complete | 80%+         |
| identity-core-api   | ✅ 90%+    | ✅ Complete       | ✅ Complete | 80%+         |
| web-app            | ✅ 85%+    | ✅ Component      | ✅ Complete | 70%+         |

## CI/CD Integration

The `run-all-tests.ps1` script is designed to work in CI/CD pipelines:

```yaml
# Example GitHub Actions
- name: Run All Tests
  run: pwsh ./run-all-tests.ps1 -Coverage

- name: Upload Coverage Reports
  uses: codecov/codecov-action@v3
  with:
    files: |
      ./biometric-processor/coverage.xml
      ./identity-core-api/build/reports/jacoco/test/jacocoTestReport.xml
      ./web-app/coverage/coverage-final.json
```

## Test Data Management

### Test Users

**Default Test Credentials:**
- Email: `admin@fivucsas.com`
- Password: `password123`

**Integration Test User:**
- Email: `integration.test@fivucsas.com`
- Password: `SecurePassword123!`

### Test Images

Test images are generated programmatically in tests using:
- **Python:** OpenCV to create synthetic face images
- **Java:** Mock data in fixtures
- **TypeScript:** Mock file objects

## Troubleshooting

### Common Issues

**1. Python tests fail with import errors**
```bash
# Solution: Install dependencies
pip install -r requirements.txt
pip install pytest pytest-asyncio pytest-cov
```

**2. Java tests fail with database errors**
```bash
# Solution: Clean and rebuild
./gradlew clean test
```

**3. Web-app tests fail with module errors**
```bash
# Solution: Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

**4. PowerShell script fails to run**
```powershell
# Solution: Set execution policy
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

## Best Practices

### Writing E2E Tests

1. **Test User Journeys:** Focus on complete workflows, not just individual functions
2. **Use Realistic Data:** Generate or use production-like test data
3. **Clean Up:** Always clean up test data after tests
4. **Isolate Tests:** Each test should be independent
5. **Assert Thoroughly:** Check both success and error cases

### Test Organization

1. **AAA Pattern:** Arrange, Act, Assert
2. **Descriptive Names:** Test names should describe what they test
3. **Group Related Tests:** Use test classes/describe blocks
4. **Document Complex Tests:** Add comments for non-obvious test logic

### Performance

1. **Parallel Execution:** Enable where possible (pytest-xdist, Vitest)
2. **Mock External Services:** Use mocks for external APIs
3. **In-Memory Databases:** Use H2/SQLite for faster tests
4. **Selective Testing:** Run only changed tests during development

## Test Reports

After running tests, reports are available at:

- **Python:** `biometric-processor/htmlcov/index.html`
- **Java:** `identity-core-api/build/reports/tests/test/index.html`
- **TypeScript:** `web-app/coverage/index.html`

## Contributing

When adding new features:

1. ✅ Write unit tests first (TDD)
2. ✅ Add integration tests for API endpoints
3. ✅ Add E2E tests for user-facing features
4. ✅ Ensure all tests pass before committing
5. ✅ Maintain or improve coverage percentage

## Resources

- [Pytest Documentation](https://docs.pytest.org/)
- [JUnit 5 User Guide](https://junit.org/junit5/docs/current/user-guide/)
- [Vitest Guide](https://vitest.dev/guide/)
- [Testing Library](https://testing-library.com/)
- [Test Doubles (Mocks, Stubs, Fakes)](https://martinfowler.com/bliki/TestDouble.html)

## Support

For issues or questions about the testing infrastructure:

1. Check this documentation
2. Review existing tests for examples
3. Open an issue on GitHub
4. Contact the development team

---

**Last Updated:** 2025-12-04
**Maintained By:** FIVUCSAS Development Team
