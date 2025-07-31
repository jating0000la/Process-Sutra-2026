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
import { CheckCircle, Clock, AlertTriangle, Eye, Edit, Plus } from "lucide-react";
import FormRenderer from "@/components/form-renderer";

export default function Tasks() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [formTemplate, setFormTemplate] = useState<any>(null);

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

  const handleFillForm = async (task: any) => {
    if (!task.formId) return;
    
    // Find the form template by formId
    const template = (formTemplates as any[])?.find((t: any) => t.formId === task.formId);
    if (template) {
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
      
      setIsFormDialogOpen(false);
      setFormTemplate(null);
    } catch (error) {
      console.error("Form submission error:", error);
      toast({
        title: "Error",
        description: "Failed to submit form",
        variant: "destructive",
      });
    }
  };

  const completeTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      await apiRequest("POST", `/api/tasks/${taskId}/complete`);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Task completed successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      setSelectedTask(null);
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

  const statusChangeMutation = useMutation({
    mutationFn: async ({ taskId, status }: { taskId: string; status: string }) => {
      await apiRequest("PATCH", `/api/tasks/${taskId}/status`, { status });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Task status updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
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
        description: "Failed to update task status",
        variant: "destructive",
      });
    },
  });

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "overdue":
        return "bg-red-100 text-red-800";
      case "in_progress":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-yellow-100 text-yellow-800";
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
                          <div className="flex items-center space-x-4 mt-1">
                            <span className="text-xs text-gray-500">Flow ID: {task.flowId}</span>
                            <span className="text-xs text-gray-500">
                              Due: {new Date(task.plannedTime).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Select 
                          value={task.status} 
                          onValueChange={(value) => statusChangeMutation.mutate({ taskId: task.id, status: value })}
                        >
                          <SelectTrigger className="w-36">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="in_progress">In Progress</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                            <SelectItem value="overdue">Overdue</SelectItem>
                          </SelectContent>
                        </Select>
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
                                    <Badge className={getStatusColor(selectedTask.status)}>
                                      {selectedTask.status.replace('_', ' ')}
                                    </Badge>
                                  </div>
                                </div>
                                
                                {selectedTask.formId && (
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
                                  {selectedTask.status === "pending" && (
                                    <Button 
                                      onClick={() => completeTaskMutation.mutate(selectedTask.id)}
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
    </div>
  );
}
