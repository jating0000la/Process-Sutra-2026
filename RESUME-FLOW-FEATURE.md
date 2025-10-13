# Resume Flow Feature Documentation

## Overview
Extended the existing Stop Flow feature to allow **Admin and Manager users** to resume flows that have been previously stopped. This feature enables workflow management flexibility by allowing stopped flows to be reactivated and continue processing.

## Key Features

### 1. **Resume Flow Endpoint**
- **Endpoint:** `POST /api/flows/:flowId/resume`
- **Access Control:** Admin and Manager only
- **Functionality:**
  - Changes all `cancelled` tasks back to `pending` status
  - Clears cancellation metadata (`cancelledBy`, `cancelledAt`, `cancelReason`)
  - Sends notifications to assigned users
  - Fires webhooks for `flow.resumed` event

### 2. **Dynamic Button States**
- When a flow is **active** (not stopped): Shows **"Stop Flow"** button (red/destructive)
- When a flow is **stopped**: Shows **"Resume Flow"** button (green)
- Buttons appear both in:
  - Flow list view cards
  - Detailed flow view

### 3. **Flow Status Tracking**
- Added new flow status: `'stopped'`
- Flow statuses now include:
  - `completed` - All tasks completed
  - `in-progress` - Some tasks completed
  - `pending` - No tasks completed
  - `stopped` - Has cancelled tasks

### 4. **Visual Indicators**
- **Stopped flows** display with a red/destructive badge
- **Stopped status** can be filtered in the status dropdown
- Flow cards show cancelled task count

## Technical Implementation

### Backend Changes (`server/routes.ts`)

Added new endpoint after the stop flow endpoint:

```typescript
app.post("/api/flows/:flowId/resume", isAuthenticated, addUserToRequest, requireAdmin, async (req: any, res) => {
  // Get flow tasks
  // Verify organization access
  // Update cancelled tasks to pending
  // Clear cancellation metadata
  // Send notifications
  // Fire webhooks
  // Return success response
});
```

**Key Logic:**
- Finds all tasks with `status === 'cancelled'`
- Sets status back to `'pending'`
- Clears: `cancelledBy`, `cancelledAt`, `cancelReason`
- Returns count of resumed tasks

### Frontend Changes (`client/src/pages/flow-data.tsx`)

#### 1. Interface Updates
```typescript
interface FlowSummary {
  // ... existing fields
  cancelledTasks: number;
  status: 'completed' | 'in-progress' | 'pending' | 'stopped';
}
```

#### 2. State Management
Added new state variables:
```typescript
const [isResumeDialogOpen, setIsResumeDialogOpen] = useState(false);
const [flowToResume, setFlowToResume] = useState<FlowSummary | null>(null);
const [resumeReason, setResumeReason] = useState("");
```

#### 3. Resume Flow Mutation
```typescript
const resumeFlowMutation = useMutation({
  mutationFn: async ({ flowId, reason }) => {
    const response = await fetch(`/api/flows/${flowId}/resume`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ reason }),
    });
    // ... error handling
  },
  onSuccess: (data) => {
    // Show success toast
    // Invalidate queries to refresh data
    // Close dialog
  }
});
```

#### 4. Flow Status Logic
```typescript
// Tracks cancelled tasks
if (task.status === 'cancelled') {
  flow.cancelledTasks++;
}

// Determines flow status
if (flow.cancelledTasks > 0 && flow.completedTasks < flow.taskCount) {
  flow.status = 'stopped';
}
```

#### 5. Conditional Button Rendering
```typescript
{isAdmin && flow.status !== 'completed' && (
  flow.status === 'stopped' ? (
    <Button onClick={() => handleResumeFlow(flow)} className="bg-green-600">
      <Play /> Resume Flow
    </Button>
  ) : (
    <Button variant="destructive" onClick={() => handleStopFlow(flow)}>
      <StopCircle /> Stop Flow
    </Button>
  )
)}
```

#### 6. Resume Confirmation Dialog
- Shows flow details (system, order number, description)
- Displays cancelled task count
- Optional reason input field
- Green-themed "Resume Flow" button
- Cancel option

## User Flow

### Stopping a Flow
1. Admin views flow on Flow Data page
2. Clicks "Stop Flow" button (red)
3. Confirms in dialog with optional reason
4. Flow status changes to "stopped"
5. All pending/in-progress tasks marked as cancelled
6. Button changes to green "Resume Flow"

### Resuming a Flow
1. Admin sees stopped flow with "Resume Flow" button (green)
2. Clicks "Resume Flow" button
3. Confirms in dialog with optional reason
4. Flow status returns to active state
5. Cancelled tasks become pending again
6. Button changes back to red "Stop Flow"

## API Response Format

### Resume Flow Success Response
```json
{
  "success": true,
  "flowId": "flow-abc-123",
  "resumedTasksCount": 5,
  "totalTasksInFlow": 10,
  "message": "Flow resumed successfully. 5 task(s) resumed."
}
```

### Resume Flow Error Response
```json
{
  "message": "Error message"
}
```

## Notifications & Webhooks

### Email Notifications
- **Event:** `task-resumed`
- **Sent to:** Each task's assigned user (`doerEmail`)
- **Payload includes:**
  - Flow ID
  - Task ID and name
  - Order number
  - System
  - Reason for resuming
  - Who resumed it

### Webhooks
- **Event Type:** `flow.resumed`
- **Webhook Payload:**
```json
{
  "id": "unique-webhook-id",
  "type": "flow.resumed",
  "createdAt": "2025-10-13T...",
  "data": {
    "flowId": "flow-abc-123",
    "orderNumber": "ORD-001",
    "system": "CRM Onboarding",
    "description": "New customer onboarding",
    "resumedBy": "admin-user-id",
    "resumedAt": "2025-10-13T...",
    "reason": "Issue resolved, resuming workflow",
    "resumedTasksCount": 5
  }
}
```

## Security & Access Control

### Authorization
- ✅ Only Admin and Manager roles can resume flows
- ✅ Organization isolation enforced
- ✅ Users can only resume flows in their organization
- ✅ Suspended/inactive users blocked from resuming

### Validation
- ✅ Flow existence check
- ✅ Organization ownership verification
- ✅ Only cancelled tasks are resumed
- ✅ Completed tasks remain unchanged

## UI/UX Enhancements

### Status Filter
- Added "Stopped" option to status filter dropdown
- Users can filter to see only stopped flows

### Status Badge
- **Stopped** flows display with red/destructive badge
- Clearly distinguishable from other statuses

### Progress Display
- Shows "X/Y tasks completed" 
- Additionally shows cancelled task count when resuming

### Button Styling
- **Stop Flow:** Red destructive variant with StopCircle icon
- **Resume Flow:** Green background with Play icon
- Clear visual distinction between states

## Testing Checklist

- [x] Admin can stop a flow
- [x] Stop button changes to Resume after stopping
- [x] Admin can resume a stopped flow
- [x] Resume button changes to Stop after resuming
- [x] Cancelled tasks return to pending status
- [x] Cancellation metadata cleared on resume
- [x] Non-admin users cannot see Stop/Resume buttons
- [x] Organization isolation maintained
- [x] Stopped flows show in status filter
- [x] Notifications sent to task assignees
- [x] Webhooks fired for flow.resumed event
- [x] Dialog shows correct flow details
- [x] Progress counters update correctly

## Error Handling

| Scenario | Status | Response |
|----------|--------|----------|
| Flow not found | 404 | "Flow not found or no access" |
| Wrong organization | 403 | "Access denied" |
| Not admin/manager | 403 | "Admin access required" |
| Server error | 500 | "Failed to resume flow" |

## Future Enhancements

1. **Partial Resume**
   - Allow resuming specific tasks instead of all
   - Task-level resume controls

2. **Resume History**
   - Track how many times a flow was stopped/resumed
   - Display timeline of flow state changes

3. **Scheduled Resume**
   - Allow setting a time to automatically resume
   - Useful for maintenance windows

4. **Conditional Resume**
   - Resume flow only if certain conditions met
   - Integration with external systems

5. **Bulk Resume**
   - Resume multiple stopped flows at once
   - Filter and resume by criteria

## Browser Compatibility
- Chrome/Edge ✅
- Firefox ✅
- Safari ✅
- Mobile browsers ✅

## Performance Considerations
- Resume operation is atomic per task
- Notifications sent asynchronously
- Webhooks fired in background (non-blocking)
- UI updates via React Query cache invalidation

## Documentation Links
- [Stop Flow Feature](./STOP-FLOW-FEATURE.md)
- [API Documentation](./API-DOCUMENTATION.md)
- [Flow Management Guide](./FLOW-MANAGEMENT-GUIDE.md)
