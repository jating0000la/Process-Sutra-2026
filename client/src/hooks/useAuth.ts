import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { trackLogin } from "@/lib/deviceFingerprint";
import { queryClient } from "@/lib/queryClient";
import { signOut } from "@/lib/googleAuth";

export function useAuth() {
  const { data: user, isLoading, refetch } = useQuery({
    queryKey: ["/api/auth/user"],
    retry: false,
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    refetchInterval: 10 * 60 * 1000, // Auto-refetch every 10 minutes
    queryFn: async () => {
      const res = await fetch("/api/auth/user", {
        credentials: "include",
      });
      
      if (res.status === 401) {
        // Session expired
        console.log('🔄 Session expired, user needs to re-authenticate');
        return null;
      }
      
      if (!res.ok) {
        throw new Error(`${res.status}: ${res.statusText}`);
      }
      
      return await res.json();
    },
  });

  // Track login when user is authenticated
  useEffect(() => {
    if (user && !isLoading) {
      trackLogin((user as any).id);
    }
  }, [user, isLoading]);

  // Handle token expiration
  const handleTokenExpired = async () => {
    console.log('🔐 Token expired, clearing authentication state...');
    
    // Clear authentication state
    queryClient.clear();
    
    // Clear Google auth state
    try {
      if (user?.email) {
        signOut(user.email);
      }
    } catch (error) {
      console.error('Error clearing Google auth:', error);
    }

    // Force redirect to login page
    setTimeout(() => {
      const currentPath = window.location.pathname;
      if (currentPath !== '/' && currentPath !== '/api/login') {
        window.location.replace('/');
      }
    }, 100);
  };

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    handleTokenExpired,
  };
}