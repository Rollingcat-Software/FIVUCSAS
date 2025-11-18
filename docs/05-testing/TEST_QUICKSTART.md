# FIVUCSAS - Quick Start Testing Guide

**Last Updated**: October 31, 2025  
**Build Status**: ✅ SUCCESS

---

## ⚡ Super Quick Start (1 Minute)

### Test Desktop App NOW
```bash
cd C:\Users\ahabg\OneDrive\Belgeler\GitHub\FIVUCSAS\mobile-app
.\gradlew.bat :desktopApp:run --no-daemon
```

**Expected Result**:
- Window opens showing "FIVUCSAS" launcher
- Two cards: "Kiosk Mode" and "Admin Dashboard"
- Click either to test navigation
- Press ESC or close window to exit

---

## 🤖 Test Android App

### Method 1: Using Android Studio (Easiest)
```
1. Open Android Studio
2. File > Open > Select C:\Users\ahabg\OneDrive\Belgeler\GitHub\FIVUCSAS\mobile-app
3. Wait for Gradle sync
4. Select "androidApp" from run configurations dropdown
5. Click Run ▶️ button
6. Choose emulator or device
```

### Method 2: Command Line (If emulator already running)
```bash
cd C:\Users\ahabg\OneDrive\Belgeler\GitHub\FIVUCSAS\mobile-app
.\gradlew.bat :androidApp:installDebug
adb shell am start -n com.fivucsas.mobile/.MainActivity
```

### Method 3: Physical Device
```bash
# 1. Enable USB Debugging on phone:
#    Settings > About Phone > Tap "Build Number" 7 times
#    Settings > Developer Options > Enable "USB Debugging"

# 2. Connect phone via USB

# 3. Verify connection
adb devices

# 4. Install and run
cd C:\Users\ahabg\OneDrive\Belgeler\GitHub\FIVUCSAS\mobile-app
.\gradlew.bat :androidApp:installDebug
```

**Expected Result**:
- App installs successfully
- Login screen appears
- Navigation to Register screen works
- Input validation works

---

## 🏗️ Build APK for Distribution

### Debug APK (for testing)
```bash
cd C:\Users\ahabg\OneDrive\Belgeler\GitHub\FIVUCSAS\mobile-app
.\gradlew.bat :androidApp:assembleDebug
```

**Output**: `mobile-app\androidApp\build\outputs\apk\debug\androidApp-debug.apk`

### Release APK (for production)
```bash
.\gradlew.bat :androidApp:assembleRelease
```

**Output**: `mobile-app\androidApp\build\outputs\apk\release\androidApp-release-unsigned.apk`

---

## 🖥️ Build Desktop Executable

```bash
cd C:\Users\ahabg\OneDrive\Belgeler\GitHub\FIVUCSAS\mobile-app
.\gradlew.bat :desktopApp:packageDistributionForCurrentOS
```

**Output**: `mobile-app\desktopApp\build\compose\binaries\main\app\FIVUCSAS\`

**To Run**:
```bash
cd desktopApp\build\compose\binaries\main\app\FIVUCSAS
.\FIVUCSAS.exe
```

---

## 🔧 Testing With Backend APIs

### Step 1: Verify Backend Services

**Check Identity Core API**:
```bash
cd C:\Users\ahabg\OneDrive\Belgeler\GitHub\FIVUCSAS\identity-core-api

# Check if it has proper structure
dir src\main\java

# Try to build
.\gradlew.bat build
```

**Check Biometric Processor API**:
```bash
cd C:\Users\ahabg\OneDrive\Belgeler\GitHub\FIVUCSAS\biometric-processor

# Check structure
dir app

# Check requirements
type requirements.txt

# Try to run
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 8001
```

### Step 2: Start Backend Services

**Terminal 1 - Identity Core API**:
```bash
cd C:\Users\ahabg\OneDrive\Belgeler\GitHub\FIVUCSAS\identity-core-api
.\gradlew.bat bootRun
```
Should start on: http://localhost:8080

**Terminal 2 - Biometric Processor**:
```bash
cd C:\Users\ahabg\OneDrive\Belgeler\GitHub\FIVUCSAS\biometric-processor

# Activate virtual environment
.\venv\Scripts\activate

# Start server
python -m uvicorn app.main:app --reload --port 8001
```
Should start on: http://localhost:8001

**Terminal 3 - PostgreSQL** (if needed):
```bash
cd C:\Users\ahabg\OneDrive\Belgeler\GitHub\FIVUCSAS
docker-compose up -d postgres
```

### Step 3: Test API Endpoints

**Test Identity API**:
```bash
# Health check
curl http://localhost:8080/actuator/health

# Register user
curl -X POST http://localhost:8080/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"test@test.com\",\"password\":\"Test123!\",\"firstName\":\"Test\",\"lastName\":\"User\"}"

# Login
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"test@test.com\",\"password\":\"Test123!\"}"
```

**Test Biometric API**:
```bash
# Health check
curl http://localhost:8001/health

# Enroll face (requires image file)
curl -X POST http://localhost:8001/api/v1/biometric/enroll/USER_ID \
  -F "image=@path/to/face.jpg"
```

### Step 4: Configure Mobile App

**For Android Emulator**:
Already configured in `ApiClient.kt`:
```kotlin
baseUrl = "http://10.0.2.2:8080/api/v1"  // ✅ Points to host's localhost
```

**For Physical Android Device**:
1. Find your computer's IP:
```bash
ipconfig  # Look for IPv4 Address
```

2. Update `ApiClient.kt`:
```kotlin
baseUrl = "http://192.168.1.XXX:8080/api/v1"  // Replace XXX with your IP
```

**For Desktop**:
Already works:
```kotlin
baseUrl = "http://localhost:8080/api/v1"  // ✅
```

### Step 5: End-to-End Test

1. **Start all backend services** (see Step 2)
2. **Run desktop or Android app**
3. **Test Registration**:
   - Click "Register"
   - Fill: email, password, first name, last name
   - Click "Register"
   - Should succeed and navigate to home

4. **Test Login**:
   - Enter same credentials
   - Click "Login"
   - Should navigate to home screen

5. **Test Biometric Enrollment** (when implemented):
   - Click "Enroll Face"
   - Grant camera permission
   - Capture face
   - Should see success

---

## 🐛 Troubleshooting

### Build Fails

**Problem**: Gradle sync fails or build errors

**Solution**:
```bash
# Clean and rebuild
cd mobile-app
.\gradlew.bat clean
.\gradlew.bat build --no-daemon
```

### Android App Crashes

**Problem**: App crashes on startup

**Solutions**:
1. Check AndroidManifest.xml has Internet permission
2. Verify backend is running (if testing with backend)
3. Check logcat for errors:
```bash
adb logcat | findstr "fivucsas"
```

### Desktop App Won't Start

**Problem**: Desktop app doesn't launch

**Solutions**:
1. Ensure JDK 21+ is installed
2. Try running with more verbose output:
```bash
.\gradlew.bat :desktopApp:run --info --no-daemon
```

### Gradle Daemon Issues

**Problem**: Gradle is slow or hanging

**Solution**:
```bash
# Stop all Gradle daemons
.\gradlew.bat --stop

# Run without daemon
.\gradlew.bat :desktopApp:run --no-daemon
```

### Connection to Backend Fails

**Problem**: Mobile app can't reach backend

**Solutions**:

For **Android Emulator**:
- Use `10.0.2.2` (not `localhost`)
- Verify backend is running on host

For **Physical Device**:
- Ensure phone and computer on same WiFi
- Use computer's IP address
- Check firewall allows connections on port 8080

For **Desktop**:
- Should work with `localhost`
- Verify backend is running

Test connection:
```bash
# From desktop
curl http://localhost:8080/actuator/health

# From Android emulator
adb shell
curl http://10.0.2.2:8080/actuator/health
```

---

## 📊 Verify Everything Works

### Checklist - Desktop App
- [ ] App window opens
- [ ] Launcher screen shows two mode cards
- [ ] Clicking "Kiosk Mode" navigates to kiosk screen
- [ ] Clicking "Admin Dashboard" navigates to admin screen
- [ ] Back button returns to launcher
- [ ] Window can be closed

### Checklist - Android App
- [ ] App installs without errors
- [ ] Login screen displays correctly
- [ ] Register button navigates to registration
- [ ] Input validation shows error messages
- [ ] Email validation works
- [ ] Password validation works
- [ ] Theme looks good (Material 3)

### Checklist - Backend Integration
- [ ] Identity Core API starts successfully
- [ ] Biometric Processor starts successfully
- [ ] Health endpoints respond
- [ ] Registration endpoint works
- [ ] Login endpoint works
- [ ] Mobile app can connect to backend
- [ ] Successful registration shows in database
- [ ] Login with registered credentials succeeds

---

## 📈 Performance Benchmarks

### Build Times (Your Machine)
- Clean build: ~4 minutes
- Incremental build: ~30 seconds
- Desktop app startup: ~10 seconds
- Android app install: ~20 seconds

### App Sizes
- Android Debug APK: ~15 MB
- Android Release APK: ~10 MB (with ProGuard)
- Desktop JAR: ~50 MB

---

## 🚀 What Works Right Now

### ✅ Fully Functional
- [x] Desktop app launches and runs
- [x] Android app installs and runs
- [x] Navigation between screens
- [x] Input validation
- [x] State management
- [x] Theme and styling
- [x] Repository pattern
- [x] Use cases
- [x] ViewModels

### ⏳ Partially Functional (UI Only)
- [~] User registration (no backend)
- [~] User login (no backend)
- [~] Biometric enrollment (no camera)
- [~] Face verification (no camera)

### ❌ Not Yet Working
- [ ] Camera access
- [ ] Face detection
- [ ] Liveness detection
- [ ] Backend integration
- [ ] Offline storage
- [ ] iOS app UI

---

## 💡 Tips for Best Experience

### For Development
1. Use **IntelliJ IDEA Ultimate** or **Android Studio** for best KMP support
2. Enable **Kotlin incremental compilation** (already enabled in gradle.properties)
3. Use **--no-daemon** for one-off runs to avoid memory issues
4. Keep **Gradle cache** enabled for faster builds

### For Testing
1. **Desktop app** is fastest to test - use it for UI development
2. **Android emulator** is slower - use physical device when possible
3. Test **backend separately** before integration testing
4. Use **mock repositories** for UI development without backend

### For Performance
1. Build only what you need: `.\gradlew.bat :desktopApp:run` not `.\gradlew.bat run`
2. Use **build cache**: `.\gradlew.bat --build-cache build`
3. Increase **Gradle memory** if builds are slow (already set to 2GB)

---

## 📞 Quick Command Reference

```bash
# Project root
cd C:\Users\ahabg\OneDrive\Belgeler\GitHub\FIVUCSAS

# Mobile app
cd mobile-app

# Backend
cd identity-core-api          # Spring Boot
cd biometric-processor        # FastAPI

# Common commands
.\gradlew.bat --version       # Check Gradle version
.\gradlew.bat tasks           # List all tasks
.\gradlew.bat clean           # Clean build
.\gradlew.bat build           # Build all
.\gradlew.bat test            # Run tests

# Desktop
.\gradlew.bat :desktopApp:run                    # Run desktop app
.\gradlew.bat :desktopApp:packageDistribution    # Build executable

# Android
.\gradlew.bat :androidApp:installDebug           # Install on device
.\gradlew.bat :androidApp:assembleDebug          # Build APK
.\gradlew.bat :androidApp:assembleRelease        # Build release APK

# Shared module
.\gradlew.bat :shared:build                      # Build shared code
.\gradlew.bat :shared:test                       # Test shared code
```

---

## ✨ Success!

If you can run the desktop app or install the Android app, **congratulations!** 🎉

You have a **working Kotlin Multiplatform project** with:
- ✅ Clean Architecture
- ✅ SOLID principles
- ✅ Modern UI with Compose
- ✅ Proper state management
- ✅ Platform abstraction

**Next steps**: See `IMPLEMENTATION_ROADMAP.md` for what to build next.

---

**Need Help?**
1. Check `PROJECT_SUMMARY.md` for overview
2. Check `HOW_TO_TEST_APPS.md` for detailed testing guide  
3. Check `ARCHITECTURE_REVIEW_AND_FIXES.md` for code quality analysis
4. Check `IMPLEMENTATION_ROADMAP.md` for next tasks

**Happy Coding!** 🚀

---

*Last Updated: 2025-10-31 | FIVUCSAS Team*
