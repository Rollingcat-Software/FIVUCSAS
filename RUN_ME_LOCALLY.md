# 🚀 Run This On Your Local Machine

**Important**: The diagnostic and fix scripts must run on **your Windows computer** where the backend is running, not in this remote session.

---

## Quick Start (5 minutes)

### Step 1: Get the Latest Code

Open PowerShell on your Windows machine and run:

```powershell
cd C:\Users\ahabg\OneDrive\Belgeler\GitHub\FIVUCSAS
git pull origin claude/review-commits-plan-next-015kpnf8xyZfpsvac2KQD97p
```

### Step 2: Make Sure Backend is Running

**Check if backend is running:**
- Visit http://localhost:8080 in your browser
- If you see ANY page (even an error page), it's running ✓
- If browser says "can't connect", backend is NOT running

**Start backend if needed:**

**Option A - IntelliJ IDEA:**
1. Open the project in IntelliJ
2. Navigate to: `identity-core-api/src/main/java/com/fivucsas/identitycoreapi/IdentityCoreApiApplication.java`
3. Click the green ▶ Run button

**Option B - PowerShell:**
```powershell
cd identity-core-api
.\mvnw.cmd spring-boot:run
```

Wait until you see: `Started IdentityCoreApiApplication in X seconds`

### Step 3: Run the Auto-Fix Script

```powershell
cd C:\Users\ahabg\OneDrive\Belgeler\GitHub\FIVUCSAS
.\fix-backend-locally.ps1
```

**What it will do:**
1. Check if backend is running ✓
2. Test the API
3. Detect the issue (probably: missing tenant)
4. Guide you through the fix
5. Verify it worked

---

## What to Expect

### Most Likely (95%): Missing Tenant

The script will:
1. Open H2 Console in your browser
2. Show you the login credentials
3. Provide a SQL command (already copied to clipboard!)
4. Wait for you to run it
5. Verify the fix worked

**Total time**: 2-3 minutes

### Less Likely (3%): Database Not Initialized

The script will tell you:
1. Stop the backend
2. Edit `application.yml`
3. Set `ddl-auto: create-drop`
4. Restart backend

**Total time**: 5-10 minutes

### Rare (2%): Other Issue

The script will:
1. Show you the error
2. Direct you to backend console logs
3. Suggest running detailed diagnostics

---

## Alternative Scripts

If `fix-backend-locally.ps1` doesn't work:

### Option 1: Detailed Diagnostics
```powershell
.\diagnose-backend-detailed.ps1
```
More detailed output, specific error detection.

### Option 2: Quick Fix (Interactive)
```powershell
.\quick-fix-backend.ps1
```
Asks questions and guides you step-by-step.

### Option 3: Manual Guide
```powershell
notepad BACKEND_FIX_GUIDE.md
# or
code BACKEND_FIX_GUIDE.md
```
Complete manual with all possible fixes.

---

## After Backend is Fixed

Once the backend works (script shows ✅):

### 1. Run Full Tests
```powershell
.\test-backend-complete.ps1
```
Should show **100% success rate**.

### 2. Fix Frontend
```powershell
cd web-app

# Try pnpm first (recommended)
npm install -g pnpm
pnpm install
pnpm dev
```

### 3. Open Web App
Visit: http://localhost:5173

---

## Troubleshooting

### "Backend is not running"
- Start the backend (see Step 2 above)
- Run the script again

### "H2 Console not accessible"
- Check `application.yml` has: `spring.h2.console.enabled: true`
- Restart backend
- Run script again

### "Script execution disabled"
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Still stuck?
1. Check backend console for error messages
2. Read: `BACKEND_FIX_GUIDE.md`
3. Run: `.\diagnose-backend-detailed.ps1`

---

## Files Available

| File | Purpose |
|------|---------|
| `fix-backend-locally.ps1` | ⭐ Auto-fix (start here) |
| `quick-fix-backend.ps1` | Interactive fix guide |
| `diagnose-backend-detailed.ps1` | Detailed diagnostics |
| `test-backend-complete.ps1` | Full test suite |
| `h2-database-check.sql` | Database diagnostic SQL |
| `BACKEND_FIX_GUIDE.md` | Complete manual |

---

## Success Indicators

You've fixed the backend when you see:

✅ `fix-backend-locally.ps1` shows "BACKEND IS NOW OPERATIONAL!"
✅ `test-backend-complete.ps1` shows "100% success rate"
✅ H2 Console shows data in TENANTS table
✅ No errors in backend console

---

**Estimated time to fix**: 5-15 minutes
**Most common fix**: Create default tenant (2 minutes)

Good luck! 🚀
