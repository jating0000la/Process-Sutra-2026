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
import { CheckCircle, Clock, AlertTriangle, Eye, Edit, Plus, Database } from "lucide-react";
import FormRenderer from "@/components/form-renderer";

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
    queryKey: ["/api/tasks", statusFilter !== "all" ? statusFilter : ""],
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

  const completeTaskMutation = useMutation({
    mutationFn: async ({ taskId, status }: { taskId: string; status: string }) => {
      await apiRequest("POST", `/api/tasks/${taskId}/complete`, { status });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Task completed successfully. Next task created automatically.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
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

  const handleCompleteClick = (task: any) => {
    setTaskToComplete(task);
    setIsCompleteDialogOpen(true);
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
      
      // Get all form responses for tasks in this flow
      const flowFormResponses = (formResponses as any[])?.filter((response: any) => {
        return allTasks.some((t: any) => t.id === response.taskId);
      }) || [];

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
        formResponses: enrichedResponses
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
          <div className="mb-6 flex items-center space-x-4">
            <Label htmlFor="status-filter">Filter by status:</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>
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
                      : `No tasks with status "${statusFilter}" found.`
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
                          
                          {/* Time Tracking Information */}
                          <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-800 rounded border text-xs space-y-1">
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <span className="font-medium text-gray-700">Created:</span>
                                <div className="text-gray-600">{format(new Date(task.createdAt), 'MMM dd, HH:mm')}</div>
                              </div>
                              <div>
                                <span className="font-medium text-gray-700">Due:</span>
                                <div className="text-gray-600">{format(new Date(task.plannedTime), 'MMM dd, HH:mm')}</div>
                              </div>
                              {task.actualCompletionTime && (
                                <div className="col-span-2">
                                  <span className="font-medium text-gray-700">Completed:</span>
                                  <div className="text-gray-600">{format(new Date(task.actualCompletionTime), 'MMM dd, HH:mm')}</div>
                                </div>
                              )}
                            </div>
                            
                            {/* Performance Status */}
                            <div className="pt-1 border-t border-gray-200">
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
                            {Object.entries(response.data || {}).map(([key, value]) => (
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
    </div>
  );
}
