import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
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
  Bell
} from "lucide-react";

const navigationItems = [
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
    badge: 5,
  },
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
    name: "Analytics",
    href: "/analytics",
    icon: BarChart3,
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
    name: "Reports",
    href: "/reports",
    icon: FileBarChart,
    badge: null,
  },
];

const adminItems = [
  {
    name: "User Management",
    href: "/admin/users",
    icon: Users,
    badge: null,
  },
  {
    name: "Settings",
    href: "/settings",
    icon: Settings,
    badge: null,
  },
];

export default function Sidebar() {
  const [location] = useLocation();
  const { user } = useAuth();

  const isActive = (href: string) => {
    if (href === "/") {
      return location === "/";
    }
    return location.startsWith(href);
  };

  return (
    <aside className="bg-white w-64 shadow-sm border-r border-gray-200 overflow-y-auto">
      <nav className="mt-8 px-4">
        <div className="space-y-2">
          {navigationItems.map((item) => {
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
        
        <div className="mt-8">
          <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Administration
          </h3>
          <div className="mt-2 space-y-2">
            {adminItems.map((item) => {
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
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>
    </aside>
  );
}
