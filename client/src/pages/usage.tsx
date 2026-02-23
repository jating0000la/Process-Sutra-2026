import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useState, useEffect } from "react";
import { AppLayout } from "@/components/app-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import SEOHead, { pageSEO } from "@/components/SEOHead";
import {
  TrendingUp,
  Activity,
  FileText,
  Database,
  DollarSign,
  Users,
  Zap,
  Download,
  AlertCircle,
  ArrowUp,
  ArrowDown,
  Calendar,
  HardDrive,
  Workflow,
  BarChart3,
  PieChart,
  Settings,
} from "lucide-react";
import {
  BarChart,
  Bar,
  PieChart as RechartsPie,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

/* ─── Types ─── */

interface UsageSummary {
  flows: {
    total: number;
    thisMonth: number;
    active: number;
    completed: number;
    cancelled: number;
    successRate: number;
    avgCompletionTime: number;
    trend: number;
  };
  forms: {
    total: number;
    thisMonth: number;
    byFormType: Record<string, number>;
    avgSubmissionTime: number;
    trend: number;
  };
  storage: {
    totalFiles: number;
    totalBytes: number;
    totalGB: number;
    byFileType: Record<string, number>;
    avgFileSize: number;
    trend: number;
  };
  users: {
    total: number;
    active: number;
    activeToday: number;
    avgTasksPerUser: number;
  };
  cost: {
    currentMonth: number;
    flowCost: number;
    userCost: number;
    formCost: number;
    projected: number;
    comparison: number;
  };
  performance: {
    tatCompliance: number;
    onTimeRate: number;
    avgResponseTime: number;
  };
  quotas: {
    maxUsers: number;
    currentUsers: number;
    maxFlows: number;
    currentFlows: number;
    storageLimit: number;
    storageUsed: number;
  };
}

interface UsageTrends {
  daily: Array<{ date: string; flows: number; forms: number; storage: number }>;
  flowsBySystem: Array<{ system: string; count: number; percentage: number }>;
  topForms: Array<{ formId: string; count: number }>;
}

/* ─── Helpers ─── */

const COLORS = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))", "#ec4899"];

const formatBytes = (bytes: number) => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
};

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount);

/** Safe percentage — avoids divide-by-zero */
const pct = (used: number, max: number) => (max > 0 ? Math.min((used / max) * 100, 100) : 0);

const quotaColor = (p: number) => (p > 90 ? "text-red-500" : p > 75 ? "text-amber-500" : "text-foreground");
const quotaBarCls = (p: number) => (p > 90 ? "[&>div]:bg-red-500" : p > 75 ? "[&>div]:bg-amber-500" : "");

/* ─── KPI Card ─── */

function KpiCard({ icon: Icon, iconBg, label, value, sub, trend }: {
  icon: any; iconBg: string; label: string; value: string; sub: string; trend?: number;
}) {
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className={`p-2 rounded-lg ${iconBg}`}>
            <Icon className="h-6 w-6" />
          </div>
          {trend !== undefined && (
            <Badge variant={trend > 0 ? "default" : "secondary"} className="flex items-center gap-1 text-xs">
              {trend > 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
              {Math.abs(trend)}%
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-3xl font-bold">{value}</p>
        <p className="text-xs text-muted-foreground">{sub}</p>
      </CardContent>
    </Card>
  );
}

/* ─── Quota Row ─── */

function QuotaRow({ icon: Icon, iconCls, label, used, max, unit = "" }: {
  icon: any; iconCls: string; label: string; used: number; max: number; unit?: string;
}) {
  const p = pct(used, max);
  const display = unit ? `${used.toFixed(2)}/${max.toFixed(2)} ${unit}` : `${used}/${max}`;
  return (
    <div className="p-4 rounded-lg border bg-card">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Icon className={`h-5 w-5 ${iconCls}`} />
          <span className="text-sm font-medium">{label}</span>
        </div>
        <Badge variant={p > 90 ? "destructive" : "outline"} className="text-xs">{display}</Badge>
      </div>
      <Progress value={p} className={`h-2 ${quotaBarCls(p)}`} />
      <p className="text-xs text-muted-foreground mt-1">{p.toFixed(0)}% utilized</p>
    </div>
  );
}

/* ─── Chart tooltip style ─── */
const tooltipStyle: React.CSSProperties = {
  borderRadius: 8,
  border: "1px solid hsl(var(--border))",
  background: "hsl(var(--popover))",
  color: "hsl(var(--popover-foreground))",
  fontSize: 12,
};

/* ─── Main Component ─── */

export default function Usage() {
  const { user, dbUser, loading, handleTokenExpired } = useAuth();
  const [dateRange, setDateRange] = useState("month");
  const isAdmin = dbUser?.role === "admin";

  useEffect(() => {
    if (!loading && !user) handleTokenExpired();
  }, [user, loading, handleTokenExpired]);

  const { data: summary, isLoading: summaryLoading } = useQuery<UsageSummary>({
    queryKey: ["/api/usage/summary", dateRange],
    queryFn: async () => {
      const res = await fetch(`/api/usage/summary?dateRange=${dateRange}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch usage summary");
      return res.json();
    },
    enabled: !!user && isAdmin,
    staleTime: 60000,
  });

  const { data: trends, isLoading: trendsLoading } = useQuery<UsageTrends>({
    queryKey: ["/api/usage/trends", dateRange],
    queryFn: async () => {
      const res = await fetch(`/api/usage/trends?dateRange=${dateRange}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch usage trends");
      return res.json();
    },
    enabled: !!user && isAdmin,
    staleTime: 60000,
  });

  /* ─── Access denied ─── */
  if (!isAdmin) {
    return (
      <AppLayout title="Usage Statistics" description="Access Denied">
        <div className="text-center py-12">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <p className="text-muted-foreground text-lg">You don't have permission to access this page.</p>
        </div>
      </AppLayout>
    );
  }

  /* ─── Loading ─── */
  if (loading || summaryLoading) {
    return (
      <AppLayout title="Usage Statistics" description="Loading...">
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-36 rounded-lg" />)}
          </div>
          <Skeleton className="h-96 rounded-lg" />
        </div>
      </AppLayout>
    );
  }

  const exportCSV = () => {
    if (!summary) return;
    const lines = [
      "Metric,Value",
      `Flows This Month,${summary.flows.thisMonth}`,
      `Form Submissions,${summary.forms.thisMonth}`,
      `Storage GB,${summary.storage.totalGB.toFixed(2)}`,
      `Active Users,${summary.users.active}`,
      `Current Month Cost,${summary.cost.currentMonth}`,
      `TAT Compliance %,${summary.performance.tatCompliance}`,
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `usage-${dateRange}-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <SEOHead
        title={pageSEO.analytics.title}
        description={pageSEO.analytics.description}
        keywords={pageSEO.analytics.keywords}
        canonical="/usage"
      />
      <AppLayout
        title="Usage Statistics"
        description="Monitor your organization's platform usage and performance"
        actions={
          <div className="flex gap-2 items-center">
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-36 h-9 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">Last 7 Days</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="quarter">Last 3 Months</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={exportCSV}>
              <Download className="h-4 w-4 mr-1" /> Export
            </Button>
          </div>
        }
      >
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <KpiCard
            icon={Workflow} iconBg="bg-blue-500/10 text-blue-500"
            label="Flow Executions" value={(summary?.flows.thisMonth ?? 0).toLocaleString()}
            sub={`Total: ${(summary?.flows.total ?? 0).toLocaleString()}`} trend={summary?.flows.trend}
          />
          <KpiCard
            icon={FileText} iconBg="bg-green-500/10 text-green-500"
            label="Form Submissions" value={(summary?.forms.thisMonth ?? 0).toLocaleString()}
            sub={`Total: ${(summary?.forms.total ?? 0).toLocaleString()}`} trend={summary?.forms.trend}
          />
          <KpiCard
            icon={Database} iconBg="bg-purple-500/10 text-purple-500"
            label="Storage Used" value={`${(summary?.storage.totalGB ?? 0).toFixed(2)} GB`}
            sub={`${(summary?.storage.totalFiles ?? 0).toLocaleString()} files`} trend={summary?.storage.trend}
          />
          <KpiCard
            icon={DollarSign} iconBg="bg-amber-500/10 text-amber-500"
            label="Current Month" value={formatCurrency(summary?.cost.currentMonth ?? 0)}
            sub={`Projected: ${formatCurrency(summary?.cost.projected ?? 0)}`} trend={summary?.cost.comparison}
          />
        </div>

        {/* Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="bg-muted/50 p-1">
            <TabsTrigger value="overview" className="flex items-center gap-1.5 text-xs"><BarChart3 className="h-3.5 w-3.5" />Overview</TabsTrigger>
            <TabsTrigger value="flows" className="flex items-center gap-1.5 text-xs"><Workflow className="h-3.5 w-3.5" />Flows</TabsTrigger>
            <TabsTrigger value="storage" className="flex items-center gap-1.5 text-xs"><HardDrive className="h-3.5 w-3.5" />Storage</TabsTrigger>
            <TabsTrigger value="cost" className="flex items-center gap-1.5 text-xs"><DollarSign className="h-3.5 w-3.5" />Cost Analysis</TabsTrigger>
          </TabsList>

          {/* ═══════════ Overview Tab ═══════════ */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Usage Trends */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-primary" /> Usage Trends
                  </CardTitle>
                  <CardDescription>Daily flow executions &amp; form submissions</CardDescription>
                </CardHeader>
                <CardContent>
                  {trendsLoading ? (
                    <Skeleton className="h-[280px] w-full" />
                  ) : (
                    <ResponsiveContainer width="100%" height={280}>
                      <AreaChart data={trends?.daily ?? []}>
                        <defs>
                          <linearGradient id="gFlows" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.5} />
                            <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="gForms" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.5} />
                            <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                        <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                        <Tooltip contentStyle={tooltipStyle} />
                        <Legend />
                        <Area type="monotone" dataKey="flows" stroke="hsl(var(--chart-1))" fill="url(#gFlows)" name="Flows" />
                        <Area type="monotone" dataKey="forms" stroke="hsl(var(--chart-2))" fill="url(#gForms)" name="Forms" />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              {/* Performance */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Zap className="h-4 w-4 text-primary" /> Performance Score
                  </CardTitle>
                  <CardDescription>Organization efficiency metrics</CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  {[
                    { label: "TAT Compliance", value: summary?.performance.tatCompliance ?? 0, cls: "text-blue-500" },
                    { label: "On-Time Delivery", value: summary?.performance.onTimeRate ?? 0, cls: "text-green-500" },
                    { label: "Flow Success Rate", value: summary?.flows.successRate ?? 0, cls: "text-purple-500" },
                  ].map(m => (
                    <div key={m.label}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm font-medium">{m.label}</span>
                        <span className={`text-sm font-bold ${m.cls}`}>{m.value}%</span>
                      </div>
                      <Progress value={m.value} className="h-2.5" />
                    </div>
                  ))}
                  <div className="pt-4 border-t grid grid-cols-2 gap-4 text-center">
                    <div>
                      <p className="text-2xl font-bold">{(summary?.flows?.avgCompletionTime ?? 0).toFixed(1)}</p>
                      <p className="text-xs text-muted-foreground">Avg. Days/Flow</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{(summary?.users?.avgTasksPerUser ?? 0).toFixed(1)}</p>
                      <p className="text-xs text-muted-foreground">Tasks/User</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Flows by System */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <PieChart className="h-4 w-4 text-primary" /> Flow Distribution by System
                </CardTitle>
              </CardHeader>
              <CardContent>
                {trendsLoading ? (
                  <Skeleton className="h-[280px] w-full" />
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <ResponsiveContainer width="100%" height={280}>
                      <RechartsPie>
                        <Pie
                          data={trends?.flowsBySystem ?? []}
                          cx="50%" cy="50%"
                          outerRadius={100}
                          labelLine={false}
                          label={e => `${e.system}: ${e.percentage}%`}
                          dataKey="count"
                        >
                          {(trends?.flowsBySystem ?? []).map((_, idx) => (
                            <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={tooltipStyle} />
                      </RechartsPie>
                    </ResponsiveContainer>
                    <div className="space-y-2">
                      {trends?.flowsBySystem?.map((s, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                          <div className="flex items-center gap-3">
                            <div className="w-3.5 h-3.5 rounded" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                            <span className="text-sm font-medium">{s.system}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-sm font-bold">{s.count}</span>
                            <span className="text-xs text-muted-foreground ml-2">{s.percentage}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* User Activity */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <KpiCard icon={Users} iconBg="bg-blue-500/10 text-blue-500" label="Total Users" value={String(summary?.users.total ?? 0)} sub={`${summary?.users.active ?? 0} active`} />
              <KpiCard icon={Activity} iconBg="bg-green-500/10 text-green-500" label="Active Today" value={String(summary?.users.activeToday ?? 0)} sub={`${((summary?.users.activeToday ?? 0) / Math.max(summary?.users.total ?? 1, 1) * 100).toFixed(0)}% of total`} />
              <KpiCard icon={Calendar} iconBg="bg-purple-500/10 text-purple-500" label="Avg Tasks/User" value={(summary?.users?.avgTasksPerUser ?? 0).toFixed(1)} sub="This month" />
            </div>

            {/* Quota Status */}
            {summary && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Settings className="h-4 w-4 text-primary" /> Organization Plan Quotas
                      </CardTitle>
                      <CardDescription>Limits configured by super admin</CardDescription>
                    </div>
                    <Badge variant="outline" className="text-xs">Admin Controlled</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <QuotaRow icon={Workflow} iconCls="text-blue-500" label="Flow Executions" used={summary.quotas.currentFlows} max={summary.quotas.maxFlows} />
                    <QuotaRow icon={Users} iconCls="text-green-500" label="Active Users" used={summary.quotas.currentUsers} max={summary.quotas.maxUsers} />
                    <QuotaRow icon={Database} iconCls="text-purple-500" label="Storage Space" used={summary.quotas.storageUsed} max={summary.quotas.storageLimit} unit="GB" />
                  </div>

                  {(summary.quotas.currentFlows > summary.quotas.maxFlows ||
                    summary.quotas.currentUsers > summary.quotas.maxUsers ||
                    summary.quotas.storageUsed > summary.quotas.storageLimit) && (
                    <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-lg flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
                      <div>
                        <p className="font-medium text-sm">Quota Limit Exceeded</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Your organization has exceeded one or more plan limits. Contact your system administrator to upgrade.
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ═══════════ Flows Tab ═══════════ */}
          <TabsContent value="flows" className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: "Active Flows", val: summary?.flows.active ?? 0, cls: "text-blue-500" },
                { label: "Completed", val: summary?.flows.completed ?? 0, cls: "text-green-500" },
                { label: "Cancelled", val: summary?.flows.cancelled ?? 0, cls: "text-red-500" },
                { label: "Success Rate", val: `${summary?.flows.successRate ?? 0}%`, cls: "text-purple-500" },
              ].map(m => (
                <Card key={m.label}>
                  <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">{m.label}</CardTitle></CardHeader>
                  <CardContent><p className={`text-3xl font-bold ${m.cls}`}>{m.val}</p></CardContent>
                </Card>
              ))}
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Top Forms by Submissions</CardTitle>
                <CardDescription>Most frequently submitted forms</CardDescription>
              </CardHeader>
              <CardContent>
                {trendsLoading ? (
                  <Skeleton className="h-[280px] w-full" />
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={trends?.topForms ?? []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="formId" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                      <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Bar dataKey="count" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ═══════════ Storage Tab ═══════════ */}
          <TabsContent value="storage" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Storage Overview</CardTitle>
                  <CardDescription>Storage usage and quota</CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Storage Used</span>
                      <span className={`text-sm font-bold ${quotaColor(pct(summary?.quotas.storageUsed ?? 0, summary?.quotas.storageLimit ?? 1))}`}>
                        {(summary?.storage.totalGB ?? 0).toFixed(2)} GB
                      </span>
                    </div>
                    <Progress
                      value={pct(summary?.quotas.storageUsed ?? 0, summary?.quotas.storageLimit ?? 1)}
                      className={`h-3 ${quotaBarCls(pct(summary?.quotas.storageUsed ?? 0, summary?.quotas.storageLimit ?? 1))}`}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {summary?.quotas.storageLimit
                        ? `${pct(summary.quotas.storageUsed, summary.quotas.storageLimit).toFixed(1)}% of ${summary.quotas.storageLimit.toFixed(2)} GB limit`
                        : "No limit set"}
                    </p>
                    {pct(summary?.quotas.storageUsed ?? 0, summary?.quotas.storageLimit ?? 1) > 90 && (
                      <div className="mt-2 p-2 bg-destructive/10 border border-destructive/30 rounded text-xs font-medium">
                        Storage almost full! Uploads may fail soon.
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-4 rounded-lg bg-muted/50">
                      <p className="text-xs text-muted-foreground mb-1">Total Files</p>
                      <p className="text-2xl font-bold text-blue-500">{(summary?.storage.totalFiles ?? 0).toLocaleString()}</p>
                    </div>
                    <div className="p-4 rounded-lg bg-muted/50">
                      <p className="text-xs text-muted-foreground mb-1">Avg File Size</p>
                      <p className="text-2xl font-bold text-green-500">{formatBytes(summary?.storage.avgFileSize ?? 0)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Files by Type</CardTitle>
                  <CardDescription>Distribution of uploaded files</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {Object.entries(summary?.storage.byFileType ?? {}).map(([type, count], idx) => (
                      <div key={type} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                        <div className="flex items-center gap-3">
                          <div className="w-3.5 h-3.5 rounded" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                          <span className="text-sm font-medium">{type}</span>
                        </div>
                        <span className="text-sm font-bold">{count as number}</span>
                      </div>
                    ))}
                    {Object.keys(summary?.storage.byFileType ?? {}).length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-6">No files uploaded yet</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ═══════════ Cost Analysis Tab ═══════════ */}
          <TabsContent value="cost" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-primary" /> Cost Breakdown
                </CardTitle>
                <CardDescription>Current month usage-based pricing</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { icon: Workflow, label: "Flow Executions", cost: summary?.cost.flowCost ?? 0, detail: `${summary?.flows.thisMonth ?? 0} flows × rate`, cls: "text-blue-500 bg-blue-500/10" },
                    { icon: Users, label: "Active Users", cost: summary?.cost.userCost ?? 0, detail: `${summary?.users.active ?? 0} users × rate`, cls: "text-green-500 bg-green-500/10" },
                    { icon: FileText, label: "Form Submissions", cost: summary?.cost.formCost ?? 0, detail: `${summary?.forms.thisMonth ?? 0} submissions × rate`, cls: "text-purple-500 bg-purple-500/10" },
                  ].map(c => (
                    <div key={c.label} className="p-5 rounded-xl border bg-card">
                      <div className="flex items-center gap-3 mb-2">
                        <div className={`p-2 rounded-lg ${c.cls}`}><c.icon className="h-6 w-6" /></div>
                        <div>
                          <p className="text-xs text-muted-foreground">{c.label}</p>
                          <p className="text-xl font-bold">{formatCurrency(c.cost)}</p>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">{c.detail}</p>
                    </div>
                  ))}
                </div>

                <div className="p-6 rounded-xl border-2 border-primary/20 bg-primary/5">
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Total Current Month</p>
                      <p className="text-4xl font-bold">{formatCurrency(summary?.cost.currentMonth ?? 0)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground mb-1">Projected End of Month</p>
                      <p className="text-2xl font-bold text-amber-500">{formatCurrency(summary?.cost.projected ?? 0)}</p>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-primary/10">
                    <p className="text-sm">
                      {(summary?.cost.comparison ?? 0) > 0
                        ? <span className="text-red-500 font-medium">↑ {summary?.cost.comparison}% higher than last month</span>
                        : <span className="text-green-500 font-medium">↓ {Math.abs(summary?.cost.comparison ?? 0)}% lower than last month</span>
                      }
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {summary && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Settings className="h-4 w-4 text-primary" /> Resource Quotas
                  </CardTitle>
                  <CardDescription>Current usage vs. plan limits (configured by super admin)</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-3 rounded-lg bg-muted/50 border text-sm flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <span className="text-muted-foreground">These quotas are controlled by your system administrator. Contact admin to upgrade limits.</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <QuotaRow icon={Workflow} iconCls="text-blue-500" label="Flow Executions" used={summary.quotas.currentFlows} max={summary.quotas.maxFlows} />
                    <QuotaRow icon={Users} iconCls="text-green-500" label="Users" used={summary.quotas.currentUsers} max={summary.quotas.maxUsers} />
                    <QuotaRow icon={Database} iconCls="text-purple-500" label="Storage" used={summary.quotas.storageUsed} max={summary.quotas.storageLimit} unit="GB" />
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </AppLayout>
    </>
  );
}
