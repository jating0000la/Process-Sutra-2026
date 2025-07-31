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
    let isHandlingAuth = false;
    
    const syncUserWithBackend = async (firebaseUser: any) => {
      if (isHandlingAuth) return;
      isHandlingAuth = true;
      
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
        } else {
          const errorData = await response.json();
          console.error('Backend authentication failed:', errorData);
        }
      } catch (error) {
        console.error('Error syncing user with backend:', error);
      }
      
      isHandlingAuth = false;
    };

    // Handle redirect result on app load
    const handleRedirect = async () => {
      try {
        const result = await handleRedirectResult();
        if (result?.user) {
          console.log('Processing redirect result for user:', result.user.email);
          await syncUserWithBackend(result.user);
          setUser(result.user);
        }
      } catch (error) {
        console.error('Error handling redirect:', error);
      }
      setLoading(false);
    };

    // Listen for auth state changes
    const unsubscribe = onAuthStateChange(async (firebaseUser) => {
      console.log('Auth state changed:', firebaseUser?.email || 'signed out');
      
      if (firebaseUser) {
        await syncUserWithBackend(firebaseUser);
        setUser(firebaseUser);
      } else {
        setUser(null);
      }
      
      setLoading(false);
    });

    // Start the authentication flow
    handleRedirect();

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