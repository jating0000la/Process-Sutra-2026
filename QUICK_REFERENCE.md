# 🚀 Quick Reference - Database Fixes

## One-Command Deploy

### PostgreSQL (Production)
```powershell
# Apply both migrations
psql -U postgres -d processsutra -f migrations/0006_add_critical_indexes_p0_p1.sql
psql -U postgres -d processsutra -f migrations/0007_add_secondary_indexes_p2.sql
```

### MongoDB (Production)
```powershell
# Setup all indexes
node scripts/setup-mongo-indexes.mjs
```

---

## Verify Success

### PostgreSQL
```sql
-- Should return 15+ new indexes
SELECT COUNT(*) FROM pg_indexes 
WHERE schemaname = 'public' 
  AND indexname LIKE 'idx_%';

-- Should return 1 row
SELECT * FROM pg_constraint WHERE conname = 'unique_org_tat_config';
```

### MongoDB
```javascript
// Should return 8+ indexes
db.formResponses.getIndexes().length
```

---

## If Something Goes Wrong

### Rollback PostgreSQL
```sql
-- Drop all new indexes (safe, reversible)
DROP INDEX CONCURRENTLY idx_organizations_domain;
DROP INDEX CONCURRENTLY idx_users_org_email;
DROP INDEX CONCURRENTLY idx_users_org_role_status;
DROP INDEX CONCURRENTLY idx_form_templates_org_form;
DROP INDEX CONCURRENTLY idx_user_devices_user_active;
DROP INDEX CONCURRENTLY idx_password_history_user;

-- Remove unique constraint
ALTER TABLE tat_config DROP CONSTRAINT unique_org_tat_config;
```

### Rollback MongoDB
```javascript
// Drop new indexes (keeps default _id index)
db.formResponses.dropIndex('idx_formResponses_form_lookup');
db.formResponses.dropIndex('idx_formResponses_org_date');
db.formResponses.dropIndex('idx_formResponses_task');
db.formResponses.dropIndex('idx_formResponses_user_submissions');
db.formResponses.dropIndex('idx_formResponses_system');
db.formResponses.dropIndex('idx_formResponses_order');
```

---

## Performance Check

### Before/After Comparison
```sql
-- Test organization lookup
EXPLAIN ANALYZE SELECT * FROM organizations WHERE domain = 'test.com';
-- Look for "Index Scan using idx_organizations_domain"

-- Test user auth
EXPLAIN ANALYZE SELECT * FROM users WHERE organization_id = 'test' AND email = 'test@test.com';
-- Look for "Index Scan using idx_users_org_email"
```

---

## 🆘 Emergency Contacts

- **Issues?** Check `DATABASE_FIXES_README.md`
- **Questions?** Read `DATABASE_FIXES_SUMMARY.md`
- **Architecture?** See `DATA_CONSISTENCY_STRATEGY.md`

---

## ⏱️ Time Estimates

- PostgreSQL migrations: **5-15 minutes**
- MongoDB setup: **2-5 minutes**
- Verification: **5 minutes**
- **Total: ~20 minutes**

---

## ✅ Success Criteria

- [x] No errors during migration
- [x] Application starts successfully  
- [x] Queries use new indexes
- [x] No performance degradation
- [x] Unique constraint prevents duplicate TAT configs

---

**Status:** Ready for Production Deployment 🚀
