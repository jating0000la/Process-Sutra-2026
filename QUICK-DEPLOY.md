# 🎯 Quick Deploy Reference

## VPS Details
- **IP Address:** `62.72.57.53`
- **User:** `root`
- **Project Path:** `/root/Process-Sutra-2026`

## 🚀 Quick Deploy (Choose One)

### Option 1: Automated PowerShell Script
```powershell
.\deploy-ip-redirect.ps1
```

### Option 2: Manual 3-Step Deploy
```bash
# Step 1: Add to .env on VPS
ssh root@62.72.57.53
nano /root/Process-Sutra-2026/.env
# Add: DOMAIN_NAME=processsutra.com

# Step 2: Upload updated code
scp server\index.ts root@62.72.57.53:/root/Process-Sutra-2026/server/index.ts

# Step 3: Rebuild and restart
ssh root@62.72.57.53
cd /root/Process-Sutra-2026
npm run build
pm2 restart processsutra
```

### Option 3: Git Pull Method
```bash
# On local machine
git add .
git commit -m "Add IP redirect"
git push origin main

# On VPS
ssh root@62.72.57.53
cd /root/Process-Sutra-2026
git pull origin main
nano .env  # Add: DOMAIN_NAME=processsutra.com
npm run build
pm2 restart processsutra
```

## 🧪 Test After Deploy

```bash
# Test with curl
curl -I http://62.72.57.53

# Or open in browser
http://62.72.57.53  →  should redirect to https://processsutra.com
```

## 📊 Monitor

```bash
ssh root@62.72.57.53
pm2 logs processsutra
```

## 🔧 Troubleshoot

```bash
# Check .env
ssh root@62.72.57.53
cat /root/Process-Sutra-2026/.env | grep DOMAIN_NAME

# Restart if needed
pm2 restart processsutra

# View logs
pm2 logs processsutra --lines 50
```
