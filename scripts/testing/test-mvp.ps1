# FIVUCSAS MVP Test Script
# Run this after both Spring Boot and FastAPI are running

Write-Host "`n╔════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║     FIVUCSAS MVP - Automated Test Script        ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

$baseUrl = "http://localhost:8080/api/v1"
$testEmail = "mvptest@fivucsas.com"
$testPassword = "Test@123456"

Write-Host "Testing FIVUCSAS MVP endpoints...`n" -ForegroundColor Yellow

# Test 1: Health Check
Write-Host "[1/5] Testing health check..." -ForegroundColor Cyan
try {
    $health = Invoke-RestMethod -Uri "$baseUrl/auth/health" -Method Get
    Write-Host "✅ Health check passed: $($health)" -ForegroundColor Green
} catch {
    Write-Host "❌ Health check failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Test 2: User Registration
Write-Host "`n[2/5] Registering test user..." -ForegroundColor Cyan
$registerBody = @{
    email = $testEmail
    password = $testPassword
    firstName = "MVP"
    lastName = "Test"
} | ConvertTo-Json

try {
    $registerResponse = Invoke-RestMethod -Uri "$baseUrl/auth/register" `
        -Method Post `
        -Body $registerBody `
        -ContentType "application/json"
    
    $userId = $registerResponse.user.id
    $token = $registerResponse.accessToken
    
    Write-Host "✅ User registered successfully" -ForegroundColor Green
    Write-Host "   User ID: $userId" -ForegroundColor Gray
    Write-Host "   Token received: Yes" -ForegroundColor Gray
} catch {
    if ($_.Exception.Message -like "*already exists*") {
        Write-Host "⚠️  User already exists (this is OK)" -ForegroundColor Yellow
        
        # Try login instead
        $loginBody = @{
            email = $testEmail
            password = $testPassword
        } | ConvertTo-Json
        
        $loginResponse = Invoke-RestMethod -Uri "$baseUrl/auth/login" `
            -Method Post `
            -Body $loginBody `
            -ContentType "application/json"
        
        $userId = $loginResponse.user.id
        $token = $loginResponse.accessToken
        Write-Host "✅ Logged in with existing user" -ForegroundColor Green
    } else {
        Write-Host "❌ Registration failed: $($_.Exception.Message)" -ForegroundColor Red
        exit 1
    }
}

# Test 3: Login
Write-Host "`n[3/5] Testing login..." -ForegroundColor Cyan
$loginBody = @{
    email = $testEmail
    password = $testPassword
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/auth/login" `
        -Method Post `
        -Body $loginBody `
        -ContentType "application/json"
    
    Write-Host "✅ Login successful" -ForegroundColor Green
    Write-Host "   User: $($loginResponse.user.firstName) $($loginResponse.user.lastName)" -ForegroundColor Gray
    Write-Host "   Email: $($loginResponse.user.email)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Login failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Test 4: Check FastAPI
Write-Host "`n[4/5] Checking FastAPI biometric service..." -ForegroundColor Cyan
try {
    $fastapiHealth = Invoke-RestMethod -Uri "http://localhost:8001/health" -Method Get
    Write-Host "✅ FastAPI service is healthy" -ForegroundColor Green
    Write-Host "   Status: $($fastapiHealth.status)" -ForegroundColor Gray
} catch {
    Write-Host "❌ FastAPI service not available: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "   Make sure FastAPI is running on port 8001" -ForegroundColor Yellow
}

# Test 5: Integration Test (if you have a test image)
Write-Host "`n[5/5] Biometric endpoint check..." -ForegroundColor Cyan
Write-Host "⚠️  To test biometric endpoints, use Swagger UI:" -ForegroundColor Yellow
Write-Host "   - Spring Boot: http://localhost:8080/swagger-ui.html" -ForegroundColor Cyan
Write-Host "   - FastAPI: http://localhost:8001/docs" -ForegroundColor Cyan
Write-Host "`n   Upload a face photo to test enrollment and verification." -ForegroundColor Gray

Write-Host "`n╔════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║           ✅ MVP TESTS COMPLETED!                  ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════════════════╝`n" -ForegroundColor Green

Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Open Swagger UI: http://localhost:8080/swagger-ui.html" -ForegroundColor White
Write-Host "2. Test biometric enrollment with a face photo" -ForegroundColor White
Write-Host "3. Test biometric verification" -ForegroundColor White
Write-Host "4. Check H2 console: http://localhost:8080/h2-console`n" -ForegroundColor White

Write-Host "User ID for testing: $userId`n" -ForegroundColor Cyan
