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
  const [expandedDataTasks, setExpandedDataTasks] = useState<Set<string>>(new Set());

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
    queryKey: ["/api/tasks", { status: statusFilter }],
    queryFn: () => {
      const url = statusFilter === "all" 
        ? "/api/tasks" 
        : `/api/tasks?status=${statusFilter}`;
      return fetch(url).then(res => res.json());
    },
    enabled: isAuthenticated,
    staleTime: 0, // Always refetch to avoid cache issues
    gcTime: 0, // Don't cache results
  });

  // Add debugging to see what tasks are being returned
  useEffect(() => {
    if (tasks) {
      console.log("Tasks data:", tasks);
      console.log("Tasks count:", Array.isArray(tasks) ? tasks.length : 0);
      console.log("Status filter:", statusFilter);
    }
  }, [tasks, statusFilter]);

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

  // Helper function to convert question IDs to readable labels for all form types
  const getReadableFormData = (formData: any, formId?: string): Record<string, any> => {
    if (!formData) return {};
    
    const readableData: Record<string, any> = {};
    
    // Get form template for better field labeling
    const template = formTemplates ? (formTemplates as any[])?.find((t: any) => t.formId === formId) : null;
    const questions = template ? (typeof template.questions === 'string' ? JSON.parse(template.questions) : template.questions) : null;
    
    Object.entries(formData).forEach(([key, value]) => {
      // Check if this is the new format with questionTitle and answer
      if (value && typeof value === 'object' && 'questionTitle' in value && 'answer' in value) {
        const formValue = value as { questionTitle: string; questionId?: string; answer: any };
        
        // Try to get a better title from form template
        let displayTitle = formValue.questionTitle;
        let questionDefinition = null;
        
        if (questions && Array.isArray(questions)) {
          // First try to find by questionId, then by title
          questionDefinition = questions.find((q: any) => 
            q.id === formValue.questionId || 
            q.id === formValue.questionTitle || 
            q.label === formValue.questionTitle
          );
          
          if (questionDefinition && questionDefinition.label) {
            displayTitle = questionDefinition.label;
          }
        }
        
        // Format answer based on question type
        let formattedAnswer = formValue.answer;
        
        if (questionDefinition) {
          const questionType = questionDefinition.type;
          
          switch (questionType) {
            case 'table':
              // Handle table data
              if (Array.isArray(formValue.answer) && formValue.answer.length > 0 && typeof formValue.answer[0] === 'object') {
                let columns = Object.keys(formValue.answer[0]).map(key => ({
                  id: key,
                  label: key.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1').trim()
                }));
                
                if (questionDefinition.tableColumns) {
                  const templateColumns = questionDefinition.tableColumns;
                  const dataColumnKeys = Object.keys(formValue.answer[0]);
                  columns = dataColumnKeys.map((dataKey, index) => ({
                    id: dataKey,
                    label: templateColumns[index]?.label || dataKey.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1').trim()
                  }));
                }
                
                let tableHtml = '<div class="overflow-x-auto"><table class="min-w-full border border-gray-300 text-xs">';
                tableHtml += '<thead class="bg-gray-50"><tr>';
                columns.forEach((col: any) => {
                  tableHtml += `<th class="border border-gray-300 px-2 py-1 text-left font-medium">${col.label}</th>`;
                });
                tableHtml += '</tr></thead><tbody>';
                formValue.answer.forEach((row: any, index: number) => {
                  tableHtml += `<tr class="${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}">`;
                  columns.forEach((col: any) => {
                    const cellValue = row[col.id] || '';
                    tableHtml += `<td class="border border-gray-300 px-2 py-1">${cellValue}</td>`;
                  });
                  tableHtml += '</tr>';
                });
                tableHtml += '</tbody></table></div>';
                formattedAnswer = tableHtml;
              }
              break;
              
            case 'select':
            case 'radio':
              // Handle select/radio options - convert values to labels if options exist
              if (questionDefinition.options && Array.isArray(questionDefinition.options)) {
                const option = questionDefinition.options.find((opt: any) => opt.value === formValue.answer);
                formattedAnswer = option ? option.label : formValue.answer;
              }
              break;
              
            case 'checkbox':
              // Handle checkbox arrays - convert values to labels
              if (Array.isArray(formValue.answer) && questionDefinition.options) {
                const selectedLabels = formValue.answer.map((value: any) => {
                  const option = questionDefinition.options.find((opt: any) => opt.value === value);
                  return option ? option.label : value;
                });
                formattedAnswer = selectedLabels.join(', ');
              }
              break;
              
            case 'date':
              // Format date values
              if (formValue.answer && (typeof formValue.answer === 'string' || typeof formValue.answer === 'number' || formValue.answer instanceof Date)) {
                try {
                  const date = new Date(formValue.answer);
                  formattedAnswer = date.toLocaleDateString();
                } catch (e) {
                  formattedAnswer = formValue.answer;
                }
              }
              break;
              
            case 'file':
              // Handle file uploads
              if (formValue.answer) {
                if (typeof formValue.answer === 'string') {
                  formattedAnswer = `📎 ${formValue.answer}`;
                } else if (Array.isArray(formValue.answer)) {
                  formattedAnswer = formValue.answer.map((file: any) => `📎 ${file}`).join(', ');
                }
              }
              break;
              
            default:
              // For text, textarea, number, email, etc., use the answer as-is
              formattedAnswer = formValue.answer;
              break;
          }
        } else if (Array.isArray(formValue.answer) && formValue.answer.length > 0 && typeof formValue.answer[0] === 'object') {
          // Fallback table handling for cases without question definition
          let columns = Object.keys(formValue.answer[0]).map(key => ({
            id: key,
            label: key.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1').trim()
          }));
          
          let tableHtml = '<div class="overflow-x-auto"><table class="min-w-full border border-gray-300 text-xs">';
          tableHtml += '<thead class="bg-gray-50"><tr>';
          columns.forEach((col: any) => {
            tableHtml += `<th class="border border-gray-300 px-2 py-1 text-left font-medium">${col.label}</th>`;
          });
          tableHtml += '</tr></thead><tbody>';
          formValue.answer.forEach((row: any, index: number) => {
            tableHtml += `<tr class="${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}">`;
            columns.forEach((col: any) => {
              const cellValue = row[col.id] || '';
              tableHtml += `<td class="border border-gray-300 px-2 py-1">${cellValue}</td>`;
            });
            tableHtml += '</tr>';
          });
          tableHtml += '</tbody></table></div>';
          formattedAnswer = tableHtml;
        }
        
        readableData[displayTitle] = formattedAnswer;
      } else {
        // Legacy format - handle all field types dynamically
        if (!questions || !Array.isArray(questions)) {
          // Simple formatting without template
          if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'object') {
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
          return;
        }
        
        // Find the question definition for this key
        const legacyQuestion = questions.find((q: any) => q.id === key);
        const questionText = legacyQuestion?.label || key;
        
        // Format value based on question type
        let formattedValue = value;
        
        if (legacyQuestion) {
          const questionType = legacyQuestion.type;
          
          switch (questionType) {
            case 'table':
              // Handle table data
              if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'object') {
                let columns = Object.keys(value[0]).map(colKey => ({
                  id: colKey,
                  label: colKey.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1').trim()
                }));
                
                if (legacyQuestion.tableColumns) {
                  const templateColumns = legacyQuestion.tableColumns;
                  const dataColumnKeys = Object.keys(value[0]);
                  columns = dataColumnKeys.map((dataKey, index) => ({
                    id: dataKey,
                    label: templateColumns[index]?.label || dataKey.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1').trim()
                  }));
                }
                
                let tableHtml = '<div class="overflow-x-auto"><table class="min-w-full border border-gray-300 text-xs">';
                tableHtml += '<thead class="bg-gray-50"><tr>';
                columns.forEach((col: any) => {
                  tableHtml += `<th class="border border-gray-300 px-2 py-1 text-left font-medium">${col.label}</th>`;
                });
                tableHtml += '</tr></thead><tbody>';
                value.forEach((row: any, index: number) => {
                  tableHtml += `<tr class="${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}">`;
                  columns.forEach((col: any) => {
                    const cellValue = row[col.id] || '';
                    tableHtml += `<td class="border border-gray-300 px-2 py-1">${cellValue}</td>`;
                  });
                  tableHtml += '</tr>';
                });
                tableHtml += '</tbody></table></div>';
                formattedValue = tableHtml;
              }
              break;
              
            case 'select':
            case 'radio':
              // Convert values to labels
              if (legacyQuestion.options && Array.isArray(legacyQuestion.options)) {
                const option = legacyQuestion.options.find((opt: any) => opt.value === value);
                formattedValue = option ? option.label : value;
              }
              break;
              
            case 'checkbox':
              // Handle checkbox arrays
              if (Array.isArray(value) && legacyQuestion.options) {
                const selectedLabels = value.map((val: any) => {
                  const option = legacyQuestion.options.find((opt: any) => opt.value === val);
                  return option ? option.label : val;
                });
                formattedValue = selectedLabels.join(', ');
              }
              break;
              
            case 'date':
              // Format dates
              if (value && (typeof value === 'string' || typeof value === 'number' || value instanceof Date)) {
                try {
                  const date = new Date(value);
                  formattedValue = date.toLocaleDateString();
                } catch (e) {
                  formattedValue = value;
                }
              }
              break;
              
            case 'file':
              // Handle file uploads
              if (value) {
                if (typeof value === 'string') {
                  formattedValue = `📎 ${value}`;
                } else if (Array.isArray(value)) {
                  formattedValue = value.map((file: any) => `📎 ${file}`).join(', ');
                }
              }
              break;
              
            default:
              // For text, textarea, number, email, etc.
              formattedValue = value;
              break;
          }
        } else if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'object') {
          // Fallback table formatting
          const tableRows = value.map((row: any, index: number) => {
            const rowEntries = Object.entries(row).map(([colKey, colValue]) => {
              const colLabel = colKey.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1').trim();
              return `${colLabel}: ${colValue}`;
            });
            return `Item ${index + 1} - ${rowEntries.join(', ')}`;
          });
          formattedValue = tableRows.join(' • ');
        }
        
        readableData[questionText] = formattedValue;
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
      
      // Create enhanced form data with question titles
      let enhancedFormData = { ...formData };
      
      if (formTemplate?.questions) {
        // Parse questions if it's a JSON string
        const questions = typeof formTemplate.questions === 'string' 
          ? JSON.parse(formTemplate.questions) 
          : formTemplate.questions;
        
        if (Array.isArray(questions)) {
          // Create a mapping of question ID to question text
          const questionMap: Record<string, string> = {};
          questions.forEach((question: any) => {
            if (question.id && question.label) {
              questionMap[question.id] = question.label;
            }
          });
          
          // Transform form data to include question titles
          const enhancedData: Record<string, any> = {};
          Object.entries(formData).forEach(([key, value]) => {
            const questionTitle = questionMap[key] || key;
            enhancedData[questionTitle] = {
              questionId: key,
              questionTitle: questionTitle,
              answer: value
            };
          });
          
          enhancedFormData = enhancedData;
        }
      }
      
      await apiRequest("POST", "/api/form-responses", {
        responseId: `resp_${Date.now()}`, // Generate unique ID
        flowId: selectedTask?.flowId,
        taskId: selectedTask?.id,
        taskName: selectedTask?.taskName,
        formId: formTemplate?.formId,
        formData: enhancedFormData,
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

        <div className="p-6 bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 min-h-screen">
          {/* Enhanced Filters Section */}
          <div className="mb-8">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                      <Clock className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <Label htmlFor="status-filter" className="text-sm font-semibold text-gray-900 dark:text-white">
                        Filter Tasks
                      </Label>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Choose status to filter</p>
                    </div>
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-48 h-11 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 border-2 border-gray-200 dark:border-gray-600 rounded-xl shadow-sm hover:shadow-md transition-all">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-2">
                      <SelectItem value="all" className="rounded-lg">
                        <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                          <span>All Status</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="pending" className="rounded-lg">
                        <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                          <span>Pending</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="completed" className="rounded-lg">
                        <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                          <span>Completed</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex items-center space-x-3">
                  <Button 
                    variant="outline" 
                    onClick={handleExportData}
                    disabled={isExporting}
                    className="h-11 px-6 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border-2 border-emerald-200 dark:border-emerald-700 hover:from-emerald-100 hover:to-teal-100 dark:hover:from-emerald-900/30 dark:hover:to-teal-900/30 text-emerald-700 dark:text-emerald-300 rounded-xl shadow-sm hover:shadow-md transition-all"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    {isExporting ? "Exporting..." : "Export Data"}
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    onClick={() => window.location.href = '/flow-data'}
                    className="h-11 px-6 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-2 border-blue-200 dark:border-blue-700 hover:from-blue-100 hover:to-indigo-100 dark:hover:from-blue-900/30 dark:hover:to-indigo-900/30 text-blue-700 dark:text-blue-300 rounded-xl shadow-sm hover:shadow-md transition-all"
                  >
                    <Database className="w-4 h-4 mr-2" />
                    View Flow Data
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Enhanced Task List */}
          <div className="space-y-6">
            {tasksLoading ? (
              [...Array(5)].map((_, i) => (
                <Card key={i} className="animate-pulse bg-white dark:bg-gray-800 rounded-2xl shadow-lg border-0">
                  <CardContent className="p-8">
                    <div className="flex items-center space-x-6">
                      <div className="w-16 h-16 bg-gradient-to-br from-gray-200 to-gray-300 rounded-2xl"></div>
                      <div className="flex-1">
                        <div className="h-5 bg-gray-200 rounded-lg w-1/2 mb-3"></div>
                        <div className="h-4 bg-gray-200 rounded-lg w-3/4 mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded-lg w-1/3"></div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (tasks as any[])?.length === 0 ? (
              <Card className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border-0 overflow-hidden">
                <CardContent className="p-16 text-center">
                  <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Clock className="w-12 h-12 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">No tasks found</h3>
                  <p className="text-gray-500 dark:text-gray-400 mb-8 text-lg">
                    {statusFilter === "all" 
                      ? "You don't have any tasks assigned yet. Create a new flow to get started!"
                      : `No ${statusFilter} tasks found. Try selecting "All Status" to see all tasks.`
                    }
                  </p>
                  <Button 
                    onClick={() => window.location.href = '/flows'}
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
                  >
                    <Plus className="w-5 h-5 mr-2" />
                    Create New Flow
                  </Button>
                </CardContent>
              </Card>
            ) : (
              (tasks as any[])?.map((task: any) => (
                <Card key={task.id} className="group bg-white dark:bg-gray-800 rounded-2xl shadow-lg border-0 hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 overflow-hidden">
                  <CardContent className="p-0">
                    {/* Task Header with Status Indicator */}
                    <div className="p-6 bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 dark:from-blue-900/20 dark:via-indigo-900/20 dark:to-purple-900/20 border-b border-blue-100 dark:border-blue-800/30">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className={`relative p-4 rounded-2xl shadow-lg transform group-hover:scale-110 transition-transform ${
                            task.status === 'completed' 
                              ? 'bg-gradient-to-br from-green-400 to-emerald-500' 
                              : task.status === 'overdue'
                              ? 'bg-gradient-to-br from-red-400 to-pink-500'
                              : 'bg-gradient-to-br from-yellow-400 to-orange-500'
                          }`}>
                            {getStatusIcon(task.status)}
                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-white dark:bg-gray-800 rounded-full flex items-center justify-center">
                              <div className={`w-2 h-2 rounded-full ${
                                task.status === 'completed' ? 'bg-green-500' 
                                : task.status === 'overdue' ? 'bg-red-500' 
                                : 'bg-yellow-500'
                              } animate-pulse`}></div>
                            </div>
                          </div>
                          <div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                              {task.taskName}
                            </h3>
                            <div className="flex items-center space-x-2 mt-1">
                              <div className="px-3 py-1 bg-gradient-to-r from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-full">
                                <p className="text-sm font-medium text-blue-700 dark:text-blue-300">
                                  System: {task.system}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Status Badge */}
                        <div className={`px-4 py-2 rounded-full text-sm font-semibold uppercase tracking-wide shadow-lg ${
                          task.status === 'completed' 
                            ? 'bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 text-green-800 dark:text-green-300' 
                            : task.status === 'overdue'
                            ? 'bg-gradient-to-r from-red-100 to-pink-100 dark:from-red-900/30 dark:to-pink-900/30 text-red-800 dark:text-red-300'
                            : 'bg-gradient-to-r from-yellow-100 to-orange-100 dark:from-yellow-900/30 dark:to-orange-900/30 text-yellow-800 dark:text-yellow-300'
                        }`}>
                          {task.status}
                        </div>
                      </div>
                    </div>
                    
                    {/* Flow Context Information - WHO, WHAT, WHEN */}
                    <div className="p-6">
                      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border border-blue-200 dark:border-blue-800 p-4">
                        <div className="text-sm font-semibold text-blue-800 dark:text-blue-200 mb-3 flex items-center">
                          <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                          📋 Flow Context
                        </div>
                        
                        {/* WHO, WHAT, WHEN */}
                        <div className="grid grid-cols-1 gap-2 text-sm mb-3">
                          {task.flowInitiatedBy && (
                            <div className="flex items-start">
                              <span className="font-medium text-blue-700 dark:text-blue-300 min-w-[50px]">WHO:</span>
                              <span className="text-blue-600 dark:text-blue-400">Started by {task.flowInitiatedBy}</span>
                            </div>
                          )}
                          
                          {task.flowDescription && (
                            <div className="flex items-start">
                              <span className="font-medium text-blue-700 dark:text-blue-300 min-w-[50px]">WHAT:</span>
                              <span className="text-blue-600 dark:text-blue-400">{task.flowDescription}</span>
                            </div>
                          )}
                          
                          {task.flowInitiatedAt && (
                            <div className="flex items-start">
                              <span className="font-medium text-blue-700 dark:text-blue-300 min-w-[50px]">WHEN:</span>
                              <span className="text-blue-600 dark:text-blue-400">{format(new Date(task.flowInitiatedAt), 'MMM dd, yyyy HH:mm')}</span>
                            </div>
                          )}
                          
                          <div className="flex items-start">
                            <span className="font-medium text-blue-700 dark:text-blue-300 min-w-[50px]">ORDER:</span>
                            <span className="text-blue-600 dark:text-blue-400 font-mono">#{task.orderNumber}</span>
                          </div>
                        </div>
                        
                        {/* Data View Button and Flow Data */}
                        <div className="pt-3 border-t border-blue-200 dark:border-blue-700">
                          {/* Data View Button */}
                          <div className="flex justify-between items-center mb-3">
                            <div className="font-medium text-blue-700 dark:text-blue-300 text-sm flex items-center">
                              <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                              📄 Flow Data
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const newExpanded = new Set(expandedDataTasks);
                                if (newExpanded.has(task.id)) {
                                  newExpanded.delete(task.id);
                                } else {
                                  newExpanded.add(task.id);
                                }
                                setExpandedDataTasks(newExpanded);
                              }}
                              className="h-8 px-3 text-xs bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border-emerald-200 dark:border-emerald-700 hover:from-emerald-100 hover:to-teal-100 dark:hover:from-emerald-900/30 dark:hover:to-teal-900/30 text-emerald-700 dark:text-emerald-300 rounded-lg"
                            >
                              <Database className="h-3 w-3 mr-1" />
                              {expandedDataTasks.has(task.id) ? 'Hide Data' : 'View Data'}
                            </Button>
                          </div>
                          
                          {/* Expandable Data Section */}
                          {expandedDataTasks.has(task.id) && (
                            <div className="bg-white dark:bg-gray-800 rounded-lg p-3 text-xs border border-gray-200 dark:border-gray-600 shadow-sm max-h-64 overflow-y-auto">
                              {(() => {
                                // Get all tasks from the same flow, sorted by creation date
                                const flowTasks = (tasks as any[])?.filter(t => t.flowId === task.flowId && t.status === 'completed')
                                  .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) || [];
                                
                                // Get all form responses for this flow
                                const flowResponses = (formResponses as any[])?.filter(fr => 
                                  flowTasks.some(ft => ft.id === fr.taskId)
                                ) || [];
                                
                                const allFormData: { formName: string, data: any, taskName: string, order: number }[] = [];
                                
                                // Add initial form data if available
                                if (task.flowInitialFormData) {
                                  allFormData.push({
                                    formName: task.formId || 'Initial Form',
                                    data: task.flowInitialFormData,
                                    taskName: 'Initial Task',
                                    order: 0
                                  });
                                }
                                
                                // Add completed task responses
                                flowTasks.forEach((flowTask, index) => {
                                  const taskResponse = flowResponses.find(fr => fr.taskId === flowTask.id);
                                  if (taskResponse && taskResponse.formData) {
                                    allFormData.push({
                                      formName: flowTask.formId || `Task ${index + 1} Form`,
                                      data: taskResponse.formData,
                                      taskName: flowTask.taskName || `Task ${index + 1}`,
                                      order: index + 1
                                    });
                                  }
                                });
                                
                                return allFormData.map((formItem, formIndex) => (
                                  <div key={formIndex} className="mb-4 border-b border-gray-200 dark:border-gray-600 last:border-b-0 pb-4 last:pb-0">
                                    {/* Form Name Section */}
                                    <div className="mb-2 p-2 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg border border-green-200 dark:border-green-800">
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-2">
                                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                          <div className="font-semibold text-green-800 dark:text-green-200 text-xs">
                                            Form: {formItem.formName}
                                          </div>
                                        </div>
                                        <div className="text-xs text-green-700 dark:text-green-300">
                                          {formItem.taskName}
                                        </div>
                                      </div>
                                    </div>
                                    
                                    {/* Form Data Section */}
                                    <div className="space-y-2">
                                      {Object.entries(getReadableFormData(formItem.data, formItem.formName)).map(([key, value]) => {
                                        // Get the original form template to determine if this is a table field
                                        const template = (formTemplates as any[])?.find((t: any) => t.formId === formItem.formName);
                                        const questions = template?.questions ? (typeof template.questions === 'string' ? JSON.parse(template.questions) : template.questions) : [];
                                        const field = questions?.find((f: any) => f.id === key);
                                        const label = key; // Already processed by getReadableFormData
                                        
                                        return (
                                          <div key={key} className="mb-2 p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                            <div className="font-semibold text-gray-800 dark:text-gray-200 mb-1 text-xs bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded">
                                              {label}
                                            </div>
                                            
                                            {/* Check if this is HTML table data */}
                                            {typeof value === 'string' && value.includes('<table') ? (
                                              <div dangerouslySetInnerHTML={{ __html: value }} />
                                            ) : (
                                              <div className="text-gray-900 dark:text-gray-100 text-xs pl-1">
                                                {Array.isArray(value) ? value.join(', ') : String(value)}
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                ));
                              })()}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Action Buttons Section */}
                    <div className="p-6 bg-gray-50 dark:bg-gray-900/30 border-t border-gray-100 dark:border-gray-700">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            Order #{task.orderNumber} • Flow: {task.flowId?.slice(-8)}
                          </div>
                        </div>
                        
                          {task.formId && task.formId.trim() !== "" && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleFillForm(task)}
                              className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-2 border-purple-200 dark:border-purple-700 hover:from-purple-100 hover:to-pink-100 dark:hover:from-purple-900/30 dark:hover:to-pink-900/30 text-purple-700 dark:text-purple-300 rounded-xl shadow-sm hover:shadow-md transition-all"
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
                                className="bg-gradient-to-r from-gray-50 to-slate-50 dark:from-gray-800 dark:to-slate-800 border-2 border-gray-200 dark:border-gray-600 hover:from-gray-100 hover:to-slate-100 dark:hover:from-gray-700 dark:hover:to-slate-700 text-gray-700 dark:text-gray-300 rounded-xl shadow-sm hover:shadow-md transition-all"
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
                        <div className="text-blue-900 break-words text-sm flex-1">
                          {typeof value === 'string' && value.includes('<table') ? (
                            <div dangerouslySetInnerHTML={{ __html: value }} />
                          ) : Array.isArray(value) ? (
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
                        </div>
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
                                <div className="text-gray-800 break-words flex-1">
                                  {typeof value === 'string' && value.includes('<table') ? (
                                    <div dangerouslySetInnerHTML={{ __html: value }} />
                                  ) : (
                                    <span>{typeof value === 'object' ? JSON.stringify(value) : String(value)}</span>
                                  )}
                                </div>
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
