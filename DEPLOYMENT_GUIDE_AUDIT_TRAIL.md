# Deployment Guide: Audit Trail & Rate Limiting to VPS

## 📋 Overview
This guide walks you through deploying the audit trail and rate limiting features to your VPS production environment.

## 🎯 What Will Be Deployed
1. Database migration (audit_logs table)
2. TypeScript schema updates
3. Storage layer methods
4. Audit logging integration
5. Rate limiting middleware
6. Documentation files

## 🔧 Prerequisites

### On Your Local Machine
- [x] All code changes committed to git
- [x] Migration file tested locally
- [x] Server runs without errors
- [x] No TypeScript errors

### On Your VPS
- [ ] SSH access
- [ ] PostgreSQL database running
- [ ] Node.js and npm installed
- [ ] Application running (Process Sutra)
- [ ] Database credentials available

## 📝 Step-by-Step Deployment

### Step 1: Prepare Local Repository

#### 1.1 Check Current Status
```powershell
# Check for uncommitted changes
git status

# Check current branch
git branch
```

#### 1.2 Commit All Changes
```powershell
# Stage all changes
git add .

# Commit with descriptive message
git commit -m "feat: Add audit trail and rate limiting for super admin

- Create audit_logs table with migration 0009
- Add audit logging to all super admin mutation endpoints
- Implement rate limiting (100 req/15min) for super admin endpoints
- Add storage methods createAuditLog() and getAuditLogs()
- Track actions: TOGGLE_ORG_STATUS, UPDATE_ORGANIZATION, CHANGE_USER_STATUS, PROMOTE_SUPER_ADMIN
- Capture IP address, user agent, old/new values
- Add comprehensive documentation"
```

#### 1.3 Push to Remote Repository
```powershell
# Push to main branch (or your deployment branch)
git push origin main
```

### Step 2: Connect to VPS

#### 2.1 SSH into Your VPS
```bash
# Replace with your VPS details
ssh username@your-vps-ip

# Or if using a specific key
ssh -i /path/to/key.pem username@your-vps-ip
```

#### 2.2 Navigate to Application Directory
```bash
# Navigate to your Process Sutra installation
cd /path/to/Process-Sutra-2026

# Example:
cd /var/www/process-sutra
# or
cd ~/apps/process-sutra
```

### Step 3: Pull Latest Code

#### 3.1 Backup Current Version (IMPORTANT!)
```bash
# Create backup of current codebase
cp -r . ../process-sutra-backup-$(date +%Y%m%d-%H%M%S)

# Or use git
git branch backup-$(date +%Y%m%d-%H%M%S)
```

#### 3.2 Pull Latest Changes
```bash
# Fetch latest changes
git fetch origin

# Pull latest code
git pull origin main

# Verify you have the new files
ls -la migrations/0009_add_audit_logs.sql
```

### Step 4: Install Dependencies (if needed)

```bash
# Install any new npm packages (express-rate-limit should already be there)
npm install

# If you see any peer dependency warnings, you can ignore them
```

### Step 5: Run Database Migration

#### 5.1 Backup Database (CRITICAL!)
```bash
# Create database backup before migration
pg_dump -h localhost -U postgres -d processsutra > backup_$(date +%Y%m%d_%H%M%S).sql

# Or if using different credentials
pg_dump -h localhost -U your_db_user -d your_db_name > backup_$(date +%Y%m%d_%H%M%S).sql
```

#### 5.2 Test Database Connection
```bash
# Test connection (replace with your credentials)
psql -h localhost -U postgres -d processsutra -c "SELECT NOW();"
```

#### 5.3 Run Migration
```bash
# Set password environment variable (replace 'admin' with your password)
export PGPASSWORD='your_database_password'

# Run migration
psql -h localhost -U postgres -d processsutra -f migrations/0009_add_audit_logs.sql

# Verify migration success
psql -h localhost -U postgres -d processsutra -c "\d audit_logs"
```

**Expected Output:**
```
CREATE TABLE
CREATE INDEX
CREATE INDEX
CREATE INDEX
CREATE INDEX
CREATE INDEX
COMMENT
COMMENT
COMMENT
COMMENT
COMMENT
```

#### 5.4 Verify Table Creation
```bash
# Check table structure
psql -h localhost -U postgres -d processsutra -c "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'audit_logs' ORDER BY ordinal_position;"

# Check indexes
psql -h localhost -U postgres -d processsutra -c "SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'audit_logs';"

# Check row count (should be 0)
psql -h localhost -U postgres -d processsutra -c "SELECT COUNT(*) FROM audit_logs;"
```

### Step 6: Build Application

#### 6.1 Build TypeScript
```bash
# If using TypeScript build
npm run build

# Or if using esbuild
npm run build:server
```

#### 6.2 Check for Build Errors
```bash
# If there are any TypeScript errors, fix them before proceeding
# Check the build output for any errors
```

### Step 7: Restart Application

#### 7.1 Using PM2 (Recommended)
```bash
# If using PM2
pm2 restart process-sutra

# Or restart by ecosystem file
pm2 restart ecosystem.config.js

# Check logs
pm2 logs process-sutra --lines 50
```

#### 7.2 Using Systemd
```bash
# If using systemd service
sudo systemctl restart process-sutra

# Check status
sudo systemctl status process-sutra

# View logs
sudo journalctl -u process-sutra -n 50 -f
```

#### 7.3 Using Docker
```bash
# If using Docker
docker-compose down
docker-compose up -d --build

# Check logs
docker-compose logs -f --tail=50
```

#### 7.4 Manual Start (Development)
```bash
# Stop current process (Ctrl+C if running in terminal)

# Start with npm
npm run start

# Or
npm run prod
```

### Step 8: Verify Deployment

#### 8.1 Check Server Status
```bash
# Check if server is running
curl http://localhost:5000/api/health

# Expected response:
# {"ok":true,"ts":"2024-12-20T...","env":"production","port":"5000"}
```

#### 8.2 Check Application Logs
```bash
# PM2 logs
pm2 logs process-sutra --lines 100

# Look for:
# - "registerRoutes invoked"
# - "Successfully connected to PostgreSQL database"
# - No error messages about audit_logs or auditLogs
```

#### 8.3 Test Super Admin Endpoint (with rate limiting)
```bash
# Test a read endpoint (should work)
curl -X GET "http://localhost:5000/api/super-admin/organizations" \
  -H "Authorization: Bearer YOUR_SUPER_ADMIN_TOKEN"

# Check rate limit headers in response
# RateLimit-Limit: 100
# RateLimit-Remaining: 99
# RateLimit-Reset: <timestamp>
```

#### 8.4 Verify Audit Logging
```bash
# Make a super admin action (e.g., toggle org status)
curl -X PUT "http://localhost:5000/api/super-admin/organizations/ORG_ID/status" \
  -H "Authorization: Bearer YOUR_SUPER_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"isActive": false}'

# Check audit logs in database
psql -h localhost -U postgres -d processsutra -c "SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 5;"
```

### Step 9: Monitor & Validate

#### 9.1 Monitor Application
```bash
# PM2 monitoring
pm2 monit

# Or check status
pm2 status
```

#### 9.2 Check Error Logs
```bash
# Check for any errors after deployment
pm2 logs process-sutra --err --lines 50

# Or systemd
sudo journalctl -u process-sutra -p err -n 50
```

#### 9.3 Test Rate Limiting
```bash
# Test rate limiting by making multiple requests
for i in {1..5}; do
  curl -X GET "http://localhost:5000/api/super-admin/organizations" \
    -H "Authorization: Bearer YOUR_TOKEN" \
    -w "\nRequest $i - Status: %{http_code}\n"
done
```

#### 9.4 Verify Audit Trail
```bash
# Check audit log entries
psql -h localhost -U postgres -d processsutra << EOF
SELECT 
  actor_email,
  action,
  target_type,
  target_id,
  created_at
FROM audit_logs
ORDER BY created_at DESC
LIMIT 10;
EOF
```

## 🔒 Security Checklist

After deployment, verify:

- [ ] Audit logs are being created for all super admin actions
- [ ] Rate limiting is active (test by making 101 requests)
- [ ] Super admin endpoints require authentication
- [ ] IP addresses are being captured correctly
- [ ] Old/new values are being logged correctly
- [ ] Database backup was created before migration
- [ ] Application is running without errors

## 🚨 Troubleshooting

### Issue 1: Migration Fails

**Error**: "relation already exists"
```bash
# Check if table already exists
psql -h localhost -U postgres -d processsutra -c "\dt audit_logs"

# If it exists, you can skip migration or drop and recreate
# (Only drop if you're sure no data will be lost!)
```

**Error**: "syntax error near..."
```bash
# Check migration file syntax
cat migrations/0009_add_audit_logs.sql

# Ensure no Windows line endings (if edited on Windows)
dos2unix migrations/0009_add_audit_logs.sql
```

### Issue 2: TypeScript Errors

**Error**: "Cannot find module '@shared/schema'"
```bash
# Rebuild TypeScript
npm run build

# Check tsconfig paths
cat tsconfig.json
```

**Error**: "Property 'createAuditLog' does not exist"
```bash
# Ensure storage.ts was updated
grep "createAuditLog" server/storage.ts

# Rebuild
npm run build
```

### Issue 3: Server Won't Start

**Error**: "EADDRINUSE: address already in use"
```bash
# Find process using the port
lsof -i :5000
# or
netstat -tulpn | grep 5000

# Kill the process
kill -9 <PID>

# Restart
pm2 restart process-sutra
```

**Error**: "Cannot connect to database"
```bash
# Check database is running
sudo systemctl status postgresql

# Check connection
psql -h localhost -U postgres -d processsutra -c "SELECT 1;"

# Check .env file
cat .env | grep DATABASE_URL
```

### Issue 4: Audit Logs Not Created

**Check 1**: Verify table exists
```bash
psql -h localhost -U postgres -d processsutra -c "\dt audit_logs"
```

**Check 2**: Verify storage method is called
```bash
# Add debug logging to routes.ts
# Check application logs for "Creating audit log" messages
pm2 logs process-sutra --lines 100 | grep -i audit
```

**Check 3**: Check for errors
```bash
# Query database for errors
pm2 logs process-sutra --err --lines 50
```

### Issue 5: Rate Limiting Not Working

**Check 1**: Verify middleware is applied
```bash
# Check routes.ts has superAdminLimiter in all endpoints
grep "superAdminLimiter" server/routes.ts
```

**Check 2**: Check rate limit headers
```bash
curl -I http://localhost:5000/api/super-admin/organizations \
  -H "Authorization: Bearer YOUR_TOKEN"

# Look for RateLimit-* headers
```

## 📊 Post-Deployment Monitoring

### Monitor Audit Log Growth
```bash
# Check audit log count daily
psql -h localhost -U postgres -d processsutra -c "
SELECT 
  DATE(created_at) as date,
  COUNT(*) as action_count,
  pg_size_pretty(pg_total_relation_size('audit_logs')) as table_size
FROM audit_logs
GROUP BY DATE(created_at)
ORDER BY date DESC
LIMIT 7;
"
```

### Monitor Rate Limiting
```bash
# Check application logs for rate limit hits
pm2 logs process-sutra | grep "Too many super admin requests"

# Set up alert if many 429 responses
```

### Set Up Cron Job for Audit Log Reports
```bash
# Create daily audit log report
crontab -e

# Add line (runs at 1 AM daily):
0 1 * * * psql -h localhost -U postgres -d processsutra -c "SELECT actor_email, action, COUNT(*) FROM audit_logs WHERE created_at > NOW() - INTERVAL '1 day' GROUP BY actor_email, action ORDER BY COUNT(*) DESC;" | mail -s "Daily Audit Log Report" admin@yourcompany.com
```

## 🔄 Rollback Plan

If something goes wrong, here's how to rollback:

### Rollback Code
```bash
# Stop application
pm2 stop process-sutra

# Revert to previous version
git log --oneline -5  # Find commit before audit trail changes
git checkout <previous-commit-hash>

# Or restore from backup
rm -rf ./*
cp -r ../process-sutra-backup-*/* .

# Rebuild and restart
npm install
npm run build
pm2 restart process-sutra
```

### Rollback Database (if needed)
```bash
# Drop audit_logs table (only if causing issues)
psql -h localhost -U postgres -d processsutra -c "DROP TABLE IF EXISTS audit_logs CASCADE;"

# Or restore from backup
psql -h localhost -U postgres -d processsutra < backup_20241220_*.sql
```

## 📚 Additional Resources

- **Full Implementation Guide**: `AUDIT_TRAIL_IMPLEMENTATION.md`
- **Quick Reference**: `AUDIT_TRAIL_QUICK_REFERENCE.md`
- **Security Audit**: `SECURITY_AUDIT_REPORT.md`
- **Migration File**: `migrations/0009_add_audit_logs.sql`

## ✅ Deployment Completion Checklist

- [ ] Backed up database
- [ ] Backed up codebase
- [ ] Pulled latest code from git
- [ ] Ran migration successfully
- [ ] Verified table creation
- [ ] Rebuilt application
- [ ] Restarted server
- [ ] Verified server is running
- [ ] Tested super admin endpoints
- [ ] Verified audit logs are created
- [ ] Tested rate limiting
- [ ] Checked application logs for errors
- [ ] Updated documentation (if needed)
- [ ] Notified team of deployment

## 🎉 Success Criteria

Your deployment is successful when:
1. ✅ Server starts without errors
2. ✅ audit_logs table exists with correct structure
3. ✅ Super admin actions create audit log entries
4. ✅ Rate limiting returns 429 after 100 requests
5. ✅ No TypeScript or runtime errors in logs
6. ✅ IP addresses and user agents are captured
7. ✅ Old/new values are logged correctly

---

**Deployment Time Estimate**: 15-30 minutes  
**Risk Level**: Low (non-breaking changes)  
**Rollback Time**: 5 minutes  
**Recommended Deployment Window**: Off-peak hours or maintenance window
