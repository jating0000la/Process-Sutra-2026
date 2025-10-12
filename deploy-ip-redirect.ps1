# Simple IP Redirect Deployment Script (PowerShell)
# This script deploys the IP-to-domain redirect to your VPS

param(
    [string]$VpsIp = "62.72.57.53"
)

Write-Host "🚀 Deploying IP-to-Domain Redirect..." -ForegroundColor Cyan
Write-Host ""

$VpsUser = "root"
$VpsPath = "/root/Process-Sutra-2026"

Write-Host "📡 VPS IP: $VpsIp" -ForegroundColor Yellow
Write-Host "👤 VPS User: $VpsUser" -ForegroundColor Yellow
Write-Host "📁 VPS Path: $VpsPath" -ForegroundColor Yellow
Write-Host ""

# Upload the updated server file
Write-Host "📤 Uploading updated server code..." -ForegroundColor Cyan
scp "server\index.ts" "${VpsUser}@${VpsIp}:${VpsPath}/server/index.ts"

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to upload server code" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Server code uploaded" -ForegroundColor Green
Write-Host ""

# SSH and deploy
Write-Host "🔧 Deploying on VPS..." -ForegroundColor Cyan

$sshScript = @"
cd /root/Process-Sutra-2026

# Add DOMAIN_NAME to .env if not exists
if ! grep -q 'DOMAIN_NAME' .env; then
    echo '' >> .env
    echo '# Domain name for IP redirect' >> .env
    echo 'DOMAIN_NAME=processsutra.com' >> .env
    echo '✅ Added DOMAIN_NAME to .env'
else
    echo '✅ DOMAIN_NAME already in .env'
fi

# Rebuild the application
echo '🔨 Building application...'
npm run build

if [ \$? -ne 0 ]; then
    echo '❌ Build failed'
    exit 1
fi

echo '✅ Build successful'

# Restart PM2
echo '🔄 Restarting PM2...'
pm2 restart processsutra

if [ \$? -ne 0 ]; then
    echo '⚠️  PM2 restart failed, trying to start...'
    pm2 start ecosystem.config.js
fi

# Show status
echo ''
echo '📊 PM2 Status:'
pm2 status

echo ''
echo '📝 Recent logs:'
pm2 logs processsutra --lines 10 --nostream
"@

ssh "${VpsUser}@${VpsIp}" $sshScript

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Deployment successful!" -ForegroundColor Green
    Write-Host ""
    Write-Host "🧪 Test the redirect:" -ForegroundColor Cyan
    Write-Host "   curl -I http://$VpsIp"
    Write-Host "   or open http://$VpsIp in your browser"
    Write-Host ""
    Write-Host "Expected: Should redirect to https://processsutra.com" -ForegroundColor Yellow
} else {
    Write-Host ""
    Write-Host "❌ Deployment failed" -ForegroundColor Red
    exit 1
}
