import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import NotFound from "@/pages/not-found";
import LoginPage from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import Tasks from "@/pages/tasks";
import Flows from "@/pages/flows";
import FormBuilder from "@/pages/form-builder";
import Analytics from "@/pages/analytics";
import TATConfig from "@/pages/tat-config";
import FlowData from "@/pages/flow-data";
import FlowSimulator from "@/pages/flow-simulator";
import UserManagement from "@/pages/user-management";
import OrganizationSettings from "@/pages/organization-settings";

function Router() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-gray-50">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <Switch>
      {!user ? (
        <>
          <Route path="/" component={LoginPage} />
          <Route component={NotFound} />
        </>
      ) : (
        <>
          <Route path="/" component={Dashboard} />
          <Route path="/tasks" component={Tasks} />
          <Route path="/flows" component={Flows} />
          <Route path="/form-builder" component={FormBuilder} />
          <Route path="/analytics" component={Analytics} />
          <Route path="/tat-config" component={TATConfig} />
          <Route path="/flow-data" component={FlowData} />
          <Route path="/flow-simulator" component={FlowSimulator} />
          <Route path="/user-management" component={UserManagement} />
          <Route path="/organization-settings" component={OrganizationSettings} />
          <Route component={NotFound} />
        </>
      )}
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
