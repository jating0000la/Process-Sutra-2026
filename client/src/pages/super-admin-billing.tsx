import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/app-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
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
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { apiRequest } from "@/lib/queryClient";
import {
  Search,
  Building2,
  CreditCard,
  Crown,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  IndianRupee,
  RotateCcw,
  ArrowUpRight,
  Calendar,
  RefreshCw,
  Loader2,
  ShieldCheck,
  Ban,
  TrendingUp,
  Workflow,
  Users,
  FileText,
  Upload,
  Receipt,
  Download,
  ExternalLink,
} from "lucide-react";

interface OrgListItem {
  id: string;
  name: string;
  domain: string;
  planType: string;
  isActive: boolean;
  isSuspended: boolean;
}

interface BillingData {
  organization: any;
  subscription: any;
  plan: any;
  scheduledPlan: any;
  subscriptionHistory: any[];
  payments: any[];
  allPlans: any[];
}

export default function SuperAdminBilling() {
  const { dbUser } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);

  // Dialogs
  const [confirmPaymentDialog, setConfirmPaymentDialog] = useState(false);
  const [changePlanDialog, setChangePlanDialog] = useState(false);
  const [adjustOutstandingDialog, setAdjustOutstandingDialog] = useState(false);
  const [resetUsageDialog, setResetUsageDialog] = useState(false);
  const [extendCycleDialog, setExtendCycleDialog] = useState(false);
  const [failPaymentDialog, setFailPaymentDialog] = useState(false);
  const [overrideStatusDialog, setOverrideStatusDialog] = useState(false);
  const [createManualPaymentDialog, setCreateManualPaymentDialog] = useState(false);
  const [uploadInvoiceDialog, setUploadInvoiceDialog] = useState(false);
  const [updateInvoiceDialog, setUpdateInvoiceDialog] = useState(false);

  // Form state
  const [selectedTxnId, setSelectedTxnId] = useState("");
  const [payuMihpayid, setPayuMihpayid] = useState("");
  const [paymentMode, setPaymentMode] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedPlanName, setSelectedPlanName] = useState("");
  const [planChangeImmediate, setPlanChangeImmediate] = useState(true);
  const [planChangeReason, setPlanChangeReason] = useState("");
  const [outstandingAmount, setOutstandingAmount] = useState(0);
  const [outstandingReason, setOutstandingReason] = useState("");
  const [resetFlows, setResetFlows] = useState(false);
  const [resetSubmissions, setResetSubmissions] = useState(false);
  const [resetUsers, setResetUsers] = useState(false);
  const [extraDays, setExtraDays] = useState(0);
  const [extendReason, setExtendReason] = useState("");
  const [failReason, setFailReason] = useState("");
  const [overrideNewStatus, setOverrideNewStatus] = useState("");
  const [overrideReason, setOverrideReason] = useState("");
  const [manualPaymentAmount, setManualPaymentAmount] = useState(0);
  const [manualPaymentType, setManualPaymentType] = useState("subscription");
  const [manualPaymentMode, setManualPaymentMode] = useState("BANK_TRANSFER");
  const [manualPaymentRef, setManualPaymentRef] = useState("");
  const [manualPaymentNotes, setManualPaymentNotes] = useState("");

  // Invoice form state
  const [invoiceOrgId, setInvoiceOrgId] = useState("");
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
  const [invoicePeriodStart, setInvoicePeriodStart] = useState("");
  const [invoicePeriodEnd, setInvoicePeriodEnd] = useState("");
  const [invoicePlanAmount, setInvoicePlanAmount] = useState(0);
  const [invoiceExtraAmount, setInvoiceExtraAmount] = useState(0);
  const [invoiceTotalAmount, setInvoiceTotalAmount] = useState(0);
  const [invoiceNotes, setInvoiceNotes] = useState("");
  const [invoiceFilterOrg, setInvoiceFilterOrg] = useState("");
  const [invoiceFilterStatus, setInvoiceFilterStatus] = useState("");

  // Invoice update state
  const [updateInvoiceId, setUpdateInvoiceId] = useState("");
  const [updateInvoiceStatus, setUpdateInvoiceStatus] = useState("");
  const [updateInvoicePaymentMethod, setUpdateInvoicePaymentMethod] = useState("");
  const [updateInvoiceNotes, setUpdateInvoiceNotes] = useState("");

  // Fetch organizations (hooks must be called unconditionally — before any guard/early return)
  const { data: organizations = [] } = useQuery<OrgListItem[]>({
    queryKey: ["/api/super-admin/organizations"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/super-admin/organizations");
      return res.json();
    },
    enabled: !!dbUser?.isSuperAdmin,
  });

  // Fetch billing data for selected org
  const { data: billingData, isLoading: billingLoading, isError: billingError, error: billingErrorMsg } = useQuery<BillingData>({
    queryKey: ["/api/super-admin/billing", selectedOrgId],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/super-admin/organizations/${selectedOrgId}/billing`);
      return res.json();
    },
    enabled: !!selectedOrgId && !!dbUser?.isSuperAdmin,
    retry: 1,
  });

  // Fetch invoices (global, not org-specific)
  const invoiceQueryParams = new URLSearchParams();
  if (invoiceFilterOrg && invoiceFilterOrg !== "all") invoiceQueryParams.set("organizationId", invoiceFilterOrg);
  if (invoiceFilterStatus && invoiceFilterStatus !== "all") invoiceQueryParams.set("status", invoiceFilterStatus);
  const invoiceQS = invoiceQueryParams.toString();

  const { data: allInvoices = [], isLoading: invoicesLoading } = useQuery<any[]>({
    queryKey: ["/api/super-admin/billing/invoices", invoiceQS],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/super-admin/billing/invoices${invoiceQS ? "?" + invoiceQS : ""}`);
      return res.json();
    },
    enabled: !!dbUser?.isSuperAdmin,
  });

  const filteredOrgs = organizations.filter(
    (o) =>
      o.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.domain.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const invalidateBilling = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/super-admin/billing", selectedOrgId] });
  };

  // ─── Mutations ────────────────────────────────────────────────
  const confirmPaymentMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/super-admin/billing/confirm-payment", {
        txnId: selectedTxnId,
        payuMihpayid,
        paymentMode,
        notes,
      });
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: "Payment Confirmed", description: data.message });
      setConfirmPaymentDialog(false);
      resetFormState();
      invalidateBilling();
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const changePlanMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/super-admin/billing/change-plan", {
        organizationId: selectedOrgId,
        planName: selectedPlanName,
        immediate: planChangeImmediate,
        reason: planChangeReason,
      });
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: "Plan Changed", description: data.message });
      setChangePlanDialog(false);
      resetFormState();
      invalidateBilling();
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const adjustOutstandingMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/super-admin/billing/adjust-outstanding", {
        organizationId: selectedOrgId,
        amount: outstandingAmount,
        reason: outstandingReason,
      });
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: "Outstanding Adjusted", description: data.message });
      setAdjustOutstandingDialog(false);
      resetFormState();
      invalidateBilling();
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const resetUsageMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/super-admin/billing/reset-usage", {
        organizationId: selectedOrgId,
        resetFlows,
        resetSubmissions,
        resetUsers,
      });
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: "Usage Reset", description: data.message });
      setResetUsageDialog(false);
      resetFormState();
      invalidateBilling();
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const extendCycleMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/super-admin/billing/extend-cycle", {
        organizationId: selectedOrgId,
        extraDays,
        reason: extendReason,
      });
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: "Cycle Extended", description: data.message });
      setExtendCycleDialog(false);
      resetFormState();
      invalidateBilling();
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const failPaymentMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/super-admin/billing/fail-payment", {
        txnId: selectedTxnId,
        reason: failReason,
      });
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: "Payment Marked Failed", description: data.message });
      setFailPaymentDialog(false);
      resetFormState();
      invalidateBilling();
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const cancelScheduledMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/super-admin/billing/cancel-scheduled-upgrade", {
        organizationId: selectedOrgId,
      });
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: "Upgrade Cancelled", description: data.message });
      invalidateBilling();
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const overrideStatusMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/super-admin/billing/override-payment-status", {
        txnId: selectedTxnId,
        newStatus: overrideNewStatus,
        reason: overrideReason,
      });
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: "Status Overridden", description: data.message });
      setOverrideStatusDialog(false);
      resetFormState();
      invalidateBilling();
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const createManualPaymentMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/super-admin/billing/create-manual-payment", {
        organizationId: selectedOrgId,
        amount: manualPaymentAmount,
        paymentType: manualPaymentType,
        paymentMode: manualPaymentMode,
        reference: manualPaymentRef,
        notes: manualPaymentNotes,
      });
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: "Manual Payment Created", description: data.message });
      setCreateManualPaymentDialog(false);
      resetFormState();
      invalidateBilling();
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  // ─── Invoice Mutations ────────────────────────────────────────────────
  const uploadInvoiceMutation = useMutation({
    mutationFn: async () => {
      const formData = new FormData();
      formData.append("organizationId", invoiceOrgId);
      formData.append("billingPeriodStart", invoicePeriodStart);
      formData.append("billingPeriodEnd", invoicePeriodEnd);
      formData.append("planAmount", String(invoicePlanAmount));
      formData.append("extraUsageAmount", String(invoiceExtraAmount));
      formData.append("totalAmount", String(invoiceTotalAmount));
      if (invoiceNotes) formData.append("notes", invoiceNotes);
      if (invoiceFile) formData.append("file", invoiceFile);

      const res = await fetch("/api/super-admin/billing/invoices/upload", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Upload failed" }));
        throw new Error(err.message || "Upload failed");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Invoice Uploaded", description: "Invoice created and file uploaded to Google Drive" });
      setUploadInvoiceDialog(false);
      resetInvoiceForm();
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/billing/invoices"] });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const updateInvoiceMutation = useMutation({
    mutationFn: async () => {
      const body: any = {};
      if (updateInvoiceStatus) body.status = updateInvoiceStatus;
      if (updateInvoicePaymentMethod) body.paymentMethod = updateInvoicePaymentMethod;
      if (updateInvoiceNotes) body.notes = updateInvoiceNotes;
      const res = await apiRequest("PATCH", `/api/super-admin/billing/invoices/${updateInvoiceId}`, body);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Invoice Updated" });
      setUpdateInvoiceDialog(false);
      setUpdateInvoiceId("");
      setUpdateInvoiceStatus("");
      setUpdateInvoicePaymentMethod("");
      setUpdateInvoiceNotes("");
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/billing/invoices"] });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  // Guard — AFTER all hooks to comply with React Rules of Hooks
  if (!dbUser?.isSuperAdmin) {
    return (
      <AppLayout title="Access Denied">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Super Admin access required</p>
        </div>
      </AppLayout>
    );
  }

  function resetFormState() {
    setSelectedTxnId("");
    setPayuMihpayid("");
    setPaymentMode("");
    setNotes("");
    setSelectedPlanName("");
    setPlanChangeImmediate(true);
    setPlanChangeReason("");
    setOutstandingAmount(0);
    setOutstandingReason("");
    setResetFlows(false);
    setResetSubmissions(false);
    setResetUsers(false);
    setExtraDays(0);
    setExtendReason("");
    setFailReason("");
    setOverrideNewStatus("");
    setOverrideReason("");
    setManualPaymentAmount(0);
    setManualPaymentType("subscription");
    setManualPaymentMode("BANK_TRANSFER");
    setManualPaymentRef("");
    setManualPaymentNotes("");
  }

  function resetInvoiceForm() {
    setInvoiceOrgId("");
    setInvoiceFile(null);
    setInvoicePeriodStart("");
    setInvoicePeriodEnd("");
    setInvoicePlanAmount(0);
    setInvoiceExtraAmount(0);
    setInvoiceTotalAmount(0);
    setInvoiceNotes("");
  }

  const formatDate = (d: string) =>
    d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "-";

  const formatDateTime = (d: string) =>
    d ? new Date(d).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "-";

  const sub = billingData?.subscription;
  const plan = billingData?.plan;

  return (
    <AppLayout title="Billing Management">
      <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-indigo-600" />
            Super Admin — Billing Management
          </h1>
          <p className="text-gray-500 mt-1">
            Confirm payments, change plans, manage subscriptions for any organization
          </p>
        </div>

        {/* Organization Selector */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Select Organization</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 mb-3">
              <Search className="w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search organizations…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm"
              />
            </div>
            <div className="max-h-48 overflow-y-auto border rounded-lg">
              {filteredOrgs.map((org) => (
                <button
                  key={org.id}
                  onClick={() => setSelectedOrgId(org.id)}
                  className={`w-full text-left px-4 py-2.5 border-b last:border-0 flex items-center justify-between hover:bg-gray-50 transition-colors ${
                    selectedOrgId === org.id ? "bg-indigo-50 border-l-2 border-l-indigo-500" : ""
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Building2 className="w-4 h-4 text-gray-400" />
                    <div>
                      <span className="font-medium text-sm">{org.name}</span>
                      <span className="text-xs text-gray-400 ml-2">{org.domain}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">{org.planType}</Badge>
                    {org.isSuspended && <Badge variant="destructive" className="text-xs">Suspended</Badge>}
                  </div>
                </button>
              ))}
              {filteredOrgs.length === 0 && (
                <p className="text-sm text-gray-400 p-4 text-center">No organizations found</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Billing Details */}
        {selectedOrgId && billingLoading && (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
            <span className="ml-2 text-gray-500">Loading billing data…</span>
          </div>
        )}

        {selectedOrgId && billingError && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="flex items-center gap-3 py-4">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
              <div>
                <p className="font-medium text-red-800">Failed to load billing data</p>
                <p className="text-sm text-red-600 mt-0.5">
                  {(billingErrorMsg as any)?.message || "Unable to fetch billing information for this organization. Please try again."}
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="ml-auto shrink-0"
                onClick={() => invalidateBilling()}
              >
                <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Retry
              </Button>
            </CardContent>
          </Card>
        )}

        {billingData && (
          <>
            {/* Current Subscription Overview */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Plan Card */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Crown className="w-4 h-4 text-yellow-500" />
                    Current Plan
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {sub && plan ? (
                    <>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Plan</span>
                        <span className="font-semibold">{plan.displayName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Status</span>
                        <Badge variant={sub.status === "active" ? "default" : "destructive"}>{sub.status}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Price</span>
                        <span>₹{plan.priceMonthly.toLocaleString()}/mo</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between">
                        <span className="text-gray-500">Cycle</span>
                        <span>{formatDate(sub.billingCycleStart)} — {formatDate(sub.billingCycleEnd)}</span>
                      </div>
                      {sub.trialEndsAt && (
                        <div className="flex justify-between text-amber-600">
                          <span>Trial Ends</span>
                          <span>{formatDate(sub.trialEndsAt)}</span>
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="text-gray-400 italic">No active subscription</p>
                  )}
                </CardContent>
              </Card>

              {/* Usage Card */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-blue-500" />
                    Usage
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {sub && plan ? (
                    <>
                      <div className="flex justify-between">
                        <span className="flex items-center gap-1 text-gray-500"><Workflow className="w-3 h-3" /> Flows</span>
                        <span className={`font-medium ${(sub.usedFlows || 0) > plan.maxFlows ? "text-red-600" : ""}`}>
                          {sub.usedFlows || 0} / {plan.maxFlows}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="flex items-center gap-1 text-gray-500"><FileText className="w-3 h-3" /> Submissions</span>
                        <span className={`font-medium ${(sub.usedFormSubmissions || 0) > plan.maxFormSubmissions ? "text-red-600" : ""}`}>
                          {sub.usedFormSubmissions || 0} / {plan.maxFormSubmissions}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="flex items-center gap-1 text-gray-500"><Users className="w-3 h-3" /> Users</span>
                        <span className={`font-medium ${(sub.usedUsers || 0) > plan.maxUsers ? "text-red-600" : ""}`}>
                          {sub.usedUsers || 0} / {plan.maxUsers}
                        </span>
                      </div>
                      <Separator />
                      <div className="flex justify-between">
                        <span className="text-gray-500">Outstanding</span>
                        <span className={`font-semibold ${(sub.outstandingAmount || 0) > 0 ? "text-red-600" : "text-green-600"}`}>
                          ₹{(sub.outstandingAmount || 0).toLocaleString()}
                        </span>
                      </div>
                    </>
                  ) : (
                    <p className="text-gray-400 italic">No usage data</p>
                  )}
                </CardContent>
              </Card>

              {/* Scheduled Upgrade Card */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <ArrowUpRight className="w-4 h-4 text-green-500" />
                    Scheduled Upgrade
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {sub?.scheduledPlanId && billingData.scheduledPlan ? (
                    <>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Upgrading to</span>
                        <span className="font-semibold text-green-700">{billingData.scheduledPlan.displayName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Activates After</span>
                        <span>{formatDate(sub.billingCycleEnd)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Scheduled On</span>
                        <span>{formatDate(sub.scheduledAt)}</span>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full mt-2 text-red-600 border-red-200 hover:bg-red-50"
                        onClick={() => cancelScheduledMutation.mutate()}
                        disabled={cancelScheduledMutation.isPending}
                      >
                        {cancelScheduledMutation.isPending ? (
                          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                        ) : (
                          <XCircle className="w-3 h-3 mr-1" />
                        )}
                        Cancel Upgrade
                      </Button>
                    </>
                  ) : (
                    <p className="text-gray-400 italic">No pending upgrade</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Action Buttons */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Admin Actions</CardTitle>
                <CardDescription>Full control over this organization's billing</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => setChangePlanDialog(true)}>
                    <Crown className="w-3.5 h-3.5 mr-1.5" /> Change Plan
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => {
                    setOutstandingAmount(sub?.outstandingAmount || 0);
                    setAdjustOutstandingDialog(true);
                  }}>
                    <IndianRupee className="w-3.5 h-3.5 mr-1.5" /> Adjust Outstanding
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setResetUsageDialog(true)}>
                    <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> Reset Usage
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setExtendCycleDialog(true)}>
                    <Calendar className="w-3.5 h-3.5 mr-1.5" /> Extend Cycle
                  </Button>
                  <Button size="sm" variant="outline" className="text-green-700 border-green-200 hover:bg-green-50" onClick={() => setCreateManualPaymentDialog(true)}>
                    <CreditCard className="w-3.5 h-3.5 mr-1.5" /> Record Manual Payment
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Payment History */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-gray-500" />
                  Payment Transactions
                </CardTitle>
                <CardDescription>
                  Confirm pending payments or mark failed — full PayU callback failure recovery
                </CardDescription>
              </CardHeader>
              <CardContent>
                {billingData.payments.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4">No payment transactions</p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Txn ID</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Mode</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {billingData.payments.map((tx: any) => (
                          <TableRow key={tx.id}>
                            <TableCell className="text-xs">{formatDateTime(tx.createdAt)}</TableCell>
                            <TableCell className="font-mono text-xs max-w-[140px] truncate">{tx.txnId}</TableCell>
                            <TableCell className="capitalize text-xs">{tx.paymentType?.replace("_", " ")}</TableCell>
                            <TableCell className="font-medium">₹{tx.amount?.toLocaleString()}</TableCell>
                            <TableCell className="text-xs">{tx.paymentMode || "-"}</TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  tx.status === "success" ? "default" :
                                  tx.status === "pending" ? "secondary" :
                                  tx.status === "refund_pending" ? "outline" :
                                  "destructive"
                                }
                                className="text-xs"
                              >
                                {tx.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                {tx.status === "pending" && (
                                  <>
                                    <Button
                                      size="sm"
                                      variant="default"
                                      className="h-7 text-xs"
                                      onClick={() => {
                                        setSelectedTxnId(tx.txnId);
                                        setConfirmPaymentDialog(true);
                                      }}
                                    >
                                      <CheckCircle className="w-3 h-3 mr-1" /> Confirm
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      className="h-7 text-xs"
                                      onClick={() => {
                                        setSelectedTxnId(tx.txnId);
                                        setFailPaymentDialog(true);
                                      }}
                                    >
                                      <Ban className="w-3 h-3 mr-1" /> Fail
                                    </Button>
                                  </>
                                )}
                                {tx.status === "failed" && (
                                  <Button
                                    size="sm"
                                    variant="default"
                                    className="h-7 text-xs bg-green-600 hover:bg-green-700"
                                    onClick={() => {
                                      setSelectedTxnId(tx.txnId);
                                      setConfirmPaymentDialog(true);
                                    }}
                                  >
                                    <CheckCircle className="w-3 h-3 mr-1" /> Mark as Success
                                  </Button>
                                )}
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 text-xs text-gray-500"
                                  onClick={() => {
                                    setSelectedTxnId(tx.txnId);
                                    setOverrideNewStatus("");
                                    setOverrideReason("");
                                    setOverrideStatusDialog(true);
                                  }}
                                >
                                  Override
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Subscription History */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Subscription History</CardTitle>
              </CardHeader>
              <CardContent>
                {billingData.subscriptionHistory.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4">No subscription history</p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Plan</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Cycle Start</TableHead>
                          <TableHead>Cycle End</TableHead>
                          <TableHead>Flows</TableHead>
                          <TableHead>Submissions</TableHead>
                          <TableHead>Users</TableHead>
                          <TableHead>Outstanding</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {billingData.subscriptionHistory.map((s: any) => {
                          const p = billingData.allPlans.find((pl: any) => pl.id === s.planId);
                          return (
                            <TableRow key={s.id}>
                              <TableCell className="font-medium text-xs">{p?.displayName || "Unknown"}</TableCell>
                              <TableCell>
                                <Badge
                                  variant={s.status === "active" ? "default" : s.status === "expired" ? "secondary" : "destructive"}
                                  className="text-xs"
                                >
                                  {s.status}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-xs">{formatDate(s.billingCycleStart)}</TableCell>
                              <TableCell className="text-xs">{formatDate(s.billingCycleEnd)}</TableCell>
                              <TableCell className="text-xs">{s.usedFlows || 0}</TableCell>
                              <TableCell className="text-xs">{s.usedFormSubmissions || 0}</TableCell>
                              <TableCell className="text-xs">{s.usedUsers || 0}</TableCell>
                              <TableCell className="text-xs">₹{(s.outstandingAmount || 0).toLocaleString()}</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {/* ═══ INVOICE MANAGEMENT (always visible) ═══════════════════════ */}
        <Separator />
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-indigo-500" />
                  Invoice Management
                </CardTitle>
                <CardDescription>Upload invoices and assign to organizations — stored in your Google Drive</CardDescription>
              </div>
              <Button size="sm" onClick={() => setUploadInvoiceDialog(true)}>
                <Upload className="w-3.5 h-3.5 mr-1.5" /> Upload Invoice
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Filters */}
            <div className="flex flex-wrap gap-3 mb-4">
              <Select value={invoiceFilterOrg} onValueChange={setInvoiceFilterOrg}>
                <SelectTrigger className="w-[220px]">
                  <SelectValue placeholder="All Organizations" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Organizations</SelectItem>
                  {organizations.map((org) => (
                    <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={invoiceFilterStatus} onValueChange={setInvoiceFilterStatus}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {invoicesLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
              </div>
            ) : allInvoices.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">No invoices found</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Organization</TableHead>
                      <TableHead>Period</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Extra</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>File</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allInvoices.map((inv: any) => (
                      <TableRow key={inv.id}>
                        <TableCell className="font-mono text-xs">{inv.invoiceNumber}</TableCell>
                        <TableCell className="text-xs">{inv.organizationName || inv.organizationId?.slice(0, 8)}</TableCell>
                        <TableCell className="text-xs">
                          {formatDate(inv.billingPeriodStart)} — {formatDate(inv.billingPeriodEnd)}
                        </TableCell>
                        <TableCell>₹{(inv.planAmount || 0).toLocaleString()}</TableCell>
                        <TableCell>₹{(inv.extraUsageAmount || 0).toLocaleString()}</TableCell>
                        <TableCell className="font-semibold">₹{(inv.totalAmount || 0).toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge
                            variant={inv.status === "paid" ? "default" : inv.status === "overdue" ? "destructive" : "secondary"}
                            className="text-xs"
                          >
                            {inv.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {inv.fileUrl && /^https:\/\//i.test(inv.fileUrl) ? (
                            <a href={inv.fileUrl} target="_blank" rel="noopener noreferrer">
                              <Button size="sm" variant="ghost" className="h-7 text-xs">
                                <ExternalLink className="w-3 h-3 mr-1" /> View
                              </Button>
                            </a>
                          ) : (
                            <span className="text-gray-400 text-xs">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            onClick={() => {
                              setUpdateInvoiceId(inv.id);
                              setUpdateInvoiceStatus(inv.status);
                              setUpdateInvoicePaymentMethod(inv.paymentMethod || "");
                              setUpdateInvoiceNotes(inv.notes || "");
                              setUpdateInvoiceDialog(true);
                            }}
                          >
                            Update
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {!selectedOrgId && (
          <div className="text-center py-12 text-gray-400">
            <Building2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Select an organization above to view and manage billing</p>
          </div>
        )}
      </div>

      {/* ═══ DIALOGS ═══════════════════════════════════════════════════════ */}

      {/* Confirm Payment Dialog */}
      <Dialog open={confirmPaymentDialog} onOpenChange={setConfirmPaymentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Payment Manually</DialogTitle>
            <DialogDescription>
              Use this when PayU callback failed but payment was received. This will activate the subscription.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Transaction ID</Label>
              <Input value={selectedTxnId} disabled className="font-mono text-sm bg-gray-50" />
            </div>
            <div>
              <Label>PayU Transaction ID (mihpayid)</Label>
              <Input
                value={payuMihpayid}
                onChange={(e) => setPayuMihpayid(e.target.value)}
                placeholder="e.g. 403993715535123456"
              />
            </div>
            <div>
              <Label>Payment Mode</Label>
              <Select value={paymentMode} onValueChange={setPaymentMode}>
                <SelectTrigger><SelectValue placeholder="Select mode" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="UPI">UPI</SelectItem>
                  <SelectItem value="CC">Credit Card</SelectItem>
                  <SelectItem value="DC">Debit Card</SelectItem>
                  <SelectItem value="NB">Net Banking</SelectItem>
                  <SelectItem value="WALLET">Wallet</SelectItem>
                  <SelectItem value="MANUAL">Manual / Bank Transfer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Reason for manual confirmation…"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmPaymentDialog(false)}>Cancel</Button>
            <Button onClick={() => confirmPaymentMutation.mutate()} disabled={confirmPaymentMutation.isPending}>
              {confirmPaymentMutation.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-1" />}
              Confirm Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Plan Dialog */}
      <Dialog open={changePlanDialog} onOpenChange={setChangePlanDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Organization Plan</DialogTitle>
            <DialogDescription>
              Force change plan without payment. Choose immediate or schedule for end of billing cycle.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Target Plan</Label>
              <Select value={selectedPlanName} onValueChange={setSelectedPlanName}>
                <SelectTrigger><SelectValue placeholder="Select plan" /></SelectTrigger>
                <SelectContent>
                  {billingData?.allPlans.map((p: any) => (
                    <SelectItem key={p.id} value={p.name}>
                      {p.displayName} — ₹{p.priceMonthly.toLocaleString()}/mo
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="immediate"
                checked={planChangeImmediate}
                onCheckedChange={(c) => setPlanChangeImmediate(c === true)}
              />
              <Label htmlFor="immediate" className="text-sm">
                Apply immediately (cancels current cycle)
              </Label>
            </div>
            {!planChangeImmediate && sub && (
              <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded">
                New plan will activate after current cycle ends on {formatDate(sub.billingCycleEnd)}
              </p>
            )}
            <div>
              <Label>Reason</Label>
              <Textarea
                value={planChangeReason}
                onChange={(e) => setPlanChangeReason(e.target.value)}
                placeholder="Reason for plan change…"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setChangePlanDialog(false)}>Cancel</Button>
            <Button
              onClick={() => changePlanMutation.mutate()}
              disabled={changePlanMutation.isPending || !selectedPlanName}
            >
              {changePlanMutation.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Crown className="w-4 h-4 mr-1" />}
              Change Plan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Adjust Outstanding Dialog */}
      <Dialog open={adjustOutstandingDialog} onOpenChange={setAdjustOutstandingDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust Outstanding Amount</DialogTitle>
            <DialogDescription>Set the outstanding balance to any amount (e.g. waive charges, correct errors).</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>New Outstanding Amount (₹)</Label>
              <Input
                type="number"
                min={0}
                value={outstandingAmount}
                onChange={(e) => setOutstandingAmount(Number(e.target.value))}
              />
            </div>
            <div>
              <Label>Reason</Label>
              <Textarea
                value={outstandingReason}
                onChange={(e) => setOutstandingReason(e.target.value)}
                placeholder="Reason for adjustment…"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjustOutstandingDialog(false)}>Cancel</Button>
            <Button onClick={() => adjustOutstandingMutation.mutate()} disabled={adjustOutstandingMutation.isPending}>
              {adjustOutstandingMutation.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <IndianRupee className="w-4 h-4 mr-1" />}
              Update Outstanding
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Usage Dialog */}
      <Dialog open={resetUsageDialog} onOpenChange={setResetUsageDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Usage Counters</DialogTitle>
            <DialogDescription>Select which usage counters to reset for this billing cycle.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="flex items-center gap-2">
              <Checkbox id="rf" checked={resetFlows} onCheckedChange={(c) => setResetFlows(c === true)} />
              <Label htmlFor="rf">Reset Flow Executions to 0</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="rs" checked={resetSubmissions} onCheckedChange={(c) => setResetSubmissions(c === true)} />
              <Label htmlFor="rs">Reset Form Submissions to 0</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="ru" checked={resetUsers} onCheckedChange={(c) => setResetUsers(c === true)} />
              <Label htmlFor="ru">Reset Users to current count</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetUsageDialog(false)}>Cancel</Button>
            <Button
              onClick={() => resetUsageMutation.mutate()}
              disabled={resetUsageMutation.isPending || (!resetFlows && !resetSubmissions && !resetUsers)}
            >
              {resetUsageMutation.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <RotateCcw className="w-4 h-4 mr-1" />}
              Reset Selected
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Extend Cycle Dialog */}
      <Dialog open={extendCycleDialog} onOpenChange={setExtendCycleDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Extend Billing Cycle</DialogTitle>
            <DialogDescription>Add extra days to the current billing cycle (and trial if applicable).</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Extra Days</Label>
              <Input
                type="number"
                min={1}
                max={365}
                value={extraDays}
                onChange={(e) => setExtraDays(Number(e.target.value))}
              />
            </div>
            <div>
              <Label>Reason</Label>
              <Textarea
                value={extendReason}
                onChange={(e) => setExtendReason(e.target.value)}
                placeholder="Reason for extension…"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExtendCycleDialog(false)}>Cancel</Button>
            <Button onClick={() => extendCycleMutation.mutate()} disabled={extendCycleMutation.isPending || extraDays < 1}>
              {extendCycleMutation.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Calendar className="w-4 h-4 mr-1" />}
              Extend by {extraDays} days
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Fail Payment Dialog */}
      <Dialog open={failPaymentDialog} onOpenChange={setFailPaymentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark Payment as Failed</DialogTitle>
            <DialogDescription>Manually mark this pending payment as failed.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Transaction ID</Label>
              <Input value={selectedTxnId} disabled className="font-mono text-sm bg-gray-50" />
            </div>
            <div>
              <Label>Reason</Label>
              <Textarea
                value={failReason}
                onChange={(e) => setFailReason(e.target.value)}
                placeholder="Why this payment should be marked failed…"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFailPaymentDialog(false)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => failPaymentMutation.mutate()}
              disabled={failPaymentMutation.isPending}
            >
              {failPaymentMutation.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Ban className="w-4 h-4 mr-1" />}
              Mark as Failed
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Override Payment Status Dialog */}
      <Dialog open={overrideStatusDialog} onOpenChange={setOverrideStatusDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Override Payment Status</DialogTitle>
            <DialogDescription>
              Force-set the payment status to any value. Use for refunds, corrections, or edge cases.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Transaction ID</Label>
              <Input value={selectedTxnId} disabled className="font-mono text-sm bg-gray-50" />
            </div>
            <div>
              <Label>New Status</Label>
              <Select value={overrideNewStatus} onValueChange={setOverrideNewStatus}>
                <SelectTrigger><SelectValue placeholder="Select new status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="refunded">Refunded</SelectItem>
                  <SelectItem value="refund_pending">Refund Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Reason <span className="text-red-500">*</span></Label>
              <Textarea
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                placeholder="Mandatory reason for this status override…"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOverrideStatusDialog(false)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => overrideStatusMutation.mutate()}
              disabled={overrideStatusMutation.isPending || !overrideNewStatus || overrideReason.trim().length < 3}
            >
              {overrideStatusMutation.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <AlertCircle className="w-4 h-4 mr-1" />}
              Override Status
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Manual Payment Dialog */}
      <Dialog open={createManualPaymentDialog} onOpenChange={setCreateManualPaymentDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Record Manual Payment</DialogTitle>
            <DialogDescription>
              Create a payment record for offline payments (bank transfer, cash, cheque, etc.).
              This is recorded as a successful payment immediately.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Amount (₹) <span className="text-red-500">*</span></Label>
              <Input
                type="number"
                min={1}
                max={10000000}
                value={manualPaymentAmount || ""}
                onChange={(e) => setManualPaymentAmount(Number(e.target.value))}
                placeholder="e.g. 1999"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Payment Type</Label>
                <Select value={manualPaymentType} onValueChange={setManualPaymentType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="subscription">Subscription</SelectItem>
                    <SelectItem value="outstanding">Outstanding Dues</SelectItem>
                    <SelectItem value="combined">Combined</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Payment Mode</Label>
                <Select value={manualPaymentMode} onValueChange={setManualPaymentMode}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                    <SelectItem value="UPI">UPI</SelectItem>
                    <SelectItem value="CASH">Cash</SelectItem>
                    <SelectItem value="CHEQUE">Cheque</SelectItem>
                    <SelectItem value="MANUAL">Manual</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Reference / UTR Number</Label>
              <Input
                value={manualPaymentRef}
                onChange={(e) => setManualPaymentRef(e.target.value)}
                placeholder="e.g. UTR number, cheque number, bank ref…"
              />
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea
                value={manualPaymentNotes}
                onChange={(e) => setManualPaymentNotes(e.target.value)}
                placeholder="Additional notes about this payment…"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateManualPaymentDialog(false)}>Cancel</Button>
            <Button
              onClick={() => createManualPaymentMutation.mutate()}
              disabled={createManualPaymentMutation.isPending || !manualPaymentAmount || manualPaymentAmount <= 0}
            >
              {createManualPaymentMutation.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <CreditCard className="w-4 h-4 mr-1" />}
              Record Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upload Invoice Dialog */}
      <Dialog open={uploadInvoiceDialog} onOpenChange={setUploadInvoiceDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Upload Invoice</DialogTitle>
            <DialogDescription>
              Upload an invoice file and assign it to an organization. The file will be stored in your Google Drive.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2 max-h-[60vh] overflow-y-auto">
            <div>
              <Label>Organization <span className="text-red-500">*</span></Label>
              <Select value={invoiceOrgId} onValueChange={setInvoiceOrgId}>
                <SelectTrigger><SelectValue placeholder="Select organization" /></SelectTrigger>
                <SelectContent>
                  {organizations.map((org) => (
                    <SelectItem key={org.id} value={org.id}>{org.name} ({org.domain})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Invoice File (PDF, Image, or Document)</Label>
              <Input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
                onChange={(e) => setInvoiceFile(e.target.files?.[0] || null)}
                className="mt-1"
              />
              {invoiceFile && (
                <p className="text-xs text-gray-500 mt-1">{invoiceFile.name} ({(invoiceFile.size / 1024).toFixed(1)} KB)</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Billing Period Start <span className="text-red-500">*</span></Label>
                <Input
                  type="date"
                  value={invoicePeriodStart}
                  onChange={(e) => setInvoicePeriodStart(e.target.value)}
                />
              </div>
              <div>
                <Label>Billing Period End <span className="text-red-500">*</span></Label>
                <Input
                  type="date"
                  value={invoicePeriodEnd}
                  onChange={(e) => setInvoicePeriodEnd(e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Plan Amount (₹)</Label>
                <Input
                  type="number"
                  min={0}
                  value={invoicePlanAmount || ""}
                  onChange={(e) => setInvoicePlanAmount(Number(e.target.value))}
                  placeholder="0"
                />
              </div>
              <div>
                <Label>Extra Usage (₹)</Label>
                <Input
                  type="number"
                  min={0}
                  value={invoiceExtraAmount || ""}
                  onChange={(e) => setInvoiceExtraAmount(Number(e.target.value))}
                  placeholder="0"
                />
              </div>
              <div>
                <Label>Total Amount (₹) <span className="text-red-500">*</span></Label>
                <Input
                  type="number"
                  min={1}
                  value={invoiceTotalAmount || ""}
                  onChange={(e) => setInvoiceTotalAmount(Number(e.target.value))}
                  placeholder="Total"
                />
              </div>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea
                value={invoiceNotes}
                onChange={(e) => setInvoiceNotes(e.target.value)}
                placeholder="Optional notes for this invoice…"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setUploadInvoiceDialog(false); resetInvoiceForm(); }}>Cancel</Button>
            <Button
              onClick={() => uploadInvoiceMutation.mutate()}
              disabled={uploadInvoiceMutation.isPending || !invoiceOrgId || !invoicePeriodStart || !invoicePeriodEnd || !invoiceTotalAmount}
            >
              {uploadInvoiceMutation.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Upload className="w-4 h-4 mr-1" />}
              Upload Invoice
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Update Invoice Status Dialog */}
      <Dialog open={updateInvoiceDialog} onOpenChange={setUpdateInvoiceDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Invoice</DialogTitle>
            <DialogDescription>Change the status, payment method, or notes for this invoice.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Status</Label>
              <Select value={updateInvoiceStatus} onValueChange={setUpdateInvoiceStatus}>
                <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Payment Method</Label>
              <Select value={updateInvoicePaymentMethod} onValueChange={setUpdateInvoicePaymentMethod}>
                <SelectTrigger><SelectValue placeholder="Select payment method" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="upi">UPI</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                  <SelectItem value="payu">PayU</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea
                value={updateInvoiceNotes}
                onChange={(e) => setUpdateInvoiceNotes(e.target.value)}
                placeholder="Update notes…"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUpdateInvoiceDialog(false)}>Cancel</Button>
            <Button
              onClick={() => updateInvoiceMutation.mutate()}
              disabled={updateInvoiceMutation.isPending}
            >
              {updateInvoiceMutation.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-1" />}
              Update Invoice
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
