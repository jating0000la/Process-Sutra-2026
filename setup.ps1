# FlowSense Local Setup Script

# Check if PostgreSQL is installed and running
$pgInstalled = $false
try {
    $pgVersion = & psql --version
    $pgInstalled = $true
    Write-Host "PostgreSQL is installed: $pgVersion" -ForegroundColor Green
    
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
            exit
        }
    } elseif (-not $pgService) {
        Write-Host "PostgreSQL service not found, but psql is in PATH. Continuing..." -ForegroundColor Yellow
    } else {
        Write-Host "PostgreSQL service is running." -ForegroundColor Green
    }
} catch {
    Write-Host "PostgreSQL is not installed or not in PATH" -ForegroundColor Yellow
    Write-Host "Please install PostgreSQL from https://www.postgresql.org/download/windows/" -ForegroundColor Yellow
    Write-Host "After installation, run this script again." -ForegroundColor Yellow
    exit
}

# Create the database if it doesn't exist
Write-Host "Creating PostgreSQL database 'flowsense' if it doesn't exist..." -ForegroundColor Cyan
$createDbScript = @"
DO \$\$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_database WHERE datname = 'flowsense') THEN
        CREATE DATABASE flowsense;
    END IF;
END
\$\$;
"@

# Prompt for PostgreSQL credentials
$pgUser = Read-Host "Enter PostgreSQL username (default: postgres)"
if ([string]::IsNullOrWhiteSpace($pgUser)) { $pgUser = "postgres" }

$pgPassword = Read-Host "Enter PostgreSQL password" -AsSecureString
$pgPasswordText = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto([System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($pgPassword))

# Set environment variables for the current session
$connectionString = "postgresql://${pgUser}:${pgPasswordText}@localhost:5432/flowsense"
$env:DATABASE_URL = $connectionString

# Create the database
try {
    Write-Host "Connecting to PostgreSQL as user '$pgUser'..." -ForegroundColor Cyan
    $createDbScript | psql -U $pgUser -d postgres
    
    # Verify database was created
    $checkDbExists = "SELECT 1 FROM pg_database WHERE datname = 'flowsense';"
    $dbExists = ($checkDbExists | psql -U $pgUser -d postgres -t).Trim()
    
    if ($dbExists -eq "1") {
        Write-Host "Database 'flowsense' is ready." -ForegroundColor Green
    } else {
        Write-Host "Database creation command did not report an error, but 'flowsense' database was not found." -ForegroundColor Yellow
        Write-Host "Please check your PostgreSQL installation and permissions." -ForegroundColor Yellow
        exit
    }
} catch {
    Write-Host "Failed to create database: $_" -ForegroundColor Red
    Write-Host "Please check your PostgreSQL credentials and ensure the server is running." -ForegroundColor Yellow
    exit
}

# Run database migrations
Write-Host "Running database migrations..." -ForegroundColor Cyan
try {
    # Check if npm is installed
    $npmVersion = npm --version
    Write-Host "Using npm version: $npmVersion" -ForegroundColor Cyan
    
    # Run the database migration
    $env:DATABASE_URL = $connectionString  # Ensure the environment variable is set for this process
    $result = npm run db:push
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Database migrations completed successfully." -ForegroundColor Green
    } else {
        Write-Host "Database migrations failed with exit code $LASTEXITCODE." -ForegroundColor Red
        Write-Host "You may need to run migrations manually after fixing any issues." -ForegroundColor Yellow
    }
} catch {
    Write-Host "Error running database migrations: $_" -ForegroundColor Red
    Write-Host "You may need to run migrations manually after fixing any issues." -ForegroundColor Yellow
}

# Create a .env.local file with the configuration
Write-Host "Creating .env.local file..." -ForegroundColor Cyan
try {
    if (-not (Test-Path -Path ".env")) {
        Write-Host "Error: .env file not found in the current directory." -ForegroundColor Red
        exit
    }
    
    $envContent = Get-Content -Path ".env"
    $dbConnectionString = "DATABASE_URL=postgresql://${pgUser}:${pgPasswordText}@localhost:5432/flowsense"
    
    # Check if DATABASE_URL exists in the .env file
    if (-not ($envContent -match "DATABASE_URL=")) {
        Write-Host "Warning: DATABASE_URL not found in .env file. Adding it to .env.local..." -ForegroundColor Yellow
        $envContent += "`nDATABASE_URL=postgresql://${pgUser}:${pgPasswordText}@localhost:5432/flowsense"
    } else {
        $envContent = $envContent -replace "DATABASE_URL=.*", $dbConnectionString
    }
    
    # Add REPLIT_DOMAINS for local development
    if (-not ($envContent -match "REPLIT_DOMAINS=")) {
        Write-Host "Adding REPLIT_DOMAINS=localhost to .env.local..." -ForegroundColor Cyan
        $envContent += "`nREPLIT_DOMAINS=localhost"
    } else {
        $envContent = $envContent -replace "REPLIT_DOMAINS=.*", "REPLIT_DOMAINS=localhost"
    }
    
    $envContent | Out-File -FilePath ".env.local" -Encoding utf8
    Write-Host ".env.local file created successfully." -ForegroundColor Green
} catch {
    Write-Host "Error creating .env.local file: $_" -ForegroundColor Red
    exit
}

Write-Host "Local environment setup complete!" -ForegroundColor Green
Write-Host "To start the development server, run: npm run dev" -ForegroundColor Cyan