# 🚀 ProcessSutra Deployment Checklist - processsutra.com

## ✅ Pre-Deployment Checklist

### 1. VPS Requirements
- [ ] Ubuntu 20.04+ or CentOS 8+ VPS
- [ ] Minimum 2GB RAM (4GB recommended)
- [ ] 20GB+ storage space
- [ ] Root or sudo access
- [ ] Static IP address assigned

### 2. Domain Configuration
- [ ] Domain `processsutra.com` purchased
- [ ] DNS A record pointing to VPS IP
- [ ] WWW subdomain configured (optional)
- [ ] DNS propagation completed (24-48 hours)

### 3. Required Credentials
- [ ] PostgreSQL database credentials
- [ ] MongoDB credentials (if using)
- [ ] Firebase project configuration
- [ ] Session secret generated (`openssl rand -hex 32`)
- [ ] SMTP credentials (if using email)

## 🛠️ Deployment Steps

### Step 1: VPS Initial Setup
```bash
# On your VPS, run:
wget https://raw.githubusercontent.com/jating0000la/Process-Sutra-2026/main/vps-setup.sh
chmod +x vps-setup.sh
./vps-setup.sh
```

### Step 2: Clone Repository
```bash
cd /var/www/processsutra
git clone https://github.com/jating0000la/Process-Sutra-2026.git .
```

### Step 3: Configure Environment
```bash
# Copy and edit production environment
cp .env.production.template .env.production
nano .env.production

# Update these critical values:
# - DATABASE_URL (PostgreSQL connection)
# - MONGODB_URI (MongoDB connection)
# - SESSION_SECRET (generate with openssl rand -hex 32)
# - FIREBASE_* (your Firebase project credentials)
# - DOMAIN=processsutra.com
```

### Step 4: Deploy Application
```bash
# Run deployment script
./deploy.sh
```

### Step 5: Configure Nginx
```bash
# Copy nginx configuration
sudo cp nginx.conf /etc/nginx/sites-available/processsutra.com
sudo ln -s /etc/nginx/sites-available/processsutra.com /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
```

### Step 6: Setup SSL Certificate
```bash
# Get Let's Encrypt SSL certificate
sudo certbot --nginx -d processsutra.com -d www.processsutra.com

# Setup auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

## 🔍 Post-Deployment Verification

### 1. Application Health Checks
- [ ] Visit `https://processsutra.com` - loads successfully
- [ ] API health check: `https://processsutra.com/api/health`
- [ ] User registration/login works
- [ ] Database connections established
- [ ] File uploads working (if applicable)

### 2. Performance Checks
- [ ] Page load time < 3 seconds
- [ ] SSL certificate valid and secure
- [ ] Mobile responsiveness working
- [ ] All API endpoints responding

### 3. Security Verification
- [ ] HTTPS redirect working (http → https)
- [ ] Security headers present
- [ ] Firewall configured (ports 22, 80, 443 only)
- [ ] Database access restricted
- [ ] No sensitive data in logs

### 4. Monitoring Setup
- [ ] PM2 process running: `pm2 status`
- [ ] Logs accessible: `pm2 logs processsutra`
- [ ] System monitoring configured
- [ ] Backup scripts scheduled

## 🔧 Configuration Verification

### Environment Variables Check
```bash
# Verify critical environment variables are set
grep -E "(DATABASE_URL|MONGODB_URI|SESSION_SECRET|FIREBASE_PROJECT_ID)" .env.production
```

### Service Status Check
```bash
# Check all services are running
sudo systemctl status nginx
sudo systemctl status postgresql
sudo systemctl status mongod
pm2 status
```

### Database Connection Test
```bash
# Test PostgreSQL connection
psql $DATABASE_URL -c "SELECT version();"

# Test MongoDB connection (if using)
mongo $MONGODB_URI --eval "db.runCommand({connectionStatus: 1})"
```

## 📊 Monitoring Commands

### Application Monitoring
```bash
# Check PM2 status
pm2 status

# View application logs
pm2 logs processsutra

# Monitor system resources
pm2 monit

# Check memory usage
free -h

# Check disk space
df -h
```

### Web Server Monitoring
```bash
# Check nginx status
sudo systemctl status nginx

# View nginx access logs
sudo tail -f /var/log/nginx/access.log

# View nginx error logs
sudo tail -f /var/log/nginx/error.log
```

## 🔄 Maintenance Tasks

### Daily Tasks
- [ ] Check application logs for errors
- [ ] Monitor system resource usage
- [ ] Verify SSL certificate validity

### Weekly Tasks
- [ ] Review security logs
- [ ] Check backup integrity
- [ ] Update system packages: `sudo apt update && sudo apt upgrade`

### Monthly Tasks
- [ ] Review and rotate logs
- [ ] Performance optimization review
- [ ] Security audit
- [ ] Backup restoration test

## 🆘 Emergency Procedures

### Application Down
```bash
# Quick restart
pm2 restart processsutra

# If that fails, rebuild and restart
cd /var/www/processsutra
git pull origin main
npm run build
pm2 restart processsutra
```

### Database Issues
```bash
# Check PostgreSQL
sudo systemctl restart postgresql
sudo -u postgres psql -c "SELECT version();"

# Check MongoDB
sudo systemctl restart mongod
mongo --eval "db.runCommand({connectionStatus: 1})"
```

### SSL Certificate Issues
```bash
# Renew certificate manually
sudo certbot renew --force-renewal

# Check certificate status
sudo certbot certificates
```

## 📞 Support Contacts

- **Technical Issues**: Check logs first, then GitHub issues
- **Domain Issues**: Contact domain registrar
- **VPS Issues**: Contact hosting provider
- **SSL Issues**: Let's Encrypt documentation

## 🎉 Success Criteria

Your deployment is successful when:
- [ ] `https://processsutra.com` loads without errors
- [ ] All core features work (login, forms, workflows)
- [ ] SSL certificate is valid and secure
- [ ] Performance is acceptable (< 3s load time)
- [ ] Monitoring and backups are configured
- [ ] Documentation is updated with any custom changes

---

**Congratulations! ProcessSutra is now live at https://processsutra.com** 🚀