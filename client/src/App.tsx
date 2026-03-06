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
import { Shield, FileText, Lock, Database, HardDrive, Users, ShieldCheck, Trash2, Server, Scale, Eye } from "lucide-react";

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
              Confidentiality & Data Agreement
            </DialogTitle>
            <DialogDescription>
              Please review and accept the following terms before using ProcessSutra.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 max-h-[50vh] overflow-y-auto border rounded-lg p-4 bg-gray-50">
            <div className="space-y-5 text-sm text-gray-700 pr-4">

              {/* 1. Confidentiality */}
              <div className="flex items-start gap-2">
                <Eye className="h-4 w-4 mt-0.5 text-purple-600 shrink-0" />
                <div>
                  <p className="font-semibold text-gray-900">1. Confidentiality</p>
                  <p>This agreement is entered between <strong>ProcessSutra</strong> ("Service Provider") and <strong>your organization</strong> ("Client"). All information exchanged during your use of ProcessSutra — including workflow configurations, form data, uploaded documents, task records, and any operational data — is treated as <strong>Confidential Information</strong>. The Service Provider commits to protecting this information with appropriate safeguards, restricting internal access on a need-to-know basis, and using it solely for the purpose of delivering the platform's services. This obligation of confidentiality survives termination of this agreement.</p>
                </div>
              </div>

              {/* 2. Data Ownership */}
              <div className="flex items-start gap-2">
                <Database className="h-4 w-4 mt-0.5 text-blue-600 shrink-0" />
                <div>
                  <p className="font-semibold text-gray-900">2. Data Ownership</p>
                  <p>All workflow data, form data, task records, and operational data generated in ProcessSutra belongs <strong>entirely to your organization</strong>. ProcessSutra retains no ownership rights over your content. The platform is granted only a limited, revocable right to process your data as necessary to deliver its services. All intellectual property created by your organization within the platform remains your property.</p>
                </div>
              </div>

              {/* 3. Google Drive Storage Policy */}
              <div className="flex items-start gap-2">
                <HardDrive className="h-4 w-4 mt-0.5 text-blue-600 shrink-0" />
                <div>
                  <p className="font-semibold text-gray-900">3. Google Drive Storage Policy</p>
                  <p>All files uploaded through ProcessSutra are stored directly in <strong>your Google Drive account</strong>. ProcessSutra does not store, host, or retain any of your uploaded files on its own servers. Integration uses OAuth 2.0 authentication — access permissions are granted by you and can be <strong>revoked at any time</strong> through your Google Account settings. ProcessSutra only accesses files within its designated application folder. Third-party integrations operate under their respective provider terms and privacy policies.</p>
                </div>
              </div>

              {/* 4. User Responsibilities */}
              <div className="flex items-start gap-2">
                <Users className="h-4 w-4 mt-0.5 text-blue-600 shrink-0" />
                <div>
                  <p className="font-semibold text-gray-900">4. User Responsibilities</p>
                  <p>You are responsible for maintaining the <strong>security of your account credentials</strong> and managing user access within your organization. ProcessSutra provides role-based access controls, but the organization administrator is responsible for assigning appropriate roles and permissions. You agree to use the platform in a responsible manner consistent with its intended purpose.</p>
                </div>
              </div>

              {/* 5. AI & LLM Data Policy */}
              <div className="border rounded-lg p-3 bg-green-50/50 border-green-200 space-y-3">
                <div className="flex items-center gap-2">
                  <Lock className="h-4 w-4 text-green-600 shrink-0" />
                  <p className="font-semibold text-gray-900">5. AI & LLM Data Policy</p>
                </div>
                <div className="space-y-2 ml-6">
                  <p><strong>Organization-Owned API Keys:</strong> All AI API keys (Google Gemini, OpenAI, etc.) are provided, owned, and managed by <strong>your organization</strong>. ProcessSutra does not provide, generate, store, or manage any AI API keys.</p>
                  <p><strong>Data Never Shared With AI/LLM:</strong> The following is <strong>never</strong> transmitted to any AI provider:</p>
                  <ul className="list-disc list-inside space-y-0.5 text-gray-600 ml-2">
                    <li>Workflow definitions, task records, and form data</li>
                    <li>Employee/user personal information and uploaded files</li>
                    <li>Organization credentials, API keys, or secrets</li>
                    <li>Raw database records or operational data</li>
                  </ul>
                  <p><strong>Aggregated Data Only:</strong> AI services may only receive <strong>aggregated reporting metrics</strong> (task counts, completion percentages, cycle times, throughput rates) when you explicitly enable AI analysis. These contain no identifiable records or personal data.</p>
                  <p><strong>No AI Training:</strong> Your data is <strong>never used to train, fine-tune, or improve any AI models</strong>. AI requests are processed only for real-time responses and are not retained beyond the immediate request.</p>
                  <div className="mt-2 p-2 bg-green-100 border border-green-300 rounded text-green-800 text-xs font-medium">
                    ProcessSutra acts only as a technical interface between you and your chosen AI provider. All AI processing occurs using your own API account and under the policies of that AI provider.
                  </div>
                </div>
              </div>

              {/* 6. Data Security */}
              <div className="flex items-start gap-2">
                <ShieldCheck className="h-4 w-4 mt-0.5 text-blue-600 shrink-0" />
                <div>
                  <p className="font-semibold text-gray-900">6. Data Security</p>
                  <p>ProcessSutra implements appropriate <strong>security safeguards</strong> including encrypted data transmission, access control measures, and secure authentication protocols. In the event of a data breach, affected users and organizations will be notified promptly in accordance with applicable laws.</p>
                </div>
              </div>

              {/* 7. Data Deletion */}
              <div className="flex items-start gap-2">
                <Trash2 className="h-4 w-4 mt-0.5 text-red-500 shrink-0" />
                <div>
                  <p className="font-semibold text-gray-900">7. Data Deletion</p>
                  <p>You have <strong>complete control</strong> over your data. You can delete any files from your Google Drive at any time. ProcessSutra does not create backups of your files — once deleted from your Drive, <strong>data is permanently removed</strong> and cannot be recovered. Organization administrators may request complete removal of all organization data. Publicly available information and data required by legal obligations are excluded from confidentiality requirements.</p>
                </div>
              </div>

              {/* 8. Service Availability */}
              <div className="flex items-start gap-2">
                <Server className="h-4 w-4 mt-0.5 text-amber-600 shrink-0" />
                <div>
                  <p className="font-semibold text-gray-900">8. Service Availability</p>
                  <p>ProcessSutra is provided <strong>"as is"</strong> without warranties of any kind. We do not guarantee uninterrupted or error-free service. The platform may undergo scheduled maintenance and updates. ProcessSutra reserves the right to modify, suspend, or discontinue the service at any time with reasonable notice.</p>
                </div>
              </div>

              {/* 9. Limitation of Liability */}
              <div className="flex items-start gap-2">
                <Scale className="h-4 w-4 mt-0.5 text-amber-600 shrink-0" />
                <div>
                  <p className="font-semibold text-gray-900">9. Limitation of Liability</p>
                  <p><strong>ProcessSutra assumes no liability</strong> for any data loss, unauthorized access to your Google Drive, or any damages arising from the use of this platform. All data management responsibilities rest with the user and their organization. ProcessSutra's total financial liability shall not exceed the fees paid by the Client in the preceding 12 months. Automated communications (task assignments, reminders, etc.) are initiated by your organization's workflow configuration — ProcessSutra is not responsible for their content.</p>
                </div>
              </div>

              {/* 10. Acceptance of Terms */}
              <div className="flex items-start gap-2">
                <FileText className="h-4 w-4 mt-0.5 text-blue-600 shrink-0" />
                <div>
                  <p className="font-semibold text-gray-900">10. Acceptance of Terms</p>
                  <p>This agreement is effective from the date of acceptance and remains in force for the duration of your use of ProcessSutra. Confidentiality obligations survive termination. Either party may terminate by providing written notice. ProcessSutra reserves the right to <strong>update these terms</strong> with reasonable notice — continued use after changes constitutes acceptance. This agreement is governed by applicable law, and disputes shall be resolved through negotiation before formal proceedings. By checking the box below, you digitally accept all terms of this agreement.</p>
                </div>
              </div>

            </div>
          </div>

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
