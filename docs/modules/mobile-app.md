# Mobile App - Module Implementation Plan

**Module Name**: mobile-app (includes Desktop + Mobile)
**Repository**: https://github.com/Rollingcat-Software/mobile-app
**Technology**: Kotlin Multiplatform + Compose Multiplatform
**Purpose**: Cross-platform kiosk mode and admin dashboard for Desktop, Android, and iOS
**Status**: ⚠️ Desktop 96% Complete (UI), Mobile Not Started
**Priority**: 🟡 MEDIUM - Can develop after backend integration complete

---

## 📋 Table of Contents

1. [Module Overview](#module-overview)
2. [Current Status](#current-status)
3. [Architecture](#architecture)
4. [Project Structure](#project-structure)
5. [Implementation Tasks](#implementation-tasks)
6. [Testing Requirements](#testing-requirements)
7. [Deployment](#deployment)
8. [Integration Points](#integration-points)

---

## 🎯 Module Overview

### Purpose
The mobile-app repository contains **both desktop and mobile applications** using Kotlin Multiplatform. It provides:

**Desktop App** (Kiosk Mode + Admin Dashboard):
- Kiosk mode for enrollment and verification
- Admin dashboard for managing users and viewing analytics
- Runs on Windows, macOS, Linux

**Mobile App** (Planned - Android/iOS):
- Mobile enrollment and verification
- User profile management
- Biometric authentication on mobile devices

### Key Features
1. **Kiosk Mode** (Desktop)
   - Welcome screen with enrollment/verification options
   - Enrollment flow with camera capture
   - Verification flow with liveness detection
   - Success/failure feedback

2. **Admin Dashboard** (Desktop)
   - Users tab - User management with CRUD operations
   - Analytics tab - Charts and statistics
   - Security tab - Audit logs and security events
   - Settings tab - System and profile configuration

3. **Shared Code** (90%)
   - Business logic shared between desktop and mobile
   - Network layer (Ktor client)
   - Data models
   - ViewModels

---

## 📊 Current Status

### ✅ Desktop App: What's Implemented (96% Complete)

#### Kiosk Mode (100% Complete)
**File**: `desktopApp/src/jvmMain/kotlin/KioskMode.kt`

- ✅ **Welcome Screen**
  - Gradient background
  - Enrollment and verification buttons
  - Employee ID input field
  - Modern UI with shadows and gradients

- ✅ **Enrollment Screen**
  - User information form (name, email, employee ID)
  - Camera button for photo capture
  - Form validation
  - Submit button with loading state
  - Success/error messages

- ✅ **Verification Screen**
  - Camera button for face capture
  - Success state: Green gradient icon, confidence score, progress bar
  - Failure state: Red gradient icon, retry/cancel buttons
  - Loading state with circular progress indicator
  - Liveness detection UI

#### Admin Dashboard (96% Complete)
**File**: `desktopApp/src/jvmMain/kotlin/AdminDashboard.kt` (2211 lines)

- ✅ **Users Tab** (100% Complete)
  - Statistics cards (Total, Active, Inactive, Pending)
  - User list table with search
  - Add/Edit/Delete dialogs
  - Pagination controls
  - Status badges
  - Export functionality
  - Mock data working

- ✅ **Analytics Tab** (100% Complete)
  - Statistics cards overview
  - Verification trends chart placeholder
  - Success rate chart placeholder
  - Recent verifications list
  - Mock data working

- ✅ **Security Tab** (80% Complete)
  - 3 security alert cards (Failed Logins, Active Sessions, Suspicious Activity)
  - Recent activity table with expandable details
  - ❌ Missing: Detailed audit logs table
  - ❌ Missing: Advanced filtering

- ✅ **Settings Tab** (100% Complete - Nov 17, 2025)
  - 6 comprehensive sections:
    1. Profile (avatar, name, email, role)
    2. Security (password, 2FA, session timeout)
    3. Biometric (face match threshold, liveness, quality)
    4. System (API URL, logging, cache, performance)
    5. Notifications (email alerts, reports, updates)
    6. Appearance (theme, display, date format, timezone)
  - 25+ input controls (text fields, sliders, switches, dropdowns)
  - Settings navigation panel
  - Save/Cancel buttons

### ❌ Mobile App: Not Started

The mobile app (Android/iOS) has not been implemented yet. The shared code (93 Kotlin files) provides foundation, but platform-specific UI and features are missing.

### ⚠️ Backend Integration: Not Started

All desktop functionality uses mock data. No backend API integration exists.

---

## 🏗️ Architecture

### Technology Stack
```yaml
Language: Kotlin 1.9+
Framework: Kotlin Multiplatform (KMP)
UI: Compose Multiplatform
Desktop: JVM (Windows, macOS, Linux)
Mobile: Android (Kotlin), iOS (Swift interop via KMP)
Networking: Ktor Client
Serialization: Kotlinx Serialization
State Management: ViewModel + StateFlow
Build: Gradle 8+
```

### Project Structure (Kotlin Multiplatform)
```
mobile-app/
├── shared/                    # 90% shared code
│   ├── src/
│   │   ├── commonMain/        # Shared across all platforms
│   │   │   ├── kotlin/
│   │   │   │   ├── models/    # Data models (User, Tenant, etc.)
│   │   │   │   ├── network/   # API client (Ktor)
│   │   │   │   ├── viewmodels/# Business logic
│   │   │   │   └── repository/# Data layer
│   │   ├── androidMain/       # Android-specific code
│   │   ├── iosMain/           # iOS-specific code
│   │   └── jvmMain/           # Desktop-specific code
│
├── desktopApp/                # Desktop application
│   └── src/jvmMain/kotlin/
│       ├── Main.kt
│       ├── KioskMode.kt       # Kiosk UI (2000+ lines)
│       └── AdminDashboard.kt  # Admin UI (2211 lines)
│
├── androidApp/                # Android application (to be created)
│   └── src/main/
│       ├── kotlin/
│       └── res/
│
├── iosApp/                    # iOS application (to be created)
│   └── iosApp/
│       └── ContentView.swift
│
└── build.gradle.kts
```

### Code Sharing
```
┌────────────────────────────────────────┐
│         Shared Module (90%)            │
│  - Models                              │
│  - ViewModels                          │
│  - Network (Ktor)                      │
│  - Business Logic                      │
└───────────┬────────────────────────────┘
            │
    ┌───────┴────────┬────────────┐
    │                │            │
┌───▼────┐    ┌──────▼──┐  ┌─────▼─────┐
│Desktop │    │ Android │  │    iOS    │
│(Compose│    │(Compose)│  │  (SwiftUI)│
│  JVM)  │    │         │  │           │
└────────┘    └─────────┘  └───────────┘
```

---

## 🧩 Component Structure

### Desktop App Components

#### KioskMode.kt (Enrollment & Verification)
```kotlin
@Composable
fun KioskMode() {
    // Screens:
    // 1. WelcomeScreen() - Entry point
    // 2. EnrollmentScreen() - User enrollment
    // 3. VerificationScreen() - Face verification

    // State management with mutableStateOf
    // Navigation between screens
    // Camera integration (placeholder)
    // API calls (mock mode)
}
```

#### AdminDashboard.kt (Admin Interface)
```kotlin
@Composable
fun AdminDashboard() {
    // Tabs:
    // 1. UsersTab() - User CRUD
    // 2. AnalyticsTab() - Charts and stats
    // 3. SecurityTab() - Audit logs
    // 4. SettingsTab() - Configuration

    // Components:
    // - TopBar with app name and user menu
    // - Sidebar navigation
    // - Content area for selected tab
    // - Dialogs for create/edit
}
```

### Shared Code Structure

#### Models (commonMain)
```kotlin
// User.kt
data class User(
    val id: Long,
    val email: String,
    val firstName: String,
    val lastName: String,
    val role: String,
    val status: String,
    val tenantId: Long,
    val createdAt: String
)

// Tenant.kt, BiometricData.kt, etc.
```

#### API Client (commonMain)
```kotlin
// ApiClient.kt
class ApiClient {
    private val client = HttpClient {
        install(ContentNegotiation) {
            json(Json {
                ignoreUnknownKeys = true
                isLenient = true
            })
        }
    }

    suspend fun login(email: String, password: String): AuthResponse
    suspend fun getUsers(): List<User>
    suspend fun createUser(user: CreateUserRequest): User
    // etc.
}
```

#### ViewModels (commonMain)
```kotlin
// UsersViewModel.kt
class UsersViewModel {
    private val _users = MutableStateFlow<List<User>>(emptyList())
    val users: StateFlow<List<User>> = _users

    suspend fun fetchUsers()
    suspend fun createUser(user: User)
    suspend fun updateUser(id: Long, user: User)
    suspend fun deleteUser(id: Long)
}
```

---

## 📝 Implementation Tasks

### Phase 1: Desktop Backend Integration (3-4 hours)
**Priority**: 🔴 CRITICAL

#### Task 1.1: Create API Service Layer
- [ ] Create `ApiService.kt` in shared/commonMain
- [ ] Configure Ktor client with base URL
- [ ] Add JWT token interceptor
- [ ] Implement authentication endpoints (login, logout)
- [ ] Implement user CRUD endpoints

```kotlin
// shared/src/commonMain/kotlin/network/ApiService.kt
class ApiService(private val baseUrl: String) {
    private val client = HttpClient {
        install(ContentNegotiation) { json() }
        install(Auth) {
            bearer {
                loadTokens { /* Load from storage */ }
            }
        }
    }

    suspend fun login(email: String, password: String): AuthResponse {
        return client.post("$baseUrl/auth/login") {
            contentType(ContentType.Application.Json)
            setBody(LoginRequest(email, password))
        }.body()
    }

    suspend fun getUsers(): List<User> {
        return client.get("$baseUrl/users").body()
    }

    // ... other endpoints
}
```

#### Task 1.2: Update ViewModels
- [ ] Create `AuthViewModel.kt` for login state
- [ ] Create `UsersViewModel.kt` for user management
- [ ] Create `DashboardViewModel.kt` for statistics
- [ ] Replace mock data with API calls

#### Task 1.3: Environment Configuration
- [ ] Create `local.properties` for API URL
- [ ] Add environment variable support
- [ ] Add MOCK_MODE flag for development
- [ ] Configure different URLs for dev/staging/prod

#### Task 1.4: Update Desktop UI
- [ ] Replace mock data in `AdminDashboard.kt`
- [ ] Add loading states
- [ ] Add error handling
- [ ] Add retry logic

**Acceptance Criteria**:
- ✅ Desktop app connects to backend API
- ✅ Login works with real credentials
- ✅ User CRUD operations use real API
- ✅ Dashboard statistics show real data
- ✅ Error messages display for API failures

---

### Phase 2: Camera Integration (2-3 hours)
**Priority**: 🟠 HIGH

#### Task 2.1: Desktop Camera (Java/JavaFX)
- [ ] Add JavaCV or WebCam Capture library
- [ ] Create camera preview component
- [ ] Capture photo and convert to ByteArray
- [ ] Send to biometric-processor API

```kotlin
// desktopApp/src/jvmMain/kotlin/CameraCapture.kt
@Composable
fun CameraCapture(onCapture: (ByteArray) -> Unit) {
    // Use JavaCV or WebCam Capture
    // Show camera preview
    // Capture button
    // Return image as ByteArray
}
```

#### Task 2.2: Mobile Camera (Android)
- [ ] Use CameraX library
- [ ] Create camera preview composable
- [ ] Capture photo
- [ ] Handle permissions

```kotlin
// androidApp/src/main/kotlin/CameraCapture.kt
@Composable
fun CameraCapture(onCapture: (ByteArray) -> Unit) {
    // Android CameraX implementation
    // Request camera permission
    // Show preview
    // Capture button
}
```

#### Task 2.3: Mobile Camera (iOS)
- [ ] Use AVFoundation via Swift interop
- [ ] Create camera wrapper
- [ ] Expose to Kotlin

```swift
// iosApp/CameraHelper.swift
class CameraHelper {
    func capturePhoto(completion: @escaping (Data) -> Void) {
        // AVFoundation implementation
    }
}
```

**Acceptance Criteria**:
- ✅ Desktop camera shows live preview
- ✅ Can capture photos on desktop
- ✅ Android camera works (after mobile app created)
- ✅ iOS camera works (after mobile app created)

---

### Phase 3: Mobile App - Android (2-3 weeks)
**Priority**: 🟡 MEDIUM

#### Task 3.1: Android Project Setup
- [ ] Configure `androidApp` module in `build.gradle.kts`
- [ ] Add Android dependencies (Compose, CameraX, etc.)
- [ ] Create Android manifest with permissions
- [ ] Setup Material3 theme

#### Task 3.2: Android UI - Enrollment Flow
- [ ] Create `EnrollmentScreen.kt` (Compose)
- [ ] User information form
- [ ] Camera capture integration
- [ ] Photo preview
- [ ] Submit to backend

#### Task 3.3: Android UI - Verification Flow
- [ ] Create `VerificationScreen.kt` (Compose)
- [ ] Camera capture
- [ ] Liveness detection UI
- [ ] Results display

#### Task 3.4: Android UI - User Profile
- [ ] Create `ProfileScreen.kt` (Compose)
- [ ] View profile
- [ ] Edit profile
- [ ] Biometric settings

#### Task 3.5: Android Testing
- [ ] Test on emulator
- [ ] Test on physical device (min Android 8.0)
- [ ] Test camera on various devices
- [ ] Performance testing

**Acceptance Criteria**:
- ✅ Android app builds successfully
- ✅ Can enroll users on Android
- ✅ Can verify users on Android
- ✅ Camera works on Android devices
- ✅ UI is responsive and performant

---

### Phase 4: Mobile App - iOS (2-3 weeks)
**Priority**: 🟢 LOW

#### Task 4.1: iOS Project Setup
- [ ] Configure `iosApp` in Xcode
- [ ] Link shared KMP framework
- [ ] Setup SwiftUI views
- [ ] Configure Info.plist with permissions

#### Task 4.2: iOS UI - Enrollment Flow
- [ ] Create `EnrollmentView.swift` (SwiftUI)
- [ ] Call shared ViewModels from Swift
- [ ] Camera integration with AVFoundation
- [ ] Submit to backend

#### Task 4.3: iOS UI - Verification Flow
- [ ] Create `VerificationView.swift` (SwiftUI)
- [ ] Camera integration
- [ ] Liveness detection UI
- [ ] Results display

#### Task 4.4: iOS UI - User Profile
- [ ] Create `ProfileView.swift` (SwiftUI)
- [ ] View/edit profile
- [ ] Biometric settings

#### Task 4.5: iOS Testing
- [ ] Test on simulator
- [ ] Test on physical device (min iOS 14)
- [ ] Test camera on various devices
- [ ] Performance testing

**Acceptance Criteria**:
- ✅ iOS app builds successfully
- ✅ Can enroll users on iOS
- ✅ Can verify users on iOS
- ✅ Camera works on iOS devices
- ✅ UI follows iOS design guidelines

---

### Phase 5: Security Tab Completion (1-2 hours)
**Priority**: 🟡 MEDIUM

#### Task 5.1: Complete Audit Logs Table
- [ ] Add detailed audit logs table
- [ ] Implement filtering (action type, date range, user)
- [ ] Add pagination
- [ ] Expand JSON details viewer

#### Task 5.2: Security Analytics
- [ ] Add failed login trends chart
- [ ] Add geographic access map (if IP geolocation available)
- [ ] Add security score widget

**Acceptance Criteria**:
- ✅ Security tab shows comprehensive audit logs
- ✅ Filtering and search work
- ✅ Charts display security trends

---

### Phase 6: Testing & Polish (1 week)
**Priority**: 🟡 MEDIUM

#### Task 6.1: Unit Tests (Shared Code)
- [ ] Test ViewModels
- [ ] Test API client
- [ ] Test data models
- [ ] 80%+ coverage

#### Task 6.2: UI Tests (Desktop)
- [ ] Test user flows (enrollment, verification, admin)
- [ ] Test navigation
- [ ] Test error handling

#### Task 6.3: UI Tests (Mobile)
- [ ] Test Android UI
- [ ] Test iOS UI
- [ ] Test camera integration

#### Task 6.4: Performance Optimization
- [ ] Optimize image loading
- [ ] Reduce app size
- [ ] Improve startup time
- [ ] Memory profiling

**Acceptance Criteria**:
- ✅ 80%+ test coverage on shared code
- ✅ All critical flows tested
- ✅ No memory leaks
- ✅ App size optimized

---

## 🧪 Testing Requirements

### Unit Tests (Shared Module)
```kotlin
// UsersViewModelTest.kt
class UsersViewModelTest {
    @Test
    fun fetchUsers_success()

    @Test
    fun createUser_success()

    @Test
    fun updateUser_success()

    @Test
    fun deleteUser_success()
}
```

### UI Tests (Desktop)
```kotlin
// DesktopUITest.kt
@Test
fun testKioskModeEnrollmentFlow()

@Test
fun testAdminDashboardUserCRUD()

@Test
fun testAdminDashboardAnalytics()
```

### Manual Testing Checklist

#### Desktop App
- [ ] Kiosk mode: Enrollment flow works end-to-end
- [ ] Kiosk mode: Verification flow works end-to-end
- [ ] Admin dashboard: All tabs navigate correctly
- [ ] Admin dashboard: User CRUD operations work
- [ ] Admin dashboard: Charts render correctly
- [ ] Settings: All configuration options work

#### Android App
- [ ] Enrollment flow works on Android
- [ ] Verification flow works on Android
- [ ] Camera captures photos correctly
- [ ] App works offline (cached data)
- [ ] Permissions requested correctly

#### iOS App
- [ ] Enrollment flow works on iOS
- [ ] Verification flow works on iOS
- [ ] Camera captures photos correctly
- [ ] App works offline (cached data)
- [ ] Permissions requested correctly

---

## 🚀 Deployment

### Desktop App Deployment

#### Build Commands
```bash
# Build desktop app (JVM)
./gradlew desktopApp:packageDistributionForCurrentOS

# Output:
# - Windows: .exe installer
# - macOS: .dmg installer
# - Linux: .deb or .rpm package
```

#### Distribution
```bash
# Create installers
./gradlew desktopApp:package
# Or use jpackage manually

# Artifacts:
# - desktopApp/build/compose/binaries/main/
#   - app/ (portable)
#   - installer/ (.exe, .dmg, .deb)
```

### Android App Deployment

#### Build APK
```bash
./gradlew androidApp:assembleRelease

# Output:
# androidApp/build/outputs/apk/release/androidApp-release.apk
```

#### Build App Bundle (for Google Play)
```bash
./gradlew androidApp:bundleRelease

# Output:
# androidApp/build/outputs/bundle/release/androidApp-release.aab
```

### iOS App Deployment

#### Build Archive (Xcode)
```bash
# In Xcode:
# Product → Archive
# Distribute App → App Store Connect or Ad Hoc
```

#### Build from Command Line
```bash
xcodebuild archive -workspace iosApp.xcworkspace \
  -scheme iosApp -archivePath build/iosApp.xcarchive

xcodebuild -exportArchive -archivePath build/iosApp.xcarchive \
  -exportPath build -exportOptionsPlist exportOptions.plist
```

---

## 🔗 Integration Points

### Backend API Integration (Ktor Client)

```kotlin
// shared/src/commonMain/kotlin/network/ApiClient.kt

class ApiClient(private val baseUrl: String) {
    suspend fun login(email: String, password: String): AuthResponse {
        return client.post("$baseUrl/auth/login") {
            setBody(LoginRequest(email, password))
        }.body()
    }

    suspend fun enrollUser(
        firstName: String,
        lastName: String,
        email: String,
        photo: ByteArray
    ): EnrollmentResponse {
        return client.post("$baseUrl/biometric/enroll") {
            setBody(MultiPartFormDataContent(
                formData {
                    append("firstName", firstName)
                    append("lastName", lastName)
                    append("email", email)
                    append("photo", photo, Headers.build {
                        append(HttpHeaders.ContentType, "image/jpeg")
                    })
                }
            ))
        }.body()
    }

    suspend fun verifyUser(employeeId: String, photo: ByteArray): VerificationResponse {
        return client.post("$baseUrl/biometric/verify") {
            setBody(MultiPartFormDataContent(
                formData {
                    append("employeeId", employeeId)
                    append("photo", photo, Headers.build {
                        append(HttpHeaders.ContentType, "image/jpeg")
                    })
                }
            ))
        }.body()
    }
}
```

### Expected API Contracts

```kotlin
// Auth
POST /api/v1/auth/login → AuthResponse { accessToken, refreshToken, user }

// Users
GET  /api/v1/users → List<User>
POST /api/v1/users → User
PUT  /api/v1/users/{id} → User
DELETE /api/v1/users/{id} → Unit

// Biometric
POST /api/v1/biometric/enroll → EnrollmentResponse { jobId }
POST /api/v1/biometric/verify → VerificationResponse { match, confidence }
GET  /api/v1/biometric/enrollments/{jobId} → JobStatus { status, result }

// Dashboard
GET /api/v1/statistics → DashboardStats { totalUsers, activeUsers, ... }
```

---

## 📈 Success Criteria

### Desktop App
- ✅ Kiosk mode fully functional
- ✅ Admin dashboard shows real data
- ✅ Camera captures photos
- ✅ All CRUD operations work
- ✅ Settings persist correctly

### Android App
- ✅ Enrollment and verification work
- ✅ Camera integration successful
- ✅ App runs on Android 8.0+
- ✅ No crashes or ANRs
- ✅ 90% code shared with desktop

### iOS App
- ✅ Enrollment and verification work
- ✅ Camera integration successful
- ✅ App runs on iOS 14+
- ✅ No crashes
- ✅ 90% code shared with desktop

### Performance
- ✅ Desktop app startup < 2s
- ✅ Android app startup < 1s
- ✅ iOS app startup < 1s
- ✅ Camera preview lag < 100ms
- ✅ API calls < 1s (p95)

---

## 📅 Implementation Timeline

| Phase | Tasks | Estimated Time | Priority |
|-------|-------|----------------|----------|
| **Phase 1** | Desktop Backend Integration | 3-4 hours | 🔴 CRITICAL |
| **Phase 2** | Camera Integration | 2-3 hours | 🟠 HIGH |
| **Phase 3** | Android App | 2-3 weeks | 🟡 MEDIUM |
| **Phase 4** | iOS App | 2-3 weeks | 🟢 LOW |
| **Phase 5** | Security Tab Completion | 1-2 hours | 🟡 MEDIUM |
| **Phase 6** | Testing & Polish | 1 week | 🟡 MEDIUM |
| **Total** | | **6-8 weeks** | |

---

## 📞 Next Steps

### Immediate Actions
1. Pull latest code from repository
2. Open project in IntelliJ IDEA
3. Run desktop app: `./gradlew desktopApp:run`
4. Verify UI works in mock mode
5. Start Phase 1: Backend integration

### Development Environment Setup

```bash
# Clone repository
git clone https://github.com/Rollingcat-Software/mobile-app.git
cd mobile-app

# Open in IntelliJ IDEA
# File → Open → Select mobile-app folder

# Run desktop app
./gradlew desktopApp:run

# Build desktop installer
./gradlew desktopApp:packageDistributionForCurrentOS

# (Later) Run Android app
./gradlew androidApp:installDebug

# (Later) Open iOS app in Xcode
open iosApp/iosApp.xcodeproj
```

---

**Document Version**: 1.0
**Created**: 2025-11-17
**Last Updated**: 2025-11-17
**Owner**: Mobile/Desktop Team
**Review Date**: Weekly during implementation
