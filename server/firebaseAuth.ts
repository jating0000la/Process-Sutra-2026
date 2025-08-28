import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import type { Express, RequestHandler } from "express";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";

// Initialize Firebase Admin (only once)
if (!getApps().length) {
  try {
    // For production, you would use a service account key
    // For local development, we'll use the service account credentials from .env
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
    const projectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    
    // Check if we have all required Firebase credentials
    if (projectId && clientEmail && privateKey) {
      initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey
        }),
      });
      console.log('Firebase Admin initialized with service account credentials');
    } else {
      // If we're missing any credentials, initialize with just the project ID
      if (projectId) {
        initializeApp({
          projectId,
        });
        console.log('Firebase Admin initialized with project ID only');
      } else {
        console.warn('Firebase credentials are missing. Some authentication features may not work.');
        // Initialize with the project ID from the frontend config for development
        if (process.env.NODE_ENV === 'development') {
          const fallbackProjectId = 'taskflowpro-c62c1'; // Hardcoded fallback from .env
          initializeApp({
            projectId: fallbackProjectId,
          });
          console.log(`Firebase Admin initialized with fallback project ID: ${fallbackProjectId}`);
        }
      }
    }
  } catch (error) {
    console.error('Error initializing Firebase Admin:', error);
    // In development mode, continue without Firebase
    if (process.env.NODE_ENV === 'development') {
      console.warn('Continuing without Firebase Admin in development mode');
    }
  }
}

const adminAuth = getAuth();

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  // Determine cookie security flags. In production on plain HTTP (no TLS),
  // "secure" cookies won't be set/sent by the browser which causes 401s on /api/auth/user.
  // Allow overriding via env when running behind an IP or without HTTPS.
  const isProd = process.env.NODE_ENV === 'production';
  const forceInsecure = process.env.INSECURE_COOKIES === 'true' || process.env.COOKIE_SECURE === 'false';
  const cookieSecure = isProd && !forceInsecure; // default secure in prod unless explicitly disabled
  const sameSite: any = process.env.COOKIE_SAMESITE || 'lax';
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
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
      // Update existing user's last login
      return await storage.updateUser(existingUser.id, {
        lastLoginAt: new Date(),
        profileImageUrl: userData.photoURL // Update profile image if changed
      });
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

  // Firebase login endpoint
  app.post('/api/auth/firebase-login', async (req, res) => {
    try {
      const { idToken, uid, email, displayName, photoURL } = req.body;

      if (!idToken) {
        return res.status(400).json({ message: 'ID token required' });
      }

      // Verify the Firebase ID token
      let decodedToken;
      try {
        decodedToken = await adminAuth.verifyIdToken(idToken);
        console.log('Token verified for user:', decodedToken.email);
      } catch (tokenError) {
        console.error('Token verification failed:', tokenError);
        return res.status(401).json({ message: 'Invalid or expired token' });
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

      res.json({ 
        success: true, 
        user: {
          id: dbUser.id,
          email: dbUser.email,
          firstName: dbUser.firstName,
          lastName: dbUser.lastName,
          profileImageUrl: dbUser.profileImageUrl,
          role: dbUser.role,
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