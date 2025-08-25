# 🚂 Railway Deployment Quick Start

## Files Created/Modified for Railway Deployment:

1. **`RAILWAY_DEPLOYMENT.md`** - Complete deployment guide
2. **`railway.json`** - Railway configuration
3. **`.env.railway`** - Environment variables template
4. **`deploy-railway.ps1`** - PowerShell deployment script
5. **`deploy-railway.sh`** - Bash deployment script
6. **`.railwayignore`** - Files to exclude from deployment
7. **`server/index.ts`** - Updated to bind to 0.0.0.0 in production

## Quick Deployment Steps:

### 1. Prepare Repository
```powershell
# If not already done
git init
git add .
git commit -m "Initial commit for Railway deployment"
git remote add origin https://github.com/yourusername/flowsense.git
git push -u origin main
```

### 2. Install Railway CLI
```powershell
npm install -g @railway/cli
```

### 3. Deploy to Railway
```powershell
railway login
railway new
railway add postgresql
railway up
```

### 4. Set Environment Variables
Go to your Railway dashboard and add variables from `.env.railway`

### 5. Access Your App
```powershell
railway open
```

## Environment Variables to Set in Railway:

- `SESSION_SECRET` - Generate a secure 32+ character string
- `FIREBASE_PROJECT_ID` - taskflowpro-c62c1
- `FIREBASE_CLIENT_EMAIL` - firebase-adminsdk-fbsvc@taskflowpro-c62c1.iam.gserviceaccount.com
- `FIREBASE_PRIVATE_KEY` - Your Firebase private key
- `FIREBASE_CLIENT_ID` - 104843425969082480520
- `VITE_FIREBASE_API_KEY` - AIzaSyAxZL1iUTnvm-p6sqRSg5G5uZu9ztA8me0
- `VITE_FIREBASE_AUTH_DOMAIN` - taskflowpro-c62c1.firebaseapp.com
- `VITE_FIREBASE_PROJECT_ID` - taskflowpro-c62c1
- `VITE_FIREBASE_STORAGE_BUCKET` - taskflowpro-c62c1.appspot.com
- `VITE_FIREBASE_MESSAGING_SENDER_ID` - 975860144476
- `VITE_FIREBASE_APP_ID` - 1:975860144476:web:678bc5d5e4c4030e450999
- `VITE_FIREBASE_MEASUREMENT_ID` - G-GVQGWCF9EK
- `NODE_ENV` - production

Note: Railway automatically provides `DATABASE_URL` when you add PostgreSQL.

## Health Check
Your app will be accessible at `/api/health` for Railway's health monitoring.

## Support
- Railway Docs: https://docs.railway.app
- Railway Discord: Join their community for help

Happy deploying! 🚀
