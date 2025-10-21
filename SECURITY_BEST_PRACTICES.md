# Security Best Practices & Firebase Key Rotation Guide
**Process-Sutra-2026 Application**

## 🚨 URGENT: Firebase Private Key Security

### Current Status
⚠️ **CRITICAL**: The Firebase service account private key is currently exposed in the `.env.local` file and may be committed to version control. This requires immediate action.

### Immediate Action Required

#### 1. Rotate Firebase Service Account Key (URGENT)

**Step 1: Create New Service Account Key**
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Navigate to: Project Settings → Service Accounts
3. Click "Generate New Private Key"
4. Download the JSON file (keep it secure!)
5. **DO NOT commit this file to Git**

**Step 2: Update Environment Variables**
```bash
# Extract values from the downloaded JSON file and update .env.local
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_NEW_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----\n"
```

**Step 3: Revoke Old Key**
1. In Firebase Console → Service Accounts
2. Find the old key and click "Delete"
3. Confirm deletion

**Step 4: Test Authentication**
```bash
# Restart your application and test login
npm run dev
```

#### 2. Secure Key Storage (Production)

**For Production Deployment:**
- Use Azure Key Vault, AWS Secrets Manager, or Google Secret Manager
- Never store private keys in environment files
- Use service account impersonation where possible

**Example with Azure Key Vault:**
```typescript
import { SecretClient } from "@azure/keyvault-secrets";

const getFirebasePrivateKey = async () => {
  const client = new SecretClient(vaultUrl, credential);
  const secret = await client.getSecret("firebase-private-key");
  return secret.value;
};
```

---

## 🔐 Security Implementation Fixes Applied

### 1. Session Security ✅
- **Secure Session Secret**: Generated cryptographically secure 128-character secret
- **Reduced Session Duration**: From 1 week to 4 hours for better security
- **Session Rolling**: Enabled to refresh sessions on activity
- **Cookie Security**: Proper secure flags and SameSite protection

### 2. Firebase Token Validation ✅
- **Enhanced Verification**: Added audience and issuer validation
- **Token Age Check**: Reject tokens older than 1 hour
- **Revocation Check**: Check if tokens have been revoked
- **Error Sanitization**: Prevent information leakage in error messages

### 3. Rate Limiting ✅
- **Authentication Endpoints**: Limited to 5 attempts per 15 minutes per IP
- **Skip Successful Requests**: Don't count successful authentications against limits
- **Proper Error Messages**: Clear feedback on rate limiting

### 4. Development Security ✅
- **Environment Checks**: Strict validation of development bypass usage
- **Security Warnings**: Clear console warnings when dev auth is used
- **Disable Flag**: Added DISABLE_DEV_AUTH environment variable

### 5. Logging Security ✅
- **Removed Sensitive Data**: No more form data or auth response logging in production
- **Development Only**: Sensitive logging only in development environment
- **Sanitized Messages**: Generic messages without exposing internal details

---

## 🛡️ Production Security Checklist

### Environment Configuration
- [ ] Firebase private key stored securely (not in .env files)
- [ ] Session secret is cryptographically secure (128+ characters)
- [ ] Secure cookies enabled (`COOKIE_SECURE=true`)
- [ ] Strict SameSite policy (`COOKIE_SAMESITE=strict`)
- [ ] Development auth disabled (`DISABLE_DEV_AUTH=true`)

### Firebase Security
- [ ] Service account key rotated regularly (every 90 days)
- [ ] API key restrictions configured in Firebase Console
- [ ] Authorized domains configured properly
- [ ] Firebase Auth triggers monitored

### Application Security
- [ ] HTTPS/TLS enabled for all environments
- [ ] Rate limiting configured for all critical endpoints
- [ ] CORS properly configured
- [ ] Security headers implemented
- [ ] Content Security Policy (CSP) configured

### Monitoring & Logging
- [ ] Security event logging implemented
- [ ] Failed authentication attempts monitored
- [ ] Unusual access patterns detected
- [ ] Error tracking with Sentry or similar

---

## 🔄 Regular Security Maintenance

### Monthly
- [ ] Review authentication logs for anomalies
- [ ] Check for failed login patterns
- [ ] Verify rate limiting effectiveness
- [ ] Update dependencies with security patches

### Quarterly
- [ ] Rotate Firebase service account keys
- [ ] Review and update session configuration
- [ ] Audit user permissions and roles
- [ ] Penetration testing or security scan

### Annually
- [ ] Comprehensive security audit
- [ ] Review and update security policies
- [ ] Security training for development team
- [ ] Compliance assessment (SOC 2, ISO 27001, etc.)

---

## 🚨 Incident Response Plan

### Security Breach Detection
1. **Immediate Response**
   - Disable compromised accounts
   - Rotate all secrets and keys
   - Enable additional monitoring

2. **Investigation**
   - Review audit logs
   - Identify scope of breach
   - Document timeline and impact

3. **Recovery**
   - Apply security patches
   - Verify system integrity
   - Restore from clean backups if needed

4. **Post-Incident**
   - Update security measures
   - Improve monitoring
   - Team debriefing and lessons learned

### Emergency Contacts
- **Security Team**: [security@yourcompany.com]
- **Firebase Support**: [Firebase Console → Support]
- **Infrastructure Team**: [infra@yourcompany.com]

---

## 🔧 Development Security Guidelines

### For Developers
1. **Never commit secrets to Git**
   ```bash
   # Add to .gitignore
   .env.local
   .env.production
   firebase-service-account.json
   ```

2. **Use environment-specific configurations**
   ```typescript
   // Good: Environment-specific settings
   const isProduction = process.env.NODE_ENV === 'production';
   const cookieSecure = isProduction;
   
   // Bad: Hardcoded insecure settings
   const cookieSecure = false;
   ```

3. **Sanitize logs in production**
   ```typescript
   // Good: Development-only logging
   if (process.env.NODE_ENV === 'development') {
     console.log('Debug info:', data);
   }
   
   // Bad: Always logging sensitive data
   console.log('User data:', sensitiveData);
   ```

### Code Review Checklist
- [ ] No secrets in code or configuration files
- [ ] Proper error handling without information leakage
- [ ] Authentication and authorization properly implemented
- [ ] Input validation and sanitization
- [ ] Secure communication (HTTPS)

---

## 📋 Security Testing

### Manual Testing
1. **Authentication Flow**
   - Test login/logout functionality
   - Verify session expiration
   - Test rate limiting

2. **Authorization**
   - Verify role-based access control
   - Test privilege escalation prevention
   - Check organization isolation

3. **Session Management**
   - Test session invalidation
   - Verify secure cookie settings
   - Test concurrent session handling

### Automated Testing
```typescript
// Example security test
describe('Authentication Security', () => {
  it('should reject expired tokens', async () => {
    const expiredToken = generateExpiredToken();
    const response = await request(app)
      .post('/api/auth/firebase-login')
      .send({ idToken: expiredToken });
    
    expect(response.status).toBe(401);
    expect(response.body.message).not.toContain('expired'); // No info leakage
  });
  
  it('should rate limit authentication attempts', async () => {
    // Make 6 failed attempts
    for (let i = 0; i < 6; i++) {
      await request(app)
        .post('/api/auth/firebase-login')
        .send({ idToken: 'invalid' });
    }
    
    const response = await request(app)
      .post('/api/auth/firebase-login')
      .send({ idToken: 'invalid' });
    
    expect(response.status).toBe(429); // Too Many Requests
  });
});
```

---

## 📞 Support & Resources

### Documentation
- [Firebase Security Rules](https://firebase.google.com/docs/rules)
- [Express Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)

### Tools
- [Firebase Security Scanner](https://firebase.google.com/docs/rules/rules-and-auth)
- [Snyk Security Scanner](https://snyk.io/)
- [OWASP ZAP](https://www.zaproxy.org/)

### Training
- [Firebase Security Course](https://firebase.google.com/learn)
- [Web Security Academy](https://portswigger.net/web-security)
- [OWASP WebGoat](https://owasp.org/www-project-webgoat/)

---

**Document Version**: 1.0  
**Last Updated**: October 21, 2025  
**Next Review**: January 21, 2026  
**Classification**: CONFIDENTIAL - Internal Security Documentation

*This document contains sensitive security information and should be treated as confidential. Access should be limited to authorized personnel only.*