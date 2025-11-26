import type { Express, RequestHandler, Request } from "express";
import session from "express-session";
import connectPg from "connect-pg-simple";
import rateLimit from 'express-rate-limit';
import { storage } from "./storage";
import * as dotenv from 'dotenv';
import { verifyIdToken, getAuthorizationUrl, getTokensFromCode, getUserInfo } from './services/googleOAuth';

// Load environment variables
dotenv.config();

// Helper function to extract device and location info from request
function getLoginMetadata(req: Request) {
  const userAgent = req.headers['user-agent'] || '';
  const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || 
                    (req.headers['x-real-ip'] as string) || 
                    req.ip || 
                    req.socket.remoteAddress || 
                    'unknown';
  
  // Parse user agent for device info
  const deviceInfo = {
    browserName: 'Unknown',
    browserVersion: '',
    operatingSystem: 'Unknown',
    deviceType: 'desktop' as 'desktop' | 'mobile' | 'tablet',
  };
  
  // Basic browser detection
  if (userAgent.includes('Chrome')) deviceInfo.browserName = 'Chrome';
  else if (userAgent.includes('Firefox')) deviceInfo.browserName = 'Firefox';
  else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) deviceInfo.browserName = 'Safari';
  else if (userAgent.includes('Edge')) deviceInfo.browserName = 'Edge';
  
  // Basic OS detection
  if (userAgent.includes('Windows')) deviceInfo.operatingSystem = 'Windows';
  else if (userAgent.includes('Mac OS')) deviceInfo.operatingSystem = 'macOS';
  else if (userAgent.includes('Linux')) deviceInfo.operatingSystem = 'Linux';
  else if (userAgent.includes('Android')) deviceInfo.operatingSystem = 'Android';
  else if (userAgent.includes('iOS')) deviceInfo.operatingSystem = 'iOS';
  
  // Device type detection
  if (userAgent.includes('Mobile')) deviceInfo.deviceType = 'mobile';
  else if (userAgent.includes('Tablet')) deviceInfo.deviceType = 'tablet';
  
  return {
    ipAddress,
    userAgent,
    ...deviceInfo,
  };
}

// Helper function to create login log
async function createLoginLog(userId: string, organizationId: string, req: Request, status: 'success' | 'failed' | 'suspicious', failureReason?: string) {
  try {
    const metadata = getLoginMetadata(req);
    const deviceId = req.headers['x-device-id'] as string || `${metadata.browserName}-${metadata.operatingSystem}-${Date.now()}`;
    
    await storage.createLoginLog({
      userId,
      organizationId,
      deviceId,
      deviceName: `${metadata.browserName} on ${metadata.operatingSystem}`,
      deviceType: metadata.deviceType,
      browserName: metadata.browserName,
      browserVersion: metadata.browserVersion,
      operatingSystem: metadata.operatingSystem,
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent,
      loginStatus: status,
      failureReason,
    });
    
    console.log(`📝 Login log created: ${status} - User: ${userId}, IP: ${metadata.ipAddress}`);
  } catch (error) {
    console.error('Failed to create login log:', error);
    // Don't throw - logging failure shouldn't block authentication
  }
}

// Check Google OAuth configuration
let googleAuthConfigured = false;
try {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;
  
  if (clientId && clientSecret && redirectUri) {
    googleAuthConfigured = true;
    console.log('✅ Google OAuth configured successfully');
  } else {
    console.warn('⚠️ Google OAuth credentials missing - authentication disabled');
  }
} catch (error) {
  console.error('❌ Google OAuth configuration failed:', error);
  googleAuthConfigured = false;
}

export function getSession() {
  const sessionTtl = 4 * 60 * 60 * 1000; // 4 hours (reduced from 1 week for security)
  
  // Determine environment
  const isProd = process.env.NODE_ENV === 'production';
  const isDev = process.env.NODE_ENV === 'development';
  
  // Cookie security configuration with production-first approach
  let cookieSecure: boolean;
  let sameSite: 'strict' | 'lax' | 'none';
  
  if (isProd) {
    // Production: Always enforce secure cookies
    cookieSecure = true;
    sameSite = 'strict';
    
    // Warn if trying to disable security in production
    if (process.env.COOKIE_SECURE === 'false' || process.env.INSECURE_COOKIES === 'true') {
      console.warn('⚠️ WARNING: Attempting to disable secure cookies in production - IGNORED for security');
    }
  } else {
    // Development: Allow insecure cookies for localhost testing
    cookieSecure = process.env.COOKIE_SECURE !== 'false' && process.env.INSECURE_COOKIES !== 'true';
    sameSite = (process.env.COOKIE_SAMESITE as any) || 'lax';
    
    if (!cookieSecure) {
      console.warn('⚠️ Development mode: Using insecure cookies for localhost testing');
    }
  }
  
  // Validate session secret
  if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) {
    console.error('CRITICAL: SESSION_SECRET must be at least 32 characters long for security!');
    throw new Error('SESSION_SECRET must be properly configured for security');
  }
  
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  
  return session({
    secret: process.env.SESSION_SECRET,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    rolling: true, // Refresh session on activity for better security
    cookie: {
      httpOnly: true,
      secure: cookieSecure,
      sameSite,
      maxAge: sessionTtl,
    },
  });
}

async function getOrCreateOrganization(email: string) {
  // Extract domain from email with special handling for Gmail
  const emailParts = email.split('@');
  const emailDomain = emailParts[1];
  
  let domain: string;
  let orgName: string;
  
  // For Gmail addresses, use the complete email as the domain
  if (emailDomain === 'gmail.com' || emailDomain === 'googlemail.com') {
    domain = email; // Use full email as domain for Gmail users
    orgName = emailParts[0].charAt(0).toUpperCase() + emailParts[0].slice(1); // e.g., "John" from "john@gmail.com"
  } else {
    // For other domains, use the actual domain
    domain = emailDomain;
    orgName = emailDomain.split('.')[0].charAt(0).toUpperCase() + emailDomain.split('.')[0].slice(1); // e.g., "Muxro" from "muxro.com"
  }
  
  try {
    // Check if organization exists for this domain
    let organization = await storage.getOrganizationByDomain(domain);
    
    if (!organization) {
      try {
        // Create new organization for this domain
        organization = await storage.createOrganization({
          name: orgName,
          domain: domain,
          isActive: true,
          maxUsers: 50,
          planType: 'free'
        });
        console.log(`✅ Created new organization: ${orgName} for domain: ${domain}`);
      } catch (createError: any) {
        // Handle race condition: if organization was created by another request simultaneously
        if (createError.code === '23505' && createError.constraint === 'organizations_domain_key') {
          console.log(`⚠️ Organization already exists for domain: ${domain}, fetching existing one`);
          organization = await storage.getOrganizationByDomain(domain);
          if (!organization) {
            throw new Error(`Failed to retrieve organization for domain: ${domain}`);
          }
        } else {
          throw createError;
        }
      }
    }
    
    return organization;
  } catch (error) {
    console.error("Error getting/creating organization:", error);
    throw error;
  }
}

async function upsertUser(userData: any) {
  try {
    // Normalize email to lowercase for consistent lookups
    const normalizedEmail = userData.email.toLowerCase();
    
    // Check if user already exists in database (case-insensitive)
    let existingUser = await storage.getUserByEmail(normalizedEmail);
    
    if (existingUser) {
      // Update existing user's last login and get the full updated user object
      const updatedUser = await storage.updateUser(existingUser.id, {
        lastLoginAt: new Date(),
        profileImageUrl: userData.photoURL // Update profile image if changed
      });
      // Re-fetch the user to ensure we get all fields including isSuperAdmin
      return await storage.getUser(updatedUser.id);
    }
    
    // For new users, check if there's an organization for their domain
    const organization = await getOrCreateOrganization(normalizedEmail);
    
    // Check if this is the first user of the organization (auto-admin)
    const orgUserCount = await storage.getOrganizationUserCount(organization.id);
    
    if (orgUserCount === 0) {
      // First user becomes admin automatically
      const userPayload = {
        email: normalizedEmail,
        firstName: userData.displayName ? userData.displayName.split(' ')[0] : '',
        lastName: userData.displayName ? userData.displayName.split(' ').slice(1).join(' ') : '',
        profileImageUrl: userData.photoURL,
        organizationId: organization.id,
        role: 'admin',
        status: 'active',
        lastLoginAt: new Date(),
      };
      
      console.log(`🔐 Creating admin for new organization: ${normalizedEmail} -> ${organization.name}`);
      return await storage.createUser(userPayload);
    } else {
      // For existing organizations, create user as regular user (not admin)
      // This allows migration from Firebase or new team members to join automatically
      const userPayload = {
        email: normalizedEmail,
        firstName: userData.displayName ? userData.displayName.split(' ')[0] : '',
        lastName: userData.displayName ? userData.displayName.split(' ').slice(1).join(' ') : '',
        profileImageUrl: userData.photoURL,
        organizationId: organization.id,
        role: 'user', // New users are regular users, not admins
        status: 'active',
        lastLoginAt: new Date(),
      };
      
      console.log(`🔐 Creating user for existing organization: ${normalizedEmail} -> ${organization.name}`);
      return await storage.createUser(userPayload);
    }
    
  } catch (error) {
    console.error("Error in upsertUser:", error);
    throw error;
  }
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());

  // Rate limiting for authentication endpoints - More lenient for automatic token refresh
  const authRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 25, // Increased from 5 to 25 to allow automatic token refresh
    message: {
      error: "Too many authentication attempts",
      message: "Please wait 15 minutes before trying again",
      retryAfter: 15 * 60
    },
    standardHeaders: true,
    legacyHeaders: false,
    // Skip rate limiting for successful authentications to avoid blocking legitimate users
    skipSuccessfulRequests: true,
    // Skip rate limiting if the request is from the same user (token refresh)
    skip: (req) => {
      // Allow token refresh for existing sessions
      return !!(req.session as any)?.user;
    },
  });

  // Apply rate limiting to auth endpoints
  app.use('/api/auth/google-login', authRateLimiter);
  app.use('/api/auth/google/callback', authRateLimiter);
  app.use('/api/auth/dev-login', authRateLimiter);

  // Google OAuth login - initiate
  app.get('/api/auth/google', (req, res) => {
    try {
      if (!googleAuthConfigured) {
        return res.status(503).json({ message: 'Google authentication not configured' });
      }
      
      const state = Math.random().toString(36).substring(7);
      const authUrl = getAuthorizationUrl(state);
      
      // Store state in session for CSRF protection
      (req.session as any).oauthState = state;
      
      res.redirect(authUrl);
    } catch (error) {
      console.error('Google OAuth initiation error:', error);
      res.status(500).json({ message: 'Failed to initiate Google authentication' });
    }
  });

  // Google OAuth callback
  app.get('/api/auth/google/callback', async (req, res) => {
    try {
      const { code, state, error } = req.query;
      
      if (error) {
        console.error('Google OAuth error:', error);
        return res.redirect('/?error=oauth_failed');
      }
      
      if (!code || typeof code !== 'string') {
        return res.redirect('/?error=missing_code');
      }
      
      // Verify state for CSRF protection
      const sessionState = (req.session as any).oauthState;
      if (state !== sessionState) {
        console.error('OAuth state mismatch');
        return res.redirect('/?error=invalid_state');
      }
      
      // Exchange code for tokens
      const tokens = await getTokensFromCode(code);
      
      if (!tokens.id_token) {
        return res.redirect('/?error=no_id_token');
      }
      
      // Verify ID token and get user info
      const userInfo = await verifyIdToken(tokens.id_token);
      
      // Upsert user in database
      const dbUser = await upsertUser({
        uid: userInfo.uid,
        email: userInfo.email || '',
        displayName: userInfo.displayName || '',
        photoURL: userInfo.photoURL || '',
      });

      if (!dbUser) {
        await createLoginLog('unknown', 'unknown', req, 'failed', 'User creation failed');
        return res.redirect('/?error=user_creation_failed');
      }

      // Check if user is suspended or inactive
      if (dbUser.status === 'suspended') {
        await createLoginLog(dbUser.id, (dbUser as any).organizationId, req, 'failed', 'Account suspended');
        return res.redirect('/?error=account_suspended');
      }
      
      if (dbUser.status === 'inactive') {
        await createLoginLog(dbUser.id, (dbUser as any).organizationId, req, 'failed', 'Account inactive');
        return res.redirect('/?error=account_inactive');
      }

      // Regenerate session to prevent session fixation attacks
      await new Promise<void>((resolve, reject) => {
        req.session.regenerate((err) => {
          if (err) {
            console.error('Session regeneration failed:', err);
            reject(err);
          } else {
            resolve();
          }
        });
      });

      // Create session with new session ID
      (req.session as any).user = {
        id: dbUser.id,
        email: dbUser.email,
        claims: { sub: dbUser.id, email: dbUser.email },
      };

      // Save session before redirecting
      await new Promise<void>((resolve, reject) => {
        req.session.save((err) => {
          if (err) {
            console.error('Session save failed:', err);
            reject(err);
          } else {
            resolve();
          }
        });
      });

      // Log successful login
      await createLoginLog(dbUser.id, (dbUser as any).organizationId, req, 'success');

      console.log('🔐 User logged in via Google OAuth:', {
        email: dbUser.email,
        role: dbUser.role,
        isSuperAdmin: dbUser.isSuperAdmin
      });

      // Redirect to main screen
      res.redirect('/');

    } catch (error) {
      console.error('Google OAuth callback error:', error);
      res.redirect('/?error=authentication_failed');
    }
  });

  // Google token login endpoint (for client-side authentication)
  app.post('/api/auth/google-login', async (req, res) => {
    try {
      const { idToken, accessToken, email, displayName, photoURL } = req.body;

      // Development bypass when Google OAuth is not available
      // SECURITY WARNING: This bypass should NEVER be enabled in production
      if (process.env.NODE_ENV === 'development' && !googleAuthConfigured) {
        console.warn('⚠️ SECURITY WARNING: Using development authentication bypass');
        console.warn('⚠️ This should NEVER be enabled in production environments');
        
        // Additional safety check - respect DISABLE_DEV_AUTH flag
        if (process.env.DISABLE_DEV_AUTH === 'true') {
          return res.status(503).json({ 
            message: 'Development authentication disabled',
            error: 'Set DISABLE_DEV_AUTH=false to enable development authentication'
          });
        }
        const userEmail = email || 'dev@test.com';
        const userName = displayName || 'Dev User';
        
        const organization = await getOrCreateOrganization(userEmail);
        let dbUser = await storage.getUserByEmail(userEmail);
        
        if (!dbUser) {
          const orgUserCount = await storage.getOrganizationUserCount(organization.id);
          dbUser = await storage.createUser({
            email: userEmail,
            firstName: userName.split(' ')[0] || 'Dev',
            lastName: userName.split(' ')[1] || 'User',
            organizationId: organization.id,
            role: orgUserCount === 0 ? 'admin' : 'user',
            status: 'active',
            lastLoginAt: new Date(),
          });
        }

        // Regenerate session to prevent session fixation attacks
        await new Promise<void>((resolve, reject) => {
          req.session.regenerate((err) => {
            if (err) {
              console.error('Session regeneration failed:', err);
              reject(err);
            } else {
              resolve();
            }
          });
        });

        (req.session as any).user = {
          id: dbUser.id,
          email: dbUser.email,
          claims: { sub: dbUser.id, email: dbUser.email },
        };

        // Save session
        await new Promise<void>((resolve, reject) => {
          req.session.save((err) => {
            if (err) {
              console.error('Session save failed:', err);
              reject(err);
            } else {
              resolve();
            }
          });
        });

        return res.json({ 
          success: true, 
          user: {
            id: dbUser.id,
            email: dbUser.email,
            firstName: dbUser.firstName,
            lastName: dbUser.lastName,
            role: dbUser.role,
            isSuperAdmin: dbUser.isSuperAdmin,
            organizationId: (dbUser as any).organizationId,
          }
        });
      }

      if (!idToken && !accessToken) {
        return res.status(400).json({ message: 'ID token or access token required' });
      }

      // Verify the Google token
      if (!googleAuthConfigured) {
        return res.status(503).json({ message: 'Google authentication not available' });
      }
      
      let userInfo;
      try {
        if (idToken) {
          userInfo = await verifyIdToken(idToken);
        } else if (accessToken) {
          userInfo = await getUserInfo(accessToken);
        } else {
          return res.status(400).json({ message: 'No valid token provided' });
        }
        
        console.log('Token verified for user:', userInfo.email);
      } catch (tokenError) {
        console.error('Token verification failed:', tokenError instanceof Error ? tokenError.message : 'Unknown error');
        
        const isTokenExpired = tokenError instanceof Error && tokenError.message.includes('expired');
        const errorMessage = isTokenExpired ? 'Token expired, please login again' : 'Invalid or expired token';
        
        return res.status(401).json({ message: errorMessage });
      }

      // Upsert user in database and get the database user
      const dbUser = await upsertUser({
        uid: userInfo.uid,
        email: userInfo.email || email,
        displayName: displayName,
        photoURL: photoURL,
      });

      if (!dbUser) {
        await createLoginLog('unknown', 'unknown', req, 'failed', 'Failed to create or fetch user');
        return res.status(500).json({ message: 'Failed to create or fetch user' });
      }

      // Check if user is suspended or inactive before creating session
      if (dbUser.status === 'suspended') {
        await createLoginLog(dbUser.id, (dbUser as any).organizationId, req, 'failed', 'Account suspended');
        return res.status(403).json({ 
          success: false, 
          message: "Account suspended. Contact administrator." 
        });
      }
      
      if (dbUser.status === 'inactive') {
        await createLoginLog(dbUser.id, (dbUser as any).organizationId, req, 'failed', 'Account inactive');
        return res.status(403).json({ 
          success: false, 
          message: "Account inactive. Contact administrator." 
        });
      }

      // Regenerate session to prevent session fixation attacks
      await new Promise<void>((resolve, reject) => {
        req.session.regenerate((err) => {
          if (err) {
            console.error('Session regeneration failed:', err);
            reject(err);
          } else {
            resolve();
          }
        });
      });

      // Create session with database user ID and new session ID
      (req.session as any).user = {
        id: dbUser.id, // Use database ID, not Google UID
        email: dbUser.email,
        claims: { sub: userInfo.uid, email: dbUser.email },
      };

      // Save session
      await new Promise<void>((resolve, reject) => {
        req.session.save((err) => {
          if (err) {
            console.error('Session save failed:', err);
            reject(err);
          } else {
            resolve();
          }
        });
      });

      // Log successful login
      await createLoginLog(dbUser.id, (dbUser as any).organizationId, req, 'success');

      console.log('🔐 User logged in:', {
        email: dbUser.email,
        role: dbUser.role,
        isSuperAdmin: dbUser.isSuperAdmin
      });

      res.json({ 
        success: true, 
        user: {
          id: dbUser.id,
          email: dbUser.email,
          firstName: dbUser.firstName,
          lastName: dbUser.lastName,
          profileImageUrl: dbUser.profileImageUrl,
          role: dbUser.role,
          isSuperAdmin: dbUser.isSuperAdmin,
          organizationId: (dbUser as any).organizationId,
        }
      });

    } catch (error) {
      console.error('Google auth error:', error);
      
      // Attempt to log failed login if we have user info
      try {
        const errorMessage = error instanceof Error ? error.message : 'Authentication failed';
        // If we can extract email from the request body, log it
        if (req.body.email) {
          const user = await storage.getUserByEmail(req.body.email.toLowerCase());
          if (user) {
            await createLoginLog(user.id, (user as any).organizationId, req, 'failed', errorMessage);
          }
        }
      } catch (logError) {
        console.error('Failed to log authentication error:', logError);
      }
      
      res.status(401).json({ message: 'Authentication failed' });
    }
  });

  // Get current user with status check
  app.get('/api/auth/user', isAuthenticated, async (req, res) => {
    try {
      const userId = (req.session as any)?.user?.id;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Check if user is suspended or inactive
      if (user.status === 'suspended') {
        return res.status(403).json({ message: "Account suspended. Contact administrator." });
      }
      
      if (user.status === 'inactive') {
        return res.status(403).json({ message: "Account inactive. Contact administrator." });
      }
      
      res.json(user);
    } catch (error) {
      console.error('Error fetching user:', error);
      res.status(500).json({ message: 'Failed to fetch user' });
    }
  });

  // Login route - return auth status
  app.get('/api/login', (req, res) => {
    res.json({ message: 'Authentication required', status: 'auth_required' });
  });

  // Serve dev login page
  if (process.env.NODE_ENV === 'development') {
    app.get('/dev-login', (req, res) => {
      res.sendFile('/Users/divyansh/Desktop/PRS/Process-Sutra-2026/dev-login.html');
    });
  }

  // Development login bypass (only in development)
  if (process.env.NODE_ENV === 'development') {
    console.warn('⚠️ SECURITY WARNING: Development login bypass is enabled');
    
    app.post('/api/auth/dev-login', async (req, res) => {
      try {
        console.warn('⚠️ Development authentication bypass used');
        
        // Respect DISABLE_DEV_AUTH flag
        if (process.env.DISABLE_DEV_AUTH === 'true') {
          return res.status(503).json({ 
            message: 'Development authentication disabled',
            error: 'Set DISABLE_DEV_AUTH=false to enable development authentication'
          });
        }
        const { email } = req.body;
        
        if (!email) {
          return res.status(400).json({ message: 'Email required for dev login' });
        }

        // Get or create organization and user for development
        const organization = await getOrCreateOrganization(email);
        
        let dbUser = await storage.getUserByEmail(email);
        
        if (!dbUser) {
          // Create new user for development
          const orgUserCount = await storage.getOrganizationUserCount(organization.id);
          const role = orgUserCount === 0 ? 'admin' : 'user';
          
          dbUser = await storage.createUser({
            email: email,
            firstName: email.split('@')[0],
            lastName: 'Dev',
            organizationId: organization.id,
            role: role,
            status: 'active',
            lastLoginAt: new Date(),
          });
        }

        // Regenerate session to prevent session fixation attacks
        await new Promise<void>((resolve, reject) => {
          req.session.regenerate((err) => {
            if (err) {
              console.error('Session regeneration failed:', err);
              reject(err);
            } else {
              resolve();
            }
          });
        });

        // Create session with new session ID
        (req.session as any).user = {
          id: dbUser.id,
          email: dbUser.email,
          claims: { sub: dbUser.id, email: dbUser.email },
        };

        // Save session
        await new Promise<void>((resolve, reject) => {
          req.session.save((err) => {
            if (err) {
              console.error('Session save failed:', err);
              reject(err);
            } else {
              resolve();
            }
          });
        });

        res.json({ 
          success: true, 
          user: {
            id: dbUser.id,
            email: dbUser.email,
            firstName: dbUser.firstName,
            lastName: dbUser.lastName,
            role: dbUser.role,
            organizationId: (dbUser as any).organizationId,
          }
        });

      } catch (error) {
        console.error('Dev auth error:', error);
        res.status(500).json({ message: 'Development authentication failed' });
      }
    });
  }

  // Logout
  app.post('/api/auth/logout', async (req, res) => {
    const sessionUser = (req.session as any)?.user;
    
    // Update logout time in login log before destroying session
    if (sessionUser?.id) {
      try {
        // Get the most recent login log for this user
        const loginLogs = await storage.getLoginLogs(sessionUser.id);
        if (loginLogs.length > 0 && !loginLogs[0].logoutTime && loginLogs[0].loginTime) {
          const loginTime = new Date(loginLogs[0].loginTime);
          const logoutTime = new Date();
          const sessionDuration = Math.floor((logoutTime.getTime() - loginTime.getTime()) / 60000); // in minutes
          
          await storage.updateLoginLog(loginLogs[0].id, {
            logoutTime,
            sessionDuration,
          });
          
          console.log(`📝 Logout logged: User ${sessionUser.email}, Session duration: ${sessionDuration} minutes`);
        }
      } catch (error) {
        console.error('Failed to update logout time:', error);
        // Don't block logout on logging failure
      }
    }
    
    req.session.destroy((err) => {
      if (err) {
        console.error('Session destroy error:', err);
        return res.status(500).json({ message: 'Logout failed' });
      }
      res.clearCookie('connect.sid');
      res.json({ success: true });
    });
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const user = (req.session as any)?.user;

  if (!user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  // Attach user to request object
  (req as any).user = user;

  return next();
};