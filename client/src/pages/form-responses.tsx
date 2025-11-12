import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Search, Filter, Download, Eye, FileText, ChevronLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";

interface FormResponse {
  id: string;
  responseId: string;
  flowId: string;
  taskId: string;
  taskName: string;
  formId: string;
  submittedBy: string;
  formData: Record<string, any>;
  timestamp: string;
  orderNumber?: string;
  system?: string;
  flowDescription?: string;
  flowInitiatedBy?: string;
  flowInitiatedAt?: string;
}

interface FormTemplate {
  id: string;
  formId: string;
  title: string;
  description: string;
}

export default function FormResponses() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [orderNumberFilter, setOrderNumberFilter] = useState("");
  const [selectedFormId, setSelectedFormId] = useState<string>("all");
  const [selectedTaskName, setSelectedTaskName] = useState<string>("all");
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const [selectedResponse, setSelectedResponse] = useState<FormResponse | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // Fetch form responses
  const { data: responses = [], isLoading: responsesLoading } = useQuery({
    queryKey: ["form-responses"],
    queryFn: async () => {
      const response = await fetch("/api/form-responses", {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch form responses");
      return response.json();
    },
  });

  // Fetch form templates for filter options
  const { data: templates = [] } = useQuery({
    queryKey: ["form-templates"],
    queryFn: async () => {
      const response = await fetch("/api/form-templates", {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch form templates");
      return response.json();
    },
  });

  // Filter and paginate responses
  const { filteredResponses, paginatedResponses, totalPages } = useMemo(() => {
    const filtered = responses.filter((response: FormResponse) => {
      const matchesSearch = 
        response.taskName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        response.formId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        response.submittedBy.toLowerCase().includes(searchTerm.toLowerCase()) ||
        response.flowId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (response.orderNumber && response.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesFormId = selectedFormId === "all" || response.formId === selectedFormId;
      const matchesTaskName = selectedTaskName === "all" || response.taskName === selectedTaskName;
      
      const matchesOrderNumber = !orderNumberFilter || 
        (response.orderNumber && response.orderNumber.toLowerCase().includes(orderNumberFilter.toLowerCase()));

      const responseDate = new Date(response.timestamp);
      const matchesDateRange = 
        (!dateRange.start || responseDate >= new Date(dateRange.start)) &&
        (!dateRange.end || responseDate <= new Date(dateRange.end));

      return matchesSearch && matchesFormId && matchesTaskName && matchesOrderNumber && matchesDateRange;
    });

    // Sort by timestamp (newest first)
    const sorted = filtered.sort((a: FormResponse, b: FormResponse) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    // Paginate
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginated = sorted.slice(startIndex, startIndex + itemsPerPage);
    const totalPages = Math.ceil(sorted.length / itemsPerPage);

    return {
      filteredResponses: sorted,
      paginatedResponses: paginated,
      totalPages
    };
  }, [responses, searchTerm, orderNumberFilter, selectedFormId, selectedTaskName, dateRange, currentPage, itemsPerPage]);

  // Get unique task names for filter
  const uniqueTaskNames = useMemo(() => 
    Array.from(new Set(responses.map((r: FormResponse) => r.taskName))) as string[],
    [responses]
  );

  // Reset to first page when filters change
  const resetPage = () => setCurrentPage(1);

  // Export filtered data as CSV with flattened formData columns
  const exportToCSV = () => {
    if (filteredResponses.length === 0) {
      toast({
        title: "No data to export",
        description: "There are no form responses matching your filters.",
        variant: "destructive"
      });
      return;
    }

    // First pass: collect all unique form data field names
    const formDataFields = new Set<string>();
    filteredResponses.forEach((response: FormResponse) => {
      if (response.formData && typeof response.formData === 'object') {
        Object.keys(response.formData).forEach(key => {
          // Skip nested objects/arrays for now (they'll be JSON stringified)
          formDataFields.add(key);
        });
      }
    });

    // Build headers: fixed columns + dynamic form data columns
    const fixedHeaders = [
      "Response ID", 
      "Flow ID", 
      "Order Number", 
      "System", 
      "Task Name", 
      "Form ID", 
      "Submitted By", 
      "Timestamp"
    ];
    const dynamicHeaders = Array.from(formDataFields).sort();
    const headers = [...fixedHeaders, ...dynamicHeaders];

    // Build CSV rows
    const csvData = filteredResponses.map((response: FormResponse) => {
      const fixedColumns = [
        response.responseId,
        response.flowId,
        response.orderNumber || "",
        response.system || "",
        response.taskName,
        response.formId,
        response.submittedBy,
        format(new Date(response.timestamp), "yyyy-MM-dd HH:mm:ss")
      ];

      // Extract form data values
      const dynamicColumns = dynamicHeaders.map(fieldName => {
        const value = response.formData?.[fieldName];
        
        // Handle different value types
        if (value === null || value === undefined) {
          return "";
        } else if (typeof value === 'object') {
          // Arrays and objects - JSON stringify
          return JSON.stringify(value);
        } else {
          // Simple values
          return String(value);
        }
      });

      return [...fixedColumns, ...dynamicColumns];
    });

    // Generate CSV content
    const csvContent = [headers, ...csvData]
      .map(row => row.map((cell: any) => {
        // Escape quotes and wrap in quotes
        const cellStr = String(cell || "");
        return `"${cellStr.replace(/"/g, '""')}"`;
      }).join(","))
      .join("\n");

    // Download CSV
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `form-responses-${format(new Date(), "yyyy-MM-dd-HHmmss")}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Export successful",
      description: `Exported ${filteredResponses.length} form responses to CSV.`,
    });
  };

  const renderFormData = (formData: Record<string, any>) => {
    return (
      <div className="space-y-2">
        {Object.entries(formData).map(([key, value]) => (
          <div key={key} className="border-b pb-2">
            <div className="font-medium text-sm text-gray-600">{key}</div>
            <div className="text-sm">
              {typeof value === "object" ? JSON.stringify(value, null, 2) : String(value)}
            </div>
          </div>
        ))}
      </div>
    );
  };

  if (responsesLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center">
        <div className="text-lg">Loading form responses...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Form Responses</h1>
          <p className="text-gray-600">View and manage all form responses from your workflows</p>
        </div>

        {/* Filters and Search */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters & Search
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search responses..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    resetPage();
                  }}
                  className="pl-10"
                />
              </div>

              {/* Order Number Filter */}
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Filter by order number..."
                  value={orderNumberFilter}
                  onChange={(e) => {
                    setOrderNumberFilter(e.target.value);
                    resetPage();
                  }}
                  className="pl-10"
                />
              </div>

              {/* Form Filter */}
              <Select value={selectedFormId} onValueChange={(value) => {
                setSelectedFormId(value);
                resetPage();
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by form" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Forms</SelectItem>
                  {templates.map((template: FormTemplate) => (
                    <SelectItem key={template.formId} value={template.formId}>
                      {template.title} ({template.formId})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Task Name Filter */}
              <Select value={selectedTaskName} onValueChange={(value) => {
                setSelectedTaskName(value);
                resetPage();
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by task" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tasks</SelectItem>
                  {uniqueTaskNames.map((taskName: string) => (
                    <SelectItem key={taskName} value={taskName}>
                      {taskName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Export Button */}
              <Button onClick={exportToCSV} variant="outline" className="flex items-center gap-2">
                <Download className="h-4 w-4" />
                Export CSV
              </Button>
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Start Date</label>
                <Input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => {
                    setDateRange(prev => ({ ...prev, start: e.target.value }));
                    resetPage();
                  }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">End Date</label>
                <Input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => {
                    setDateRange(prev => ({ ...prev, end: e.target.value }));
                    resetPage();
                  }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Responses</p>
                  <p className="text-2xl font-bold">{filteredResponses.length}</p>
                </div>
                <FileText className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Unique Forms</p>
                  <p className="text-2xl font-bold">{new Set(filteredResponses.map((r: FormResponse) => r.formId)).size}</p>
                </div>
                <Calendar className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Unique Flows</p>
                  <p className="text-2xl font-bold">{new Set(filteredResponses.map((r: FormResponse) => r.flowId)).size}</p>
                </div>
                <Eye className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Today's Responses</p>
                  <p className="text-2xl font-bold">
                    {filteredResponses.filter((r: FormResponse) => 
                      format(new Date(r.timestamp), "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd")
                    ).length}
                  </p>
                </div>
                <Calendar className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Responses Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Form Responses ({filteredResponses.length})</span>
              <div className="text-sm text-gray-500">
                Page {currentPage} of {totalPages} ({paginatedResponses.length} of {filteredResponses.length} shown)
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Response ID</TableHead>
                    <TableHead>Flow ID</TableHead>
                    <TableHead>Order Number</TableHead>
                    <TableHead>System</TableHead>
                    <TableHead>Task Name</TableHead>
                    <TableHead>Form ID</TableHead>
                    <TableHead>Submitted By</TableHead>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedResponses.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                        No form responses found matching your criteria
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedResponses.map((response: FormResponse) => (
                      <TableRow key={response.id}>
                        <TableCell className="font-mono text-sm">
                          {response.responseId.slice(0, 8)}...
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {response.flowId.slice(0, 8)}...
                        </TableCell>
                        <TableCell className="font-medium">
                          {response.orderNumber || "-"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{response.system || "-"}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{response.taskName}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{response.formId}</Badge>
                        </TableCell>
                        <TableCell>{response.submittedBy}</TableCell>
                        <TableCell>
                          {format(new Date(response.timestamp), "MMM dd, yyyy HH:mm")}
                        </TableCell>
                        <TableCell>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedResponse(response)}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                View
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl max-h-[80vh]">
                              <DialogHeader>
                                <DialogTitle>Form Response Details</DialogTitle>
                              </DialogHeader>
                              <ScrollArea className="max-h-[60vh]">
                                <div className="space-y-4">
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <label className="font-medium">Response ID:</label>
                                      <p className="font-mono text-sm">{response.responseId}</p>
                                    </div>
                                    <div>
                                      <label className="font-medium">Flow ID:</label>
                                      <p className="font-mono text-sm">{response.flowId}</p>
                                    </div>
                                    <div>
                                      <label className="font-medium">Order Number:</label>
                                      <p className="font-medium">{response.orderNumber || "-"}</p>
                                    </div>
                                    <div>
                                      <label className="font-medium">System:</label>
                                      <p>{response.system || "-"}</p>
                                    </div>
                                    <div>
                                      <label className="font-medium">Task Name:</label>
                                      <p>{response.taskName}</p>
                                    </div>
                                    <div>
                                      <label className="font-medium">Form ID:</label>
                                      <p>{response.formId}</p>
                                    </div>
                                    <div>
                                      <label className="font-medium">Submitted By:</label>
                                      <p>{response.submittedBy}</p>
                                    </div>
                                    <div>
                                      <label className="font-medium">Timestamp:</label>
                                      <p>{format(new Date(response.timestamp), "MMM dd, yyyy HH:mm:ss")}</p>
                                    </div>
                                  </div>
                                  {response.flowDescription && (
                                    <div>
                                      <label className="font-medium">Flow Description:</label>
                                      <p className="text-sm text-gray-600 mt-1">{response.flowDescription}</p>
                                    </div>
                                  )}
                                  <div>
                                    <label className="font-medium">Form Data:</label>
                                    <div className="mt-2 p-4 bg-gray-50 rounded-lg">
                                      {renderFormData(response.formData)}
                                    </div>
                                  </div>
                                </div>
                              </ScrollArea>
                            </DialogContent>
                          </Dialog>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-4 border-t">
                <div className="text-sm text-gray-500">
                  Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredResponses.length)} of {filteredResponses.length} results
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <div className="flex items-center space-x-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const pageNum = i + 1;
                      return (
                        <Button
                          key={pageNum}
                          variant={currentPage === pageNum ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(pageNum)}
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                    {totalPages > 5 && (
                      <>
                        <span className="px-2">...</span>
                        <Button
                          variant={currentPage === totalPages ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(totalPages)}
                        >
                          {totalPages}
                        </Button>
                      </>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}