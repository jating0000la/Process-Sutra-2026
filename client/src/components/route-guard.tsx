import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

// Check if database user has admin role
const isAdmin = (dbUser: any) => {
  return dbUser?.role === 'admin';
};

interface RouteGuardProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export default function RouteGuard({ children, requireAdmin = false }: RouteGuardProps) {
  const { user, dbUser, loading, handleTokenExpired } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!loading && !user) {
      // If user is not authenticated, use the token expired handler
      // which will show a proper message and redirect to login
      handleTokenExpired();
      return;
    }

    if (!loading && user && requireAdmin && !isAdmin(dbUser)) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to access this page.",
        variant: "destructive",
      });
      // Redirect to dashboard for non-admin users
      window.location.href = "/";
      return;
    }
  }, [user, loading, requireAdmin, toast, handleTokenExpired]);

  // Show loading while checking authentication
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Don't render children if not authenticated or missing admin permission
  if (!user || (requireAdmin && !isAdmin(dbUser))) {
    return null;
  }

  return <>{children}</>;
}