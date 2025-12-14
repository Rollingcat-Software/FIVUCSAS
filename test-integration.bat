@echo off
REM FIVUCSAS Backend-Frontend Integration Test Script (Windows)
REM This script verifies that the integration is working correctly

echo ================================================
echo FIVUCSAS Integration Test
echo ================================================
echo.

set PASSED=0
set FAILED=0

echo 1. Testing Backend Health
curl -s -o nul -w "HTTP Status: %%{http_code}" http://localhost:8080/api/v1/auth/health
if %ERRORLEVEL% EQU 0 (
    echo [OK] Backend Health Check
    set /a PASSED+=1
) else (
    echo [FAIL] Backend Health Check
    set /a FAILED+=1
)
echo.

echo 2. Testing API Documentation
curl -s -o nul http://localhost:8080/swagger-ui.html
if %ERRORLEVEL% EQU 0 (
    echo [OK] Swagger UI is accessible
    set /a PASSED+=1
) else (
    echo [FAIL] Swagger UI is not accessible
    set /a FAILED+=1
)
echo.

echo 3. Testing Web App Configuration
if exist "web-app\.env" (
    findstr /C:"VITE_ENABLE_MOCK_API=false" "web-app\.env" >nul
    if %ERRORLEVEL% EQU 0 (
        echo [OK] Mock mode is disabled
        set /a PASSED+=1
    ) else (
        echo [FAIL] Mock mode is still enabled
        set /a FAILED+=1
    )
) else (
    echo [WARN] .env file not found
)
echo.

echo 4. Testing Mobile App Configuration
if exist "mobile-app\shared\src\commonMain\kotlin\com\fivucsas\shared\data\remote\config\ApiConfig.kt" (
    findstr /C:"useRealApi: Boolean = true" "mobile-app\shared\src\commonMain\kotlin\com\fivucsas\shared\data\remote\config\ApiConfig.kt" >nul
    if %ERRORLEVEL% EQU 0 (
        echo [OK] Real API is enabled
        set /a PASSED+=1
    ) else (
        echo [FAIL] Real API is not enabled
        set /a FAILED+=1
    )
) else (
    echo [WARN] ApiConfig.kt not found
)
echo.

echo 5. Testing Web App (if running)
curl -s -o nul http://localhost:5173
if %ERRORLEVEL% EQU 0 (
    echo [OK] Web app is running on port 5173
    set /a PASSED+=1
) else (
    echo [SKIP] Web app is not running (start with: cd web-app ^& pnpm dev^)
)
echo.

echo ================================================
echo Test Summary
echo ================================================
echo Passed: %PASSED%
echo Failed: %FAILED%
echo.

if %FAILED% EQU 0 (
    echo [SUCCESS] All tests passed! Integration is working correctly.
    exit /b 0
) else (
    echo [ERROR] Some tests failed. Please check the errors above.
    exit /b 1
)
