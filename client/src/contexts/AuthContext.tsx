import { createContext, useContext, useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import { auth, handleRedirectResult, onAuthStateChange } from '@/lib/firebase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let handled = false;
    
    // Handle redirect result on app load
    const handleRedirect = async () => {
      try {
        const result = await handleRedirectResult();
        if (result?.user && !handled) {
          handled = true;
          console.log('Processing redirect result for user:', result.user.email);
          // Send user data to backend for session creation
          const response = await fetch('/api/auth/firebase-login', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              uid: result.user.uid,
              email: result.user.email,
              displayName: result.user.displayName,
              photoURL: result.user.photoURL,
              idToken: await result.user.getIdToken(),
            }),
          });
          
          if (response.ok) {
            console.log('Successfully authenticated with backend');
            setUser(result.user);
          } else {
            console.error('Backend authentication failed');
          }
          setLoading(false);
        }
      } catch (error) {
        console.error('Error handling redirect:', error);
        setLoading(false);
      }
    };

    // Listen for auth state changes
    const unsubscribe = onAuthStateChange(async (firebaseUser) => {
      console.log('Auth state changed:', firebaseUser?.email || 'signed out');
      
      if (firebaseUser && !handled) {
        // Send user data to backend
        try {
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
              idToken: await firebaseUser.getIdToken(),
            }),
          });
          
          if (response.ok) {
            console.log('User synced with backend successfully');
          }
        } catch (error) {
          console.error('Error syncing user with backend:', error);
        }
      }
      
      setUser(firebaseUser);
      if (!handled) {
        setLoading(false);
      }
    });

    // Handle redirect first, then start listening to auth changes
    handleRedirect().then(() => {
      if (!handled) {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const login = async () => {
    const { signInWithGoogle } = await import('@/lib/firebase');
    await signInWithGoogle();
  };

  const logout = async () => {
    try {
      const { logOut } = await import('@/lib/firebase');
      await logOut();
      await fetch('/api/auth/logout', { method: 'POST' });
      setUser(null);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const value = {
    user,
    loading,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};