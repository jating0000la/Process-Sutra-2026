@echo off
echo Setting up environment for FlowSense...

REM Check if PostgreSQL is installed
powershell -Command "try { $null = & psql --version } catch { Write-Host 'PostgreSQL is not installed or not in PATH.' -ForegroundColor Red; Write-Host 'Please install PostgreSQL first:' -ForegroundColor Yellow; Write-Host '1. Open PowerShell as Administrator' -ForegroundColor Yellow; Write-Host '2. Navigate to this directory' -ForegroundColor Yellow; Write-Host '3. Run: Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process' -ForegroundColor Yellow; Write-Host '4. Run: .\install-postgres.ps1' -ForegroundColor Yellow; Write-Host '5. After installation, restart your computer' -ForegroundColor Yellow; Write-Host '6. Run this batch file again' -ForegroundColor Yellow; exit 1 }" && if %errorlevel% neq 0 (pause && exit /b)

REM Check if .env.local exists
if not exist .env.local (
    echo .env.local file not found. Please run setup.ps1 first.
    echo.
    echo To run setup:
    echo 1. Open PowerShell as Administrator
    echo 2. Navigate to this directory
    echo 3. Run: Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process
    echo 4. Run: .\setup.ps1
    echo.
    pause
    exit /b
)

REM Check if PostgreSQL is running
powershell -Command "try { $service = Get-Service postgresql* -ErrorAction SilentlyContinue; if ($service -and $service.Status -ne 'Running') { Write-Host 'PostgreSQL service is not running. Attempting to start...' -ForegroundColor Yellow; Start-Service $service.Name; Write-Host 'PostgreSQL service started.' -ForegroundColor Green; } } catch { Write-Host 'Could not check PostgreSQL service status.' -ForegroundColor Red; }"

REM Load environment variables from .env.local
echo Loading environment variables from .env.local...
for /f "tokens=*" %%a in (.env.local) do (
    set "%%a"
)

REM Start the development server
echo Starting FlowSense development server...
echo.
echo The application will be available at http://localhost:5000
echo Press Ctrl+C to stop the server
echo.

REM Display a helpful message about database connection
echo NOTE: If you encounter database connection issues, please check:
echo  - PostgreSQL service is running
echo  - Your database credentials are correct in .env.local
echo  - The flowsense database exists
echo.

set PORT=5000
npm run dev

echo.
echo If the server stopped unexpectedly, check the error messages above.
echo For troubleshooting help, refer to the README.md file.
echo.
pause