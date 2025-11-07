import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { LayoutProvider } from "@/contexts/LayoutContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import NotFound from "@/pages/not-found";
import LoginPage from "@/pages/login";
import LandingLogin from "@/pages/landing-login";

// import Dashboard from "@/pages/dashboard";
import Tasks from "@/pages/tasks";
import Flows from "@/pages/flows";
import FormBuilder from "@/pages/form-builder";
import Analytics from "@/pages/analytics";
import TATConfig from "@/pages/tat-config";
import FlowData from "@/pages/flow-data";
import AdvancedSimulator from "@/pages/advanced-simulator";
import UserManagement from "@/pages/user-management";
import OrganizationSettings from "@/pages/organization-settings";
import Profile from "@/pages/profile";
import Settings from "@/pages/settings";
import { useNotifications } from "@/hooks/useNotifications";
import ApiStartFlow from "@/pages/api-startflow";
import ApiDocumentation from "@/pages/api-documentation";
import FormResponses from "@/pages/form-responses";
import SuperAdmin from "@/pages/super-admin";
import SystemSuperAdmin from "@/pages/system-super-admin";

import FormDataViewer from "@/pages/form-data-viewer";
import MongoFormDataViewer from "@/pages/mongo-form-data-viewer";
import NDASecurityPage from "@/pages/nda-security";
import VisualFlowBuilder from "@/pages/visual-flow-builder";
import Usage from "@/pages/usage";
import Payments from "@/pages/payments";
import DataManagement from "@/pages/data-management";
import { useEffect } from "react";

// Component to handle /api/login redirect
function ApiLoginRedirect() {
  useEffect(() => {
    // Redirect to home page (login page) immediately
    window.location.replace('/');
  }, []);
  
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50">
      <div className="text-lg">Redirecting to login...</div>
    </div>
  );
}

function Router() {
  const { user, loading } = useAuth();
  useNotifications();

  if (loading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-gray-50">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <Switch>
      {/* Handle /api/login redirect - always redirect to / regardless of auth state */}
      <Route path="/api/login" component={ApiLoginRedirect} />
      
      {!user ? (
        <>
          {/* Public routes - Landing page at root */}
          <Route path="/" component={LandingLogin} />
          <Route path="/login" component={LoginPage} />
          {/* Catch all other routes and redirect to landing */}
          <Route component={LandingLogin} />
        </>
      ) : (
        <>
          {/* Public user routes */}
          <Route path="/" component={Analytics} />
          <Route path="/tasks" component={Tasks} />
          <Route path="/analytics" component={Analytics} />
          <Route path="/profile" component={Profile} />
          
          {/* Admin-only routes */}
          <Route path="/flows">
            <ProtectedRoute requireAdmin>
              <Flows />
            </ProtectedRoute>
          </Route>
          <Route path="/form-builder">
            <ProtectedRoute requireAdmin>
              <FormBuilder />
            </ProtectedRoute>
          </Route>
          <Route path="/tat-config">
            <ProtectedRoute requireAdmin>
              <TATConfig />
            </ProtectedRoute>
          </Route>
          <Route path="/settings">
            <ProtectedRoute requireAdmin>
              <Settings />
            </ProtectedRoute>
          </Route>
          
          <Route path="/data-management">
            <ProtectedRoute requireAdmin>
              <DataManagement />
            </ProtectedRoute>
          </Route>
          
          <Route path="/flow-data">
            <ProtectedRoute requireAdmin>
              <FlowData />
            </ProtectedRoute>
          </Route>
          <Route path="/advanced-simulator">
            <ProtectedRoute requireAdmin>
              <AdvancedSimulator />
            </ProtectedRoute>
          </Route>
          <Route path="/user-management">
            <ProtectedRoute requireAdmin>
              <UserManagement />
            </ProtectedRoute>
          </Route>
          <Route path="/super-admin">
            <ProtectedRoute requireAdmin>
              <SuperAdmin />
            </ProtectedRoute>
          </Route>
          <Route path="/system-super-admin">
            <SystemSuperAdmin />
          </Route>
          <Route path="/organization-settings">
            <ProtectedRoute requireAdmin>
              <OrganizationSettings />
            </ProtectedRoute>
          </Route>
          <Route path="/api-startflow">
            <ProtectedRoute requireAdmin>
              <ApiStartFlow />
            </ProtectedRoute>
          </Route>
          <Route path="/api-documentation">
            <ProtectedRoute requireAdmin>
              <ApiDocumentation />
            </ProtectedRoute>
          </Route>
          <Route path="/form-responses">
            <ProtectedRoute requireAdmin>
              <FormResponses />
            </ProtectedRoute>
          </Route>

          <Route path="/form-data-viewer">
            <ProtectedRoute requireAdmin>
              <FormDataViewer />
            </ProtectedRoute>
          </Route>
          
          <Route path="/mongo-form-data-viewer">
            <ProtectedRoute requireAdmin>
              <MongoFormDataViewer />
            </ProtectedRoute>
          </Route>
          
          <Route path="/nda-security">
            <ProtectedRoute requireAdmin>
              <NDASecurityPage />
            </ProtectedRoute>
          </Route>
          
          <Route path="/visual-flow-builder">
            <ProtectedRoute requireAdmin>
              <VisualFlowBuilder />
            </ProtectedRoute>
          </Route>
          
          <Route path="/usage">
            <ProtectedRoute requireAdmin>
              <Usage />
            </ProtectedRoute>
          </Route>
          
          <Route path="/payments">
            <ProtectedRoute requireAdmin>
              <Payments />
            </ProtectedRoute>
          </Route>
        </>
      )}
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <NotificationProvider>
          <LayoutProvider>
            <TooltipProvider>
              <Toaster />
              <Router />
            </TooltipProvider>
          </LayoutProvider>
        </NotificationProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
