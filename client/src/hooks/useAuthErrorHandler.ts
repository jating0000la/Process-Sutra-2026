import { useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface AuthError {
  status: number;
  message?: string;
}

export const useAuthErrorHandler = () => {
  const { logout } = useAuth();
  const { toast } = useToast();

  const handleAuthError = useCallback(async (error: AuthError | Error) => {
    // Handle different types of errors
    if (error instanceof Error) {
      // Check if it's a 401 error from the error message
      if (error.message.includes('401')) {
        await handleTokenExpired();
        return;
      }
    }

    // Handle structured auth errors
    if (typeof error === 'object' && 'status' in error) {
      if (error.status === 401) {
        await handleTokenExpired();
        return;
      }
    }

    // Handle other auth-related errors
    console.error('Authentication error:', error);
  }, [logout, toast]);

  const handleTokenExpired = useCallback(async () => {
    console.log('Token expired, redirecting to login...');
    
    // Show user-friendly message
    toast({
      title: "Session Expired",
      description: "Your session has expired. Please log in again.",
      variant: "destructive",
      duration: 3000,
    });

    // Clear authentication state
    try {
      await logout();
    } catch (error) {
      console.error('Error during logout:', error);
    }

    // Wait a moment for the toast to show, then redirect
    setTimeout(() => {
      // Force redirect to login page by setting window location
      // This ensures we clear any cached state and start fresh
      window.location.href = '/';
    }, 1000);
  }, [logout, toast]);

  return {
    handleAuthError,
    handleTokenExpired,
  };
};