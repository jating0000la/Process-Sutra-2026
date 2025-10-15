# Super Admin Control Panel - Visual Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      SUPER ADMIN CONTROL PANEL                              │
│                                                                             │
│  Navigation: Sidebar → Super Admin (Shield Icon + "Control" Badge)         │
│  Access Level: Admin Only                                                   │
│  Auto-Refresh: ✓ Every 30-60 seconds                                       │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                          STATISTICS DASHBOARD                               │
├────────────────────┬────────────────────┬────────────────────┬──────────────┤
│   TOTAL USERS      │  CURRENTLY ONLINE  │      TASKS         │ DATA & FILES │
│                    │                    │                    │              │
│      1,247         │        342         │      2,458         │    1,523     │
│   92.7% active     │  Active last 10min │  85% completion    │ File uploads │
│                    │                    │                    │              │
│  ✓ Active: 1,156   │  Today: 425 logins │  Pending: 245      │ 3,456 forms  │
│  ⊘ Inactive: 61    │                    │  Overdue: 123      │              │
│  ✕ Suspended: 30   │                    │                    │              │
└────────────────────┴────────────────────┴────────────────────┴──────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                      DISTRIBUTION & ANALYTICS                               │
├──────────────────────────┬──────────────────────────┬────────────────────────┤
│   DEVICE DISTRIBUTION    │   TOP LOGIN LOCATIONS    │  USERS BY DEPARTMENT   │
│                          │                          │                        │
│  🖥️  Desktop: 856        │  🌍 United States: 542   │  Sales: 500            │
│  📱 Mobile: 312          │  🌍 India: 287           │  Marketing: 300        │
│  📲 Tablet: 79           │  🌍 UK: 156              │  Engineering: 247      │
│                          │  🌍 Canada: 98           │  Support: 150          │
│  🛡️  Trusted: 85%        │  🌍 Germany: 64          │  HR: 50                │
└──────────────────────────┴──────────────────────────┴────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                          USER MANAGEMENT                                    │
│                                                                             │
│  🔍 Search: [________________]  Status: [All ▼]  Role: [All ▼]            │
│                                                                             │
│  ⚡ Bulk Actions: 3 users selected   [Bulk Actions]  [Clear Selection]    │
│                                                                             │
├──┬─────────────────┬──────┬────────────┬────────┬────────┬─────────────────┤
│☐ │ USER            │ ROLE │ DEPARTMENT │ STATUS │ ONLINE │ LAST LOGIN      │
├──┼─────────────────┼──────┼────────────┼────────┼────────┼─────────────────┤
│☑ │ John Doe        │Admin │ IT         │Active  │🟢Online│ 2 mins ago      │
│  │ john@company.com│      │            │        │        │ 📍 San Francisco│
│  │                 │      │            │        │        │ 🖥️ Desktop      │
├──┼─────────────────┼──────┼────────────┼────────┼────────┼─────────────────┤
│☑ │ Jane Smith      │User  │ Sales      │Active  │Offline │ 2 hours ago     │
│  │ jane@company.com│      │            │        │        │ 📍 New York     │
│  │                 │      │            │        │        │ 📱 Mobile       │
├──┼─────────────────┼──────┼────────────┼────────┼────────┼─────────────────┤
│☑ │ Bob Johnson     │User  │ Marketing  │Suspend │Offline │ Yesterday       │
│  │ bob@company.com │      │            │        │        │ 📍 London       │
│  │                 │      │            │        │        │ 🖥️ Desktop      │
└──┴─────────────────┴──────┴────────────┴────────┴────────┴─────────────────┘

                    [< Previous]  Page 1 of 42  [Next >]

  Actions Available:
  • Force Logout (🚪) - For online users only
  • Bulk Status Change - Select multiple users
  • Export to CSV - Current filter results
  • Search & Filter - Find specific users
```

## Functional Flow Diagram

```
                    ┌─────────────────────┐
                    │   Admin Logs In     │
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │  Navigate to        │
                    │  Super Admin Panel  │
                    └──────────┬──────────┘
                               │
        ┌──────────────────────┼──────────────────────┐
        │                      │                      │
┌───────▼────────┐  ┌──────────▼──────────┐  ┌───────▼────────┐
│ View Statistics│  │  Search/Filter Users│  │  Monitor Online│
│                │  │                     │  │      Users     │
│ • User counts  │  │ • By name/email    │  │                │
│ • Task metrics │  │ • By status        │  │ • Last 10 min  │
│ • Data counts  │  │ • By role          │  │ • Live badge   │
│ • Devices      │  │ • By department    │  │ • Location     │
│ • Locations    │  │                    │  │ • Device type  │
└────────────────┘  └──────────┬──────────┘  └───────┬────────┘
                               │                      │
                    ┌──────────▼──────────────────────▼────┐
                    │       Select Actions                 │
                    └──────────┬──────────────────────────┘
                               │
        ┌──────────────────────┼──────────────────────┐
        │                      │                      │
┌───────▼────────┐  ┌──────────▼──────────┐  ┌───────▼────────┐
│ Individual     │  │  Bulk Actions       │  │ Force Logout   │
│ Status Change  │  │                     │  │                │
│                │  │ • Select multiple   │  │ • Online users │
│ • Active       │  │ • Change status     │  │ • Immediate    │
│ • Inactive     │  │ • Validation checks │  │ • Security     │
│ • Suspended    │  │ • Bulk confirmation │  │   checks       │
└────────────────┘  └─────────────────────┘  └────────────────┘
                               │
                    ┌──────────▼──────────┐
                    │  Export Data (CSV)  │
                    │  • Filtered results │
                    │  • Timestamped file │
                    └─────────────────────┘
```

## API Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend Component                       │
│              client/src/pages/super-admin.tsx               │
│                                                             │
│  • Statistics Cards                                         │
│  • User Management Table                                    │
│  • Search & Filter UI                                       │
│  • Bulk Action Dialog                                       │
│  • Auto-refresh Logic                                       │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ TanStack Query (useQuery, useMutation)
                     │
┌────────────────────▼────────────────────────────────────────┐
│                      API Endpoints                          │
│                   server/routes.ts                          │
│                                                             │
│  GET  /api/super-admin/statistics                          │
│  GET  /api/super-admin/active-users                        │
│  GET  /api/super-admin/user-locations                      │
│  POST /api/super-admin/bulk-status-change                  │
│  POST /api/super-admin/force-logout/:userId                │
│  GET  /api/super-admin/activity-timeline                   │
│                                                             │
│  Middleware: isAuthenticated + requireAdmin                │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ Database Queries
                     │
┌────────────────────▼────────────────────────────────────────┐
│                    Data Layer                               │
│                  server/storage.ts                          │
│                                                             │
│  • getUsers(organizationId)                                │
│  • getTasks(organizationId)                                │
│  • getOrganizationLoginLogs(organizationId)                │
│  • getOrganizationDevices(organizationId)                  │
│  • changeUserStatus(userId, status)                        │
│  • getFormResponses(organizationId)                        │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │
┌────────────────────▼────────────────────────────────────────┐
│                   Databases                                 │
│                                                             │
│  PostgreSQL (Drizzle ORM)          MongoDB (GridFS)        │
│  • users                            • uploads.files        │
│  • userLoginLogs                    • file metadata        │
│  • userDevices                                             │
│  • tasks                                                   │
│  • formResponses                                           │
│  • flowRules                                               │
│  • organizations                                           │
└─────────────────────────────────────────────────────────────┘
```

## Data Flow: User Status Change

```
Admin selects users
        │
        ▼
Clicks "Bulk Actions"
        │
        ▼
Chooses new status (Active/Inactive/Suspended)
        │
        ▼
Confirms action
        │
        ▼
POST /api/super-admin/bulk-status-change
        │
        ├─► Validate: User authentication
        ├─► Validate: Admin role
        ├─► Validate: Same organization
        ├─► Validate: Not suspending all admins
        │
        ▼
Update each user in database
        │
        ├─► Success: Update users table
        ├─► Log: Track status change
        │
        ▼
Return results to frontend
        │
        ├─► Success count
        ├─► Failure count
        ├─► Individual results
        │
        ▼
Invalidate queries (TanStack)
        │
        ├─► Refetch statistics
        ├─► Refetch user list
        │
        ▼
Update UI with new data
        │
        ▼
Show success toast notification
```

## Security Model

```
┌─────────────────────────────────────────────────────────────┐
│                    Security Layers                          │
└─────────────────────────────────────────────────────────────┘

Layer 1: Authentication
├─► Firebase Auth session validation
├─► Session cookie verification
└─► Reject unauthenticated requests

Layer 2: Authorization
├─► Role check: Must be Admin
├─► Reject non-admin users
└─► Return 403 Forbidden

Layer 3: Organization Isolation
├─► Verify user's organizationId
├─► Filter data by organizationId
└─► Prevent cross-organization access

Layer 4: Business Rules
├─► Cannot suspend all admins
├─► Cannot suspend self
├─► Cannot force logout self
├─► Validate status transitions
└─► Validate bulk operation size

Layer 5: Audit & Logging
├─► Log all status changes
├─► Track who made changes
├─► Record timestamps
└─► Maintain change history
```

## Component Hierarchy

```
<AppLayout>
  └─ Super Admin Page
     ├─ Header Section
     │  ├─ Title & Description
     │  └─ Actions (Refresh, Export, Auto-refresh toggle)
     │
     ├─ Statistics Grid (4 cards)
     │  ├─ Total Users Card
     │  ├─ Currently Online Card
     │  ├─ Tasks Card
     │  └─ Data & Files Card
     │
     ├─ Distribution Grid (3 cards)
     │  ├─ Device Distribution Card
     │  ├─ Top Locations Card
     │  └─ Department Distribution Card
     │
     └─ User Management Card
        ├─ Filters Section
        │  ├─ Search Input
        │  ├─ Status Filter
        │  └─ Role Filter
        │
        ├─ Bulk Actions Bar (conditional)
        │  ├─ Selection count
        │  ├─ Bulk Actions button
        │  └─ Clear Selection button
        │
        ├─ User Table
        │  ├─ Header (with select all)
        │  └─ Rows (with checkboxes, badges, actions)
        │
        └─ Pagination Info
  
  Dialogs:
  └─ Bulk Action Dialog
     ├─ Status selector
     └─ Confirm/Cancel buttons
```

## Real-Time Update Flow

```
Time: T+0s  → Initial page load
              ├─ Fetch statistics
              ├─ Fetch active users
              └─ Fetch locations

Time: T+30s → Auto-refresh (if enabled)
              ├─ Refetch statistics
              └─ Refetch active users

Time: T+60s → Auto-refresh locations
              └─ Refetch user locations

User Action → Manual refresh
              ├─ Force refetch all data
              └─ Show toast notification

Status Change → Mutation success
              ├─ Invalidate queries
              ├─ Refetch affected data
              └─ Update UI immediately
```

This visual overview provides a comprehensive understanding of the Super Admin Control Panel's structure, data flow, security model, and user interactions.
