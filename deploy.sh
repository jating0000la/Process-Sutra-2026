#!/bin/bash

# ProcessSutra Deployment Script for Hostinger VPS
# Usage: ./deploy.sh

set -e

echo "🚀 Starting ProcessSutra deployment..."

# Install dependencies
echo "📦 Installing dependencies..."
npm ci --production=false

# Build the application
echo "🔨 Building application..."
npm run build

# Create logs directory
mkdir -p logs

# Install PM2 globally if not installed
if ! command -v pm2 &> /dev/null; then
    echo "📦 Installing PM2..."
    npm install -g pm2
fi

# Stop existing application
echo "🛑 Stopping existing application..."
pm2 stop processsutra || true

# Start application with PM2
echo "▶️ Starting application..."
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 startup script
pm2 startup

echo "✅ Deployment completed successfully!"
echo "🌐 Application should be running at: https://processsutra.com"
echo "📊 Check status with: pm2 status"
echo "📝 View logs with: pm2 logs processsutra"