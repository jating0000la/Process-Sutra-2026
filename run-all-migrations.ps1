# Run All Migrations Script for VPS (PowerShell)
# This script will run all 9 migrations in order

# Configuration (UPDATE THESE!)
$DB_HOST = "localhost"
$DB_USER = "postgres"
$DB_NAME = "processsutra"
$DB_PASSWORD = "admin"  # CHANGE THIS!

# Colors
function Write-Success { Write-Host $args -ForegroundColor Green }
function Write-Warning { Write-Host $args -ForegroundColor Yellow }
function Write-Error { Write-Host $args -ForegroundColor Red }
function Write-Info { Write-Host $args -ForegroundColor Blue }

Write-Info "========================================"
Write-Info "Running All Database Migrations"
Write-Info "========================================"

$env:PGPASSWORD = $DB_PASSWORD

# Test connection
Write-Warning "`nTesting database connection..."
try {
    $null = & psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "SELECT NOW();" 2>&1
    Write-Success "✓ Connected"
} catch {
    Write-Error "✗ Connection failed"
    exit 1
}

# Backup
Write-Warning "`nCreating backup..."
$BACKUP_FILE = "backup_$(Get-Date -Format 'yyyyMMdd_HHmmss').sql"
try {
    & pg_dump -h $DB_HOST -U $DB_USER -d $DB_NAME -f $BACKUP_FILE
    Write-Success "✓ Backup: $BACKUP_FILE"
} catch {
    Write-Warning "⚠ Backup failed, continuing..."
}

# Create tracking table
Write-Warning "`nCreating migration tracking table..."
$createTable = @"
CREATE TABLE IF NOT EXISTS schema_migrations (
    id SERIAL PRIMARY KEY,
    migration_file VARCHAR(255) UNIQUE NOT NULL,
    applied_at TIMESTAMP DEFAULT NOW(),
    success BOOLEAN DEFAULT TRUE
);
"@

& psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c $createTable | Out-Null
Write-Success "✓ Tracking table ready"

# Migrations list
$MIGRATIONS = @(
    "0001_add_webhooks.sql",
    "0002_add_task_cancellation_fields.sql",
    "0003_add_notifications_table.sql",
    "0004_add_notifications_table.sql",
    "0005_add_performance_indexes.sql",
    "0006_add_critical_indexes_p0_p1.sql",
    "0007_add_secondary_indexes_p2.sql",
    "0008_add_super_admin_field.sql",
    "0009_add_audit_logs.sql"
)

$SUCCESS = 0
$SKIP = 0
$FAIL = 0

Write-Info "`n========================================"
Write-Info "Running Migrations"
Write-Info "========================================`n"

foreach ($migration in $MIGRATIONS) {
    Write-Warning "[$migration]"
    
    # Check if already applied
    $checkQuery = "SELECT COUNT(*) FROM schema_migrations WHERE migration_file = '$migration';"
    $DONE = & psql -h $DB_HOST -U $DB_USER -d $DB_NAME -tAc $checkQuery
    
    if ([int]$DONE -gt 0) {
        Write-Info "⊙ Skipped (already applied)"
        $SKIP++
        continue
    }
    
    # Run migration
    $migrationPath = "migrations\$migration"
    try {
        $output = & psql -h $DB_HOST -U $DB_USER -d $DB_NAME -f $migrationPath 2>&1
        
        # Check for errors in output
        if ($output -match "ERROR|error|failed") {
            Write-Error "✗ Failed"
            Write-Host "  Error: $output"
            $FAIL++
        } else {
            Write-Success "✓ Applied"
            $insertQuery = "INSERT INTO schema_migrations (migration_file) VALUES ('$migration') ON CONFLICT (migration_file) DO NOTHING;"
            & psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c $insertQuery | Out-Null
            $SUCCESS++
        }
    } catch {
        Write-Error "✗ Failed - $_"
        $FAIL++
    }
}

# Summary
Write-Info "`n========================================"
Write-Info "Migration Summary"
Write-Info "========================================"
Write-Host "Total migrations: $($MIGRATIONS.Count)"
Write-Success "Applied: $SUCCESS"
Write-Info "Skipped: $SKIP"
Write-Error "Failed: $FAIL"
Write-Host "Backup: $BACKUP_FILE"
Write-Info "========================================`n"

# Show migration history
Write-Warning "Migration History:"
& psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "SELECT migration_file, applied_at, success FROM schema_migrations ORDER BY applied_at;"

# Verification
Write-Warning "`nVerification Checks:"
Write-Info "Checking critical tables..."

$tables = @("webhooks", "notifications", "audit_logs", "users")
foreach ($table in $tables) {
    $exists = & psql -h $DB_HOST -U $DB_USER -d $DB_NAME -tAc "SELECT COUNT(*) FROM information_schema.tables WHERE table_name = '$table';"
    if ([int]$exists -eq 1) {
        Write-Success "  ✓ $table"
    } else {
        Write-Error "  ✗ $table (not found)"
    }
}

# Check super admin field
Write-Info "`nChecking super admin field..."
$fieldExists = & psql -h $DB_HOST -U $DB_USER -d $DB_NAME -tAc "SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'is_super_admin';"
if ([int]$fieldExists -eq 1) {
    Write-Success "  ✓ is_super_admin field exists"
} else {
    Write-Error "  ✗ is_super_admin field missing"
}

# Check indexes
Write-Info "`nIndex count..."
$indexCount = & psql -h $DB_HOST -U $DB_USER -d $DB_NAME -tAc "SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public';"
Write-Host "  Total indexes: $indexCount"

# Final status
Write-Info "`n========================================"
if ($FAIL -eq 0) {
    Write-Success "✓ All migrations completed successfully!"
    Write-Success "Your database is now up to date."
} else {
    Write-Warning "⚠ Some migrations failed"
    Write-Warning "Please review the errors above"
}
Write-Info "========================================`n"

Write-Warning "Next Steps:"
Write-Host "1. Review migration results above"
Write-Host "2. Restart your application: pm2 restart process-sutra"
Write-Host "3. Test critical functionality"
Write-Host "4. Monitor logs: pm2 logs"

Write-Warning "`nRollback (if needed):"
Write-Host "psql -d $DB_NAME -f $BACKUP_FILE"

# Cleanup
Remove-Item Env:\PGPASSWORD

Write-Success "`nMigration script completed!"
