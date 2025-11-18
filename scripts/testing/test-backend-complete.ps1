# Complete Backend Test Suite
# Tests all endpoints including auth

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "   FIVUCSAS Backend Complete Test" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

$baseUrl = "http://localhost:8080/api/v1"
$testResults = @{
    passed = 0
    failed = 0
    tests = @()
}

function Test-Endpoint {
    param(
        [string]$Name,
        [string]$Method,
        [string]$Url,
        [object]$Body = $null,
        [string]$Token = $null
    )
    
    try {
        $headers = @{"Content-Type" = "application/json"}
        if ($Token) {
            $headers["Authorization"] = "Bearer $Token"
        }
        
        $params = @{
            Uri = $Url
            Method = $Method
            Headers = $headers
        }
        
        if ($Body) {
            $params.Body = ($Body | ConvertTo-Json)
        }
        
        $response = Invoke-RestMethod @params
        Write-Host "✅ $Name" -ForegroundColor Green
        $testResults.passed++
        $testResults.tests += @{name = $Name; status = "PASSED"}
        return $response
    } catch {
        Write-Host "❌ $Name" -ForegroundColor Red
        Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Yellow
        $testResults.failed++
        $testResults.tests += @{name = $Name; status = "FAILED"; error = $_.Exception.Message}
        return $null
    }
}

Write-Host "📝 Testing Authentication Endpoints..." -ForegroundColor Yellow
Write-Host ""

# Test 1: Register
$registerData = @{
    email = "testuser@fivucsas.com"
    password = "SecurePass123"
    firstName = "John"
    lastName = "Doe"
}

$registerResponse = Test-Endpoint `
    -Name "POST /auth/register - Create new user" `
    -Method "POST" `
    -Url "$baseUrl/auth/register" `
    -Body $registerData

$token = $null
if ($registerResponse) {
    $token = $registerResponse.accessToken
    Write-Host "   Token received: $($token.Substring(0, 30))..." -ForegroundColor Gray
}

# Test 2: Login
$loginData = @{
    email = "testuser@fivucsas.com"
    password = "SecurePass123"
}

$loginResponse = Test-Endpoint `
    -Name "POST /auth/login - Login with credentials" `
    -Method "POST" `
    -Url "$baseUrl/auth/login" `
    -Body $loginData

Write-Host ""
Write-Host "📝 Testing User Management Endpoints..." -ForegroundColor Yellow
Write-Host ""

# Test 3: Create User via /users
$userData = @{
    firstName = "Jane"
    lastName = "Smith"
    email = "jane.smith@fivucsas.com"
    idNumber = "98765432101"
    phoneNumber = "+905559876543"
    address = "456 Test Street, Istanbul"
    passwordHash = '$2a$10$hashedpassword'
}

$createResponse = Test-Endpoint `
    -Name "POST /users - Create user directly" `
    -Method "POST" `
    -Url "$baseUrl/users" `
    -Body $userData

$userId = $null
if ($createResponse) {
    $userId = $createResponse.id
}

# Test 4: Get all users
$usersResponse = Test-Endpoint `
    -Name "GET /users - List all users" `
    -Method "GET" `
    -Url "$baseUrl/users"

# Test 5: Get user by ID
if ($userId) {
    Test-Endpoint `
        -Name "GET /users/{id} - Get user by ID" `
        -Method "GET" `
        -Url "$baseUrl/users/$userId" | Out-Null
}

# Test 6: Search users
Test-Endpoint `
    -Name "GET /users/search - Search users" `
    -Method "GET" `
    -Url "$baseUrl/users/search?query=Jane" | Out-Null

# Test 7: Update user
if ($userId) {
    $updateData = @{
        firstName = "Jane"
        lastName = "Smith-Updated"
        email = "jane.smith@fivucsas.com"
        phoneNumber = "+905559876543"
        address = "789 New Address, Ankara"
    }
    
    Test-Endpoint `
        -Name "PUT /users/{id} - Update user" `
        -Method "PUT" `
        -Url "$baseUrl/users/$userId" `
        -Body $updateData | Out-Null
}

Write-Host ""
Write-Host "📝 Testing Statistics Endpoint..." -ForegroundColor Yellow
Write-Host ""

# Test 8: Get statistics
$statsResponse = Test-Endpoint `
    -Name "GET /statistics - Get system statistics" `
    -Method "GET" `
    -Url "$baseUrl/statistics"

if ($statsResponse) {
    Write-Host "   Total Users: $($statsResponse.totalUsers)" -ForegroundColor Gray
    Write-Host "   Active Users: $($statsResponse.activeUsers)" -ForegroundColor Gray
    Write-Host "   Enrolled Users: $($statsResponse.enrolledUsers)" -ForegroundColor Gray
}

# Test 9: Delete user (cleanup)
if ($userId) {
    Write-Host ""
    Write-Host "🧹 Cleanup..." -ForegroundColor Yellow
    Test-Endpoint `
        -Name "DELETE /users/{id} - Delete user" `
        -Method "DELETE" `
        -Url "$baseUrl/users/$userId" | Out-Null
}

# Summary
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   Test Results Summary" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Total Tests: $($testResults.passed + $testResults.failed)" -ForegroundColor White
Write-Host "Passed: $($testResults.passed)" -ForegroundColor Green
Write-Host "Failed: $($testResults.failed)" -ForegroundColor Red

$successRate = [math]::Round(($testResults.passed / ($testResults.passed + $testResults.failed)) * 100, 1)
Write-Host "Success Rate: $successRate%" -ForegroundColor $(if ($successRate -eq 100) { "Green" } elseif ($successRate -ge 80) { "Yellow" } else { "Red" })

Write-Host ""
if ($testResults.failed -eq 0) {
    Write-Host "🎉 All tests passed! Backend is fully operational." -ForegroundColor Green
} else {
    Write-Host "⚠️  Some tests failed. Review the output above." -ForegroundColor Yellow
}
Write-Host ""
