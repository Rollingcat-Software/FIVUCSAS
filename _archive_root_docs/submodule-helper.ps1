#!/usr/bin/env pwsh
# FIVUCSAS Submodule Management Helper
# Quick commands for common submodule operations

param(
    [Parameter(Position=0)]
    [ValidateSet('init', 'update', 'status', 'pull', 'checkout', 'foreach', 'help')]
    [string]$Command = 'help'
)

$ErrorActionPreference = "Stop"

function Show-Header {
    Write-Host ""
    Write-Host "╔════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "║   FIVUCSAS - Git Submodules Management Helper        ║" -ForegroundColor Cyan
    Write-Host "╚════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
    Write-Host ""
}

function Show-Help {
    Show-Header
    Write-Host "Usage: ./submodule-helper.ps1 <command>" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Available Commands:" -ForegroundColor Green
    Write-Host ""
    Write-Host "  init        " -NoNewline -ForegroundColor White
    Write-Host "Initialize all submodules after cloning"
    Write-Host "  update      " -NoNewline -ForegroundColor White
    Write-Host "Update all submodules to latest remote commits"
    Write-Host "  status      " -NoNewline -ForegroundColor White
    Write-Host "Show status of all submodules"
    Write-Host "  pull        " -NoNewline -ForegroundColor White
    Write-Host "Pull latest changes in main repo and all submodules"
    Write-Host "  checkout    " -NoNewline -ForegroundColor White
    Write-Host "Checkout main branch in all submodules"
    Write-Host "  foreach     " -NoNewline -ForegroundColor White
    Write-Host "Run a custom command in all submodules"
    Write-Host "  help        " -NoNewline -ForegroundColor White
    Write-Host "Show this help message"
    Write-Host ""
    Write-Host "Examples:" -ForegroundColor Green
    Write-Host "  ./submodule-helper.ps1 init" -ForegroundColor Gray
    Write-Host "  ./submodule-helper.ps1 update" -ForegroundColor Gray
    Write-Host "  ./submodule-helper.ps1 status" -ForegroundColor Gray
    Write-Host ""
}

function Initialize-Submodules {
    Show-Header
    Write-Host "🔄 Initializing all submodules..." -ForegroundColor Yellow
    Write-Host ""
    
    git submodule update --init --recursive
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "✅ All submodules initialized successfully!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Submodule Status:" -ForegroundColor Cyan
        git submodule status
    } else {
        Write-Host "❌ Failed to initialize submodules" -ForegroundColor Red
        exit 1
    }
}

function Update-Submodules {
    Show-Header
    Write-Host "🔄 Updating all submodules to latest remote commits..." -ForegroundColor Yellow
    Write-Host ""
    
    git submodule update --remote --recursive
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "✅ All submodules updated successfully!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Submodule Status:" -ForegroundColor Cyan
        git submodule status
    } else {
        Write-Host "❌ Failed to update submodules" -ForegroundColor Red
        exit 1
    }
}

function Show-Status {
    Show-Header
    Write-Host "📊 Submodule Status:" -ForegroundColor Yellow
    Write-Host ""
    
    git submodule status
    
    Write-Host ""
    Write-Host "Branch Information:" -ForegroundColor Cyan
    git submodule foreach 'echo "=== $name ===" && git branch --show-current'
}

function Pull-All {
    Show-Header
    Write-Host "⬇️  Pulling latest changes..." -ForegroundColor Yellow
    Write-Host ""
    
    Write-Host "1️⃣  Pulling main repository..." -ForegroundColor Cyan
    git pull
    
    Write-Host ""
    Write-Host "2️⃣  Updating submodules..." -ForegroundColor Cyan
    git submodule update --remote --recursive
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "✅ Successfully pulled all changes!" -ForegroundColor Green
    } else {
        Write-Host "❌ Failed to pull changes" -ForegroundColor Red
        exit 1
    }
}

function Checkout-Main {
    Show-Header
    Write-Host "🌿 Checking out main branch in all submodules..." -ForegroundColor Yellow
    Write-Host ""
    
    git submodule foreach 'git checkout main || git checkout master'
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "✅ All submodules checked out to main branch!" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Some submodules may not have a 'main' or 'master' branch" -ForegroundColor Yellow
    }
}

function Run-Foreach {
    Show-Header
    Write-Host "⚙️  Run custom command in all submodules" -ForegroundColor Yellow
    Write-Host ""
    
    $customCommand = Read-Host "Enter command to run in all submodules"
    
    if ($customCommand) {
        Write-Host ""
        Write-Host "Running: $customCommand" -ForegroundColor Cyan
        Write-Host ""
        git submodule foreach $customCommand
    } else {
        Write-Host "❌ No command provided" -ForegroundColor Red
        exit 1
    }
}

# Main execution
switch ($Command.ToLower()) {
    'init'     { Initialize-Submodules }
    'update'   { Update-Submodules }
    'status'   { Show-Status }
    'pull'     { Pull-All }
    'checkout' { Checkout-Main }
    'foreach'  { Run-Foreach }
    'help'     { Show-Help }
    default    { Show-Help }
}

Write-Host ""
