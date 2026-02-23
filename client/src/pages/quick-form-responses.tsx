/**
 * Quick Form Responses Viewer
 *
 * Admin page to view, filter, search, and export quick form responses.
 * Data is stored in MongoDB with simple JSON: { "field label": value }
 */

import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { apiRequest, queryClient } from "@/lib/queryClient";
import Header from "@/components/header";
import Sidebar from "@/components/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Download, Search, Eye, Trash2, RefreshCw, ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import QuickFormRenderer from "@/components/quick-form-renderer";

// ─── Types ──────────────────────────────────────────────────────────

interface QuickFormTemplate {
  _id: string;
  formId: string;
  title: string;
  fields: { label: string; type: string; required: boolean; options?: string[]; tableColumns?: any[] }[];
}

interface QuickFormResponse {
  _id: string;
  orgId: string;
  formId: string;
  formTitle: string;
  submittedBy: string;
  data: Record<string, any>;
  createdAt: string;
}

// ─── Component ──────────────────────────────────────────────────────

export default function QuickFormResponses() {
  const { toast } = useToast();
  const { user, loading, dbUser, handleTokenExpired } = useAuth();
  const [selectedFormId, setSelectedFormId] = useState<string>("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedResponse, setSelectedResponse] = useState<QuickFormResponse | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const pageSize = 50;

  // Auth guard
  useEffect(() => {
    if (!loading && !user) { handleTokenExpired(); return; }
    if (!loading && dbUser && dbUser.role !== "admin") { window.location.href = "/"; }
  }, [user, loading, handleTokenExpired, dbUser]);

  // ─── Queries ────────────────────────────────────────────────────

  const { data: templates = [], isLoading: templatesLoading } = useQuery<QuickFormTemplate[]>({
    queryKey: ["/api/quick-forms"],
    enabled: !!user,
    staleTime: 120_000,
  });

  const { data: responsesData, isLoading: responsesLoading, refetch } = useQuery({
    queryKey: ["quick-form-responses", selectedFormId, startDate, endDate, currentPage],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(currentPage), pageSize: String(pageSize) });
      if (selectedFormId) params.append("formId", selectedFormId);
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);
      const res = await fetch(`/api/quick-forms/responses/list?${params}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    enabled: !!user && hasSearched,
    staleTime: 30_000,
  });

  const responses: QuickFormResponse[] = responsesData?.data || [];
  const totalResponses = responsesData?.total || 0;
  const totalPages = Math.ceil(totalResponses / pageSize);

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/quick-forms/responses/${id}`);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Deleted", description: "Response deleted" });
      queryClient.invalidateQueries({ queryKey: ["quick-form-responses"] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete", variant: "destructive" });
    },
  });

  // ─── Filtered responses (client-side text search on top of server pagination) ──

  const filteredResponses = useMemo(() => {
    if (!searchTerm) return responses;
    const term = searchTerm.toLowerCase();
    return responses.filter((r) =>
      r.submittedBy?.toLowerCase().includes(term) ||
      r.formTitle?.toLowerCase().includes(term) ||
      JSON.stringify(r.data).toLowerCase().includes(term)
    );
  }, [responses, searchTerm]);

  // ─── Helpers ────────────────────────────────────────────────────

  const handleSearch = () => {
    setCurrentPage(1);
    setHasSearched(true);
    if (hasSearched) refetch();
  };

  const handleFormChange = (formId: string) => {
    setSelectedFormId(formId);
    setHasSearched(false);
  };

  const selectedTemplate = templates.find((t) => t.formId === selectedFormId);

  // Get all unique data keys from responses for dynamic table columns
  const dataColumns = useMemo(() => {
    if (selectedTemplate?.fields) {
      return selectedTemplate.fields.map((f) => f.label);
    }
    // Fallback: collect all keys from response data
    const keys = new Set<string>();
    responses.forEach((r) => {
      if (r.data) Object.keys(r.data).forEach((k) => keys.add(k));
    });
    return Array.from(keys);
  }, [responses, selectedTemplate]);

  // Export CSV
  const exportCSV = () => {
    if (filteredResponses.length === 0) {
      toast({ title: "No data", description: "Nothing to export", variant: "destructive" });
      return;
    }
    const headers = ["Submitted By", "Submitted At", ...dataColumns];
    const csvRows = filteredResponses.map((r) => {
      const fixed = [r.submittedBy, format(new Date(r.createdAt), "yyyy-MM-dd HH:mm:ss")];
      const dynamic = dataColumns.map((col) => {
        const val = r.data?.[col];
        if (val == null) return "";
        if (typeof val === "object") return JSON.stringify(val);
        return String(val);
      });
      return [...fixed, ...dynamic];
    });
    const csv = [headers, ...csvRows]
      .map((row) => row.map((c) => `"${String(c || "").replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `form-data-${selectedFormId || "all"}-${format(new Date(), "yyyyMMdd-HHmm")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Exported", description: `${filteredResponses.length} rows exported` });
  };

  // Render cell value (handle objects, arrays, file URLs)
  const renderCellValue = (val: any) => {
    if (val == null) return <span className="text-gray-400">—</span>;
    if (typeof val === "string" && val.startsWith("https://")) {
      return (
        <a href={val} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline inline-flex items-center gap-1 text-xs">
          View File <ExternalLink className="w-3 h-3" />
        </a>
      );
    }
    if (Array.isArray(val)) {
      if (val.length === 0) return <span className="text-gray-400">—</span>;
      // Table data (array of objects) or checkbox (array of strings)
      if (typeof val[0] === "object") return <span className="text-xs">{val.length} row(s)</span>;
      return <span className="text-xs">{val.join(", ")}</span>;
    }
    if (typeof val === "object") return <span className="text-xs">{JSON.stringify(val)}</span>;
    return <span className="text-sm">{String(val)}</span>;
  };

  // ─── Render ─────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex h-screen bg-neutral">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          <Header title="Quick Form Responses" description="View and manage form data" />
          <div className="p-6 animate-pulse"><div className="h-20 bg-gray-200 rounded" /></div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-neutral">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <Header title="Form Data" description="View, search, and export form response data from MongoDB" />

        <div className="p-6 space-y-6">
          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                <div>
                  <Label>Form</Label>
                  <Select value={selectedFormId} onValueChange={handleFormChange}>
                    <SelectTrigger><SelectValue placeholder="Select a form..." /></SelectTrigger>
                    <SelectContent>
                      {templates.map((t) => (
                        <SelectItem key={t._id} value={t.formId}>{t.title} ({t.formId})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>From</Label>
                  <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                </div>
                <div>
                  <Label>To</Label>
                  <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                </div>
                <div>
                  <Label>Search</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Search responses..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleSearch} disabled={!selectedFormId}>
                    <Search className="w-4 h-4 mr-1" />Search
                  </Button>
                  <Button variant="outline" onClick={() => refetch()} disabled={!hasSearched}>
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" onClick={exportCSV} disabled={filteredResponses.length === 0}>
                    <Download className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Results */}
          {!hasSearched ? (
            <Card>
              <CardContent className="p-12 text-center text-gray-500">
                <Search className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>Select a form and click Search to view responses</p>
              </CardContent>
            </Card>
          ) : responsesLoading ? (
            <Card>
              <CardContent className="p-12 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
                <p className="mt-4 text-gray-500">Loading responses...</p>
              </CardContent>
            </Card>
          ) : filteredResponses.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center text-gray-500">
                <p>No responses found</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">
                    {selectedTemplate?.title || "Responses"} — {totalResponses} total
                  </CardTitle>
                  <Badge variant="secondary">{filteredResponses.length} shown</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[50px]">#</TableHead>
                        <TableHead>Submitted By</TableHead>
                        <TableHead>Date</TableHead>
                        {dataColumns.map((col) => (
                          <TableHead key={col}>{col}</TableHead>
                        ))}
                        <TableHead className="w-[100px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredResponses.map((r, idx) => (
                        <TableRow key={r._id}>
                          <TableCell className="text-gray-500">{(currentPage - 1) * pageSize + idx + 1}</TableCell>
                          <TableCell className="text-sm">{r.submittedBy}</TableCell>
                          <TableCell className="text-sm whitespace-nowrap">
                            {format(new Date(r.createdAt), "dd MMM yyyy HH:mm")}
                          </TableCell>
                          {dataColumns.map((col) => (
                            <TableCell key={col}>{renderCellValue(r.data?.[col])}</TableCell>
                          ))}
                          <TableCell>
                            <div className="flex space-x-1">
                              <Button variant="ghost" size="sm" onClick={() => setSelectedResponse(r)}>
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  if (window.confirm("Delete this response?")) deleteMutation.mutate(r._id);
                                }}
                                disabled={deleteMutation.isPending}
                              >
                                <Trash2 className="w-4 h-4 text-red-500" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4">
                    <p className="text-sm text-gray-500">
                      Page {currentPage} of {totalPages} ({totalResponses} total)
                    </p>
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => setCurrentPage((p) => p - 1)}>
                        <ChevronLeft className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" size="sm" disabled={currentPage >= totalPages} onClick={() => setCurrentPage((p) => p + 1)}>
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Detail Dialog */}
        <Dialog open={!!selectedResponse} onOpenChange={() => setSelectedResponse(null)}>
          <DialogContent className="max-w-2xl max-h-[85vh]">
            <DialogHeader>
              <DialogTitle>Response Detail</DialogTitle>
            </DialogHeader>
            <ScrollArea className="max-h-[70vh]">
              {selectedResponse && (
                <div className="space-y-4 p-2">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><strong>Form:</strong> {selectedResponse.formTitle}</div>
                    <div><strong>Form ID:</strong> {selectedResponse.formId}</div>
                    <div><strong>Submitted By:</strong> {selectedResponse.submittedBy}</div>
                    <div><strong>Date:</strong> {format(new Date(selectedResponse.createdAt), "dd MMM yyyy HH:mm:ss")}</div>
                  </div>
                  <hr />
                  <div className="space-y-3">
                    {Object.entries(selectedResponse.data || {}).map(([key, val]) => (
                      <div key={key} className="border rounded p-3">
                        <Label className="text-xs text-gray-500 uppercase tracking-wide">{key}</Label>
                        <div className="mt-1">
                          {typeof val === "string" && val.startsWith("https://") ? (
                            <a href={val} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline inline-flex items-center gap-1">
                              View File <ExternalLink className="w-3 h-3" />
                            </a>
                          ) : Array.isArray(val) ? (
                            <pre className="text-xs bg-gray-50 p-2 rounded overflow-auto max-h-40">{JSON.stringify(val, null, 2)}</pre>
                          ) : typeof val === "object" ? (
                            <pre className="text-xs bg-gray-50 p-2 rounded">{JSON.stringify(val, null, 2)}</pre>
                          ) : (
                            <p className="text-sm">{String(val)}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  <hr />
                  <div className="text-xs text-gray-400">
                    <strong>Raw JSON:</strong>
                    <pre className="bg-gray-50 p-2 rounded mt-1 overflow-auto max-h-32">{JSON.stringify(selectedResponse.data, null, 2)}</pre>
                  </div>
                </div>
              )}
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
