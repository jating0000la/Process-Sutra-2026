# PostgreSQL Installation Helper Script for FlowSense

# Check if running as administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "This script should be run as Administrator. Please restart PowerShell as Administrator." -ForegroundColor Red
    Write-Host "Right-click on PowerShell and select 'Run as Administrator'" -ForegroundColor Yellow
    exit
}

# Check if PostgreSQL is already installed
$pgInstalled = $false
try {
    $pgVersion = & psql --version
    $pgInstalled = $true
    Write-Host "PostgreSQL is already installed: $pgVersion" -ForegroundColor Green
    
    # Check if PostgreSQL service is running
    $pgService = Get-Service -Name postgresql* -ErrorAction SilentlyContinue
    if ($pgService -and $pgService.Status -ne 'Running') {
        Write-Host "PostgreSQL service is not running. Attempting to start..." -ForegroundColor Yellow
        try {
            Start-Service -Name $pgService.Name
            Write-Host "PostgreSQL service started successfully." -ForegroundColor Green
        } catch {
            Write-Host "Failed to start PostgreSQL service. Please start it manually." -ForegroundColor Red
            Write-Host "You can start it from Services or by running: Start-Service $($pgService.Name)" -ForegroundColor Yellow
        }
    } elseif (-not $pgService) {
        Write-Host "PostgreSQL service not found, but psql is in PATH. You may need to start the service manually." -ForegroundColor Yellow
    } else {
        Write-Host "PostgreSQL service is running." -ForegroundColor Green
    }
    
    Write-Host "\nYou can now run setup.ps1 to configure the FlowSense database." -ForegroundColor Cyan
    exit
} catch {
    Write-Host "PostgreSQL is not installed or not in PATH" -ForegroundColor Yellow
}

# Ask user if they want to download PostgreSQL
$downloadChoice = Read-Host "Would you like to download PostgreSQL installer? (Y/N)"
if ($downloadChoice -ne "Y" -and $downloadChoice -ne "y") {
    Write-Host "\nPlease download and install PostgreSQL manually from https://www.postgresql.org/download/windows/" -ForegroundColor Yellow
    Write-Host "Important installation notes:" -ForegroundColor Cyan
    Write-Host " - Remember your PostgreSQL username and password" -ForegroundColor Cyan
    Write-Host " - Keep the default port (5432)" -ForegroundColor Cyan
    Write-Host " - Check the option to install all components" -ForegroundColor Cyan
    Write-Host " - Check the option to add PostgreSQL bin directory to your PATH" -ForegroundColor Cyan
    Write-Host "\nAfter installation, restart your computer and run setup.ps1" -ForegroundColor Yellow
    exit
}

# Download PostgreSQL installer
$downloadUrl = "https://sbp.enterprisedb.com/getfile.jsp?fileid=1258649"
$installerPath = "$env:TEMP\postgresql_installer.exe"

Write-Host "Downloading PostgreSQL installer..." -ForegroundColor Cyan
try {
    Invoke-WebRequest -Uri $downloadUrl -OutFile $installerPath
    Write-Host "Download completed successfully." -ForegroundColor Green
} catch {
    Write-Host "Failed to download PostgreSQL installer: $_" -ForegroundColor Red
    Write-Host "\nPlease download and install PostgreSQL manually from https://www.postgresql.org/download/windows/" -ForegroundColor Yellow
    exit
}

# Run the installer
Write-Host "\nStarting PostgreSQL installer..." -ForegroundColor Cyan
Write-Host "IMPORTANT INSTALLATION NOTES:" -ForegroundColor Yellow
Write-Host " - Remember your PostgreSQL username and password" -ForegroundColor Yellow
Write-Host " - Keep the default port (5432)" -ForegroundColor Yellow
Write-Host " - Check the option to install all components" -ForegroundColor Yellow
Write-Host " - Check the option to add PostgreSQL bin directory to your PATH" -ForegroundColor Yellow

Start-Process -FilePath $installerPath -Wait

Write-Host "\nPostgreSQL installation wizard has completed." -ForegroundColor Green
Write-Host "Please restart your computer to ensure PATH changes take effect." -ForegroundColor Yellow
Write-Host "After restarting, run setup.ps1 to configure the FlowSense database." -ForegroundColor Cyan

# Clean up
Remove-Item -Path $installerPath -Force -ErrorAction SilentlyContinue