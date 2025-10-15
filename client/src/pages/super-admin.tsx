import { useState, useEffect } from "react";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import {
  Users,
  UserCheck,
  UserX,
  Shield,
  Activity,
  Database,
  FileText,
  Upload,
  MapPin,
  Monitor,
  Smartphone,
  Tablet,
  TrendingUp,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
  LogOut,
  Search,
  Filter,
  Download,
  RefreshCw,
  Building2,
  Globe,
  Settings,
  Eye,
  EyeOff
} from "lucide-react";

interface Statistics {
  users: {
    total: number;
    active: number;
    inactive: number;
    suspended: number;
    currentlyOnline: number;
    admins: number;
    regularUsers: number;
    byDepartment: Record<string, number>;
    newLast30Days: number;
    activePercentage: string;
  };
  tasks: {
    total: number;
    pending: number;
    completed: number;
    overdue: number;
    cancelled: number;
    completionRate: string;
  };
  data: {
    totalFlows: number;
    totalFormResponses: number;
    totalFileUploads: number;
    avgResponsesPerFlow: string;
  };
  activity: {
    todayLogins: number;
    totalLogins: number;
    topLocations: Array<{ country: string; count: number }>;
  };
  devices: {
    total: number;
    desktop: number;
    mobile: number;
    tablet: number;
    trusted: number;
    trustedPercentage: string;
  };
}

interface EnrichedUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  department: string;
  status: string;
  lastLoginAt: string;
  isOnline: boolean;
  location: any;
  deviceType: string;
  browserName: string;
  ipAddress: string;
  sessionDuration: number;
}

export default function SuperAdmin() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [bulkActionDialog, setBulkActionDialog] = useState(false);
  const [bulkStatus, setBulkStatus] = useState<string>("active");
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Fetch statistics
  const { data: statistics, isLoading: statsLoading, refetch: refetchStats } = useQuery<Statistics>({
    queryKey: ["/api/super-admin/statistics"],
    refetchInterval: autoRefresh ? 30000 : false, // Auto-refresh every 30 seconds
  });

  // Fetch active users
  const { data: users, isLoading: usersLoading, refetch: refetchUsers } = useQuery<EnrichedUser[]>({
    queryKey: ["/api/super-admin/active-users"],
    refetchInterval: autoRefresh ? 30000 : false,
  });

  // Fetch user locations
  const { data: locations } = useQuery({
    queryKey: ["/api/super-admin/user-locations"],
    refetchInterval: autoRefresh ? 60000 : false,
  });

  // Bulk status change mutation
  const bulkStatusMutation = useMutation({
    mutationFn: async (data: { userIds: string[]; newStatus: string; reason?: string }) => {
      const response = await fetch("/api/super-admin/bulk-status-change", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to change user status");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "User status updated successfully",
      });
      setSelectedUsers(new Set());
      setBulkActionDialog(false);
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/active-users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/statistics"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Force logout mutation
  const forceLogoutMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await fetch(`/api/super-admin/force-logout/${userId}`, {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to force logout");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "User logged out successfully",
      });
      refetchUsers();
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
      user.department?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || user.status === statusFilter;
    const matchesRole = roleFilter === "all" || user.role === roleFilter;

    return matchesSearch && matchesStatus && matchesRole;
  }) || [];

  // Handle select all
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedUsers(new Set(filteredUsers.map(u => u.id)));
    } else {
      setSelectedUsers(new Set());
    }
  };

  // Handle select user
  const handleSelectUser = (userId: string, checked: boolean) => {
    const newSelected = new Set(selectedUsers);
    if (checked) {
      newSelected.add(userId);
    } else {
      newSelected.delete(userId);
    }
    setSelectedUsers(newSelected);
  };

  // Handle bulk status change
  const handleBulkStatusChange = () => {
    if (selectedUsers.size === 0) {
      toast({
        title: "No users selected",
        description: "Please select at least one user",
        variant: "destructive",
      });
      return;
    }
    bulkStatusMutation.mutate({
      userIds: Array.from(selectedUsers),
      newStatus: bulkStatus,
    });
  };

  // Manual refresh
  const handleRefresh = () => {
    refetchStats();
    refetchUsers();
    toast({
      title: "Refreshed",
      description: "Data has been refreshed successfully",
    });
  };

  // Export data
  const handleExport = () => {
    const csv = [
      ["Email", "Name", "Role", "Department", "Status", "Last Login", "Location", "Device"].join(","),
      ...filteredUsers.map(user => [
        user.email,
        `${user.firstName} ${user.lastName}`,
        user.role,
        user.department || "N/A",
        user.status,
        user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : "Never",
        user.location ? (user.location as any).country : "N/A",
        user.deviceType || "N/A"
      ].join(","))
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `users-export-${new Date().toISOString()}.csv`;
    a.click();
  };

  return (
    <AppLayout title="Super Admin Control Panel">
      <div className="space-y-6">
        {/* Header with Actions */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Super Admin Control Panel</h1>
            <p className="text-muted-foreground">
              Monitor and manage users, activity, and system statistics
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
            >
              <Download className="h-4 w-4 mr-2" />
              Export
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

        {/* Statistics Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* User Statistics */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics?.users.total || 0}</div>
              <p className="text-xs text-muted-foreground">
                {statistics?.users.activePercentage}% active
              </p>
              <div className="flex gap-2 mt-2">
                <Badge variant="default" className="text-xs">
                  <UserCheck className="h-3 w-3 mr-1" />
                  {statistics?.users.active || 0}
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  <UserX className="h-3 w-3 mr-1" />
                  {statistics?.users.inactive || 0}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Currently Online */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Currently Online</CardTitle>
              <Activity className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {statistics?.users.currentlyOnline || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Active in last 10 minutes
              </p>
              <div className="mt-2">
                <Badge variant="outline" className="text-xs">
                  Today: {statistics?.activity.todayLogins || 0} logins
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Task Statistics */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tasks</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics?.tasks.total || 0}</div>
              <p className="text-xs text-muted-foreground">
                {statistics?.tasks.completionRate}% completed
              </p>
              <div className="flex gap-2 mt-2">
                <Badge variant="secondary" className="text-xs">
                  Pending: {statistics?.tasks.pending || 0}
                </Badge>
                <Badge variant="destructive" className="text-xs">
                  Overdue: {statistics?.tasks.overdue || 0}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Data Count */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Data & Files</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics?.data.totalFileUploads || 0}</div>
              <p className="text-xs text-muted-foreground">Total file uploads</p>
              <div className="flex gap-2 mt-2">
                <Badge variant="outline" className="text-xs">
                  <FileText className="h-3 w-3 mr-1" />
                  {statistics?.data.totalFormResponses || 0} responses
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Additional Statistics Row */}
        <div className="grid gap-4 md:grid-cols-3">
          {/* Device Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Device Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Monitor className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Desktop</span>
                  </div>
                  <Badge variant="secondary">{statistics?.devices.desktop || 0}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Smartphone className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Mobile</span>
                  </div>
                  <Badge variant="secondary">{statistics?.devices.mobile || 0}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Tablet className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Tablet</span>
                  </div>
                  <Badge variant="secondary">{statistics?.devices.tablet || 0}</Badge>
                </div>
                <div className="flex items-center justify-between pt-2 border-t">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-green-600" />
                    <span className="text-sm">Trusted</span>
                  </div>
                  <Badge variant="default">{statistics?.devices.trustedPercentage}%</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Top Locations */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Top Login Locations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {statistics?.activity.topLocations.slice(0, 5).map((loc, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{loc.country}</span>
                    </div>
                    <Badge variant="outline">{loc.count}</Badge>
                  </div>
                ))}
                {(!statistics?.activity.topLocations || statistics.activity.topLocations.length === 0) && (
                  <p className="text-sm text-muted-foreground">No location data available</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Department Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">User by Department</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {statistics?.users.byDepartment && 
                  Object.entries(statistics.users.byDepartment)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 5)
                    .map(([dept, count]) => (
                      <div key={dept} className="flex items-center justify-between">
                        <span className="text-sm">{dept}</span>
                        <Badge variant="outline">{count}</Badge>
                      </div>
                    ))}
                {(!statistics?.users.byDepartment || Object.keys(statistics.users.byDepartment).length === 0) && (
                  <p className="text-sm text-muted-foreground">No department data available</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* User Management Section */}
        <Card>
          <CardHeader>
            <CardTitle>User Management</CardTitle>
            <CardDescription>
              View and manage all users, their status, and activity
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Filters and Actions */}
            <div className="flex flex-col gap-4 mb-4">
              <div className="flex gap-4 items-end">
                <div className="flex-1">
                  <Label htmlFor="search">Search Users</Label>
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="search"
                      placeholder="Search by name, email, or department..."
                      className="pl-8"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="status-filter">Status</Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger id="status-filter" className="w-[150px]">
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
                <div>
                  <Label htmlFor="role-filter">Role</Label>
                  <Select value={roleFilter} onValueChange={setRoleFilter}>
                    <SelectTrigger id="role-filter" className="w-[150px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Roles</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="user">User</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Bulk Actions */}
              {selectedUsers.size > 0 && (
                <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                  <span className="text-sm font-medium">
                    {selectedUsers.size} user(s) selected
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setBulkActionDialog(true)}
                  >
                    Bulk Actions
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setSelectedUsers(new Set())}
                  >
                    Clear Selection
                  </Button>
                </div>
              )}
            </div>

            {/* Users Table */}
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">
                      <Checkbox
                        checked={filteredUsers.length > 0 && selectedUsers.size === filteredUsers.length}
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Online</TableHead>
                    <TableHead>Last Login</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Device</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usersLoading ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-8">
                        Loading users...
                      </TableCell>
                    </TableRow>
                  ) : filteredUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                        No users found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedUsers.has(user.id)}
                            onCheckedChange={(checked) => handleSelectUser(user.id, checked as boolean)}
                          />
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">
                              {user.firstName} {user.lastName}
                            </div>
                            <div className="text-sm text-muted-foreground">{user.email}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={user.role === "admin" ? "default" : "secondary"}>
                            {user.role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{user.department || "N/A"}</span>
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
                          {user.isOnline ? (
                            <Badge variant="default" className="bg-green-600">
                              <Activity className="h-3 w-3 mr-1" />
                              Online
                            </Badge>
                          ) : (
                            <Badge variant="outline">Offline</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">
                            {user.lastLoginAt
                              ? new Date(user.lastLoginAt).toLocaleString()
                              : "Never"}
                          </span>
                        </TableCell>
                        <TableCell>
                          {user.location ? (
                            <div className="flex items-center gap-1 text-sm">
                              <MapPin className="h-3 w-3" />
                              {(user.location as any).city || (user.location as any).country}
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">N/A</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm">
                            {user.deviceType === "desktop" && <Monitor className="h-3 w-3" />}
                            {user.deviceType === "mobile" && <Smartphone className="h-3 w-3" />}
                            {user.deviceType === "tablet" && <Tablet className="h-3 w-3" />}
                            {user.deviceType || "N/A"}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {user.isOnline && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => forceLogoutMutation.mutate(user.id)}
                              disabled={forceLogoutMutation.isPending}
                            >
                              <LogOut className="h-4 w-4" />
                            </Button>
                          )}
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
      </div>

      {/* Bulk Action Dialog */}
      <Dialog open={bulkActionDialog} onOpenChange={setBulkActionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk Status Change</DialogTitle>
            <DialogDescription>
              Change status for {selectedUsers.size} selected user(s)
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="bulk-status">New Status</Label>
            <Select value={bulkStatus} onValueChange={setBulkStatus}>
              <SelectTrigger id="bulk-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkActionDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleBulkStatusChange} disabled={bulkStatusMutation.isPending}>
              {bulkStatusMutation.isPending ? "Updating..." : "Update Status"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
