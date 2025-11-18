# 🚀 FIVUCSAS MVP - Complete Build & Test Guide

**Version:** 1.0.0-MVP  
**Created:** October 27, 2025

---

## 📋 What's Been Built

### ✅ Components Created:

1. **Spring Boot Identity Core API** (Port 8080)
   - User registration & login
   - JWT authentication
   - Biometric enrollment/verification endpoints
   - H2 in-memory database
   - Swagger UI documentation

2. **FastAPI Biometric Processor** (Port 8001)
   - Face detection using DeepFace
   - Face embedding extraction
   - Face verification (1:1 matching)
   - Temporary file storage

3. **Storage Strategy:**
   - Spring Boot: H2 in-memory database (data reset on restart)
   - FastAPI: Temporary file system storage
   - No Docker required for MVP!

---

## 🛠️ Prerequisites

### Install Required Software:

```powershell
# 1. Java 21 (for Spring Boot)
# Download from: https://adoptium.net/

# 2. Python 3.11+ (for FastAPI)
# Download from: https://www.python.org/downloads/

# 3. Verify installations
java -version   # Should show Java 21
python --version  # Should show Python 3.11+
```

---

## 🚀 Step-by-Step Startup

### **Step 1: Start Spring Boot Identity Core API**

Open **Terminal 1** (PowerShell):

```powershell
cd C:\Users\ahabg\OneDrive\Belgeler\GitHub\FIVUCSAS\identity-core-api

# Build and run
.\gradlew.bat bootRun

# Wait for:
# "Started IdentityCoreApiApplication in X.XXX seconds"
```

**✅ Spring Boot is ready when you see:**
```
Started IdentityCoreApiApplication
Tomcat started on port(s): 8080 (http)
```

**Access Points:**
- API: http://localhost:8080
- Swagger UI: http://localhost:8080/swagger-ui.html
- H2 Console: http://localhost:8080/h2-console

**H2 Console Settings:**
- JDBC URL: `jdbc:h2:mem:fivucsas_db`
- Username: `sa`
- Password: (leave empty)

---

### **Step 2: Start FastAPI Biometric Processor**

Open **Terminal 2** (PowerShell):

```powershell
cd C:\Users\ahabg\OneDrive\Belgeler\GitHub\FIVUCSAS\biometric-processor

# Create virtual environment
python -m venv venv

# Activate virtual environment
.\venv\Scripts\Activate.ps1

# If you get execution policy error, run:
# Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Install dependencies (this will take 5-10 minutes first time)
pip install -r requirements.txt

# Run FastAPI server
python -m uvicorn app.main:app --reload --port 8001

# Wait for:
# "Application startup complete"
# "Uvicorn running on http://127.0.0.1:8001"
```

**✅ FastAPI is ready when you see:**
```
INFO:     Application startup complete.
INFO:     Uvicorn running on http://127.0.0.1:8001
```

**Access Points:**
- API: http://localhost:8001
- Swagger UI: http://localhost:8001/docs
- ReDoc: http://localhost:8001/redoc

---

## 🧪 Testing the MVP

### **Option 1: Using Swagger UI (Easiest)**

#### Test 1: Register a User

1. Go to: http://localhost:8080/swagger-ui.html
2. Find **POST /api/v1/auth/register**
3. Click "Try it out"
4. Enter:
```json
{
  "email": "test@example.com",
  "password": "Test@123456",
  "firstName": "John",
  "lastName": "Doe"
}
```
5. Click "Execute"
6. **✅ Expected:** Status 200, response with `accessToken` and `user` object
7. **Copy the `userId`** from response (e.g., `"id": "abc-123-def..."`)

#### Test 2: Login

1. Find **POST /api/v1/auth/login**
2. Click "Try it out"
3. Enter:
```json
{
  "email": "test@example.com",
  "password": "Test@123456"
}
```
4. Click "Execute"
5. **✅ Expected:** Status 200, response with `accessToken`

#### Test 3: Enroll Face (Biometric)

1. Find **POST /api/v1/biometric/enroll/{userId}**
2. Click "Try it out"
3. Enter the `userId` you copied earlier
4. Upload an image file (JPG/PNG of a face)
   - You can use any photo with a clear face
   - Recommended: Front-facing selfie, good lighting
5. Click "Execute"
6. **✅ Expected:** 
   - Status 200
   - `verified: true`
   - `message: "Face enrolled successfully"`

#### Test 4: Verify Face

1. Find **POST /api/v1/biometric/verify/{userId}**
2. Click "Try it out"
3. Enter the same `userId`
4. Upload **the same image** (should match)
5. Click "Execute"
6. **✅ Expected:**
   - Status 200
   - `verified: true`
   - `confidence: 0.9+` (high confidence)
   
7. Try uploading a **different person's photo**
8. **✅ Expected:**
   - Status 200
   - `verified: false`
   - `confidence: low` (face doesn't match)

---

### **Option 2: Using cURL (Command Line)**

```powershell
# 1. Register User
curl -X POST http://localhost:8080/api/v1/auth/register `
  -H "Content-Type: application/json" `
  -d '{
    "email": "test@example.com",
    "password": "Test@123456",
    "firstName": "John",
    "lastName": "Doe"
  }'

# Copy the userId from response

# 2. Login
curl -X POST http://localhost:8080/api/v1/auth/login `
  -H "Content-Type: application/json" `
  -d '{
    "email": "test@example.com",
    "password": "Test@123456"
  }'

# 3. Enroll Face
curl -X POST http://localhost:8080/api/v1/biometric/enroll/YOUR_USER_ID `
  -F "image=@C:\path\to\your\photo.jpg"

# 4. Verify Face
curl -X POST http://localhost:8080/api/v1/biometric/verify/YOUR_USER_ID `
  -F "image=@C:\path\to\your\photo.jpg"
```

---

### **Option 3: Using Postman**

Download collection: (Create a Postman collection with the above endpoints)

---

## 📊 Expected Flow Diagram

```
┌─────────────┐
│ 1. Register │  → Spring Boot creates user in H2 database
└─────────────┘

┌─────────────┐
│  2. Login   │  → Spring Boot returns JWT token
└─────────────┘

┌─────────────┐
│ 3. Enroll   │  
└─────────────┘
      ↓
   [Upload Photo]
      ↓
   Spring Boot → FastAPI
      ↓
   FastAPI extracts face embedding using DeepFace
      ↓
   Returns embedding to Spring Boot
      ↓
   Spring Boot stores embedding in H2
      ↓
   Success response

┌─────────────┐
│ 4. Verify   │  
└─────────────┘
      ↓
   [Upload Photo]
      ↓
   Spring Boot gets stored embedding from H2
      ↓
   Spring Boot + photo → FastAPI
      ↓
   FastAPI compares new photo with stored embedding
      ↓
   Returns match result (verified: true/false)
      ↓
   Spring Boot returns result to user
```

---

## 🔍 Troubleshooting

### Spring Boot won't start

**Error:** `Port 8080 already in use`
```powershell
# Find process using port 8080
netstat -ano | findstr :8080

# Kill the process (replace PID)
taskkill /PID <PID> /F
```

**Error:** `Java not found`
```powershell
# Check Java installation
java -version

# If not installed, download Java 21 from https://adoptium.net/
```

---

### FastAPI won't start

**Error:** `No module named 'fastapi'`
```powershell
# Make sure virtual environment is activated
.\venv\Scripts\Activate.ps1

# Reinstall dependencies
pip install -r requirements.txt
```

**Error:** `Port 8001 already in use`
```powershell
# Use different port
python -m uvicorn app.main:app --reload --port 8002

# Update Spring Boot application.yml:
# biometric.service.url: http://localhost:8002
```

**Error:** `DeepFace model download fails`
- First run will download AI models (~200MB)
- Requires internet connection
- May take 5-10 minutes
- If fails, try again (sometimes network timeout)

---

### Face detection errors

**Error:** `No face detected in image`
- Use a clear, front-facing photo
- Good lighting
- Face should be visible and not too small
- Try a different photo

**Error:** `Image resolution too low`
- Use image at least 100x100 pixels
- Higher resolution is better (recommended: 640x480 or higher)

---

## 📁 Test Images

You can use test face images from:
- https://github.com/serengil/deepface/tree/master/tests/dataset
- Any clear selfie photo
- Stock photos of faces

---

## 🎯 Success Checklist

- [  ] Spring Boot starts successfully on port 8080
- [  ] FastAPI starts successfully on port 8001
- [  ] Can access Swagger UI for both services
- [  ] User registration works
- [  ] User login works and returns JWT
- [  ] Face enrollment works (no errors)
- [  ] Face verification works with same image (verified: true)
- [  ] Face verification fails with different image (verified: false)
- [  ] H2 console shows users and biometric_data tables

---

## 📝 Next Steps After MVP Works

1. **Build Mobile App (Kotlin Multiplatform)**
   - Camera integration
   - Call these APIs from mobile
   - Better UX than Swagger

2. **Add More Features:**
   - Password reset
   - Email verification
   - Profile photo upload
   - Admin dashboard

3. **Production Deployment:**
   - Switch from H2 to PostgreSQL
   - Add Redis for caching
   - Use Docker Compose
   - Add HTTPS/SSL
   - Deploy to cloud

---

## 📊 API Endpoints Summary

### Spring Boot (Port 8080)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/v1/auth/register` | POST | Register new user |
| `/api/v1/auth/login` | POST | Login user |
| `/api/v1/biometric/enroll/{userId}` | POST | Enroll face |
| `/api/v1/biometric/verify/{userId}` | POST | Verify face |
| `/swagger-ui.html` | GET | Swagger documentation |
| `/h2-console` | GET | H2 database console |

### FastAPI (Port 8001)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/v1/face/enroll` | POST | Extract face embedding |
| `/api/v1/face/verify` | POST | Verify face match |
| `/docs` | GET | Swagger documentation |
| `/health` | GET | Health check |

---

## 🎉 Congratulations!

You now have a working MVP of the FIVUCSAS biometric authentication system!

**What works:**
✅ User registration & login  
✅ Face enrollment with DeepFace AI  
✅ Face verification (1:1 matching)  
✅ Complete end-to-end flow  
✅ No Docker required!  
✅ No external database setup needed!  

**Ready for mobile app integration!** 📱

---

**Need help?** Check the troubleshooting section or review the logs in the terminal windows.

