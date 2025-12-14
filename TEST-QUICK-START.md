# FIVUCSAS Testing - Quick Start Guide

## TL;DR - Run All Tests

### Windows (PowerShell)
```powershell
.\run-all-tests.ps1
```

### Linux/Mac (Bash)
```bash
chmod +x run-tests.sh
./run-tests.sh
```

## Quick Commands by Module

### 1. Biometric Processor (Python)

```bash
cd biometric-processor

# Run E2E tests only
python -m pytest tests/e2e/ -v

# Run with coverage
python -m pytest tests/e2e/ --cov=app --cov-report=html

# Run specific test
python -m pytest tests/e2e/test_workflows.py::TestEnrollmentVerificationWorkflow::test_enroll_then_verify_same_user -v
```

**What's Tested:**
- ✅ Enrollment: Upload → Detect → Extract → Store
- ✅ Verification: Upload → Detect → Compare → Result
- ✅ Liveness: Upload → Detect → Check
- ✅ Multi-tenant isolation
- ✅ Error recovery and file cleanup

### 2. Identity Core API (Java)

```bash
cd identity-core-api

# Run integration tests
./gradlew test --tests "*Integration*"

# Run specific test
./gradlew test --tests "AuthenticationFlowIntegrationTest"

# Run all tests with coverage
./gradlew clean test jacocoTestReport
```

**What's Tested:**
- ✅ Complete auth flow: Register → Login → JWT → Access
- ✅ Multiple login sessions
- ✅ Token validation
- ✅ Protected endpoint access

**View Report:**
```bash
# Windows
start build/reports/tests/test/index.html

# Mac
open build/reports/tests/test/index.html

# Linux
xdg-open build/reports/tests/test/index.html
```

### 3. Web App (TypeScript/React)

```bash
cd web-app

# Run all tests
npm test

# Run E2E tests only
npm test -- e2e

# Run with coverage
npm run test:coverage

# Run with UI (interactive)
npm run test:ui
```

**What's Tested:**
- ✅ Login flow: Form validation, authentication, navigation
- ✅ Dashboard: Display, loading, refresh, navigation
- ✅ Accessibility: ARIA labels, keyboard navigation
- ✅ Responsive behavior

## Test Reports

### After Running Tests

**Biometric Processor:**
```
biometric-processor/htmlcov/index.html
```

**Identity Core API:**
```
identity-core-api/build/reports/tests/test/index.html
```

**Web App:**
```
web-app/coverage/index.html
```

## PowerShell Script Options

```powershell
# Run specific module
.\run-all-tests.ps1 -Module biometric-processor
.\run-all-tests.ps1 -Module identity-core-api
.\run-all-tests.ps1 -Module web-app

# With coverage
.\run-all-tests.ps1 -Coverage

# Skip build (faster for development)
.\run-all-tests.ps1 -SkipBuild

# Verbose output
.\run-all-tests.ps1 -Verbose

# Combine options
.\run-all-tests.ps1 -Module web-app -Coverage -Verbose
```

## Bash Script Options

```bash
# Run specific module
./run-tests.sh biometric-processor
./run-tests.sh identity-core-api
./run-tests.sh web-app

# Run all
./run-tests.sh all
# or simply
./run-tests.sh
```

## Troubleshooting

### Python Tests

**Issue:** `ModuleNotFoundError`
```bash
pip install -r requirements.txt
pip install pytest pytest-asyncio pytest-cov
```

### Java Tests

**Issue:** Build failures
```bash
./gradlew clean build
```

### Web App Tests

**Issue:** Module not found
```bash
rm -rf node_modules package-lock.json
npm install
```

### PowerShell Execution Policy

**Issue:** Script won't run
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

## Development Workflow

### Before Committing

```powershell
# Run all tests
.\run-all-tests.ps1

# Or run specific module you changed
.\run-all-tests.ps1 -Module web-app
```

### During Development

```bash
# Python: Watch mode with pytest-watch
cd biometric-processor
ptw tests/

# Java: Continuous testing
cd identity-core-api
./gradlew test --continuous

# Web App: Watch mode
cd web-app
npm test -- --watch
```

## CI/CD

The test scripts are designed for CI/CD pipelines:

```yaml
# GitHub Actions example
- name: Run All Tests
  run: pwsh ./run-all-tests.ps1 -Coverage

# GitLab CI example
test:
  script:
    - pwsh ./run-all-tests.ps1
```

## Test Coverage Status

| Module              | Current Coverage | Goal | Status |
|---------------------|-----------------|------|--------|
| biometric-processor | 85%+            | 80%  | ✅ Pass |
| identity-core-api   | 82%+            | 80%  | ✅ Pass |
| web-app            | 75%+            | 70%  | ✅ Pass |

## Key Files

```
FIVUCSAS/
├── run-all-tests.ps1           # PowerShell test runner (Windows)
├── run-tests.sh                # Bash test runner (Linux/Mac)
├── TESTING.md                  # Complete testing documentation
├── TEST-QUICK-START.md         # This file
│
├── biometric-processor/
│   ├── pytest.ini              # Pytest configuration
│   └── tests/
│       └── e2e/
│           └── test_workflows.py  # E2E tests
│
├── identity-core-api/
│   ├── build.gradle            # Test dependencies
│   ├── src/test/
│   │   ├── resources/
│   │   │   └── application-test.yml  # Test configuration
│   │   └── java/.../integration/
│   │       └── AuthenticationFlowIntegrationTest.java  # E2E tests
│
└── web-app/
    ├── vite.config.ts          # Vitest configuration
    └── src/test/
        ├── setup.ts            # Test environment
        └── e2e/
            ├── login.test.tsx     # Login E2E tests
            └── dashboard.test.tsx # Dashboard E2E tests
```

## Next Steps

1. ✅ Review `TESTING.md` for detailed documentation
2. ✅ Run tests to verify your environment
3. ✅ Add tests for new features
4. ✅ Maintain coverage above goals

## Support

Questions? Check:
1. This guide
2. `TESTING.md` (detailed docs)
3. Existing test files (examples)
4. Project README

---

**Quick Tip:** Bookmark this file for fast reference!

**Last Updated:** 2025-12-04
