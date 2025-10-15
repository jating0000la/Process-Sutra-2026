# 🚀 VPS Deployment - Copy & Paste Commands

## Complete Deployment (3 Commands)

```bash
# 1. Connect and navigate
ssh username@your-vps-ip
cd /path/to/Process-Sutra-2026
git pull origin main

# 2. Set your email
nano deploy-vps-complete.sh
# Change: SUPER_ADMIN_EMAIL="your@email.com"
# Save: Ctrl+O, Enter, Ctrl+X

# 3. Deploy
chmod +x deploy-vps-complete.sh
./deploy-vps-complete.sh
```

---

## Quick Verification (After Deployment)

```bash
# Check status
pm2 status

# Test health
curl http://localhost:5000/api/health

# Verify super admin
psql -U processsutra -d processsutra_db -c "SELECT email, is_super_admin FROM users WHERE is_super_admin = true;"

# View migrations
psql -U processsutra -d processsutra_db -c "SELECT * FROM schema_migrations;"

# Check logs
pm2 logs process-sutra --lines 20
```

---

## Database Credentials (Already Configured)

- **Database**: `processsutra_db`
- **Username**: `processsutra`
- **Password**: `ProcessSutra2026!Secure`
- **Host**: `localhost`

✅ Scripts are pre-configured with these!

---

## Manual Deployment (If Script Fails)

```bash
# Set password
export PGPASSWORD='ProcessSutra2026!Secure'

# Backup
pg_dump -U processsutra -d processsutra_db > backup_$(date +%Y%m%d).sql

# Run all migrations
for file in migrations/*.sql; do
    psql -U processsutra -d processsutra_db -f "$file"
done

# Setup super admin
psql -U processsutra -d processsutra_db -c "UPDATE users SET is_super_admin = true WHERE email = 'your@email.com';"

# Build and restart
npm install
npm run build
pm2 restart process-sutra
```

---

## Troubleshooting One-Liners

```bash
# Database connection test
psql -U processsutra -d processsutra_db -c "SELECT NOW();"

# Check PostgreSQL
sudo systemctl status postgresql

# Restart PostgreSQL
sudo systemctl restart postgresql

# Force rebuild app
npm run build && pm2 restart process-sutra

# View error logs
pm2 logs process-sutra --err --lines 50

# Check port 5000
sudo netstat -tulpn | grep 5000

# Manually promote super admin
psql -U processsutra -d processsutra_db -c "UPDATE users SET is_super_admin = true WHERE email = 'your@email.com';"
```

---

## Access After Deployment

1. Log in with your email
2. Click **"System Admin"** (red button) in sidebar
3. Access `/system-super-admin`
4. Manage ALL organizations

---

## Time Estimate

⏱️ **Total: 3-5 minutes**

---

## Documentation

- `VPS_DEPLOYMENT_FINAL.md` - Complete guide
- `READY_TO_DEPLOY_VPS.md` - Detailed instructions
- `VPS_DEPLOY_INSTRUCTIONS.md` - Quick reference

---

**Ready? Copy the commands above and run on VPS!** 🎉
