# Complete Migration Guide for VPS

## 📋 Overview
This guide will help you run ALL 9 database migrations on your VPS production environment.

## 🎯 What Will Be Migrated

### All 9 Migrations:
1. **0001_add_webhooks.sql** - Webhook system
2. **0002_add_task_cancellation_fields.sql** - Task cancellation features
3. **0003_add_notifications_table.sql** - Notifications (first version)
4. **0004_add_notifications_table.sql** - Notifications (updated)
5. **0005_add_performance_indexes.sql** - Performance optimization
6. **0006_add_critical_indexes_p0_p1.sql** - Critical indexes (P0/P1)
7. **0007_add_secondary_indexes_p2.sql** - Secondary indexes (P2)
8. **0008_add_super_admin_field.sql** - Super admin field
9. **0009_add_audit_logs.sql** - Audit trail system

---

## 🚀 Quick Start (3 Options)

### Option 1: Automated Script (Recommended) ⭐

**For Linux/Mac VPS:**
```bash
# 1. SSH to VPS
ssh username@your-vps-ip
cd /path/to/Process-Sutra-2026

# 2. Edit configuration
nano run-all-migrations.sh
# Update: DB_PASSWORD, DB_HOST, DB_USER, DB_NAME

# 3. Run script
chmod +x run-all-migrations.sh
./run-all-migrations.sh
```

**For Windows Server:**
```powershell
# 1. RDP to server
cd C:\path\to\Process-Sutra-2026

# 2. Edit configuration
notepad run-all-migrations.ps1
# Update: $DB_PASSWORD, $DB_HOST, $DB_USER, $DB_NAME

# 3. Run script
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\run-all-migrations.ps1
```

**Time**: 5-10 minutes  
**Safety**: ✅ Automatic backup, tracking, verification

---

### Option 2: Manual One-by-One

```bash
# Set password
export PGPASSWORD='your_db_password'

# Create backup first!
pg_dump -h localhost -U postgres -d processsutra > backup_$(date +%Y%m%d).sql

# Run migrations in order
psql -h localhost -U postgres -d processsutra -f migrations/0001_add_webhooks.sql
psql -h localhost -U postgres -d processsutra -f migrations/0002_add_task_cancellation_fields.sql
psql -h localhost -U postgres -d processsutra -f migrations/0003_add_notifications_table.sql
psql -h localhost -U postgres -d processsutra -f migrations/0004_add_notifications_table.sql
psql -h localhost -U postgres -d processsutra -f migrations/0005_add_performance_indexes.sql
psql -h localhost -U postgres -d processsutra -f migrations/0006_add_critical_indexes_p0_p1.sql
psql -h localhost -U postgres -d processsutra -f migrations/0007_add_secondary_indexes_p2.sql
psql -h localhost -U postgres -d processsutra -f migrations/0008_add_super_admin_field.sql
psql -h localhost -U postgres -d processsutra -f migrations/0009_add_audit_logs.sql

# Verify
psql -h localhost -U postgres -d processsutra -c "\dt"
```

**Time**: 15-20 minutes  
**Safety**: ✅ Full control over each step

---

### Option 3: Single Command (Quick but less safe)

```bash
# Create backup
pg_dump -d processsutra > backup.sql

# Run all migrations
for f in migrations/*.sql; do 
  echo "Running $f..."
  psql -d processsutra -f "$f"
done
```

**Time**: 5 minutes  
**Safety**: ⚠️ No tracking, harder to debug failures

---

## 📝 Step-by-Step Manual Guide

### Step 1: Prepare

```bash
# SSH to VPS
ssh username@your-vps-ip

# Navigate to app directory
cd /path/to/Process-Sutra-2026

# Check migrations exist
ls -la migrations/

# You should see all 9 .sql files
```

### Step 2: Backup Database (CRITICAL!)

```bash
# Set password
export PGPASSWORD='your_database_password'

# Create backup
pg_dump -h localhost -U postgres -d processsutra > backup_before_all_migrations_$(date +%Y%m%d_%H%M%S).sql

# Verify backup file
ls -lh backup_*.sql

# Should show file size > 0
```

### Step 3: Test Database Connection

```bash
# Test connection
psql -h localhost -U postgres -d processsutra -c "SELECT NOW();"

# Should return current timestamp
# If error, check:
# - Database is running: sudo systemctl status postgresql
# - Credentials are correct
# - Database exists: psql -l | grep processsutra
```

### Step 4: Create Migration Tracking Table

```bash
psql -h localhost -U postgres -d processsutra <<EOF
CREATE TABLE IF NOT EXISTS schema_migrations (
    id SERIAL PRIMARY KEY,
    migration_file VARCHAR(255) UNIQUE NOT NULL,
    applied_at TIMESTAMP DEFAULT NOW(),
    success BOOLEAN DEFAULT TRUE
);
EOF
```

This table will track which migrations have been applied.

### Step 5: Run Migrations One by One

```bash
# Migration 1: Webhooks
echo "Running 0001_add_webhooks.sql..."
psql -h localhost -U postgres -d processsutra -f migrations/0001_add_webhooks.sql
psql -h localhost -U postgres -d processsutra -c "INSERT INTO schema_migrations (migration_file) VALUES ('0001_add_webhooks.sql');"

# Migration 2: Task Cancellation
echo "Running 0002_add_task_cancellation_fields.sql..."
psql -h localhost -U postgres -d processsutra -f migrations/0002_add_task_cancellation_fields.sql
psql -h localhost -U postgres -d processsutra -c "INSERT INTO schema_migrations (migration_file) VALUES ('0002_add_task_cancellation_fields.sql');"

# Migration 3: Notifications (v1)
echo "Running 0003_add_notifications_table.sql..."
psql -h localhost -U postgres -d processsutra -f migrations/0003_add_notifications_table.sql
psql -h localhost -U postgres -d processsutra -c "INSERT INTO schema_migrations (migration_file) VALUES ('0003_add_notifications_table.sql');"

# Migration 4: Notifications (v2)
echo "Running 0004_add_notifications_table.sql..."
psql -h localhost -U postgres -d processsutra -f migrations/0004_add_notifications_table.sql
psql -h localhost -U postgres -d processsutra -c "INSERT INTO schema_migrations (migration_file) VALUES ('0004_add_notifications_table.sql');"

# Migration 5: Performance Indexes
echo "Running 0005_add_performance_indexes.sql..."
psql -h localhost -U postgres -d processsutra -f migrations/0005_add_performance_indexes.sql
psql -h localhost -U postgres -d processsutra -c "INSERT INTO schema_migrations (migration_file) VALUES ('0005_add_performance_indexes.sql');"

# Migration 6: Critical Indexes (P0/P1)
echo "Running 0006_add_critical_indexes_p0_p1.sql..."
psql -h localhost -U postgres -d processsutra -f migrations/0006_add_critical_indexes_p0_p1.sql
psql -h localhost -U postgres -d processsutra -c "INSERT INTO schema_migrations (migration_file) VALUES ('0006_add_critical_indexes_p0_p1.sql');"

# Migration 7: Secondary Indexes (P2)
echo "Running 0007_add_secondary_indexes_p2.sql..."
psql -h localhost -U postgres -d processsutra -f migrations/0007_add_secondary_indexes_p2.sql
psql -h localhost -U postgres -d processsutra -c "INSERT INTO schema_migrations (migration_file) VALUES ('0007_add_secondary_indexes_p2.sql');"

# Migration 8: Super Admin Field
echo "Running 0008_add_super_admin_field.sql..."
psql -h localhost -U postgres -d processsutra -f migrations/0008_add_super_admin_field.sql
psql -h localhost -U postgres -d processsutra -c "INSERT INTO schema_migrations (migration_file) VALUES ('0008_add_super_admin_field.sql');"

# Migration 9: Audit Logs
echo "Running 0009_add_audit_logs.sql..."
psql -h localhost -U postgres -d processsutra -f migrations/0009_add_audit_logs.sql
psql -h localhost -U postgres -d processsutra -c "INSERT INTO schema_migrations (migration_file) VALUES ('0009_add_audit_logs.sql');"
```

### Step 6: Verify Migrations

```bash
# Check migration history
psql -h localhost -U postgres -d processsutra -c "SELECT * FROM schema_migrations ORDER BY applied_at;"

# Should show all 9 migrations

# Check critical tables
psql -h localhost -U postgres -d processsutra -c "\dt" | grep -E "(webhooks|notifications|audit_logs)"

# Check super admin field
psql -h localhost -U postgres -d processsutra -c "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'is_super_admin';"

# Check audit logs table
psql -h localhost -U postgres -d processsutra -c "\d audit_logs"

# Check indexes
psql -h localhost -U postgres -d processsutra -c "SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public';"
```

### Step 7: Restart Application

```bash
# PM2
pm2 restart process-sutra
pm2 logs process-sutra --lines 50

# Or Systemd
sudo systemctl restart process-sutra
sudo journalctl -u process-sutra -n 50 -f

# Or Docker
docker-compose restart
docker-compose logs -f --tail=50
```

### Step 8: Test Application

```bash
# Health check
curl http://localhost:5000/api/health

# Should return: {"ok":true,...}

# Check logs for errors
pm2 logs process-sutra --err --lines 50

# No errors = success!
```

---

## ✅ Verification Checklist

After running migrations, verify:

```bash
# 1. Migration tracking table
psql -d processsutra -c "SELECT COUNT(*) FROM schema_migrations WHERE success = true;"
# Expected: 9 (or however many migrations you ran)

# 2. Webhooks table
psql -d processsutra -c "\dt webhooks"
# Expected: Table exists

# 3. Notifications table
psql -d processsutra -c "SELECT COUNT(*) FROM notifications;"
# Expected: Number (could be 0 if no notifications yet)

# 4. Audit logs table
psql -d processsutra -c "\d audit_logs"
# Expected: 14 columns, 6 indexes

# 5. Super admin field
psql -d processsutra -c "SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'is_super_admin';"
# Expected: 1

# 6. Index count
psql -d processsutra -c "SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public';"
# Expected: Large number (50+ indexes depending on your schema)

# 7. Application starts
pm2 status
# Expected: process-sutra showing "online"

# 8. No errors in logs
pm2 logs process-sutra --lines 100 | grep -i error
# Expected: No critical errors
```

---

## 🚨 Troubleshooting

### Issue: "relation already exists"

This means the table or index already exists. **This is usually OK!**

```bash
# Check if table exists
psql -d processsutra -c "\dt table_name"

# If it exists, the migration already ran
# Mark it as applied:
psql -d processsutra -c "INSERT INTO schema_migrations (migration_file) VALUES ('0001_add_webhooks.sql') ON CONFLICT DO NOTHING;"

# Continue with next migration
```

### Issue: "column already exists"

Similar to above - the column was already added.

```bash
# Check if column exists
psql -d processsutra -c "\d table_name"

# If column is there, mark migration as done and continue
```

### Issue: "syntax error"

Check the migration file for issues.

```bash
# View the migration
cat migrations/0001_add_webhooks.sql

# Try running it with verbose output
psql -d processsutra -f migrations/0001_add_webhooks.sql -a -e
```

### Issue: "permission denied"

Database user doesn't have permissions.

```bash
# Grant permissions
psql -d processsutra -c "GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres;"
psql -d processsutra -c "GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres;"
```

### Issue: "database does not exist"

Create the database first.

```bash
# Create database
psql -U postgres -c "CREATE DATABASE processsutra;"

# Then run migrations
```

### Issue: "connection refused"

PostgreSQL not running.

```bash
# Start PostgreSQL
sudo systemctl start postgresql

# Enable on boot
sudo systemctl enable postgresql

# Check status
sudo systemctl status postgresql
```

---

## 🔄 Rollback Procedure

If something goes wrong:

### Rollback All Migrations

```bash
# Stop application
pm2 stop process-sutra

# Restore database from backup
psql -h localhost -U postgres -d processsutra < backup_before_all_migrations_*.sql

# Restart application
pm2 restart process-sutra
```

### Rollback Single Migration

```bash
# Find the DOWN migration or manually drop changes
# Example: Drop audit_logs table
psql -d processsutra -c "DROP TABLE IF EXISTS audit_logs CASCADE;"

# Remove from tracking
psql -d processsutra -c "DELETE FROM schema_migrations WHERE migration_file = '0009_add_audit_logs.sql';"
```

---

## 📊 Migration Details

### What Each Migration Does:

| # | Migration | Purpose | Changes |
|---|-----------|---------|---------|
| 1 | 0001_add_webhooks.sql | Webhook system | Creates `webhooks` table |
| 2 | 0002_add_task_cancellation_fields.sql | Task cancellation | Adds fields to `tasks` table |
| 3 | 0003_add_notifications_table.sql | Notifications v1 | Creates `notifications` table |
| 4 | 0004_add_notifications_table.sql | Notifications v2 | Updates `notifications` table |
| 5 | 0005_add_performance_indexes.sql | Performance | Adds indexes for queries |
| 6 | 0006_add_critical_indexes_p0_p1.sql | Critical indexes | P0/P1 priority indexes |
| 7 | 0007_add_secondary_indexes_p2.sql | Secondary indexes | P2 priority indexes |
| 8 | 0008_add_super_admin_field.sql | Super admin | Adds `is_super_admin` field |
| 9 | 0009_add_audit_logs.sql | Audit trail | Creates `audit_logs` table |

---

## ⏱️ Time Estimates

- **Automated script**: 5-10 minutes
- **Manual one-by-one**: 15-20 minutes
- **Verification**: 5 minutes
- **Total**: 10-25 minutes

---

## 📞 Support

### If you encounter issues:

1. **Check logs**: `pm2 logs process-sutra --lines 100`
2. **Check migration history**: `psql -d processsutra -c "SELECT * FROM schema_migrations;"`
3. **Verify tables**: `psql -d processsutra -c "\dt"`
4. **Rollback if needed**: Restore from backup
5. **Run migrations one by one**: Easier to identify which one fails

### Common Errors:

- ✅ "already exists" → Usually safe to ignore
- ⚠️ "syntax error" → Check migration file
- ❌ "permission denied" → Grant database permissions
- ❌ "connection refused" → Start PostgreSQL

---

## 🎉 Success Criteria

Your migrations are successful when:

1. ✅ All 9 migrations marked as applied in `schema_migrations` table
2. ✅ All expected tables exist (webhooks, notifications, audit_logs)
3. ✅ `is_super_admin` field exists in `users` table
4. ✅ Application starts without database errors
5. ✅ No errors in application logs
6. ✅ Health endpoint responds
7. ✅ Can perform CRUD operations

---

## 📚 Files Created

- ✅ `run-all-migrations.sh` - Linux/Mac automated script
- ✅ `run-all-migrations.ps1` - Windows PowerShell script
- ✅ `COMPLETE_MIGRATION_GUIDE.md` - This comprehensive guide

---

**Last Updated**: December 2024  
**Status**: Ready to Deploy  
**Risk**: Low (with backup)  
**Recommended**: Use automated script for safety and speed
