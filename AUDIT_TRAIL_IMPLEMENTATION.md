# Audit Trail & Rate Limiting Implementation

## Overview
This document describes the audit trail and rate limiting features implemented for the Super Admin system following the security audit recommendations.

## Implementation Date
December 2024

## Features Implemented

### 1. Audit Trail System

#### Database Schema
Created `audit_logs` table with the following fields:
- **id**: UUID primary key
- **actor_id**: User ID who performed the action (foreign key to users)
- **actor_email**: Email of the user who performed the action
- **action**: Type of action performed (enum values below)
- **target_type**: Type of entity affected ('organization', 'user', 'system')
- **target_id**: ID of the affected entity
- **target_email**: Email/identifier of the affected entity
- **old_value**: Previous value before change (JSON string)
- **new_value**: New value after change (JSON string)
- **ip_address**: IP address of the request
- **user_agent**: Browser user agent string
- **metadata**: Additional context (JSONB)
- **created_at**: Timestamp of the action
- **organization_id**: Related organization (nullable)

#### Indexes
Performance indexes created for efficient querying:
- `idx_audit_logs_actor_id` - Query by who performed actions
- `idx_audit_logs_action` - Query by action type
- `idx_audit_logs_created_at` - Query by time (DESC order)
- `idx_audit_logs_target_type` - Query by entity type
- `idx_audit_logs_target_id` - Query by specific entity

#### Migration File
- **File**: `migrations/0009_add_audit_logs.sql`
- **Status**: ✅ Executed successfully
- **Command**: `psql -h localhost -U postgres -d processsutra -f migrations/0009_add_audit_logs.sql`

### 2. Storage Layer Implementation

#### TypeScript Schema (shared/schema.ts)
```typescript
export const auditLogs = pgTable("audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  actorId: varchar("actor_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  actorEmail: varchar("actor_email").notNull(),
  action: varchar("action", { length: 100 }).notNull(),
  targetType: varchar("target_type", { length: 50 }),
  targetId: varchar("target_id"),
  targetEmail: varchar("target_email"),
  oldValue: text("old_value"),
  newValue: text("new_value"),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  metadata: jsonb("metadata").$type<Record<string, any>>(),
  createdAt: timestamp("created_at").defaultNow(),
  organizationId: varchar("organization_id").references(() => organizations.id, { onDelete: "set null" }),
});

export const insertAuditLogSchema = z.object({
  actorId: z.string(),
  actorEmail: z.string().email(),
  action: z.string(),
  targetType: z.enum(["organization", "user", "system"]).optional(),
  targetId: z.string().optional(),
  targetEmail: z.string().optional(),
  oldValue: z.string().optional(),
  newValue: z.string().optional(),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
  metadata: z.record(z.any()).optional(),
  organizationId: z.string().optional(),
});

export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type AuditLog = typeof auditLogs.$inferSelect;
```

#### Storage Methods (server/storage.ts)
```typescript
// IStorage Interface
createAuditLog(log: InsertAuditLog): Promise<AuditLog>;
getAuditLogs(filters?: {
  actorId?: string;
  action?: string;
  targetType?: string;
  targetId?: string;
  organizationId?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}): Promise<AuditLog[]>;

// DatabaseStorage Implementation
async createAuditLog(log: InsertAuditLog): Promise<AuditLog> {
  const [record] = await db.insert(auditLogs).values(log).returning();
  return record;
}

async getAuditLogs(filters?: {...}): Promise<AuditLog[]> {
  // Implements filtering by actor, action, target, dates, etc.
  // Default limit: 100 records
  // Ordered by created_at DESC (most recent first)
}
```

### 3. Audit Logging Integration

#### Actions Tracked
All super admin mutation operations now create audit logs:

1. **TOGGLE_ORG_STATUS**
   - Endpoint: `PUT /api/super-admin/organizations/:id/status`
   - Logs: Old and new `isActive` status
   - Context: Organization ID, domain

2. **UPDATE_ORGANIZATION**
   - Endpoint: `PUT /api/super-admin/organizations/:id`
   - Logs: Full old organization object and update fields
   - Context: Organization ID, domain

3. **CHANGE_USER_STATUS**
   - Endpoint: `PUT /api/super-admin/users/:userId/status`
   - Logs: Old and new user status ('active', 'inactive', 'suspended')
   - Context: User ID, email, organization

4. **PROMOTE_SUPER_ADMIN**
   - Endpoint: `PUT /api/super-admin/users/:userId/promote-super-admin`
   - Logs: Old and new `isSuperAdmin` boolean value
   - Context: User ID, email, organization

#### Audit Log Data Captured
For each action, the system records:
- **Who**: Actor ID and email (the super admin performing the action)
- **What**: Action type and affected entity
- **When**: Timestamp (automatic)
- **Where**: IP address and user agent
- **Details**: Old value → New value comparison
- **Context**: Related organization (if applicable)

### 4. Rate Limiting

#### Configuration
```typescript
const superAdminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,   // 15 minute window
  max: 100,                   // 100 requests per 15 minutes
  message: "Too many super admin requests. Please wait before trying again.",
  standardHeaders: true,      // Return rate limit info in headers
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  skipFailedRequests: false,
});
```

#### Protected Endpoints
Rate limiting applied to all 8 system-level super admin endpoints:
1. `GET /api/super-admin/organizations`
2. `GET /api/super-admin/system-statistics`
3. `GET /api/super-admin/all-users`
4. `PUT /api/super-admin/organizations/:id/status`
5. `PUT /api/super-admin/organizations/:id`
6. `PUT /api/super-admin/users/:userId/status`
7. `PUT /api/super-admin/users/:userId/promote-super-admin`
8. `GET /api/super-admin/global-activity`

#### Rate Limit Headers
The system returns standard rate limit headers:
- `RateLimit-Limit`: Maximum requests allowed in window
- `RateLimit-Remaining`: Requests remaining in current window
- `RateLimit-Reset`: Timestamp when window resets

### 5. Example Audit Log Entry

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "actorId": "user_abc123",
  "actorEmail": "jkgkumar3@gmail.com",
  "action": "TOGGLE_ORG_STATUS",
  "targetType": "organization",
  "targetId": "org_xyz789",
  "targetEmail": "acme.com",
  "oldValue": "{\"isActive\":true}",
  "newValue": "{\"isActive\":false}",
  "ipAddress": "192.168.1.100",
  "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  "metadata": null,
  "createdAt": "2024-12-20T10:30:45.123Z",
  "organizationId": "org_xyz789"
}
```

## Security Benefits

### 1. Accountability
- Every super admin action is permanently recorded
- Clear audit trail for compliance and investigations
- Attribution to specific users with timestamps

### 2. Traceability
- Before/after values show exactly what changed
- IP address and user agent provide additional context
- Organization linkage maintains multi-tenant boundaries

### 3. Abuse Prevention
- Rate limiting prevents automated abuse
- 100 requests per 15 minutes is reasonable for human operators
- Failed and successful requests both count toward limit

### 4. Monitoring & Alerting
- Audit logs enable real-time monitoring
- Unusual patterns can trigger alerts
- Historical analysis for security reviews

## Query Examples

### Get all actions by a specific super admin
```sql
SELECT * FROM audit_logs 
WHERE actor_id = 'user_abc123' 
ORDER BY created_at DESC 
LIMIT 100;
```

### Get all organization status changes
```sql
SELECT * FROM audit_logs 
WHERE action = 'TOGGLE_ORG_STATUS' 
ORDER BY created_at DESC;
```

### Get audit log for specific organization
```sql
SELECT * FROM audit_logs 
WHERE target_type = 'organization' 
AND target_id = 'org_xyz789' 
ORDER BY created_at DESC;
```

### Get recent super admin promotions
```sql
SELECT * FROM audit_logs 
WHERE action = 'PROMOTE_SUPER_ADMIN' 
AND created_at > NOW() - INTERVAL '30 days' 
ORDER BY created_at DESC;
```

### Get actions within date range
```sql
SELECT * FROM audit_logs 
WHERE created_at BETWEEN '2024-12-01' AND '2024-12-31' 
ORDER BY created_at DESC;
```

## Storage Layer Usage

### Creating an Audit Log
```typescript
await storage.createAuditLog({
  actorId: req.user.id,
  actorEmail: req.user.email,
  action: "TOGGLE_ORG_STATUS",
  targetType: "organization",
  targetId: organizationId,
  targetEmail: organization.domain,
  oldValue: JSON.stringify({ isActive: oldOrg?.isActive }),
  newValue: JSON.stringify({ isActive }),
  ipAddress: req.ip || req.connection.remoteAddress,
  userAgent: req.headers["user-agent"],
  organizationId: organizationId,
});
```

### Querying Audit Logs
```typescript
// Get all logs for a specific actor
const logs = await storage.getAuditLogs({
  actorId: "user_abc123",
  limit: 50
});

// Get logs for a specific action type
const logs = await storage.getAuditLogs({
  action: "PROMOTE_SUPER_ADMIN",
  limit: 100
});

// Get logs within date range
const logs = await storage.getAuditLogs({
  startDate: new Date('2024-12-01'),
  endDate: new Date('2024-12-31'),
  limit: 200
});

// Get logs for specific organization
const logs = await storage.getAuditLogs({
  organizationId: "org_xyz789",
  limit: 100
});
```

## Next Steps

### Planned Enhancements
1. **Audit Log Viewer UI** (TODO #5)
   - Add "Audit Log" tab to system-super-admin.tsx
   - Filterable table with columns: Actor, Action, Target, Timestamp, Details
   - Export to CSV functionality
   - Real-time updates using SSE or polling

2. **Alerting System**
   - Email notifications for critical actions
   - Webhook integration for security monitoring tools
   - Anomaly detection (e.g., multiple rapid status changes)

3. **Log Retention Policy**
   - Archive old logs (older than 1 year) to separate storage
   - Implement automatic cleanup or archival process
   - Compliance with data retention regulations

4. **Advanced Filtering**
   - Full-text search in old_value/new_value
   - Complex multi-field filtering in UI
   - Saved filter presets

## Testing Recommendations

### Manual Testing
1. Perform each super admin action and verify audit log creation
2. Test rate limiting by making 101 requests within 15 minutes
3. Verify IP address and user agent capture
4. Check old/new value accuracy

### Automated Testing
```typescript
// Test audit log creation
test('should create audit log on org status change', async () => {
  const before = await storage.getAuditLogs({ limit: 1000 });
  await request(app)
    .put('/api/super-admin/organizations/test-org/status')
    .send({ isActive: false })
    .expect(200);
  const after = await storage.getAuditLogs({ limit: 1000 });
  expect(after.length).toBe(before.length + 1);
  expect(after[0].action).toBe('TOGGLE_ORG_STATUS');
});

// Test rate limiting
test('should enforce rate limit', async () => {
  // Make 100 requests - should succeed
  for (let i = 0; i < 100; i++) {
    await request(app)
      .get('/api/super-admin/organizations')
      .expect(200);
  }
  // 101st request - should fail
  await request(app)
    .get('/api/super-admin/organizations')
    .expect(429);
});
```

## Compliance & Regulations

This audit trail implementation helps meet requirements for:
- **SOC 2 Type II**: Audit logging and monitoring
- **GDPR Article 30**: Records of processing activities
- **HIPAA**: Access logging and audit controls
- **ISO 27001**: A.12.4.1 Event logging
- **PCI DSS**: Requirement 10 - Track and monitor all access

## Performance Considerations

### Index Usage
- All indexes created for optimal query performance
- `created_at DESC` index for chronological queries
- Composite index opportunities if query patterns emerge

### Storage Growth
- Estimated 50-100 bytes per audit log entry
- 1000 actions/day = ~100KB/day = ~36MB/year
- Archive strategy recommended after 1 year

### Query Optimization
- Default limit of 100 records prevents large result sets
- Pagination recommended for UI implementation
- Consider materialized views for reporting dashboards

## Monitoring & Maintenance

### Database Monitoring
```sql
-- Check audit log table size
SELECT pg_size_pretty(pg_total_relation_size('audit_logs'));

-- Check recent activity volume
SELECT DATE(created_at) as date, COUNT(*) as actions
FROM audit_logs
GROUP BY DATE(created_at)
ORDER BY date DESC
LIMIT 30;

-- Most active super admins
SELECT actor_email, COUNT(*) as action_count
FROM audit_logs
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY actor_email
ORDER BY action_count DESC;
```

### Alert Triggers
Monitor for:
- Unusual number of status changes
- Super admin promotions (always critical)
- Actions during off-hours
- Multiple failed attempts (not yet implemented)
- Geographic anomalies (if IP geolocation added)

## Documentation References

- Security Audit Report: `SECURITY_AUDIT_REPORT.md`
- Database Schema: `shared/schema.ts`
- Migration File: `migrations/0009_add_audit_logs.sql`
- Storage Implementation: `server/storage.ts`
- Route Handlers: `server/routes.ts` (lines 2273-2450)

## Change Log

### December 2024 - Initial Implementation
- ✅ Created audit_logs table schema
- ✅ Added TypeScript types and validation
- ✅ Implemented storage layer methods
- ✅ Integrated audit logging into all mutation endpoints
- ✅ Added rate limiting to all super admin endpoints
- ⏳ TODO: Create audit log viewer UI

---

**Document Version**: 1.0  
**Last Updated**: December 2024  
**Maintained By**: Development Team  
**Review Cycle**: Quarterly or after significant changes
