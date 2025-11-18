# 🚀 QUICK START - FIVUCSAS Desktop App (Backend Integrated)

## ✅ Status: **FULLY INTEGRATED WITH BACKEND**

---

## Start All Services (3 Commands)

```bash
# Terminal 1: Identity Core API (Kotlin/Spring Boot) - Port 8080
cd identity-core-api
java -jar build\libs\identity-core-api-1.0.0-MVP.jar

# Terminal 2: Biometric Processor (Python/FastAPI) - Port 8001  
cd biometric-processor
python -m uvicorn app.main:app --host 0.0.0.0 --port 8001

# Terminal 3: Desktop App (Kotlin Multiplatform)
cd mobile-app
.\gradlew.bat :desktopApp:run
```

---

## Quick Test (30 seconds)

### 1. Check Backends
```bash
curl http://localhost:8080/api/v1/auth/health    # → "Auth service is healthy"
curl http://localhost:8001/health                # → {"status":"healthy"}
```

### 2. Test Desktop App
- Click **"Kiosk Mode"**
- Click **"New User Enrollment"**
- Fill form (name, email, ID)
- Click **"Start Enrollment"**
- See: **"✓ Connected to live backend"** ✅

### 3. Verify in Admin
- Click **"Back"**
- Click **"Admin Dashboard"**
- Click **"Users"** tab
- See enrolled user in table! ✅

---

## What Works RIGHT NOW

| Feature | Status | Backend |
|---------|--------|---------|
| User Registration | ✅ WORKS | http://localhost:8080 |
| Face Enrollment | ✅ WORKS | http://localhost:8001 |
| Face Verification | ✅ WORKS | http://localhost:8001 |
| Admin User List | ✅ WORKS | Database |
| Search Users | ✅ WORKS | Real-time |
| Delete Users | ✅ WORKS | Database |
| Statistics | ✅ WORKS | Live data |
| Offline Mode | ✅ WORKS | Mock fallback |

---

## Architecture (One Glance)

```
Desktop App (Compose UI)
    ↓
ViewModel (State Management)
    ↓  
UseCase (Business Logic)
    ↓
Repository (Data Access)
    ↓
ApiClient (Ktor HTTP)
    ↓
────────────────────────────
    ↓
Identity Core API (:8080)
    ↓
Biometric Processor (:8001)
    ↓
H2 Database (In-Memory)
```

---

## Files Modified (3 Files)

1. **ApiClient.kt** - Changed URL to `localhost:8080`
2. **KioskViewModel.kt** - Added real API calls
3. **KioskMode.kt** - Wired button to ViewModel

---

## Key Features

✅ **Real Backend Connection** - Desktop → API → Database  
✅ **Live Data** - No mocks (except camera)  
✅ **Error Handling** - Graceful offline mode  
✅ **User Feedback** - Clear success/error messages  
✅ **Full CRUD** - Create, Read, Update, Delete users  
✅ **Search** - Real-time filtering  
✅ **Analytics** - Live statistics dashboard  

---

## Pending (TODO)

⚠️ **Camera** - Currently mock (need JavaCV)  
⚠️ **Liveness** - UI pending (backend ready)  
⚠️ **Production DB** - Using H2 (switch to PostgreSQL)  
⚠️ **JWT Storage** - Token not persisted  

---

## Emergency Troubleshooting

### Backend Not Responding
```bash
# Check if running
netstat -an | findstr "8080"
netstat -an | findstr "8001"

# Restart if needed
# (Ctrl+C in backend terminals, then restart)
```

### Desktop App Won't Start
```bash
cd mobile-app
.\gradlew.bat clean
.\gradlew.bat :desktopApp:run
```

### Database Empty
```bash
# H2 is in-memory - restarts fresh each time
# This is normal in development
# Data persists only while backend is running
```

---

## Quick Demo Script

**For showing to stakeholders (2 minutes):**

1. **Show Backend Health**
   - Open browser: http://localhost:8080/h2-console
   - Show users table

2. **Show Desktop App**
   - Launch → Kiosk Mode
   - Enroll new user
   - Show success message with backend confirmation

3. **Show Admin Dashboard**
   - Switch to Admin Dashboard
   - Show user just enrolled
   - Delete user → refresh shows removed

4. **Show Offline Mode**
   - Stop backends (Ctrl+C)
   - Try enrollment → graceful fallback
   - Restart backends → works again

**Time**: ~2 minutes  
**Impact**: Maximum! ✨

---

## Documentation

📄 **Full Guide**: DESKTOP_BACKEND_INTEGRATION_COMPLETE.md  
📄 **Summary**: INTEGRATION_COMPLETE_SUMMARY.md  
📄 **Capabilities**: RUNNING_SERVICES_CAPABILITIES.md  
📄 **This Card**: QUICK_START_INTEGRATED.md  

---

## Success Metrics

- ✅ 3 services running
- ✅ Desktop → Backend communication
- ✅ Real database operations
- ✅ End-to-end enrollment flow
- ✅ End-to-end verification flow
- ✅ Admin dashboard with live data
- ✅ Error handling
- ✅ User-friendly messages

**Status**: **INTEGRATION COMPLETE** ✅  
**Ready For**: Demo, Testing, Further Development  

---

**Last Updated**: November 4, 2025  
**Integration Status**: ✅ OPERATIONAL
