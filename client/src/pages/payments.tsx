import { AppLayout } from "@/components/app-layout";
import { useAuth } from "@/contexts/AuthContext";
import { CreditCard, ArrowLeft } from "lucide-react";
import { Link } from "wouter";

export default function Payments() {
  const { dbUser } = useAuth();
  const isAdmin = dbUser?.role === "admin";

  if (!isAdmin) {
    return (
      <AppLayout title="Payments" description="Access Denied">
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
      title="Payments & Billing"
      description="Manage your billing and payment methods"
    >
      <div className="max-w-4xl mx-auto">
        <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
          <div className="bg-green-50 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6">
            <CreditCard className="h-10 w-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Coming Soon
          </h2>
          <p className="text-gray-600 mb-8 max-w-md mx-auto">
            Payment and billing management is currently under development. This
            feature will allow you to:
          </p>
          <div className="text-left max-w-md mx-auto mb-8">
            <ul className="space-y-2 text-gray-700">
              <li className="flex items-start">
                <span className="text-green-600 mr-2">•</span>
                <span>View current subscription plan and pricing</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-600 mr-2">•</span>
                <span>Add and manage payment methods</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-600 mr-2">•</span>
                <span>View billing history and invoices</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-600 mr-2">•</span>
                <span>Upgrade or downgrade subscription plans</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-600 mr-2">•</span>
                <span>Set up billing alerts and notifications</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-600 mr-2">•</span>
                <span>Download tax documents and receipts</span>
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
