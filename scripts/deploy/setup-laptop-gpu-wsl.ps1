# ============================================================================
# FIVUCSAS Biometric Processor - Windows WSL2 GPU Setup Script
# ============================================================================
# This script sets up the biometric processor on your Windows laptop with
# GPU acceleration through WSL2 and exposes it via Cloudflare Tunnel.
#
# Requirements:
#   - Windows 11 (or Windows 10 21H2+)
#   - NVIDIA RTX GPU with driver 515+ (already detected: GTX 1650)
#   - WSL2 installed (already detected: v2.5.9.0)
#   - Docker Desktop (optional, but recommended)
#
# Usage:
#   1. Run this script in PowerShell (Admin)
#   2. Follow the manual steps printed at the end
# ============================================================================

$ErrorActionPreference = "Stop"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "FIVUCSAS Biometric Processor - WSL2 GPU Setup" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# Check if running as admin
$currentPrincipal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
if (-not $currentPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Host "Warning: Not running as Administrator. Some operations may fail." -ForegroundColor Yellow
}

# Step 1: Verify GPU
Write-Host ""
Write-Host "[1/5] Verifying GPU..." -ForegroundColor Yellow
$gpu = & nvidia-smi --query-gpu=name,driver_version --format=csv,noheader 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Host "GPU detected: $gpu" -ForegroundColor Green
} else {
    Write-Host "ERROR: No NVIDIA GPU detected. Install NVIDIA drivers first." -ForegroundColor Red
    exit 1
}

# Step 2: Verify WSL2
Write-Host ""
Write-Host "[2/5] Verifying WSL2..." -ForegroundColor Yellow
$wslVersion = & wsl --version 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Host "WSL2 installed" -ForegroundColor Green
} else {
    Write-Host "Installing WSL2..." -ForegroundColor Yellow
    & wsl --install
    Write-Host "WSL2 installed. Please restart your computer and run this script again." -ForegroundColor Yellow
    exit 0
}

# Step 3: Ensure Ubuntu is installed
Write-Host ""
Write-Host "[3/5] Checking Ubuntu distribution..." -ForegroundColor Yellow
$distros = & wsl --list --quiet 2>$null
if ($distros -match "Ubuntu") {
    Write-Host "Ubuntu found in WSL2" -ForegroundColor Green
} else {
    Write-Host "Installing Ubuntu..." -ForegroundColor Yellow
    & wsl --install -d Ubuntu
    Write-Host "Ubuntu installed. Please complete the Ubuntu setup (create user/password) and run this script again." -ForegroundColor Yellow
    exit 0
}

# Step 4: Test GPU in WSL2
Write-Host ""
Write-Host "[4/5] Testing GPU access from WSL2..." -ForegroundColor Yellow
$wslGpu = & wsl -d Ubuntu -- nvidia-smi --query-gpu=name --format=csv,noheader 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Host "GPU accessible from WSL2: $wslGpu" -ForegroundColor Green
} else {
    Write-Host "GPU not accessible from WSL2. Updating WSL..." -ForegroundColor Yellow
    & wsl --update
    & wsl --shutdown
    Write-Host "WSL updated. Try running the script again." -ForegroundColor Yellow
    exit 0
}

# Step 5: Copy biometric-processor to WSL
Write-Host ""
Write-Host "[5/5] Setting up biometric-processor in WSL2..." -ForegroundColor Yellow

$repoPath = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$bioPath = Join-Path $repoPath "biometric-processor"

# Convert Windows path to WSL path
$wslPath = "/mnt/" + $repoPath.Replace(":\", "/").Replace("\", "/").ToLower()

Write-Host "Repository path (WSL): $wslPath" -ForegroundColor Gray

# Create setup script for WSL
$wslSetupScript = @'
#!/bin/bash
set -e

echo "==========================================="
echo "Setting up Biometric Processor in WSL2"
echo "==========================================="

# Install system dependencies
echo "[1/6] Installing system packages..."
sudo apt-get update
sudo apt-get install -y python3.11 python3.11-venv python3-pip libgl1 libglib2.0-0

# Create virtual environment
echo "[2/6] Creating Python virtual environment..."
cd /opt
sudo mkdir -p biometric-processor
sudo chown $USER:$USER biometric-processor
cd biometric-processor

python3.11 -m venv venv
source venv/bin/activate

# Install dependencies
echo "[3/6] Installing Python dependencies..."
pip install --upgrade pip
pip install "numpy>=1.26.0,<2.0"
pip install opencv-python-headless>=4.8.0
pip install tensorflow==2.15.0
pip install --no-deps "deepface>=0.0.98"
pip install lightphe

# Copy code from Windows repo
echo "[4/6] Copying application code..."
cp -r REPO_PATH/biometric-processor/* /opt/biometric-processor/

# Install remaining requirements
pip install -r requirements.txt

# Force headless opencv
pip uninstall -y opencv-python opencv-contrib-python 2>/dev/null || true
pip install --force-reinstall opencv-python-headless>=4.8.0

# Verify GPU TensorFlow
echo "[5/6] Verifying TensorFlow GPU..."
python -c "
import tensorflow as tf
gpus = tf.config.list_physical_devices('GPU')
print(f'TensorFlow {tf.__version__}')
print(f'GPUs found: {len(gpus)}')
for gpu in gpus:
    print(f'  - {gpu.name}')
"

# Setup environment file
echo "[6/6] Setting up environment..."
if [ ! -f .env ]; then
    cp deploy/laptop-gpu/.env.laptop .env
    echo "Created .env from template. Please edit it!"
fi

echo ""
echo "==========================================="
echo "Setup complete!"
echo "==========================================="
echo ""
echo "Next steps:"
echo "  1. Edit /opt/biometric-processor/.env"
echo "  2. Run: source venv/bin/activate"
echo "  3. Run: uvicorn app.main:app --host 0.0.0.0 --port 8001"
echo "  4. Test: curl http://localhost:8001/api/v1/health"
echo ""
'@

# Replace placeholder with actual path
$wslSetupScript = $wslSetupScript -replace "REPO_PATH", $wslPath

# Save and run the script
$tempScript = [System.IO.Path]::GetTempFileName() + ".sh"
$wslSetupScript | Out-File -FilePath $tempScript -Encoding utf8 -NoNewline

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "WSL2 Pre-setup complete!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Manual steps to complete setup:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Open WSL2 Ubuntu terminal:" -ForegroundColor White
Write-Host "   wsl -d Ubuntu" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Run the setup script:" -ForegroundColor White
Write-Host "   cd $wslPath/biometric-processor" -ForegroundColor Gray
Write-Host "   sudo bash deploy/laptop-gpu/setup-wsl.sh" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Configure Cloudflare Tunnel:" -ForegroundColor White
Write-Host "   cloudflared tunnel login" -ForegroundColor Gray
Write-Host "   cloudflared tunnel create biometric-api" -ForegroundColor Gray
Write-Host "   cloudflared tunnel route dns biometric-api bio.fivucsas.com" -ForegroundColor Gray
Write-Host ""
Write-Host "4. Start the service:" -ForegroundColor White
Write-Host "   cd /opt/biometric-processor" -ForegroundColor Gray
Write-Host "   source venv/bin/activate" -ForegroundColor Gray
Write-Host "   uvicorn app.main:app --host 0.0.0.0 --port 8001" -ForegroundColor Gray
Write-Host ""
Write-Host "5. In another terminal, start Cloudflare Tunnel:" -ForegroundColor White
Write-Host "   cloudflared tunnel run biometric-api" -ForegroundColor Gray
Write-Host ""
Write-Host "   OR use quick tunnel (no DNS, instant test):" -ForegroundColor White
Write-Host "   cloudflared tunnel --url http://localhost:8001" -ForegroundColor Gray
Write-Host "   # Copy the random trycloudflare.com URL and test" -ForegroundColor Gray
Write-Host ""
Write-Host "6. Test:" -ForegroundColor White
Write-Host "   curl http://localhost:8001/api/v1/health" -ForegroundColor Gray
Write-Host "   curl https://bio.fivucsas.com/api/v1/health" -ForegroundColor Gray
Write-Host ""
