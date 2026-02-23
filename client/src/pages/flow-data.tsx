import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useMemo, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { AppLayout } from "@/components/app-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Search, Eye, StopCircle, Play, ArrowLeft, Loader2,
  CheckCircle2, Clock, AlertTriangle, XCircle,
  TrendingUp, Activity, BarChart3, Hash, Calendar, User,
  ArrowUpDown, ChevronDown, FileText,
} from "lucide-react";
import FlowDataViewer from "@/components/flow-data-viewer";
import { queryClient } from "@/lib/queryClient";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface FlowSummary {
  flowId: string;
  system: string;
  orderNumber?: string;
  description?: string;
  initiatedAt?: string;
  initiatedBy?: string;
  taskCount: number;
  completedTasks: number;
  cancelledTasks: number;
  status: 'completed' | 'in-progress' | 'pending' | 'stopped';
}

type SortKey = 'date' | 'progress' | 'system' | 'tasks';

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const statusMeta: Record<string, {
  dot: string; bg: string; text: string; icon: React.ReactNode; label: string;
}> = {
  completed:     { dot: "bg-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-950/40", text: "text-emerald-700 dark:text-emerald-400", icon: <CheckCircle2 className="h-3.5 w-3.5" />, label: "Completed" },
  "in-progress": { dot: "bg-blue-500",    bg: "bg-blue-50 dark:bg-blue-950/40",    text: "text-blue-700 dark:text-blue-400",    icon: <Activity className="h-3.5 w-3.5" />,      label: "In Progress" },
  pending:       { dot: "bg-amber-500",    bg: "bg-amber-50 dark:bg-amber-950/40",  text: "text-amber-700 dark:text-amber-400",  icon: <Clock className="h-3.5 w-3.5" />,          label: "Pending" },
  stopped:       { dot: "bg-red-500",      bg: "bg-red-50 dark:bg-red-950/40",      text: "text-red-700 dark:text-red-400",      icon: <XCircle className="h-3.5 w-3.5" />,        label: "Stopped" },
};

function StatusPill({ status }: { status: string }) {
  const meta = statusMeta[status] ?? statusMeta.pending;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${meta.bg} ${meta.text}`}>
      {meta.icon}
      {meta.label}
    </span>
  );
}

function KpiCard({ icon, label, value, accent }: {
  icon: React.ReactNode; label: string; value: number | string; accent: string;
}) {
  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-center gap-4">
          <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${accent}`}>
            {icon}
          </div>
          <div className="min-w-0">
            <p className="text-2xl font-bold tracking-tight">{value}</p>
            <p className="text-xs text-muted-foreground truncate">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function FlowData() {
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [systemFilter, setSystemFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [selectedFlowId, setSelectedFlowId] = useState<string | null>(null);
  const [isStopDialogOpen, setIsStopDialogOpen] = useState(false);
  const [flowToStop, setFlowToStop] = useState<FlowSummary | null>(null);
  const [stopReason, setStopReason] = useState("");
  const [isResumeDialogOpen, setIsResumeDialogOpen] = useState(false);
  const [flowToResume, setFlowToResume] = useState<FlowSummary | null>(null);
  const [resumeReason, setResumeReason] = useState("");

  const isAdmin = (user as any)?.role === 'admin' || (user as any)?.role === 'manager';

  // Redirect non-admin users
  useEffect(() => {
    if (!isLoading && user && (user as any).role !== 'admin') {
      window.location.href = '/';
    }
  }, [isLoading, user]);

  // Check for system parameter in URL and set filter
  useEffect(() => {
    const p = new URLSearchParams(window.location.search).get('system');
    if (p) setSystemFilter(p);
  }, []);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({ title: "Unauthorized", description: "Logging in again…", variant: "destructive" });
      setTimeout(() => { window.location.href = "/api/login"; }, 500);
    }
  }, [isAuthenticated, isLoading, toast]);

  /* ---- queries ---- */

  const { data: tasks, isLoading: tasksLoading } = useQuery<any[]>({
    queryKey: ["/api/tasks"],
    enabled: isAuthenticated,
  });

  const { data: selectedFlowData, isLoading: flowDataLoading } = useQuery<any>({
    queryKey: ["/api/flows", selectedFlowId, "data"],
    enabled: isAuthenticated && !!selectedFlowId,
  });

  /* ---- mutations ---- */

  const stopFlowMutation = useMutation({
    mutationFn: async ({ flowId, reason }: { flowId: string; reason: string }) => {
      const res = await fetch(`/api/flows/${flowId}/stop`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        credentials: "include", body: JSON.stringify({ reason }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.message || "Failed to stop flow"); }
      return res.json();
    },
    onSuccess: async (data) => {
      toast({ title: "Flow Stopped", description: data.message || "Flow has been stopped successfully" });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["/api/tasks"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/flows"] }),
      ]);
      setTimeout(() => { setIsStopDialogOpen(false); setFlowToStop(null); setStopReason(""); setSelectedFlowId(null); }, 300);
    },
    onError: (error: Error) => { toast({ title: "Error", description: error.message, variant: "destructive" }); },
  });

  const resumeFlowMutation = useMutation({
    mutationFn: async ({ flowId, reason }: { flowId: string; reason: string }) => {
      const res = await fetch(`/api/flows/${flowId}/resume`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        credentials: "include", body: JSON.stringify({ reason }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.message || "Failed to resume flow"); }
      return res.json();
    },
    onSuccess: async (data) => {
      toast({ title: "Flow Resumed", description: data.message || "Flow has been resumed successfully" });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["/api/tasks"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/flows"] }),
      ]);
      setTimeout(() => { setIsResumeDialogOpen(false); setFlowToResume(null); setResumeReason(""); setSelectedFlowId(null); }, 300);
    },
    onError: (error: Error) => { toast({ title: "Error", description: error.message, variant: "destructive" }); },
  });

  /* ---- handlers ---- */

  const handleStopFlow = (flow: FlowSummary) => { setFlowToStop(flow); setIsStopDialogOpen(true); };
  const confirmStopFlow = () => { if (flowToStop) stopFlowMutation.mutate({ flowId: flowToStop.flowId, reason: stopReason }); };
  const handleResumeFlow = (flow: FlowSummary) => { setFlowToResume(flow); setIsResumeDialogOpen(true); };
  const confirmResumeFlow = () => { if (flowToResume) resumeFlowMutation.mutate({ flowId: flowToResume.flowId, reason: resumeReason }); };

  /* ---- derived data ---- */

  const flowSummaries = useMemo<FlowSummary[]>(() => {
    const map = new Map<string, FlowSummary>();
    (tasks || []).forEach((task: any) => {
      if (!map.has(task.flowId)) {
        map.set(task.flowId, {
          flowId: task.flowId, system: task.system,
          orderNumber: task.orderNumber, description: task.flowDescription,
          initiatedAt: task.flowInitiatedAt, initiatedBy: task.flowInitiatedBy,
          taskCount: 0, completedTasks: 0, cancelledTasks: 0, status: 'pending',
        });
      }
      const f = map.get(task.flowId)!;
      f.taskCount++;
      if (task.status === 'completed') f.completedTasks++;
      if (task.status === 'cancelled') f.cancelledTasks++;
    });

    map.forEach((f) => {
      const active = f.taskCount - f.completedTasks - f.cancelledTasks;
      if (f.completedTasks === f.taskCount) f.status = 'completed';
      else if (f.cancelledTasks > 0 && active === 0) f.status = 'stopped';
      else if (f.cancelledTasks > 0 || f.completedTasks > 0) f.status = 'in-progress';
      else f.status = 'pending';
    });

    return Array.from(map.values());
  }, [tasks]);

  const uniqueSystems = useMemo(() => Array.from(new Set(flowSummaries.map(f => f.system))), [flowSummaries]);

  const filteredFlows = useMemo(() => {
    let list = flowSummaries.filter(flow => {
      const q = searchTerm.toLowerCase();
      const matchesSearch = !q ||
        flow.system.toLowerCase().includes(q) ||
        flow.orderNumber?.toLowerCase().includes(q) ||
        flow.description?.toLowerCase().includes(q);
      return matchesSearch
        && (systemFilter === "all" || flow.system === systemFilter)
        && (statusFilter === "all" || flow.status === statusFilter);
    });

    list.sort((a, b) => {
      switch (sortKey) {
        case 'date':     return new Date(b.initiatedAt || 0).getTime() - new Date(a.initiatedAt || 0).getTime();
        case 'progress': return (b.completedTasks / (b.taskCount || 1)) - (a.completedTasks / (a.taskCount || 1));
        case 'system':   return a.system.localeCompare(b.system);
        case 'tasks':    return b.taskCount - a.taskCount;
        default:         return 0;
      }
    });
    return list;
  }, [flowSummaries, searchTerm, systemFilter, statusFilter, sortKey]);

  /* ---- kpi counts ---- */
  const kpi = useMemo(() => {
    const c = { total: flowSummaries.length, completed: 0, inProgress: 0, stopped: 0 };
    flowSummaries.forEach(f => {
      if (f.status === 'completed') c.completed++;
      else if (f.status === 'in-progress') c.inProgress++;
      else if (f.status === 'stopped') c.stopped++;
    });
    return c;
  }, [flowSummaries]);

  /* ---- loading skeleton ---- */

  if (isLoading || tasksLoading) {
    return (
      <AppLayout title="Flow Data" description="Comprehensive view of task flows, form responses, and progress tracking">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i}><CardContent className="p-5"><div className="flex items-center gap-4"><Skeleton className="h-11 w-11 rounded-xl" /><div className="space-y-2 flex-1"><Skeleton className="h-6 w-16" /><Skeleton className="h-3 w-24" /></div></div></CardContent></Card>
          ))}
        </div>
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <Card key={i}><CardContent className="p-5"><div className="flex gap-4"><Skeleton className="h-14 w-14 rounded-xl" /><div className="flex-1 space-y-2"><Skeleton className="h-4 w-48" /><Skeleton className="h-3 w-32" /><Skeleton className="h-2 w-full rounded-full" /></div></div></CardContent></Card>
          ))}
        </div>
      </AppLayout>
    );
  }

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  return (
    <AppLayout
      title={selectedFlowId ? "Flow Details" : "Flow Data"}
      description={selectedFlowId ? undefined : "Comprehensive view of task flows, form responses, and progress tracking"}
      actions={
        selectedFlowId ? (
          <div className="flex items-center gap-2">
            {/* Stop / Resume in detail view */}
            {isAdmin && selectedFlowData && (() => {
              const fs = flowSummaries.find(f => f.flowId === selectedFlowId);
              if (!fs || fs.status === 'completed') return null;
              return fs.status === 'stopped' ? (
                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => handleResumeFlow(fs)}>
                  <Play className="h-4 w-4 mr-1.5" />Resume
                </Button>
              ) : (
                <Button variant="destructive" size="sm" onClick={() => handleStopFlow(fs)}>
                  <StopCircle className="h-4 w-4 mr-1.5" />Stop Flow
                </Button>
              );
            })()}
            <Button variant="outline" size="sm" onClick={() => setSelectedFlowId(null)}>
              <ArrowLeft className="h-4 w-4 mr-1.5" />Back to list
            </Button>
          </div>
        ) : undefined
      }
    >
      {/* ===== List View ===== */}
      {!selectedFlowId && (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <KpiCard icon={<BarChart3 className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />} label="Total Flows" value={kpi.total} accent="bg-indigo-100 dark:bg-indigo-900/50" />
            <KpiCard icon={<Activity className="h-5 w-5 text-blue-600 dark:text-blue-400" />} label="In Progress" value={kpi.inProgress} accent="bg-blue-100 dark:bg-blue-900/50" />
            <KpiCard icon={<CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />} label="Completed" value={kpi.completed} accent="bg-emerald-100 dark:bg-emerald-900/50" />
            <KpiCard icon={<XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />} label="Stopped" value={kpi.stopped} accent="bg-red-100 dark:bg-red-900/50" />
          </div>

          {/* Filter Bar */}
          <Card className="mb-5">
            <CardContent className="py-3 px-4">
              <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
                {/* search */}
                <div className="relative flex-1 min-w-0">
                  <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search by system, order, description…" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9 h-9" />
                </div>
                {/* system */}
                <Select value={systemFilter} onValueChange={setSystemFilter}>
                  <SelectTrigger className="w-full md:w-44 h-9"><SelectValue placeholder="System" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Systems</SelectItem>
                    {uniqueSystems.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
                {/* status */}
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full md:w-40 h-9"><SelectValue placeholder="Status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="in-progress">In Progress</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="stopped">Stopped</SelectItem>
                  </SelectContent>
                </Select>
                {/* sort */}
                <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
                  <SelectTrigger className="w-full md:w-40 h-9">
                    <div className="flex items-center gap-1.5"><ArrowUpDown className="h-3.5 w-3.5" /><SelectValue /></div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date">Newest First</SelectItem>
                    <SelectItem value="progress">Progress</SelectItem>
                    <SelectItem value="system">System A-Z</SelectItem>
                    <SelectItem value="tasks">Most Tasks</SelectItem>
                  </SelectContent>
                </Select>
                {/* count badge */}
                <Badge variant="secondary" className="h-9 px-3 flex items-center justify-center whitespace-nowrap">
                  {filteredFlows.length} flow{filteredFlows.length !== 1 ? 's' : ''}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Flow Cards */}
          <div className="space-y-3">
            {filteredFlows.map((flow) => {
              const pct = flow.taskCount > 0 ? Math.round((flow.completedTasks / flow.taskCount) * 100) : 0;
              const meta = statusMeta[flow.status] ?? statusMeta.pending;

              return (
                <Card
                  key={flow.flowId}
                  className="group cursor-pointer transition-all hover:shadow-md hover:border-primary/30 active:scale-[0.995]"
                  onClick={() => setSelectedFlowId(flow.flowId)}
                >
                  <CardContent className="p-0">
                    <div className="flex items-stretch">
                      {/* Colored left accent strip */}
                      <div className={`w-1.5 shrink-0 rounded-l-xl ${meta.dot}`} />

                      <div className="flex-1 p-4 md:p-5 min-w-0">
                        {/* Row 1: system name + status + actions */}
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <h3 className="font-semibold text-base truncate">{flow.system}</h3>
                            <StatusPill status={flow.status} />
                          </div>
                          <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                            {isAdmin && flow.status !== 'completed' && (
                              flow.status === 'stopped' ? (
                                <Button size="sm" variant="outline" className="h-8 text-emerald-600 border-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40" onClick={() => handleResumeFlow(flow)}>
                                  <Play className="h-3.5 w-3.5 mr-1" />Resume
                                </Button>
                              ) : (
                                <Button size="sm" variant="outline" className="h-8 text-red-600 border-red-300 hover:bg-red-50 dark:hover:bg-red-950/40" onClick={() => handleStopFlow(flow)}>
                                  <StopCircle className="h-3.5 w-3.5 mr-1" />Stop
                                </Button>
                              )
                            )}
                            <Button size="sm" variant="ghost" className="h-8">
                              <Eye className="h-4 w-4 mr-1" />View
                            </Button>
                          </div>
                        </div>

                        {/* Row 2: meta chips */}
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground mb-3">
                          {flow.orderNumber && (
                            <span className="inline-flex items-center gap-1"><Hash className="h-3 w-3" />{flow.orderNumber}</span>
                          )}
                          {flow.initiatedAt && (
                            <span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(flow.initiatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                          )}
                          {flow.initiatedBy && (
                            <span className="inline-flex items-center gap-1"><User className="h-3 w-3" />{flow.initiatedBy}</span>
                          )}
                          {flow.description && (
                            <span className="inline-flex items-center gap-1 truncate max-w-xs"><FileText className="h-3 w-3 shrink-0" />{flow.description}</span>
                          )}
                        </div>

                        {/* Row 3: progress bar */}
                        <div className="flex items-center gap-3">
                          <Progress value={pct} className="h-2 flex-1" />
                          <span className="text-xs font-medium w-20 text-right tabular-nums">
                            {flow.completedTasks}/{flow.taskCount} · {pct}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            {/* Empty state */}
            {filteredFlows.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted mb-4">
                  <TrendingUp className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-1">No flows found</h3>
                <p className="text-sm text-muted-foreground max-w-sm">
                  {searchTerm || systemFilter !== 'all' || statusFilter !== 'all'
                    ? "Try adjusting your filters or search query."
                    : "Flows will appear here once tasks are created."}
                </p>
              </div>
            )}
          </div>
        </>
      )}

      {/* ===== Detail View ===== */}
      {selectedFlowId && (
        <div>
          {flowDataLoading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Loading flow details…</p>
            </div>
          ) : selectedFlowData ? (
            <FlowDataViewer
              flowId={selectedFlowData.flowId}
              tasks={selectedFlowData.tasks}
              flowDescription={selectedFlowData.flowDescription}
              flowInitiatedAt={selectedFlowData.flowInitiatedAt}
              flowInitiatedBy={selectedFlowData.flowInitiatedBy}
              orderNumber={selectedFlowData.orderNumber}
              system={selectedFlowData.system}
            />
          ) : (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-100 dark:bg-red-900/30 mb-2">
                <AlertTriangle className="h-7 w-7 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-lg font-semibold">Failed to load flow data</h3>
              <p className="text-sm text-muted-foreground">Please try again later or contact support.</p>
              <Button variant="outline" size="sm" onClick={() => setSelectedFlowId(null)} className="mt-2">
                <ArrowLeft className="h-4 w-4 mr-1.5" />Back to list
              </Button>
            </div>
          )}
        </div>
      )}

      {/* ===== Stop Dialog ===== */}
      <Dialog open={isStopDialogOpen} onOpenChange={setIsStopDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><StopCircle className="h-5 w-5 text-red-500" />Stop Flow?</DialogTitle>
            <DialogDescription>This will cancel all pending and in-progress tasks for this flow. This action cannot be undone.</DialogDescription>
          </DialogHeader>
          {flowToStop && (
            <div className="space-y-4">
              <div className="rounded-lg border bg-muted/50 p-4 space-y-2 text-sm">
                <div><span className="font-medium text-muted-foreground">System:</span>{' '}{flowToStop.system}</div>
                <div><span className="font-medium text-muted-foreground">Order:</span>{' '}{flowToStop.orderNumber}</div>
                {flowToStop.description && <div><span className="font-medium text-muted-foreground">Description:</span>{' '}{flowToStop.description}</div>}
                <div className="flex items-center gap-2">
                  <span className="font-medium text-muted-foreground">Progress:</span>
                  <Progress value={flowToStop.taskCount > 0 ? (flowToStop.completedTasks / flowToStop.taskCount) * 100 : 0} className="h-2 flex-1" />
                  <span className="text-xs tabular-nums">{flowToStop.completedTasks}/{flowToStop.taskCount}</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="stopReason">Reason for stopping (optional)</Label>
                <Textarea id="stopReason" placeholder="Enter reason for stopping this flow…" value={stopReason} onChange={(e) => setStopReason(e.target.value)} rows={3} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsStopDialogOpen(false); setFlowToStop(null); setStopReason(""); }}>Cancel</Button>
            <Button variant="destructive" onClick={confirmStopFlow} disabled={stopFlowMutation.isPending}>
              {stopFlowMutation.isPending ? <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" />Stopping…</> : "Stop Flow"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== Resume Dialog ===== */}
      <Dialog open={isResumeDialogOpen} onOpenChange={setIsResumeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Play className="h-5 w-5 text-emerald-500" />Resume Flow?</DialogTitle>
            <DialogDescription>This will restore all cancelled tasks back to pending status and allow the flow to continue.</DialogDescription>
          </DialogHeader>
          {flowToResume && (
            <div className="space-y-4">
              <div className="rounded-lg border bg-muted/50 p-4 space-y-2 text-sm">
                <div><span className="font-medium text-muted-foreground">System:</span>{' '}{flowToResume.system}</div>
                <div><span className="font-medium text-muted-foreground">Order:</span>{' '}{flowToResume.orderNumber}</div>
                {flowToResume.description && <div><span className="font-medium text-muted-foreground">Description:</span>{' '}{flowToResume.description}</div>}
                <div className="flex items-center gap-2">
                  <span className="font-medium text-muted-foreground">Progress:</span>
                  <Progress value={flowToResume.taskCount > 0 ? (flowToResume.completedTasks / flowToResume.taskCount) * 100 : 0} className="h-2 flex-1" />
                  <span className="text-xs tabular-nums">{flowToResume.completedTasks}/{flowToResume.taskCount}</span>
                </div>
                <div><span className="font-medium text-muted-foreground">Cancelled Tasks:</span>{' '}{flowToResume.cancelledTasks} task(s) will be resumed</div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="resumeReason">Reason for resuming (optional)</Label>
                <Textarea id="resumeReason" placeholder="Enter reason for resuming this flow…" value={resumeReason} onChange={(e) => setResumeReason(e.target.value)} rows={3} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsResumeDialogOpen(false); setFlowToResume(null); setResumeReason(""); }}>Cancel</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={confirmResumeFlow} disabled={resumeFlowMutation.isPending}>
              {resumeFlowMutation.isPending ? <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" />Resuming…</> : "Resume Flow"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}