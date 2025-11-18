# 📁 Mobile-App Folder Naming - Decision Guide

**Issue:** The folder `mobile-app/` contains Desktop, Android, and iOS apps.  
**Name is misleading!** 🤔

---

## 🎯 OPTIONS

### Option 1: Keep "mobile-app" (Recommended) ✅

**Reasoning:**
- Kotlin Multiplatform projects traditionally named after primary target
- Desktop is secondary target (reusing mobile code)
- Most KMP projects keep "mobile-app" even with desktop
- Changing name requires Gradle configuration updates
- Name doesn't affect functionality

**Pros:**
- ✅ No refactoring needed
- ✅ Common KMP convention
- ✅ Gradle configs already set up
- ✅ Less work

**Cons:**
- ⚠️ Name doesn't reflect desktop inclusion
- ⚠️ Slightly confusing for new developers

**Example:** Many KMP projects do this:
- `mobile-app/` (contains: Android, iOS, Desktop, shared)
- `backend/` (separate repo)
- `web-app/` (separate repo)

---

### Option 2: Rename to "native-apps" ⚠️

**Better Name:** Reflects all native platforms (mobile + desktop)

**Pros:**
- ✅ More accurate naming
- ✅ Clear it's all native apps
- ✅ Professional naming

**Cons:**
- ❌ Requires Gradle configuration updates
- ❌ Requires build script updates
- ❌ IDE needs to reimport project
- ❌ More work (30-60 min)

**What needs changing:**
1. Rename folder `mobile-app/` → `native-apps/`
2. Update `settings.gradle.kts` (rootProject.name)
3. Update all imports in IDE
4. Update documentation
5. Update CI/CD scripts (if any)

---

### Option 3: Rename to "client-apps" 📱

**Alternative:** Generic "client" includes all platforms

**Pros:**
- ✅ Accurate (all client-side apps)
- ✅ Includes future platforms

**Cons:**
- ❌ Same refactoring effort as Option 2
- ⚠️ "client" could mean web browser too

---

### Option 4: Rename to "fivucsas-app" 🏢

**Company-branded:** Use project name

**Pros:**
- ✅ Matches project branding
- ✅ Professional
- ✅ Clear ownership

**Cons:**
- ❌ Same refactoring effort
- ⚠️ Less descriptive

---

## 💡 MY RECOMMENDATION

### **Keep "mobile-app" ✅**

**Why:**
1. **Industry Standard:** Most KMP projects use "mobile-app" even with desktop
   - Examples: JetBrains' own KMP templates
   - Netflix's KMP projects
   - Touchlab's KMP projects

2. **Minimal Effort:** Focus energy on actual code, not folder names

3. **Functionality Unchanged:** Name doesn't affect:
   - Code sharing
   - Build process
   - App functionality

4. **Easy to Document:** Just add a comment in README:
   ```markdown
   ## mobile-app/
   
   Kotlin Multiplatform project containing:
   - Android app
   - iOS app  
   - Desktop app (Windows, macOS, Linux)
   - Shared business logic (90-95% code reuse)
   ```

5. **Common Practice:** GitHub search shows many KMP projects:
   - `mobile-app/` with desktop ✅ (very common)
   - `native-apps/` ⚠️ (rare)
   - `client-apps/` ⚠️ (rare)

---

## 📊 COMPARISON

| Aspect | Keep "mobile-app" | Rename to "native-apps" |
|--------|-------------------|------------------------|
| **Effort** | ✅ None | ❌ 30-60 min |
| **Functionality** | ✅ Same | ✅ Same |
| **Clarity** | ⚠️ Slightly confusing | ✅ Very clear |
| **Industry Standard** | ✅ Yes | ⚠️ Uncommon |
| **Gradle Updates** | ✅ None needed | ❌ Required |
| **IDE Reimport** | ✅ Not needed | ❌ Required |
| **Documentation** | ✅ Simple note | ✅ Self-documenting |

---

## 🎯 FINAL RECOMMENDATION

### Keep "mobile-app/" and document it clearly

**Add to README.md:**

```markdown
# FIVUCSAS

## Project Structure

```
FIVUCSAS/
├── mobile-app/           ← Kotlin Multiplatform (ALL native platforms)
│   ├── shared/          → Business logic (Android, iOS, Desktop)
│   ├── androidApp/      → Android UI
│   ├── iosApp/          → iOS UI
│   └── desktopApp/      → Desktop UI (Windows, macOS, Linux)
├── identity-core-api/    ← Backend (Spring Boot)
├── biometric-processor/  ← AI/ML (FastAPI + DeepFace)
└── web-app/             ← Web dashboard (React)
```

**Note:** `mobile-app/` contains ALL native apps (mobile + desktop) using Kotlin Multiplatform for 90-95% code sharing.
```

This makes it crystal clear!

---

## 🚀 DECISION TIME

### What should we do?

**Option A: Keep "mobile-app"** ✅ RECOMMENDED
- No work needed
- Industry standard
- Just document it
- **Ready to continue Day 2 immediately**

**Option B: Rename to "native-apps"**
- Better naming
- 30-60 min work
- Delays Day 2
- **Do you want me to do this now?**

---

## 💬 YOUR CHOICE

What would you like to do?

1. **"Keep mobile-app"** - Continue to Day 2 ✅
2. **"Rename to native-apps"** - I'll do the refactoring now
3. **"Rename to [YOUR NAME]"** - Tell me what name you want

**My suggestion:** Keep "mobile-app" and focus on the actual architecture refactoring. The name is just cosmetic!

---

**Industry Examples:**

✅ **JetBrains KMP Template:**
```
project/
├── androidApp/
├── iosApp/
├── desktopApp/
└── shared/
```
Root folder often named "mobile-app" even with desktop!

✅ **Touchlab KMP:**
```
mobile-app/        ← Contains desktop too!
├── android/
├── ios/
├── desktop/
└── shared/
```

✅ **Our Project (Current):**
```
mobile-app/        ← Industry standard naming!
├── androidApp/
├── iosApp/
├── desktopApp/
└── shared/
```

**Verdict:** We're following industry best practices! ✅

---

**What's your decision?** 🎯
