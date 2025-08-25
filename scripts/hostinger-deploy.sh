#!/bin/bash

# FlowSense Hostinger VPS Deployment Script
# Run this after the initial setup script

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "🚀 FlowSense Hostinger VPS Deployment Starting..."

# Get user input
read -p "Enter your domain name (e.g., flowsense.com): " DOMAIN_NAME
read -p "Enter your Hostinger VPS IP address: " VPS_IP
read -p "Enter your Firebase project ID: " FIREBASE_PROJECT_ID
read -p "Enter your PostgreSQL password: " POSTGRES_PASSWORD

echo -e "${YELLOW}📝 Configuration Summary:${NC}"
echo "Domain: $DOMAIN_NAME"
echo "VPS IP: $VPS_IP"
echo "Firebase Project: $FIREBASE_PROJECT_ID"
echo "PostgreSQL Password: [HIDDEN]"
echo ""

read -p "Continue with deployment? (y/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
fi

# Switch to application directory
cd /opt/flowsense

# Clone repository if not exists
if [ ! -f "package.json" ]; then
    echo -e "${YELLOW}📂 Cloning FlowSense repository...${NC}"
    git clone https://github.com/jating0000la/flowsense.git .
else
    echo -e "${YELLOW}📂 Updating FlowSense repository...${NC}"
    git pull origin main
fi

# Create production environment file
echo -e "${YELLOW}⚙️ Creating production environment...${NC}"
cat > .env.production << EOF
# Database Configuration
DATABASE_URL=postgresql://postgres:${POSTGRES_PASSWORD}@db:5432/flowsense
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}

# Server Configuration  
NODE_ENV=production
PORT=3001
HOST=0.0.0.0

# Firebase Configuration (Update with your values)
VITE_FIREBASE_API_KEY=your-api-key-here
VITE_FIREBASE_AUTH_DOMAIN=${FIREBASE_PROJECT_ID}.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=${FIREBASE_PROJECT_ID}
VITE_FIREBASE_STORAGE_BUCKET=${FIREBASE_PROJECT_ID}.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id

# Security
FIREBASE_ADMIN_PRIVATE_KEY="your-private-key-here"
FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk@${FIREBASE_PROJECT_ID}.iam.gserviceaccount.com
JWT_SECRET=$(openssl rand -hex 32)

# Application URLs
CLIENT_URL=https://${DOMAIN_NAME}
SERVER_URL=https://${DOMAIN_NAME}/api
EOF

echo -e "${GREEN}✓ Environment file created${NC}"

# Create Nginx configuration
echo -e "${YELLOW}🌐 Creating Nginx configuration...${NC}"
cat > /etc/nginx/sites-available/flowsense << EOF
server {
    listen 80;
    server_name ${DOMAIN_NAME} www.${DOMAIN_NAME};

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;

    # Frontend (React app)
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

    # Backend API
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        # Handle preflight requests
        if (\$request_method = 'OPTIONS') {
            add_header 'Access-Control-Allow-Origin' 'https://${DOMAIN_NAME}';
            add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS, PUT, DELETE';
            add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization';
            add_header 'Access-Control-Max-Age' 1728000;
            add_header 'Content-Type' 'text/plain; charset=utf-8';
            add_header 'Content-Length' 0;
            return 204;
        }
    }

    # WebSocket support
    location /socket.io/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

# Enable the site
ln -sf /etc/nginx/sites-available/flowsense /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
nginx -t

# Restart Nginx
systemctl restart nginx
echo -e "${GREEN}✓ Nginx configured and restarted${NC}"

# Build and start the application
echo -e "${YELLOW}🏗️ Building and starting FlowSense...${NC}"
docker-compose -f docker-compose.yml down || true
docker-compose -f docker-compose.yml up -d --build

echo -e "${YELLOW}⏳ Waiting for services to start...${NC}"
sleep 30

# Check if services are running
if docker-compose -f docker-compose.yml ps | grep -q "Up"; then
    echo -e "${GREEN}✅ FlowSense is running successfully!${NC}"
else
    echo -e "${RED}❌ Some services failed to start${NC}"
    docker-compose -f docker-compose.yml logs
    exit 1
fi

echo ""
echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
echo ""
echo -e "${YELLOW}📋 Next steps:${NC}"
echo "1. Update your Hostinger DNS settings:"
echo "   - A Record: @ → ${VPS_IP}"
echo "   - A Record: www → ${VPS_IP}"
echo ""
echo "2. Wait for DNS propagation (1-48 hours)"
echo ""  
echo "3. Setup SSL certificate:"
echo "   sudo certbot --nginx -d ${DOMAIN_NAME} -d www.${DOMAIN_NAME}"
echo ""
echo "4. Update Firebase configuration in .env.production with your actual values"
echo ""
echo "5. Access your application:"
echo "   - HTTP: http://${DOMAIN_NAME}"
echo "   - After SSL: https://${DOMAIN_NAME}"
echo ""
echo -e "${YELLOW}🔍 Useful commands:${NC}"
echo "- Check logs: docker-compose logs -f"
echo "- Restart services: docker-compose restart"  
echo "- Update application: git pull && docker-compose up -d --build"
echo "- Check Nginx status: systemctl status nginx"
