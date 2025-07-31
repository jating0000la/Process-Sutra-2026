import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import Header from "@/components/header";
import Sidebar from "@/components/sidebar";
import TaskCard from "@/components/task-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle, Clock, AlertTriangle, Eye, Edit, Plus, Database, Download, UserCheck } from "lucide-react";
import FormRenderer from "@/components/form-renderer";
import { format } from "date-fns";

export default function Tasks() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [isCompleteDialogOpen, setIsCompleteDialogOpen] = useState(false);
  const [taskToComplete, setTaskToComplete] = useState<any>(null);
  const [completionStatus, setCompletionStatus] = useState("");
  const [formTemplate, setFormTemplate] = useState<any>(null);
  const [isFlowDataDialogOpen, setIsFlowDataDialogOpen] = useState(false);
  const [flowDataForTask, setFlowDataForTask] = useState<any>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isTransferDialogOpen, setIsTransferDialogOpen] = useState(false);
  const [taskToTransfer, setTaskToTransfer] = useState<any>(null);
  const [transferEmail, setTransferEmail] = useState("");
  const [transferReason, setTransferReason] = useState("");

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  const { data: tasks, isLoading: tasksLoading } = useQuery({
    queryKey: statusFilter !== "all" ? ["/api/tasks", { status: statusFilter }] : ["/api/tasks"],
    queryFn: statusFilter !== "all" 
      ? () => fetch(`/api/tasks?status=${statusFilter}`).then(res => res.json())
      : undefined, // Use default fetcher for all tasks
    enabled: isAuthenticated,
  });

  // Fetch form template
  const { data: formTemplates } = useQuery({
    queryKey: ["/api/form-templates"],
    enabled: isAuthenticated,
  });

  // Fetch form responses for flow data viewer
  const { data: formResponses } = useQuery({
    queryKey: ["/api/form-responses"],
    enabled: isAuthenticated,
  });

  // Fetch flow rules to check transferability
  const { data: flowRules } = useQuery({
    queryKey: ["/api/flow-rules"],
    enabled: isAuthenticated,
  });

  // Helper function to convert question IDs to readable labels
  const getReadableFormData = (formData: any, formId?: string): Record<string, any> => {
    if (!formData || !formTemplates) return formData;
    
    // Find the form template that matches this form ID
    const template = (formTemplates as any[])?.find((t: any) => t.formId === formId);
    
    if (!template?.questions) {
      // If no template found, still try to format table data if we can detect it
      const readableData: Record<string, any> = {};
      Object.entries(formData).forEach(([key, value]) => {
        if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'object') {
          // This looks like table data, format it
          const tableRows = value.map((row: any, index: number) => {
            const rowEntries = Object.entries(row).map(([colKey, colValue]) => {
              const colLabel = colKey.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1').trim();
              return `${colLabel}: ${colValue}`;
            });
            return `Item ${index + 1} - ${rowEntries.join(', ')}`;
          });
          readableData[key] = tableRows.join(' • ');
        } else {
          readableData[key] = value;
        }
      });
      return readableData;
    }
    
    const readableData: Record<string, any> = {};
    
    // Map question IDs to labels
    Object.entries(formData).forEach(([key, value]) => {
      const field = template.questions.find((f: any) => f.id === key);
      const label = field?.label || key; // Use label if found, otherwise keep original key
      
      // Handle special formatting for table data
      if (field?.type === 'table' && Array.isArray(value)) {
        // Create a more readable table format with proper column mapping
        const tableRows = value.map((row: any, index: number) => {
          const rowEntries = Object.entries(row).map(([colKey, colValue]) => {
            const column = field.tableColumns?.find((col: any) => col.id === colKey);
            const colLabel = column?.label || colKey.replace(/_/g, ' ');
            return `${colLabel}: ${colValue}`;
          });
          return `Item ${index + 1} - ${rowEntries.join(', ')}`;
        });
        readableData[label] = tableRows.join(' • ');
      } else if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'object') {
        // Handle table data even without field definition (fallback)
        const tableRows = value.map((row: any, index: number) => {
          const rowEntries = Object.entries(row).map(([colKey, colValue]) => {
            const colLabel = colKey.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1').trim();
            return `${colLabel}: ${colValue}`;
          });
          return `Item ${index + 1} - ${rowEntries.join(', ')}`;
        });
        readableData[label] = tableRows.join(' • ');
      } else if (Array.isArray(value)) {
        // Handle other arrays by joining them
        readableData[label] = value.join(', ');
      } else if (typeof value === 'object' && value !== null) {
        // Handle other object types by stringifying them properly
        readableData[label] = JSON.stringify(value);
      } else {
        readableData[label] = value;
      }
    });
    
    return readableData;
  };

  const handleFillForm = async (task: any) => {
    if (!task.formId) return;
    
    // Find the form template by formId
    const template = (formTemplates as any[])?.find((t: any) => t.formId === task.formId);
    if (template) {
      setSelectedTask(task); // Set the selected task for form submission
      setFormTemplate(template);
      setIsFormDialogOpen(true);
    } else {
      toast({
        title: "Error",
        description: "Form template not found",
        variant: "destructive",
      });
    }
  };

  const handleFormSubmit = async (formData: Record<string, any>) => {
    try {
      console.log("Submitting form data:", formData);
      console.log("Task info:", { 
        taskId: selectedTask?.id, 
        flowId: selectedTask?.flowId,
        formId: formTemplate?.formId 
      });
      
      await apiRequest("POST", "/api/form-responses", {
        responseId: `resp_${Date.now()}`, // Generate unique ID
        flowId: selectedTask?.flowId,
        taskId: selectedTask?.id,
        taskName: selectedTask?.taskName,
        formId: formTemplate?.formId,
        formData: formData,
      });
      
      toast({
        title: "Success",
        description: "Form submitted successfully",
      });
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/form-responses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      
      setIsFormDialogOpen(false);
      setFormTemplate(null);
      setSelectedTask(null);
    } catch (error) {
      console.error("Form submission error:", error);
      toast({
        title: "Error",
        description: "Failed to submit form. Please check all required fields.",
        variant: "destructive",
      });
    }
  };

  // Export functionality with comprehensive data including form responses and cycle time
  const handleExportData = async () => {
    try {
      setIsExporting(true);
      const response = await apiRequest("GET", "/api/export/flow-data");
      
      // Create comprehensive CSV/JSON export
      const exportData = (response as any).data;
      
      // Create detailed CSV with all task, form, and timing data
      const csvData = exportData.map((flow: any) => {
        const baseFlowData = {
          "Flow ID": flow.flowId,
          "System": flow.system,
          "Order Number": flow.orderNumber,
          "Total Tasks": flow.totalTasks,
          "Completed Tasks": flow.completedTasks,
          "Completion Rate %": flow.completionRate,
          "Average Cycle Time (Hours)": flow.avgCycleTime,
          "Overall Flow Time (Hours)": flow.overallFlowTime || "In Progress",
          "On Time Rate %": flow.onTimeRate,
          "Flow Start": flow.flowStartTime ? format(new Date(flow.flowStartTime), 'yyyy-MM-dd HH:mm:ss') : "N/A",
          "Flow End": flow.flowEndTime ? format(new Date(flow.flowEndTime), 'yyyy-MM-dd HH:mm:ss') : "In Progress"
        };
        
        // Add task-level details
        const taskRows = flow.tasks.map((task: any, taskIndex: number) => ({
          ...baseFlowData,
          "Task #": taskIndex + 1,
          "Task Name": task.taskName,
          "Task Status": task.status,
          "Task Created": format(new Date(task.createdAt), 'yyyy-MM-dd HH:mm:ss'),
          "Task Due": format(new Date(task.plannedTime), 'yyyy-MM-dd HH:mm:ss'),
          "Task Completed": task.actualCompletionTime ? format(new Date(task.actualCompletionTime), 'yyyy-MM-dd HH:mm:ss') : "Not Completed",
          "Task Cycle Time (Hours)": task.cycleTime || "N/A",
          "TAT Variance (Hours)": task.tatVariance || "N/A",
          "On Time": task.isOnTime === null ? "N/A" : (task.isOnTime ? "Yes" : "No"),
          "Assignee": task.doerEmail,
          "Form ID": task.formId || "No Form",
          "Form Responses Count": task.formResponses.length,
          
          // Add form data if available
          ...task.formResponses.reduce((formAcc: any, response: any, respIndex: number) => {
            const prefix = `Form Response ${respIndex + 1}`;
            formAcc[`${prefix} - Submitted By`] = response.submittedBy;
            formAcc[`${prefix} - Submitted At`] = format(new Date(response.timestamp), 'yyyy-MM-dd HH:mm:ss');
            
            // Flatten form data
            Object.entries(response.formData || {}).forEach(([key, value]) => {
              formAcc[`${prefix} - ${key}`] = typeof value === 'object' ? JSON.stringify(value) : String(value);
            });
            
            return formAcc;
          }, {})
        }));
        
        return taskRows;
      }).flat();
      
      // Convert to CSV
      if (csvData.length > 0) {
        const headers = Object.keys(csvData[0]);
        const csvContent = [
          headers.join(","),
          ...csvData.map((row: any) => 
            headers.map(header => {
              const value = row[header] || "";
              // Escape commas and quotes in CSV
              return typeof value === 'string' && (value.includes(',') || value.includes('"')) 
                ? `"${value.replace(/"/g, '""')}"` 
                : value;
            }).join(",")
          )
        ].join("\n");
        
        // Download CSV file
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `workflow_export_${format(new Date(), 'yyyy-MM-dd_HH-mm-ss')}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Also download JSON for detailed analysis
        const jsonBlob = new Blob([JSON.stringify(response, null, 2)], { type: 'application/json;charset=utf-8;' });
        const jsonLink = document.createElement("a");
        const jsonUrl = URL.createObjectURL(jsonBlob);
        jsonLink.setAttribute("href", jsonUrl);
        jsonLink.setAttribute("download", `workflow_export_detailed_${format(new Date(), 'yyyy-MM-dd_HH-mm-ss')}.json`);
        jsonLink.style.visibility = 'hidden';
        document.body.appendChild(jsonLink);
        jsonLink.click();
        document.body.removeChild(jsonLink);
        
        toast({
          title: "Export Successful",
          description: `Exported ${(response as any).totalFlows || exportData.length} flows with comprehensive data including form responses and cycle times.`,
        });
      } else {
        toast({
          title: "No Data",
          description: "No workflow data available for export.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Export error:", error);
      toast({
        title: "Export Failed",
        description: "Failed to export workflow data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const completeTaskMutation = useMutation({
    mutationFn: async ({ taskId, status }: { taskId: string; status: string }) => {
      await apiRequest("POST", `/api/tasks/${taskId}/complete`, { status });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Task completed successfully. Next task created automatically.",
      });
      // Invalidate all task-related queries including filtered ones
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ predicate: (query) => query.queryKey[0] === "/api/tasks" });
      queryClient.invalidateQueries({ queryKey: ["/api/form-responses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics/metrics"] });
      setIsCompleteDialogOpen(false);
      setTaskToComplete(null);
      setCompletionStatus("");
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to complete task",
        variant: "destructive",
      });
    },
  });

  const transferTaskMutation = useMutation({
    mutationFn: async ({ taskId, toEmail, reason }: { taskId: string; toEmail: string; reason: string }) => {
      await apiRequest("POST", `/api/tasks/${taskId}/transfer`, { toEmail, reason });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Task transferred successfully.",
      });
      // Invalidate all task-related queries
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ predicate: (query) => query.queryKey[0] === "/api/tasks" });
      setIsTransferDialogOpen(false);
      setTaskToTransfer(null);
      setTransferEmail("");
      setTransferReason("");
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to transfer task. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleCompleteClick = (task: any) => {
    setTaskToComplete(task);
    setIsCompleteDialogOpen(true);
  };

  const handleTransferClick = (task: any) => {
    setTaskToTransfer(task);
    setIsTransferDialogOpen(true);
  };

  const handleTransferConfirm = () => {
    if (taskToTransfer && transferEmail) {
      transferTaskMutation.mutate({ 
        taskId: taskToTransfer.id, 
        toEmail: transferEmail,
        reason: transferReason
      });
    }
  };

  const handleCompleteConfirm = () => {
    if (taskToComplete && completionStatus) {
      completeTaskMutation.mutate({ 
        taskId: taskToComplete.id, 
        status: completionStatus 
      });
    }
  };

  const handleViewFlowData = async (task: any) => {
    try {
      // Get all tasks for this flow
      const allTasks = (tasks as any[])?.filter((t: any) => t.flowId === task.flowId) || [];
      
      // Sort tasks by creation time to find the first task
      const sortedTasks = allTasks.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      const firstTask = sortedTasks[0];
      
      // Get all form responses for tasks in this flow
      const flowFormResponses = (formResponses as any[])?.filter((response: any) => {
        return allTasks.some((t: any) => t.id === response.taskId);
      }) || [];

      // Find the first form response (from the initial task)
      const firstFormResponse = flowFormResponses.find((response: any) => 
        response.taskId === firstTask?.id
      );

      // Add task names to form responses
      const enrichedResponses = flowFormResponses.map((response: any) => {
        const responseTask = allTasks.find((t: any) => t.id === response.taskId);
        return {
          ...response,
          taskName: responseTask?.taskName || "Unknown Task"
        };
      });

      setFlowDataForTask({
        flowId: task.flowId,
        orderNumber: task.orderNumber,
        system: task.system,
        tasks: allTasks,
        formResponses: enrichedResponses,
        firstTask: firstTask,
        firstFormData: firstFormResponse?.formData || null
      });
      setIsFlowDataDialogOpen(true);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load flow data",
        variant: "destructive",
      });
    }
  };



  // Check if a task is transferable based on flow rules
  const isTaskTransferable = (task: any) => {
    if (!flowRules) return false;
    const rule = (flowRules as any[]).find(rule => rule.nextTask === task.taskName && rule.system === task.system);
    return rule?.transferable || false;
  };

  // Get transfer target emails for a task
  const getTransferTargetEmails = (task: any) => {
    if (!flowRules) return [];
    const rule = (flowRules as any[]).find(rule => rule.nextTask === task.taskName && rule.system === task.system);
    if (!rule?.transferToEmails) return [];
    return rule.transferToEmails.split(',').map((email: string) => email.trim()).filter((email: string) => email);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case "overdue":
        return <AlertTriangle className="w-4 h-4 text-red-600" />;
      default:
        return <Clock className="w-4 h-4 text-yellow-600" />;
    }
  };



  if (isLoading) {
    return (
      <div className="flex h-screen bg-neutral">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          <Header title="My Tasks" description="Manage and track your assigned tasks" />
          <div className="p-6">
            <div className="animate-pulse space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="bg-white rounded-xl p-6 shadow-sm border">
                  <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-neutral">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <Header 
          title="My Tasks" 
          description="Manage and track your assigned tasks"
          actions={
            <Button onClick={() => window.location.href = '/flows'}>
              <Plus className="w-4 h-4 mr-2" />
              New Task
            </Button>
          }
        />

        <div className="p-6">
          {/* Filters */}
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Label htmlFor="status-filter">Filter by status:</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button 
                variant="outline" 
                onClick={handleExportData}
                disabled={isExporting}
                size="sm"
              >
                <Download className="w-4 h-4 mr-2" />
                {isExporting ? "Exporting..." : "Export Data"}
              </Button>
              
              <Button variant="outline" size="sm" onClick={() => window.location.href = '/flow-data'}>
                <Database className="w-4 h-4 mr-2" />
                View Flow Data
              </Button>
            </div>
          </div>

          {/* Task List */}
          <div className="space-y-4">
            {tasksLoading ? (
              [...Array(5)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-gray-200 rounded-lg"></div>
                      <div className="flex-1">
                        <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (tasks as any[])?.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No tasks found</h3>
                  <p className="text-gray-500 mb-4">
                    {statusFilter === "all" 
                      ? "You don't have any tasks assigned yet."
                      : `No ${statusFilter} tasks found. Try selecting "All Status" to see all tasks.`
                    }
                  </p>
                  <Button onClick={() => window.location.href = '/flows'}>
                    Create New Flow
                  </Button>
                </CardContent>
              </Card>
            ) : (
              (tasks as any[])?.map((task: any) => (
                <Card key={task.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="bg-blue-100 p-2 rounded-lg">
                          {getStatusIcon(task.status)}
                        </div>
                        <div>
                          <h3 className="text-sm font-medium text-gray-900">{task.taskName}</h3>
                          <p className="text-sm text-gray-600">System: {task.system}</p>
                          
                          {/* Flow Context Information - WHO, WHAT, WHEN, HOW */}
                          <div className="mt-2 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                            <div className="text-xs font-semibold text-blue-800 dark:text-blue-200 mb-2">📋 Flow Context</div>
                            
                            {/* WHO, WHAT, WHEN */}
                            <div className="grid grid-cols-1 gap-1 text-xs mb-2">
                              {task.flowInitiatedBy && (
                                <div>
                                  <span className="font-medium text-blue-700 dark:text-blue-300">WHO:</span>
                                  <span className="text-blue-600 dark:text-blue-400 ml-1">Started by {task.flowInitiatedBy}</span>
                                </div>
                              )}
                              
                              {task.flowDescription && (
                                <div>
                                  <span className="font-medium text-blue-700 dark:text-blue-300">WHAT:</span>
                                  <span className="text-blue-600 dark:text-blue-400 ml-1">{task.flowDescription}</span>
                                </div>
                              )}
                              
                              {task.flowInitiatedAt && (
                                <div>
                                  <span className="font-medium text-blue-700 dark:text-blue-300">WHEN:</span>
                                  <span className="text-blue-600 dark:text-blue-400 ml-1">{format(new Date(task.flowInitiatedAt), 'MMM dd, yyyy HH:mm')}</span>
                                </div>
                              )}
                              
                              <div>
                                <span className="font-medium text-blue-700 dark:text-blue-300">ORDER:</span>
                                <span className="text-blue-600 dark:text-blue-400 ml-1 font-mono">{task.orderNumber}</span>
                              </div>
                            </div>
                            
                            {/* Initial Form Data - Always Visible */}
                            {task.flowInitialFormData && (
                              <div className="pt-2 border-t border-blue-200 dark:border-blue-700 task-initial-data">
                                <div className="font-medium text-blue-700 dark:text-blue-300 text-xs mb-1">📄 Initial Data:</div>
                                <div className="bg-white dark:bg-gray-800 rounded p-2 text-xs border border-gray-200 dark:border-gray-600 shadow-sm max-h-40 overflow-y-auto">
                                  {Object.entries(getReadableFormData(task.flowInitialFormData, task.formId)).map(([key, value]) => (
                                    <div key={key} className="mb-2 p-1 bg-gray-50 dark:bg-gray-700 rounded">
                                      <div className="font-semibold text-gray-800 dark:text-gray-200 mb-1 text-xs bg-blue-100 dark:bg-blue-900 px-2 py-0.5 rounded">{key}</div>
                                      <div className="text-gray-900 dark:text-gray-100 break-words text-xs leading-relaxed pl-2">
                                        {String(value).split(' • ').map((item, index) => (
                                          <div key={index} className="mb-0.5">
                                            {item.includes('Item') ? (
                                              <span className="text-blue-700 dark:text-blue-300 font-medium">{item}</span>
                                            ) : (
                                              item
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                          
                          {/* Time Tracking Information */}
                          <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-800 rounded border text-xs space-y-1">
                            <div className="font-medium text-gray-700 dark:text-gray-300 mb-1">⏱️ Timing</div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <span className="font-medium text-gray-700 dark:text-gray-300">Created:</span>
                                <div className="text-gray-600 dark:text-gray-400">{format(new Date(task.createdAt), 'MMM dd, HH:mm')}</div>
                              </div>
                              <div>
                                <span className="font-medium text-gray-700 dark:text-gray-300">Due:</span>
                                <div className="text-gray-600 dark:text-gray-400">{format(new Date(task.plannedTime), 'MMM dd, HH:mm')}</div>
                              </div>
                              {task.actualCompletionTime && (
                                <div className="col-span-2">
                                  <span className="font-medium text-gray-700 dark:text-gray-300">Completed:</span>
                                  <div className="text-gray-600 dark:text-gray-400">{format(new Date(task.actualCompletionTime), 'MMM dd, HH:mm')}</div>
                                </div>
                              )}
                            </div>
                            
                            {/* Performance Status */}
                            <div className="pt-1 border-t border-gray-200 dark:border-gray-700">
                              {task.actualCompletionTime ? (
                                <div>
                                  {new Date(task.actualCompletionTime) <= new Date(task.plannedTime) ? (
                                    <span className="text-green-600 font-medium">✅ Completed On Time</span>
                                  ) : (
                                    <span className="text-red-600 font-medium">⚠️ Completed Late</span>
                                  )}
                                </div>
                              ) : (
                                <div>
                                  {new Date() > new Date(task.plannedTime) ? (
                                    <span className="text-red-600 font-medium">⚠️ Overdue</span>
                                  ) : (
                                    <span className="text-blue-600 font-medium">⏳ In Progress</span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-4 mt-2">
                            <span className="text-xs text-gray-500">Flow ID: {task.flowId}</span>
                            <span className="text-xs text-gray-500">Order: {task.orderNumber}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Badge variant={
                          task.status === 'completed' ? 'default' :
                          task.status === 'in_progress' ? 'secondary' :
                          task.status === 'overdue' ? 'destructive' : 'outline'
                        }>
                          {task.status}
                        </Badge>
                        {task.formId && task.formId.trim() !== "" && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleFillForm(task)}
                          >
                            <Edit className="w-4 h-4 mr-2" />
                            Fill Form
                          </Button>
                        )}
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => setSelectedTask(task)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>Task Details</DialogTitle>
                            </DialogHeader>
                            {selectedTask && (
                              <div className="space-y-4">
                                <div>
                                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                                    {selectedTask.taskName}
                                  </h3>
                                  <p className="text-gray-600">
                                    Task in {selectedTask.system} workflow
                                  </p>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <Label className="text-sm text-gray-600">Flow ID</Label>
                                    <p className="font-medium">{selectedTask.flowId}</p>
                                  </div>
                                  <div>
                                    <Label className="text-sm text-gray-600">Assigned To</Label>
                                    <p className="font-medium">{selectedTask.doerEmail}</p>
                                  </div>
                                  <div>
                                    <Label className="text-sm text-gray-600">Due Date</Label>
                                    <p className="font-medium">
                                      {new Date(selectedTask.plannedTime).toLocaleDateString()}
                                    </p>
                                  </div>
                                  <div>
                                    <Label className="text-sm text-gray-600">Status</Label>
                                    <Badge variant={
                                      selectedTask.status === 'completed' ? 'default' :
                                      selectedTask.status === 'in_progress' ? 'secondary' :
                                      selectedTask.status === 'overdue' ? 'destructive' : 'outline'
                                    }>
                                      {selectedTask.status.replace('_', ' ')}
                                    </Badge>
                                  </div>
                                </div>
                                
                                {selectedTask.formId && selectedTask.formId.trim() !== "" && (
                                  <div>
                                    <Label className="text-sm text-gray-600 mb-2 block">Associated Form</Label>
                                    <div className="border border-gray-200 rounded-lg p-4">
                                      <h4 className="font-medium mb-2">Form ID: {selectedTask.formId}</h4>
                                      <p className="text-sm text-gray-600 mb-3">
                                        Complete the required form for this task
                                      </p>
                                      <Button size="sm" onClick={() => handleFillForm(selectedTask)}>
                                        <Edit className="w-4 h-4 mr-2" />
                                        Fill Form
                                      </Button>
                                    </div>
                                  </div>
                                )}
                                
                                <div className="flex justify-end space-x-3 pt-4">
                                  <Button variant="outline">Close</Button>
                                  {isTaskTransferable(selectedTask) && selectedTask.status !== 'completed' && (
                                    <Button 
                                      variant="outline"
                                      onClick={() => handleTransferClick(selectedTask)}
                                    >
                                      <UserCheck className="w-4 h-4 mr-2" />
                                      Transfer
                                    </Button>
                                  )}
                                  {selectedTask.status !== "completed" && (
                                    <Button 
                                      onClick={() => handleCompleteClick(selectedTask)}
                                      disabled={completeTaskMutation.isPending}
                                    >
                                      <CheckCircle className="w-4 h-4 mr-2" />
                                      Mark Complete
                                    </Button>
                                  )}
                                </div>
                              </div>
                            )}
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </main>

      {/* Form Dialog */}
      <Dialog open={isFormDialogOpen} onOpenChange={setIsFormDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Fill Form</DialogTitle>
          </DialogHeader>
          {formTemplate && (
            <FormRenderer
              template={formTemplate}
              onSubmit={handleFormSubmit}
              isSubmitting={false}
              flowId={selectedTask?.flowId}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Completion Status Dialog */}
      <Dialog open={isCompleteDialogOpen} onOpenChange={setIsCompleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete Task</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Select the completion status for: <strong>{taskToComplete?.taskName}</strong>
            </p>
            <div>
              <Label htmlFor="completion-status">Completion Status</Label>
              <Select value={completionStatus} onValueChange={setCompletionStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Select completion status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Done">Done</SelectItem>
                  <SelectItem value="Regular">Regular</SelectItem>
                  <SelectItem value="Wedding">Wedding</SelectItem>
                  <SelectItem value="Yes">Yes</SelectItem>
                  <SelectItem value="No">No</SelectItem>
                  <SelectItem value="Approved">Approved</SelectItem>
                  <SelectItem value="Rejected">Rejected</SelectItem>
                  <SelectItem value="Completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-between">
              <Button 
                variant="outline" 
                onClick={() => handleViewFlowData(taskToComplete)}
              >
                <Database className="w-4 h-4 mr-2" />
                View Flow Data
              </Button>
              <div className="flex space-x-3">
                <Button 
                  variant="outline" 
                  onClick={() => setIsCompleteDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleCompleteConfirm}
                  disabled={!completionStatus || completeTaskMutation.isPending}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Complete Task
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Flow Data Dialog */}
      <Dialog open={isFlowDataDialogOpen} onOpenChange={setIsFlowDataDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Flow Data - {flowDataForTask?.orderNumber || flowDataForTask?.flowId}</DialogTitle>
          </DialogHeader>
          {flowDataForTask && (
            <div className="space-y-6">
              {/* Initial Form Data - Prominently displayed */}
              {flowDataForTask.firstFormData && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center mb-3">
                    <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                    <h3 className="font-semibold text-blue-900">Initial Form Data</h3>
                    <span className="ml-2 text-xs text-blue-600">({flowDataForTask.firstTask?.taskName})</span>
                  </div>
                  <div className="space-y-2">
                    {Object.entries(getReadableFormData(flowDataForTask.firstFormData, flowDataForTask.firstTask?.formId)).map(([key, value]) => (
                      <div key={key} className="flex items-start">
                        <span className="font-medium text-blue-800 mr-3 min-w-0 flex-shrink-0 text-sm">
                          {key}:
                        </span>
                        <span className="text-blue-900 break-words text-sm">
                          {Array.isArray(value) ? (
                            <div className="space-y-1">
                              {value.map((item, index) => (
                                <div key={index} className="bg-white p-2 rounded border text-xs">
                                  {typeof item === 'object' ? 
                                    Object.entries(item).map(([k, v]) => (
                                      <div key={k}><strong>{k}:</strong> {String(v)}</div>
                                    )) : 
                                    String(item)
                                  }
                                </div>
                              ))}
                            </div>
                          ) : typeof value === 'object' ? (
                            <div className="bg-white p-2 rounded border text-xs">
                              {JSON.stringify(value, null, 2)}
                            </div>
                          ) : (
                            String(value)
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <Label className="text-sm font-medium text-gray-600">Flow ID</Label>
                  <p className="text-sm">{flowDataForTask.flowId}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600">System</Label>
                  <p className="text-sm">{flowDataForTask.system}</p>
                </div>
                {flowDataForTask.orderNumber && (
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Order Number</Label>
                    <p className="text-sm">{flowDataForTask.orderNumber}</p>
                  </div>
                )}
                <div>
                  <Label className="text-sm font-medium text-gray-600">Total Tasks</Label>
                  <p className="text-sm">{flowDataForTask.tasks?.length || 0}</p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {/* Tasks */}
                <div>
                  <h3 className="font-semibold mb-3">Tasks ({flowDataForTask.tasks?.length || 0})</h3>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {flowDataForTask.tasks?.map((task: any) => (
                      <div key={task.id} className="border rounded p-3 bg-white">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-sm">{task.taskName}</span>
                          <Badge variant={
                            task.status === 'completed' ? 'default' :
                            task.status === 'in_progress' ? 'secondary' :
                            task.status === 'overdue' ? 'destructive' : 'outline'
                          }>
                            {task.status}
                          </Badge>
                        </div>
                        <div className="text-xs text-gray-600">
                          <p>Assigned: {task.doer}</p>
                          <p>Created: {new Date(task.createdAt).toLocaleString()}</p>
                          {task.completedAt && (
                            <p>Completed: {new Date(task.completedAt).toLocaleString()}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Form Responses */}
                <div>
                  <h3 className="font-semibold mb-3">Form Data ({flowDataForTask.formResponses?.length || 0})</h3>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {flowDataForTask.formResponses?.length === 0 ? (
                      <p className="text-gray-500 text-sm">No form data available</p>
                    ) : (
                      flowDataForTask.formResponses?.map((response: any) => (
                        <div key={response.id} className="border rounded p-3 bg-white">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-sm">{response.taskName}</span>
                            <span className="text-xs text-gray-500">
                              {new Date(response.submittedAt).toLocaleString()}
                            </span>
                          </div>
                          <div className="text-xs space-y-1">
                            {Object.entries(getReadableFormData(response.data || {}, response.formId)).map(([key, value]) => (
                              <div key={key} className="flex">
                                <span className="font-medium text-gray-600 mr-2 min-w-0 flex-shrink-0">
                                  {key}:
                                </span>
                                <span className="text-gray-800 break-words">
                                  {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={() => setIsFlowDataDialogOpen(false)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Task Transfer Dialog */}
      <Dialog open={isTransferDialogOpen} onOpenChange={setIsTransferDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transfer Task</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Transfer task: <strong>{taskToTransfer?.taskName}</strong>
            </p>
            
            <div>
              <Label htmlFor="transfer-email">Transfer To Email</Label>
              <Select value={transferEmail} onValueChange={setTransferEmail}>
                <SelectTrigger>
                  <SelectValue placeholder="Select email to transfer to" />
                </SelectTrigger>
                <SelectContent>
                  {taskToTransfer && getTransferTargetEmails(taskToTransfer).map((email: string) => (
                    <SelectItem key={email} value={email}>{email}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {taskToTransfer && getTransferTargetEmails(taskToTransfer).length === 0 && (
                <p className="text-xs text-orange-600 mt-1">
                  No transfer target emails configured for this task
                </p>
              )}
            </div>
            
            <div>
              <Label htmlFor="transfer-reason">Transfer Reason (Optional)</Label>
              <Textarea 
                value={transferReason}
                onChange={(e) => setTransferReason(e.target.value)}
                placeholder="Enter reason for transfer..."
                rows={3}
              />
            </div>
            
            <div className="flex justify-end space-x-3">
              <Button 
                variant="outline" 
                onClick={() => setIsTransferDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleTransferConfirm}
                disabled={transferTaskMutation.isPending || !transferEmail}
              >
                {transferTaskMutation.isPending ? "Transferring..." : "Transfer Task"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
