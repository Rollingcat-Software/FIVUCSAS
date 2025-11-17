# FIVUCSAS Backend Fix - Local Execution Script
# This script must be run on your LOCAL Windows machine where the backend is running

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "   FIVUCSAS Backend Fix Automation" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Set error action preference
$ErrorActionPreference = "Continue"

# Configuration
$backendUrl = "http://localhost:8080"
$h2ConsoleUrl = "$backendUrl/h2-console"
$apiBase = "$backendUrl/api/v1"

Write-Host "📋 Pre-flight Checks..." -ForegroundColor Yellow
Write-Host ""

# Check 1: Is backend running?
Write-Host "[1/3] Checking if backend is running on port 8080..." -ForegroundColor Cyan
try {
    $response = Invoke-WebRequest -Uri $backendUrl -Method Get -TimeoutSec 5 -ErrorAction Stop
    Write-Host "✓ Backend is responding on port 8080" -ForegroundColor Green
    $backendRunning = $true
} catch {
    Write-Host "✗ Backend is NOT running on port 8080" -ForegroundColor Red
    Write-Host ""
    Write-Host "❌ STOP: Backend must be running first!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please start your backend:" -ForegroundColor Yellow
    Write-Host "  Option 1 - IntelliJ IDEA:" -ForegroundColor White
    Write-Host "    • Open the project" -ForegroundColor Gray
    Write-Host "    • Find: IdentityCoreApiApplication.java" -ForegroundColor Gray
    Write-Host "    • Click the green Run button" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  Option 2 - Terminal/PowerShell:" -ForegroundColor White
    Write-Host "    cd identity-core-api" -ForegroundColor Gray
    Write-Host "    .\mvnw.cmd spring-boot:run" -ForegroundColor Gray
    Write-Host ""
    Write-Host "After starting the backend, run this script again." -ForegroundColor Cyan
    Write-Host ""
    exit 1
}

# Check 2: Java process check
Write-Host "`n[2/3] Checking for Java process..." -ForegroundColor Cyan
$javaProcesses = Get-Process -Name java -ErrorAction SilentlyContinue
if ($javaProcesses) {
    Write-Host "✓ Found $($javaProcesses.Count) Java process(es)" -ForegroundColor Green
} else {
    Write-Host "⚠ No Java processes found (backend might be running differently)" -ForegroundColor Yellow
}

# Check 3: H2 Console check
Write-Host "`n[3/3] Checking H2 Console access..." -ForegroundColor Cyan
try {
    $h2Response = Invoke-WebRequest -Uri $h2ConsoleUrl -Method Get -TimeoutSec 5 -ErrorAction Stop
    Write-Host "✓ H2 Console is accessible" -ForegroundColor Green
    $h2Available = $true
} catch {
    Write-Host "⚠ H2 Console not accessible (may be disabled)" -ForegroundColor Yellow
    $h2Available = $false
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "   Running Diagnostics" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Test the API
Write-Host "Testing API endpoint..." -ForegroundColor Yellow

$testUser = @{
    email = "autofix-test-$(Get-Random -Minimum 1000 -Maximum 9999)@fivucsas.com"
    password = "SecurePass123!"
    firstName = "AutoFix"
    lastName = "Test"
    tenantId = 1
}

$apiWorking = $false
$errorType = $null
$errorDetails = $null

try {
    $registerResponse = Invoke-RestMethod `
        -Uri "$apiBase/auth/register" `
        -Method Post `
        -ContentType "application/json" `
        -Body ($testUser | ConvertTo-Json -Depth 10) `
        -TimeoutSec 10

    Write-Host "✓ API is WORKING!" -ForegroundColor Green
    Write-Host "  User created successfully: $($registerResponse.email)" -ForegroundColor Gray
    $apiWorking = $true

} catch {
    Write-Host "✗ API returned an error" -ForegroundColor Red

    if ($_.ErrorDetails.Message) {
        try {
            $errorJson = $_.ErrorDetails.Message | ConvertFrom-Json
            $errorDetails = $errorJson

            Write-Host ""
            Write-Host "Error Details:" -ForegroundColor Yellow
            Write-Host "  Type: $($errorJson.error)" -ForegroundColor Gray
            Write-Host "  Message: $($errorJson.message)" -ForegroundColor Gray
            Write-Host "  Status: $($errorJson.status)" -ForegroundColor Gray

            # Categorize error
            if ($errorJson.message -like "*Tenant*" -or $errorJson.message -like "*tenant*") {
                $errorType = "MISSING_TENANT"
            }
            elseif ($errorJson.message -like "*Table*not found*" -or $errorJson.message -like "*table*") {
                $errorType = "NO_DATABASE"
            }
            elseif ($errorJson.status -eq "INTERNAL_ERROR" -or $errorJson.error -like "*500*") {
                $errorType = "INTERNAL_ERROR"
            }
            else {
                $errorType = "OTHER"
            }

        } catch {
            Write-Host "  Raw Error: $($_.Exception.Message)" -ForegroundColor Gray
            $errorType = "UNKNOWN"
        }
    }
}

# If API is working, we're done!
if ($apiWorking) {
    Write-Host "`n========================================" -ForegroundColor Cyan
    Write-Host "   ✅ BACKEND IS WORKING!" -ForegroundColor Green
    Write-Host "========================================`n" -ForegroundColor Cyan

    Write-Host "Your backend is operational. You can now:" -ForegroundColor White
    Write-Host "  1. Run full tests: .\test-backend-complete.ps1" -ForegroundColor Cyan
    Write-Host "  2. Fix frontend: cd web-app && pnpm install && pnpm dev" -ForegroundColor Cyan
    Write-Host "  3. Open web app: http://localhost:5173" -ForegroundColor Cyan
    Write-Host ""
    exit 0
}

# API is not working - let's fix it
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "   🔧 Attempting Automatic Fix" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

switch ($errorType) {
    "MISSING_TENANT" {
        Write-Host "Detected: Missing Default Tenant" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "The default tenant (ID=1) doesn't exist in the database." -ForegroundColor White
        Write-Host "This is the most common issue and is easy to fix!" -ForegroundColor White
        Write-Host ""

        if ($h2Available) {
            Write-Host "🔧 FIX STEPS:" -ForegroundColor Cyan
            Write-Host ""
            Write-Host "1. Opening H2 Console in your browser..." -ForegroundColor Yellow
            Start-Process $h2ConsoleUrl
            Start-Sleep -Seconds 2

            Write-Host "2. In the H2 Console login page:" -ForegroundColor Yellow
            Write-Host "   JDBC URL:  jdbc:h2:mem:fivucsas_db" -ForegroundColor Green
            Write-Host "   Username:  sa" -ForegroundColor Green
            Write-Host "   Password:  (leave empty)" -ForegroundColor Green
            Write-Host "   Then click 'Connect'" -ForegroundColor Yellow
            Write-Host ""

            Write-Host "3. Copy and paste this SQL command:" -ForegroundColor Yellow
            $sqlCommand = @"
INSERT INTO TENANTS (ID, NAME, STATUS, MAX_USERS, CREATED_AT, UPDATED_AT)
VALUES (1, 'Default Tenant', 'ACTIVE', 1000, CURRENT_TIMESTAMP(), CURRENT_TIMESTAMP());
"@
            Write-Host ""
            Write-Host $sqlCommand -ForegroundColor Green
            Write-Host ""

            # Copy SQL to clipboard
            try {
                Set-Clipboard -Value $sqlCommand
                Write-Host "✓ SQL command copied to clipboard!" -ForegroundColor Green
            } catch {
                Write-Host "⚠ Could not copy to clipboard, please copy manually" -ForegroundColor Yellow
            }

            Write-Host ""
            Write-Host "4. Click 'Run' (or press Ctrl+Enter)" -ForegroundColor Yellow
            Write-Host "   You should see: 'Update count: 1'" -ForegroundColor Gray
            Write-Host ""

            # Wait for user to complete
            Write-Host "Press Enter after you've run the SQL command in H2 Console..." -ForegroundColor Cyan
            Read-Host

        } else {
            Write-Host "⚠ H2 Console is not accessible" -ForegroundColor Red
            Write-Host ""
            Write-Host "Please enable H2 Console in your application.yml:" -ForegroundColor Yellow
            Write-Host "  spring:" -ForegroundColor Gray
            Write-Host "    h2:" -ForegroundColor Gray
            Write-Host "      console:" -ForegroundColor Gray
            Write-Host "        enabled: true" -ForegroundColor Green
            Write-Host ""
            Write-Host "Then restart the backend and run this script again." -ForegroundColor Cyan
            exit 1
        }
    }

    "NO_DATABASE" {
        Write-Host "Detected: Database Not Initialized" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "The database tables don't exist. This means Hibernate" -ForegroundColor White
        Write-Host "didn't create them automatically on startup." -ForegroundColor White
        Write-Host ""
        Write-Host "🔧 FIX STEPS:" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "1. Stop the backend (Ctrl+C in terminal or Stop in IntelliJ)" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "2. Open: identity-core-api/src/main/resources/application.yml" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "3. Add or update this configuration:" -ForegroundColor Yellow
        Write-Host "   spring:" -ForegroundColor Gray
        Write-Host "     jpa:" -ForegroundColor Gray
        Write-Host "       hibernate:" -ForegroundColor Gray
        Write-Host "         ddl-auto: create-drop" -ForegroundColor Green
        Write-Host ""
        Write-Host "4. Save the file and restart the backend" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "5. Run this script again to verify" -ForegroundColor Yellow
        Write-Host ""
        exit 1
    }

    "INTERNAL_ERROR" {
        Write-Host "Detected: Internal Server Error" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "The backend is throwing an unhandled exception." -ForegroundColor White
        Write-Host ""
        Write-Host "🔍 NEXT STEPS:" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "1. Check the backend console/terminal for detailed error logs" -ForegroundColor Yellow
        Write-Host "   Look for RED text with stack traces" -ForegroundColor Gray
        Write-Host ""
        Write-Host "2. Search for these keywords:" -ForegroundColor Yellow
        Write-Host "   • Exception" -ForegroundColor Gray
        Write-Host "   • Error" -ForegroundColor Gray
        Write-Host "   • at com.fivucsas" -ForegroundColor Gray
        Write-Host "   • Caused by:" -ForegroundColor Gray
        Write-Host ""
        Write-Host "3. Common causes:" -ForegroundColor Yellow
        Write-Host "   • NullPointerException → Usually missing tenant" -ForegroundColor Gray
        Write-Host "   • Bean creation error → Configuration issue" -ForegroundColor Gray
        Write-Host "   • Database error → Connection or schema issue" -ForegroundColor Gray
        Write-Host ""
        Write-Host "4. For detailed diagnosis, run:" -ForegroundColor Yellow
        Write-Host "   .\diagnose-backend-detailed.ps1" -ForegroundColor Cyan
        Write-Host ""
        exit 1
    }

    default {
        Write-Host "Detected: Unknown Error" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Could not automatically determine the issue." -ForegroundColor White
        Write-Host ""
        Write-Host "🔍 NEXT STEPS:" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "1. Check backend console logs for detailed errors" -ForegroundColor Yellow
        Write-Host "2. Run detailed diagnostics: .\diagnose-backend-detailed.ps1" -ForegroundColor Yellow
        Write-Host "3. Consult: BACKEND_FIX_GUIDE.md" -ForegroundColor Yellow
        Write-Host ""
        exit 1
    }
}

# Verify the fix worked
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "   🔍 Verifying Fix" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

$verifyUser = @{
    email = "verify-$(Get-Random -Minimum 1000 -Maximum 9999)@fivucsas.com"
    password = "SecurePass123!"
    firstName = "Verify"
    lastName = "Test"
    tenantId = 1
}

try {
    $verifyResponse = Invoke-RestMethod `
        -Uri "$apiBase/auth/register" `
        -Method Post `
        -ContentType "application/json" `
        -Body ($verifyUser | ConvertTo-Json -Depth 10) `
        -TimeoutSec 10

    Write-Host "✅ SUCCESS! Backend is now working!" -ForegroundColor Green
    Write-Host "   Test user created: $($verifyResponse.email)" -ForegroundColor Gray
    Write-Host ""

    # Test a few more endpoints
    Write-Host "Testing additional endpoints..." -ForegroundColor Yellow

    $allWorking = $true

    try {
        $users = Invoke-RestMethod -Uri "$apiBase/users" -Method Get -TimeoutSec 5
        Write-Host "✓ GET /users - Working" -ForegroundColor Green
    } catch {
        Write-Host "⚠ GET /users - Failed" -ForegroundColor Yellow
        $allWorking = $false
    }

    try {
        $stats = Invoke-RestMethod -Uri "$apiBase/statistics" -Method Get -TimeoutSec 5
        Write-Host "✓ GET /statistics - Working" -ForegroundColor Green
    } catch {
        Write-Host "⚠ GET /statistics - Failed" -ForegroundColor Yellow
        $allWorking = $false
    }

    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "   ✅ BACKEND IS NOW OPERATIONAL!" -ForegroundColor Green
    Write-Host "========================================`n" -ForegroundColor Cyan

    Write-Host "🎉 Congratulations! Your backend is fixed and working." -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor White
    Write-Host "  1. Run full test suite:" -ForegroundColor Cyan
    Write-Host "     .\test-backend-complete.ps1" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  2. Fix frontend npm issue:" -ForegroundColor Cyan
    Write-Host "     cd web-app" -ForegroundColor Gray
    Write-Host "     npm install -g pnpm" -ForegroundColor Gray
    Write-Host "     pnpm install" -ForegroundColor Gray
    Write-Host "     pnpm dev" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  3. Test integration:" -ForegroundColor Cyan
    Write-Host "     Open: http://localhost:5173" -ForegroundColor Gray
    Write-Host ""

} catch {
    Write-Host "❌ Verification failed" -ForegroundColor Red

    if ($_.ErrorDetails.Message) {
        $verifyError = $_.ErrorDetails.Message | ConvertFrom-Json
        Write-Host "   Error: $($verifyError.message)" -ForegroundColor Yellow
    }

    Write-Host ""
    Write-Host "The fix didn't work. Please:" -ForegroundColor Yellow
    Write-Host "  1. Check backend console for errors" -ForegroundColor White
    Write-Host "  2. Make sure you ran the SQL command correctly" -ForegroundColor White
    Write-Host "  3. Try running: .\diagnose-backend-detailed.ps1" -ForegroundColor White
    Write-Host "  4. Consult: BACKEND_FIX_GUIDE.md" -ForegroundColor White
    Write-Host ""
}
