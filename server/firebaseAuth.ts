import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import type { Express, RequestHandler } from "express";
import session from "express-session";
import connectPg from "connect-pg-simple";
import rateLimit from 'express-rate-limit';
import { storage } from "./storage";
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Initialize Firebase Admin (only once)
let firebaseInitialized = false;
if (!getApps().length) {
  try {
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
    const projectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    
    if (projectId && clientEmail && privateKey) {
      initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey
        }),
      });
      firebaseInitialized = true;
      console.log('✅ Firebase Admin initialized successfully');
    } else if (projectId) {
      initializeApp({ projectId });
      firebaseInitialized = true;
      console.log('✅ Firebase Admin initialized with project ID only');
    } else {
      console.warn('⚠️ Firebase credentials missing - authentication disabled');
    }
  } catch (error) {
    console.error('❌ Firebase initialization failed:', error);
    firebaseInitialized = false;
  }
}

let adminAuth: any = null;

// Initialize adminAuth after Firebase app is initialized
if (firebaseInitialized && getApps().length > 0) {
  try {
    adminAuth = getAuth();
    console.log('✅ Firebase Auth ready');
  } catch (error) {
    console.warn('⚠️ Firebase Auth failed:', error);
    adminAuth = null;
  }
}

export function getSession() {
  const sessionTtl = 4 * 60 * 60 * 1000; // 4 hours (reduced from 1 week for security)
  // Determine cookie security flags. In production, always use secure cookies
  // Allow overriding only in development for local testing
  const isProd = process.env.NODE_ENV === 'production';
  const isDev = process.env.NODE_ENV === 'development';
  
  // Force secure cookies in production, allow override only in development
  const forceInsecure = isDev && (process.env.INSECURE_COOKIES === 'true' || process.env.COOKIE_SECURE === 'false');
  const cookieSecure = isProd || !forceInsecure;
  
  // Use strict SameSite in production for better CSRF protection
  const sameSite: any = isProd ? 'strict' : (process.env.COOKIE_SAMESITE || 'lax');
  
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
    // Check if user already exists in database
    let existingUser = await storage.getUserByEmail(userData.email);
    
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
    const organization = await getOrCreateOrganization(userData.email);
    
    // Check if this is the first user of the organization (auto-admin)
    const orgUserCount = await storage.getOrganizationUserCount(organization.id);
    
    if (orgUserCount === 0) {
      // First user becomes admin automatically
      const userPayload = {
        email: userData.email,
        firstName: userData.displayName ? userData.displayName.split(' ')[0] : '',
        lastName: userData.displayName ? userData.displayName.split(' ').slice(1).join(' ') : '',
        profileImageUrl: userData.photoURL,
        organizationId: organization.id,
        role: 'admin',
        status: 'active',
        lastLoginAt: new Date(),
      };
      
      console.log(`🔐 Creating admin for new organization: ${userData.email} -> ${organization.name}`);
      return await storage.createUser(userPayload);
    } else {
      // Not first user and not pre-added by admin - reject login
      throw new Error('User not authorized. Contact your organization admin to be added to the system.');
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
  app.use('/api/auth/firebase-login', authRateLimiter);
  app.use('/api/auth/dev-login', authRateLimiter);

  // Firebase login endpoint
  app.post('/api/auth/firebase-login', async (req, res) => {
    try {
      const { idToken, uid, email, displayName, photoURL } = req.body;

      // Development bypass when Firebase is not available
      // SECURITY WARNING: This bypass should NEVER be enabled in production
      if (process.env.NODE_ENV === 'development' && !adminAuth) {
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

        (req.session as any).user = {
          id: dbUser.id,
          email: dbUser.email,
          claims: { sub: dbUser.id, email: dbUser.email },
        };

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

      if (!idToken) {
        return res.status(400).json({ message: 'ID token required' });
      }

      // Verify the Firebase ID token with enhanced validation
      if (!adminAuth) {
        return res.status(503).json({ message: 'Firebase authentication not available' });
      }
      
      let decodedToken;
      try {
        // Enhanced token validation with audience and issuer checks
        const projectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID;
        if (!projectId) {
          throw new Error('Firebase project ID not configured');
        }
        
        decodedToken = await adminAuth.verifyIdToken(idToken, true); // checkRevoked = true
        
        // Additional security validations
        if (decodedToken.aud !== projectId) {
          throw new Error('Token audience mismatch');
        }
        
        if (decodedToken.iss !== `https://securetoken.google.com/${projectId}`) {
          throw new Error('Token issuer mismatch');
        }
        
        // Firebase tokens are automatically validated for expiration by verifyIdToken
        // No need for additional age validation as Firebase handles this internally
        // Log token info for debugging
        console.log(`Token verified for user: ${decodedToken.email}, issued: ${new Date(decodedToken.iat * 1000).toISOString()}`);
        
        console.log('Token verified for user:', decodedToken.email);
      } catch (tokenError) {
        console.error('Token verification failed:', tokenError instanceof Error ? tokenError.message : 'Unknown error');
        
        // Don't expose detailed error information to prevent information leakage
        const isTokenExpired = tokenError instanceof Error && tokenError.message.includes('expired');
        const errorMessage = isTokenExpired ? 'Token expired, please login again' : 'Invalid or expired token';
        
        return res.status(401).json({ message: errorMessage });
      }
      
      if (decodedToken.uid !== uid) {
        console.log('UID mismatch:', decodedToken.uid, 'vs', uid);
        return res.status(401).json({ message: 'Token UID mismatch' });
      }

      // Upsert user in database and get the database user
      const dbUser = await upsertUser({
        uid: decodedToken.uid,
        email: decodedToken.email || email,
        displayName: displayName,
        photoURL: photoURL,
      });

      if (!dbUser) {
        return res.status(500).json({ message: 'Failed to create or fetch user' });
      }

      // Check if user is suspended or inactive before creating session
      if (dbUser.status === 'suspended') {
        return res.status(403).json({ 
          success: false, 
          message: "Account suspended. Contact administrator." 
        });
      }
      
      if (dbUser.status === 'inactive') {
        return res.status(403).json({ 
          success: false, 
          message: "Account inactive. Contact administrator." 
        });
      }

      // Create session with database user ID
      (req.session as any).user = {
        id: dbUser.id, // Use database ID, not Firebase UID
        email: dbUser.email,
        claims: decodedToken,
      };

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
      console.error('Firebase auth error:', error);
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

        // Create session
        (req.session as any).user = {
          id: dbUser.id,
          email: dbUser.email,
          claims: { sub: dbUser.id, email: dbUser.email },
        };

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
  app.post('/api/auth/logout', (req, res) => {
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