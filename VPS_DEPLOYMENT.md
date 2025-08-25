# 🚀 FlowSense VPS Deployment Guide

Deploy your FlowSense application on any VPS provider with Docker and PostgreSQL.

## 🏆 Recommended VPS Providers

### Budget-Friendly Options
- **Hostinger VPS** - $3.95-59.99/month (excellent performance & support)
- **DigitalOcean** - $4-6/month droplets
- **Vultr** - $2.50-6/month instances
- **Linode (Akamai)** - $5-12/month
- **Hetzner** - €3-20/month (excellent EU performance)

### Enterprise Options
- **Google Cloud Platform** - Compute Engine
- **Oracle Cloud** - Always Free tier available
- **Azure** - Virtual Machines
- **Contabo** - €4-50/month (high specs)

## 🎯 Hostinger VPS Specific Setup

### Hostinger VPS Advantages
- **KVM Virtualization** - Full root access
- **NVMe SSD Storage** - Fast database performance
- **24/7 Support** - Live chat assistance
- **Multiple Locations** - Global data centers
- **Easy OS Installation** - Ubuntu/Debian pre-configured

### Recommended Hostinger VPS Plans for FlowSense

| Plan | RAM | CPU | Storage | Price | Best For |
|------|-----|-----|---------|-------|----------|
| VPS 1 | 1GB | 1 Core | 20GB | $3.95/mo | Development/Testing |
| VPS 2 | 2GB | 1 Core | 40GB | $7.95/mo | Small Production |
| VPS 4 | 4GB | 2 Core | 80GB | $14.95/mo | Production |
| VPS 8 | 8GB | 4 Core | 160GB | $29.95/mo | High Traffic |

### Hostinger VPS Initial Setup

```bash
# Access your VPS via Hostinger panel SSH terminal or:
ssh root@62.72.57.53

# Hostinger VPS usually comes with Ubuntu 22.04 LTS
# Verify your system
cat /etc/os-release

# Create a non-root user (recommended)
adduser flowsense
usermod -aG sudo flowsense
usermod -aG docker flowsense
```

## 🐳 Docker Deployment (Recommended)

### Prerequisites
- VPS with Ubuntu 20.04+ or Debian 11+
- Minimum 1GB RAM, 1 CPU, 10GB storage
- Domain name (optional but recommended)

### Step 1: VPS Setup

```bash
# Connect to your VPS
ssh root@your-server-ip

# Update system
apt update && apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Docker Compose
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Verify installation
docker --version
docker-compose --version
```

### Step 2: Prepare Application

```bash
# Clone your repository
git clone https://github.com/jating0000la/flowsense.git
cd flowsense

# Create production environment file
cp .env.production.template .env.production
```

### Step 3: Configure Environment

Edit `.env.production`:

```bash
nano .env.production
```

```env
# Database (will be created by docker-compose)
DATABASE_URL=postgresql://flowsense_user:your_secure_password@postgres:5432/flowsense_db

# Session Secret (generate a secure random string)
SESSION_SECRET=your-super-secure-session-secret-minimum-32-characters

# Firebase Configuration
FIREBASE_PROJECT_ID=taskflowpro-c62c1
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@taskflowpro-c62c1.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----
FIREBASE_CLIENT_ID=104843425969082480520

# Frontend Firebase Configuration
VITE_FIREBASE_API_KEY=AIzaSyAxZL1iUTnvm-p6sqRSg5G5uZu9ztA8me0
VITE_FIREBASE_AUTH_DOMAIN=taskflowpro-c62c1.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=taskflowpro-c62c1
VITE_FIREBASE_STORAGE_BUCKET=taskflowpro-c62c1.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=975860144476
VITE_FIREBASE_APP_ID=1:975860144476:web:678bc5d5e4c4030e450999
VITE_FIREBASE_MEASUREMENT_ID=G-GVQGWCF9EK

# Application Settings
NODE_ENV=production
PORT=5000
```

### Step 4: Deploy with Docker Compose

```bash
# Build and start services
docker-compose up -d --build

# Check if services are running
docker-compose ps

# View logs
docker-compose logs -f
```

### Step 5: Set up Nginx Reverse Proxy

```bash
# Install Nginx
apt install nginx -y

# Create Nginx configuration
nano /etc/nginx/sites-available/flowsense
```

Nginx config:
```nginx
server {
    listen 80;
    server_name your-domain.com;  # Replace with your domain or server IP
    
    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Enable the site
ln -s /etc/nginx/sites-available/flowsense /etc/nginx/sites-enabled/
rm /etc/nginx/sites-enabled/default

# Test and reload Nginx
nginx -t
systemctl reload nginx
```

### Step 6: SSL Certificate (Optional but Recommended)

```bash
# Install Certbot
apt install certbot python3-certbot-nginx -y

# Get SSL certificate
certbot --nginx -d your-domain.com

# Auto-renewal
crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

### 🌐 Hostinger Domain Configuration

If you're using a Hostinger domain with your VPS:

```bash
# DNS Settings in Hostinger Control Panel:
# A Record: @ → Your VPS IP Address
# A Record: www → Your VPS IP Address  
# CNAME Record: * → your-domain.com (for subdomains)

# Example DNS setup:
# Type    Name    Value
# A       @       192.168.1.100
# A       www     192.168.1.100
# CNAME   *       your-domain.com
```

**Note**: DNS propagation can take 1-48 hours. You can check propagation status at [whatsmydns.net](https://www.whatsmydns.net/).

## 📊 Manual Deployment (Without Docker)

### Step 1: Install Dependencies

```bash
# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt-get install -y nodejs

# Install PostgreSQL
apt install postgresql postgresql-contrib -y

# Install PM2 (Process Manager)
npm install -g pm2
```

### Step 2: Setup Database

```bash
# Switch to postgres user
sudo -u postgres psql

# Create database and user
CREATE DATABASE flowsense_db;
CREATE USER flowsense_user WITH ENCRYPTED PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE flowsense_db TO flowsense_user;
\q
```

### Step 3: Deploy Application

```bash
# Clone repository
git clone https://github.com/jating0000la/flowsense.git
cd flowsense

# Install dependencies
npm install

# Build application
npm run build

# Start with PM2
pm2 start dist/index.js --name "flowsense"
pm2 save
pm2 startup
```

## 🔒 Security Best Practices

### Firewall Setup
```bash
# Install UFW
apt install ufw -y

# Configure firewall
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 80
ufw allow 443
ufw enable
```

### Additional Security
```bash
# Disable root login
nano /etc/ssh/sshd_config
# Set: PermitRootLogin no
# Set: PasswordAuthentication no (if using SSH keys)
systemctl restart ssh

# Create non-root user
adduser flowsense
usermod -aG sudo flowsense
usermod -aG docker flowsense
```

## 📈 Monitoring & Maintenance

### System Monitoring
```bash
# Install monitoring tools
apt install htop iotop nethogs -y

# Docker monitoring
docker stats

# Application logs
docker-compose logs -f app
# Or for PM2: pm2 logs
```

### Backup Strategy
```bash
# Database backup script
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
docker exec postgres pg_dump -U flowsense_user flowsense_db > "/backups/flowsense_$DATE.sql"

# Schedule daily backups
crontab -e
# Add: 0 2 * * * /path/to/backup-script.sh
```

### Updates
```bash
# Update application
cd /path/to/flowsense
git pull origin main
docker-compose down
docker-compose up -d --build

# Or for PM2:
npm run build
pm2 reload flowsense
```

## 💰 Cost Comparison

| Provider | Specs | Monthly Cost | Best For |
|----------|-------|--------------|----------|
| Hostinger VPS | 1GB RAM, 1 CPU | $3.95 | Best Value |
| DigitalOcean | 1GB RAM, 1 CPU | $6 | Beginners |
| Vultr | 1GB RAM, 1 CPU | $6 | Global locations |
| Linode | 1GB RAM, 1 CPU | $5 | Reliability |
| Hetzner | 4GB RAM, 2 CPU | €4.5 | Performance |
| Contabo | 4GB RAM, 4 CPU | €5 | High specs |

## 🎯 Quick Start Commands

Once you have your VPS:

### 🚀 Hostinger VPS Quick Setup (Recommended)

```bash
# Step 1: Initial server setup (run as root)
curl -sSL https://raw.githubusercontent.com/jating0000la/flowsense/main/scripts/hostinger-setup.sh | bash

# Step 2: Deploy FlowSense (run as root)
curl -sSL https://raw.githubusercontent.com/jating0000la/flowsense/main/scripts/hostinger-deploy.sh | bash
```

### 🔧 Generic VPS Setup

```bash
# One-line setup for other providers
curl -sSL https://raw.githubusercontent.com/jating0000la/flowsense/main/scripts/vps-deploy.sh | bash

# Manual steps
git clone https://github.com/jating0000la/flowsense.git
cd flowsense
cp .env.production.template .env.production
# Edit .env.production with your values
docker-compose up -d --build
```

## 🔧 Troubleshooting

### Common Issues
1. **Port 5000 not accessible**: Check firewall and Nginx config
2. **Database connection failed**: Verify DATABASE_URL in .env.production  
3. **Build fails**: Ensure sufficient RAM (at least 1GB)
4. **SSL issues**: Check domain DNS settings

### Health Checks
- Application: `http://your-server-ip:5000/api/health`
- Database: `http://your-server-ip:5000/api/health/db`
- Nginx: `nginx -t`
- Docker: `docker-compose ps`

Would you like me to create the VPS deployment scripts or help you with a specific VPS provider setup?
