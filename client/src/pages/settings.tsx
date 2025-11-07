import { AppLayout } from "@/components/app-layout";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "wouter";
import {
  Settings as SettingsIcon,
  Users,
  Building2,
  Activity,
  BookOpen,
  Shield,
  TrendingUp,
  CreditCard,
  ChevronRight,
  Clock,
  Database,
} from "lucide-react";

interface SettingCard {
  name: string;
  description: string;
  href: string;
  icon: any;
  badge?: string;
}

const settingsSections: { title: string; items: SettingCard[] }[] = [
  {
    title: "Configuration",
    items: [
      {
        name: "TAT Config",
        description: "Configure Turn Around Time settings for flows and tasks",
        href: "/tat-config",
        icon: Clock,
      },
      {
        name: "User Management",
        description: "Manage users, roles, and permissions",
        href: "/user-management",
        icon: Users,
      },
      {
        name: "Organisation Details",
        description: "Update organization information and settings",
        href: "/organization-settings",
        icon: Building2,
      },
    ],
  },
  {
    title: "Data Management",
    items: [
      {
        name: "Export & Delete Data",
        description: "Export or permanently delete your organization's data",
        href: "/data-management",
        icon: Database,
      },
    ],
  },
  {
    title: "API & Integration",
    items: [
      {
        name: "Start Flow API",
        description: "Configure and test the Start Flow API endpoints",
        href: "/api-startflow",
        icon: Activity,
      },
      {
        name: "API Documentation",
        description: "View comprehensive API documentation and examples",
        href: "/api-documentation",
        icon: BookOpen,
      },
    ],
  },
  {
    title: "Security & Compliance",
    items: [
      {
        name: "NDA & Security",
        description: "Manage security settings and NDA agreements",
        href: "/nda-security",
        icon: Shield,
      },
    ],
  },
  {
    title: "Billing & Usage",
    items: [
      {
        name: "Usage",
        description: "View usage statistics and analytics",
        href: "/usage",
        icon: TrendingUp,
        badge: "Coming Soon",
      },
      {
        name: "Payments",
        description: "Manage billing and payment methods",
        href: "/payments",
        icon: CreditCard,
        badge: "Coming Soon",
      },
    ],
  },
];

export default function Settings() {
  const { dbUser } = useAuth();
  const isAdmin = dbUser?.role === "admin";

  if (!isAdmin) {
    return (
      <AppLayout title="Settings" description="Access Denied">
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
      title="Settings"
      description="Manage your organization settings, users, and configurations"
    >
      <div className="space-y-8">
        {settingsSections.map((section) => (
          <div key={section.title}>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              {section.title}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {section.items.map((item) => {
                const IconComponent = item.icon;
                const isComingSoon = item.badge === "Coming Soon";
                
                const cardContent = (
                  <div
                    className={`bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-all ${
                      isComingSoon
                        ? "opacity-60 cursor-not-allowed"
                        : "hover:border-blue-300 cursor-pointer"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-4">
                        <div className="bg-blue-50 p-3 rounded-lg">
                          <IconComponent className="h-6 w-6 text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="text-lg font-semibold text-gray-900">
                              {item.name}
                            </h3>
                            {item.badge && (
                              <span className="bg-orange-100 text-orange-700 text-xs px-2 py-1 rounded-full font-medium">
                                {item.badge}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mt-1">
                            {item.description}
                          </p>
                        </div>
                      </div>
                      {!isComingSoon && (
                        <ChevronRight className="h-5 w-5 text-gray-400" />
                      )}
                    </div>
                  </div>
                );

                if (isComingSoon) {
                  return <div key={item.name}>{cardContent}</div>;
                }

                return (
                  <Link key={item.name} href={item.href}>
                    {cardContent}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}

        {/* Additional Information */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mt-8">
          <div className="flex items-start space-x-3">
            <SettingsIcon className="h-6 w-6 text-blue-600 mt-1" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Need Help?
              </h3>
              <p className="text-sm text-gray-700">
                If you need assistance with any settings or have questions,
                please refer to the API Documentation or contact your system
                administrator.
              </p>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
