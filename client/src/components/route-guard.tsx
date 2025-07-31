import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

// Temporary admin check for Firebase User
const isFirebaseAdmin = (user: any) => {
  return user?.email === 'admin@example.com'; // Update this based on your admin logic
};

interface RouteGuardProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export default function RouteGuard({ children, requireAdmin = false }: RouteGuardProps) {
  const { user, loading } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!loading && !user) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Please log in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/";
      }, 500);
      return;
    }

    if (!loading && user && requireAdmin && !isFirebaseAdmin(user)) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to access this page.",
        variant: "destructive",
      });
      // Redirect to dashboard for non-admin users
      window.location.href = "/";
      return;
    }
  }, [user, loading, requireAdmin, toast]);

  // Show loading while checking authentication
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Don't render children if not authenticated or missing admin permission
  if (!user || (requireAdmin && !isFirebaseAdmin(user))) {
    return null;
  }

  return <>{children}</>;
}