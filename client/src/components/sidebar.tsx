
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
  Shield,
  Boxes,
  Building2,
  CreditCard,
  TrendingUp
} from "lucide-react";

// All navigation items in the correct order
const allNavigationItems = [
  {
    name: "Main", 
    href: "/",
    icon: CheckSquare,
    badge: null,
    adminOnly: false,
  },
  // My Tasks - visible to all users
  {
    name: "My Tasks", 
    href: "/tasks",
    icon: CheckSquare,
    badge: null,
    adminOnly: false,
  },
  // Flow Builder Section - admin only
  {
    name: "Visual Flow Builder",
    href: "/visual-flow-builder",
    icon: Boxes,
    badge: "New",
    adminOnly: true,
  },
  {
    name: "Flow Builder",
    href: "/flows",
    icon: Workflow,
    badge: null,
    adminOnly: true,
  },
  // Form Builder - admin only
  {
    name: "Form Builder",
    href: "/form-builder", 
    icon: FileText,
    badge: null,
    adminOnly: true,
  },
  // Advanced Simulator - admin only
  {
    name: "Advanced Simulator",
    href: "/advanced-simulator",
    icon: Activity,
    badge: null,
    adminOnly: true,
  },
  // My Data Section
  {
    name: "Flow Data",
    href: "/flow-data",
    icon: FileBarChart,
    badge: null,
    isSubItem: true,
    adminOnly: true,
  },
  {
    name: "Form Data", 
    href: "/mongo-form-data-viewer",
    icon: Database,
    badge: "New",
    isSubItem: true,
    adminOnly: true,
  },
  // Settings Section
  {
    name: "TAT Config",
    href: "/tat-config",
    icon: Settings,
    badge: null,
    isSubItem: true,
    adminOnly: true,
  },
  {
    name: "User Management",
    href: "/user-management",
    icon: Users,
    badge: null,
    isSubItem: true,
    adminOnly: true,
  },
  {
    name: "Organisation Details",
    href: "/organization-settings",
    icon: Building2,
    badge: null,
    isSubItem: true,
    adminOnly: true,
  },
  {
    name: "Start Flow API",
    href: "/api-startflow",
    icon: Activity,
    badge: null,
    isSubItem: true,
    adminOnly: true,
  },
  {
    name: "API Documentation",
    href: "/api-documentation",
    icon: BookOpen,
    badge: null,
    isSubItem: true,
    adminOnly: true,
  },
  {
    name: "NDA & Security",
    href: "/nda-security",
    icon: Shield,
    badge: null,
    isSubItem: true,
    adminOnly: true,
  },
  {
    name: "Usage",
    href: "/usage",
    icon: TrendingUp,
    badge: null,
    isSubItem: true,
    adminOnly: true,
  },
  {
    name: "Payments",
    href: "/payments",
    icon: CreditCard,
    badge: null,
    isSubItem: true,
    adminOnly: true,
  },
  // Reports Section
  {
    name: "Analytics",
    href: "/",
    icon: BarChart3,
    badge: null,
    adminOnly: true,
  },
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
  
  // Filter navigation items based on user role
  const navigationItems = allNavigationItems.filter(item => 
    !item.adminOnly || isAdmin
  );

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
          "fixed md:static inset-y-0 left-0 z-30 transform transition-all duration-300 flex flex-col bg-white border-r border-gray-200 shadow-sm overflow-y-auto",
          sidebarOpen ? "translate-x-0 w-64" : "-translate-x-full md:translate-x-0 md:w-20"
        )}
      >
        {/* Mobile header inside sidebar */}
        <div className="flex md:hidden items-center justify-between h-16 px-4 border-b fixed top-0 left-0 w-64 bg-white z-50">
          <span className="font-semibold">Menu</span>
          <button onClick={closeSidebar} aria-label="Close sidebar">
            <X className="h-5 w-5" />
          </button>
        </div>
        
        {/* Desktop: Add top spacing to push content below header */}
        <div className="hidden md:block h-16" />
        
        {/* Mobile: Add top spacing for the mobile sidebar header */}
        <div className="block md:hidden h-16" />
        
        <nav className="px-3 md:px-4 flex-1 py-4">
        <div className="space-y-2">
          {navigationItems.map((item: any, index: number) => {
            const IconComponent = item.icon;
            // Show section headers only for admin users and at the right positions
            const showMyDataHeader = item.name === "Flow Data" && isAdmin && sidebarOpen;
            const showSettingsHeader = item.name === "TAT Config" && isAdmin && sidebarOpen;
            const showReportsHeader = item.name === "Analytics" && isAdmin && sidebarOpen;
            
            return (
              <div key={item.name}>
                {showMyDataHeader && (
                  <div className="px-3 py-2 mt-6 mb-2">
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Dashboard
                    </h3>
                  </div>
                )}
                {/* My Data Section Header */}
                {showMyDataHeader && (
                  <div className="px-3 py-2 mt-6 mb-2">
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      My Data
                    </h3>
                  </div>
                )}
                
                {/* Settings Section Header */}
                {showSettingsHeader && (
                  <div className="px-3 py-2 mt-6 mb-2">
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Settings
                    </h3>
                  </div>
                )}
                
                {/* Reports Section Header */}
                {showReportsHeader && (
                  <div className="px-3 py-2 mt-6 mb-2">
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Reports
                    </h3>
                  </div>
                )}
                
                <Link href={item.href}>
                  <div
                    className={cn(
                      "sidebar-nav-item flex items-center rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 transition group",
                      isActive(item.href) && "bg-gray-100 text-gray-900",
                      !sidebarOpen && "md:justify-center md:px-2",
                      item.isSubItem && sidebarOpen && "pl-6"
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
              </div>
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
