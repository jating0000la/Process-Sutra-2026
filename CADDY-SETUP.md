# Caddy Web Server Setup Guide

## Prerequisites
- VPS server running Ubuntu/Debian
- SSH access to your server (root@62.72.57.53)
- Domain name pointed to your VPS IP (processsutra.com → 62.72.57.53)
- Node.js application running on port 3000 or 5000

---

## Step 1: Connect to Your VPS

```bash
ssh root@62.72.57.53
```

---

## Step 2: Install Caddy

### Option A: Official Caddy Repository (Recommended)

```bash
# Install required packages
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl

# Add Caddy's GPG key
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg

# Add Caddy repository
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list

# Update and install Caddy
sudo apt update
sudo apt install caddy
```

### Option B: Quick Install (Alternative)

```bash
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update && sudo apt install caddy -y
```

---

## Step 3: Verify Installation

```bash
# Check Caddy version
caddy version

# Check Caddy service status
sudo systemctl status caddy
```

---

## Step 4: Configure Caddy

### Create Caddyfile

```bash
# Stop Caddy service first
sudo systemctl stop caddy

# Edit the Caddyfile
sudo nano /etc/caddy/Caddyfile
```

### Basic Configuration (Copy this into Caddyfile)

http://processsutra.com, http://www.processsutra.com {
    reverse_proxy localhost:5000
}

http://62.72.57.53 {
    redir http://processsutra.com{uri} permanent
}

---

## Step 5: Test and Start Caddy

### Test Configuration

```bash
# Validate Caddyfile syntax
sudo caddy validate --config /etc/caddy/Caddyfile

# Test configuration (dry run)
sudo caddy fmt --overwrite /etc/caddy/Caddyfile
```

### Start Caddy Service

```bash
# Reload systemd
sudo systemctl daemon-reload

# Start Caddy
sudo systemctl start caddy

# Enable Caddy to start on boot
sudo systemctl enable caddy

# Check status
sudo systemctl status caddy
```

### View Logs

```bash
# View Caddy logs
sudo journalctl -u caddy -f

# View access logs
sudo tail -f /var/log/caddy/access.log

# View Caddy errors
sudo journalctl -u caddy --no-pager | tail -50
```

---

## Step 6: Configure Firewall

```bash
# Allow HTTP and HTTPS traffic
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Allow SSH (if not already allowed)
sudo ufw allow 22/tcp

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status
```

---

## Step 7: Verify Your Node.js App is Running

```bash
# Check if your app is running on the correct port
sudo netstat -tulpn | grep node

# Or using ss command
sudo ss -tulpn | grep node

# Or check specific port
sudo lsof -i :5000
```

If your app is not running, start it:

```bash
# Using PM2 (recommended for production)
pm2 start /path/to/your/app/server/index.js --name "processsutra"
pm2 save
pm2 startup
```

---

## Step 8: Test Your Setup

### From your local machine:

```bash
# Test domain resolution
nslookup processsutra.com

# Test HTTP (should redirect to HTTPS)
curl -I http://processsutra.com

# Test HTTPS
curl -I https://processsutra.com

# Test SSL certificate
openssl s_client -connect processsutra.com:443 -servername processsutra.com
```

### From browser:
- Visit: https://processsutra.com
- Check for valid SSL certificate (🔒 padlock icon)
- Verify your app loads correctly

---

## Useful Caddy Commands

```bash
# Restart Caddy
sudo systemctl restart caddy

# Reload configuration without downtime
sudo systemctl reload caddy

# Stop Caddy
sudo systemctl stop caddy

# Check Caddy status
sudo systemctl status caddy

# View Caddy logs
sudo journalctl -u caddy -f

# Test configuration
sudo caddy validate --config /etc/caddy/Caddyfile

# Format Caddyfile
sudo caddy fmt --overwrite /etc/caddy/Caddyfile

# Manually obtain certificate
sudo caddy run --config /etc/caddy/Caddyfile

# Check certificate
sudo caddy list-certificates
```

---

## Troubleshooting

### Issue: SSL Certificate Not Obtained

**Solution:**
```bash
# Check if port 80 and 443 are accessible
sudo ufw status

# Check DNS settings
dig processsutra.com

# Check Caddy logs
sudo journalctl -u caddy -n 100 --no-pager

# Manually test certificate obtaining
sudo caddy run --config /etc/caddy/Caddyfile
```

### Issue: Connection Refused

**Solution:**
```bash
# Check if Node.js app is running
pm2 status

# Check port binding
sudo netstat -tulpn | grep :5000

# Test local connection
curl http://localhost:5000
```

### Issue: 502 Bad Gateway

**Solutions:**
```bash
# Restart your Node.js application
pm2 restart processsutra

# Check app logs
pm2 logs processsutra

# Verify app is listening on correct port
```

### Issue: Permission Denied

**Solution:**
```bash
# Fix Caddy permissions
sudo chown -R root:root /etc/caddy
sudo chmod -R 755 /etc/caddy

# Create log directory
sudo mkdir -p /var/log/caddy
sudo chown caddy:caddy /var/log/caddy
```

---

## PM2 Setup (For Node.js App Management)

```bash
# Install PM2
npm install -g pm2

# Start your app
pm2 start /root/Process-Sutra-2026/server/index.js --name processsutra

# Or if using ecosystem file:
pm2 start ecosystem.config.js

# Save PM2 process list
pm2 save

# Setup PM2 to start on boot
pm2 startup systemd
# Copy and run the command shown by PM2

# Check status
pm2 status

# View logs
pm2 logs processsutra

# Restart app
pm2 restart processsutra
```

---

## Complete Deployment Checklist

- [ ] DNS records point to VPS IP (62.72.57.53)
- [ ] Caddy installed and running
- [ ] Caddyfile configured correctly
- [ ] Firewall allows ports 80, 443, and 22
- [ ] Node.js app running on correct port (5000)
- [ ] PM2 configured for process management
- [ ] SSL certificate obtained automatically
- [ ] Website accessible via https://processsutra.com
- [ ] IP redirect working (62.72.57.53 → processsutra.com)
- [ ] Environment variables set correctly
- [ ] Database connected
- [ ] Logs being written correctly

---

## Quick Setup Script

Save this as `setup-caddy.sh` and run it:

```bash
#!/bin/bash

echo "🚀 Setting up Caddy for ProcessSutra..."

# Install Caddy
echo "📦 Installing Caddy..."
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update && sudo apt install caddy -y

# Configure firewall
echo "🔒 Configuring firewall..."
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 22/tcp

# Create log directory
echo "📝 Creating log directory..."
sudo mkdir -p /var/log/caddy
sudo chown caddy:caddy /var/log/caddy

# Enable Caddy
echo "✅ Enabling Caddy service..."
sudo systemctl enable caddy

echo "✨ Caddy installation complete!"
echo "📝 Next steps:"
echo "   1. Edit /etc/caddy/Caddyfile with your configuration"
echo "   2. Run: sudo systemctl restart caddy"
echo "   3. Check status: sudo systemctl status caddy"
```

---

## Security Best Practices

1. **Keep Caddy Updated**
   ```bash
   sudo apt update && sudo apt upgrade caddy
   ```

2. **Enable Automatic Security Updates**
   ```bash
   sudo apt install unattended-upgrades
   sudo dpkg-reconfigure -plow unattended-upgrades
   ```

3. **Use Strong SSL Configuration** (Already included in advanced config)

4. **Monitor Logs Regularly**
   ```bash
   sudo journalctl -u caddy -f
   ```

5. **Backup Configuration**
   ```bash
   sudo cp /etc/caddy/Caddyfile /etc/caddy/Caddyfile.backup
   ```

---

## Need Help?

- Caddy Documentation: https://caddyserver.com/docs/
- Caddy Community Forum: https://caddy.community/
- Your VPS IP: 62.72.57.53
- Your Domain: processsutra.com

---

**Good luck with your deployment! 🚀**
