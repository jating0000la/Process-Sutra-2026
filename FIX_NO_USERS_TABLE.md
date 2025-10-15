# 🚨 CRITICAL: Users Table Doesn't Exist

## Problem
The `users` table doesn't exist in the database at all. The migrations marked as "applied" never actually created the tables.

---

## Immediate Fix - Run This on VPS

### Step 1: Check What Tables Actually Exist
```bash
export PGPASSWORD='ProcessSutra2026!Secure'

# List all tables
psql -h localhost -U processsutra -d processsutra_db -c "\dt"

# Check if ANY tables exist
psql -h localhost -U processsutra -d processsutra_db -c "SELECT tablename FROM pg_tables WHERE schemaname = 'public';"
```

### Step 2: Check Migration Files
```bash
cd /root/Process-Sutra-2026

# List migration files
ls -la migrations/

# Check first migration content
head -20 migrations/0001_add_webhooks.sql
```

### Step 3: The Issue
The migration files probably assume tables already exist (they're adding columns/features to existing tables), but your database is completely empty.

---

## Solution: You Need the BASE Schema First!

The migrations are **incremental updates**, not the initial schema. You need to run the base schema creation first.

### Check if you have a base schema file:
```bash
# Look for schema files
find /root/Process-Sutra-2026 -name "*schema*" -o -name "*init*" -o -name "*base*" | grep -i sql

# Or check for drizzle schema
ls -la drizzle/
ls -la db/
```

### Option 1: Use Drizzle Push (If using Drizzle ORM)
```bash
cd /root/Process-Sutra-2026

# Check if drizzle is configured
cat drizzle.config.ts

# Push schema to database
npm run db:push
# or
npx drizzle-kit push
```

### Option 2: Generate Base Schema from Migrations
Let me check your schema file to see what the base structure should be.

```bash
# Check shared schema
cat /root/Process-Sutra-2026/shared/schema.ts | head -100
```

---

## Quick Fix: Create Users Table Manually

If the above doesn't work, create the base users table manually:

```bash
export PGPASSWORD='ProcessSutra2026!Secure'

psql -h localhost -U processsutra -d processsutra_db <<'EOF'
-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    firebase_uid VARCHAR(255) UNIQUE,
    name VARCHAR(255),
    role VARCHAR(50) DEFAULT 'user',
    organization_id INTEGER,
    status VARCHAR(50) DEFAULT 'active',
    is_super_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create organizations table
CREATE TABLE IF NOT EXISTS organizations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create other essential tables
CREATE TABLE IF NOT EXISTS forms (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    organization_id INTEGER REFERENCES organizations(id),
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tasks (
    id SERIAL PRIMARY KEY,
    form_id INTEGER REFERENCES forms(id),
    assigned_to INTEGER REFERENCES users(id),
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Verify tables created
\dt
EOF
```

### Then Set Super Admin
```bash
psql -h localhost -U processsutra -d processsutra_db -c "UPDATE users SET is_super_admin = true WHERE email = 'jkgkumar3@gmail.com';"

psql -h localhost -U processsutra -d processsutra_db -c "SELECT email, role, is_super_admin FROM users WHERE email = 'jkgkumar3@gmail.com';"
```

---

## Better Solution: Use Drizzle to Initialize Schema

```bash
cd /root/Process-Sutra-2026

# Check environment variables
cat .env | grep DATABASE_URL

# Make sure DATABASE_URL is correct:
# DATABASE_URL=postgresql://processsutra:ProcessSutra2026!Secure@localhost:5432/processsutra_db

# Initialize database with Drizzle
npm run db:push
# or
npx drizzle-kit push:pg

# Verify tables created
psql -h localhost -U processsutra -d processsutra_db -c "\dt"
```

---

## After Tables Are Created, Run Migrations

```bash
export PGPASSWORD='ProcessSutra2026!Secure'

# Clear false migration records
psql -h localhost -U processsutra -d processsutra_db -c "DROP TABLE IF EXISTS schema_migrations CASCADE;"

# Run all migrations fresh
for file in migrations/*.sql; do
    echo "Running $file..."
    psql -h localhost -U processsutra -d processsutra_db -f "$file"
done

# Set super admin
psql -h localhost -U processsutra -d processsutra_db -c "UPDATE users SET is_super_admin = true WHERE email = 'jkgkumar3@gmail.com';"

# Restart app
pm2 restart processsutra
```

---

## Recommended Action Right Now

**Run this command to use Drizzle to create the base schema:**

```bash
cd /root/Process-Sutra-2026

# Check if .env has correct DATABASE_URL
echo "Checking DATABASE_URL..."
grep DATABASE_URL .env

# Initialize schema using Drizzle
echo "Initializing database schema..."
npm run db:push

# Verify tables created
echo "Verifying tables..."
export PGPASSWORD='ProcessSutra2026!Secure'
psql -h localhost -U processsutra -d processsutra_db -c "\dt"

# If tables exist now, set super admin
psql -h localhost -U processsutra -d processsutra_db -c "UPDATE users SET is_super_admin = true WHERE email = 'jkgkumar3@gmail.com';"

# Restart
pm2 restart processsutra
```

---

## If npm run db:push doesn't exist

Check package.json for available commands:
```bash
cat package.json | grep -A 10 "scripts"
```

Look for commands like:
- `db:push`
- `db:migrate`
- `db:generate`
- `drizzle:push`

---

**Try the Drizzle command first - it's the cleanest solution!** 🚀
