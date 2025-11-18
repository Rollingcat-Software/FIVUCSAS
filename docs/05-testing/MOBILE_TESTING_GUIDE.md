# 📱 Testing on Real Phone - Complete Guide

**Date:** October 27, 2025  
**Goal:** Test the biometric authentication app on your real Android phone

---

## 🎯 Overview

To test on your real phone, you need to:
1. **Connect phone to same WiFi** as your computer
2. **Find your computer's IP address**
3. **Update API URLs** in mobile app
4. **Build and install** APK on phone
5. **Test** the complete flow

---

## 🔧 Setup Steps

### **Step 1: Connect Phone to Same WiFi**

1. On your phone: Settings → WiFi
2. Connect to **same WiFi network** as your computer
3. Note: Both must be on same network (not guest network)

---

### **Step 2: Find Your Computer's IP Address**

**On Windows:**

```powershell
ipconfig
```

Look for **"Wireless LAN adapter Wi-Fi"** section:
```
IPv4 Address. . . . . . . . . . . : 192.168.1.100
```

**Copy this IP address!** (Example: `192.168.1.100`)

---

### **Step 3: Update Mobile App Configuration**

Open: `mobile-app/composeApp/src/commonMain/kotlin/com/fivucsas/data/remote/ApiConfig.kt`

**Change from:**
```kotlin
object ApiConfig {
    const val BASE_URL = "http://10.0.2.2:8080"
    const val BIOMETRIC_URL = "http://10.0.2.2:8001"
}
```

**To:** (Use your actual IP address!)
```kotlin
object ApiConfig {
    const val BASE_URL = "http://192.168.1.100:8080"  // Your computer's IP
    const val BIOMETRIC_URL = "http://192.168.1.100:8001"  // Your computer's IP
}
```

---

### **Step 4: Allow Firewall Access**

Windows Firewall will block external connections by default.

**Add Firewall Rules:**

```powershell
# Allow Spring Boot (port 8080)
netsh advfirewall firewall add rule name="Spring Boot API" dir=in action=allow protocol=TCP localport=8080

# Allow FastAPI (port 8001)
netsh advfirewall firewall add rule name="FastAPI Biometric" dir=in action=allow protocol=TCP localport=8001

# Verify
netsh advfirewall firewall show rule name="Spring Boot API"
netsh advfirewall firewall show rule name="FastAPI Biometric"
```

**Or use Windows Defender Firewall GUI:**
1. Control Panel → Windows Defender Firewall → Advanced Settings
2. Inbound Rules → New Rule
3. Port → TCP → Specific local ports: 8080,8001
4. Allow the connection
5. Name: "FIVUCSAS API"

---

### **Step 5: Start Backend Services**

**Terminal 1 - Spring Boot:**
```powershell
cd C:\Users\ahabg\OneDrive\Belgeler\GitHub\FIVUCSAS\identity-core-api
.\gradlew.bat bootRun
```

**Terminal 2 - FastAPI:**
```powershell
cd C:\Users\ahabg\OneDrive\Belgeler\GitHub\FIVUCSAS\biometric-processor
.\venv\Scripts\Activate.ps1
python -m uvicorn app.main:app --host 0.0.0.0 --port 8001
```

**⚠️ Important:** Use `--host 0.0.0.0` to allow external connections!

---

### **Step 6: Test Connection from Phone**

**Before building the app, test the APIs:**

1. Open Chrome browser on your phone
2. Go to: `http://192.168.1.100:8080/swagger-ui.html`
   - Should see Swagger UI
3. Go to: `http://192.168.1.100:8001/docs`
   - Should see FastAPI docs

If these don't work, check:
- ✅ Same WiFi network?
- ✅ Correct IP address?
- ✅ Firewall rules added?
- ✅ Servers running?

---

### **Step 7: Build APK for Phone**

**In Android Studio:**

1. **Build APK:**
   ```
   Build → Build Bundle(s) / APK(s) → Build APK(s)
   ```

2. **Wait for build to complete** (~2-5 minutes)

3. **Find APK:**
   ```
   mobile-app\composeApp\build\outputs\apk\debug\composeApp-debug.apk
   ```

4. **Transfer to phone:**
   - USB cable: Copy APK to phone's Downloads folder
   - Email: Send APK to yourself
   - Cloud: Upload to Google Drive, download on phone
   - ADB: `adb install mobile-app\composeApp\build\outputs\apk\debug\composeApp-debug.apk`

---

### **Step 8: Install APK on Phone**

1. On phone, find the APK file (in Downloads)
2. Tap to install
3. If prompted: Settings → Security → Allow from this source
4. Install app

---

## 🧪 Testing on Real Phone

### **Test Flow:**

1. **Open app** on phone
2. **Register new user:**
   - Email: `yourname@example.com`
   - Password: `Test@123456`
   - First name, last name

3. **Login** with those credentials

4. **Enroll Face:**
   - Click "Enroll Face"
   - Grant camera permission
   - Point camera at your face
   - Click "Capture"
   - Wait for processing
   - Should see success message

5. **Verify Face:**
   - Click "Verify Face"
   - Point camera at your face
   - Click "Verify"
   - Should see "✓ Verified!" with confidence score

---

## 🐛 Troubleshooting

### **"Cannot connect to server"**

**Check Network:**
```powershell
# On your computer, verify IP
ipconfig

# Ping from phone's browser
# Open: http://YOUR_IP:8080/swagger-ui.html
```

**Check Firewall:**
```powershell
# Test if ports are open
netstat -an | findstr "8080"
netstat -an | findstr "8001"

# Should show: LISTENING
```

### **"Connection refused"**

- ✅ Are servers running?
- ✅ Using `--host 0.0.0.0` for FastAPI?
- ✅ Spring Boot binding to all interfaces?

**Fix Spring Boot:**

Add to `identity-core-api/src/main/resources/application.yml`:
```yaml
server:
  address: 0.0.0.0
  port: 8080
```

### **"Network request failed"**

- ✅ Check IP address in `ApiConfig.kt`
- ✅ Both devices on same WiFi?
- ✅ Computer WiFi is not "Public network"? (Change to Private)

### **Camera permission denied**

- Phone Settings → Apps → FIVUCSAS → Permissions → Camera → Allow

### **Face detection fails**

- Good lighting
- Face clearly visible
- Hold phone steady
- Look directly at camera

---

## 🚀 Alternative: Use ADB Wireless

**Connect phone wirelessly via ADB:**

```powershell
# 1. Connect phone via USB first
adb devices

# 2. Enable wireless
adb tcpip 5555

# 3. Find phone's IP (on phone: Settings → About → Status → IP)
# 4. Connect wirelessly (replace with phone's IP)
adb connect 192.168.1.101:5555

# 5. Disconnect USB cable

# 6. Install and run from Android Studio (wireless!)
```

---

## 📊 Expected Results on Real Phone

### **What Works:**

✅ User registration  
✅ User login  
✅ Camera access  
✅ Face enrollment (takes ~10-15 seconds)  
✅ Face verification (takes ~5-10 seconds)  
✅ High confidence scores (>90%)  
✅ Smooth UI  
✅ Material Design 3  

### **Performance:**

| Action | Expected Time |
|--------|--------------|
| Login | < 1 second |
| Face Enrollment | 10-15 seconds |
| Face Verification | 5-10 seconds |
| Camera Preview | Instant |

---

## 🎥 Testing Tips

### **For Best Results:**

1. **Lighting:** Good, even lighting on face
2. **Distance:** Hold phone 30-50cm from face
3. **Angle:** Face camera directly
4. **Stability:** Keep phone steady during capture
5. **Background:** Plain background works best

### **Test Scenarios:**

**Positive Tests:**
- ✅ Enroll face, then verify (should succeed)
- ✅ Different angles (should still recognize)
- ✅ Different lighting (should still work)

**Negative Tests:**
- ❌ Verify without enrollment (should fail)
- ❌ Different person (should fail)
- ❌ Photo of face (should ideally fail)

---

## 📱 Alternative: Use Android Emulator with Webcam

**If you don't have a phone:**

In Android Studio:
1. Tools → Device Manager
2. Create Virtual Device
3. Settings → Camera → Webcam0
4. Use your computer's webcam as phone camera!

---

## 🔒 Security Notes

**For testing only:**
- HTTP (not HTTPS) - OK for local testing
- No certificate pinning - OK for MVP
- Hardcoded IPs - OK for testing

**For production, you'll need:**
- HTTPS with SSL certificate
- Domain name
- Certificate pinning
- Environment-based configuration

---

## 📝 Configuration Summary

**Files to modify for real phone testing:**

1. **`mobile-app/composeApp/src/commonMain/kotlin/com/fivucsas/data/remote/ApiConfig.kt`**
   ```kotlin
   const val BASE_URL = "http://YOUR_IP:8080"
   const val BIOMETRIC_URL = "http://YOUR_IP:8001"
   ```

2. **FastAPI startup:**
   ```powershell
   python -m uvicorn app.main:app --host 0.0.0.0 --port 8001
   ```

3. **Firewall rules:**
   ```powershell
   netsh advfirewall firewall add rule name="FIVUCSAS" dir=in action=allow protocol=TCP localport=8080,8001
   ```

---

## ✅ Quick Checklist

Before testing on phone:

- [ ] Phone connected to same WiFi as computer
- [ ] Computer's IP address noted
- [ ] `ApiConfig.kt` updated with IP address
- [ ] Firewall rules added
- [ ] Spring Boot running
- [ ] FastAPI running with `--host 0.0.0.0`
- [ ] Tested URLs in phone's browser
- [ ] APK built and transferred
- [ ] APK installed on phone
- [ ] Camera permission granted

---

## 🎯 Complete Test Script

**On Computer:**
```powershell
# Get IP address
ipconfig
# Note the IPv4 Address

# Add firewall rules
netsh advfirewall firewall add rule name="FIVUCSAS" dir=in action=allow protocol=TCP localport=8080,8001

# Start Spring Boot
cd identity-core-api
.\gradlew.bat bootRun

# In another terminal - Start FastAPI
cd biometric-processor
.\venv\Scripts\Activate.ps1
python -m uvicorn app.main:app --host 0.0.0.0 --port 8001
```

**Update mobile app:**
```kotlin
// In ApiConfig.kt
const val BASE_URL = "http://YOUR_IP:8080"
const val BIOMETRIC_URL = "http://YOUR_IP:8001"
```

**Build and install:**
```
Android Studio → Build → Build APK
Transfer APK to phone
Install on phone
Test!
```

---

**You can now test the complete biometric authentication on your real phone!** 📱✨
