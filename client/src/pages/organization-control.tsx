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
  PlayCircle,
  Receipt,
  ScrollText,
  CreditCard,
  ShieldCheck,
  ShieldOff,
  ArrowUpDown,
  Calendar,
  FileDown,
  ClipboardList,
  Info
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

interface ChallanRecord {
  id: string;
  challanNumber: string;
  organizationId: string;
  organizationName: string;
  billingPeriodStart: string;
  billingPeriodEnd: string;
  flowCount: number;
  flowCost: number;
  userCount: number;
  userCost: number;
  formCount: number;
  formCost: number;
  storageMb: number;
  storageCost: number;
  baseCost: number;
  subtotal: number;
  taxPercent: number;
  taxAmount: number;
  totalAmount: number;
  status: string;
  dueDate: string;
  paidAt: string;
  generatedBy: string;
  notes: string;
  createdAt: string;
}

interface TransactionRecord {
  id: string;
  organizationId: string;
  organizationName: string;
  challanId: string;
  payuTxnId: string;
  payuPaymentId: string;
  payuStatus: string;
  payuMode: string;
  amount: number;
  currency: string;
  status: string;
  failureReason: string;
  initiatedBy: string;
  createdAt: string;
}

interface AuditLogRecord {
  id: string;
  actorId: string;
  actorEmail: string;
  action: string;
  targetType: string;
  targetId: string;
  targetEmail?: string;
  oldValue: string;
  newValue: string;
  ipAddress: string;
  userAgent: string;
  organizationId: string;
  metadata: any;
  createdAt: string;
}

interface OrgDetailData {
  organization: any;
  stats: {
    totalUsers: number;
    activeUsers: number;
    totalTasks: number;
    completedTasks: number;
    overdueTasks: number;
    taskCompletionRate: string;
    totalFlowRules: number;
    uniqueSystems: string[];
    totalFormTemplates: number;
    totalFormResponses: number;
    recentLogins30d: number;
    totalChallans: number;
    totalChallanAmount: number;
    paidAmount: number;
    outstandingAmount: number;
    totalTransactions: number;
  };
  users: any[];
  recentChallans: any[];
  recentTransactions: any[];
}

/* ─── Helpers ─── */

function formatPaise(paise: number): string {
  return `₹${((paise ?? 0) / 100).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function statusBadge(status: string | null | undefined) {
  const s = status || "generated";
  const map: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
    generated: { variant: "outline", label: "Generated" },
    sent: { variant: "secondary", label: "Sent" },
    paid: { variant: "default", label: "Paid" },
    overdue: { variant: "destructive", label: "Overdue" },
    cancelled: { variant: "secondary", label: "Cancelled" },
    initiated: { variant: "outline", label: "Initiated" },
    pending: { variant: "secondary", label: "Pending" },
    success: { variant: "default", label: "Success" },
    failed: { variant: "destructive", label: "Failed" },
    refunded: { variant: "secondary", label: "Refunded" },
  };
  const cfg = map[s] ?? { variant: "outline" as const, label: s };
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
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
  const [challanStatusFilter, setChallanStatusFilter] = useState<string>("all");
  const [txnStatusFilter, setTxnStatusFilter] = useState<string>("all");
  const [auditActionFilter, setAuditActionFilter] = useState<string>("all");
  const [auditTargetFilter, setAuditTargetFilter] = useState<string>("all");
  const [paymentOrgFilter, setPaymentOrgFilter] = useState<string>("all");
  const [auditOrgFilter, setAuditOrgFilter] = useState<string>("all");
  const [selectedChallanDetail, setSelectedChallanDetail] = useState<ChallanRecord | null>(null);
  const [orgDetailId, setOrgDetailId] = useState<string | null>(null);

  // Export state
  const [exportType, setExportType] = useState<string>("organizations");
  const [exportFrom, setExportFrom] = useState<string>("");
  const [exportTo, setExportTo] = useState<string>("");
  const [exportOrgFilter, setExportOrgFilter] = useState<string>("all");
  const [isExporting, setIsExporting] = useState(false);

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

  // Fetch all challans cross-org
  const { data: allChallans, isLoading: challansLoading, isError: challansError } = useQuery<ChallanRecord[]>({
    queryKey: ["/api/super-admin/all-challans"],
    queryFn: async () => {
      const response = await fetch("/api/super-admin/all-challans?limit=500", { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch challans");
      return response.json();
    },
    refetchInterval: autoRefresh ? 60000 : false,
    staleTime: 0,
    retry: 1,
  });

  // Fetch all transactions cross-org
  const { data: allTransactions, isLoading: txnsLoading, isError: txnsError } = useQuery<TransactionRecord[]>({
    queryKey: ["/api/super-admin/all-transactions"],
    queryFn: async () => {
      const response = await fetch("/api/super-admin/all-transactions?limit=500", { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch transactions");
      return response.json();
    },
    refetchInterval: autoRefresh ? 60000 : false,
    staleTime: 0,
    retry: 1,
  });

  // Fetch audit logs
  const { data: auditLogs, isLoading: auditLoading, isError: auditError } = useQuery<AuditLogRecord[]>({
    queryKey: ["/api/super-admin/audit-logs"],
    queryFn: async () => {
      const response = await fetch("/api/super-admin/audit-logs?limit=200", { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch audit logs");
      return response.json();
    },
    refetchInterval: autoRefresh ? 60000 : false,
    staleTime: 0,
    retry: 1,
  });

  // Fetch organization detail (on demand)
  const { data: orgDetail, isLoading: orgDetailLoading } = useQuery<OrgDetailData>({
    queryKey: ["/api/super-admin/organizations", orgDetailId, "details"],
    queryFn: async () => {
      const response = await fetch(`/api/super-admin/organizations/${orgDetailId}/details`, { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch organization details");
      return response.json();
    },
    enabled: !!orgDetailId,
    staleTime: 30000,
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

  // Change user role mutation
  const changeUserRoleMutation = useMutation({
    mutationFn: async (data: { userId: string; role: string }) => {
      const response = await fetch(`/api/super-admin/users/${data.userId}/role`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ role: data.role }),
      });
      if (!response.ok) throw new Error("Failed to update user role");
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "User role updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/all-users"] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Promote/demote super admin mutation
  const toggleSuperAdminMutation = useMutation({
    mutationFn: async (data: { userId: string; isSuperAdmin: boolean }) => {
      const response = await fetch(`/api/super-admin/users/${data.userId}/promote-super-admin`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ isSuperAdmin: data.isSuperAdmin }),
      });
      if (!response.ok) throw new Error("Failed to update super admin status");
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Super admin status updated" });
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/all-users"] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Update challan status mutation
  const updateChallanStatusMutation = useMutation({
    mutationFn: async (data: { challanId: string; status: string; notes?: string }) => {
      const response = await fetch(`/api/super-admin/challans/${data.challanId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: data.status, notes: data.notes }),
      });
      if (!response.ok) throw new Error("Failed to update challan status");
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Challan status updated" });
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/all-challans"] });
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

  // Filter challans
  const filteredChallans = allChallans?.filter(ch => {
    const matchesStatus = challanStatusFilter === "all" || (ch.status || "generated") === challanStatusFilter;
    const matchesOrg = paymentOrgFilter === "all" || ch.organizationId === paymentOrgFilter;
    return matchesStatus && matchesOrg;
  }) || [];

  // Filter transactions
  const filteredTransactions = allTransactions?.filter(txn => {
    const matchesStatus = txnStatusFilter === "all" || (txn.status || "initiated") === txnStatusFilter;
    const matchesOrg = paymentOrgFilter === "all" || txn.organizationId === paymentOrgFilter;
    return matchesStatus && matchesOrg;
  }) || [];

  // Filter audit logs
  const filteredAuditLogs = auditLogs?.filter(log => {
    const matchesAction = auditActionFilter === "all" || log.action === auditActionFilter;
    const matchesTarget = auditTargetFilter === "all" || log.targetType === auditTargetFilter;
    const matchesOrg = auditOrgFilter === "all" || log.organizationId === auditOrgFilter;
    return matchesAction && matchesTarget && matchesOrg;
  }) || [];

  // Get unique audit actions for filter
  const uniqueAuditActions = [...new Set(auditLogs?.map(l => l.action) || [])];
  const uniqueAuditTargets = [...new Set(auditLogs?.map(l => l.targetType).filter(Boolean) || [])];

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

  // CSV export handler
  const handleCsvExport = async () => {
    setIsExporting(true);
    try {
      const params = new URLSearchParams();
      if (exportFrom) params.set("from", exportFrom);
      if (exportTo) params.set("to", exportTo);
      if (exportOrgFilter !== "all") params.set("organizationId", exportOrgFilter);
      const qs = params.toString() ? `?${params.toString()}` : "";
      const response = await fetch(`/api/super-admin/export/${exportType}${qs}`, { credentials: "include" });
      if (!response.ok) throw new Error("Export failed");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const disposition = response.headers.get("Content-Disposition") || "";
      const match = disposition.match(/filename="?([^"]+)"?/);
      a.download = match ? match[1] : `${exportType}-export.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "Exported", description: `${exportType} data downloaded as CSV` });
    } catch (error: any) {
      toast({ title: "Export Failed", description: error.message, variant: "destructive" });
    } finally {
      setIsExporting(false);
    }
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
          <TabsList className="flex flex-wrap h-auto gap-1">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="organizations">Organizations</TabsTrigger>
            <TabsTrigger value="users">All Users</TabsTrigger>
            <TabsTrigger value="billing">Billing & Usage</TabsTrigger>
            <TabsTrigger value="payments" className="flex items-center gap-1">
              <Receipt className="h-4 w-4" />
              Payments
            </TabsTrigger>
            <TabsTrigger value="audit" className="flex items-center gap-1">
              <ScrollText className="h-4 w-4" />
              Audit Logs
            </TabsTrigger>
            <TabsTrigger value="export" className="flex items-center gap-1">
              <FileDown className="h-4 w-4" />
              Data Export
            </TabsTrigger>
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
                                  title="View Details"
                                  onClick={() => setOrgDetailId(org.id)}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
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
                        <TableHead>Super Admin</TableHead>
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
                            <TableCell>
                              <Button
                                size="sm"
                                variant={user.isSuperAdmin ? "default" : "outline"}
                                className={user.isSuperAdmin ? "bg-amber-600 hover:bg-amber-700" : ""}
                                onClick={() => {
                                  if (user.id === dbUser?.id) {
                                    toast({ title: "Cannot modify", description: "You cannot change your own super admin status", variant: "destructive" });
                                    return;
                                  }
                                  toggleSuperAdminMutation.mutate({ userId: user.id, isSuperAdmin: !user.isSuperAdmin });
                                }}
                                disabled={toggleSuperAdminMutation.isPending || user.id === dbUser?.id}
                              >
                                {user.isSuperAdmin ? (
                                  <><ShieldCheck className="h-3 w-3 mr-1" />SA</>
                                ) : (
                                  <><ShieldOff className="h-3 w-3 mr-1" />No</>
                                )}
                              </Button>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex gap-2 justify-end items-center">
                                <Select
                                  value={user.role}
                                  onValueChange={(value) =>
                                    changeUserRoleMutation.mutate({ userId: user.id, role: value })
                                  }
                                >
                                  <SelectTrigger className="w-[100px]">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="user">User</SelectItem>
                                    <SelectItem value="admin">Admin</SelectItem>
                                  </SelectContent>
                                </Select>
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

          {/* Payments Tab – Challans & Transactions */}
          <TabsContent value="payments" className="space-y-4">
            {/* Error banner */}
            {challansError && (
              <Card className="border-destructive bg-destructive/10">
                <CardContent className="flex items-center gap-2 py-3">
                  <AlertCircle className="h-4 w-4 text-destructive" />
                  <span className="text-sm text-destructive">Failed to load challans. Check server connection.</span>
                  <Button size="sm" variant="outline" className="ml-auto" onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/super-admin/all-challans"] })}>
                    Retry
                  </Button>
                </CardContent>
              </Card>
            )}
            {txnsError && (
              <Card className="border-destructive bg-destructive/10">
                <CardContent className="flex items-center gap-2 py-3">
                  <AlertCircle className="h-4 w-4 text-destructive" />
                  <span className="text-sm text-destructive">Failed to load transactions. Check server connection.</span>
                  <Button size="sm" variant="outline" className="ml-auto" onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/super-admin/all-transactions"] })}>
                    Retry
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Org filter + KPI row */}
            <div className="flex flex-wrap gap-4 items-end">
              <div>
                <Label className="text-xs text-muted-foreground">Organization</Label>
                <Select value={paymentOrgFilter} onValueChange={setPaymentOrgFilter}>
                  <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Organizations</SelectItem>
                    {organizations?.map(org => (
                      <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Challan summary cards */}
            <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Total Challans</CardTitle></CardHeader>
                <CardContent><div className="text-2xl font-bold">{filteredChallans.length}</div></CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Paid</CardTitle></CardHeader>
                <CardContent><div className="text-2xl font-bold text-green-600">{filteredChallans.filter(c => (c.status || "generated") === "paid").length}</div></CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Overdue</CardTitle></CardHeader>
                <CardContent><div className="text-2xl font-bold text-red-600">{filteredChallans.filter(c => (c.status || "generated") === "overdue").length}</div></CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Total Amount</CardTitle></CardHeader>
                <CardContent><div className="text-2xl font-bold">{formatPaise(filteredChallans.reduce((sum, c) => sum + (c.totalAmount || 0), 0))}</div></CardContent>
              </Card>
            </div>

            {/* Challans Table */}
            <Card>
              <CardHeader>
                <div className="flex flex-wrap justify-between items-center gap-2">
                  <div>
                    <CardTitle className="flex items-center gap-2"><Receipt className="h-5 w-5" />All Challans</CardTitle>
                    <CardDescription>Cross-organization billing challans</CardDescription>
                  </div>
                  <Select value={challanStatusFilter} onValueChange={setChallanStatusFilter}>
                    <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="generated">Generated</SelectItem>
                      <SelectItem value="sent">Sent</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="overdue">Overdue</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Challan #</TableHead>
                        <TableHead>Organization</TableHead>
                        <TableHead>Period</TableHead>
                        <TableHead className="text-right">Subtotal</TableHead>
                        <TableHead className="text-right">Tax</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Due Date</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {challansLoading ? (
                        <TableRow><TableCell colSpan={9} className="text-center py-8">Loading challans...</TableCell></TableRow>
                      ) : filteredChallans.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                            <Receipt className="h-10 w-10 mx-auto mb-3 opacity-40" />
                            {challansError ? "Error loading challans" : "No challans found"}
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredChallans.map((ch) => (
                          <TableRow key={ch.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedChallanDetail(ch)}>
                            <TableCell className="font-mono text-sm whitespace-nowrap">{ch.challanNumber}</TableCell>
                            <TableCell>
                              <div className="font-medium whitespace-nowrap">{ch.organizationName || "—"}</div>
                            </TableCell>
                            <TableCell className="whitespace-nowrap">
                              {formatDate(ch.billingPeriodStart)} – {formatDate(ch.billingPeriodEnd)}
                            </TableCell>
                            <TableCell className="text-right whitespace-nowrap">{formatPaise(ch.subtotal || 0)}</TableCell>
                            <TableCell className="text-right whitespace-nowrap">{formatPaise(ch.taxAmount || 0)}</TableCell>
                            <TableCell className="text-right font-bold whitespace-nowrap">{formatPaise(ch.totalAmount || 0)}</TableCell>
                            <TableCell>{statusBadge(ch.status)}</TableCell>
                            <TableCell className="whitespace-nowrap">{formatDate(ch.dueDate)}</TableCell>
                            <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                              <Select
                                value={ch.status || "generated"}
                                onValueChange={(value) =>
                                  updateChallanStatusMutation.mutate({ challanId: ch.id, status: value })
                                }
                              >
                                <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="generated">Generated</SelectItem>
                                  <SelectItem value="sent">Sent</SelectItem>
                                  <SelectItem value="paid">Paid</SelectItem>
                                  <SelectItem value="overdue">Overdue</SelectItem>
                                  <SelectItem value="cancelled">Cancelled</SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
                {filteredChallans.length > 0 && (
                  <div className="text-sm text-muted-foreground mt-2 text-right">
                    {filteredChallans.length} challan{filteredChallans.length !== 1 ? "s" : ""} · Total: {formatPaise(filteredChallans.reduce((s, c) => s + (c.totalAmount || 0), 0))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Transactions Table */}
            <Card>
              <CardHeader>
                <div className="flex flex-wrap justify-between items-center gap-2">
                  <div>
                    <CardTitle className="flex items-center gap-2"><CreditCard className="h-5 w-5" />Payment Transactions</CardTitle>
                    <CardDescription>Cross-organization payment history</CardDescription>
                  </div>
                  <Select value={txnStatusFilter} onValueChange={setTxnStatusFilter}>
                    <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="initiated">Initiated</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="success">Success</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                      <SelectItem value="refunded">Refunded</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Transaction ID</TableHead>
                        <TableHead>Organization</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead>Mode</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Initiated By</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {txnsLoading ? (
                        <TableRow><TableCell colSpan={7} className="text-center py-8">Loading transactions...</TableCell></TableRow>
                      ) : filteredTransactions.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                            <CreditCard className="h-10 w-10 mx-auto mb-3 opacity-40" />
                            {txnsError ? "Error loading transactions" : "No transactions found"}
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredTransactions.map((txn) => (
                          <TableRow key={txn.id}>
                            <TableCell className="font-mono text-sm whitespace-nowrap">{txn.payuTxnId || txn.id.slice(0, 8)}</TableCell>
                            <TableCell>
                              <div className="font-medium whitespace-nowrap">{txn.organizationName || "—"}</div>
                            </TableCell>
                            <TableCell className="text-right font-bold whitespace-nowrap">{formatPaise(txn.amount || 0)}</TableCell>
                            <TableCell><Badge variant="outline">{txn.payuMode || "—"}</Badge></TableCell>
                            <TableCell>{statusBadge(txn.status)}</TableCell>
                            <TableCell className="text-sm whitespace-nowrap">{txn.initiatedBy || "—"}</TableCell>
                            <TableCell className="text-sm whitespace-nowrap">{new Date(txn.createdAt).toLocaleString()}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
                {filteredTransactions.length > 0 && (
                  <div className="text-sm text-muted-foreground mt-2 text-right">
                    {filteredTransactions.length} transaction{filteredTransactions.length !== 1 ? "s" : ""} · Successful: {formatPaise(filteredTransactions.filter(t => t.status === "success").reduce((s, t) => s + (t.amount || 0), 0))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Audit Logs Tab */}
          <TabsContent value="audit" className="space-y-4">
            {auditError && (
              <Card className="border-destructive bg-destructive/10">
                <CardContent className="flex items-center gap-2 py-3">
                  <AlertCircle className="h-4 w-4 text-destructive" />
                  <span className="text-sm text-destructive">Failed to load audit logs.</span>
                  <Button size="sm" variant="outline" className="ml-auto" onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/super-admin/audit-logs"] })}>
                    Retry
                  </Button>
                </CardContent>
              </Card>
            )}
            <Card>
              <CardHeader>
                <div className="flex flex-wrap justify-between items-center gap-2">
                  <div>
                    <CardTitle className="flex items-center gap-2"><ScrollText className="h-5 w-5" />Audit Trail</CardTitle>
                    <CardDescription>System-wide activity and change log</CardDescription>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Select value={auditOrgFilter} onValueChange={setAuditOrgFilter}>
                      <SelectTrigger className="w-[160px]"><SelectValue placeholder="Organization" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Orgs</SelectItem>
                        {organizations?.map(org => (
                          <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={auditActionFilter} onValueChange={setAuditActionFilter}>
                      <SelectTrigger className="w-[180px]"><SelectValue placeholder="Action" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Actions</SelectItem>
                        {uniqueAuditActions.map(action => (
                          <SelectItem key={action} value={action}>{action.replace(/_/g, " ")}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={auditTargetFilter} onValueChange={setAuditTargetFilter}>
                      <SelectTrigger className="w-[140px]"><SelectValue placeholder="Target" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Targets</SelectItem>
                        {uniqueAuditTargets.map(target => (
                          <SelectItem key={target} value={target}>{target}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Timestamp</TableHead>
                        <TableHead>Actor</TableHead>
                        <TableHead>Action</TableHead>
                        <TableHead>Target</TableHead>
                        <TableHead>Details</TableHead>
                        <TableHead>IP Address</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {auditLoading ? (
                        <TableRow><TableCell colSpan={6} className="text-center py-8">Loading audit logs...</TableCell></TableRow>
                      ) : filteredAuditLogs.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                            <ScrollText className="h-10 w-10 mx-auto mb-3 opacity-40" />
                            {auditError ? "Error loading audit logs" : "No audit logs found"}
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredAuditLogs.map((log) => (
                          <TableRow key={log.id}>
                            <TableCell className="text-sm whitespace-nowrap">{new Date(log.createdAt).toLocaleString()}</TableCell>
                            <TableCell>
                              <div className="text-sm font-medium">{log.actorEmail || "System"}</div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={
                                log.action.includes("DELETE") ? "destructive" :
                                log.action.includes("SUSPEND") ? "destructive" :
                                log.action.includes("CREATE") ? "default" :
                                "outline"
                              } className="text-xs">
                                {log.action.replace(/_/g, " ")}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                <span className="font-medium capitalize">{log.targetType}</span>
                                {log.targetEmail && <div className="text-muted-foreground">{log.targetEmail}</div>}
                                {log.targetId && !log.targetEmail && <div className="text-muted-foreground text-xs">{log.targetId.slice(0, 12)}...</div>}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="max-w-[200px]">
                                {log.newValue && (
                                  <div className="text-xs text-muted-foreground truncate" title={log.newValue}>
                                    {(() => {
                                      try {
                                        const val = JSON.parse(log.newValue);
                                        return Object.entries(val).map(([k, v]) => `${k}: ${v}`).join(", ");
                                      } catch { return log.newValue; }
                                    })()}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">{log.ipAddress || "—"}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
                {filteredAuditLogs.length > 0 && (
                  <div className="text-sm text-muted-foreground mt-2 text-right">
                    Showing {filteredAuditLogs.length} entries
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Data Export Tab */}
          <TabsContent value="export" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><FileDown className="h-5 w-5" />Export Data to CSV</CardTitle>
                <CardDescription>
                  Download any data table from the database as CSV. Apply date filters to narrow the export range.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Data Type Selector */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">Data Type</Label>
                    <Select value={exportType} onValueChange={setExportType}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="organizations">Organizations</SelectItem>
                        <SelectItem value="users">Users</SelectItem>
                        <SelectItem value="tasks">Tasks</SelectItem>
                        <SelectItem value="flow-rules">Flow Rules</SelectItem>
                        <SelectItem value="challans">Challans (Invoices)</SelectItem>
                        <SelectItem value="transactions">Payment Transactions</SelectItem>
                        <SelectItem value="audit-logs">Audit Logs</SelectItem>
                        <SelectItem value="login-logs">Login Logs</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">From Date</Label>
                    <Input type="date" value={exportFrom} onChange={(e) => setExportFrom(e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">To Date</Label>
                    <Input type="date" value={exportTo} onChange={(e) => setExportTo(e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">Organization</Label>
                    <Select value={exportOrgFilter} onValueChange={setExportOrgFilter}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Organizations</SelectItem>
                        {organizations?.map(org => (
                          <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3 items-center">
                  <Button onClick={handleCsvExport} disabled={isExporting} className="gap-2">
                    <Download className="h-4 w-4" />
                    {isExporting ? "Exporting..." : "Download CSV"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { setExportFrom(""); setExportTo(""); setExportOrgFilter("all"); }}
                  >
                    Clear Filters
                  </Button>
                  {(exportFrom || exportTo) && (
                    <span className="text-sm text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5 inline mr-1" />
                      {exportFrom || "Start"} → {exportTo || "Now"}
                    </span>
                  )}
                </div>

                {/* Quick Export Cards */}
                <div className="border-t pt-4">
                  <h4 className="text-sm font-semibold mb-3">Quick Exports (All Time, All Orgs)</h4>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {[
                      { type: "organizations", icon: Building2, label: "Organizations", desc: "All org details, plans, pricing" },
                      { type: "users", icon: Users, label: "Users", desc: "User profiles, roles, status" },
                      { type: "tasks", icon: ClipboardList, label: "Tasks", desc: "All tasks with status & TAT" },
                      { type: "challans", icon: Receipt, label: "Challans", desc: "Invoices with cost breakdown" },
                      { type: "transactions", icon: CreditCard, label: "Transactions", desc: "Payment history & status" },
                      { type: "audit-logs", icon: ScrollText, label: "Audit Logs", desc: "System activity trail" },
                      { type: "login-logs", icon: Shield, label: "Login Logs", desc: "User login activity" },
                      { type: "flow-rules", icon: Zap, label: "Flow Rules", desc: "Workflow definitions" },
                    ].map(item => (
                      <button
                        key={item.type}
                        onClick={async () => {
                          setIsExporting(true);
                          try {
                            const response = await fetch(`/api/super-admin/export/${item.type}`, { credentials: "include" });
                            if (!response.ok) throw new Error("Export failed");
                            const blob = await response.blob();
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement("a");
                            a.href = url;
                            a.download = `${item.type}-export.csv`;
                            a.click();
                            URL.revokeObjectURL(url);
                            toast({ title: "Exported", description: `${item.label} data downloaded as CSV` });
                          } catch (e: any) {
                            toast({ title: "Export Failed", description: e.message, variant: "destructive" });
                          } finally {
                            setIsExporting(false);
                          }
                        }}
                        disabled={isExporting}
                        className="flex items-start gap-3 p-3 border rounded-lg text-left hover:bg-muted/50 transition-colors disabled:opacity-50"
                      >
                        <item.icon className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                        <div>
                          <div className="text-sm font-medium">{item.label}</div>
                          <div className="text-xs text-muted-foreground">{item.desc}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Organization Detail Dialog */}
      <Dialog open={!!orgDetailId} onOpenChange={(open) => !open && setOrgDetailId(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Organization Details
            </DialogTitle>
            <DialogDescription>
              {orgDetail?.organization?.name || "Loading..."} · {orgDetail?.organization?.domain || ""}
            </DialogDescription>
          </DialogHeader>
          {orgDetailLoading ? (
            <div className="py-12 text-center text-muted-foreground">Loading organization details...</div>
          ) : orgDetail ? (
            <div className="space-y-6">
              {/* Company Information */}
              <div>
                <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5"><Info className="h-4 w-4" />Company Information</h4>
                <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Company Name</span><span className="font-medium">{orgDetail.organization.companyName || "—"}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Domain</span><span className="font-medium">{orgDetail.organization.domain}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Subdomain</span><span className="font-medium">{orgDetail.organization.subdomain || "—"}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Industry</span><span className="font-medium">{orgDetail.organization.industry || "—"}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Customer Type</span><span className="font-medium">{orgDetail.organization.customerType || "—"}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Business Type</span><span className="font-medium">{orgDetail.organization.businessType || "—"}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">GST Number</span><span className="font-medium">{orgDetail.organization.gstNumber || "—"}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Phone</span><span className="font-medium">{orgDetail.organization.phone || "—"}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Owner Email</span><span className="font-medium">{orgDetail.organization.ownerEmail || "—"}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Created</span><span className="font-medium">{formatDate(orgDetail.organization.createdAt)}</span></div>
                </div>
                {orgDetail.organization.address && (
                  <div className="mt-2 text-sm"><span className="text-muted-foreground">Address: </span><span>{orgDetail.organization.address}</span></div>
                )}
              </div>

              {/* Status & Plan */}
              <div className="border-t pt-4">
                <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5"><Settings className="h-4 w-4" />Status & Plan</h4>
                <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Status</span>
                    <div className="flex gap-1">
                      <Badge variant={orgDetail.organization.isActive ? "default" : "secondary"}>
                        {orgDetail.organization.isActive ? "Active" : "Inactive"}
                      </Badge>
                      {orgDetail.organization.isSuspended && <Badge variant="destructive">Suspended</Badge>}
                    </div>
                  </div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Health Score</span><span className="font-medium">{orgDetail.organization.healthScore ?? "—"} ({orgDetail.organization.healthStatus || "—"})</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Plan Type</span><span className="font-medium">{orgDetail.organization.planType}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Pricing Tier</span><span className="font-medium">{orgDetail.organization.pricingTier}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Monthly Price</span><span className="font-medium">{formatPaise(orgDetail.organization.monthlyPrice || 0)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Billing Cycle</span><span className="font-medium">{orgDetail.organization.billingCycle || "monthly"}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Usage-Based Billing</span><span className="font-medium">{orgDetail.organization.usageBasedBilling ? "Yes" : "No"}</span></div>
                  {orgDetail.organization.usageBasedBilling && (
                    <>
                      <div className="flex justify-between"><span className="text-muted-foreground">₹/Flow</span><span className="font-medium">{formatPaise(orgDetail.organization.pricePerFlow || 0)}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">₹/User</span><span className="font-medium">{formatPaise(orgDetail.organization.pricePerUser || 0)}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">₹/GB</span><span className="font-medium">{formatPaise(orgDetail.organization.pricePerGb || 0)}</span></div>
                    </>
                  )}
                </div>
              </div>

              {/* Usage Statistics */}
              <div className="border-t pt-4">
                <h4 className="text-sm font-semibold mb-3 flex items-center gap-1.5"><BarChart3 className="h-4 w-4" />Usage Statistics</h4>
                <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
                  <div className="border rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold">{orgDetail.stats.activeUsers}/{orgDetail.stats.totalUsers}</div>
                    <div className="text-xs text-muted-foreground">Active Users (max {orgDetail.organization.maxUsers})</div>
                  </div>
                  <div className="border rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold">{orgDetail.stats.completedTasks}/{orgDetail.stats.totalTasks}</div>
                    <div className="text-xs text-muted-foreground">Tasks ({orgDetail.stats.taskCompletionRate}% done)</div>
                  </div>
                  <div className="border rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold">{orgDetail.stats.overdueTasks}</div>
                    <div className="text-xs text-muted-foreground text-red-600">Overdue Tasks</div>
                  </div>
                  <div className="border rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold">{orgDetail.stats.totalFlowRules}</div>
                    <div className="text-xs text-muted-foreground">Flow Rules (max {orgDetail.organization.maxFlows})</div>
                  </div>
                  <div className="border rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold">{orgDetail.stats.uniqueSystems.length}</div>
                    <div className="text-xs text-muted-foreground">Workflows</div>
                  </div>
                  <div className="border rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold">{orgDetail.stats.totalFormTemplates}</div>
                    <div className="text-xs text-muted-foreground">Form Templates</div>
                  </div>
                  <div className="border rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold">{orgDetail.stats.totalFormResponses}</div>
                    <div className="text-xs text-muted-foreground">Form Responses</div>
                  </div>
                  <div className="border rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold">{orgDetail.stats.recentLogins30d}</div>
                    <div className="text-xs text-muted-foreground">Logins (30 days)</div>
                  </div>
                </div>
                {orgDetail.stats.uniqueSystems.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {orgDetail.stats.uniqueSystems.map((s: string) => (
                      <Badge key={s} variant="outline" className="text-xs">{s}</Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Billing Summary */}
              <div className="border-t pt-4">
                <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5"><DollarSign className="h-4 w-4" />Billing Summary</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="border rounded-lg p-3 text-center">
                    <div className="text-lg font-bold">{orgDetail.stats.totalChallans}</div>
                    <div className="text-xs text-muted-foreground">Challans</div>
                  </div>
                  <div className="border rounded-lg p-3 text-center">
                    <div className="text-lg font-bold">{formatPaise(orgDetail.stats.totalChallanAmount)}</div>
                    <div className="text-xs text-muted-foreground">Total Billed</div>
                  </div>
                  <div className="border rounded-lg p-3 text-center">
                    <div className="text-lg font-bold text-green-600">{formatPaise(orgDetail.stats.paidAmount)}</div>
                    <div className="text-xs text-muted-foreground">Paid</div>
                  </div>
                  <div className="border rounded-lg p-3 text-center">
                    <div className="text-lg font-bold text-red-600">{formatPaise(orgDetail.stats.outstandingAmount)}</div>
                    <div className="text-xs text-muted-foreground">Outstanding</div>
                  </div>
                </div>
              </div>

              {/* Users List */}
              {orgDetail.users.length > 0 && (
                <div className="border-t pt-4">
                  <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5"><Users className="h-4 w-4" />Users ({orgDetail.users.length})</h4>
                  <div className="border rounded-lg overflow-x-auto max-h-[200px] overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Dept</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Last Login</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {orgDetail.users.map((u: any) => (
                          <TableRow key={u.id}>
                            <TableCell className="whitespace-nowrap">{u.firstName || ""} {u.lastName || ""}</TableCell>
                            <TableCell className="text-sm">{u.email}</TableCell>
                            <TableCell><Badge variant="outline" className="text-xs">{u.role}</Badge></TableCell>
                            <TableCell className="text-sm">{u.department || "—"}</TableCell>
                            <TableCell><Badge variant={u.status === "active" ? "default" : "secondary"} className="text-xs">{u.status}</Badge></TableCell>
                            <TableCell className="text-xs whitespace-nowrap">{u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : "Never"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {/* Recent Challans */}
              {orgDetail.recentChallans.length > 0 && (
                <div className="border-t pt-4">
                  <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5"><Receipt className="h-4 w-4" />Recent Challans</h4>
                  <div className="border rounded-lg overflow-x-auto max-h-[200px] overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Challan #</TableHead>
                          <TableHead>Period</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Due</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {orgDetail.recentChallans.map((ch: any) => (
                          <TableRow key={ch.id}>
                            <TableCell className="font-mono text-sm whitespace-nowrap">{ch.challanNumber}</TableCell>
                            <TableCell className="text-sm whitespace-nowrap">{formatDate(ch.billingPeriodStart)} – {formatDate(ch.billingPeriodEnd)}</TableCell>
                            <TableCell className="text-right font-bold whitespace-nowrap">{formatPaise(ch.totalAmount || 0)}</TableCell>
                            <TableCell>{statusBadge(ch.status)}</TableCell>
                            <TableCell className="text-sm whitespace-nowrap">{formatDate(ch.dueDate)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {/* Recent Transactions */}
              {orgDetail.recentTransactions.length > 0 && (
                <div className="border-t pt-4">
                  <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5"><CreditCard className="h-4 w-4" />Recent Transactions</h4>
                  <div className="border rounded-lg overflow-x-auto max-h-[200px] overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Transaction ID</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                          <TableHead>Mode</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {orgDetail.recentTransactions.map((tx: any) => (
                          <TableRow key={tx.id}>
                            <TableCell className="font-mono text-sm whitespace-nowrap">{tx.payuTxnId || tx.id.slice(0, 8)}</TableCell>
                            <TableCell className="text-right font-bold whitespace-nowrap">{formatPaise(tx.amount || 0)}</TableCell>
                            <TableCell><Badge variant="outline">{tx.payuMode || "—"}</Badge></TableCell>
                            <TableCell>{statusBadge(tx.status)}</TableCell>
                            <TableCell className="text-sm whitespace-nowrap">{new Date(tx.createdAt).toLocaleString()}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Challan Detail Dialog */}
      <Dialog open={!!selectedChallanDetail} onOpenChange={(open) => !open && setSelectedChallanDetail(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Challan Details
            </DialogTitle>
            <DialogDescription>
              {selectedChallanDetail?.challanNumber} · {selectedChallanDetail?.organizationName || "Unknown Org"}
            </DialogDescription>
          </DialogHeader>
          {selectedChallanDetail && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Status</span>
                {statusBadge(selectedChallanDetail.status)}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Billing Period</span>
                <span className="text-sm font-medium">
                  {formatDate(selectedChallanDetail.billingPeriodStart)} – {formatDate(selectedChallanDetail.billingPeriodEnd)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Due Date</span>
                <span className="text-sm font-medium">{formatDate(selectedChallanDetail.dueDate)}</span>
              </div>

              <div className="border-t pt-3 space-y-2">
                <h4 className="text-sm font-semibold">Cost Breakdown</h4>
                {selectedChallanDetail.flowExecutionCost != null && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Flow Execution</span>
                    <span>{formatPaise(selectedChallanDetail.flowExecutionCost)}</span>
                  </div>
                )}
                {selectedChallanDetail.userSeatCost != null && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">User Seats</span>
                    <span>{formatPaise(selectedChallanDetail.userSeatCost)}</span>
                  </div>
                )}
                {selectedChallanDetail.formSubmissionCost != null && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Form Submissions</span>
                    <span>{formatPaise(selectedChallanDetail.formSubmissionCost)}</span>
                  </div>
                )}
                {selectedChallanDetail.storageCost != null && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Storage</span>
                    <span>{formatPaise(selectedChallanDetail.storageCost)}</span>
                  </div>
                )}
                {selectedChallanDetail.basePlatformCost != null && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Base Platform</span>
                    <span>{formatPaise(selectedChallanDetail.basePlatformCost)}</span>
                  </div>
                )}
              </div>

              <div className="border-t pt-3 space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium">{formatPaise(selectedChallanDetail.subtotal || 0)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tax ({selectedChallanDetail.taxRate ?? 18}%)</span>
                  <span className="font-medium">{formatPaise(selectedChallanDetail.taxAmount || 0)}</span>
                </div>
                <div className="flex justify-between text-base font-bold pt-1 border-t">
                  <span>Total</span>
                  <span>{formatPaise(selectedChallanDetail.totalAmount || 0)}</span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

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
