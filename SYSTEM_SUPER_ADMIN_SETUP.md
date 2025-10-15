# System Super Admin - Quick Setup Guide

## What's Changed?

✅ **System Super Admin** is now separate from Organization Admin
✅ Multi-tenant: Manage ALL organizations from one place
✅ New route: `/system-super-admin` (separate from `/super-admin`)
✅ Only visible to users with `isSuperAdmin = true`

## Setup Steps

### 1. Run Database Migration

```bash
# Apply migration
npm run migrate

# OR manually run:
psql -d your_database -f migrations/0008_add_super_admin_field.sql
```

This adds the `is_super_admin` column to the `users` table.

### 2. Promote Your First Super Admin

```sql
-- Replace with your developer email
UPDATE users 
SET is_super_admin = true 
WHERE email = 'developer@yourcompany.com';
```

### 3. Log In and Access

1. Log in with the promoted user
2. Look for **"System Admin"** link in sidebar (red with shield icon)
3. Click to access `/system-super-admin`
4. You should see ALL organizations

## Access Levels

### Level 1: Regular User
- **Route**: `/` (Dashboard, Tasks, Analytics)
- **Access**: Own data only
- **Badge**: None

### Level 2: Organization Admin
- **Route**: `/super-admin` (Organization Control Panel)
- **Access**: All users/data in their organization
- **Badge**: "Admin Access" (blue)
- **Field**: `role = 'admin'`

### Level 3: System Super Admin
- **Route**: `/system-super-admin` (System Control Panel)
- **Access**: ALL organizations, ALL users
- **Badge**: "System Admin" (red)
- **Field**: `isSuperAdmin = true`

## Visual Differences

### In Sidebar

**Regular Admin** sees:
```
☰ Menu
  Dashboard
  My Tasks
  My Performance
  ─────────────
  Super Admin (orange badge "Control")  ← Organization level
  Flow Management
  ...
  [Admin Access] (blue box)
```

**System Super Admin** sees:
```
☰ Menu
  [System Admin] (red box "SYSTEM")  ← NEW! System level
  ─────────────
  Dashboard
  My Tasks
  My Performance
  ─────────────
  Super Admin (orange badge "Control")  ← Organization level
  Flow Management
  ...
  [Admin Access] (blue box)
  [System Admin] (red box)  ← Indicator
```

## Key Features

### System Super Admin Can:

✅ View all organizations
✅ Activate/deactivate entire organizations
✅ See users across ALL organizations
✅ Change any user's status (active/inactive/suspended)
✅ View system-wide statistics
✅ Export data for all organizations
✅ Promote other users to super admin

### Organization Admin Can:

✅ View users in their organization only
✅ Manage users within their organization
✅ See organization-specific statistics
✅ Cannot see other organizations
✅ Cannot access system super admin panel

## API Endpoints Comparison

### System Super Admin (`isSuperAdmin = true`)

```
GET  /api/super-admin/organizations           // All orgs
GET  /api/super-admin/system-statistics       // System-wide stats
GET  /api/super-admin/all-users               // All users
GET  /api/super-admin/all-users?organizationId=X  // Filter by org
PUT  /api/super-admin/organizations/:id/status    // Toggle org
PUT  /api/super-admin/users/:id/status        // Change any user
PUT  /api/super-admin/users/:id/promote-super-admin  // Promote
```

### Organization Admin (`role = 'admin'`)

```
GET  /api/super-admin/statistics              // Org stats only
GET  /api/super-admin/active-users            // Org users only
POST /api/super-admin/bulk-status-change      // Org users only
```

## Quick Commands

### Check Who Is Super Admin

```sql
SELECT email, first_name, last_name, is_super_admin 
FROM users 
WHERE is_super_admin = true;
```

### Promote User to Super Admin

```sql
UPDATE users 
SET is_super_admin = true 
WHERE email = 'user@example.com';
```

### Demote Super Admin

```sql
UPDATE users 
SET is_super_admin = false 
WHERE email = 'user@example.com';
```

### View All Organizations

```sql
SELECT name, domain, is_active, plan_type, created_at 
FROM organizations 
ORDER BY created_at DESC;
```

## Common Tasks

### 1. View All Organizations

1. Go to `/system-super-admin`
2. Click "Organizations" tab
3. See table with all orgs, users, tasks

### 2. Deactivate an Organization

1. Go to Organizations tab
2. Click the eye/eye-off icon next to org
3. Confirm deactivation
4. All users in that org will be unable to log in

### 3. View Users Across All Organizations

1. Go to "All Users" tab
2. Use "Organization" dropdown to filter or select "All"
3. Search by name, email, or organization

### 4. Change User Status (Any Organization)

1. Go to "All Users" tab
2. Find the user
3. Use the status dropdown in Actions column
4. Select Active/Inactive/Suspended

### 5. Export All Data

**Organizations**:
- Go to Organizations tab
- Click "Export" button
- CSV downloads with all org data

**Users**:
- Go to All Users tab
- Apply filters if needed
- Click "Export" button
- CSV downloads with filtered users

## Security Notes

⚠️ **Important**: Super Admin has access to ALL data

- Limit super admin accounts to developers only
- Document all super admin actions
- Use strong authentication (2FA recommended)
- Regular audits of who has super admin access
- Never share super admin credentials

## Troubleshooting

### Problem: "Access Denied" on System Super Admin Page

**Solution**:
```sql
-- Check if user is super admin
SELECT is_super_admin FROM users WHERE email = 'your@email.com';

-- If false, promote:
UPDATE users SET is_super_admin = true WHERE email = 'your@email.com';

-- Log out and log back in
```

### Problem: System Admin Link Not Showing in Sidebar

**Solutions**:
1. Clear browser cache
2. Log out and log back in
3. Check `dbUser?.isSuperAdmin` in console
4. Verify database migration ran

### Problem: Can Only See One Organization

**Solution**:
- Make sure you're on `/system-super-admin` NOT `/super-admin`
- `/super-admin` is organization-scoped
- `/system-super-admin` is system-wide

## Testing

### Test Super Admin Access

1. Promote a test user to super admin
2. Log in with that user
3. Verify you see "System Admin" link (red)
4. Click and verify you see all organizations
5. Verify you can see users from different organizations

### Test Access Control

1. Log in as regular admin (no super admin)
2. Try accessing `/system-super-admin`
3. Should see "Access Denied" message
4. Verify cannot see system admin link in sidebar

### Test Organization Toggle

1. Go to Organizations tab
2. Deactivate a test organization
3. Try logging in as user from that org
4. Should be denied access
5. Reactivate organization
6. User should be able to log in again

## Files to Review

**Backend**:
- `server/routes.ts` - API endpoints
- `server/storage.ts` - Database methods
- `shared/schema.ts` - Database schema

**Frontend**:
- `client/src/pages/system-super-admin.tsx` - Main UI
- `client/src/components/sidebar.tsx` - Navigation
- `client/src/App.tsx` - Routing

**Database**:
- `migrations/0008_add_super_admin_field.sql` - Migration

## Next Steps After Setup

1. ✅ Run migration
2. ✅ Promote your first super admin
3. ✅ Test access to system super admin panel
4. ✅ Verify you can see all organizations
5. ✅ Test organization activate/deactivate
6. ✅ Test cross-organization user management
7. ✅ Set up additional super admins if needed
8. ✅ Document your super admin policies
9. ✅ Set up audit logging (if needed)
10. ✅ Train team on proper usage

## Summary

You now have two levels of admin:

1. **Organization Admin** (`/super-admin`)
   - Manages their own organization
   - Customers see this

2. **System Super Admin** (`/system-super-admin`)
   - Manages ALL organizations
   - Developers use this
   - Hidden from customers

The system is designed to keep customer organizations isolated while giving you, as the developer, full visibility and control over the entire platform.
