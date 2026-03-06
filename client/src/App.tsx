import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { HelmetProvider } from "react-helmet-async";
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
import Analytics from "@/pages/analytics";
import TATConfig from "@/pages/tat-config";
import FlowData from "@/pages/flow-data";
import AdvancedSimulator from "@/pages/advanced-simulator";
import UserManagement from "@/pages/user-management";
import OrganizationSettings from "@/pages/organization-settings";
import Profile from "@/pages/profile";
import { useNotifications } from "@/hooks/useNotifications";
import ApiStartFlow from "@/pages/api-startflow";
import OrganizationControl from "@/pages/organization-control";

import NDASecurityPage from "@/pages/nda-security";
import VisualFlowBuilder from "@/pages/visual-flow-builder";
import FlowTemplates from "@/pages/flow-templates";
import DataManagement from "@/pages/data-management";
import QuickFormBuilder from "@/pages/quick-form-builder";
import QuickFormFill from "@/pages/quick-form-fill";
import QuickFormResponses from "@/pages/quick-form-responses";
import ReportBuilder from "@/pages/report-builder";
import AIAssistant from "@/pages/ai-assistant";
import Billing from "@/pages/billing";
import SuperAdminBilling from "@/pages/super-admin-billing";
import { useEffect, useState } from "react";
import { useOrganizationCheck } from "@/hooks/useOrganizationCheck";
import { useGoogleDriveCheck } from "@/hooks/useGoogleDriveCheck";
import { ErrorBoundary } from "@/components/error-boundary";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Shield, FileText, AlertTriangle } from "lucide-react";

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

function NDAAcceptanceDialog() {
  const { acceptNDA } = useAuth();
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleAccept = async () => {
    setSubmitting(true);
    try {
      await acceptNDA();
    } catch {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50 p-4">
      <Dialog open modal>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col [&>button]:hidden" onPointerDownOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Shield className="h-6 w-6 text-blue-600" />
              Terms of Service & Data Agreement
            </DialogTitle>
            <DialogDescription>
              Please review and accept the following terms before using ProcessSutra.
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1 max-h-[50vh] border rounded-lg p-4 bg-gray-50">
            <div className="space-y-4 text-sm text-gray-700 pr-4">
              <div className="flex items-start gap-2">
                <FileText className="h-4 w-4 mt-0.5 text-blue-600 shrink-0" />
                <div>
                  <p className="font-semibold text-gray-900">1. Data Ownership & Storage</p>
                  <p>All files uploaded through ProcessSutra are stored directly in <strong>your Google Drive account</strong>. ProcessSutra does not store, host, or retain any of your uploaded files on its own servers. You maintain full ownership and control over all your data at all times.</p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <FileText className="h-4 w-4 mt-0.5 text-blue-600 shrink-0" />
                <div>
                  <p className="font-semibold text-gray-900">2. User Control & Data Deletion</p>
                  <p>You have <strong>complete control</strong> over your data. You can delete any files from your Google Drive at any time. ProcessSutra does not create backups of your files. Once deleted from your Drive, the data is permanently removed and cannot be recovered by ProcessSutra.</p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <FileText className="h-4 w-4 mt-0.5 text-blue-600 shrink-0" />
                <div>
                  <p className="font-semibold text-gray-900">3. No Liability</p>
                  <p>ProcessSutra is a workflow management tool that facilitates process automation. <strong>ProcessSutra assumes no liability</strong> for any data loss, unauthorized access to your Google Drive, or any damages arising from the use of this platform. All data management responsibilities rest with the user and their organization.</p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <FileText className="h-4 w-4 mt-0.5 text-blue-600 shrink-0" />
                <div>
                  <p className="font-semibold text-gray-900">4. Google Drive Integration</p>
                  <p>ProcessSutra integrates with Google Drive using OAuth 2.0 authentication. Access permissions are granted by you and can be <strong>revoked at any time</strong> through your Google Account settings. ProcessSutra only accesses files within its designated application folder.</p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <FileText className="h-4 w-4 mt-0.5 text-blue-600 shrink-0" />
                <div>
                  <p className="font-semibold text-gray-900">5. AI Features & Third-Party Services</p>
                  <p>If you use AI-powered features, your data may be processed by third-party AI providers (e.g., Google Gemini, OpenAI) according to their respective privacy policies. ProcessSutra does not store AI-processed data beyond immediate request handling. Use of AI features is <strong>optional and user-initiated</strong>.</p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <FileText className="h-4 w-4 mt-0.5 text-blue-600 shrink-0" />
                <div>
                  <p className="font-semibold text-gray-900">6. Account & Organization Security</p>
                  <p>You are responsible for maintaining the security of your account credentials and managing user access within your organization. ProcessSutra provides role-based access controls, but the <strong>organization administrator</strong> is responsible for assigning appropriate roles and permissions.</p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 mt-0.5 text-amber-600 shrink-0" />
                <div>
                  <p className="font-semibold text-gray-900">7. Service Availability</p>
                  <p>ProcessSutra is provided <strong>"as is"</strong> without warranties of any kind. We do not guarantee uninterrupted or error-free service. ProcessSutra reserves the right to modify, suspend, or discontinue the service at any time.</p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <FileText className="h-4 w-4 mt-0.5 text-blue-600 shrink-0" />
                <div>
                  <p className="font-semibold text-gray-900">8. Communication & Notifications</p>
                  <p>Emails and notifications sent via ProcessSutra (task assignments, reminders, etc.) are automated communications initiated by your organization's workflow configuration. ProcessSutra is not responsible for the content of these communications.</p>
                </div>
              </div>
            </div>
          </ScrollArea>

          <div className="space-y-4 pt-2">
            <div className="flex items-start space-x-3 p-3 border rounded-lg bg-blue-50">
              <Checkbox
                id="nda-agree"
                checked={agreed}
                onCheckedChange={(checked) => setAgreed(checked === true)}
              />
              <label htmlFor="nda-agree" className="text-sm leading-relaxed cursor-pointer">
                I have read and understood the above terms. I acknowledge that <strong>ProcessSutra assumes no liability</strong> for my data, that all files are stored in my Google Drive under my control, and that I am solely responsible for managing my data and organization security.
              </label>
            </div>

            <Button
              className="w-full"
              disabled={!agreed || submitting}
              onClick={handleAccept}
            >
              {submitting ? "Processing..." : "Accept & Continue"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Router() {
  const { user, dbUser, loading, error } = useAuth();
  useNotifications();
  
  // Check organization details for admin users
  useOrganizationCheck();
  
  // Check Google Drive connection for admin users
  useGoogleDriveCheck();

  if (loading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-gray-50">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  // Show error state if authentication failed
  if (error && !user) {
    // Error handled by AuthContext
  }

  // Show NDA acceptance dialog if user is authenticated but hasn't accepted NDA
  if (user && dbUser && !dbUser.ndaAcceptedAt) {
    return <NDAAcceptanceDialog />;
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
          {/* Authenticated user routes */}
          <Route path="/" component={Analytics} />
          <Route path="/tasks" component={Tasks} />
          <Route path="/analytics" component={Analytics} />
          <Route path="/profile" component={Profile} />
          
          {/* Admin-only routes */}
          <Route path="/tat-config">
            <ProtectedRoute requireAdmin>
              <TATConfig />
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
          <Route path="/organization-control">
            <OrganizationControl />
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

          <Route path="/flow-templates">
            <ProtectedRoute requireAdmin>
              <FlowTemplates />
            </ProtectedRoute>
          </Route>

          {/* Quick Form routes */}
          <Route path="/quick-form-builder">
            <ProtectedRoute requireAdmin>
              <QuickFormBuilder />
            </ProtectedRoute>
          </Route>
          <Route path="/quick-form-fill" component={QuickFormFill} />
          <Route path="/quick-form-responses">
            <ProtectedRoute requireAdmin>
              <QuickFormResponses />
            </ProtectedRoute>
          </Route>

          {/* Report Builder */}
          <Route path="/report-builder">
            <ProtectedRoute requireAdmin>
              <ReportBuilder />
            </ProtectedRoute>
          </Route>

          {/* AI Assistant */}
          <Route path="/ai-assistant">
            <ProtectedRoute requireAdmin>
              <AIAssistant />
            </ProtectedRoute>
          </Route>

          {/* Billing & Subscription */}
          <Route path="/billing" component={Billing} />
          <Route path="/super-admin-billing" component={SuperAdminBilling} />
        </>
      )}
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <HelmetProvider>
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
      </HelmetProvider>
    </ErrorBoundary>
  );
}

export default App;
