# Notification Mechanism Analysis

**Date:** October 14, 2025  
**Application:** Process Sutra 2026

---

## 📋 Overview

The notification system uses **Server-Sent Events (SSE)** for real-time communication between server and client, combined with a **React Context** for state management on the frontend. The system supports real-time notifications for task assignments, cancellations, and resumptions.

---

## 🏗️ Architecture

### **Backend Components**

#### 1. **Server-Sent Events (SSE) Implementation** (`server/notifications.ts`)

```typescript
Key Features:
- Client connection management via Map<string, Client>
- Per-client heartbeat mechanism (25-second intervals)
- Event broadcasting to specific users, organizations, or all clients
- Automatic cleanup on connection close
```

**Functions:**
- `addClient(client)` - Registers a new SSE client connection
- `removeClient(id)` - Removes client and clears heartbeat
- `sendToEmail(email, event, data)` - Sends notification to specific user by email
- `sendToOrganization(organizationId, event, data)` - Broadcasts to all users in an organization
- `sendBroadcast(event, data)` - Sends to all connected clients

#### 2. **SSE Endpoint** (`server/routes.ts`)

**Route:** `GET /api/notifications/stream`

**Authentication:** Required (isAuthenticated middleware)

**Flow:**
1. Sets SSE headers (text/event-stream, no-cache, keep-alive)
2. Sends initial "hello" event to confirm connection
3. Starts 25-second heartbeat (ping events)
4. Registers client with user info (id, email, organizationId)
5. Handles cleanup on connection close

#### 3. **Notification Triggers**

**Flow Started** (sent when new task is assigned):
```typescript
Location: server/routes.ts (lines ~567, ~927)
Event: 'flow-started'
Data: { flowId, orderNumber, system, taskName, description, assignedTo, plannedTime }
Recipient: startRule.email (assigned user)
```

**Task Cancelled** (sent when task is stopped/cancelled):
```typescript
Location: server/routes.ts (line ~652)
Event: 'task-cancelled'
Data: { flowId, taskId, taskName, orderNumber, system, reason, cancelledBy }
Recipient: task.doerEmail (assigned user)
```

**Task Resumed** (sent when cancelled task is resumed):
```typescript
Location: server/routes.ts (line ~754)
Event: 'task-resumed'
Data: { flowId, taskId, taskName, orderNumber, system, reason }
Recipient: task.doerEmail (assigned user)
```

---

### **Frontend Components**

#### 1. **Notification Context** (`client/src/contexts/NotificationContext.tsx`)

**Purpose:** Global state management for notifications

**State:**
- `notifications: Notification[]` - Array of all notifications
- `unreadCount: number` - Count of unread notifications

**Notification Structure:**
```typescript
interface Notification {
  id: string;           // Auto-generated unique ID
  title: string;        // Notification title
  description: string;  // Notification details
  timestamp: Date;      // Creation time
  read: boolean;        // Read status
  type?: 'info' | 'success' | 'warning' | 'error';
}
```

**Methods:**
- `addNotification(notification)` - Adds new notification to the list
- `markAsRead(id)` - Marks single notification as read
- `markAllAsRead()` - Marks all notifications as read
- `removeNotification(id)` - Removes specific notification
- `clearAllNotifications()` - Removes all notifications

#### 2. **Notifications Hook** (`client/src/hooks/useNotifications.ts`)

**Purpose:** Manages SSE connection and event handling

**Key Features:**
- ✅ Automatic connection on authentication
- ✅ Exponential backoff reconnection (1s, 2s, 5s, 10s, 30s)
- ✅ Connection status tracking (connecting/connected/disconnected)
- ✅ Automatic cleanup on unmount
- ✅ Heartbeat monitoring

**Event Handlers:**

**1. Connection Events:**
- `hello` - Initial connection confirmation
- `onopen` - Connection established
- `onerror` - Connection error (triggers reconnection)
- `ping` - Heartbeat keep-alive

**2. Notification Events:**

**flow-started:**
```typescript
- Shows toast notification
- Adds to notification dropdown
- Type: 'info'
- Format: "New task assigned: {taskName}" • "{system} • {orderNumber}"
```

**task-cancelled:**
```typescript
- Shows destructive toast
- Adds to notification dropdown
- Type: 'error'
- Format: "Task Cancelled" • "{taskName} • {reason}"
```

**task-resumed:**
```typescript
- Shows success toast
- Adds to notification dropdown
- Type: 'success'
- Format: "Task Resumed" • "{taskName} • {reason}"
```

#### 3. **Notification Dropdown** (`client/src/components/notification-dropdown.tsx`)

**Purpose:** UI component for viewing and managing notifications

**Features:**
- 📊 Bell icon with unread badge counter
- 📜 Scrollable list of notifications (max height: 96)
- 🔵 Blue dot indicator for unread items
- 🕐 Relative timestamps (e.g., "5 minutes ago")
- ✅ Individual "mark as read" button
- ❌ Individual "remove" button
- ✅ "Mark all read" button
- 🗑️ "Clear all" button
- ➕ "Test" button (for development/testing)

**Empty State:** Shows "No notifications" message

#### 4. **Integration in App** (`client/src/App.tsx`)

**Provider Hierarchy:**
```
<QueryClientProvider>
  <AuthProvider>
    <NotificationProvider>        ← State management
      <LayoutProvider>
        <TooltipProvider>
          <Toaster />              ← Toast notifications
          <Router />               ← useNotifications() called here
        </TooltipProvider>
      </LayoutProvider>
    </NotificationProvider>
  </AuthProvider>
</QueryClientProvider>
```

**Hook Call:** `useNotifications()` is called in the `Router` component, ensuring SSE connection is established after authentication.

#### 5. **Header Integration** (`client/src/components/header.tsx`)

**Location:** Top-right of header, between logo and user dropdown

```tsx
<NotificationDropdown />
```

---

## 💾 Database Schema

### **Notifications Table** (Persistent Storage)

**Note:** Schema defined but **NOT currently integrated** with the SSE system. Notifications are currently **in-memory only** on the frontend.

**Schema:**
```sql
CREATE TABLE notifications (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id VARCHAR(255) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(50) DEFAULT 'info',
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  read_at TIMESTAMP
);
```

**Indexes:**
- `idx_notifications_user_id` - User lookup
- `idx_notifications_organization_id` - Organization lookup
- `idx_notifications_created_at` - Time-based sorting
- `idx_notifications_is_read` - Unread filtering
- `idx_notifications_user_unread` - Composite for unread by user

**TypeScript Schema:** Defined in `shared/mysql-schema.ts`

---

## 🔄 Data Flow

### **Complete Flow Diagram**

```
┌──────────────────────────────────────────────────────────────────┐
│                        SERVER SIDE                                │
└──────────────────────────────────────────────────────────────────┘

1. User Action (Flow Start/Cancel/Resume)
        ↓
2. Server Routes Handler (routes.ts)
        ↓
3. Database Operation (create/update task)
        ↓
4. sendToEmail(email, event, data)  [notifications.ts]
        ↓
5. Find client by email in Map
        ↓
6. Send SSE event: `event: {event}\ndata: {JSON}\n\n`

┌──────────────────────────────────────────────────────────────────┐
│                        CLIENT SIDE                                │
└──────────────────────────────────────────────────────────────────┘

7. EventSource receives event [useNotifications.ts]
        ↓
8. Parse event data
        ↓
9. Branch:
   ├─→ Show toast notification (useToast)
   └─→ Add to notification list (NotificationContext)
        ↓
10. Update UI:
    ├─→ Update bell icon badge counter
    ├─→ Add to dropdown list
    └─→ Mark as unread (blue dot)
        ↓
11. User Interaction:
    ├─→ Click bell icon → Open dropdown
    ├─→ Click notification → Mark as read
    └─→ Click X → Remove notification
```

---

## ✅ Current Strengths

1. ✅ **Real-time Communication:** SSE provides low-latency notifications
2. ✅ **Resilient Reconnection:** Exponential backoff handles connection drops
3. ✅ **User-Scoped:** Notifications sent only to relevant users
4. ✅ **Multi-Event Support:** Handles multiple notification types
5. ✅ **Dual Display:** Toast (temporary) + Dropdown (persistent in session)
6. ✅ **Clean State Management:** React Context for global notification state
7. ✅ **Heartbeat Monitoring:** Detects and recovers from dead connections
8. ✅ **Automatic Cleanup:** Proper connection and timer cleanup

---

## ⚠️ Issues and Limitations

### **1. No Persistent Storage Integration**
**Issue:** Notifications table exists but is not used  
**Impact:** 
- Notifications lost on page refresh
- No notification history
- Cannot retrieve missed notifications
- No server-side read/unread tracking

**Recommendation:** Implement API endpoints to:
- Save notifications to database on creation
- Fetch notification history on login
- Sync read status between client and server

---

### **2. Missing Notification History**
**Issue:** No way to retrieve past notifications  
**Impact:** Users who were offline miss notifications  
**Recommendation:** 
```typescript
// On login/connection, fetch missed notifications
GET /api/notifications?since={lastCheckTimestamp}
```

---

### **3. No Cross-Device Synchronization**
**Issue:** Read/unread status not synced across devices  
**Impact:** User marks as read on desktop, still shows unread on mobile  
**Recommendation:** Store read status in database, sync via API

---

### **4. Memory Leak Risk**
**Issue:** Notification list grows indefinitely in memory  
**Impact:** Performance degrades over long sessions  
**Recommendation:** 
- Limit to last N notifications (e.g., 100)
- Auto-remove old notifications after X days
- Implement pagination

---

### **5. No Organization-Wide Notifications**
**Issue:** Only email-based targeting is actively used  
**Impact:** Cannot broadcast to entire organization  
**Recommendation:** Use `sendToOrganization()` for announcements

---

### **6. Limited Error Handling**
**Issue:** SSE errors only trigger reconnection  
**Impact:** Silent failures possible  
**Recommendation:** 
- Log errors to monitoring service
- Show connection status indicator to user
- Fallback to polling if SSE repeatedly fails

---

### **7. No Notification Preferences**
**Issue:** All users receive all notification types  
**Impact:** No control over notification volume  
**Recommendation:** 
- User settings for notification types
- Do Not Disturb mode
- Email fallback for offline users

---

### **8. Test Button in Production**
**Issue:** "Test" button visible to all users  
**Impact:** Non-admin users can spam test notifications  
**Recommendation:** 
```typescript
// Only show for admins or in development
{(user?.role === 'admin' || import.meta.env.DEV) && (
  <Button onClick={addTestNotification}>Test</Button>
)}
```

---

### **9. No Notification Sound/Badge**
**Issue:** Only visual indicators  
**Impact:** Easy to miss notifications  
**Recommendation:** 
- Add browser notification API
- Optional notification sound
- Browser tab badge

---

### **10. Connection Status Not Displayed**
**Issue:** `connectionStatus` tracked but not shown to user  
**Impact:** Users don't know if notifications are working  
**Recommendation:** 
```tsx
// In header or notification dropdown
{connectionStatus === 'disconnected' && (
  <Alert>Notifications offline. Reconnecting...</Alert>
)}
```

---

## 🔧 Recommended Improvements

### **Priority 1: Persistent Storage**

**1. Create API Endpoints:**
```typescript
// server/routes.ts

// Get user's notifications
app.get('/api/notifications', isAuthenticated, async (req, res) => {
  const { userId } = req.currentUser;
  const notifications = await db
    .select()
    .from(notificationsTable)
    .where(eq(notificationsTable.userId, userId))
    .orderBy(desc(notificationsTable.createdAt))
    .limit(100);
  res.json(notifications);
});

// Mark notification as read
app.patch('/api/notifications/:id/read', isAuthenticated, async (req, res) => {
  const { id } = req.params;
  const { userId } = req.currentUser;
  await db
    .update(notificationsTable)
    .set({ isRead: true, readAt: new Date() })
    .where(and(
      eq(notificationsTable.id, id),
      eq(notificationsTable.userId, userId)
    ));
  res.json({ success: true });
});

// Delete notification
app.delete('/api/notifications/:id', isAuthenticated, async (req, res) => {
  const { id } = req.params;
  const { userId } = req.currentUser;
  await db
    .delete(notificationsTable)
    .where(and(
      eq(notificationsTable.id, id),
      eq(notificationsTable.userId, userId)
    ));
  res.json({ success: true });
});
```

**2. Modify Notification Sending:**
```typescript
// server/notifications.ts

export async function sendToEmailWithPersistence(
  db: Database,
  email: string,
  organizationId: string,
  event: string,
  data: any
) {
  // Find user by email
  const user = await db.select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  
  if (user[0]) {
    // Save to database
    await db.insert(notificationsTable).values({
      userId: user[0].id,
      organizationId,
      title: data.taskName || data.title,
      message: JSON.stringify(data),
      type: event === 'task-cancelled' ? 'error' : 
            event === 'task-resumed' ? 'success' : 'info',
    });
  }
  
  // Send real-time notification
  sendToEmail(email, event, data);
}
```

**3. Update Client to Fetch on Mount:**
```typescript
// client/src/hooks/useNotifications.ts

useEffect(() => {
  if (!isAuthenticated) return;
  
  // Fetch existing notifications on mount
  fetch('/api/notifications', { credentials: 'include' })
    .then(res => res.json())
    .then(notifications => {
      notifications.forEach(notif => {
        addNotification({
          title: notif.title,
          description: notif.message,
          type: notif.type,
        });
      });
    })
    .catch(err => console.error('Failed to fetch notifications:', err));
  
  // ... rest of SSE connection code
}, [isAuthenticated]);
```

---

### **Priority 2: User Experience**

**1. Connection Status Indicator:**
```tsx
// client/src/components/notification-dropdown.tsx

export function NotificationDropdown() {
  const { connectionStatus } = useNotifications(); // Pass from hook
  
  return (
    <DropdownMenu>
      {/* ... existing code ... */}
      {connectionStatus === 'disconnected' && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Notifications offline. Reconnecting...
          </AlertDescription>
        </Alert>
      )}
    </DropdownMenu>
  );
}
```

**2. Remove Test Button for Non-Admins:**
```tsx
// client/src/components/notification-dropdown.tsx

import { useAuth } from "@/hooks/useAuth";

export function NotificationDropdown() {
  const { user } = useAuth();
  
  return (
    <>
      {user?.role === 'admin' && (
        <Button onClick={addTestNotification}>
          <Plus className="h-3 w-3 mr-1" />
          Test
        </Button>
      )}
    </>
  );
}
```

**3. Notification Limit:**
```typescript
// client/src/contexts/NotificationContext.tsx

const MAX_NOTIFICATIONS = 100;

const addNotification = useCallback((notification) => {
  const newNotification = {
    ...notification,
    id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
    timestamp: new Date(),
    read: false,
  };
  
  setNotifications(prev => {
    const updated = [newNotification, ...prev];
    return updated.slice(0, MAX_NOTIFICATIONS); // Keep only last 100
  });
}, []);
```

---

### **Priority 3: Advanced Features**

**1. Browser Notifications API:**
```typescript
// client/src/hooks/useNotifications.ts

// Request permission on mount
useEffect(() => {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}, []);

// In event handlers
es.addEventListener("flow-started", (ev: MessageEvent) => {
  const data = JSON.parse(ev.data);
  
  // Show browser notification if permission granted
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(`New task assigned: ${data.taskName}`, {
      body: `${data.system} • ${data.orderNumber}`,
      icon: '/logo.png',
      tag: data.flowId, // Prevent duplicates
    });
  }
  
  // ... existing code ...
});
```

**2. Notification Preferences:**
```typescript
// Add to user settings
interface NotificationPreferences {
  flowStarted: boolean;
  taskCancelled: boolean;
  taskResumed: boolean;
  browserNotifications: boolean;
  soundEnabled: boolean;
}

// Check before showing notification
const preferences = getUserPreferences();
if (preferences.flowStarted) {
  addNotification({ ... });
}
```

---

## 📊 Testing Checklist

- [ ] **Test SSE Connection:**
  - [ ] Connect as user A, start flow assigned to user A
  - [ ] Verify notification appears immediately
  - [ ] Check console for "Connected to SSE stream"

- [ ] **Test Reconnection:**
  - [ ] Open DevTools Network tab
  - [ ] Filter for "notifications/stream"
  - [ ] Close connection (right-click > Block request URL temporarily)
  - [ ] Wait 1-2 seconds, unblock
  - [ ] Verify reconnection logged in console

- [ ] **Test Multi-User:**
  - [ ] Open app in two browsers (User A and User B)
  - [ ] User A starts flow assigned to User B
  - [ ] Verify only User B receives notification

- [ ] **Test Notification Types:**
  - [ ] Flow started → Info (blue)
  - [ ] Task cancelled → Error (red toast)
  - [ ] Task resumed → Success (green)

- [ ] **Test UI Actions:**
  - [ ] Click bell → dropdown opens
  - [ ] Click "Mark as read" → blue dot disappears
  - [ ] Click "Mark all read" → all blue dots disappear
  - [ ] Click "X" → notification removed
  - [ ] Click "Clear all" → all notifications removed

- [ ] **Test Persistence:**
  - [ ] Receive notification
  - [ ] Refresh page
  - [ ] ⚠️ **Expected:** Notifications lost (current behavior)
  - [ ] ✅ **After fix:** Notifications persist

---

## 🐛 Known Bugs

**None reported.** System functioning as designed, but has limitations noted above.

---

## 📝 Summary

The notification mechanism is **functional and well-architected** for real-time use, but lacks **persistence and history**. It successfully delivers immediate notifications via SSE, but doesn't survive page refreshes or provide notification history.

**Main Gap:** Database schema exists but isn't integrated with the notification flow.

**Quick Win:** Implement persistent storage by:
1. Saving notifications to DB on creation
2. Fetching on client mount
3. Syncing read/delete actions to DB

This would transform the system from "session-only" to "fully persistent" notifications.

---

## 📚 Related Files

### **Backend:**
- `server/notifications.ts` - SSE client management
- `server/routes.ts` - SSE endpoint and notification triggers
- `shared/mysql-schema.ts` - Database schema

### **Frontend:**
- `client/src/contexts/NotificationContext.tsx` - State management
- `client/src/hooks/useNotifications.ts` - SSE connection and event handling
- `client/src/components/notification-dropdown.tsx` - UI component
- `client/src/components/header.tsx` - Integration point
- `client/src/App.tsx` - Provider setup

### **Database:**
- `migrations/0003_add_notifications_table.sql` - PostgreSQL migration
- `migrations/0004_add_notifications_table.sql` - Alternative migration

---

**Last Updated:** October 14, 2025  
**Reviewed By:** GitHub Copilot
