# 🚀 VPS Migration - Quick Reference

## ⚡ Quick Commands

### Linux/Mac VPS - Automated (Recommended)
```bash
ssh user@vps-ip
cd /path/to/Process-Sutra-2026
nano run-all-migrations.sh  # Update DB_PASSWORD
chmod +x run-all-migrations.sh
./run-all-migrations.sh
```

### Windows Server - Automated
```powershell
cd C:\path\to\Process-Sutra-2026
notepad run-all-migrations.ps1  # Update $DB_PASSWORD
.\run-all-migrations.ps1
```

### Manual - All at Once
```bash
export PGPASSWORD='your_password'
pg_dump -d processsutra > backup.sql
cd migrations
for f in *.sql; do psql -d processsutra -f "$f"; done
```

---

## 📋 9 Migrations in Order

1. `0001_add_webhooks.sql` - Webhook system
2. `0002_add_task_cancellation_fields.sql` - Task cancellation
3. `0003_add_notifications_table.sql` - Notifications v1
4. `0004_add_notifications_table.sql` - Notifications v2
5. `0005_add_performance_indexes.sql` - Performance
6. `0006_add_critical_indexes_p0_p1.sql` - Critical indexes
7. `0007_add_secondary_indexes_p2.sql` - Secondary indexes
8. `0008_add_super_admin_field.sql` - Super admin
9. `0009_add_audit_logs.sql` - Audit trail ✨ NEW

---

## ✅ Quick Verification

```bash
# Check migrations applied
psql -d processsutra -c "SELECT COUNT(*) FROM schema_migrations;"

# Check tables exist
psql -d processsutra -c "\dt" | grep -E "webhooks|notifications|audit_logs"

# Check super admin field
psql -d processsutra -c "\d users" | grep is_super_admin

# Restart & check
pm2 restart process-sutra
pm2 logs --lines 50
```

---

## 🚨 If Something Fails

```bash
# Rollback from backup
psql -d processsutra < backup_*.sql

# Or skip failed migration and continue
# (if error is "already exists")
```

---

## 📊 Expected Results

- ✅ 9 migrations completed
- ✅ `webhooks` table exists
- ✅ `notifications` table exists  
- ✅ `audit_logs` table exists (14 columns, 6 indexes)
- ✅ `users.is_super_admin` field exists
- ✅ 50+ indexes total
- ✅ Application runs without errors

---

## ⏱️ Time: 5-20 minutes

**Automated**: 5-10 min  
**Manual**: 15-20 min

---

## 📞 Need Help?

Read: `COMPLETE_MIGRATION_GUIDE.md` (full guide)

**Status**: ✅ READY TO RUN
