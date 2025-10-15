# Complete VPS Deployment Guide
## Migrations + Super Admin Setup

This guide will help you deploy ALL migrations and set up System Super Admin on your VPS.

---

## 📋 What Will Be Deployed?

### Database Migrations (9 total)
1. ✅ **Webhooks** - External integrations
2. ✅ **Task Cancellation** - Cancel running tasks
3. ✅ **Notifications** - In-app notifications
4. ✅ **Performance Indexes** - Speed improvements
5. ✅ **Critical Indexes** - P0/P1 performance
6. ✅ **Secondary Indexes** - P2 optimizations
7. ✅ **Super Admin Field** - System-wide admin
8. ✅ **Audit Logs** - Track all admin actions

### Application Features
- ✅ System Super Admin Dashboard
- ✅ Organization Management
- ✅ Audit Trail for all actions
- ✅ Rate Limiting for security
- ✅ Webhook system for integrations
- ✅ Enhanced notifications

---

## 🚀 Quick Deploy (2 Methods)

### Method 1: Automated Script (Recommended)

#### Step 1: Configure the Script (Local Machine)

Open `deploy-complete-vps.sh` and set these values:

```bash
# Database Configuration
DB_HOST="localhost"
DB_USER="postgres"
DB_NAME="processsutra"
DB_PASSWORD="your_actual_password"  # ⚠️ REQUIRED

# Super Admin Configuration
SUPER_ADMIN_EMAIL="your@email.com"  # ⚠️ REQUIRED
```

#### Step 2: Commit and Push

```powershell
# On your local Windows machine
git add .
git commit -m "feat: Complete VPS deployment with migrations and super admin"
git push origin main
```

#### Step 3: Deploy on VPS

```bash
# SSH into your VPS
ssh username@your-vps-ip

# Navigate to project
cd /path/to/Process-Sutra-2026

# Pull latest code
git pull origin main

# Make script executable
chmod +x deploy-complete-vps.sh

# Run deployment
./deploy-complete-vps.sh
```

**That's it!** The script will:
- ✅ Backup your database
- ✅ Run all 9 migrations
- ✅ Setup super admin
- ✅ Build and restart the app

---

### Method 2: Manual Step-by-Step

If you prefer to do it manually or the script fails:

#### Step 1: Backup Everything

```bash
# SSH into VPS
ssh username@your-vps-ip
cd /path/to/Process-Sutra-2026

# Backup code
cp -r . ../process-sutra-backup-$(date +%Y%m%d)

# Backup database
export PGPASSWORD='your_db_password'
pg_dump -h localhost -U postgres -d processsutra > backup_$(date +%Y%m%d_%H%M%S).sql

echo "✓ Backups created"
```

#### Step 2: Pull Latest Code

```bash
git pull origin main
npm install
```

#### Step 3: Run Migrations

```bash
# Create migration tracking table
psql -h localhost -U postgres -d processsutra <<EOF
CREATE TABLE IF NOT EXISTS schema_migrations (
    id SERIAL PRIMARY KEY,
    migration_file VARCHAR(255) UNIQUE NOT NULL,
    applied_at TIMESTAMP DEFAULT NOW(),
    success BOOLEAN DEFAULT TRUE
);
EOF

# Run each migration
psql -d processsutra -f migrations/0001_add_webhooks.sql
psql -d processsutra -f migrations/0002_add_task_cancellation_fields.sql
psql -d processsutra -f migrations/0003_add_notifications_table.sql
psql -d processsutra -f migrations/0004_add_notifications_table.sql
psql -d processsutra -f migrations/0005_add_performance_indexes.sql
psql -d processsutra -f migrations/0006_add_critical_indexes_p0_p1.sql
psql -d processsutra -f migrations/0007_add_secondary_indexes_p2.sql
psql -d processsutra -f migrations/0008_add_super_admin_field.sql
psql -d processsutra -f migrations/0009_add_audit_logs.sql

echo "✓ All migrations applied"
```

#### Step 4: Setup Super Admin

```bash
# Replace with your email
psql -d processsutra <<EOF
UPDATE users 
SET is_super_admin = true,
    updated_at = NOW()
WHERE email = 'your@email.com';
EOF

# Verify
psql -d processsutra -c "SELECT email, is_super_admin FROM users WHERE is_super_admin = true;"
```

#### Step 5: Build and Restart

```bash
# Build application
npm run build

# Restart with PM2
pm2 restart process-sutra

# Or with systemd
sudo systemctl restart process-sutra

# Check status
pm2 status
# or
sudo systemctl status process-sutra
```

#### Step 6: Verify

```bash
# Test health endpoint
curl http://localhost:5000/api/health

# Check tables exist
psql -d processsutra -c "\dt" | grep -E "(webhooks|notifications|audit_logs)"

# Check audit logs table structure
psql -d processsutra -c "\d audit_logs"
```

---

## ✅ Verification Checklist

After deployment, verify everything works:

### Database Verification

```bash
# Connect to database
psql -d processsutra

# Check all tables exist
\dt

# Should see:
# - webhooks
# - notifications
# - audit_logs
# - users (with is_super_admin column)

# Verify super admin
SELECT email, is_super_admin, role FROM users WHERE is_super_admin = true;

# Check migrations applied
SELECT * FROM schema_migrations ORDER BY applied_at;

# Exit
\q
```

### Application Verification

1. **Log in** with your super admin email
2. **Check Sidebar** - Should see:
   - 🔴 Red "System Admin" button at top
   - Regular menu items
   - Blue "Admin Access" badge at bottom
   - Red "System Admin" badge at bottom

3. **Access System Admin**:
   - Click "System Admin" button
   - Should redirect to `/system-super-admin`
   - Should see list of ALL organizations

4. **Test Audit Trail**:
   - Toggle an organization status
   - Check database:
   ```bash
   psql -d processsutra -c "SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 5;"
   ```
   - Should see your action logged

5. **Test Rate Limiting**:
   ```bash
   # Make 101 requests quickly
   for i in {1..101}; do
     curl -s -o /dev/null -w "%{http_code}\n" http://localhost:5000/api/health
   done
   # 101st request should return 429
   ```

---

## 🎯 Access Levels Overview

### Level 1: Regular User
- **Route**: `/dashboard`
- **Access**: Own tasks and data
- **Badge**: None

### Level 2: Organization Admin
- **Route**: `/super-admin`
- **Access**: All users in their organization
- **Badge**: Blue "Admin Access"
- **Field**: `role = 'admin'`

### Level 3: System Super Admin (NEW!)
- **Route**: `/system-super-admin`
- **Access**: ALL organizations, ALL users
- **Badge**: Red "System Admin"
- **Field**: `is_super_admin = true`

---

## 🔍 Troubleshooting

### Issue: Script fails at database connection
```bash
# Test connection manually
psql -h localhost -U postgres -d processsutra -c "SELECT NOW();"

# If fails, check:
# 1. PostgreSQL is running
sudo systemctl status postgresql

# 2. Database exists
psql -U postgres -l | grep processsutra

# 3. Password is correct (check .env file)
cat .env | grep DATABASE_URL
```

### Issue: Migration already applied error
```bash
# This is safe - it means the migration was already run
# Script will skip it automatically

# To see which migrations are applied:
psql -d processsutra -c "SELECT * FROM schema_migrations;"
```

### Issue: User not found for super admin
```bash
# The user must log in at least once before being promoted
# Steps:
# 1. Log in to the app with the email
# 2. Then run:
psql -d processsutra <<EOF
UPDATE users SET is_super_admin = true WHERE email = 'your@email.com';
EOF
```

### Issue: Application won't start
```bash
# Check logs
pm2 logs process-sutra --lines 50

# Or systemd logs
sudo journalctl -u process-sutra -n 50

# Common fixes:
# 1. Check .env file exists and has correct values
# 2. Check port 5000 is not already in use
sudo netstat -tulpn | grep 5000

# 3. Rebuild
npm run build
pm2 restart process-sutra
```

### Issue: Can't see System Admin button
```bash
# Verify super admin status
psql -d processsutra -c "SELECT email, is_super_admin FROM users WHERE email = 'your@email.com';"

# Should show: is_super_admin | t

# If shows 'f', update:
psql -d processsutra -c "UPDATE users SET is_super_admin = true WHERE email = 'your@email.com';"

# Clear browser cache and log in again
```

### Issue: Audit logs not being created
```bash
# Check table exists
psql -d processsutra -c "\d audit_logs"

# Should show 14 columns including:
# - id, actor_id, action, description
# - target_type, target_id, changes
# - ip_address, user_agent
# - organization_id, created_at, etc.

# If table missing, re-run migration:
psql -d processsutra -f migrations/0009_add_audit_logs.sql
```

---

## 📊 Post-Deployment Monitoring

### Check Application Health

```bash
# View PM2 status
pm2 status

# View logs (live)
pm2 logs process-sutra --lines 50 -f

# Check memory usage
pm2 monit
```

### Monitor Database Performance

```bash
# Check active connections
psql -d processsutra -c "SELECT count(*) FROM pg_stat_activity WHERE datname = 'processsutra';"

# Check table sizes
psql -d processsutra -c "SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size FROM pg_tables WHERE schemaname = 'public' ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;"

# Check slow queries
psql -d processsutra -c "SELECT query, calls, total_time, mean_time FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;"
```

### Test Audit Trail

```bash
# View recent audit logs
psql -d processsutra <<EOF
SELECT 
    created_at,
    actor_email,
    action,
    description,
    target_type
FROM audit_logs 
ORDER BY created_at DESC 
LIMIT 10;
EOF
```

---

## 🔐 Security Notes

### Important Reminders

1. **Database Password**: Never commit `DB_PASSWORD` to git
2. **Super Admin**: Limit super admin access to trusted users only
3. **Audit Logs**: Review regularly for suspicious activity
4. **Backups**: Keep backups secure and test restore process
5. **Rate Limiting**: Adjust limits in `server/routes.ts` if needed

### Recommended Security Checks

```bash
# 1. Check file permissions
ls -la deploy-complete-vps.sh
# Should NOT be world-readable if it contains passwords

# 2. Check who has super admin access
psql -d processsutra -c "SELECT email, created_at FROM users WHERE is_super_admin = true;"

# 3. Review audit logs for suspicious activity
psql -d processsutra -c "SELECT * FROM audit_logs WHERE action IN ('delete_user', 'deactivate_organization') ORDER BY created_at DESC;"

# 4. Check rate limit effectiveness
grep "429" /var/log/nginx/access.log | wc -l
```

---

## 📚 Additional Resources

- **Quick Reference**: `QUICK_REFERENCE.md`
- **Super Admin Guide**: `SYSTEM_SUPER_ADMIN_QUICK_REFERENCE.md`
- **Audit Trail Guide**: `AUDIT_TRAIL_QUICK_REFERENCE.md`
- **Migration Details**: `RUN_ALL_MIGRATIONS_VPS.md`
- **Security Audit**: `SECURITY_AUDIT_REPORT.md`

---

## 🆘 Need Help?

If you encounter issues:

1. **Check logs first**: `pm2 logs process-sutra --lines 100`
2. **Verify database**: `psql -d processsutra -c "SELECT NOW();"`
3. **Review this guide**: Troubleshooting section above
4. **Check backup**: You can restore from `backup_*.sql` if needed

### Restore from Backup (if needed)

```bash
# Stop application
pm2 stop process-sutra

# Restore database
psql -d processsutra < backup_YYYYMMDD_HHMMSS.sql

# Restart application
pm2 start process-sutra

# Restore code (if needed)
cd ..
rm -rf Process-Sutra-2026
cp -r process-sutra-backup-YYYYMMDD Process-Sutra-2026
cd Process-Sutra-2026
pm2 restart process-sutra
```

---

## ✨ Success Indicators

You know the deployment was successful when:

- ✅ All 9 migrations show "Applied" or "Skipped"
- ✅ No failed migrations in summary
- ✅ Super admin user shows `is_super_admin = true`
- ✅ Application restarts without errors
- ✅ Health endpoint returns `{"ok":true}`
- ✅ Audit logs table has 14 columns
- ✅ You can log in and see "System Admin" button
- ✅ `/system-super-admin` page loads and shows organizations
- ✅ Actions create entries in `audit_logs` table

---

**Happy Deploying! 🚀**
