# Quick Fix for FIVUCSAS Backend
# This script attempts to automatically fix the most common backend issues

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "   FIVUCSAS Backend Quick Fix" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "This script will attempt to:" -ForegroundColor Yellow
Write-Host "  1. Verify backend is running" -ForegroundColor White
Write-Host "  2. Check if default tenant exists" -ForegroundColor White
Write-Host "  3. Create default tenant if missing" -ForegroundColor White
Write-Host "  4. Verify the fix worked" -ForegroundColor White
Write-Host ""

# Step 1: Check backend is running
Write-Host "[Step 1/4] Checking if backend is running..." -ForegroundColor Yellow
try {
    $null = Invoke-WebRequest -Uri "http://localhost:8080" -Method Get -TimeoutSec 5 -ErrorAction Stop
    Write-Host "✓ Backend is running on port 8080" -ForegroundColor Green
} catch {
    Write-Host "✗ Backend is not running!" -ForegroundColor Red
    Write-Host "`nPlease start the backend first:" -ForegroundColor Yellow
    Write-Host "  • IntelliJ IDEA: Run 'IdentityCoreApiApplication'" -ForegroundColor White
    Write-Host "  • Terminal: cd identity-core-api && ./mvnw spring-boot:run`n" -ForegroundColor White
    exit 1
}

# Step 2: Check current state
Write-Host "`n[Step 2/4] Testing current API state..." -ForegroundColor Yellow

$testUser = @{
    email = "quickfix-test-$(Get-Random)@fivucsas.com"
    password = "TestPass123!"
    firstName = "QuickFix"
    lastName = "Test"
    tenantId = 1
}

$needsFix = $false
$errorType = ""

try {
    $response = Invoke-RestMethod `
        -Uri "http://localhost:8080/api/v1/auth/register" `
        -Method Post `
        -ContentType "application/json" `
        -Body ($testUser | ConvertTo-Json) `
        -TimeoutSec 10

    Write-Host "✓ API is working correctly! No fix needed." -ForegroundColor Green
    Write-Host "  User created successfully with ID: $($response.id)" -ForegroundColor Gray

    Write-Host "`n🎉 Your backend is already working fine!" -ForegroundColor Green
    Write-Host "`nYou can now:" -ForegroundColor White
    Write-Host "  • Run full tests: .\test-backend-complete.ps1" -ForegroundColor Cyan
    Write-Host "  • Start frontend: cd web-app && pnpm dev`n" -ForegroundColor Cyan
    exit 0

} catch {
    $needsFix = $true

    if ($_.ErrorDetails.Message) {
        try {
            $errorJson = $_.ErrorDetails.Message | ConvertFrom-Json
            $errorMessage = $errorJson.message

            Write-Host "✗ API Error: $errorMessage" -ForegroundColor Red

            if ($errorMessage -like "*Tenant*" -or $errorMessage -like "*tenant*") {
                $errorType = "MISSING_TENANT"
                Write-Host "  → Detected: Missing default tenant" -ForegroundColor Yellow
            }
            elseif ($errorMessage -like "*Table*not found*") {
                $errorType = "NO_TABLES"
                Write-Host "  → Detected: Database not initialized" -ForegroundColor Yellow
            }
            else {
                $errorType = "OTHER"
                Write-Host "  → Detected: Other error (see backend console)" -ForegroundColor Yellow
            }
        } catch {
            $errorType = "UNKNOWN"
            Write-Host "✗ Unknown error occurred" -ForegroundColor Red
        }
    }
}

# Step 3: Apply fix based on error type
Write-Host "`n[Step 3/4] Attempting to fix the issue..." -ForegroundColor Yellow

if ($errorType -eq "MISSING_TENANT") {
    Write-Host "Creating default tenant via H2 Console..." -ForegroundColor Cyan

    Write-Host "`n⚠️  MANUAL ACTION REQUIRED:" -ForegroundColor Yellow
    Write-Host "`nI cannot automatically execute SQL in H2 Console." -ForegroundColor White
    Write-Host "Please follow these steps:" -ForegroundColor White
    Write-Host "`n1. Open H2 Console in your browser:" -ForegroundColor Cyan
    Write-Host "   http://localhost:8080/h2-console" -ForegroundColor Green
    Write-Host "`n2. Login with these credentials:" -ForegroundColor Cyan
    Write-Host "   JDBC URL:  jdbc:h2:mem:fivucsas_db" -ForegroundColor White
    Write-Host "   Username:  sa" -ForegroundColor White
    Write-Host "   Password:  (leave empty, just click Connect)" -ForegroundColor White
    Write-Host "`n3. Run this SQL command:" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "   INSERT INTO TENANTS (ID, NAME, STATUS, MAX_USERS, CREATED_AT, UPDATED_AT)" -ForegroundColor Green
    Write-Host "   VALUES (1, 'Default Tenant', 'ACTIVE', 1000, CURRENT_TIMESTAMP(), CURRENT_TIMESTAMP());" -ForegroundColor Green
    Write-Host ""
    Write-Host "4. You should see 'Update count: 1'" -ForegroundColor Cyan
    Write-Host "`n5. Come back here and press Enter to verify the fix..." -ForegroundColor Cyan

    # Wait for user to fix manually
    Read-Host "`nPress Enter after you've created the tenant in H2 Console"

}
elseif ($errorType -eq "NO_TABLES") {
    Write-Host "`n⚠️  DATABASE NOT INITIALIZED!" -ForegroundColor Red
    Write-Host "`nThe database tables don't exist. This means:" -ForegroundColor Yellow
    Write-Host "  • Backend didn't create tables on startup" -ForegroundColor White
    Write-Host "  • Hibernate DDL auto-creation might be disabled" -ForegroundColor White

    Write-Host "`n🔧 TO FIX THIS:" -ForegroundColor Cyan
    Write-Host "`n1. Stop the backend (Ctrl+C in terminal or Stop in IntelliJ)" -ForegroundColor Yellow

    Write-Host "`n2. Check this file:" -ForegroundColor Yellow
    Write-Host "   identity-core-api/src/main/resources/application.yml" -ForegroundColor White

    Write-Host "`n3. Make sure it has these settings:" -ForegroundColor Yellow
    Write-Host "   spring:" -ForegroundColor Gray
    Write-Host "     jpa:" -ForegroundColor Gray
    Write-Host "       hibernate:" -ForegroundColor Gray
    Write-Host "         ddl-auto: create-drop  # or 'update'" -ForegroundColor Green

    Write-Host "`n4. Restart the backend" -ForegroundColor Yellow
    Write-Host "   Tables should be created automatically" -ForegroundColor White

    Write-Host "`n5. Run this script again to verify`n" -ForegroundColor Yellow
    exit 1

}
else {
    Write-Host "⚠️  Cannot auto-fix this error type" -ForegroundColor Yellow
    Write-Host "`nPlease:" -ForegroundColor White
    Write-Host "  1. Check backend console logs for detailed error" -ForegroundColor Cyan
    Write-Host "  2. Look for stack traces with keywords:" -ForegroundColor Cyan
    Write-Host "     - NullPointerException" -ForegroundColor Gray
    Write-Host "     - Bean creation error" -ForegroundColor Gray
    Write-Host "     - Database connection error" -ForegroundColor Gray
    Write-Host "  3. Run detailed diagnostics: .\diagnose-backend-detailed.ps1`n" -ForegroundColor Cyan
    exit 1
}

# Step 4: Verify the fix worked
Write-Host "`n[Step 4/4] Verifying the fix..." -ForegroundColor Yellow

$verifyUser = @{
    email = "verify-$(Get-Random)@fivucsas.com"
    password = "TestPass123!"
    firstName = "Verify"
    lastName = "Fix"
    tenantId = 1
}

try {
    $verifyResponse = Invoke-RestMethod `
        -Uri "http://localhost:8080/api/v1/auth/register" `
        -Method Post `
        -ContentType "application/json" `
        -Body ($verifyUser | ConvertTo-Json) `
        -TimeoutSec 10

    Write-Host "✓ Success! Backend is now working!" -ForegroundColor Green
    Write-Host "  Test user created with ID: $($verifyResponse.id)" -ForegroundColor Gray

    # Test a few more endpoints to be sure
    Write-Host "`nTesting additional endpoints..." -ForegroundColor Yellow

    try {
        $users = Invoke-RestMethod -Uri "http://localhost:8080/api/v1/users" -Method Get -TimeoutSec 5
        Write-Host "✓ Users endpoint working" -ForegroundColor Green
    } catch {
        Write-Host "⚠ Users endpoint still has issues" -ForegroundColor Yellow
    }

    try {
        $stats = Invoke-RestMethod -Uri "http://localhost:8080/api/v1/statistics" -Method Get -TimeoutSec 5
        Write-Host "✓ Statistics endpoint working" -ForegroundColor Green
    } catch {
        Write-Host "⚠ Statistics endpoint still has issues" -ForegroundColor Yellow
    }

    Write-Host "`n========================================" -ForegroundColor Cyan
    Write-Host "   ✅ BACKEND IS NOW OPERATIONAL!" -ForegroundColor Green
    Write-Host "========================================`n" -ForegroundColor Cyan

    Write-Host "Next steps:" -ForegroundColor White
    Write-Host "  1. Run full test suite: .\test-backend-complete.ps1" -ForegroundColor Cyan
    Write-Host "  2. Start frontend: cd web-app && pnpm dev" -ForegroundColor Cyan
    Write-Host "  3. Test integration at: http://localhost:5173`n" -ForegroundColor Cyan

} catch {
    Write-Host "✗ Verification failed" -ForegroundColor Red

    if ($_.ErrorDetails.Message) {
        $errorJson = $_.ErrorDetails.Message | ConvertFrom-Json
        Write-Host "  Error: $($errorJson.message)" -ForegroundColor Yellow
    }

    Write-Host "`n The fix didn't work. Please:" -ForegroundColor Yellow
    Write-Host "  1. Check backend console for detailed errors" -ForegroundColor White
    Write-Host "  2. Run: .\diagnose-backend-detailed.ps1" -ForegroundColor White
    Write-Host "  3. Review: IMMEDIATE_FIXES.md for manual steps`n" -ForegroundColor White
}
