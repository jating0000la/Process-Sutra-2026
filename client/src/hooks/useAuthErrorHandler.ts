import { useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface AuthError {
  status: number;
  message?: string;
}

export const useAuthErrorHandler = () => {
  const { handleTokenExpired } = useAuth();

  const handleAuthError = useCallback(async (error: AuthError | Error) => {
    // Handle different types of errors
    if (error instanceof Error) {
      // Check if it's a 401 error from the error message
      if (error.message.includes('401')) {
        handleTokenExpired();
        return;
      }
    }

    // Handle structured auth errors
    if (typeof error === 'object' && 'status' in error) {
      if (error.status === 401) {
        handleTokenExpired();
        return;
      }
    }

    // Handle other auth-related errors
    console.error('Authentication error:', error);
  }, [handleTokenExpired]);

  return {
    handleAuthError,
    handleTokenExpired,
  };
};