# 🔧 Fix Instructions - Step by Step

**Date**: 2025-11-17  
**Time to Complete**: 1-2 hours

---

## 📋 **Quick Summary**

You have 2 issues to fix:
1. **Backend**: All endpoints return 500 error (database/config issue)
2. **NPM**: Vite won't install (package manager issue)

**Fix Order**: Backend first (easier), then npm

---

# PART 1: Fix Backend (30-60 minutes)

## What We Know:
- ✅ Backend is running on port 8080
- ✅ H2 Console is accessible
- ❌ All endpoints return "INTERNAL_ERROR"
- ⚠️ Need to check actual exception in logs

---

## Step 1: Find and Check Backend Logs

**Where is your backend running from?**

Option A - If running in IntelliJ IDEA:
```
1. Open IntelliJ IDEA
2. Look at the "Run" tab at the bottom
3. Find the console output with the backend logs
4. Look for RED text with stack traces
5. Find lines with "Exception" or "Error"
```

Option B - If running from terminal:
```powershell
# The backend terminal window should show logs
# Look for stack traces starting with:
# - java.lang.NullPointerException
# - org.springframework.beans.factory.BeanCreationException
# - javax.persistence.EntityNotFoundException
```

---

## Step 2: Open H2 Console to Check Database

1. **Open your browser** and go to:
   ```
   http://localhost:8080/h2-console
   ```

2. **Login with these credentials**:
   ```
   JDBC URL: jdbc:h2:mem:fivucsas_db
   Username: sa
   Password: (leave empty - just press Connect)
   ```

3. **Check if tables exist**:
   ```sql
   SHOW TABLES;
   ```

4. **Expected tables**:
   - USERS
   - TENANTS
   - BIOMETRIC_DATA
   - AUDIT_LOGS

5. **If tables don't exist**:
   - Backend didn't initialize properly
   - Check for JPA/Hibernate errors in logs

6. **If tables exist, check tenants**:
   ```sql
   SELECT * FROM TENANTS;
   ```
   
   If empty, **create a default tenant**:
   ```sql
   INSERT INTO TENANTS (ID, NAME, STATUS, MAX_USERS, CREATED_AT, UPDATED_AT)
   VALUES (1, 'Default Tenant', 'ACTIVE', 1000, CURRENT_TIMESTAMP(), CURRENT_TIMESTAMP());
   ```

---

## Step 3: Common Backend Fixes

### Fix 1: Missing Tenant

**Symptom**: Registration fails with "Tenant not found"

**Solution**: Run this in H2 Console:
```sql
INSERT INTO TENANTS (ID, NAME, STATUS, MAX_USERS, CREATED_AT, UPDATED_AT)
VALUES (1, 'Default Tenant', 'ACTIVE', 1000, CURRENT_TIMESTAMP(), CURRENT_TIMESTAMP());
```

### Fix 2: Database Not Initialized

**Symptom**: "Table not found" errors in logs

**Solution**: 
1. Stop the backend
2. Check `application.yml` has:
   ```yaml
   jpa:
     hibernate:
       ddl-auto: create-drop
   ```
3. Restart backend - tables should be created automatically

### Fix 3: JWT Secret Issue

**Symptom**: "JWT signing error" or "Secret too short"

**Already Fixed** - Your config has a valid secret ✅

---

## Step 4: Test Backend After Fix

Run this script to test:
```powershell
cd C:\Users\ahabg\OneDrive\Belgeler\GitHub\FIVUCSAS
.\test-backend-complete.ps1
```

**Success looks like**:
```
✓ POST /auth/register - Create new user
✓ POST /auth/login - Login with credentials
✓ GET /users - List all users
Success Rate: 100%
```

---

# PART 2: Fix NPM/Vite (15-30 minutes)

## Problem: Vite won't install with npm

**Likely cause**: npm issue on Windows + OneDrive

---

## Solution 1: Use pnpm (RECOMMENDED - Usually Works!)

### Step 1: Install pnpm
```powershell
npm install -g pnpm
```

### Step 2: Clean and install
```powershell
cd C:\Users\ahabg\OneDrive\Belgeler\GitHub\FIVUCSAS\web-app

# Remove npm artifacts
Remove-Item node_modules, package-lock.json -Recurse -Force -ErrorAction SilentlyContinue

# Install with pnpm
pnpm install
```

### Step 3: Run dev server
```powershell
pnpm dev
```

**Expected output**:
```
VITE v5.3.1  ready in 1234 ms

➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
```

---

## Solution 2: Use Yarn (If pnpm doesn't work)

### Step 1: Install yarn
```powershell
npm install -g yarn
```

### Step 2: Clean and install
```powershell
cd C:\Users\ahabg\OneDrive\Belgeler\GitHub\FIVUCSAS\web-app

# Remove npm artifacts
Remove-Item node_modules, package-lock.json -Recurse -Force -ErrorAction SilentlyContinue

# Install with yarn
yarn install
```

### Step 3: Run dev server
```powershell
yarn dev
```

---

## Solution 3: Move Project Outside OneDrive (If both fail)

OneDrive sync can interfere with npm. Try moving the project:

```powershell
# Copy to local drive
$source = "C:\Users\ahabg\OneDrive\Belgeler\GitHub\FIVUCSAS"
$dest = "C:\Dev\FIVUCSAS"

# Create directory if needed
New-Item -ItemType Directory -Path "C:\Dev" -Force -ErrorAction SilentlyContinue

# Copy project (this might take a few minutes)
Copy-Item -Path $source -Destination $dest -Recurse -Force

# Navigate to new location
cd C:\Dev\FIVUCSAS\web-app

# Try npm install again
npm install

# Run dev server
npm run dev
```

---

# PART 3: Test Integration (30-45 minutes)

## Once Both Are Fixed:

### Step 1: Ensure backend is running
```powershell
# Test backend
.\test-backend-complete.ps1
# Should show 100% success rate
```

### Step 2: Start web-app
```powershell
cd web-app
pnpm dev  # or yarn dev, or npm run dev
```

### Step 3: Test in browser

1. **Open**: http://localhost:5173

2. **You should see**: FIVUCSAS Admin Dashboard login page

3. **Try logging in**:
   ```
   Email: testuser@example.com
   Password: SecurePass123!
   ```
   (Or whatever user you created in backend tests)

4. **Check browser console** (F12):
   - Should see API calls to http://localhost:8080
   - Check Network tab for responses
   - Verify no CORS errors

5. **Navigate to Users page**:
   - Should load users from backend database
   - Try creating a new user
   - Try editing/deleting

6. **Check Dashboard**:
   - Statistics should show real numbers from backend

---

# 📊 Success Checklist

## Backend Fixed ✓
- [ ] No errors in backend console
- [ ] H2 Console shows tables
- [ ] Default tenant exists (ID=1)
- [ ] test-backend-complete.ps1 shows 100% success
- [ ] Can register and login via API

## Frontend Fixed ✓
- [ ] vite or pnpm/yarn install completed
- [ ] Dev server starts without errors
- [ ] Can access http://localhost:5173
- [ ] Login page loads

## Integration Working ✓
- [ ] Can login from web-app
- [ ] Token stored in localStorage
- [ ] Can view users list
- [ ] Can create/edit/delete users
- [ ] Dashboard shows real statistics
- [ ] No console errors

---

# 🆘 If You Get Stuck

## Backend Issues:

### "Table not found" error:
- Stop backend
- Delete any database files
- Restart backend (tables auto-create)

### "Tenant not found":
- Create default tenant in H2 Console (SQL above)

### "Cannot connect to database":
- Check application.yml datasource configuration
- H2 should work out of the box (in-memory)

## NPM Issues:

### pnpm command not found:
```powershell
npm install -g pnpm --force
```

### Still failing after pnpm:
- Try yarn (Solution 2)
- Or move outside OneDrive (Solution 3)

### Permission errors:
```powershell
# Run PowerShell as Administrator
# Then try again
```

---

# 📞 Quick Reference

## Backend Commands:
```powershell
# Test backend
cd C:\Users\ahabg\OneDrive\Belgeler\GitHub\FIVUCSAS
.\test-backend-complete.ps1

# Diagnose issues
.\diagnose-backend.ps1

# Open H2 Console
# Browser: http://localhost:8080/h2-console
```

## Frontend Commands:
```powershell
cd C:\Users\ahabg\OneDrive\Belgeler\GitHub\FIVUCSAS\web-app

# With pnpm (recommended)
pnpm install
pnpm dev

# With yarn
yarn install
yarn dev

# With npm (if fixed)
npm install
npm run dev
```

## URLs to Remember:
- Frontend: http://localhost:5173
- Backend API: http://localhost:8080/api/v1
- H2 Console: http://localhost:8080/h2-console
- Swagger UI: http://localhost:8080/swagger-ui.html

---

# 💡 Pro Tips

1. **Always check backend first** - It's easier to debug
2. **Use H2 Console** - Visual way to check database
3. **Browser DevTools** - F12 to see network calls
4. **pnpm is more reliable** than npm on Windows
5. **OneDrive can cause issues** - Consider moving project

---

# 🎯 Expected Timeline

| Task | Time | Status |
|------|------|--------|
| Backend diagnosis | 5-10 min | Start here |
| Backend fix | 10-20 min | Create tenant, etc |
| Backend testing | 5 min | Run script |
| pnpm install | 5-10 min | Should work |
| Frontend testing | 10 min | Login, users |
| **Total** | **35-55 min** | |

---

**Good luck! 🚀**

**If something goes wrong, check the error message carefully and refer back to this guide.**

**The code is solid - these are just environment setup issues!**
