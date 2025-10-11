# 🌐 ProcessSutra Manual Deployment on Hostinger

## 📋 Prerequisites

### Hostinger Plan Requirements
- **Recommended**: Business Shared Hosting or VPS
- **Minimum**: Premium Shared Hosting
- **Features needed**: Node.js support, SSH access, MySQL database

### What You'll Need
- Hostinger hosting account
- Domain name (can use Hostinger's free subdomain)
- SSH access enabled
- File manager access

---

## 🚀 Step-by-Step Deployment Guide

### Step 1: Enable Node.js in Hostinger

1. **Login to Hostinger Control Panel**
2. **Go to Advanced → SSH Access**
3. **Enable SSH Access**
4. **Note your SSH credentials**

5. **Enable Node.js**:
   - Go to **Advanced → Node.js**
   - Select **Node.js version 18** or latest
   - Set **Application URL** (e.g., `processsutra.yourdomain.com`)
   - Set **Application root** to `public_html/processsutra`
   - Set **Application startup file** to `dist/index.js`

---

### Step 2: Database Setup

1. **Create MySQL Database**:
   - Go to **Databases → MySQL Databases**
   - Create database: `your_username_processsutra`
   - Create user: `your_username_admin`
   - Set strong password
   - Grant all privileges

2. **Note Database Details**:
   ```
   Host: localhost
   Database: your_username_processsutra
   Username: your_username_admin
   Password: [your_password]
   Port: 3306
   ```

---

### Step 3: Upload Your Files

#### Option A: Using File Manager (Easy)
1. **Zip your ProcessSutra project** (excluding node_modules)
2. **Upload via File Manager**:
   - Go to **Files → File Manager**
   - Navigate to `public_html`
   - Create folder `processsutra`
   - Upload and extract your zip file

#### Option B: Using SSH (Advanced)
```bash
# Connect via SSH
ssh your_username@your_server_ip

# Navigate to web directory
cd public_html

# Create project directory
mkdir processsutra
cd processsutra

# Upload files (you can use scp, git, or file manager)
```

---

### Step 4: Install Dependencies

1. **SSH into your account**:
```bash
ssh your_username@your_server_ip
cd public_html/processsutra
```

2. **Install Node.js dependencies**:
```bash
npm install
```

3. **Build the application**:
```bash
npm run build
```

---

### Step 5: Environment Configuration

Create `.env.production` file in your project root:

```bash
# ProcessSutra Production Environment for Hostinger
NODE_ENV=production
PORT=3000

# Domain configuration
DOMAIN=your-domain.com
CORS_ORIGIN=https://your-domain.com,https://www.your-domain.com

# MySQL Database configuration (Hostinger)
DATABASE_URL=mysql://your_username_admin:your_password@localhost:3306/your_username_processsutra

# Session secret (generate a secure one)
SESSION_SECRET=your_64_character_secure_random_string_here

# Security settings
TRUST_PROXY=true
COOKIE_SECURE=true
INSECURE_COOKIES=false
COOKIE_SAMESITE=strict

# Firebase configuration
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_CLIENT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\nYOUR_FIREBASE_PRIVATE_KEY\n-----END PRIVATE KEY-----
FIREBASE_CLIENT_ID=your-firebase-client-id

# Frontend Firebase config
VITE_FIREBASE_API_KEY=your-firebase-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-firebase-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id

# Email configuration (optional)
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=587
SMTP_USER=noreply@your-domain.com
SMTP_PASS=your-email-password
```

---

### Step 6: Database Migration

Since Hostinger uses MySQL, you need to adapt your schema:

1. **Install MySQL driver**:
```bash
npm install mysql2
```

2. **Update your database connection** in your code to use MySQL instead of PostgreSQL

3. **Run database migrations** (adapt your existing PostgreSQL migrations to MySQL)

---

### Step 7: Configure Web Server

#### Option A: Using .htaccess (Shared Hosting)

Create `.htaccess` in your domain's public_html folder:

```apache
# ProcessSutra .htaccess for Shared Hosting

# Enable gzip compression
<IfModule mod_deflate.c>
    AddOutputFilterByType DEFLATE text/plain
    AddOutputFilterByType DEFLATE text/html
    AddOutputFilterByType DEFLATE text/xml
    AddOutputFilterByType DEFLATE text/css
    AddOutputFilterByType DEFLATE application/xml
    AddOutputFilterByType DEFLATE application/xhtml+xml
    AddOutputFilterByType DEFLATE application/rss+xml
    AddOutputFilterByType DEFLATE application/javascript
    AddOutputFilterByType DEFLATE application/x-javascript
</IfModule>

# Security headers
<IfModule mod_headers.c>
    Header always set X-Frame-Options DENY
    Header always set X-Content-Type-Options nosniff
    Header always set X-XSS-Protection "1; mode=block"
    Header always set Referrer-Policy "strict-origin-when-cross-origin"
</IfModule>

# Redirect API calls to Node.js app
RewriteEngine On

# API routes - proxy to Node.js app
RewriteRule ^api/(.*)$ http://localhost:3000/api/$1 [P,L]

# Serve static files directly
RewriteCond %{REQUEST_FILENAME} -f
RewriteRule ^(.*)$ - [L]

# All other routes go to React app
RewriteRule ^(.*)$ /index.html [L]
```

#### Option B: Using Node.js App (VPS)

If you have a VPS, you can use PM2:

```bash
# Install PM2
npm install -g pm2

# Create ecosystem file
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'processsutra',
    script: 'dist/index.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '512M',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    env_file: '.env.production'
  }]
}
EOF

# Start with PM2
pm2 start ecosystem.config.js
pm2 startup
pm2 save
```

---

### Step 8: SSL Certificate

1. **In Hostinger Control Panel**:
   - Go to **Advanced → SSL**
   - Enable **Free Let's Encrypt SSL**
   - Or upload your own SSL certificate

2. **Force HTTPS**:
   - Add to your `.htaccess`:
   ```apache
   # Force HTTPS
   RewriteEngine On
   RewriteCond %{HTTPS} off
   RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]
   ```

---

### Step 9: Start Your Application

#### For Shared Hosting:
1. **Configure Node.js in Hostinger panel**:
   - Set startup file: `dist/index.js`
   - Set port: `3000`
   - Start the application

#### For VPS:
```bash
# Start with PM2
pm2 start processsutra
pm2 status
```

---

## 🔧 Hostinger-Specific Configuration

### MySQL Schema Conversion

Since Hostinger uses MySQL, update your schema:

```javascript
// Update from PostgreSQL to MySQL
// In your schema files, change:

// PostgreSQL
// id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),

// MySQL
id: varchar("id", { length: 36 }).primaryKey().default(sql`(UUID())`),

// PostgreSQL timestamps
// createdAt: timestamp("created_at").defaultNow(),

// MySQL timestamps  
createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
```

### File Upload Configuration

For file uploads on shared hosting:

```javascript
// Update upload paths for shared hosting
const uploadPath = process.env.NODE_ENV === 'production' 
  ? '/home/your_username/public_html/uploads'
  : './uploads';
```

---

## 📊 Hostinger Resource Limits

### Shared Hosting Limits:
- **CPU**: Limited (good for small to medium traffic)
- **Memory**: 1-3GB RAM
- **Storage**: 100GB - Unlimited
- **Bandwidth**: Unlimited
- **Node.js**: Supported but limited resources

### VPS Hosting:
- **Full root access**
- **Dedicated resources**
- **Better for high-traffic applications**

---

## 🛠️ Troubleshooting

### Common Issues:

1. **Node.js app not starting**:
   ```bash
   # Check logs in Hostinger panel
   # Or via SSH:
   cd public_html/processsutra
   node dist/index.js
   ```

2. **Database connection issues**:
   ```bash
   # Test MySQL connection
   mysql -u your_username_admin -p your_username_processsutra
   ```

3. **File permissions**:
   ```bash
   # Fix permissions
   chmod 755 public_html/processsutra
   chmod 644 public_html/processsutra/.env.production
   ```

4. **Memory issues on shared hosting**:
   - Optimize your code
   - Reduce bundle size
   - Consider VPS upgrade

---

## 🎯 Final Steps

1. **Test your application**:
   - Visit `https://your-domain.com`
   - Test API endpoints: `https://your-domain.com/api/health`
   - Check user registration/login

2. **Monitor performance**:
   - Use Hostinger's monitoring tools
   - Check application logs
   - Monitor resource usage

3. **Backup setup**:
   - Regular database backups
   - Code backups
   - File backups

---

## 💰 Cost Breakdown

**Hostinger Business Shared Hosting**: ~$3-7/month
- Includes: Domain, SSL, Email, MySQL, Node.js
- Total cost: Much cheaper than GCP!

**Hostinger VPS**: ~$4-15/month
- Full control, better performance

---

## 🆘 Need Help?

1. **Hostinger Support**: 24/7 live chat
2. **Knowledge Base**: Extensive documentation
3. **Community**: Active forums

Your ProcessSutra will be live at a fraction of GCP costs! 🚀