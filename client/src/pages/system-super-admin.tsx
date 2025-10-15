import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AppLayout from "@/components/app-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import {
  Users,
  Shield,
  Activity,
  Database,
  Building2,
  RefreshCw,
  Download,
  Search,
  Eye,
  EyeOff,
  CheckCircle,
  XCircle,
  AlertCircle
} from "lucide-react";

interface SystemStatistics {
  system: {
    totalOrganizations: number;
    activeOrganizations: number;
    inactiveOrganizations: number;
  };
  users: {
    total: number;
    active: number;
    inactive: number;
    suspended: number;
    activePercentage: string;
  };
  tasks: {
    total: number;
    completed: number;
    completionRate: string;
  };
  data: {
    totalFileUploads: number;
  };
  byOrganization: Array<{
    organizationId: string;
    organizationName: string;
    users: number;
    activeTasks: number;
  }>;
}

interface Organization {
  id: string;
  name: string;
  domain: string;
  subdomain: string;
  logoUrl: string;
  isActive: boolean;
  planType: string;
  maxUsers: number;
  createdAt: string;
  totalUsers?: number;
  activeUsers?: number;
  totalTasks?: number;
  completedTasks?: number;
  taskCompletionRate?: string;
}

interface EnrichedUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  department: string;
  status: string;
  isSuperAdmin: boolean;
  lastLoginAt: string;
  isOnline: boolean;
  organizationId: string;
  organizationName: string;
  organizationDomain: string;
  location: any;
  deviceType: string;
  browserName: string;
  ipAddress: string;
}

export default function SuperAdmin() {
  const { toast } = useToast();
  const { dbUser } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedOrg, setSelectedOrg] = useState<string>("all");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedOrgForToggle, setSelectedOrgForToggle] = useState<Organization | null>(null);
  const [orgStatusDialog, setOrgStatusDialog] = useState(false);

  // Check if user is actually a super admin
  const isSuperAdmin = dbUser?.isSuperAdmin === true;

  // If not super admin, show access denied
  if (!isSuperAdmin) {
    return (
      <AppLayout title="Access Denied">
        <div className="flex items-center justify-center min-h-[60vh]">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <Shield className="h-6 w-6" />
                Access Denied
              </CardTitle>
              <CardDescription>
                This area is restricted to System Super Administrators only.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Super Admin access is required to view this page. This is a system-level
                administrative area above all organizations. If you believe you should have
                access, please contact your system administrator.
              </p>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  // Fetch system-wide statistics
  const { data: systemStats, isLoading: statsLoading, refetch: refetchStats } = useQuery<SystemStatistics>({
    queryKey: ["/api/super-admin/system-statistics"],
    refetchInterval: autoRefresh ? 30000 : false,
  });

  // Fetch all organizations
  const { data: organizations, isLoading: orgsLoading, refetch: refetchOrgs } = useQuery<Organization[]>({
    queryKey: ["/api/super-admin/organizations"],
    refetchInterval: autoRefresh ? 60000 : false,
  });

  // Fetch all users (optionally filtered by organization)
  const { data: users, isLoading: usersLoading, refetch: refetchUsers } = useQuery<EnrichedUser[]>({
    queryKey: ["/api/super-admin/all-users", selectedOrg],
    queryFn: async () => {
      const url = selectedOrg === "all" 
        ? "/api/super-admin/all-users"
        : `/api/super-admin/all-users?organizationId=${selectedOrg}`;
      const response = await fetch(url, { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch users");
      return response.json();
    },
    refetchInterval: autoRefresh ? 30000 : false,
  });

  // Toggle organization status mutation
  const toggleOrgMutation = useMutation({
    mutationFn: async (data: { orgId: string; isActive: boolean }) => {
      const response = await fetch(`/api/super-admin/organizations/${data.orgId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ isActive: data.isActive }),
      });
      if (!response.ok) throw new Error("Failed to update organization status");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Organization status updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/organizations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/system-statistics"] });
      setOrgStatusDialog(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Change user status mutation
  const changeUserStatusMutation = useMutation({
    mutationFn: async (data: { userId: string; status: string }) => {
      const response = await fetch(`/api/super-admin/users/${data.userId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: data.status }),
      });
      if (!response.ok) throw new Error("Failed to update user status");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "User status updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/all-users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/system-statistics"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Filter users
  const filteredUsers = users?.filter(user => {
    const matchesSearch = 
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.organizationName?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || user.status === statusFilter;

    return matchesSearch && matchesStatus;
  }) || [];

  // Manual refresh
  const handleRefresh = () => {
    refetchStats();
    refetchOrgs();
    refetchUsers();
    toast({
      title: "Refreshed",
      description: "Data has been refreshed successfully",
    });
  };

  // Export organizations
  const handleExportOrgs = () => {
    const csv = [
      ["Name", "Domain", "Status", "Plan", "Users", "Active Users", "Tasks", "Completion Rate", "Created"].join(","),
      ...(organizations || []).map(org => [
        org.name,
        org.domain,
        org.isActive ? "Active" : "Inactive",
        org.planType,
        org.totalUsers || 0,
        org.activeUsers || 0,
        org.totalTasks || 0,
        `${org.taskCompletionRate || 0}%`,
        new Date(org.createdAt).toLocaleDateString()
      ].join(","))
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `organizations-export-${new Date().toISOString()}.csv`;
    a.click();
  };

  // Export users
  const handleExportUsers = () => {
    const csv = [
      ["Email", "Name", "Organization", "Role", "Status", "Super Admin", "Last Login"].join(","),
      ...filteredUsers.map(user => [
        user.email,
        `${user.firstName} ${user.lastName}`,
        user.organizationName,
        user.role,
        user.status,
        user.isSuperAdmin ? "Yes" : "No",
        user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : "Never"
      ].join(","))
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `all-users-export-${new Date().toISOString()}.csv`;
    a.click();
  };

  return (
    <AppLayout title="System Super Admin">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Shield className="h-8 w-8 text-red-600" />
              System Super Admin
            </h1>
            <p className="text-muted-foreground">
              Cross-organization system management and monitoring
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <div className="flex items-center gap-2">
              <Checkbox
                id="auto-refresh"
                checked={autoRefresh}
                onCheckedChange={(checked) => setAutoRefresh(checked as boolean)}
              />
              <Label htmlFor="auto-refresh" className="text-sm cursor-pointer">
                Auto-refresh
              </Label>
            </div>
          </div>
        </div>

        {/* System Statistics */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Organizations</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{systemStats?.system.totalOrganizations || 0}</div>
              <p className="text-xs text-muted-foreground">
                {systemStats?.system.activeOrganizations || 0} active
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{systemStats?.users.total || 0}</div>
              <p className="text-xs text-muted-foreground">
                {systemStats?.users.activePercentage}% active
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{systemStats?.tasks.total || 0}</div>
              <p className="text-xs text-muted-foreground">
                {systemStats?.tasks.completionRate}% completed
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Files Uploaded</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{systemStats?.data.totalFileUploads || 0}</div>
              <p className="text-xs text-muted-foreground">Across all organizations</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="organizations">Organizations</TabsTrigger>
            <TabsTrigger value="users">All Users</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Organizations by Activity</CardTitle>
                <CardDescription>User and task counts per organization</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {systemStats?.byOrganization?.map((org) => (
                    <div key={org.organizationId} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <div className="font-medium">{org.organizationName}</div>
                        <div className="text-sm text-muted-foreground">
                          {org.users} users • {org.activeTasks} active tasks
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Organizations Tab */}
          <TabsContent value="organizations" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Organizations</CardTitle>
                    <CardDescription>Manage all tenant organizations</CardDescription>
                  </div>
                  <Button size="sm" onClick={handleExportOrgs}>
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Organization</TableHead>
                        <TableHead>Domain</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Plan</TableHead>
                        <TableHead>Users</TableHead>
                        <TableHead>Tasks</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orgsLoading ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-8">
                            Loading organizations...
                          </TableCell>
                        </TableRow>
                      ) : organizations?.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                            No organizations found
                          </TableCell>
                        </TableRow>
                      ) : (
                        organizations?.map((org) => (
                          <TableRow key={org.id}>
                            <TableCell>
                              <div>
                                <div className="font-medium">{org.name}</div>
                                {org.subdomain && (
                                  <div className="text-sm text-muted-foreground">{org.subdomain}</div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>{org.domain}</TableCell>
                            <TableCell>
                              <Badge variant={org.isActive ? "default" : "secondary"}>
                                {org.isActive ? "Active" : "Inactive"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{org.planType}</Badge>
                            </TableCell>
                            <TableCell>
                              {org.activeUsers}/{org.totalUsers}
                            </TableCell>
                            <TableCell>
                              {org.completedTasks}/{org.totalTasks} ({org.taskCompletionRate}%)
                            </TableCell>
                            <TableCell>
                              {new Date(org.createdAt).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setSelectedOrgForToggle(org);
                                  setOrgStatusDialog(true);
                                }}
                              >
                                {org.isActive ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>All Users</CardTitle>
                    <CardDescription>Cross-organization user management</CardDescription>
                  </div>
                  <Button size="sm" onClick={handleExportUsers}>
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {/* Filters */}
                <div className="flex gap-4 mb-4">
                  <div className="flex-1">
                    <Label htmlFor="search-users">Search</Label>
                    <div className="relative">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="search-users"
                        placeholder="Search users or organizations..."
                        className="pl-8"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="org-filter">Organization</Label>
                    <Select value={selectedOrg} onValueChange={setSelectedOrg}>
                      <SelectTrigger id="org-filter" className="w-[200px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Organizations</SelectItem>
                        {organizations?.map(org => (
                          <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="status-filter-users">Status</Label>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger id="status-filter-users" className="w-[150px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                        <SelectItem value="suspended">Suspended</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Users Table */}
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Organization</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Super Admin</TableHead>
                        <TableHead>Last Login</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {usersLoading ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8">
                            Loading users...
                          </TableCell>
                        </TableRow>
                      ) : filteredUsers.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                            No users found
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredUsers.map((user) => (
                          <TableRow key={user.id}>
                            <TableCell>
                              <div>
                                <div className="font-medium">
                                  {user.firstName} {user.lastName}
                                </div>
                                <div className="text-sm text-muted-foreground">{user.email}</div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div>
                                <div className="font-medium">{user.organizationName}</div>
                                <div className="text-sm text-muted-foreground">{user.organizationDomain}</div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={user.role === "admin" ? "default" : "secondary"}>
                                {user.role}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  user.status === "active"
                                    ? "default"
                                    : user.status === "suspended"
                                    ? "destructive"
                                    : "secondary"
                                }
                              >
                                {user.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {user.isSuperAdmin ? (
                                <Badge variant="destructive">
                                  <Shield className="h-3 w-3 mr-1" />
                                  Yes
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground">No</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <span className="text-sm">
                                {user.lastLoginAt
                                  ? new Date(user.lastLoginAt).toLocaleString()
                                  : "Never"}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              <Select
                                value={user.status}
                                onValueChange={(value) =>
                                  changeUserStatusMutation.mutate({ userId: user.id, status: value })
                                }
                              >
                                <SelectTrigger className="w-[120px]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="active">Active</SelectItem>
                                  <SelectItem value="inactive">Inactive</SelectItem>
                                  <SelectItem value="suspended">Suspended</SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination Info */}
                <div className="flex justify-between items-center mt-4">
                  <p className="text-sm text-muted-foreground">
                    Showing {filteredUsers.length} of {users?.length || 0} users
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Organization Status Toggle Dialog */}
      <Dialog open={orgStatusDialog} onOpenChange={setOrgStatusDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Toggle Organization Status</DialogTitle>
            <DialogDescription>
              {selectedOrgForToggle?.isActive
                ? "Deactivating this organization will prevent all its users from accessing the system."
                : "Activating this organization will allow its users to access the system."}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="font-medium">{selectedOrgForToggle?.name}</p>
            <p className="text-sm text-muted-foreground">{selectedOrgForToggle?.domain}</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOrgStatusDialog(false)}>
              Cancel
            </Button>
            <Button
              variant={selectedOrgForToggle?.isActive ? "destructive" : "default"}
              onClick={() => {
                if (selectedOrgForToggle) {
                  toggleOrgMutation.mutate({
                    orgId: selectedOrgForToggle.id,
                    isActive: !selectedOrgForToggle.isActive,
                  });
                }
              }}
              disabled={toggleOrgMutation.isPending}
            >
              {toggleOrgMutation.isPending
                ? "Updating..."
                : selectedOrgForToggle?.isActive
                ? "Deactivate"
                : "Activate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
