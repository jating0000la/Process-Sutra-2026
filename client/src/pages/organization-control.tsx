import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AppLayout from "@/components/app-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  AlertCircle,
  Plus,
  Edit,
  Trash2,
  UserCheck,
  DollarSign,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Settings,
  UserCog,
  FileText,
  HardDrive,
  Zap,
  Crown,
  Ban,
  PlayCircle
} from "lucide-react";

interface Organization {
  id: string;
  name: string;
  domain: string;
  subdomain: string;
  logoUrl: string;
  isActive: boolean;
  isSuspended: boolean;
  suspensionReason: string;
  planType: string;
  pricingTier: string;
  monthlyPrice: number;
  maxUsers: number;
  maxFlows: number;
  maxStorage: number;
  healthScore: number;
  healthStatus: string;
  ownerId: string;
  ownerEmail: string;
  createdAt: string;
  totalUsers?: number;
  activeUsers?: number;
  totalTasks?: number;
  completedTasks?: number;
  taskCompletionRate?: string;
  currentFlows?: number;
  currentStorage?: number;
  usageBasedBilling?: boolean;
  pricePerFlow?: number;
  pricePerUser?: number;
  pricePerGb?: number;
}

interface SystemStatistics {
  system: {
    totalOrganizations: number;
    activeOrganizations: number;
    suspendedOrganizations: number;
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
  billing: {
    totalRevenue: number;
    monthlyRecurring: number;
    averageRevenuePerOrg: number;
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
  isSuperAdmin: boolean;
  lastLoginAt: string;
  isOnline: boolean;
  organizationId: string;
  organizationName: string;
  organizationDomain: string;
}

export default function OrganizationControl() {
  const { toast } = useToast();
  const { dbUser } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedOrg, setSelectedOrg] = useState<string>("all");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  
  // Dialogs
  const [createOrgDialog, setCreateOrgDialog] = useState(false);
  const [editOrgDialog, setEditOrgDialog] = useState(false);
  const [deleteOrgDialog, setDeleteOrgDialog] = useState(false);
  const [suspendOrgDialog, setSuspendOrgDialog] = useState(false);
  const [transferOwnerDialog, setTransferOwnerDialog] = useState(false);
  const [pricingDialog, setPricingDialog] = useState(false);
  
  const [selectedOrgForAction, setSelectedOrgForAction] = useState<Organization | null>(null);
  
  // Form states
  const [newOrg, setNewOrg] = useState({
    name: "",
    domain: "",
    subdomain: "",
    companyName: "",
    planType: "free",
    maxUsers: 50,
    ownerEmail: ""
  });
  
  const [suspensionReason, setSuspensionReason] = useState("");
  const [newOwnerEmail, setNewOwnerEmail] = useState("");

  // Check if user is actually a super admin
  const isSuperAdmin = dbUser?.isSuperAdmin === true;

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
                Super Admin access is required to view this page. If you believe you should have
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

  // Create organization mutation
  const createOrgMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch("/api/super-admin/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to create organization");
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Organization created successfully" });
      setCreateOrgDialog(false);
      setNewOrg({ name: "", domain: "", subdomain: "", companyName: "", planType: "free", maxUsers: 50, ownerEmail: "" });
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/organizations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/system-statistics"] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Update organization mutation
  const updateOrgMutation = useMutation({
    mutationFn: async (data: { id: string; updates: any }) => {
      const response = await fetch(`/api/super-admin/organizations/${data.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data.updates),
      });
      if (!response.ok) throw new Error("Failed to update organization");
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Organization updated successfully" });
      setEditOrgDialog(false);
      setPricingDialog(false);
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/organizations"] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Suspend/Resume organization mutation
  const toggleSuspensionMutation = useMutation({
    mutationFn: async (data: { orgId: string; isSuspended: boolean; reason?: string }) => {
      const response = await fetch(`/api/super-admin/organizations/${data.orgId}/suspend`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ isSuspended: data.isSuspended, reason: data.reason }),
      });
      if (!response.ok) throw new Error("Failed to update suspension status");
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Organization suspension status updated" });
      setSuspendOrgDialog(false);
      setSuspensionReason("");
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/organizations"] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Delete organization mutation
  const deleteOrgMutation = useMutation({
    mutationFn: async (orgId: string) => {
      const response = await fetch(`/api/super-admin/organizations/${orgId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to delete organization");
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Organization deleted successfully" });
      setDeleteOrgDialog(false);
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/organizations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/system-statistics"] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Transfer ownership mutation
  const transferOwnerMutation = useMutation({
    mutationFn: async (data: { orgId: string; newOwnerEmail: string }) => {
      const response = await fetch(`/api/super-admin/organizations/${data.orgId}/transfer-owner`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ newOwnerEmail: data.newOwnerEmail }),
      });
      if (!response.ok) throw new Error("Failed to transfer ownership");
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Ownership transferred successfully" });
      setTransferOwnerDialog(false);
      setNewOwnerEmail("");
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/organizations"] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
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
      toast({ title: "Success", description: "User status updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/all-users"] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
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
    toast({ title: "Refreshed", description: "Data has been refreshed successfully" });
  };

  // Export organizations
  const handleExportOrgs = () => {
    const csv = [
      ["Name", "Domain", "Status", "Suspended", "Plan", "Health Score", "Users", "Flows", "Storage", "Owner", "Created"].join(","),
      ...(organizations || []).map(org => [
        org.name,
        org.domain,
        org.isActive ? "Active" : "Inactive",
        org.isSuspended ? "Yes" : "No",
        org.pricingTier,
        org.healthScore,
        `${org.activeUsers}/${org.totalUsers}`,
        `${org.currentFlows}/${org.maxFlows}`,
        `${org.currentStorage}/${org.maxStorage}MB`,
        org.ownerEmail,
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

  const getHealthBadge = (score: number, status: string) => {
    if (score >= 80) return <Badge className="bg-green-600">Healthy</Badge>;
    if (score >= 50) return <Badge className="bg-yellow-600">Warning</Badge>;
    return <Badge className="bg-red-600">Critical</Badge>;
  };

  return (
    <AppLayout title="Organization Control">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Shield className="h-8 w-8 text-blue-600" />
              Organization Control Center
            </h1>
            <p className="text-muted-foreground">
              Comprehensive multi-tenant organization management and control
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button variant="default" size="sm" onClick={() => setCreateOrgDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Organization
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
                {systemStats?.system.activeOrganizations || 0} active · {systemStats?.system.suspendedOrganizations || 0} suspended
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
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{((systemStats?.billing?.totalRevenue || 0) / 100).toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">
                ₹{((systemStats?.billing?.monthlyRecurring || 0) / 100).toFixed(2)}/mo recurring
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Revenue/Org</CardTitle>
              <TrendingUp className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{((systemStats?.billing?.averageRevenuePerOrg || 0) / 100).toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">Per organization</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="organizations">Organizations</TabsTrigger>
            <TabsTrigger value="users">All Users</TabsTrigger>
            <TabsTrigger value="billing">Billing & Usage</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Top Organizations by Health Score</CardTitle>
                  <CardDescription>Organizations performing well</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {organizations?.sort((a, b) => b.healthScore - a.healthScore).slice(0, 5).map((org) => (
                      <div key={org.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <div className="font-medium">{org.name}</div>
                          <div className="text-sm text-muted-foreground">{org.domain}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          {getHealthBadge(org.healthScore, org.healthStatus)}
                          <span className="font-bold">{org.healthScore}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Organizations Requiring Attention</CardTitle>
                  <CardDescription>Low health scores or issues</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {organizations?.filter(o => o.healthScore < 70 || o.isSuspended).slice(0, 5).map((org) => (
                      <div key={org.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <div className="font-medium">{org.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {org.isSuspended ? "Suspended" : `Health: ${org.healthScore}`}
                          </div>
                        </div>
                        {org.isSuspended ? (
                          <Badge variant="destructive"><Ban className="h-3 w-3 mr-1" />Suspended</Badge>
                        ) : (
                          getHealthBadge(org.healthScore, org.healthStatus)
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
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
                        <TableHead>Owner</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Plan</TableHead>
                        <TableHead>Health</TableHead>
                        <TableHead>Users</TableHead>
                        <TableHead>Usage</TableHead>
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
                                <div className="text-sm text-muted-foreground">{org.domain}</div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">{org.ownerEmail || "No owner"}</div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col gap-1">
                                <Badge variant={org.isActive ? "default" : "secondary"}>
                                  {org.isActive ? "Active" : "Inactive"}
                                </Badge>
                                {org.isSuspended && (
                                  <Badge variant="destructive" className="text-xs">
                                    <Ban className="h-3 w-3 mr-1" />
                                    Suspended
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{org.pricingTier}</Badge>
                            </TableCell>
                            <TableCell>
                              {getHealthBadge(org.healthScore, org.healthStatus)}
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                {org.activeUsers}/{org.totalUsers}
                                <span className="text-muted-foreground"> of {org.maxUsers}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-xs">
                                <div>Flows: {org.currentFlows}/{org.maxFlows}</div>
                                <div>Storage: {org.currentStorage}MB/{org.maxStorage}MB</div>
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex gap-1 justify-end">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setSelectedOrgForAction(org);
                                    setEditOrgDialog(true);
                                  }}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setSelectedOrgForAction(org);
                                    setPricingDialog(true);
                                  }}
                                >
                                  <DollarSign className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setSelectedOrgForAction(org);
                                    setSuspendOrgDialog(true);
                                  }}
                                >
                                  {org.isSuspended ? <PlayCircle className="h-4 w-4" /> : <Ban className="h-4 w-4" />}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setSelectedOrgForAction(org);
                                    setTransferOwnerDialog(true);
                                  }}
                                >
                                  <UserCog className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-destructive"
                                  onClick={() => {
                                    setSelectedOrgForAction(org);
                                    setDeleteOrgDialog(true);
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
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
                <CardTitle>All Users</CardTitle>
                <CardDescription>Cross-organization user management</CardDescription>
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
                        <TableHead>Last Login</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {usersLoading ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8">
                            Loading users...
                          </TableCell>
                        </TableRow>
                      ) : filteredUsers.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                            No users found
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredUsers.map((user) => (
                          <TableRow key={user.id}>
                            <TableCell>
                              <div>
                                <div className="font-medium flex items-center gap-2">
                                  {user.firstName} {user.lastName}
                                  {user.isSuperAdmin && (
                                    <Badge variant="destructive" className="text-xs">
                                      <Crown className="h-3 w-3 mr-1" />
                                      Super Admin
                                    </Badge>
                                  )}
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
              </CardContent>
            </Card>
          </TabsContent>

          {/* Billing & Usage Tab */}
          <TabsContent value="billing" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Total MRR</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">₹{((systemStats?.billing?.monthlyRecurring || 0) / 100).toFixed(2)}</div>
                  <p className="text-xs text-muted-foreground">Monthly Recurring Revenue</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Total Revenue</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">₹{((systemStats?.billing?.totalRevenue || 0) / 100).toFixed(2)}</div>
                  <p className="text-xs text-muted-foreground">All-time revenue</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">ARPU</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">₹{((systemStats?.billing?.averageRevenuePerOrg || 0) / 100).toFixed(2)}</div>
                  <p className="text-xs text-muted-foreground">Avg Revenue Per Organization</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Organization Usage & Billing</CardTitle>
                <CardDescription>Resource consumption and billing details</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Organization</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Monthly Fee</TableHead>
                      <TableHead>Flows Usage</TableHead>
                      <TableHead>Users</TableHead>
                      <TableHead>Storage</TableHead>
                      <TableHead>Total Bill</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {organizations?.map((org) => {
                      const baseFee = org.monthlyPrice / 100;
                      const flowsOverage = Math.max(0, (org.currentFlows || 0) - org.maxFlows);
                      const usersOverage = Math.max(0, (org.totalUsers || 0) - org.maxUsers);
                      const storageOverageGB = Math.max(0, ((org.currentStorage || 0) - org.maxStorage) / 1024);
                      
                      const flowsCost = org.usageBasedBilling ? (flowsOverage * (org.pricePerFlow || 0) / 100) : 0;
                      const usersCost = org.usageBasedBilling ? (usersOverage * (org.pricePerUser || 0) / 100) : 0;
                      const storageCost = org.usageBasedBilling ? (storageOverageGB * (org.pricePerGb || 0) / 100) : 0;
                      const totalBill = baseFee + flowsCost + usersCost + storageCost;
                      
                      return (
                        <TableRow key={org.id}>
                          <TableCell>
                            <div className="font-medium">{org.name}</div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{org.pricingTier}</Badge>
                          </TableCell>
                          <TableCell>₹{baseFee.toFixed(2)}</TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {org.currentFlows}/{org.maxFlows}
                              {flowsOverage > 0 && (
                                <span className="text-red-600"> (+{flowsOverage})</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {org.totalUsers}/{org.maxUsers}
                              {usersOverage > 0 && (
                                <span className="text-red-600"> (+{usersOverage})</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {org.currentStorage}MB/{org.maxStorage}MB
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="font-bold">₹{totalBill.toFixed(2)}</div>
                            {org.usageBasedBilling && (totalBill > baseFee) && (
                              <div className="text-xs text-muted-foreground">
                                Base: ₹{baseFee} + Overages: ₹{(totalBill - baseFee).toFixed(2)}
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Create Organization Dialog */}
      <Dialog open={createOrgDialog} onOpenChange={setCreateOrgDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Organization</DialogTitle>
            <DialogDescription>Set up a new tenant organization</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="new-org-name">Organization Name*</Label>
                <Input
                  id="new-org-name"
                  value={newOrg.name}
                  onChange={(e) => setNewOrg({ ...newOrg, name: e.target.value })}
                  placeholder="Acme Corp"
                />
              </div>
              <div>
                <Label htmlFor="new-org-domain">Email Domain*</Label>
                <Input
                  id="new-org-domain"
                  value={newOrg.domain}
                  onChange={(e) => setNewOrg({ ...newOrg, domain: e.target.value })}
                  placeholder="acme.com"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="new-org-subdomain">Subdomain</Label>
                <Input
                  id="new-org-subdomain"
                  value={newOrg.subdomain}
                  onChange={(e) => setNewOrg({ ...newOrg, subdomain: e.target.value })}
                  placeholder="acme"
                />
              </div>
              <div>
                <Label htmlFor="new-org-company">Company Name</Label>
                <Input
                  id="new-org-company"
                  value={newOrg.companyName}
                  onChange={(e) => setNewOrg({ ...newOrg, companyName: e.target.value })}
                  placeholder="Acme Corporation"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="new-org-plan">Plan Type</Label>
                <Select value={newOrg.planType} onValueChange={(value) => setNewOrg({ ...newOrg, planType: value })}>
                  <SelectTrigger id="new-org-plan">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="free">Free</SelectItem>
                    <SelectItem value="starter">Starter</SelectItem>
                    <SelectItem value="professional">Professional</SelectItem>
                    <SelectItem value="enterprise">Enterprise</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="new-org-max-users">Max Users</Label>
                <Input
                  id="new-org-max-users"
                  type="number"
                  value={newOrg.maxUsers}
                  onChange={(e) => setNewOrg({ ...newOrg, maxUsers: parseInt(e.target.value) })}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="new-org-owner">Owner Email (Optional)</Label>
              <Input
                id="new-org-owner"
                type="email"
                value={newOrg.ownerEmail}
                onChange={(e) => setNewOrg({ ...newOrg, ownerEmail: e.target.value })}
                placeholder="admin@acme.com"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOrgDialog(false)}>
              Cancel
            </Button>
            <Button onClick={() => createOrgMutation.mutate(newOrg)} disabled={!newOrg.name || !newOrg.domain || createOrgMutation.isPending}>
              {createOrgMutation.isPending ? "Creating..." : "Create Organization"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Organization Dialog */}
      <Dialog open={editOrgDialog} onOpenChange={setEditOrgDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Organization</DialogTitle>
            <DialogDescription>Update organization settings and quotas</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div>
              <Label>Organization Name</Label>
              <Input
                value={selectedOrgForAction?.name || ""}
                onChange={(e) => setSelectedOrgForAction({ ...selectedOrgForAction!, name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Max Users</Label>
                <Input
                  type="number"
                  value={selectedOrgForAction?.maxUsers || 0}
                  onChange={(e) => setSelectedOrgForAction({ ...selectedOrgForAction!, maxUsers: parseInt(e.target.value) })}
                />
              </div>
              <div>
                <Label>Max Flows</Label>
                <Input
                  type="number"
                  value={selectedOrgForAction?.maxFlows || 0}
                  onChange={(e) => setSelectedOrgForAction({ ...selectedOrgForAction!, maxFlows: parseInt(e.target.value) })}
                />
              </div>
            </div>
            <div>
              <Label>Max Storage (MB)</Label>
              <Input
                type="number"
                value={selectedOrgForAction?.maxStorage || 0}
                onChange={(e) => setSelectedOrgForAction({ ...selectedOrgForAction!, maxStorage: parseInt(e.target.value) })}
              />
            </div>
            <div>
              <Label>Status</Label>
              <Select
                value={selectedOrgForAction?.isActive ? "active" : "inactive"}
                onValueChange={(value) => setSelectedOrgForAction({ ...selectedOrgForAction!, isActive: value === "active" })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOrgDialog(false)}>Cancel</Button>
            <Button onClick={() => {
              if (selectedOrgForAction) {
                updateOrgMutation.mutate({
                  id: selectedOrgForAction.id,
                  updates: {
                    name: selectedOrgForAction.name,
                    maxUsers: selectedOrgForAction.maxUsers,
                    maxFlows: selectedOrgForAction.maxFlows,
                    maxStorage: selectedOrgForAction.maxStorage,
                    isActive: selectedOrgForAction.isActive
                  }
                });
              }
            }}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pricing Dialog */}
      <Dialog open={pricingDialog} onOpenChange={setPricingDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set Pricing Tier</DialogTitle>
            <DialogDescription>Configure pricing and billing for {selectedOrgForAction?.name}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div>
              <Label>Pricing Tier</Label>
              <Select
                value={selectedOrgForAction?.pricingTier || "starter"}
                onValueChange={(value) => setSelectedOrgForAction({ ...selectedOrgForAction!, pricingTier: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="starter">Starter</SelectItem>
                  <SelectItem value="professional">Professional</SelectItem>
                  <SelectItem value="enterprise">Enterprise</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Monthly Price (₹)</Label>
              <Input
                type="number"
                value={(selectedOrgForAction?.monthlyPrice || 0) / 100}
                onChange={(e) => setSelectedOrgForAction({ ...selectedOrgForAction!, monthlyPrice: parseFloat(e.target.value) * 100 })}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="usage-based"
                checked={selectedOrgForAction?.usageBasedBilling || false}
                onCheckedChange={(checked) => setSelectedOrgForAction({ ...selectedOrgForAction!, usageBasedBilling: checked as boolean })}
              />
              <Label htmlFor="usage-based">Enable Usage-Based Billing</Label>
            </div>
            {selectedOrgForAction?.usageBasedBilling && (
              <div className="grid grid-cols-3 gap-4 pl-6">
                <div>
                  <Label className="text-xs">₹/Flow</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={(selectedOrgForAction?.pricePerFlow || 0) / 100}
                    onChange={(e) => setSelectedOrgForAction({ ...selectedOrgForAction!, pricePerFlow: parseFloat(e.target.value) * 100 })}
                  />
                </div>
                <div>
                  <Label className="text-xs">₹/User</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={(selectedOrgForAction?.pricePerUser || 0) / 100}
                    onChange={(e) => setSelectedOrgForAction({ ...selectedOrgForAction!, pricePerUser: parseFloat(e.target.value) * 100 })}
                  />
                </div>
                <div>
                  <Label className="text-xs">₹/GB</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={(selectedOrgForAction?.pricePerGb || 0) / 100}
                    onChange={(e) => setSelectedOrgForAction({ ...selectedOrgForAction!, pricePerGb: parseFloat(e.target.value) * 100 })}
                  />
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPricingDialog(false)}>Cancel</Button>
            <Button onClick={() => {
              if (selectedOrgForAction) {
                updateOrgMutation.mutate({
                  id: selectedOrgForAction.id,
                  updates: {
                    pricingTier: selectedOrgForAction.pricingTier,
                    monthlyPrice: selectedOrgForAction.monthlyPrice,
                    usageBasedBilling: selectedOrgForAction.usageBasedBilling,
                    pricePerFlow: selectedOrgForAction.pricePerFlow,
                    pricePerUser: selectedOrgForAction.pricePerUser,
                    pricePerGb: selectedOrgForAction.pricePerGb
                  }
                });
              }
            }}>
              Save Pricing
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Suspend/Resume Dialog */}
      <Dialog open={suspendOrgDialog} onOpenChange={setSuspendOrgDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedOrgForAction?.isSuspended ? "Resume Organization" : "Suspend Organization"}
            </DialogTitle>
            <DialogDescription>
              {selectedOrgForAction?.isSuspended 
                ? `Reactivate ${selectedOrgForAction.name} and restore access for all users.`
                : `Suspending ${selectedOrgForAction?.name} will prevent all users from accessing the system.`
              }
            </DialogDescription>
          </DialogHeader>
          {!selectedOrgForAction?.isSuspended && (
            <div className="py-4">
              <Label htmlFor="suspension-reason">Reason for Suspension</Label>
              <Textarea
                id="suspension-reason"
                value={suspensionReason}
                onChange={(e) => setSuspensionReason(e.target.value)}
                placeholder="Enter reason for suspension..."
              />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSuspendOrgDialog(false)}>Cancel</Button>
            <Button
              variant={selectedOrgForAction?.isSuspended ? "default" : "destructive"}
              onClick={() => {
                if (selectedOrgForAction) {
                  toggleSuspensionMutation.mutate({
                    orgId: selectedOrgForAction.id,
                    isSuspended: !selectedOrgForAction.isSuspended,
                    reason: suspensionReason
                  });
                }
              }}
            >
              {selectedOrgForAction?.isSuspended ? "Resume" : "Suspend"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transfer Ownership Dialog */}
      <Dialog open={transferOwnerDialog} onOpenChange={setTransferOwnerDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transfer Organization Ownership</DialogTitle>
            <DialogDescription>
              Transfer ownership of {selectedOrgForAction?.name} to a different user
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="new-owner-email">New Owner Email</Label>
            <Input
              id="new-owner-email"
              type="email"
              value={newOwnerEmail}
              onChange={(e) => setNewOwnerEmail(e.target.value)}
              placeholder="newowner@domain.com"
            />
            <p className="text-sm text-muted-foreground mt-2">
              Current owner: {selectedOrgForAction?.ownerEmail || "No owner set"}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTransferOwnerDialog(false)}>Cancel</Button>
            <Button
              onClick={() => {
                if (selectedOrgForAction && newOwnerEmail) {
                  transferOwnerMutation.mutate({
                    orgId: selectedOrgForAction.id,
                    newOwnerEmail: newOwnerEmail
                  });
                }
              }}
              disabled={!newOwnerEmail}
            >
              Transfer Ownership
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Organization Dialog */}
      <Dialog open={deleteOrgDialog} onOpenChange={setDeleteOrgDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Organization</DialogTitle>
            <DialogDescription className="text-destructive">
              Warning: This action cannot be undone. All data will be archived and the organization will be permanently deleted.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="font-medium">{selectedOrgForAction?.name}</p>
            <p className="text-sm text-muted-foreground">{selectedOrgForAction?.domain}</p>
            <div className="mt-4 p-4 bg-destructive/10 border border-destructive rounded-lg">
              <p className="text-sm">This will delete:</p>
              <ul className="text-sm list-disc pl-5 mt-2">
                <li>{selectedOrgForAction?.totalUsers} users</li>
                <li>{selectedOrgForAction?.totalTasks} tasks</li>
                <li>All flow rules and form templates</li>
                <li>All form responses and files</li>
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOrgDialog(false)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (selectedOrgForAction) {
                  deleteOrgMutation.mutate(selectedOrgForAction.id);
                }
              }}
            >
              Delete Permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
