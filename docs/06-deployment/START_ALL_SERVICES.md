# 🚀 START ALL SERVICES - TERMINAL COMMANDS

**Date**: November 4, 2025  
**Status**: All dependencies installed ✅

---

## ✅ Prerequisites Complete

- [x] Python 3.13 installed
- [x] Pip upgraded to 25.3
- [x] All Python dependencies installed
- [x] Kotlin backend JAR built
- [x] Desktop app Gradle configured

---

## 📟 Open 3 Separate PowerShell Terminals

### **Terminal 1: Identity Core API** (Port 8080)

```powershell
cd C:\Users\ahabg\OneDrive\Belgeler\GitHub\FIVUCSAS\identity-core-api
java -jar build\libs\identity-core-api-1.0.0-MVP.jar
```

**Expected Output:**
```
  .   ____          _            __ _ _
 /\\ / ___'_ __ _ _(_)_ __  __ _ \ \ \ \
...
Started IdentityCoreApiApplication in 44.736 seconds
Tomcat started on port 8080 (http) with context path ''
```

**Status Check:**
```powershell
curl http://localhost:8080/api/v1/auth/health
# Should return: "Auth service is healthy"
```

---

### **Terminal 2: Biometric Processor** (Port 8001)

```powershell
cd C:\Users\ahabg\OneDrive\Belgeler\GitHub\FIVUCSAS\biometric-processor
python -m uvicorn app.main:app --host 0.0.0.0 --port 8001
```

**Expected Output:**
```
INFO:     Started server process [11408]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:8001 (Press CTRL+C to quit)
```

**Status Check:**
```powershell
curl http://localhost:8001/health
# Should return: {"status":"healthy"}
```

---

### **Terminal 3: Desktop App**

```powershell
cd C:\Users\ahabg\OneDrive\Belgeler\GitHub\FIVUCSAS\mobile-app
.\gradlew.bat :desktopApp:run
```

**Expected Output:**
```
> Task :desktopApp:run
[Gradle builds and launches Compose Desktop window]
```

**Visual Check:**
- Window appears with "FIVUCSAS" title
- Two cards: "Kiosk Mode" and "Admin Dashboard"

---

## 🔍 Verify All Services (Terminal 4 - Optional)

```powershell
# Check all ports are listening
netstat -an | findstr "8080 8001"

# Should show:
# TCP    0.0.0.0:8080           0.0.0.0:0              LISTENING
# TCP    0.0.0.0:8001           0.0.0.0:0              LISTENING

# Test APIs
curl http://localhost:8080/api/v1/auth/health
curl http://localhost:8001/health
curl http://localhost:8001/api/v1/face/health
```

---

## ⏱️ Startup Sequence & Times

| Order | Service | Time | Total |
|-------|---------|------|-------|
| 1 | Identity Core API | ~45s | 0:45 |
| 2 | Biometric Processor | ~15s | 1:00 |
| 3 | Desktop App | ~50s | 1:50 |

**Recommended**: Start all 3 in parallel (different terminals) to save time!

---

## 🎯 Quick Test After Startup

### 1. Test Backend Integration

In Desktop App:
1. Click **"Kiosk Mode"**
2. Click **"New User Enrollment"**
3. Fill form:
   - Full Name: `Integration Test`
   - Email: `test@integration.com`
   - ID Number: `11111111111`
4. Click **"Start Enrollment"**
5. **Look for**: `"✓ Connected to live backend"` ✅

### 2. Test Admin Dashboard

In Desktop App:
1. Click **"Back"** (to launcher)
2. Click **"Admin Dashboard"**
3. Click **"Users"** tab
4. **Should see**: User you just enrolled! ✅

### 3. Test APIs Directly

```powershell
# Get all users
curl http://localhost:8080/api/v1/users

# Should return JSON array with enrolled user
```

---

## 🛑 How to Stop Services

Press **Ctrl+C** in each terminal:

1. Terminal 1 (Identity Core API) → Ctrl+C
2. Terminal 2 (Biometric Processor) → Ctrl+C  
3. Terminal 3 (Desktop App) → Ctrl+C (or close window)

---

## 🔧 Troubleshooting

### ❌ "Port 8080 already in use"
```powershell
# Find process using port
netstat -ano | findstr "8080"
# Kill it
taskkill /PID <PID_NUMBER> /F
```

### ❌ "Module not found" (Python)
```powershell
cd biometric-processor
pip install -r requirements.txt
pip install pydantic-settings
```

### ❌ "Cannot find JAR file"
```powershell
cd identity-core-api
.\gradlew.bat clean bootJar
```

### ❌ Desktop app won't start
```powershell
cd mobile-app
.\gradlew.bat clean
.\gradlew.bat :desktopApp:run
```

---

## 📊 Service Status Dashboard

Once all running, access these URLs in browser:

| Service | URL | Description |
|---------|-----|-------------|
| Identity API Health | http://localhost:8080/api/v1/auth/health | Auth service check |
| H2 Database Console | http://localhost:8080/h2-console | View database |
| Biometric API Docs | http://localhost:8001/docs | Swagger UI |
| Biometric Health | http://localhost:8001/health | Service check |

**H2 Console Login:**
- JDBC URL: `jdbc:h2:mem:fivucsas_db`
- Username: `sa`
- Password: (leave empty)

---

## 🎉 Success Indicators

All green? You're good to go! ✅

- [ ] Terminal 1 shows: "Tomcat started on port 8080"
- [ ] Terminal 2 shows: "Uvicorn running on http://0.0.0.0:8001"
- [ ] Terminal 3 shows desktop window
- [ ] `curl http://localhost:8080/api/v1/auth/health` works
- [ ] `curl http://localhost:8001/health` works
- [ ] Desktop app shows launcher screen
- [ ] Enrollment creates user in database
- [ ] Admin dashboard shows users

---

## 📝 Summary Commands (Copy-Paste Ready)

```powershell
# === TERMINAL 1 ===
cd C:\Users\ahabg\OneDrive\Belgeler\GitHub\FIVUCSAS\identity-core-api
java -jar build\libs\identity-core-api-1.0.0-MVP.jar

# === TERMINAL 2 ===
cd C:\Users\ahabg\OneDrive\Belgeler\GitHub\FIVUCSAS\biometric-processor
python -m uvicorn app.main:app --host 0.0.0.0 --port 8001

# === TERMINAL 3 ===
cd C:\Users\ahabg\OneDrive\Belgeler\GitHub\FIVUCSAS\mobile-app
.\gradlew.bat :desktopApp:run

# === TERMINAL 4 (VERIFICATION) ===
curl http://localhost:8080/api/v1/auth/health
curl http://localhost:8001/health
netstat -an | findstr "8080 8001"
```

---

**Status**: ✅ **ALL SYSTEMS READY TO LAUNCH**  
**Last Updated**: November 4, 2025  
**Integration**: Backend ↔ Desktop App CONNECTED
