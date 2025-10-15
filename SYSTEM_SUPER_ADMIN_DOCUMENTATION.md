# System Super Admin - Multi-Tenant Cross-Organization Management

## Overview

This implementation provides a **true system-level Super Admin** that sits above all organizations in the multi-tenant system. This is separate from organization admins and provides cross-organization visibility and control.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│               SYSTEM SUPER ADMIN (Developer)                │
│                   isSuperAdmin = true                       │
│                                                             │
│  • Manages ALL organizations                               │
│  • Views ALL users across organizations                     │
│  • System-wide statistics                                  │
│  • Can activate/deactivate organizations                   │
│  • Can modify any user's status                            │
│  • Promote users to super admin                            │
└─────────────────────┬───────────────────────────────────────┘
                      │
        ┌─────────────┴──────────────┬────────────┐
        │                            │            │
┌───────▼────────┐         ┌─────────▼────────┐  │
│ Organization A │         │ Organization B   │  │ ...
│ (Tenant 1)     │         │ (Tenant 2)       │  │
├────────────────┤         ├──────────────────┤  │
│ • Org Admin    │         │ • Org Admin      │  │
│ • Users        │         │ • Users          │  │
│ • Data         │         │ • Data           │  │
└────────────────┘         └──────────────────┘  │
```

## Key Differences

### Before (Organization-Scoped Super Admin)
- `/super-admin` route
- Only sees users within their organization
- Organization admin can access
- Statistics limited to one organization

### After (System-Level Super Admin)
- `/system-super-admin` route
- Sees **ALL** users across **ALL** organizations
- Only accessible to users with `isSuperAdmin = true`
- System-wide statistics across all tenants
- Can manage organizations themselves

## Database Changes

### New Field: `users.is_super_admin`

```sql
ALTER TABLE users ADD COLUMN is_super_admin BOOLEAN DEFAULT false;
CREATE INDEX idx_users_super_admin ON users(is_super_admin) WHERE is_super_admin = true;
```

This field marks users as system-level super administrators, separate from the `role` field which is organization-specific.

## API Endpoints

### System Super Admin Endpoints

All require `isSuperAdmin = true`

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/super-admin/organizations` | GET | Get all organizations with stats |
| `/api/super-admin/system-statistics` | GET | System-wide statistics |
| `/api/super-admin/all-users` | GET | Get all users across all orgs |
| `/api/super-admin/all-users?organizationId=X` | GET | Get users for specific org |
| `/api/super-admin/organizations/:id/status` | PUT | Activate/deactivate organization |
| `/api/super-admin/organizations/:id` | PUT | Update organization details |
| `/api/super-admin/users/:userId/status` | PUT | Change any user's status |
| `/api/super-admin/users/:userId/promote-super-admin` | PUT | Promote user to super admin |
| `/api/super-admin/global-activity` | GET | Activity across all organizations |

### Organization Admin Endpoints

Kept for backward compatibility (organization-scoped):

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/super-admin/statistics` | GET | Org-specific statistics |
| `/api/super-admin/active-users` | GET | Org users only |
| `/api/super-admin/user-locations` | GET | Org user locations |
| `/api/super-admin/bulk-status-change` | POST | Bulk change within org |
| `/api/super-admin/force-logout/:userId` | POST | Force logout within org |

## Authentication & Authorization

### Middleware

```typescript
// Super Admin Middleware
const requireSuperAdmin = async (req, res, next) => {
  const user = await storage.getUser(userId);
  
  if (!user || !user.isSuperAdmin) {
    return res.status(403).json({ message: "Super Admin access required" });
  }
  
  req.currentUser = user;
  next();
};
```

### Access Control

- **Regular Users**: Access to their own data only
- **Organization Admins**: Access to their organization's data
- **System Super Admins**: Access to ALL organizations and users

## UI Components

### System Super Admin Dashboard

**File**: `client/src/pages/system-super-admin.tsx`

**Features**:
- System-wide statistics (organizations, users, tasks, files)
- Three tabs: Overview, Organizations, All Users
- Organization management (activate/deactivate)
- Cross-organization user management
- Export capabilities

**Access Check**:
```tsx
const isSuperAdmin = dbUser?.isSuperAdmin === true;

if (!isSuperAdmin) {
  return <AccessDenied />;
}
```

### Sidebar Integration

**File**: `client/src/components/sidebar.tsx`

Shows "System Admin" link **only** for super admins:

```tsx
{isSuperAdmin && (
  <Link href="/system-super-admin">
    <div className="...red-styled...">
      <Shield /> System Admin
      <Badge>SYSTEM</Badge>
    </div>
  </Link>
)}
```

Visual distinction:
- Red colored for system level
- "SYSTEM" badge
- Border to stand out
- Appears at top of navigation

## Organization Management

### View All Organizations

```
┌──────────────────────────────────────────────────────────┐
│ Organization    │ Domain │ Status  │ Users │ Tasks       │
├──────────────────────────────────────────────────────────┤
│ Company A       │ a.com  │ Active  │ 45/50 │ 234 (85%)  │
│ Company B       │ b.com  │ Active  │ 23/50 │ 156 (92%)  │
│ Company C       │ c.com  │ Inactive│ 12/50 │ 45 (67%)   │
└──────────────────────────────────────────────────────────┘
```

### Activate/Deactivate Organization

When an organization is deactivated:
- All its users cannot log in
- Data is preserved
- Can be reactivated anytime
- Admin receives confirmation dialog

### Organization Statistics

- Total users vs max users (subscription limit)
- Active users count
- Task completion rate
- Created date
- Plan type (free, pro, enterprise)

## User Management Across Organizations

### View All Users

Filter options:
- **By Organization**: Dropdown to select specific org or "All"
- **By Status**: Active, Inactive, Suspended
- **Search**: By name, email, or organization name

### User Table Columns

- User (name + email)
- Organization (name + domain)
- Role (user/admin)
- Status (active/inactive/suspended)
- Super Admin (Yes/No badge)
- Last Login
- Actions (change status dropdown)

### Change User Status

Super admin can change any user's status across any organization:

```tsx
<Select
  value={user.status}
  onValueChange={(value) =>
    changeUserStatusMutation.mutate({ 
      userId: user.id, 
      status: value 
    })
  }
>
  <SelectItem value="active">Active</SelectItem>
  <SelectItem value="inactive">Inactive</SelectItem>
  <SelectItem value="suspended">Suspended</SelectItem>
</Select>
```

## System-Wide Statistics

### Overview Tab

Shows aggregated stats across all organizations:

```
┌─────────────────────────────────────────┐
│  Organizations: 15 (13 active)          │
│  Total Users: 1,234 (92% active)        │
│  Total Tasks: 5,678 (87% completed)     │
│  Files Uploaded: 12,345                 │
└─────────────────────────────────────────┘
```

### By Organization Breakdown

Lists each organization with:
- User count
- Active task count
- Allows quick comparison between tenants

## Security Features

### Access Control
- Only users with `is_super_admin = true` can access
- Access denied message for regular admins
- All API endpoints check super admin status

### Organization Isolation
- Regular admins cannot see other organizations
- Super admins can see all but data is clearly labeled by org
- Prevents accidental cross-organization data access

### Audit Trail
- All organization status changes logged
- All user status changes tracked
- Cross-organization actions are recorded

## How to Create a Super Admin

### Method 1: Direct Database Update

```sql
UPDATE users 
SET is_super_admin = true 
WHERE email = 'developer@yourcompany.com';
```

### Method 2: Via API (by existing super admin)

```bash
curl -X PUT /api/super-admin/users/:userId/promote-super-admin \
  -H "Content-Type: application/json" \
  -d '{"isSuperAdmin": true}'
```

### Method 3: During User Creation

```typescript
await storage.createUser({
  email: "developer@company.com",
  firstName: "System",
  lastName: "Admin",
  role: "admin",
  isSuperAdmin: true,
  organizationId: null, // Super admins can be org-independent
});
```

## Migration Path

### Step 1: Run Migration

```bash
# Run the migration script
npm run migrate

# Or manually:
psql -d your_database -f migrations/0008_add_super_admin_field.sql
```

### Step 2: Promote Initial Super Admin

```sql
UPDATE users 
SET is_super_admin = true 
WHERE email = 'your-dev-email@company.com';
```

### Step 3: Verify Access

1. Log in with the promoted user
2. Check sidebar for "System Admin" link (red with SYSTEM badge)
3. Navigate to `/system-super-admin`
4. Verify you can see all organizations

## Use Cases

### 1. Monitor All Tenants

Super admin can see health of all organizations:
- Which orgs are most active
- Which orgs have high task completion
- Which orgs are approaching user limits

### 2. Troubleshoot Issues

When a customer reports a problem:
- Quickly switch to their organization view
- See their users and activity
- Check system health for that org

### 3. Manage Subscriptions

- View which orgs are on which plans
- See user count vs limits
- Identify orgs needing upgrades

### 4. Deactivate Inactive Organizations

- Find organizations with no activity
- Temporarily deactivate to free resources
- Reactivate when customer returns

### 5. Emergency User Management

- Suspend problematic users across any org
- Reset user status for support tickets
- Promote organization admins

## Best Practices

### Security

1. **Limit Super Admin Accounts**: Only create for developers/system administrators
2. **Use Strong Authentication**: Require 2FA for super admin accounts
3. **Audit Everything**: Log all super admin actions
4. **Regular Review**: Periodically review who has super admin access

### Operations

1. **Communicate Changes**: Notify organization admins before deactivating
2. **Document Reasons**: Always document why an org was deactivated
3. **Set Limits**: Define clear policies for intervention
4. **Monitor Usage**: Track super admin actions for compliance

### Data Privacy

1. **Minimal Access**: Only access org data when necessary
2. **Respect Boundaries**: Don't browse user data unnecessarily
3. **Follow Regulations**: Comply with GDPR, privacy laws
4. **Log Access**: Record when super admin views org data

## Troubleshooting

### "Access Denied" Message

**Problem**: Super admin link not showing or access denied

**Solutions**:
1. Check `is_super_admin` field in database
2. Clear browser cache and cookies
3. Log out and log back in
4. Verify migration ran successfully

### Cannot See All Organizations

**Problem**: Only seeing one organization

**Solutions**:
1. Confirm using `/system-super-admin` route, not `/super-admin`
2. Check API endpoint is called correctly
3. Verify middleware is checking `isSuperAdmin` not just `role`

### Organization Deactivation Not Working

**Problem**: Users still can log in after deactivation

**Solutions**:
1. Check if `isActive` check is in authentication flow
2. Verify organization status in database
3. Clear user sessions
4. Check if caching is causing stale data

## Files Modified/Created

### New Files
- `client/src/pages/system-super-admin.tsx` - System admin dashboard
- `migrations/0008_add_super_admin_field.sql` - Database migration
- `SYSTEM_SUPER_ADMIN_DOCUMENTATION.md` - This file

### Modified Files
- `shared/schema.ts` - Added `isSuperAdmin` field
- `server/routes.ts` - Added super admin middleware and endpoints
- `server/storage.ts` - Added cross-organization methods
- `client/src/App.tsx` - Added `/system-super-admin` route
- `client/src/components/sidebar.tsx` - Added system admin link

## Summary

The System Super Admin feature provides a secure, comprehensive way to manage a multi-tenant system. It maintains clear separation between:

- **Regular Users**: Their own data
- **Organization Admins**: Their organization's data
- **System Super Admins**: All organizations and users

This architecture ensures proper data isolation while giving developers/system administrators the tools they need to manage the platform effectively.
