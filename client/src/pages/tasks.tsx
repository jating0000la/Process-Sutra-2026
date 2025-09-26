import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState, useMemo } from "react";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckCircle, Clock, AlertTriangle, Eye, Edit, Plus, Database, Download, UserCheck, Grid, List, MoreHorizontal } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import FormRenderer from "@/components/form-renderer";
import { format } from "date-fns";

export default function Tasks() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [systemFilter, setSystemFilter] = useState<string>("all");
  const [assigneeFilter, setAssigneeFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [dateFilter, setDateFilter] = useState<string>("all");
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
  const [viewMode, setViewMode] = useState<"cards" | "table">("table");

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

  // Fetch flow rules to check transferability and get completion statuses
  const { data: flowRules } = useQuery({
    queryKey: ["/api/flow-rules"],
    enabled: isAuthenticated,
  });

  // Get available completion statuses for a specific task
  const getTaskCompletionStatuses = (taskName: string, systemName: string): string[] => {
    if (!flowRules || !Array.isArray(flowRules)) return ["Done"];
    
    // Find all rules for this specific task in this system
    const taskRules = flowRules.filter((rule: any) => 
      rule.currentTask === taskName && rule.system === systemName
    );
    
    if (taskRules.length === 0) return ["Done"];
    
    // Extract unique statuses, filtering out empty ones
    const statusSet = new Set(taskRules.map((rule: any) => rule.status).filter(Boolean));
    const statuses = Array.from(statusSet);
    
    // If no statuses found or only empty statuses, default to "Done"
    return statuses.length > 0 ? statuses : ["Done"];
  };

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

  // Function to filter tasks based on all criteria
  const filteredTasks = useMemo(() => {
    if (!tasks || !Array.isArray(tasks)) return [];
    
    return tasks.filter((task: any) => {
      // Status filter
      if (statusFilter !== "all" && task.status !== statusFilter) {
        return false;
      }
      
      // System filter
      if (systemFilter !== "all" && task.system !== systemFilter) {
        return false;
      }
      
      // Assignee filter
      if (assigneeFilter !== "all" && task.doerEmail !== assigneeFilter) {
        return false;
      }
      
      // Search query filter
      if (searchQuery.trim() && !task.taskName.toLowerCase().includes(searchQuery.toLowerCase().trim())) {
        return false;
      }
      
      // Priority filter (based on due date)
      if (priorityFilter !== "all") {
        const now = new Date();
        const dueDate = new Date(task.plannedTime);
        const hoursUntilDue = (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60);
        
        switch (priorityFilter) {
          case "urgent":
            if (hoursUntilDue > 24 || task.status === 'completed') return false;
            break;
          case "high":
            if (hoursUntilDue > 72 || hoursUntilDue <= 24 || task.status === 'completed') return false;
            break;
          case "medium":
            if (hoursUntilDue > 168 || hoursUntilDue <= 72 || task.status === 'completed') return false; // 1 week
            break;
          case "low":
            if (hoursUntilDue <= 168 || task.status === 'completed') return false;
            break;
          case "overdue":
            if (hoursUntilDue >= 0 || task.status === 'completed') return false;
            break;
        }
      }
      
      // Date filter
      if (dateFilter !== "all") {
        const taskDate = new Date(task.createdAt);
        const now = new Date();
        const daysDiff = Math.floor((now.getTime() - taskDate.getTime()) / (1000 * 60 * 60 * 24));
        
        switch (dateFilter) {
          case "today":
            if (daysDiff !== 0) return false;
            break;
          case "week":
            if (daysDiff > 7) return false;
            break;
          case "month":
            if (daysDiff > 30) return false;
            break;
          case "quarter":
            if (daysDiff > 90) return false;
            break;
        }
      }
      
      return true;
    });
  }, [tasks, statusFilter, systemFilter, assigneeFilter, priorityFilter, searchQuery, dateFilter]);

  // Get unique values for filter dropdowns
  const getUniqueValues = (key: string) => {
    if (!tasks || !Array.isArray(tasks)) return [];
    const values = Array.from(new Set(tasks.map((task: any) => task[key]))).filter(Boolean);
    return values.sort();
  };

  // Helper function to get priority level and color
  const getPriorityInfo = (task: any) => {
    if (task.status === 'completed') {
      return { level: 'completed', color: 'green', label: 'Completed' };
    }
    
    const now = new Date();
    const dueDate = new Date(task.plannedTime);
    const hoursUntilDue = (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    if (hoursUntilDue < 0) {
      return { level: 'overdue', color: 'red', label: 'Overdue' };
    } else if (hoursUntilDue <= 24) {
      return { level: 'urgent', color: 'orange', label: 'Urgent' };
    } else if (hoursUntilDue <= 72) {
      return { level: 'high', color: 'yellow', label: 'High Priority' };
    } else if (hoursUntilDue <= 168) {
      return { level: 'medium', color: 'blue', label: 'Medium Priority' };
    } else {
      return { level: 'low', color: 'green', label: 'Low Priority' };
    }
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

      // Try server-side export first
      let serverResponse: any = null;
      try {
        serverResponse = await apiRequest("GET", "/api/export/flow-data");
      } catch (err) {
        // Server endpoint may be unavailable in some environments; we'll fall back to client-side export
        console.warn("Server export failed, will attempt client-side export:", err);
        serverResponse = null;
      }

      // Helper to trigger file download
      const downloadFile = (content: string | Blob, filename: string, mime = "text/csv") => {
        const blob = content instanceof Blob ? content : new Blob([content], { type: `${mime};charset=utf-8;` });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", filename);
        link.style.visibility = "hidden";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      };

      // If we have server data, use it. Otherwise fallback to client `tasks` data
      if (serverResponse && Array.isArray((serverResponse as any).data) && (serverResponse as any).data.length > 0) {
        const exportData = (serverResponse as any).data;

        // Original detailed CSV build (keeps compatibility)
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

          const taskRows = (flow.tasks || []).map((task: any, taskIndex: number) => ({
            ...baseFlowData,
            "Task #": taskIndex + 1,
            "Task Name": task.taskName,
            "Task Status": task.status,
            "Task Created": task.createdAt ? format(new Date(task.createdAt), 'yyyy-MM-dd HH:mm:ss') : "",
            "Task Due": task.plannedTime ? format(new Date(task.plannedTime), 'yyyy-MM-dd HH:mm:ss') : "",
            "Task Completed": task.actualCompletionTime ? format(new Date(task.actualCompletionTime), 'yyyy-MM-dd HH:mm:ss') : "Not Completed",
            "Assignee": task.doerEmail,
            "Form ID": task.formId || "No Form",
            "Form Responses Count": (task.formResponses || []).length,
            ...((task.formResponses || []).reduce((formAcc: any, response: any, respIndex: number) => {
              const prefix = `Form Response ${respIndex + 1}`;
              formAcc[`${prefix} - Submitted By`] = response.submittedBy;
              formAcc[`${prefix} - Submitted At`] = response.timestamp ? format(new Date(response.timestamp), 'yyyy-MM-dd HH:mm:ss') : "";
              Object.entries(response.formData || {}).forEach(([key, value]) => {
                formAcc[`${prefix} - ${key}`] = typeof value === 'object' ? JSON.stringify(value) : String(value);
              });
              return formAcc;
            }, {}))
          }));

          return taskRows;
        }).flat();

        if (csvData.length === 0) {
          toast({ title: "No Data", description: "Server returned no exportable data.", variant: "destructive" });
          return;
        }

        const headers = Object.keys(csvData[0]);
        const csvContent = [
          headers.join(","),
          ...csvData.map((row: any) => headers.map(h => {
            const v = row[h] ?? "";
            const s = String(v);
            return (s.includes(',') || s.includes('"')) ? `"${s.replace(/"/g, '""')}"` : s;
          }).join(","))
        ].join("\n");

        downloadFile(csvContent, `workflow_export_${format(new Date(), 'yyyy-MM-dd_HH-mm-ss')}.csv`, 'text/csv');
        downloadFile(new Blob([JSON.stringify(serverResponse, null, 2)], { type: 'application/json' }), `workflow_export_detailed_${format(new Date(), 'yyyy-MM-dd_HH-mm-ss')}.json`, 'application/json');
        toast({ title: "Export Successful", description: `Exported ${(serverResponse as any).totalFlows || csvData.length} rows.` });
        return;
      }

      // Fallback: export currently loaded tasks client-side
      if (tasks && Array.isArray(tasks) && tasks.length > 0) {
        type RowType = {
          ID: any;
          FlowID: any;
          TaskName: any;
          Status: any;
          Assignee: any;
          PlannedTime: string;
          CompletedAt: string;
          FormID: any;
          [key: string]: any; // Add index signature
        };
        const rows: RowType[] = (tasks as any[]).map(t => ({
          ID: t.id,
          FlowID: t.flowId,
          TaskName: t.taskName,
          Status: t.status,
          Assignee: t.doerEmail,
          PlannedTime: t.plannedTime ? format(new Date(t.plannedTime), 'yyyy-MM-dd HH:mm:ss') : "",
          CompletedAt: t.actualCompletionTime ? format(new Date(t.actualCompletionTime), 'yyyy-MM-dd HH:mm:ss') : "",
          FormID: t.formId || "",
        }));

        const headers = Object.keys(rows[0]);
        const csvContent = [
          headers.join(","),
          ...rows.map(row => headers.map(h => {
            const v = row[h] ?? "";
            const s = String(v);
            return (s.includes(',') || s.includes('"')) ? `"${s.replace(/"/g, '""')}"` : s;
          }).join(","))
        ].join("\n");

        downloadFile(csvContent, `tasks_export_${format(new Date(), 'yyyy-MM-dd_HH-mm-ss')}.csv`, 'text/csv');
        toast({ title: "Export Successful", description: `Exported ${rows.length} tasks (client-side).` });
        return;
      }

      // No data available
      toast({ title: "No Data", description: "No workflow or tasks data available for export.", variant: "destructive" });
    } catch (error) {
      console.error("Export error:", error);
      toast({ title: "Export Failed", description: "Failed to export workflow data. Please try again.", variant: "destructive" });
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
    setCompletionStatus(""); // Reset completion status
    setIsCompleteDialogOpen(true);
    
    // Debug: Log available statuses for this task
    console.log('Task:', task.taskName, 'System:', task.system);
    console.log('Available completion statuses:', getTaskCompletionStatuses(task.taskName, task.system));
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
            <div className="flex items-center space-x-3">
              {/* View Mode Toggle */}
              <div className="flex items-center bg-white dark:bg-gray-800 rounded-lg p-1 shadow-sm border border-gray-200 dark:border-gray-700">
                <Button
                  variant={viewMode === "table" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("table")}
                  className={`h-8 px-3 rounded-md transition-all ${
                    viewMode === "table" 
                      ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-sm" 
                      : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                  }`}
                >
                  <List className="w-4 h-4 mr-1" />
                  Table
                </Button>
                <Button
                  variant={viewMode === "cards" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("cards")}
                  className={`h-8 px-3 rounded-md transition-all ${
                    viewMode === "cards" 
                      ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-sm" 
                      : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                  }`}
                >
                  <Grid className="w-4 h-4 mr-1" />
                  Cards
                </Button>
              </div>
              
              <Button onClick={() => window.location.href = '/flows'}>
                <Plus className="w-4 h-4 mr-2" />
                New Task
              </Button>
            </div>
          }
        />

        <div className="p-6 bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 min-h-screen">
          {/* Enhanced Filters Section */}
          <div className="mb-8">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
              {/* Filter Header */}
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <Clock className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Filter Tasks</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Use multiple filters to find tasks quickly</p>
                </div>
              </div>

              {/* Filter Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
                {/* Status Filter */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Status</Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="h-10 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 border border-gray-200 dark:border-gray-600 rounded-lg">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">
                        <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                          <span>All Status</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="pending">
                        <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                          <span>Pending</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="in_progress">
                        <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                          <span>In Progress</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="completed">
                        <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                          <span>Completed</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="overdue">
                        <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                          <span>Overdue</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* System Filter */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">System</Label>
                  <Select value={systemFilter} onValueChange={setSystemFilter}>
                    <SelectTrigger className="h-10 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 border border-gray-200 dark:border-gray-600 rounded-lg">
                      <SelectValue placeholder="All Systems" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Systems</SelectItem>
                      {getUniqueValues('system').map((system: string) => (
                        <SelectItem key={system} value={system}>{system}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Assignee Filter */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Assignee</Label>
                  <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
                    <SelectTrigger className="h-10 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 border border-gray-200 dark:border-gray-600 rounded-lg">
                      <SelectValue placeholder="All Assignees" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Assignees</SelectItem>
                      {getUniqueValues('doerEmail').map((email: string) => (
                        <SelectItem key={email} value={email}>{email}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Priority Filter */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Priority</Label>
                  <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                    <SelectTrigger className="h-10 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 border border-gray-200 dark:border-gray-600 rounded-lg">
                      <SelectValue placeholder="All Priorities" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Priorities</SelectItem>
                      <SelectItem value="overdue">
                        <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                          <span>Overdue</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="urgent">
                        <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                          <span>Urgent (≤24h)</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="high">
                        <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                          <span>High (≤3 days)</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="medium">
                        <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          <span>Medium (≤1 week)</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="low">
                        <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span>Low (&gt;1 week)</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Date Filter */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Created</Label>
                  <Select value={dateFilter} onValueChange={setDateFilter}>
                    <SelectTrigger className="h-10 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 border border-gray-200 dark:border-gray-600 rounded-lg">
                      <SelectValue placeholder="All Dates" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Dates</SelectItem>
                      <SelectItem value="today">Today</SelectItem>
                      <SelectItem value="week">This Week</SelectItem>
                      <SelectItem value="month">This Month</SelectItem>
                      <SelectItem value="quarter">Last 3 Months</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Search Filter */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Search</Label>
                  <Input
                    placeholder="Search task name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-10 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 border border-gray-200 dark:border-gray-600 rounded-lg"
                  />
                </div>
              </div>

              {/* Filter Summary and Actions */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Showing {filteredTasks.length} of {Array.isArray(tasks) ? tasks.length : 0} tasks
                </div>
                
                <div className="flex items-center space-x-3">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      setStatusFilter("all");
                      setSystemFilter("all");
                      setAssigneeFilter("all");
                      setPriorityFilter("all");
                      setDateFilter("all");
                      setSearchQuery("");
                    }}
                    className="h-9 px-4 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 border border-gray-200 dark:border-gray-600 rounded-lg"
                  >
                    Clear Filters
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    onClick={handleExportData}
                    disabled={isExporting}
                    className="h-9 px-4 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border border-emerald-200 dark:border-emerald-700 hover:from-emerald-100 hover:to-teal-100 dark:hover:from-emerald-900/30 dark:hover:to-teal-900/30 text-emerald-700 dark:text-emerald-300 rounded-lg"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    {isExporting ? "Exporting..." : "Export"}
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    onClick={() => window.location.href = '/flow-data'}
                    className="h-9 px-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-700 hover:from-blue-100 hover:to-indigo-100 dark:hover:from-blue-900/30 dark:hover:to-indigo-900/30 text-blue-700 dark:text-blue-300 rounded-lg"
                  >
                    <Database className="w-4 h-4 mr-2" />
                    Flow Data
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Filter Buttons */}
          <div className="mb-6">
            <div className="flex flex-wrap gap-2">
              <Button
                variant={priorityFilter === "overdue" ? "default" : "outline"}
                size="sm"
                onClick={() => setPriorityFilter(priorityFilter === "overdue" ? "all" : "overdue")}
                className={`h-8 px-3 rounded-full transition-all ${
                  priorityFilter === "overdue" 
                    ? "bg-red-500 hover:bg-red-600 text-white" 
                    : "border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
                }`}
              >
                🚨 Overdue ({filteredTasks.filter(t => new Date(t.plannedTime) < new Date() && t.status !== 'completed').length})
              </Button>
              
              <Button
                variant={priorityFilter === "urgent" ? "default" : "outline"}
                size="sm"
                onClick={() => setPriorityFilter(priorityFilter === "urgent" ? "all" : "urgent")}
                className={`h-8 px-3 rounded-full transition-all ${
                  priorityFilter === "urgent" 
                    ? "bg-orange-500 hover:bg-orange-600 text-white" 
                    : "border-orange-200 text-orange-600 hover:bg-orange-50 dark:border-orange-800 dark:text-orange-400 dark:hover:bg-orange-900/20"
                }`}
              >
                ⚡ Urgent ({filteredTasks.filter(t => {
                  const hours = (new Date(t.plannedTime).getTime() - new Date().getTime()) / (1000 * 60 * 60);
                  return hours > 0 && hours <= 24 && t.status !== 'completed';
                }).length})
              </Button>
              
              <Button
                variant={statusFilter === "pending" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter(statusFilter === "pending" ? "all" : "pending")}
                className={`h-8 px-3 rounded-full transition-all ${
                  statusFilter === "pending" 
                    ? "bg-yellow-500 hover:bg-yellow-600 text-white" 
                    : "border-yellow-200 text-yellow-600 hover:bg-yellow-50 dark:border-yellow-800 dark:text-yellow-400 dark:hover:bg-yellow-900/20"
                }`}
              >
                ⏳ Pending ({filteredTasks.filter(t => t.status === 'pending').length})
              </Button>
              
              <Button
                variant={statusFilter === "completed" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter(statusFilter === "completed" ? "all" : "completed")}
                className={`h-8 px-3 rounded-full transition-all ${
                  statusFilter === "completed" 
                    ? "bg-green-500 hover:bg-green-600 text-white" 
                    : "border-green-200 text-green-600 hover:bg-green-50 dark:border-green-800 dark:text-green-400 dark:hover:bg-green-900/20"
                }`}
              >
                ✅ Completed ({filteredTasks.filter(t => t.status === 'completed').length})
              </Button>
              
              <Button
                variant={dateFilter === "today" ? "default" : "outline"}
                size="sm"
                onClick={() => setDateFilter(dateFilter === "today" ? "all" : "today")}
                className={`h-8 px-3 rounded-full transition-all ${
                  dateFilter === "today" 
                    ? "bg-blue-500 hover:bg-blue-600 text-white" 
                    : "border-blue-200 text-blue-600 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-900/20"
                }`}
              >
                📅 Today ({filteredTasks.filter(t => {
                  const taskDate = new Date(t.createdAt);
                  const today = new Date();
                  return taskDate.toDateString() === today.toDateString();
                }).length})
              </Button>
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
            ) : filteredTasks.length === 0 ? (
              <Card className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border-0 overflow-hidden">
                <CardContent className="p-16 text-center">
                  <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Clock className="w-12 h-12 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">No tasks found</h3>
                  <p className="text-gray-500 dark:text-gray-400 mb-8 text-lg">
                    {statusFilter === "all" && systemFilter === "all" && assigneeFilter === "all" && priorityFilter === "all" && dateFilter === "all" && !searchQuery
                      ? "You don't have any tasks assigned yet. Create a new flow to get started!"
                      : "No tasks match your current filters. Try adjusting your filter criteria."
                    }
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Button 
                      onClick={() => {
                        setStatusFilter("all");
                        setSystemFilter("all");
                        setAssigneeFilter("all");
                        setPriorityFilter("all");
                        setDateFilter("all");
                        setSearchQuery("");
                      }}
                      variant="outline"
                      className="px-6 py-3 rounded-xl"
                    >
                      Clear All Filters
                    </Button>
                    <Button 
                      onClick={() => window.location.href = '/flows'}
                      className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
                    >
                      <Plus className="w-5 h-5 mr-2" />
                      Create New Flow
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : viewMode === "table" ? (
              /* Table View */
              <Card className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border-0 overflow-hidden">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gradient-to-r from-gray-50 to-blue-50 dark:from-gray-900 dark:to-blue-900/20 border-b-2 border-blue-200 dark:border-blue-800">
                        <TableHead className="font-bold text-gray-900 dark:text-gray-100 w-8">
                          <div className="w-4 h-4 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full"></div>
                        </TableHead>
                        <TableHead className="font-bold text-gray-900 dark:text-gray-100">Order #</TableHead>
                        <TableHead className="font-bold text-gray-900 dark:text-gray-100">Task Details</TableHead>
                        <TableHead className="font-bold text-gray-900 dark:text-gray-100">System & Flow</TableHead>
                        <TableHead className="font-bold text-gray-900 dark:text-gray-100">Priority</TableHead>
                        <TableHead className="font-bold text-gray-900 dark:text-gray-100">Status</TableHead>
                        <TableHead className="font-bold text-gray-900 dark:text-gray-100">Assignee</TableHead>
                        <TableHead className="font-bold text-gray-900 dark:text-gray-100">Due Date</TableHead>
                        <TableHead className="font-bold text-gray-900 dark:text-gray-100 text-center">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTasks.map((task: any, index: number) => {
                        const priority = getPriorityInfo(task);
                        return (
                          <TableRow 
                            key={task.id} 
                            className={`group border-b border-gray-100 dark:border-gray-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 dark:hover:from-blue-900/10 dark:hover:to-purple-900/10 transition-all duration-200 ${
                              index % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50/50 dark:bg-gray-800/50'
                            }`}
                          >
                            {/* Status Icon */}
                            <TableCell className="p-4">
                              <div className={`relative p-2 rounded-lg shadow-sm transform group-hover:scale-110 transition-transform ${
                                task.status === 'completed' 
                                  ? 'bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30' 
                                  : task.status === 'overdue'
                                  ? 'bg-gradient-to-br from-red-100 to-pink-100 dark:from-red-900/30 dark:to-pink-900/30'
                                  : 'bg-gradient-to-br from-yellow-100 to-orange-100 dark:from-yellow-900/30 dark:to-orange-900/30'
                              }`}>
                                {getStatusIcon(task.status)}
                                <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-white dark:bg-gray-800 rounded-full flex items-center justify-center">
                                  <div className={`w-1.5 h-1.5 rounded-full ${
                                    task.status === 'completed' ? 'bg-green-500' 
                                    : task.status === 'overdue' ? 'bg-red-500' 
                                    : 'bg-yellow-500'
                                  } animate-pulse`}></div>
                                </div>
                              </div>
                            </TableCell>
                            
                            {/* Order Number */}
                            <TableCell className="p-4">
                              <div className="text-center">
                                <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 rounded-xl shadow-sm">
                                  <span className="font-bold text-lg text-blue-700 dark:text-blue-300">
                                    #{task.orderNumber}
                                  </span>
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                  Order
                                </div>
                              </div>
                            </TableCell>
                            
                            {/* Task Details */}
                            <TableCell className="p-4">
                              <div className="space-y-1">
                                <div className="font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                  {task.taskName}
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400 space-y-0.5">
                                  <div className="flex items-center space-x-1">
                                    <span className="font-medium">Flow:</span>
                                    <span className="font-mono text-purple-600 dark:text-purple-400">{task.flowId?.slice(-8)}</span>
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                            
                            {/* System & Flow */}
                            <TableCell className="p-4">
                              <div className="space-y-2">
                                <div className="px-2 py-1 bg-gradient-to-r from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-md text-xs font-medium text-blue-700 dark:text-blue-300 text-center">
                                  {task.system}
                                </div>
                                {task.flowInitiatedAt && (
                                  <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
                                    Started: {format(new Date(task.flowInitiatedAt), 'MMM dd')}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            
                            {/* Priority */}
                            <TableCell className="p-4">
                              <div className={`px-2 py-1 rounded-md text-xs font-medium text-center ${
                                priority.color === 'red' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' :
                                priority.color === 'orange' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' :
                                priority.color === 'yellow' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' :
                                priority.color === 'blue' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' :
                                'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                              }`}>
                                {priority.level === 'completed' ? '✅' : 
                                 priority.level === 'overdue' ? '🚨' :
                                 priority.level === 'urgent' ? '⚡' :
                                 priority.level === 'high' ? '🔶' :
                                 priority.level === 'medium' ? '🔸' : '🔹'}
                                <br />
                                {priority.label}
                              </div>
                            </TableCell>
                            
                            {/* Status */}
                            <TableCell className="p-4">
                              <div className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide text-center ${
                                task.status === 'completed' 
                                  ? 'bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 text-green-800 dark:text-green-300' 
                                  : task.status === 'overdue'
                                  ? 'bg-gradient-to-r from-red-100 to-pink-100 dark:from-red-900/30 dark:to-pink-900/30 text-red-800 dark:text-red-300'
                                  : 'bg-gradient-to-r from-yellow-100 to-orange-100 dark:from-yellow-900/30 dark:to-orange-900/30 text-yellow-800 dark:text-yellow-300'
                              }`}>
                                {task.status}
                              </div>
                            </TableCell>
                            
                            {/* Assignee */}
                            <TableCell className="p-4">
                              <div className="flex items-center space-x-2">
                                <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold text-xs">
                                  {task.doerEmail?.charAt(0).toUpperCase()}
                                </div>
                                <div className="text-xs">
                                  <div className="font-medium text-gray-900 dark:text-white truncate max-w-24">
                                    {task.doerEmail?.split('@')[0]}
                                  </div>
                                  <div className="text-gray-500 dark:text-gray-400">
                                    @{task.doerEmail?.split('@')[1]}
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                            
                            {/* Due Date */}
                            <TableCell className="p-4">
                              <div className="text-center">
                                <div className="text-sm font-medium text-gray-900 dark:text-white">
                                  {format(new Date(task.plannedTime), 'MMM dd')}
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                  {format(new Date(task.plannedTime), 'HH:mm')}
                                </div>
                                <div className={`text-xs mt-1 ${
                                  new Date(task.plannedTime) < new Date() && task.status !== 'completed'
                                    ? 'text-red-600 dark:text-red-400 font-semibold'
                                    : 'text-gray-500 dark:text-gray-400'
                                }`}>
                                  {new Date(task.plannedTime) < new Date() && task.status !== 'completed' ? 'Overdue' : ''}
                                </div>
                              </div>
                            </TableCell>
                            
                            {/* Actions */}
                            <TableCell className="p-4">
                              <div className="flex items-center justify-center space-x-1">
                                {/* Fill Form Button */}
                                {task.formId && task.formId.trim() !== "" && (
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => handleFillForm(task)}
                                    className="h-8 w-8 p-0 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border border-purple-200 dark:border-purple-700 hover:from-purple-100 hover:to-pink-100 dark:hover:from-purple-900/30 dark:hover:to-pink-900/30 text-purple-700 dark:text-purple-300 rounded-lg"
                                    title="Fill Form"
                                  >
                                    <Edit className="w-3 h-3" />
                                  </Button>
                                )}
                                
                                {/* View Flow Data Button */}
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => handleViewFlowData(task)}
                                  className="h-8 w-8 p-0 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border border-emerald-200 dark:border-emerald-700 hover:from-emerald-100 hover:to-teal-100 dark:hover:from-emerald-900/30 dark:hover:to-teal-900/30 text-emerald-700 dark:text-emerald-300 rounded-lg"
                                  title="View Flow Data"
                                >
                                  <Database className="w-3 h-3" />
                                </Button>
                                
                                {/* More Actions Dropdown */}
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button 
                                      variant="outline" 
                                      size="sm"
                                      className="h-8 w-8 p-0 bg-gradient-to-r from-gray-50 to-slate-50 dark:from-gray-800 dark:to-slate-800 border border-gray-200 dark:border-gray-600 hover:from-gray-100 hover:to-slate-100 dark:hover:from-gray-700 dark:hover:to-slate-700 text-gray-700 dark:text-gray-300 rounded-lg"
                                    >
                                      <MoreHorizontal className="w-3 h-3" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-48">
                                    <DropdownMenuItem onClick={() => setSelectedTask(task)}>
                                      <Eye className="w-4 h-4 mr-2" />
                                      View Details
                                    </DropdownMenuItem>
                                    {isTaskTransferable(task) && task.status !== 'completed' && (
                                      <DropdownMenuItem onClick={() => handleTransferClick(task)}>
                                        <UserCheck className="w-4 h-4 mr-2" />
                                        Transfer Task
                                      </DropdownMenuItem>
                                    )}
                                    {task.status !== "completed" && (
                                      <DropdownMenuItem onClick={() => handleCompleteClick(task)}>
                                        <CheckCircle className="w-4 h-4 mr-2" />
                                        Mark Complete
                                      </DropdownMenuItem>
                                    )}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
                
                {/* Table Footer with Summary */}
                <div className="p-4 bg-gradient-to-r from-gray-50 to-blue-50 dark:from-gray-900 dark:to-blue-900/20 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-4 text-gray-600 dark:text-gray-400">
                      <span>Showing {filteredTasks.length} tasks</span>
                      <div className="flex items-center space-x-2">
                        <div className="flex items-center space-x-1">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span>{filteredTasks.filter(t => t.status === 'completed').length} completed</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                          <span>{filteredTasks.filter(t => t.status === 'pending').length} pending</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                          <span>{filteredTasks.filter(t => new Date(t.plannedTime) < new Date() && t.status !== 'completed').length} overdue</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ) : (
              /* Card View - Original Implementation */
              filteredTasks.map((task: any) => (
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
                            <div className="flex items-center space-x-2 mb-1">
                              <h3 className="text-lg font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                {task.taskName}
                              </h3>
                              {(() => {
                                const priority = getPriorityInfo(task);
                                if (priority.level !== 'completed') {
                                  return (
                                    <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                                      priority.color === 'red' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' :
                                      priority.color === 'orange' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' :
                                      priority.color === 'yellow' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' :
                                      priority.color === 'blue' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' :
                                      'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                                    }`}>
                                      {priority.label}
                                    </div>
                                  );
                                }
                                return null;
                              })()}
                            </div>
                            <div className="flex items-center space-x-2 mt-1">
                              <div className="px-3 py-1 bg-gradient-to-r from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-full">
                                <p className="text-sm font-medium text-blue-700 dark:text-blue-300">
                                  System: {task.system}
                                </p>
                              </div>
                              <div className="px-3 py-1 bg-gradient-to-r from-gray-100 to-slate-100 dark:from-gray-900/30 dark:to-slate-900/30 rounded-full">
                                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                  Due: {format(new Date(task.plannedTime), 'MMM dd, HH:mm')}
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
                        
                        {/* WHEN, ORDER */}
                        <div className="grid grid-cols-1 gap-2 text-sm mb-3">
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
                  {taskToComplete && getTaskCompletionStatuses(taskToComplete.taskName, taskToComplete.system).map((status: string) => (
                    <SelectItem key={status} value={status}>{status}</SelectItem>
                  ))}
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
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
          <DialogHeader className="border-b pb-4">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-xl font-bold">
                  Flow Data - {flowDataForTask?.orderNumber || flowDataForTask?.flowId}
                </DialogTitle>
                <p className="text-sm text-gray-500 mt-1">
                  System: {flowDataForTask?.system} • {flowDataForTask?.tasks?.length || 0} Tasks • 
                  Created: {flowDataForTask?.tasks?.[0] ? new Date(flowDataForTask.tasks[0].createdAt).toLocaleDateString() : 'N/A'}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const dataToExport = {
                      flowId: flowDataForTask?.flowId,
                      orderNumber: flowDataForTask?.orderNumber,
                      system: flowDataForTask?.system,
                      tasks: flowDataForTask?.tasks,
                      formResponses: flowDataForTask?.formResponses
                    };
                    const dataStr = JSON.stringify(dataToExport, null, 2);
                    const dataBlob = new Blob([dataStr], { type: 'application/json' });
                    const url = URL.createObjectURL(dataBlob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = `flow-data-${flowDataForTask?.flowId || 'export'}.json`;
                    link.click();
                    URL.revokeObjectURL(url);
                  }}
                >
                  <Download className="w-4 h-4 mr-1" />
                  Export
                </Button>
              </div>
            </div>
          </DialogHeader>
          
          {flowDataForTask && (
            <div className="flex flex-col h-full overflow-hidden">
              {/* Progress Bar */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Flow Progress</span>
                  <span className="text-sm text-gray-500">
                    {flowDataForTask.tasks?.filter((t: any) => t.status === 'completed').length || 0} of {flowDataForTask.tasks?.length || 0} completed
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-500 h-2 rounded-full transition-all duration-300"
                    style={{ 
                      width: `${flowDataForTask.tasks?.length ? 
                        ((flowDataForTask.tasks.filter((t: any) => t.status === 'completed').length / flowDataForTask.tasks.length) * 100) : 0}%` 
                    }}
                  />
                </div>
              </div>

              {/* Main Content */}
              <div className="flex-1 overflow-hidden">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
                  {/* Flow Overview */}
                  <div className="lg:col-span-1 space-y-4">
                    {/* Flow Summary Card */}
                    <Card className="h-fit">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base">Flow Overview</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Flow ID</Label>
                            <p className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">{flowDataForTask.flowId}</p>
                          </div>
                          <div>
                            <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide">System</Label>
                            <p className="font-semibold">{flowDataForTask.system}</p>
                          </div>
                          {flowDataForTask.orderNumber && (
                            <div className="col-span-2">
                              <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Order Number</Label>
                              <p className="font-mono text-sm bg-blue-50 px-2 py-1 rounded text-blue-800">{flowDataForTask.orderNumber}</p>
                            </div>
                          )}
                        </div>
                        
                        {/* Status Summary */}
                        <div className="pt-3 border-t">
                          <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 block">Status Summary</Label>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="flex items-center justify-between">
                              <span className="flex items-center">
                                <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                                Completed
                              </span>
                              <span className="font-semibold">{flowDataForTask.tasks?.filter((t: any) => t.status === 'completed').length || 0}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="flex items-center">
                                <div className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></div>
                                In Progress
                              </span>
                              <span className="font-semibold">{flowDataForTask.tasks?.filter((t: any) => t.status === 'in_progress').length || 0}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="flex items-center">
                                <div className="w-2 h-2 bg-gray-400 rounded-full mr-2"></div>
                                Pending
                              </span>
                              <span className="font-semibold">{flowDataForTask.tasks?.filter((t: any) => t.status === 'pending').length || 0}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="flex items-center">
                                <div className="w-2 h-2 bg-red-500 rounded-full mr-2"></div>
                                Overdue
                              </span>
                              <span className="font-semibold">{flowDataForTask.tasks?.filter((t: any) => t.status === 'overdue').length || 0}</span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Initial Form Data */}
                    {flowDataForTask.firstFormData && (
                      <Card className="flex-1">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base flex items-center">
                            <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                            Initial Form Data
                          </CardTitle>
                          <p className="text-xs text-gray-500">{flowDataForTask.firstTask?.taskName}</p>
                        </CardHeader>
                        <CardContent className="overflow-y-auto max-h-64">
                          <div className="space-y-3">
                            {Object.entries(getReadableFormData(flowDataForTask.firstFormData, flowDataForTask.firstTask?.formId)).map(([key, value]) => (
                              <div key={key} className="border-l-2 border-blue-200 pl-3">
                                <Label className="text-xs font-medium text-blue-700 block">{key}</Label>
                                <div className="text-sm text-gray-800 mt-1">
                                  {typeof value === 'string' && value.includes('<table') ? (
                                    <div dangerouslySetInnerHTML={{ __html: value }} />
                                  ) : Array.isArray(value) ? (
                                    <div className="space-y-1">
                                      {value.map((item, index) => (
                                        <div key={index} className="bg-gray-50 p-2 rounded text-xs">
                                          {typeof item === 'object' ? 
                                            Object.entries(item).map(([k, v]) => (
                                              <div key={k}><span className="font-medium">{k}:</span> {String(v)}</div>
                                            )) : 
                                            String(item)
                                          }
                                        </div>
                                      ))}
                                    </div>
                                  ) : typeof value === 'object' ? (
                                    <div className="bg-gray-50 p-2 rounded text-xs font-mono">
                                      {JSON.stringify(value, null, 2)}
                                    </div>
                                  ) : (
                                    <span className="break-words">{String(value)}</span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>

                  {/* Tasks Timeline */}
                  <div className="lg:col-span-1">
                    <Card className="h-full">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base">Tasks Timeline</CardTitle>
                        <p className="text-xs text-gray-500">{flowDataForTask.tasks?.length || 0} tasks in this flow</p>
                      </CardHeader>
                      <CardContent className="overflow-y-auto">
                        <div className="space-y-3">
                          {flowDataForTask.tasks
                            ?.sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
                            .map((task: any, index: number) => {
                              const isLast = index === flowDataForTask.tasks.length - 1;
                              return (
                                <div key={task.id} className="relative">
                                  {/* Timeline line */}
                                  {!isLast && (
                                    <div className="absolute left-4 top-8 w-0.5 h-full bg-gray-200 -z-10"></div>
                                  )}
                                  
                                  <div className="flex items-start space-x-3">
                                    {/* Status indicator */}
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                                      task.status === 'completed' ? 'bg-green-500 text-white' :
                                      task.status === 'in_progress' ? 'bg-yellow-500 text-white' :
                                      task.status === 'overdue' ? 'bg-red-500 text-white' :
                                      'bg-gray-300 text-gray-600'
                                    }`}>
                                      {index + 1}
                                    </div>
                                    
                                    {/* Task info */}
                                    <div className="flex-1 min-w-0">
                                      <div className="bg-white border rounded-lg p-3 shadow-sm">
                                        <div className="flex items-center justify-between mb-2">
                                          <h4 className="font-medium text-sm truncate">{task.taskName}</h4>
                                          <Badge variant={
                                            task.status === 'completed' ? 'default' :
                                            task.status === 'in_progress' ? 'secondary' :
                                            task.status === 'overdue' ? 'destructive' : 'outline'
                                          } className="text-xs">
                                            {task.status.replace('_', ' ')}
                                          </Badge>
                                        </div>
                                        <div className="text-xs text-gray-500 space-y-1">
                                          <div className="flex items-center">
                                            <UserCheck className="w-3 h-3 mr-1" />
                                            {task.doer || task.doerEmail}
                                          </div>
                                          <div className="flex items-center">
                                            <Clock className="w-3 h-3 mr-1" />
                                            {new Date(task.createdAt).toLocaleDateString()}
                                          </div>
                                          {task.completedAt && (
                                            <div className="flex items-center text-green-600">
                                              <CheckCircle className="w-3 h-3 mr-1" />
                                              Completed {new Date(task.completedAt).toLocaleDateString()}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Form Data */}
                  <div className="lg:col-span-1">
                    <Card className="h-full">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base">Form Responses</CardTitle>
                        <p className="text-xs text-gray-500">{flowDataForTask.formResponses?.length || 0} form submissions</p>
                      </CardHeader>
                      <CardContent className="overflow-y-auto">
                        <div className="space-y-4">
                          {flowDataForTask.formResponses?.length === 0 ? (
                            <div className="text-center py-8">
                              <Database className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                              <p className="text-gray-500 text-sm">No form data available</p>
                            </div>
                          ) : (
                            flowDataForTask.formResponses?.map((response: any) => (
                              <Card key={response.id} className="border-l-4 border-l-green-400">
                                <CardHeader className="pb-2">
                                  <div className="flex items-center justify-between">
                                    <CardTitle className="text-sm">{response.taskName}</CardTitle>
                                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                                      {new Date(response.submittedAt).toLocaleDateString()}
                                    </span>
                                  </div>
                                </CardHeader>
                                <CardContent className="pt-0">
                                  <div className="space-y-2">
                                    {Object.entries(getReadableFormData(response.data || {}, response.formId)).map(([key, value]) => (
                                      <div key={key} className="border-b border-gray-100 pb-2 last:border-b-0">
                                        <Label className="text-xs font-medium text-gray-600 block">{key}</Label>
                                        <div className="text-sm text-gray-800 mt-1">
                                          {typeof value === 'string' && value.includes('<table') ? (
                                            <div dangerouslySetInnerHTML={{ __html: value }} />
                                          ) : (
                                            <span className="break-words">
                                              {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </CardContent>
                              </Card>
                            ))
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex justify-between items-center pt-4 border-t mt-6">
                <div className="text-xs text-gray-500">
                  Last updated: {new Date().toLocaleString()}
                </div>
                <div className="flex space-x-2">
                  <Button variant="outline" onClick={() => setIsFlowDataDialogOpen(false)}>
                    Close
                  </Button>
                </div>
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
