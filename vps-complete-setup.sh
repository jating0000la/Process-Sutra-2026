#!/bin/bash

# processsutra VPS Complete Setup Script
# Run this script on your VPS server after cloning the repository

set -e  # Exit on any error

echo "🚀 Starting processsutra VPS Setup..."

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   print_error "This script must be run as root"
   exit 1
fi

# Update system
print_header "Updating system packages..."
apt update && apt upgrade -y

# Install required packages
print_header "Installing required packages..."
apt install -y curl wget git nginx postgresql postgresql-contrib nodejs npm software-properties-common

# Install Node.js 18+ (if not already installed)
print_header "Setting up Node.js..."
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs

print_status "Node.js version: $(node --version)"
print_status "npm version: $(npm --version)"

# Setup PostgreSQL
print_header "Configuring PostgreSQL..."
systemctl start postgresql
systemctl enable postgresql

# Create database and user
print_status "Setting up database..."
sudo -u postgres psql -c "CREATE DATABASE processsutra;" 2>/dev/null || print_warning "Database 'processsutra' might already exist"
sudo -u postgres psql -c "CREATE USER processsutra_user WITH ENCRYPTED PASSWORD 'processsutra_password_123';" 2>/dev/null || print_warning "User 'processsutra_user' might already exist"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE processsutra TO processsutra_user;"
sudo -u postgres psql -c "ALTER USER processsutra_user CREATEDB;"

# Clone repository (if not already cloned)
print_header "Setting up application directory..."
APP_DIR="/var/www/processsutra"
if [ ! -d "$APP_DIR" ]; then
    mkdir -p /var/www
    cd /var/www
    print_status "Cloning repository..."
    git clone https://github.com/jating0000la/ProcessSutra-VPS.git processsutra
else
    print_status "Application directory already exists, pulling latest changes..."
    cd $APP_DIR
    git pull origin main
fi

cd $APP_DIR

# Install dependencies
print_header "Installing application dependencies..."
npm install

# Create environment file
print_header "Creating environment configuration..."
cat > .env << EOF
# Database Configuration
DATABASE_URL=postgresql://processsutra_user:processsutra_password_123@localhost:5432/processsutra

# Application Configuration
NODE_ENV=production
PORT=3000

# Domain Configuration
DOMAIN=62.72.57.53
REPLIT_DOMAINS=62.72.57.53,localhost

# Security
SESSION_SECRET=your_super_secret_session_key_here_$(openssl rand -hex 32)

# Firebase Configuration (if using Firebase Auth)
FIREBASE_PROJECT_ID=
FIREBASE_PRIVATE_KEY=
FIREBASE_CLIENT_EMAIL=

# Email Configuration (if using email notifications)
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
EOF

print_status "Environment file created"

# Run database migrations
print_header "Running database migrations..."
npm run db:push || print_warning "Database migrations failed - you may need to configure them manually"

# Build the application
print_header "Building application..."
npm run build

# Setup systemd service
print_header "Creating systemd service..."
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

# Set proper permissions
print_header "Setting up permissions..."
chown -R www-data:www-data /var/www/processsutra
chmod -R 755 /var/www/processsutra

# Setup Nginx configuration
print_header "Configuring Nginx..."
cat > /etc/nginx/sites-available/processsutra << EOF
server {
    listen 80;
    server_name 62.72.57.53 _;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/javascript
        application/xml+rss
        application/json;

    # Main application
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
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # Static files (if any)
    location /static/ {
        alias /var/www/processsutra/client/dist/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF

# Enable the site
ln -sf /etc/nginx/sites-available/processsutra /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
nginx -t

# Start services
print_header "Starting services..."
systemctl daemon-reload
systemctl enable processsutra
systemctl start processsutra
systemctl restart nginx

# Setup firewall
print_header "Configuring firewall..."
ufw --force enable
ufw allow ssh
ufw allow 'Nginx Full'
ufw allow 80
ufw allow 443

# Check service status
print_header "Checking service status..."
sleep 5

if systemctl is-active --quiet processsutra; then
    print_status "✅ processsutra service is running"
else
    print_error "❌ processsutra service failed to start"
    systemctl status processsutra
fi

if systemctl is-active --quiet nginx; then
    print_status "✅ Nginx is running"
else
    print_error "❌ Nginx failed to start"
    systemctl status nginx
fi

if systemctl is-active --quiet postgresql; then
    print_status "✅ PostgreSQL is running"
else
    print_error "❌ PostgreSQL is not running"
    systemctl status postgresql
fi

# Display final information
print_header "🎉 Setup Complete!"
echo ""
echo "Your processsutra application should now be accessible at:"
echo "  http://62.72.57.53"
echo ""
echo "Service management commands:"
echo "  sudo systemctl start processsutra     # Start the application"
echo "  sudo systemctl stop processsutra      # Stop the application"
echo "  sudo systemctl restart processsutra   # Restart the application"
echo "  sudo systemctl status processsutra    # Check application status"
echo ""
echo "Log files:"
echo "  sudo journalctl -u processsutra -f    # View application logs"
echo "  sudo tail -f /var/log/nginx/access.log  # Nginx access logs"
echo "  sudo tail -f /var/log/nginx/error.log   # Nginx error logs"
echo ""
echo "Database connection details:"
echo "  Host: localhost"
echo "  Database: processsutra"
echo "  User: processsutra_user"
echo "  Password: processsutra_password_123"
echo ""
print_warning "Remember to:"
print_warning "1. Change the default database password"
print_warning "2. Configure your Firebase credentials in .env if using Firebase Auth"
print_warning "3. Set up SSL certificate for production use"
print_warning "4. Configure email settings if using notifications"
