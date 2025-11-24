# Installation Guide - Starter Pack

## Quick Installation (30 minutes)

### Prerequisites
- Java 21+ (for Identity Core API)
- Python 3.11+ (for Biometric Processor)
- Docker & Docker Compose (for services)
- Git with submodules initialized

---

## Step 1: Identity Core API (10 minutes)

```bash
cd identity-core-api

# 1. Copy build.gradle additions
cat ../implementation-starter-pack/identity-core-api-tests/build.gradle.additions >> build.gradle

# 2. Create test directory
mkdir -p src/test/java/com/fivucsas/identity/{service,util,integration}

# 3. Copy test files
cp ../implementation-starter-pack/identity-core-api-tests/TestDataBuilder.java \
   src/test/java/com/fivucsas/identity/util/

cp ../implementation-starter-pack/identity-core-api-tests/AuthServiceTest.java \
   src/test/java/com/fivucsas/identity/service/

# 4. Run tests
./gradlew test

# 5. Check coverage
./gradlew jacocoTestReport
open build/reports/jacoco/test/html/index.html
```

**Expected Result**: ✅ Tests running, ~15% coverage

---

## Step 2: Biometric Processor (10 minutes)

```bash
cd biometric-processor

# 1. Copy pytest configuration
cp ../implementation-starter-pack/biometric-processor-tests/pytest.ini .
cp ../implementation-starter-pack/biometric-processor-tests/requirements-test.txt .

# 2. Create test directories
mkdir -p tests/{unit,integration,fixtures}

# 3. Copy test files
cp ../implementation-starter-pack/biometric-processor-tests/conftest.py tests/
cp ../implementation-starter-pack/biometric-processor-tests/test_face_detection.py tests/unit/

# 4. Install test dependencies
pip install -r requirements-test.txt

# 5. Run tests
pytest -v

# 6. Check coverage
pytest --cov=app --cov-report=html
open htmlcov/index.html
```

**Expected Result**: ✅ Tests running, ~10% coverage

---

## Step 3: ML Services (5 minutes)

```bash
cd biometric-processor

# 1. Install ML dependencies
pip install -r ../implementation-starter-pack/ml-services/requirements-ml.txt

# 2. Create services directory
mkdir -p app/services

# 3. Copy ML service
cp ../implementation-starter-pack/ml-services/face_detection_service.py \
   app/services/

# 4. Test import
python -c "from app.services.face_detection_service import FaceDetectionService; print('✅ Success')"
```

**Expected Result**: ✅ Import successful

---

## Step 4: CI/CD Pipeline (5 minutes)

```bash
cd ..  # Root repository

# 1. Create GitHub Actions directory
mkdir -p .github/workflows

# 2. Copy workflow
cp implementation-starter-pack/ci-cd/test-and-coverage.yml \
   .github/workflows/

# 3. Commit and push
git add .github/workflows/test-and-coverage.yml
git commit -m "ci: add test and coverage workflow"
git push
```

**Expected Result**: ✅ GitHub Actions workflow runs

---

## Verification

### Identity Core API
```bash
cd identity-core-api
./gradlew test --info
# Should see: BUILD SUCCESSFUL with test results
```

### Biometric Processor
```bash
cd biometric-processor
pytest -v
# Should see: X passed in Y seconds
```

### CI/CD
1. Go to GitHub Actions tab
2. See "Test and Coverage" workflow
3. Should be green ✅

---

## Troubleshooting

### "Tests won't compile in Java"
- Ensure source code exists in `identity-core-api/src/main/java/`
- Check package names match: `com.fivucsas.identity.*`
- Run `./gradlew clean build`

### "pytest not found"
- Install pytest: `pip install pytest pytest-cov`
- Activate virtual environment if using one

### "Cannot find module 'app'"
- Ensure you're in `biometric-processor/` directory
- Check `conftest.py` has correct path setup

### "MediaPipe installation fails"
- Install system dependencies:
  ```bash
  # Ubuntu/Debian
  sudo apt-get install -y libgl1-mesa-glx libglib2.0-0
  
  # macOS
  brew install opencv
  ```

---

## Next Steps

After installation:

1. **Week 1**: Add more tests following the examples
   - Copy AuthServiceTest pattern for other services
   - Target: 40% coverage

2. **Week 2**: Add integration tests
   - Use Testcontainers examples
   - Target: 70% coverage

3. **Week 3**: Complete test coverage
   - Add remaining tests
   - Target: 80%+ coverage

---

## Support

- Review `OPTIMIZATION_DESIGN_DOCUMENT.md` for complete guide
- Check `IMPLEMENTATION_QUICK_START.md` for day-by-day plan
- Contact engineering lead for assistance

---

**Installation Time**: ~30 minutes
**First Tests Running**: ✅
**Coverage Baseline**: ~15% (will increase to 80%+)
