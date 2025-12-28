# Quick Backend Diagnostics
Write-Host "`n=== FIVUCSAS Backend Diagnostics ===" -ForegroundColor Cyan

# Test 1: Health Check with full error details
Write-Host "`n[1] Testing Health Endpoint..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8080/api/v1/auth/health" -Method Get
    Write-Host "✓ Status: $($response.StatusCode)" -ForegroundColor Green
    Write-Host "Response: $($response.Content)" -ForegroundColor Gray
} catch {
    Write-Host "✗ Failed" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
        Write-Host "Details:" -ForegroundColor Yellow
        Write-Host $_.ErrorDetails.Message -ForegroundColor Yellow
    }
}

# Test 2: Check H2 Console
Write-Host "`n[2] Checking H2 Console..." -ForegroundColor Yellow
try {
    $h2 = Invoke-WebRequest -Uri "http://localhost:8080/h2-console" -Method Get
    Write-Host "✓ H2 Console is accessible" -ForegroundColor Green
    Write-Host "Open: http://localhost:8080/h2-console" -ForegroundColor Cyan
    Write-Host "JDBC URL: jdbc:h2:mem:fivucsas_db" -ForegroundColor Gray
    Write-Host "Username: sa" -ForegroundColor Gray
    Write-Host "Password: (empty)" -ForegroundColor Gray
} catch {
    Write-Host "✗ H2 Console not accessible" -ForegroundColor Red
}

# Test 3: Simple GET request
Write-Host "`n[3] Testing /users endpoint..." -ForegroundColor Yellow
try {
    $users = Invoke-WebRequest -Uri "http://localhost:8080/api/v1/users" -Method Get
    Write-Host "✓ Status: $($users.StatusCode)" -ForegroundColor Green
    Write-Host "Response: $($users.Content)" -ForegroundColor Gray
} catch {
    Write-Host "✗ Failed" -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
        Write-Host "Details:" -ForegroundColor Yellow
        Write-Host $_.ErrorDetails.Message -ForegroundColor Yellow
    }
}

Write-Host "`n=== Diagnosis Complete ===" -ForegroundColor Cyan
Write-Host "`nNext Steps:" -ForegroundColor Yellow
Write-Host "1. Check the backend console/terminal for detailed error stack traces" -ForegroundColor White
Write-Host "2. Look for errors like 'NullPointerException' or 'Bean creation error'" -ForegroundColor White
Write-Host "3. Open H2 Console (link above) to check if tables exist" -ForegroundColor White
Write-Host ""
