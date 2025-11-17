# ============================================================================
# FIVUCSAS - Missing Commits Recovery Script
# ============================================================================
# This script attempts to recover missing commits from local reflog
# ============================================================================

$ErrorActionPreference = "Continue"

Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "  FIVUCSAS - Missing Commits Recovery Tool" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

# Define missing commits per submodule
$missingCommits = @{
    "biometric-processor" = @(
        "264b289a74d1fb8fe05a4daa1484a26392a171c2",
        "39775c2f35856e00464f1f2ed627e3a1eee2ffe5",
        "f44868a7aafc7a7797583997f2dc7058fc797359",
        "1eff0069d2a9499564e8282a4adb621dc74f94a3",
        "75983a2a79fb7291768aaa0f5fa46ae417602f51"
    )
    "identity-core-api" = @(
        "a7586f3ce69db91234e196ac385599b3476629d1",
        "a515a2ac3dd4f1de8d69e632aac1956e223ae916",
        "33abdae912e7eac69edb92b5052941c374ea9cd7",
        "931bca56db779f2ad1668b5e887ccb149470aff1",
        "d673b5ad12ed9d9a53203c241ae5b78d57f32338"
    )
    "docs" = @(
        "ece96a9ebd1ec28b2ab63cb3302733bdf98da2f3"
    )
}

$recoveryResults = @{}

# Function to check if commit exists
function Test-CommitExists {
    param($commit)
    $result = git cat-file -t $commit 2>$null
    return $null -ne $result
}

# Function to attempt recovery from reflog
function Search-InReflog {
    param($commit)
    $shortCommit = $commit.Substring(0, 7)
    $reflogEntries = git reflog --all | Select-String $shortCommit
    return $reflogEntries.Count -gt 0
}

Write-Host "Step 1: Checking local reflog for missing commits..." -ForegroundColor Yellow
Write-Host ""

foreach ($submodule in $missingCommits.Keys) {
    Write-Host "=== $submodule ===" -ForegroundColor Cyan
    
    if (-not (Test-Path $submodule)) {
        Write-Host "  ⚠ Submodule directory not found, skipping..." -ForegroundColor Yellow
        continue
    }
    
    Push-Location $submodule
    
    $found = @()
    $notFound = @()
    $inReflog = @()
    
    foreach ($commit in $missingCommits[$submodule]) {
        $shortCommit = $commit.Substring(0, 7)
        
        Write-Host "  Checking $shortCommit..." -NoNewline
        
        if (Test-CommitExists $commit) {
            Write-Host " ✓ FOUND!" -ForegroundColor Green
            $found += $commit
        }
        elseif (Search-InReflog $commit) {
            Write-Host " ⚠ In reflog but not reachable" -ForegroundColor Yellow
            $inReflog += $commit
        }
        else {
            Write-Host " ✗ Not found" -ForegroundColor Red
            $notFound += $commit
        }
    }
    
    $recoveryResults[$submodule] = @{
        Found = $found
        InReflog = $inReflog
        NotFound = $notFound
    }
    
    Pop-Location
    Write-Host ""
}

Write-Host ""
Write-Host "Step 2: Attempting recovery from remote..." -ForegroundColor Yellow
Write-Host ""

foreach ($submodule in $missingCommits.Keys) {
    if (-not (Test-Path $submodule)) { continue }
    
    Write-Host "=== $submodule ===" -ForegroundColor Cyan
    Push-Location $submodule
    
    Write-Host "  Fetching all refs from origin..."
    git fetch origin --all 2>&1 | Out-Null
    
    $recovered = @()
    foreach ($commit in $missingCommits[$submodule]) {
        if ($recoveryResults[$submodule].Found -contains $commit) {
            continue  # Already found
        }
        
        $shortCommit = $commit.Substring(0, 7)
        Write-Host "  Trying to fetch $shortCommit directly..." -NoNewline
        
        $fetchResult = git fetch origin $commit 2>&1
        if (Test-CommitExists $commit) {
            Write-Host " ✓ RECOVERED!" -ForegroundColor Green
            $recovered += $commit
            $recoveryResults[$submodule].Found += $commit
        }
        else {
            Write-Host " ✗ Failed" -ForegroundColor Red
        }
    }
    
    Pop-Location
    Write-Host ""
}

Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "  RECOVERY SUMMARY" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

$totalMissing = 0
$totalFound = 0
$totalInReflog = 0
$totalLost = 0

foreach ($submodule in $missingCommits.Keys) {
    $missing = $missingCommits[$submodule].Count
    $found = $recoveryResults[$submodule].Found.Count
    $inReflog = $recoveryResults[$submodule].InReflog.Count
    $lost = $recoveryResults[$submodule].NotFound.Count
    
    $totalMissing += $missing
    $totalFound += $found
    $totalInReflog += $inReflog
    $totalLost += $lost
    
    Write-Host "$submodule" -ForegroundColor Yellow
    Write-Host "  Total missing: $missing" -ForegroundColor White
    Write-Host "  Found & accessible: $found" -ForegroundColor Green
    Write-Host "  In reflog: $inReflog" -ForegroundColor Yellow
    Write-Host "  Permanently lost: $lost" -ForegroundColor Red
    Write-Host ""
}

Write-Host "TOTALS:" -ForegroundColor Cyan
Write-Host "  Total missing commits: $totalMissing" -ForegroundColor White
Write-Host "  Successfully found: $totalFound" -ForegroundColor Green
Write-Host "  In reflog (recoverable): $totalInReflog" -ForegroundColor Yellow
Write-Host "  Permanently lost: $totalLost" -ForegroundColor Red
Write-Host ""

# Step 3: Create recovery branches for found commits
if ($totalFound -gt 0 -or $totalInReflog -gt 0) {
    Write-Host "Step 3: Creating recovery branches..." -ForegroundColor Yellow
    Write-Host ""
    
    $createBranches = Read-Host "Do you want to create recovery branches for found commits? (y/n)"
    
    if ($createBranches -eq 'y') {
        foreach ($submodule in $missingCommits.Keys) {
            if ($recoveryResults[$submodule].Found.Count -eq 0 -and $recoveryResults[$submodule].InReflog.Count -eq 0) {
                continue
            }
            
            Write-Host "=== $submodule ===" -ForegroundColor Cyan
            Push-Location $submodule
            
            # Create branch from the most recent found commit
            $commits = $recoveryResults[$submodule].Found + $recoveryResults[$submodule].InReflog
            if ($commits.Count -gt 0) {
                $latestCommit = $commits[0]  # First in array is usually most recent
                $shortCommit = $latestCommit.Substring(0, 7)
                $branchName = "recovery/$shortCommit"
                
                Write-Host "  Creating branch: $branchName"
                git branch $branchName $latestCommit 2>&1 | Out-Null
                
                if ($LASTEXITCODE -eq 0) {
                    Write-Host "  ✓ Branch created successfully!" -ForegroundColor Green
                    
                    $pushBranch = Read-Host "  Push this branch to origin? (y/n)"
                    if ($pushBranch -eq 'y') {
                        git push origin $branchName
                        Write-Host "  ✓ Pushed to origin!" -ForegroundColor Green
                    }
                }
                else {
                    Write-Host "  ✗ Failed to create branch" -ForegroundColor Red
                }
            }
            
            Pop-Location
            Write-Host ""
        }
    }
}

Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "  NEXT STEPS" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Check other machines that worked on this project Nov 7-12" -ForegroundColor Yellow
Write-Host "2. Contact team members to check their local clones" -ForegroundColor Yellow
Write-Host "3. Review MISSING_COMMITS_ANALYSIS.md for details" -ForegroundColor Yellow
Write-Host "4. If commits are found, restore them to recovery branches" -ForegroundColor Yellow
Write-Host "5. Set up branch protection to prevent future data loss" -ForegroundColor Yellow
Write-Host ""
Write-Host "Recovery attempt complete!" -ForegroundColor Green
Write-Host ""
