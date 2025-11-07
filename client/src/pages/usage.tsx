import { AppLayout } from "@/components/app-layout";
import { useAuth } from "@/contexts/AuthContext";
import { TrendingUp, ArrowLeft } from "lucide-react";
import { Link } from "wouter";

export default function Usage() {
  const { dbUser } = useAuth();
  const isAdmin = dbUser?.role === "admin";

  if (!isAdmin) {
    return (
      <AppLayout title="Usage" description="Access Denied">
        <div className="text-center py-12">
          <p className="text-gray-600">
            You don't have permission to access this page.
          </p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title="Usage Statistics"
      description="View your organization's usage statistics and analytics"
    >
      <div className="max-w-4xl mx-auto">
        <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
          <div className="bg-blue-50 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6">
            <TrendingUp className="h-10 w-10 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Coming Soon
          </h2>
          <p className="text-gray-600 mb-8 max-w-md mx-auto">
            Usage statistics and analytics dashboard is currently under
            development. This feature will allow you to track and analyze your
            organization's platform usage, including:
          </p>
          <div className="text-left max-w-md mx-auto mb-8">
            <ul className="space-y-2 text-gray-700">
              <li className="flex items-start">
                <span className="text-blue-600 mr-2">•</span>
                <span>Number of active flows and forms</span>
              </li>
              <li className="flex items-start">
                <span className="text-blue-600 mr-2">•</span>
                <span>Task completion rates and metrics</span>
              </li>
              <li className="flex items-start">
                <span className="text-blue-600 mr-2">•</span>
                <span>User activity and engagement statistics</span>
              </li>
              <li className="flex items-start">
                <span className="text-blue-600 mr-2">•</span>
                <span>Data storage and API usage</span>
              </li>
              <li className="flex items-start">
                <span className="text-blue-600 mr-2">•</span>
                <span>Historical trends and insights</span>
              </li>
            </ul>
          </div>
          <Link href="/settings">
            <button className="inline-flex items-center px-6 py-3 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Settings
            </button>
          </Link>
        </div>
      </div>
    </AppLayout>
  );
}
