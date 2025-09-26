import React, { useState, useEffect, useMemo } from 'react';
import { formatInTatTimezone } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Download, Filter, RefreshCw, Search } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import Header from '@/components/header';
import Sidebar from '@/components/sidebar';

interface FormTemplate {
  id: string;
  formId: string;
  title: string;
  name?: string; // fallback property
  questions: Array<{ id: string; title: string; type: string; columns?: Array<{ id: string; title: string }> }>;
}

interface FormResponseDoc {
  _id: string;
  orgId: string;
  flowId: string;
  taskId: string;
  taskName: string;
  formId: string;
  submittedBy: string;
  orderNumber?: string | number;
  system?: string;
  flowDescription?: string;
  flowInitiatedBy?: string;
  flowInitiatedAt?: Date;
  formData: Record<string, any>;
  createdAt: Date;
}

interface PaginatedResponse {
  data: FormResponseDoc[];
  total: number;
  page: number;
  pageSize: number;
}

export default function MongoFormDataViewer() {
  const [formResponses, setFormResponses] = useState<FormResponseDoc[]>([]);
  const [formTemplates, setFormTemplates] = useState<FormTemplate[]>([]);
  const [loading, setLoading] = useState(false); // Changed to false initially
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [tatConfig, setTatConfig] = useState<{ timezone?: string; officeStartHour?: number; officeEndHour?: number } | null>(null);
  const [hasSearched, setHasSearched] = useState(false); // Track if user has searched
  
  // Filters
  const [selectedFormId, setSelectedFormId] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState<string>("");

  // Fetch form templates for filter dropdown
  useEffect(() => {
    fetchFormTemplates();
    // Load TAT configuration for timezone formatting
    (async () => {
      try {
        const r = await fetch('/api/tat-config', { credentials: 'include' });
        if (r.ok) {
          const cfg = await r.json();
          setTatConfig(cfg);
        }
      } catch {}
    })();
  }, []);

  // Don't automatically fetch form responses - wait for user to search

  const fetchFormTemplates = async () => {
    setTemplatesLoading(true);
    try {
      const response = await fetch('/api/form-templates', { credentials: 'include' });
      if (response.ok) {
        const templates = await response.json();
        setFormTemplates(templates);
      } else {
        console.error('Failed to fetch form templates. Status:', response.status);
      }
    } catch (error) {
      console.error('Error fetching form templates:', error);
      toast({
        title: "Error",
        description: "Failed to fetch form templates",
        variant: "destructive",
      });
    } finally {
      setTemplatesLoading(false);
    }
  };

  const fetchFormResponses = async () => {
    // Validate that user has selected a form before fetching
    if (!selectedFormId) {
      toast({
        title: "Please select a form",
        description: "Choose a form to view its data",
        variant: "default",
      });
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: "1",
        pageSize: "500", // Reduced from 1000 to improve performance
      });
      
      params.append('formId', selectedFormId); // Always require formId
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const response = await fetch(`/api/mongo/form-responses?${params}`);
      if (response.ok) {
        const result: PaginatedResponse = await response.json();
        setFormResponses(result.data);
        setHasSearched(true);
        
        toast({
          title: "Data loaded",
          description: `Found ${result.data.length} responses`,
          variant: "default",
        });
      } else {
        throw new Error('Failed to fetch form responses');
      }
    } catch (error) {
      console.error('Error fetching form responses:', error);
      toast({
        title: "Error",
        description: "Failed to fetch form responses",
        variant: "destructive",
      });
      setFormResponses([]);
    } finally {
      setLoading(false);
    }
  };

  // Manual search function triggered by button click
  const handleSearch = () => {
    fetchFormResponses();
  };

  // Reset data when form selection changes
  const handleFormChange = (formId: string) => {
    setSelectedFormId(formId);
    setFormResponses([]); // Clear previous data
    setHasSearched(false); // Reset search state
  };

  // Filter responses by search term
  const filteredResponses = useMemo(() => {
    if (!searchTerm) return formResponses;
    
    return formResponses.filter(response => 
      response.taskName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      response.submittedBy?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      response.system?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      response.orderNumber?.toString().toLowerCase().includes(searchTerm.toLowerCase()) ||
      JSON.stringify(response.formData).toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [formResponses, searchTerm]);

  // Get selected form details
  const selectedForm = formTemplates.find((f: FormTemplate) => f.formId === selectedFormId);

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
    
    filteredResponses.forEach((response: FormResponseDoc) => {
      const baseRow: { 
        CreatedAt: string; 
        OrderNumber: string;
        System: string;
        [key: string]: any 
      } = {
        CreatedAt: formatInTatTimezone(response.createdAt, tatConfig?.timezone),
        OrderNumber: response.orderNumber?.toString() || "N/A",
        System: response.system || "N/A",
      };

      // Parse form data structure: {questionId: {answer, questionId, questionTitle}}
      const formFields: Record<string, any> = {};
      let tableField: any = null;
      
      Object.values(response.formData || {}).forEach((field: any) => {
        if (field && field.questionTitle && field.answer !== undefined) {
          if (Array.isArray(field.answer) && field.answer.length > 0) {
            tableField = field;
          } else {
            formFields[field.questionTitle] = field.answer;
          }
        }
      });

      if (tableField && Array.isArray(tableField.answer)) {
        // Handle table data - create multiple rows
        tableField.answer.forEach((tableRow: any) => {
          const rowData = { ...baseRow, ...formFields };
          
          // Add table row data
          Object.entries(tableRow).forEach(([colKey, colValue]) => {
            // Use column key as header for now, will be mapped later
            rowData[colKey] = colValue;
          });
          
          rows.push(rowData);
        });
      } else {
        // Single row
        rows.push({ ...baseRow, ...formFields });
      }
    });

    return rows;
  }, [filteredResponses]);

  // Get dynamic columns
  const dynamicColumns = useMemo(() => {
    const columns = new Set<string>();
    const systemFields = ['CreatedAt', 'OrderNumber', 'System'];
    
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

  // Export to CSV
  const exportToCSV = async () => {
    setExporting(true);
    try {
      if (tableData.length === 0) {
        toast({
          title: "No Data",
          description: "No data available to export",
          variant: "destructive",
        });
        return;
      }

      // Build dynamic headers
      const headers = ['Created At', 'Order #', 'System', ...dynamicColumns.map(col => getColumnTitle(col))];

      const csvContent = [
        headers.join(','),
        ...tableData.map(row => [
          `"${row.CreatedAt}"`,
          `"${row.OrderNumber}"`,
          `"${row.System}"`,
          ...dynamicColumns.map(col => {
            const value = row[col];
            if (typeof value === 'object') {
              return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
            }
            return `"${String(value || '').replace(/"/g, '""')}"`;
          })
        ].join(','))
      ].join('\n');

      // Download CSV
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `mongo-form-responses-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Success",
        description: `Exported ${tableData.length} records to CSV`,
      });
    } catch (error) {
      console.error('Error exporting CSV:', error);
      toast({
        title: "Error",
        description: "Failed to export data",
        variant: "destructive",
      });
    } finally {
      setExporting(false);
    }
  };

  const resetFilters = () => {
    setSelectedFormId("");
    setStartDate("");
    setEndDate("");
    setSearchTerm("");
    setFormResponses([]); // Clear data
    setHasSearched(false); // Reset search state
  };

  // Render value helper (supports GridFS file descriptors)
  const renderCellValue = (value: any) => {
    // Array of files
    if (Array.isArray(value)) {
      const items = value
        .map((v) => (v && typeof v === 'object' ? v : null))
        .filter(Boolean) as any[];
      if (items.length && items.every((v) => v.type === 'file' && v.gridFsId)) {
        return (
          <div className="flex flex-wrap gap-2">
            {items.map((f, idx) => (
              <a
                key={idx}
                href={`/api/uploads/${f.gridFsId}`}
                className="text-blue-600 hover:underline"
                title={f.originalName || 'Download file'}
              >
                {f.originalName || `File ${idx + 1}`}
              </a>
            ))}
          </div>
        );
      }
    }

    // Single file descriptor
    if (value && typeof value === 'object' && value.type === 'file' && value.gridFsId) {
      return (
        <a
          href={`/api/uploads/${value.gridFsId}`}
          className="text-blue-600 hover:underline"
          title={value.originalName || 'Download file'}
        >
          {value.originalName || 'Download'}
        </a>
      );
    }

    // Fallbacks
    if (typeof value === 'object') {
      try { return JSON.stringify(value); } catch { return String(value); }
    }
    return String(value ?? '');
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 min-w-0 flex flex-col">
        <Header title="MongoDB Form Data Viewer" description="View and export form response data from MongoDB" />
        <div className="flex-1 p-6">
          <div className="space-y-6">
            

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
          <CardDescription>
           
            Filter form responses by form, date range, or search terms
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="form-select">Form Template *</Label>
              <Select value={selectedFormId} onValueChange={handleFormChange}>
                <SelectTrigger>
                  <SelectValue placeholder={templatesLoading ? "Loading forms..." : "Select a form to view data..."} />
                </SelectTrigger>
                <SelectContent>
                  {templatesLoading ? (
                    <SelectItem value="loading" disabled>
                      Loading...
                    </SelectItem>
                  ) : formTemplates && formTemplates.length > 0 ? (
                    formTemplates.map((template) => (
                      <SelectItem key={template.formId} value={template.formId}>
                        {template.title || template.name || template.formId}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="no-forms" disabled>
                      No forms available
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              {selectedFormId && (
                <p className="text-sm text-gray-500">
                  Form selected: {formTemplates.find(f => f.formId === selectedFormId)?.title || selectedFormId}
                </p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="start-date">Start Date</Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="end-date">End Date</Label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search responses..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            
          </div>
          
          <div className="flex gap-2 mt-4">
            <Button 
              onClick={handleSearch}
              disabled={!selectedFormId || loading}
              size="sm"
              className="flex items-center gap-2"
            >
              <Search className="h-4 w-4" />
              {loading ? "Loading..." : "Load Form Data"}
            </Button>
            <Button 
              onClick={resetFilters}
              variant="outline"
              size="sm"
            >
              Reset Filters
            </Button>
            
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Form Responses</CardTitle>
            
            <Badge variant="secondary">
              {tableData.length} records
            </Badge>
          </div>
          <CardDescription>
            {hasSearched && selectedForm ? (
              `Showing responses for ${selectedForm.title || selectedForm.name || selectedFormId}`
            ) : (
              "Select a form to load and view form responses"
            )}
            {searchTerm && ` (filtered by "${searchTerm}")`}
          </CardDescription>
        </CardHeader>
        
        <CardContent>
             <div className="flex justify-between items-center">
              <Button
                onClick={exportToCSV}
                disabled={exporting || tableData.length === 0}
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                {exporting ? 'Exporting...' : 'Export CSV'}
              </Button>
            </div>
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin" />
              <span className="ml-2">Loading...</span>
            </div>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[140px]">Created At</TableHead>
                      <TableHead className="min-w-[120px]">Order #</TableHead>
                      <TableHead className="min-w-[120px]">System</TableHead>
                      {dynamicColumns.map(col => (
                        <TableHead key={col} className="min-w-[120px]">
                          {getColumnTitle(col)}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tableData.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3 + dynamicColumns.length} className="text-center py-8 text-muted-foreground">
                          {!hasSearched ? (
                            <>
                              <div className="flex flex-col items-center gap-2">
                                <Filter className="h-8 w-8 text-gray-400" />
                                <p>Select a form and click "Load Form Data" to view responses</p>
                              </div>
                            </>
                          ) : (
                            "No form responses found for the selected criteria"
                          )}
                        </TableCell>
                      </TableRow>
                    ) : (
                      tableData.map((row, index) => (
                        <TableRow key={index}>
                          <TableCell>{row.CreatedAt}</TableCell>
                          <TableCell>
                            {row.OrderNumber !== "N/A" && (
                              <Badge variant="outline">
                                {row.OrderNumber}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {row.System !== "N/A" && (
                              <Badge variant="secondary">
                                {row.System}
                              </Badge>
                            )}
                          </TableCell>
                          {dynamicColumns.map(col => (
                            <TableCell key={col}>
                              {renderCellValue(row[col])}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
