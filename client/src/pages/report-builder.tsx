/**
 * Report Builder — Power-BI / Looker-style interactive analytics over form data.
 * All data is org-isolated server-side.
 */

import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { AppLayout } from "@/components/app-layout";
import { apiRequest } from "@/lib/queryClient";
import {
  BarChart3,
  PieChart as PieChartIcon,
  LineChart as LineChartIcon,
  Table2,
  Plus,
  Trash2,
  Save,
  FolderOpen,
  Play,
  Download,
  X,
  Filter,
  Columns3,
  Group,
  TrendingUp,
  Users,
  FileText,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Loader2,
  LayoutDashboard,
  RefreshCw,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
  Area,
  AreaChart,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import SEOHead, { pageSEO } from "@/components/SEOHead";

/* ────────────────────────────────── types ────────────────────────────────── */

interface FieldInfo {
  label: string;
  type: string;
  options: string[];
  sampleValues?: string[];
}

interface CollectionInfo {
  formId: string;
  title: string;
  description: string;
  fields: FieldInfo[];
}

interface FilterRule {
  id: string;
  field: string;
  operator: string;
  value: string;
}

interface ReportConfig {
  formId: string;
  columns: string[];
  filters: FilterRule[];
  groupBy: string;
  aggregation: { field: string; operation: string } | null;
  sortField: string;
  sortDirection: "asc" | "desc";
  chartType: "bar" | "pie" | "line" | "area";
  dateRange: { start: string; end: string } | null;
}

interface SavedReport {
  _id: string;
  name: string;
  description: string;
  config: ReportConfig;
  createdBy: string;
  createdAt: string;
}

const OPERATORS = [
  { value: "eq", label: "Equals" },
  { value: "ne", label: "Not equal" },
  { value: "contains", label: "Contains" },
  { value: "notContains", label: "Not contains" },
  { value: "gt", label: "Greater than" },
  { value: "gte", label: "≥ (gte)" },
  { value: "lt", label: "Less than" },
  { value: "lte", label: "≤ (lte)" },
  { value: "exists", label: "Exists" },
];

const AGGREGATIONS = [
  { value: "count", label: "Count" },
  { value: "sum", label: "Sum" },
  { value: "avg", label: "Average" },
  { value: "min", label: "Min" },
  { value: "max", label: "Max" },
];

const CHART_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "#6366f1",
  "#f43f5e",
  "#10b981",
  "#f59e0b",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
];

const defaultConfig: ReportConfig = {
  formId: "",
  columns: [],
  filters: [],
  groupBy: "",
  aggregation: null,
  sortField: "",
  sortDirection: "desc",
  chartType: "bar",
  dateRange: null,
};

/* ─────────────────────────────── component ───────────────────────────────── */

export default function ReportBuilder() {
  const { user, loading, handleTokenExpired } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Auth guard
  useEffect(() => {
    if (!loading && !user) handleTokenExpired();
  }, [user, loading, handleTokenExpired]);

  /* ─── state ─── */
  const [config, setConfig] = useState<ReportConfig>({ ...defaultConfig });
  const [activeView, setActiveView] = useState<"table" | "chart">("table");
  const [page, setPage] = useState(1);
  const pageSize = 50;
  const [queryResult, setQueryResult] = useState<any>(null);
  const [summaryData, setSummaryData] = useState<any>(null);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [loadDialogOpen, setLoadDialogOpen] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [saveDescription, setSaveDescription] = useState("");
  const [selectedSchema, setSelectedSchema] = useState<any>(null);

  /* ─── queries ─── */

  // Available data sources
  const { data: collections = [], isLoading: collectionsLoading } = useQuery<CollectionInfo[]>({
    queryKey: ["/api/reports/collections"],
  });

  // Saved reports
  const { data: savedReports = [] } = useQuery<SavedReport[]>({
    queryKey: ["/api/reports/saved"],
  });

  // Schema for selected form
  const { data: schema, isLoading: schemaLoading } = useQuery<any>({
    queryKey: ["/api/reports/schema", config.formId],
    enabled: !!config.formId,
    queryFn: async () => {
      const res = await fetch(`/api/reports/schema/${config.formId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load schema");
      return res.json();
    },
  });

  useEffect(() => {
    if (schema) setSelectedSchema(schema);
  }, [schema]);

  /* ─── mutations ─── */

  const runQuery = useMutation({
    mutationFn: async () => {
      const body: any = {
        formId: config.formId,
        filters: config.filters.filter(f => f.field && f.operator).map(f => ({
          field: f.field,
          operator: f.operator,
          value: f.value,
        })),
        columns: config.columns,
        sortField: config.sortField || undefined,
        sortDirection: config.sortDirection,
        page,
        pageSize,
      };
      if (config.groupBy) {
        body.groupBy = config.groupBy;
        if (config.aggregation) body.aggregation = config.aggregation;
      }
      if (config.dateRange?.start || config.dateRange?.end) {
        body.dateRange = config.dateRange;
      }
      const res = await apiRequest("POST", "/api/reports/query", body);
      return res.json();
    },
    onSuccess: (data) => {
      setQueryResult(data);
    },
    onError: () => {
      toast({ title: "Query failed", description: "Could not run the report query", variant: "destructive" });
    },
  });

  const fetchSummary = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/reports/summary", { formId: config.formId });
      return res.json();
    },
    onSuccess: (data) => setSummaryData(data),
  });

  const saveReport = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/reports/saved", {
        name: saveName,
        description: saveDescription,
        config,
      });
    },
    onSuccess: () => {
      toast({ title: "Report saved" });
      setSaveDialogOpen(false);
      setSaveName("");
      setSaveDescription("");
      queryClient.invalidateQueries({ queryKey: ["/api/reports/saved"] });
    },
    onError: () => toast({ title: "Failed to save report", variant: "destructive" }),
  });

  const deleteReport = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/reports/saved/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reports/saved"] });
      toast({ title: "Report deleted" });
    },
  });

  /* ─── helpers ─── */

  const handleSelectForm = useCallback((formId: string) => {
    setConfig({ ...defaultConfig, formId });
    setQueryResult(null);
    setSummaryData(null);
    setPage(1);
  }, []);

  const handleRun = useCallback(() => {
    if (!config.formId) {
      toast({ title: "Select a data source first", variant: "destructive" });
      return;
    }
    runQuery.mutate();
    fetchSummary.mutate();
  }, [config.formId, runQuery, fetchSummary, toast]);

  const addFilter = () => {
    setConfig(c => ({
      ...c,
      filters: [...c.filters, { id: crypto.randomUUID(), field: "", operator: "eq", value: "" }],
    }));
  };

  const updateFilter = (id: string, patch: Partial<FilterRule>) => {
    setConfig(c => ({
      ...c,
      filters: c.filters.map(f => f.id === id ? { ...f, ...patch } : f),
    }));
  };

  const removeFilter = (id: string) => {
    setConfig(c => ({ ...c, filters: c.filters.filter(f => f.id !== id) }));
  };

  const toggleColumn = (label: string) => {
    setConfig(c => ({
      ...c,
      columns: c.columns.includes(label) ? c.columns.filter(l => l !== label) : [...c.columns, label],
    }));
  };

  const loadSavedReport = (report: SavedReport) => {
    setConfig(report.config);
    setLoadDialogOpen(false);
    setPage(1);
    setQueryResult(null);
    toast({ title: `Loaded "${report.name}"` });
  };

  const exportCSV = () => {
    if (!queryResult?.data?.length) return;
    const rows = queryResult.data;
    const keys = Object.keys(rows[0]).filter(k => k !== "_id");
    const header = keys.join(",");
    const body = rows.map((r: any) =>
      keys.map(k => {
        const v = r[k];
        if (v == null) return "";
        const s = String(v);
        return s.includes(",") || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
      }).join(",")
    ).join("\n");
    const blob = new Blob([header + "\n" + body], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `report-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  /* ─── derived ─── */
  const allFields: FieldInfo[] = selectedSchema?.fields ?? [];
  const systemFields = selectedSchema?.systemFields ?? [];
  const selectedForm = collections.find(c => c.formId === config.formId);
  const isAggregation = queryResult?.type === "aggregation";
  const totalPages = queryResult ? Math.ceil((queryResult.total || 0) / pageSize) : 0;

  // Determine table columns from result data
  const tableColumns: string[] = queryResult?.data?.length
    ? Object.keys(queryResult.data[0]).filter(k => k !== "_id")
    : [];

  /* ─── render ─── */

  if (loading) {
    return (
      <AppLayout title="Report Builder">
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </AppLayout>
    );
  }

  return (
    <>
      <SEOHead
        title={pageSEO.reportBuilder.title}
        description={pageSEO.reportBuilder.description}
        keywords={pageSEO.reportBuilder.keywords}
        canonical={pageSEO.reportBuilder.canonical}
      />
      <AppLayout
        title="Report Builder"
        description="Build custom reports and dashboards from your form data"
        actions={
          <div className="flex items-center gap-2">
            {/* Load */}
            <Dialog open={loadDialogOpen} onOpenChange={setLoadDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <FolderOpen className="h-4 w-4 mr-1" /> Load
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Saved Reports</DialogTitle>
                  <DialogDescription>Select a previously saved report configuration to load.</DialogDescription>
                </DialogHeader>
                <ScrollArea className="max-h-80">
                  {savedReports.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-6 text-center">No saved reports yet</p>
                  ) : (
                    <div className="space-y-2">
                      {savedReports.map((r: SavedReport) => (
                        <div key={r._id} className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
                          <button className="text-left flex-1" onClick={() => loadSavedReport(r)}>
                            <p className="font-medium text-sm">{r.name}</p>
                            {r.description && <p className="text-xs text-muted-foreground">{r.description}</p>}
                            <p className="text-xs text-muted-foreground mt-1">by {r.createdBy} · {new Date(r.createdAt).toLocaleDateString()}</p>
                          </button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => deleteReport.mutate(r._id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </DialogContent>
            </Dialog>

            {/* Save */}
            <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" disabled={!config.formId}>
                  <Save className="h-4 w-4 mr-1" /> Save
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Save Report</DialogTitle>
                  <DialogDescription>Save the current configuration so you can reload it later.</DialogDescription>
                </DialogHeader>
                <div className="space-y-3">
                  <div>
                    <Label>Name</Label>
                    <Input value={saveName} onChange={e => setSaveName(e.target.value)} placeholder="Monthly submissions overview" />
                  </div>
                  <div>
                    <Label>Description (optional)</Label>
                    <Textarea value={saveDescription} onChange={e => setSaveDescription(e.target.value)} placeholder="Describe this report…" rows={2} />
                  </div>
                </div>
                <DialogFooter>
                  <Button disabled={!saveName.trim() || saveReport.isPending} onClick={() => saveReport.mutate()}>
                    {saveReport.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
                    Save Report
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        }
      >
        <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-6">
          {/* ──────────────── LEFT PANEL — Configuration ──────────────── */}
          <div className="space-y-4">
            {/* Data Source */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" /> Data Source
                </CardTitle>
              </CardHeader>
              <CardContent>
                {collectionsLoading ? (
                  <Skeleton className="h-9 w-full" />
                ) : (
                  <Select value={config.formId} onValueChange={handleSelectForm}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a form…" />
                    </SelectTrigger>
                    <SelectContent>
                      {collections.map((c) => (
                        <SelectItem key={c.formId} value={c.formId}>
                          {c.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {selectedForm && (
                  <p className="text-xs text-muted-foreground mt-2">
                    {selectedForm.fields.length} fields · {selectedForm.description || "No description"}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Columns */}
            {config.formId && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Columns3 className="h-4 w-4 text-primary" /> Columns
                  </CardTitle>
                  <CardDescription className="text-xs">Select fields to include</CardDescription>
                </CardHeader>
                <CardContent>
                  {schemaLoading ? (
                    <Skeleton className="h-24 w-full" />
                  ) : (
                    <ScrollArea className="max-h-44">
                      <div className="space-y-2">
                        {allFields.map(f => (
                          <label key={f.label} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/50 rounded p-1 -mx-1">
                            <Checkbox
                              checked={config.columns.length === 0 || config.columns.includes(f.label)}
                              onCheckedChange={() => toggleColumn(f.label)}
                            />
                            <span className="flex-1 truncate">{f.label}</span>
                            <Badge variant="outline" className="text-[10px] shrink-0">{f.type}</Badge>
                          </label>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Filters */}
            {config.formId && (
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Filter className="h-4 w-4 text-primary" /> Filters
                    </CardTitle>
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={addFilter}>
                      <Plus className="h-3 w-3 mr-1" /> Add
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {config.filters.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-2">No filters — all records included</p>
                  ) : (
                    <div className="space-y-3">
                      {config.filters.map(f => (
                        <div key={f.id} className="flex items-start gap-1.5">
                          <div className="flex-1 space-y-1.5">
                            <Select value={f.field} onValueChange={v => updateFilter(f.id, { field: v })}>
                              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Field" /></SelectTrigger>
                              <SelectContent>
                                {allFields.map(af => <SelectItem key={af.label} value={af.label}>{af.label}</SelectItem>)}
                                {systemFields.map((sf: FieldInfo) => <SelectItem key={sf.label} value={sf.label}>{sf.label} (system)</SelectItem>)}
                              </SelectContent>
                            </Select>
                            <div className="flex gap-1.5">
                              <Select value={f.operator} onValueChange={v => updateFilter(f.id, { operator: v })}>
                                <SelectTrigger className="h-8 text-xs w-28 shrink-0"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  {OPERATORS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                                </SelectContent>
                              </Select>
                              <Input className="h-8 text-xs" value={f.value} onChange={e => updateFilter(f.id, { value: e.target.value })} placeholder="Value" />
                            </div>
                          </div>
                          <Button variant="ghost" size="icon" className="h-8 w-8 mt-0.5 text-muted-foreground hover:text-destructive" onClick={() => removeFilter(f.id)}>
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Group By / Aggregation */}
            {config.formId && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Group className="h-4 w-4 text-primary" /> Group &amp; Aggregate
                  </CardTitle>
                  <CardDescription className="text-xs">Optional — group data for charts</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label className="text-xs">Group by</Label>
                    <Select value={config.groupBy} onValueChange={v => setConfig(c => ({ ...c, groupBy: v === "__none__" ? "" : v }))}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="None" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">None</SelectItem>
                        {allFields.map(f => <SelectItem key={f.label} value={f.label}>{f.label}</SelectItem>)}
                        <SelectItem value="createdAt">Date (createdAt)</SelectItem>
                        <SelectItem value="submittedBy">Submitted By</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {config.groupBy && (
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <Label className="text-xs">Agg. field</Label>
                        <Select
                          value={config.aggregation?.field || ""}
                          onValueChange={v =>
                            setConfig(c => ({
                              ...c,
                              aggregation: { field: v, operation: c.aggregation?.operation || "count" },
                            }))
                          }
                        >
                          <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Count all" /></SelectTrigger>
                          <SelectContent>
                            {allFields.filter(f => f.type === "number").map(f => <SelectItem key={f.label} value={f.label}>{f.label}</SelectItem>)}
                            <SelectItem value="__count__">Count</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex-1">
                        <Label className="text-xs">Operation</Label>
                        <Select
                          value={config.aggregation?.operation || "count"}
                          onValueChange={v =>
                            setConfig(c => ({
                              ...c,
                              aggregation: { field: c.aggregation?.field || "__count__", operation: v },
                            }))
                          }
                        >
                          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {AGGREGATIONS.map(a => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Date Range */}
            {config.formId && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-primary" /> Date Range
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div>
                    <Label className="text-xs">Start date</Label>
                    <Input
                      className="h-8 text-xs"
                      type="date"
                      value={config.dateRange?.start ?? ""}
                      onChange={e =>
                        setConfig(c => ({
                          ...c,
                          dateRange: { start: e.target.value, end: c.dateRange?.end ?? "" },
                        }))
                      }
                    />
                  </div>
                  <div>
                    <Label className="text-xs">End date</Label>
                    <Input
                      className="h-8 text-xs"
                      type="date"
                      value={config.dateRange?.end ?? ""}
                      onChange={e =>
                        setConfig(c => ({
                          ...c,
                          dateRange: { start: c.dateRange?.start ?? "", end: e.target.value },
                        }))
                      }
                    />
                  </div>
                  {(config.dateRange?.start || config.dateRange?.end) && (
                    <Button variant="ghost" size="sm" className="text-xs h-7 w-full" onClick={() => setConfig(c => ({ ...c, dateRange: null }))}>
                      Clear dates
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Sort */}
            {config.formId && !config.groupBy && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-primary" /> Sort
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex gap-2">
                  <div className="flex-1">
                    <Select value={config.sortField} onValueChange={v => setConfig(c => ({ ...c, sortField: v === "__default__" ? "" : v }))}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Default (date)" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__default__">Default (date)</SelectItem>
                        <SelectItem value="createdAt">Date</SelectItem>
                        <SelectItem value="submittedBy">Submitted By</SelectItem>
                        {allFields.map(f => <SelectItem key={f.label} value={f.label}>{f.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <Select value={config.sortDirection} onValueChange={(v: "asc" | "desc") => setConfig(c => ({ ...c, sortDirection: v }))}>
                    <SelectTrigger className="h-8 text-xs w-20"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="desc">Desc</SelectItem>
                      <SelectItem value="asc">Asc</SelectItem>
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>
            )}

            {/* Run Button */}
            <Button className="w-full" size="lg" disabled={!config.formId || runQuery.isPending} onClick={handleRun}>
              {runQuery.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Play className="h-4 w-4 mr-2" />}
              Run Report
            </Button>
          </div>

          {/* ──────────────── RIGHT PANEL — Results ──────────────── */}
          <div className="space-y-4">
            {/* Summary KPI cards */}
            {summaryData && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Card>
                  <CardContent className="pt-4 pb-3 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{summaryData.totalResponses}</p>
                      <p className="text-xs text-muted-foreground">Total Responses</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 pb-3 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                      <TrendingUp className="h-5 w-5 text-green-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{summaryData.recentResponses}</p>
                      <p className="text-xs text-muted-foreground">Last 30 days</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 pb-3 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                      <Users className="h-5 w-5 text-blue-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{summaryData.uniqueSubmitters}</p>
                      <p className="text-xs text-muted-foreground">Unique Submitters</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 pb-3 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                      <CalendarDays className="h-5 w-5 text-amber-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">
                        {summaryData.dailySubmissions?.length
                          ? (summaryData.recentResponses / Math.max(summaryData.dailySubmissions.length, 1)).toFixed(1)
                          : "0"}
                      </p>
                      <p className="text-xs text-muted-foreground">Avg / Day</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Daily submission sparkline */}
            {summaryData?.dailySubmissions?.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Submissions (Last 30 Days)</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={120}>
                    <AreaChart data={summaryData.dailySubmissions}>
                      <defs>
                        <linearGradient id="colorSparkline" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={v => v.slice(5)} />
                      <YAxis hide />
                      <Tooltip
                        contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--popover))", color: "hsl(var(--popover-foreground))" }}
                        labelFormatter={v => `Date: ${v}`}
                      />
                      <Area type="monotone" dataKey="count" stroke="hsl(var(--primary))" fill="url(#colorSparkline)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* No data source selected placeholder */}
            {!config.formId && (
              <Card className="flex flex-col items-center justify-center py-16">
                <LayoutDashboard className="h-16 w-16 text-muted-foreground/30 mb-4" />
                <h3 className="text-lg font-semibold text-muted-foreground">Select a Data Source</h3>
                <p className="text-sm text-muted-foreground/70 mt-1 max-w-sm text-center">
                  Choose a form from the left panel to start building your custom report with tables, charts, and aggregations.
                </p>
              </Card>
            )}

            {/* Results */}
            {queryResult && (
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-sm">Results</CardTitle>
                      <Badge variant="secondary" className="text-xs">
                        {queryResult.total ?? queryResult.data?.length ?? 0} records
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1">
                      {isAggregation && (
                        <>
                          <Tabs value={config.chartType} onValueChange={(v: any) => setConfig(c => ({ ...c, chartType: v }))}>
                            <TabsList className="h-8">
                              <TabsTrigger value="bar" className="h-6 px-2"><BarChart3 className="h-3.5 w-3.5" /></TabsTrigger>
                              <TabsTrigger value="pie" className="h-6 px-2"><PieChartIcon className="h-3.5 w-3.5" /></TabsTrigger>
                              <TabsTrigger value="line" className="h-6 px-2"><LineChartIcon className="h-3.5 w-3.5" /></TabsTrigger>
                            </TabsList>
                          </Tabs>
                          <Separator orientation="vertical" className="h-6 mx-1" />
                        </>
                      )}
                      <Tabs value={activeView} onValueChange={(v: any) => setActiveView(v)}>
                        <TabsList className="h-8">
                          <TabsTrigger value="table" className="h-6 px-2"><Table2 className="h-3.5 w-3.5" /></TabsTrigger>
                          {isAggregation && (
                            <TabsTrigger value="chart" className="h-6 px-2"><BarChart3 className="h-3.5 w-3.5" /></TabsTrigger>
                          )}
                        </TabsList>
                      </Tabs>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={exportCSV} title="Export CSV">
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleRun} title="Refresh">
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {/* ─── Chart View ─── */}
                  {activeView === "chart" && isAggregation && (
                    <div className="p-4">
                      {config.chartType === "bar" && (
                        <ResponsiveContainer width="100%" height={360}>
                          <BarChart data={queryResult.data} margin={{ top: 5, right: 20, bottom: 40, left: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                            <XAxis dataKey="group" tick={{ fontSize: 11 }} angle={-30} textAnchor="end" />
                            <YAxis tick={{ fontSize: 11 }} />
                            <Tooltip
                              contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--popover))", color: "hsl(var(--popover-foreground))" }}
                            />
                            <Bar dataKey={queryResult.data[0]?.value !== undefined ? "value" : "count"} fill="hsl(var(--primary))" radius={[4, 4, 0, 0]}>
                              {queryResult.data.map((_: any, idx: number) => (
                                <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      )}

                      {config.chartType === "pie" && (
                        <ResponsiveContainer width="100%" height={360}>
                          <PieChart>
                            <Pie
                              data={queryResult.data}
                              dataKey={queryResult.data[0]?.value !== undefined ? "value" : "count"}
                              nameKey="group"
                              cx="50%"
                              cy="50%"
                              outerRadius={130}
                              label={({ group, percent }: any) => `${group} (${(percent * 100).toFixed(0)}%)`}
                              labelLine
                            >
                              {queryResult.data.map((_: any, idx: number) => (
                                <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip
                              contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--popover))", color: "hsl(var(--popover-foreground))" }}
                            />
                            <Legend />
                          </PieChart>
                        </ResponsiveContainer>
                      )}

                      {config.chartType === "line" && (
                        <ResponsiveContainer width="100%" height={360}>
                          <LineChart data={queryResult.data} margin={{ top: 5, right: 20, bottom: 40, left: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                            <XAxis dataKey="group" tick={{ fontSize: 11 }} angle={-30} textAnchor="end" />
                            <YAxis tick={{ fontSize: 11 }} />
                            <Tooltip
                              contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--popover))", color: "hsl(var(--popover-foreground))" }}
                            />
                            <Line
                              type="monotone"
                              dataKey={queryResult.data[0]?.value !== undefined ? "value" : "count"}
                              stroke="hsl(var(--primary))"
                              strokeWidth={2}
                              dot={{ fill: "hsl(var(--primary))", r: 4 }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                  )}

                  {/* ─── Table View ─── */}
                  {activeView === "table" && (
                    <ScrollArea className="max-h-[520px]">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            {tableColumns.map(col => (
                              <TableHead key={col} className="text-xs whitespace-nowrap">
                                {col === "createdAt" ? "Date" : col}
                              </TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {queryResult.data.map((row: any, idx: number) => (
                            <TableRow key={idx}>
                              {tableColumns.map(col => (
                                <TableCell key={col} className="text-xs max-w-[200px] truncate">
                                  {col === "createdAt" && row[col]
                                    ? new Date(row[col]).toLocaleString()
                                    : typeof row[col] === "object"
                                    ? JSON.stringify(row[col])
                                    : String(row[col] ?? "")}
                                </TableCell>
                              ))}
                            </TableRow>
                          ))}
                          {queryResult.data.length === 0 && (
                            <TableRow>
                              <TableCell colSpan={tableColumns.length || 1} className="text-center text-sm text-muted-foreground py-8">
                                No matching records
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  )}
                </CardContent>

                {/* Pagination — flat data only */}
                {!isAggregation && totalPages > 1 && (
                  <CardFooter className="justify-between py-3 px-4 border-t">
                    <p className="text-xs text-muted-foreground">
                      Page {page} of {totalPages} · {queryResult.total} total
                    </p>
                    <div className="flex gap-1">
                      <Button variant="outline" size="icon" className="h-7 w-7" disabled={page <= 1} onClick={() => { setPage(p => p - 1); runQuery.mutate(); }}>
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="icon" className="h-7 w-7" disabled={page >= totalPages} onClick={() => { setPage(p => p + 1); runQuery.mutate(); }}>
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardFooter>
                )}
              </Card>
            )}

            {/* Loading state while query runs */}
            {runQuery.isPending && !queryResult && (
              <Card>
                <CardContent className="py-12 flex flex-col items-center justify-center gap-3">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">Running your report…</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </AppLayout>
    </>
  );
}
