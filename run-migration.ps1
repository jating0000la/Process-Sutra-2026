# PowerShell script to run database migration
# Usage: .\run-migration.ps1

Write-Host "Running database migration: 0005_add_performance_indexes.sql" -ForegroundColor Cyan

# Get DATABASE_URL from environment or .env.local
$databaseUrl = $env:DATABASE_URL

if (-not $databaseUrl) {
    Write-Host "DATABASE_URL not found in environment. Checking .env.local..." -ForegroundColor Yellow
    
    if (Test-Path ".env.local") {
        $envContent = Get-Content ".env.local"
        foreach ($line in $envContent) {
            if ($line -match '^DATABASE_URL=(.+)$') {
                $databaseUrl = $matches[1].Trim()
                Write-Host "Found DATABASE_URL in .env.local" -ForegroundColor Green
                break
            }
        }
    }
}

if (-not $databaseUrl) {
    Write-Host "ERROR: DATABASE_URL not found!" -ForegroundColor Red
    Write-Host "Please set DATABASE_URL environment variable or add it to .env.local" -ForegroundColor Red
    exit 1
}

# Run the migration using psql
Write-Host "Connecting to database..." -ForegroundColor Cyan

try {
    # Read the SQL file content
    $sqlContent = Get-Content "migrations\0005_add_performance_indexes.sql" -Raw
    
    # Execute using psql with input from string
    $sqlContent | psql $databaseUrl
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "`n✅ Migration completed successfully!" -ForegroundColor Green
        Write-Host "Performance indexes have been added to your database." -ForegroundColor Green
    } else {
        Write-Host "`n❌ Migration failed with exit code: $LASTEXITCODE" -ForegroundColor Red
        exit $LASTEXITCODE
    }
} catch {
    Write-Host "`n❌ Error running migration: $_" -ForegroundColor Red
    exit 1
}
