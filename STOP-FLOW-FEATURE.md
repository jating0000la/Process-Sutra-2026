# Stop Flow Feature Documentation

## Overview
Added a "Stop Flow" feature that allows **Admin and Manager users** to cancel/stop flows that are in progress. This feature is accessible from the Flow Data page.

## Implementation Date
October 13, 2025

---

## Features Added

### 1. Backend API Endpoint

**Endpoint:** `POST /api/flows/:flowId/stop`

**Authentication:** Required (Admin/Manager only)

**Request Body:**
```json
{
  "reason": "Optional reason for stopping the flow"
}
```

**Response:**
```json
{
  "success": true,
  "flowId": "flow-abc-123",
  "cancelledTasksCount": 5,
  "totalTasksInFlow": 8,
  "message": "Flow stopped successfully. 5 task(s) cancelled."
}
```

**Functionality:**
- Fetches all tasks belonging to the specified flow
- Validates that the flow belongs to the user's organization
- Cancels all tasks with status "pending" or "in_progress"
- Updates task records with:
  - `status: "cancelled"`
  - `cancelledBy: user.id`
  - `cancelledAt: timestamp`
  - `cancelReason: provided reason or default message`
- Sends notifications to assigned users via SSE
- Triggers webhooks for 'flow.stopped' event

**Security:**
- Organization isolation: Only stops flows from user's organization
- Role-based access: Requires admin or manager role
- Audit trail: Records who stopped the flow and when

---

### 2. Database Schema Updates

**File:** `shared/schema.ts`

**New Fields Added to `tasks` table:**
```typescript
cancelledBy: varchar("cancelled_by"),      // User ID who cancelled the task
cancelledAt: timestamp("cancelled_at"),    // Timestamp when cancelled
cancelReason: text("cancel_reason"),       // Reason for cancellation
```

**Updated status comment:**
```typescript
status: varchar("status").default("pending"), // pending, in_progress, completed, overdue, cancelled
```

**Migration File:** `migrations/0002_add_task_cancellation_fields.sql`

---

### 3. Frontend UI Components

**Location:** `client/src/pages/flow-data.tsx`

#### Features Added:

1. **Stop Flow Button on Flow List Cards**
   - Visible only to Admin/Manager users
   - Only shown for flows that are not completed
   - Red "Stop Flow" button with stop icon
   - Positioned next to "View Details" button

2. **Stop Flow Button on Detailed Flow View**
   - Visible at the top of the detailed flow view
   - Only shown if flow has uncompleted/uncancelled tasks
   - Admin/Manager only

3. **Stop Flow Confirmation Dialog**
   - Shows flow details (system, order number, description, progress)
   - Optional text area for entering reason
   - Confirmation required before stopping
   - Cancel and Stop Flow buttons

#### User Experience:

```
Admin clicks "Stop Flow" 
  → Confirmation dialog appears
  → Shows flow summary
  → Admin can enter reason (optional)
  → Admin confirms
  → Backend processes cancellation
  → Success notification shown
  → Flow list refreshes
  → Cancelled tasks appear with "cancelled" status
```

---

## Code Changes Summary

### Backend (`server/routes.ts`)

**New Endpoint Added (after line 567):**
```typescript
app.post("/api/flows/:flowId/stop", isAuthenticated, addUserToRequest, requireAdmin, async (req: any, res) => {
  // Implementation details
});
```

**Key Functions:**
- Validates organization ownership
- Cancels all pending/in-progress tasks
- Sends notifications to affected users
- Fires webhooks for external integrations
- Returns summary of stopped flow

### Frontend (`client/src/pages/flow-data.tsx`)

**New State Variables:**
```typescript
const [isStopDialogOpen, setIsStopDialogOpen] = useState(false);
const [flowToStop, setFlowToStop] = useState<FlowSummary | null>(null);
const [stopReason, setStopReason] = useState("");
const isAdmin = (user as any)?.role === 'admin' || (user as any)?.role === 'manager';
```

**New Mutation:**
```typescript
const stopFlowMutation = useMutation({
  mutationFn: async ({ flowId, reason }) => {
    // API call to stop flow
  },
  onSuccess: (data) => {
    // Show success toast
    // Refresh data
    // Close dialog
  },
  onError: (error) => {
    // Show error toast
  },
});
```

**New Handler Functions:**
```typescript
const handleStopFlow = (flow: FlowSummary) => { /* ... */ };
const confirmStopFlow = () => { /* ... */ };
```

---

## UI Components Used

- `Button` - Stop Flow button
- `Dialog` - Confirmation modal
- `Textarea` - Reason input
- `Badge` - Status indicators
- `StopCircle` icon - Visual indicator

---

## Security & Access Control

### Role-Based Access
- **Admin**: Full access to stop any flow in their organization
- **Manager**: Full access to stop any flow in their organization
- **User/Staff**: No access to stop flows (button not visible)

### Organization Isolation
```typescript
// Backend validates organization ownership
if (firstTask.organizationId !== user.organizationId) {
  return res.status(403).json({ message: "Access denied" });
}
```

### Audit Trail
All stopped flows are tracked with:
- Who stopped it (`cancelledBy`)
- When it was stopped (`cancelledAt`)
- Why it was stopped (`cancelReason`)

---

## Notifications

### SSE Notifications
When a flow is stopped, all assigned users receive real-time notifications:

```typescript
sendToEmail(task.doerEmail, 'task-cancelled', {
  flowId,
  taskId: task.id,
  taskName: task.taskName,
  orderNumber: task.orderNumber,
  system: task.system,
  reason: reason || "Flow stopped by admin",
  cancelledBy: user.email,
});
```

### Webhook Integration
System fires `flow.stopped` webhook event:

```json
{
  "id": "event-uuid",
  "type": "flow.stopped",
  "createdAt": "2025-10-13T10:30:00Z",
  "data": {
    "flowId": "flow-abc-123",
    "orderNumber": "ORD-12345",
    "system": "Customer Onboarding",
    "description": "New customer setup",
    "stoppedBy": "user-id",
    "stoppedAt": "2025-10-13T10:30:00Z",
    "reason": "Customer requested cancellation",
    "cancelledTasksCount": 5
  }
}
```

---

## Migration Instructions

### 1. Run Database Migration

```bash
# For PostgreSQL
psql -d your_database -f migrations/0002_add_task_cancellation_fields.sql
```

Or using your migration tool:
```bash
npm run migrate
# or
npx drizzle-kit push:pg
```

### 2. Restart Backend Server

```bash
npm run dev
# or
pm2 restart all
```

### 3. Clear Frontend Cache

```bash
# In development
npm run dev

# In production
npm run build
```

---

## Testing Checklist

### Backend Testing

- [ ] Admin can stop a flow successfully
- [ ] Manager can stop a flow successfully
- [ ] Regular user gets 403 Forbidden
- [ ] Stop flow only affects user's organization
- [ ] Cancelled tasks have correct status
- [ ] Audit fields are populated correctly
- [ ] Notifications are sent to assigned users
- [ ] Webhooks are triggered correctly
- [ ] Already completed tasks are not affected

### Frontend Testing

- [ ] Stop button visible only to Admin/Manager
- [ ] Stop button hidden for completed flows
- [ ] Confirmation dialog appears
- [ ] Reason field works correctly
- [ ] Success message shows after stopping
- [ ] Flow list refreshes after stopping
- [ ] Cancelled tasks show correct status
- [ ] Error handling works for failed stops

### Integration Testing

- [ ] Stop flow from list view works
- [ ] Stop flow from detailed view works
- [ ] Multi-task flows are fully cancelled
- [ ] Notifications reach assigned users
- [ ] Webhooks fire correctly
- [ ] Database records are accurate
- [ ] Organization isolation maintained

---

## Error Handling

### Backend Errors

| Error | Status Code | Message |
|-------|-------------|---------|
| Flow not found | 404 | "Flow not found or no access" |
| Wrong organization | 403 | "Access denied" |
| Not admin/manager | 403 | "Admin access required" |
| Server error | 500 | "Failed to stop flow" |

### Frontend Error Display

```typescript
toast({
  title: "Error",
  description: error.message,
  variant: "destructive",
});
```

---

## Future Enhancements

### Potential Improvements:

1. **Bulk Stop Flows**
   - Select multiple flows and stop them at once

2. **Scheduled Stop**
   - Schedule a flow to stop at a specific time

3. **Conditional Stop**
   - Stop flow only if certain conditions are met

4. **Resume Flow**
   - Allow resuming cancelled flows from where they stopped

5. **Stop Templates**
   - Pre-defined reasons for stopping flows

6. **Advanced Notifications**
   - Email notifications for stopped flows
   - SMS alerts for critical flows

7. **Analytics**
   - Track most commonly stopped flows
   - Analyze reasons for stopping
   - Identify bottlenecks

---

## API Example

### cURL Request

```bash
curl -X POST https://your-domain.com/api/flows/flow-abc-123/stop \
  -H "Content-Type: application/json" \
  -H "Cookie: your-session-cookie" \
  -d '{
    "reason": "Customer requested cancellation"
  }'
```

### JavaScript/TypeScript

```typescript
const stopFlow = async (flowId: string, reason: string) => {
  const response = await fetch(`/api/flows/${flowId}/stop`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({ reason }),
  });

  if (!response.ok) {
    throw new Error('Failed to stop flow');
  }

  return await response.json();
};
```

---

## Database Queries

### Get All Cancelled Tasks for a Flow

```sql
SELECT * FROM tasks 
WHERE flow_id = 'flow-abc-123' 
AND status = 'cancelled'
ORDER BY cancelled_at DESC;
```

### Get Stop Flow Audit Trail

```sql
SELECT 
  flow_id,
  order_number,
  system,
  cancelled_by,
  cancelled_at,
  cancel_reason,
  COUNT(*) as cancelled_tasks
FROM tasks
WHERE status = 'cancelled'
  AND cancelled_at IS NOT NULL
GROUP BY flow_id, order_number, system, cancelled_by, cancelled_at, cancel_reason
ORDER BY cancelled_at DESC;
```

### Get User's Stop Flow Activity

```sql
SELECT 
  u.email as admin_email,
  COUNT(DISTINCT t.flow_id) as flows_stopped,
  COUNT(t.id) as tasks_cancelled,
  MIN(t.cancelled_at) as first_stop,
  MAX(t.cancelled_at) as last_stop
FROM tasks t
JOIN users u ON t.cancelled_by = u.id
WHERE t.status = 'cancelled'
GROUP BY u.email
ORDER BY flows_stopped DESC;
```

---

## Support & Troubleshooting

### Common Issues

**Issue 1: Stop button not visible**
- **Solution**: Check user role (must be admin or manager)

**Issue 2: Stop flow returns 403**
- **Solution**: Verify organization ownership and admin role

**Issue 3: Tasks not cancelled**
- **Solution**: Check task status (only pending/in_progress are cancelled)

**Issue 4: Notifications not sent**
- **Solution**: Verify SSE connection and user email

---

**Document Version:** 1.0  
**Last Updated:** October 13, 2025  
**Feature Status:** ✅ Implemented and Ready for Testing  
**Breaking Changes:** None (backwards compatible)
