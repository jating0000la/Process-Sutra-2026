import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useState, useEffect, useRef } from "react";
import { useSearch } from "wouter";
import { AppLayout } from "@/components/app-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import SEOHead, { pageSEO } from "@/components/SEOHead";
import { apiRequest, getQueryFn } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  CreditCard,
  FileText,
  IndianRupee,
  Clock,
  CheckCircle2,
  Receipt,
  Calendar,
  Loader2,
} from "lucide-react";

/* ─── Types ─── */

interface Challan {
  id: string;
  challanNumber: string;
  organizationId: string;
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
  status: "generated" | "sent" | "paid" | "overdue" | "cancelled";
  dueDate: string | null;
  paidAt: string | null;
  paymentId: string | null;
  generatedBy: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

interface PaymentTransaction {
  id: string;
  organizationId: string;
  challanId: string | null;
  payuTxnId: string | null;
  payuPaymentId: string | null;
  payuStatus: string | null;
  payuMode: string | null;
  amount: number;
  currency: string;
  status: "initiated" | "pending" | "success" | "failed" | "refunded";
  failureReason: string | null;
  initiatedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

interface PayUFormResponse {
  paymentUrl: string;
  formData: Record<string, string>;
  txnId: string;
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

function formatMonth(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    year: "numeric",
    month: "long",
  });
}

function statusBadge(status: string) {
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
  const cfg = map[status] ?? { variant: "outline" as const, label: status };
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
}

/* ─── KPI Card ─── */

function KpiCard({ icon: Icon, label, value, sub }: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <div className="rounded-lg bg-primary/10 p-3">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground truncate">{label}</p>
          <p className="text-xl font-bold">{value}</p>
          {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

/* ─── Main Component ─── */

export default function Payments() {
  const { dbUser } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const search = useSearch();
  const isAdmin = dbUser?.role === "admin";

  const [selectedChallan, setSelectedChallan] = useState<Challan | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [payingChallanId, setPayingChallanId] = useState<string | null>(null);

  // Hidden form ref for PayU redirect
  const payuFormRef = useRef<HTMLFormElement>(null);
  const [payuData, setPayuData] = useState<PayUFormResponse | null>(null);

  // Show payment status from redirect
  useEffect(() => {
    const params = new URLSearchParams(search);
    const status = params.get("status");
    if (status === "success") {
      toast({ title: "Payment successful!", description: "Your challan has been marked as paid." });
      queryClient.invalidateQueries({ queryKey: ["/api/billing"] });
      queryClient.invalidateQueries({ queryKey: ["/api/billing/transactions"] });
    } else if (status === "failed") {
      toast({ title: "Payment failed", description: "Please try again or use a different method.", variant: "destructive" });
    } else if (status === "hash-mismatch") {
      toast({ title: "Payment verification failed", description: "Contact support if amount was deducted.", variant: "destructive" });
    }
  }, [search]);

  // ── Data fetching ──

  const { data: challanList = [], isLoading: challansLoading } = useQuery<Challan[]>({
    queryKey: ["/api/billing"],
    queryFn: getQueryFn({ on401: "redirect" }),
    enabled: isAdmin,
    staleTime: 0,
    refetchOnMount: "always",
  });

  const { data: transactions = [], isLoading: txnsLoading } = useQuery<PaymentTransaction[]>({
    queryKey: ["/api/billing/transactions"],
    queryFn: getQueryFn({ on401: "redirect" }),
    enabled: isAdmin,
    staleTime: 0,
    refetchOnMount: "always",
  });

  // ── Mutations ──

  const generateMutation = useMutation({
    mutationFn: async (body: { year?: number; month?: number } | void) => {
      const res = await apiRequest("POST", "/api/billing/generate", body ?? {});
      return res.json();
    },
    onSuccess: (data: Challan) => {
      toast({ title: "Challan generated", description: `${data.challanNumber} — ${formatPaise(data.totalAmount)}` });
      queryClient.invalidateQueries({ queryKey: ["/api/billing"] });
    },
    onError: (err: Error) => {
      toast({ title: "Generation failed", description: err.message, variant: "destructive" });
    },
  });

  const payMutation = useMutation({
    mutationFn: async (challanId: string) => {
      setPayingChallanId(challanId);
      const baseUrl = window.location.origin;
      const res = await apiRequest("POST", `/api/billing/pay/${challanId}`, { baseUrl });
      return res.json() as Promise<PayUFormResponse>;
    },
    onSuccess: (data: PayUFormResponse) => {
      setPayuData(data);
      // Auto-submit PayU form after render
      setTimeout(() => payuFormRef.current?.submit(), 100);
    },
    onError: (err: Error) => {
      setPayingChallanId(null);
      toast({ title: "Payment initiation failed", description: err.message, variant: "destructive" });
    },
  });

  // ── Access check ──

  if (!isAdmin) {
    return (
      <AppLayout title="Payments" description="Access Denied">
        <div className="text-center py-12">
          <p className="text-muted-foreground">You don&apos;t have permission to access this page.</p>
        </div>
      </AppLayout>
    );
  }

  // ── Derived metrics ──

  const totalBilled = challanList.reduce((s, c) => s + (c.totalAmount ?? 0), 0);
  const totalPaid = challanList.filter((c) => c.status === "paid").reduce((s, c) => s + (c.totalAmount ?? 0), 0);
  const outstanding = challanList
    .filter((c) => c.status === "generated" || c.status === "sent" || c.status === "overdue")
    .reduce((s, c) => s + (c.totalAmount ?? 0), 0);
  const overdueCount = challanList.filter((c) => c.status === "overdue").length;

  // ── Challan detail dialog ──

  function openDetail(challan: Challan) {
    setSelectedChallan(challan);
    setDetailOpen(true);
  }

  // ── Render ──

  return (
    <>
      <SEOHead {...pageSEO.payments} />

      {/* Hidden PayU form for redirect-based payment */}
      {payuData && (
        <form ref={payuFormRef} method="POST" action={payuData.paymentUrl} style={{ display: "none" }}>
          {Object.entries(payuData.formData).map(([k, v]) => (
            <input key={k} type="hidden" name={k} value={v} />
          ))}
        </form>
      )}

      <AppLayout title="Payments & Billing" description="Manage challans and payments">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {challansLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}><CardContent className="p-5"><Skeleton className="h-16 w-full" /></CardContent></Card>
            ))
          ) : (
            <>
              <KpiCard icon={Receipt} label="Total Billed" value={formatPaise(totalBilled)} sub={`${challanList.length} challans`} />
              <KpiCard icon={CheckCircle2} label="Total Paid" value={formatPaise(totalPaid)} />
              <KpiCard icon={Clock} label="Outstanding" value={formatPaise(outstanding)} sub={overdueCount > 0 ? `${overdueCount} overdue` : undefined} />
              <KpiCard icon={CreditCard} label="Transactions" value={String(transactions.length)} sub={`${transactions.filter((t) => t.status === "success").length} successful`} />
            </>
          )}
        </div>

        {/* Tabs */}
        <Tabs defaultValue="challans" className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <TabsList>
              <TabsTrigger value="challans">Challans</TabsTrigger>
              <TabsTrigger value="transactions">Transactions</TabsTrigger>
            </TabsList>
            <Button
              size="sm"
              onClick={() => generateMutation.mutate()}
              disabled={generateMutation.isPending}
            >
              {generateMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileText className="h-4 w-4 mr-2" />}
              Generate Challan
            </Button>
          </div>

          {/* ── Challans Tab ── */}
          <TabsContent value="challans">
            <Card>
              <CardHeader>
                <CardTitle>Billing Challans</CardTitle>
                <CardDescription>Monthly billing challans for your organization</CardDescription>
              </CardHeader>
              <CardContent>
                {challansLoading ? (
                  <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
                ) : challanList.length === 0 ? (
                  <div className="text-center py-12">
                    <Receipt className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No challans generated yet.</p>
                    <p className="text-sm text-muted-foreground mt-1">Click &quot;Generate Challan&quot; to create one for last month.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Challan #</TableHead>
                          <TableHead>Period</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Due Date</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {challanList.map((ch) => (
                          <TableRow key={ch.id} className="cursor-pointer" onClick={() => openDetail(ch)}>
                            <TableCell className="font-mono text-sm">{ch.challanNumber}</TableCell>
                            <TableCell>{formatMonth(ch.billingPeriodStart)}</TableCell>
                            <TableCell className="text-right font-medium">{formatPaise(ch.totalAmount)}</TableCell>
                            <TableCell>{statusBadge(ch.status)}</TableCell>
                            <TableCell>{formatDate(ch.dueDate)}</TableCell>
                            <TableCell className="text-right">
                              {(ch.status === "generated" || ch.status === "sent" || ch.status === "overdue") && (
                                <Button
                                  size="sm"
                                  variant="default"
                                  onClick={(e) => { e.stopPropagation(); payMutation.mutate(ch.id); }}
                                  disabled={payMutation.isPending && payingChallanId === ch.id}
                                >
                                  {payMutation.isPending && payingChallanId === ch.id ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <>
                                      <IndianRupee className="h-3 w-3 mr-1" />
                                      Pay Now
                                    </>
                                  )}
                                </Button>
                              )}
                              {ch.status === "paid" && (
                                <Badge variant="default" className="gap-1">
                                  <CheckCircle2 className="h-3 w-3" /> Paid
                                </Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Transactions Tab ── */}
          <TabsContent value="transactions">
            <Card>
              <CardHeader>
                <CardTitle>Payment History</CardTitle>
                <CardDescription>All payment transactions for your organization</CardDescription>
              </CardHeader>
              <CardContent>
                {txnsLoading ? (
                  <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
                ) : transactions.length === 0 ? (
                  <div className="text-center py-12">
                    <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No payment transactions yet.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Transaction ID</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                          <TableHead>Mode</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Initiated By</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {transactions.map((txn) => (
                          <TableRow key={txn.id}>
                            <TableCell className="font-mono text-xs">{txn.payuTxnId ?? txn.id.slice(0, 12)}</TableCell>
                            <TableCell>{formatDate(txn.createdAt)}</TableCell>
                            <TableCell className="text-right font-medium">{formatPaise(txn.amount)}</TableCell>
                            <TableCell>{txn.payuMode ?? "—"}</TableCell>
                            <TableCell>{statusBadge(txn.status)}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">{txn.initiatedBy ?? "—"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* ── Challan Detail Dialog ── */}
        <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5" />
                Challan Details
              </DialogTitle>
              <DialogDescription>
                {selectedChallan?.challanNumber}
              </DialogDescription>
            </DialogHeader>

            {selectedChallan && (
              <div className="space-y-4">
                {/* Period & Status */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    {formatMonth(selectedChallan.billingPeriodStart)}
                  </div>
                  {statusBadge(selectedChallan.status)}
                </div>

                <Separator />

                {/* Line Items */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Usage Breakdown</h4>
                  <div className="rounded-lg border">
                    <div className="grid grid-cols-3 gap-2 p-3 text-sm bg-muted/50 font-medium rounded-t-lg">
                      <span>Item</span>
                      <span className="text-center">Qty</span>
                      <span className="text-right">Cost</span>
                    </div>
                    {selectedChallan.baseCost > 0 && (
                      <LineItem label="Base Plan" qty="—" cost={selectedChallan.baseCost} />
                    )}
                    <LineItem label="Flows" qty={String(selectedChallan.flowCount)} cost={selectedChallan.flowCost} />
                    <LineItem label="Users" qty={String(selectedChallan.userCount)} cost={selectedChallan.userCost} />
                    <LineItem label="Forms / Tasks" qty={String(selectedChallan.formCount)} cost={selectedChallan.formCost} />
                    {selectedChallan.storageCost > 0 && (
                      <LineItem label="Storage" qty={`${selectedChallan.storageMb} MB`} cost={selectedChallan.storageCost} />
                    )}
                  </div>
                </div>

                <Separator />

                {/* Totals */}
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{formatPaise(selectedChallan.subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">GST ({selectedChallan.taxPercent}%)</span>
                    <span>{formatPaise(selectedChallan.taxAmount)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-base pt-1 border-t">
                    <span>Total</span>
                    <span>{formatPaise(selectedChallan.totalAmount)}</span>
                  </div>
                </div>

                {/* Due date & pay button */}
                {selectedChallan.dueDate && (
                  <p className="text-xs text-muted-foreground">Due: {formatDate(selectedChallan.dueDate)}</p>
                )}
                {selectedChallan.paidAt && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                    Paid on {formatDate(selectedChallan.paidAt)}
                  </p>
                )}

                {(selectedChallan.status === "generated" || selectedChallan.status === "sent" || selectedChallan.status === "overdue") && (
                  <Button
                    className="w-full"
                    onClick={() => { setDetailOpen(false); payMutation.mutate(selectedChallan.id); }}
                    disabled={payMutation.isPending}
                  >
                    {payMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <IndianRupee className="h-4 w-4 mr-2" />
                    )}
                    Pay {formatPaise(selectedChallan.totalAmount)}
                  </Button>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </AppLayout>
    </>
  );
}

/* ─── Line Item Row ─── */

function LineItem({ label, qty, cost }: { label: string; qty: string; cost: number }) {
  return (
    <div className="grid grid-cols-3 gap-2 p-3 text-sm border-t">
      <span>{label}</span>
      <span className="text-center text-muted-foreground">{qty}</span>
      <span className="text-right">{formatPaise(cost)}</span>
    </div>
  );
}
