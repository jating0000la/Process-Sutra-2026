# User Management System Audit

**Date:** October 14, 2025  
**Application:** Process Sutra 2026  
**Audit Type:** Comprehensive Security & Functionality Review

---

## 📋 Executive Summary

The User Management system implements a **multi-tenant** architecture with **role-based access control (RBAC)**. The system is **functional and secure** with proper organization isolation, admin-only restrictions, and status-based access control. However, there are **critical gaps** including missing password management, no user deletion, and incomplete audit logging.

**Overall Security Rating:** 🟡 **MEDIUM** (6.5/10)

---

## 🏗️ System Architecture

### **1. Multi-Tenant Structure**

```
Organizations (Tenants)
  ├── Users (Employees/Members)
  ├── Flow Rules (Workflows)
  ├── Tasks (Work Items)
  ├── Form Templates
  └── Form Responses
```

**Organization Isolation:**
- ✅ Every user belongs to one organization
- ✅ Data queries filtered by `organizationId`
- ✅ Cross-organization data access prevented
- ✅ Admin can only manage users within their organization

**Organization Auto-Creation:**
```typescript
// From firebaseAuth.ts
async function getOrCreateOrganization(email: string) {
  // Gmail users: email becomes domain (e.g., "john@gmail.com")
  // Corporate users: email domain becomes org domain (e.g., "muxro.com")
  
  // First user becomes admin automatically
  // Subsequent users must be added by admin
}
```

---

### **2. User Roles**

**Two Roles:**
1. **`admin`** - Full access to organization resources
2. **`user`** - Limited access (own tasks and data only)

**Role Assignment:**
- First user of organization → **Auto-admin**
- Subsequent users → Added as **user** by default
- Admins can promote users to admin via UI

---

### **3. User Status System**

**Three Statuses:**
1. **`active`** - Full access (default)
2. **`inactive`** - Account disabled, cannot login
3. **`suspended`** - Temporary ban, cannot login

**Status Enforcement:**
```typescript
// From routes.ts (requireAdmin middleware)
if (user?.status === 'suspended') {
  return res.status(403).json({ message: "Account suspended. Contact administrator." });
}

if (user?.status === 'inactive') {
  return res.status(403).json({ message: "Account inactive. Contact administrator." });
}
```

**Protection Rules:**
- ❌ Admin users **cannot** be suspended
- ❌ Users **cannot** suspend themselves
- ✅ Status changes logged (implicitly via `updatedAt`)

---

## 🔐 Authentication & Authorization

### **1. Firebase Authentication**

**Provider:** Firebase Admin SDK

**Login Flow:**
```
1. User logs in via Firebase (Google, Email/Password)
2. Client sends ID token to backend
3. Backend verifies token with Firebase Admin
4. Backend checks if user exists in database
5. If not, checks organization membership rules
6. Creates session and returns user data
```

**Auto-Registration:**
```typescript
// From firebaseAuth.ts
async function upsertUser(userData: any) {
  // If first user of organization → Create as admin
  // If not pre-added by admin → Reject login
  throw new Error('User not authorized. Contact your organization admin to be added to the system.');
}
```

---

### **2. Session Management**

**Technology:** Express-Session + PostgreSQL Store

**Configuration:**
```typescript
// From firebaseAuth.ts
{
  secret: process.env.SESSION_SECRET,
  store: PostgreSQL Session Store,
  ttl: 7 days,
  cookie: {
    httpOnly: true,
    secure: (prod && !forceInsecure),  // ⚠️ Can be disabled via env
    sameSite: 'lax',
    maxAge: 7 days
  }
}
```

**Session Storage:** `sessions` table in PostgreSQL

**Security Issues:**
- ⚠️ Cookie security can be disabled via `INSECURE_COOKIES=true`
- ⚠️ Session secret has fallback (throws error if missing)
- ✅ HttpOnly flag prevents XSS attacks
- ✅ 7-day expiration

---

### **3. Access Control Middleware**

**Authentication Check:**
```typescript
// isAuthenticated middleware
const isAuthenticated: RequestHandler = (req, res, next) => {
  if (!(req.session as any)?.user?.id) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  req.user = (req.session as any).user;
  next();
};
```

**Admin Check:**
```typescript
// requireAdmin middleware (from routes.ts)
const requireAdmin = async (req: any, res: any, next: any) => {
  const user = await storage.getUser(userId);
  
  // Check status
  if (user?.status === 'suspended' || user?.status === 'inactive') {
    return res.status(403).json({ message: "Account suspended/inactive" });
  }
  
  // Check role
  if (!user || user.role !== 'admin') {
    return res.status(403).json({ message: "Admin access required" });
  }
  
  next();
};
```

**User Context Injection:**
```typescript
// addUserToRequest middleware
const addUserToRequest = async (req: any, res: any, next: any) => {
  const user = await storage.getUser(req.user.id);
  req.currentUser = user;
  next();
};
```

---

## 👥 User Management Features

### **1. User Lifecycle**

#### **Create User** (`POST /api/users`)

**Access:** Admin only

**Validation:**
```typescript
// From routes.ts
1. Check if username already exists
2. Ensure email is unique (database constraint)
3. Auto-assign currentUser's organizationId
4. Set default status to 'active'
5. Set default role to 'user' (unless specified)
```

**Endpoint:**
```typescript
app.post("/api/users", isAuthenticated, requireAdmin, addUserToRequest, async (req: any, res) => {
  // Check username uniqueness
  const existingUser = await storage.getUserByUsername(req.body.username);
  if (existingUser) {
    return res.status(400).json({ message: "Username already exists" });
  }
  
  // Auto-assign organization
  const userData = {
    ...req.body,
    organizationId: currentUser.organizationId
  };
  
  const user = await storage.createUser(userData);
  res.status(201).json(user);
});
```

**Required Fields:**
- `firstName`
- `lastName`
- `email`
- `username`

**Optional Fields:**
- `phoneNumber`
- `department`
- `designation`
- `employeeId`
- `dateOfBirth`
- `address`
- `emergencyContact`
- `emergencyContactPhone`
- `role` (defaults to 'user')
- `status` (defaults to 'active')

---

#### **List Users** (`GET /api/users`)

**Access:** All authenticated users

**Behavior:**
- Returns all users in the requester's organization
- No pagination (⚠️ performance issue for large orgs)
- No filtering or search

**Endpoint:**
```typescript
app.get("/api/users", isAuthenticated, addUserToRequest, async (req: any, res) => {
  const users = await storage.getUsersByOrganization(user.organizationId);
  res.json(users);
});
```

---

#### **Update User** (`PUT /api/users/:id`)

**Access:** Admin only

**Behavior:**
- Updates user profile information
- ⚠️ **No validation** to prevent cross-organization updates
- ⚠️ No check if user being updated is in same organization

**Endpoint:**
```typescript
app.put("/api/users/:id", isAuthenticated, requireAdmin, async (req, res) => {
  const user = await storage.updateUserDetails(req.params.id, req.body);
  res.json(user);
});
```

**Security Issue:**
```
🔴 CRITICAL: Admin from Org A can update user from Org B
Missing organizationId check in update endpoint
```

---

#### **Change User Status** (`PUT /api/users/:id/status`)

**Access:** Admin only

**Validations:**
- ✅ Cannot suspend admin users
- ✅ Cannot suspend yourself
- ⚠️ No organization check

**Endpoint:**
```typescript
app.put("/api/users/:id/status", isAuthenticated, requireAdmin, addUserToRequest, async (req: any, res) => {
  const targetUser = await storage.getUser(targetUserId);
  
  // Prevent suspending admin users
  if (targetUser.role === 'admin' && newStatus === 'suspended') {
    return res.status(400).json({ message: "Cannot suspend admin users" });
  }
  
  // Prevent self-suspension
  if (targetUserId === currentUser.id && newStatus === 'suspended') {
    return res.status(400).json({ message: "You cannot suspend your own account" });
  }
  
  const user = await storage.changeUserStatus(targetUserId, newStatus);
  res.json(user);
});
```

**Security Issue:**
```
🔴 CRITICAL: Admin from Org A can suspend user from Org B
Missing organizationId check in status change endpoint
```

---

#### **Delete User** (`DELETE /api/users/:id`)

**Status:** ❌ **NOT IMPLEMENTED**

**Impact:**
- Cannot remove users from system
- Inactive/suspended users accumulate
- Data cleanup impossible
- GDPR compliance issues

**Recommendation:**
```typescript
// Suggested implementation
app.delete("/api/users/:id", isAuthenticated, requireAdmin, addUserToRequest, async (req: any, res) => {
  const targetUser = await storage.getUser(req.params.id);
  
  // Verify same organization
  if (targetUser.organizationId !== req.currentUser.organizationId) {
    return res.status(403).json({ message: "Cannot delete users from other organizations" });
  }
  
  // Prevent deleting yourself
  if (targetUser.id === req.currentUser.id) {
    return res.status(400).json({ message: "Cannot delete your own account" });
  }
  
  // Prevent deleting last admin
  if (targetUser.role === 'admin') {
    const adminCount = await storage.getOrganizationAdminCount(targetUser.organizationId);
    if (adminCount <= 1) {
      return res.status(400).json({ message: "Cannot delete last admin" });
    }
  }
  
  await storage.deleteUser(req.params.id);
  res.json({ success: true });
});
```

---

### **2. User Profile Management**

#### **Database Schema**

```typescript
// From shared/schema.ts
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: varchar("role").default("user"),
  organizationId: varchar("organization_id").references(() => organizations.id),
  
  // Extended profile
  username: varchar("username").unique(),
  phoneNumber: varchar("phone_number"),
  department: varchar("department"),
  designation: varchar("designation"),
  employeeId: varchar("employee_id"),
  dateOfBirth: timestamp("date_of_birth"),
  address: text("address"),
  emergencyContact: varchar("emergency_contact"),
  emergencyContactPhone: varchar("emergency_contact_phone"),
  
  // Status & timestamps
  status: varchar("status").default("active"),
  lastLoginAt: timestamp("last_login_at"),
  passwordChangedAt: timestamp("password_changed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
```

**Unique Constraints:**
- ✅ `email` (global uniqueness)
- ✅ `username` (global uniqueness)

**Issues:**
- ⚠️ No composite unique constraint on `(organizationId, employeeId)`
- ⚠️ Employee ID can be duplicated across organizations

---

### **3. Frontend User Interface**

**Location:** `client/src/pages/user-management.tsx`

**Features:**

#### **Users Tab**
- 📊 Table view with columns:
  - Name (with profile image and employee ID)
  - Email
  - Username
  - Department
  - Role (badge)
  - Status (dropdown selector)
  - Last Login
  - Actions (Edit button)

- ✅ **Add User** button (admin only - via ProtectedRoute)
- ✅ **Edit User** dialog
- ✅ **Status Change** dropdown (inline)
- ✅ **Client-side validation** for admin suspension

#### **Login Logs Tab**
- 📊 Table view with columns:
  - User ID (⚠️ should show name, not ID)
  - Device (name, OS, browser)
  - IP Address
  - Location (city, country)
  - Status (success/failed badge)
  - Login Time
  - Session Duration

- ✅ Admin sees all org logs
- ✅ Users see only their own logs

#### **Devices Tab**
- 📊 Table view with columns:
  - Device (name and ID)
  - Type (desktop/mobile/tablet)
  - Browser
  - OS
  - Trust Status (Trusted/Untrusted badge)
  - First Seen
  - Last Seen
  - Status (Active/Inactive)

- ✅ Admin sees all org devices
- ✅ Users see only their own devices
- ❌ **Missing:** Trust management UI (no buttons to change trust status)

---

## 🔍 Security Audit Findings

### **🔴 CRITICAL Issues**

#### **1. Missing Organization Checks in Update/Status Endpoints**

**Vulnerability:** Cross-organization data manipulation

**Affected Endpoints:**
- `PUT /api/users/:id` - Update user details
- `PUT /api/users/:id/status` - Change user status

**Attack Scenario:**
```
1. Admin from Org A discovers user ID from Org B (via enumeration or leak)
2. Admin A sends PUT /api/users/{ORG_B_USER_ID} with malicious data
3. System updates Org B user without checking organizationId
4. Admin A can promote themselves in Org B or suspend Org B users
```

**Fix:**
```typescript
// Add organization check in both endpoints
app.put("/api/users/:id", isAuthenticated, requireAdmin, addUserToRequest, async (req: any, res) => {
  const targetUser = await storage.getUser(req.params.id);
  
  if (!targetUser || targetUser.organizationId !== req.currentUser.organizationId) {
    return res.status(403).json({ message: "Access denied" });
  }
  
  // ... proceed with update
});
```

---

#### **2. No Password Management System**

**Issue:** Users cannot change passwords

**Missing Features:**
- Password change endpoint
- Password reset flow
- Password strength validation
- Password history tracking (schema exists but unused)
- Force password change on first login

**Impact:**
- Users stuck with initial password
- Cannot recover from password compromise
- No compliance with password policies
- `passwordChangedAt` field never updated

**Database Schema Exists:**
```typescript
// From shared/schema.ts
export const passwordChangeHistory = pgTable("password_change_history", {
  id: varchar("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id),
  changedAt: timestamp("changed_at").defaultNow(),
  changedBy: varchar("changed_by"),
  reason: varchar("reason"),
  ipAddress: varchar("ip_address"),
  deviceId: varchar("device_id"),
});
```

**Recommendation:**
```typescript
// Implement password change endpoints
POST /api/users/me/password
POST /api/users/:id/reset-password (admin only)
POST /api/auth/forgot-password
POST /api/auth/reset-password/:token
```

---

#### **3. No User Deletion Capability**

**Issue:** Cannot remove users from system

**Impact:**
- Orphaned accounts accumulate
- Cannot comply with GDPR "right to be forgotten"
- Cannot clean up test/terminated users
- License/seat count inflated

**Risks:**
- Suspended users can potentially be reactivated
- Data breach exposure increases over time
- Audit trail complexity

**Recommendation:** Implement soft delete with retention policy

---

### **🟡 HIGH Priority Issues**

#### **4. Insecure Cookie Configuration**

**Issue:** Cookie security can be disabled via environment variable

**Code:**
```typescript
// From firebaseAuth.ts
const forceInsecure = process.env.INSECURE_COOKIES === 'true' || process.env.COOKIE_SECURE === 'false';
const cookieSecure = isProd && !forceInsecure;
```

**Impact:**
- Man-in-the-middle attacks possible
- Session hijacking via network sniffing
- Cookies sent over HTTP

**Recommendation:**
- Remove insecure override option
- Force HTTPS in production
- Use reverse proxy (nginx) if needed

---

#### **5. No Rate Limiting on Auth Endpoints**

**Issue:** Brute force attacks possible

**Missing Protection:**
- Login endpoint not rate-limited
- User creation not rate-limited
- Password reset (if implemented) would need limits

**Recommendation:**
```typescript
import rateLimit from 'express-rate-limit';

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts
  message: 'Too many login attempts, please try again later'
});

app.post('/api/auth/firebase-login', authLimiter, async (req, res) => {
  // ...
});
```

---

#### **6. Username Enumeration Vulnerability**

**Issue:** Username existence can be determined

**Code:**
```typescript
// From routes.ts
const existingUser = await storage.getUserByUsername(req.body.username);
if (existingUser) {
  return res.status(400).json({ message: "Username already exists. Please choose a different username." });
}
```

**Attack:** Attacker can enumerate valid usernames

**Recommendation:**
- Use generic error messages
- Implement CAPTCHA for user creation
- Rate limit username checks

---

### **🟢 MEDIUM Priority Issues**

#### **7. No Pagination on User List**

**Issue:** Large organizations will face performance problems

**Code:**
```typescript
app.get("/api/users", isAuthenticated, addUserToRequest, async (req: any, res) => {
  const users = await storage.getUsersByOrganization(user.organizationId);
  res.json(users); // Returns ALL users
});
```

**Impact:**
- Slow page loads for orgs with 100+ users
- High database load
- Large payload sizes

**Recommendation:**
```typescript
app.get("/api/users", isAuthenticated, addUserToRequest, async (req: any, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 50;
  const offset = (page - 1) * limit;
  
  const users = await storage.getUsersByOrganization(
    user.organizationId, 
    limit, 
    offset
  );
  
  const total = await storage.getOrganizationUserCount(user.organizationId);
  
  res.json({ users, total, page, limit });
});
```

---

#### **8. Missing Input Validation**

**Issue:** No schema validation on user input

**Vulnerable Fields:**
- Email format not validated
- Phone number format not checked
- Username allows special characters
- No length limits enforced

**Recommendation:**
```typescript
import { z } from 'zod';

const createUserSchema = z.object({
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
  email: z.string().email(),
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/),
  phoneNumber: z.string().regex(/^\+?[1-9]\d{1,14}$/).optional(),
  // ... other fields
});

app.post("/api/users", isAuthenticated, requireAdmin, async (req: any, res) => {
  const validatedData = createUserSchema.parse(req.body);
  // ... proceed
});
```

---

#### **9. Login Logs Show User ID Instead of Name**

**Issue:** UX problem in user management UI

**Code:**
```tsx
// From user-management.tsx
<TableCell>{log.userId}</TableCell>  // Should show user name
```

**Fix:**
```typescript
// Backend: Join users table
const logs = await db.select({
  ...userLoginLogs,
  userName: sql`${users.firstName} || ' ' || ${users.lastName}`,
  userEmail: users.email
})
.from(userLoginLogs)
.leftJoin(users, eq(userLoginLogs.userId, users.id))
.where(eq(userLoginLogs.organizationId, organizationId));
```

---

#### **10. No Device Trust Management UI**

**Issue:** Trust settings cannot be modified via UI

**Missing Features:**
- Mark device as trusted/untrusted
- Revoke device access
- Block suspicious devices

**Schema Exists:**
```typescript
// From shared/schema.ts
export const userDevices = pgTable("user_devices", {
  isTrusted: boolean("is_trusted").default(false),
  isActive: boolean("is_active").default(true),
  // ...
});
```

**Endpoint Exists:**
```typescript
app.put("/api/devices/:deviceId/trust", isAuthenticated, async (req: any, res) => {
  const device = await storage.updateDeviceTrust(req.params.deviceId, req.body.isTrusted);
  res.json(device);
});
```

**Missing:** UI buttons to call this endpoint

---

### **🔵 LOW Priority Issues**

#### **11. No Email Verification**

**Issue:** Users can register with unverified emails

**Impact:**
- Fake accounts possible
- Email typos cause access issues
- Cannot send password reset emails safely

**Recommendation:** Add email verification flow using Firebase

---

#### **12. No Multi-Factor Authentication (MFA)**

**Issue:** Single factor authentication only

**Impact:**
- Weak security for sensitive operations
- No protection if password compromised

**Recommendation:** Implement Firebase MFA or TOTP

---

#### **13. No Audit Trail for User Changes**

**Issue:** Cannot track who changed what

**Missing Logs:**
- User profile updates not logged
- Role changes not logged
- Status changes not logged (only implicit via `updatedAt`)

**Recommendation:**
```typescript
// Create audit log table
export const auditLogs = pgTable("audit_logs", {
  id: varchar("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id),
  action: varchar("action"), // 'create', 'update', 'delete', 'status_change'
  targetUserId: varchar("target_user_id"),
  changes: jsonb("changes"), // {field: {old, new}}
  ipAddress: varchar("ip_address"),
  timestamp: timestamp("timestamp").defaultNow(),
});
```

---

#### **14. No Bulk Operations**

**Issue:** Cannot manage multiple users at once

**Missing Features:**
- Bulk user import (CSV)
- Bulk status change
- Bulk role assignment
- Bulk user export

---

#### **15. No User Search/Filter**

**Issue:** Difficult to find users in large organizations

**Missing Features:**
- Search by name, email, department
- Filter by role, status
- Sort by last login, creation date

---

## 📊 Feature Matrix

| Feature | Status | Notes |
|---------|--------|-------|
| **User CRUD** |
| Create User | ✅ Implemented | Admin only, org-scoped |
| Read Users | ✅ Implemented | All users, org-scoped |
| Update User | ⚠️ Partial | Missing org check |
| Delete User | ❌ Missing | Critical gap |
| **Authentication** |
| Firebase Login | ✅ Implemented | Google & Email/Password |
| Session Management | ✅ Implemented | PostgreSQL store, 7-day TTL |
| Auto-Registration | ✅ Implemented | First user = admin |
| Email Verification | ❌ Missing | Optional but recommended |
| MFA | ❌ Missing | Low priority |
| **Authorization** |
| Role-Based Access | ✅ Implemented | Admin vs User |
| Status-Based Access | ✅ Implemented | Active/Inactive/Suspended |
| Organization Isolation | ⚠️ Partial | Missing in update/status |
| **User Management** |
| Profile Editing | ✅ Implemented | All fields editable |
| Status Management | ✅ Implemented | Cannot suspend admin |
| Role Management | ✅ Implemented | Via edit dialog |
| Password Management | ❌ Missing | Critical gap |
| **Monitoring** |
| Login Logs | ✅ Implemented | Full tracking |
| Device Tracking | ✅ Implemented | Trust settings |
| Password History | ⚠️ Schema Only | Not implemented |
| Audit Logs | ❌ Missing | No change tracking |
| **UI/UX** |
| User List Table | ✅ Implemented | Good layout |
| Add User Dialog | ✅ Implemented | Comprehensive fields |
| Edit User Dialog | ✅ Implemented | Comprehensive fields |
| Status Dropdown | ✅ Implemented | Inline editing |
| Login Logs Viewer | ⚠️ Partial | Shows IDs not names |
| Device Manager | ⚠️ Partial | No trust management |
| **Performance** |
| Pagination | ❌ Missing | High priority |
| Search | ❌ Missing | Medium priority |
| Filtering | ❌ Missing | Medium priority |
| Bulk Operations | ❌ Missing | Low priority |
| **Security** |
| Secure Cookies | ⚠️ Can Disable | High risk |
| Rate Limiting | ❌ Missing | High priority |
| Input Validation | ⚠️ Minimal | Medium priority |
| CSRF Protection | ✅ Implemented | SameSite cookies |
| XSS Protection | ✅ Implemented | HttpOnly cookies |

---

## 🛠️ Recommended Improvements

### **Priority 1: Critical Security Fixes**

#### **1. Add Organization Checks to User Endpoints**

**File:** `server/routes.ts`

```typescript
// UPDATE USER ENDPOINT
app.put("/api/users/:id", isAuthenticated, requireAdmin, addUserToRequest, async (req: any, res) => {
  try {
    const targetUser = await storage.getUser(req.params.id);
    
    // SECURITY: Verify same organization
    if (!targetUser || targetUser.organizationId !== req.currentUser.organizationId) {
      return res.status(403).json({ message: "Access denied" });
    }
    
    // Prevent role changes via this endpoint if needed
    const { role, status, organizationId, ...allowedUpdates } = req.body;
    
    const user = await storage.updateUserDetails(req.params.id, allowedUpdates);
    res.json(user);
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({ message: "Failed to update user" });
  }
});

// CHANGE STATUS ENDPOINT
app.put("/api/users/:id/status", isAuthenticated, requireAdmin, addUserToRequest, async (req: any, res) => {
  try {
    const targetUser = await storage.getUser(req.params.id);
    
    // SECURITY: Verify same organization
    if (!targetUser || targetUser.organizationId !== req.currentUser.organizationId) {
      return res.status(403).json({ message: "Access denied" });
    }
    
    // ... rest of validation
  } catch (error) {
    console.error("Error updating user status:", error);
    res.status(500).json({ message: "Failed to update user status" });
  }
});
```

---

#### **2. Implement User Deletion**

**File:** `server/routes.ts`

```typescript
app.delete("/api/users/:id", isAuthenticated, requireAdmin, addUserToRequest, async (req: any, res) => {
  try {
    const targetUser = await storage.getUser(req.params.id);
    
    // Verify same organization
    if (!targetUser || targetUser.organizationId !== req.currentUser.organizationId) {
      return res.status(403).json({ message: "Access denied" });
    }
    
    // Prevent self-deletion
    if (targetUser.id === req.currentUser.id) {
      return res.status(400).json({ message: "Cannot delete your own account" });
    }
    
    // Prevent deleting last admin
    if (targetUser.role === 'admin') {
      const adminCount = await storage.getOrganizationAdminCount(targetUser.organizationId);
      if (adminCount <= 1) {
        return res.status(400).json({ 
          message: "Cannot delete the last admin. Promote another user to admin first." 
        });
      }
    }
    
    // Soft delete (recommended)
    await storage.updateUser(req.params.id, {
      status: 'deleted',
      email: `deleted_${Date.now()}_${targetUser.email}`, // Free up email for reuse
      username: `deleted_${Date.now()}_${targetUser.username}` // Free up username
    });
    
    // OR Hard delete (permanent)
    // await storage.deleteUser(req.params.id);
    
    res.json({ success: true, message: "User deleted successfully" });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({ message: "Failed to delete user" });
  }
});
```

**File:** `server/storage.ts`

```typescript
async deleteUser(userId: string): Promise<void> {
  await db.delete(users).where(eq(users.id, userId));
}

async getOrganizationAdminCount(organizationId: string): Promise<number> {
  const result = await db
    .select({ count: count() })
    .from(users)
    .where(and(
      eq(users.organizationId, organizationId),
      eq(users.role, 'admin'),
      eq(users.status, 'active')
    ));
  return result[0]?.count || 0;
}
```

**File:** `client/src/pages/user-management.tsx`

```tsx
// Add delete button to UI
const deleteUserMutation = useMutation({
  mutationFn: async (userId: string) => {
    const response = await apiRequest("DELETE", `/api/users/${userId}`);
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to delete user");
    }
    return await response.json();
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["/api/users"] });
    toast({
      title: "Success",
      description: "User deleted successfully",
    });
  },
  onError: (error: any) => {
    toast({
      title: "Error",
      description: error.message,
      variant: "destructive",
    });
  },
});

// In table actions column
<Button
  size="sm"
  variant="destructive"
  onClick={() => {
    if (confirm(`Delete user ${user.firstName} ${user.lastName}? This cannot be undone.`)) {
      deleteUserMutation.mutate(user.id);
    }
  }}
>
  <Trash2 className="w-4 h-4" />
</Button>
```

---

#### **3. Implement Password Management**

**File:** `server/routes.ts`

```typescript
import bcrypt from 'bcryptjs';

// Change own password
app.post("/api/users/me/password", isAuthenticated, async (req: any, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await storage.getUser(req.user.id);
    
    // Validate password strength
    if (newPassword.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters" });
    }
    
    // Verify current password (if using password auth)
    // ... Firebase handles this differently
    
    // Update password via Firebase Admin
    await adminAuth.updateUser(user.email, {
      password: newPassword
    });
    
    // Log password change
    await storage.updateUser(user.id, {
      passwordChangedAt: new Date()
    });
    
    await storage.createPasswordChangeHistory({
      userId: user.id,
      organizationId: user.organizationId,
      changedBy: 'self',
      reason: 'user_initiated',
      ipAddress: req.ip,
      deviceId: req.body.deviceId
    });
    
    res.json({ success: true });
  } catch (error) {
    console.error("Error changing password:", error);
    res.status(500).json({ message: "Failed to change password" });
  }
});

// Admin reset user password
app.post("/api/users/:id/reset-password", isAuthenticated, requireAdmin, addUserToRequest, async (req: any, res) => {
  try {
    const targetUser = await storage.getUser(req.params.id);
    
    // Verify same organization
    if (!targetUser || targetUser.organizationId !== req.currentUser.organizationId) {
      return res.status(403).json({ message: "Access denied" });
    }
    
    // Generate temporary password
    const tempPassword = generateSecurePassword();
    
    // Update password via Firebase
    await adminAuth.updateUser(targetUser.email, {
      password: tempPassword
    });
    
    // Force password change on next login
    await storage.updateUser(targetUser.id, {
      passwordChangedAt: new Date(),
      // Could add a 'mustChangePassword' field
    });
    
    await storage.createPasswordChangeHistory({
      userId: targetUser.id,
      organizationId: targetUser.organizationId,
      changedBy: req.currentUser.id,
      reason: 'admin_reset',
      ipAddress: req.ip,
      deviceId: req.body.deviceId
    });
    
    res.json({ tempPassword }); // Send to admin to share securely
  } catch (error) {
    console.error("Error resetting password:", error);
    res.status(500).json({ message: "Failed to reset password" });
  }
});

function generateSecurePassword(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < 16; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}
```

---

### **Priority 2: High-Impact Improvements**

#### **4. Add Rate Limiting**

**File:** `server/index.ts` or `server/routes.ts`

```typescript
import rateLimit from 'express-rate-limit';

// Auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: 'Too many login attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

app.post('/api/auth/firebase-login', authLimiter, async (req, res) => {
  // ...
});

// User management endpoints
const userManagementLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10,
  message: 'Too many requests, please slow down',
});

app.post('/api/users', userManagementLimiter, isAuthenticated, requireAdmin, async (req, res) => {
  // ...
});
```

---

#### **5. Force Secure Cookies in Production**

**File:** `server/firebaseAuth.ts`

```typescript
export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000;
  const isProd = process.env.NODE_ENV === 'production';
  
  // REMOVE insecure override options
  // const forceInsecure = process.env.INSECURE_COOKIES === 'true';
  
  // ALWAYS secure in production
  const cookieSecure = isProd;
  
  // Warn if running production without HTTPS
  if (isProd && !process.env.HTTPS_ENABLED) {
    console.warn('⚠️ WARNING: Running in production without HTTPS. Sessions may not work correctly.');
  }
  
  return session({
    secret: process.env.SESSION_SECRET,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: cookieSecure,
      sameSite: 'strict', // More secure than 'lax'
      maxAge: sessionTtl,
    },
  });
}
```

---

#### **6. Add Input Validation**

**File:** `shared/validation.ts` (create new file)

```typescript
import { z } from 'zod';

export const createUserValidation = z.object({
  firstName: z.string().min(1).max(50).trim(),
  lastName: z.string().min(1).max(50).trim(),
  email: z.string().email().toLowerCase(),
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username must be at most 30 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  phoneNumber: z.string()
    .regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format')
    .optional()
    .or(z.literal('')),
  department: z.string().max(100).optional(),
  designation: z.string().max(100).optional(),
  employeeId: z.string().max(50).optional(),
  address: z.string().max(500).optional(),
  emergencyContact: z.string().max(100).optional(),
  emergencyContactPhone: z.string()
    .regex(/^\+?[1-9]\d{1,14}$/)
    .optional()
    .or(z.literal('')),
  role: z.enum(['user', 'admin']).default('user'),
  status: z.enum(['active', 'inactive', 'suspended']).default('active'),
});

export const updateUserValidation = createUserValidation.partial();
```

**File:** `server/routes.ts`

```typescript
import { createUserValidation, updateUserValidation } from '@shared/validation';

app.post("/api/users", isAuthenticated, requireAdmin, addUserToRequest, async (req: any, res) => {
  try {
    // Validate input
    const validatedData = createUserValidation.parse(req.body);
    
    // Check username uniqueness
    const existingUser = await storage.getUserByUsername(validatedData.username);
    if (existingUser) {
      return res.status(400).json({ message: "Username already exists" });
    }
    
    // ... rest of logic
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        message: "Validation error", 
        errors: error.errors 
      });
    }
    console.error("Error creating user:", error);
    res.status(500).json({ message: "Failed to create user" });
  }
});
```

---

### **Priority 3: UX & Performance**

#### **7. Add Pagination to User List**

**File:** `server/storage.ts`

```typescript
async getUsersByOrganization(
  organizationId: string, 
  limit: number = 50, 
  offset: number = 0
): Promise<User[]> {
  return await db
    .select()
    .from(users)
    .where(eq(users.organizationId, organizationId))
    .limit(limit)
    .offset(offset)
    .orderBy(desc(users.createdAt));
}
```

**File:** `server/routes.ts`

```typescript
app.get("/api/users", isAuthenticated, addUserToRequest, async (req: any, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = (page - 1) * limit;
    
    const users = await storage.getUsersByOrganization(
      user.organizationId,
      limit,
      offset
    );
    
    const total = await storage.getOrganizationUserCount(user.organizationId);
    
    res.json({
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ message: "Failed to fetch users" });
  }
});
```

---

#### **8. Fix Login Logs UI to Show Names**

**File:** `server/storage.ts`

```typescript
async getOrganizationLoginLogs(organizationId: string): Promise<any[]> {
  return await db
    .select({
      id: userLoginLogs.id,
      userId: userLoginLogs.userId,
      userName: sql<string>`${users.firstName} || ' ' || ${users.lastName}`,
      userEmail: users.email,
      deviceName: userLoginLogs.deviceName,
      deviceType: userLoginLogs.deviceType,
      browserName: userLoginLogs.browserName,
      browserVersion: userLoginLogs.browserVersion,
      operatingSystem: userLoginLogs.operatingSystem,
      ipAddress: userLoginLogs.ipAddress,
      location: userLoginLogs.location,
      loginTime: userLoginLogs.loginTime,
      logoutTime: userLoginLogs.logoutTime,
      sessionDuration: userLoginLogs.sessionDuration,
      loginStatus: userLoginLogs.loginStatus,
      failureReason: userLoginLogs.failureReason,
    })
    .from(userLoginLogs)
    .leftJoin(users, eq(userLoginLogs.userId, users.id))
    .where(eq(userLoginLogs.organizationId, organizationId))
    .orderBy(desc(userLoginLogs.loginTime));
}
```

**File:** `client/src/pages/user-management.tsx`

```tsx
<TableCell>
  <div>
    <div className="font-medium">{log.userName || 'Unknown User'}</div>
    <div className="text-sm text-muted-foreground">{log.userEmail}</div>
  </div>
</TableCell>
```

---

#### **9. Add Device Trust Management UI**

**File:** `client/src/pages/user-management.tsx`

```tsx
// Add mutation
const updateDeviceTrustMutation = useMutation({
  mutationFn: async ({ deviceId, isTrusted }: { deviceId: string; isTrusted: boolean }) => {
    const response = await apiRequest("PUT", `/api/devices/${deviceId}/trust`, { isTrusted });
    return await response.json();
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["/api/devices"] });
    toast({
      title: "Success",
      description: "Device trust updated successfully",
    });
  },
});

// In table
<TableCell>
  <div className="flex items-center gap-2">
    <Badge variant={device.isTrusted ? 'default' : 'secondary'}>
      {device.isTrusted ? 'Trusted' : 'Untrusted'}
    </Badge>
    <Button
      size="sm"
      variant="outline"
      onClick={() => updateDeviceTrustMutation.mutate({
        deviceId: device.deviceId,
        isTrusted: !device.isTrusted
      })}
    >
      {device.isTrusted ? 'Revoke' : 'Trust'}
    </Button>
  </div>
</TableCell>
```

---

## 📝 Testing Checklist

### **Security Tests**

- [ ] **Cross-Organization Access:**
  - [ ] Try updating user from different org
  - [ ] Try changing status of user from different org
  - [ ] Try viewing users from different org
  
- [ ] **Role-Based Access:**
  - [ ] Regular user cannot access user management page
  - [ ] Regular user cannot call admin endpoints
  - [ ] Admin can only manage users in their org
  
- [ ] **Status-Based Access:**
  - [ ] Suspended users cannot login
  - [ ] Inactive users cannot login
  - [ ] Cannot suspend admin users
  - [ ] Cannot suspend yourself
  
- [ ] **Session Security:**
  - [ ] Cookies set with httpOnly
  - [ ] Cookies set with secure (in prod)
  - [ ] Sessions expire after 7 days
  - [ ] Logout clears session

### **Functional Tests**

- [ ] **User Creation:**
  - [ ] Create user with all fields
  - [ ] Create user with minimal fields
  - [ ] Duplicate username rejected
  - [ ] Duplicate email rejected
  - [ ] User assigned correct organizationId
  
- [ ] **User Updates:**
  - [ ] Update user profile
  - [ ] Update user role
  - [ ] Update user status
  - [ ] Cannot update user from different org
  
- [ ] **User Deletion:**
  - [ ] Delete regular user
  - [ ] Cannot delete last admin
  - [ ] Cannot delete yourself
  - [ ] Cannot delete user from different org
  
- [ ] **Login Logs:**
  - [ ] Admin sees all org logs
  - [ ] User sees only their logs
  - [ ] Logs show user names
  
- [ ] **Device Management:**
  - [ ] Admin sees all org devices
  - [ ] User sees only their devices
  - [ ] Can change device trust status

---

## 🎯 Summary & Recommendations

### **Current State**

**Strengths:**
- ✅ Solid multi-tenant architecture
- ✅ Good role-based access control foundation
- ✅ Comprehensive user profile schema
- ✅ Login and device tracking implemented
- ✅ Clean UI with good UX

**Critical Gaps:**
- 🔴 Cross-organization access vulnerability
- 🔴 No user deletion capability
- 🔴 No password management system

**High-Priority Improvements:**
- 🟡 Add rate limiting
- 🟡 Enforce secure cookies
- 🟡 Add input validation
- 🟡 Add pagination

**Medium-Priority Enhancements:**
- 🔵 Fix UI issues (names in logs, trust management)
- 🔵 Add search and filtering
- 🔵 Add audit logging
- 🔵 Implement email verification

### **Action Plan**

**Week 1 (Critical):**
1. Add organization checks to update/status endpoints
2. Implement user deletion
3. Add basic password management

**Week 2 (High Priority):**
4. Add rate limiting
5. Remove insecure cookie options
6. Add input validation
7. Implement pagination

**Week 3 (Medium Priority):**
8. Fix login logs UI
9. Add device trust management UI
10. Add search and filtering

**Week 4 (Nice to Have):**
11. Add audit logging
12. Implement email verification
13. Add bulk operations
14. Add MFA support

---

**Last Updated:** October 14, 2025  
**Reviewed By:** GitHub Copilot  
**Next Review:** After implementing critical fixes
