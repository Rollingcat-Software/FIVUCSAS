# Save this as analyze-all-repos.ps1

Write-Host "=== FIVUCSAS Repository Analysis ===" -ForegroundColor Cyan
Write-Host ""

# Get current submodule states from parent repo
Write-Host "1. Current submodule references in FIVUCSAS:" -ForegroundColor Yellow
git ls-tree HEAD | Select-String "160000"

Write-Host "`n2. Submodule status:" -ForegroundColor Yellow
git submodule status

Write-Host "`n3. Checking each submodule..." -ForegroundColor Yellow

$submodules = @("biometric-processor", "identity-core-api", "mobile-app", "web-app", "desktop-app", "docs", "practice-and-test")

foreach ($sub in $submodules) {
    if (Test-Path $sub) {
        Write-Host "`n=== $sub ===" -ForegroundColor Green
        Push-Location $sub
        
        Write-Host "Current HEAD:" -ForegroundColor Cyan
        git rev-parse HEAD
        
        Write-Host "`nLast 10 commits:" -ForegroundColor Cyan
        git log --oneline -10
        
        Write-Host "`nBranch info:" -ForegroundColor Cyan
        git branch -a
        
        Write-Host "`nUncommitted changes:" -ForegroundColor Cyan
        git status --short
        
        Pop-Location
    }
}

Write-Host "`n4. Parent repo history of submodule updates:" -ForegroundColor Yellow
git log --oneline --all -20