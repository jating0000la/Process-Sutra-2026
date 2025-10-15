# 🔍 Fix Blank Super Admin Screen

## Problem
You're logged in and accessing `/system-super-admin` but the screen is blank.

## Root Cause
The `is_super_admin` field either:
1. Doesn't exist in the users table, OR
2. Is not set to `true` for your user

---

## Fix - Run on VPS (root@srv974636)

### Step 1: Check Current User Status
```bash
export PGPASSWORD='ProcessSutra2026!Secure'

# Check if is_super_admin column exists
psql -U processsutra -d processsutra_db -c "\d users" | grep is_super_admin

# Check your user record
psql -U processsutra -d processsutra_db -c "SELECT id, email, role, is_super_admin FROM users WHERE email = 'jkgkumar3@gmail.com';"
```

### Step 2: If Column Doesn't Exist - Run Migration
```bash
# Run the super admin migration
psql -U processsutra -d processsutra_db -f migrations/0008_add_super_admin_field.sql

# Verify column was added
psql -U processsutra -d processsutra_db -c "\d users" | grep is_super_admin
```

### Step 3: Set Super Admin to True
```bash
# Promote your user to super admin
psql -U processsutra -d processsutra_db <<EOF
UPDATE users 
SET is_super_admin = true,
    updated_at = NOW()
WHERE email = 'jkgkumar3@gmail.com';

-- Verify it worked
SELECT id, email, role, is_super_admin 
FROM users 
WHERE email = 'jkgkumar3@gmail.com';
EOF
```

### Step 4: Restart Application
```bash
pm2 restart process-sutra

# Check logs
pm2 logs process-sutra --lines 20
```

### Step 5: Clear Browser Cache and Reload
- Press `Ctrl + Shift + Delete` in browser
- Clear cache and cookies
- Or hard refresh: `Ctrl + Shift + R`
- Log out and log back in
- Navigate to `/system-super-admin`

---

## Quick One-Liner Fix (Run on VPS)

```bash
export PGPASSWORD='ProcessSutra2026!Secure' && \
psql -U processsutra -d processsutra_db -f migrations/0008_add_super_admin_field.sql && \
psql -U processsutra -d processsutra_db -c "UPDATE users SET is_super_admin = true, updated_at = NOW() WHERE email = 'jkgkumar3@gmail.com';" && \
psql -U processsutra -d processsutra_db -c "SELECT email, is_super_admin FROM users WHERE email = 'jkgkumar3@gmail.com';" && \
pm2 restart process-sutra
```

Then:
1. Clear browser cache (Ctrl+Shift+Delete)
2. Log out and log back in
3. Access `/system-super-admin`

---

## Verify Super Admin Is Set

```bash
# Should show: is_super_admin | t
psql -U processsutra -d processsutra_db -c "SELECT email, role, is_super_admin FROM users WHERE email = 'jkgkumar3@gmail.com';"
```

Expected output:
```
        email         | role  | is_super_admin 
----------------------+-------+----------------
 jkgkumar3@gmail.com | admin | t
```

---

## Check Frontend Console for Errors

Open browser console (F12) and look for errors like:
- `isSuperAdmin is undefined`
- `Cannot read property of undefined`
- API errors

If you see API errors, check backend logs:
```bash
pm2 logs process-sutra --err --lines 50
```

---

## Alternative: Check User Object in Browser

Open browser console (F12) and type:
```javascript
// Check if user has super admin flag
console.log(localStorage.getItem('user'));

// Or check cookies
document.cookie;
```

If user object doesn't have `isSuperAdmin: true`, then:
1. Backend didn't send it
2. Or browser cached old user data

**Solution**: Clear browser storage and re-login

---

## Check Backend Route

Verify the route is working:
```bash
# From VPS
curl -X GET http://localhost:5000/api/super-admin/organizations \
  -H "Cookie: your-session-cookie"

# Should return list of organizations
```

---

## Complete Diagnostic Script

```bash
#!/bin/bash
export PGPASSWORD='ProcessSutra2026!Secure'

echo "=== 1. Checking users table structure ==="
psql -U processsutra -d processsutra_db -c "\d users"

echo ""
echo "=== 2. Checking your user record ==="
psql -U processsutra -d processsutra_db -c "SELECT id, email, role, is_super_admin FROM users WHERE email = 'jkgkumar3@gmail.com';"

echo ""
echo "=== 3. Adding is_super_admin column (if missing) ==="
psql -U processsutra -d processsutra_db -f migrations/0008_add_super_admin_field.sql

echo ""
echo "=== 4. Setting super admin to true ==="
psql -U processsutra -d processsutra_db -c "UPDATE users SET is_super_admin = true, updated_at = NOW() WHERE email = 'jkgkumar3@gmail.com';"

echo ""
echo "=== 5. Verifying super admin is set ==="
psql -U processsutra -d processsutra_db -c "SELECT email, role, is_super_admin FROM users WHERE email = 'jkgkumar3@gmail.com';"

echo ""
echo "=== 6. Checking all organizations ==="
psql -U processsutra -d processsutra_db -c "SELECT id, name, is_active FROM organizations LIMIT 5;"

echo ""
echo "=== 7. Restarting application ==="
pm2 restart process-sutra

echo ""
echo "=== DONE! ==="
echo "Now:"
echo "1. Clear browser cache (Ctrl+Shift+Delete)"
echo "2. Log out and log back in"
echo "3. Access /system-super-admin"
```

Save this as `fix-super-admin.sh` on VPS and run:
```bash
chmod +x fix-super-admin.sh
./fix-super-admin.sh
```

---

**Run the Quick One-Liner Fix above on your VPS now!** 🚀

Then clear your browser cache and log back in!
