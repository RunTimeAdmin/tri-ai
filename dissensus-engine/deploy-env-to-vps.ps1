# Deploy .env to VPS - Run this from the tri-ai folder
# Usage: .\dissensus-engine\deploy-env-to-vps.ps1

$VPS_IP = "76.13.101.39"
$VPS_USER = "root"
$REMOTE_PATH = "/var/www/tri-ai/dissensus-engine"
$SCRIPT_DIR = Split-Path -Parent $MyInvocation.MyCommand.Path
$LOCAL_ENV = Join-Path $SCRIPT_DIR ".env"

Write-Host "=== Deploy .env to VPS ===" -ForegroundColor Cyan
Write-Host ""

# Create .env if it doesn't exist
if (-not (Test-Path $LOCAL_ENV)) {
    Write-Host "Creating .env from .env.example..." -ForegroundColor Yellow
    Copy-Item (Join-Path $SCRIPT_DIR ".env.example") $LOCAL_ENV
}

# Check if key needs to be added
$envContent = Get-Content $LOCAL_ENV -Raw -ErrorAction SilentlyContinue
if ($envContent -match "sk-your-deepseek-key" -or $envContent -match "sk-your-") {
    Write-Host "Opening .env for you to add your DeepSeek key." -ForegroundColor Yellow
    Write-Host "Replace 'sk-your-deepseek-key' with your actual key, then SAVE and close Notepad." -ForegroundColor Yellow
    Write-Host ""
    Start-Process notepad $LOCAL_ENV
    Read-Host "Press Enter after you've saved your key and closed Notepad"
    $envContent = Get-Content $LOCAL_ENV -Raw
}

# Verify key was added
$envContent = Get-Content $LOCAL_ENV -Raw -ErrorAction SilentlyContinue
if ($envContent -match "sk-your-deepseek-key" -or $envContent -match "sk-your-") {
    Write-Host "ERROR: .env still contains placeholder. Please add your real DeepSeek API key." -ForegroundColor Red
    Write-Host "Edit: $LOCAL_ENV" -ForegroundColor Red
    exit 1
}

Write-Host "Uploading .env to VPS..." -ForegroundColor Green
scp $LOCAL_ENV "${VPS_USER}@${VPS_IP}:${REMOTE_PATH}/.env"

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "Done! .env deployed to VPS." -ForegroundColor Green
    Write-Host "On the VPS, restart the debate engine: pm2 restart dissensus" -ForegroundColor Cyan
} else {
    Write-Host "SCP failed. Make sure:" -ForegroundColor Red
    Write-Host "  - SSH is available (try: ssh root@$VPS_IP)" -ForegroundColor Red
    Write-Host "  - You have the correct password" -ForegroundColor Red
}
