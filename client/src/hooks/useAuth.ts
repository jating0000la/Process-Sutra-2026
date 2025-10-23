import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { trackLogin } from "@/lib/deviceFingerprint";
import { auth } from "@/lib/firebase";

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
        // Check if Firebase user is still authenticated
        if (auth.currentUser) {
          console.log('🔄 Session expired but Firebase user exists, attempting refresh...');
          try {
            // Force refresh the Firebase token
            const idToken = await auth.currentUser.getIdToken(true);
            
            // Try to re-authenticate with the backend using fresh token
            const refreshResponse = await fetch('/api/auth/firebase-login', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              credentials: 'include',
              body: JSON.stringify({
                uid: auth.currentUser.uid,
                email: auth.currentUser.email,
                displayName: auth.currentUser.displayName,
                photoURL: auth.currentUser.photoURL,
                idToken: idToken,
              }),
            });
            
            if (refreshResponse.ok) {
              console.log('✅ Session refreshed successfully in useAuth');
              // Retry the original request
              const retryRes = await fetch("/api/auth/user", {
                credentials: "include",
              });
              
              if (retryRes.ok) {
                return await retryRes.json();
              }
            } else if (refreshResponse.status === 429) {
              console.log('🚫 Rate limited in useAuth, skipping refresh');
              // Don't retry if rate limited
              return null;
            } else {
              const errorData = await refreshResponse.json().catch(() => ({}));
              console.log('❌ Failed to refresh session:', errorData.message);
            }
          } catch (error) {
            console.error('❌ Token refresh failed in useAuth:', error);
          }
        }
        
        // If we reach here, the session is truly expired
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

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
  };
}
