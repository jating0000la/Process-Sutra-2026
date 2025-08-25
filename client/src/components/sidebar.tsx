import { Link, useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, 
  CheckSquare, 
  Workflow, 
  FileText, 
  BarChart3, 
  FileBarChart, 
  Users, 
  Settings,
  Bell,
  Activity
} from "lucide-react";

// Navigation items for all users
const userNavigationItems = [
  {
    name: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
    badge: null,
  },
  {
    name: "My Tasks", 
    href: "/tasks",
    icon: CheckSquare,
    badge: null,
  },
  {
    name: "My Performance",
    href: "/analytics",
    icon: BarChart3,
    badge: null,
  },
  // {
  //   name: "My Performance",
  //   href: "/analytics", 
  //   icon: BarChart3,
  //   badge: null,
  // },
];

// Additional navigation items for admins only
const adminNavigationItems = [
  {
    name: "Flow Management",
    href: "/flows",
    icon: Workflow,
    badge: null,
  },
  {
    name: "Form Builder",
    href: "/form-builder", 
    icon: FileText,
    badge: null,
  },
  {
    name: "TAT Config",
    href: "/tat-config",
    icon: Settings,
    badge: null,
  },
  {
    name: "Flow Data",
    href: "/flow-data",
    icon: FileBarChart,
    badge: null,
  },
  {
    name: "Flow Simulator",
    href: "/flow-simulator",
    icon: Activity,
    badge: null,
  },
  {
    name: "User Management",
    href: "/user-management",
    icon: Users,
    badge: null,
  },
  {
    name: "Start Flow API",
    href: "/api-startflow",
    icon: Settings,
    badge: null,
  },
  // {
  //   name: "Organization Settings",
  //   href: "/organization-settings",
  //   icon: Settings,
  //   badge: null,
  // },
];

export default function Sidebar() {
  const [location] = useLocation();
  const { dbUser } = useAuth();

  const isActive = (href: string) => {
    if (href === "/") {
      return location === "/";
    }
    return location.startsWith(href);
  };

  const isAdmin = dbUser?.role === 'admin';
  const navigationItems = isAdmin ? [...userNavigationItems, ...adminNavigationItems] : userNavigationItems;

  return (
    <aside className="bg-white w-64 shadow-sm border-r border-gray-200 overflow-y-auto">
      <nav className="mt-8 px-4">
        <div className="space-y-2">
          {navigationItems.map((item: any) => {
            const IconComponent = item.icon;
            return (
              <Link key={item.name} href={item.href}>
                <div
                  className={cn(
                    "sidebar-nav-item",
                    isActive(item.href) && "active"
                  )}
                >
                  <IconComponent className="mr-3 h-5 w-5" />
                  {item.name}
                  {item.badge && (
                    <span className="ml-auto bg-orange-500 text-white text-xs px-2 py-1 rounded-full">
                      {item.badge}
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
        
        {isAdmin && (
          <div className="mt-8">
            <div className="px-3 py-2 bg-blue-50 rounded-lg">
              <div className="flex items-center">
                <Users className="w-4 h-4 text-blue-600 mr-2" />
                <span className="text-xs font-semibold text-blue-700 uppercase tracking-wider">
                  Admin Access
                </span>
              </div>
            </div>
          </div>
        )}
      </nav>
    </aside>
  );
}
