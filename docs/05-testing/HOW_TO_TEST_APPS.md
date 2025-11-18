# FIVUCSAS - Quick Testing Guide

## How to Run the Applications

### Prerequisites
- ✅ Kotlin 1.9.22 installed
- ✅ Gradle 8.14.3
- ✅ JDK 21+ (for desktop)
- ✅ JDK 11+ (for Android)
- ✅ Android SDK (for Android app)

---

## 1. Desktop Application

### Method 1: Direct Run (Recommended)
```bash
cd mobile-app
./gradlew.bat :desktopApp:run --no-daemon
```

### Method 2: Build & Execute
```bash
cd mobile-app
./gradlew.bat :desktopApp:packageDistributionForCurrentOS

# Then navigate to:
cd desktopApp\build\compose\binaries\main\app\FIVUCSAS
# Run the executable
```

### Method 3: IntelliJ IDEA
```
1. Open mobile-app in IntelliJ IDEA
2. Navigate to desktopApp/src/desktopMain/kotlin/com/fivucsas/desktop/Main.kt
3. Right-click > Run 'MainKt'
```

**What You'll See:**
- Launcher screen with two options:
  - Kiosk Mode (self-service enrollment/verification)
  - Admin Dashboard (management interface)
- Click either to test navigation

---

## 2. Android Application

### Method 1: Android Studio
```
1. Open mobile-app in Android Studio
2. Select 'androidApp' configuration
3. Choose emulator or connected device
4. Click Run ▶️
```

### Method 2: Command Line (Emulator)
```bash
cd mobile-app

# Build and install
./gradlew.bat :androidApp:installDebug

# Launch
adb shell am start -n com.fivucsas.mobile/.MainActivity
```

### Method 3: Physical Device
```bash
# Enable USB Debugging on device:
# Settings > About Phone > Tap "Build Number" 7 times
# Settings > Developer Options > Enable USB Debugging

# Connect via USB
adb devices

# Install
./gradlew.bat :androidApp:installDebug
```

**What You'll See:**
- Login screen
- Registration flow
- Home dashboard (after login)
- Biometric enrollment/verification screens

---

## 3. Test Full System (With Backend)

### Step 1: Start Backend Services

**Terminal 1 - Identity Core API**
```bash
cd identity-core-api
./gradlew.bat bootRun
# Should start on http://localhost:8080
```

**Terminal 2 - Biometric Processor API**
```bash
cd biometric-processor

# Activate virtual environment
venv\Scripts\activate   # Windows
# OR
source venv/bin/activate  # Linux/Mac

# Start server
uvicorn app.main:app --reload --port 8001
# Should start on http://localhost:8001
```

**Terminal 3 - PostgreSQL** (if not using Docker)
```bash
docker-compose up -d postgres
# OR
# Start your local PostgreSQL instance
```

### Step 2: Configure Mobile App

**For Android Emulator:**
```kotlin
// Already configured in ApiClient.kt
baseUrl = "http://10.0.2.2:8080/api/v1"  // Points to host's localhost
```

**For Physical Android Device:**
```kotlin
// Find your computer's IP address:
// Windows: ipconfig
// Linux/Mac: ifconfig

// Update ApiClient.kt:
baseUrl = "http://192.168.1.XXX:8080/api/v1"  // Replace with your IP
```

**For Desktop:**
```kotlin
// Already works with:
baseUrl = "http://localhost:8080/api/v1"
```

### Step 3: Test User Flow

1. **Register New User**
   - Open mobile/desktop app
   - Click "Register"
   - Fill in:
     - Email: test@test.com
     - Password: Test123!
     - First Name: Test
     - Last Name: User
   - Click "Register"
   - Should see success and navigate to home

2. **Login**
   - Enter credentials
   - Click "Login"
   - Should see home screen

3. **Enroll Biometric**
   - Click "Enroll Face"
   - Grant camera permission
   - Capture face photo
   - Should see success message

4. **Verify Biometric**
   - Click "Verify Face"
   - Capture face photo
   - Should see verification result

---

## 4. Build for Production

### Android APK
```bash
cd mobile-app
./gradlew.bat :androidApp:assembleRelease

# APK location:
# androidApp\build\outputs\apk\release\androidApp-release-unsigned.apk
```

### Android App Bundle (for Play Store)
```bash
./gradlew.bat :androidApp:bundleRelease

# AAB location:
# androidApp\build\outputs\bundle\release\androidApp-release.aab
```

### Desktop Executable
```bash
./gradlew.bat :desktopApp:packageDistributionForCurrentOS

# Output location:
# desktopApp\build\compose\binaries\main\app\
```

---

## 5. Testing Without Backend (Mock Mode)

### Option 1: Use Mock Repository

Create `MockAuthRepository.kt`:
```kotlin
class MockAuthRepository : AuthRepository {
    override suspend fun login(email: String, password: String): Result<Pair<User, AuthToken>> {
        delay(1000)  // Simulate network delay
        return Result.success(
            Pair(
                User("123", email, "Test", "User", false, Clock.System.now()),
                AuthToken("mock-token-12345", "Bearer")
            )
        )
    }
    
    // Implement other methods...
}

// In AppDependencies:
val authRepository = if (BuildConfig.DEBUG) {
    MockAuthRepository()
} else {
    AuthRepositoryImpl(apiClient, tokenStorage)
}
```

### Option 2: Use Local JSON Server

```bash
npm install -g json-server

# Create db.json with mock data
json-server --watch db.json --port 8080
```

---

## 6. Troubleshooting

### Issue: Build fails with Kotlin version error
**Solution:** Already fixed! Kotlin 1.9.22 + Compose 1.6.0

### Issue: Cannot run on iOS
**Cause:** iOS requires macOS  
**Solution:** Build shared framework only:
```bash
./gradlew.bat :shared:linkDebugFrameworkIosSimulatorArm64
```

### Issue: Android app crashes on start
**Causes:**
1. Backend not running
2. Network permissions missing
3. Incorrect API URL

**Solutions:**
```xml
<!-- Add to AndroidManifest.xml -->
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.CAMERA" />
```

### Issue: Gradle build is slow
**Solutions:**
```bash
# Enable Gradle daemon and parallel builds
# (Already configured in gradle.properties)

# Clear Gradle cache
./gradlew.bat clean --no-daemon

# Increase memory
# Add to gradle.properties:
org.gradle.jvmargs=-Xmx4g
```

---

## 7. Quick Commands Reference

```bash
# Clean build
./gradlew.bat clean

# Build all modules
./gradlew.bat build

# Run desktop app
./gradlew.bat :desktopApp:run

# Install Android app
./gradlew.bat :androidApp:installDebug

# Run tests
./gradlew.bat test

# Check code quality
./gradlew.bat ktlintCheck

# Format code
./gradlew.bat ktlintFormat

# List all tasks
./gradlew.bat tasks

# Build without running tests (faster)
./gradlew.bat build -x test
```

---

## 8. Performance Tips

### Faster Builds
```bash
# Use build cache
./gradlew.bat --build-cache build

# Parallel execution (already enabled)
./gradlew.bat --parallel build

# Configure only what's needed
./gradlew.bat :androidApp:assembleDebug
```

### Faster Development
```bash
# Use continuous build
./gradlew.bat -t :androidApp:assembleDebug

# Enable Kotlin incremental compilation (already enabled)
# In gradle.properties:
kotlin.incremental=true
```

---

## 9. IDE Configuration

### IntelliJ IDEA / Android Studio

**Recommended Settings:**
```
Preferences > Build, Execution, Deployment > Build Tools > Gradle
- Build and run using: Gradle
- Run tests using: Gradle
- Gradle JVM: JDK 21

Preferences > Editor > Code Style > Kotlin
- Import ktlint code style (if available)
- Set from: Kotlin style guide

Preferences > Plugins
- Install: Kotlin Multiplatform Mobile
```

---

## 10. What's Working vs What's Not

### ✅ Currently Working
- [x] Build system (Android, Desktop)
- [x] User registration flow (UI)
- [x] Login flow (UI)
- [x] Navigation
- [x] State management
- [x] API client structure
- [x] Repository pattern
- [x] Use cases
- [x] ViewModels
- [x] Theme and styling

### ⚠️ Partially Working
- [~] Backend integration (needs backend running)
- [~] Token storage (Android only)
- [~] Error handling (structure exists, needs mapping)

### ❌ Not Yet Implemented
- [ ] Camera integration
- [ ] Biometric puzzle/liveness detection
- [ ] Face recognition integration
- [ ] iOS UI (SwiftUI wrapper)
- [ ] Offline support
- [ ] Unit tests
- [ ] Integration tests
- [ ] Dependency injection framework (Koin)

---

## Summary

**To test immediately without backend:**
```bash
cd mobile-app

# Desktop
./gradlew.bat :desktopApp:run

# Android (Android Studio)
# Open project > Select androidApp config > Run
```

**To test with full system:**
```bash
# Terminal 1
cd identity-core-api && ./gradlew.bat bootRun

# Terminal 2
cd biometric-processor && venv\Scripts\activate && uvicorn app.main:app --reload --port 8001

# Terminal 3
cd mobile-app && ./gradlew.bat :desktopApp:run
```

**Current Build Status:** ✅ **SUCCESS**  
**Next Steps:** Implement biometric features and DI framework  
**Time to First Run:** < 5 minutes

---

*Last Updated: 2025-10-31*
