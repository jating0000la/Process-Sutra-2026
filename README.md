# 🚀 ProcessSutra 2026

Modern workflow automation platform for business process management.

## 🌐 Live Demo

**Production**: [https://processsutra.com](https://processsutra.com)

## ✨ Features

- **Workflow Automation**: Create and manage complex business processes
- **Dynamic Forms**: Build custom forms with drag-and-drop interface
- **Real-time Analytics**: Monitor task performance and completion rates
- **Multi-database Support**: PostgreSQL and MongoDB integration
- **Firebase Authentication**: Secure user management
- **Responsive Design**: Works on desktop and mobile devices

## 🛠️ Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS, Vite
- **Backend**: Node.js, Express, TypeScript
- **Databases**: PostgreSQL, MongoDB
- **Authentication**: Firebase Auth
- **Deployment**: PM2, Nginx, Let's Encrypt SSL

## 🚀 Quick Start

### Development

```bash
# Clone repository
git clone https://github.com/your-username/Process-Sutra-2026.git
cd Process-Sutra-2026

# Install dependencies
npm install

# Setup environment
cp .env.production.template .env.local
# Update .env.local with your credentials

# Start development server
npm run dev
```

### Production Deployment

#### VPS Deployment (Recommended)

1. **Setup VPS Environment**:
   ```bash
   # Run on your VPS
   ./vps-setup.sh
   ```

2. **Deploy Application**:
   ```bash
   # Clone to VPS
   git clone https://github.com/your-username/Process-Sutra-2026.git /var/www/processsutra
   cd /var/www/processsutra
   
   # Configure environment
   cp .env.production.template .env.production
   # Update .env.production with your credentials
   
   # Deploy
   ./deploy.sh
   ```

3. **Setup SSL & Domain**:
   ```bash
   # Copy nginx config
   sudo cp nginx.conf /etc/nginx/sites-available/processsutra.com
   sudo ln -s /etc/nginx/sites-available/processsutra.com /etc/nginx/sites-enabled/
   
   # Get SSL certificate
   sudo certbot --nginx -d processsutra.com -d www.processsutra.com
   ```

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions.

## 📊 Project Structure

```
Process-Sutra-2026/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   ├── pages/         # Page components
│   │   ├── contexts/      # React contexts
│   │   └── lib/          # Utilities
├── server/                # Node.js backend
│   ├── mongo/            # MongoDB utilities
│   ├── routes.ts         # API routes
│   ├── storage.ts        # Database operations
│   └── index.ts          # Server entry point
├── shared/               # Shared types and schemas
├── migrations/           # Database migrations
└── scripts/             # Utility scripts
```

## 🔧 Configuration

### Environment Variables

Key environment variables for production:

```bash
# Server
NODE_ENV=production
PORT=5000
DOMAIN=processsutra.com

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/processsutra
MONGODB_URI=mongodb://localhost:27017/processsutra

# Security
SESSION_SECRET=your-secure-session-secret
COOKIE_SECURE=true

# Firebase
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY=your-private-key
VITE_FIREBASE_API_KEY=your-api-key
```

## 📈 Monitoring

### PM2 Commands

```bash
# Check status
pm2 status

# View logs
pm2 logs processsutra

# Restart application
pm2 restart processsutra

# Monitor resources
pm2 monit
```

### Health Checks

- **Application**: `https://processsutra.com/api/health`
- **Database**: Check via application logs
- **SSL**: Check certificate expiry

## 🔄 Updates

### Automated Updates

```bash
# Pull latest changes and restart
npm run deploy:update
```

### Manual Updates

```bash
git pull origin main
npm ci --production=false
npm run build
pm2 restart processsutra
```

## 🛡️ Security

- SSL/TLS encryption (Let's Encrypt)
- Secure session management
- CORS protection
- Input validation and sanitization
- Firebase authentication
- Regular security updates

## 📦 Backup

Automated daily backups include:
- PostgreSQL database dumps
- MongoDB collections
- Application files
- Configuration files

## 🆘 Troubleshooting

### Common Issues

1. **502 Bad Gateway**: Check if PM2 process is running
2. **Database Connection**: Verify credentials and service status
3. **SSL Issues**: Check certificate validity and nginx config

### Logs

- **Application**: `pm2 logs processsutra`
- **Nginx**: `/var/log/nginx/error.log`
- **System**: `journalctl -u processsutra`

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📞 Support

- **Documentation**: [DEPLOYMENT.md](./DEPLOYMENT.md)
- **Issues**: [GitHub Issues](https://github.com/your-username/Process-Sutra-2026/issues)
- **Email**: support@processsutra.com

---

**ProcessSutra 2026** - Streamlining business processes with modern technology 🚀