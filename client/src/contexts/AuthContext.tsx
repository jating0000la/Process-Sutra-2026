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
    // Handle redirect result on app load
    const handleRedirect = async () => {
      try {
        const result = await handleRedirectResult();
        if (result?.user) {
          // Send user data to backend for session creation
          await fetch('/api/auth/firebase-login', {
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
        }
      } catch (error) {
        console.error('Error handling redirect:', error);
      }
    };

    handleRedirect();

    // Listen for auth state changes
    const unsubscribe = onAuthStateChange(async (firebaseUser) => {
      if (firebaseUser) {
        // Send user data to backend
        try {
          await fetch('/api/auth/firebase-login', {
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
        } catch (error) {
          console.error('Error syncing user with backend:', error);
        }
      }
      setUser(firebaseUser);
      setLoading(false);
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