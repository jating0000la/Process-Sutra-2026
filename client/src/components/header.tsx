import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { 
  ChevronDown, 
  LogOut, 
  User, 
  Settings,
  Clock,
  Users,
  Building2,
  Database,
  Activity,
  BookOpen,
  Shield,
  TrendingUp,
  CreditCard,
} from "lucide-react";
import { useLocation } from "wouter";
import { NotificationDropdown } from "@/components/notification-dropdown";
import { Menu, PanelLeftOpen } from "lucide-react";
import { useLayout } from "@/contexts/LayoutContext";

interface HeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}

export default function Header({ title, description, actions }: HeaderProps) {
  const { user, logout, isLoggingOut, dbUser } = useAuth();
  const [ , setLocation ] = useLocation();
  const { toggleSidebar, sidebarOpen } = useLayout();

  const isAdmin = dbUser?.role === 'admin';

  const handleLogout = async () => {
    // Logout function now handles redirect automatically
    await logout();
  };

  const getInitials = (displayName?: string | null) => {
    if (displayName) {
      const names = displayName.split(' ');
      if (names.length >= 2) {
        return `${names[0][0]}${names[1][0]}`.toUpperCase();
      }
      return names[0][0].toUpperCase();
    }
    return "U";
  };

  const getDisplayName = (displayName?: string | null) => {
    return displayName || "User";
  };

  return (
    <>
      {/* Navigation Header */}
      <header className="fixed top-0 inset-x-0 h-16 bg-white/80 backdrop-blur border-b border-gray-200 z-50">
        <div className="px-3 sm:px-4 lg:px-6 h-full flex items-center justify-between">
          <div className="flex items-center space-x-2 sm:space-x-3">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden h-9 w-9"
              onClick={toggleSidebar}
              aria-label="Toggle navigation"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div className="hidden md:block">
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleSidebar}
                aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
              >
                <PanelLeftOpen className={`h-5 w-5 transition-transform ${sidebarOpen ? '' : 'rotate-180'}`} />
              </Button>
            </div>
            <img
              src="/src/logo/ProcessSutra2.png"
              alt="ProcessSutra Logo"
              className="h-8 sm:h-10 w-auto object-contain cursor-pointer"
              onClick={() => setLocation("/")}
            />
          </div>
          <div className="flex items-center space-x-2 sm:space-x-3">
            <NotificationDropdown />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center space-x-2 sm:space-x-3 p-1.5 sm:p-2">
                  <Avatar className="h-7 w-7 sm:h-8 sm:w-8">
                    <AvatarImage 
                      alt="User profile"
                      className="profile-image"
                    />
                    <AvatarFallback className="text-xs sm:text-sm">
                      {getInitials(user?.name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden sm:inline text-sm font-medium text-gray-700">
                    {getDisplayName(user?.name)}
                  </span>
                  <ChevronDown className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-gray-500 hidden sm:block" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-1.5 text-sm">
                  <div className="font-medium">{getDisplayName(dbUser?.firstName && dbUser?.lastName ? `${dbUser.firstName} ${dbUser.lastName}` : user?.name)}</div>
                  <div className="text-xs text-gray-500">{dbUser?.email || user?.email}</div>
                  {dbUser?.role && (
                    <div className="mt-1">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        dbUser.role === 'admin' 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {dbUser.role.charAt(0).toUpperCase() + dbUser.role.slice(1)}
                      </span>
                    </div>
                  )}
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => setLocation("/profile")}>
                  <User className="mr-2 h-4 w-4" />
                  Profile
                </DropdownMenuItem>
                
                {isAdmin && (
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                      <Settings className="mr-2 h-4 w-4" />
                      Settings
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent className="w-56">
                      <DropdownMenuLabel>Configuration</DropdownMenuLabel>
                      <DropdownMenuItem onSelect={() => setLocation("/tat-config")}>
                        <Clock className="mr-2 h-4 w-4" />
                        TAT Config
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => setLocation("/user-management")}>
                        <Users className="mr-2 h-4 w-4" />
                        User Management
                      </DropdownMenuItem>
                      
                      <DropdownMenuSeparator />
                      <DropdownMenuLabel>Data Management</DropdownMenuLabel>
                      <DropdownMenuItem onSelect={() => setLocation("/data-management")}>
                        <Database className="mr-2 h-4 w-4" />
                        Export & Delete Data
                      </DropdownMenuItem>
                      
                      <DropdownMenuSeparator />
                      <DropdownMenuLabel>API & Integration</DropdownMenuLabel>
                      <DropdownMenuItem onSelect={() => setLocation("/api-startflow")}>
                        <Activity className="mr-2 h-4 w-4" />
                        Start Flow API
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => setLocation("/api-documentation")}>
                        <BookOpen className="mr-2 h-4 w-4" />
                        API Documentation
                      </DropdownMenuItem>
                      
                      <DropdownMenuSeparator />
                      <DropdownMenuLabel>Security & Compliance</DropdownMenuLabel>
                      <DropdownMenuItem onSelect={() => setLocation("/nda-security")}>
                        <Shield className="mr-2 h-4 w-4" />
                        NDA & Security
                      </DropdownMenuItem>
                      
                      <DropdownMenuSeparator />
                      <DropdownMenuLabel>Billing & Usage</DropdownMenuLabel>
                      <DropdownMenuItem onSelect={() => setLocation("/usage")}>
                        <TrendingUp className="mr-2 h-4 w-4" />
                        Usage
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => setLocation("/payments")} disabled>
                        <CreditCard className="mr-2 h-4 w-4" />
                        Payments
                        <span className="ml-auto text-xs text-gray-400">Soon</span>
                      </DropdownMenuItem>
                      
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onSelect={() => setLocation("/settings")}>
                        <Settings className="mr-2 h-4 w-4" />
                        All Settings
                      </DropdownMenuItem>
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                )}
                
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={handleLogout} disabled={isLoggingOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  {isLoggingOut ? 'Logging out...' : 'Log out'}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Spacer for fixed header - prevents content from being hidden */}
      <div className="h-16" aria-hidden="true" />
      
      {/* Page Header */}
      <div className="bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/60 border-b border-gray-200 px-3 sm:px-4 lg:px-6 py-3 sm:py-4 sticky top-16 z-30">
        <div className="flex flex-col gap-3 sm:gap-4">
          {/* Title Section */}
          <div className="flex-shrink-0">
            <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 line-clamp-1">{title}</h1>
            {description && (
              <p className="text-xs sm:text-sm text-gray-600 mt-0.5 sm:mt-1 line-clamp-2">{description}</p>
            )}
          </div>
          {/* Actions Section - Scrollable on mobile */}
          {actions && (
            <div className="overflow-x-auto -mx-3 sm:mx-0 px-3 sm:px-0 pb-1 sm:pb-0">
              <div className="flex items-center gap-2 min-w-max sm:min-w-0 sm:flex-wrap">
                {actions}
              </div>
            </div>
          )}
        </div>
      </div>
      {/* Overlay handled at layout level */}
    </>
  )
}
