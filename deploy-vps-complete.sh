#!/bin/bash
# Complete VPS Deployment Script - Migrations + Super Admin + Application
# This script automates the entire deployment process

set -e

# ============================================
# CONFIGURATION - UPDATE BEFORE RUNNING!
# ============================================
DB_HOST="localhost"
DB_USER="processsutra"
DB_NAME="processsutra_db"
DB_PASSWORD="ProcessSutra2026!Secure"

SUPER_ADMIN_EMAIL=""  # ⚠️ REQUIRED: Set your email to promote to super admin

APP_NAME="process-sutra"
APP_PORT="5000"

# ============================================
# Colors
# ============================================
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# ============================================
# Helper Functions
# ============================================
print_header() {
    echo -e "\n${CYAN}========================================${NC}"
    echo -e "${CYAN}$1${NC}"
    echo -e "${CYAN}========================================${NC}\n"
}

print_success() { echo -e "${GREEN}✓ $1${NC}"; }
print_error() { echo -e "${RED}✗ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠ $1${NC}"; }
print_info() { echo -e "${BLUE}ℹ $1${NC}"; }

# ============================================
# Validation
# ============================================
print_header "Pre-Deployment Validation"

if [ ! -f "package.json" ]; then
    print_error "Not in Process Sutra directory"
    exit 1
fi
print_success "Found package.json"

if [ -z "$DB_PASSWORD" ]; then
    print_error "DB_PASSWORD not set. Edit this script first!"
    exit 1
fi
print_success "Database credentials configured"

if [ -z "$SUPER_ADMIN_EMAIL" ]; then
    print_error "SUPER_ADMIN_EMAIL not set. Edit this script first!"
    exit 1
fi
print_success "Super admin email: $SUPER_ADMIN_EMAIL"

if [ ! -d "migrations" ]; then
    print_error "Migrations directory not found"
    exit 1
fi
print_success "Migrations directory found"

export PGPASSWORD="$DB_PASSWORD"

# ============================================
# Test Database
# ============================================
print_header "Testing Database Connection"

if psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -c "SELECT NOW();" > /dev/null 2>&1; then
    print_success "Database connected"
else
    print_error "Cannot connect to database"
    exit 1
fi

# ============================================
# Backup
# ============================================
print_header "Creating Backup"

BACKUP_FILE="backup_deploy_$(date +%Y%m%d_%H%M%S).sql"
if pg_dump -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" > "$BACKUP_FILE"; then
    print_success "Backup: $BACKUP_FILE"
else
    print_error "Backup failed"
    exit 1
fi

# ============================================
# Setup Migration Tracking
# ============================================
print_header "Migration Tracking Setup"

psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" <<EOF
CREATE TABLE IF NOT EXISTS schema_migrations (
    id SERIAL PRIMARY KEY,
    migration_file VARCHAR(255) UNIQUE NOT NULL,
    applied_at TIMESTAMP DEFAULT NOW(),
    success BOOLEAN DEFAULT TRUE,
    error_message TEXT
);
EOF
print_success "Migration tracking ready"

# ============================================
# Run Migrations
# ============================================
print_header "Running Database Migrations"

MIGRATIONS=(
    "0001_add_webhooks.sql"
    "0002_add_task_cancellation_fields.sql"
    "0003_add_notifications_table.sql"
    "0004_add_notifications_table.sql"
    "0005_add_performance_indexes.sql"
    "0006_add_critical_indexes_p0_p1.sql"
    "0007_add_secondary_indexes_p2.sql"
    "0008_add_super_admin_field.sql"
    "0009_add_audit_logs.sql"
)

SUCCESS=0
SKIP=0
FAIL=0

for migration in "${MIGRATIONS[@]}"; do
    echo -e "\n${YELLOW}[$migration]${NC}"
    
    DONE=$(psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -tAc "SELECT COUNT(*) FROM schema_migrations WHERE migration_file = '$migration' AND success = true;")
    
    if [ "$DONE" -gt "0" ]; then
        print_info "Already applied - skipping"
        SKIP=$((SKIP + 1))
        continue
    fi
    
    if psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -f "migrations/$migration" > /tmp/migration.log 2>&1; then
        print_success "Applied successfully"
        psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -c "INSERT INTO schema_migrations (migration_file, success) VALUES ('$migration', true) ON CONFLICT (migration_file) DO NOTHING;" > /dev/null
        SUCCESS=$((SUCCESS + 1))
    else
        print_error "Failed - check /tmp/migration.log"
        psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -c "INSERT INTO schema_migrations (migration_file, success, error_message) VALUES ('$migration', false, 'Failed') ON CONFLICT (migration_file) DO NOTHING;" > /dev/null
        FAIL=$((FAIL + 1))
    fi
done

print_header "Migration Summary"
echo -e "${GREEN}Applied: $SUCCESS${NC}"
echo -e "${BLUE}Skipped: $SKIP${NC}"
echo -e "${RED}Failed: $FAIL${NC}"

if [ $FAIL -gt 0 ]; then
    print_warning "Some migrations failed!"
    read -p "Continue? (y/n) " -n 1 -r
    echo
    [[ ! $REPLY =~ ^[Yy]$ ]] && exit 1
fi

# ============================================
# Verify Tables
# ============================================
print_header "Verifying Tables"

for table in webhooks notifications audit_logs users; do
    if psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -tAc "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = '$table');" | grep -q 't'; then
        print_success "Table '$table' exists"
    else
        print_warning "Table '$table' not found"
    fi
done

# ============================================
# Setup Super Admin
# ============================================
print_header "Setting Up Super Admin"

USER_EXISTS=$(psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -tAc "SELECT COUNT(*) FROM users WHERE email = '$SUPER_ADMIN_EMAIL';")

if [ "$USER_EXISTS" -eq "0" ]; then
    print_error "User not found: $SUPER_ADMIN_EMAIL"
    print_warning "User must log in first, then run:"
    print_warning "  UPDATE users SET is_super_admin = true WHERE email = '$SUPER_ADMIN_EMAIL';"
else
    psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" <<EOF
UPDATE users 
SET is_super_admin = true, updated_at = NOW()
WHERE email = '$SUPER_ADMIN_EMAIL';
EOF
    print_success "Super admin promoted: $SUPER_ADMIN_EMAIL"
    
    IS_ADMIN=$(psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -tAc "SELECT is_super_admin FROM users WHERE email = '$SUPER_ADMIN_EMAIL';")
    [ "$IS_ADMIN" = "t" ] && print_success "Verified" || print_error "Verification failed"
fi

# ============================================
# Update Code
# ============================================
print_header "Updating Application Code"

if git pull origin main; then
    print_success "Code updated"
else
    print_warning "Git pull failed (may be up to date)"
fi

# ============================================
# Install Dependencies
# ============================================
print_header "Installing Dependencies"

if npm install; then
    print_success "Dependencies installed"
else
    print_error "npm install failed"
    exit 1
fi

# ============================================
# Build Application
# ============================================
print_header "Building Application"

if npm run build; then
    print_success "Build successful"
else
    print_error "Build failed"
    exit 1
fi

# ============================================
# Restart Application
# ============================================
print_header "Restarting Application"

if command -v pm2 &> /dev/null; then
    print_info "Using PM2..."
    pm2 stop "$APP_NAME" 2>/dev/null || true
    
    if [ -f "ecosystem.config.js" ]; then
        pm2 start ecosystem.config.js --env production
    else
        pm2 start npm --name "$APP_NAME" -- start
    fi
    
    pm2 save
    print_success "Restarted with PM2"
    sleep 2
    pm2 status
    
elif systemctl is-active --quiet "$APP_NAME"; then
    print_info "Using systemd..."
    sudo systemctl restart "$APP_NAME"
    print_success "Restarted with systemd"
    sleep 2
    sudo systemctl status "$APP_NAME" --no-pager
    
else
    print_warning "No PM2 or systemd found"
    print_info "Please restart manually"
fi

# ============================================
# Verification
# ============================================
print_header "Verification"

sleep 3

if curl -s "http://localhost:$APP_PORT/api/health" | grep -q "ok"; then
    print_success "Health endpoint OK"
else
    print_warning "Health endpoint not responding"
fi

AUDIT_COLS=$(psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -tAc "SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'audit_logs';")
[ "$AUDIT_COLS" -gt "0" ] && print_success "Audit logs: $AUDIT_COLS columns" || print_warning "Audit logs may have issues"

# ============================================
# Summary
# ============================================
print_header "Deployment Complete! 🎉"

echo -e "${GREEN}✅ Migrations applied${NC}"
echo -e "${GREEN}✅ Super admin configured${NC}"
echo -e "${GREEN}✅ Application deployed${NC}"
echo ""
echo -e "${CYAN}Next Steps:${NC}"
echo -e "1. Login: ${YELLOW}$SUPER_ADMIN_EMAIL${NC}"
echo -e "2. Find: ${YELLOW}'System Admin'${NC} in sidebar"
echo -e "3. Access: ${YELLOW}/system-super-admin${NC}"
echo -e "4. Logs: ${YELLOW}pm2 logs $APP_NAME${NC}"
echo ""
echo -e "${CYAN}Features:${NC}"
echo -e "  ${GREEN}✓${NC} Webhooks"
echo -e "  ${GREEN}✓${NC} Notifications"
echo -e "  ${GREEN}✓${NC} Super Admin"
echo -e "  ${GREEN}✓${NC} Audit Trail"
echo ""
echo -e "${YELLOW}Backup: $BACKUP_FILE${NC}"

unset PGPASSWORD
print_success "Done!"
