# 🚀 VPS Deployment - Quick Command Reference

## ⚡ Super Quick Deploy (5 Commands)

```bash
# 1. SSH to VPS
ssh username@your-vps-ip

# 2. Navigate to project
cd /path/to/Process-Sutra-2026

# 3. Pull and make executable
git pull origin main && chmod +x deploy-complete-vps.sh

# 4. Edit configuration (set DB_PASSWORD and SUPER_ADMIN_EMAIL)
nano deploy-complete-vps.sh

# 5. Deploy everything
./deploy-complete-vps.sh
```

---

## 📝 Before Running - Edit Script

Open `deploy-complete-vps.sh` and set:

```bash
DB_PASSWORD="your_actual_password"        # ⚠️ REQUIRED
SUPER_ADMIN_EMAIL="your@email.com"        # ⚠️ REQUIRED
```

---

## 🔍 Quick Verification Commands

```bash
# Check database tables
psql -d processsutra -c "\dt" | grep -E "(webhooks|notifications|audit_logs)"

# Verify super admin
psql -d processsutra -c "SELECT email, is_super_admin FROM users WHERE is_super_admin = true;"

# Check application status
pm2 status

# View logs
pm2 logs process-sutra --lines 50

# Test health endpoint
curl http://localhost:5000/api/health

# View recent audit logs
psql -d processsutra -c "SELECT created_at, actor_email, action, description FROM audit_logs ORDER BY created_at DESC LIMIT 5;"
```

---

## 🔧 Manual Migration Commands (If Script Fails)

```bash
# Set password
export PGPASSWORD='your_password'

# Backup first
pg_dump -d processsutra > backup_$(date +%Y%m%d_%H%M%S).sql

# Run migrations one by one
psql -d processsutra -f migrations/0001_add_webhooks.sql
psql -d processsutra -f migrations/0002_add_task_cancellation_fields.sql
psql -d processsutra -f migrations/0003_add_notifications_table.sql
psql -d processsutra -f migrations/0004_add_notifications_table.sql
psql -d processsutra -f migrations/0005_add_performance_indexes.sql
psql -d processsutra -f migrations/0006_add_critical_indexes_p0_p1.sql
psql -d processsutra -f migrations/0007_add_secondary_indexes_p2.sql
psql -d processsutra -f migrations/0008_add_super_admin_field.sql
psql -d processsutra -f migrations/0009_add_audit_logs.sql

# Setup super admin
psql -d processsutra -c "UPDATE users SET is_super_admin = true WHERE email = 'your@email.com';"

# Rebuild and restart
npm run build && pm2 restart process-sutra
```

---

## 🐛 Troubleshooting One-Liners

```bash
# Connection test
psql -d processsutra -c "SELECT NOW();"

# Check PostgreSQL running
sudo systemctl status postgresql

# Check which migrations applied
psql -d processsutra -c "SELECT * FROM schema_migrations ORDER BY applied_at;"

# Force restart application
pm2 delete process-sutra && pm2 start ecosystem.config.js --env production

# View all errors in logs
pm2 logs process-sutra --err --lines 100

# Check port 5000 availability
sudo netstat -tulpn | grep 5000

# Test database connection from app
psql -d processsutra -c "SELECT COUNT(*) FROM users;"
```

---

## 📊 Success Indicators

After running the script, you should see:

```
✓ Database connection successful
✓ Backup created: backup_complete_YYYYMMDD_HHMMSS.sql
✓ Migration tracking table ready
✓ Migration applied successfully (x9)
✓ User 'your@email.com' promoted to System Super Admin
✓ Code updated from GitHub
✓ Dependencies installed
✓ Application built successfully
✓ Application restarted with PM2
✓ Health endpoint responding

========================================
Deployment Complete! 🎉
========================================
```

---

## 🎯 What Gets Deployed

| Migration | Feature | Status |
|-----------|---------|--------|
| 0001 | Webhooks table | ✅ |
| 0002 | Task cancellation | ✅ |
| 0003 | Notifications (v1) | ✅ |
| 0004 | Notifications (v2) | ✅ |
| 0005 | Performance indexes | ✅ |
| 0006 | Critical indexes P0/P1 | ✅ |
| 0007 | Secondary indexes P2 | ✅ |
| 0008 | Super admin field | ✅ |
| 0009 | Audit logs | ✅ |

---

## 🔐 Post-Deployment Access

### System Super Admin Features:
- Route: `/system-super-admin`
- View ALL organizations
- Activate/deactivate organizations
- View ALL users across organizations
- All actions logged in audit trail

### To Access:
1. Log in with your super admin email
2. Look for red "System Admin" button in sidebar
3. Click to access system-wide dashboard

---

## 📞 Quick Recovery

If something goes wrong:

```bash
# Stop application
pm2 stop process-sutra

# Restore database backup
psql -d processsutra < backup_complete_YYYYMMDD_HHMMSS.sql

# Restart application
pm2 start process-sutra

# Check logs
pm2 logs process-sutra --lines 100
```

---

## 📁 Important Files

- `deploy-complete-vps.sh` - Main deployment script
- `VPS_DEPLOYMENT_COMPLETE_GUIDE.md` - Full documentation
- `migrations/` - All 9 database migrations
- `ecosystem.config.js` - PM2 configuration
- `backup_complete_*.sql` - Database backup (created by script)

---

## 💡 Pro Tips

1. **Always backup before deploying**: Script does this automatically
2. **Test on staging first**: If you have a staging environment
3. **Monitor logs**: Run `pm2 logs -f` in separate terminal during deployment
4. **Keep credentials secure**: Never commit passwords to git
5. **Document changes**: Note what was deployed and when

---

## ⏱️ Estimated Time

- **Automated script**: 2-5 minutes
- **Manual deployment**: 10-15 minutes
- **Verification**: 2-3 minutes

**Total**: ~5-8 minutes with automated script

---

## 🎓 Learning Resources

For detailed information, see:
- `VPS_DEPLOYMENT_COMPLETE_GUIDE.md` - Full guide with troubleshooting
- `SYSTEM_SUPER_ADMIN_QUICK_REFERENCE.md` - Super admin features
- `AUDIT_TRAIL_QUICK_REFERENCE.md` - Audit trail usage
- `RUN_ALL_MIGRATIONS_VPS.md` - Migration details

---

**Ready to deploy? Run `./deploy-complete-vps.sh` on your VPS!**
