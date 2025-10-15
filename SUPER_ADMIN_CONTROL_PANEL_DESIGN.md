# Super Admin Control Panel - Functional Design Document

## Overview
A comprehensive Super Admin dashboard to monitor, control, and manage all users, their activities, locations, and system-wide statistics in real-time.

---

## 1. Core Features & Functionality

### 1.1 Active Users Monitoring
**Real-time Active User Tracking**
- Display currently logged-in users with live status indicators
- Show last activity timestamp (e.g., "Active 2 minutes ago")
- Auto-refresh every 30 seconds
- Filter by:
  - Active/Inactive status
  - Organization
  - Role (admin/user)
  - Department

**User Session Management**
- View all active sessions per user
- See multiple device sessions for same user
- Force logout capability for security purposes
- Session duration tracking
- Concurrent login detection and alerts

### 1.2 User Location Tracking
**Geographic Distribution Dashboard**
- Interactive world map showing user locations
- Real-time login location tracking based on IP address
- Location details stored from `userLoginLogs.location` field:
  ```json
  {
    "country": "United States",
    "region": "California",
    "city": "San Francisco",
    "lat": 37.7749,
    "lng": -122.4194
  }
  ```
- Features:
  - Cluster markers for multiple users in same location
  - Heat map overlay for login density
  - Filter by date range, organization, or user
  - Suspicious location alerts (e.g., login from unusual country)
  - Geofencing rules (optional: restrict access by location)

**Device & Browser Analytics**
- Device type distribution (Desktop/Mobile/Tablet)
- Browser usage statistics
- Operating system breakdown
- Trusted vs untrusted device ratio

### 1.3 User Activation/Deactivation Control
**Bulk User Management**
- Mass activate/deactivate users
- Suspend accounts temporarily
- Permanent account deactivation
- Reactivation workflow with approval process

**Individual User Control**
- Toggle user status: `active` → `inactive` → `suspended`
- Status change logging with reason and timestamp
- Automatic notification to user email on status change
- Impact analysis before deactivation (e.g., show pending tasks)

**Automated Actions**
- Auto-suspend users inactive for X days
- Auto-deactivate users who haven't logged in for X days
- Scheduled activation/deactivation (e.g., for contractors)

### 1.4 User Count Statistics
**Real-Time Counters**
```
┌─────────────────────────────────────────┐
│  Total Users: 1,247                     │
│  Active Users: 1,156 (92.7%)            │
│  Inactive Users: 61 (4.9%)              │
│  Suspended Users: 30 (2.4%)             │
│  Currently Online: 342                  │
└─────────────────────────────────────────┘
```

**Segmented Statistics**
- Users by organization
- Users by role (Admin vs Regular User)
- Users by department
- New users (today/week/month)
- Churned users (deactivated this month)
- Growth trend chart (last 12 months)

**User Demographics**
- Average users per organization
- Peak active hours (hourly activity distribution)
- User retention rate
- Average session duration

### 1.5 Data Count Metrics
**System-Wide Data Statistics**
```
┌──────────────────────────────────────────────┐
│  Total Flow Rules: 342                       │
│  Total Tasks Created: 15,678                 │
│  Active Tasks: 1,234                         │
│  Completed Tasks: 13,890                     │
│  Overdue Tasks: 554                          │
│  Total Form Templates: 89                    │
│  Total Form Responses: 48,932                │
│  Total Organizations: 47                     │
└──────────────────────────────────────────────┘
```

**Per-Organization Data Breakdown**
- Tasks created per organization
- Form responses per organization
- Storage usage per organization (MongoDB GridFS data)
- API calls per organization (if tracking implemented)

**Data Growth Analytics**
- Daily/Weekly/Monthly data creation rates
- Trend charts for each data type
- Projection models for storage planning
- Data cleanup recommendations (old/unused data)

### 1.6 File Upload Count & Management
**File Upload Statistics**
Using MongoDB GridFS (`server/mongo/gridfs.ts`):

```typescript
File Upload Metrics:
├── Total Files Uploaded: 8,456
├── Total Storage Used: 42.3 GB
├── Average File Size: 5.1 MB
├── Largest File: 250 MB
├── Files by Type:
│   ├── PDF: 3,245 (38%)
│   ├── Images: 2,890 (34%)
│   ├── Word Docs: 1,456 (17%)
│   ├── Excel: 865 (10%)
│   └── Others: 128 (1%)
└── Upload Activity:
    ├── Today: 45 files
    ├── This Week: 289 files
    └── This Month: 1,234 files
```

**File Management Features**
- View all uploaded files with metadata
- Search files by name, type, uploader, date
- Bulk delete capability for cleanup
- Orphaned file detection (files not linked to any task)
- Storage quota enforcement per organization
- File preview capability
- Download/Export file lists

**Storage Analytics**
- Storage usage by organization
- Storage growth trend
- Top uploaders (by file count and size)
- Duplicate file detection
- Storage optimization recommendations

---

## 2. Dashboard UI Layout

### 2.1 Main Dashboard View
```
┌─────────────────────────────────────────────────────────────────┐
│  SUPER ADMIN CONTROL PANEL                         [Refresh 🔄] │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  📊 QUICK STATS                                                  │
│  ┌──────────┬──────────┬──────────┬──────────┬──────────┐      │
│  │ 👥 Users │ 📍 Online│ 📋 Tasks │ 📁 Files │ 💾 Storage│      │
│  │  1,247   │   342    │  15,678  │  8,456   │   42.3GB  │      │
│  └──────────┴──────────┴──────────┴──────────┴──────────┘      │
│                                                                   │
│  🗺️ USER LOCATION MAP                        [Filters ▼]       │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                                                           │   │
│  │          [Interactive World Map Here]                    │   │
│  │          • Red markers = Active sessions                 │   │
│  │          • Blue markers = Recent logins                  │   │
│  │                                                           │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                   │
│  👤 ACTIVE USERS                                 [Search 🔍]     │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Name         Email         Location    Status    Actions  │  │
│  ├──────────────────────────────────────────────────────────┤  │
│  │ 🟢 John Doe  john@co.com   USA       Active    [Edit][🔒]│  │
│  │ 🟢 Jane Smith jane@co.com  UK        Active    [Edit][🔒]│  │
│  │ 🔴 Bob Jones bob@co.com    Offline   Inactive  [Edit][🔓]│  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Detailed Tabs Structure
```
┌─ Super Admin Dashboard ─────────────────────────────────────┐
│                                                              │
│  [Overview] [Users] [Sessions] [Locations] [Data] [Files]   │
│                                                              │
│  Tab Content Area                                           │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## 3. Technical Implementation

### 3.1 Database Schema Enhancements

**Add new table for Admin Actions Log:**
```typescript
export const adminActionLogs = pgTable("admin_action_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  adminUserId: varchar("admin_user_id").notNull().references(() => users.id),
  targetUserId: varchar("target_user_id").references(() => users.id),
  action: varchar("action").notNull(), // activate, deactivate, suspend, force_logout
  reason: text("reason"),
  previousState: jsonb("previous_state"),
  newState: jsonb("new_state"),
  ipAddress: varchar("ip_address"),
  timestamp: timestamp("timestamp").defaultNow(),
});
```

**Add tracking fields to users table** (already exists):
- ✅ `lastLoginAt` - Track last activity
- ✅ `status` - active, inactive, suspended
- Add: `lastActiveAt` - Track last API call/interaction
- Add: `failedLoginAttempts` - Security tracking
- Add: `accountLockedUntil` - Auto-suspension

### 3.2 Backend API Endpoints

```typescript
// User Management & Monitoring
GET  /api/admin/users/active                    // Get all active users
GET  /api/admin/users/online                    // Get currently online users
GET  /api/admin/users/:id/sessions              // Get user's active sessions
POST /api/admin/users/:id/force-logout          // Force logout user
PUT  /api/admin/users/:id/status                // Change user status (existing)
POST /api/admin/users/bulk-activate             // Bulk activate users
POST /api/admin/users/bulk-deactivate           // Bulk deactivate users

// Statistics & Analytics
GET  /api/admin/statistics/users                // User count statistics
GET  /api/admin/statistics/data                 // Data count metrics
GET  /api/admin/statistics/files                // File upload statistics
GET  /api/admin/statistics/storage              // Storage usage by org
GET  /api/admin/statistics/growth               // Growth trends

// Location & Session Tracking
GET  /api/admin/locations/active                // Active user locations
GET  /api/admin/locations/history               // Historical location data
GET  /api/admin/sessions/active                 // All active sessions
GET  /api/admin/sessions/:sessionId/terminate   // Terminate specific session

// File Management
GET  /api/admin/files                           // List all files with filters
GET  /api/admin/files/orphaned                  // Find orphaned files
DELETE /api/admin/files/:fileId                 // Delete specific file
POST /api/admin/files/bulk-delete               // Bulk delete files

// Activity Monitoring
GET  /api/admin/activities/recent               // Recent user activities
GET  /api/admin/activities/suspicious           // Suspicious activities
GET  /api/admin/audit-logs                      // Admin action logs
```

### 3.3 Real-Time Updates

**WebSocket Implementation for Live Updates:**
```typescript
// Server-side (server/notifications.ts enhancement)
io.on('connection', (socket) => {
  // Super admin room
  if (socket.data.user.role === 'admin') {
    socket.join('super-admin-room');
    
    // Broadcast user status changes
    socket.on('user-status-changed', (data) => {
      io.to('super-admin-room').emit('user-status-update', data);
    });
    
    // Broadcast new logins
    socket.on('user-logged-in', (data) => {
      io.to('super-admin-room').emit('active-users-update', data);
    });
  }
});
```

**Client-side (React hooks):**
```typescript
// hooks/useSuperAdminMonitoring.ts
export function useSuperAdminMonitoring() {
  const [activeUsers, setActiveUsers] = useState([]);
  const [statistics, setStatistics] = useState({});
  
  useEffect(() => {
    const socket = io();
    
    socket.on('active-users-update', (data) => {
      setActiveUsers(data);
    });
    
    socket.on('statistics-update', (data) => {
      setStatistics(data);
    });
    
    return () => socket.disconnect();
  }, []);
  
  return { activeUsers, statistics };
}
```

### 3.4 Security & Permissions

**Role-Based Access Control:**
```typescript
// Add "superadmin" role
export const users = pgTable("users", {
  // ... existing fields
  role: varchar("role").default("user"), // user, admin, superadmin
  permissions: jsonb("permissions"), // Fine-grained permissions
});

// Middleware
const requireSuperAdmin = async (req: any, res: any, next: any) => {
  const user = await storage.getUser(req.session.user.id);
  if (user?.role !== 'superadmin') {
    return res.status(403).json({ 
      message: "Super admin access required" 
    });
  }
  next();
};
```

**Audit Trail:**
- Log every super admin action
- Include timestamp, admin ID, action type, target user
- Store before/after states for critical changes
- Retention policy: Keep logs for 1 year minimum

---

## 4. Frontend Components

### 4.1 Page Structure

**New Page: `client/src/pages/super-admin-dashboard.tsx`**
```tsx
import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";

export default function SuperAdminDashboard() {
  return (
    <div className="container mx-auto p-6">
      <h1>Super Admin Control Panel</h1>
      
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="users">User Management</TabsTrigger>
          <TabsTrigger value="locations">Locations</TabsTrigger>
          <TabsTrigger value="data">Data Metrics</TabsTrigger>
          <TabsTrigger value="files">File Management</TabsTrigger>
          <TabsTrigger value="audit">Audit Logs</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview">
          <StatisticsOverview />
          <ActiveUsersMap />
        </TabsContent>
        
        <TabsContent value="users">
          <UserManagementTable />
        </TabsContent>
        
        {/* Other tabs */}
      </Tabs>
    </div>
  );
}
```

### 4.2 Key Components

**1. StatisticsOverview Component**
```tsx
<StatisticsOverview />
```
- Display metric cards with counts
- Real-time updates via WebSocket
- Trend indicators (↑/↓)
- Click to drill down

**2. ActiveUsersMap Component**
```tsx
<ActiveUsersMap />
```
- Use `react-leaflet` or `mapbox-gl`
- Plot users on world map
- Cluster markers for density
- Click marker to see user details

**3. UserManagementTable Component**
```tsx
<UserManagementTable />
```
- Sortable, filterable table
- Inline editing
- Bulk action checkboxes
- Status toggle switches
- Action buttons (Edit, Deactivate, Force Logout)

**4. FileManagementViewer Component**
```tsx
<FileManagementViewer />
```
- File grid/list view
- File type filters
- Size sorting
- Bulk delete with confirmation
- Preview capability

**5. ActivityFeed Component**
```tsx
<ActivityFeed />
```
- Real-time activity stream
- Color-coded by action type
- Filter by user, action, date
- Suspicious activity highlights

---

## 5. Data Visualization

### 5.1 Charts & Graphs

**1. User Growth Chart**
- Line chart showing user registration over time
- Compare active vs total users
- Monthly/Yearly view toggle

**2. Activity Heatmap**
- Calendar heatmap showing login activity
- Identify peak usage times
- Spot anomalies

**3. Location Distribution**
- Pie chart of users by country
- Bar chart of users by organization
- Geographic clustering analysis

**4. File Upload Trends**
- Area chart showing upload volume
- File type distribution (pie chart)
- Storage growth projection

**5. Task Completion Metrics**
- Funnel chart for task flow
- Completion rate by organization
- Average resolution time trends

### 5.2 Real-Time Indicators

**Live Status Badges:**
```tsx
<Badge variant={user.isOnline ? "success" : "secondary"}>
  {user.isOnline ? "🟢 Online" : "⚫ Offline"}
</Badge>
```

**Activity Pulse Animation:**
```css
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.active-indicator {
  animation: pulse 2s infinite;
}
```

---

## 6. Advanced Features (Future Enhancements)

### 6.1 Predictive Analytics
- Machine learning models to predict:
  - User churn risk
  - Peak usage times
  - Storage capacity needs
  - Security threats

### 6.2 Automated Alerts
- Email/SMS alerts for:
  - Suspicious login attempts
  - Multiple failed logins
  - Login from new location
  - Unusual data access patterns
  - Storage quota exceeded

### 6.3 Custom Dashboards
- Allow super admins to create custom views
- Drag-and-drop widget arrangement
- Save multiple dashboard layouts
- Export reports to PDF/Excel

### 6.4 Advanced Security
- Two-factor authentication enforcement
- IP whitelisting/blacklisting
- Session timeout policies
- Password strength requirements
- Account lockout policies

### 6.5 Compliance & Reporting
- GDPR compliance tools (data export, deletion)
- Automated compliance reports
- Data retention policies
- User consent management
- Access request handling

---

## 7. Implementation Priority

### Phase 1 (Week 1-2): Foundation
- [ ] Create database schema enhancements
- [ ] Implement basic API endpoints
- [ ] Build super admin role/permission system
- [ ] Create basic dashboard page structure

### Phase 2 (Week 3-4): Core Features
- [ ] User management table with activate/deactivate
- [ ] Real-time user count statistics
- [ ] Basic file upload statistics
- [ ] Data count metrics dashboard

### Phase 3 (Week 5-6): Advanced Monitoring
- [ ] Active user tracking with sessions
- [ ] Location tracking and map visualization
- [ ] Activity feed and audit logs
- [ ] WebSocket real-time updates

### Phase 4 (Week 7-8): Polish & Optimization
- [ ] File management interface
- [ ] Advanced charts and visualizations
- [ ] Bulk operations
- [ ] Performance optimization
- [ ] Testing and bug fixes

---

## 8. Security Considerations

### 8.1 Access Control
- Only users with `role: 'superadmin'` can access super admin panel
- Implement IP-based access restrictions (optional)
- Require re-authentication for sensitive actions
- Time-limited admin sessions

### 8.2 Data Privacy
- Mask sensitive user data (partial email, phone)
- Log all data access for audit
- Implement data retention policies
- GDPR-compliant data handling

### 8.3 Action Safety
- Confirmation dialogs for destructive actions
- Reversible operations where possible
- Bulk action limits (max 100 users at once)
- Rate limiting on admin endpoints

---

## 9. Performance Optimization

### 9.1 Database Optimization
```sql
-- Add indexes for fast queries
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_last_login ON users(last_login_at);
CREATE INDEX idx_login_logs_user_time ON user_login_logs(user_id, login_time);
CREATE INDEX idx_tasks_org_status ON tasks(organization_id, status);
```

### 9.2 Caching Strategy
- Cache user count statistics (Redis, 5-minute TTL)
- Cache file statistics (10-minute TTL)
- Implement query result caching
- Use server-side pagination for large lists

### 9.3 Query Optimization
- Use aggregation queries for statistics
- Batch operations where possible
- Implement cursor-based pagination
- Use database views for complex queries

---

## 10. Testing Requirements

### 10.1 Unit Tests
- Test all API endpoints
- Test role-based access control
- Test data aggregation functions

### 10.2 Integration Tests
- Test user activation/deactivation flow
- Test real-time updates
- Test bulk operations

### 10.3 Performance Tests
- Load test with 10,000+ users
- Test real-time dashboard with 500+ concurrent admins
- Test file upload statistics with 100,000+ files

### 10.4 Security Tests
- Test unauthorized access attempts
- Test SQL injection prevention
- Test XSS prevention
- Test CSRF protection

---

## Conclusion

This Super Admin Control Panel will provide comprehensive oversight and control over the entire Process Sutra system. It combines real-time monitoring, powerful analytics, and efficient management tools to ensure optimal system operation and user management.

The phased implementation approach allows for incremental delivery while maintaining system stability and allows for feedback-driven improvements throughout development.
