# 🧪 Complete Testing Guide - FIVUCSAS

**Platform Coverage:** Desktop (Windows/macOS/Linux), Android, iOS  
**Last Updated:** October 31, 2025

---

## 📑 Table of Contents

1. [Quick Start Testing](#quick-start-testing)
2. [Desktop App Testing](#desktop-app-testing)
3. [Android App Testing](#android-app-testing)
4. [iOS App Testing](#ios-app-testing)
5. [Unit Testing](#unit-testing)
6. [Integration Testing](#integration-testing)
7. [UI Testing](#ui-testing)
8. [Manual Testing Checklist](#manual-testing-checklist)
9. [Troubleshooting](#troubleshooting)

---

## 🚀 Quick Start Testing

### **Prerequisites:**

```powershell
# Check Java version (required: 17+)
java -version

# Check Gradle
cd mobile-app
.\gradlew.bat --version

# Check connected devices
.\gradlew.bat tasks
```

### **Run All Tests:**

```powershell
# Desktop + Android + iOS unit tests
.\gradlew.bat check

# Specific platform
.\gradlew.bat :desktopApp:test          # Desktop
.\gradlew.bat :androidApp:testDebug     # Android
.\gradlew.bat :iosApp:iosSimulatorArm64Test  # iOS
```

---

## 🖥️ Desktop App Testing

### **Method 1: Run from Command Line**

```powershell
cd mobile-app

# Run the desktop app
.\gradlew.bat :desktopApp:run

# Run with specific JVM arguments
.\gradlew.bat :desktopApp:run -Dorg.gradle.jvmargs="-Xmx2g"
```

### **Method 2: Build and Run Executable**

```powershell
# Create distribution
.\gradlew.bat :desktopApp:createDistributable

# Executable will be at:
# mobile-app\desktopApp\build\compose\binaries\main\app\

# Run it
cd desktopApp\build\compose\binaries\main\app\FIVUCSAS\bin
.\FIVUCSAS.bat
```

### **Method 3: Run from IntelliJ IDEA**

1. Open `mobile-app` folder in IntelliJ IDEA
2. Navigate to `desktopApp/src/desktopMain/kotlin/Main.kt`
3. Click the green play button next to `fun main()`
4. Or right-click → Run 'MainKt'

### **Desktop Test Checklist:**

```
Manual Testing:
□ App launches successfully
□ Window displays at correct size (1200x800)
□ System tray icon appears
□ All three modes are clickable:
  □ Kiosk Mode
  □ Admin Dashboard
  □ Mobile App Viewer

Kiosk Mode:
□ Welcome screen displays
□ "New User Enrollment" button works
□ "Identity Verification" button works
□ Enrollment form accepts input
□ Email validation works
□ Required field validation works
□ Back button returns to welcome
□ Verification puzzle displays

Admin Dashboard:
□ Dashboard loads
□ All 4 tabs accessible (Users, Analytics, Security, Settings)
□ User search works
□ User table displays sample data
□ Statistics cards show correct numbers
□ Edit/Delete buttons visible
□ Navigation rail works
□ Back button returns to launcher

Performance:
□ App responds within 1 second
□ No UI freezing
□ Smooth animations
□ Window resizes properly
```

### **Desktop Unit Tests:**

```powershell
# Run unit tests
.\gradlew.bat :desktopApp:test

# Run with coverage
.\gradlew.bat :desktopApp:test jacocoTestReport

# View test results
start desktopApp\build\reports\tests\test\index.html
```

---

## 📱 Android App Testing

### **Prerequisites:**

```powershell
# Install Android SDK and set ANDROID_HOME
# Example: C:\Users\YourName\AppData\Local\Android\Sdk

# List available Android Virtual Devices
emulator -list-avds

# Start an emulator
emulator -avd Pixel_5_API_33
```

### **Method 1: Run on Emulator**

```powershell
cd mobile-app

# Build and install
.\gradlew.bat :androidApp:installDebug

# Or build + run
.\gradlew.bat :androidApp:assembleDebug
adb install androidApp\build\outputs\apk\debug\androidApp-debug.apk

# Check logcat
adb logcat | findstr "FIVUCSAS"
```

### **Method 2: Run on Physical Device**

```powershell
# Enable USB debugging on phone
# Connect via USB

# Check device is connected
adb devices

# Install and run
.\gradlew.bat :androidApp:installDebug

# Launch app
adb shell am start -n com.fivucsas.android/.MainActivity
```

### **Method 3: Run from Android Studio**

1. Open `mobile-app` folder in Android Studio
2. Select `androidApp` module
3. Select device/emulator from dropdown
4. Click Run (green play button)
5. Or: Run → Run 'androidApp'

### **Android Test Checklist:**

```
Installation:
□ APK installs without errors
□ App icon appears in launcher
□ App name shows as "FIVUCSAS"

Basic Functionality:
□ App launches
□ Camera permission requested
□ Main screen displays
□ Navigation works
□ Shared code works

UI Testing:
□ Compose UI renders correctly
□ Touch interactions work
□ Keyboard input works
□ Screen rotation works
□ Dark/Light theme works

Performance:
□ Smooth 60 FPS
□ No ANR (Application Not Responding)
□ Memory usage < 100MB
□ Battery drain acceptable
```

### **Android Unit Tests:**

```powershell
# Unit tests (JVM)
.\gradlew.bat :androidApp:testDebugUnitTest

# Instrumented tests (Device/Emulator)
.\gradlew.bat :androidApp:connectedDebugAndroidTest

# View results
start androidApp\build\reports\tests\testDebugUnitTest\index.html
```

### **Android UI Tests:**

```powershell
# Run Compose UI tests
.\gradlew.bat :androidApp:connectedDebugAndroidTest

# Run specific test class
.\gradlew.bat :androidApp:connectedDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=com.fivucsas.ExampleInstrumentedTest
```

---

## 🍎 iOS App Testing

### **Prerequisites (macOS only):**

```bash
# Install Xcode from App Store
# Install Xcode Command Line Tools
xcode-select --install

# Check iOS simulators
xcrun simctl list devices

# Boot a simulator
xcrun simctl boot "iPhone 14 Pro"
```

### **Method 1: Run on Simulator**

```bash
cd mobile-app

# Build for simulator
./gradlew :iosApp:iosSimulatorArm64Test

# Or use Xcode
open iosApp/iosApp.xcworkspace

# Then press Cmd+R to run
```

### **Method 2: Run on Physical Device**

```bash
# Connect iPhone via USB
# Trust computer on device

# Open in Xcode
open iosApp/iosApp.xcworkspace

# Select your device
# Set Team in Signing & Capabilities
# Click Run (Cmd+R)
```

### **iOS Test Checklist:**

```
Installation:
□ App builds successfully
□ Code signing works
□ App installs on device/simulator

Basic Functionality:
□ App launches
□ Camera permission requested
□ Shared code works
□ Navigation works

UI Testing:
□ Compose UI renders correctly
□ Touch interactions work
□ Keyboard input works
□ Safe area respected
□ Dark mode works

Performance:
□ Smooth 60 FPS
□ Memory usage < 100MB
□ No crashes
□ Battery efficient
```

### **iOS Unit Tests:**

```bash
# Run iOS tests
./gradlew :iosApp:iosSimulatorArm64Test

# Or in Xcode
# Product → Test (Cmd+U)
```

---

## 🧪 Unit Testing

### **Create Unit Tests:**

Create `desktopApp/src/desktopTest/kotlin/ViewModelTest.kt`:

```kotlin
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.test.runTest

class KioskViewModelTest {
    
    @Test
    fun `initial state is WELCOME screen`() = runTest {
        val viewModel = KioskViewModel()
        assertEquals(KioskScreen.WELCOME, viewModel.currentScreen.first())
    }
    
    @Test
    fun `updateFullName updates enrollment data`() = runTest {
        val viewModel = KioskViewModel()
        viewModel.updateFullName("John Doe")
        assertEquals("John Doe", viewModel.enrollmentData.first().fullName)
    }
    
    @Test
    fun `validateEnrollment returns false when fields empty`() {
        val viewModel = KioskViewModel()
        assertTrue(!viewModel.validateEnrollment())
    }
    
    @Test
    fun `validateEnrollment returns true when all fields filled`() = runTest {
        val viewModel = KioskViewModel()
        viewModel.updateFullName("John Doe")
        viewModel.updateEmail("john@example.com")
        viewModel.updateIdNumber("12345")
        assertTrue(viewModel.validateEnrollment())
    }
    
    @Test
    fun `navigateToEnroll changes screen to ENROLL`() = runTest {
        val viewModel = KioskViewModel()
        viewModel.navigateToEnroll()
        assertEquals(KioskScreen.ENROLL, viewModel.currentScreen.first())
    }
}

class AdminViewModelTest {
    
    @Test
    fun `search filters users correctly`() = runTest {
        val viewModel = AdminViewModel()
        viewModel.updateSearchQuery("Ahmet")
        val filtered = viewModel.getFilteredUsers()
        assertTrue(filtered.any { it.name.contains("Ahmet") })
    }
    
    @Test
    fun `deleteUser removes user from list`() = runTest {
        val viewModel = AdminViewModel()
        val initialCount = viewModel.users.first().size
        viewModel.deleteUser("1")
        val newCount = viewModel.users.first().size
        assertEquals(initialCount - 1, newCount)
    }
    
    @Test
    fun `statistics update when user deleted`() = runTest {
        val viewModel = AdminViewModel()
        val initialTotal = viewModel.statistics.first().totalUsers
        viewModel.deleteUser("1")
        val newTotal = viewModel.statistics.first().totalUsers
        assertEquals(initialTotal - 1, newTotal)
    }
}

class AppStateManagerTest {
    
    @Test
    fun `initial mode is LAUNCHER`() = runTest {
        val manager = AppStateManager()
        assertEquals(AppMode.LAUNCHER, manager.currentMode.first())
    }
    
    @Test
    fun `navigateToKiosk changes mode`() = runTest {
        val manager = AppStateManager()
        manager.navigateToKiosk()
        assertEquals(AppMode.KIOSK, manager.currentMode.first())
    }
    
    @Test
    fun `navigateBack returns to LAUNCHER`() = runTest {
        val manager = AppStateManager()
        manager.navigateToAdmin()
        manager.navigateBack()
        assertEquals(AppMode.LAUNCHER, manager.currentMode.first())
    }
}
```

### **Add Test Dependencies:**

In `desktopApp/build.gradle.kts`:

```kotlin
kotlin {
    jvm("desktop") {
        testRuns["test"].executionTask.configure {
            useJUnitPlatform()
        }
    }
    
    sourceSets {
        val desktopTest by getting {
            dependencies {
                implementation(kotlin("test"))
                implementation("org.jetbrains.kotlinx:kotlinx-coroutines-test:1.7.3")
                implementation("app.cash.turbine:turbine:1.0.0")
            }
        }
    }
}
```

### **Run Unit Tests:**

```powershell
# Run all tests
.\gradlew.bat test

# Run specific platform
.\gradlew.bat :desktopApp:test
.\gradlew.bat :androidApp:testDebugUnitTest
.\gradlew.bat :iosApp:iosSimulatorArm64Test

# With coverage
.\gradlew.bat test jacocoTestReport

# View results
start build\reports\tests\test\index.html
```

---

## 🔗 Integration Testing

### **Test API Integration:**

Create `commonMain/src/commonTest/kotlin/ApiTest.kt`:

```kotlin
import kotlin.test.Test
import kotlin.test.assertTrue
import kotlinx.coroutines.test.runTest

class BiometricApiTest {
    
    @Test
    fun `enrollment request creates valid payload`() {
        val data = EnrollmentData(
            fullName = "John Doe",
            email = "john@example.com",
            idNumber = "12345"
        )
        
        assertTrue(data.fullName.isNotBlank())
        assertTrue(data.email.contains("@"))
        assertTrue(data.idNumber.isNotBlank())
    }
    
    @Test
    fun `user model serializes correctly`() {
        val user = User(
            id = "1",
            name = "John",
            email = "john@test.com",
            idNumber = "123",
            status = UserStatus.ACTIVE
        )
        
        assertTrue(user.id.isNotEmpty())
        assertTrue(user.status == UserStatus.ACTIVE)
    }
}
```

---

## 🎨 UI Testing

### **Compose UI Tests (Desktop):**

Create `desktopApp/src/desktopTest/kotlin/UiTest.kt`:

```kotlin
import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createComposeRule
import org.junit.Rule
import org.junit.Test

class KioskModeUiTest {
    
    @get:Rule
    val composeTestRule = createComposeRule()
    
    @Test
    fun `welcome screen displays correctly`() {
        composeTestRule.setContent {
            WelcomeScreen(
                onEnroll = {},
                onVerify = {}
            )
        }
        
        composeTestRule.onNodeWithText("Welcome to FIVUCSAS").assertExists()
        composeTestRule.onNodeWithText("New User Enrollment").assertExists()
        composeTestRule.onNodeWithText("Identity Verification").assertExists()
    }
    
    @Test
    fun `enrollment form validates required fields`() {
        val viewModel = KioskViewModel()
        
        composeTestRule.setContent {
            EnrollScreen(
                viewModel = viewModel,
                onBack = {}
            )
        }
        
        // Find and assert button is disabled
        composeTestRule.onNodeWithText("Start Enrollment")
            .assertIsNotEnabled()
    }
    
    @Test
    fun `clicking enroll button navigates to enroll screen`() {
        var enrollClicked = false
        
        composeTestRule.setContent {
            WelcomeScreen(
                onEnroll = { enrollClicked = true },
                onVerify = {}
            )
        }
        
        composeTestRule.onNodeWithText("New User Enrollment").performClick()
        assert(enrollClicked)
    }
}
```

### **Android UI Tests:**

Create `androidApp/src/androidTest/kotlin/ExampleInstrumentedTest.kt`:

```kotlin
import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.test.ext.junit.runners.AndroidJUnit4
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class MainActivityTest {
    
    @get:Rule
    val composeTestRule = createAndroidComposeRule<MainActivity>()
    
    @Test
    fun appLaunches() {
        composeTestRule.onNodeWithText("FIVUCSAS").assertExists()
    }
}
```

---

## ✅ Manual Testing Checklist

### **Desktop Application:**

```
[ ] Launch & Initialization
    [ ] App starts in < 3 seconds
    [ ] No crash on startup
    [ ] Window appears centered
    [ ] System tray icon visible

[ ] Launcher Screen
    [ ] Logo displays
    [ ] Three mode cards visible
    [ ] Hover effects work
    [ ] Click navigates correctly

[ ] Kiosk Mode
    [ ] Welcome screen loads
    [ ] Buttons are clickable
    [ ] Enrollment form accepts input
    [ ] Validation shows errors
    [ ] Back button works
    [ ] Camera placeholder shows

[ ] Admin Dashboard
    [ ] Loads within 2 seconds
    [ ] All tabs accessible
    [ ] User table displays data
    [ ] Search filters correctly
    [ ] Delete removes user
    [ ] Statistics update
    [ ] Export/filter buttons visible

[ ] Performance
    [ ] No UI lag
    [ ] Smooth animations
    [ ] Memory usage < 500MB
    [ ] CPU usage < 30%

[ ] Edge Cases
    [ ] Window resize works
    [ ] Minimize/maximize works
    [ ] System tray functions
    [ ] Multiple instances handled
```

### **Android Application:**

```
[ ] Installation
    [ ] APK installs successfully
    [ ] Permissions requested
    [ ] Icon in launcher

[ ] Functionality
    [ ] App opens
    [ ] Camera works
    [ ] Shared code executes
    [ ] Navigation works

[ ] Compatibility
    [ ] Works on Android 8+
    [ ] Works on different screen sizes
    [ ] Rotation handled

[ ] Performance
    [ ] No ANR errors
    [ ] Smooth 60 FPS
    [ ] Low battery drain
```

### **iOS Application:**

```
[ ] Installation
    [ ] Builds successfully
    [ ] Code signing works
    [ ] Launches on device

[ ] Functionality
    [ ] App opens
    [ ] Camera permission works
    [ ] Shared code executes

[ ] Compatibility
    [ ] Works on iOS 14+
    [ ] iPhone and iPad
    [ ] Dark mode

[ ] Performance
    [ ] No crashes
    [ ] Smooth 60 FPS
    [ ] Memory efficient
```

---

## 🔧 Troubleshooting

### **Desktop Issues:**

**Problem: App won't start**
```powershell
# Check Java version
java -version  # Should be 17+

# Clean and rebuild
.\gradlew.bat clean
.\gradlew.bat :desktopApp:run
```

**Problem: Window doesn't appear**
```kotlin
// Check Main.kt has:
window(
    state = rememberWindowState(
        position = WindowPosition(Alignment.Center),
        size = DpSize(1200.dp, 800.dp)
    ),
    // ...
)
```

**Problem: Tests fail**
```powershell
# Check test dependencies
.\gradlew.bat dependencies

# Run with stack trace
.\gradlew.bat :desktopApp:test --stacktrace
```

### **Android Issues:**

**Problem: Build fails**
```powershell
# Sync Gradle
.\gradlew.bat --refresh-dependencies

# Check ANDROID_HOME
echo %ANDROID_HOME%

# Clean build
.\gradlew.bat clean
.\gradlew.bat :androidApp:assembleDebug
```

**Problem: Device not detected**
```powershell
# Check ADB
adb devices

# Restart ADB
adb kill-server
adb start-server
```

**Problem: App crashes**
```powershell
# Check logs
adb logcat | findstr "AndroidRuntime"

# Check memory
adb shell dumpsys meminfo com.fivucsas.android
```

### **iOS Issues:**

**Problem: Build fails on macOS**
```bash
# Update pods
cd iosApp
pod install
pod update

# Clean build folder
rm -rf build
./gradlew clean
```

**Problem: Code signing**
```
1. Open iosApp.xcworkspace in Xcode
2. Select project → Signing & Capabilities
3. Select your Team
4. Check "Automatically manage signing"
```

---

## 📊 Test Coverage

### **Generate Coverage Report:**

```powershell
# Desktop
.\gradlew.bat :desktopApp:test jacocoTestReport
start desktopApp\build\reports\jacoco\test\html\index.html

# Android
.\gradlew.bat :androidApp:testDebugUnitTest jacocoTestReport
start androidApp\build\reports\jacoco\testDebugUnitTest\html\index.html
```

### **Coverage Goals:**

- **ViewModels:** 80%+ coverage
- **Business Logic:** 90%+ coverage
- **UI Components:** 60%+ coverage (harder to test)
- **Overall:** 75%+ coverage

---

## 🚀 Continuous Integration

### **GitHub Actions Example:**

Create `.github/workflows/test.yml`:

```yaml
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Set up JDK 17
        uses: actions/setup-java@v3
        with:
          java-version: '17'
          distribution: 'temurin'
      
      - name: Run Desktop Tests
        run: |
          cd mobile-app
          ./gradlew :desktopApp:test
      
      - name: Run Android Tests
        run: |
          cd mobile-app
          ./gradlew :androidApp:testDebugUnitTest
      
      - name: Upload Test Results
        uses: actions/upload-artifact@v3
        with:
          name: test-results
          path: mobile-app/*/build/reports/tests/
```

---

## ✅ Summary

### **Quick Commands:**

```powershell
# Run desktop app
cd mobile-app && .\gradlew.bat :desktopApp:run

# Test desktop
.\gradlew.bat :desktopApp:test

# Build Android APK
.\gradlew.bat :androidApp:assembleDebug

# Install on device
adb install androidApp\build\outputs\apk\debug\androidApp-debug.apk

# Run all tests
.\gradlew.bat check
```

### **Next Steps:**

1. ✅ Run desktop app and test manually
2. ✅ Create unit tests for ViewModels
3. ✅ Test on Android emulator
4. ✅ Set up CI/CD pipeline
5. ✅ Achieve 75%+ test coverage

---

**Happy Testing! 🧪**

For questions or issues, check the troubleshooting section or create an issue on GitHub.
