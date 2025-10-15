# 🚀 VPS Connection and Deployment Commands

## SSH Connection
```bash
ssh root@62.72.57.53
```

---

## Once Connected - Run These Commands

### 1. Navigate to Project
```bash
cd /root/Process-Sutra-2026
# or wherever your project is located
# If you don't know, try: find / -name "Process-Sutra-2026" 2>/dev/null
```

### 2. Pull Latest Code
```bash
git pull origin main
```

### 3. Set Your Super Admin Email
```bash
nano deploy-vps-complete.sh

# Find line 14 and change:
# SUPER_ADMIN_EMAIL=""
# To:
# SUPER_ADMIN_EMAIL="jkgkumar3@gmail.com"

# Save: Ctrl+O, Enter, Ctrl+X
```

### 4. Make Script Executable
```bash
chmod +x deploy-vps-complete.sh
```

### 5. Run Deployment
```bash
./deploy-vps-complete.sh
```

---

## Expected Output

The script will:
- ✅ Create database backup
- ✅ Run all 9 migrations (create tables: users, webhooks, notifications, audit_logs)
- ✅ Setup super admin for jkgkumar3@gmail.com
- ✅ Build and restart application

**Time: 3-5 minutes**

---

## Verification Commands (After Deployment)

```bash
# Check app status
pm2 status

# Test health
curl http://localhost:5000/api/health

# Verify tables exist
psql -U processsutra -d processsutra_db -c "\dt"

# Verify super admin
psql -U processsutra -d processsutra_db -c "SELECT email, is_super_admin FROM users WHERE email = 'jkgkumar3@gmail.com';"

# View logs
pm2 logs process-sutra --lines 20
```

---

## If Deployment Fails - Manual Migration

```bash
# Set password
export PGPASSWORD='ProcessSutra2026!Secure'

# Check if database exists
psql -U processsutra -l | grep processsutra_db

# Run migrations manually
cd /root/Process-Sutra-2026
for file in migrations/*.sql; do
    echo "Running $file..."
    psql -U processsutra -d processsutra_db -f "$file"
done

# Setup super admin
psql -U processsutra -d processsutra_db -c "UPDATE users SET is_super_admin = true WHERE email = 'jkgkumar3@gmail.com';"

# Build and restart
npm install
npm run build
pm2 restart process-sutra
```

---

## Quick Troubleshooting

### If "database does not exist"
```bash
# Create database
sudo -u postgres psql -c "CREATE DATABASE processsutra_db;"
sudo -u postgres psql -c "CREATE USER processsutra WITH PASSWORD 'ProcessSutra2026!Secure';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE processsutra_db TO processsutra;"

# Then run migrations
```

### If "user does not exist" for super admin
```bash
# User must log in to the app first, then run:
psql -U processsutra -d processsutra_db -c "UPDATE users SET is_super_admin = true WHERE email = 'jkgkumar3@gmail.com';"
```

---

## Connection Info

- **VPS IP**: `62.72.57.53`
- **User**: `root`
- **Database**: `processsutra_db`
- **DB User**: `processsutra`
- **DB Password**: `ProcessSutra2026!Secure`
- **Super Admin Email**: `jkgkumar3@gmail.com`

---

**Ready to connect? Copy the SSH command above!** 🚀
