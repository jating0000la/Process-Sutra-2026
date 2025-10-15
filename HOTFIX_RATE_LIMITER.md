# 🔥 HOTFIX: Rate Limiter IPv6 Error

## Problem
Your VPS is showing this error:
```
ValidationError: Custom keyGenerator appears to use request IP without calling the ipKeyGenerator helper function for IPv6 addresses.
ERR_ERL_KEY_GEN_IPV6
```

## Root Cause
The VPS is running **old code** that hasn't been updated with the latest GitHub push. The old version has a custom `keyGenerator` that doesn't handle IPv6 properly.

## Solution: Deploy Latest Code to VPS

### Step 1: SSH to VPS
```bash
ssh username@your-vps-ip
```

### Step 2: Navigate to Application Directory
```bash
cd /root/Process-Sutra-2026
```

### Step 3: Stop the Application
```bash
pm2 stop processs
```

### Step 4: Pull Latest Code from GitHub
```bash
git pull origin main
```

**Expected output:**
```
remote: Enumerating objects: 62, done.
remote: Counting objects: 100% (62/62), done.
Updating 0112e4b..c2c6964
Fast-forward
 server/routes.ts | 15 +++++----------
 ... (other files)
```

### Step 5: Rebuild the Application
```bash
npm run build
```

**This compiles TypeScript to dist/index.js with the fixed rate limiter**

### Step 6: Restart the Application
```bash
pm2 restart processs
```

### Step 7: Verify the Fix
```bash
# Check logs for errors
pm2 logs processs --lines 50

# Should NOT see ERR_ERL_KEY_GEN_IPV6 error anymore
# Should see: "Server running on port 5000"
```

### Step 8: Test Health Endpoint
```bash
curl http://localhost:5000/api/health
```

**Expected response:**
```json
{
  "status": "ok",
  "timestamp": "2025-10-15T..."
}
```

## What Was Fixed?

### Before (Old Code - Causing Error):
```typescript
const formSubmissionLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  keyGenerator: (req) => {
    // This was causing IPv6 error:
    return req.body.formId || req.ip || 'global';
  }
});
```

### After (New Code - Fixed):
```typescript
const formSubmissionLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: "Too many form submissions. Please wait before submitting again.",
  standardHeaders: true,
  legacyHeaders: false,
  // No custom keyGenerator - express-rate-limit handles IPv4/IPv6 automatically
});
```

## Why This Fix Works
- Removed custom `keyGenerator` that was accessing `req.ip` without IPv6 handling
- `express-rate-limit` v8.1.0 has built-in IPv6 support when you don't override keyGenerator
- The library automatically uses the correct IP extraction method for both IPv4 and IPv6

## Troubleshooting

### If `git pull` fails with "local changes" error:
```bash
# Stash local changes
git stash

# Pull latest
git pull origin main

# Rebuild
npm run build

# Restart
pm2 restart processs
```

### If build fails:
```bash
# Clean node_modules and rebuild
rm -rf node_modules dist
npm install
npm run build
pm2 restart processs
```

### If error persists after update:
```bash
# Verify you're on the latest commit
git log --oneline -1
# Should show: c2c6964 feat: Add complete super admin system...

# Check if dist/index.js was rebuilt
ls -lh dist/index.js
# File should be recent (after your build)

# Force restart PM2
pm2 delete processs
pm2 start ecosystem.config.js
```

## Next Steps After Fix

1. ✅ **Verify no more rate limiter errors** in logs
2. ✅ **Run migrations** using `./run-all-migrations.sh` (see COMPLETE_MIGRATION_GUIDE.md)
3. ✅ **Test super admin features** after migrations complete
4. ✅ **Monitor logs** for any other issues

## Prevention
This error occurred because the VPS wasn't updated after the GitHub push. To prevent this in the future:

1. Always run `git pull` on VPS after pushing to GitHub
2. Always rebuild with `npm run build` after pulling code changes
3. Always restart with `pm2 restart processs` after rebuilding
4. Verify with `pm2 logs` that application started without errors

## Summary
- **Problem**: Old code with IPv6-incompatible rate limiter
- **Cause**: VPS not updated with latest GitHub code
- **Fix**: `git pull` + `npm run build` + `pm2 restart`
- **Time**: ~2-3 minutes
- **Risk**: None - this is a bugfix, not a breaking change
