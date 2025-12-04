
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
  Boxes,
  Shield,
} from "lucide-react";

// All navigation items in the correct order
const allNavigationItems = [
  // Dashboard Section - visible to all users
  {
    name: "Dashboard", 
    href: "/",
    icon: LayoutDashboard,
    badge: null,
    adminOnly: false,
    section: "main",
  },
  {
    name: "My Tasks", 
    href: "/tasks",
    icon: CheckSquare,
    badge: null,
    adminOnly: false,
    section: "main",
  },
  // Builder Tools Section - admin only
  {
    name: "Flow Builder",
    href: "/visual-flow-builder",
    icon: Workflow,
    badge: null,
    adminOnly: true,
    section: "builders",
  },
  {
    name: "Form Builder",
    href: "/form-builder", 
    icon: FileText,
    badge: null,
    adminOnly: true,
    section: "builders",
  },
  {
    name: "Advanced Simulator",
    href: "/advanced-simulator",
    icon: Activity,
    badge: null,
    adminOnly: true,
    section: "builders",
  },
  // Data Section - admin only
  {
    name: "Flow Data",
    href: "/flow-data",
    icon: FileBarChart,
    badge: null,
    adminOnly: true,
    section: "data",
  },
  {
    name: "Form Data", 
    href: "/mongo-form-data-viewer",
    icon: Database,
    badge: "New",
    adminOnly: true,
    section: "data",
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
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
          onClick={closeSidebar}
        />
      )}
      <aside
        className={cn(
          "fixed md:static inset-y-0 left-0 z-40 transform transition-all duration-300 flex flex-col bg-white border-r border-gray-200 shadow-sm overflow-y-auto",
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
              const prevItem = navigationItems[index - 1];
              
              // Determine if we need to show a section header
              const showSectionHeader = 
                sidebarOpen && 
                prevItem && 
                prevItem.section !== item.section;
              
              // Get section title
              const getSectionTitle = (section: string) => {
                switch (section) {
                  case "builders": return "Builder Tools";
                  case "data": return "My Data";
                  case "analytics": return "Analytics";
                  case "settings": return "Settings";
                  case "superadmin": return "System Control";
                  default: return "";
                }
              };
              
              return (
                <div key={item.name}>
                  {/* Section Header */}
                  {showSectionHeader && (
                    <div className="px-3 py-2 mt-6 mb-2">
                      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        {getSectionTitle(item.section)}
                      </h3>
                    </div>
                  )}
                  
                  <Link href={item.href}>
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
