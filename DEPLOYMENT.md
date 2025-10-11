# 🚀 ProcessSutra Deployment Guide - processsutra.com

## 📋 Prerequisites

### VPS Requirements
- Ubuntu 20.04+ or CentOS 8+
- 2GB RAM minimum (4GB recommended)
- 20GB storage minimum
- Root or sudo access

### Domain Setup
- Domain: `processsutra.com`
- DNS A record pointing to your VPS IP
- SSL certificate (Let's Encrypt recommended)

## 🛠️ Server Setup

### 1. Initial Server Configuration

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install required packages
sudo apt install -y curl wget git nginx postgresql postgresql-contrib mongodb

# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2 globally
sudo npm install -g pm2
```

### 2. Database Setup

#### PostgreSQL Setup
```bash
# Switch to postgres user
sudo -u postgres psql

# Create database and user
CREATE DATABASE processsutra;
CREATE USER processsutra_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE processsutra TO processsutra_user;
\q
```

#### MongoDB Setup
```bash
# Start MongoDB service
sudo systemctl start mongod
sudo systemctl enable mongod

# Create MongoDB user (optional)
mongo
use processsutra
db.createUser({
  user: "processsutra_user",
  pwd: "your_secure_password",
  roles: ["readWrite"]
})
```

### 3. Application Deployment

```bash
# Create application directory
sudo mkdir -p /var/www/processsutra
sudo chown $USER:$USER /var/www/processsutra

# Clone repository
cd /var/www/processsutra
git clone https://github.com/your-username/Process-Sutra-2026.git .

# Copy and configure environment
cp .env.production.template .env.production
nano .env.production  # Update with your credentials

# Run deployment script
./deploy.sh
```

### 4. Nginx Configuration

```bash
# Copy nginx configuration
sudo cp nginx.conf /etc/nginx/sites-available/processsutra.com
sudo ln -s /etc/nginx/sites-available/processsutra.com /etc/nginx/sites-enabled/

# Remove default site
sudo rm /etc/nginx/sites-enabled/default

# Test and restart nginx
sudo nginx -t
sudo systemctl restart nginx
```

### 5. SSL Certificate (Let's Encrypt)

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d processsutra.com -d www.processsutra.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

## 🔧 Environment Configuration

Update `.env.production` with your actual values:

```bash
# Database URLs
DATABASE_URL=postgresql://processsutra_user:your_password@localhost:5432/processsutra
MONGODB_URI=mongodb://processsutra_user:your_password@localhost:27017/processsutra

# Generate secure session secret
SESSION_SECRET=$(openssl rand -hex 32)

# Firebase credentials (update with your project)
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_ACTUAL_PRIVATE_KEY\n-----END PRIVATE KEY-----"
```

## 📊 Monitoring & Maintenance

### PM2 Commands
```bash
# Check application status
pm2 status

# View logs
pm2 logs processsutra

# Restart application
pm2 restart processsutra

# Monitor resources
pm2 monit
```

### System Monitoring
```bash
# Check disk space
df -h

# Check memory usage
free -h

# Check CPU usage
top

# Check nginx status
sudo systemctl status nginx

# Check database status
sudo systemctl status postgresql
sudo systemctl status mongod
```

## 🔄 Updates & Deployment

### Automated Updates
```bash
# Create update script
cat > update.sh << 'EOF'
#!/bin/bash
cd /var/www/processsutra
git pull origin main
npm ci --production=false
npm run build
pm2 restart processsutra
EOF

chmod +x update.sh
```

### Manual Updates
```bash
cd /var/www/processsutra
git pull origin main
npm install
npm run build
pm2 restart processsutra
```

## 🛡️ Security Checklist

- [ ] Firewall configured (UFW)
- [ ] SSH key authentication enabled
- [ ] Root login disabled
- [ ] Regular security updates
- [ ] Database access restricted
- [ ] SSL certificate installed
- [ ] Security headers configured
- [ ] Regular backups scheduled

### Firewall Setup
```bash
# Enable UFW
sudo ufw enable

# Allow necessary ports
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443

# Check status
sudo ufw status
```

## 📦 Backup Strategy

### Database Backup
```bash
# PostgreSQL backup
pg_dump -U processsutra_user -h localhost processsutra > backup_$(date +%Y%m%d).sql

# MongoDB backup
mongodump --db processsutra --out backup_$(date +%Y%m%d)
```

### Application Backup
```bash
# Create backup script
cat > backup.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/var/backups/processsutra"

mkdir -p $BACKUP_DIR

# Backup database
pg_dump -U processsutra_user processsutra > $BACKUP_DIR/db_$DATE.sql

# Backup application files
tar -czf $BACKUP_DIR/app_$DATE.tar.gz /var/www/processsutra --exclude=node_modules

# Keep only last 7 days of backups
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete
EOF

chmod +x backup.sh

# Schedule daily backups
(crontab -l 2>/dev/null; echo "0 2 * * * /var/www/processsutra/backup.sh") | crontab -
```

## 🆘 Troubleshooting

### Common Issues

1. **Application won't start**
   ```bash
   # Check logs
   pm2 logs processsutra
   
   # Check environment variables
   cat .env.production
   
   # Test database connection
   psql -U processsutra_user -d processsutra -h localhost
   ```

2. **502 Bad Gateway**
   ```bash
   # Check if app is running
   pm2 status
   
   # Check nginx configuration
   sudo nginx -t
   
   # Check nginx logs
   sudo tail -f /var/log/nginx/error.log
   ```

3. **Database connection issues**
   ```bash
   # Check PostgreSQL status
   sudo systemctl status postgresql
   
   # Check MongoDB status
   sudo systemctl status mongod
   
   # Test connections
   psql -U processsutra_user -d processsutra -h localhost
   mongo processsutra
   ```

## 📞 Support

- **Application Logs**: `pm2 logs processsutra`
- **Nginx Logs**: `/var/log/nginx/`
- **System Logs**: `journalctl -u processsutra`

Your ProcessSutra application will be live at: **https://processsutra.com** 🎉