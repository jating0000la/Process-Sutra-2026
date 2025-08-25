# Railway Deployment Script for PowerShell
# This script helps you deploy FlowSense to Railway.com

Write-Host "🚂 FlowSense Railway Deployment Setup" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan

# Check if we're in the right directory
if (!(Test-Path "package.json")) {
    Write-Host "❌ Error: package.json not found. Please run this script from the FlowSense root directory." -ForegroundColor Red
    exit 1
}

Write-Host "✅ Found package.json" -ForegroundColor Green

# Check if git is initialized
if (!(Test-Path ".git")) {
    Write-Host "⚠️  Git repository not found. Initializing..." -ForegroundColor Yellow
    git init
    git add .
    git commit -m "Initial commit for Railway deployment"
    Write-Host "✅ Git repository initialized" -ForegroundColor Green
} else {
    Write-Host "✅ Git repository found" -ForegroundColor Green
}

# Check for Railway CLI
$railwayExists = Get-Command railway -ErrorAction SilentlyContinue
if (!$railwayExists) {
    Write-Host "📦 Railway CLI not found. Installing..." -ForegroundColor Yellow
    
    # Install Railway CLI using npm (most reliable on Windows)
    if (Get-Command npm -ErrorAction SilentlyContinue) {
        npm install -g @railway/cli
        Write-Host "✅ Railway CLI installed via npm" -ForegroundColor Green
    } else {
        Write-Host "❌ npm not found. Please install Node.js first, then run 'npm install -g @railway/cli'" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "✅ Railway CLI found" -ForegroundColor Green
}

Write-Host ""
Write-Host "🔧 Next Steps:" -ForegroundColor Cyan
Write-Host "1. Login to Railway: railway login"
Write-Host "2. Create a new project: railway new"
Write-Host "3. Add PostgreSQL: railway add postgresql"
Write-Host "4. Set environment variables (see .env.railway file)"
Write-Host "5. Deploy: railway up"
Write-Host ""
Write-Host "📚 For detailed instructions, see RAILWAY_DEPLOYMENT.md" -ForegroundColor Blue
Write-Host ""
Write-Host "🎯 Quick commands:" -ForegroundColor Cyan
Write-Host "  railway login          # Login to Railway"
Write-Host "  railway new            # Create new project"
Write-Host "  railway add postgresql # Add PostgreSQL database"
Write-Host "  railway up             # Deploy your app"
Write-Host "  railway open           # Open your deployed app"
Write-Host ""

# Offer to open the Railway dashboard
$openDashboard = Read-Host "Would you like to open the Railway dashboard in your browser? (y/n)"
if ($openDashboard -eq "y" -or $openDashboard -eq "Y") {
    Start-Process "https://railway.app/dashboard"
}
