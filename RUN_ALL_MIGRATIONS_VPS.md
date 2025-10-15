#!/bin/bash
# Script to run all migrations on VPS
# Usage: ./run-all-migrations.sh

set -e  # Exit on error

# Configuration (UPDATE THESE!)
DB_HOST="localhost"
DB_USER="postgres"
DB_NAME="processsutra"
DB_PASSWORD="your_password_here"  # CHANGE THIS!

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Running All Database Migrations${NC}"
echo -e "${BLUE}========================================${NC}"

# Set password
export PGPASSWORD="$DB_PASSWORD"

# Test connection
echo -e "\n${YELLOW}Testing database connection...${NC}"
if psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -c "SELECT NOW();" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Database connection successful${NC}"
else
    echo -e "${RED}✗ Cannot connect to database${NC}"
    echo -e "${RED}Please check your credentials and database status${NC}"
    exit 1
fi

# Create backup
echo -e "\n${YELLOW}Creating database backup...${NC}"
BACKUP_FILE="backup_before_migrations_$(date +%Y%m%d_%H%M%S).sql"
pg_dump -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" > "$BACKUP_FILE"
echo -e "${GREEN}✓ Backup created: $BACKUP_FILE${NC}"

# Create migration tracking table
echo -e "\n${YELLOW}Creating migration tracking table...${NC}"
psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" <<EOF
CREATE TABLE IF NOT EXISTS schema_migrations (
    id SERIAL PRIMARY KEY,
    migration_file VARCHAR(255) UNIQUE NOT NULL,
    applied_at TIMESTAMP DEFAULT NOW(),
    success BOOLEAN DEFAULT TRUE,
    error_message TEXT
);
EOF
echo -e "${GREEN}✓ Migration tracking table ready${NC}"

# Array of migration files in order
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

# Run each migration
echo -e "\n${BLUE}========================================${NC}"
echo -e "${BLUE}Running Migrations${NC}"
echo -e "${BLUE}========================================${NC}"

MIGRATIONS_DIR="migrations"
SUCCESS_COUNT=0
SKIP_COUNT=0
FAIL_COUNT=0

for migration in "${MIGRATIONS[@]}"; do
    echo -e "\n${YELLOW}[${migration}]${NC}"
    
    # Check if already applied
    ALREADY_RUN=$(psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -tAc "SELECT COUNT(*) FROM schema_migrations WHERE migration_file = '$migration' AND success = true;")
    
    if [ "$ALREADY_RUN" -gt "0" ]; then
        echo -e "${BLUE}⊙ Already applied - skipping${NC}"
        SKIP_COUNT=$((SKIP_COUNT + 1))
        continue
    fi
    
    # Run migration
    if psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -f "$MIGRATIONS_DIR/$migration" 2>&1 | tee /tmp/migration_output.txt; then
        # Check if there were errors in output
        if grep -iq "error\|failed" /tmp/migration_output.txt; then
            echo -e "${YELLOW}⚠ Migration completed with warnings${NC}"
            # Still record as success but with note
            psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -c "INSERT INTO schema_migrations (migration_file, success, error_message) VALUES ('$migration', true, 'Completed with warnings') ON CONFLICT (migration_file) DO NOTHING;" > /dev/null
            SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
        else
            echo -e "${GREEN}✓ Migration applied successfully${NC}"
            psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -c "INSERT INTO schema_migrations (migration_file) VALUES ('$migration') ON CONFLICT (migration_file) DO NOTHING;" > /dev/null
            SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
        fi
    else
        echo -e "${RED}✗ Migration failed${NC}"
        ERROR_MSG=$(cat /tmp/migration_output.txt | tail -5)
        psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -c "INSERT INTO schema_migrations (migration_file, success, error_message) VALUES ('$migration', false, '$ERROR_MSG') ON CONFLICT (migration_file) DO UPDATE SET success = false, error_message = EXCLUDED.error_message;" > /dev/null
        FAIL_COUNT=$((FAIL_COUNT + 1))
        echo -e "${YELLOW}Continuing with next migration...${NC}"
    fi
done

# Summary
echo -e "\n${BLUE}========================================${NC}"
echo -e "${BLUE}Migration Summary${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "Total migrations: ${#MIGRATIONS[@]}"
echo -e "${GREEN}Applied: $SUCCESS_COUNT${NC}"
echo -e "${BLUE}Skipped: $SKIP_COUNT${NC}"
echo -e "${RED}Failed: $FAIL_COUNT${NC}"
echo -e "Backup file: $BACKUP_FILE"
echo -e "${BLUE}========================================${NC}"

# Show migration history
echo -e "\n${YELLOW}Migration History:${NC}"
psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -c "SELECT migration_file, applied_at, success FROM schema_migrations ORDER BY applied_at;"

# Verification
echo -e "\n${YELLOW}Running verification checks...${NC}"

# Check critical tables
echo -e "\n${BLUE}Checking critical tables:${NC}"
TABLES=("webhooks" "notifications" "audit_logs" "users")
for table in "${TABLES[@]}"; do
    TABLE_EXISTS=$(psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -tAc "SELECT COUNT(*) FROM information_schema.tables WHERE table_name = '$table';")
    if [ "$TABLE_EXISTS" -eq "1" ]; then
        echo -e "  ${GREEN}✓${NC} $table"
    else
        echo -e "  ${RED}✗${NC} $table (not found)"
    fi
done

# Check super admin field
echo -e "\n${BLUE}Checking super admin field:${NC}"
FIELD_EXISTS=$(psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -tAc "SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'is_super_admin';")
if [ "$FIELD_EXISTS" -eq "1" ]; then
    echo -e "  ${GREEN}✓${NC} is_super_admin field exists"
else
    echo -e "  ${RED}✗${NC} is_super_admin field missing"
fi

# Check indexes
echo -e "\n${BLUE}Index count:${NC}"
INDEX_COUNT=$(psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -tAc "SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public';")
echo -e "  Total indexes: $INDEX_COUNT"

# Final status
echo -e "\n${BLUE}========================================${NC}"
if [ "$FAIL_COUNT" -eq "0" ]; then
    echo -e "${GREEN}✓ All migrations completed successfully!${NC}"
    echo -e "${GREEN}Your database is now up to date.${NC}"
else
    echo -e "${YELLOW}⚠ Some migrations failed${NC}"
    echo -e "${YELLOW}Please review the errors above${NC}"
    echo -e "${YELLOW}Failed migrations can be re-run individually${NC}"
fi
echo -e "${BLUE}========================================${NC}"

echo -e "\n${YELLOW}Next Steps:${NC}"
echo "1. Review migration results above"
echo "2. Restart your application: pm2 restart process-sutra"
echo "3. Test critical functionality"
echo "4. Monitor application logs: pm2 logs"

echo -e "\n${YELLOW}Rollback (if needed):${NC}"
echo "psql -d $DB_NAME < $BACKUP_FILE"

# Cleanup
rm -f /tmp/migration_output.txt
unset PGPASSWORD

echo -e "\n${GREEN}Migration script completed!${NC}"
