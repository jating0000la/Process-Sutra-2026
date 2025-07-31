import { useAuth } from "@/hooks/useAuth";
import { isAdmin } from "@/lib/roleUtils";
import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

interface RouteGuardProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export default function RouteGuard({ children, requireAdmin = false }: RouteGuardProps) {
  const { user, isLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }

    if (!isLoading && isAuthenticated && requireAdmin && !isAdmin(user)) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to access this page.",
        variant: "destructive",
      });
      // Redirect to dashboard for non-admin users
      window.location.href = "/";
      return;
    }
  }, [isAuthenticated, isLoading, user, requireAdmin, toast]);

  // Show loading while checking authentication
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Don't render children if not authenticated or missing admin permission
  if (!isAuthenticated || (requireAdmin && !isAdmin(user))) {
    return null;
  }

  return <>{children}</>;
}