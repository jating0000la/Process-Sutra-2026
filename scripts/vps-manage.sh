#!/bin/bash

# FlowSense VPS Management Script
# Usage: ./vps-manage.sh [command]

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

APP_DIR="/opt/flowsense"
COMPOSE_FILE="$APP_DIR/docker-compose.yml"

print_usage() {
    echo "FlowSense VPS Management Script"
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  start       Start all services"
    echo "  stop        Stop all services"
    echo "  restart     Restart all services"
    echo "  status      Show service status"
    echo "  logs        Show application logs"
    echo "  update      Update application from git"
    echo "  backup      Create database backup"
    echo "  restore     Restore database from backup"
    echo "  health      Check application health"
    echo "  ssl         Renew SSL certificate"
    echo "  cleanup     Clean up old Docker images"
    echo "  monitor     Show system resources"
}

check_app_dir() {
    if [ ! -d "$APP_DIR" ]; then
        echo -e "${RED}❌ FlowSense not found in $APP_DIR${NC}"
        exit 1
    fi
    cd "$APP_DIR"
}

start_services() {
    echo -e "${BLUE}🚀 Starting FlowSense services...${NC}"
    docker-compose up -d
    echo -e "${GREEN}✅ Services started${NC}"
}

stop_services() {
    echo -e "${BLUE}🛑 Stopping FlowSense services...${NC}"
    docker-compose down
    echo -e "${GREEN}✅ Services stopped${NC}"
}

restart_services() {
    echo -e "${BLUE}🔄 Restarting FlowSense services...${NC}"
    docker-compose restart
    echo -e "${GREEN}✅ Services restarted${NC}"
}

show_status() {
    echo -e "${BLUE}📊 Service Status:${NC}"
    docker-compose ps
    echo ""
    echo -e "${BLUE}🖥️  System Resources:${NC}"
    df -h / | tail -1
    free -h | grep Mem
}

show_logs() {
    echo -e "${BLUE}📋 Application Logs:${NC}"
    docker-compose logs -f --tail=100
}

update_app() {
    echo -e "${BLUE}⬆️  Updating FlowSense...${NC}"
    git pull origin main
    docker-compose down
    docker-compose up -d --build
    echo -e "${GREEN}✅ Application updated${NC}"
}

backup_database() {
    echo -e "${BLUE}💾 Creating database backup...${NC}"
    DATE=$(date +%Y%m%d_%H%M%S)
    BACKUP_FILE="backups/flowsense_$DATE.sql"
    
    mkdir -p backups
    docker exec flowsense_postgres pg_dump -U flowsense_admin flowsense > "$BACKUP_FILE"
    
    echo -e "${GREEN}✅ Database backup created: $BACKUP_FILE${NC}"
}

restore_database() {
    echo -e "${YELLOW}⚠️  Database Restore${NC}"
    echo "Available backups:"
    ls -la backups/*.sql 2>/dev/null || echo "No backups found"
    echo ""
    read -p "Enter backup file name (e.g., flowsense_20241201_120000.sql): " BACKUP_FILE
    
    if [ -f "backups/$BACKUP_FILE" ]; then
        echo -e "${BLUE}🔄 Restoring database from $BACKUP_FILE...${NC}"
        docker exec -i flowsense_postgres psql -U flowsense_admin -d flowsense < "backups/$BACKUP_FILE"
        echo -e "${GREEN}✅ Database restored${NC}"
    else
        echo -e "${RED}❌ Backup file not found${NC}"
    fi
}

check_health() {
    echo -e "${BLUE}🏥 Health Check:${NC}"
    
    # App health
    if curl -f http://localhost:5000/api/health >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Application: Healthy${NC}"
    else
        echo -e "${RED}❌ Application: Unhealthy${NC}"
    fi
    
    # Database health
    if curl -f http://localhost:5000/api/health/db >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Database: Connected${NC}"
    else
        echo -e "${RED}❌ Database: Disconnected${NC}"
    fi
    
    # Nginx status
    if systemctl is-active --quiet nginx; then
        echo -e "${GREEN}✅ Nginx: Running${NC}"
    else
        echo -e "${RED}❌ Nginx: Not running${NC}"
    fi
}

renew_ssl() {
    echo -e "${BLUE}🔐 Renewing SSL certificate...${NC}"
    certbot renew
    systemctl reload nginx
    echo -e "${GREEN}✅ SSL certificate renewed${NC}"
}

cleanup_docker() {
    echo -e "${BLUE}🧹 Cleaning up Docker images...${NC}"
    docker system prune -f
    docker image prune -f
    echo -e "${GREEN}✅ Docker cleanup completed${NC}"
}

monitor_system() {
    echo -e "${BLUE}📊 System Monitor:${NC}"
    echo ""
    echo "=== CPU Usage ==="
    top -bn1 | grep "Cpu(s)" | awk '{print $2 $3}'
    
    echo ""
    echo "=== Memory Usage ==="
    free -h
    
    echo ""
    echo "=== Disk Usage ==="
    df -h /
    
    echo ""
    echo "=== Docker Stats ==="
    docker stats --no-stream
    
    echo ""
    echo "=== Network Connections ==="
    netstat -an | grep :5000
}

# Main script
case "${1:-}" in
    start)
        check_app_dir
        start_services
        ;;
    stop)
        check_app_dir
        stop_services
        ;;
    restart)
        check_app_dir
        restart_services
        ;;
    status)
        check_app_dir
        show_status
        ;;
    logs)
        check_app_dir
        show_logs
        ;;
    update)
        check_app_dir
        update_app
        ;;
    backup)
        check_app_dir
        backup_database
        ;;
    restore)
        check_app_dir
        restore_database
        ;;
    health)
        check_health
        ;;
    ssl)
        renew_ssl
        ;;
    cleanup)
        cleanup_docker
        ;;
    monitor)
        monitor_system
        ;;
    *)
        print_usage
        exit 1
        ;;
esac
