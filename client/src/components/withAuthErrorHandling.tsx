import React, { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface WithAuthErrorHandlingProps {
  children: React.ReactNode;
}

/**
 * Higher-order component that provides authentication error handling
 * for any page. This ensures that if authentication fails or token expires,
 * the user is properly redirected to the login page.
 */
export const withAuthErrorHandling = <P extends object>(
  WrappedComponent: React.ComponentType<P>
) => {
  const WithAuthErrorHandling: React.FC<P> = (props) => {
    const { user, loading, error, handleTokenExpired } = useAuth();
    const { toast } = useToast();

    useEffect(() => {
      // If there's an authentication error, handle it
      if (error && error.includes('401')) {
        handleTokenExpired();
        return;
      }

      // If user is not authenticated and not loading, redirect
      if (!loading && !user) {
        handleTokenExpired();
        return;
      }
    }, [user, loading, error, handleTokenExpired]);

    // Show loading state while checking authentication
    if (loading) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <div className="text-lg text-gray-700">Loading...</div>
          </div>
        </div>
      );
    }

    // Don't render the component if user is not authenticated
    if (!user) {
      return null;
    }

    // Render the wrapped component if authenticated
    return <WrappedComponent {...props} />;
  };

  WithAuthErrorHandling.displayName = `withAuthErrorHandling(${WrappedComponent.displayName || WrappedComponent.name})`;
  
  return WithAuthErrorHandling;
};