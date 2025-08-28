import { useAuth } from "@/contexts/AuthContext";
import NotFound from "@/pages/not-found";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export default function ProtectedRoute({ children, requireAdmin = false }: ProtectedRouteProps) {
  const { dbUser, error } = useAuth();

  // If route requires admin access but user is not admin, show 404
  if (requireAdmin && dbUser?.role !== 'admin') {
    return <NotFound />;
  }

  // If there's an auth error, show a minimal message instead of a blank screen
  if (error) {
    return (
      <div style={{ padding: 24 }}>
        <h2>Authentication error</h2>
        <p>{error}</p>
      </div>
    );
  }

  return <>{children}</>;
}