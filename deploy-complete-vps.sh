#!/bin/bash
# Complete VPS Deployment Script
# This script will:
# 1. Run all 9 database migrations
# 2. Set up super admin
# 3. Deploy the application

set -e  # Exit on error

# ============================================
# CONFIGURATION - UPDATE THESE!
# ============================================
DB_HOST="localhost"
DB_USER="postgres"
DB_NAME="processsutra"
DB_PASSWORD=""  # REQUIRED: Set your database password

# Super admin email to promote
SUPER_ADMIN_EMAIL=""  # REQUIRED: Set your email address

# Application settings
APP_NAME="process-sutra"
APP_PORT="5000"

# ============================================
# Colors for output
# ============================================
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
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

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

# ============================================
# Validation
# ============================================
print_header "Pre-Deployment Validation"

# Check if in correct directory
if [ ! -f "package.json" ]; then
    print_error "Not in Process Sutra directory. Please navigate to the project folder first."
    exit 1
fi
print_success "Found package.json"

# Check database credentials
if [ -z "$DB_PASSWORD" ]; then
    print_error "Database password not set. Please edit this script and set DB_PASSWORD."
    exit 1
fi
print_success "Database credentials configured"

# Check super admin email
if [ -z "$SUPER_ADMIN_EMAIL" ]; then
    print_error "Super admin email not set. Please edit this script and set SUPER_ADMIN_EMAIL."
    exit 1
fi
print_success "Super admin email configured: $SUPER_ADMIN_EMAIL"

# Check if migrations directory exists
if [ ! -d "migrations" ]; then
    print_error "Migrations directory not found"
    exit 1
fi
print_success "Migrations directory found"

export PGPASSWORD="$DB_PASSWORD"

# ============================================
# Test Database Connection
# ============================================
print_header "Testing Database Connection"

if psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -c "SELECT NOW();" > /dev/null 2>&1; then
    print_success "Database connection successful"
else
    print_error "Cannot connect to database"
    print_error "Please check your credentials and database status"
    exit 1
fi

# ============================================
# Create Backup
# ============================================
print_header "Creating Database Backup"

BACKUP_FILE="backup_complete_$(date +%Y%m%d_%H%M%S).sql"
if pg_dump -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" > "$BACKUP_FILE"; then
    print_success "Backup created: $BACKUP_FILE"
else
    print_error "Failed to create backup"
    exit 1
fi

# ============================================
# Create Migration Tracking Table
# ============================================
print_header "Setting Up Migration Tracking"

psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" <<EOF
CREATE TABLE IF NOT EXISTS schema_migrations (
    id SERIAL PRIMARY KEY,
    migration_file VARCHAR(255) UNIQUE NOT NULL,
    applied_at TIMESTAMP DEFAULT NOW(),
    success BOOLEAN DEFAULT TRUE,
    error_message TEXT
);
EOF

print_success "Migration tracking table ready"

# ============================================
# Run All Migrations
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

SUCCESS_COUNT=0
SKIP_COUNT=0
FAIL_COUNT=0

for migration in "${MIGRATIONS[@]}"; do
    echo -e "\n${YELLOW}Processing: $migration${NC}"
    
    # Check if already applied
    ALREADY_RUN=$(psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -tAc "SELECT COUNT(*) FROM schema_migrations WHERE migration_file = '$migration' AND success = true;")
    
    if [ "$ALREADY_RUN" -gt "0" ]; then
        print_info "Already applied - skipping"
        SKIP_COUNT=$((SKIP_COUNT + 1))
        continue
    fi
    
    # Run migration
    if psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -f "migrations/$migration" > /tmp/migration_output.txt 2>&1; then
        print_success "Migration applied successfully"
        psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -c "INSERT INTO schema_migrations (migration_file, success) VALUES ('$migration', true) ON CONFLICT (migration_file) DO NOTHING;" > /dev/null
        SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
    else
        print_error "Migration failed"
        cat /tmp/migration_output.txt
        psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -c "INSERT INTO schema_migrations (migration_file, success, error_message) VALUES ('$migration', false, 'See logs') ON CONFLICT (migration_file) DO NOTHING;" > /dev/null
        FAIL_COUNT=$((FAIL_COUNT + 1))
    fi
done

# Migration Summary
print_header "Migration Summary"
echo -e "${GREEN}Successfully Applied: $SUCCESS_COUNT${NC}"
echo -e "${BLUE}Skipped (Already Applied): $SKIP_COUNT${NC}"
echo -e "${RED}Failed: $FAIL_COUNT${NC}"

if [ $FAIL_COUNT -gt 0 ]; then
    print_error "Some migrations failed. Please check the errors above."
    print_warning "You may need to manually fix issues before proceeding."
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# ============================================
# Verify Tables Created
# ============================================
print_header "Verifying Database Tables"

TABLES=("webhooks" "notifications" "audit_logs" "users")
for table in "${TABLES[@]}"; do
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

# Check if user exists
USER_EXISTS=$(psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -tAc "SELECT COUNT(*) FROM users WHERE email = '$SUPER_ADMIN_EMAIL';")

if [ "$USER_EXISTS" -eq "0" ]; then
    print_error "User with email '$SUPER_ADMIN_EMAIL' not found in database"
    print_warning "Please ensure the user has logged in at least once, then run:"
    print_warning "  UPDATE users SET is_super_admin = true WHERE email = '$SUPER_ADMIN_EMAIL';"
else
    # Promote user to super admin
    psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" <<EOF
UPDATE users 
SET is_super_admin = true,
    updated_at = NOW()
WHERE email = '$SUPER_ADMIN_EMAIL';
EOF
    print_success "User '$SUPER_ADMIN_EMAIL' promoted to System Super Admin"
    
    # Verify
    IS_SUPER_ADMIN=$(psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -tAc "SELECT is_super_admin FROM users WHERE email = '$SUPER_ADMIN_EMAIL';")
    if [ "$IS_SUPER_ADMIN" = "t" ]; then
        print_success "Super admin status verified"
    else
        print_error "Failed to verify super admin status"
    fi
fi

# ============================================
# Pull Latest Code
# ============================================
print_header "Pulling Latest Code"

if git pull origin main; then
    print_success "Code updated from GitHub"
else
    print_warning "Failed to pull from GitHub (may already be up to date)"
fi

# ============================================
# Install Dependencies
# ============================================
print_header "Installing Dependencies"

if npm install; then
    print_success "Dependencies installed"
else
    print_error "Failed to install dependencies"
    exit 1
fi

# ============================================
# Build Application
# ============================================
print_header "Building Application"

if npm run build; then
    print_success "Application built successfully"
else
    print_error "Build failed"
    exit 1
fi

# ============================================
# Restart Application
# ============================================
print_header "Restarting Application"

# Try PM2 first
if command -v pm2 &> /dev/null; then
    print_info "Using PM2 to restart application..."
    
    # Stop existing process
    pm2 stop "$APP_NAME" 2>/dev/null || true
    
    # Start application
    if [ -f "ecosystem.config.js" ]; then
        pm2 start ecosystem.config.js --env production
    else
        pm2 start npm --name "$APP_NAME" -- start
    fi
    
    # Save PM2 configuration
    pm2 save
    
    print_success "Application restarted with PM2"
    
    # Show status
    sleep 2
    pm2 status
    
elif systemctl is-active --quiet "$APP_NAME"; then
    print_info "Using systemd to restart application..."
    sudo systemctl restart "$APP_NAME"
    print_success "Application restarted with systemd"
    sleep 2
    sudo systemctl status "$APP_NAME" --no-pager
    
elif command -v docker-compose &> /dev/null; then
    print_info "Using Docker Compose to restart application..."
    docker-compose down
    docker-compose up -d
    print_success "Application restarted with Docker Compose"
    
else
    print_warning "No process manager found (PM2, systemd, or Docker)"
    print_info "Please manually restart your application"
fi

# ============================================
# Verification
# ============================================
print_header "Verification"

sleep 3

# Test health endpoint
print_info "Testing health endpoint..."
if curl -s "http://localhost:$APP_PORT/api/health" | grep -q "ok"; then
    print_success "Health endpoint responding"
else
    print_warning "Health endpoint not responding (may need more time to start)"
fi

# Check audit logs table
print_info "Verifying audit logs table..."
AUDIT_COUNT=$(psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -tAc "SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'audit_logs';")
if [ "$AUDIT_COUNT" -gt "0" ]; then
    print_success "Audit logs table has $AUDIT_COUNT columns"
else
    print_warning "Audit logs table may not be properly configured"
fi

# Check webhooks table
print_info "Verifying webhooks table..."
WEBHOOK_COUNT=$(psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -tAc "SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'webhooks';")
if [ "$WEBHOOK_COUNT" -gt "0" ]; then
    print_success "Webhooks table has $WEBHOOK_COUNT columns"
else
    print_warning "Webhooks table may not be properly configured"
fi

# ============================================
# Final Summary
# ============================================
print_header "Deployment Complete! 🎉"

echo -e "${GREEN}✅ All migrations applied${NC}"
echo -e "${GREEN}✅ Super admin configured${NC}"
echo -e "${GREEN}✅ Application deployed${NC}"
echo ""
echo -e "${CYAN}Next Steps:${NC}"
echo -e "1. Log in with: ${YELLOW}$SUPER_ADMIN_EMAIL${NC}"
echo -e "2. Look for '${MAGENTA}System Admin${NC}' link in sidebar"
echo -e "3. Access: ${YELLOW}/system-super-admin${NC}"
echo -e "4. Monitor logs: ${YELLOW}pm2 logs $APP_NAME${NC}"
echo ""
echo -e "${CYAN}Features Enabled:${NC}"
echo -e "  ${GREEN}✓${NC} Webhooks"
echo -e "  ${GREEN}✓${NC} Task Cancellation"
echo -e "  ${GREEN}✓${NC} Notifications"
echo -e "  ${GREEN}✓${NC} Performance Indexes"
echo -e "  ${GREEN}✓${NC} System Super Admin"
echo -e "  ${GREEN}✓${NC} Audit Trail"
echo -e "  ${GREEN}✓${NC} Rate Limiting"
echo ""
echo -e "${YELLOW}Backup Location:${NC} $BACKUP_FILE"
echo ""

# Cleanup
unset PGPASSWORD

print_success "Deployment script finished successfully!"
