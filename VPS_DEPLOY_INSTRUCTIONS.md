# 🚀 VPS Deployment Instructions

## Quick Deploy - 3 Steps

### Step 1: Push to GitHub (Do this now on Windows)

```powershell
git push origin main
```

### Step 2: Configure on VPS

```bash
# SSH to VPS
ssh username@your-vps-ip

# Navigate to project
cd /path/to/Process-Sutra-2026

# Pull latest code
git pull origin main

# Edit deployment script - SET YOUR SUPER ADMIN EMAIL!
nano deploy-vps-complete.sh

# Set this line (database credentials are already configured):
# SUPER_ADMIN_EMAIL="your@email.com"
```

### Step 3: Deploy

```bash
# Make executable
chmod +x deploy-vps-complete.sh

# Run deployment
./deploy-vps-complete.sh
```

---

## What Gets Deployed

✅ **9 Database Migrations**:
- Webhooks table
- Task cancellation fields  
- Notifications system (v1 & v2)
- Performance indexes (P0, P1, P2)
- Super admin field (is_super_admin)
- Audit logs table

✅ **Application Features**:
- System Super Admin dashboard
- Multi-organization management
- Complete audit trail
- Rate limiting
- Webhook integrations

---

## After Deployment

### Verify Success

```bash
# Check app status
pm2 status

# Test health
curl http://localhost:5000/api/health

# Verify super admin
psql -d processsutra -c "SELECT email, is_super_admin FROM users WHERE is_super_admin = true;"

# View logs
pm2 logs process-sutra --lines 20
```

### Access Super Admin

1. Log in with your email
2. Look for **"System Admin"** button (red) in sidebar
3. Click to access `/system-super-admin`
4. You should see ALL organizations

---

## Manual Deployment (Alternative)

If the script fails, deploy manually:

```bash
# 1. Backup
export PGPASSWORD='your_password'
pg_dump -d processsutra > backup_$(date +%Y%m%d).sql

# 2. Run migrations
for file in migrations/*.sql; do
    psql -d processsutra -f "$file"
done

# 3. Setup super admin
psql -d processsutra -c "UPDATE users SET is_super_admin = true WHERE email = 'your@email.com';"

# 4. Build and restart
npm run build
pm2 restart process-sutra
```

---

## Troubleshooting

### Database connection fails
```bash
# Test connection
psql -d processsutra -c "SELECT NOW();"

# Check PostgreSQL is running
sudo systemctl status postgresql
```

### User not found for super admin
```bash
# User must log in first before being promoted
# After they log in, run:
psql -d processsutra -c "UPDATE users SET is_super_admin = true WHERE email = 'their@email.com';"
```

### Application won't start
```bash
# Check logs
pm2 logs process-sutra --lines 100

# Rebuild
npm run build
pm2 restart process-sutra
```

---

## Need More Help?

Check these files for detailed info:
- `RUN_ALL_MIGRATIONS_VPS.md` - Migration details
- `SYSTEM_SUPER_ADMIN_SETUP.md` - Super admin setup
- `DEPLOYMENT_CHECKLIST.md` - Complete checklist
- `AUDIT_TRAIL_QUICK_REFERENCE.md` - Audit trail usage

---

## Time Estimate

- **Automated script**: 2-5 minutes
- **Manual deployment**: 10-15 minutes
- **Verification**: 2-3 minutes

**Total**: ~5-8 minutes with script

---

**Ready? Push to GitHub and SSH to your VPS!** 🚀
