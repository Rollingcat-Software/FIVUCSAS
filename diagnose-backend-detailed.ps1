# Enhanced Backend Diagnostics - FIVUCSAS
# This script performs comprehensive backend health checks

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "   FIVUCSAS Backend Detailed Diagnostics" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

$results = @{
    backend_running = $false
    h2_accessible = $false
    database_initialized = $false
    endpoints_working = $false
    errors_found = @()
}

# Test 1: Check if backend is running
Write-Host "[1/7] Checking if backend is running on port 8080..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8080" -Method Get -TimeoutSec 5 -ErrorAction Stop
    Write-Host "✓ Backend is running" -ForegroundColor Green
    Write-Host "    Status Code: $($response.StatusCode)" -ForegroundColor Gray
    $results.backend_running = $true
} catch {
    Write-Host "✗ Backend not accessible on port 8080" -ForegroundColor Red
    Write-Host "    Error: $($_.Exception.Message)" -ForegroundColor Yellow
    $results.errors_found += "Backend not running on port 8080"

    Write-Host "`n    ACTION REQUIRED:" -ForegroundColor Yellow
    Write-Host "    1. Start your backend server" -ForegroundColor White
    Write-Host "    2. In IntelliJ IDEA: Run 'IdentityCoreApiApplication'" -ForegroundColor White
    Write-Host "    3. Or via terminal: cd identity-core-api && ./mvnw spring-boot:run" -ForegroundColor White

    Write-Host "`n❌ Cannot continue diagnostics without backend running`n" -ForegroundColor Red
    exit 1
}

# Test 2: Check H2 Console
Write-Host "`n[2/7] Checking H2 Database Console..." -ForegroundColor Yellow
try {
    $h2 = Invoke-WebRequest -Uri "http://localhost:8080/h2-console" -Method Get -TimeoutSec 5
    Write-Host "✓ H2 Console is accessible" -ForegroundColor Green
    $results.h2_accessible = $true

    Write-Host "`n    H2 Console Access Information:" -ForegroundColor Cyan
    Write-Host "    URL:       http://localhost:8080/h2-console" -ForegroundColor White
    Write-Host "    JDBC URL:  jdbc:h2:mem:fivucsas_db" -ForegroundColor White
    Write-Host "    Username:  sa" -ForegroundColor White
    Write-Host "    Password:  (leave empty)" -ForegroundColor White
} catch {
    Write-Host "✗ H2 Console not accessible" -ForegroundColor Red
    $results.errors_found += "H2 Console disabled or not configured"

    Write-Host "`n    ACTION REQUIRED:" -ForegroundColor Yellow
    Write-Host "    Check application.yml/application.properties for:" -ForegroundColor White
    Write-Host "    spring.h2.console.enabled=true" -ForegroundColor Gray
}

# Test 3: Test Health Endpoint (if exists)
Write-Host "`n[3/7] Testing Health/Actuator Endpoint..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "http://localhost:8080/actuator/health" -Method Get -TimeoutSec 5
    Write-Host "✓ Health endpoint responding" -ForegroundColor Green
    Write-Host "    Status: $($health.status)" -ForegroundColor Gray
} catch {
    Write-Host "⚠ Health endpoint not available (not critical)" -ForegroundColor Yellow
    # Not critical, continue
}

# Test 4: Test Auth Register Endpoint
Write-Host "`n[4/7] Testing /api/v1/auth/register..." -ForegroundColor Yellow
$testUser = @{
    email = "diagnostic-test-$(Get-Random)@fivucsas.com"
    password = "TestPass123!"
    firstName = "Diagnostic"
    lastName = "Test"
    tenantId = 1
}

try {
    $registerResponse = Invoke-RestMethod `
        -Uri "http://localhost:8080/api/v1/auth/register" `
        -Method Post `
        -ContentType "application/json" `
        -Body ($testUser | ConvertTo-Json) `
        -TimeoutSec 10

    Write-Host "✓ Registration endpoint working!" -ForegroundColor Green
    Write-Host "    User created with ID: $($registerResponse.id)" -ForegroundColor Gray
    $results.endpoints_working = $true
    $results.database_initialized = $true
} catch {
    Write-Host "✗ Registration failed" -ForegroundColor Red
    $errorMessage = $_.Exception.Message

    # Try to get detailed error response
    if ($_.ErrorDetails.Message) {
        try {
            $errorJson = $_.ErrorDetails.Message | ConvertFrom-Json
            Write-Host "`n    Error Type: $($errorJson.error)" -ForegroundColor Yellow
            Write-Host "    Message: $($errorJson.message)" -ForegroundColor Yellow
            Write-Host "    Status: $($errorJson.status)" -ForegroundColor Yellow

            $results.errors_found += $errorJson.message

            # Specific error handling
            if ($errorJson.message -like "*Tenant*not found*" -or $errorJson.message -like "*tenant*") {
                Write-Host "`n    ⚠️  TENANT ISSUE DETECTED!" -ForegroundColor Red
                Write-Host "    The default tenant (ID=1) doesn't exist in the database." -ForegroundColor Yellow
                Write-Host "`n    FIX THIS NOW:" -ForegroundColor Cyan
                Write-Host "    1. Open H2 Console: http://localhost:8080/h2-console" -ForegroundColor White
                Write-Host "    2. Login (username: sa, password: empty)" -ForegroundColor White
                Write-Host "    3. Run this SQL:" -ForegroundColor White
                Write-Host "`n    INSERT INTO TENANTS (ID, NAME, STATUS, MAX_USERS, CREATED_AT, UPDATED_AT)" -ForegroundColor Green
                Write-Host "    VALUES (1, 'Default Tenant', 'ACTIVE', 1000, CURRENT_TIMESTAMP(), CURRENT_TIMESTAMP());" -ForegroundColor Green
                Write-Host ""
            }
            elseif ($errorJson.message -like "*Table*not found*" -or $errorJson.message -like "*table*") {
                Write-Host "`n    ⚠️  DATABASE NOT INITIALIZED!" -ForegroundColor Red
                Write-Host "    Database tables don't exist." -ForegroundColor Yellow
                Write-Host "`n    FIX THIS NOW:" -ForegroundColor Cyan
                Write-Host "    1. Stop the backend" -ForegroundColor White
                Write-Host "    2. Check application.yml has:" -ForegroundColor White
                Write-Host "       jpa:" -ForegroundColor Gray
                Write-Host "         hibernate:" -ForegroundColor Gray
                Write-Host "           ddl-auto: create-drop" -ForegroundColor Gray
                Write-Host "    3. Restart backend (tables should auto-create)" -ForegroundColor White
                Write-Host ""
            }
            elseif ($errorJson.message -like "*INTERNAL_ERROR*" -or $errorJson.status -eq "INTERNAL_ERROR") {
                Write-Host "`n    ⚠️  INTERNAL SERVER ERROR!" -ForegroundColor Red
                Write-Host "    The backend is throwing an unhandled exception." -ForegroundColor Yellow
                Write-Host "`n    CHECK BACKEND CONSOLE NOW:" -ForegroundColor Cyan
                Write-Host "    Look for stack traces with:" -ForegroundColor White
                Write-Host "    - NullPointerException" -ForegroundColor Gray
                Write-Host "    - Bean creation error" -ForegroundColor Gray
                Write-Host "    - Database connection error" -ForegroundColor Gray
                Write-Host "    - JWT configuration error" -ForegroundColor Gray
                Write-Host ""
            }
        } catch {
            Write-Host "    Raw Error: $errorMessage" -ForegroundColor Yellow
            Write-Host "    Details: $($_.ErrorDetails.Message)" -ForegroundColor Yellow
        }
    } else {
        Write-Host "    Error: $errorMessage" -ForegroundColor Yellow
    }

    $results.errors_found += "Registration endpoint failed: $errorMessage"
}

# Test 5: Test Users List Endpoint
Write-Host "`n[5/7] Testing GET /api/v1/users..." -ForegroundColor Yellow
try {
    $users = Invoke-RestMethod -Uri "http://localhost:8080/api/v1/users" -Method Get -TimeoutSec 5
    Write-Host "✓ Users endpoint working" -ForegroundColor Green
    if ($users -is [Array]) {
        Write-Host "    Found $($users.Count) users in database" -ForegroundColor Gray
    }
} catch {
    Write-Host "✗ Users endpoint failed" -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
        $errorJson = $_.ErrorDetails.Message | ConvertFrom-Json
        Write-Host "    Error: $($errorJson.message)" -ForegroundColor Yellow
    }
    $results.errors_found += "Users endpoint failed"
}

# Test 6: Test Statistics Endpoint
Write-Host "`n[6/7] Testing GET /api/v1/statistics..." -ForegroundColor Yellow
try {
    $stats = Invoke-RestMethod -Uri "http://localhost:8080/api/v1/statistics" -Method Get -TimeoutSec 5
    Write-Host "✓ Statistics endpoint working" -ForegroundColor Green
    Write-Host "    Total Users: $($stats.totalUsers)" -ForegroundColor Gray
    Write-Host "    Active Users: $($stats.activeUsers)" -ForegroundColor Gray
} catch {
    Write-Host "✗ Statistics endpoint failed" -ForegroundColor Red
    $results.errors_found += "Statistics endpoint failed"
}

# Test 7: Check Backend Console Logs Location
Write-Host "`n[7/7] Locating Backend Console Logs..." -ForegroundColor Yellow
Write-Host "    To see detailed error traces, check:" -ForegroundColor Gray
Write-Host "    • IntelliJ IDEA: Run tool window (bottom panel)" -ForegroundColor White
Write-Host "    • Terminal: Where you ran 'mvnw spring-boot:run'" -ForegroundColor White
Write-Host "    • Log file: identity-core-api/logs/spring.log (if configured)" -ForegroundColor White

# Summary Report
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "   Diagnostic Summary" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "Backend Running:           " -NoNewline
if ($results.backend_running) { Write-Host "✓ YES" -ForegroundColor Green } else { Write-Host "✗ NO" -ForegroundColor Red }

Write-Host "H2 Console Accessible:     " -NoNewline
if ($results.h2_accessible) { Write-Host "✓ YES" -ForegroundColor Green } else { Write-Host "✗ NO" -ForegroundColor Red }

Write-Host "Database Initialized:      " -NoNewline
if ($results.database_initialized) { Write-Host "✓ YES" -ForegroundColor Green } else { Write-Host "? UNKNOWN" -ForegroundColor Yellow }

Write-Host "Endpoints Working:         " -NoNewline
if ($results.endpoints_working) { Write-Host "✓ YES" -ForegroundColor Green } else { Write-Host "✗ NO" -ForegroundColor Red }

if ($results.errors_found.Count -gt 0) {
    Write-Host "`n⚠️  Errors Found ($($results.errors_found.Count)):" -ForegroundColor Red
    $results.errors_found | ForEach-Object {
        Write-Host "    • $_" -ForegroundColor Yellow
    }
}

# Next Steps
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "   Next Steps" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

if ($results.endpoints_working) {
    Write-Host "🎉 Backend is working correctly!" -ForegroundColor Green
    Write-Host "`nYou can now:" -ForegroundColor White
    Write-Host "  1. Start the frontend: cd web-app && pnpm dev" -ForegroundColor Cyan
    Write-Host "  2. Test integration: .\test-backend-complete.ps1" -ForegroundColor Cyan
} else {
    Write-Host "❌ Backend needs fixes. Follow the actions above." -ForegroundColor Red
    Write-Host "`nMost common fixes:" -ForegroundColor White
    Write-Host "  1. Create default tenant in H2 Console (see above)" -ForegroundColor Yellow
    Write-Host "  2. Check backend console for stack traces" -ForegroundColor Yellow
    Write-Host "  3. Verify application.yml database config" -ForegroundColor Yellow
    Write-Host "`nAfter fixing, run this script again to verify." -ForegroundColor Cyan
}

Write-Host ""
