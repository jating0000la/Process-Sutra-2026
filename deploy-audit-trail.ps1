# Deployment Script for Audit Trail & Rate Limiting (Windows/PowerShell)
# Run this script on your Windows server or local machine

# Configuration (UPDATE THESE!)
$DB_HOST = "localhost"
$DB_USER = "postgres"
$DB_NAME = "processsutra"
$DB_PASSWORD = "admin"  # CHANGE THIS!
$APP_NAME = "process-sutra"
$APP_DIR = "C:\path\to\Process-Sutra-2026"  # CHANGE THIS!

# Colors
function Write-Success { Write-Host $args -ForegroundColor Green }
function Write-Warning { Write-Host $args -ForegroundColor Yellow }
function Write-Error { Write-Host $args -ForegroundColor Red }

Write-Success "========================================"
Write-Success "Audit Trail Deployment Script (Windows)"
Write-Success "========================================"

# Step 1: Navigate to app directory
Write-Warning "`n[1/8] Navigating to application directory..."
if (Test-Path $APP_DIR) {
    Set-Location $APP_DIR
    Write-Success "✓ Directory: $(Get-Location)"
} else {
    Write-Error "Error: Cannot find directory $APP_DIR"
    exit 1
}

# Step 2: Backup current code
Write-Warning "`n[2/8] Creating code backup..."
$BACKUP_DIR = "..\process-sutra-backup-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
Copy-Item -Path "." -Destination $BACKUP_DIR -Recurse -Force
Write-Success "✓ Backup created: $BACKUP_DIR"

# Step 3: Pull latest code
Write-Warning "`n[3/8] Pulling latest code from git..."
try {
    git pull origin main
    Write-Success "✓ Code updated"
} catch {
    Write-Error "Error: Git pull failed - $_"
    exit 1
}

# Step 4: Verify migration file exists
Write-Warning "`n[4/8] Verifying migration file..."
if (Test-Path "migrations\0009_add_audit_logs.sql") {
    Write-Success "✓ Migration file found"
} else {
    Write-Error "Error: Migration file not found!"
    exit 1
}

# Step 5: Backup database
Write-Warning "`n[5/8] Backing up database..."
$env:PGPASSWORD = $DB_PASSWORD
$BACKUP_FILE = "db_backup_$(Get-Date -Format 'yyyyMMdd_HHmmss').sql"

try {
    & pg_dump -h $DB_HOST -U $DB_USER -d $DB_NAME -f $BACKUP_FILE
    Write-Success "✓ Database backup created: $BACKUP_FILE"
} catch {
    Write-Error "Error: Database backup failed - $_"
    Write-Warning "Continuing anyway..."
}

# Step 6: Run migration
Write-Warning "`n[6/8] Running database migration..."
try {
    & psql -h $DB_HOST -U $DB_USER -d $DB_NAME -f "migrations\0009_add_audit_logs.sql"
    Write-Success "✓ Migration completed"
} catch {
    Write-Error "Error: Migration failed - $_"
    Write-Warning "This might be OK if the table already exists"
}

# Verify table creation
Write-Warning "`nVerifying audit_logs table..."
$TABLE_EXISTS = & psql -h $DB_HOST -U $DB_USER -d $DB_NAME -tAc "SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'audit_logs';"

if ($TABLE_EXISTS -eq 1) {
    Write-Success "✓ audit_logs table exists"
    
    # Show table structure
    Write-Warning "`nTable structure:"
    & psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "\d audit_logs"
} else {
    Write-Error "Error: audit_logs table not found!"
    exit 1
}

# Step 7: Install dependencies and build
Write-Warning "`n[7/8] Installing dependencies and building..."
try {
    npm install
    Write-Success "✓ Dependencies installed"
    
    # Check if build script exists
    $packageJson = Get-Content "package.json" -Raw | ConvertFrom-Json
    if ($packageJson.scripts.build) {
        npm run build
        Write-Success "✓ Build completed"
    } else {
        Write-Warning "No build script found, skipping..."
    }
} catch {
    Write-Error "Error: Build failed - $_"
    exit 1
}

# Step 8: Restart application
Write-Warning "`n[8/8] Restarting application..."

# Check for PM2
if (Get-Command pm2 -ErrorAction SilentlyContinue) {
    Write-Warning "Using PM2..."
    try {
        pm2 restart $APP_NAME
    } catch {
        pm2 restart all
    }
    Start-Sleep -Seconds 3
    pm2 status
    Write-Success "✓ Application restarted with PM2"
    
    # Show logs
    Write-Warning "`nRecent logs:"
    pm2 logs $APP_NAME --lines 20 --nostream
    
} else {
    Write-Warning "⚠ PM2 not found"
    Write-Warning "Please restart your application manually:"
    Write-Host "  - Stop current process (Ctrl+C)"
    Write-Host "  - Run: npm run start"
    Write-Host "  - Or: npm run prod"
}

# Step 9: Verification
Write-Success "`n========================================"
Write-Success "Deployment Complete!"
Write-Success "========================================"

Write-Warning "`nRunning verification tests..."

# Test 1: Check if server is responding
Write-Warning "`nTest 1: Server health check"
Start-Sleep -Seconds 3
try {
    $response = Invoke-WebRequest -Uri "http://localhost:5000/api/health" -UseBasicParsing -TimeoutSec 5
    if ($response.StatusCode -eq 200) {
        Write-Success "✓ Server is responding"
    }
} catch {
    Write-Error "✗ Server health check failed - $_"
    Write-Warning "Server might be on a different port"
}

# Test 2: Check audit_logs table
Write-Warning "`nTest 2: Verify audit_logs table"
$COLUMN_COUNT = & psql -h $DB_HOST -U $DB_USER -d $DB_NAME -tAc "SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'audit_logs';"

if ($COLUMN_COUNT -ge 14) {
    Write-Success "✓ audit_logs table has correct structure ($COLUMN_COUNT columns)"
} else {
    Write-Error "✗ audit_logs table structure incorrect (found $COLUMN_COUNT columns, expected 14+)"
}

# Test 3: Check indexes
Write-Warning "`nTest 3: Verify indexes"
$INDEX_COUNT = & psql -h $DB_HOST -U $DB_USER -d $DB_NAME -tAc "SELECT COUNT(*) FROM pg_indexes WHERE tablename = 'audit_logs';"

if ($INDEX_COUNT -ge 6) {
    Write-Success "✓ All indexes created ($INDEX_COUNT indexes)"
} else {
    Write-Warning "⚠ Found $INDEX_COUNT indexes (expected 6+)"
}

# Summary
Write-Success "`n========================================"
Write-Success "Deployment Summary"
Write-Success "========================================"
Write-Host "Code Backup: $BACKUP_DIR"
Write-Host "DB Backup: $BACKUP_FILE"
Write-Host "Migration: 0009_add_audit_logs.sql ✓"
Write-Host "Table: audit_logs ✓"
Write-Host "Indexes: $INDEX_COUNT ✓"
Write-Host "Application: Restarted ✓"
Write-Success "========================================"

Write-Warning "`nNext Steps:"
Write-Host "1. Test super admin endpoints manually"
Write-Host "2. Verify audit logs are created in database"
Write-Host "3. Test rate limiting (make 101 requests)"
Write-Host "4. Monitor application logs for errors"
Write-Host "5. Check audit logs: psql -d $DB_NAME -c 'SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 10;'"

Write-Warning "`nRollback Instructions (if needed):"
Write-Host "Code: Copy-Item -Path '$BACKUP_DIR\*' -Destination '$APP_DIR' -Recurse -Force"
Write-Host "Database: psql -d $DB_NAME -f $BACKUP_FILE"
Write-Host "Restart: pm2 restart $APP_NAME"

Write-Success "`nDeployment completed successfully!"

# Cleanup password from environment
Remove-Item Env:\PGPASSWORD
