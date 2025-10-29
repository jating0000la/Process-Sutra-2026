import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

export default function AuthDebug() {
  const { user, loading, login, logout, isLoggingOut } = useAuth();

  return (
    <div className="fixed bottom-4 right-4 bg-white border rounded-lg p-4 shadow-lg max-w-sm">
      <h3 className="font-bold text-sm mb-2">Auth Debug</h3>
      <div className="text-xs space-y-1">
        <div>Loading: {loading ? 'Yes' : 'No'}</div>
        <div>User: {user ? user.email : 'None'}</div>
        <div>UID: {user ? user.uid : 'None'}</div>
      </div>
      <div className="mt-2 space-x-2">
        <Button size="sm" onClick={login} disabled={loading}>
          Login
        </Button>
        <Button size="sm" variant="outline" onClick={() => logout()} disabled={!user || isLoggingOut}>
          {isLoggingOut ? 'Logging out...' : 'Logout'}
        </Button>
      </div>
    </div>
  );
}