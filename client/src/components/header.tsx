import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, LogOut, User, Settings } from "lucide-react";
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
  const { user, logout, isLoggingOut } = useAuth();
  const [ , setLocation ] = useLocation();
  const { toggleSidebar, sidebarOpen } = useLayout();

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
      <header className="fixed top-0 inset-x-0 h-16 bg-white/80 backdrop-blur border-b border-gray-200 z-40">
        <div className="px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
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
              className="h-10 w-auto object-contain cursor-pointer"
              onClick={() => setLocation("/")}
            />
          </div>
          <div className="flex items-center space-x-4">
            <NotificationDropdown />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center space-x-3 p-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage 
                      alt="User profile"
                      className="profile-image"
                    />
                    <AvatarFallback>
                      {getInitials(user?.displayName)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden sm:inline text-sm font-medium text-gray-700">
                    {getDisplayName(user?.displayName)}
                  </span>
                  <ChevronDown className="h-4 w-4 text-gray-500" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onSelect={() => setLocation("/profile")}>
                  <User className="mr-2 h-4 w-4" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setLocation("/organization-settings") }>
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </DropdownMenuItem>
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

      {/* Page Header */}
  <div className="bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/60 border-b border-gray-200 px-6 py-4 mt-16 sticky top-16 z-30">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
            {description && (
              <p className="text-sm text-gray-600">{description}</p>
            )}
          </div>
          {actions && <div>{actions}</div>}
        </div>
      </div>
  {/* Overlay handled at layout level */}
    </>
  )
}
