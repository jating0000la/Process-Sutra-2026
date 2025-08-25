# GitHub Push Script
# Run this after creating your GitHub repository

Write-Host "🚀 FlowSense GitHub Push Script" -ForegroundColor Cyan
Write-Host "===============================" -ForegroundColor Cyan

# Get repository URL from user
$repoUrl = Read-Host "Enter your GitHub repository URL (e.g., https://github.com/username/flowsense.git)"

if ([string]::IsNullOrWhiteSpace($repoUrl)) {
    Write-Host "❌ Repository URL is required!" -ForegroundColor Red
    exit 1
}

Write-Host "🔗 Adding GitHub remote..." -ForegroundColor Yellow
git remote add origin $repoUrl

Write-Host "📤 Pushing to GitHub..." -ForegroundColor Yellow
git push -u origin main

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Successfully pushed to GitHub!" -ForegroundColor Green
    Write-Host ""
    Write-Host "🎉 Your FlowSense repository is now on GitHub!" -ForegroundColor Cyan
    Write-Host "Repository URL: $repoUrl" -ForegroundColor Blue
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "1. Visit your GitHub repository to verify the upload"
    Write-Host "2. Use this repository URL for Railway deployment"
    Write-Host "3. Share the repository with your team"
    Write-Host ""
    
    # Offer to open the repository
    $openRepo = Read-Host "Would you like to open the repository in your browser? (y/n)"
    if ($openRepo -eq "y" -or $openRepo -eq "Y") {
        Start-Process $repoUrl.Replace('.git', '')
    }
} else {
    Write-Host "❌ Failed to push to GitHub!" -ForegroundColor Red
    Write-Host "Please check your repository URL and try again." -ForegroundColor Yellow
}
