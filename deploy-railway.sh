#!/usr/bin/env bash

# Railway Deployment Script
# This script helps you deploy FlowSense to Railway.com

echo "🚂 FlowSense Railway Deployment Setup"
echo "======================================"

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the FlowSense root directory."
    exit 1
fi

echo "✅ Found package.json"

# Check if git is initialized
if [ ! -d ".git" ]; then
    echo "⚠️  Git repository not found. Initializing..."
    git init
    git add .
    git commit -m "Initial commit for Railway deployment"
    echo "✅ Git repository initialized"
else
    echo "✅ Git repository found"
fi

# Check for Railway CLI
if ! command -v railway &> /dev/null; then
    echo "📦 Railway CLI not found. Installing..."
    
    # Install Railway CLI based on OS
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        if command -v brew &> /dev/null; then
            brew install railway
        else
            curl -fsSL https://railway.app/install.sh | sh
        fi
    else
        # Linux/WSL
        curl -fsSL https://railway.app/install.sh | sh
    fi
    
    echo "✅ Railway CLI installed"
else
    echo "✅ Railway CLI found"
fi

echo ""
echo "🔧 Next Steps:"
echo "1. Login to Railway: railway login"
echo "2. Create a new project: railway new"
echo "3. Add PostgreSQL: railway add postgresql"
echo "4. Set environment variables (see .env.railway file)"
echo "5. Deploy: railway up"
echo ""
echo "📚 For detailed instructions, see RAILWAY_DEPLOYMENT.md"
echo ""
echo "🎯 Quick commands:"
echo "  railway login          # Login to Railway"
echo "  railway new            # Create new project"
echo "  railway add postgresql # Add PostgreSQL database"
echo "  railway up             # Deploy your app"
echo "  railway open           # Open your deployed app"
echo ""
