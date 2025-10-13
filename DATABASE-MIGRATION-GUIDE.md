# Database Schema Changes - Apply Guide

## Overview
This guide explains how to apply database schema changes for the **Notifications** and **Task Cancellation** features using Drizzle ORM's push command.

## Schema Changes Summary

### 1. Notifications Table (NEW)
**Table:** `notifications`

A new table for storing user notifications with SSE (Server-Sent Events) support.

**Columns:**
- `id` (VARCHAR, PRIMARY KEY) - Auto-generated UUID
- `userId` (VARCHAR, NOT NULL) - References users.id
- `organizationId` (VARCHAR, NOT NULL) - References organizations.id
- `title` (VARCHAR 255, NOT NULL) - Notification title
- `message` (TEXT, NOT NULL) - Notification message body
- `type` (VARCHAR 50, DEFAULT 'info') - Notification type (info, success, warning, error)
- `isRead` (BOOLEAN, DEFAULT false) - Read status
- `createdAt` (TIMESTAMP, DEFAULT NOW) - Creation timestamp
- `readAt` (TIMESTAMP, NULLABLE) - When notification was read

**Purpose:**
- Store persistent notifications for users
- Track read/unread status
- Support real-time notification delivery via SSE

### 2. Task Cancellation Fields (EXISTING TABLE UPDATE)
**Table:** `tasks`

Added three new fields to support task and flow cancellation tracking:

**New Columns:**
- `cancelledBy` (VARCHAR, NULLABLE) - User ID who cancelled the task
- `cancelledAt` (TIMESTAMP, NULLABLE) - When task was cancelled
- `cancelReason` (TEXT, NULLABLE) - Reason for cancellation

**Purpose:**
- Track who cancelled tasks
- Record cancellation timestamp
- Store cancellation reason for audit trail

### 3. Existing Columns Referenced
**Transfer Tracking Fields (already exist):**
- `originalAssignee` (VARCHAR)
- `transferredBy` (VARCHAR)
- `transferredAt` (TIMESTAMP)
- `transferReason` (TEXT)

**Status Field:**
- `status` - Enum includes: pending, in_progress, completed, overdue, **cancelled**

## Prerequisites

### 1. Environment Setup
Ensure your `.env` or `.env.local` file has the correct database connection:

```env
DATABASE_URL="postgresql://username:password@host:port/database?schema=public"
```

Example:
```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/process_sutra?schema=public"
```

### 2. Backup Your Database (IMPORTANT!)
Before applying any schema changes, **always backup your database**:

```bash
# PostgreSQL backup command
pg_dump -U username -d database_name -f backup_$(date +%Y%m%d_%H%M%S).sql

# Example:
pg_dump -U postgres -d process_sutra -f backup_20251013_120000.sql
```

### 3. Install Dependencies (if needed)
```bash
npm install
```

## How to Apply Schema Changes

### Method 1: Using Drizzle Push (Recommended for Development)

This command will automatically sync your schema with the database:

```bash
npm run db:push
```

**What this does:**
1. Reads schema from `shared/schema.ts`
2. Compares with current database schema
3. Generates and applies necessary SQL changes
4. Creates new tables (notifications)
5. Adds new columns to existing tables (tasks cancellation fields)

**Expected Output:**
```
[✓] Changes applied
```

### Method 2: Using Drizzle Generate + Migrate (Production)

For production environments, generate migration files first:

```bash
# Step 1: Generate migration
npm run db:generate

# Step 2: Review migration SQL files in ./drizzle folder

# Step 3: Apply migrations
npm run db:migrate
```

## Verification Steps

### 1. Check if Notifications Table Exists

Run this SQL query in your database client:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'notifications';
```

**Expected:** Should return 1 row with table_name = 'notifications'

### 2. Check Notifications Table Structure

```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'notifications'
ORDER BY ordinal_position;
```

**Expected Columns:**
- id (varchar, NO)
- user_id (varchar, NO)
- organization_id (varchar, NO)
- title (varchar, NO)
- message (text, NO)
- type (varchar, YES)
- is_read (boolean, YES)
- created_at (timestamp, YES)
- read_at (timestamp, YES)

### 3. Check Task Cancellation Fields

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'tasks'
AND column_name IN ('cancelled_by', 'cancelled_at', 'cancel_reason');
```

**Expected:** Should return 3 rows:
- cancelled_by (varchar, YES)
- cancelled_at (timestamp, YES)
- cancel_reason (text, YES)

### 4. Test Notification Creation

```sql
-- Insert test notification
INSERT INTO notifications (user_id, organization_id, title, message, type)
VALUES ('your_user_id', 'your_org_id', 'Test Notification', 'This is a test', 'info')
RETURNING *;
```

### 5. Test Task Cancellation Fields

```sql
-- Update a task with cancellation info
UPDATE tasks 
SET 
  status = 'cancelled',
  cancelled_by = 'admin@example.com',
  cancelled_at = NOW(),
  cancel_reason = 'Test cancellation'
WHERE id = 'some_task_id'
RETURNING *;
```

## Troubleshooting

### Issue 1: "Permission Denied" Error

**Problem:** Database user doesn't have CREATE TABLE permissions

**Solution:**
```sql
-- Grant necessary permissions
GRANT CREATE ON SCHEMA public TO your_database_user;
GRANT ALL ON ALL TABLES IN SCHEMA public TO your_database_user;
```

### Issue 2: "Column Already Exists" Error

**Problem:** Schema is already applied

**Solution:**
This is fine! The columns already exist. You can verify:
```sql
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'tasks' AND column_name = 'cancelled_by';
```

### Issue 3: Database Connection Refused

**Problem:** DATABASE_URL is incorrect or database is not running

**Solution:**
1. Check PostgreSQL is running: `pg_isready`
2. Verify connection string in `.env.local`
3. Test connection: `psql $DATABASE_URL`

### Issue 4: "Relation Does Not Exist" for References

**Problem:** Referenced tables (users, organizations) don't exist

**Solution:**
Run full schema migration in order:
```bash
# This will create all tables in correct order
npm run db:push
```

### Issue 5: TypeScript Errors After Schema Changes

**Problem:** Type definitions not updated

**Solution:**
```bash
# Regenerate types
npm run db:generate

# Restart TypeScript server in VS Code
# Press Ctrl+Shift+P -> "TypeScript: Restart TS Server"
```

## Post-Migration Checklist

After running `npm run db:push`, verify:

- [ ] ✅ Notifications table exists
- [ ] ✅ Notifications has all 9 columns
- [ ] ✅ Foreign keys to users and organizations work
- [ ] ✅ Tasks table has cancellation columns (cancelled_by, cancelled_at, cancel_reason)
- [ ] ✅ Can insert test notification successfully
- [ ] ✅ Can update task with cancellation info
- [ ] ✅ Application starts without database errors
- [ ] ✅ Notifications feature works in UI
- [ ] ✅ Task cancellation works in UI

## Rollback Plan

If something goes wrong, restore from backup:

```bash
# Drop current database (BE CAREFUL!)
dropdb process_sutra

# Create fresh database
createdb process_sutra

# Restore from backup
psql -U postgres -d process_sutra -f backup_20251013_120000.sql
```

## Schema Definition Reference

### Complete Notifications Schema
```typescript
export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  type: varchar("type", { length: 50 }).default("info"),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  readAt: timestamp("read_at"),
});
```

### Task Cancellation Fields
```typescript
// In tasks table
cancelledBy: varchar("cancelled_by"),
cancelledAt: timestamp("cancelled_at"),
cancelReason: text("cancel_reason"),
```

## NPM Scripts Reference

```json
{
  "db:push": "drizzle-kit push",
  "db:generate": "drizzle-kit generate",
  "db:migrate": "drizzle-kit migrate",
  "db:studio": "drizzle-kit studio"
}
```

## Additional Features Using These Changes

### 1. Notifications System
- Real-time notifications via SSE (Server-Sent Events)
- Persistent notification storage
- Read/unread tracking
- Notification dropdown in header
- Mark as read functionality

### 2. Task Cancellation
- Cancel individual tasks with reason
- Cancel entire flows
- Track who cancelled and when
- Audit trail for cancellations
- Stop flow progression

### 3. Webhook Integration
- Webhooks table (already exists)
- Trigger notifications on events
- Flow and task event tracking

## Summary

**To apply all database changes, simply run:**

```bash
npm run db:push
```

This single command will:
1. ✅ Create the notifications table with all columns and constraints
2. ✅ Add cancellation fields to tasks table
3. ✅ Set up foreign key relationships
4. ✅ Apply default values and indexes
5. ✅ Make your database match the schema definition

**Important Notes:**
- ⚠️ Always backup your database first!
- ✅ Test in development environment before production
- ✅ Verify changes after applying
- ✅ Check application functionality after migration

---

**Status:** Ready to Apply  
**Database Impact:** Creates 1 new table, adds 3 columns to existing table  
**Downtime:** None (additive changes only)  
**Rollback:** Available via database backup  
**Last Updated:** October 13, 2025
