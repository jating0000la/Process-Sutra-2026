# 🛠️ Database Fixes - Implementation Guide

This directory contains database fixes addressing critical issues identified in the Database Audit Report.

## 📋 Files Created

1. **migrations/0006_add_critical_indexes_p0_p1.sql** - Critical performance indexes (P0-P1)
2. **migrations/0007_add_secondary_indexes_p2.sql** - Secondary performance indexes (P2)
3. **scripts/setup-mongo-indexes.mjs** - MongoDB index setup script
4. **DATA_CONSISTENCY_STRATEGY.md** - Strategy for resolving dual-storage issues

---

## 🚀 Quick Start

### 1. Apply PostgreSQL Migrations

**Using Drizzle (Recommended):**
```powershell
# Push all migrations to database
npm run db:push

# Or migrate individually (if using drizzle-kit migrate)
npm run db:migrate
```

**Manual Application:**
```powershell
# Connect to your PostgreSQL database
psql -U postgres -d processsutra

# Apply migrations in order
\i migrations/0006_add_critical_indexes_p0_p1.sql
\i migrations/0007_add_secondary_indexes_p2.sql
```

**For Remote Server:**
```powershell
# Via SSH tunnel
ssh root@62.72.xxx.xxx
psql -U postgres -d processsutra -f /path/to/migrations/0006_add_critical_indexes_p0_p1.sql
psql -U postgres -d processsutra -f /path/to/migrations/0007_add_secondary_indexes_p2.sql
```

### 2. Setup MongoDB Indexes

```powershell
# Run the MongoDB index setup script
node scripts/setup-mongo-indexes.mjs
```

This will create all required indexes on the `formResponses` collection.

---

## 📊 What's Fixed

### Critical Issues (P0-P1)

#### ✅ Performance Improvements
- **Organization domain lookup** - Added index for fast tenant identification (used on EVERY request)
- **User authentication** - Compound index on (organizationId, email)
- **Role-based queries** - Index on (organizationId, role, status)
- **Form lookups** - Compound index on (organizationId, formId)
- **TAT configuration** - Unique constraint + index to prevent duplicates

#### ✅ Data Integrity
- **TAT Config uniqueness** - Ensures each organization has exactly ONE configuration
- **Index coverage** - All frequently-queried columns now have proper indexes

### Secondary Improvements (P2)

#### ✅ Audit & Monitoring
- **Device tracking** - Indexes for user device queries
- **Password history** - Fast audit trail retrieval
- **Login monitoring** - Failed login detection indexes
- **Task analytics** - Indexes for transfer and cancellation tracking

#### ✅ MongoDB Optimization
- **Flow-based queries** - Compound indexes for fast flow data retrieval
- **Date-range queries** - Optimized for analytics dashboards
- **User submissions** - Fast audit trail for user actions
- **System analytics** - Workflow-specific data retrieval

---

## 🔍 Verification

### Check PostgreSQL Indexes

```sql
-- List all new indexes
SELECT 
  schemaname, 
  tablename, 
  indexname, 
  indexdef 
FROM pg_indexes 
WHERE schemaname = 'public' 
  AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

-- Check TAT config unique constraint
SELECT conname, contype, conrelid::regclass 
FROM pg_constraint 
WHERE conname = 'unique_org_tat_config';

-- Check index usage (run after some time)
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan as scans,
  pg_size_pretty(pg_relation_size(indexrelid)) as size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;
```

### Check MongoDB Indexes

```javascript
// In MongoDB shell or via script
use processsutra;

// List all indexes on formResponses
db.formResponses.getIndexes();

// Check index usage stats
db.formResponses.aggregate([
  { $indexStats: {} }
]);
```

---

## ⚠️ Important Notes

### 1. CONCURRENT Index Creation

The migrations use `CREATE INDEX CONCURRENTLY` which:
- ✅ **Does not block** reads or writes during creation
- ✅ **Safe for production** with active traffic
- ⚠️ **Takes longer** than regular index creation
- ⚠️ **Cannot run in transaction** - each statement executes separately

### 2. MongoDB Background Indexes

MongoDB indexes are created with `background: true` which:
- ✅ **Does not block** collection during creation
- ✅ **Safe for production**
- ⚠️ **May take time** on large collections

### 3. Data Consistency Issue

**🚨 CRITICAL:** The dual storage of form responses needs architectural decision.

**Read:** `DATA_CONSISTENCY_STRATEGY.md` for detailed analysis and recommendations.

**Quick Summary:**
- Form responses are stored in BOTH PostgreSQL AND MongoDB
- No transaction guarantees across databases
- Silent failures can cause data inconsistency
- **Action Required:** Choose single source of truth (next sprint)

---

## 📈 Performance Impact

### Before Fixes

**Slow Queries:**
```sql
-- Organization lookup by domain (NO INDEX)
SELECT * FROM organizations WHERE domain = 'example.com';
-- Seq Scan on organizations (cost=0.00..25.88 rows=1)

-- User lookup within org (NO COMPOUND INDEX)
SELECT * FROM users WHERE organization_id = ? AND email = ?;
-- Seq Scan on users (cost=0.00..35.50 rows=1)
```

### After Fixes

**Fast Queries:**
```sql
-- Organization lookup by domain (WITH INDEX)
SELECT * FROM organizations WHERE domain = 'example.com';
-- Index Scan using idx_organizations_domain (cost=0.29..8.30 rows=1)

-- User lookup within org (WITH COMPOUND INDEX)
SELECT * FROM users WHERE organization_id = ? AND email = ?;
-- Index Scan using idx_users_org_email (cost=0.29..8.31 rows=1)
```

**Expected Improvements:**
- 🚀 **10-100x faster** tenant identification
- 🚀 **5-20x faster** user authentication
- 🚀 **3-10x faster** form template lookups
- 🚀 **Reduced database load** from full table scans

---

## 🧪 Testing Recommendations

### 1. Pre-Migration Testing

```sql
-- Take row counts before migration
SELECT 
  'organizations' as table_name, COUNT(*) as count FROM organizations
UNION ALL
  SELECT 'users', COUNT(*) FROM users
UNION ALL
  SELECT 'form_templates', COUNT(*) FROM form_templates
UNION ALL
  SELECT 'tasks', COUNT(*) FROM tasks
UNION ALL
  SELECT 'form_responses', COUNT(*) FROM form_responses;
```

### 2. Post-Migration Testing

```sql
-- Verify all indexes were created
SELECT COUNT(*) FROM pg_indexes 
WHERE schemaname = 'public' 
  AND indexname LIKE 'idx_%';
-- Should show increased count

-- Test query performance
EXPLAIN ANALYZE
SELECT * FROM organizations WHERE domain = 'test.com';
-- Should use index scan

-- Verify unique constraint
INSERT INTO tat_config (organization_id) VALUES ('test-org');
INSERT INTO tat_config (organization_id) VALUES ('test-org');
-- Second insert should fail with unique constraint error
```

### 3. Load Testing

```powershell
# Run load tests after migration
npm run test:load

# Monitor query performance
npm run db:monitor
```

---

## 📊 Monitoring

### PostgreSQL Monitoring Queries

```sql
-- Find slow queries
SELECT 
  query,
  calls,
  total_exec_time,
  mean_exec_time,
  max_exec_time
FROM pg_stat_statements
WHERE mean_exec_time > 100
ORDER BY mean_exec_time DESC
LIMIT 20;

-- Check table sizes
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
  pg_size_pretty(pg_indexes_size(schemaname||'.'||tablename)) AS index_size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Find unused indexes (after running for a week)
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan,
  pg_size_pretty(pg_relation_size(indexrelid)) as size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND idx_scan = 0
  AND indexrelid NOT IN (SELECT conindid FROM pg_constraint)
ORDER BY pg_relation_size(indexrelid) DESC;
```

### MongoDB Monitoring

```javascript
// Check collection stats
db.formResponses.stats();

// Check index usage
db.formResponses.aggregate([
  { $indexStats: {} }
]).forEach(printjson);

// Find slow queries (enable profiling first)
db.setProfilingLevel(2, { slowms: 100 });
db.system.profile.find().sort({ ts: -1 }).limit(10);
```

---

## 🔄 Rollback Plan

If issues arise after migration:

### PostgreSQL Rollback

```sql
-- Drop new indexes
DROP INDEX CONCURRENTLY IF EXISTS idx_organizations_domain;
DROP INDEX CONCURRENTLY IF EXISTS idx_users_org_email;
DROP INDEX CONCURRENTLY IF EXISTS idx_users_org_role_status;
DROP INDEX CONCURRENTLY IF EXISTS idx_form_templates_org_form;
DROP INDEX CONCURRENTLY IF EXISTS idx_user_devices_user_active;
DROP INDEX CONCURRENTLY IF EXISTS idx_password_history_user;
-- ... (drop all created indexes)

-- Remove unique constraint
ALTER TABLE tat_config DROP CONSTRAINT IF EXISTS unique_org_tat_config;
```

### MongoDB Rollback

```javascript
// Drop indexes
db.formResponses.dropIndex('idx_formResponses_form_lookup');
db.formResponses.dropIndex('idx_formResponses_org_date');
// ... (drop all created indexes except default _id)
```

---

## 📚 Next Steps

1. ✅ **Apply migrations** (this guide)
2. 📊 **Monitor performance** (1 week)
3. 📈 **Measure improvements** (compare before/after metrics)
4. 🎯 **Address data consistency** (see DATA_CONSISTENCY_STRATEGY.md)
5. 🗄️ **Plan data archival** (for old records)
6. 🔐 **Implement row-level security** (future enhancement)

---

## 🆘 Troubleshooting

### Issue: Migration fails with "index already exists"

**Solution:**
```sql
-- Check existing indexes
SELECT indexname FROM pg_indexes WHERE indexname = 'idx_organizations_domain';

-- If it exists, the migration will skip it (IF NOT EXISTS clause)
-- If partially applied, check which indexes are missing
```

### Issue: MongoDB connection timeout

**Solution:**
```powershell
# Check MongoDB connection
node scripts/test-mongo-connection.mjs

# Verify environment variables
echo $env:MONGODB_URI
echo $env:MONGODB_DB
```

### Issue: Slow index creation

**Expected:**
- Small tables (<10k rows): seconds
- Medium tables (10k-100k rows): minutes
- Large tables (>100k rows): 10+ minutes

**Progress Check:**
```sql
-- Check index creation progress (PostgreSQL 12+)
SELECT 
  query,
  phase,
  blocks_total,
  blocks_done,
  tuples_total,
  tuples_done
FROM pg_stat_progress_create_index;
```

---

## 📞 Support

- **Database Audit Report:** `DATABASE_AUDIT.md`
- **Data Consistency Strategy:** `DATA_CONSISTENCY_STRATEGY.md`
- **Schema Documentation:** `shared/schema.ts`
- **Storage Layer:** `server/storage.ts`

---

**Last Updated:** October 14, 2025  
**Prepared By:** Database Audit Team  
**Status:** ✅ Ready for Production
