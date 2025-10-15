# 🔧 Fix VPS Deployment - Force Run Migrations

## The Problem
The migration tracker says migrations are applied, but tables don't exist.
This happens when migrations partially fail or are rolled back.

## Solution: Run These Commands on VPS

### Step 1: Clear Migration Tracking (on VPS)
```bash
# Connect to database and clear tracking
psql -U processsutra -d processsutra_db <<EOF
-- Clear migration tracking
DELETE FROM schema_migrations;

-- Verify it's empty
SELECT * FROM schema_migrations;
EOF
```

### Step 2: Force Re-run Migrations
```bash
# Run the deployment script again
./deploy-vps-complete.sh
```

---

## Alternative: Manual Migration (If Above Doesn't Work)

```bash
# Set password
export PGPASSWORD='ProcessSutra2026!Secure'

# Run each migration manually (they have IF NOT EXISTS checks)
cd /root/Process-Sutra-2026

psql -U processsutra -d processsutra_db -f migrations/0001_add_webhooks.sql
psql -U processsutra -d processsutra_db -f migrations/0002_add_task_cancellation_fields.sql
psql -U processsutra -d processsutra_db -f migrations/0003_add_notifications_table.sql
psql -U processsutra -d processsutra_db -f migrations/0004_add_notifications_table.sql
psql -U processsutra -d processsutra_db -f migrations/0005_add_performance_indexes.sql
psql -U processsutra -d processsutra_db -f migrations/0006_add_critical_indexes_p0_p1.sql
psql -U processsutra -d processsutra_db -f migrations/0007_add_secondary_indexes_p2.sql
psql -U processsutra -d processsutra_db -f migrations/0008_add_super_admin_field.sql
psql -U processsutra -d processsutra_db -f migrations/0009_add_audit_logs.sql

# Verify tables exist
psql -U processsutra -d processsutra_db -c "\dt"

# Setup super admin (after user logs in at least once)
psql -U processsutra -d processsutra_db -c "UPDATE users SET is_super_admin = true WHERE email = 'jkgkumar3@gmail.com';"

# Restart app
pm2 restart process-sutra
```

---

## Check What Actually Exists

```bash
# List all tables
psql -U processsutra -d processsutra_db -c "\dt"

# Check if users table has data
psql -U processsutra -d processsutra_db -c "SELECT COUNT(*) FROM users;" 2>&1

# Check migration tracking
psql -U processsutra -d processsutra_db -c "SELECT * FROM schema_migrations ORDER BY applied_at;"
```

---

## Quick Fix Script (Copy & Paste on VPS)

```bash
# Clear and re-run migrations
export PGPASSWORD='ProcessSutra2026!Secure'

echo "Clearing migration tracking..."
psql -U processsutra -d processsutra_db -c "DELETE FROM schema_migrations;"

echo "Running migrations..."
for file in migrations/*.sql; do
    echo "Processing $file..."
    psql -U processsutra -d processsutra_db -f "$file" 2>&1 | grep -E "CREATE|ERROR|already exists"
done

echo "Verifying tables..."
psql -U processsutra -d processsutra_db -c "\dt"

echo "Done! Now restart app:"
echo "pm2 restart process-sutra"
```

---

## Root Cause
The `schema_migrations` table has records showing migrations were applied, but:
- The actual tables weren't created
- This suggests migrations failed after being recorded
- OR you're using a different database than expected

Check if you have multiple databases:
```bash
psql -U processsutra -l | grep processsutra
```

---

**Run the Quick Fix Script above on your VPS now!** 🔧
