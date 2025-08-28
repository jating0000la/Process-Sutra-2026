#!/bin/bash

# PostgreSQL Database Setup Script for processsutra
# Run this script to set up the database on your VPS

set -e

echo "🐘 Setting up PostgreSQL database for processsutra..."

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    print_error "PostgreSQL is not installed. Please install it first:"
    echo "sudo apt update && sudo apt install postgresql postgresql-contrib"
    exit 1
fi

# Check if PostgreSQL service is running
if ! systemctl is-active --quiet postgresql; then
    print_warning "PostgreSQL service is not running. Starting it..."
    sudo systemctl start postgresql
    sudo systemctl enable postgresql
fi

print_status "PostgreSQL service is running"

# Create database
print_status "Creating database 'processsutra'..."
sudo -u postgres psql -c "CREATE DATABASE processsutra;" 2>/dev/null || {
    print_warning "Database 'processsutra' already exists"
}

# Create user
print_status "Creating user 'processsutra_user'..."
sudo -u postgres psql -c "CREATE USER processsutra_user WITH ENCRYPTED PASSWORD 'processsutra_password_123';" 2>/dev/null || {
    print_warning "User 'processsutra_user' already exists"
}

# Grant privileges
print_status "Granting privileges..."
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE processsutra TO processsutra_user;"
sudo -u postgres psql -c "ALTER USER processsutra_user CREATEDB;"

# Test connection
print_status "Testing database connection..."
if PGPASSWORD=processsutra_password_123 psql -h localhost -U processsutra_user -d processsutra -c "SELECT 1;" &>/dev/null; then
    print_status "✅ Database connection successful!"
else
    print_error "❌ Database connection failed!"
    exit 1
fi

# Display connection info
echo ""
echo "📋 Database Configuration:"
echo "  Host: localhost"
echo "  Port: 5432"
echo "  Database: processsutra"
echo "  Username: processsutra_user"
echo "  Password: processsutra_password_123"
echo ""
echo "🔗 Connection String:"
echo "  postgresql://processsutra_user:processsutra_password_123@localhost:5432/processsutra"
echo ""
print_warning "🔐 Security Note: Change the default password in production!"
print_status "✅ Database setup complete!"
