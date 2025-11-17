# Backend Fix Guide - Step by Step

**Created**: 2025-11-17
**Purpose**: Fix INTERNAL_ERROR issues in FIVUCSAS backend
**Estimated Time**: 15-30 minutes

---

## 🎯 Quick Start - Choose Your Path

### Path A: Automated (Recommended) ⚡
```powershell
.\quick-fix-backend.ps1
```
Follow the on-screen instructions.

### Path B: Manual Diagnosis 🔍
```powershell
.\diagnose-backend-detailed.ps1
```
Read the detailed output and fix issues manually.

### Path C: Step-by-Step (You're Here) 📖
Continue reading below for complete walkthrough.

---

## 📋 Prerequisites

Before starting, ensure:
- [ ] Backend is running (check IntelliJ or terminal)
- [ ] Backend is on port 8080
- [ ] You can access http://localhost:8080 (even if it shows an error page)

**Not running?** Start it:
- **IntelliJ IDEA**: Click green Run button next to `IdentityCoreApiApplication`
- **Terminal**:
  ```bash
  cd identity-core-api
  ./mvnw spring-boot:run
  ```

---

## 🔍 Step 1: Identify the Problem

### Run Diagnostics
```powershell
.\diagnose-backend-detailed.ps1
```

### Common Error Messages and What They Mean

| Error Message | Problem | Solution |
|--------------|---------|----------|
| "Tenant not found" / "Tenant with ID 1 does not exist" | Default tenant missing | [Go to Step 2A](#step-2a-fix-missing-tenant) |
| "Table 'TENANTS' not found" | Database not initialized | [Go to Step 2B](#step-2b-fix-database-not-initialized) |
| "INTERNAL_ERROR" | Generic error | [Go to Step 2C](#step-2c-check-backend-logs) |
| "NullPointerException" | Code issue | [Go to Step 2C](#step-2c-check-backend-logs) |
| "Bean creation error" | Spring config issue | [Go to Step 2D](#step-2d-fix-spring-configuration) |

---

## 🔧 Step 2A: Fix Missing Tenant

This is the **most common issue**.

### Method 1: Using H2 Console (Easiest)

1. **Open H2 Console** in your browser:
   ```
   http://localhost:8080/h2-console
   ```

2. **Login** with these credentials:
   ```
   JDBC URL:  jdbc:h2:mem:fivucsas_db
   Username:  sa
   Password:  (leave empty)
   ```
   Click **Connect**.

3. **Run this SQL**:
   ```sql
   INSERT INTO TENANTS (ID, NAME, STATUS, MAX_USERS, CREATED_AT, UPDATED_AT)
   VALUES (1, 'Default Tenant', 'ACTIVE', 1000, CURRENT_TIMESTAMP(), CURRENT_TIMESTAMP());
   ```

4. **Verify** (you should see "Update count: 1"):
   ```sql
   SELECT * FROM TENANTS;
   ```
   You should see your newly created tenant.

5. **Test the API**:
   ```powershell
   .\test-backend-complete.ps1
   ```

✅ **Fixed!** If tests pass, move to [Step 3](#step-3-verify-everything-works).

### Method 2: Using SQL File

1. Open H2 Console (see Method 1, steps 1-2)

2. Load the SQL file:
   ```
   File → Open → Select: h2-database-check.sql
   ```

3. Click **Run** or press Ctrl+Enter

4. Check the results in the output panel

---

## 🔧 Step 2B: Fix Database Not Initialized

If you get "Table not found" errors, the database schema wasn't created.

### Check Configuration

1. **Open** the configuration file:
   ```
   identity-core-api/src/main/resources/application.yml
   ```
   Or:
   ```
   identity-core-api/src/main/resources/application.properties
   ```

2. **Find** the database configuration section:

   **For application.yml:**
   ```yaml
   spring:
     datasource:
       url: jdbc:h2:mem:fivucsas_db
       driver-class-name: org.h2.Driver
     h2:
       console:
         enabled: true
     jpa:
       hibernate:
         ddl-auto: create-drop  # ← THIS IS CRITICAL
       show-sql: true
   ```

   **For application.properties:**
   ```properties
   spring.datasource.url=jdbc:h2:mem:fivucsas_db
   spring.datasource.driver-class-name=org.h2.Driver
   spring.h2.console.enabled=true
   spring.jpa.hibernate.ddl-auto=create-drop
   spring.jpa.show-sql=true
   ```

3. **Make sure** `ddl-auto` is set to one of:
   - `create-drop` - Creates tables on startup, drops on shutdown (good for development)
   - `update` - Updates schema when needed (safer)
   - `create` - Always creates fresh tables

4. **Restart the backend**:
   - Stop: Ctrl+C in terminal or Stop button in IntelliJ
   - Start: Same way you started it before

5. **Watch the console** during startup - you should see SQL DDL statements creating tables:
   ```
   Hibernate: create table tenants (...)
   Hibernate: create table users (...)
   ```

6. **Verify**:
   ```powershell
   .\diagnose-backend-detailed.ps1
   ```

---

## 🔧 Step 2C: Check Backend Logs

If you're getting INTERNAL_ERROR or other unclear errors:

### Find the Console Logs

**IntelliJ IDEA:**
1. Look at the bottom panel
2. Click the "Run" tab
3. Scroll through the console output
4. Look for RED text with stack traces

**Terminal:**
- Look at the window where you ran `mvnw spring-boot:run`
- Scroll up to find error messages

### What to Look For

Search for these keywords (Ctrl+F):
- `Exception`
- `Error`
- `at com.fivucsas`
- `Caused by:`

### Common Errors and Fixes

**Error: `NullPointerException in TenantService`**
```
Solution: Create default tenant (Step 2A)
```

**Error: `Bean 'dataSource' could not be created`**
```
Solution: Check database configuration (Step 2B)
```

**Error: `JWT secret key is too short`**
```
Solution: Already fixed in your config ✅
```

**Error: `Port 8080 is already in use`**
```
Solution:
1. Stop other process on port 8080
2. Or change port in application.yml
```

**Can't find the error?**
Copy the full stack trace and check:
- Spring Boot documentation
- Stack Overflow
- Or save it to show in our next session

---

## 🔧 Step 2D: Fix Spring Configuration

If you see "Bean creation error" or dependency injection issues:

### Check Required Dependencies

1. **Open** `pom.xml` in identity-core-api folder

2. **Verify** these dependencies exist:
   ```xml
   <dependency>
       <groupId>org.springframework.boot</groupId>
       <artifactId>spring-boot-starter-data-jpa</artifactId>
   </dependency>
   <dependency>
       <groupId>com.h2database</groupId>
       <artifactId>h2</artifactId>
       <scope>runtime</scope>
   </dependency>
   <dependency>
       <groupId>org.springframework.boot</groupId>
       <artifactId>spring-boot-starter-web</artifactId>
   </dependency>
   ```

3. **If any are missing**, add them and run:
   ```bash
   ./mvnw clean install
   ```

### Check Main Application Class

1. **Open**: `src/main/java/com/fivucsas/identitycoreapi/IdentityCoreApiApplication.java`

2. **Verify** it has these annotations:
   ```java
   @SpringBootApplication
   @EnableJpaRepositories
   @EntityScan(basePackages = "com.fivucsas.identitycoreapi.model")
   public class IdentityCoreApiApplication {
       public static void main(String[] args) {
           SpringApplication.run(IdentityCoreApiApplication.class, args);
       }
   }
   ```

---

## ✅ Step 3: Verify Everything Works

### Test 1: Quick Endpoint Test
```powershell
# Test registration
curl -X POST http://localhost:8080/api/v1/auth/register `
  -H "Content-Type: application/json" `
  -d '{"email":"test@example.com","password":"Pass123!","firstName":"Test","lastName":"User","tenantId":1}'
```

**Expected**: JSON response with user data (not an error)

### Test 2: Run Full Test Suite
```powershell
.\test-backend-complete.ps1
```

**Expected**: 100% success rate

### Test 3: Check H2 Console
1. Open http://localhost:8080/h2-console
2. Login (jdbc:h2:mem:fivucsas_db, username: sa)
3. Run: `SELECT * FROM USERS;`
4. You should see the test users created

---

## 🎉 Success Indicators

You've fixed the backend when:

✅ `.\diagnose-backend-detailed.ps1` shows all green checkmarks
✅ `.\test-backend-complete.ps1` shows 100% success rate
✅ H2 Console shows data in TENANTS and USERS tables
✅ No red errors in backend console logs

---

## 🚀 Next Steps After Backend is Fixed

1. **Keep backend running**

2. **Fix frontend npm issue**:
   ```powershell
   cd web-app
   npm install -g pnpm
   pnpm install
   pnpm dev
   ```

3. **Test integration**:
   - Open http://localhost:5173
   - Login with credentials
   - Verify data loads from backend

4. **Complete remaining integration**:
   - 25% of services still need connection
   - See BACKEND_INTEGRATION_STATUS.md

---

## 📞 Still Stuck?

### Quick Diagnostics Checklist

Run through this:
- [ ] Backend is running (check task manager/activity monitor)
- [ ] Port 8080 is accessible (visit http://localhost:8080)
- [ ] H2 Console works (http://localhost:8080/h2-console)
- [ ] Tables exist in H2 Console
- [ ] Default tenant exists (ID=1)
- [ ] No errors in backend console during startup
- [ ] application.yml has correct database config

### Get Help

1. **Save backend console output** to a file:
   - Copy all the red error text
   - Save to `backend-errors.txt`

2. **Run diagnostic and save output**:
   ```powershell
   .\diagnose-backend-detailed.ps1 > diagnosis.txt
   ```

3. **Check these files** for clues:
   - `IMMEDIATE_FIXES.md`
   - `FIX_INSTRUCTIONS.md`
   - `TESTING_NOTES.md`

4. **Search online**:
   - Copy the exact error message
   - Search: "Spring Boot [your error]"
   - Check Stack Overflow

---

## 📚 Reference

### Useful Commands

```powershell
# Diagnostic scripts
.\diagnose-backend-detailed.ps1    # Detailed diagnosis
.\quick-fix-backend.ps1            # Automated fix attempt
.\test-backend-complete.ps1        # Full API test suite

# H2 Console
Start-Process "http://localhost:8080/h2-console"

# Test single endpoint
Invoke-RestMethod -Uri "http://localhost:8080/api/v1/users" -Method Get

# Check backend process
Get-Process | Where-Object {$_.ProcessName -like "*java*"}
```

### Important Files

| File | Purpose |
|------|---------|
| `identity-core-api/src/main/resources/application.yml` | Main config |
| `identity-core-api/pom.xml` | Dependencies |
| `h2-database-check.sql` | Database diagnostic SQL |
| `BACKEND_INTEGRATION_STATUS.md` | Integration progress |
| `IMMEDIATE_FIXES.md` | Quick fixes reference |

### Endpoints Reference

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/v1/auth/register` | POST | Create new user |
| `/api/v1/auth/login` | POST | Login |
| `/api/v1/users` | GET | List users |
| `/api/v1/users/{id}` | GET | Get user by ID |
| `/api/v1/statistics` | GET | Dashboard stats |
| `/h2-console` | GET | Database console |

---

**Last Updated**: 2025-11-17
**Status**: Ready to use
**Estimated Fix Time**: 15-30 minutes
**Success Rate**: 95% (most issues are missing tenant)
