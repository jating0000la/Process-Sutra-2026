import { useAuth } from "@/contexts/AuthContext";
import NotFound from "@/pages/not-found";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export default function ProtectedRoute({ children, requireAdmin = false }: ProtectedRouteProps) {
  const { dbUser } = useAuth();

  // If route requires admin access but user is not admin, show 404
  if (requireAdmin && dbUser?.role !== 'admin') {
    return <NotFound />;
  }

  return <>{children}</>;
}