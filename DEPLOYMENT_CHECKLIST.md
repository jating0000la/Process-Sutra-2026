# 🚀 PRODUCTION DEPLOYMENT CHECKLIST

## ✅ **PRE-DEPLOYMENT (CRITICAL - DO BEFORE DEPLOYMENT)**

### Security & Configuration
- [ ] **Check .env file is NOT in Git history**
  ```powershell
  git log --all --full-history -- .env
  ```
- [ ] **Rotate ALL credentials if .env was ever committed**
  - [ ] New Google OAuth credentials (Google Cloud Console)
  - [ ] New SESSION_SECRET (128+ characters)
  - [ ] New ENCRYPTION_KEY (64 hex characters)
  
- [ ] **Create production .env file** (use .env.production.template)
  - [ ] All URLs use production domains (no localhost)
  - [ ] GOOGLE_REDIRECT_URI uses https://
  - [ ] DATABASE_URL points to production PostgreSQL
  - [ ] MONGODB_URI points to production MongoDB
  - [ ] NODE_ENV=production
  - [ ] COOKIE_SECURE=true (or not set)
  - [ ] DISABLE_DEV_AUTH=true
  - [ ] SESSION_SECRET is 128+ characters
  - [ ] ENCRYPTION_KEY is 64 hex characters
  
- [ ] **Update Google OAuth settings**
  - [ ] Add production redirect URI: https://processsutra.com/api/auth/google/callback
  - [ ] Add production domain to authorized origins
  - [ ] Test OAuth flow with production URL

### Database Setup
- [ ] **Production PostgreSQL database created**
- [ ] **Run database migrations**
  ```powershell
  npm run db:push
  ```
- [ ] **Production MongoDB cluster created**
- [ ] **Test database connections**
  ```powershell
  # Set production DATABASE_URL and test
  npm run dev
  # Check /api/health/db endpoint
  ```

### Build & Test
- [ ] **Build production bundle**
  ```powershell
  npm run build
  ```
- [ ] **No TypeScript errors**
  ```powershell
  npm run check
  ```
- [ ] **Test production build locally**
  ```powershell
  npm run start:prod
  ```
- [ ] **Test authentication flow**
  - [ ] Google OAuth login works
  - [ ] Session persists across page refreshes
  - [ ] Logout works correctly
  
- [ ] **Test critical features**
  - [ ] Create flow rule
  - [ ] Start flow
  - [ ] Complete task
  - [ ] Submit form
  - [ ] Upload file

---

## 🌐 **DEPLOYMENT STEPS**

### 1. Server Setup (First Time)
- [ ] **Server meets requirements**
  - [ ] 4 CPU cores minimum
  - [ ] 16GB RAM minimum
  - [ ] 200GB SSD minimum
  - [ ] Ubuntu 20.04+ or similar
  
- [ ] **Install dependencies**
  ```bash
  # Node.js 18+
  curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
  sudo apt-get install -y nodejs
  
  # PM2
  sudo npm install -g pm2
  
  # PostgreSQL client
  sudo apt-get install -y postgresql-client
  
  # Caddy (reverse proxy)
  sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
  sudo apt update
  sudo apt install caddy
  ```

### 2. Deploy Application
- [ ] **Clone repository**
  ```bash
  cd /var/www
  sudo git clone https://github.com/jating0000la/Process-Sutra-2026.git processsutra
  cd processsutra
  sudo chown -R $USER:$USER .
  ```

- [ ] **Copy production environment file**
  ```bash
  # Upload .env.production to server
  cp .env.production .env
  ```

- [ ] **Install dependencies**
  ```bash
  npm ci --only=production
  ```

- [ ] **Build application**
  ```bash
  npm run build
  ```

- [ ] **Configure Caddy**
  ```bash
  sudo cp Caddyfile /etc/caddy/Caddyfile
  sudo caddy reload --config /etc/caddy/Caddyfile
  ```

- [ ] **Start application with PM2**
  ```bash
  pm2 start ecosystem.config.production.js
  pm2 save
  pm2 startup
  ```

### 3. Verify Deployment
- [ ] **Health check passes**
  ```bash
  curl https://processsutra.com/api/health
  # Should return: {"ok":true,"ts":"...","env":"production","port":"5000"}
  ```

- [ ] **Database health check passes**
  ```bash
  curl https://processsutra.com/api/health/db
  # Should return: {"ok":true,"database":"connected"}
  ```

- [ ] **SSL certificate valid**
  ```bash
  openssl s_client -connect processsutra.com:443 -servername processsutra.com
  ```

- [ ] **Security headers present**
  ```bash
  curl -I https://processsutra.com/
  # Check for: X-Frame-Options, X-Content-Type-Options, Strict-Transport-Security
  ```

---

## 📊 **POST-DEPLOYMENT MONITORING**

### Immediate (First Hour)
- [ ] **Monitor PM2 logs**
  ```bash
  pm2 logs processsutra
  ```
- [ ] **Check error logs**
  ```bash
  tail -f /var/log/pm2/processsutra-error.log
  ```
- [ ] **Monitor Caddy logs**
  ```bash
  tail -f /var/log/caddy/access.log
  ```
- [ ] **Test user login flow** (5+ users)
- [ ] **Test critical workflows** (create flow, submit form)
- [ ] **Check database connections** (no errors in logs)

### First Day
- [ ] **Monitor server resources**
  ```bash
  pm2 monit
  htop
  ```
- [ ] **Check application metrics**
  - [ ] Response times < 500ms average
  - [ ] No memory leaks (stable memory usage)
  - [ ] CPU usage < 70% average
  - [ ] No error spikes in logs
  
- [ ] **Test from different locations/devices**
- [ ] **Verify all features work in production**

### First Week
- [ ] **Set up automated backups** (see BACKUP_SETUP.md)
- [ ] **Monitor user feedback** for issues
- [ ] **Check performance metrics**
- [ ] **Review and tune PM2 cluster** if needed
- [ ] **Optimize database queries** if slow

---

## 🔒 **SECURITY VERIFICATION**

- [ ] **Security headers configured**
  - [ ] Content-Security-Policy
  - [ ] X-Frame-Options: SAMEORIGIN
  - [ ] X-Content-Type-Options: nosniff
  - [ ] Strict-Transport-Security (HSTS)
  - [ ] X-XSS-Protection
  
- [ ] **HTTPS enforced** (HTTP redirects to HTTPS)
- [ ] **Secure cookies enabled** (COOKIE_SECURE=true)
- [ ] **CSRF protection active** (OAuth state validation)
- [ ] **Rate limiting working** (test with multiple requests)
- [ ] **CORS configured** (only processsutra.com allowed)
- [ ] **Development mode disabled** (DISABLE_DEV_AUTH=true)
- [ ] **No sensitive data in logs**
- [ ] **Environment variables not exposed** (check /api/health response)

---

## 🔧 **TROUBLESHOOTING**

### Application won't start
```bash
# Check PM2 status
pm2 status

# Check detailed logs
pm2 logs processsutra --lines 100

# Restart application
pm2 restart processsutra

# Check environment variables
pm2 env 0
```

### Database connection fails
```bash
# Test PostgreSQL connection
psql $DATABASE_URL -c "SELECT 1"

# Test MongoDB connection
mongosh "$MONGODB_URI" --eval "db.runCommand({ping: 1})"

# Check application logs
pm2 logs processsutra | grep -i "database"
```

### SSL certificate issues
```bash
# Check Caddy status
sudo systemctl status caddy

# Reload Caddy configuration
sudo caddy reload --config /etc/caddy/Caddyfile

# Check Caddy logs
sudo journalctl -u caddy -f
```

### High memory usage
```bash
# Restart PM2 cluster
pm2 reload processsutra

# Check memory per instance
pm2 monit

# Reduce max memory if needed
# Edit ecosystem.config.production.js: max_memory_restart: '2G'
pm2 reload processsutra
```

---

## 📞 **EMERGENCY ROLLBACK**

If critical issues occur in production:

```bash
# 1. Stop current application
pm2 stop processsutra

# 2. Checkout previous stable version
git checkout <previous-stable-commit>

# 3. Rebuild
npm ci
npm run build

# 4. Restart
pm2 restart processsutra

# 5. Verify health
curl https://processsutra.com/api/health
```

---

## ✅ **DEPLOYMENT COMPLETE CHECKLIST**

- [ ] Application running on production server
- [ ] All health checks passing
- [ ] SSL certificate valid and auto-renewing
- [ ] Monitoring and logging configured
- [ ] Backups automated and tested
- [ ] Team notified of deployment
- [ ] User documentation updated
- [ ] Incident response plan documented

---

**Last Updated:** November 25, 2025  
**Deployment Guide Version:** 1.0  
**Target Environment:** Production (processsutra.com)
