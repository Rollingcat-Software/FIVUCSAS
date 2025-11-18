# 🔧 Quick Fix Guide - Installation Issues

## ✅ Issues Fixed

### **Issue 1: Pillow Installation Error** ✓
**Fixed:** Updated `requirements.txt` with flexible version constraints

### **Issue 2: Gradle Plugin Not Found** ✓
**Fixed:** Added proper repository configuration

---

## 🚀 How to Install Now

### **Step 1: Install Python Dependencies (FastAPI)**

```powershell
cd C:\Users\ahabg\OneDrive\Belgeler\GitHub\FIVUCSAS\biometric-processor

# Remove old venv if exists
Remove-Item -Recurse -Force .venv -ErrorAction SilentlyContinue

# Create new virtual environment
python -m venv venv

# Activate it
.\venv\Scripts\Activate.ps1

# Upgrade pip first
python -m pip install --upgrade pip

# Install dependencies (takes 5-10 minutes)
pip install -r requirements.txt
```

**If Pillow still fails:**
```powershell
# Install Pillow from wheel
pip install --upgrade pillow

# Then install rest
pip install -r requirements.txt
```

---

### **Step 2: Build Mobile App (Android Studio)**

#### **Option A: Using Android Studio (Recommended)**

1. Open Android Studio
2. File → Open → Select `mobile-app` folder
3. Wait for Gradle sync (will download dependencies)
4. If sync fails, try:
   - File → Invalidate Caches → Invalidate and Restart
   - Or File → Sync Project with Gradle Files

#### **Option B: Using Command Line**

```powershell
cd C:\Users\ahabg\OneDrive\Belgeler\GitHub\FIVUCSAS\mobile-app

# Windows
.\gradlew.bat build

# If fails, try:
.\gradlew.bat clean build
```

---

## 🔍 Common Issues & Solutions

### **Python Issues:**

**Error: "Microsoft Visual C++ 14.0 or greater is required"**
```
Download & Install:
https://visualstudio.microsoft.com/downloads/
Select: "Desktop development with C++"
```

**Error: "No module named 'pip'"**
```powershell
python -m ensurepip --upgrade
python -m pip install --upgrade pip
```

**Error: "Command 'python' not found"**
```powershell
# Use py instead
py -m venv venv
.\venv\Scripts\Activate.ps1
py -m pip install -r requirements.txt
```

---

### **Android/Gradle Issues:**

**Error: "SDK location not found"**
```
File → Settings → Android SDK
Install Android SDK (API 34)
```

**Error: "Gradle sync failed"**
```powershell
# Delete Gradle cache
Remove-Item -Recurse $env:USERPROFILE\.gradle\caches

# In Android Studio:
File → Invalidate Caches → Invalidate and Restart
```

**Error: "Java version mismatch"**
```
File → Settings → Build Tools → Gradle
Gradle JDK: Select JDK 17 or 11
```

---

## 📋 Alternative: Use Pre-built Wheels

If installations keep failing, use pre-built wheels:

```powershell
# Install from PyPI with binary wheels
pip install fastapi uvicorn[standard] python-multipart
pip install pillow numpy opencv-python
pip install deepface
pip install tf-keras pydantic python-dotenv
```

---

## ✅ Verification Steps

### **1. Verify Python Installation:**

```powershell
cd biometric-processor
.\venv\Scripts\Activate.ps1

# Check imports
python -c "import fastapi; print('FastAPI OK')"
python -c "import cv2; print('OpenCV OK')"
python -c "import deepface; print('DeepFace OK')"
```

### **2. Verify Gradle Build:**

```powershell
cd mobile-app
.\gradlew.bat tasks
# Should show list of available tasks
```

---

## 🎯 Quick Start (After Fixes)

### **Terminal 1: Spring Boot**
```powershell
cd identity-core-api
.\gradlew.bat bootRun
```

### **Terminal 2: FastAPI**
```powershell
cd biometric-processor
.\venv\Scripts\Activate.ps1
python -m uvicorn app.main:app --reload --port 8001
```

### **Terminal 3: Android Studio**
```
Open mobile-app folder
Click Run ▶️
```

---

## 📞 Still Having Issues?

### **Try This Minimal Test:**

**Test FastAPI without ML libraries:**
```powershell
# Install minimal dependencies
pip install fastapi uvicorn[standard] python-multipart pillow

# Create test server
python -m uvicorn app.main:app --reload --port 8001
```

**Test Spring Boot:**
```powershell
cd identity-core-api
.\gradlew.bat bootRun
```

---

## 💡 Pro Tips

1. **Use Python 3.11** (not 3.12, DeepFace may have issues)
2. **Install Microsoft Visual C++ Redistributable**
3. **Use Android Studio Hedgehog or newer**
4. **Ensure JDK 17 is installed**
5. **Close antivirus temporarily during installation**

---

## 🎉 Success Indicators

You'll know it's working when:

✅ `pip install -r requirements.txt` completes without errors  
✅ `.\gradlew.bat build` completes successfully  
✅ Android Studio Gradle sync shows "Sync successful"  
✅ FastAPI starts: "Application startup complete"  
✅ Spring Boot starts: "Started IdentityCoreApiApplication"  

---

**Good luck! 🚀**
