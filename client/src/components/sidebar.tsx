
import { Link, useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { useLayout } from "@/contexts/LayoutContext";
import { X } from "lucide-react";
import { 
  LayoutDashboard, 
  CheckSquare, 
  Workflow, 
  FileText, 
  BarChart3, 
  FileBarChart, 
  Users, 
  Settings,
  Activity,
  Database,
  BookOpen,
  Shield
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
    name: "Advanced Simulator",
    href: "/advanced-simulator",
    icon: Activity,
    badge: "New",
  },
  {
    name: "User Management",
    href: "/user-management",
    icon: Users,
    badge: null,
  },
  // {
  //   name: "Form Data",
  //   href: "/form-data-viewer",
  //   icon: Database,
  //   badge: null,
  // },
  {
    name: "MongoDB Data", 
    href: "/mongo-form-data-viewer",
    icon: Database,
    badge: "New",
  },
  {
    name: "Start Flow API",
    href: "/api-startflow",
    icon: Settings,
    badge: null,
  },
  {
    name: "API Documentation",
    href: "/api-documentation",
    icon: BookOpen,
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
  const { sidebarOpen, closeSidebar } = useLayout();

  const isActive = (href: string) => {
    if (href === "/") {
      return location === "/";
    }
    return location.startsWith(href);
  };

  const isAdmin = dbUser?.role === 'admin';
  const isSuperAdmin = dbUser?.isSuperAdmin === true;
  const navigationItems = isAdmin ? [...userNavigationItems, ...adminNavigationItems] : userNavigationItems;

  return (
    <>
      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 md:hidden"
          onClick={closeSidebar}
        />
      )}
      <aside
        className={cn(
          "fixed md:static inset-y-0 left-0 z-40 transform transition-all duration-300 flex flex-col bg-white border-r border-gray-200 shadow-sm overflow-y-auto",
          sidebarOpen ? "translate-x-0 w-64" : "-translate-x-full md:translate-x-0 md:w-20"
        )}
      >
        <div className="flex md:hidden items-center justify-between h-16 px-4 border-b">
          <span className="font-semibold">Menu</span>
          <button onClick={closeSidebar} aria-label="Close sidebar">
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="mt-4 md:mt-8 px-3 md:px-4 flex-1">
        <div className="space-y-2">
          {navigationItems.map((item: any) => {
            const IconComponent = item.icon;
            return (
              <Link key={item.name} href={item.href}>
                <div
                  className={cn(
                      "sidebar-nav-item flex items-center rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 transition group",
                      isActive(item.href) && "bg-gray-100 text-gray-900",
                      !sidebarOpen && "md:justify-center md:px-2"
                    )}
                >
                    <IconComponent className={cn("h-5 w-5 mr-3", !sidebarOpen && "md:mr-0")} />
                    <span className={cn("truncate", !sidebarOpen && "hidden md:inline-block md:opacity-0 md:w-0")}>{item.name}</span>
                    {item.badge && sidebarOpen && (
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
            <div className={cn("mt-8", !sidebarOpen && "hidden md:block md:opacity-0") }>
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
    </>
  );
}
