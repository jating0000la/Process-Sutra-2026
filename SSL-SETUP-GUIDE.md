# SSL Setup Guide for Process Sutra

This guide will help you fix the nginx SSL certificate issue and get your site running with HTTPS.

## Problem Summary
- Your Node.js app (PM2) is listening on port 443, preventing nginx from starting
- Nginx needs port 443 to handle HTTPS traffic
- Let's Encrypt certification attempts are failing with 500 errors

## Solution Steps

### Step 1: Fix Port Conflict (Free Up Port 443)

Your Node.js application should **NOT** be listening on port 443. Port 443 should be handled by nginx, which will then proxy requests to your app on port 5000.

```bash
# Stop the app
pm2 stop processsutra

# Check PM2 environment variables
pm2 show processsutra

# If PORT is set to 443 or anything other than 5000, unset it
pm2 unset processsutra PORT

# Restart the app (it will now use port 5000 from your code)
pm2 restart processsutra

# Verify nothing is on port 443 anymore
ss -ltnp | grep ':443'
# Should show no output
```

### Step 2: Clean Up Nginx Configuration

Remove conflicting nginx site configurations:

```bash
# Remove the duplicate/conflicting site
sudo unlink /etc/nginx/sites-enabled/processsutra

# Create webroot for Certbot challenges
sudo mkdir -p /var/www/html/.well-known/acme-challenge
sudo chown -R www-data:www-data /var/www/html

# Copy the updated nginx config from your repo to the server
# Option A: If you have the file locally, copy it:
sudo cp ~/Process-Sutra-2026/nginx.conf /etc/nginx/sites-available/processsutra.com

# Option B: Or create it manually with the content below
sudo nano /etc/nginx/sites-available/processsutra.com
```

**Temporary HTTP-only config (for obtaining certs):**
```nginx
server {
    listen 80;
    server_name processsutra.com www.processsutra.com;

    # Serve Certbot challenge files
    location /.well-known/acme-challenge/ {
        root /var/www/html;
        default_type "text/plain";
    }

    # Proxy all requests to Node.js
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

Test and start nginx:
```bash
sudo nginx -t
sudo systemctl start nginx
sudo systemctl status nginx --no-pager
```

### Step 3: Obtain SSL Certificate

Now that nginx is running correctly and can serve challenge files:

```bash
# Run Certbot with webroot authentication
sudo certbot certonly --webroot -w /var/www/html \
  -d processsutra.com -d www.processsutra.com \
  --agree-tos -m jatin@muxro.com --non-interactive

# Verify the certificate files were created
sudo ls -l /etc/letsencrypt/live/processsutra.com/
```

You should see:
- `fullchain.pem` - The full certificate chain
- `privkey.pem` - The private key

### Step 4: Enable HTTPS in Nginx

Replace the HTTP-only config with the full HTTPS-enabled version:

```bash
# Copy the updated nginx.conf from your repo (it now has Let's Encrypt paths)
sudo cp ~/Process-Sutra-2026/nginx.conf /etc/nginx/sites-available/processsutra.com

# Or manually update the file to use the Let's Encrypt certificate paths:
sudo nano /etc/nginx/sites-available/processsutra.com
```

Make sure it includes both the HTTP redirect and the HTTPS server block (see the updated `nginx.conf` in your repo).

Test and reload:
```bash
sudo nginx -t
sudo systemctl reload nginx
sudo systemctl status nginx --no-pager
```

### Step 5: Verify and Test

```bash
# Check that nginx is listening on both 80 and 443
ss -ltnp | grep nginx

# Test HTTP (should redirect to HTTPS)
curl -I http://processsutra.com

# Test HTTPS
curl -I https://processsutra.com

# Check certificate info
sudo certbot certificates

# Test auto-renewal
sudo certbot renew --dry-run
```

### Step 6: Verify PM2 Configuration

Make sure PM2 is configured correctly:

```bash
# Save the PM2 process list
pm2 save

# Check PM2 startup script
pm2 startup

# View logs
pm2 logs processsutra --lines 50
```

## Firewall Configuration

If you're using UFW:

```bash
# Allow HTTPS
sudo ufw allow 'Nginx Full'

# Remove HTTP-only rule if it exists
sudo ufw delete allow 'Nginx HTTP'

# Check status
sudo ufw status
```

## Auto-Renewal

Certbot automatically sets up a systemd timer for renewal. Verify it:

```bash
# Check the timer status
sudo systemctl status certbot.timer --no-pager

# List all timers
systemctl list-timers | grep certbot
```

## Troubleshooting

### If Certbot still fails with 500 error:
```bash
# Verify your Node app is responding correctly
curl http://localhost:5000

# Check nginx access and error logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# Check Certbot logs
sudo tail -f /var/log/letsencrypt/letsencrypt.log
```

### If nginx won't start:
```bash
# Check what's using port 443
sudo ss -ltnp | grep ':443'

# If something is there, kill it or reconfigure it
# For a Node process:
sudo kill -9 <PID>

# Then restart nginx
sudo systemctl restart nginx
```

### If site is unreachable:
```bash
# Check if processes are running
pm2 status
sudo systemctl status nginx

# Check if ports are listening
ss -ltnp | grep ':5000'  # Node app
ss -ltnp | grep ':80'    # Nginx HTTP
ss -ltnp | grep ':443'   # Nginx HTTPS
```

## Architecture Overview

After these changes:
- **Port 80 (HTTP)**: Nginx serves ACME challenges and redirects everything else to HTTPS
- **Port 443 (HTTPS)**: Nginx handles SSL/TLS and proxies all requests to your Node app
- **Port 5000**: Your Node.js application (PM2) serves the API and static files
- Nginx acts as a reverse proxy and SSL terminator

## Summary of Changes

1. ✅ Node app moved from port 443 to port 5000
2. ✅ Nginx takes control of ports 80 and 443
3. ✅ Let's Encrypt certificates obtained via webroot method
4. ✅ Nginx configured to:
   - Redirect HTTP → HTTPS
   - Terminate SSL/TLS
   - Proxy all requests to Node app on port 5000
   - Serve ACME challenge files for cert renewal

Your site should now be accessible at `https://processsutra.com` with a valid SSL certificate!
