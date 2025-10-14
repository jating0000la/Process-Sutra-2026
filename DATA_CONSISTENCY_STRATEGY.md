# 🔄 Data Consistency Strategy
**Date:** October 14, 2025  
**Project:** Process-Sutra-2026  
**Priority:** P0 - CRITICAL

---

## 🚨 Problem Statement

The application currently stores form responses in **TWO databases simultaneously**:

1. **PostgreSQL** (`formResponses` table) - Relational data with foreign keys
2. **MongoDB** (`formResponses` collection) - Document storage with large JSON

This dual-storage approach creates **critical data consistency risks**:

### Current Implementation (server/storage.ts:633)
```typescript
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

### Critical Issues:
- ❌ **No atomicity** - Can succeed in PostgreSQL but fail in MongoDB
- ❌ **No transaction** across databases - inconsistent state possible
- ❌ **Silent failures** - MongoDB errors are only logged, not handled
- ❌ **Query confusion** - Queries use MongoDB, but both DBs have data
- ❌ **No sync mechanism** - Failed inserts stay inconsistent forever
- ❌ **Increased complexity** - Maintaining two storage systems

---

## 📊 Impact Analysis

### Data Inconsistency Scenarios:

| Scenario | PostgreSQL | MongoDB | Result |
|----------|-----------|---------|--------|
| Normal operation | ✅ Success | ✅ Success | ✅ Consistent |
| MongoDB connection timeout | ✅ Success | ❌ Failed | 💥 **INCONSISTENT** |
| MongoDB disk full | ✅ Success | ❌ Failed | 💥 **INCONSISTENT** |
| MongoDB network partition | ✅ Success | ❌ Failed | 💥 **INCONSISTENT** |
| PostgreSQL success + MongoDB write concern timeout | ✅ Success | ❓ Unknown | 💥 **INCONSISTENT** |

### Business Impact:
- 📉 **Missing data** in MongoDB (queries return incomplete results)
- 🔍 **Audit trail gaps** (some responses not recorded in MongoDB)
- 📊 **Incorrect analytics** (MongoDB counts don't match PostgreSQL)
- 🐛 **Debugging nightmares** (which database is the source of truth?)

---

## ✅ Recommended Solutions

### Option 1: MongoDB as Single Source of Truth (RECOMMENDED) 

**Best for:** Large JSON documents, high write volume, flexible schema

#### Implementation:
1. **Keep only MongoDB for form responses**
2. Store minimal metadata in PostgreSQL for relationships
3. Create a new `formResponseMetadata` table in PostgreSQL

```sql
-- New table for metadata only
CREATE TABLE form_response_metadata (
  id VARCHAR(255) PRIMARY KEY,
  organization_id VARCHAR(255) NOT NULL REFERENCES organizations(id),
  flow_id VARCHAR(255) NOT NULL,
  task_id VARCHAR(255) NOT NULL,
  form_id VARCHAR(255) NOT NULL,
  submitted_by VARCHAR(255) NOT NULL,
  mongodb_id VARCHAR(255) NOT NULL, -- Reference to MongoDB _id
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Indexes for relationships
  INDEX idx_metadata_task (task_id),
  INDEX idx_metadata_flow (flow_id),
  INDEX idx_metadata_org_form (organization_id, form_id)
);
```

#### Code Changes:
```typescript
async createFormResponse(response: InsertFormResponse): Promise<FormResponse> {
  // 1. Insert into MongoDB (primary storage)
  const col = await getFormResponsesCollection();
  const result = await col.insertOne({
    orgId: response.organizationId,
    flowId: response.flowId,
    taskId: response.taskId,
    taskName: response.taskName,
    formId: response.formId,
    submittedBy: response.submittedBy,
    formData: response.formData,
    createdAt: new Date()
  });

  // 2. Store metadata in PostgreSQL for relationships
  await db.insert(formResponseMetadata).values({
    id: response.id,
    organizationId: response.organizationId,
    flowId: response.flowId,
    taskId: response.taskId,
    formId: response.formId,
    submittedBy: response.submittedBy,
    mongodbId: result.insertedId.toString()
  });

  // 3. Return consistent format
  return {
    id: response.id,
    mongoId: result.insertedId.toString(),
    ...response
  };
}
```

**Pros:**
- ✅ Single source of truth
- ✅ Better for large JSON documents
- ✅ Simpler consistency model
- ✅ MongoDB query capabilities (aggregation, text search)
- ✅ Horizontal scaling with MongoDB

**Cons:**
- ⚠️ Migration effort required
- ⚠️ Need to update queries to use MongoDB

---

### Option 2: PostgreSQL as Single Source of Truth

**Best for:** Strong ACID requirements, complex relational queries

#### Implementation:
1. **Keep only PostgreSQL for form responses**
2. Remove MongoDB form response storage
3. Optimize JSONB queries with indexes and expressions

```sql
-- Add GIN index for JSONB field searches
CREATE INDEX idx_form_responses_jsonb_data 
ON form_responses USING GIN (form_data jsonb_path_ops);

-- Add expression indexes for common queries
CREATE INDEX idx_form_responses_specific_field 
ON form_responses ((form_data->>'specificField'));
```

#### Code Changes:
```typescript
async createFormResponse(response: InsertFormResponse): Promise<FormResponse> {
  // Single insert into PostgreSQL
  const [newResponse] = await db
    .insert(formResponses)
    .values(response)
    .returning();

  return newResponse;
}

// Query with JSONB operators
async queryFormData(orgId: string, fieldName: string, value: any) {
  return await db
    .select()
    .from(formResponses)
    .where(
      and(
        eq(formResponses.organizationId, orgId),
        sql`${formResponses.formData}->>${fieldName} = ${value}`
      )
    );
}
```

**Pros:**
- ✅ ACID transactions
- ✅ Referential integrity with foreign keys
- ✅ Simpler stack (one database)
- ✅ PostgreSQL JSONB is powerful and indexed

**Cons:**
- ⚠️ JSONB queries slower than native MongoDB
- ⚠️ Vertical scaling limitations
- ⚠️ Less flexible schema evolution

---

### Option 3: Event-Driven Eventual Consistency (COMPLEX)

**Best for:** High-availability requirements, eventual consistency acceptable

#### Implementation:
1. Write to PostgreSQL (primary)
2. Publish event to message queue (Redis, RabbitMQ, Kafka)
3. Background worker syncs to MongoDB
4. Retry mechanism for failed syncs

```typescript
async createFormResponse(response: InsertFormResponse): Promise<FormResponse> {
  // 1. Insert into PostgreSQL (primary)
  const [newResponse] = await db
    .insert(formResponses)
    .values(response)
    .returning();

  // 2. Publish sync event
  await publishEvent('form-response.created', {
    id: newResponse.id,
    data: newResponse
  });

  return newResponse;
}

// Background worker
async function syncWorker() {
  const events = await consumeEvents('form-response.created');
  
  for (const event of events) {
    try {
      const col = await getFormResponsesCollection();
      await col.insertOne(transformToMongo(event.data));
      await acknowledgeEvent(event);
    } catch (error) {
      // Retry logic with exponential backoff
      await scheduleRetry(event, error);
    }
  }
}
```

**Pros:**
- ✅ Non-blocking writes
- ✅ Retry mechanism
- ✅ Can sync to multiple destinations
- ✅ Audit trail of sync events

**Cons:**
- ⚠️ Complex infrastructure
- ⚠️ Eventual consistency (short delay)
- ⚠️ Need message queue
- ⚠️ More operational overhead

---

## 🎯 Recommended Action Plan

### Phase 1: Immediate Fix (This Week)
1. ✅ **Add monitoring** for MongoDB insertion failures
2. ✅ **Add alerting** when PostgreSQL and MongoDB counts diverge
3. ✅ **Document the issue** in team knowledge base

```typescript
// Add monitoring
async createFormResponse(response: InsertFormResponse): Promise<FormResponse> {
  const [newResponse] = await db.insert(formResponses).values(response).returning();

  try {
    const col = await getFormResponsesCollection();
    await col.insertOne({...});
    
    // ✅ Success metric
    metrics.increment('formResponse.sync.success');
  } catch (e) {
    // ❌ Alert on failure
    logger.error('MongoDB sync failed', { error: e, responseId: newResponse.id });
    metrics.increment('formResponse.sync.failure');
    alerts.trigger('mongodb-sync-failure', { responseId: newResponse.id });
    
    // Store failed sync for retry
    await db.insert(syncFailures).values({
      entity: 'formResponse',
      entityId: newResponse.id,
      error: e.message,
      retryCount: 0
    });
  }
}
```

### Phase 2: Choose Strategy (Next Sprint)
1. 📊 **Analyze query patterns** - Which DB is queried more?
2. 📏 **Measure data sizes** - How large are form responses?
3. 🔍 **Review use cases** - Need for complex queries vs. simple retrieval?
4. 👥 **Team decision** - Choose Option 1, 2, or 3 based on analysis

### Phase 3: Migration (Following Sprint)
1. 🗺️ **Create migration plan**
2. 🧪 **Test in staging** with production-like data
3. 📊 **Verify data integrity** with checksums
4. 🚀 **Deploy with rollback plan**
5. 🔍 **Monitor closely** for issues

---

## 🧪 Testing Strategy

### Before Migration:
```sql
-- Count check
SELECT COUNT(*) as pg_count FROM form_responses;
-- Compare with MongoDB: db.formResponses.countDocuments({})

-- Sample comparison
SELECT id, flow_id, task_id, form_id 
FROM form_responses 
ORDER BY timestamp DESC 
LIMIT 100;
-- Compare with MongoDB equivalents
```

### After Migration:
```sql
-- Verify no data loss
-- Compare row counts before and after

-- Verify referential integrity
SELECT COUNT(*) FROM form_responses fr
LEFT JOIN tasks t ON fr.task_id = t.id
WHERE t.id IS NULL;
-- Should be 0

-- Performance benchmark
EXPLAIN ANALYZE
SELECT * FROM form_responses
WHERE organization_id = 'test-org'
AND form_id = 'f001'
ORDER BY timestamp DESC
LIMIT 50;
```

---

## 📋 Rollback Plan

If migration fails:

1. **Stop application** to prevent new writes
2. **Restore from backup** (both PostgreSQL and MongoDB)
3. **Verify data integrity** with checksums
4. **Restart application** with old code
5. **Post-mortem** to identify failure cause

---

## 🎓 Lessons Learned

### Why This Happened:
- 📚 **Different use cases** - PostgreSQL for relations, MongoDB for documents
- 🏃 **Fast development** - Dual storage seemed easier initially
- 🧠 **Distributed transactions** - Underestimated complexity

### Best Practices Going Forward:
- ✅ **Single source of truth** for each entity type
- ✅ **Design for consistency** from the start
- ✅ **Use proper patterns** (CQRS, Event Sourcing) if multi-storage is needed
- ✅ **Document architecture decisions** (ADRs)

---

## 📞 Support & Questions

If you have questions about this strategy:
1. Review the Database Audit Report (DATABASE_AUDIT.md)
2. Check the implementation in `server/storage.ts`
3. Review MongoDB client code in `server/mongo/client.ts`
4. Discuss in team architecture meeting

---

## 📚 References

- [Two-Phase Commit Problems](https://martinfowler.com/articles/patterns-of-distributed-systems/two-phase-commit.html)
- [Saga Pattern for Distributed Transactions](https://microservices.io/patterns/data/saga.html)
- [PostgreSQL JSONB Performance](https://www.postgresql.org/docs/current/datatype-json.html)
- [MongoDB Transactions](https://docs.mongodb.com/manual/core/transactions/)

---

**Decision Deadline:** End of next sprint  
**Decision Makers:** Tech Lead + Backend Team  
**Risk Level:** 🔴 HIGH - Affects data integrity
