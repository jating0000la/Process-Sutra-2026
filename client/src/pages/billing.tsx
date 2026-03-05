import { AppLayout } from "@/components/app-layout";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation, useSearch } from "wouter";
import {
  CreditCard,
  Zap,
  Users,
  FileText,
  Workflow,
  AlertTriangle,
  CheckCircle2,
  Clock,
  TrendingUp,
  ArrowUpRight,
  Crown,
  Sparkles,
  IndianRupee,
  History,
  AlertCircle,
  ExternalLink,
  RefreshCw,
  Loader2,
} from "lucide-react";

interface Plan {
  id: string;
  name: string;
  displayName: string;
  priceMonthly: number;
  maxUsers: number;
  maxFlows: number;
  maxFormSubmissions: number;
  extraFlowCost: number;
  extraSubmissionCost: number;
  extraUserCost: number;
  trialDurationDays: number | null;
  sortOrder: number;
}

interface Subscription {
  id: string;
  organizationId: string;
  planId: string;
  status: string;
  billingCycleStart: string;
  billingCycleEnd: string;
  trialEndsAt: string | null;
  usedFlows: number;
  usedFormSubmissions: number;
  usedUsers: number;
  outstandingAmount: number;
}

interface SubscriptionData {
  subscription: Subscription | null;
  plan: Plan | null;
  usage: { flows: number; formSubmissions: number; users: number } | null;
  limits: { maxFlows: number; maxFormSubmissions: number; maxUsers: number } | null;
  limitsExceeded: { flows: boolean; formSubmissions: boolean; users: boolean };
  extraUsage: { extraFlows: number; extraSubmissions: number; extraUsers: number; totalExtra: number } | null;
  isExpired: boolean;
  isTrialExpired: boolean;
  outstandingAmount: number;
}

interface PaymentTransaction {
  id: string;
  txnId: string;
  amount: number;
  planAmount: number;
  outstandingAmount: number;
  extraUsageAmount: number;
  status: string;
  paymentType: string;
  paymentMode: string | null;
  createdAt: string;
}

export default function Billing() {
  const { dbUser } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const searchString = useSearch();
  const payuFormRef = useRef<HTMLFormElement>(null);
  const [payuData, setPayuData] = useState<any>(null);
  const [payuUrl, setPayuUrl] = useState<string>("");
  const [showPayuForm, setShowPayuForm] = useState(false);
  const [verifyingPayment, setVerifyingPayment] = useState(false);
  const [verifyingTxnId, setVerifyingTxnId] = useState<string | null>(null);

  // Handle payment callback query params
  useEffect(() => {
    const params = new URLSearchParams(searchString);
    const payment = params.get("payment");
    if (payment === "success") {
      toast({ title: "Payment Successful!", description: "Your subscription has been updated.", variant: "default" });
      queryClient.invalidateQueries({ queryKey: ["/api/billing/subscription"] });
      queryClient.invalidateQueries({ queryKey: ["/api/billing/payment-history"] });
    } else if (payment === "failed") {
      const reason = params.get("reason") || "Payment failed";
      toast({ title: "Payment Failed", description: reason, variant: "destructive" });
    } else if (payment === "error") {
      toast({ title: "Payment Error", description: "Something went wrong. Please try again.", variant: "destructive" });
    } else if (payment === "pending") {
      // PayU callback didn't reach our server — auto-verify pending payments
      toast({ title: "Verifying Payment…", description: "Checking payment status with PayU…" });
      processPendingPayments();
    }
  }, [searchString]);

  // Auto-verify pending payments on page load
  useEffect(() => {
    processPendingPayments();
  }, []);

  const processPendingPayments = async () => {
    try {
      setVerifyingPayment(true);
      const res = await apiRequest("POST", "/api/billing/process-pending");
      const result = await res.json();
      if (result.results) {
        const successCount = result.results.filter((r: any) => r.status === "success").length;
        if (successCount > 0) {
          toast({
            title: "Payment Verified!",
            description: `${successCount} payment(s) confirmed and subscription activated.`,
          });
          queryClient.invalidateQueries({ queryKey: ["/api/billing/subscription"] });
          queryClient.invalidateQueries({ queryKey: ["/api/billing/payment-history"] });
        }
      }
    } catch (err) {
      // Silently fail — just a background check
      console.log("Pending payment check:", err);
    } finally {
      setVerifyingPayment(false);
    }
  };

  const verifySpecificPayment = async (txnId: string) => {
    try {
      setVerifyingTxnId(txnId);
      const res = await apiRequest("POST", "/api/billing/verify-payment", { txnId });
      const result = await res.json();
      if (result.status === "success") {
        toast({ title: "Payment Verified!", description: result.message || "Subscription activated." });
        queryClient.invalidateQueries({ queryKey: ["/api/billing/subscription"] });
        queryClient.invalidateQueries({ queryKey: ["/api/billing/payment-history"] });
      } else if (result.status === "failed") {
        toast({ title: "Payment Failed", description: result.message, variant: "destructive" });
        queryClient.invalidateQueries({ queryKey: ["/api/billing/payment-history"] });
      } else {
        toast({ title: "Still Pending", description: result.message || "Payment not yet confirmed by PayU." });
      }
    } catch (err: any) {
      toast({ title: "Verification Error", description: err.message || "Could not verify payment", variant: "destructive" });
    } finally {
      setVerifyingTxnId(null);
    }
  };

  // Fetch plans
  const { data: plans = [] } = useQuery<Plan[]>({
    queryKey: ["/api/billing/plans"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/billing/plans");
      return res.json();
    },
  });

  // Fetch current subscription
  const { data: subscriptionData, isLoading: subLoading } = useQuery<SubscriptionData>({
    queryKey: ["/api/billing/subscription"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/billing/subscription");
      return res.json();
    },
  });

  // Fetch payment history
  const { data: paymentHistory = [] } = useQuery<PaymentTransaction[]>({
    queryKey: ["/api/billing/payment-history"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/billing/payment-history");
      return res.json();
    },
  });

  // Start free trial
  const startTrialMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/billing/subscribe", { planName: "free_trial" });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Free Trial Activated!", description: "You have 14 days to explore ProcessSutra." });
      queryClient.invalidateQueries({ queryKey: ["/api/billing/subscription"] });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to start trial", variant: "destructive" });
    },
  });

  // Initiate payment
  const initiatePaymentMutation = useMutation({
    mutationFn: async (data: { planName?: string; paymentType: string }) => {
      const res = await apiRequest("POST", "/api/billing/initiate-payment", data);
      return res.json();
    },
    onSuccess: (result) => {
      if (result.payuData) {
        setPayuData(result.payuData);
        setPayuUrl(result.payuUrl || "");
        setShowPayuForm(true);
        // Auto-submit form after state update
        setTimeout(() => {
          payuFormRef.current?.submit();
        }, 100);
      }
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to initiate payment", variant: "destructive" });
    },
  });

  const handleUpgrade = useCallback((planName: string) => {
    if (!subscriptionData?.subscription) {
      // No subscription - check if free trial available
      if (planName === "free_trial") {
        startTrialMutation.mutate();
      } else {
        initiatePaymentMutation.mutate({ planName, paymentType: "subscription" });
      }
    } else if (subscriptionData.outstandingAmount > 0) {
      // Has outstanding balance
      initiatePaymentMutation.mutate({ planName, paymentType: "combined" });
    } else {
      initiatePaymentMutation.mutate({ planName, paymentType: "subscription" });
    }
  }, [subscriptionData]);

  const handlePayOutstanding = useCallback(() => {
    initiatePaymentMutation.mutate({ paymentType: "outstanding" });
  }, []);

  const sub = subscriptionData?.subscription;
  const currentPlan = subscriptionData?.plan;
  const usage = subscriptionData?.usage;
  const limits = subscriptionData?.limits;

  const getUsagePercent = (used: number, limit: number) =>
    limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;

  const getProgressColor = (percent: number) =>
    percent >= 90 ? "bg-red-500" : percent >= 70 ? "bg-yellow-500" : "bg-blue-500";

  const formatDate = (d: string) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

  const isAdmin = dbUser?.role === "admin";

  const pendingPayments = paymentHistory.filter((tx) => tx.status === "pending");

  return (
    <AppLayout title="Billing & Subscription">
      <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
        {/* Pending Payment Verification Banner */}
        {pendingPayments.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
            <Clock className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="font-semibold text-blue-800">Pending Payment{pendingPayments.length > 1 ? "s" : ""}</h3>
              <p className="text-blue-700 text-sm mt-1">
                You have {pendingPayments.length} payment{pendingPayments.length > 1 ? "s" : ""} awaiting confirmation.
                If you completed the payment on PayU, click below to verify.
              </p>
              <Button
                className="mt-3"
                size="sm"
                variant="outline"
                onClick={processPendingPayments}
                disabled={verifyingPayment}
              >
                {verifyingPayment ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Verifying…</>
                ) : (
                  <><RefreshCw className="w-4 h-4 mr-2" /> Verify Pending Payments</>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Billing & Subscription</h1>
            <p className="text-gray-500 mt-1">Manage your plan, usage, and payments</p>
          </div>
          {sub && (
            <Badge
              variant={sub.status === "active" ? "default" : "destructive"}
              className="text-sm px-3 py-1"
            >
              {sub.status === "active" ? (
                <><CheckCircle2 className="w-4 h-4 mr-1" /> Active</>
              ) : (
                <><AlertTriangle className="w-4 h-4 mr-1" /> {sub.status}</>
              )}
            </Badge>
          )}
        </div>

        {/* Alert: Trial expired or limit reached */}
        {subscriptionData?.isTrialExpired && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-amber-800">Free Trial Expired</h3>
              <p className="text-amber-700 text-sm mt-1">
                Your free trial has ended. Upgrade to a paid plan to continue using ProcessSutra workflows.
              </p>
              <Button className="mt-3" size="sm" onClick={() => document.getElementById("plans-section")?.scrollIntoView({ behavior: "smooth" })}>
                <Crown className="w-4 h-4 mr-2" /> View Plans
              </Button>
            </div>
          </div>
        )}

        {(subscriptionData?.outstandingAmount ?? 0) > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-red-800">Outstanding Balance: ₹{subscriptionData?.outstandingAmount}</h3>
              <p className="text-red-700 text-sm mt-1">
                You have extra usage charges. Please pay the outstanding amount to avoid service interruption.
              </p>
              {isAdmin && (
                <Button
                  className="mt-3"
                  size="sm"
                  variant="destructive"
                  onClick={handlePayOutstanding}
                  disabled={initiatePaymentMutation.isPending}
                >
                  <IndianRupee className="w-4 h-4 mr-1" />
                  Pay ₹{subscriptionData?.outstandingAmount}
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Current Plan & Usage */}
        {sub && currentPlan && usage && limits ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Current Plan Card */}
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Crown className="w-5 h-5 text-yellow-500" />
                  {currentPlan.displayName}
                </CardTitle>
                <CardDescription>
                  {currentPlan.priceMonthly === 0
                    ? "Free Trial"
                    : `₹${currentPlan.priceMonthly.toLocaleString()}/month`}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-gray-600">
                <div className="flex justify-between">
                  <span>Billing Cycle</span>
                  <span className="font-medium">{formatDate(sub.billingCycleStart)} — {formatDate(sub.billingCycleEnd)}</span>
                </div>
                {sub.trialEndsAt && (
                  <div className="flex justify-between text-amber-600">
                    <span>Trial Expires</span>
                    <span className="font-medium">{formatDate(sub.trialEndsAt)}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between">
                  <span>Outstanding</span>
                  <span className={`font-semibold ${(sub.outstandingAmount || 0) > 0 ? "text-red-600" : "text-green-600"}`}>
                    ₹{(sub.outstandingAmount || 0).toLocaleString()}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Usage Cards */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-blue-500" />
                  Current Usage
                </CardTitle>
                <CardDescription>Usage for current billing cycle</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Flows */}
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="flex items-center gap-2 text-sm font-medium">
                      <Workflow className="w-4 h-4 text-purple-500" /> Flow Executions
                    </span>
                    <span className="text-sm text-gray-500">
                      {usage.flows} / {limits.maxFlows}
                    </span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${getProgressColor(getUsagePercent(usage.flows, limits.maxFlows))}`}
                      style={{ width: `${getUsagePercent(usage.flows, limits.maxFlows)}%` }}
                    />
                  </div>
                </div>

                {/* Form Submissions */}
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="flex items-center gap-2 text-sm font-medium">
                      <FileText className="w-4 h-4 text-green-500" /> Form Submissions
                    </span>
                    <span className="text-sm text-gray-500">
                      {usage.formSubmissions} / {limits.maxFormSubmissions}
                    </span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${getProgressColor(getUsagePercent(usage.formSubmissions, limits.maxFormSubmissions))}`}
                      style={{ width: `${getUsagePercent(usage.formSubmissions, limits.maxFormSubmissions)}%` }}
                    />
                  </div>
                </div>

                {/* Users */}
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="flex items-center gap-2 text-sm font-medium">
                      <Users className="w-4 h-4 text-blue-500" /> Users
                    </span>
                    <span className="text-sm text-gray-500">
                      {usage.users} / {limits.maxUsers}
                    </span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${getProgressColor(getUsagePercent(usage.users, limits.maxUsers))}`}
                      style={{ width: `${getUsagePercent(usage.users, limits.maxUsers)}%` }}
                    />
                  </div>
                </div>

                {/* Extra usage info */}
                {subscriptionData?.extraUsage && subscriptionData.extraUsage.totalExtra > 0 && (
                  <div className="bg-amber-50 rounded-lg p-3 text-sm">
                    <p className="font-semibold text-amber-800 mb-2">Extra Usage Charges</p>
                    <div className="space-y-1 text-amber-700">
                      {subscriptionData.extraUsage.extraFlows > 0 && (
                        <div className="flex justify-between">
                          <span>{subscriptionData.extraUsage.extraFlows} extra flows × ₹{currentPlan.extraFlowCost}</span>
                          <span>₹{subscriptionData.extraUsage.extraFlows * currentPlan.extraFlowCost}</span>
                        </div>
                      )}
                      {subscriptionData.extraUsage.extraSubmissions > 0 && (
                        <div className="flex justify-between">
                          <span>{subscriptionData.extraUsage.extraSubmissions} extra submissions × ₹{currentPlan.extraSubmissionCost}</span>
                          <span>₹{subscriptionData.extraUsage.extraSubmissions * currentPlan.extraSubmissionCost}</span>
                        </div>
                      )}
                      {subscriptionData.extraUsage.extraUsers > 0 && (
                        <div className="flex justify-between">
                          <span>{subscriptionData.extraUsage.extraUsers} extra users × ₹{currentPlan.extraUserCost}</span>
                          <span>₹{subscriptionData.extraUsage.extraUsers * currentPlan.extraUserCost}</span>
                        </div>
                      )}
                      <Separator className="my-1" />
                      <div className="flex justify-between font-semibold">
                        <span>Total Extra</span>
                        <span>₹{subscriptionData.extraUsage.totalExtra}</span>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        ) : !subLoading ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Sparkles className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900">No Active Subscription</h3>
              <p className="text-gray-500 mt-2 max-w-md mx-auto">
                Get started with a free trial or choose a plan below to unlock the full power of ProcessSutra.
              </p>
              <Button className="mt-4" onClick={() => startTrialMutation.mutate()} disabled={startTrialMutation.isPending}>
                <Zap className="w-4 h-4 mr-2" /> Start Free Trial (14 days)
              </Button>
            </CardContent>
          </Card>
        ) : null}

        {/* Plans Section */}
        <div id="plans-section">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Available Plans</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {plans.map((plan) => {
              const isCurrent = currentPlan?.name === plan.name;
              const isRecommended = plan.name === "growth";
              return (
                <Card
                  key={plan.id}
                  className={`relative ${isCurrent ? "ring-2 ring-blue-500" : ""} ${isRecommended ? "ring-2 ring-orange-400" : ""}`}
                >
                  {isCurrent && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="bg-blue-500">Current Plan</Badge>
                    </div>
                  )}
                  {isRecommended && !isCurrent && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="bg-orange-500">Recommended</Badge>
                    </div>
                  )}
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">{plan.displayName}</CardTitle>
                    <div className="mt-2">
                      {plan.priceMonthly === 0 ? (
                        <div>
                          <span className="text-3xl font-bold text-green-600">Free</span>
                          <span className="text-gray-500 text-sm ml-1">{plan.trialDurationDays} days</span>
                        </div>
                      ) : (
                        <div>
                          <span className="text-3xl font-bold">₹{plan.priceMonthly.toLocaleString()}</span>
                          <span className="text-gray-500 text-sm">/month</span>
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-blue-500" />
                      <span>{plan.maxUsers} users</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Workflow className="w-4 h-4 text-purple-500" />
                      <span>{plan.maxFlows} flow executions</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-green-500" />
                      <span>{plan.maxFormSubmissions} form submissions</span>
                    </div>
                    {plan.priceMonthly > 0 && (
                      <>
                        <Separator />
                        <p className="text-xs text-gray-400">
                          Extra: ₹{plan.extraFlowCost}/flow · ₹{plan.extraSubmissionCost}/submission · ₹{plan.extraUserCost}/user
                        </p>
                      </>
                    )}
                  </CardContent>
                  <CardFooter>
                    {isAdmin && !isCurrent ? (
                      <Button
                        className="w-full"
                        variant={plan.priceMonthly === 0 ? "outline" : "default"}
                        onClick={() => handleUpgrade(plan.name)}
                        disabled={startTrialMutation.isPending || initiatePaymentMutation.isPending}
                      >
                        {plan.priceMonthly === 0 ? (
                          <><Zap className="w-4 h-4 mr-2" /> Start Free Trial</>
                        ) : (
                          <><ArrowUpRight className="w-4 h-4 mr-2" /> {sub ? "Upgrade" : "Subscribe"}</>
                        )}
                      </Button>
                    ) : isCurrent ? (
                      <Button className="w-full" variant="outline" disabled>
                        <CheckCircle2 className="w-4 h-4 mr-2" /> Current Plan
                      </Button>
                    ) : (
                      <Button className="w-full" variant="outline" disabled>
                        Admin Only
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Payment History */}
        {paymentHistory.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="w-5 h-5 text-gray-500" />
                Payment History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-gray-500">
                      <th className="pb-3 pr-4">Date</th>
                      <th className="pb-3 pr-4">Transaction ID</th>
                      <th className="pb-3 pr-4">Type</th>
                      <th className="pb-3 pr-4">Amount</th>
                      <th className="pb-3 pr-4">Mode</th>
                      <th className="pb-3 pr-4">Status</th>
                      <th className="pb-3">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paymentHistory.map((tx) => (
                      <tr key={tx.id} className="border-b last:border-0">
                        <td className="py-3 pr-4">{formatDate(tx.createdAt)}</td>
                        <td className="py-3 pr-4 font-mono text-xs">{tx.txnId}</td>
                        <td className="py-3 pr-4 capitalize">{tx.paymentType.replace("_", " ")}</td>
                        <td className="py-3 pr-4 font-medium">₹{tx.amount.toLocaleString()}</td>
                        <td className="py-3 pr-4">{tx.paymentMode || "-"}</td>
                        <td className="py-3 pr-4">
                          <Badge
                            variant={tx.status === "success" ? "default" : tx.status === "pending" ? "secondary" : "destructive"}
                          >
                            {tx.status}
                          </Badge>
                        </td>
                        <td className="py-3">
                          {tx.status === "pending" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => verifySpecificPayment(tx.txnId)}
                              disabled={verifyingTxnId === tx.txnId}
                              className="text-xs"
                            >
                              {verifyingTxnId === tx.txnId ? (
                                <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Verifying…</>
                              ) : (
                                <><RefreshCw className="w-3 h-3 mr-1" /> Verify</>
                              )}
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Hidden PayU form for redirect */}
        {showPayuForm && payuData && payuUrl && (
          <form
            ref={payuFormRef}
            method="POST"
            action={payuUrl}
            style={{ display: "none" }}
          >
            <input type="hidden" name="key" value={payuData.key} />
            <input type="hidden" name="txnid" value={payuData.txnid} />
            <input type="hidden" name="amount" value={payuData.amount} />
            <input type="hidden" name="productinfo" value={payuData.productinfo} />
            <input type="hidden" name="firstname" value={payuData.firstname} />
            <input type="hidden" name="email" value={payuData.email} />
            <input type="hidden" name="phone" value={payuData.phone} />
            <input type="hidden" name="surl" value={payuData.surl} />
            <input type="hidden" name="furl" value={payuData.furl} />
            <input type="hidden" name="hash" value={payuData.hash} />
            <input type="hidden" name="service_provider" value={payuData.service_provider} />
          </form>
        )}
      </div>
    </AppLayout>
  );
}
