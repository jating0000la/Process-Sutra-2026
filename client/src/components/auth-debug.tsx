import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";

export default function AuthDebug() {
  const { user, dbUser, loading, error, login, logout, isLoggingOut } = useAuth();
  const [sessionInfo, setSessionInfo] = useState<any>(null);

  // Check session status
  useEffect(() => {
    const checkSession = async () => {
      try {
        // First check session debug info
        const debugResponse = await fetch('/api/auth/session-debug', {
          credentials: 'include'
        });
        const debugData = await debugResponse.json();
        
        // Then check user endpoint
        const response = await fetch('/api/auth/user', {
          credentials: 'include'
        });
        const data = await response.json();
        
        setSessionInfo({ 
          status: response.status, 
          data,
          debug: debugData
        });
      } catch (err) {
        setSessionInfo({ error: err instanceof Error ? err.message : 'Unknown error' });
      }
    };
    
    checkSession();
  }, [user]);

  return (
    <div className="fixed bottom-4 right-4 bg-white border rounded-lg p-4 shadow-lg max-w-sm z-50">
      <h3 className="font-bold text-sm mb-2">Auth Debug</h3>
      <div className="text-xs space-y-1">
        <div>Loading: {loading ? 'Yes' : 'No'}</div>
        <div>Error: {error || 'None'}</div>
        <div>Google User: {user ? user.email : 'None'}</div>
        <div>DB User: {dbUser ? dbUser.email : 'None'}</div>
        <div>Session Status: {sessionInfo?.status || 'Checking...'}</div>
        <div>Cookies: {document.cookie ? 'Present' : 'None'}</div>
      </div>
      <div className="mt-2 space-x-2">
        <Button size="sm" onClick={login} disabled={loading}>
          Login
        </Button>
        <Button size="sm" variant="outline" onClick={() => logout()} disabled={!user || isLoggingOut}>
          {isLoggingOut ? 'Logging out...' : 'Logout'}
        </Button>
      </div>
      {sessionInfo && (
        <div className="mt-2 text-xs">
          <details>
            <summary>Session Details</summary>
            <pre className="mt-1 text-xs overflow-auto max-h-20">
              {JSON.stringify(sessionInfo, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </div>
  );
}