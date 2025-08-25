import { createContext, useContext, useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import { auth, handleRedirectResult, onAuthStateChange } from '@/lib/firebase';

interface DatabaseUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  profileImageUrl?: string;
  organizationId?: string;
}

interface AuthContextType {
  user: User | null;
  dbUser: DatabaseUser | null;
  loading: boolean;
  error: string | null;
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
  
  const syncUserWithBackend = async (firebaseUser: any) => {
    try {
      console.log('Syncing user with backend:', firebaseUser.email);
      const idToken = await firebaseUser.getIdToken(true); // Force refresh
      
      const response = await fetch('/api/auth/firebase-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL,
          idToken: idToken,
        }),
      });
      
      if (response.ok) {
        console.log('Successfully authenticated with backend');
        const data = await response.json();
        console.log('Backend response:', data);
        
        // Clear any previous errors
        setError(null);
        
        // Store database user info
        if (data.user) {
          setDbUser(data.user);
        }
      } else {
        const errorData = await response.json();
        console.error('Backend authentication failed:', errorData);
        setError(errorData.message || 'Authentication failed. Please try again.');
        // Don't set user if backend authentication fails
        setUser(null);
        setDbUser(null);
      }
    } catch (error) {
      console.error('Error syncing user with backend:', error);
      setError('Authentication error. Please try again.');
      setUser(null);
      setDbUser(null);
    }
  };

  useEffect(() => {
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

    // Listen for auth state changes
    const unsubscribe = onAuthStateChange(async (firebaseUser) => {
      console.log('🔄 Auth state changed:', firebaseUser?.email || 'signed out');
      
      if (firebaseUser) {
        console.log('✅ User authenticated:', firebaseUser.email);
        await syncUserWithBackend(firebaseUser);
        setUser(firebaseUser);
      } else {
        console.log('❌ User signed out');
        setUser(null);
        setDbUser(null);
      }
      
      setLoading(false);
    });

    // Start the authentication flow
    handleRedirect().then((redirectHandled) => {
      if (!redirectHandled) {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const login = async () => {
    try {
      setLoading(true);
      const { signInWithGoogle } = await import('@/lib/firebase');
      const result = await signInWithGoogle();
      
      // If popup succeeded, handle the result immediately
      if (result?.user) {
        console.log('✅ Login successful via popup:', result.user.email);
        await syncUserWithBackend(result.user);
        setUser(result.user);
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
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};