# FlowSense Railway Deployment Guide

This guide will help you deploy your FlowSense application on Railway.com with a PostgreSQL database.

## 🏗️ Architecture Overview

Your FlowSense application on Railway will include:
- **Frontend**: React app served statically
- **Backend**: Node.js/Express API server  
- **Database**: Railway PostgreSQL
- **Authentication**: Firebase Auth
- **Real-time**: WebSocket support
- **Container**: Docker containerized application

## 📋 Prerequisites

1. **Railway Account** - Sign up at [railway.app](https://railway.app)
2. **GitHub Account** - For connecting your repository
3. **Firebase Project** - Already configured
4. **Git** - Your code should be in a Git repository

## 🚀 Step-by-Step Deployment

### Step 1: Prepare Your Repository

1. **Push your code to GitHub** (if not already done):
   ```bash
   git init
   git add .
   git commit -m "Initial commit for Railway deployment"
   git branch -M main
   git remote add origin https://github.com/yourusername/flowsense.git
   git push -u origin main
   ```

### Step 2: Create Railway Project

1. Go to [railway.app](https://railway.app) and sign in
2. Click **"New Project"**
3. Select **"Deploy from GitHub repo"**
4. Choose your FlowSense repository
5. Railway will automatically detect it's a Node.js project

### Step 3: Add PostgreSQL Database

1. In your Railway project dashboard, click **"New"**
2. Select **"Database"** → **"Add PostgreSQL"**
3. Railway will provision a PostgreSQL database automatically
4. Note down the connection details (available in the database service variables)

### Step 4: Configure Environment Variables

In your Railway project, go to **Variables** tab and add these environment variables:

#### Database
```
DATABASE_URL=postgresql://postgres:password@hostname:port/railway
```
*Note: Railway will auto-generate this when you add PostgreSQL*

#### Session Secret
```
SESSION_SECRET=your-super-secure-session-secret-minimum-32-characters
```

#### Firebase Backend (Admin SDK)
```
FIREBASE_PROJECT_ID=taskflowpro-c62c1
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@taskflowpro-c62c1.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY=your-firebase-private-key
FIREBASE_CLIENT_ID=104843425969082480520
```

#### Firebase Frontend (JS SDK)
```
VITE_FIREBASE_API_KEY=AIzaSyAxZL1iUTnvm-p6sqRSg5G5uZu9ztA8me0
VITE_FIREBASE_AUTH_DOMAIN=taskflowpro-c62c1.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=taskflowpro-c62c1
VITE_FIREBASE_STORAGE_BUCKET=taskflowpro-c62c1.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=975860144476
VITE_FIREBASE_APP_ID=1:975860144476:web:678bc5d5e4c4030e450999
VITE_FIREBASE_MEASUREMENT_ID=G-GVQGWCF9EK
```

#### Application Settings
```
NODE_ENV=production
PORT=5000
```

### Step 5: Deploy

1. Railway will automatically deploy when you push to your main branch
2. Monitor the build logs in the Railway dashboard
3. Once deployed, Railway will provide you with a public URL

## 🔧 Railway Configuration Files

### railway.json (Optional)
Create this file in your project root for advanced configuration:

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "dockerfile"
  },
  "deploy": {
    "startCommand": "npm start",
    "healthcheckPath": "/api/health"
  }
}
```

## 🔍 Verification Steps

1. **Check Database Connection**: Visit `https://your-app.railway.app/api/health`
2. **Test Authentication**: Try logging in with Firebase Auth
3. **Test WebSocket**: Check real-time features
4. **Check Logs**: Monitor Railway logs for any issues

## 🎯 Railway-Specific Optimizations

### 1. Health Check Endpoint
Your app already has a health check endpoint at `/api/health`. If you need to verify it exists, check `server/routes.ts`.

### 2. Port Configuration
Ensure your server uses the Railway-provided PORT:

```typescript
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
```

### 3. Database Migration
Railway might reset your database. Consider adding a migration script:

```json
{
  "scripts": {
    "db:migrate": "drizzle-kit push",
    "postinstall": "npm run db:migrate"
  }
}
```

## 🔄 Continuous Deployment

Railway automatically redeploys when you push to your connected branch:

```bash
git add .
git commit -m "Update feature"
git push origin main
```

## 📊 Monitoring & Logs

- **Railway Dashboard**: View deployment status, logs, and metrics
- **Environment Variables**: Manage secrets securely
- **Custom Domains**: Add your own domain in Railway settings
- **Usage Metrics**: Monitor CPU, memory, and bandwidth usage

## 🚨 Troubleshooting

### Build Failures
- Check Railway build logs
- Verify all dependencies are in package.json
- Ensure Dockerfile is properly configured

### Database Issues
- Verify DATABASE_URL is correctly set
- Check if database migrations ran successfully
- Monitor database connection logs

### Environment Variables
- Ensure all required variables are set in Railway dashboard
- Check for typos in variable names
- Verify Firebase configuration

### Performance Issues
- Monitor Railway metrics dashboard
- Consider upgrading Railway plan if needed
- Optimize your application code

## 💰 Cost Estimation

Railway pricing (as of 2025):
- **Free Tier**: $5 credit monthly (good for testing)
- **Pro Plan**: $20/month + usage
- **Database**: ~$5-10/month for PostgreSQL

## 🎉 Next Steps

1. **Custom Domain**: Add your domain in Railway settings
2. **SSL Certificate**: Railway provides free SSL
3. **Monitoring**: Set up alerts and monitoring
4. **Backups**: Configure database backups
5. **Staging Environment**: Create a separate Railway project for staging

## 📞 Support

- **Railway Docs**: [docs.railway.app](https://docs.railway.app)
- **Railway Discord**: Join their community
- **Railway Status**: [status.railway.app](https://status.railway.app)

---

**Note**: Replace all placeholder values (like Firebase keys) with your actual production values before deploying.
