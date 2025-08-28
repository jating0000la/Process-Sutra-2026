#!/bin/bash

# ProcessSutra VPS Deployment Script
# Usage: curl -sSL https://raw.githubusercontent.com/jating0000la/processsutra/main/scripts/vps-deploy.sh | bash

set -e

echo "🚀 ProcessSutra VPS Deployment Script"
echo "=================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️ $1${NC}"
}

# Check if running as root
check_root() {
    if [ "$EUID" -ne 0 ]; then
        print_error "Please run this script as root or with sudo"
        exit 1
    fi
}

# Update system
update_system() {
    print_info "Updating system packages..."
    apt update && apt upgrade -y
    print_status "System updated"
}

# Install Docker
install_docker() {
    if command -v docker &> /dev/null; then
        print_status "Docker already installed"
        return
    fi
    
    print_info "Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
    
    print_info "Installing Docker Compose..."
    curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
    
    # Start and enable Docker
    systemctl start docker
    systemctl enable docker
    
    print_status "Docker installed successfully"
}

# Install Nginx
install_nginx() {
    if command -v nginx &> /dev/null; then
        print_status "Nginx already installed"
        return
    fi
    
    print_info "Installing Nginx..."
    apt install nginx -y
    systemctl start nginx
    systemctl enable nginx
    print_status "Nginx installed successfully"
}

# Setup firewall
setup_firewall() {
    print_info "Configuring firewall..."
    apt install ufw -y
    ufw default deny incoming
    ufw default allow outgoing
    ufw allow ssh
    ufw allow 80
    ufw allow 443
    echo "y" | ufw enable
    print_status "Firewall configured"
}

# Clone repository
clone_repo() {
    print_info "Cloning ProcessSutra repository..."
    
    if [ -d "/opt/processsutra" ]; then
        print_warning "Directory /opt/processsutra already exists. Updating..."
        cd /opt/processsutra
        git pull origin main
    else
        git clone https://github.com/jating0000la/processsutra.git /opt/processsutra
        cd /opt/processsutra
    fi
    
    print_status "Repository cloned/updated"
}

# Setup environment
setup_environment() {
    print_info "Setting up environment configuration..."
    
    cd /opt/processsutra
    
    if [ ! -f ".env.production" ]; then
        cp .env.production.template .env.production
    print_warning "Please edit /opt/processsutra/.env.production with your configuration"
        print_warning "Especially set your FIREBASE_PRIVATE_KEY and SESSION_SECRET"
    fi
    
    # Generate secure passwords if not set
    if [ ! -f ".env.local" ]; then
        echo "# VPS Generated Passwords" > .env.local
        echo "POSTGRES_PASSWORD=$(openssl rand -base64 32)" >> .env.local
        echo "SESSION_SECRET=$(openssl rand -base64 48)" >> .env.local
        print_status "Generated secure passwords in .env.local"
    fi
}

# Deploy application
deploy_app() {
    print_info "Deploying ProcessSutra application..."
    
    cd /opt/processsutra
    
    # Build and start services
    docker-compose down 2>/dev/null || true
    docker-compose up -d --build
    
    # Wait for services to be ready
    print_info "Waiting for services to be ready..."
    sleep 30
    
    # Check health
    if curl -f http://localhost:5000/api/health >/dev/null 2>&1; then
        print_status "Application deployed successfully!"
    else
        print_error "Application health check failed"
        print_info "Check logs with: docker-compose -f /opt/processsutra/docker-compose.yml logs"
    fi
}

# Setup Nginx reverse proxy
setup_nginx_proxy() {
    print_info "Setting up Nginx reverse proxy..."
    
    # Get server IP
    SERVER_IP=$(curl -s ifconfig.me 2>/dev/null || curl -s ipinfo.io/ip)
    
    cat > /etc/nginx/sites-available/processsutra << EOF
server {
    listen 80;
    server_name ${SERVER_IP} localhost;
    
    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        # Increase timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
EOF
    
    # Enable site
    ln -sf /etc/nginx/sites-available/processsutra /etc/nginx/sites-enabled/
    rm -f /etc/nginx/sites-enabled/default
    
    # Test and reload Nginx
    nginx -t
    systemctl reload nginx
    
    print_status "Nginx reverse proxy configured"
}

# Install SSL certificate
install_ssl() {
    read -p "Do you have a domain name to configure SSL? (y/N): " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        read -p "Enter your domain name: " DOMAIN_NAME
        
        if [ -n "$DOMAIN_NAME" ]; then
            print_info "Installing SSL certificate for $DOMAIN_NAME..."
            
            # Install Certbot
            apt install certbot python3-certbot-nginx -y
            
            # Update Nginx config with domain
            sed -i "s/server_name.*;/server_name $DOMAIN_NAME;/" /etc/nginx/sites-available/processsutra
            nginx -t && systemctl reload nginx
            
            # Get certificate
            certbot --nginx -d "$DOMAIN_NAME" --non-interactive --agree-tos -m admin@"$DOMAIN_NAME"
            
            # Setup auto-renewal
            (crontab -l 2>/dev/null; echo "0 12 * * * /usr/bin/certbot renew --quiet") | crontab -
            
            print_status "SSL certificate installed for $DOMAIN_NAME"
        fi
    fi
}

# Create backup script
setup_backup() {
    print_info "Setting up backup script..."
    
    mkdir -p /opt/processsutra/backups
    
    cat > /opt/processsutra/backup.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/opt/processsutra/backups"

# Create backup
docker exec processsutra_postgres pg_dump -U processsutra_admin processsutra > "$BACKUP_DIR/processsutra_$DATE.sql"

# Keep only last 7 days of backups
find "$BACKUP_DIR" -name "processsutra_*.sql" -mtime +7 -delete

echo "Backup completed: processsutra_$DATE.sql"
EOF
    
    chmod +x /opt/processsutra/backup.sh
    
    # Schedule daily backups
    (crontab -l 2>/dev/null; echo "0 2 * * * /opt/processsutra/backup.sh") | crontab -
    
    print_status "Backup script created and scheduled"
}

# Main deployment function
main() {
    echo
    print_info "Starting ProcessSutra VPS deployment..."
    echo
    
    check_root
    update_system
    install_docker
    install_nginx
    setup_firewall
    clone_repo
    setup_environment
    deploy_app
    setup_nginx_proxy
    install_ssl
    setup_backup
    
    echo
    print_status "🎉 ProcessSutra deployment completed!"
    echo
    print_info "Your application is now running at:"
    SERVER_IP=$(curl -s ifconfig.me 2>/dev/null || curl -s ipinfo.io/ip)
    echo -e "${GREEN}http://$SERVER_IP${NC}"
    echo
    print_info "Useful commands:"
    echo "  View logs: docker-compose -f /opt/processsutra/docker-compose.yml logs -f"
    echo "  Restart: docker-compose -f /opt/processsutra/docker-compose.yml restart"
    echo "  Update: cd /opt/processsutra && git pull && docker-compose up -d --build"
    echo "  Backup: /opt/processsutra/backup.sh"
    echo
    print_warning "Please edit /opt/processsutra/.env.production with your Firebase configuration"
    print_warning "Then restart with: docker-compose -f /opt/processsutra/docker-compose.yml restart"
}

# Run main function
main "$@"
