# Process Sutra 2026 🚀

A comprehensive workflow automation and process management platform built with modern web technologies.

## 🛡️ Security Status

**Security Rating: 🟢 LOW RISK / ENTERPRISE-GRADE** (Post-Security Audit - November 2025)

### Recent Security Improvements ✅
- **Firebase Authorization**: Enhanced token validation with audience, issuer, and age verification
- **Session Security**: Cryptographically secure session management with 4-hour TTL
- **Rate Limiting**: Authentication endpoint protection (25 attempts/15 minutes)
- **Cookie Security**: Secure, HttpOnly cookies with strict SameSite policy
- **Data Protection**: Removed sensitive data logging from production builds
- **Development Security**: Enhanced development authentication controls
- **Comprehensive Documentation**: Complete security documentation package for customers and partners

### Security Documentation 📚

#### Core Security Documents
- 🔒 [**Security Audit Report**](./SECURITY_AUDIT_REPORT.md) - Comprehensive internal security assessment
- 📖 [**Customer Security Documentation**](./CUSTOMER_SECURITY_DOCUMENTATION.md) - Public-facing security information
- ⚖️ [**Non-Disclosure Agreement (NDA)**](./NDA_AGREEMENT.md) - Legal confidentiality agreement template
- 📋 [**Documentation Summary**](./SECURITY_DOCUMENTATION_SUMMARY.md) - Overview of all security documentation
- ⚡ [**Security Quick Reference**](./SECURITY_QUICK_REFERENCE.md) - Fast reference guide for all stakeholders

#### Additional Resources
- 📄 [Firebase Authorization Audit](./FIREBASE_AUTHORIZATION_AUDIT.md)
- 📄 [Security Best Practices](./SECURITY_BEST_PRACTICES.md)
- 📄 [Security Fixes Summary](./SECURITY_FIXES_SUMMARY.md)

### For Customers & Partners
Start with the [**Customer Security Documentation**](./CUSTOMER_SECURITY_DOCUMENTATION.md) to understand how we protect your data. For legal agreements, refer to our [**NDA template**](./NDA_AGREEMENT.md).

## 🚀 Features

- **Workflow Automation**: Create and manage complex business processes
- **Form Builder**: Dynamic form creation with conditional logic
- **Task Management**: Assign and track tasks across teams
- **Analytics**: Real-time insights and performance metrics
- **Multi-tenant**: Organization-based user management
- **Firebase Authentication**: Secure Google OAuth integration
- **Real-time Notifications**: Live updates and email notifications

## 🏗️ Tech Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for build tooling
- **Tailwind CSS** for styling
- **React Query** for state management
- **React Hook Form** for form handling

### Backend
- **Node.js** with Express
- **TypeScript** for type safety
- **PostgreSQL** with Drizzle ORM
- **MongoDB** for form data storage
- **Firebase Admin SDK** for authentication

### Security & Infrastructure
- **Firebase Authentication** with enhanced security
- **Session-based auth** with PostgreSQL storage
- **Rate limiting** for API protection
- **Secure cookie configuration**
- **Docker** for containerization

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL database
- MongoDB database
- Firebase project

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/jating0000la/Process-Sutra-2026.git
   cd Process-Sutra-2026
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   # Copy environment template
   cp .env.example .env.local
   
   # Generate secure session secret
   node -e "console.log('SESSION_SECRET=' + require('crypto').randomBytes(64).toString('hex'))"
   ```

4. **Configure Firebase**
   - Create a Firebase project
   - Enable Authentication with Google provider
   - Generate service account key (Admin SDK)
   - Update `.env.local` with Firebase credentials

5. **Database Setup**
   ```bash
   # PostgreSQL migrations
   npm run migrate
   
   # MongoDB indexes (optional)
   npm run setup-mongo-indexes
   ```

6. **Start Development Server**
   ```bash
   npm run dev
   ```

## 🔐 Security Configuration

### Production Environment
```bash
# Essential security settings for production
NODE_ENV=production
SESSION_SECRET=your-64-character-cryptographically-secure-secret
COOKIE_SECURE=true
COOKIE_SAMESITE=strict
INSECURE_COOKIES=false
DISABLE_DEV_AUTH=true
```

### Firebase Security
- Use separate Firebase projects for dev/staging/production
- Rotate service account keys every 90 days
- Configure authorized domains in Firebase Console
- Enable Firebase Security Rules

## 📋 Environment Variables

See [`.env.example`](./.env.example) for all required environment variables.

### Critical Security Variables
- `SESSION_SECRET`: Cryptographically secure session secret (64+ chars)
- `FIREBASE_PRIVATE_KEY`: Firebase service account private key
- `DATABASE_URL`: PostgreSQL connection string
- `MONGODB_URI`: MongoDB connection string

## 🧪 Testing

```bash
# Run tests
npm test

# Build verification
npm run build

# Type checking
npm run type-check
```

## 📦 Deployment

### Docker Deployment
```bash
# Build and run with Docker Compose
docker-compose up -d
```

### Manual Deployment
```bash
# Build for production
npm run build

# Start production server
npm start
```

### Security Checklist for Production
- [ ] Rotate Firebase service account key
- [ ] Generate secure session secret
- [ ] Enable HTTPS/TLS
- [ ] Configure secure cookies
- [ ] Set up monitoring and alerting
- [ ] Review security audit documentation

## 📖 API Documentation

The application provides RESTful APIs for:
- Authentication and user management
- Workflow and task management
- Form creation and submission
- Analytics and reporting

API documentation is available at `/api-documentation` when running the application.

## 🔧 Development

### Project Structure
```
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Page components
│   │   ├── contexts/       # React contexts
│   │   ├── hooks/          # Custom hooks
│   │   └── lib/           # Utilities and configurations
├── server/                 # Node.js backend
│   ├── firebaseAuth.ts    # Authentication logic
│   ├── routes.ts          # API routes
│   ├── storage.ts         # Database operations
│   └── index.ts           # Server entry point
├── shared/                 # Shared types and schemas
└── migrations/            # Database migrations
```

### Development Scripts
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run type-check   # TypeScript type checking
npm run migrate      # Run database migrations
npm run test         # Run tests
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Security Contributions
- Follow security best practices outlined in [SECURITY_BEST_PRACTICES.md](./SECURITY_BEST_PRACTICES.md)
- Never commit secrets or private keys
- Run security audit before submitting PRs
- Update security documentation when relevant

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📞 Support

For questions or support:
- Create an issue in this repository
- Check the [security documentation](./SECURITY_BEST_PRACTICES.md)
- Review the [audit reports](./FIREBASE_AUTHORIZATION_AUDIT.md)

## 🔄 Changelog

### Version 3.2.0 - Security Release (October 2025)
- **🔒 SECURITY**: Comprehensive Firebase authorization security fixes
- **🛡️ Enhanced**: Token validation with audience, issuer, and age checks
- **⚡ Added**: Rate limiting for authentication endpoints
- **🍪 Improved**: Secure cookie configuration for production
- **📝 Removed**: Sensitive data logging from production builds
- **📖 Added**: Comprehensive security documentation

### Previous Versions
See git history for detailed changelog of previous releases.

---

**Security Audit Date**: October 21, 2025  
**Security Rating**: 🟢 LOW RISK  
**Last Updated**: October 21, 2025