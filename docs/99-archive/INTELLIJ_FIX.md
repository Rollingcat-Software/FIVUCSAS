# 🔧 IntelliJ IDEA Java Version Fix

## ❌ Problem

IntelliJ IDEA is using Java 24 instead of Java 21, causing compilation errors:
```
Execution failed for task ':compileJava'.
> java.lang.ExceptionInInitializerError
```

## ✅ Solution (3 Options)

---

### **Option 1: Quick Fix - Change IntelliJ Settings** ⭐ RECOMMENDED

#### **Step 1: Set Project SDK**
1. Open IntelliJ IDEA
2. Press **Ctrl+Alt+Shift+S** (or File → Project Structure)
3. Go to **Project Settings → Project**
4. **SDK:** Select **21** (Java 21)
5. **Language level:** Select **21 - Local variable syntax for lambda parameters**
6. Click **OK**

#### **Step 2: Set Gradle JVM**
1. Press **Ctrl+Alt+S** (or File → Settings)
2. Go to **Build, Execution, Deployment → Build Tools → Gradle**
3. **Gradle JVM:** Select **Project SDK (21)** or **21**
4. Click **OK**

#### **Step 3: Reload Project**
1. File → **Invalidate Caches → Invalidate and Restart**
2. OR close and reopen the project

---

### **Option 2: Use Command Line** ⚡ FASTEST

Works perfectly without any configuration issues!

```powershell
# Open PowerShell
cd C:\Users\ahabg\OneDrive\Belgeler\GitHub\FIVUCSAS\identity-core-api

# Build
.\gradlew.bat clean build

# Run
.\gradlew.bat bootRun
```

**This always uses Java 21 because of `gradle.properties` file!**

---

### **Option 3: Set JAVA_HOME Environment Variable**

If you want IntelliJ to always use Java 21:

#### **Windows:**
1. Press **Win+X** → System
2. Click **Advanced system settings**
3. Click **Environment Variables**
4. Under **System variables**, add/edit:
   - **Variable:** `JAVA_HOME`
   - **Value:** `C:\Program Files\Java\jdk-21`
5. Click **OK**
6. **Restart IntelliJ IDEA**

---

## 🔍 Verify Java Version

### **In IntelliJ IDEA:**
```
View → Tool Windows → Terminal
java -version
```

Should show:
```
java version "21.0.8"
```

### **In PowerShell:**
```powershell
cd identity-core-api
.\gradlew.bat -version
```

Should show:
```
JVM: 21.0.8
```

---

## ✅ Files Already Fixed

I've already created these files for you:

1. **`identity-core-api/gradle.properties`**
   - Forces Gradle to use Java 21
   
2. **`identity-core-api/.idea/misc.xml`**
   - Configures IntelliJ IDEA to use Java 21

---

## 🎯 Quick Test

After fixing, test compilation:

### **In IntelliJ:**
```
Build → Build Project (Ctrl+F9)
```

### **In Terminal:**
```powershell
cd identity-core-api
.\gradlew.bat clean build
```

Should show:
```
BUILD SUCCESSFUL in Xs
```

---

## 🚀 Running the Application

### **Method 1: IntelliJ IDEA**
1. Open `src/main/java/com/fivucsas/identity/IdentityCoreApiApplication.java`
2. Right-click → **Run 'IdentityCoreApiApplication'**

### **Method 2: Command Line** ⭐ RECOMMENDED
```powershell
cd identity-core-api
.\gradlew.bat bootRun
```

### **Method 3: Gradle Task**
1. Open **Gradle** panel (right side)
2. Tasks → application → **bootRun**
3. Double-click

---

## 📊 Java Versions on Your System

You have 3 Java versions installed:

| Version | Path | Status |
|---------|------|--------|
| **Java 21** | `C:\Program Files\Java\jdk-21` | ✅ **USE THIS** |
| Java 23 | `C:\Program Files\Java\jdk-23` | ⚠️ Too new |
| Java 24 | `C:\Program Files\Java\jdk-24` | ⚠️ Too new |

**Spring Boot 3.2 requires Java 17 or 21.**

---

## ❓ Why Does Command Line Work?

The `gradle.properties` file tells Gradle to always use Java 21:

```properties
org.gradle.java.home=C:\\Program Files\\Java\\jdk-21
```

**This works for:**
- ✅ Command line (`.\gradlew.bat`)
- ✅ IntelliJ Terminal
- ❌ IntelliJ IDE builds (uses IntelliJ's JDK setting)

---

## 🔧 Troubleshooting

### **Still getting errors?**

#### **1. Clean IntelliJ caches:**
```
File → Invalidate Caches → 
☑ Clear file system cache and Local History
☑ Clear VCS Log caches and indexes
☑ Clear downloaded shared indexes
Click "Invalidate and Restart"
```

#### **2. Delete build folder:**
```powershell
cd identity-core-api
Remove-Item -Recurse -Force build
Remove-Item -Recurse -Force .gradle
.\gradlew.bat clean build
```

#### **3. Reimport Gradle project:**
```
Right-click build.gradle → Gradle → Reload Gradle Project
```

---

## 💡 Pro Tip: Run from Terminal

**Easiest solution:** Just use the command line!

```powershell
# Terminal 1: Spring Boot
cd identity-core-api
.\gradlew.bat bootRun

# Terminal 2: FastAPI
cd biometric-processor
.\venv\Scripts\Activate.ps1
python -m uvicorn app.main:app --reload --port 8001

# Terminal 3: Mobile App
# Use Android Studio
```

**No configuration needed, always works!** ✅

---

## 📖 Documentation

- `QUICK_START.md` - Complete startup guide
- `QUICK_FIX_GUIDE.md` - General troubleshooting
- `MVP_COMPLETE_GUIDE.md` - Backend details

---

**After fixing, Spring Boot should start successfully!** 🚀
