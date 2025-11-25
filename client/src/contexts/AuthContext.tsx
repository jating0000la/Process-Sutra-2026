import { createContext, useContext, useEffect, useState } from 'react';
import { initializeGoogleSignIn, signInWithGoogle, signOut as googleSignOut, decodeJWT } from '@/lib/googleAuth';
import { useToast } from '@/hooks/use-toast';
import { queryClient } from '@/lib/queryClient';
import { devLog, devError, authLog } from '@/lib/logger';

interface GoogleUser {
  sub: string;
  email: string;
  name: string;
  picture?: string;
  email_verified?: boolean;
  uid?: string; // Alias for sub
  id?: string; // Alias for sub
  displayName?: string; // Alias for name
}

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
  user: GoogleUser | null;
  dbUser: DatabaseUser | null;
  loading: boolean;
  error: string | null;
  isRefreshing: boolean;
  isLoggingOut: boolean;
  login: () => void;
  logout: (redirect?: boolean) => Promise<void>;
  handleTokenExpired: () => void;
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
  const [user, setUser] = useState<GoogleUser | null>(null);
  const [dbUser, setDbUser] = useState<DatabaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const { toast } = useToast();

  const handleTokenExpired = async () => {
    console.log('🔐 Token expired, clearing authentication state...');
    
    // Show user-friendly message
    toast({
      title: "Session Expired",
      description: "Your session has expired. Please log in again.",
      variant: "destructive",
      duration: 3000,
    });

    // Clear authentication state
    setUser(null);
    setDbUser(null);
    setError(null);
    setIsRefreshing(false);

    // Clear React Query cache
    queryClient.clear();

    // Clear Google auth state
    try {
      if (user?.email) {
        googleSignOut(user.email);
      }
    } catch (error) {
      console.error('Error clearing Google auth:', error);
    }

    // Force redirect to login page, avoiding redirect loops
    setTimeout(() => {
      const currentPath = window.location.pathname;
      if (currentPath !== '/' && currentPath !== '/api/login') {
        window.location.replace('/');
      }
    }, 1000);
  };
  
  const syncUserWithBackend = async (googleUser: GoogleUser, accessToken: string, retryCount = 0): Promise<void> => {
    try {
      authLog('Syncing user with backend', { hasEmail: !!googleUser.email });
      
      const response = await fetch('/api/auth/google-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          idToken: null, // We'll use access token
          accessToken: accessToken,
          email: googleUser.email,
          displayName: googleUser.name,
          photoURL: googleUser.picture,
        }),
      });
      
      if (response.ok) {
        authLog('Successfully authenticated with backend');
        const data = await response.json();
        
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
          authLog('Rate limited, stopping retry attempts');
          setError('Too many login attempts. Please wait a few minutes and try again.');
          setIsRefreshing(false);
          return;
        }
        
        // Handle token-related errors with retry logic
        if ((response.status === 401 || errorData.message?.includes('token')) && retryCount < 2) {
          authLog(`Token expired, attempting refresh (attempt ${retryCount + 1})`);
          setIsRefreshing(true);
          setError('Refreshing session...');
          // Wait longer between retries to avoid hitting rate limits
          await new Promise(resolve => setTimeout(resolve, 3000 * (retryCount + 1)));
          await syncUserWithBackend(googleUser, accessToken, retryCount + 1);
          setIsRefreshing(false);
          return;
        }
        
        // If this is a final 401 error (after retries), handle token expiration
        if (response.status === 401) {
          authLog('Authentication failed after retries');
          await handleTokenExpired();
          return;
        }
        
        devError('Backend authentication failed', errorData);
        
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
        authLog(`Network error, retrying authentication (attempt ${retryCount + 1})`);
        await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
        await syncUserWithBackend(googleUser, accessToken, retryCount + 1);
        return;
      }
      setError('Authentication error. Please try again.');
      setUser(null);
      setDbUser(null);
    }
  };

  useEffect(() => {
    // Check if user is already authenticated on mount
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/user', {
          credentials: 'include',
        });
        
        if (response.ok) {
          const userData = await response.json();
          setDbUser(userData);
          // Set minimal user info from DB user
          setUser({
            sub: userData.id,
            email: userData.email,
            name: `${userData.firstName} ${userData.lastName}`,
            picture: userData.profileImageUrl,
          });
        }
      } catch (error) {
        console.error('Failed to check auth status:', error);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();

    // Initialize Google Sign-In for future logins
    initializeGoogleSignIn(async (response: any) => {
      try {
        const credential = response.credential;
        const userInfo = decodeJWT(credential);
        
        if (userInfo) {
          const googleUser: GoogleUser = {
            sub: userInfo.sub,
            email: userInfo.email,
            name: userInfo.name,
            picture: userInfo.picture,
            email_verified: userInfo.email_verified,
          };
          
          setUser(googleUser);
          await syncUserWithBackend(googleUser, credential);
        }
      } catch (error) {
        console.error('Google Sign-In error:', error);
        setError('Failed to sign in with Google');
      }
    }).catch(console.error);
  }, []);

  const login = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await signInWithGoogle();
      
      if (response.access_token) {
        // Fetch user info using access token
        const userInfoResponse = await fetch(
          `https://www.googleapis.com/oauth2/v2/userinfo?access_token=${response.access_token}`
        );
        
        if (userInfoResponse.ok) {
          const userInfo = await userInfoResponse.json();
          
          const googleUser: GoogleUser = {
            sub: userInfo.id,
            email: userInfo.email,
            name: userInfo.name,
            picture: userInfo.picture,
            email_verified: userInfo.verified_email,
          };
          
          setUser(googleUser);
          await syncUserWithBackend(googleUser, response.access_token);
          
          // Redirect to home/main screen after successful login
          window.location.href = "/";
        } else {
          throw new Error('Failed to fetch user info');
        }
      }
    } catch (error) {
      console.error('❌ Login failed:', error);
      setError(error instanceof Error ? error.message : 'Failed to sign in with Google');
    } finally {
      setLoading(false);
    }
  };

  const logout = async (redirect: boolean = true) => {
    // Prevent duplicate logout calls
    if (isLoggingOut) {
      authLog('Logout already in progress, skipping');
      return;
    }

    setIsLoggingOut(true);
    
    try {
      // Clear Google authentication
      if (user?.email) {
        googleSignOut(user.email);
      }
      
      // Clear backend session and check response
      const logoutResponse = await fetch('/api/auth/logout', { method: 'POST' });
      if (!logoutResponse.ok) {
        console.warn('Backend logout failed, but continuing with client cleanup');
      }
      
      // Clear client state
      setUser(null);
      setDbUser(null);
      setError(null);
      
      // Clear React Query cache to prevent data leakage
      queryClient.clear();
      
      // Show success notification
      toast({
        title: "Logged Out",
        description: "You have been successfully logged out.",
        duration: 2000,
      });
      
      // Redirect to login page if requested
      if (redirect) {
        setTimeout(() => {
          window.location.replace('/');
        }, 100);
      }
    } catch (error) {
      console.error('Error signing out:', error);
      
      // Show error notification to user
      toast({
        title: "Logout Error",
        description: "There was an issue logging you out. Please try again.",
        variant: "destructive",
        duration: 3000,
      });
      
      // Still attempt state cleanup even on error
      setUser(null);
      setDbUser(null);
      queryClient.clear();
      
      // Still redirect on error to ensure user is logged out
      if (redirect) {
        setTimeout(() => {
          window.location.replace('/');
        }, 100);
      }
    } finally {
      setIsLoggingOut(false);
    }
  };

  const value = {
    user,
    dbUser,
    loading,
    error,
    isRefreshing,
    isLoggingOut,
    login,
    logout,
    handleTokenExpired,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
