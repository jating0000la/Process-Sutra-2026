# 📊 Database Audit Report
**Date:** October 14, 2025  
**Project:** Process-Sutra-2026  
**Auditor:** System Analysis  
**Status:** ✅ Issues Identified & Fixes Implemented

---

## 🔧 FIXES AVAILABLE

**Critical issues identified in this audit have been resolved!**

📁 **Implementation Files:**
- `migrations/0006_add_critical_indexes_p0_p1.sql` - Critical performance fixes (P0-P1)
- `migrations/0007_add_secondary_indexes_p2.sql` - Additional optimizations (P2)
- `scripts/setup-mongo-indexes.mjs` - MongoDB index setup
- `DATA_CONSISTENCY_STRATEGY.md` - Architectural analysis & recommendations
- `DATABASE_FIXES_README.md` - Complete implementation guide
- `DATABASE_FIXES_SUMMARY.md` - Executive summary of fixes
- `QUICK_REFERENCE.md` - Quick deployment guide

**👉 Start here:** `DATABASE_FIXES_README.md` or `QUICK_REFERENCE.md`

---

## 🎯 Executive Summary

This audit examines the database architecture of Process-Sutra-2026, a multi-tenant workflow management system using a **hybrid database approach** with PostgreSQL for relational data and MongoDB for document storage.

### Key Findings:
- ✅ **Well-structured PostgreSQL schema** with proper multi-tenancy support
- ⚠️ **Hybrid database approach** (PostgreSQL + MongoDB) requires careful management
- ✅ **Good index coverage** for performance optimization (migration 0005)
- 🚨 **CRITICAL: Data consistency issues** between PostgreSQL and MongoDB form responses
- ✅ **Proper foreign key relationships** and cascading deletes in PostgreSQL
- ⚠️ **Missing some critical indexes** for high-traffic queries

---

## 📐 Database Architecture

### 1. Primary Database: **PostgreSQL**
- **Connection:** Configured via `DATABASE_URL` environment variable
- **ORM:** Drizzle ORM with `drizzle-orm/node-postgres`
- **Schema File:** `shared/schema.ts`
- **Migration Tool:** Drizzle Kit
- **Connection Pool:** pg.Pool with connection timeout and retry logic
- **Default Local URL:** `postgresql://postgres:admin@localhost:5432/processsutra`

### 2. Secondary Database: **MongoDB**
- **Purpose:** Form response storage (large JSON documents)
- **Connection:** Configured via `MONGODB_URI` and `MONGODB_DB` environment variables
- **Client:** Native MongoDB driver
- **Use Cases:** 
  - GridFS for file uploads (bucket: 'uploads')
  - Form responses collection (high-volume JSON documents)
- **Integration:** Hybrid storage with PostgreSQL for metadata

---

## 🗂️ Schema Analysis

### Core Tables (PostgreSQL)

#### 1. **organizations**
```typescript
- id (varchar, PK, UUID)
- name (varchar, required)
- domain (varchar, unique, required) ← Email domain for multi-tenancy
- subdomain (varchar, unique)
- logoUrl (varchar)
- primaryColor (varchar, default: '#0066cc')
- isActive (boolean, default: true)
- maxUsers (integer, default: 50)
- planType (varchar, default: 'free')
- createdAt, updatedAt (timestamp)
```
**Issues:**
- ❌ Missing index on `domain` for fast tenant lookup
- ❌ No index on `isActive` for filtering

#### 2. **users**
```typescript
- id (varchar, PK, UUID)
- email (varchar, unique, required)
- firstName, lastName (varchar)
- profileImageUrl (varchar)
- role (varchar, default: 'user')
- organizationId (varchar, FK → organizations.id)
- username (varchar, unique)
- phoneNumber, department, designation, employeeId (varchar)
- dateOfBirth (timestamp)
- address (text)
- emergencyContact, emergencyContactPhone (varchar)
- status (varchar, default: 'active')
- lastLoginAt, passwordChangedAt (timestamp)
- createdAt, updatedAt (timestamp)
```
**Issues:**
- ✅ Good coverage of user details
- ⚠️ Missing compound index on (organizationId, email)
- ⚠️ Missing index on (organizationId, role, status) for common queries

#### 3. **flowRules**
```typescript
- id (varchar, PK, UUID)
- organizationId (varchar, FK, required)
- system (varchar, required) ← Workflow name
- currentTask (varchar, default: '')
- status (varchar, default: '')
- nextTask (varchar, required)
- tat (integer, required) ← Turn-around time
- tatType (varchar, default: 'daytat')
- doer (varchar, required)
- email (varchar, required)
- formId (varchar)
- transferable (boolean, default: false)
- transferToEmails (text)
- createdAt, updatedAt (timestamp)
```
**Issues:**
- ✅ Index added in migration 0005: `idx_flow_rules_lookup` (organizationId, system, currentTask, status)
- ✅ Good composite index for flow progression logic

#### 4. **tasks**
```typescript
- id (varchar, PK, UUID)
- organizationId (varchar, FK, required)
- system (varchar, required)
- flowId (varchar, required) ← Flow instance ID
- orderNumber (varchar)
- taskName (varchar, required)
- plannedTime (timestamp, required)
- actualCompletionTime (timestamp)
- doerEmail (varchar, required)
- status (varchar, default: 'pending')
- formId (varchar)
- createdAt, updatedAt (timestamp)
- flowInitiatedBy, flowInitiatedAt, flowDescription (context)
- flowInitialFormData (jsonb) ← First form data
- originalAssignee, transferredBy, transferredAt, transferReason (transfer tracking)
- cancelledBy, cancelledAt, cancelReason (cancellation tracking)
```
**Issues:**
- ✅ Multiple indexes added in migration 0005:
  - `idx_tasks_org_status` (organizationId, status)
  - `idx_tasks_flow_created` (flowId, createdAt)
  - `idx_tasks_doer_status` (doerEmail, status)
  - `idx_tasks_planned_time` (plannedTime WHERE status = 'pending')
  - `idx_tasks_org_created` (organizationId, createdAt DESC)
- ⚠️ Missing index on `flowId` alone for flow-based queries

#### 5. **formTemplates**
```typescript
- id (varchar, PK, UUID)
- organizationId (varchar, FK, required)
- formId (varchar, required) ← Short identifier (e.g., 'f001')
- title (varchar, required)
- description (text)
- questions (jsonb, required)
- createdBy (varchar, required)
- createdAt, updatedAt (timestamp)
```
**Issues:**
- ✅ Index added: `idx_form_templates_org` (organizationId, createdAt DESC)
- ✅ Index added: `idx_form_templates_form_id` (formId)
- ⚠️ Missing compound index on (organizationId, formId) for lookups

#### 6. **formResponses** (PostgreSQL)
```typescript
- id (varchar, PK, UUID)
- organizationId (varchar, FK, required)
- responseId (varchar, required)
- flowId (varchar, required)
- taskId (varchar, required)
- taskName (varchar, required)
- formId (varchar, required)
- submittedBy (varchar, required)
- formData (jsonb, required)
- timestamp (timestamp)
```
**Issues:**
- ✅ Indexes added in migration 0005:
  - `idx_form_responses_flow` (flowId, taskId)
  - `idx_form_responses_org_form` (organizationId, formId)
  - `idx_form_responses_task` (taskId)
- ⚠️ **CRITICAL**: Data is stored in BOTH PostgreSQL AND MongoDB

#### 7. **userLoginLogs**
```typescript
- id, organizationId, userId (varchar)
- deviceId, deviceName, deviceType (varchar)
- browserName, browserVersion, operatingSystem (varchar)
- ipAddress (varchar)
- location (jsonb)
- userAgent (text)
- loginTime, logoutTime (timestamp)
- sessionDuration (integer, minutes)
- loginStatus (varchar, default: 'success')
- failureReason (varchar)
```
**Issues:**
- ✅ Index added: `idx_login_logs_user` (userId, loginTime DESC)
- ✅ Index added: `idx_login_logs_org` (organizationId, loginTime DESC)
- ✅ Good for security auditing

#### 8. **userDevices**
```typescript
- id, organizationId, userId (varchar)
- deviceId, deviceName, deviceType (varchar)
- browserName, operatingSystem (varchar)
- isTrusted (boolean, default: false)
- firstSeenAt, lastSeenAt (timestamp)
- isActive (boolean, default: true)
```
**Issues:**
- ⚠️ Missing index on (userId, isActive)
- ⚠️ Missing index on (organizationId, userId)

#### 9. **passwordChangeHistory**
```typescript
- id, organizationId, userId (varchar)
- changedAt (timestamp)
- changedBy (varchar)
- reason (varchar)
- ipAddress, deviceId (varchar)
```
**Issues:**
- ⚠️ Missing index on (userId, changedAt DESC)

#### 10. **tatConfig**
```typescript
- id, organizationId (varchar)
- officeStartHour, officeEndHour (integer)
- timezone (varchar, default: 'Asia/Kolkata')
- skipWeekends (boolean, default: true)
- createdAt, updatedAt (timestamp)
```
**Issues:**
- ⚠️ Missing unique constraint on `organizationId` (should be 1 config per org)
- ⚠️ Missing index on `organizationId`

#### 11. **webhooks** (PostgreSQL)
```typescript
- id, organizationId (varchar)
- event (varchar, required)
- targetUrl (text, required)
- secret (varchar, required)
- description (text)
- isActive (boolean, default: true)
- retryCount (integer, default: 0)
- createdAt, updatedAt (timestamp)
```
**Issues:**
- ✅ Index added: `idx_webhooks_org_event` (organizationId, event WHERE isActive = true)
- ✅ Conditional index for active webhooks only

#### 12. **sessions**
```typescript
- sid (varchar, PK)
- sess (jsonb, required)
- expire (timestamp, required)
```
**Issues:**
- ✅ Index on `expire` for cleanup queries
- ✅ Standard express-session structure

---

### MongoDB Collections

#### 1. **formResponses** Collection
```typescript
{
  _id: ObjectId,
  orgId: string,
  flowId: string,
  taskId: string,
  taskName: string,
  formId: string,
  submittedBy: string,
  orderNumber?: string | number,
  system?: string,
  flowDescription?: string,
  flowInitiatedBy?: string,
  flowInitiatedAt?: Date,
  formData: Record<string, any>, // Large nested JSON
  createdAt: Date
}
```
**Indexes:**
- ✅ Compound index: `(orgId, flowId, taskId, createdAt DESC)`

**Issues:**
- ⚠️ **DATA DUPLICATION**: Same data stored in PostgreSQL `formResponses` table
- ⚠️ Missing index on `(orgId, formId)` for form-specific queries
- ⚠️ Missing index on `(orgId, createdAt)` for date-based queries

#### 2. **uploads** GridFS Bucket
```typescript
Purpose: File storage for form uploads
Bucket Name: 'uploads'
```
**Issues:**
- ✅ Proper GridFS usage for file storage
- ⚠️ No metadata tracking in PostgreSQL (orphaned file risk)

---

## 🔗 Relationships & Foreign Keys

### Good Practices:
✅ All foreign keys properly defined with references  
✅ Cascade deletes configured: `ON DELETE CASCADE` for dependent data  
✅ `ON DELETE SET NULL` for optional references (e.g., formSubmissions.submittedBy)  

### Relationship Map:
```
organizations (1)
  ├─── (many) users
  ├─── (many) flowRules
  ├─── (many) tasks
  ├─── (many) formTemplates
  ├─── (many) formResponses
  ├─── (many) userLoginLogs
  ├─── (many) userDevices
  ├─── (many) passwordChangeHistory
  ├─── (1) tatConfig
  └─── (many) webhooks

users (1)
  ├─── (many) formTemplates (createdBy)
  ├─── (many) formResponses (submittedBy)
  ├─── (many) loginLogs
  ├─── (many) devices
  └─── (many) passwordHistory

tasks (1)
  └─── (many) formResponses

formTemplates (1)
  └─── (many) formResponses (via formId)
```

---

## ⚡ Performance Analysis

### Existing Indexes (Migration 0005)

#### Good Indexes:
1. ✅ `idx_tasks_org_status` - Fast filtering by organization and status
2. ✅ `idx_tasks_flow_created` - Efficient flow-based task listing
3. ✅ `idx_tasks_doer_status` - Quick user task queries
4. ✅ `idx_tasks_planned_time` (partial) - Optimized for pending tasks
5. ✅ `idx_flow_rules_lookup` - Fast flow rule matching
6. ✅ `idx_notifications_user_unread` - Efficient unread notification queries
7. ✅ `idx_webhooks_org_event` (conditional) - Active webhook lookups

#### Missing Critical Indexes:
1. ❌ `organizations(domain)` - For tenant identification
2. ❌ `users(organizationId, email)` - User lookup within org
3. ❌ `users(organizationId, role, status)` - Role-based filtering
4. ❌ `formTemplates(organizationId, formId)` - Form lookups
5. ❌ `userDevices(userId, isActive)` - Active device queries
6. ❌ `passwordChangeHistory(userId, changedAt DESC)` - Audit trail queries
7. ❌ `tatConfig(organizationId)` UNIQUE - Prevent duplicate configs
8. ❌ MongoDB: `formResponses(orgId, formId)` - Form data queries
9. ❌ MongoDB: `formResponses(orgId, createdAt)` - Date range queries

---

## 🔒 Security Analysis

### Strengths:
✅ **Multi-tenancy isolation** via `organizationId` on all tables  
✅ **Password change tracking** with reason and audit trail  
✅ **Device fingerprinting** for security monitoring  
✅ **Login logs** with IP address, user agent, and location  
✅ **Webhook secrets** for secure integrations  

### Concerns:
⚠️ **No row-level security (RLS)** policies in PostgreSQL  
⚠️ **MongoDB lacks organization-level access control** - relies on application logic  
⚠️ **No encryption at rest** specified in schema (should be configured at database level)  
⚠️ **Notifications table** has no retention policy (can grow indefinitely)  
⚠️ **Session storage in PostgreSQL** - consider Redis for better performance  
⚠️ **No database backup strategy** documented  

---

## 🔄 Data Consistency Issues

### Critical: Dual Storage of Form Responses

**Problem:**  
Form responses are stored in **BOTH** PostgreSQL and MongoDB:

```typescript
// In server/storage.ts:633
async createFormResponse(response: InsertFormResponse): Promise<FormResponse> {
  // 1. Insert into PostgreSQL
  const [newResponse] = await db.insert(formResponses).values(response).returning();

  // 2. Also insert into MongoDB (best-effort)
  try {
    const col = await getFormResponsesCollection();
    await col.insertOne({...});
  } catch (e) {
    console.error('Mongo insert failed:', e);
    // ❌ PostgreSQL has data, MongoDB doesn't
  }
}
```

**Risks:**
1. ❌ **Partial failures** can lead to data in PostgreSQL but not MongoDB
2. ❌ **No transaction** across databases - no atomicity
3. ❌ **Queries use MongoDB** but writes go to both
4. ❌ **No sync mechanism** if MongoDB insert fails

**Recommendation:**
- Choose ONE source of truth (preferably MongoDB for large JSON)
- Use PostgreSQL only for metadata and relationships
- Or implement proper event-driven sync with retries

---

## 📊 Query Pattern Analysis

### Most Common Query Patterns:

1. **Task Queries**
   ```typescript
   // Organization + status filtering
   SELECT * FROM tasks 
   WHERE organizationId = ? AND status = ?
   ORDER BY createdAt DESC;
   ```
   ✅ Covered by `idx_tasks_org_status`

2. **Flow Rule Matching**
   ```typescript
   // Finding next task in workflow
   SELECT * FROM flow_rules 
   WHERE organizationId = ? 
     AND system = ? 
     AND currentTask = ? 
     AND status = ?;
   ```
   ✅ Covered by `idx_flow_rules_lookup`

3. **Form Response Retrieval**
   ```typescript
   // MongoDB query
   db.formResponses.find({
     orgId: "...",
     formId: "...",
     createdAt: { $gte: startDate, $lte: endDate }
   }).sort({ createdAt: -1 });
   ```
   ❌ Missing index on `(orgId, formId, createdAt)`

4. **User Lookup**
   ```typescript
   SELECT * FROM users 
   WHERE organizationId = ? AND email = ?;
   ```
   ⚠️ No compound index - uses separate email index

5. **Unread Notifications**
   ```typescript
   SELECT * FROM notifications 
   WHERE userId = ? AND isRead = false 
   ORDER BY createdAt DESC;
   ```
   ✅ Covered by `idx_notifications_user_unread`

---

## 🚨 Critical Issues

### 1. Dual Database Consistency (CRITICAL)
**Impact:** High - Data loss risk  
**Priority:** P0  
**Solution:** Implement event-driven sync or choose single source of truth

### 2. Missing Organization Domain Index (HIGH)
**Impact:** High - Slow tenant lookups on every request  
**Priority:** P1  
**Solution:** `CREATE INDEX idx_organizations_domain ON organizations(domain);`

### 3. TAT Config Duplication Risk (MEDIUM)
**Impact:** Medium - Logic errors  
**Priority:** P1  
**Solution:** `ADD CONSTRAINT UNIQUE (organizationId) ON tatConfig;`

### 4. MongoDB Index Coverage (MEDIUM)
**Impact:** Medium - Slow queries as data grows  
**Priority:** P2  
**Solution:** Add indexes on `(orgId, formId)` and `(orgId, createdAt)`

### 5. No File Metadata Tracking (LOW)
**Impact:** Low - Orphaned files in GridFS  
**Priority:** P3  
**Solution:** Create `file_metadata` table to track GridFS uploads

---

## 📈 Scalability Considerations

### Current Bottlenecks:
1. **Large JSONB columns** in `tasks.flowInitialFormData` and `formTemplates.questions`
2. **MongoDB formResponses** collection will grow indefinitely
3. **No partitioning** strategy for time-series data (logs, tasks)
4. **Session table** needs regular cleanup

### Recommendations:
1. **Partition `tasks` table** by `createdAt` (monthly or quarterly)
2. **Implement TTL** on MongoDB formResponses collection
3. **Archive old login logs** after 90 days
4. **Use Redis** for session storage instead of PostgreSQL
5. **Implement read replicas** for reporting queries

---

## 🎯 Recommendations

### Immediate Actions (P0-P1):
1. **Resolve dual storage** - Choose MongoDB as primary for form responses
2. **Add domain index** - `organizations(domain)`
3. **Add TAT config constraint** - `UNIQUE(organizationId)`
4. **Add compound user index** - `users(organizationId, email)`

### Short-term Improvements (P2):
1. Add MongoDB indexes for `(orgId, formId)` and `(orgId, createdAt)`
2. Add index on `userDevices(userId, isActive)`
3. Add index on `passwordChangeHistory(userId, changedAt DESC)`
4. Implement session cleanup cron job
5. Add retention policy for old notifications

### Long-term Enhancements (P3):
1. Implement table partitioning for time-series data
2. Create file metadata tracking system
3. Implement data archival strategy
4. Add row-level security policies
5. Consider read replicas for analytics

---

## 📝 Migration Scripts Needed

### 1. Add Missing Indexes
```sql
-- PostgreSQL
CREATE INDEX CONCURRENTLY idx_organizations_domain ON organizations(domain);
CREATE INDEX CONCURRENTLY idx_users_org_email ON users(organizationId, email);
CREATE INDEX CONCURRENTLY idx_users_org_role_status ON users(organizationId, role, status);
CREATE INDEX CONCURRENTLY idx_form_templates_org_form ON formTemplates(organizationId, formId);
CREATE INDEX CONCURRENTLY idx_user_devices_user_active ON userDevices(userId, isActive);
CREATE INDEX CONCURRENTLY idx_password_history_user ON passwordChangeHistory(userId, changedAt DESC);

-- Add unique constraint
ALTER TABLE tatConfig ADD CONSTRAINT unique_org_tat_config UNIQUE (organizationId);
```

### 2. Add MongoDB Indexes
```javascript
// MongoDB
db.formResponses.createIndex({ orgId: 1, formId: 1, createdAt: -1 });
db.formResponses.createIndex({ orgId: 1, createdAt: -1 });
```

---

## 📊 Database Statistics Needed

To complete the audit, collect these metrics:

```sql
-- Table sizes
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Row counts
SELECT 'organizations' as table_name, COUNT(*) FROM organizations
UNION ALL SELECT 'users', COUNT(*) FROM users
UNION ALL SELECT 'tasks', COUNT(*) FROM tasks
UNION ALL SELECT 'formResponses', COUNT(*) FROM formResponses;

-- Index usage stats
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;
```

---

## ✅ Conclusion

The Process-Sutra-2026 database architecture is **well-designed** with proper multi-tenancy support and recent performance optimizations (migration 0005). However, the **dual storage approach** for form responses presents a **critical consistency risk** that needs immediate attention.

**Overall Grade: B+ (Good with areas for improvement)**

**Strengths:**
- Strong multi-tenant isolation
- Comprehensive audit logging
- Recent performance index additions
- Proper relationship modeling

**Areas for Improvement:**
- Resolve PostgreSQL/MongoDB consistency
- Add missing critical indexes
- Implement data retention policies
- Consider scalability patterns

---

**Next Steps:**
1. Review this audit with the development team
2. Prioritize P0-P1 recommendations
3. Create migration scripts for missing indexes
4. Develop data consistency strategy
5. Implement monitoring for database performance
