# 🧪 Test IP Redirect Locally

## Quick Test (Before Deploying to VPS)

You can test the redirect logic locally before deploying:

### Step 1: Add DOMAIN_NAME to your local .env

Create a `.env` file in the root of your project (if it doesn't exist):

```bash
# Add this to .env
DOMAIN_NAME=processsutra.com
```

### Step 2: Start your dev server

```bash
npm run dev
```

### Step 3: Test the redirect

Since you're running on localhost, the middleware won't redirect (because localhost is not an IP address). But you can modify your hosts file to test:

#### On Windows:
1. Open PowerShell as Administrator
2. Edit hosts file:
   ```powershell
   notepad C:\Windows\System32\drivers\etc\hosts
   ```
3. Add this line:
   ```
   127.0.0.1 testip.local
   ```
4. Save and close

5. Now access: `http://testip.local:5000`
6. The middleware will NOT redirect because it's a hostname, not an IP

To truly test IP detection locally, you would need to:
- Access via `http://127.0.0.1:5000` (won't redirect - loopback)
- Or deploy to VPS and test with real IP

## 🚀 Better: Just Deploy and Test on VPS

The easiest way is to deploy directly to your VPS:

### Option 1: Use PowerShell Script (Windows)

```powershell
.\deploy-ip-redirect.ps1
```

The script now has the VPS IP (62.72.57.53) pre-configured, so you don't need to pass it as a parameter.

### Option 2: Manual Deployment

See `IP-REDIRECT-SIMPLE.md` for step-by-step manual instructions.

### Option 3: Using Git

```bash
# Commit changes
git add .
git commit -m "Add IP to domain redirect middleware"
git push origin main

# SSH to VPS
ssh root@YOUR_VPS_IP

# Pull and deploy
cd /root/Process-Sutra-2026
git pull origin main

# Add DOMAIN_NAME to .env
nano .env
# Add: DOMAIN_NAME=processsutra.com

# Rebuild and restart
npm run build
pm2 restart processsutra
pm2 logs processsutra
```

## 🧪 After Deployment - Test on VPS

```bash
# Test redirect
curl -I http://62.72.57.53

# Expected output:
# HTTP/1.1 301 Moved Permanently
# Location: https://processsutra.com/
```

Or open in browser: `http://62.72.57.53` → should redirect to `https://processsutra.com`

## 📊 Monitor Logs

After deploying, watch the logs:

```bash
ssh root@62.72.57.53
pm2 logs processsutra
```

When someone accesses via IP, you'll see:
```
Redirecting IP request to domain: https://processsutra.com/...
```

## ✅ What You'll See

1. **Before redirect**: Request to `http://185.123.45.67/login`
2. **After redirect**: Browser shows `https://processsutra.com/login`
3. **Logs show**: `Redirecting IP request to domain: https://processsutra.com/login`
