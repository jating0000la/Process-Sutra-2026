# 🔐 System Super Admin - Quick Reference

**⚠️ DEVELOPER ONLY - DO NOT SHARE THIS URL PUBLICLY**

---

## 🚀 Quick Access

### Direct URL (Hidden from UI):
```
http://localhost:5000/system-super-admin
```

**Production:**
```
https://your-domain.com/system-super-admin
```

---

## 🔑 Grant Access (Manual Process)

### Connect to Database:
```bash
# PostgreSQL
psql -U postgres -d processsutra
```

### Grant Super Admin:
```sql
UPDATE users SET is_super_admin = true WHERE email = 'developer@company.com';
```

### Verify:
```sql
SELECT email, role, is_super_admin FROM users WHERE is_super_admin = true;
```

### **Important:** User must logout and login again!

---

## ✅ What You Can Do

- ✅ View all organizations
- ✅ Toggle organization active/inactive
- ✅ View users across all organizations
- ✅ Change any user's status
- ✅ Promote other super admins
- ✅ View system-wide statistics
- ✅ Export all data

---

## 🚫 What's Hidden

- ❌ No sidebar link (even for super admins)
- ❌ No visual indicators
- ❌ Not discoverable through UI
- ❌ No promotion UI (database only)

---

## 📊 Key Differences

| Feature | Org Admin (`/super-admin`) | System Super Admin (`/system-super-admin`) |
|---------|------------------------|--------------------------------|
| Visible in sidebar | ✅ Yes (orange badge) | ❌ No |
| Access method | Click sidebar link | Direct URL only |
| Scope | Single organization | All organizations |
| Can see other orgs | ❌ No | ✅ Yes |
| Manage own org users | ✅ Yes | ✅ Yes |
| Manage other org users | ❌ No | ✅ Yes |
| System statistics | ❌ No | ✅ Yes |

---

## 🔒 Security Notes

1. **Never expose this URL** in public documentation
2. **Use strong passwords** for super admin accounts
3. **Limit super admins** to 1-2 trusted developers
4. **Monitor access** regularly via database queries
5. **Rotate access** when developers leave the team

---

## 🛠️ Common Tasks

### Deactivate an Organization:
```
1. Go to: /system-super-admin
2. Click "Organizations" tab
3. Find organization
4. Click "Deactivate"
```

### Check Who Has Super Admin:
```sql
SELECT id, email, firstName, lastName, createdAt 
FROM users 
WHERE is_super_admin = true;
```

### Revoke Super Admin:
```sql
UPDATE users SET is_super_admin = false WHERE email = 'user@example.com';
```

---

## 🚨 Emergency Access Removal

If unauthorized access is detected:

```sql
-- 1. Revoke immediately
UPDATE users SET is_super_admin = false WHERE email = 'suspicious@email.com';

-- 2. Check audit log
SELECT * FROM user_login_logs WHERE userId = 'user-id' ORDER BY loginTime DESC;

-- 3. Restart server to clear sessions
```

---

**Access URL:** `/system-super-admin` (bookmark this!)  
**Visibility:** Hidden  
**Auth Required:** `is_super_admin = true`  
**Updated:** October 15, 2025
