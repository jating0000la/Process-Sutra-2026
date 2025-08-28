# 🚀 VPS Deployment Instructions

## Quick Start

Your processsutra application has been uploaded to GitHub. Follow these steps to deploy it on your VPS server:

### 1. Connect to Your VPS
```bash
ssh root@62.72.57.53
```

### 2. Run the Complete Setup Script
```bash
# Download and run the complete setup script
wget https://raw.githubusercontent.com/jating0000la/ProcessSutra-VPS/main/vps-complete-setup.sh
chmod +x vps-complete-setup.sh
./vps-complete-setup.sh
```

### 3. Manual Setup (Alternative)

If you prefer to set up manually:

#### Step 3.1: Install Dependencies
```bash
# Update system
apt update && apt upgrade -y

# Install required packages
apt install -y curl wget git nginx postgresql postgresql-contrib nodejs npm

# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs
```

#### Step 3.2: Setup Database
```bash
# Start PostgreSQL
systemctl start postgresql
systemctl enable postgresql

# Create database and user
sudo -u postgres psql -c "CREATE DATABASE processsutra;"
sudo -u postgres psql -c "CREATE USER processsutra_user WITH ENCRYPTED PASSWORD 'processsutra_password_123';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE processsutra TO processsutra_user;"
sudo -u postgres psql -c "ALTER USER processsutra_user CREATEDB;"
```

#### Step 3.3: Clone and Setup Application
```bash
# Create app directory
mkdir -p /var/www
cd /var/www

# Clone repository
git clone https://github.com/jating0000la/ProcessSutra-VPS.git processsutra
cd processsutra

# Install dependencies
npm install

# Create environment file
cp .env.production .env

# Edit environment file with your settings
nano .env

# Run database migrations
npm run db:push

# Build application
npm run build
```

#### Step 3.4: Setup System Service
```bash
# Create systemd service
cat > /etc/systemd/system/processsutra.service << EOF
[Unit]
Description=processsutra Application
After=network.target postgresql.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/processsutra
Environment=NODE_ENV=production
ExecStart=/usr/bin/node server/index.prod.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Set permissions
chown -R www-data:www-data /var/www/processsutra
chmod -R 755 /var/www/processsutra

# Start service
systemctl daemon-reload
systemctl enable processsutra
systemctl start processsutra
```

#### Step 3.5: Configure Nginx
```bash
# Create Nginx configuration
cat > /etc/nginx/sites-available/processsutra << EOF
server {
    listen 80;
    server_name 62.72.57.53 _;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

# Enable site
ln -sf /etc/nginx/sites-available/processsutra /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test and restart Nginx
nginx -t
systemctl restart nginx
```

#### Step 3.6: Configure Firewall
```bash
# Setup firewall
ufw --force enable
ufw allow ssh
ufw allow 'Nginx Full'
```

## 4. Access Your Application

After deployment, your processsutra application will be accessible at:
- **HTTP**: http://62.72.57.53
- **Admin Panel**: http://62.72.57.53/admin (if configured)

## 5. Management Commands

### Service Management
```bash
# Check service status
systemctl status processsutra

# Start/Stop/Restart service
systemctl start processsutra
systemctl stop processsutra
systemctl restart processsutra

# View logs
journalctl -u processsutra -f
```

### Database Management
```bash
# Connect to database
PGPASSWORD=processsutra_password_123 psql -h localhost -U processsutra_user -d processsutra

# Backup database
pg_dump -h localhost -U processsutra_user -d processsutra > processsutra_backup.sql

# Restore database
PGPASSWORD=processsutra_password_123 psql -h localhost -U processsutra_user -d processsutra < processsutra_backup.sql
```

### Application Updates
```bash
cd /var/www/processsutra
git pull origin main
npm install
npm run build
systemctl restart processsutra
```

## 6. Configuration Files

### Environment Variables (.env)
```env
DATABASE_URL=postgresql://processsutra_user:processsutra_password_123@localhost:5432/processsutra
NODE_ENV=production
PORT=3000
DOMAIN=62.72.57.53
SESSION_SECRET=your_secret_key
```

### Database Connection Details
- **Host**: localhost
- **Port**: 5432
- **Database**: processsutra
- **Username**: processsutra_user
- **Password**: processsutra_password_123 (change this!)

## 7. Security Recommendations

1. **Change default database password**:
   ```sql
   ALTER USER processsutra_user PASSWORD 'your_new_secure_password';
   ```

2. **Setup SSL certificate** (Let's Encrypt):
   ```bash
   apt install certbot python3-certbot-nginx
   certbot --nginx -d yourdomain.com
   ```

3. **Update firewall rules** as needed
4. **Regular system updates**:
   ```bash
   apt update && apt upgrade -y
   ```

## 8. Troubleshooting

### Check Service Status
```bash
systemctl status processsutra
systemctl status postgresql
systemctl status nginx
```

### View Logs
```bash
# Application logs
journalctl -u processsutra -f

# Nginx logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log

# PostgreSQL logs
tail -f /var/log/postgresql/postgresql-*.log
```

### Common Issues

1. **Port 3000 already in use**:
   ```bash
   sudo lsof -i :3000
   sudo kill -9 PID
   ```

2. **Database connection issues**:
   - Check PostgreSQL service: `systemctl status postgresql`
   - Test connection: `PGPASSWORD=password psql -h localhost -U processsutra_user -d processsutra`

3. **Permission issues**:
   ```bash
   chown -R www-data:www-data /var/www/processsutra
   chmod -R 755 /var/www/processsutra
   ```

## Support

For issues or questions:
1. Check the application logs
2. Verify all services are running
3. Check database connectivity
4. Ensure environment variables are correct

Your processsutra application should now be fully deployed and accessible!
