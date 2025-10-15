# 🔧 Fix PostgreSQL Peer Authentication Error

## Problem
```
psql: error: connection to server on socket "/var/run/postgresql/.s.PGSQL.5432" failed: 
FATAL: Peer authentication failed for user "processsutra"
```

## Root Cause
PostgreSQL is configured to use "peer" authentication (Unix user matching) instead of password authentication for local connections.

---

## Solution 1: Use localhost with Password (Quick Fix)

Instead of connecting via socket, use TCP/IP with password:

```bash
# Add -h localhost to force TCP/IP connection
export PGPASSWORD='ProcessSutra2026!Secure'

psql -h localhost -U processsutra -d processsutra_db -c "SELECT NOW();"
```

### Quick One-Liner Fix (Use This)
```bash
export PGPASSWORD='ProcessSutra2026!Secure' && \
psql -h localhost -U processsutra -d processsutra_db -f migrations/0008_add_super_admin_field.sql && \
psql -h localhost -U processsutra -d processsutra_db -c "UPDATE users SET is_super_admin = true, updated_at = NOW() WHERE email = 'jkgkumar3@gmail.com';" && \
psql -h localhost -U processsutra -d processsutra_db -c "SELECT email, is_super_admin FROM users WHERE email = 'jkgkumar3@gmail.com';" && \
pm2 restart process-sutra
```

**Note**: Added `-h localhost` to all psql commands

---

## Solution 2: Fix PostgreSQL Authentication (Permanent Fix)

### Step 1: Edit pg_hba.conf
```bash
# Find the config file
sudo find /etc/postgresql -name pg_hba.conf

# Common locations:
# /etc/postgresql/14/main/pg_hba.conf
# /etc/postgresql/15/main/pg_hba.conf
# /etc/postgresql/16/main/pg_hba.conf

# Edit it
sudo nano /etc/postgresql/*/main/pg_hba.conf
```

### Step 2: Change Authentication Method
Find these lines:
```
# "local" is for Unix domain socket connections only
local   all             all                                     peer
```

Change `peer` to `md5`:
```
# "local" is for Unix domain socket connections only
local   all             all                                     md5
```

### Step 3: Restart PostgreSQL
```bash
sudo systemctl restart postgresql

# Verify it's running
sudo systemctl status postgresql
```

### Step 4: Test Connection
```bash
export PGPASSWORD='ProcessSutra2026!Secure'
psql -U processsutra -d processsutra_db -c "SELECT NOW();"
```

---

## Solution 3: Use sudo -u postgres (Alternative)

Connect as postgres superuser, then switch:

```bash
# Connect as postgres user
sudo -u postgres psql

# Inside psql:
\c processsutra_db

# Run commands:
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN DEFAULT FALSE;
UPDATE users SET is_super_admin = true WHERE email = 'jkgkumar3@gmail.com';
SELECT email, is_super_admin FROM users WHERE email = 'jkgkumar3@gmail.com';

# Exit
\q
```

Then restart app:
```bash
pm2 restart process-sutra
```

---

## Solution 4: Update Deployment Script

The deployment script also needs `-h localhost` flag. Let me check and update it.

### Quick Fix for deploy-vps-complete.sh
On VPS, edit the script:
```bash
nano deploy-vps-complete.sh

# Find all psql commands and add -h "$DB_HOST" after -U
# Example:
# Change: psql -U "$DB_USER" -d "$DB_NAME"
# To:     psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME"
```

Or use this sed command to fix it automatically:
```bash
cd /root/Process-Sutra-2026
sed -i 's/psql -U/psql -h "$DB_HOST" -U/g' deploy-vps-complete.sh
sed -i 's/psql -d/psql -h "$DB_HOST" -d/g' deploy-vps-complete.sh
```

---

## Recommended: Use Solution 1 (Simplest)

**Run this on VPS right now:**

```bash
export PGPASSWORD='ProcessSutra2026!Secure'

# Check if column exists
psql -h localhost -U processsutra -d processsutra_db -c "\d users" | grep is_super_admin

# Add super admin column
psql -h localhost -U processsutra -d processsutra_db -f migrations/0008_add_super_admin_field.sql

# Set your user as super admin
psql -h localhost -U processsutra -d processsutra_db -c "UPDATE users SET is_super_admin = true, updated_at = NOW() WHERE email = 'jkgkumar3@gmail.com';"

# Verify
psql -h localhost -U processsutra -d processsutra_db -c "SELECT email, role, is_super_admin FROM users WHERE email = 'jkgkumar3@gmail.com';"

# Restart app
pm2 restart process-sutra
```

**Expected output:**
```
        email         | role  | is_super_admin 
----------------------+-------+----------------
 jkgkumar3@gmail.com | admin | t
```

---

## After Fix

1. ✅ Clear browser cache (Ctrl+Shift+Delete)
2. ✅ Log out from application
3. ✅ Log back in
4. ✅ Navigate to `/system-super-admin`
5. ✅ Should now see organizations list

---

## Verify Application Can Connect

Check if your app's database connection uses localhost:

```bash
# Check .env file
cat /root/Process-Sutra-2026/.env | grep DATABASE_URL

# Should contain: localhost or 127.0.0.1
# Example: DATABASE_URL=postgresql://processsutra:password@localhost:5432/processsutra_db
```

If it doesn't have `localhost` or `127.0.0.1`, add it:
```bash
nano /root/Process-Sutra-2026/.env

# Make sure DATABASE_URL looks like:
DATABASE_URL=postgresql://processsutra:ProcessSutra2026!Secure@localhost:5432/processsutra_db
```

Then restart:
```bash
pm2 restart process-sutra
```

---

**Use Solution 1 above - it's the fastest fix!** 🚀
