# Testing Documentation

Testing guides and test reports for FIVUCSAS.

## Testing Guides

- **[TESTING_GUIDE.md](TESTING_GUIDE.md)** - ⭐ Complete testing guide (908 lines)
- **[MOBILE_TESTING_GUIDE.md](MOBILE_TESTING_GUIDE.md)** - Mobile app testing
- **[BACKEND_TEST_REPORT.md](BACKEND_TEST_REPORT.md)** - Backend test results
- **[QUICKSTART_TEST.md](QUICKSTART_TEST.md)** - Quick testing guide
- **[HOW_TO_TEST_APPS.md](HOW_TO_TEST_APPS.md)** - How to test applications

## Quick Test Commands

### Backend Tests
```bash
cd identity-core-api
./gradlew test
./gradlew test --tests "com.fivucsas.identity.*"
```

### Mobile App Tests
```bash
cd mobile-app
./gradlew :shared:test
./gradlew test
```

### Biometric Service Tests
```bash
cd biometric-processor
pytest
pytest tests/ -v
```

## Test Coverage

The project includes:
- Unit tests for business logic
- Integration tests for API endpoints
- UI tests for mobile applications
- End-to-end tests for complete flows

See [TESTING_GUIDE.md](TESTING_GUIDE.md) for detailed coverage information.

## Testing Strategy

- **Unit Testing:** Test individual components in isolation
- **Integration Testing:** Test component interactions
- **API Testing:** Test REST endpoints with various inputs
- **UI Testing:** Test user interfaces and interactions
- **Performance Testing:** Test under load (planned)

## Test Principles

- AAA Pattern (Arrange, Act, Assert)
- Independent and repeatable tests
- Fast execution
- Clear test names
- Edge case coverage
- Error condition testing

---

[← Back to Main Documentation](../README.md)
