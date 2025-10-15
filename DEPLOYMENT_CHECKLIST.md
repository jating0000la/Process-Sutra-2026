# VPS Deployment Checklist - Audit Trail & Rate Limiting

## 🚀 Quick Start (5 Steps)

### Step 1: Commit and Push Code (Local Machine)
```powershell
git add .
git commit -m "feat: Add audit trail and rate limiting"
git push origin main
```

### Step 2: Connect to VPS
```bash
ssh username@your-vps-ip
cd /path/to/Process-Sutra-2026
```

### Step 3: Pull Code and Backup
```bash
# Backup
cp -r . ../process-sutra-backup-$(date +%Y%m%d)

# Pull latest
git pull origin main
```

### Step 4: Run Migration
```bash
# Set password
export PGPASSWORD='your_db_password'

# Backup database
pg_dump -h localhost -U postgres -d processsutra > backup_$(date +%Y%m%d).sql

# Run migration
psql -h localhost -U postgres -d processsutra -f migrations/0009_add_audit_logs.sql
```

### Step 5: Restart Application
```bash
# PM2
pm2 restart process-sutra

# Or Systemd
sudo systemctl restart process-sutra

# Or Docker
docker-compose down && docker-compose up -d
```

---

## ✅ Detailed Checklist

### Pre-Deployment
- [ ] All changes committed to git
- [ ] Migration file exists: `migrations/0009_add_audit_logs.sql`
- [ ] Server runs locally without errors
- [ ] No TypeScript errors

### On VPS - Backup Phase
- [ ] SSH connection established
- [ ] Current directory: `/path/to/Process-Sutra-2026`
- [ ] Code backup created: `../process-sutra-backup-YYYYMMDD`
- [ ] Database backup created: `backup_YYYYMMDD.sql`

### On VPS - Update Phase
- [ ] Latest code pulled from git: `git pull origin main`
- [ ] Migration file verified: `ls -la migrations/0009_add_audit_logs.sql`
- [ ] Dependencies installed: `npm install` (if needed)

### On VPS - Database Phase
- [ ] Database connection tested: `psql -d processsutra -c "SELECT NOW();"`
- [ ] Migration executed: `psql -d processsutra -f migrations/0009_add_audit_logs.sql`
- [ ] Table created: `psql -d processsutra -c "\d audit_logs"`
- [ ] Indexes verified: 6 indexes (actor_id, action, created_at, target_type, target_id, primary key)

### On VPS - Application Phase
- [ ] Application built: `npm run build` (if needed)
- [ ] Application restarted: `pm2 restart process-sutra`
- [ ] Server status checked: `pm2 status` or `systemctl status process-sutra`
- [ ] Logs reviewed: `pm2 logs --lines 50` (no errors)

### Verification Phase
- [ ] Health check: `curl http://localhost:5000/api/health`
- [ ] Server responds with `{"ok":true}`
- [ ] No errors in logs
- [ ] Audit logs table exists with 14 columns
- [ ] Rate limiting headers present in responses

### Testing Phase
- [ ] Test super admin endpoint (should work)
- [ ] Perform a super admin action (e.g., toggle org status)
- [ ] Check audit_logs table: `SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 5;`
- [ ] Verify audit log entry created
- [ ] Test rate limiting (make 101 requests, 101st should fail with 429)

### Post-Deployment
- [ ] Monitor logs for 10 minutes: `pm2 logs -f`
- [ ] Check for any errors or warnings
- [ ] Verify application is stable
- [ ] Document any issues
- [ ] Notify team of successful deployment

---

## 📋 Quick Command Reference

### Database Commands
```bash
# Connect to database
psql -h localhost -U postgres -d processsutra

# Check table
\d audit_logs

# Count audit logs
SELECT COUNT(*) FROM audit_logs;

# View recent logs
SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 10;

# Check table size
SELECT pg_size_pretty(pg_total_relation_size('audit_logs'));
```

### PM2 Commands
```bash
pm2 status                    # Check status
pm2 restart process-sutra     # Restart app
pm2 logs process-sutra -f     # Follow logs
pm2 logs --lines 100          # Last 100 lines
pm2 monit                     # Monitor resources
```

### Git Commands
```bash
git status                    # Check changes
git pull origin main          # Pull latest
git log --oneline -5          # Recent commits
git checkout <commit>         # Rollback if needed
```

### Verification Commands
```bash
# Health check
curl http://localhost:5000/api/health

# Test with auth (replace TOKEN)
curl -H "Authorization: Bearer TOKEN" \
  http://localhost:5000/api/super-admin/organizations

# Check rate limit headers
curl -I -H "Authorization: Bearer TOKEN" \
  http://localhost:5000/api/super-admin/organizations
```

---

## 🔧 Configuration Updates Needed

Before running deployment script, update these values:

### In `deploy-audit-trail.sh` (Linux/Mac)
```bash
DB_HOST="localhost"           # Your database host
DB_USER="postgres"            # Your database user
DB_NAME="processsutra"        # Your database name
DB_PASSWORD="your_password"   # YOUR ACTUAL PASSWORD!
APP_NAME="process-sutra"      # Your PM2 app name
APP_DIR="/var/www/process-sutra"  # YOUR ACTUAL PATH!
```

### In `deploy-audit-trail.ps1` (Windows)
```powershell
$DB_HOST = "localhost"
$DB_USER = "postgres"
$DB_NAME = "processsutra"
$DB_PASSWORD = "your_password"  # YOUR ACTUAL PASSWORD!
$APP_NAME = "process-sutra"
$APP_DIR = "C:\path\to\Process-Sutra-2026"  # YOUR ACTUAL PATH!
```

---

## 🚨 Troubleshooting

### Issue: Migration Already Run
```bash
# Check if table exists
psql -d processsutra -c "\dt audit_logs"

# If exists, skip migration or drop and recreate (CAREFUL!)
# psql -d processsutra -c "DROP TABLE audit_logs CASCADE;"
```

### Issue: Server Won't Start
```bash
# Check port in use
lsof -i :5000

# Check logs
pm2 logs process-sutra --err --lines 50

# Check database connection
psql -d processsutra -c "SELECT 1;"
```

### Issue: Audit Logs Not Created
```bash
# Check application logs
pm2 logs process-sutra | grep -i audit

# Check database
psql -d processsutra -c "SELECT COUNT(*) FROM audit_logs;"

# Verify storage method exists
grep "createAuditLog" server/storage.ts
```

### Issue: Rate Limiting Not Working
```bash
# Check if middleware is applied
grep "superAdminLimiter" server/routes.ts

# Test multiple requests
for i in {1..5}; do
  curl -H "Authorization: Bearer TOKEN" \
    http://localhost:5000/api/super-admin/organizations
done
```

---

## 🔄 Rollback Steps

If something goes wrong:

### 1. Rollback Code
```bash
# Stop app
pm2 stop process-sutra

# Restore backup
rm -rf /path/to/Process-Sutra-2026/*
cp -r /path/to/process-sutra-backup-YYYYMMDD/* /path/to/Process-Sutra-2026/

# Restart
cd /path/to/Process-Sutra-2026
npm install
pm2 restart process-sutra
```

### 2. Rollback Database (Optional)
```bash
# Only if audit_logs table is causing issues
psql -d processsutra -c "DROP TABLE IF EXISTS audit_logs CASCADE;"

# Or restore full backup
psql -d processsutra < backup_YYYYMMDD.sql
```

---

## 📊 Expected Results

After successful deployment:

1. **Server Status**
   - ✅ Server running on port 5000
   - ✅ No errors in logs
   - ✅ Health endpoint responds

2. **Database**
   - ✅ `audit_logs` table exists
   - ✅ 14 columns present
   - ✅ 6 indexes created
   - ✅ Foreign key constraints active

3. **Audit Logging**
   - ✅ Actions create audit log entries
   - ✅ IP address captured
   - ✅ User agent captured
   - ✅ Old/new values recorded

4. **Rate Limiting**
   - ✅ Headers: RateLimit-Limit, RateLimit-Remaining, RateLimit-Reset
   - ✅ 100 requests allowed per 15 minutes
   - ✅ 101st request returns 429

---

## ⏱️ Time Estimates

- **Manual Deployment**: 15-30 minutes
- **Automated Deployment** (script): 5-10 minutes
- **Rollback**: 5 minutes
- **Testing**: 10 minutes
- **Total**: 30-50 minutes

---

## 📞 Support

If issues occur during deployment:

1. **Check logs**: `pm2 logs process-sutra --lines 100`
2. **Check database**: `psql -d processsutra`
3. **Review documentation**: `DEPLOYMENT_GUIDE_AUDIT_TRAIL.md`
4. **Rollback if needed**: See "Rollback Steps" above

---

**Last Updated**: December 2024  
**Version**: 1.0  
**Status**: Ready for Production
