import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import AuthDebug from "@/components/auth-debug";

export default function LoginPage() {
  const { login, error, loading } = useAuth();

  return (
    <div className="relative min-h-screen flex items-center justify-center p-6 overflow-hidden bg-gradient-to-br from-indigo-200 via-purple-200 to-pink-100">
      {/* Flowchart SVG background */}
      <svg
        className="absolute inset-0 w-full h-full object-cover z-0 animate-fade-in"
        style={{ pointerEvents: 'none' }}
        viewBox="0 0 1600 900"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <g opacity="0.12">
          <rect x="200" y="120" width="220" height="80" rx="18" fill="#6366F1" />
          <rect x="500" y="300" width="180" height="70" rx="16" fill="#A21CAF" />
          <rect x="900" y="200" width="200" height="90" rx="20" fill="#F59E42" />
          <rect x="1200" y="400" width="220" height="80" rx="18" fill="#10B981" />
          <rect x="700" y="600" width="180" height="70" rx="16" fill="#3B82F6" />
          <rect x="350" y="500" width="200" height="90" rx="20" fill="#F472B6" />
          <path d="M320 160 Q400 200 500 335" stroke="#6366F1" strokeWidth="6" fill="none" />
          <path d="M680 335 Q800 250 1000 245" stroke="#A21CAF" strokeWidth="6" fill="none" />
          <path d="M1100 245 Q1300 300 1310 440" stroke="#F59E42" strokeWidth="6" fill="none" />
          <path d="M1310 480 Q1200 600 900 645" stroke="#10B981" strokeWidth="6" fill="none" />
          <path d="M900 645 Q800 700 600 635" stroke="#3B82F6" strokeWidth="6" fill="none" />
          <circle cx="200" cy="120" r="12" fill="#6366F1" />
          <circle cx="500" cy="300" r="10" fill="#A21CAF" />
          <circle cx="900" cy="200" r="14" fill="#F59E42" />
          <circle cx="1200" cy="400" r="12" fill="#10B981" />
          <circle cx="700" cy="600" r="10" fill="#3B82F6" />
          <circle cx="350" cy="500" r="14" fill="#F472B6" />
        </g>
      </svg>

      {/* Overlay for blur effect */}
      <div className="absolute inset-0 bg-white/60 backdrop-blur-sm z-10" />

      {/* Login Card */}
      <div className="relative z-20 w-full max-w-lg">
        <Card className="shadow-2xl rounded-2xl border border-gray-200 bg-white/90 backdrop-blur-lg">
          <CardContent className="pt-10 pb-8 px-8">
            <div className="text-center space-y-6">
              <div className="flex justify-center">
                <img
                  src="/src/logo/ProcessSutra.png"
                  alt="App Logo"
                  className="w-32 h-32 object-contain drop-shadow-lg mb-2"
                />
              </div>
              <h1 className="text-3xl font-extrabold text-gray-800 tracking-tight">Welcome to ProcessSutra</h1>
              <p className="text-lg text-gray-600 font-medium">
                Intelligent Task Management System
              </p>
              <p className="text-base text-gray-500 max-w-md mx-auto">
                Streamline your workflows with configurable task flows, dynamic forms, and powerful analytics. Visualize your processes and boost productivity.
              </p>
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {error}
                </div>
              )}
              <Button
                onClick={login}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 py-3 text-lg font-semibold bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-xl shadow-lg transition-all"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                {loading ? 'Signing in...' : 'Sign in with Google'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
      {/* <AuthDebug /> */}
    </div>
  );
}
