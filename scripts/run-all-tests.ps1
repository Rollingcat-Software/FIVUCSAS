#!/usr/bin/env pwsh
<#
.SYNOPSIS
    FIVUCSAS E2E Test Runner - Runs all tests across all modules

.DESCRIPTION
    This script executes tests for all FIVUCSAS modules:
    - biometric-processor (Python/pytest)
    - identity-core-api (Java/Gradle)
    - web-app (TypeScript/Vitest)

    Results are collected and summarized at the end.

.PARAMETER Module
    Specific module to test (biometric-processor, identity-core-api, web-app, all)

.PARAMETER SkipBuild
    Skip build steps before running tests

.PARAMETER Coverage
    Generate coverage reports

.PARAMETER Verbose
    Show detailed test output

.EXAMPLE
    .\run-all-tests.ps1
    Runs all tests with default settings

.EXAMPLE
    .\run-all-tests.ps1 -Module web-app -Coverage
    Runs only web-app tests with coverage

.EXAMPLE
    .\run-all-tests.ps1 -SkipBuild -Verbose
    Runs all tests without building, showing verbose output
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory=$false)]
    [ValidateSet("all", "biometric-processor", "identity-core-api", "web-app")]
    [string]$Module = "all",

    [Parameter(Mandatory=$false)]
    [switch]$SkipBuild,

    [Parameter(Mandatory=$false)]
    [switch]$Coverage,

    [Parameter(Mandatory=$false)]
    [switch]$Verbose
)

# Configuration
$ErrorActionPreference = "Continue"
$ProjectRoot = $PSScriptRoot
$TestResults = @{}
$StartTime = Get-Date

# Colors for output
function Write-ColorOutput {
    param(
        [Parameter(Mandatory=$true)]
        [string]$Message,
        [Parameter(Mandatory=$false)]
        [ValidateSet("Success", "Error", "Warning", "Info", "Header")]
        [string]$Type = "Info"
    )

    $colors = @{
        Success = "Green"
        Error = "Red"
        Warning = "Yellow"
        Info = "Cyan"
        Header = "Magenta"
    }

    Write-Host $Message -ForegroundColor $colors[$Type]
}

# Print header
function Print-Header {
    param([string]$Title)

    Write-Host ""
    Write-ColorOutput "═══════════════════════════════════════════════════════════" -Type Header
    Write-ColorOutput "  $Title" -Type Header
    Write-ColorOutput "═══════════════════════════════════════════════════════════" -Type Header
    Write-Host ""
}

# Print test summary
function Print-TestSummary {
    param(
        [string]$ModuleName,
        [bool]$Success,
        [string]$Duration,
        [string]$Details = ""
    )

    $status = if ($Success) { "✓ PASSED" } else { "✗ FAILED" }
    $statusColor = if ($Success) { "Success" } else { "Error" }

    Write-Host ""
    Write-ColorOutput "[$status] $ModuleName - $Duration" -Type $statusColor
    if ($Details) {
        Write-ColorOutput "  Details: $Details" -Type Info
    }
}

# Test biometric-processor (Python/pytest)
function Test-BiometricProcessor {
    Print-Header "Testing: biometric-processor (Python)"

    $modulePath = Join-Path $ProjectRoot "biometric-processor"
    $startTime = Get-Date

    if (-not (Test-Path $modulePath)) {
        Write-ColorOutput "ERROR: biometric-processor directory not found" -Type Error
        return $false
    }

    Push-Location $modulePath
    try {
        Write-ColorOutput "Running pytest for biometric-processor..." -Type Info

        # Check if Python is available
        $pythonCmd = Get-Command python -ErrorAction SilentlyContinue
        if (-not $pythonCmd) {
            Write-ColorOutput "ERROR: Python not found in PATH" -Type Error
            return $false
        }

        Write-ColorOutput "Python version: $(python --version)" -Type Info

        # Install dependencies if needed
        if (-not $SkipBuild) {
            Write-ColorOutput "Installing Python dependencies..." -Type Info
            python -m pip install -q -r requirements.txt
            python -m pip install -q pytest pytest-cov pytest-asyncio
        }

        # Run pytest
        $pytestArgs = @("-v", "--tb=short", "--color=yes")

        if ($Coverage) {
            $pytestArgs += @("--cov=app", "--cov-report=term", "--cov-report=html", "--cov-report=xml")
        }

        if ($Verbose) {
            $pytestArgs += "-vv"
        }

        # Run E2E tests specifically
        Write-ColorOutput "Running E2E workflow tests..." -Type Info
        $pytestArgs += "tests/e2e/"

        $result = & python -m pytest @pytestArgs
        $exitCode = $LASTEXITCODE

        $duration = (Get-Date) - $startTime
        $durationStr = "{0:mm}m {0:ss}s" -f $duration

        if ($exitCode -eq 0) {
            Print-TestSummary -ModuleName "biometric-processor" -Success $true -Duration $durationStr
            return $true
        } else {
            Print-TestSummary -ModuleName "biometric-processor" -Success $false -Duration $durationStr -Details "Exit code: $exitCode"
            return $false
        }
    }
    catch {
        Write-ColorOutput "ERROR: Exception during biometric-processor tests: $_" -Type Error
        return $false
    }
    finally {
        Pop-Location
    }
}

# Test identity-core-api (Java/Gradle)
function Test-IdentityCoreAPI {
    Print-Header "Testing: identity-core-api (Java/Gradle)"

    $modulePath = Join-Path $ProjectRoot "identity-core-api"
    $startTime = Get-Date

    if (-not (Test-Path $modulePath)) {
        Write-ColorOutput "ERROR: identity-core-api directory not found" -Type Error
        return $false
    }

    Push-Location $modulePath
    try {
        Write-ColorOutput "Running Gradle tests for identity-core-api..." -Type Info

        # Check if Gradle wrapper exists
        $gradlewCmd = if ($IsWindows -or $env:OS -match "Windows") {
            ".\gradlew.bat"
        } else {
            "./gradlew"
        }

        if (-not (Test-Path $gradlewCmd)) {
            Write-ColorOutput "ERROR: Gradle wrapper not found" -Type Error
            return $false
        }

        # Build if needed
        if (-not $SkipBuild) {
            Write-ColorOutput "Building identity-core-api..." -Type Info
            & $gradlewCmd clean build -x test
        }

        # Run tests
        Write-ColorOutput "Running integration and unit tests..." -Type Info

        $gradleArgs = @("test")

        if ($Verbose) {
            $gradleArgs += "--info"
        }

        if ($Coverage) {
            $gradleArgs += "jacocoTestReport"
        }

        $result = & $gradlewCmd @gradleArgs
        $exitCode = $LASTEXITCODE

        $duration = (Get-Date) - $startTime
        $durationStr = "{0:mm}m {0:ss}s" -f $duration

        # Check test results
        $testReportPath = Join-Path $modulePath "build/reports/tests/test/index.html"

        if ($exitCode -eq 0) {
            if (Test-Path $testReportPath) {
                Write-ColorOutput "Test report: $testReportPath" -Type Info
            }
            Print-TestSummary -ModuleName "identity-core-api" -Success $true -Duration $durationStr
            return $true
        } else {
            if (Test-Path $testReportPath) {
                Write-ColorOutput "Test report: $testReportPath" -Type Warning
            }
            Print-TestSummary -ModuleName "identity-core-api" -Success $false -Duration $durationStr -Details "Exit code: $exitCode"
            return $false
        }
    }
    catch {
        Write-ColorOutput "ERROR: Exception during identity-core-api tests: $_" -Type Error
        return $false
    }
    finally {
        Pop-Location
    }
}

# Test web-app (TypeScript/Vitest)
function Test-WebApp {
    Print-Header "Testing: web-app (TypeScript/Vitest)"

    $modulePath = Join-Path $ProjectRoot "web-app"
    $startTime = Get-Date

    if (-not (Test-Path $modulePath)) {
        Write-ColorOutput "ERROR: web-app directory not found" -Type Error
        return $false
    }

    Push-Location $modulePath
    try {
        Write-ColorOutput "Running Vitest for web-app..." -Type Info

        # Check if npm is available
        $npmCmd = Get-Command npm -ErrorAction SilentlyContinue
        if (-not $npmCmd) {
            Write-ColorOutput "ERROR: npm not found in PATH" -Type Error
            return $false
        }

        # Install dependencies if needed
        if (-not $SkipBuild) {
            Write-ColorOutput "Installing npm dependencies..." -Type Info
            npm install --silent
        }

        # Run tests
        Write-ColorOutput "Running Vitest tests (unit + E2E)..." -Type Info

        $vitestArgs = @("run", "test")

        if ($Coverage) {
            $vitestArgs = @("run", "test:coverage")
        }

        if ($Verbose) {
            $vitestArgs += "--reporter=verbose"
        }

        $result = & npm @vitestArgs
        $exitCode = $LASTEXITCODE

        $duration = (Get-Date) - $startTime
        $durationStr = "{0:mm}m {0:ss}s" -f $duration

        # Check coverage report
        $coverageReportPath = Join-Path $modulePath "coverage/index.html"

        if ($exitCode -eq 0) {
            if ($Coverage -and (Test-Path $coverageReportPath)) {
                Write-ColorOutput "Coverage report: $coverageReportPath" -Type Info
            }
            Print-TestSummary -ModuleName "web-app" -Success $true -Duration $durationStr
            return $true
        } else {
            Print-TestSummary -ModuleName "web-app" -Success $false -Duration $durationStr -Details "Exit code: $exitCode"
            return $false
        }
    }
    catch {
        Write-ColorOutput "ERROR: Exception during web-app tests: $_" -Type Error
        return $false
    }
    finally {
        Pop-Location
    }
}

# Main execution
Print-Header "FIVUCSAS E2E Test Suite"
Write-ColorOutput "Project Root: $ProjectRoot" -Type Info
Write-ColorOutput "Test Mode: $Module" -Type Info
Write-ColorOutput "Coverage: $Coverage" -Type Info
Write-ColorOutput "Skip Build: $SkipBuild" -Type Info
Write-Host ""

# Run tests based on module parameter
$allPassed = $true

switch ($Module) {
    "biometric-processor" {
        $TestResults["biometric-processor"] = Test-BiometricProcessor
        $allPassed = $TestResults["biometric-processor"]
    }
    "identity-core-api" {
        $TestResults["identity-core-api"] = Test-IdentityCoreAPI
        $allPassed = $TestResults["identity-core-api"]
    }
    "web-app" {
        $TestResults["web-app"] = Test-WebApp
        $allPassed = $TestResults["web-app"]
    }
    "all" {
        $TestResults["biometric-processor"] = Test-BiometricProcessor
        $TestResults["identity-core-api"] = Test-IdentityCoreAPI
        $TestResults["web-app"] = Test-WebApp

        $allPassed = ($TestResults["biometric-processor"] -and
                      $TestResults["identity-core-api"] -and
                      $TestResults["web-app"])
    }
}

# Print final summary
Print-Header "Test Results Summary"

$totalDuration = (Get-Date) - $StartTime
$totalDurationStr = "{0:mm}m {0:ss}s" -f $totalDuration

Write-Host ""
foreach ($module in $TestResults.Keys | Sort-Object) {
    $status = if ($TestResults[$module]) { "✓ PASSED" } else { "✗ FAILED" }
    $color = if ($TestResults[$module]) { "Success" } else { "Error" }
    Write-ColorOutput "$module : $status" -Type $color
}

Write-Host ""
Write-ColorOutput "Total Duration: $totalDurationStr" -Type Info

if ($allPassed) {
    Write-Host ""
    Write-ColorOutput "═══════════════════════════════════════════════════════════" -Type Success
    Write-ColorOutput "  ✓ ALL TESTS PASSED" -Type Success
    Write-ColorOutput "═══════════════════════════════════════════════════════════" -Type Success
    Write-Host ""
    exit 0
} else {
    Write-Host ""
    Write-ColorOutput "═══════════════════════════════════════════════════════════" -Type Error
    Write-ColorOutput "  ✗ SOME TESTS FAILED" -Type Error
    Write-ColorOutput "═══════════════════════════════════════════════════════════" -Type Error
    Write-Host ""
    exit 1
}
