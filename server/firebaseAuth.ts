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

async function upsertUser(userData: any) {
  try {
    await storage.upsertUser({
      id: userData.uid,
      email: userData.email,
      firstName: userData.displayName ? userData.displayName.split(' ')[0] : '',
      lastName: userData.displayName ? userData.displayName.split(' ').slice(1).join(' ') : '',
      profileImageUrl: userData.photoURL,
    });
  } catch (error) {
    console.error("Error upserting user:", error);
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

      // Upsert user in database
      await upsertUser({
        uid: decodedToken.uid,
        email: decodedToken.email || email,
        displayName: displayName,
        photoURL: photoURL,
      });

      // Create session
      (req.session as any).user = {
        id: decodedToken.uid,
        email: decodedToken.email || email,
        claims: decodedToken,
      };

      res.json({ 
        success: true, 
        user: {
          id: decodedToken.uid,
          email: decodedToken.email || email,
          firstName: displayName ? displayName.split(' ')[0] : '',
          lastName: displayName ? displayName.split(' ').slice(1).join(' ') : '',
          profileImageUrl: photoURL,
        }
      });

    } catch (error) {
      console.error('Firebase auth error:', error);
      res.status(401).json({ message: 'Authentication failed' });
    }
  });

  // Get current user
  app.get('/api/auth/user', (req, res) => {
    const user = (req.session as any)?.user;
    if (!user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    res.json(user);
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

  return next();
};