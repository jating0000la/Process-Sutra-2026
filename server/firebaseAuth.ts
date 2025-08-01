import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import type { Express, RequestHandler } from "express";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";

// Initialize Firebase Admin (only once)
if (!getApps().length) {
  // For production, you would use a service account key
  // For now, we'll use the client config for simplicity
  initializeApp({
    projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  });
}

const adminAuth = getAuth();

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
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
      secure: process.env.NODE_ENV === 'production',
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
      // Create new organization for this domain
      organization = await storage.createOrganization({
        name: orgName,
        domain: domain,
        isActive: true,
        maxUsers: 50,
        planType: 'free'
      });
      console.log(`✅ Created new organization: ${orgName} for domain: ${domain}`);
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