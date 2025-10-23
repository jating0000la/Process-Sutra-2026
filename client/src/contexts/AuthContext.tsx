import { createContext, useContext, useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import { auth, handleRedirectResult, onAuthStateChange } from '@/lib/firebase';

interface DatabaseUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  isSuperAdmin?: boolean;
  profileImageUrl?: string;
  organizationId?: string;
}

interface AuthContextType {
  user: User | null;
  dbUser: DatabaseUser | null;
  loading: boolean;
  error: string | null;
  isRefreshing: boolean;
  login: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [dbUser, setDbUser] = useState<DatabaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const syncUserWithBackend = async (firebaseUser: any, retryCount = 0): Promise<void> => {
    try {
      if (process.env.NODE_ENV === 'development') {
        console.log('Syncing user with backend for:', firebaseUser.email);
      }
      const idToken = await firebaseUser.getIdToken(true); // Force refresh
      
      const response = await fetch('/api/auth/firebase-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL,
          idToken: idToken,
        }),
      });
      
      if (response.ok) {
        if (process.env.NODE_ENV === 'development') {
          console.log('Successfully authenticated with backend');
        }
        const data = await response.json();
        // SECURITY: Don't log sensitive backend response data
        
        // Clear any previous errors
        setError(null);
        
        // Store database user info
        if (data.user) {
          setDbUser(data.user);
        }
      } else {
        let errorData: any = {};
        try { errorData = await response.json(); } catch { /* ignore parse errors */ }
        
        // Handle different types of errors
        if (response.status === 429) {
          // Rate limited - stop retrying and show appropriate message
          console.log('🚫 Rate limited, stopping retry attempts');
          setError('Too many login attempts. Please wait a few minutes and try again.');
          setIsRefreshing(false);
          return;
        }
        
        // Handle token-related errors with retry logic
        if ((response.status === 401 || errorData.message?.includes('token')) && retryCount < 2) {
          console.log(`🔄 Token expired, attempting refresh (attempt ${retryCount + 1})...`);
          setIsRefreshing(true);
          setError('Refreshing session...');
          // Wait longer between retries to avoid hitting rate limits
          await new Promise(resolve => setTimeout(resolve, 3000 * (retryCount + 1)));
          await syncUserWithBackend(firebaseUser, retryCount + 1);
          setIsRefreshing(false);
          return;
        }
        
        console.error('Backend authentication failed:', errorData);
        
        // Only clear user state if this is not a temporary token issue
        if (response.status !== 401 || retryCount >= 2) {
          setError(errorData.message || 'Authentication failed. Please try again.');
          setUser(null);
          setDbUser(null);
        } else {
          // For token issues, don't clear the user state immediately
          setError('Session expired. Trying to refresh...');
        }
        setIsRefreshing(false);
      }
    } catch (error) {
      console.error('Error syncing user with backend:', error);
      
        // Retry logic for network errors
        if (retryCount < 2) {
          console.log(`Network error, retrying authentication (attempt ${retryCount + 1})...`);
          await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
          await syncUserWithBackend(firebaseUser, retryCount + 1);
          return;
        }      setError('Authentication error. Please try again.');
      setUser(null);
      setDbUser(null);
    }
  };

  useEffect(() => {
    let tokenRefreshInterval: NodeJS.Timeout;
    
    // Handle redirect result on app load
    const handleRedirect = async () => {
      try {
        console.log('Checking for redirect result...');
        const result = await handleRedirectResult();
        if (result?.user) {
          console.log('✅ Redirect result found for user:', result.user.email);
          await syncUserWithBackend(result.user);
          setUser(result.user);
          setLoading(false);
          return true; // Successfully handled redirect
        } else {
          console.log('No redirect result found');
        }
      } catch (error) {
        console.error('❌ Error handling redirect:', error);
      }
      return false; // No redirect handled
    };

    // Set up automatic token refresh for authenticated users
    const setupTokenRefresh = (firebaseUser: any) => {
      // Clear any existing interval
      if (tokenRefreshInterval) {
        clearInterval(tokenRefreshInterval);
      }
      
      // Refresh token every 50 minutes (Firebase tokens expire after 1 hour)
      // Reduced frequency to prevent rate limiting issues
      tokenRefreshInterval = setInterval(async () => {
        try {
          if (firebaseUser && auth.currentUser && !isRefreshing) {
            console.log('🔄 Proactive token refresh (50min interval)...');
            setIsRefreshing(true);
            await syncUserWithBackend(firebaseUser);
            setIsRefreshing(false);
          }
        } catch (error) {
          console.error('❌ Proactive token refresh failed:', error);
          setIsRefreshing(false);
        }
      }, 50 * 60 * 1000); // 50 minutes
    };

    // Listen for auth state changes
    const unsubscribe = onAuthStateChange(async (firebaseUser) => {
      if (process.env.NODE_ENV === 'development') {
        console.log('🔄 Auth state changed:', firebaseUser?.email ? 'user signed in' : 'signed out');
      }
      
      if (firebaseUser) {
        if (process.env.NODE_ENV === 'development') {
          console.log('✅ User authenticated');
        }
        await syncUserWithBackend(firebaseUser);
        setUser(firebaseUser);
        
        // Set up token refresh for this user
        setupTokenRefresh(firebaseUser);
      } else {
        if (process.env.NODE_ENV === 'development') {
          console.log('❌ User signed out');
        }
        setUser(null);
        setDbUser(null);
        
        // Clear token refresh when user signs out
        if (tokenRefreshInterval) {
          clearInterval(tokenRefreshInterval);
        }
      }
      
      setLoading(false);
    });

    // Start the authentication flow
    handleRedirect().then((redirectHandled) => {
      if (!redirectHandled) {
        setLoading(false);
      }
    });

    return () => {
      unsubscribe();
      if (tokenRefreshInterval) {
        clearInterval(tokenRefreshInterval);
      }
    };
  }, []);

  const login = async () => {
    try {
      setLoading(true);
      const { signInWithGoogle } = await import('@/lib/firebase');
      const result = await signInWithGoogle();
      
      // If popup succeeded, handle the result immediately
      if (result?.user) {
        if (process.env.NODE_ENV === 'development') {
          console.log('✅ Login successful via popup');
        }
        await syncUserWithBackend(result.user);
        setUser(result.user);
        // ✅ Redirect to home after popup login
        window.location.href = "/";
      }
    } catch (error) {
      console.error('❌ Login failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      const { logOut } = await import('@/lib/firebase');
      await logOut();
      await fetch('/api/auth/logout', { method: 'POST' });
      setUser(null);
      setDbUser(null);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const value = {
    user,
    dbUser,
    loading,
    error,
    isRefreshing,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
