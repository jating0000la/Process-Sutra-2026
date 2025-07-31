import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { trackLogin } from "@/lib/deviceFingerprint";

export function useAuth() {
  const { data: user, isLoading } = useQuery({
    queryKey: ["/api/auth/user"],
    retry: false,
    queryFn: async () => {
      const res = await fetch("/api/auth/user", {
        credentials: "include",
      });
      
      if (res.status === 401) {
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
