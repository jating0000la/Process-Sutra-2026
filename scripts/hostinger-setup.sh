#!/bin/bash

# FlowSense Hostinger VPS Quick Setup Script
# This script automates the initial setup for Hostinger VPS

set -e  # Exit on any error

echo "🚀 FlowSense Hostinger VPS Setup Starting..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Please run as root (use sudo)${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Running as root${NC}"

# Update system
echo -e "${YELLOW}📦 Updating system packages...${NC}"
apt update && apt upgrade -y

# Install essential packages
echo -e "${YELLOW}📦 Installing essential packages...${NC}"
apt install -y curl wget git unzip software-properties-common apt-transport-https ca-certificates gnupg lsb-release

# Install Docker
echo -e "${YELLOW}🐳 Installing Docker...${NC}"
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
    systemctl start docker
    systemctl enable docker
    echo -e "${GREEN}✓ Docker installed successfully${NC}"
else
    echo -e "${GREEN}✓ Docker already installed${NC}"
fi

# Install Docker Compose
echo -e "${YELLOW}🐳 Installing Docker Compose...${NC}"
if ! command -v docker-compose &> /dev/null; then
    DOCKER_COMPOSE_VERSION=$(curl -s https://api.github.com/repos/docker/compose/releases/latest | grep 'tag_name' | cut -d\" -f4)
    curl -L "https://github.com/docker/compose/releases/download/${DOCKER_COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
    echo -e "${GREEN}✓ Docker Compose installed successfully${NC}"
else
    echo -e "${GREEN}✓ Docker Compose already installed${NC}"
fi

# Install Nginx
echo -e "${YELLOW}🌐 Installing Nginx...${NC}"
if ! command -v nginx &> /dev/null; then
    apt install -y nginx
    systemctl start nginx
    systemctl enable nginx
    echo -e "${GREEN}✓ Nginx installed successfully${NC}"
else
    echo -e "${GREEN}✓ Nginx already installed${NC}"
fi

# Install Certbot for SSL
echo -e "${YELLOW}🔒 Installing Certbot for SSL...${NC}"
if ! command -v certbot &> /dev/null; then
    apt install -y certbot python3-certbot-nginx
    echo -e "${GREEN}✓ Certbot installed successfully${NC}"
else
    echo -e "${GREEN}✓ Certbot already installed${NC}"
fi

# Create non-root user
echo -e "${YELLOW}👤 Setting up application user...${NC}"
if ! id "flowsense" &>/dev/null; then
    adduser --disabled-password --gecos "" flowsense
    usermod -aG sudo flowsense
    usermod -aG docker flowsense
    echo -e "${GREEN}✓ User 'flowsense' created${NC}"
else
    echo -e "${GREEN}✓ User 'flowsense' already exists${NC}"
fi

# Setup firewall
echo -e "${YELLOW}🔥 Configuring firewall...${NC}"
ufw --force enable
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp
echo -e "${GREEN}✓ Firewall configured${NC}"

# Create application directory
echo -e "${YELLOW}📁 Creating application directory...${NC}"
mkdir -p /opt/flowsense
chown flowsense:flowsense /opt/flowsense
echo -e "${GREEN}✓ Application directory created${NC}"

# Display system info
echo -e "${YELLOW}📊 System Information:${NC}"
echo "OS: $(cat /etc/os-release | grep PRETTY_NAME | cut -d '=' -f2 | tr -d '\"')"
echo "Docker: $(docker --version)"
echo "Docker Compose: $(docker-compose --version)"
echo "Nginx: $(nginx -v 2>&1)"
echo "Available RAM: $(free -h | awk '/^Mem:/ {print $2}')"
echo "Available Disk: $(df -h / | awk 'NR==2 {print $4}')"

echo ""
echo -e "${GREEN}🎉 Hostinger VPS setup completed successfully!${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Clone your repository: cd /opt/flowsense && git clone https://github.com/jating0000la/flowsense.git ."
echo "2. Configure environment: cp .env.production.template .env.production"
echo "3. Update your domain in Nginx config"
echo "4. Run: docker-compose -f docker-compose.yml up -d"
echo "5. Setup SSL: certbot --nginx -d your-domain.com"
echo ""
echo -e "${GREEN}🔐 Security reminder: Change default passwords and setup SSH keys!${NC}"
