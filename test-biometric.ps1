# Test Biometric Service Complete Flow
Write-Host "🧪 Testing FIVUCSAS Biometric Service" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan

# Test 1: Health Check
Write-Host "`n✅ Test 1: Health Check" -ForegroundColor Green
try {
    $health = Invoke-RestMethod http://localhost:8001/health
    Write-Host "Status: $($health.status)" -ForegroundColor Green
} catch {
    Write-Host "❌ Health check failed: $_" -ForegroundColor Red
    exit 1
}

# Test 2: Face Recognition Health
Write-Host "`n✅ Test 2: Face Recognition Service" -ForegroundColor Green
try {
    $faceHealth = Invoke-RestMethod http://localhost:8001/api/v1/face/health
    Write-Host "Model: $($faceHealth.model)" -ForegroundColor Green
    Write-Host "Detector: $($faceHealth.detector)" -ForegroundColor Green
} catch {
    Write-Host "❌ Face health check failed: $_" -ForegroundColor Red
    exit 1
}

# Test 3: Service Info
Write-Host "`n✅ Test 3: Service Information" -ForegroundColor Green
try {
    $info = Invoke-RestMethod http://localhost:8001/
    Write-Host "Service: $($info.service)" -ForegroundColor Green
    Write-Host "Version: $($info.version)" -ForegroundColor Green
} catch {
    Write-Host "❌ Service info failed: $_" -ForegroundColor Red
    exit 1
}

Write-Host "`n=====================================" -ForegroundColor Cyan
Write-Host "🎉 All Biometric Tests Passed!" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Cyan

Write-Host "`n📚 API Documentation:" -ForegroundColor Yellow
Write-Host "http://localhost:8001/docs" -ForegroundColor Cyan

Write-Host "`n🎯 Next Steps:" -ForegroundColor Yellow
Write-Host "1. Test face enrollment with a sample image" -ForegroundColor White
Write-Host "2. Test face verification" -ForegroundColor White
Write-Host "3. Integrate with mobile app" -ForegroundColor White
