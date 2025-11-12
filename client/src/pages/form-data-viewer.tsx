import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Search, Download, ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { format } from "date-fns";
import Header from "@/components/header";
import Sidebar from "@/components/sidebar";

interface FormTemplate {
  id: string;
  formId: string;
  title: string;
  questions: Array<{ id: string; title: string; type: string }>;
}

interface FormResponse {
  id: string;
  flowId: string;
  formId: string;
  formData: Record<string, any>;
  timestamp: string;
  orderNumber?: string;
  system?: string;
  flowDescription?: string;
  flowInitiatedBy?: string;
  flowInitiatedAt?: string;
}

export default function FormDataViewer() {
  const { toast } = useToast();
  const [selectedFormId, setSelectedFormId] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [orderNumberFilter, setOrderNumberFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [sortColumn, setSortColumn] = useState<string>("");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const itemsPerPage = 25;

  // Fetch form templates for dropdown
  const { data: forms = [] } = useQuery({
    queryKey: ["form-templates"],
    queryFn: async () => {
      const response = await fetch("/api/form-templates", { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch forms");
      return response.json();
    },
  });

  // Fetch form responses for selected form
  const { data: allResponses = [], isLoading } = useQuery({
    queryKey: ["form-responses"],
    queryFn: async () => {
      const response = await fetch("/api/form-responses", { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch responses");
      return response.json();
    },
  });

  // Filter responses by selected form, date, and order number
  const responses = useMemo(() => {
    if (!selectedFormId) return [];
    return allResponses.filter((response: FormResponse) => {
      const matchesForm = response.formId === selectedFormId;
      const matchesDate = !dateFilter || 
        format(new Date(response.timestamp), "yyyy-MM-dd") === dateFilter;
      const matchesOrderNumber = !orderNumberFilter || 
        (response.orderNumber && response.orderNumber.toLowerCase().includes(orderNumberFilter.toLowerCase()));
      return matchesForm && matchesDate && matchesOrderNumber;
    });
  }, [allResponses, selectedFormId, dateFilter, orderNumberFilter]);

  // Get selected form details
  const selectedForm = forms.find((f: FormTemplate) => f.formId === selectedFormId);

  // Create column title map from form template
  const columnTitleMap = useMemo(() => {
    const map = new Map<string, string>();
    if (selectedForm?.questions) {
      selectedForm.questions.forEach((q: any) => {
        if (q.type === 'table' && q.columns) {
          q.columns.forEach((col: any) => {
            if (col.id && col.title) {
              map.set(col.id, col.title);
            }
          });
        }
      });
    }
    return map;
  }, [selectedForm]);

  // Convert responses to table format
  const tableData = useMemo(() => {
    const rows: any[] = [];
    
    responses.forEach((response: FormResponse) => {
      const baseRow: { 
        Timestamp: string; 
        ID: string; 
        FlowID: string; 
        OrderNumber: string;
        System: string;
        FlowDescription: string;
        [key: string]: any 
      } = {
        Timestamp: response.timestamp,
        ID: response.id,
        FlowID: response.flowId,
        OrderNumber: response.orderNumber || "N/A",
        System: response.system || "N/A",
        FlowDescription: response.flowDescription || "N/A",
      };

      // New canonical format: formData is already flat with readable field names
      // e.g., { "Customer Name": "John", "Email": "john@example.com", "Order Items": [...] }
      const formFields: Record<string, any> = {};
      let tableFields: Array<{ key: string; value: any[] }> = [];
      
      Object.entries(response.formData || {}).forEach(([fieldName, fieldValue]) => {
        // Check if this is table data (array of objects)
        if (Array.isArray(fieldValue) && fieldValue.length > 0 && typeof fieldValue[0] === 'object') {
          // This is a table field - store it separately to expand into multiple rows
          tableFields.push({ key: fieldName, value: fieldValue });
        } 
        // Also handle legacy enhanced format for backward compatibility
        else if (fieldValue && typeof fieldValue === 'object' && 'answer' in fieldValue) {
          // Legacy format: { questionTitle, questionId, answer }
          const answer = fieldValue.answer;
          if (Array.isArray(answer) && answer.length > 0 && typeof answer[0] === 'object') {
            tableFields.push({ key: fieldValue.questionTitle || fieldName, value: answer });
          } else {
            formFields[fieldValue.questionTitle || fieldName] = answer;
          }
        }
        else {
          // Simple field - store directly
          formFields[fieldName] = fieldValue;
        }
      });

      if (tableFields.length > 0) {
        // Handle table data - create multiple rows (one per table row)
        // Use the first table field for expanding (typically there's only one table per form)
        const mainTableField = tableFields[0];
        
        mainTableField.value.forEach((tableRow: any) => {
          const rowData = { ...baseRow, ...formFields };
          
          // Add table row data with readable column names (already transformed server-side)
          Object.entries(tableRow).forEach(([colKey, colValue]) => {
            // Skip metadata fields
            if (colKey.startsWith('_')) return;
            
            // Column names are already readable from server transformation
            rowData[colKey] = colValue;
          });
          
          rows.push(rowData);
        });
      } else {
        // No table data - single row with form fields
        rows.push({ ...baseRow, ...formFields });
      }
    });

    return rows;
  }, [responses]);

  // Get dynamic columns
  const dynamicColumns = useMemo(() => {
    const columns = new Set<string>();
    const systemFields = ['Timestamp', 'ID', 'FlowID', 'OrderNumber', 'System', 'FlowDescription'];
    
    tableData.forEach(row => {
      Object.keys(row).forEach(key => {
        if (!systemFields.includes(key)) columns.add(key);
      });
    });
    
    return Array.from(columns).sort();
  }, [tableData]);

  // Get column title
  const getColumnTitle = (columnKey: string) => {
    return columnTitleMap.get(columnKey) || columnKey;
  };

  // Filter and sort data
  const filteredData = useMemo(() => {
    let filtered = tableData.filter(row =>
      !searchTerm || Object.values(row).some(value =>
        String(value).toLowerCase().includes(searchTerm.toLowerCase())
      )
    );

    if (sortColumn) {
      filtered.sort((a, b) => {
        const aVal = a[sortColumn];
        const bVal = b[sortColumn];
        const comparison = String(aVal).localeCompare(String(bVal));
        return sortDirection === "asc" ? comparison : -comparison;
      });
    }

    return filtered;
  }, [tableData, searchTerm, sortColumn, sortDirection]);

  // Paginate data
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredData, currentPage]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);

  // Handle sort
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  // Format cell value
  const formatValue = (value: any) => {
    if (value === null || value === undefined) return "-";
    if (Array.isArray(value)) return value.join(", ");
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  };

  // Export to CSV
  const exportToCSV = () => {
    if (!selectedForm || filteredData.length === 0) {
      toast({
        title: "No data to export",
        description: "Please select a form and ensure there is data to export.",
        variant: "destructive"
      });
      return;
    }

    const headers = [
      "Timestamp", 
      "ID", 
      "FlowID", 
      "Order Number", 
      "System", 
      "Flow Description", 
      ...dynamicColumns.map(getColumnTitle)
    ];

    const csvData = filteredData.map(row => [
      format(new Date(row.Timestamp), "yyyy-MM-dd HH:mm:ss"),
      row.ID,
      row.FlowID,
      row.OrderNumber || "",
      row.System || "",
      row.FlowDescription || "",
      ...dynamicColumns.map(col => {
        const value = formatValue(row[col]);
        // Ensure proper escaping for CSV
        return value;
      })
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(cell => {
        const cellStr = String(cell || "");
        return `"${cellStr.replace(/"/g, '""')}"`;
      }).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${selectedForm.title}-${format(new Date(), "yyyy-MM-dd-HHmmss")}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Export successful",
      description: `Exported ${filteredData.length} responses to CSV.`,
    });
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 min-w-0 flex flex-col">
        <Header title="Form Data Viewer" description="Select a form and date to view response data" />
        <div className="flex-1 p-6">
          {/* Filters */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Filters</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <Select value={selectedFormId} onValueChange={(value) => {
                  setSelectedFormId(value);
                  setCurrentPage(1);
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select form" />
                  </SelectTrigger>
                  <SelectContent>
                    {forms.map((form: FormTemplate) => (
                      <SelectItem key={form.formId} value={form.formId}>
                        {form.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="relative">
                  <Calendar className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    type="date"
                    value={dateFilter}
                    onChange={(e) => {
                      setDateFilter(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="pl-10"
                  />
                </div>

                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search responses..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="pl-10"
                  />
                </div>

                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Filter by order number..."
                    value={orderNumberFilter}
                    onChange={(e) => {
                      setOrderNumberFilter(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="pl-10"
                  />
                </div>

                <Button onClick={exportToCSV} disabled={!selectedFormId || filteredData.length === 0}>
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Results */}
          {!selectedFormId ? (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <div className="text-center">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Form</h3>
                  <p className="text-gray-600">Choose a form from the dropdown to view its data</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{selectedForm?.title} - {filteredData.length} responses</span>
                  {totalPages > 1 && (
                    <div className="text-sm text-gray-500">
                      Page {currentPage} of {totalPages}
                    </div>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-lg">Loading...</div>
                  </div>
                ) : (
                  <>
                    <div className="overflow-x-auto max-w-full">
                      <div className="min-w-full">
                        <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead 
                              className="cursor-pointer hover:bg-gray-50 min-w-[140px]"
                              onClick={() => handleSort("Timestamp")}
                            >
                              Timestamp {sortColumn === "Timestamp" && (sortDirection === "asc" ? "↑" : "↓")}
                            </TableHead>
                            <TableHead 
                              className="cursor-pointer hover:bg-gray-50 min-w-[200px]"
                              onClick={() => handleSort("ID")}
                            >
                              ID {sortColumn === "ID" && (sortDirection === "asc" ? "↑" : "↓")}
                            </TableHead>
                            <TableHead 
                              className="cursor-pointer hover:bg-gray-50 min-w-[120px]"
                              onClick={() => handleSort("FlowID")}
                            >
                              FlowID {sortColumn === "FlowID" && (sortDirection === "asc" ? "↑" : "↓")}
                            </TableHead>
                            <TableHead 
                              className="cursor-pointer hover:bg-gray-50 min-w-[150px]"
                              onClick={() => handleSort("OrderNumber")}
                            >
                              Order Number {sortColumn === "OrderNumber" && (sortDirection === "asc" ? "↑" : "↓")}
                            </TableHead>
                            <TableHead 
                              className="cursor-pointer hover:bg-gray-50 min-w-[120px]"
                              onClick={() => handleSort("System")}
                            >
                              System {sortColumn === "System" && (sortDirection === "asc" ? "↑" : "↓")}
                            </TableHead>
                            <TableHead 
                              className="cursor-pointer hover:bg-gray-50 min-w-[200px]"
                              onClick={() => handleSort("FlowDescription")}
                            >
                              Flow Description {sortColumn === "FlowDescription" && (sortDirection === "asc" ? "↑" : "↓")}
                            </TableHead>
                            {dynamicColumns.map(col => (
                              <TableHead 
                                key={col}
                                className="cursor-pointer hover:bg-gray-50 min-w-[120px]"
                                onClick={() => handleSort(col)}
                              >
                                {getColumnTitle(col)} {sortColumn === col && (sortDirection === "asc" ? "↑" : "↓")}
                              </TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {paginatedData.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={6 + dynamicColumns.length} className="text-center py-8 text-gray-500">
                                No data found
                              </TableCell>
                            </TableRow>
                          ) : (
                            paginatedData.map((row, index) => (
                              <TableRow key={`${row.ID}-${index}`}>
                                <TableCell>{format(new Date(row.Timestamp), "MMM dd, yyyy HH:mm")}</TableCell>
                                <TableCell className="font-mono text-sm">{row.ID}</TableCell>
                                <TableCell className="font-mono text-sm">{row.FlowID?.slice(0, 8)}...</TableCell>
                                <TableCell className="font-medium">{formatValue(row.OrderNumber)}</TableCell>
                                <TableCell>{formatValue(row.System)}</TableCell>
                                <TableCell className="max-w-[200px] truncate" title={row.FlowDescription}>
                                  {formatValue(row.FlowDescription)}
                                </TableCell>
                                {dynamicColumns.map(col => (
                                  <TableCell key={col}>{formatValue(row[col])}</TableCell>
                                ))}
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                        </Table>
                      </div>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                      <div className="flex items-center justify-between mt-4 pt-4 border-t">
                        <div className="text-sm text-gray-500">
                          Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredData.length)} of {filteredData.length} results
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
                          <span className="text-sm">Page {currentPage} of {totalPages}</span>
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
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}