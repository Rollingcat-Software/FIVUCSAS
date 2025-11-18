# ✅ FIVUCSAS - Refactoring Checklist
**Purpose:** Transform current desktop-only code into proper multiplatform architecture  
**Timeline:** 7-10 days  
**Status:** Ready to start

---

## 📋 WEEK 1: ARCHITECTURE REFACTORING

### Day 1: Shared Module Structure ⚠️ CRITICAL

- [ ] **1.1 Create domain layer structure**
  ```
  shared/src/commonMain/kotlin/com/fivucsas/shared/
  ├── domain/
  │   ├── model/
  │   ├── repository/
  │   └── usecase/
  ```

- [ ] **1.2 Move models to shared**
  - [ ] Move `EnrollmentData` from `KioskMode.kt` to `shared/domain/model/EnrollmentData.kt`
  - [ ] Move `User` from `AdminDashboard.kt` to `shared/domain/model/User.kt`
  - [ ] Move `UserStatus` to `shared/domain/model/UserStatus.kt`
  - [ ] Move `Statistics` to `shared/domain/model/Statistics.kt`
  - [ ] Create `BiometricData.kt` model

- [ ] **1.3 Create repository interfaces**
  - [ ] Create `UserRepository.kt` interface
  - [ ] Create `BiometricRepository.kt` interface
  - [ ] Create `AuthRepository.kt` interface

- [ ] **1.4 Update desktop imports**
  - [ ] Update `KioskMode.kt` imports to use shared models
  - [ ] Update `AdminDashboard.kt` imports to use shared models
  - [ ] Verify compilation

**Files to create:**
```
shared/src/commonMain/kotlin/com/fivucsas/shared/domain/
├── model/
│   ├── User.kt
│   ├── EnrollmentData.kt
│   ├── BiometricData.kt
│   ├── UserStatus.kt
│   └── Statistics.kt
└── repository/
    ├── UserRepository.kt
    ├── BiometricRepository.kt
    └── AuthRepository.kt
```

**Estimated time:** 3-4 hours

---

### Day 2: Data Layer Implementation

- [ ] **2.1 Create data layer structure**
  ```
  shared/src/commonMain/kotlin/com/fivucsas/shared/
  ├── data/
  │   ├── repository/
  │   ├── remote/
  │   │   ├── api/
  │   │   └── dto/
  │   └── local/
  ```

- [ ] **2.2 Implement repository implementations**
  - [ ] Create `UserRepositoryImpl.kt`
  - [ ] Create `BiometricRepositoryImpl.kt`
  - [ ] Create `AuthRepositoryImpl.kt`

- [ ] **2.3 Create API interfaces**
  - [ ] Create `IdentityApi.kt` interface
  - [ ] Create `BiometricApi.kt` interface

- [ ] **2.4 Create DTOs**
  - [ ] Create `UserDto.kt`
  - [ ] Create `BiometricDto.kt`
  - [ ] Create `AuthDto.kt`
  - [ ] Create DTO mappers (toModel, toDto)

**Files to create:**
```
shared/src/commonMain/kotlin/com/fivucsas/shared/data/
├── repository/
│   ├── UserRepositoryImpl.kt
│   ├── BiometricRepositoryImpl.kt
│   └── AuthRepositoryImpl.kt
├── remote/
│   ├── api/
│   │   ├── IdentityApi.kt
│   │   └── BiometricApi.kt
│   └── dto/
│       ├── UserDto.kt
│       ├── BiometricDto.kt
│       └── AuthDto.kt
└── local/
    └── cache/
        └── UserCache.kt
```

**Estimated time:** 4-5 hours

---

### Day 3: Use Cases & Business Logic

- [ ] **3.1 Create use case layer**
  ```
  shared/src/commonMain/kotlin/com/fivucsas/shared/domain/usecase/
  ```

- [ ] **3.2 Implement enrollment use cases**
  - [ ] Create `EnrollUserUseCase.kt`
  - [ ] Add validation logic
  - [ ] Add error handling
  - [ ] Add transaction management

- [ ] **3.3 Implement verification use cases**
  - [ ] Create `VerifyUserUseCase.kt`
  - [ ] Create `CheckLivenessUseCase.kt`

- [ ] **3.4 Implement admin use cases**
  - [ ] Create `GetUsersUseCase.kt`
  - [ ] Create `DeleteUserUseCase.kt`
  - [ ] Create `SearchUsersUseCase.kt`
  - [ ] Create `GetStatisticsUseCase.kt`

- [ ] **3.5 Create validation rules**
  - [ ] Create `ValidationRules.kt` object
  - [ ] Implement email validation
  - [ ] Implement name validation
  - [ ] Implement Turkish National ID validation
  - [ ] Create `ValidationResult` sealed class

**Files to create:**
```
shared/src/commonMain/kotlin/com/fivucsas/shared/domain/
├── usecase/
│   ├── enrollment/
│   │   └── EnrollUserUseCase.kt
│   ├── verification/
│   │   ├── VerifyUserUseCase.kt
│   │   └── CheckLivenessUseCase.kt
│   └── admin/
│       ├── GetUsersUseCase.kt
│       ├── DeleteUserUseCase.kt
│       ├── SearchUsersUseCase.kt
│       └── GetStatisticsUseCase.kt
└── validation/
    ├── ValidationRules.kt
    └── ValidationResult.kt
```

**Estimated time:** 5-6 hours

---

### Day 4: Presentation Layer Migration

- [ ] **4.1 Create presentation layer structure**
  ```
  shared/src/commonMain/kotlin/com/fivucsas/shared/presentation/
  ├── viewmodel/
  └── state/
  ```

- [ ] **4.2 Move ViewModels to shared**
  - [ ] Move `AppStateManager` to `shared/presentation/viewmodel/AppStateManager.kt`
  - [ ] Move `KioskViewModel` to `shared/presentation/viewmodel/KioskViewModel.kt`
  - [ ] Move `AdminViewModel` to `shared/presentation/viewmodel/AdminViewModel.kt`

- [ ] **4.3 Create UI state classes**
  - [ ] Create `UiState<T>` sealed class
  - [ ] Create `EnrollmentState.kt`
  - [ ] Create `VerificationState.kt`
  - [ ] Create `AdminState.kt`

- [ ] **4.4 Refactor ViewModels to use use cases**
  - [ ] Update `KioskViewModel` to inject `EnrollUserUseCase`
  - [ ] Update `AdminViewModel` to inject admin use cases
  - [ ] Replace hardcoded data with repository calls
  - [ ] Add proper error handling

- [ ] **4.5 Update desktop UI**
  - [ ] Update `KioskMode.kt` imports
  - [ ] Update `AdminDashboard.kt` imports
  - [ ] Update `Main.kt` imports
  - [ ] Remove local ViewModel classes
  - [ ] Verify compilation

**Files to create/modify:**
```
shared/src/commonMain/kotlin/com/fivucsas/shared/presentation/
├── viewmodel/
│   ├── AppStateManager.kt (moved from Main.kt)
│   ├── KioskViewModel.kt (moved from KioskMode.kt)
│   └── AdminViewModel.kt (moved from AdminDashboard.kt)
└── state/
    ├── UiState.kt
    ├── EnrollmentState.kt
    ├── VerificationState.kt
    └── AdminState.kt

mobile-app/desktopApp/src/desktopMain/kotlin/
├── Main.kt (remove AppStateManager, import from shared)
├── ui/kiosk/KioskMode.kt (remove KioskViewModel, import from shared)
└── ui/admin/AdminDashboard.kt (remove AdminViewModel, import from shared)
```

**Estimated time:** 5-6 hours

---

## 📋 WEEK 2: INFRASTRUCTURE & INTEGRATION

### Day 5: Dependency Injection Setup

- [ ] **5.1 Add Koin dependencies**
  - [ ] Add Koin to `shared/build.gradle.kts`
  - [ ] Add Koin to `desktopApp/build.gradle.kts`
  - [ ] Sync Gradle

- [ ] **5.2 Create DI modules**
  - [ ] Create `shared/di/DataModule.kt`
  - [ ] Create `shared/di/DomainModule.kt`
  - [ ] Create `shared/di/PresentationModule.kt`

- [ ] **5.3 Setup Koin in desktop app**
  - [ ] Initialize Koin in `Main.kt`
  - [ ] Create platform-specific module for desktop

- [ ] **5.4 Refactor composables to use Koin**
  - [ ] Update `KioskMode` to use `koinViewModel()`
  - [ ] Update `AdminDashboard` to use `koinViewModel()`
  - [ ] Remove `remember { ViewModel() }` instances

**Files to create:**
```
shared/src/commonMain/kotlin/com/fivucsas/shared/di/
├── DataModule.kt
├── DomainModule.kt
└── PresentationModule.kt

desktopApp/src/desktopMain/kotlin/com/fivucsas/desktop/di/
└── PlatformModule.kt
```

**Estimated time:** 3-4 hours

---

### Day 6: API Client Implementation

- [ ] **6.1 Add Ktor dependencies**
  - [ ] Add Ktor client to `shared/build.gradle.kts`
  - [ ] Add content negotiation
  - [ ] Add logging
  - [ ] Add auth plugin

- [ ] **6.2 Create Ktor client**
  - [ ] Create `KtorClient.kt` factory
  - [ ] Add JSON serialization
  - [ ] Add logging interceptor
  - [ ] Add timeout configuration
  - [ ] Add JWT token interceptor

- [ ] **6.3 Implement API interfaces**
  - [ ] Implement `IdentityApiImpl.kt`
  - [ ] Implement `BiometricApiImpl.kt`
  - [ ] Add error response handling

- [ ] **6.4 Create token management**
  - [ ] Create `TokenStorage` interface
  - [ ] Create `expect/actual` for secure storage
  - [ ] Implement token refresh logic

**Files to create:**
```
shared/src/commonMain/kotlin/com/fivucsas/shared/data/remote/
├── KtorClient.kt
├── api/
│   ├── IdentityApiImpl.kt
│   └── BiometricApiImpl.kt
└── auth/
    ├── TokenStorage.kt
    └── TokenManager.kt

shared/src/desktopMain/kotlin/com/fivucsas/shared/data/local/
└── SecureStorageDesktop.kt
```

**Estimated time:** 5-6 hours

---

### Day 7: Error Handling & Validation

- [ ] **7.1 Create error handling system**
  - [ ] Create exception hierarchy
  - [ ] Create `NetworkException`
  - [ ] Create `ValidationException`
  - [ ] Create `ServerException`
  - [ ] Create `AuthException`

- [ ] **7.2 Implement error handling in repositories**
  - [ ] Add try-catch blocks
  - [ ] Map HTTP errors to exceptions
  - [ ] Add retry logic for network errors

- [ ] **7.3 Implement error handling in ViewModels**
  - [ ] Update ViewModels to use `UiState`
  - [ ] Add error message mapping
  - [ ] Add loading states

- [ ] **7.4 Create error UI components**
  - [ ] Create `ErrorMessage` composable
  - [ ] Create `LoadingIndicator` composable
  - [ ] Create `RetryButton` composable

**Files to create:**
```
shared/src/commonMain/kotlin/com/fivucsas/shared/domain/exception/
├── NetworkException.kt
├── ValidationException.kt
├── ServerException.kt
└── AuthException.kt

desktopApp/src/desktopMain/kotlin/com/fivucsas/desktop/ui/common/
├── ErrorMessage.kt
├── LoadingIndicator.kt
└── RetryButton.kt
```

**Estimated time:** 4-5 hours

---

### Day 8-9: Testing Infrastructure

- [ ] **8.1 Add test dependencies**
  - [ ] Add JUnit 5 to `shared/build.gradle.kts`
  - [ ] Add MockK
  - [ ] Add Turbine (Flow testing)
  - [ ] Add Ktor test client

- [ ] **8.2 Create test utilities**
  - [ ] Create `TestCoroutineRule`
  - [ ] Create test data builders
  - [ ] Create mock repositories

- [ ] **8.3 Write ViewModel tests**
  - [ ] Test `KioskViewModel`
  - [ ] Test `AdminViewModel`
  - [ ] Test state transitions
  - [ ] Test error cases

- [ ] **8.4 Write repository tests**
  - [ ] Test `UserRepositoryImpl`
  - [ ] Test `BiometricRepositoryImpl`
  - [ ] Test error handling

- [ ] **8.5 Write use case tests**
  - [ ] Test `EnrollUserUseCase`
  - [ ] Test validation logic
  - [ ] Test error scenarios

- [ ] **8.6 Write validation tests**
  - [ ] Test email validation
  - [ ] Test name validation
  - [ ] Test Turkish ID validation

**Files to create:**
```
shared/src/commonTest/kotlin/com/fivucsas/shared/
├── presentation/viewmodel/
│   ├── KioskViewModelTest.kt
│   └── AdminViewModelTest.kt
├── domain/usecase/
│   ├── EnrollUserUseCaseTest.kt
│   └── VerifyUserUseCaseTest.kt
├── domain/validation/
│   └── ValidationRulesTest.kt
├── data/repository/
│   └── UserRepositoryImplTest.kt
└── util/
    ├── TestData.kt
    └── MockRepositories.kt
```

**Estimated time:** 8-10 hours

---

### Day 10: Security & Polish

- [ ] **10.1 Implement secure storage**
  - [ ] Desktop: Use DPAPI (Windows)
  - [ ] Android: Use Android Keystore
  - [ ] Create `expect/actual` implementation

- [ ] **10.2 Add input sanitization**
  - [ ] Create `SecurityUtils` object
  - [ ] Add XSS prevention
  - [ ] Add SQL injection prevention

- [ ] **10.3 Add logging**
  - [ ] Create `Logger` interface
  - [ ] Implement platform-specific loggers
  - [ ] Add log levels

- [ ] **10.4 Polish & cleanup**
  - [ ] Remove unused code
  - [ ] Fix warnings
  - [ ] Update documentation
  - [ ] Add KDoc comments

**Files to create:**
```
shared/src/commonMain/kotlin/com/fivucsas/shared/util/
├── SecurityUtils.kt
└── Logger.kt

shared/src/desktopMain/kotlin/com/fivucsas/shared/util/
└── LoggerDesktop.kt
```

**Estimated time:** 4-5 hours

---

## 📊 VERIFICATION CHECKLIST

### Architecture Verification

- [ ] ViewModels are in `shared/presentation/viewmodel/`
- [ ] Models are in `shared/domain/model/`
- [ ] Repositories are in `shared/domain/repository/` (interfaces) and `shared/data/repository/` (implementations)
- [ ] Use cases are in `shared/domain/usecase/`
- [ ] No business logic in UI components
- [ ] No hardcoded data in ViewModels

### Code Quality Verification

- [ ] All SOLID principles followed
- [ ] No magic values (all extracted to constants)
- [ ] Comprehensive error handling
- [ ] Input validation implemented
- [ ] Proper state management (UiState)
- [ ] Dependency injection working

### Testing Verification

- [ ] ViewModel tests passing
- [ ] Repository tests passing
- [ ] Use case tests passing
- [ ] Validation tests passing
- [ ] Test coverage > 80%

### Integration Verification

- [ ] Desktop app compiles
- [ ] Desktop app runs
- [ ] All navigation works
- [ ] State management works
- [ ] Error handling works
- [ ] No crashes

---

## 🎯 SUCCESS CRITERIA

### When Refactoring is Complete:

✅ **Architecture**
- Clean Architecture layers properly separated
- 90-95% code shared between platforms
- ViewModels in shared module
- Repository pattern implemented
- Dependency injection working

✅ **Code Quality**
- SOLID principles: 95%+
- Test coverage: >80%
- No magic values
- Comprehensive error handling
- Input validation

✅ **Functionality**
- Desktop app works as before
- All features functional
- No regressions
- Better error messages
- Loading states

✅ **Maintainability**
- Easy to add new features
- Easy to test
- Easy to modify
- Well documented
- Consistent architecture

---

## 📝 DAILY PROGRESS TRACKING

### Day 1: ⬜ Not Started
- [ ] Shared module structure created
- [ ] Models moved to shared
- [ ] Repository interfaces created
- [ ] Desktop app still compiles

### Day 2: ⬜ Not Started
- [ ] Data layer implemented
- [ ] Repository implementations created
- [ ] API interfaces created
- [ ] DTOs created

### Day 3: ⬜ Not Started
- [ ] Use cases created
- [ ] Validation rules implemented
- [ ] Business logic extracted

### Day 4: ⬜ Not Started
- [ ] ViewModels moved to shared
- [ ] UI state classes created
- [ ] Desktop UI updated
- [ ] Everything compiles and runs

### Day 5: ⬜ Not Started
- [ ] Koin setup complete
- [ ] DI modules created
- [ ] Composables using DI

### Day 6: ⬜ Not Started
- [ ] Ktor client implemented
- [ ] API integration ready
- [ ] Token management working

### Day 7: ⬜ Not Started
- [ ] Error handling complete
- [ ] Validation integrated
- [ ] Error UI components created

### Day 8-9: ⬜ Not Started
- [ ] Test infrastructure setup
- [ ] All tests written
- [ ] Test coverage >80%

### Day 10: ⬜ Not Started
- [ ] Security implemented
- [ ] Code polished
- [ ] Documentation updated

---

## 🚀 AFTER REFACTORING

### You'll be able to:

✅ **Add new features easily**
- Just create a use case
- Add to repository
- Update ViewModel
- Update UI

✅ **Test everything**
- Unit test use cases
- Test ViewModels
- Test repositories
- Mock dependencies

✅ **Support multiple platforms**
- Android: Just add UI
- iOS: Just add UI
- 90-95% code reused

✅ **Scale confidently**
- Clear architecture
- Separation of concerns
- Easy to maintain
- Team-friendly

---

**START DATE:** _______________  
**TARGET COMPLETION:** _______________  
**ACTUAL COMPLETION:** _______________

**Notes:**
- Work systematically through each day
- Test after each major change
- Commit frequently
- Don't skip validation steps
- Ask for help if stuck

🎯 **Let's build it right!**
